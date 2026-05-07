// Edge Function: solicitar-magic-link
// Spec: specs/001-afiliado-auth/contracts/edge-solicitar-magic-link.json
//
// Orquesta:
//   1. Validación de input.
//   2. Rate-limit (compartido con validar-padron, cuenta padron_validation_attempt).
//   3. RE-VALIDACIÓN contra padrón con service_role (defense in depth: nunca
//      confiar en el cliente).
//   4a. Si match → crear (o reusar) auth.users + afiliados, disparar magic link.
//   4b. Si no_match → crear solicitudes_pendientes con sub_flujo + motivo
//       derivado, NO emitir magic link.
//
// El email se enmascara antes de devolverlo al cliente para feedback visual.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { logAuditEvent } from '../_shared/audit.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function getClientIp(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]
    return first ? first.trim() : null
  }
  return req.headers.get('x-real-ip')
}

function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
}

function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at <= 0) return email
  const name = email.slice(0, at)
  const domain = email.slice(at + 1)
  const head = name.slice(0, 1)
  const masked = '*'.repeat(Math.max(name.length - 1, 1))
  return `${head}${masked}@${domain}`
}

interface RequestBody {
  dni?: unknown
  legajo?: unknown
  nombre_completo?: unknown
  email?: unknown
  flujo?: unknown
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return jsonResponse(
      { error: 'No pudimos leer tu pedido.', code: 'dni_invalido' },
      400,
    )
  }

  const dni = typeof body.dni === 'string' ? body.dni.trim() : ''
  const legajo = typeof body.legajo === 'string' ? body.legajo.trim() : ''
  const nombreCompleto =
    typeof body.nombre_completo === 'string' ? body.nombre_completo.trim() : ''
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const flujo = body.flujo

  // Validation
  if (!/^[0-9]{7,8}$/.test(dni)) {
    return jsonResponse(
      { error: 'El DNI no es válido.', code: 'dni_invalido' },
      400,
    )
  }
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return jsonResponse(
      { error: 'El email no es válido.', code: 'email_invalido' },
      400,
    )
  }
  if (flujo !== 'activo' && flujo !== 'sin_legajo') {
    return jsonResponse(
      { error: 'Flujo inválido.', code: 'flujo_invalido' },
      400,
    )
  }
  if (flujo === 'activo' && legajo === '') {
    return jsonResponse(
      {
        error: 'Necesitamos tu legajo para validarte como afiliado activo.',
        code: 'legajo_requerido',
      },
      400,
    )
  }

  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent') ?? null

  // Rate limit: cuenta tanto padron_validation_attempt (del flow normal vía
  // validar-padron) como magic_link_sent / pendiente_created (intentos
  // directos a esta función). Esto previene bypass del rate-limit cuando un
  // atacante salta validar-padron.
  const rate = await checkRateLimit({
    dni,
    ip,
    events: [
      'padron_validation_attempt',
      'magic_link_sent',
      'pendiente_created',
    ],
  })
  if (!rate.allowed) {
    await logAuditEvent({
      evento: 'rate_limit_exceeded',
      dni_intentado: dni,
      ip_address: ip,
      user_agent: userAgent,
      metadata: { reason: rate.reason, source: 'solicitar-magic-link', flujo },
    })
    return jsonResponse(
      {
        error: 'Demasiados intentos. Esperá un rato y volvé a probar.',
        retry_after_seconds: rate.retry_after_seconds,
      },
      429,
    )
  }

  // Re-validación contra padrón (defense in depth)
  const supabase = getAdminClient()
  let padronQuery = supabase
    .from('padron_cotizantes')
    .select('id, nombre, afiliado_apops, cotiza_papel')
    .eq('dni', dni)
  if (flujo === 'activo') {
    padronQuery = padronQuery.eq('legajo', legajo)
  }
  const padron = await padronQuery.maybeSingle()
  if (padron.error) {
    console.error('[solicitar-magic-link] padron error:', padron.error.message)
    return jsonResponse(
      { error: 'Tuvimos un problema. Intentá de nuevo en un momento.' },
      500,
    )
  }

  // Decidir rama
  type Match =
    | { kind: 'match'; tipo: 'activo' | 'jubilado'; nombre: string; padronId: string }
    | { kind: 'no_match'; motivo: 'dni_no_en_padron' | 'sin_flag_apops_y_sin_papel'; nombreEnPadron: string | null }

  let outcome: Match
  if (!padron.data) {
    outcome = { kind: 'no_match', motivo: 'dni_no_en_padron', nombreEnPadron: null }
  } else if (flujo === 'activo' && padron.data.afiliado_apops) {
    outcome = {
      kind: 'match',
      tipo: 'activo',
      nombre: padron.data.nombre,
      padronId: padron.data.id,
    }
  } else if (flujo === 'sin_legajo' && padron.data.cotiza_papel) {
    outcome = {
      kind: 'match',
      tipo: 'jubilado',
      nombre: padron.data.nombre,
      padronId: padron.data.id,
    }
  } else {
    outcome = {
      kind: 'no_match',
      motivo: 'sin_flag_apops_y_sin_papel',
      nombreEnPadron: padron.data.nombre,
    }
  }

  // ──────────────────────────────────────────
  // Rama A: match → crear afiliado + magic link
  // ──────────────────────────────────────────
  if (outcome.kind === 'match') {
    // ¿Ya existe afiliado con este DNI?
    const existing = await supabase
      .from('afiliados')
      .select('id, auth_user_id')
      .eq('dni', dni)
      .maybeSingle()
    if (existing.error) {
      console.error('[solicitar-magic-link] afiliado lookup:', existing.error.message)
      return jsonResponse({ error: 'Tuvimos un problema.' }, 500)
    }

    let authUserId: string
    if (existing.data) {
      // Afiliado ya registrado. Si el email del request difiere del registrado, conflict.
      authUserId = existing.data.auth_user_id
      const userInfo = await supabase.auth.admin.getUserById(authUserId)
      const registeredEmail = userInfo.data.user?.email?.toLowerCase()
      if (registeredEmail && registeredEmail !== email) {
        return jsonResponse(
          {
            error: 'Este DNI ya está registrado con otro email.',
            code: 'email_ya_usado_por_otro_dni',
          },
          409,
        )
      }
    } else {
      // Crear (o reusar) user en auth.users
      const created = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
      })
      if (created.error) {
        const msg = created.error.message?.toLowerCase() ?? ''
        if (
          msg.includes('already') ||
          msg.includes('email') ||
          msg.includes('registered')
        ) {
          // Email duplicado — buscar el user y verificar conflict
          const list = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          })
          const found = list.data.users.find(
            (u) => u.email?.toLowerCase() === email,
          )
          if (!found) {
            console.error('[solicitar-magic-link] email duplicate but user not found')
            return jsonResponse({ error: 'Tuvimos un problema.' }, 500)
          }
          // ¿Ese user ya tiene afiliado con OTRO DNI?
          const linked = await supabase
            .from('afiliados')
            .select('id, dni')
            .eq('auth_user_id', found.id)
            .maybeSingle()
          if (linked.data && linked.data.dni !== dni) {
            return jsonResponse(
              {
                error: 'Este email ya está asociado a otro afiliado.',
                code: 'email_ya_usado_por_otro_dni',
              },
              409,
            )
          }
          authUserId = found.id
        } else {
          console.error('[solicitar-magic-link] createUser error:', created.error.message)
          return jsonResponse({ error: 'Tuvimos un problema.' }, 500)
        }
      } else {
        authUserId = created.data.user.id
      }

      // Insert afiliado
      const insertAfiliado = await supabase.from('afiliados').insert({
        auth_user_id: authUserId,
        dni,
        legajo: outcome.tipo === 'activo' ? legajo : null,
        nombre: outcome.nombre,
        tipo: outcome.tipo,
        email,
        padron_id: outcome.padronId,
      })
      if (insertAfiliado.error) {
        console.error('[solicitar-magic-link] insert afiliado:', insertAfiliado.error.message)
        return jsonResponse({ error: 'Tuvimos un problema.' }, 500)
      }
    }

    // Generar magic link y enviar email custom.
    //
    // No usamos signInWithOtp porque el template default de gotrue local
    // produce una URL rota (apunta a /verify sin /auth/v1/, fallido por
    // Kong). En su lugar:
    //   1. admin.generateLink → obtenemos hashed_token
    //   2. Construimos URL apuntando a Next.js /auth/callback
    //   3. Enviamos email custom via SMTP a Mailpit
    //
    // En producción, sustituir el SMTP host/port por el provider real
    // (Resend/Sendgrid) vía env vars.
    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:3000'
    const link = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (link.error || !link.data.properties?.hashed_token) {
      console.error(
        '[solicitar-magic-link] generateLink:',
        link.error?.message ?? 'sin hashed_token',
      )
      return jsonResponse({ error: 'No pudimos generar el enlace.' }, 500)
    }
    const tokenHash = link.data.properties.hashed_token
    const callbackUrl = `${siteUrl}/auth/callback?token_hash=${tokenHash}&type=magiclink&next=/feed`

    const smtpHost = Deno.env.get('APP_SMTP_HOST') ?? 'supabase_inbucket_apops-siempre'
    const smtpPort = Number(Deno.env.get('APP_SMTP_PORT') ?? 1025)
    const smtpFrom = Deno.env.get('APP_SMTP_FROM') ?? 'no-reply@apops.local'
    try {
      const mailer = new SMTPClient({
        connection: {
          hostname: smtpHost,
          port: smtpPort,
          tls: false,
        },
        // Mailpit local no usa TLS ni AUTH. allowUnsecure deshabilita el
        // chequeo de denomailer que rechaza enviar sobre conexión plana.
        // En producción, configurar SMTP con TLS via APP_SMTP_* vars.
        debug: {
          allowUnsecure: true,
        },
      })
      await mailer.send({
        from: smtpFrom,
        to: email,
        subject: 'Tu enlace para entrar a APOPS Siempre',
        content: 'auto',
        html: `
<h2>Ingresar a APOPS Siempre</h2>
<p>Hacé clic en el enlace para ingresar:</p>
<p><a href="${callbackUrl}">Ingresar a APOPS Siempre</a></p>
<p>El enlace es de un solo uso y vence en 1 hora. Si no fuiste vos, ignorá este correo.</p>
<p>—<br>APOPS Siempre</p>
        `.trim(),
      })
      await mailer.close()
    } catch (err) {
      console.error('[solicitar-magic-link] smtp error:', (err as Error).message)
      return jsonResponse(
        { error: 'No pudimos enviarte el email. Intentá de nuevo.' },
        500,
      )
    }

    await logAuditEvent({
      evento: 'magic_link_sent',
      dni_intentado: dni,
      ip_address: ip,
      user_agent: userAgent,
      metadata: { flujo },
    })

    return jsonResponse(
      { status: 'magic_link_sent', email_sent_to: maskEmail(email) },
      200,
    )
  }

  // ──────────────────────────────────────────
  // Rama B: no_match → solicitud_pendiente
  // ──────────────────────────────────────────
  const subFlujo = flujo === 'activo' ? 'activo' : 'sin_legajo'

  let nombreCompletoFinal: string | null = null
  if (subFlujo === 'sin_legajo') {
    if (outcome.motivo === 'dni_no_en_padron') {
      // Cliente debe haber capturado el nombre
      if (nombreCompleto.length < 3) {
        return jsonResponse(
          {
            error: 'Necesitamos tu nombre completo.',
            code: 'nombre_completo_requerido',
          },
          400,
        )
      }
      nombreCompletoFinal = nombreCompleto
    } else {
      // sin_papel: tomamos el nombre del padrón (server-side, no se filtra)
      nombreCompletoFinal = outcome.nombreEnPadron
    }
  }

  const insertSolicitud = await supabase
    .from('solicitudes_pendientes')
    .insert({
      dni,
      email,
      sub_flujo: subFlujo,
      motivo_pendiente: outcome.motivo,
      legajo: subFlujo === 'activo' ? legajo : null,
      nombre_completo: subFlujo === 'sin_legajo' ? nombreCompletoFinal : null,
    })
    .select('id')
    .single()

  if (insertSolicitud.error) {
    console.error('[solicitar-magic-link] insert solicitud:', insertSolicitud.error.message)
    return jsonResponse({ error: 'Tuvimos un problema.' }, 500)
  }

  await logAuditEvent({
    evento: 'pendiente_created',
    dni_intentado: dni,
    ip_address: ip,
    user_agent: userAgent,
    metadata: {
      sub_flujo: subFlujo,
      motivo_pendiente: outcome.motivo,
      flujo,
      solicitud_id: insertSolicitud.data.id,
    },
  })

  return jsonResponse(
    {
      status: 'pendiente_validacion',
      mensaje:
        'Estamos verificando tu afiliación APOPS. Te avisaremos por email cuando esté listo.',
    },
    200,
  )
})
