import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  deleteTestUser,
  makeAnonClient,
  makeAuthenticatedClient,
  makeServiceRoleClient,
} from './_helpers'

// Constitución V — audit_log es trail interno. Ningún rol que no sea
// service_role puede leer ni escribir.

describe('RLS lockdown: audit_log', () => {
  let testUserId: string
  let authClient: Awaited<ReturnType<typeof makeAuthenticatedClient>>['client']
  let seededRowId: string

  beforeAll(async () => {
    const admin = makeServiceRoleClient()
    const seed = await admin
      .from('audit_log')
      .insert({
        evento: 'padron_validation_attempt',
        dni_intentado: '30000001',
        metadata: { source: 'rls-test' },
      })
      .select('id')
      .single()

    expect(seed.error).toBeNull()
    expect(seed.data?.id).toBeTruthy()
    seededRowId = seed.data!.id

    const auth = await makeAuthenticatedClient(
      `rls-audit-${Date.now()}@test.local`,
    )
    testUserId = auth.userId
    authClient = auth.client
  })

  afterAll(async () => {
    const admin = makeServiceRoleClient()
    if (seededRowId)
      await admin.from('audit_log').delete().eq('id', seededRowId)
    if (testUserId) await deleteTestUser(testUserId)
  })

  it('cliente anon NO lee filas de audit_log', async () => {
    const anon = makeAnonClient()
    const { data, error } = await anon
      .from('audit_log')
      .select('id')
      .limit(10)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('cliente authenticated tampoco lee filas de audit_log', async () => {
    const { data, error } = await authClient
      .from('audit_log')
      .select('id')
      .limit(10)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('cliente anon NO puede insertar en audit_log', async () => {
    const anon = makeAnonClient()
    const { data, error } = await anon
      .from('audit_log')
      .insert({ evento: 'authentication_failure' })
      .select()

    // RLS sin policy de INSERT → error de policy violation O data vacío.
    // Aceptamos cualquiera de los dos: lo importante es que la fila NO
    // se persistió (verificado por count vía service_role).
    if (error) {
      expect(error.code === '42501' || error.message.length > 0).toBe(true)
    } else {
      expect(data).toEqual([])
    }

    // Confirma que no quedó nadie con ese evento
    const admin = makeServiceRoleClient()
    const { count } = await admin
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('evento', 'authentication_failure')
    expect(count ?? 0).toBe(0)
  })

  it('cliente service_role SÍ lee y escribe (control positivo)', async () => {
    const admin = makeServiceRoleClient()
    const { data, error } = await admin
      .from('audit_log')
      .select('id, evento')
      .eq('id', seededRowId)
      .single()

    expect(error).toBeNull()
    expect(data?.evento).toBe('padron_validation_attempt')
  })
})
