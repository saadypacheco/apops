// Helper compartido para rate-limiting de validaciones contra padrón.
// Runtime: Deno (Supabase Edge Functions).
//
// Diseño según research.md decisión 4 y FR-013:
//   - Por DNI:        máximo 5 intentos / hora
//   - Por IP address: máximo 20 intentos / hora
//
// Fuente de conteo: tabla audit_log, evento 'padron_validation_attempt'.
//
// Orden de invocación que el caller debe seguir:
//   1. checkRateLimit() — cuenta intentos ANTERIORES (sin incluir el actual)
//   2. Si denied → registrar 'rate_limit_exceeded' y devolver HTTP 429
//   3. Si allowed → registrar 'padron_validation_attempt' y proceder
//
// Esta secuencia hace que el 6to intento de DNI falle (5 anteriores = 5,
// 5 >= 5 → deny). Si invirtiéramos el orden, el 5to legítimo fallaría
// (off-by-one).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const ONE_HOUR_MS = 60 * 60 * 1000
const DNI_LIMIT_PER_HOUR = 5
const IP_LIMIT_PER_HOUR = 20

export type RateLimitDecision =
  | { allowed: true }
  | {
      allowed: false
      reason: 'dni_limit' | 'ip_limit'
      retry_after_seconds: number
    }

// Eventos por defecto que cuentan como "intento de auth" para rate-limit.
// validar-padron usa el default; solicitar-magic-link puede pasar una lista
// más amplia para cubrir bypass de validar-padron.
const DEFAULT_EVENTS = ['padron_validation_attempt']

function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
}

export async function checkRateLimit(params: {
  dni: string
  ip: string | null
  events?: string[]
}): Promise<RateLimitDecision> {
  const supabase = getAdminClient()
  const oneHourAgo = new Date(Date.now() - ONE_HOUR_MS).toISOString()
  const events = params.events ?? DEFAULT_EVENTS

  // Conteo por DNI (idéntico DNI desde cualquier IP)
  const dniQuery = await supabase
    .from('audit_log')
    .select('*', { count: 'exact', head: true })
    .in('evento', events)
    .eq('dni_intentado', params.dni)
    .gte('created_at', oneHourAgo)

  if (dniQuery.error) {
    // Si falla la consulta, fail-open: permitir el intento. La alternativa
    // (fail-closed) lockearía a usuarios legítimos por un bug interno.
    console.error('[rate-limit] DNI count failed:', dniQuery.error.message)
    return { allowed: true }
  }

  if ((dniQuery.count ?? 0) >= DNI_LIMIT_PER_HOUR) {
    return {
      allowed: false,
      reason: 'dni_limit',
      retry_after_seconds: 3600,
    }
  }

  // Conteo por IP (cualquier DNI desde la misma IP)
  if (params.ip) {
    const ipQuery = await supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .in('evento', events)
      .eq('ip_address', params.ip)
      .gte('created_at', oneHourAgo)

    if (ipQuery.error) {
      console.error('[rate-limit] IP count failed:', ipQuery.error.message)
      return { allowed: true }
    }

    if ((ipQuery.count ?? 0) >= IP_LIMIT_PER_HOUR) {
      return {
        allowed: false,
        reason: 'ip_limit',
        retry_after_seconds: 3600,
      }
    }
  }

  return { allowed: true }
}
