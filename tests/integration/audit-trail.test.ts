import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { makeServiceRoleClient } from '../rls/_helpers'

// Phase 6 / T071 — Audit trail consolidado.
// Verifica que los eventos críticos del flujo de auth quedan registrados
// en audit_log con la metadata correcta (constitución V — privacidad por
// diseño + auditoría completa).
//
// Eventos cubiertos por este test (los que emiten las Edge Functions):
//   padron_validation_attempt / _success / _failure / _no_afiliacion
//   magic_link_sent
//   pendiente_created (sub_flujo activo y sin_legajo)
//
// Eventos cubiertos por otros tests:
//   logout                 → tests/integration/logout.test.ts (T072)
//   authentication_success → flujo-activo-happy.test.ts cubre el otp verify;
//                            el evento authentication_success lo emite el
//                            route handler /auth/callback en producción y se
//                            cubre con Playwright e2e (no en este vitest).
//   pendiente_approved     → tests/integration/pendiente-aprobacion.test.ts (T064)
//   pendiente_rejected     → tests/contract/resolver-pendiente.test.ts (T061)
//   rate_limit_exceeded    → tests/integration/rate-limit-padron.test.ts (T070)

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const RUN_ID = Date.now().toString(36)
const TEST_USER_AGENT = `apops-audit-trail-test/${RUN_ID}`

// DNIs del seed (NO modificar — son los datos cargados por seed.sql)
const DNI_ACTIVO_OK = '30000002' // afiliado_apops=true
const LEGAJO_ACTIVO_OK = 'L-0002'
const DNI_SIN_LEGAJO_OK = '20000001' // cotiza_papel=true
const DNI_OTRO_GREMIO = '30000003' // afiliado_apops=false
const LEGAJO_OTRO_GREMIO = 'L-0003'

// DNIs no en padrón (definidos solo en este test, no chocan con otros)
const DNI_NO_PADRON_ACTIVO = '15000001'
const DNI_NO_PADRON_SINLEG = '15000002'
const NOMBRE_NO_PADRON_SINLEG = 'Test, AuditTrail'

const ALL_DNIS = [
  DNI_ACTIVO_OK,
  DNI_SIN_LEGAJO_OK,
  DNI_OTRO_GREMIO,
  DNI_NO_PADRON_ACTIVO,
  DNI_NO_PADRON_SINLEG,
]

