'use server'

// Server Actions del flujo de auth.
// Estas funciones corren server-side (Next.js Server Actions). Los forms en
// el cliente las invocan con useFormState. La cookie HTTP-only mantiene el
// contexto entre pantallas; las Edge Functions hacen la validación real.

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import {
  dniLegajoFormSchema,
  dniSinLegajoFormSchema,
  emailFormSchema,
  nombreCompletoFormSchema,
  type FormState,
} from '@/types/auth'
import {
  setAuthContext,
  getAuthContext,
  clearAuthContext,
  setRecentValidation,
  getRecentValidation,
  clearRecentValidation,
} from './auth-cookie'
import { validarPadron } from './validar-padron'
import { solicitarMagicLink } from './solicitar-magic-link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// El tipo FormState vive en @/types/auth porque archivos 'use server' solo
// pueden exportar async functions.

// =====================================================================
// Action: submitDniLegajo (sub-flujo activo)
// =====================================================================

export async function submitDniLegajo(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = {
    dni: (formData.get('dni')?.toString() ?? '').trim(),
    legajo: (formData.get('legajo')?.toString() ?? '').trim(),
  }

  const parsed = dniLegajoFormSchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.flatten().fieldErrors
    return {
      fieldErrors: {
        dni: issues.dni?.[0],
        legajo: issues.legajo?.[0],
      },
    }
  }

  const result = await validarPadron({
    dni: parsed.data.dni,
    legajo: parsed.data.legajo,
    flujo: 'activo',
  })

  if (!result.ok) {
    return { error: result.error.message }
  }

  // Persistir contexto en cookie HTTP-only
  if (result.data.match) {
    setAuthContext({
      flujo: 'activo',
      dni: parsed.data.dni,
      legajo: parsed.data.legajo,
      match: true,
      tipo: result.data.tipo,
    })
  } else {
    setAuthContext({
      flujo: 'activo',
      dni: parsed.data.dni,
      legajo: parsed.data.legajo,
      match: false,
      motivo: result.data.motivo,
    })
  }

  // Tanto match como no_match continúan a captura de email.
  // (El no_match desemboca en solicitud_pendiente cuando se envíe el email.)
  redirect('/email')
}

// =====================================================================
// Action: submitDniSinLegajo (sub-flujo sin_legajo — jubilados)
// =====================================================================

export async function submitDniSinLegajo(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = {
    dni: (formData.get('dni')?.toString() ?? '').trim(),
  }

  const parsed = dniSinLegajoFormSchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.flatten().fieldErrors
    return {
      fieldErrors: {
        dni: issues.dni?.[0],
      },
    }
  }

  const result = await validarPadron({
    dni: parsed.data.dni,
    flujo: 'sin_legajo',
  })

  if (!result.ok) {
    return { error: result.error.message }
  }

  if (result.data.match) {
    setAuthContext({
      flujo: 'sin_legajo',
      dni: parsed.data.dni,
      match: true,
      tipo: result.data.tipo,
    })
    redirect('/email')
  }

  setAuthContext({
    flujo: 'sin_legajo',
    dni: parsed.data.dni,
    match: false,
    motivo: result.data.motivo,
  })

  // sin_papel: el padrón tiene el nombre, va directo a /email y la solicitud
  // queda pendiente al enviar email.
  // dni_no_en_padron (US3): el padrón no tiene a la persona, capturamos
  // nombre_completo antes de /email para que la solicitud_pendiente persista
  // un nombre real (constraint chk_subflujo_data exige nombre_completo NOT NULL
  // cuando sub_flujo='sin_legajo').
  if (result.data.motivo === 'dni_no_en_padron') {
    redirect('/nombre-completo')
  }
  redirect('/email')
}

// =====================================================================
// Action: submitNombreCompleto (US3, sub-flujo sin_legajo + dni_no_en_padron)
// =====================================================================

export async function submitNombreCompleto(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = getAuthContext()
  if (!ctx) {
    redirect('/login')
  }
  // Defensa: la página solo tiene sentido en el sub-flujo sin_legajo cuando
  // el DNI NO está en padrón. Cualquier otro estado del flujo se reenruta.
  if (
    ctx.flujo !== 'sin_legajo' ||
    ctx.match !== false ||
    ctx.motivo !== 'dni_no_en_padron'
  ) {
    redirect('/login-sin-legajo')
  }

  const raw = {
    nombreCompleto: (formData.get('nombreCompleto')?.toString() ?? '').trim(),
  }
  const parsed = nombreCompletoFormSchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.flatten().fieldErrors
    return {
      fieldErrors: { nombreCompleto: issues.nombreCompleto?.[0] },
    }
  }

  setAuthContext({ ...ctx, nombreCompleto: parsed.data.nombreCompleto })
  redirect('/email')
}

