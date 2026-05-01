import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { makeServiceRoleClient } from '../rls/_helpers'

// US2 edge — Escenario derivado de quickstart.md
// DNI en padrón sin cotiza_papel (no es jubilado afiliado APOPS por papel) →
// solicitud_pendiente con sub_flujo='sin_legajo', motivo='sin_flag_apops_y_sin_papel'.
// El nombre_completo se toma del padrón server-side (no del cliente) porque la
// persona ya está en padrón — no es necesario capturarlo. Privacidad: el
// response al cliente no expone flags ni nombre real.

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const DNI = '20000002' // seed: afiliado_apops=false, cotiza_papel=false
const NOMBRE_PADRON = 'Fernández, Luis' // del seed
const RUN_ID = Date.now().toString(36)
const EMAIL = `sinpapel-${DNI}+${RUN_ID}@test.local`

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

describe('Integración: flujo sin_legajo, DNI en padrón sin papel (US2 edge)', () => {
  beforeAll(cleanup)
  afterAll(cleanup)

  it('crea solicitud sub_flujo=sin_legajo motivo=sin_flag_apops_y_sin_papel, nombre del padrón, sin filtrar al cliente', async () => {
    const res = await callSolicitarMagicLink({
      dni: DNI,
      email: EMAIL,
      flujo: 'sin_legajo',
    })
    expect(res.status).toBe(200)
    expect(res.body['status']).toBe('pendiente_validacion')

    // Privacidad: el response no incluye nombre real ni flags del padrón
    expect(res.body).not.toHaveProperty('nombre')
    expect(res.body).not.toHaveProperty('cotiza_papel')
    expect(res.body).not.toHaveProperty('afiliado_apops')

    const admin = makeServiceRoleClient()
    const { data: solicitud } = await admin
      .from('solicitudes_pendientes')
      .select('sub_flujo, legajo, nombre_completo, motivo_pendiente, estado, email')
      .eq('dni', DNI)
      .single()
    expect(solicitud).toMatchObject({
      sub_flujo: 'sin_legajo',
      legajo: null,
      motivo_pendiente: 'sin_flag_apops_y_sin_papel',
      estado: 'pendiente',
      email: EMAIL,
    })
    // El nombre_completo persistido viene del padrón (server-side), no fue
    // ingresado por el cliente
    expect(solicitud?.nombre_completo).toBe(NOMBRE_PADRON)

    // NO se creó afiliado
    const { data: afiliado } = await admin
      .from('afiliados')
      .select('id')
      .eq('dni', DNI)
      .maybeSingle()
    expect(afiliado).toBeNull()

    // Audit registra pendiente_created con sub_flujo correcto
    const { data: events } = await admin
      .from('audit_log')
      .select('evento, metadata')
      .eq('dni_intentado', DNI)
      .order('created_at', { ascending: true })
    const pendienteEvent = events?.find((e) => e.evento === 'pendiente_created')
    expect(pendienteEvent).toBeTruthy()
    expect(
      (pendienteEvent?.metadata as Record<string, unknown> | null)?.['sub_flujo'],
    ).toBe('sin_legajo')
  })
})
