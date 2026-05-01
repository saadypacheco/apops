import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { makeServiceRoleClient } from '../rls/_helpers'

// Contract test para Edge Function solicitar-magic-link, sub-flujo 'activo'.
// Spec: specs/001-afiliado-auth/contracts/edge-solicitar-magic-link.json

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// DNIs del seed
const DNI_APOPS_A = '30000001'
const LEGAJO_APOPS_A = 'L-0001'
const DNI_APOPS_B = '30000002'
const LEGAJO_APOPS_B = 'L-0002'
const DNI_OTRO_GREMIO = '30000003'
const LEGAJO_OTRO_GREMIO = 'L-0003'

// DNIs no en padrón
const DNI_NOT_IN_PADRON = '99999998'
const DNI_FOR_RATE_LIMIT = '11111111'

// Para evitar interferencia entre runs, sufijos únicos por suite
const RUN_ID = Date.now().toString(36)

const ALL_DNIS = [
  DNI_APOPS_A,
  DNI_APOPS_B,
  DNI_OTRO_GREMIO,
  DNI_NOT_IN_PADRON,
  DNI_FOR_RATE_LIMIT,
]

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
  // 1. Eliminar afiliados existentes con esos DNIs (que cascadea a auth.users via FK)
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
  // 2. Defensa: si quedó algún afiliado huérfano, borrar
  await admin.from('afiliados').delete().in('dni', ALL_DNIS)
  // 3. Solicitudes pendientes
  await admin.from('solicitudes_pendientes').delete().in('dni', ALL_DNIS)
  // 4. Audit log
  await admin.from('audit_log').delete().in('dni_intentado', ALL_DNIS)
  // 5. auth.users huérfanos cuyo email pertenece a este test run
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  for (const u of list.data.users) {
    if (u.email?.includes(`+${RUN_ID}@test.local`)) {
      await admin.auth.admin.deleteUser(u.id)
    }
  }
}

function emailFor(dni: string): string {
  return `mlink-${dni}+${RUN_ID}@test.local`
}

