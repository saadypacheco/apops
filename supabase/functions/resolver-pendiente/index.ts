// Edge Function: resolver-pendiente
// Spec: specs/001-afiliado-auth/contracts/edge-pendiente-actions.json
//
// Endpoint admin: aprobar o rechazar una solicitud en estado 'pendiente'.
//
// Aprobar:
//   - Re-valida contra padrón (defense in depth: el padrón pudo haber cambiado).
//   - Crea (o reutiliza) auth.users con el email de la solicitud.
//   - Crea afiliados con tipo derivado del sub_flujo (activo o jubilado).
//   - Marca la solicitud como aprobada.
//   - Genera magic link y envía email custom (mismo SMTP que solicitar-magic-link).
//   - Audita pendiente_approved.
//
// Rechazar:
//   - Marca la solicitud como rechazada con motivo y resolved_*.
//   - Envía email al solicitante con el motivo.
//   - Audita pendiente_rejected.
//
// Verificación de rol admin:
//   - Consulta tabla `roles_admin` (stub en migración 0017).
//   - Si la tabla no existe → 503 (deferred_dependency del contrato).
//   - Si el invocante no tiene fila → 403.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { logAuditEvent } from '../_shared/audit.ts'

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

function getAuthClient(jwt: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    },
  )
}

interface RequestBody {
  solicitud_id?: unknown
  accion?: unknown
  motivo_rechazo?: unknown
}

