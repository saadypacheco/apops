import { createAdminClient } from '@/lib/supabase/admin'
import type { AfiliadoSession } from '@/lib/auth/role'
import { fetchAllRows } from '@/lib/supabase/paginate'
import { getEdificiosDelDelegado } from './whatsapp'

// Queries del panel del delegado (Inicio / Mi edificio / Afiliados /
// Comunicados). Todas usan admin client y filtran en código por los
// edificios que el delegado representa.
//
// Nota sobre "sector": el mockup pedía el desglose por sector
// (Administración, Sistemas, Trámites…) pero el padrón de ANSES no lo
// trae — los campos candidatos vienen vacíos. Queda pendiente de que el
// Ministerio lo incluya en el Excel. Ver RESUME.md.

export type StatsEdificio = {
  edificios: string[]
  empleados: number
  afiliadosApops: number
  noAfiliados: number
  otrosGremios: number
}

export type GremioBreakdown = { gremio: string; empleados: number }

export type PuntoEvolucion = {
  periodo: string // "5/2016"
  afiliados: number
}

type PadronRow = {
  dni: string
  nombre: string
  legajo: string | null
  afiliado_apops: boolean
  cotiza_papel: boolean
  afiliado_ate: boolean
  afiliado_sec: boolean
  afiliado_upcn: boolean
  afiliado_secasfpi: boolean
  lugar_trabajo_padron: string | null
  lugar_trabajo_rrhh: string | null
  representante: string | null
}

const COLS =
  'dni, nombre, legajo, afiliado_apops, cotiza_papel, afiliado_ate, afiliado_sec, afiliado_upcn, afiliado_secasfpi, lugar_trabajo_padron, lugar_trabajo_rrhh, representante'

function edificioDe(r: {
  lugar_trabajo_padron: string | null
  lugar_trabajo_rrhh: string | null
}): string | null {
  return r.lugar_trabajo_padron ?? r.lugar_trabajo_rrhh
}

function esApops(r: PadronRow): boolean {
  return r.afiliado_apops || r.cotiza_papel
}

function otroGremioDe(r: PadronRow): string | null {
  if (r.afiliado_ate) return 'ATE'
  if (r.afiliado_upcn) return 'UPCN'
  if (r.afiliado_sec) return 'SEC'
  if (r.afiliado_secasfpi) return 'SECASFPI'
  return null
}

/** Filas del padrón actual que pertenecen a los edificios del delegado. */
async function filasDeMisEdificios(
  nombreDelegado: string,
): Promise<{ filas: PadronRow[]; edificios: string[] }> {
  const edificios = await getEdificiosDelDelegado(nombreDelegado)
  if (edificios.length === 0) return { filas: [], edificios: [] }

  // Paginado: el padrón supera las 15k filas y PostgREST corta en 1000
  // sin avisar. Sin esto los totales del delegado salen mal por lo bajo.
  const admin = createAdminClient()
  const data = await fetchAllRows<PadronRow>(async (from, to) => {
    const res = await admin
      .from('padron_cotizantes_actual')
      .select(COLS)
      .range(from, to)
    return { data: res.data as PadronRow[] | null, error: res.error }
  })

  const set = new Set(edificios.map((e) => e.trim().toLowerCase()))
  const filas = data.filter((r) => {
    const e = edificioDe(r)
    return !!e && set.has(e.trim().toLowerCase())
  })

  return { filas, edificios }
}

export async function getStatsEdificio(
  nombreDelegado: string,
): Promise<StatsEdificio> {
  const { filas, edificios } = await filasDeMisEdificios(nombreDelegado)

  let afiliadosApops = 0
  let otrosGremios = 0
  for (const r of filas) {
    if (esApops(r)) afiliadosApops++
    else if (otroGremioDe(r)) otrosGremios++
  }

  return {
    edificios,
    empleados: filas.length,
    afiliadosApops,
    otrosGremios,
    noAfiliados: filas.length - afiliadosApops - otrosGremios,
  }
}

