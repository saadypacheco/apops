import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  deleteTestUser,
  makeAnonClient,
  makeAuthenticatedClient,
  makeServiceRoleClient,
} from './_helpers'

// Constitución V (Privacidad por diseño) + FR-015:
// padron_cotizantes está cerrado para roles `anon` y `authenticated`.
// Solo `service_role` (Edge Function validar-padron) puede leerlo.

describe('RLS lockdown: padron_cotizantes', () => {
  let testUserId: string
  let authClient: Awaited<ReturnType<typeof makeAuthenticatedClient>>['client']

  beforeAll(async () => {
    // Verifica que el seed dejó al menos una fila para que el test sea
    // significativo (si la tabla está vacía, "anon devuelve 0 filas" es
    // trivialmente cierto y no prueba RLS).
    const admin = makeServiceRoleClient()
    const { count, error } = await admin
      .from('padron_cotizantes')
      .select('*', { count: 'exact', head: true })
    expect(error).toBeNull()
    expect(count ?? 0).toBeGreaterThan(0)

    const auth = await makeAuthenticatedClient(
      `rls-padron-${Date.now()}@test.local`,
    )
    testUserId = auth.userId
    authClient = auth.client
  })

  afterAll(async () => {
    if (testUserId) await deleteTestUser(testUserId)
  })

  it('cliente anon NO lee filas de padron_cotizantes', async () => {
    const anon = makeAnonClient()
    const { data, error } = await anon
      .from('padron_cotizantes')
      .select('dni')
      .limit(10)

    // Comportamiento esperado de Postgres con RLS sin policies:
    // SELECT devuelve 0 filas (no error) — la fila existe pero el rol
    // no la "ve".
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('cliente authenticated tampoco lee filas de padron_cotizantes', async () => {
    const { data, error } = await authClient
      .from('padron_cotizantes')
      .select('dni')
      .limit(10)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('cliente service_role SÍ lee filas (control positivo)', async () => {
    const admin = makeServiceRoleClient()
    const { data, error } = await admin
      .from('padron_cotizantes')
      .select('dni')
      .limit(1)

    expect(error).toBeNull()
    expect(data?.length).toBeGreaterThan(0)
  })
})
