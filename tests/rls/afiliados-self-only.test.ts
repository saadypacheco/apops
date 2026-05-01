import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { makeAnonClient, makeServiceRoleClient } from './_helpers'
import type { Database } from '@/lib/supabase/types'

// RLS: afiliados_self_select
// Verifica que un afiliado authenticated solo lee su propia fila de afiliados.

const RUN_ID = Date.now().toString(36)
const EMAIL_A = `rls-afil-a+${RUN_ID}@test.local`
const EMAIL_B = `rls-afil-b+${RUN_ID}@test.local`
const DNI_A = '30000001' // seed
const LEGAJO_A = 'L-0001'
const DNI_B = '30000002' // seed
const LEGAJO_B = 'L-0002'
const DNIS = [DNI_A, DNI_B]

async function makeAuthenticatedAfiliado(params: {
  email: string
  dni: string
  legajo: string
}): Promise<{
  client: SupabaseClient<Database>
  userId: string
  afiliadoId: string
}> {
  const admin = makeServiceRoleClient()

  // 1. Crear user
  const created = await admin.auth.admin.createUser({
    email: params.email,
    email_confirm: true,
  })
  if (created.error || !created.data.user) {
    throw new Error(`createUser: ${created.error?.message ?? 'sin user'}`)
  }
  const userId = created.data.user.id

  // 2. Tomar nombre del padrón (la columna afiliados.nombre es NOT NULL)
  const { data: padron } = await admin
    .from('padron_cotizantes')
    .select('id, nombre')
    .eq('dni', params.dni)
    .single()
  if (!padron) throw new Error(`Sin fila de padrón para ${params.dni}`)

  // 3. Crear afiliado vinculado
  const insAf = await admin
    .from('afiliados')
    .insert({
      auth_user_id: userId,
      dni: params.dni,
      legajo: params.legajo,
      nombre: padron.nombre,
      tipo: 'activo',
      padron_id: padron.id,
    })
    .select('id')
    .single()
  if (insAf.error || !insAf.data) {
    throw new Error(`insert afiliado: ${insAf.error?.message ?? 'sin id'}`)
  }
  const afiliadoId = insAf.data.id

  // 4. Generar magic link y autenticar
  const link = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: params.email,
  })
  if (link.error || !link.data.properties?.hashed_token) {
    throw new Error(`generateLink: ${link.error?.message ?? 'sin token'}`)
  }
  const client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const verified = await client.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link.data.properties.hashed_token,
  })
  if (verified.error || !verified.data.session) {
    throw new Error(`verifyOtp: ${verified.error?.message ?? 'sin sesion'}`)
  }

  return { client, userId, afiliadoId }
}

async function cleanup(): Promise<void> {
  const admin = makeServiceRoleClient()
  // Eliminar afiliados conocidos (CASCADE limpia auth.users via FK)
  const { data: af } = await admin
    .from('afiliados')
    .select('auth_user_id')
    .in('dni', DNIS)
  if (af) {
    for (const row of af) {
      if (row.auth_user_id) await admin.auth.admin.deleteUser(row.auth_user_id)
    }
  }
  await admin.from('afiliados').delete().in('dni', DNIS)
  // Defensa por si quedó user huérfano
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  for (const u of list.data.users) {
    if (u.email?.includes(`+${RUN_ID}@test.local`)) {
      await admin.auth.admin.deleteUser(u.id)
    }
  }
}

describe('RLS afiliados — self-select only', () => {
  let userA: Awaited<ReturnType<typeof makeAuthenticatedAfiliado>>
  let userB: Awaited<ReturnType<typeof makeAuthenticatedAfiliado>>

  beforeAll(async () => {
    await cleanup()
    userA = await makeAuthenticatedAfiliado({
      email: EMAIL_A,
      dni: DNI_A,
      legajo: LEGAJO_A,
    })
    userB = await makeAuthenticatedAfiliado({
      email: EMAIL_B,
      dni: DNI_B,
      legajo: LEGAJO_B,
    })
  })

  afterAll(cleanup)

  it('user A authenticated lee SOLO su fila de afiliados', async () => {
    const { data, error } = await userA.client
      .from('afiliados')
      .select('id, dni')
    expect(error).toBeNull()
    expect(data?.length).toBe(1)
    expect(data?.[0]?.dni).toBe(DNI_A)
  })

  it('user B authenticated lee SOLO su fila de afiliados', async () => {
    const { data, error } = await userB.client
      .from('afiliados')
      .select('id, dni')
    expect(error).toBeNull()
    expect(data?.length).toBe(1)
    expect(data?.[0]?.dni).toBe(DNI_B)
  })

  it('user A NO ve la fila de B aunque pida explícitamente', async () => {
    const { data } = await userA.client
      .from('afiliados')
      .select('id, dni')
      .eq('dni', DNI_B)
    expect(data).toEqual([])
  })

  it('cliente anon no ve ninguna fila (control negativo)', async () => {
    const anon = makeAnonClient()
    const { data } = await anon.from('afiliados').select('id, dni')
    expect(data).toEqual([])
  })
})