async function sendEmail(args: {
  to: string
  subject: string
  html: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const smtpHost =
    Deno.env.get('APP_SMTP_HOST') ?? 'supabase_inbucket_apops-siempre'
  const smtpPort = Number(Deno.env.get('APP_SMTP_PORT') ?? 1025)
  const smtpFrom = Deno.env.get('APP_SMTP_FROM') ?? 'no-reply@apops.local'
  try {
    const mailer = new SMTPClient({
      connection: { hostname: smtpHost, port: smtpPort, tls: false },
      debug: { allowUnsecure: true },
    })
    await mailer.send({
      from: smtpFrom,
      to: args.to,
      subject: args.subject,
      content: 'auto',
      html: args.html,
    })
    await mailer.close()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  // ─── Auth: extraer JWT y resolver auth_user_id ───────────────────────
  const authHeader = req.headers.get('authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) {
    return jsonResponse({ error: 'No tenés permisos para esta acción.' }, 403)
  }

  const userClient = getAuthClient(jwt)
  const userRes = await userClient.auth.getUser()
  if (userRes.error || !userRes.data.user) {
    return jsonResponse({ error: 'No tenés permisos para esta acción.' }, 403)
  }
  const callerUserId = userRes.data.user.id

  // ─── Verificación de rol admin (deferred dependency) ─────────────────
  const supabase = getAdminClient()
  const adminCheck = await supabase
    .from('roles_admin')
    .select('auth_user_id')
    .eq('auth_user_id', callerUserId)
    .maybeSingle()

  if (adminCheck.error) {
    // Tabla no existe (PGRST205 / 42P01) → deferred dependency: la feature de
    // roles aún no fue desplegada en este entorno.
    const code = (adminCheck.error.code ?? '').toString()
    const msg = (adminCheck.error.message ?? '').toLowerCase()
    if (
      code === '42P01' ||
      code === 'PGRST205' ||
      msg.includes('does not exist') ||
      msg.includes('relation')
    ) {
      return jsonResponse(
        {
          error: 'El módulo de roles no está disponible.',
          code: 'roles_module_unavailable',
        },
        503,
      )
    }
    console.error('[resolver-pendiente] roles_admin lookup:', adminCheck.error)
    return jsonResponse({ error: 'Tuvimos un problema.' }, 500)
  }
  if (!adminCheck.data) {
    return jsonResponse({ error: 'No tenés permisos para esta acción.' }, 403)
  }

  // Resolver afiliado_id del admin (para resolved_by y audit afiliado_id)
  const callerAfiliado = await supabase
    .from('afiliados')
    .select('id')
    .eq('auth_user_id', callerUserId)
    .maybeSingle()
  const callerAfiliadoId = callerAfiliado.data?.id ?? null

  // ─── Parse body ──────────────────────────────────────────────────────
  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return jsonResponse(
      { error: 'No pudimos leer tu pedido.', code: 'accion_invalida' },
      400,
    )
  }

  const solicitudId =
    typeof body.solicitud_id === 'string' ? body.solicitud_id.trim() : ''
  const accion = body.accion
  const motivoRechazo =
    typeof body.motivo_rechazo === 'string' ? body.motivo_rechazo.trim() : ''

  if (!/^[0-9a-f-]{36}$/i.test(solicitudId)) {
    return jsonResponse(
      { error: 'Solicitud inválida.', code: 'solicitud_no_encontrada' },
      400,
    )
  }
  if (accion !== 'aprobar' && accion !== 'rechazar') {
    return jsonResponse(
      { error: 'Acción inválida.', code: 'accion_invalida' },
      400,
    )
  }
  if (accion === 'rechazar' && motivoRechazo.length < 5) {
    return jsonResponse(
      {
        error: 'Necesitamos un motivo de rechazo legible.',
        code: 'motivo_rechazo_requerido',
      },
      400,
    )
  }

  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent') ?? null

  // ─── Cargar solicitud ────────────────────────────────────────────────
  const solicitudRes = await supabase
    .from('solicitudes_pendientes')
    .select(
      'id, dni, email, sub_flujo, legajo, nombre_completo, motivo_pendiente, estado',
    )
    .eq('id', solicitudId)
    .maybeSingle()
  if (solicitudRes.error) {
    console.error('[resolver-pendiente] solicitud lookup:', solicitudRes.error)
    return jsonResponse({ error: 'Tuvimos un problema.' }, 500)
  }
  if (!solicitudRes.data) {
    return jsonResponse(
      { error: 'No encontramos esa solicitud.', code: 'solicitud_no_encontrada' },
      400,
    )
  }
  const solicitud = solicitudRes.data
  if (solicitud.estado !== 'pendiente') {
    return jsonResponse(
      {
        error: 'Esta solicitud ya fue resuelta.',
        code: 'solicitud_ya_resuelta',
      },
      400,
    )
  }

  // ─── RECHAZAR ────────────────────────────────────────────────────────
  if (accion === 'rechazar') {
    const update = await supabase
      .from('solicitudes_pendientes')
      .update({
        estado: 'rechazada',
        motivo_rechazo: motivoRechazo,
        resolved_at: new Date().toISOString(),
        resolved_by: callerAfiliadoId,
      })
      .eq('id', solicitudId)
    if (update.error) {
      console.error('[resolver-pendiente] update rechazo:', update.error)
      return jsonResponse({ error: 'Tuvimos un problema.' }, 500)
    }

    const mail = await sendEmail({
      to: solicitud.email,
      subject: 'Tu solicitud en APOPS Siempre',
      html: `
<h2>Sobre tu solicitud en APOPS Siempre</h2>
<p>Revisamos tu solicitud y no pudimos confirmarla por la siguiente razón:</p>
<blockquote>${motivoRechazo
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</blockquote>
<p>Si pensás que es un error, comunicate con el sindicato.</p>
<p>—<br>APOPS Siempre</p>
      `.trim(),
    })
    if (!mail.ok) {
      console.error('[resolver-pendiente] smtp rechazo:', mail.error)
      // No bloqueamos: la solicitud ya quedó rechazada en DB. Auditamos.
    }

    await logAuditEvent({
      evento: 'pendiente_rejected',
      dni_intentado: solicitud.dni,
      afiliado_id: callerAfiliadoId,
      ip_address: ip,
      user_agent: userAgent,
      metadata: {
        solicitud_id: solicitudId,
        email_sent: mail.ok,
      },
    })

    return jsonResponse({ status: 'rechazada' }, 200)
  }

  // ─── APROBAR ─────────────────────────────────────────────────────────
  // Defense in depth: re-validar contra padrón con los datos de la solicitud.
  // El padrón pudo haber cambiado entre la solicitud y la aprobación. Si la
  // re-validación cambia el outcome, igual avanzamos: el admin tiene autoridad
  // sobre el padrón y puede aprobar manualmente. Solo registramos el cambio
  // en metadata del audit.
  let revalNombrePadron: string | null = null
  if (solicitud.sub_flujo === 'activo' && solicitud.legajo) {
    const padron = await supabase
      .from('padron_cotizantes')
      .select('nombre')
      .eq('dni', solicitud.dni)
      .eq('legajo', solicitud.legajo)
      .maybeSingle()
    revalNombrePadron = padron.data?.nombre ?? null
  } else {
    const padron = await supabase
      .from('padron_cotizantes')
      .select('nombre')
      .eq('dni', solicitud.dni)
      .maybeSingle()
    revalNombrePadron = padron.data?.nombre ?? null
  }

  // ¿Conflicto: DNI ya tiene afiliado activo?
  const dniConflict = await supabase
    .from('afiliados')
    .select('id')
    .eq('dni', solicitud.dni)
    .maybeSingle()
  if (dniConflict.error) {
    console.error('[resolver-pendiente] dni conflict lookup:', dniConflict.error)
    return jsonResponse({ error: 'Tuvimos un problema.' }, 500)
  }
  if (dniConflict.data) {
    return jsonResponse(
      { error: 'Ya existe un afiliado con ese DNI.', code: 'dni_ya_existe' },
      409,
    )
  }

  // Obtener o crear auth.users por email.
  let authUserId: string
  const created = await supabase.auth.admin.createUser({
    email: solicitud.email,
    email_confirm: true,
  })
  if (created.error) {
    const msg = (created.error.message ?? '').toLowerCase()
    if (
      msg.includes('already') ||
      msg.includes('email') ||
      msg.includes('registered')
    ) {
      const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const found = list.data.users.find(
        (u) => u.email?.toLowerCase() === solicitud.email.toLowerCase(),
      )
      if (!found) {
        console.error('[resolver-pendiente] email duplicate but user not found')
        return jsonResponse({ error: 'Tuvimos un problema.' }, 500)
      }
      // ¿Ese auth_user ya está vinculado a OTRO afiliado con OTRO DNI?
      const linked = await supabase
        .from('afiliados')
        .select('id, dni')
        .eq('auth_user_id', found.id)
        .maybeSingle()
      if (linked.data && linked.data.dni !== solicitud.dni) {
        return jsonResponse(
          {
            error: 'Este email ya está asociado a otro afiliado.',
            code: 'email_ya_existe',
          },
          409,
        )
      }
      authUserId = found.id
    } else {
      console.error('[resolver-pendiente] createUser:', created.error)
      return jsonResponse({ error: 'Tuvimos un problema.' }, 500)
    }
  } else {
    authUserId = created.data.user.id
  }

  // Determinar tipo y nombre del afiliado.
  // - sub_flujo='activo' → tipo='activo' (precisa legajo NOT NULL).
  // - sub_flujo='sin_legajo' → tipo='jubilado'.
  // - nombre: del padrón si existe, si no del campo nombre_completo de la solicitud.
  const tipo: 'activo' | 'jubilado' =
    solicitud.sub_flujo === 'activo' ? 'activo' : 'jubilado'
  const nombre =
    revalNombrePadron ??
    solicitud.nombre_completo ??
    `DNI ${solicitud.dni}` // fallback defensivo: el constraint NOT NULL lo exige

  const insertAfiliado = await supabase
    .from('afiliados')
    .insert({
      auth_user_id: authUserId,
      dni: solicitud.dni,
      legajo: tipo === 'activo' ? solicitud.legajo : null,
      nombre,
      tipo,
      email: solicitud.email,
    })
    .select('id')
    .single()
  if (insertAfiliado.error) {
    console.error('[resolver-pendiente] insert afiliado:', insertAfiliado.error)
    return jsonResponse({ error: 'Tuvimos un problema.' }, 500)
  }
  const afiliadoId = insertAfiliado.data.id

  // Marcar solicitud aprobada.
  const update = await supabase
    .from('solicitudes_pendientes')
    .update({
      estado: 'aprobada',
      resolved_at: new Date().toISOString(),
      resolved_by: callerAfiliadoId,
    })
    .eq('id', solicitudId)
  if (update.error) {
    console.error('[resolver-pendiente] update aprobacion:', update.error)
    // El afiliado ya quedó creado; reportamos pero no rollback del afiliado.
    return jsonResponse({ error: 'Tuvimos un problema.' }, 500)
  }

  // Generar magic link y enviar email custom (FR-019).
  const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:3000'
  const link = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: solicitud.email,
  })
  if (link.error || !link.data.properties?.hashed_token) {
    console.error('[resolver-pendiente] generateLink:', link.error)
    // El afiliado quedó creado; el admin puede reintentar manualmente.
    return jsonResponse({ error: 'No pudimos generar el enlace.' }, 500)
  }
  const callbackUrl = `${siteUrl}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/feed`

  const mail = await sendEmail({
    to: solicitud.email,
    subject: 'Tu alta en APOPS Siempre fue aprobada',
    html: `
<h2>¡Bienvenido/a a APOPS Siempre!</h2>
<p>Confirmamos tu afiliación. Hacé clic en el enlace para entrar:</p>
<p><a href="${callbackUrl}">Ingresar a APOPS Siempre</a></p>
<p>El enlace es de un solo uso y vence en 1 hora.</p>
<p>—<br>APOPS Siempre</p>
    `.trim(),
  })
  if (!mail.ok) {
    console.error('[resolver-pendiente] smtp aprobacion:', mail.error)
    // No revertimos: el afiliado quedó alta. El audit lo registra.
  }

  await logAuditEvent({
    evento: 'pendiente_approved',
    dni_intentado: solicitud.dni,
    afiliado_id: afiliadoId,
    ip_address: ip,
    user_agent: userAgent,
    metadata: {
      solicitud_id: solicitudId,
      tipo,
      sub_flujo: solicitud.sub_flujo,
      resolved_by: callerAfiliadoId,
      email_sent: mail.ok,
    },
  })

  return jsonResponse(
    { status: 'aprobada', afiliado_id: afiliadoId },
    200,
  )
})
