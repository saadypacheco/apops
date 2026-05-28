// Queries para el tab "Uso" del dashboard CD. Mide adopción, comunicación
// y engagement con datos que ya están en DB (afiliados.last_login_at,
// hilos_notificacion, push_subscriptions, solicitudes_afiliacion).
//
// Convenciones:
// - Períodos: 1d / 7d / 30d salvo que se aclare otra cosa.
// - "Activo" = afiliado con last_login_at dentro del período.
// - "Recibió notif" = al menos 1 hilo donde es destinatario en el período.
// - "Uso real" (KPI compuesta) = activo + recibió notif en el mismo período.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// =====================================================================
// Tipos
// =====================================================================

export type AdopcionGlobal = {
  cotizantesApops: number
  cuentasCreadas: number
  cuentasActivas: number
  pushActivo: number
  dau: number // last_login_at < 1 día
  wau: number // < 7 días
  mau: number // < 30 días
  usoReal30d: number // mau ∩ recibieron notif 30d
  porcentajeAdopcion: number // cuentasCreadas / cotizantesApops * 100
}

export type ComunicacionCD = {
  notifAfiliadosTotal: number
  notifAfiliadosLeidas: number
  notifDelegadosTotal: number
  notifDelegadosLeidas: number
  tasaLecturaAfiliados: number // 0..100
  tasaLecturaDelegados: number
  tiempoMedioLecturaHs: number | null // null si nadie leyó nada
}

export type DelegadoEngagement = {
  id: string
  nombre: string
  ultimoLogin: string | null
  notifRecibidas: number
  notifLeidas: number
  hilosAbiertos: number // hilos donde el delegado es autor
}

export type DelegadosEngagement = {
  totalDelegadosRegistrados: number
  delegadosActivos30d: number
  delegadosLeyeronCD30d: number
  top: DelegadoEngagement[] // top 10 por actividad
  inactivos: DelegadoEngagement[] // delegados sin login en 30d
}

export type ComunicacionEntrante = {
  hilosDeDelegados30d: number
  hilosDeAfiliados30d: number
  hilosNoLeidosPorAdmin: number
  afiliaciones: {
    pendientes: number
    enRevision: number
    aprobadas30d: number
    rechazadas30d: number
  }
  mensajesDelegadoViejoNoLeidos: number
}

// =====================================================================
// Helpers
// =====================================================================

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}

const CHUNK = 1000

async function fetchAll<Row>(
  builder: (from: number, to: number) => PromiseLike<{
    data: Row[] | null
    error: { message: string } | null
  }>,
): Promise<Row[]> {
  const out: Row[] = []
  let from = 0
  while (true) {
    const { data, error } = await builder(from, from + CHUNK - 1)
    if (error) throw new Error(`fetchAll: ${error.message}`)
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < CHUNK) break
    from += CHUNK
  }
  return out
}

async function getAdminIds(
  admin: SupabaseClient<Database>,
): Promise<string[]> {
  const { data } = await admin
    .from('afiliados')
    .select('id')
    .eq('rol', 'admin')
  return (data ?? []).map((r) => r.id)
}

async function getDelegadoIds(
  admin: SupabaseClient<Database>,
): Promise<{ id: string; nombre: string; last_login_at: string | null }[]> {
  const { data } = await admin
    .from('afiliados')
    .select('id, nombre, last_login_at')
    .eq('rol', 'delegado')
  return (data ?? []) as {
    id: string
    nombre: string
    last_login_at: string | null
  }[]
}

// =====================================================================
// 1. Adopción global
// =====================================================================

