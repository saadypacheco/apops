import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { makeServiceRoleClient } from '../rls/_helpers'

// Phase 6 / T070 — Escenario 6 de quickstart.md: rate-limit excedido.
//
// Diferencia con el contract test existente (validar-padron-activo:
// "429 rate_limit_dni"): aquel verifica el shape de la respuesta HTTP. Este
// test verifica el AUDIT TRAIL completo del Escenario 6 — que los 5
// fallos quedan registrados como `padron_validation_failure` y el 6to
// como `rate_limit_exceeded` (FR-013, constitución V).

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const DNI_RL = '14141414' // DNI no en padrón → cada intento da 'failure'
const LEGAJO_RL = 'L-RL01'

async function callValidarPadron(body: unknown) {
  const res = await fetch(`${FUNCTIONS_URL}/validar-padron`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })
  let parsed: unknown = null
  try {
    parsed = await res.json()
  } catch {
    // body vacío
  }
  return {
    status: res.status,
    body: parsed as Record<string, unknown> | null,
  }
}

async function cleanup(): Promise<void> {
  const admin = makeServiceRoleClient()
  await admin.from('audit_log').delete().eq('dni_intentado', DNI_RL)
}

describe('Integración Phase 6: rate-limit + audit trail (Escenario 6)', () => {
  beforeAll(cleanup)
  afterAll(cleanup)

  it(
    '5 fallos quedan como padron_validation_failure y el 6to como rate_limit_exceeded (FR-013)',
    async () => {
      // 5 intentos legítimos pero fallidos (DNI no existe)
      for (let i = 0; i < 5; i++) {
        const r = await callValidarPadron({
          dni: DNI_RL,
          legajo: LEGAJO_RL,
          flujo: 'activo',
        })
        expect(r.status, `intento ${i + 1}`).toBe(200)
        expect(r.body, `intento ${i + 1} body`).toMatchObject({
          match: false,
          motivo: 'dni_no_en_padron',
        })
      }

      // 6to → 429 con mensaje claro y retry_after_seconds
      const sixth = await callValidarPadron({
        dni: DNI_RL,
        legajo: LEGAJO_RL,
        flujo: 'activo',
      })
      expect(sixth.status).toBe(429)
      expect(typeof sixth.body?.['retry_after_seconds']).toBe('number')
      expect((sixth.body?.['retry_after_seconds'] ?? 0) as number).toBeGreaterThan(0)
      // El error debe ser un mensaje legible (no código técnico)
      expect(typeof sixth.body?.['error']).toBe('string')
      expect((sixth.body?.['error'] as string).length).toBeGreaterThan(10)

      // Audit trail completo del Escenario 6
      const admin = makeServiceRoleClient()
      const { data: events } = await admin
        .from('audit_log')
        .select('evento, ip_address, user_agent, metadata')
        .eq('dni_intentado', DNI_RL)
        .order('created_at', { ascending: true })
      const eventos = events?.map((e) => e.evento) ?? []

      // 5 attempts (uno por intento legítimo) + 5 failures + 1 rate_limit_exceeded.
      // Nota: el 6to NO produce 'padron_validation_attempt' porque el rate-limit
      // se chequea ANTES del attempt (ver _shared/rate-limit.ts comentario).
      const attempts = eventos.filter((e) => e === 'padron_validation_attempt')
      const failures = eventos.filter((e) => e === 'padron_validation_failure')
      const rateLimits = eventos.filter((e) => e === 'rate_limit_exceeded')
      expect(attempts.length).toBe(5)
      expect(failures.length).toBe(5)
      expect(rateLimits.length).toBe(1)
    },
    30000,
  )
})
