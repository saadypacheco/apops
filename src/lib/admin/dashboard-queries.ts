// Queries y agregadores para el dashboard de la Comisión Directiva.
//
// Por simplicidad agregamos en JS (no en SQL). Para los volúmenes que
// manejamos (15k cotizantes, 4k APOPS) el costo es <100ms por bloque
// y simplifica el código. Si crece a 200k+, migrar a aggregates en PG.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// PostgREST tiene cap default de 1000 filas por request en Supabase Cloud,
// y el .range() de supabase-js no lo supera. Para snapshots de 15k+ filas
// paginamos en chunks. Cuando un chunk vuelve con < CHUNK filas, terminamos.
const CHUNK = 1000

type ChunkQuery<Row> = (
  from: number,
  to: number,
) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>

async function fetchAllRows<Row>(query: ChunkQuery<Row>): Promise<Row[]> {
  const out: Row[] = []
  let from = 0
  while (true) {
    const { data, error } = await query(from, from + CHUNK - 1)
    if (error) throw new Error(`fetchAllRows: ${error.message}`)
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < CHUNK) break
    from += CHUNK
  }
  return out
}

// =====================================================================
// Tipos compartidos
// =====================================================================

export type SnapshotMeta = {
  id: string
  periodo_label: string
  periodo_year: number
  periodo_month: number
  importado_at: string
  archivo_nombre: string | null
  total_filas: number
  total_apops: number
  total_ate: number
  total_upcn: number
  total_secasfpi: number
  total_planta_perm: number
  total_planta_trans: number
  total_papel: number
  total_delegados: number
}

export type Bucket = { label: string; count: number }

export type DistribucionApops = {
  totalApops: number
  porEdificio: Bucket[] // top 10 + "Otros"
  porProvincia: Bucket[]
  /** Conteo crudo por nombre de provincia tal como vino del padrón.
   *  Usado por el mapa para choropleth (la lista por provincia ya es top-N). */
  porProvinciaMap: Record<string, number>
  porPlanta: { pp: number; pt: number; sin: number }
  porSexo: { varon: number; mujer: number; otro: number; sin: number }
  porCategoria: Bucket[] // ordenado por categoría asc
  porEdad: { lt30: number; r30_40: number; r40_50: number; r50_60: number; gte60: number; sin: number }
}

export type ComisionDirectiva = {
  totalDelegados: number
  mandatosVencen30: { nombre: string; legajo: string; edificio: string | null }[]
  edificiosSinDelegado: string[] // top 10 edificios APOPS sin delegado asignado
}

export type AppVsPadron = {
  totalAfiliadosApp: number
  totalActivos: number
  totalApopsEnPadron: number
  porcentajeAdopcion: number // 0..100
  engaged30d: number // afiliados con last_login_at < 30 días
  pendientesAcceso: number
  pendientesAfiliacion: number
}

export type Evolucion = {
  altasReales: number
  bajasReales: number
  cambiosCategoria: number
  cambiosGremio: number
  cambiosDelegado: number
  altasApops: number
  bajasApops: number
}

/** Una persona del padrón con datos para listar en altas/bajas. */
export type PersonaPadron = {
  legajo: string
  dni: string | null
  nombre: string
  edificio: string | null
  provincia: string | null
  /** Lista de gremios a los que pertenece. Vacío = ninguno conocido. */
  gremios: ('APOPS' | 'ATE' | 'UPCN' | 'SECASFPI')[]
  /** Si cotiza solo en papel, es jubilado de carrera. */
  cotizaPapel: boolean
  /** Solo presente en bajas: si tenía cuenta en la app, datos para contactar. */
  cuentaApp?: {
    id: string
    email: string
    estado: string
  } | null
}

export type AltasYBajas = {
  altas: PersonaPadron[]
  bajas: PersonaPadron[]
}

export type EventoMes = {
  legajo: string
  dni: string | null
  nombre: string
  edificio: string | null
  /** 1-31 — día del mes en que cae el evento. */
  dia: number
  /** Edad que cumple (cumpleaños) o años de servicio (aniversario). null si no se puede calcular. */
  anos: number | null
}