export async function getAdopcionGlobal(
  admin: SupabaseClient<Database>,
  totalApopsEnPadron: number,
): Promise<AdopcionGlobal> {
  const cutoff1 = daysAgo(1)
  const cutoff7 = daysAgo(7)
  const cutoff30 = daysAgo(30)

  const [
    { count: cuentasCreadas },
    { count: cuentasActivas },
    { count: pushActivo },
    { count: dau },
    { count: wau },
    { count: mau },
  ] = await Promise.all([
    admin.from('afiliados').select('id', { count: 'exact', head: true }),
    admin
      .from('afiliados')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'activo'),
    admin
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true }),
    admin
      .from('afiliados')
      .select('id', { count: 'exact', head: true })
      .gte('last_login_at', cutoff1),
    admin
      .from('afiliados')
      .select('id', { count: 'exact', head: true })
      .gte('last_login_at', cutoff7),
    admin
      .from('afiliados')
      .select('id', { count: 'exact', head: true })
      .gte('last_login_at', cutoff30),
  ])

  // Uso real 30d: activos en 30d que TAMBIÉN recibieron una notif en 30d.
  // Como no hay índice compuesto, traemos los IDs de activos y filtramos
  // por destinatario_id de hilos en 30d.
  type Row = { id: string }
  const { data: activosIdsRaw } = (await admin
    .from('afiliados')
    .select('id')
    .gte('last_login_at', cutoff30)) as { data: Row[] | null }
  const activosIds = new Set((activosIdsRaw ?? []).map((r) => r.id))

  let usoReal30d = 0
  if (activosIds.size > 0) {
    type HiloRow = { destinatario_id: string }
    const hilos = await fetchAll<HiloRow>((from, to) =>
      admin
        .from('hilos_notificacion')
        .select('destinatario_id')
        .gte('created_at', cutoff30)
        .range(from, to),
    )
    const conNotif = new Set<string>()
    for (const h of hilos) {
      if (activosIds.has(h.destinatario_id)) conNotif.add(h.destinatario_id)
    }
    usoReal30d = conNotif.size
  }

  const porcentajeAdopcion =
    totalApopsEnPadron > 0
      ? Math.round(((cuentasCreadas ?? 0) / totalApopsEnPadron) * 100)
      : 0

  return {
    cotizantesApops: totalApopsEnPadron,
    cuentasCreadas: cuentasCreadas ?? 0,
    cuentasActivas: cuentasActivas ?? 0,
    pushActivo: pushActivo ?? 0,
    dau: dau ?? 0,
    wau: wau ?? 0,
    mau: mau ?? 0,
    usoReal30d,
    porcentajeAdopcion,
  }
}

// =====================================================================
// 2. Comunicación CD → app (notif enviadas y leídas)
// =====================================================================

export async function getComunicacionCD(
  admin: SupabaseClient<Database>,
  dias = 30,
): Promise<ComunicacionCD> {
  const cutoff = daysAgo(dias)
  const adminIds = await getAdminIds(admin)
  if (adminIds.length === 0) {
    return {
      notifAfiliadosTotal: 0,
      notifAfiliadosLeidas: 0,
      notifDelegadosTotal: 0,
      notifDelegadosLeidas: 0,
      tasaLecturaAfiliados: 0,
      tasaLecturaDelegados: 0,
      tiempoMedioLecturaHs: null,
    }
  }

  type HiloRow = {
    id: string
    destinatario_id: string
    leido_destinatario: boolean
    created_at: string
    ultimo_mensaje_at: string
  }
  const hilos = await fetchAll<HiloRow>((from, to) =>
    admin
      .from('hilos_notificacion')
      .select('id, destinatario_id, leido_destinatario, created_at, ultimo_mensaje_at')
      .in('autor_id', adminIds)
      .gte('created_at', cutoff)
      .range(from, to),
  )

  if (hilos.length === 0) {
    return {
      notifAfiliadosTotal: 0,
      notifAfiliadosLeidas: 0,
      notifDelegadosTotal: 0,
      notifDelegadosLeidas: 0,
      tasaLecturaAfiliados: 0,
      tasaLecturaDelegados: 0,
      tiempoMedioLecturaHs: null,
    }
  }

  // Para clasificar destinatario_id en afiliado vs delegado, traigo los
  // roles de los destinatarios únicos en una sola query.
  const destinatariosIds = Array.from(
    new Set(hilos.map((h) => h.destinatario_id)),
  )
  type AfilRow = { id: string; rol: string }
  const { data: rolesRaw } = (await admin
    .from('afiliados')
    .select('id, rol')
    .in('id', destinatariosIds)) as { data: AfilRow[] | null }
  const rolPorId = new Map<string, string>()
  for (const r of rolesRaw ?? []) rolPorId.set(r.id, r.rol)

  let nAfilTot = 0,
    nAfilLeida = 0,
    nDelTot = 0,
    nDelLeida = 0
  // Para tiempo medio de lectura, usamos diferencia entre created_at y
  // ultimo_mensaje_at solo si está leído (proxy: ultimo_mensaje_at puede no
  // ser exactamente cuando se leyó pero es la señal más cercana sin agregar
  // columna nueva).
  const lecturaMs: number[] = []
  for (const h of hilos) {
    const rol = rolPorId.get(h.destinatario_id) ?? 'afiliado'
    const esDelegado = rol === 'delegado'
    if (esDelegado) {
      nDelTot++
      if (h.leido_destinatario) nDelLeida++
    } else {
      nAfilTot++
      if (h.leido_destinatario) nAfilLeida++
    }
    if (h.leido_destinatario && h.ultimo_mensaje_at && h.created_at) {
      const diff =
        new Date(h.ultimo_mensaje_at).getTime() -
        new Date(h.created_at).getTime()
      if (diff > 0) lecturaMs.push(diff)
    }
  }

  const tasaAfil =
    nAfilTot > 0 ? Math.round((nAfilLeida / nAfilTot) * 100) : 0
  const tasaDel = nDelTot > 0 ? Math.round((nDelLeida / nDelTot) * 100) : 0
  const tiempoMedioLecturaHs =
    lecturaMs.length === 0
      ? null
      : Math.round(
          (lecturaMs.reduce((a, b) => a + b, 0) / lecturaMs.length) /
            1000 /
            60 /
            60,
        )

  return {
    notifAfiliadosTotal: nAfilTot,
    notifAfiliadosLeidas: nAfilLeida,
    notifDelegadosTotal: nDelTot,
    notifDelegadosLeidas: nDelLeida,
    tasaLecturaAfiliados: tasaAfil,
    tasaLecturaDelegados: tasaDel,
    tiempoMedioLecturaHs,
  }
}

