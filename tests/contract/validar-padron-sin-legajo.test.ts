import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { makeServiceRoleClient } from '../rls/_helpers'

// Contract test para Edge Function validar-padron, sub-flujo 'sin_legajo'.
// Spec: specs/001-afiliado-auth/contracts/edge-validar-padron.json
//
// Pre-requisitos:
//   - `supabase start` corriendo
//   - .env.local con SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY
//   - seed.sql aplicado (DNI 20000001 jubilado y 20000002 sin afiliación deben existir)

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// DNIs usados en estos tests
const DNI_SEED_JUBILADO = '20000001' // cotiza_papel=true (seed)
const DNI_SEED_SIN_AFILIACION = '20000002' // afiliado_apops=false, cotiza_papel=false
const DNI_NOT_IN_PADRON = '88888887'

const DNIS_TO_CLEAN = [
  DNI_SEED_JUBILADO,
  DNI_SEED_SIN_AFILIACION,
  DNI_NOT_IN_PADRON,
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

describe('Contract: validar-padron — sub-flujo sin_legajo', () => {
  beforeAll(async () => {
    await cleanAuditByDnis(DNIS_TO_CLEAN)
  })

  afterAll(async () => {
    await cleanAuditByDnis(DNIS_TO_CLEAN)
  })

  it('200 match=true tipo=jubilado cuando DNI tiene cotiza_papel=true', async () => {
    const { status, body } = await callValidarPadron({
      dni: DNI_SEED_JUBILADO,
      flujo: 'sin_legajo',
    })
    expect(status).toBe(200)
    expect(body).toEqual({ match: true, tipo: 'jubilado' })
    // Privacidad (constitución V): no se filtran datos del padrón
    expect(body).not.toHaveProperty('nombre')
    expect(body).not.toHaveProperty('legajo')
  })

  it('200 match=false motivo=dni_no_en_padron cuando DNI no figura en padrón', async () => {
    const { status, body } = await callValidarPadron({
      dni: DNI_NOT_IN_PADRON,
      flujo: 'sin_legajo',
    })
    expect(status).toBe(200)
    expect(body).toEqual({ match: false, motivo: 'dni_no_en_padron' })
  })

  it('200 match=false motivo=sin_papel cuando DNI en padrón sin cotiza_papel', async () => {
    const { status, body } = await callValidarPadron({
      dni: DNI_SEED_SIN_AFILIACION,
      flujo: 'sin_legajo',
    })
    expect(status).toBe(200)
    expect(body).toEqual({ match: false, motivo: 'sin_papel' })
    // Privacidad: no se expone el nombre ni se filtra a qué gremio cotiza
    expect(body).not.toHaveProperty('nombre')
    expect(body).not.toHaveProperty('afiliado_ate')
  })

  it('400 dni_invalido cuando DNI no matchea regex', async () => {
    const { status, body } = await callValidarPadron({
      dni: '12',
      flujo: 'sin_legajo',
    })
    expect(status).toBe(400)
    expect(body).toMatchObject({ code: 'dni_invalido' })
  })

  it('400 legajo_no_aplica cuando flujo=sin_legajo y se envía legajo', async () => {
    const { status, body } = await callValidarPadron({
      dni: DNI_SEED_JUBILADO,
      legajo: 'L-1234',
      flujo: 'sin_legajo',
    })
    expect(status).toBe(400)
    expect(body).toMatchObject({ code: 'legajo_no_aplica' })
  })
})
