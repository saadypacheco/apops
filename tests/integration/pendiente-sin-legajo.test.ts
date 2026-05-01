import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { makeServiceRoleClient } from '../rls/_helpers'

// US3 — Escenario 4 de quickstart.md: sub-flujo sin_legajo con DNI que NO está
// en padrón requiere capturar nombre_completo del cliente. Sin él, la Edge
// Function rechaza 400; con él, persiste la solicitud con sub_flujo='sin_legajo',
// legajo NULL y el nombre que ingresó la persona.

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const DNI = '88888881' // No en padrón
const RUN_ID = Date.now().toString(36)
const EMAIL = `psl-${DNI}+${RUN_ID}@test.local`
const NOMBRE = 'Doe, John'

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

describe('Integración US3: pendiente sub_flujo=sin_legajo, DNI no en padrón', () => {
  beforeAll(cleanup)
  afterAll(cleanup)

  it('400 nombre_completo_requerido si el cliente no envía nombre_completo', async () => {
    const res = await callSolicitarMagicLink({
      dni: DNI,
      email: EMAIL,
      flujo: 'sin_legajo',
    })
    expect(res.status).toBe(400)
    expect(res.body['code']).toBe('nombre_completo_requerido')

    // Defensa: NO se creó solicitud parcial
    const admin = makeServiceRoleClient()
    const { data } = await admin
      .from('solicitudes_pendientes')
      .select('id')
      .eq('dni', DNI)
      .maybeSingle()
    expect(data).toBeNull()
  })

  it('persiste DNI, email, nombre_completo del cliente; legajo queda NULL; motivo=dni_no_en_padron', async () => {
    const res = await callSolicitarMagicLink({
      dni: DNI,
      email: EMAIL,
      nombre_completo: NOMBRE,
      flujo: 'sin_legajo',
    })
    expect(res.status).toBe(200)
    expect(res.body['status']).toBe('pendiente_validacion')

    const admin = makeServiceRoleClient()
    const { data: solicitud } = await admin
      .from('solicitudes_pendientes')
      .select(
        'dni, email, sub_flujo, legajo, nombre_completo, motivo_pendiente, estado',
      )
      .eq('dni', DNI)
      .single()
    expect(solicitud).toEqual({
      dni: DNI,
      email: EMAIL,
      sub_flujo: 'sin_legajo',
      legajo: null,
      nombre_completo: NOMBRE,
      motivo_pendiente: 'dni_no_en_padron',
      estado: 'pendiente',
    })

    // No se creó afiliado ni se mandó magic link
    const { data: afiliado } = await admin
      .from('afiliados')
      .select('id')
      .eq('dni', DNI)
      .maybeSingle()
    expect(afiliado).toBeNull()

    const { data: events } = await admin
      .from('audit_log')
      .select('evento')
      .eq('dni_intentado', DNI)
    const eventos = events?.map((e) => e.evento) ?? []
    expect(eventos).toContain('pendiente_created')
    expect(eventos).not.toContain('magic_link_sent')
  })

  it('rechaza al insertar sub_flujo=sin_legajo con nombre_completo NULL (chk_subflujo_data)', async () => {
    const admin = makeServiceRoleClient()
    const ins = await admin
      .from('solicitudes_pendientes')
      .insert({
        dni: '88888880',
        email: `xfail+${RUN_ID}@test.local`,
        sub_flujo: 'sin_legajo',
        legajo: null,
        nombre_completo: null,
        motivo_pendiente: 'dni_no_en_padron',
      })
      .select('id')
    expect(ins.error).toBeTruthy()
  })
})
