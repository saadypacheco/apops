import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { makeServiceRoleClient } from '../rls/_helpers'

// US3 — Escenario 3 de quickstart.md: sub-flujo activo deja una solicitud
// pendiente con los campos correctamente discriminados.
//
// A diferencia del test gemelo `flujo-activo-no-en-padron.test.ts` (US1
// happy-edge), este test verifica desde la perspectiva US3:
//   - los campos exactos persistidos según el discriminador chk_subflujo_data
//   - que el constraint rechaza combinaciones inválidas (defense in depth)
//
// El constraint dice: sub_flujo='activo' ↔ legajo NOT NULL AND nombre_completo NULL.

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const DNI = '99999986' // No en padrón
const LEGAJO = 'L-9986'
const RUN_ID = Date.now().toString(36)
const EMAIL = `pact-${DNI}+${RUN_ID}@test.local`

async function callSolicitarMagicLink(body: unknown) {
  const res = await fetch(`${FUNCTIONS_URL}/solicitar-magic-link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

async function cleanup(): Promise<void> {
  const admin = makeServiceRoleClient()
  await admin.from('solicitudes_pendientes').delete().eq('dni', DNI)
  await admin.from('audit_log').delete().eq('dni_intentado', DNI)
}

describe('Integración US3: pendiente sub_flujo=activo', () => {
  beforeAll(cleanup)
  afterAll(cleanup)

  it('persiste DNI, legajo, email; nombre_completo queda NULL; motivo=dni_no_en_padron', async () => {
    const res = await callSolicitarMagicLink({
      dni: DNI,
      legajo: LEGAJO,
      email: EMAIL,
      flujo: 'activo',
    })
    expect(res.status).toBe(200)
    expect(res.body['status']).toBe('pendiente_validacion')

    const supabase = makeServiceRoleClient()
    const { data: solicitud } = await supabase
      .from('solicitudes_pendientes')
      .select(
        'dni, email, sub_flujo, legajo, nombre_completo, motivo_pendiente, estado',
      )
      .eq('dni', DNI)
      .single()
    expect(solicitud).toEqual({
      dni: DNI,
      email: EMAIL,
      sub_flujo: 'activo',
      legajo: LEGAJO,
      nombre_completo: null,
      motivo_pendiente: 'dni_no_en_padron',
      estado: 'pendiente',
    })
  })

  it('rechaza al insertar sub_flujo=activo con legajo NULL (chk_subflujo_data)', async () => {
    const supabase = makeServiceRoleClient()
    const ins = await supabase
      .from('solicitudes_pendientes')
      .insert({
        dni: '99999985',
        email: `xfail+${RUN_ID}@test.local`,
        sub_flujo: 'activo',
        legajo: null,
        nombre_completo: null,
        motivo_pendiente: 'dni_no_en_padron',
      })
      .select('id')
    expect(ins.error).toBeTruthy()
    expect(ins.error?.message.toLowerCase()).toMatch(
      /chk_subflujo_data|check constraint/,
    )
  })

  it('rechaza al insertar sub_flujo=activo con nombre_completo NOT NULL (chk_subflujo_data)', async () => {
    const supabase = makeServiceRoleClient()
    const ins = await supabase
      .from('solicitudes_pendientes')
      .insert({
        dni: '99999984',
        email: `xfail2+${RUN_ID}@test.local`,
        sub_flujo: 'activo',
        legajo: 'L-9984',
        nombre_completo: 'No, Should',
        motivo_pendiente: 'dni_no_en_padron',
      })
      .select('id')
    expect(ins.error).toBeTruthy()
  })
})
