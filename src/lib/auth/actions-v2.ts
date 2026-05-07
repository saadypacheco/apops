'use server'

// Server Actions del flujo de auth v2 (login con clave + registro).
// Detalles: specs/001-afiliado-auth/auth-v2.md
//
// Notas de seguridad:
//   - Mensajes genéricos siempre ("Credenciales inválidas") — no revelan si
//     el usuario existe ni si la clave es correcta vs el estado del afiliado.
//   - Rate limit + bloqueo automático tras 5 fallos consecutivos en 15 min.
//   - Auditoría granular en auth_attempts; eventos de alto nivel en audit_log.

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  cambioClaveFormSchema,
  loginConClaveFormSchema,
  loginMagicLinkFormSchema,
  registroFormSchema,
  solicitarAccesoFormSchema,
  type FormState,
} from '@/types/auth'
import { getCurrentAfiliado, homeForRol } from './role'
import {
  parseIdentifier,
  findAfiliadoByIdentifier,
} from './identifier'
import {
  RATE_LIMIT_CONFIG,
  bloquearTemporal,
  checkRateLimit,
  isBloqueadoFromRow,
  recordAttempt,
} from './rate-limit'

const GENERIC_INVALID = 'Credenciales inválidas.'
const GENERIC_RATE_LIMIT =
  'Demasiados intentos. Probá en 15 minutos o ingresá con magic link.'

function extractIp(): string | null {
  const h = headers()
  const fwd = h.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]?.trim()
    if (first) return first
  }
  return h.get('x-real-ip')
}

function baseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl) return envUrl.replace(/\/$/, '')
  const h = headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

// =====================================================================
// loginConClave — F1
// =====================================================================

export async function loginConClave(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = {
    identifier: (formData.get('identifier')?.toString() ?? '').trim(),
    password: formData.get('password')?.toString() ?? '',
  }

  const parsed = loginConClaveFormSchema.safeParse(raw)
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return {
      fieldErrors: {
        identifier: fe.identifier?.[0],
        password: fe.password?.[0],
      },
    }
  }

  const ip = extractIp()
  const admin = createAdminClient()

  // 1. Rate limit por (identifier ∪ ip)
  const rl = await checkRateLimit({
    identifier: parsed.data.identifier,
    ip,
    client: admin,
  })
  if (!rl.ok) {
    return { error: GENERIC_RATE_LIMIT }
  }

  // 2. Buscar afiliado. Si no existe, no es activo, o está bloqueado, registramos
  // intento fallido y devolvemos el mismo mensaje genérico.
  const afiliado = await findAfiliadoByIdentifier(
    parsed.data.identifier,
    admin,
  )
  if (
    !afiliado ||
    afiliado.estado !== 'activo' ||
    isBloqueadoFromRow(afiliado)
  ) {
    await recordAttempt({
      identifier: parsed.data.identifier,
      ip,
      exitoso: false,
      metodo: 'password',
      client: admin,
    })
    return { error: GENERIC_INVALID }
  }

  // 3. Intentar login con email del afiliado
  const supabase = createClient()
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: afiliado.email,
    password: parsed.data.password,
  })

  if (authError) {
    await recordAttempt({
      identifier: parsed.data.identifier,
      ip,
      exitoso: false,
      metodo: 'password',
      client: admin,
    })

    // Si tras este fallo se llegó al límite, bloquear automáticamente al afiliado
    const since = new Date(
      Date.now() - RATE_LIMIT_CONFIG.WINDOW_MS,
    ).toISOString()
    const recent = await admin
      .from('auth_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('identifier', parsed.data.identifier)
      .eq('exitoso', false)
      .gte('intentado_at', since)
    if ((recent.count ?? 0) >= RATE_LIMIT_CONFIG.MAX_ATTEMPTS) {
      await bloquearTemporal({
        afiliadoId: afiliado.id,
        motivo: 'demasiados_intentos',
        client: admin,
      })
    }

    return { error: GENERIC_INVALID }
  }

  // 4. Éxito — registrar attempt, actualizar last_login_at + audit
  await recordAttempt({
    identifier: parsed.data.identifier,
    ip,
    exitoso: true,
    metodo: 'password',
    client: admin,
  })
  await admin
    .from('afiliados')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', afiliado.id)
  await admin.from('audit_log').insert({
    evento: 'login_password_success',
    afiliado_id: afiliado.id,
    ip_address: ip,
    user_agent: headers().get('user-agent'),
    metadata: null,
  })

  redirect(homeForRol(afiliado.rol))
}

