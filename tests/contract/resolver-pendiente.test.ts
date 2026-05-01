import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  makeAuthenticatedClient,
  makeServiceRoleClient,
} from '../rls/_helpers'

// Contract test para Edge Function resolver-pendiente.
// Spec: specs/001-afiliado-auth/contracts/edge-pendiente-actions.json
//
// Casos cubiertos:
//   - 200 aprobar (sub-flujo activo): crea afiliado + dispara email + audita
//   - 200 aprobar (sub-flujo sin_legajo): crea afiliado tipo=jubilado
//   - 200 rechazar: persiste motivo + cambio de estado + audita
//   - 400 solicitud_no_encontrada
//   - 400 solicitud_ya_resuelta
//   - 400 motivo_rechazo_requerido (rechazar sin motivo)
//   - 400 accion_invalida
//   - 403 sin admin (afiliado sin entrada en roles_admin)
//   - 409 dni_ya_existe (DNI ya tiene afiliado al aprobar)

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`

// Datos del seed que ya está cargado por feature 002 (padron):
//  - 30000001 / L-0001 (afiliado_apops=true)
//  - 30000002 / L-0002 (afiliado_apops=true)
//  - 20000001 (cotiza_papel=true)
const DNI_PADRON_ACTIVO = '30000001'
const LEGAJO_PADRON_ACTIVO = 'L-0001'
const DNI_PADRON_JUBILADO = '20000001'

const RUN_ID = Date.now().toString(36)

// DNIs que NO existen en padrón — usados como solicitud_pendiente
// "dni_no_en_padron". El admin igual puede aprobarlas (autoridad sobre el
// padrón, defense-in-depth queda como metadata).
const DNI_PEND_ACTIVO_1 = '70000001'
const DNI_PEND_ACTIVO_2 = '70000002'
const DNI_PEND_ACTIVO_3 = '70000003'
const DNI_PEND_SINLEG_1 = '70000004'
const DNI_PEND_SINLEG_2 = '70000005'

const ALL_PEND_DNIS = [
  DNI_PEND_ACTIVO_1,
  DNI_PEND_ACTIVO_2,
  DNI_PEND_ACTIVO_3,
  DNI_PEND_SINLEG_1,
  DNI_PEND_SINLEG_2,
  DNI_PADRON_ACTIVO,
  DNI_PADRON_JUBILADO,
]

interface AdminFixture {
  jwt: string
  authUserId: string
  afiliadoId: string
}

interface NonAdminFixture {
  jwt: string
  authUserId: string
}

let admin: AdminFixture
let nonAdmin: NonAdminFixture

async function callResolver(
  jwt: string,
  body: unknown,
): Promise<{ status: number; body: Record<string, unknown> | null }> {
  const res = await fetch(`${FUNCTIONS_URL}/resolver-pendiente`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  })
  let parsed: unknown = null
  try {
    parsed = await res.json()
  } catch {
    /* body vacío */
  }
  return {
    status: res.status,
    body: parsed as Record<string, unknown> | null,
  }
}

async function setupAdmin(): Promise<AdminFixture> {
  const supabase = makeServiceRoleClient()
  const email = `admin+${RUN_ID}@test.local`
  // Crear admin user con sesión
  const { client, userId } = await makeAuthenticatedClient(email)
  // Crear fila de afiliado para el admin (necesario para resolved_by)
  const adminDni = '99999000'
  const adminLegajo = `ADMIN-${RUN_ID.slice(0, 6)}`
  const insAfiliado = await supabase
    .from('afiliados')
    .insert({
      auth_user_id: userId,
      dni: adminDni,
      legajo: adminLegajo,
      nombre: `Admin Test ${RUN_ID}`,
      tipo: 'activo',
    })
    .select('id')
    .single()
  if (insAfiliado.error || !insAfiliado.data) {
    throw new Error(
      `No se pudo crear afiliado admin: ${insAfiliado.error?.message ?? 'sin data'}`,
    )
  }
  // Otorgar rol admin
  const insRole = await supabase
    .from('roles_admin')
    .insert({ auth_user_id: userId })
  if (insRole.error) {
    throw new Error(
      `No se pudo crear roles_admin: ${insRole.error.message}`,
    )
  }
  const session = await client.auth.getSession()
  const jwt = session.data.session?.access_token
  if (!jwt) throw new Error('Admin session sin access_token')
  return { jwt, authUserId: userId, afiliadoId: insAfiliado.data.id }
}

async function setupNonAdmin(): Promise<NonAdminFixture> {
  const email = `nonadmin+${RUN_ID}@test.local`
  const { client, userId } = await makeAuthenticatedClient(email)
  const session = await client.auth.getSession()
  const jwt = session.data.session?.access_token
  if (!jwt) throw new Error('NonAdmin session sin access_token')
  return { jwt, authUserId: userId }
}

async function seedPendiente(args: {
  dni: string
  email: string
  sub_flujo: 'activo' | 'sin_legajo'
  legajo?: string
  nombre_completo?: string
  motivo_pendiente?: 'dni_no_en_padron' | 'sin_flag_apops_y_sin_papel' | 'otros'
}): Promise<string> {
  const supabase = makeServiceRoleClient()
  const ins = await supabase
    .from('solicitudes_pendientes')
    .insert({
      dni: args.dni,
      email: args.email,
      sub_flujo: args.sub_flujo,
      legajo: args.sub_flujo === 'activo' ? (args.legajo ?? null) : null,
      nombre_completo:
        args.sub_flujo === 'sin_legajo' ? (args.nombre_completo ?? null) : null,
      motivo_pendiente: args.motivo_pendiente ?? 'dni_no_en_padron',
    })
    .select('id')
    .single()
  if (ins.error || !ins.data) {
    throw new Error(
      `No se pudo seedear solicitud: ${ins.error?.message ?? 'sin data'}`,
    )
  }
  return ins.data.id
}

async function cleanupAll(): Promise<void> {
  const supabase = makeServiceRoleClient()
  await supabase.from('solicitudes_pendientes').delete().in('dni', ALL_PEND_DNIS)
  await supabase.from('audit_log').delete().in('dni_intentado', ALL_PEND_DNIS)
  // Borrar afiliados de DNIs de pendientes (por aprobaciones previas)
  const { data: afiliados } = await supabase
    .from('afiliados')
    .select('auth_user_id, id')
    .in('dni', ALL_PEND_DNIS)
  if (afiliados) {
    for (const a of afiliados) {
      if (a.auth_user_id) {
        await supabase.auth.admin.deleteUser(a.auth_user_id)
      }
    }
  }
  await supabase.from('afiliados').delete().in('dni', ALL_PEND_DNIS)
  // auth.users huérfanos del run (excepto admin/nonAdmin)
  const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  for (const u of list.data.users) {
    const email = u.email ?? ''
    if (
      email.includes(`+${RUN_ID}@test.local`) &&
      !email.startsWith('admin+') &&
      !email.startsWith('nonadmin+')
    ) {
      await supabase.auth.admin.deleteUser(u.id)
    }
  }
}

async function teardownFixtures(): Promise<void> {
  const supabase = makeServiceRoleClient()
  if (admin) {
    await supabase.from('roles_admin').delete().eq('auth_user_id', admin.authUserId)
    await supabase.from('afiliados').delete().eq('auth_user_id', admin.authUserId)
    await supabase.auth.admin.deleteUser(admin.authUserId)
  }
  if (nonAdmin) {
    await supabase.from('afiliados').delete().eq('auth_user_id', nonAdmin.authUserId)
    await supabase.auth.admin.deleteUser(nonAdmin.authUserId)
  }
}

describe('Contract: resolver-pendiente', () => {
  beforeAll(async () => {
    await cleanupAll()
    admin = await setupAdmin()
    nonAdmin = await setupNonAdmin()
  })
  afterAll(async () => {
    await cleanupAll()
    await teardownFixtures()
  })
  beforeEach(async () => {
    await cleanupAll()
  })

  it('200 aprobar — sub-flujo activo: crea afiliado tipo=activo, marca aprobada, audita y devuelve afiliado_id', async () => {
    const solicitudId = await seedPendiente({
      dni: DNI_PEND_ACTIVO_1,
      email: `aprob1+${RUN_ID}@test.local`,
      sub_flujo: 'activo',
      legajo: 'L-7001',
    })
    const { status, body } = await callResolver(admin.jwt, {
      solicitud_id: solicitudId,
      accion: 'aprobar',
    })
    expect(status).toBe(200)
    expect(body?.status).toBe('aprobada')
    expect(typeof body?.afiliado_id).toBe('string')

    const supabase = makeServiceRoleClient()
    const { data: afiliado } = await supabase
      .from('afiliados')
      .select('dni, legajo, tipo, estado')
      .eq('dni', DNI_PEND_ACTIVO_1)
      .single()
    expect(afiliado).toMatchObject({
      dni: DNI_PEND_ACTIVO_1,
      legajo: 'L-7001',
      tipo: 'activo',
      estado: 'activo',
    })

    const { data: solicitud } = await supabase
      .from('solicitudes_pendientes')
      .select('estado, resolved_by, resolved_at, motivo_rechazo')
      .eq('id', solicitudId)
      .single()
    expect(solicitud).toMatchObject({
      estado: 'aprobada',
      resolved_by: admin.afiliadoId,
      motivo_rechazo: null,
    })
    expect(solicitud?.resolved_at).toBeTruthy()

    const { data: events } = await supabase
      .from('audit_log')
      .select('evento, metadata')
      .eq('dni_intentado', DNI_PEND_ACTIVO_1)
    const approved = events?.find((e) => e.evento === 'pendiente_approved')
    expect(approved).toBeTruthy()
  })

  it('200 aprobar — sub-flujo sin_legajo: crea afiliado tipo=jubilado, legajo NULL, nombre del solicitante', async () => {
    const nombre = 'Doe, John'
    const solicitudId = await seedPendiente({
      dni: DNI_PEND_SINLEG_1,
      email: `aprob2+${RUN_ID}@test.local`,
      sub_flujo: 'sin_legajo',
      nombre_completo: nombre,
    })
    const { status, body } = await callResolver(admin.jwt, {
      solicitud_id: solicitudId,
      accion: 'aprobar',
    })
    expect(status).toBe(200)
    expect(body?.status).toBe('aprobada')

    const supabase = makeServiceRoleClient()
    const { data: afiliado } = await supabase
      .from('afiliados')
      .select('dni, legajo, tipo, nombre')
      .eq('dni', DNI_PEND_SINLEG_1)
      .single()
    expect(afiliado).toMatchObject({
      dni: DNI_PEND_SINLEG_1,
      legajo: null,
      tipo: 'jubilado',
      nombre,
    })
  })

  it('200 rechazar: marca rechazada, persiste motivo y resolved_by, audita', async () => {
    const motivo = 'Datos no coinciden con padrón actualizado.'
    const solicitudId = await seedPendiente({
      dni: DNI_PEND_ACTIVO_2,
      email: `rech+${RUN_ID}@test.local`,
      sub_flujo: 'activo',
      legajo: 'L-7002',
    })
    const { status, body } = await callResolver(admin.jwt, {
      solicitud_id: solicitudId,
      accion: 'rechazar',
      motivo_rechazo: motivo,
    })
    expect(status).toBe(200)
    expect(body?.status).toBe('rechazada')

    const supabase = makeServiceRoleClient()
    const { data: solicitud } = await supabase
      .from('solicitudes_pendientes')
      .select('estado, motivo_rechazo, resolved_by')
      .eq('id', solicitudId)
      .single()
    expect(solicitud).toMatchObject({
      estado: 'rechazada',
      motivo_rechazo: motivo,
      resolved_by: admin.afiliadoId,
    })

    // No se creó afiliado al rechazar
    const { data: afiliado } = await supabase
      .from('afiliados')
      .select('id')
      .eq('dni', DNI_PEND_ACTIVO_2)
      .maybeSingle()
    expect(afiliado).toBeNull()

    const { data: events } = await supabase
      .from('audit_log')
      .select('evento')
      .eq('dni_intentado', DNI_PEND_ACTIVO_2)
    expect(events?.some((e) => e.evento === 'pendiente_rejected')).toBe(true)
  })

  it('400 solicitud_no_encontrada cuando el id no existe', async () => {
    const { status, body } = await callResolver(admin.jwt, {
      solicitud_id: '00000000-0000-0000-0000-000000000000',
      accion: 'aprobar',
    })
    expect(status).toBe(400)
    expect(body?.code).toBe('solicitud_no_encontrada')
  })

  it('400 solicitud_ya_resuelta cuando la solicitud ya fue aprobada', async () => {
    const solicitudId = await seedPendiente({
      dni: DNI_PEND_ACTIVO_3,
      email: `dup+${RUN_ID}@test.local`,
      sub_flujo: 'activo',
      legajo: 'L-7003',
    })
    const first = await callResolver(admin.jwt, {
      solicitud_id: solicitudId,
      accion: 'aprobar',
    })
    expect(first.status).toBe(200)

    const second = await callResolver(admin.jwt, {
      solicitud_id: solicitudId,
      accion: 'aprobar',
    })
    expect(second.status).toBe(400)
    expect(second.body?.code).toBe('solicitud_ya_resuelta')
  })

  it('400 motivo_rechazo_requerido cuando se rechaza sin motivo', async () => {
    const solicitudId = await seedPendiente({
      dni: DNI_PEND_SINLEG_2,
      email: `nomot+${RUN_ID}@test.local`,
      sub_flujo: 'sin_legajo',
      nombre_completo: 'Test, NoMotivo',
    })
    const { status, body } = await callResolver(admin.jwt, {
      solicitud_id: solicitudId,
      accion: 'rechazar',
    })
    expect(status).toBe(400)
    expect(body?.code).toBe('motivo_rechazo_requerido')
  })

  it('400 accion_invalida cuando accion no es aprobar/rechazar', async () => {
    const solicitudId = await seedPendiente({
      dni: DNI_PEND_ACTIVO_1,
      email: `bad+${RUN_ID}@test.local`,
      sub_flujo: 'activo',
      legajo: 'L-BAD1',
    })
    const { status, body } = await callResolver(admin.jwt, {
      solicitud_id: solicitudId,
      accion: 'mover',
    })
    expect(status).toBe(400)
    expect(body?.code).toBe('accion_invalida')
  })

  it('403 cuando el invocante no es admin (no figura en roles_admin)', async () => {
    const solicitudId = await seedPendiente({
      dni: DNI_PEND_ACTIVO_1,
      email: `nonadm+${RUN_ID}@test.local`,
      sub_flujo: 'activo',
      legajo: 'L-NONA',
    })
    const { status } = await callResolver(nonAdmin.jwt, {
      solicitud_id: solicitudId,
      accion: 'aprobar',
    })
    expect(status).toBe(403)
  })

  it('409 dni_ya_existe al aprobar cuando ya hay afiliado con ese DNI', async () => {
    // El DNI 30000001 está en padrón y vamos a crearle afiliado primero.
    const supabase = makeServiceRoleClient()
    const otherEmail = `existing+${RUN_ID}@test.local`
    const userRes = await supabase.auth.admin.createUser({
      email: otherEmail,
      email_confirm: true,
    })
    if (userRes.error || !userRes.data.user) {
      throw new Error(`createUser: ${userRes.error?.message}`)
    }
    await supabase.from('afiliados').insert({
      auth_user_id: userRes.data.user.id,
      dni: DNI_PADRON_ACTIVO,
      legajo: LEGAJO_PADRON_ACTIVO,
      nombre: 'Pérez, María',
      tipo: 'activo',
    })

    // Ahora seedeamos solicitud_pendiente con ese DNI (caso patológico:
    // alguien intentó registrarse antes de existir el afiliado).
    const solicitudId = await seedPendiente({
      dni: DNI_PADRON_ACTIVO,
      email: `conf+${RUN_ID}@test.local`,
      sub_flujo: 'activo',
      legajo: LEGAJO_PADRON_ACTIVO,
    })
    const { status, body } = await callResolver(admin.jwt, {
      solicitud_id: solicitudId,
      accion: 'aprobar',
    })
    expect(status).toBe(409)
    expect(body?.code).toBe('dni_ya_existe')
  })
})