// =====================================================================
// 3. Delegados — engagement individual
// =====================================================================

export async function getDelegadosEngagement(
  admin: SupabaseClient<Database>,
  dias = 30,
): Promise<DelegadosEngagement> {
  const cutoff = daysAgo(dias)
  const delegados = await getDelegadoIds(admin)
  if (delegados.length === 0) {
    return {
      totalDelegadosRegistrados: 0,
      delegadosActivos30d: 0,
      delegadosLeyeronCD30d: 0,
      top: [],
      inactivos: [],
    }
  }
  const delegadoIds = delegados.map((d) => d.id)
  const adminIds = await getAdminIds(admin)

  // Hilos donde el delegado es destinatario, en período
  type HiloRow = {
    destinatario_id: string
    autor_id: string
    leido_destinatario: boolean
    created_at: string
  }
  const hilosRecibidos = await fetchAll<HiloRow>((from, to) =>
    admin
      .from('hilos_notificacion')
      .select('destinatario_id, autor_id, leido_destinatario, created_at')
      .in('destinatario_id', delegadoIds)
      .gte('created_at', cutoff)
      .range(from, to),
  )

  // Hilos donde el delegado es autor (mensajes que ABRIÓ)
  type HiloAutoRow = { autor_id: string; created_at: string }
  const hilosAbiertos = await fetchAll<HiloAutoRow>((from, to) =>
    admin
      .from('hilos_notificacion')
      .select('autor_id, created_at')
      .in('autor_id', delegadoIds)
      .gte('created_at', cutoff)
      .range(from, to),
  )

  const adminIdSet = new Set(adminIds)
  const stats = new Map<
    string,
    {
      notifRecibidas: number
      notifLeidas: number
      notifLeidasDeCD: number
      hilosAbiertos: number
    }
  >()
  for (const d of delegados) {
    stats.set(d.id, {
      notifRecibidas: 0,
      notifLeidas: 0,
      notifLeidasDeCD: 0,
      hilosAbiertos: 0,
    })
  }
  for (const h of hilosRecibidos) {
    const s = stats.get(h.destinatario_id)
    if (!s) continue
    s.notifRecibidas++
    if (h.leido_destinatario) {
      s.notifLeidas++
      if (adminIdSet.has(h.autor_id)) s.notifLeidasDeCD++
    }
  }
  for (const h of hilosAbiertos) {
    const s = stats.get(h.autor_id)
    if (!s) continue
    s.hilosAbiertos++
  }

  // Métricas agregadas
  let delegadosActivos30d = 0
  let delegadosLeyeronCD30d = 0
  const enriched: DelegadoEngagement[] = []
  for (const d of delegados) {
    const s = stats.get(d.id)!
    const activo =
      d.last_login_at !== null && new Date(d.last_login_at) >= new Date(cutoff)
    if (activo) delegadosActivos30d++
    if (s.notifLeidasDeCD > 0) delegadosLeyeronCD30d++
    enriched.push({
      id: d.id,
      nombre: d.nombre,
      ultimoLogin: d.last_login_at,
      notifRecibidas: s.notifRecibidas,
      notifLeidas: s.notifLeidas,
      hilosAbiertos: s.hilosAbiertos,
    })
  }

  // Top por actividad: score simple = notifLeidas*2 + hilosAbiertos*3 + log reciente
  function score(d: DelegadoEngagement): number {
    const reciente = d.ultimoLogin
      ? Math.max(
          0,
          30 -
            Math.floor(
              (Date.now() - new Date(d.ultimoLogin).getTime()) /
                (24 * 60 * 60 * 1000),
            ),
        )
      : 0
    return d.notifLeidas * 2 + d.hilosAbiertos * 3 + reciente
  }
  const top = [...enriched].sort((a, b) => score(b) - score(a)).slice(0, 10)
  const inactivos = enriched.filter(
    (d) =>
      d.ultimoLogin === null || new Date(d.ultimoLogin) < new Date(cutoff),
  )

  return {
    totalDelegadosRegistrados: delegados.length,
    delegadosActivos30d,
    delegadosLeyeronCD30d,
    top,
    inactivos,
  }
}