// =====================================================================
// Action: submitEmail (cierra el flujo: dispara magic link o crea pendiente)
// =====================================================================

export async function submitEmail(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = getAuthContext()
  if (!ctx) {
    // Sesión de auth expirada. Al login.
    redirect('/login')
  }

  const raw = {
    email: (formData.get('email')?.toString() ?? '').trim(),
  }
  const parsed = emailFormSchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.flatten().fieldErrors
    return { fieldErrors: { email: issues.email?.[0] } }
  }

  const result = await solicitarMagicLink({
    dni: ctx.dni,
    legajo: ctx.legajo,
    nombreCompleto: ctx.nombreCompleto,
    email: parsed.data.email,
    flujo: ctx.flujo,
  })

  if (!result.ok) {
    if (result.error.type === 'validation' && result.error.code === 'email_invalido') {
      return { fieldErrors: { email: result.error.message } }
    }
    return { error: result.error.message }
  }

  if (result.data.status === 'magic_link_sent') {
    // FR-017: persistir contexto para permitir reenvío sin reingresar
    // DNI/legajo/email si el magic link expira o se pierde.
    setRecentValidation({
      flujo: ctx.flujo,
      dni: ctx.dni,
      legajo: ctx.legajo,
      nombreCompleto: ctx.nombreCompleto,
      email: parsed.data.email,
    })
    clearAuthContext()
    redirect('/magic-link-enviado')
  }

  clearAuthContext()
  redirect('/pendiente-validacion')
}

// =====================================================================
// Action: resendMagicLink (FR-017)
// =====================================================================
// Reenvía el magic link sin reingresar DNI/legajo/email, leyendo la cookie
// de validación reciente. Si la cookie expiró, redirige al login.
// La Edge Function solicitar-magic-link igual re-valida contra padrón
// (defense in depth).

export async function resendMagicLink(): Promise<void> {
  const rv = getRecentValidation()
  if (!rv) {
    redirect('/login')
  }

  const result = await solicitarMagicLink({
    dni: rv.dni,
    legajo: rv.legajo,
    nombreCompleto: rv.nombreCompleto,
    email: rv.email,
    flujo: rv.flujo,
  })

  if (!result.ok) {
    if (result.error.type === 'rate_limit') {
      redirect('/magic-link-expirado?reason=rate_limit')
    }
    // Otros errores (validation/conflict/server): la cookie probablemente
    // quedó stale. Limpio y mando al login para que arranque de cero.
    clearRecentValidation()
    redirect('/login?error=resend_failed')
  }

  if (result.data.status === 'magic_link_sent') {
    // El reenvío puede actualizar el email asociado si solicitar-magic-link
    // tomó otro camino — pero acá usamos el mismo email que estaba en la
    // cookie. Renovamos la cookie para extender el TTL.
    setRecentValidation(rv)
    redirect('/magic-link-enviado')
  }

  // Caso defensivo: solicitud quedó pendiente (no debería pasar si antes
  // ya había generado magic_link_sent y nada cambió en padrón). Por las
  // dudas redirigimos al pendiente.
  clearRecentValidation()
  redirect('/pendiente-validacion')
}

// =====================================================================
// Action: logoutAction (FR-014)
// =====================================================================
// Cierra la sesión del usuario, registra el evento en audit_log con
// service_role (la sesión todavía está viva al momento de auditar) y
// redirige al login. Si no hay sesión activa, igual redirigimos a /login
// — es la pantalla esperada de "deslogueado".

export async function logoutAction(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Resolver afiliado_id antes de signOut (después la sesión se invalida)
    const admin = createAdminClient()
    const { data: afiliado } = await admin
      .from('afiliados')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    const h = headers()
    const fwd = h.get('x-forwarded-for')
    const ip = fwd ? (fwd.split(',')[0]?.trim() ?? null) : h.get('x-real-ip')
    const userAgent = h.get('user-agent')

    await admin.from('audit_log').insert({
      evento: 'logout',
      afiliado_id: afiliado?.id ?? null,
      ip_address: ip,
      user_agent: userAgent,
      metadata: null,
    })

    await supabase.auth.signOut()
  }

  // Limpiar cookies de auth flow por si hubieran quedado (device compartido).
  clearAuthContext()
  clearRecentValidation()

  redirect('/login')
}
