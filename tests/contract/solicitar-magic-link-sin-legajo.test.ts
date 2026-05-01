import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { makeServiceRoleClient } from '../rls/_helpers'

// Contract test para Edge Function solicitar-magic-link, sub-flujo 'sin_legajo'.
// Spec: specs/001-afiliado-auth/contracts/edge-solicitar-magic-link.json
//
// Casos cubiertos para Phase 4 (US2):
//   - jubilado happy: DNI con cotiza_papel=true → magic_link_sent + afiliado tipo='jubilado'
//   - sin_papel: DNI en padrón sin cotiza_papel → pendiente con sub_flujo='sin_legajo',
//     motivo='sin_flag_apops_y_sin_papel', nombre_completo tomado del padrón
//
// El caso `dni_no_en_padron` para sub-flujo sin_legajo (que requiere captura de
// nombre_completo en el cliente) es US3 / Phase 5.

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const DNI_JUBILADO = '20000001' // cotiza_papel=true (seed)
const DNI_SIN_AFILIACION = '20000002' // afiliado_apops=false, cotiza_papel=false (seed)

const RUN_ID = Date.now().toString(36)
const ALL_DNIS = [DNI_JUBILADO, DNI_SIN_AFILIACION]

async function callSolicitarMagicLink(body: unknown) {
  const res = await fetch(`${FUNCTIONS_URL}/solicitar-magic-link`, {
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
    /* body vacío */
  }
  return { status: res.status, body: parsed as Record<string, unknown> | null }
}

async function cleanupAll() {
  const admin = makeServiceRoleClient()
  const { data: afiliados } = await admin
    .from('afiliados')
    .select('auth_user_id')
    .in('dni', ALL_DNIS)
  if (afiliados) {
    for (const a of afiliados) {
      if (a.auth_user_id) {
        await admin.auth.admin.deleteUser(a.auth_user_id)
      }
    }
  }
  await admin.from('afiliados').delete().in('dni', ALL_DNIS)
  await admin.from('solicitudes_pendientes').delete().in('dni', ALL_DNIS)
  await admin.from('audit_log').delete().in('dni_intentado', ALL_DNIS)
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  for (const u of list.data.users) {
    if (u.email?.includes(`+${RUN_ID}@test.local`)) {
      await admin.auth.admin.deleteUser(u.id)
    }
  }
}

function emailFor(dni: string): string {
  return `mlink-sl-${dni}+${RUN_ID}@test.local`
}

describe('Contract: solicitar-magic-link — sub-flujo sin_legajo', () => {
  beforeAll(async () => {
    await cleanupAll()
  })
  afterAll(async () => {
    await cleanupAll()
  })
  beforeEach(async () => {
    await cleanupAll()
  })

  it('200 magic_link_sent cuando DNI con cotiza_papel=true (jubilado happy path)', async () => {
    const { status, body } = await callSolicitarMagicLink({
      dni: DNI_JUBILADO,
      email: emailFor(DNI_JUBILADO),
      flujo: 'sin_legajo',
    })
    expect(status).toBe(200)
    expect(body).toMatchObject({ status: 'magic_link_sent' })
    expect(typeof body?.email_sent_to).toBe('string')
    expect(body?.email_sent_to).toContain('@')
    expect(body?.email_sent_to).toContain('*')

    // Side effects: afiliado creado con tipo=jubilado y legajo NULL
    const admin = makeServiceRoleClient()
    const { data: afiliado } = await admin
      .from('afiliados')
      .select('dni, legajo, tipo, estado')
      .eq('dni', DNI_JUBILADO)
      .maybeSingle()
    expect(afiliado).toMatchObject({
      dni: DNI_JUBILADO,
      legajo: null,
      tipo: 'jubilado',
      estado: 'activo',
    })
  })

  it('200 pendiente_validacion cuando DNI en padrón sin cotiza_papel (motivo sin_flag_apops_y_sin_papel)', async () => {
    const { status, body } = await callSolicitarMagicLink({
      dni: DNI_SIN_AFILIACION,
      email: emailFor(DNI_SIN_AFILIACION),
      flujo: 'sin_legajo',
    })
    expect(status).toBe(200)
    expect(body).toMatchObject({ status: 'pendiente_validacion' })

    // Side effects: solicitud pendiente con sub_flujo=sin_legajo, sin legajo,
    // y nombre_completo tomado del padrón (server-side, no del cliente)
    const admin = makeServiceRoleClient()
    const { data: solicitud } = await admin
      .from('solicitudes_pendientes')
      .select('sub_flujo, legajo, nombre_completo, motivo_pendiente, estado')
      .eq('dni', DNI_SIN_AFILIACION)
      .maybeSingle()
    expect(solicitud).toMatchObject({
      sub_flujo: 'sin_legajo',
      legajo: null,
      motivo_pendiente: 'sin_flag_apops_y_sin_papel',
      estado: 'pendiente',
    })
    // El nombre se tomó del padrón ('Fernández, Luis')
    expect(solicitud?.nombre_completo).toBe('Fernández, Luis')

    // No debe haberse creado afiliado
    const { data: afiliado } = await admin
      .from('afiliados')
      .select('dni')
      .eq('dni', DNI_SIN_AFILIACION)
      .maybeSingle()
    expect(afiliado).toBeNull()
  })

  it('400 email_invalido cuando email no es válido', async () => {
    const { status, body } = await callSolicitarMagicLink({
      dni: DNI_JUBILADO,
      email: 'notanemail',
      flujo: 'sin_legajo',
    })
    expect(status).toBe(400)
    expect(body).toMatchObject({ code: 'email_invalido' })
  })

  it('400 dni_invalido cuando DNI no matchea regex', async () => {
    const { status, body } = await callSolicitarMagicLink({
      dni: 'abc',
      email: emailFor('abc'),
      flujo: 'sin_legajo',
    })
    expect(status).toBe(400)
    expect(body).toMatchObject({ code: 'dni_invalido' })
  })
})
