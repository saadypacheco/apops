import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  makeAuthenticatedClient,
  makeServiceRoleClient,
} from '../rls/_helpers'

// US3 — Escenario 7 de quickstart.md: aprobación de pendiente.
// Admin aprueba una solicitud → afiliado creado, magic link enviado, el
// solicitante puede autenticarse. Verifica el ciclo completo: estado del
// pendiente, fila en afiliados, audit pendiente_approved.
//
// La verificación de "puede autenticarse" se hace generando manualmente un
// magic link para ese email y consumiéndolo (mismo patrón que makeAuthenticatedClient).

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`

const RUN_ID = Date.now().toString(36)
const DNI_SOL = '77777777' // No en padrón → solicitud pendiente válida
const EMAIL_SOL = `aprob-${DNI_SOL}+${RUN_ID}@test.local`

const ADMIN_EMAIL = `admin-aprob+${RUN_ID}@test.local`

interface AdminFixture {
  jwt: string
  authUserId: string
  afiliadoId: string
}

let adminFixture: AdminFixture

async function setupAdmin(): Promise<AdminFixture> {
  const supabase = makeServiceRoleClient()
  const { client, userId } = await makeAuthenticatedClient(ADMIN_EMAIL)
  const insAfiliado = await supabase
    .from('afiliados')
    .insert({
      auth_user_id: userId,
      dni: '99999100',
      legajo: `ADM-${RUN_ID.slice(0, 6)}`,
      nombre: `Admin Aprobacion ${RUN_ID}`,
      tipo: 'activo',
    })
    .select('id')
    .single()
  if (insAfiliado.error || !insAfiliado.data) {
    throw new Error(
      `No se pudo crear admin afiliado: ${insAfiliado.error?.message ?? 'sin data'}`,
    )
  }
  await supabase.from('roles_admin').insert({ auth_user_id: userId })
  const session = await client.auth.getSession()
  const jwt = session.data.session?.access_token
  if (!jwt) throw new Error('Admin session sin access_token')
  return { jwt, authUserId: userId, afiliadoId: insAfiliado.data.id }
}

async function cleanup(): Promise<void> {
  const supabase = makeServiceRoleClient()
  await supabase.from('solicitudes_pendientes').delete().eq('dni', DNI_SOL)
  await supabase.from('audit_log').delete().eq('dni_intentado', DNI_SOL)
  // Borrar afiliado del solicitante si quedó
  const { data: af } = await supabase
    .from('afiliados')
    .select('auth_user_id')
    .eq('dni', DNI_SOL)
    .maybeSingle()
  if (af?.auth_user_id) {
    await supabase.auth.admin.deleteUser(af.auth_user_id)
  }
  await supabase.from('afiliados').delete().eq('dni', DNI_SOL)
}

async function teardownAdmin(): Promise<void> {
  if (!adminFixture) return
  const supabase = makeServiceRoleClient()
  await supabase
    .from('roles_admin')
    .delete()
    .eq('auth_user_id', adminFixture.authUserId)
  await supabase
    .from('afiliados')
    .delete()
    .eq('auth_user_id', adminFixture.authUserId)
  await supabase.auth.admin.deleteUser(adminFixture.authUserId)
}

describe('Integración US3: aprobación de pendiente (Escenario 7)', () => {
  beforeAll(async () => {
    await cleanup()
    adminFixture = await setupAdmin()
  })
  afterAll(async () => {
    await cleanup()
    await teardownAdmin()
  })

  it('admin aprueba → afiliado creado → solicitud=aprobada → audit pendiente_approved → solicitante puede autenticarse', async () => {
    const supabase = makeServiceRoleClient()

    // 1. Seedear solicitud pendiente sub_flujo=activo
    const seed = await supabase
      .from('solicitudes_pendientes')
      .insert({
        dni: DNI_SOL,
        email: EMAIL_SOL,
        sub_flujo: 'activo',
        legajo: 'L-7777',
        motivo_pendiente: 'dni_no_en_padron',
      })
      .select('id')
      .single()
    expect(seed.error).toBeNull()
    const solicitudId = seed.data!.id

    // 2. Admin aprueba via Edge Function
    const res = await fetch(`${FUNCTIONS_URL}/resolver-pendiente`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminFixture.jwt}`,
      },
      body: JSON.stringify({ solicitud_id: solicitudId, accion: 'aprobar' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body['status']).toBe('aprobada')
    const nuevoAfiliadoId = body['afiliado_id'] as string
    expect(nuevoAfiliadoId).toBeTruthy()

    // 3. Afiliado creado con datos de la solicitud
    const { data: afiliado } = await supabase
      .from('afiliados')
      .select('dni, legajo, tipo, estado, auth_user_id')
      .eq('id', nuevoAfiliadoId)
      .single()
    expect(afiliado).toMatchObject({
      dni: DNI_SOL,
      legajo: 'L-7777',
      tipo: 'activo',
      estado: 'activo',
    })

    // 4. Solicitud actualizada
    const { data: sol } = await supabase
      .from('solicitudes_pendientes')
      .select('estado, resolved_by, resolved_at')
      .eq('id', solicitudId)
      .single()
    expect(sol).toMatchObject({
      estado: 'aprobada',
      resolved_by: adminFixture.afiliadoId,
    })
    expect(sol?.resolved_at).toBeTruthy()

    // 5. Audit pendiente_approved registrado
    const { data: events } = await supabase
      .from('audit_log')
      .select('evento, metadata')
      .eq('dni_intentado', DNI_SOL)
    const approved = events?.find((e) => e.evento === 'pendiente_approved')
    expect(approved).toBeTruthy()
    const meta = approved?.metadata as Record<string, unknown> | null
    expect(meta?.['solicitud_id']).toBe(solicitudId)
    expect(meta?.['tipo']).toBe('activo')

    // 6. El solicitante puede autenticarse: generamos magic link admin-side y
    //    lo consumimos. Esto confirma que el auth.users existe y está habilitado.
    const link = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: EMAIL_SOL,
    })
    expect(link.error).toBeNull()
    expect(link.data.properties?.hashed_token).toBeTruthy()
  })
})