export type EventosDelMes = {
  mes: number // 1-12
  mesLabel: string
  cumpleanos: EventoMes[]
  aniversarios: EventoMes[]
}

// =====================================================================
// Snapshot
// =====================================================================

export async function getSnapshots(
  admin: SupabaseClient<Database>,
): Promise<SnapshotMeta[]> {
  const { data } = await admin
    .from('padron_snapshots')
    .select(
      'id, periodo_label, periodo_year, periodo_month, importado_at, archivo_nombre, total_filas, total_apops, total_ate, total_upcn, total_secasfpi, total_planta_perm, total_planta_trans, total_papel, total_delegados',
    )
    .order('periodo_year', { ascending: false })
    .order('periodo_month', { ascending: false })
  return (data as SnapshotMeta[] | null) ?? []
}

// =====================================================================
// Distribución APOPS (Bloque 3)
// =====================================================================

type DistRow = {
  lugar_trabajo_padron: string | null
  lugar_trabajo_rrhh: string | null
  provincia: string | null
  sexo: string | null
  categoria: number | null
  tipo_planta: string | null
  fecha_nacimiento: string | null
}

function topN(map: Map<string, number>, n: number): Bucket[] {
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1])
  const top = sorted.slice(0, n).map(([label, count]) => ({ label, count }))
  const rest = sorted.slice(n)
  if (rest.length > 0) {
    const otros = rest.reduce((acc, [, c]) => acc + c, 0)
    top.push({ label: `Otros (${rest.length})`, count: otros })
  }
  return top
}

function edad(fechaNac: string | null, now: Date): number | null {
  if (!fechaNac) return null
  const d = new Date(fechaNac)
  if (isNaN(d.getTime())) return null
  let years = now.getUTCFullYear() - d.getUTCFullYear()
  const m = now.getUTCMonth() - d.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) years--
  return years
}

export async function getDistribucionApops(
  admin: SupabaseClient<Database>,
  snapshotId: string,
): Promise<DistribucionApops> {
  const rows = await fetchAllRows<DistRow>(async (from, to) => {
    const res = await admin
      .from('padron_cotizantes')
      .select(
        'lugar_trabajo_padron, lugar_trabajo_rrhh, provincia, sexo, categoria, tipo_planta, fecha_nacimiento',
      )
      .eq('padron_snapshot_id', snapshotId)
      .eq('afiliado_apops', true)
      .range(from, to)
    return { data: (res.data as DistRow[] | null) ?? null, error: res.error }
  })
  const total = rows.length

  const edificios = new Map<string, number>()
  const provincias = new Map<string, number>()
  const planta = { pp: 0, pt: 0, sin: 0 }
  const sexo = { varon: 0, mujer: 0, otro: 0, sin: 0 }
  const categorias = new Map<number, number>()
  const edad_buckets = { lt30: 0, r30_40: 0, r40_50: 0, r50_60: 0, gte60: 0, sin: 0 }
  const now = new Date()

  for (const r of rows) {
    const edif = r.lugar_trabajo_padron ?? r.lugar_trabajo_rrhh ?? 'Sin dato'
    edificios.set(edif, (edificios.get(edif) ?? 0) + 1)

    const prov = r.provincia ?? 'Sin dato'
    provincias.set(prov, (provincias.get(prov) ?? 0) + 1)

    if (r.tipo_planta === 'PP') planta.pp++
    else if (r.tipo_planta === 'PT') planta.pt++
    else planta.sin++

    if (r.sexo === 'Varón') sexo.varon++
    else if (r.sexo === 'Mujer') sexo.mujer++
    else if (r.sexo === 'Otro') sexo.otro++
    else sexo.sin++

    if (r.categoria !== null) {
      categorias.set(r.categoria, (categorias.get(r.categoria) ?? 0) + 1)
    }

    const e = edad(r.fecha_nacimiento, now)
    if (e === null) edad_buckets.sin++
    else if (e < 30) edad_buckets.lt30++
    else if (e < 40) edad_buckets.r30_40++
    else if (e < 50) edad_buckets.r40_50++
    else if (e < 60) edad_buckets.r50_60++
    else edad_buckets.gte60++
  }

  const porCategoria: Bucket[] = [...categorias.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([cat, count]) => ({ label: `Cat ${cat}`, count }))

  return {
    totalApops: total,
    porEdificio: topN(edificios, 10),
    porProvincia: topN(provincias, 8),
    porProvinciaMap: Object.fromEntries(provincias),
    porPlanta: planta,
    porSexo: sexo,
    porCategoria,
    porEdad: edad_buckets,
  }
}

