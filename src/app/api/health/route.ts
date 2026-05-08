import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Endpoint de diagnóstico: verifica conexión a Supabase desde el server.
// Útil para confirmar que las env vars cargaron y las keys (anon +
// service_role) son válidas. NO requiere auth — devuelve solo metadata,
// nada de PII.
//
// Uso: GET /api/health
// Respuesta: 200 con un JSON detallado de cada check.
//
// En cualquier proyecto futuro: copiar este archivo y ajustar las tablas
// a chequear. Es genérico.

export const dynamic = 'force-dynamic'

type Check = { ok: boolean; count?: number; error?: unknown; status?: number }

function safeError(e: unknown): unknown {
  if (e === null || e === undefined) return null
  if (typeof e === 'string') return e
  if (e instanceof Error) {
    return { name: e.name, message: e.message, stack: e.stack?.split('\n').slice(0, 3) }
  }
  // PostgrestError u objetos similares: serializar todas las props enumerables
  try {
    return JSON.parse(JSON.stringify(e))
  } catch {
    return String(e)
  }
}

export async function GET() {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  }

  // 1. ENV vars presentes (no logueamos los valores reales — solo presencia
  // y prefijo de las keys para distinguir formato legacy vs nuevo).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  result.envVars = {
    SUPABASE_URL_set: !!url,
    SUPABASE_URL_value: url || null,
    SUPABASE_ANON_KEY_set: !!anon,
    SUPABASE_ANON_KEY_prefix: anon ? anon.slice(0, 8) + '...' : null,
    SUPABASE_ANON_KEY_format: anon.startsWith('eyJ')
      ? 'legacy_jwt'
      : anon.startsWith('sb_publishable_')
        ? 'new_publishable'
        : 'unknown',
    SUPABASE_SERVICE_ROLE_KEY_set: !!serviceRole,
    SUPABASE_SERVICE_ROLE_KEY_prefix: serviceRole
      ? serviceRole.slice(0, 8) + '...'
      : null,
    SUPABASE_SERVICE_ROLE_KEY_format: serviceRole.startsWith('eyJ')
      ? 'legacy_jwt'
      : serviceRole.startsWith('sb_secret_')
        ? 'new_secret'
        : 'unknown',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
  }

  // 2. Anon client puede leer noticias publicadas (RLS open a anon)
  try {
    const supabase = createClient()
    const { data, count, error, status, statusText } = await supabase
      .from('noticias')
      .select('id', { count: 'exact', head: false })
      .eq('publicada', true)
      .limit(1)
    const check: Check = {
      ok: !error,
      count: count ?? 0,
      error: safeError(error),
      status,
    }
    ;(check as Record<string, unknown>).statusText = statusText
    ;(check as Record<string, unknown>).gotData = !!data
    result.anonReadNoticias = check
  } catch (e) {
    result.anonReadNoticias = { ok: false, error: safeError(e) }
  }

  // 3. Admin (service_role) puede leer padrón_cotizantes (RLS deny por
  // default, solo service_role accede)
  try {
    const admin = createAdminClient()
    const { data, count, error, status, statusText } = await admin
      .from('padron_cotizantes')
      .select('id', { count: 'exact', head: false })
      .limit(1)
    const check: Check = {
      ok: !error,
      count: count ?? 0,
      error: safeError(error),
      status,
    }
    ;(check as Record<string, unknown>).statusText = statusText
    ;(check as Record<string, unknown>).gotData = !!data
    result.adminReadPadron = check
  } catch (e) {
    result.adminReadPadron = { ok: false, error: safeError(e) }
  }

  // 4. Admin puede leer afiliados (debería estar vacía en cloud nuevo)
  try {
    const admin = createAdminClient()
    const { count, error, status, statusText } = await admin
      .from('afiliados')
      .select('id', { count: 'exact', head: true })
    const check: Check = {
      ok: !error,
      count: count ?? 0,
      error: safeError(error),
      status,
    }
    ;(check as Record<string, unknown>).statusText = statusText
    result.adminReadAfiliados = check
  } catch (e) {
    result.adminReadAfiliados = { ok: false, error: safeError(e) }
  }

  return NextResponse.json(result, { status: 200 })
}