/** Desglose de los otros gremios presentes en el edificio. */
export async function getOtrosGremios(
  nombreDelegado: string,
): Promise<GremioBreakdown[]> {
  const { filas } = await filasDeMisEdificios(nombreDelegado)

  const conteo = new Map<string, number>()
  for (const r of filas) {
    if (esApops(r)) continue
    const g = otroGremioDe(r)
    if (!g) continue
    conteo.set(g, (conteo.get(g) ?? 0) + 1)
  }

  return Array.from(conteo.entries())
    .map(([gremio, empleados]) => ({ gremio, empleados }))
    .sort((a, b) => b.empleados - a.empleados)
}

export type PersonaEdificio = {
  dni: string
  nombre: string
  legajo: string | null
  edificio: string | null
  gremio: string | null
  esApops: boolean
}

/**
 * Gente del edificio partida en los tres grupos del mockup. El delegado
 * los usa para saber a quién invitar a afiliarse.
 */
export async function getPersonasDelEdificio(
  nombreDelegado: string,
): Promise<{
  afiliados: PersonaEdificio[]
  sinAfiliar: PersonaEdificio[]
  otrosGremios: PersonaEdificio[]
}> {
  const { filas } = await filasDeMisEdificios(nombreDelegado)

  const mapear = (r: PadronRow): PersonaEdificio => ({
    dni: r.dni,
    nombre: r.nombre,
    legajo: r.legajo,
    edificio: edificioDe(r),
    gremio: otroGremioDe(r),
    esApops: esApops(r),
  })

  const porNombre = (a: PersonaEdificio, b: PersonaEdificio) =>
    a.nombre.localeCompare(b.nombre, 'es')

  const afiliados = filas.filter(esApops).map(mapear).sort(porNombre)
  const resto = filas.filter((r) => !esApops(r)).map(mapear)

  return {
    afiliados,
    sinAfiliar: resto.filter((p) => !p.gremio).sort(porNombre),
    otrosGremios: resto.filter((p) => !!p.gremio).sort(porNombre),
  }
}

/**
 * Afiliados APOPS del edificio en cada snapshot, para el gráfico de
 * variación mensual. Devuelve los puntos ordenados cronológicamente.
 */
export async function getEvolucionEdificio(
  nombreDelegado: string,
): Promise<PuntoEvolucion[]> {
  const edificios = await getEdificiosDelDelegado(nombreDelegado)
  if (edificios.length === 0) return []

  const admin = createAdminClient()
  const { data: snapshots } = (await admin
    .from('padron_snapshots')
    .select('id, periodo_year, periodo_month')
    .order('periodo_year', { ascending: true })
    .order('periodo_month', { ascending: true })) as {
    data: Array<{ id: string; periodo_year: number; periodo_month: number }> | null
  }

  const set = new Set(edificios.map((e) => e.trim().toLowerCase()))
  const puntos: PuntoEvolucion[] = []

  type SnapRow = {
    afiliado_apops: boolean
    cotiza_papel: boolean
    lugar_trabajo_padron: string | null
    lugar_trabajo_rrhh: string | null
  }

  for (const s of snapshots ?? []) {
    const data = await fetchAllRows<SnapRow>(async (from, to) => {
      const res = await admin
        .from('padron_cotizantes')
        .select(
          'afiliado_apops, cotiza_papel, lugar_trabajo_padron, lugar_trabajo_rrhh',
        )
        .eq('padron_snapshot_id', s.id)
        .range(from, to)
      return { data: res.data as SnapRow[] | null, error: res.error }
    })

    const afiliados = data.filter((r) => {
      const e = edificioDe(r)
      if (!e || !set.has(e.trim().toLowerCase())) return false
      return r.afiliado_apops || r.cotiza_papel
    }).length

    puntos.push({
      periodo: `${s.periodo_month}/${s.periodo_year}`,
      afiliados,
    })
  }

  return puntos
}

// =====================================================================
// Oportunidades de afiliación
// =====================================================================

export type MotivoOportunidad =
  | 'dejo_gremio' // estaba en otro gremio y se dio de baja
  | 'ingreso_nuevo' // apareció en el padrón este mes, sin gremio
  | 'cambio_gremio' // se pasó de un gremio a otro (no a APOPS)
  | 'sin_gremio' // sin gremio desde antes