// =====================================================================
// Comisión Directiva (Bloque 4)
// =====================================================================

export async function getComisionDirectiva(
  admin: SupabaseClient<Database>,
  snapshotId: string,
): Promise<ComisionDirectiva> {
  // 1. Delegados activos = filas con fecha_actualizacion_delegados not null
  const { count: totalDelegados } = await admin
    .from('padron_cotizantes')
    .select('id', { count: 'exact', head: true })
    .eq('padron_snapshot_id', snapshotId)
    .not('fecha_actualizacion_delegados', 'is', null)

  // 2. Mandatos por vencer 30 días
  const { data: mandatosData } = await admin
    .from('padron_cotizantes')
    .select(
      'nombre, legajo, lugar_trabajo_padron, lugar_trabajo_rrhh',
    )
    .eq('padron_snapshot_id', snapshotId)
    .eq('vence_mandato_30dias', true)
    .order('nombre')
    .range(0, 100)

  const mandatosVencen30 = ((mandatosData as
    | {
        nombre: string
        legajo: string | null
        lugar_trabajo_padron: string | null
        lugar_trabajo_rrhh: string | null
      }[]
    | null) ?? []).map((m) => ({
    nombre: m.nombre,
    legajo: m.legajo ?? '—',
    edificio: m.lugar_trabajo_padron ?? m.lugar_trabajo_rrhh,
  }))

  // 3. Edificios APOPS sin delegado asignado.
  // (Edificio donde hay APOPS pero ningún cotizante del edificio es delegado.)
  type ApopsByEdifRow = {
    lugar_trabajo_padron: string | null
    lugar_trabajo_rrhh: string | null
    fecha_actualizacion_delegados: string | null
  }
  const apopsByEdif = await fetchAllRows<ApopsByEdifRow>(async (from, to) => {
    const res = await admin
      .from('padron_cotizantes')
      .select(
        'lugar_trabajo_padron, lugar_trabajo_rrhh, fecha_actualizacion_delegados',
      )
      .eq('padron_snapshot_id', snapshotId)
      .eq('afiliado_apops', true)
      .range(from, to)
    return {
      data: (res.data as ApopsByEdifRow[] | null) ?? null,
      error: res.error,
    }
  })

  const edifTieneDelegado = new Map<string, boolean>()
  for (const r of apopsByEdif) {
    const edif = r.lugar_trabajo_padron ?? r.lugar_trabajo_rrhh
    if (!edif) continue
    const previo = edifTieneDelegado.get(edif) ?? false
    edifTieneDelegado.set(
      edif,
      previo || r.fecha_actualizacion_delegados !== null,
    )
  }
  const sinDelegado = [...edifTieneDelegado.entries()]
    .filter(([, tiene]) => !tiene)
    .map(([edif]) => edif)
    .sort()
    .slice(0, 10)

  return {
    totalDelegados: totalDelegados ?? 0,
    mandatosVencen30,
    edificiosSinDelegado: sinDelegado,
  }
}

// =====================================================================
// App vs Padrón (Bloque 5)
// =====================================================================

