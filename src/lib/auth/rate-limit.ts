import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { MetodoAuth } from '@/types/auth'

// Rate limit + bloqueo temporal de afiliados.
// Decisión D7 (auth-v2.md): tabla auth_attempts, ventana de 15 min, 5 intentos
// fallidos por (identifier ∪ ip). Tras N fallos consecutivos sobre un afiliado
// existente, se setea `afiliados.bloqueado_hasta = now() + 15min`.

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000
const BLOQUEO_DEFAULT_MS = 15 * 60 * 1000

export type RateLimitResult =
  | { ok: true }
  | { ok: false; razon: 'too_many_attempts' }

// Chequea cuántos intentos fallidos hay en la ventana de tiempo, tanto por
// identifier como por IP (si está disponible). El que llegue primero a
// MAX_ATTEMPTS dispara el rechazo.
export async function checkRateLimit(args: {
  identifier: string
  ip?: string | null
  client: SupabaseClient<Database>
}): Promise<RateLimitResult> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString()

  const byId = await args.client
    .from('auth_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('identifier', args.identifier)
    .eq('exitoso', false)
    .gte('intentado_at', since)

  if ((byId.count ?? 0) >= MAX_ATTEMPTS) {
    return { ok: false, razon: 'too_many_attempts' }
  }

  if (args.ip) {
    const byIp = await args.client
      .from('auth_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', args.ip)
      .eq('exitoso', false)
      .gte('intentado_at', since)

    if ((byIp.count ?? 0) >= MAX_ATTEMPTS) {
      return { ok: false, razon: 'too_many_attempts' }
    }
  }

  return { ok: true }
}

export async function recordAttempt(args: {
  identifier: string
  ip?: string | null
  exitoso: boolean
  metodo: MetodoAuth
  client: SupabaseClient<Database>
}): Promise<void> {
  await args.client.from('auth_attempts').insert({
    identifier: args.identifier,
    ip_address: args.ip ?? null,
    exitoso: args.exitoso,
    metodo: args.metodo,
  })
}

// Helper puro: dado el row de afiliado, ¿está bloqueado en este momento?
// No hace round-trip a DB — el caller normalmente ya tiene el row.
export function isBloqueadoFromRow(
  afiliado: Pick<
    Database['public']['Tables']['afiliados']['Row'],
    'bloqueado_hasta'
  >,
  now: Date = new Date(),
): boolean {
  if (!afiliado.bloqueado_hasta) return false
  return new Date(afiliado.bloqueado_hasta) > now
}

// Bloquea temporalmente al afiliado tras N fallos consecutivos.
// Idempotente: si ya está bloqueado, extiende el lock hasta el nuevo `hasta`.
export async function bloquearTemporal(args: {
  afiliadoId: string
  motivo: string
  duracionMs?: number
  client: SupabaseClient<Database>
}): Promise<void> {
  const hasta = new Date(Date.now() + (args.duracionMs ?? BLOQUEO_DEFAULT_MS))
  await args.client
    .from('afiliados')
    .update({
      bloqueado_hasta: hasta.toISOString(),
      bloqueado_motivo: args.motivo,
    })
    .eq('id', args.afiliadoId)
}

// Limpia el bloqueo (útil cuando el admin lo desbloquea manualmente).
export async function desbloquear(args: {
  afiliadoId: string
  client: SupabaseClient<Database>
}): Promise<void> {
  await args.client
    .from('afiliados')
    .update({
      bloqueado_hasta: null,
      bloqueado_motivo: null,
    })
    .eq('id', args.afiliadoId)
}

export const RATE_LIMIT_CONFIG = {
  MAX_ATTEMPTS,
  WINDOW_MS,
  BLOQUEO_DEFAULT_MS,
} as const
