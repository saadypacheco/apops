import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { makeServiceRoleClient } from '../rls/_helpers'

// Contract test para Edge Function validar-padron, sub-flujo 'activo'.
// Spec: specs/001-afiliado-auth/contracts/edge-validar-padron.json
//
// Pre-requisitos:
//   - `supabase start` corriendo
//   - .env.local con SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY
//   - seed.sql aplicado (DNIs 30000001 y 30000003 deben existir en padron)

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// DNIs usados en estos tests
const DNI_SEED_APOPS = '30000001' // afiliado_apops=true (seed)
const LEGAJO_SEED_APOPS = 'L-0001'
const DNI_SEED_OTRO_GREMIO = '30000003' // afiliado_apops=false, ate=true
const LEGAJO_SEED_OTRO_GREMIO = 'L-0003'
const DNI_NOT_IN_PADRON = '99999999'
const DNI_FOR_RATE_LIMIT = '12345678'

// DNIs cuyos audit_log se limpian antes y después del suite
const DNIS_TO_CLEAN = [
  DNI_SEED_APOPS,
  DNI_SEED_OTRO_GREMIO,
  DNI_NOT_IN_PADRON,
  DNI_FOR_RATE_LIMIT,
]

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
    // body vacío o no-JSON
  }
  return { status: res.status, body: parsed as Record<string, unknown> | null }
}

async function cleanAuditByDnis(dnis: string[]) {
  const admin = makeServiceRoleClient()
  await admin.from('audit_log').delete().in('dni_intentado', dnis)
}

describe('Contract: validar-padron — sub-flujo activo', () => {
  beforeAll(async () => {
    await cleanAuditByDnis(DNIS_TO_CLEAN)
  })

  afterAll(async () => {
    await cleanAuditByDnis(DNIS_TO_CLEAN)
  })

  it('200 match=true tipo=activo cuando DNI+legajo coinciden y afiliado_apops=true', async () => {
    const { status, body } = await callValidarPadron({
      dni: DNI_SEED_APOPS,
      legajo: LEGAJO_SEED_APOPS,
      flujo: 'activo',
    })
    expect(status).toBe(200)
    expect(body).toEqual({ match: true, tipo: 'activo' })
  })

  it('200 match=false motivo=dni_no_en_padron cuando DNI no figura en padrón', async () => {
    const { status, body } = await callValidarPadron({
      dni: DNI_NOT_IN_PADRON,
      legajo: 'L-9999',
      flujo: 'activo',
    })
    expect(status).toBe(200)
    expect(body).toEqual({ match: false, motivo: 'dni_no_en_padron' })
  })

  it('200 match=false motivo=sin_apops cuando DNI en padrón sin flag APOPS', async () => {
    const { status, body } = await callValidarPadron({
      dni: DNI_SEED_OTRO_GREMIO,
      legajo: LEGAJO_SEED_OTRO_GREMIO,
      flujo: 'activo',
    })
    expect(status).toBe(200)
    expect(body).toEqual({ match: false, motivo: 'sin_apops' })
    // Privacidad (constitución V): NO se filtra a qué gremio cotiza
    expect(body).not.toHaveProperty('afiliado_ate')
    expect(body).not.toHaveProperty('nombre')
  })

  it('400 dni_invalido cuando DNI no matchea regex', async () => {
    const { status, body } = await callValidarPadron({
      dni: 'abc',
      legajo: LEGAJO_SEED_APOPS,
      flujo: 'activo',
    })
    expect(status).toBe(400)
    expect(body).toMatchObject({ code: 'dni_invalido' })
  })

  it('400 legajo_requerido cuando flujo=activo y falta legajo', async () => {
    const { status, body } = await callValidarPadron({
      dni: DNI_SEED_APOPS,
      flujo: 'activo',
    })
    expect(status).toBe(400)
    expect(body).toMatchObject({ code: 'legajo_requerido' })
  })

  it(
    '429 rate_limit_dni después de 5 intentos en 1h con el mismo DNI (el 6to falla)',
    async () => {
      // 5 intentos válidos (devuelven 200 no_match porque el DNI no está en padrón)
      for (let i = 0; i < 5; i++) {
        const r = await callValidarPadron({
          dni: DNI_FOR_RATE_LIMIT,
          legajo: 'L-XXXX',
          flujo: 'activo',
        })
        expect(r.status, `intento ${i + 1} debió ser 200`).toBe(200)
      }

      // 6to intento → 429
      const { status, body } = await callValidarPadron({
        dni: DNI_FOR_RATE_LIMIT,
        legajo: 'L-XXXX',
        flujo: 'activo',
      })
      expect(status).toBe(429)
      expect(body).toMatchObject({ code: 'rate_limit_dni' })
      expect(typeof body?.retry_after_seconds).toBe('number')
    },
    30000,
  )
})