export async function getAppVsPadron(
  admin: SupabaseClient<Database>,
  snapshotId: string,
  totalApopsEnPadron: number,
): Promise<AppVsPadron> {
  const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalAfiliadosApp },
    { count: totalActivos },
    { count: engaged30d },
    { count: pendientesAcceso },
    { count: pendientesAfiliacion },
  ] = await Promise.all([
    admin.from('afiliados').select('id', { count: 'exact', head: true }),
    admin
      .from('afiliados')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'activo'),
    admin
      .from('afiliados')
      .select('id', { count: 'exact', head: true })
      .gte('last_login_at', cutoff30),
    admin
      .from('solicitudes_pendientes')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'pendiente'),
    admin
      .from('solicitudes_afiliacion')
      .select('id', { count: 'exact', head: true })
      .in('estado', ['pendiente', 'en_revision']),
  ])

  const adopcion =
    totalApopsEnPadron > 0
      ? Math.round(((totalAfiliadosApp ?? 0) / totalApopsEnPadron) * 1000) / 10
      : 0

  return {
    totalAfiliadosApp: totalAfiliadosApp ?? 0,
    totalActivos: totalActivos ?? 0,
    totalApopsEnPadron,
    porcentajeAdopcion: adopcion,
    engaged30d: engaged30d ?? 0,
    pendientesAcceso: pendientesAcceso ?? 0,
    pendientesAfiliacion: pendientesAfiliacion ?? 0,
  }
}

// =====================================================================
// Eventos del mes — cumpleaños + aniversarios de ingreso (Tab eventos)
// =====================================================================

type EventoRow = {
  legajo: string | null
  dni: string | null
  nombre: string
  lugar_trabajo_padron: string | null
  lugar_trabajo_rrhh: string | null
  fecha_nacimiento: string | null
  fecha_ingreso: string | null
}

const MES_LABELS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/**
 * Saca los cumpleaños y aniversarios de ingreso del padrón APOPS para el mes
 * indicado (1-12). Si no se especifica, usa el mes actual del calendar.
 */
export async function getEventosDelMes(
  admin: SupabaseClient<Database>,
  snapshotId: string,
  mes?: number,
): Promise<EventosDelMes> {
  const ahora = new Date()
  const mesNum = mes ?? ahora.getUTCMonth() + 1
  const anoActual = ahora.getUTCFullYear()

  const rows = await fetchAllRows<EventoRow>(async (from, to) => {
    const res = await admin
      .from('padron_cotizantes')
      .select(
        'legajo, dni, nombre, lugar_trabajo_padron, lugar_trabajo_rrhh, fecha_nacimiento, fecha_ingreso',
      )
      .eq('padron_snapshot_id', snapshotId)
      .eq('afiliado_apops', true)
      .range(from, to)
    return { data: (res.data as EventoRow[] | null) ?? null, error: res.error }
  })

  const cumpleanos: EventoMes[] = []
  const aniversarios: EventoMes[] = []

  for (const r of rows) {
    if (!r.legajo) continue
    const edificio = r.lugar_trabajo_padron ?? r.lugar_trabajo_rrhh

    if (r.fecha_nacimiento) {
      const d = new Date(r.fecha_nacimiento)
      if (!isNaN(d.getTime()) && d.getUTCMonth() + 1 === mesNum) {
        const dia = d.getUTCDate()
        const anos = anoActual - d.getUTCFullYear()
        cumpleanos.push({
          legajo: r.legajo,
          dni: r.dni,
          nombre: r.nombre,
          edificio,
          dia,
          anos: anos > 0 && anos < 120 ? anos : null,
        })
      }
    }

    if (r.fecha_ingreso) {
      const d = new Date(r.fecha_ingreso)
      if (!isNaN(d.getTime()) && d.getUTCMonth() + 1 === mesNum) {
        const dia = d.getUTCDate()
        const anos = anoActual - d.getUTCFullYear()
        // Solo aniversarios "redondos" cuentan más, pero mostramos todos
        // los que cumplen este mes.
        aniversarios.push({
          legajo: r.legajo,
          dni: r.dni,
          nombre: r.nombre,
          edificio,
          dia,
          anos: anos > 0 && anos < 80 ? anos : null,
        })
      }
    }
  }

  cumpleanos.sort((a, b) => a.dia - b.dia)
  aniversarios.sort((a, b) => a.dia - b.dia)

  return {
    mes: mesNum,
    mesLabel: MES_LABELS[mesNum - 1] ?? 'mes',
    cumpleanos,
    aniversarios,
  }
}