export const LABEL_MOTIVO: Record<MotivoOportunidad, string> = {
  dejo_gremio: 'Dejó su gremio',
  ingreso_nuevo: 'Ingresó al edificio',
  cambio_gremio: 'Cambió de gremio',
  sin_gremio: 'Sin gremio',
}

/** Qué tan caliente es el contacto. Ordena la lista. */
const PRIORIDAD: Record<MotivoOportunidad, number> = {
  dejo_gremio: 0,
  ingreso_nuevo: 1,
  cambio_gremio: 2,
  sin_gremio: 3,
}

export type Oportunidad = PersonaEdificio & {
  motivo: MotivoOportunidad
  /** Gremio del que viene, cuando aplica. */
  gremioAnterior: string | null
  fechaIngreso: string | null
}

type FilaComparable = {
  legajo: string | null
  dni: string
  nombre: string
  afiliado_apops: boolean
  cotiza_papel: boolean
  afiliado_ate: boolean
  afiliado_upcn: boolean
  afiliado_sec: boolean
  afiliado_secasfpi: boolean
  fecha_ingreso: string | null
  lugar_trabajo_padron: string | null
  lugar_trabajo_rrhh: string | null
}

const COLS_COMPARABLES =
  'legajo, dni, nombre, afiliado_apops, cotiza_papel, afiliado_ate, afiliado_upcn, afiliado_sec, afiliado_secasfpi, fecha_ingreso, lugar_trabajo_padron, lugar_trabajo_rrhh'

function gremioDe(r: FilaComparable): string | null {
  if (r.afiliado_apops || r.cotiza_papel) return 'APOPS'
  if (r.afiliado_ate) return 'ATE'
  if (r.afiliado_upcn) return 'UPCN'
  if (r.afiliado_sec) return 'SEC'
  if (r.afiliado_secasfpi) return 'SECASFPI'
  return null
}

/** Clave estable de una persona entre snapshots. */
function claveDe(r: { legajo: string | null; dni: string }): string {
  return r.legajo ?? r.dni
}

/**
 * Gente del edificio a la que conviene acercarse, comparando el padrón
 * actual contra el del mes anterior.
 *
 * La señal más fuerte es "dejó su gremio": alguien que se dio de baja de
 * ATE/UPCN/etc y quedó sin representación. Después los ingresos nuevos,
 * que todavía no eligieron gremio.
 */
export async function getOportunidadesAfiliacion(
  nombreDelegado: string,
): Promise<Oportunidad[]> {
  const edificios = await getEdificiosDelDelegado(nombreDelegado)
  if (edificios.length === 0) return []

  const admin = createAdminClient()
  const { data: snaps } = (await admin
    .from('padron_snapshots')
    .select('id')
    .order('periodo_year', { ascending: false })
    .order('periodo_month', { ascending: false })
    .limit(2)) as { data: Array<{ id: string }> | null }

  const actual = snaps?.[0]
  if (!actual) return []
  const anterior = snaps?.[1] ?? null

  const set = new Set(edificios.map((e) => e.trim().toLowerCase()))
  const traer = async (snapshotId: string) => {
    const filas = await fetchAllRows<FilaComparable>(async (from, to) => {
      const res = await admin
        .from('padron_cotizantes')
        .select(COLS_COMPARABLES)
        .eq('padron_snapshot_id', snapshotId)
        .range(from, to)
      return { data: res.data as FilaComparable[] | null, error: res.error }
    })
    return filas.filter((r) => {
      const e = edificioDe(r)
      return !!e && set.has(e.trim().toLowerCase())
    })
  }

  const [filasActual, filasAnterior] = await Promise.all([
    traer(actual.id),
    anterior ? traer(anterior.id) : Promise.resolve([]),
  ])

  const previo = new Map(filasAnterior.map((r) => [claveDe(r), r]))
  const oportunidades: Oportunidad[] = []

  for (const r of filasActual) {
    const gremioActual = gremioDe(r)
    // Los de APOPS no son oportunidad: ya están.
    if (gremioActual === 'APOPS') continue

    const antes = previo.get(claveDe(r))
    const gremioAnterior = antes ? gremioDe(antes) : null

    let motivo: MotivoOportunidad
    if (!antes && anterior) {
      // No estaba el mes pasado: entró al edificio.
      motivo = 'ingreso_nuevo'
    } else if (gremioAnterior && !gremioActual) {
      motivo = 'dejo_gremio'
    } else if (
      gremioAnterior &&
      gremioActual &&
      gremioAnterior !== gremioActual
    ) {
      motivo = 'cambio_gremio'
    } else if (!gremioActual) {
      motivo = 'sin_gremio'
    } else {
      // Sigue en el mismo gremio que antes: no hay novedad.
      continue
    }

    oportunidades.push({
      dni: r.dni,
      nombre: r.nombre,
      legajo: r.legajo,
      edificio: edificioDe(r),
      gremio: gremioActual,
      esApops: false,
      motivo,
      gremioAnterior:
        gremioAnterior && gremioAnterior !== gremioActual
          ? gremioAnterior
          : null,
      fechaIngreso: r.fecha_ingreso,
    })
  }

  return oportunidades.sort((a, b) => {
    const p = PRIORIDAD[a.motivo] - PRIORIDAD[b.motivo]
    return p !== 0 ? p : a.nombre.localeCompare(b.nombre, 'es')
  })
}

