// Queries y agregadores para el dashboard de la Comisión Directiva.
//
// Por simplicidad agregamos en JS (no en SQL). Para los volúmenes que
// manejamos (15k cotizantes, 4k APOPS) el costo es <100ms por bloque
// y simplifica el código. Si crece a 200k+, migrar a aggregates en PG.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// Límite explícito para superar el max_rows default de PostgREST (1000).
// Necesario para snapshots completos de 15k+ filas.
const ROW_LIMIT = 50000

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
  const { data } = await admin
    .from('padron_cotizantes')
    .select(
      'lugar_trabajo_padron, lugar_trabajo_rrhh, provincia, sexo, categoria, tipo_planta, fecha_nacimiento',
    )
    .eq('padron_snapshot_id', snapshotId)
    .eq('afiliado_apops', true)
    .range(0, ROW_LIMIT)

  const rows = (data as DistRow[] | null) ?? []
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
  const { data: apopsByEdif } = await admin
    .from('padron_cotizantes')
    .select(
      'lugar_trabajo_padron, lugar_trabajo_rrhh, fecha_actualizacion_delegados',
    )
    .eq('padron_snapshot_id', snapshotId)
    .eq('afiliado_apops', true)
    .range(0, ROW_LIMIT)

  const edifTieneDelegado = new Map<string, boolean>()
  for (const r of (apopsByEdif as
    | {
        lugar_trabajo_padron: string | null
        lugar_trabajo_rrhh: string | null
        fecha_actualizacion_delegados: string | null
      }[]
    | null) ?? []) {
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
  const [currentRes, previousRes] = await Promise.all([
    admin
      .from('padron_cotizantes')
      .select(
        'legajo, categoria, afiliado_apops, afiliado_ate, afiliado_upcn, afiliado_secasfpi, fecha_actualizacion_delegados',
      )
      .eq('padron_snapshot_id', currentId)
      .range(0, ROW_LIMIT),
    admin
      .from('padron_cotizantes')
      .select(
        'legajo, categoria, afiliado_apops, afiliado_ate, afiliado_upcn, afiliado_secasfpi, fecha_actualizacion_delegados',
      )
      .eq('padron_snapshot_id', previousId)
      .range(0, ROW_LIMIT),
  ])

  const curr = (currentRes.data as EvolRow[] | null) ?? []
  const prev = (previousRes.data as EvolRow[] | null) ?? []

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