async function callEdge(path: string, body: unknown) {
  const res = await fetch(`${FUNCTIONS_URL}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
      'User-Agent': TEST_USER_AGENT,
    },
    body: JSON.stringify(body),
  })
  let parsed: unknown = null
  try {
    parsed = await res.json()
  } catch {
    // body vacío
  }
  return { status: res.status, body: parsed as Record<string, unknown> | null }
}

async function cleanupAll(): Promise<void> {
  const admin = makeServiceRoleClient()
  // Eliminar afiliados creados por solicitar-magic-link (los happy paths
  // crean filas en afiliados; el cleanup tiene que cascadear a auth.users).
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
  // Limpiar auth.users huérfanos del run
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  for (const u of list.data.users) {
    if (u.email?.includes(`+${RUN_ID}@audit.local`)) {
      await admin.auth.admin.deleteUser(u.id)
    }
  }
}

function emailFor(prefix: string): string {
  return `${prefix}+${RUN_ID}@audit.local`
}

async function fetchEvents(dni: string) {
  const admin = makeServiceRoleClient()
  const { data } = await admin
    .from('audit_log')
    .select('evento, user_agent, metadata, dni_intentado')
    .eq('dni_intentado', dni)
    .order('created_at', { ascending: true })
  return data ?? []
}

describe('Integración Phase 6: audit trail completo del flujo', () => {
  beforeAll(cleanupAll)
  afterAll(cleanupAll)
  beforeEach(cleanupAll)

  it('flujo activo OK: attempt → success → magic_link_sent (metadata correcta)', async () => {
    const v = await callEdge('validar-padron', {
      dni: DNI_ACTIVO_OK,
      legajo: LEGAJO_ACTIVO_OK,
      flujo: 'activo',
    })
    expect(v.status).toBe(200)
    expect(v.body).toMatchObject({ match: true, tipo: 'activo' })

    const m = await callEdge('solicitar-magic-link', {
      dni: DNI_ACTIVO_OK,
      legajo: LEGAJO_ACTIVO_OK,
      email: emailFor('activo-ok'),
      flujo: 'activo',
    })
    expect(m.status).toBe(200)
    expect(m.body).toMatchObject({ status: 'magic_link_sent' })

    const events = await fetchEvents(DNI_ACTIVO_OK)
    const tipos = events.map((e) => e.evento)
    expect(tipos).toContain('padron_validation_attempt')
    expect(tipos).toContain('padron_validation_success')
    expect(tipos).toContain('magic_link_sent')

    // Metadata: flujo='activo' presente en attempt/success
    const attempt = events.find((e) => e.evento === 'padron_validation_attempt')!
    expect((attempt.metadata as Record<string, unknown>)['flujo']).toBe('activo')
    const success = events.find((e) => e.evento === 'padron_validation_success')!
    expect((success.metadata as Record<string, unknown>)['tipo']).toBe('activo')
    expect((success.metadata as Record<string, unknown>)['flujo']).toBe('activo')

    // user_agent propagado por la Edge Function en al menos un evento
    expect(events.some((e) => e.user_agent === TEST_USER_AGENT)).toBe(true)
  })

  it('flujo sin_legajo OK: attempt → success (tipo=jubilado) → magic_link_sent', async () => {
    const v = await callEdge('validar-padron', {
      dni: DNI_SIN_LEGAJO_OK,
      flujo: 'sin_legajo',
    })
    expect(v.status).toBe(200)
    expect(v.body).toMatchObject({ match: true, tipo: 'jubilado' })

    const m = await callEdge('solicitar-magic-link', {
      dni: DNI_SIN_LEGAJO_OK,
      email: emailFor('jubilado-ok'),
      flujo: 'sin_legajo',
    })
    expect(m.status).toBe(200)
    expect(m.body).toMatchObject({ status: 'magic_link_sent' })

    const events = await fetchEvents(DNI_SIN_LEGAJO_OK)
    const success = events.find((e) => e.evento === 'padron_validation_success')!
    expect((success.metadata as Record<string, unknown>)['tipo']).toBe('jubilado')
    expect((success.metadata as Record<string, unknown>)['flujo']).toBe('sin_legajo')

    expect(events.map((e) => e.evento)).toContain('magic_link_sent')
  })

  it('DNI no en padrón (activo): attempt → failure → pendiente_created', async () => {
    await callEdge('validar-padron', {
      dni: DNI_NO_PADRON_ACTIVO,
      legajo: 'L-9501',
      flujo: 'activo',
    })

    const m = await callEdge('solicitar-magic-link', {
      dni: DNI_NO_PADRON_ACTIVO,
      legajo: 'L-9501',
      email: emailFor('no-padron-activo'),
      flujo: 'activo',
    })
    expect(m.status).toBe(200)
    expect(m.body).toMatchObject({ status: 'pendiente_validacion' })

    const events = await fetchEvents(DNI_NO_PADRON_ACTIVO)
    const tipos = events.map((e) => e.evento)
    expect(tipos).toContain('padron_validation_attempt')
    expect(tipos).toContain('padron_validation_failure')
    expect(tipos).toContain('pendiente_created')

    const failure = events.find((e) => e.evento === 'padron_validation_failure')!
    expect((failure.metadata as Record<string, unknown>)['motivo']).toBe(
      'dni_no_en_padron',
    )

    const pendiente = events.find((e) => e.evento === 'pendiente_created')!
    expect((pendiente.metadata as Record<string, unknown>)['sub_flujo']).toBe(
      'activo',
    )
    expect(
      (pendiente.metadata as Record<string, unknown>)['motivo_pendiente'],
    ).toBe('dni_no_en_padron')
  })

  it('DNI en padrón sin APOPS: attempt → no_afiliacion → pendiente_created (sin filtrar gremio)', async () => {
    await callEdge('validar-padron', {
      dni: DNI_OTRO_GREMIO,
      legajo: LEGAJO_OTRO_GREMIO,
      flujo: 'activo',
    })

    const m = await callEdge('solicitar-magic-link', {
      dni: DNI_OTRO_GREMIO,
      legajo: LEGAJO_OTRO_GREMIO,
      email: emailFor('otro-gremio'),
      flujo: 'activo',
    })
    expect(m.status).toBe(200)
    expect(m.body).toMatchObject({ status: 'pendiente_validacion' })

    const events = await fetchEvents(DNI_OTRO_GREMIO)
    const tipos = events.map((e) => e.evento)
    expect(tipos).toContain('padron_validation_attempt')
    expect(tipos).toContain('padron_validation_no_afiliacion')
    expect(tipos).toContain('pendiente_created')

    const noAfiliacion = events.find(
      (e) => e.evento === 'padron_validation_no_afiliacion',
    )!
    expect((noAfiliacion.metadata as Record<string, unknown>)['motivo']).toBe(
      'sin_apops',
    )

    const pendiente = events.find((e) => e.evento === 'pendiente_created')!
    const meta = pendiente.metadata as Record<string, unknown>
    expect(meta['motivo_pendiente']).toBe('sin_flag_apops_y_sin_papel')
    // Privacidad: la metadata NO incluye el gremio real al que cotiza
    expect(meta).not.toHaveProperty('afiliado_ate')
    expect(meta).not.toHaveProperty('afiliado_sec')
    expect(meta).not.toHaveProperty('gremio_real')
  })

  it('sub_flujo sin_legajo + DNI no en padrón: pendiente_created persiste sub_flujo correcto', async () => {
    const m = await callEdge('solicitar-magic-link', {
      dni: DNI_NO_PADRON_SINLEG,
      email: emailFor('no-padron-sinleg'),
      nombre_completo: NOMBRE_NO_PADRON_SINLEG,
      flujo: 'sin_legajo',
    })
    expect(m.status).toBe(200)
    expect(m.body).toMatchObject({ status: 'pendiente_validacion' })

    const events = await fetchEvents(DNI_NO_PADRON_SINLEG)
    const pendiente = events.find((e) => e.evento === 'pendiente_created')!
    const meta = pendiente.metadata as Record<string, unknown>
    expect(meta['sub_flujo']).toBe('sin_legajo')
    expect(meta['motivo_pendiente']).toBe('dni_no_en_padron')
    expect(typeof meta['solicitud_id']).toBe('string')
  })
})