// =====================================================================
// Comunicados del delegado
// =====================================================================

export type TemaComunicado = 'general' | 'paritaria' | 'material' | 'campana'

export const LABEL_TEMA: Record<TemaComunicado, string> = {
  general: 'General',
  paritaria: 'Paritarias',
  material: 'Material',
  campana: 'Campañas',
}

export type Comunicado = {
  id: string
  titulo: string
  resumen: string
  tema: TemaComunicado
  audiencia: 'todos' | 'delegados'
  publicada_at: string
}

/**
 * Comunicados visibles para un delegado: los públicos MÁS los exclusivos.
 * Se sirve con admin client porque la policy de RLS (migration 0041)
 * esconde los de audiencia='delegados' de la API pública a propósito.
 */
export async function getComunicadosParaDelegado(): Promise<Comunicado[]> {
  const admin = createAdminClient()
  const { data } = (await admin
    .from('noticias')
    .select('id, titulo, resumen, tema, audiencia, publicada_at')
    .eq('publicada', true)
    .order('publicada_at', { ascending: false })
    .limit(100)) as { data: Comunicado[] | null }

  return data ?? []
}

// =====================================================================
// Resumen del día (pantalla Inicio)
// =====================================================================

export type ResumenDelDia = {
  alertas: number
  consultas: number
  comunicados: number
}

/**
 * Los tres contadores del Inicio:
 *   consultas  → hilos donde le escribieron y todavía no leyó
 *   comunicados→ noticias publicadas en los últimos 7 días
 *   alertas    → comunicados exclusivos de delegados sin leer + mandato
 *                por vencer
 */
export async function getResumenDelDia(
  session: AfiliadoSession,
): Promise<ResumenDelDia> {
  const admin = createAdminClient()

  const desde = new Date()
  desde.setDate(desde.getDate() - 7)
  const desdeIso = desde.toISOString()

  const [{ count: consultas }, { count: comunicados }, { count: alertas }] =
    await Promise.all([
      admin
        .from('hilos_notificacion')
        .select('id', { count: 'exact', head: true })
        .eq('destinatario_id', session.afiliadoId)
        .eq('leido_destinatario', false),
      admin
        .from('noticias')
        .select('id', { count: 'exact', head: true })
        .eq('publicada', true)
        .gte('publicada_at', desdeIso),
      admin
        .from('noticias')
        .select('id', { count: 'exact', head: true })
        .eq('publicada', true)
        .eq('audiencia', 'delegados')
        .gte('publicada_at', desdeIso),
    ])

  return {
    consultas: consultas ?? 0,
    comunicados: comunicados ?? 0,
    alertas: alertas ?? 0,
  }
}