describe('Contract: solicitar-magic-link — sub-flujo activo', () => {
  beforeAll(async () => {
    await cleanupAll()
  })
  afterAll(async () => {
    await cleanupAll()
  })
  beforeEach(async () => {
    // Cada test arranca con afiliados/solicitudes/audit en limpio para los
    // DNIs del seed. El test de rate-limit hace su propio bookkeeping del
    // counter via DNI_FOR_RATE_LIMIT (no resetea ese DNI específicamente).
    await cleanupAll()
  })

  it('200 magic_link_sent cuando DNI/legajo en padrón con APOPS=true', async () => {
    const { status, body } = await callSolicitarMagicLink({
      dni: DNI_APOPS_A,
      legajo: LEGAJO_APOPS_A,
      email: emailFor(DNI_APOPS_A),
      flujo: 'activo',
    })
    expect(status).toBe(200)
    expect(body).toMatchObject({ status: 'magic_link_sent' })
    expect(typeof body?.email_sent_to).toBe('string')
    expect(body?.email_sent_to).toContain('@')
    expect(body?.email_sent_to).toContain('*')

    // Verifica side effects
    const admin = makeServiceRoleClient()
    const { data: afiliado } = await admin
      .from('afiliados')
      .select('dni, legajo, tipo, estado')
      .eq('dni', DNI_APOPS_A)
      .maybeSingle()
    expect(afiliado).toMatchObject({
      dni: DNI_APOPS_A,
      legajo: LEGAJO_APOPS_A,
      tipo: 'activo',
      estado: 'activo',
    })
  })

  it('200 pendiente_validacion cuando DNI no está en padrón (motivo dni_no_en_padron)', async () => {
    const { status, body } = await callSolicitarMagicLink({
      dni: DNI_NOT_IN_PADRON,
      legajo: 'L-9999',
      email: emailFor(DNI_NOT_IN_PADRON),
      flujo: 'activo',
    })
    expect(status).toBe(200)
    expect(body).toMatchObject({ status: 'pendiente_validacion' })

    const admin = makeServiceRoleClient()
    const { data: solicitud } = await admin
      .from('solicitudes_pendientes')
      .select('sub_flujo, legajo, nombre_completo, motivo_pendiente, estado')
      .eq('dni', DNI_NOT_IN_PADRON)
      .maybeSingle()
    expect(solicitud).toMatchObject({
      sub_flujo: 'activo',
      legajo: 'L-9999',
      nombre_completo: null,
      motivo_pendiente: 'dni_no_en_padron',
      estado: 'pendiente',
    })

    // No debe haberse creado afiliado
    const { data: afiliado } = await admin
      .from('afiliados')
      .select('dni')
      .eq('dni', DNI_NOT_IN_PADRON)
      .maybeSingle()
    expect(afiliado).toBeNull()
  })

  it('200 pendiente_validacion cuando DNI en padrón pero sin APOPS (motivo sin_flag_apops_y_sin_papel)', async () => {
    const { status, body } = await callSolicitarMagicLink({
      dni: DNI_OTRO_GREMIO,
      legajo: LEGAJO_OTRO_GREMIO,
      email: emailFor(DNI_OTRO_GREMIO),
      flujo: 'activo',
    })
    expect(status).toBe(200)
    expect(body).toMatchObject({ status: 'pendiente_validacion' })

    const admin = makeServiceRoleClient()
    const { data: solicitud } = await admin
      .from('solicitudes_pendientes')
      .select('sub_flujo, legajo, motivo_pendiente')
      .eq('dni', DNI_OTRO_GREMIO)
      .maybeSingle()
    expect(solicitud).toMatchObject({
      sub_flujo: 'activo',
      legajo: LEGAJO_OTRO_GREMIO,
      motivo_pendiente: 'sin_flag_apops_y_sin_papel',
    })
  })

  it('400 dni_invalido cuando DNI no matchea regex', async () => {
    const { status, body } = await callSolicitarMagicLink({
      dni: 'abc',
      legajo: LEGAJO_APOPS_A,
      email: emailFor('abc'),
      flujo: 'activo',
    })
    expect(status).toBe(400)
    expect(body).toMatchObject({ code: 'dni_invalido' })
  })

  it('400 email_invalido cuando email no es válido', async () => {
    const { status, body } = await callSolicitarMagicLink({
      dni: DNI_APOPS_B,
      legajo: LEGAJO_APOPS_B,
      email: 'notanemail',
      flujo: 'activo',
    })
    expect(status).toBe(400)
    expect(body).toMatchObject({ code: 'email_invalido' })
  })

  it('400 legajo_requerido cuando flujo=activo y falta legajo', async () => {
    const { status, body } = await callSolicitarMagicLink({
      dni: DNI_APOPS_A,
      email: emailFor(DNI_APOPS_A),
      flujo: 'activo',
    })
    expect(status).toBe(400)
    expect(body).toMatchObject({ code: 'legajo_requerido' })
  })

  it('409 email_ya_usado_por_otro_dni cuando un email ya está asociado a otro afiliado', async () => {
    const sharedEmail = emailFor('shared')

    // Primer afiliado registra con este email
    const first = await callSolicitarMagicLink({
      dni: DNI_APOPS_A,
      legajo: LEGAJO_APOPS_A,
      email: sharedEmail,
      flujo: 'activo',
    })
    expect(first.status).toBe(200)

    // Segundo DNI intenta usar el mismo email
    const second = await callSolicitarMagicLink({
      dni: DNI_APOPS_B,
      legajo: LEGAJO_APOPS_B,
      email: sharedEmail,
      flujo: 'activo',
    })
    expect(second.status).toBe(409)
    expect(second.body).toMatchObject({ code: 'email_ya_usado_por_otro_dni' })
  })

  it(
    '429 rate_limited después de 5 intentos en 1h con el mismo DNI (el 6to falla)',
    async () => {
      // Limpiamos audit_log de este DNI para arrancar limpio
      const admin = makeServiceRoleClient()
      await admin.from('audit_log').delete().eq('dni_intentado', DNI_FOR_RATE_LIMIT)

      // 5 intentos legítimos (devuelven 200 pendiente porque no está en padrón)
      for (let i = 0; i < 5; i++) {
        const r = await callSolicitarMagicLink({
          dni: DNI_FOR_RATE_LIMIT,
          legajo: 'L-XXXX',
          email: emailFor(`${DNI_FOR_RATE_LIMIT}-${i}`),
          flujo: 'activo',
        })
        expect(r.status, `intento ${i + 1}`).toBe(200)
      }

      // 6to → 429
      const { status, body } = await callSolicitarMagicLink({
        dni: DNI_FOR_RATE_LIMIT,
        legajo: 'L-XXXX',
        email: emailFor(`${DNI_FOR_RATE_LIMIT}-6`),
        flujo: 'activo',
      })
      expect(status).toBe(429)
      expect(typeof body?.retry_after_seconds).toBe('number')
    },
    30000,
  )
})
