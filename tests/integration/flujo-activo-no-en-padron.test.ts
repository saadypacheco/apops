import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { makeServiceRoleClient } from '../rls/_helpers'

// US3 sub-flujo activo — Escenario 3 de quickstart.md
// DNI no figura en padrón → solicitud_pendiente con sub_flujo='activo',
// legajo presente, motivo='dni_no_en_padron'. NO se crea afiliado ni se
// despacha magic link.

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const DNI = '99999997'
const LEGAJO = 'L-9997'
const RUN_ID = Date.now().toString(36)
const EMAIL = `nolp-${DNI}+${RUN_ID}@test.local`

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

describe('Integración: flujo activo, DNI no en padrón (US3)', () => {
  beforeAll(cleanup)
  afterAll(cleanup)

  it('crea solicitud_pendiente sub_flujo=activo motivo=dni_no_en_padron, sin afiliado ni magic link', async () => {
    const res = await callSolicitarMagicLink({
      dni: DNI,
      legajo: LEGAJO,
      email: EMAIL,
      flujo: 'activo',
    })
    expect(res.status).toBe(200)
    expect(res.body['status']).toBe('pendiente_validacion')

    const admin = makeServiceRoleClient()

    // Solicitud creada con datos del sub-flujo activo
    const { data: solicitud } = await admin
      .from('solicitudes_pendientes')
      .select('sub_flujo, legajo, nombre_completo, motivo_pendiente, estado, email')
      .eq('dni', DNI)
      .single()
    expect(solicitud).toMatchObject({
      sub_flujo: 'activo',
      legajo: LEGAJO,
      nombre_completo: null,
      motivo_pendiente: 'dni_no_en_padron',
      estado: 'pendiente',
      email: EMAIL,
    })

    // NO se creó afiliado
    const { data: afiliado } = await admin
      .from('afiliados')
      .select('id')
      .eq('dni', DNI)
      .maybeSingle()
    expect(afiliado).toBeNull()

    // Audit log: pendiente_created (NO magic_link_sent)
    const { data: events } = await admin
      .from('audit_log')
      .select('evento')
      .eq('dni_intentado', DNI)
    const eventos = events?.map((e) => e.evento) ?? []
    expect(eventos).toContain('pendiente_created')
    expect(eventos).not.toContain('magic_link_sent')
  })
})