// =====================================================================
// Altas y Bajas detalladas (Tab altas-bajas)
// =====================================================================

type PadronFullRow = {
  legajo: string | null
  dni: string | null
  nombre: string
  lugar_trabajo_padron: string | null
  lugar_trabajo_rrhh: string | null
  provincia: string | null
  afiliado_apops: boolean | null
  afiliado_ate: boolean | null
  afiliado_upcn: boolean | null
  afiliado_secasfpi: boolean | null
  cotiza_papel: boolean | null
  categoria: number | null
}

function toPersona(r: PadronFullRow): PersonaPadron {
  const gremios: PersonaPadron['gremios'] = []
  if (r.afiliado_apops) gremios.push('APOPS')
  if (r.afiliado_ate) gremios.push('ATE')
  if (r.afiliado_upcn) gremios.push('UPCN')
  if (r.afiliado_secasfpi) gremios.push('SECASFPI')
  return {
    legajo: r.legajo ?? '',
    dni: r.dni,
    nombre: r.nombre,
    edificio: r.lugar_trabajo_padron ?? r.lugar_trabajo_rrhh,
    provincia: r.provincia,
    gremios,
    cotizaPapel: !!r.cotiza_papel,
  }
}

export async function getAltasYBajas(
  admin: SupabaseClient<Database>,
  currentId: string,
  previousId: string,
): Promise<AltasYBajas> {
  const SELECT =
    'legajo, dni, nombre, lugar_trabajo_padron, lugar_trabajo_rrhh, provincia, afiliado_apops, afiliado_ate, afiliado_upcn, afiliado_secasfpi, cotiza_papel, categoria'

  const fetchSnap = (snapshotId: string) =>
    fetchAllRows<PadronFullRow>(async (from, to) => {
      const res = await admin
        .from('padron_cotizantes')
        .select(SELECT)
        .eq('padron_snapshot_id', snapshotId)
        .range(from, to)
      return { data: (res.data as PadronFullRow[] | null) ?? null, error: res.error }
    })

  const [currRows, prevRows] = await Promise.all([
    fetchSnap(currentId),
    fetchSnap(previousId),
  ])

  // Diff por legajo
  const currByLeg = new Map<string, PadronFullRow>()
  currRows.forEach((r) => {
    if (r.legajo) currByLeg.set(r.legajo, r)
  })
  const prevByLeg = new Map<string, PadronFullRow>()
  prevRows.forEach((r) => {
    if (r.legajo) prevByLeg.set(r.legajo, r)
  })

  // Altas: en curr y no en prev
  const altas: PersonaPadron[] = []
  for (const [leg, r] of currByLeg) {
    if (!prevByLeg.has(leg)) altas.push(toPersona(r))
  }
  // Bajas: en prev y no en curr
  const bajasRaw: PersonaPadron[] = []
  for (const [leg, r] of prevByLeg) {
    if (!currByLeg.has(leg)) bajasRaw.push(toPersona(r))
  }

  // Para las bajas, intentar matchear con la tabla afiliados (cuenta en la app)
  // por DNI o legajo. Una sola query para todos los DNIs/legajos.
  const dnisBajas = bajasRaw.map((b) => b.dni).filter((d): d is string => !!d)
  const legajosBajas = bajasRaw.map((b) => b.legajo).filter((l) => !!l)
  const afiliadosByDni = new Map<string, { id: string; email: string; estado: string }>()
  const afiliadosByLegajo = new Map<string, { id: string; email: string; estado: string }>()
  if (dnisBajas.length > 0 || legajosBajas.length > 0) {
    const orParts: string[] = []
    if (dnisBajas.length > 0) {
      orParts.push(`dni.in.(${dnisBajas.join(',')})`)
    }
    if (legajosBajas.length > 0) {
      // legajos pueden tener letras — escapar comas escapando cada uno entre dobles comillas
      const escaped = legajosBajas.map((l) => `"${l}"`).join(',')
      orParts.push(`legajo.in.(${escaped})`)
    }
    if (orParts.length > 0) {
      const { data } = await admin
        .from('afiliados')
        .select('id, dni, legajo, email, estado')
        .or(orParts.join(','))
      for (const a of (data as
        | {
            id: string
            dni: string
            legajo: string | null
            email: string
            estado: string
          }[]
        | null) ?? []) {
        afiliadosByDni.set(a.dni, {
          id: a.id,
          email: a.email,
          estado: a.estado,
        })
        if (a.legajo) {
          afiliadosByLegajo.set(a.legajo, {
            id: a.id,
            email: a.email,
            estado: a.estado,
          })
        }
      }
    }
  }
  const bajas = bajasRaw.map((b) => ({
    ...b,
    cuentaApp:
      (b.dni && afiliadosByDni.get(b.dni)) ||
      (b.legajo && afiliadosByLegajo.get(b.legajo)) ||
      null,
  }))

  // Orden: por nombre alfabético
  altas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  bajas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  return { altas, bajas }
}

