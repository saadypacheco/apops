// Edge Function: validar-padron
// Spec: specs/001-afiliado-auth/contracts/edge-validar-padron.json
//
// Valida la existencia de una persona en padron_cotizantes según el flujo
// (activo o sin_legajo) y devuelve solo el dato mínimo necesario al cliente
// (constitución V — privacidad por diseño). Aplica rate limiting y registra
// cada intento en audit_log.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
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

interface RequestBody {
  dni?: unknown
  legajo?: unknown
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
      { error: 'No pudimos leer tu pedido. Intentá de nuevo.', code: 'dni_invalido' },
      400,
    )
  }

  const dni = typeof body.dni === 'string' ? body.dni.trim() : ''
  const legajo = typeof body.legajo === 'string' ? body.legajo.trim() : ''
  const flujo = body.flujo

  // Validación: DNI
  if (!/^[0-9]{7,8}$/.test(dni)) {
    return jsonResponse(
      { error: 'El DNI no es válido. Tiene que tener 7 u 8 dígitos.', code: 'dni_invalido' },
      400,
    )
  }

  // Validación: flujo
  if (flujo !== 'activo' && flujo !== 'sin_legajo') {
    return jsonResponse(
      { error: 'El flujo de validación no es válido.', code: 'flujo_invalido' },
      400,
    )
  }

  // Validación cruzada: legajo según flujo
  if (flujo === 'activo' && legajo === '') {
    return jsonResponse(
      {
        error: 'Necesitamos tu legajo para validarte como afiliado activo.',
        code: 'legajo_requerido',
      },
      400,
    )
  }
  if (flujo === 'sin_legajo' && legajo !== '') {
    return jsonResponse(
      {
        error: 'En este flujo no se ingresa legajo.',
        code: 'legajo_no_aplica',
      },
      400,
    )
  }

  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent') ?? null

  // 1. Rate limit ANTES de loguear el attempt (ver doc de rate-limit.ts)
  const rate = await checkRateLimit({ dni, ip })
  if (!rate.allowed) {
    await logAuditEvent({
      evento: 'rate_limit_exceeded',
      dni_intentado: dni,
      ip_address: ip,
      user_agent: userAgent,
      metadata: { reason: rate.reason, flujo },
    })
    return jsonResponse(
      {
        error: 'Demasiados intentos. Esperá un rato y volvé a probar.',
        code: rate.reason === 'dni_limit' ? 'rate_limit_dni' : 'rate_limit_ip',
        retry_after_seconds: rate.retry_after_seconds,
      },
      429,
    )
  }

  // 2. Audit del intento
  await logAuditEvent({
    evento: 'padron_validation_attempt',
    dni_intentado: dni,
    ip_address: ip,
    user_agent: userAgent,
    metadata: { flujo },
  })

  // 3. Buscar en padrón con service_role (bypassa RLS)
  const supabase = getAdminClient()
  let query = supabase
    .from('padron_cotizantes')
    .select('id, afiliado_apops, cotiza_papel')
    .eq('dni', dni)
  if (flujo === 'activo') {
    query = query.eq('legajo', legajo)
  }
  const result = await query.maybeSingle()

  if (result.error) {
    console.error('[validar-padron] DB error:', result.error.message)
    return jsonResponse(
      { error: 'Tuvimos un problema. Intentá de nuevo en un momento.' },
      500,
    )
  }

  // No matchea → motivo dni_no_en_padron
  if (!result.data) {
    await logAuditEvent({
      evento: 'padron_validation_failure',
      dni_intentado: dni,
      ip_address: ip,
      user_agent: userAgent,
      metadata: { motivo: 'dni_no_en_padron', flujo },
    })
    return jsonResponse({ match: false, motivo: 'dni_no_en_padron' }, 200)
  }

  // Matchea → chequear flag según flujo
  if (flujo === 'activo') {
    if (result.data.afiliado_apops) {
      await logAuditEvent({
        evento: 'padron_validation_success',
        dni_intentado: dni,
        ip_address: ip,
        user_agent: userAgent,
        metadata: { tipo: 'activo', flujo },
      })
      return jsonResponse({ match: true, tipo: 'activo' }, 200)
    }
    await logAuditEvent({
      evento: 'padron_validation_no_afiliacion',
      dni_intentado: dni,
      ip_address: ip,
      user_agent: userAgent,
      metadata: { motivo: 'sin_apops', flujo },
    })
    return jsonResponse({ match: false, motivo: 'sin_apops' }, 200)
  }

  // flujo === 'sin_legajo'
  if (result.data.cotiza_papel) {
    await logAuditEvent({
      evento: 'padron_validation_success',
      dni_intentado: dni,
      ip_address: ip,
      user_agent: userAgent,
      metadata: { tipo: 'jubilado', flujo },
    })
    return jsonResponse({ match: true, tipo: 'jubilado' }, 200)
  }
  await logAuditEvent({
    evento: 'padron_validation_no_afiliacion',
    dni_intentado: dni,
    ip_address: ip,
    user_agent: userAgent,
    metadata: { motivo: 'sin_papel', flujo },
  })
  return jsonResponse({ match: false, motivo: 'sin_papel' }, 200)
})