// =====================================================================
// 4. Comunicación entrante (delegados/afiliados → CD)
// =====================================================================

export async function getComunicacionEntrante(
  admin: SupabaseClient<Database>,
  dias = 30,
): Promise<ComunicacionEntrante> {
  const cutoff = daysAgo(dias)
  const adminIds = await getAdminIds(admin)
  const adminIdSet = new Set(adminIds)

  // Hilos abiertos por delegados o afiliados con admin como destinatario
  type HiloRow = {
    autor_id: string
    destinatario_id: string
    leido_destinatario: boolean
    created_at: string
  }
  const hilos =
    adminIds.length > 0
      ? await fetchAll<HiloRow>((from, to) =>
          admin
            .from('hilos_notificacion')
            .select('autor_id, destinatario_id, leido_destinatario, created_at')
            .in('destinatario_id', adminIds)
            .gte('created_at', cutoff)
            .range(from, to),
        )
      : []

  // Clasifico autor por rol
  const autoresIds = Array.from(new Set(hilos.map((h) => h.autor_id)))
  const rolPorId = new Map<string, string>()
  if (autoresIds.length > 0) {
    type AfilRow = { id: string; rol: string }
    const { data } = (await admin
      .from('afiliados')
      .select('id, rol')
      .in('id', autoresIds)) as { data: AfilRow[] | null }
    for (const r of data ?? []) rolPorId.set(r.id, r.rol)
  }

  let hilosDelegados = 0
  let hilosAfiliados = 0
  let hilosNoLeidos = 0
  for (const h of hilos) {
    const rol = rolPorId.get(h.autor_id) ?? 'afiliado'
    if (rol === 'delegado') hilosDelegados++
    else if (rol === 'afiliado') hilosAfiliados++
    if (!h.leido_destinatario && adminIdSet.has(h.destinatario_id)) hilosNoLeidos++
  }

  // Afiliaciones online por estado
  type SolRow = { estado: string; created_at: string; procesado_at: string | null }
  const { data: solicitudes } = (await admin
    .from('solicitudes_afiliacion')
    .select('estado, created_at, procesado_at')) as { data: SolRow[] | null }

  let pendientes = 0
  let enRevision = 0
  let aprobadas30d = 0
  let rechazadas30d = 0
  for (const s of solicitudes ?? []) {
    if (s.estado === 'pendiente') pendientes++
    else if (s.estado === 'en_revision') enRevision++
    else if (s.estado === 'aprobada' && s.procesado_at && s.procesado_at >= cutoff) {
      aprobadas30d++
    } else if (
      s.estado === 'rechazada' &&
      s.procesado_at &&
      s.procesado_at >= cutoff
    ) {
      rechazadas30d++
    }
  }

  // Sistema viejo mensajes_delegado
  const { count: mensajesViejoNoLeidos } = await admin
    .from('mensajes_delegado')
    .select('id', { count: 'exact', head: true })
    .eq('leido', false)

  return {
    hilosDeDelegados30d: hilosDelegados,
    hilosDeAfiliados30d: hilosAfiliados,
    hilosNoLeidosPorAdmin: hilosNoLeidos,
    afiliaciones: {
      pendientes,
      enRevision,
      aprobadas30d,
      rechazadas30d,
    },
    mensajesDelegadoViejoNoLeidos: mensajesViejoNoLeidos ?? 0,
  }
}