// =====================================================================
// Evolución mes vs mes (Bloque 2)
// =====================================================================

type EvolRow = {
  legajo: string | null
  categoria: number | null
  afiliado_apops: boolean | null
  afiliado_ate: boolean | null
  afiliado_upcn: boolean | null
  afiliado_secasfpi: boolean | null
  fecha_actualizacion_delegados: string | null
}

export async function getEvolucion(
  admin: SupabaseClient<Database>,
  currentId: string,
  previousId: string,
): Promise<Evolucion> {
  const fetchEvol = (snapshotId: string) =>
    fetchAllRows<EvolRow>(async (from, to) => {
      const res = await admin
        .from('padron_cotizantes')
        .select(
          'legajo, categoria, afiliado_apops, afiliado_ate, afiliado_upcn, afiliado_secasfpi, fecha_actualizacion_delegados',
        )
        .eq('padron_snapshot_id', snapshotId)
        .range(from, to)
      return { data: (res.data as EvolRow[] | null) ?? null, error: res.error }
    })
  const [curr, prev] = await Promise.all([
    fetchEvol(currentId),
    fetchEvol(previousId),
  ])

  const currByLeg = new Map<string, EvolRow>()
  curr.forEach((r) => {
    if (r.legajo) currByLeg.set(r.legajo, r)
  })
  const prevByLeg = new Map<string, EvolRow>()
  prev.forEach((r) => {
    if (r.legajo) prevByLeg.set(r.legajo, r)
  })

  let altasReales = 0
  let bajasReales = 0
  let cambiosCategoria = 0
  let cambiosGremio = 0
  let cambiosDelegado = 0
  let altasApops = 0
  let bajasApops = 0

  // Altas: están en curr pero no en prev
  for (const [leg, r] of currByLeg) {
    if (!prevByLeg.has(leg)) {
      altasReales++
      if (r.afiliado_apops) altasApops++
    }
  }
  // Bajas: están en prev pero no en curr
  for (const [leg, r] of prevByLeg) {
    if (!currByLeg.has(leg)) {
      bajasReales++
      if (r.afiliado_apops) bajasApops++
    }
  }
  // Cambios: para los que están en ambos
  for (const [leg, currR] of currByLeg) {
    const prevR = prevByLeg.get(leg)
    if (!prevR) continue
    if (
      currR.categoria !== null &&
      prevR.categoria !== null &&
      currR.categoria !== prevR.categoria
    ) {
      cambiosCategoria++
    }
    if (
      currR.afiliado_apops !== prevR.afiliado_apops ||
      currR.afiliado_ate !== prevR.afiliado_ate ||
      currR.afiliado_upcn !== prevR.afiliado_upcn ||
      currR.afiliado_secasfpi !== prevR.afiliado_secasfpi
    ) {
      cambiosGremio++
    }
    const eraDeleg = prevR.fecha_actualizacion_delegados !== null
    const esDeleg = currR.fecha_actualizacion_delegados !== null
    if (eraDeleg !== esDeleg) cambiosDelegado++
  }

  return {
    altasReales,
    bajasReales,
    cambiosCategoria,
    cambiosGremio,
    cambiosDelegado,
    altasApops,
    bajasApops,
  }
}