// =====================================================================
// registrar — F3 (Caso A: en padrón)
// =====================================================================

export async function registrar(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = {
    identifier: (formData.get('identifier')?.toString() ?? '').trim(),
    email: (formData.get('email')?.toString() ?? '').trim(),
    emailConfirm: (formData.get('emailConfirm')?.toString() ?? '').trim(),
    password: formData.get('password')?.toString() ?? '',
  }

  const parsed = registroFormSchema.safeParse(raw)
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return {
      fieldErrors: {
        identifier: fe.identifier?.[0],
        email: fe.email?.[0],
        emailConfirm: fe.emailConfirm?.[0],
        password: fe.password?.[0],
      },
    }
  }

  const admin = createAdminClient()

  // 1. ¿Ya existe afiliado con ese identifier?
  const existente = await findAfiliadoByIdentifier(
    parsed.data.identifier,
    admin,
  )
  if (existente) {
    return {
      fieldErrors: {
        identifier: 'Ya existe una cuenta con esos datos. Iniciá sesión.',
      },
    }
  }

  // 2. ¿Email ya usado por otro afiliado?
  const { data: emailExists } = await admin
    .from('afiliados')
    .select('id')
    .eq('email', parsed.data.email)
    .maybeSingle()
  if (emailExists) {
    return {
      fieldErrors: {
        email: 'Ese email ya está registrado.',
      },
    }
  }

  // 3. Validar contra padrón
  const parsedId = parseIdentifier(parsed.data.identifier)
  const padronColumn = parsedId.tipo === 'dni' ? 'dni' : 'legajo'
  const { data: padron } = await admin
    .from('padron_cotizantes')
    .select(
      'id, dni, legajo, nombre, afiliado_apops, cotiza_papel',
    )
    .eq(padronColumn, parsedId.valor)
    .maybeSingle()

  if (!padron) {
    redirect(
      `/no-en-padron?identifier=${encodeURIComponent(parsed.data.identifier)}`,
    )
  }
  if (!padron.afiliado_apops && !padron.cotiza_papel) {
    redirect(
      `/no-en-padron?identifier=${encodeURIComponent(parsed.data.identifier)}`,
    )
  }

  // 4. Crear auth.users con email_confirm=true (D10: doble input ya validó)
  const created = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password, // si undefined Supabase deja sin pwd
    email_confirm: true,
  })
  if (created.error || !created.data.user) {
    return {
      error: 'No pudimos crear la cuenta. Intentá de nuevo.',
    }
  }
  const authUserId = created.data.user.id

  // 5. Crear afiliado vinculado
  const tipo: 'activo' | 'jubilado' = padron.legajo ? 'activo' : 'jubilado'
  const insertResult = await admin.from('afiliados').insert({
    auth_user_id: authUserId,
    dni: padron.dni,
    legajo: tipo === 'activo' ? padron.legajo : null,
    nombre: padron.nombre,
    tipo,
    email: parsed.data.email,
    origen: 'padron',
    tiene_password: !!parsed.data.password,
    padron_id: padron.id,
  })
  if (insertResult.error) {
    // Rollback de auth.users para no dejar huérfano
    await admin.auth.admin.deleteUser(authUserId)
    return {
      error: 'No pudimos crear la cuenta. Intentá de nuevo.',
    }
  }

  // 6. Audit
  const ip = extractIp()
  await admin.from('audit_log').insert({
    evento: 'registro_exitoso',
    afiliado_id: null, // todavía no lo tengo seleccionado, no hago round-trip
    ip_address: ip,
    user_agent: headers().get('user-agent'),
    metadata: { dni: padron.dni, origen: 'padron' },
  })

  // 7. Si dio clave, redirige al login con flash. Si no, manda magic link
  // y redirige a /magic-link-enviado.
  if (parsed.data.password) {
    redirect('/login?registrado=1')
  }

  const { error: otpError } = await admin.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${baseUrl()}/auth/callback?next=/feed`,
    },
  })
  if (otpError) {
    return {
      error:
        'Cuenta creada, pero no pudimos enviar el email. Probá ingresar con magic link.',
    }
  }

  redirect('/magic-link-enviado')
}

// =====================================================================
// solicitarMagicLink — F3 (login con magic link / recovery)
// =====================================================================
//
// El usuario tipea solo DNI/Legajo. Buscamos el email asociado al afiliado
// y disparamos signInWithOtp. Mensaje genérico siempre (D5: "olvidé clave"
// y "magic link" comparten implementación). El reset forzado de clave
// post-callback lo agrega F5.

export async function solicitarMagicLink(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = {
    identifier: (formData.get('identifier')?.toString() ?? '').trim(),
  }

  const parsed = loginMagicLinkFormSchema.safeParse(raw)
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return {
      fieldErrors: { identifier: fe.identifier?.[0] },
    }
  }

  const ip = extractIp()
  const admin = createAdminClient()

  // 1. Rate limit por (identifier ∪ ip) — misma infra que loginConClave
  const rl = await checkRateLimit({
    identifier: parsed.data.identifier,
    ip,
    client: admin,
  })
  if (!rl.ok) {
    return { error: GENERIC_RATE_LIMIT }
  }

  // 2. Buscar afiliado. Mandamos magic link solo si existe, está activo y
  // no está bloqueado. En cualquier otro caso registramos intento fallido
  // pero devolvemos la misma respuesta genérica.
  const afiliado = await findAfiliadoByIdentifier(
    parsed.data.identifier,
    admin,
  )

  const enviable =
    !!afiliado &&
    afiliado.estado === 'activo' &&
    !isBloqueadoFromRow(afiliado)

  if (enviable && afiliado) {
    const { error: otpError } = await admin.auth.signInWithOtp({
      email: afiliado.email,
      options: {
        emailRedirectTo: `${baseUrl()}/auth/callback?next=${encodeURIComponent(
          homeForRol(afiliado.rol),
        )}`,
      },
    })
    if (otpError) {
      await recordAttempt({
        identifier: parsed.data.identifier,
        ip,
        exitoso: false,
        metodo: 'magic_link',
        client: admin,
      })
      // Aún en este caso, no revelamos al user que algo falló server-side.
      // Caemos al redirect genérico.
    } else {
      await recordAttempt({
        identifier: parsed.data.identifier,
        ip,
        exitoso: true,
        metodo: 'magic_link',
        client: admin,
      })
    }
  } else {
    await recordAttempt({
      identifier: parsed.data.identifier,
      ip,
      exitoso: false,
      metodo: 'magic_link',
      client: admin,
    })
  }

  redirect('/magic-link-enviado')
}

// =====================================================================
// solicitarAcceso — F4 (Caso B: no en padrón, quiere acceso a la app)
// =====================================================================

export async function solicitarAcceso(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = {
    dni: (formData.get('dni')?.toString() ?? '').trim(),
    legajo: (formData.get('legajo')?.toString() ?? '').trim(),
    nombre: (formData.get('nombre')?.toString() ?? '').trim(),
    email: (formData.get('email')?.toString() ?? '').trim(),
    emailConfirm: (formData.get('emailConfirm')?.toString() ?? '').trim(),
    motivo: (formData.get('motivo')?.toString() ?? '').trim(),
  }

  const parsed = solicitarAccesoFormSchema.safeParse(raw)
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return {
      fieldErrors: {
        dni: fe.dni?.[0],
        legajo: fe.legajo?.[0],
        nombre: fe.nombre?.[0],
        email: fe.email?.[0],
        emailConfirm: fe.emailConfirm?.[0],
        motivo: fe.motivo?.[0],
      },
    }
  }

  const admin = createAdminClient()

  // 1. Anti-duplicado: si ya hay solicitud pendiente con el mismo DNI, no la
  // dupliques. Mensaje amigable que sugiera esperar / contactar al gremio.
  const { data: pending } = await admin
    .from('solicitudes_pendientes')
    .select('id')
    .eq('dni', parsed.data.dni)
    .eq('estado', 'pendiente')
    .maybeSingle()
  if (pending) {
    return {
      error:
        'Ya recibimos una solicitud para este DNI. Vamos a contactarte cuando un administrador la revise.',
    }
  }

  // 2. Si ya existe afiliado con ese DNI, sugerimos que inicie sesión
  const { data: afiliadoExiste } = await admin
    .from('afiliados')
    .select('id')
    .eq('dni', parsed.data.dni)
    .maybeSingle()
  if (afiliadoExiste) {
    return {
      fieldErrors: {
        dni: 'Ya existe una cuenta con ese DNI. Iniciá sesión.',
      },
    }
  }

  // 3. Bifurcar por presencia de legajo según constraint chk_subflujo_data
  const tieneLegajo = !!parsed.data.legajo
  const insert = await admin.from('solicitudes_pendientes').insert({
    dni: parsed.data.dni,
    email: parsed.data.email,
    sub_flujo: tieneLegajo ? 'activo' : 'sin_legajo',
    legajo: tieneLegajo ? parsed.data.legajo! : null,
    nombre_completo: tieneLegajo ? null : parsed.data.nombre,
    motivo_pendiente: 'dni_no_en_padron',
  })
  if (insert.error) {
    return {
      error: 'No pudimos registrar la solicitud. Intentá de nuevo.',
    }
  }

  // 4. Audit
  const ip = extractIp()
  await admin.from('audit_log').insert({
    evento: 'solicitud_acceso_creada',
    afiliado_id: null,
    ip_address: ip,
    user_agent: headers().get('user-agent'),
    metadata: {
      dni: parsed.data.dni,
      tiene_legajo: tieneLegajo,
      motivo: parsed.data.motivo ?? null,
    },
  })

  redirect('/solicitud-enviada')
}

// =====================================================================
// cambiarClave — F5 (cambio voluntario desde /perfil/clave)
// =====================================================================
//
// Re-autentica con la clave actual antes de aplicar la nueva, así que un
// atacante con sesión robada no puede cambiarla. Si el afiliado no tenía
// clave (tiene_password=false), también lo permite — sirve como "creá tu
// clave" post-magic-link.

export async function cambiarClave(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getCurrentAfiliado()
  if (!session) {
    return { error: 'Sesión expirada. Iniciá sesión de nuevo.' }
  }

  const raw = {
    actual: formData.get('actual')?.toString() ?? '',
    nueva: formData.get('nueva')?.toString() ?? '',
    confirmar: formData.get('confirmar')?.toString() ?? '',
  }

  const parsed = cambioClaveFormSchema.safeParse(raw)
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return {
      fieldErrors: {
        actual: fe.actual?.[0],
        nueva: fe.nueva?.[0],
        confirmar: fe.confirmar?.[0],
      },
    }
  }

  const supabase = createClient()
  const admin = createAdminClient()

  // 1. Verificar email del afiliado en BD (defense in depth: no confiar en
  // session.email del cliente).
  const { data: row } = await admin
    .from('afiliados')
    .select('email, tiene_password')
    .eq('id', session.afiliadoId)
    .maybeSingle()
  if (!row) {
    return { error: 'No encontramos tu cuenta.' }
  }

  // 2. Si ya tenía clave, verificarla. Si no la tenía (post magic-link),
  // saltamos esta verificación — la sesión activa por magic link ya nos
  // garantiza que es el dueño del email.
  if (row.tiene_password) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: row.email,
      password: parsed.data.actual,
    })
    if (signInError) {
      return {
        fieldErrors: { actual: 'La clave actual no es correcta.' },
      }
    }
  }

  // 3. Aplicar la nueva clave
  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.nueva,
  })
  if (updateError) {
    return {
      error:
        'No pudimos guardar la nueva clave. Probá de nuevo en unos segundos.',
    }
  }

  // 4. Sincronizar flag tiene_password si era false
  if (!row.tiene_password) {
    await admin
      .from('afiliados')
      .update({ tiene_password: true })
      .eq('id', session.afiliadoId)
  }

  // 5. Audit
  const ip = extractIp()
  await admin.from('audit_log').insert({
    evento: 'clave_cambiada',
    afiliado_id: session.afiliadoId,
    ip_address: ip,
    user_agent: headers().get('user-agent'),
    metadata: { era_primera_vez: !row.tiene_password },
  })

  redirect('/perfil?clave=ok')
}

