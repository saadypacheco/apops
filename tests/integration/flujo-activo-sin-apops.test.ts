import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { makeServiceRoleClient } from '../rls/_helpers'

// US3 edge — Escenario 4b de quickstart.md
// DNI en padrón pero afiliado_apops=false (cotiza a otro gremio: ATE en seed) →
// solicitud_pendiente con motivo='sin_flag_apops_y_sin_papel'.
// El response al cliente NO debe filtrar a qué gremio cotiza la persona
// (constitución V — privacidad).

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const DNI = '30000003' // seed: afiliado_apops=false, afiliado_ate=true
const LEGAJO = 'L-0003'
const RUN_ID = Date.now().toString(36)
const EMAIL = `sinapops-${DNI}+${RUN_ID}@test.local`

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

describe('Integración: flujo activo, DNI en padrón sin APOPS (US3)', () => {
  beforeAll(cleanup)
  afterAll(cleanup)

  it('crea solicitud sub_flujo=activo motivo=sin_flag_apops_y_sin_papel, sin filtrar el gremio real', async () => {
    const res = await callSolicitarMagicLink({
      dni: DNI,
      legajo: LEGAJO,
      email: EMAIL,
      flujo: 'activo',
    })
    expect(res.status).toBe(200)
    expect(res.body['status']).toBe('pendiente_validacion')

    // Privacidad: el response NO incluye flags del padrón ni nombre real
    expect(res.body).not.toHaveProperty('afiliado_ate')
    expect(res.body).not.toHaveProperty('afiliado_sec')
    expect(res.body).not.toHaveProperty('afiliado_upcn')
    expect(res.body).not.toHaveProperty('nombre')
    expect(res.body).not.toHaveProperty('lugar_trabajo_rrhh')

    const admin = makeServiceRoleClient()
    const { data: solicitud } = await admin
      .from('solicitudes_pendientes')
      .select('sub_flujo, legajo, motivo_pendiente, estado')
      .eq('dni', DNI)
      .single()
    expect(solicitud).toMatchObject({
      sub_flujo: 'activo',
      legajo: LEGAJO,
      motivo_pendiente: 'sin_flag_apops_y_sin_papel',
      estado: 'pendiente',
    })

    // NO se creó afiliado
    const { data: afiliado } = await admin
      .from('afiliados')
      .select('id')
      .eq('dni', DNI)
      .maybeSingle()
    expect(afiliado).toBeNull()
  })
})
