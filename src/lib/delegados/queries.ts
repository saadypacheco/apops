import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAllRows } from '@/lib/supabase/paginate'

// Cotizantes que representa un delegado. El cruce se hace por nombre
// normalizado (lower + trim) entre `afiliados.nombre` del delegado y la
// columna `padron_cotizantes.representante`. Limitación conocida del MVP:
// matching frágil ante variaciones de nombre. Se puede mejorar con fuzzy
// match o asignación manual desde admin en una iteración futura.

export type CotizanteResumido = {
  id: string
  dni: string
  nombre: string
  legajo: string | null
  afiliado_apops: boolean
  cotiza_papel: boolean
  afiliado_ate: boolean
  afiliado_sec: boolean
  afiliado_upcn: boolean
  afiliado_secasfpi: boolean
  lugar_trabajo: string | null
  provincia: string | null
  regional: string | null
  tipo_planta: string | null
  categoria: number | null
  vence_mandato_30dias: boolean | null
}

export type StatsDelegado = {
  total: number
  afiliadosApops: number
  noAfiliadosApops: number
  cotizaPapel: number
  otrosGremios: number
}

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

// Devuelve { cotizantes, stats } para un delegado dado por nombre.
// Tira al admin client (service_role) porque el padrón tiene RLS estricta.
export async function getCotizantesRepresentados(
  delegadoNombre: string,
): Promise<{ cotizantes: CotizanteResumido[]; stats: StatsDelegado }> {
  const admin = createAdminClient()
  const target = normalize(delegadoNombre)

  // No hay índice case-insensitive en `representante`, pero es una columna
  // de tabla acotada (~miles de filas). Filtramos en cliente sin problemas.
  // Si crece mucho, agregar índice expression LOWER(representante).
  type Row = {
    id: string
    dni: string
    nombre: string
    legajo: string | null
    afiliado_apops: boolean
    cotiza_papel: boolean
    afiliado_ate: boolean
    afiliado_sec: boolean
    afiliado_upcn: boolean
    afiliado_secasfpi: boolean
    representante: string | null
    lugar_trabajo_padron: string | null
    lugar_trabajo_rrhh: string | null
    provincia: string | null
    regional: string | null
    tipo_planta: string | null
    categoria: number | null
    vence_mandato_30dias: boolean | null
  }
  // Paginado: PostgREST corta en 1000 filas sin avisar (ver
  // lib/supabase/paginate).
  const rows = await fetchAllRows<Row>(async (from, to) => {
    const res = await admin
      .from('padron_cotizantes_actual')
      .select(
        'id, dni, nombre, legajo, afiliado_apops, cotiza_papel, afiliado_ate, afiliado_sec, afiliado_upcn, afiliado_secasfpi, representante, lugar_trabajo_padron, lugar_trabajo_rrhh, provincia, regional, tipo_planta, categoria, vence_mandato_30dias',
      )
      .not('representante', 'is', null)
      .range(from, to)
    return { data: res.data as Row[] | null, error: res.error }
  })

  const matched = rows.filter(
    (r) => r.representante && normalize(r.representante) === target,
  )

  // Orden estable por nombre
  matched.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const cotizantes: CotizanteResumido[] = matched.map((r) => ({
    id: r.id,
    dni: r.dni,
    nombre: r.nombre,
    legajo: r.legajo,
    afiliado_apops: r.afiliado_apops,
    cotiza_papel: r.cotiza_papel,
    afiliado_ate: r.afiliado_ate,
    afiliado_sec: r.afiliado_sec,
    afiliado_upcn: r.afiliado_upcn,
    afiliado_secasfpi: r.afiliado_secasfpi,
    lugar_trabajo: r.lugar_trabajo_padron ?? r.lugar_trabajo_rrhh ?? null,
    provincia: r.provincia,
    regional: r.regional,
    tipo_planta: r.tipo_planta,
    categoria: r.categoria,
    vence_mandato_30dias: r.vence_mandato_30dias,
  }))

  const stats: StatsDelegado = {
    total: cotizantes.length,
    afiliadosApops: cotizantes.filter((c) => c.afiliado_apops).length,
    noAfiliadosApops: cotizantes.filter((c) => !c.afiliado_apops).length,
    cotizaPapel: cotizantes.filter((c) => c.cotiza_papel).length,
    otrosGremios: cotizantes.filter(
      (c) =>
        !c.afiliado_apops &&
        (c.afiliado_ate ||
          c.afiliado_sec ||
          c.afiliado_upcn ||
          c.afiliado_secasfpi),
    ).length,
  }

  return { cotizantes, stats }
}

// Vista completa del/los edificio(s) que cubre el delegado.
//
// A diferencia de getCotizantesRepresentados (que filtra solo por
// `representante = delegadoNombre`), esta función trae TODOS los
// cotizantes cuyo lugar_trabajo coincide con alguno de los edificios
// donde el delegado figura como representante. Incluye afiliados APOPS,
// de otros gremios (ATE, UPCN, SEC, SECASFPI), los que cotizan en
// papel, y los sin gremio — para que el delegado vea el panorama
// completo del edificio.
export async function getCotizantesDeLosEdificios(
  delegadoNombre: string,
): Promise<{
  cotizantes: CotizanteResumido[]
  edificios: string[]
  stats: StatsDelegado & { sinGremio: number }
}> {
  const admin = createAdminClient()
  const target = normalize(delegadoNombre)

  // 1. Padrón actual completo (sin filtro). Necesario porque queremos
  //    también filas SIN representante.
  type Row = {
    id: string
    dni: string
    nombre: string
    legajo: string | null
    afiliado_apops: boolean
    cotiza_papel: boolean
    afiliado_ate: boolean
    afiliado_sec: boolean
    afiliado_upcn: boolean
    afiliado_secasfpi: boolean
    representante: string | null
    lugar_trabajo_padron: string | null
    lugar_trabajo_rrhh: string | null
    provincia: string | null
    regional: string | null
    tipo_planta: string | null
    categoria: number | null
    vence_mandato_30dias: boolean | null
  }
  // Paginado: son 15k+ filas y PostgREST corta en 1000 (ver
  // lib/supabase/paginate). Sin esto el edificio salía incompleto.
  const all = await fetchAllRows<Row>(async (from, to) => {
    const res = await admin
      .from('padron_cotizantes_actual')
      .select(
        'id, dni, nombre, legajo, afiliado_apops, cotiza_papel, afiliado_ate, afiliado_sec, afiliado_upcn, afiliado_secasfpi, representante, lugar_trabajo_padron, lugar_trabajo_rrhh, provincia, regional, tipo_planta, categoria, vence_mandato_30dias',
      )
      .range(from, to)
    return { data: res.data as Row[] | null, error: res.error }
  })

  // 2. Edificios donde figuro como representante (union de
  //    lugar_trabajo_padron + lugar_trabajo_rrhh).
  const misEdificios = new Set<string>()
  for (const r of all) {
    if (!r.representante || normalize(r.representante) !== target) continue
    const edif = r.lugar_trabajo_padron ?? r.lugar_trabajo_rrhh
    if (edif) misEdificios.add(edif)
  }

  // 3. Filtrar todos los cotizantes cuyo lugar_trabajo coincide con
  //    alguno de mis edificios.
  const filtered = all.filter((r) => {
    const edif = r.lugar_trabajo_padron ?? r.lugar_trabajo_rrhh
    return !!edif && misEdificios.has(edif)
  })

  // Orden estable por edificio + nombre (para agrupar visualmente)
  filtered.sort((a, b) => {
    const ea = a.lugar_trabajo_padron ?? a.lugar_trabajo_rrhh ?? ''
    const eb = b.lugar_trabajo_padron ?? b.lugar_trabajo_rrhh ?? ''
    const byEdif = ea.localeCompare(eb, 'es')
    if (byEdif !== 0) return byEdif
    return a.nombre.localeCompare(b.nombre, 'es')
  })

  const cotizantes: CotizanteResumido[] = filtered.map((r) => ({
    id: r.id,
    dni: r.dni,
    nombre: r.nombre,
    legajo: r.legajo,
    afiliado_apops: r.afiliado_apops,
    cotiza_papel: r.cotiza_papel,
    afiliado_ate: r.afiliado_ate,
    afiliado_sec: r.afiliado_sec,
    afiliado_upcn: r.afiliado_upcn,
    afiliado_secasfpi: r.afiliado_secasfpi,
    lugar_trabajo: r.lugar_trabajo_padron ?? r.lugar_trabajo_rrhh ?? null,
    provincia: r.provincia,
    regional: r.regional,
    tipo_planta: r.tipo_planta,
    categoria: r.categoria,
    vence_mandato_30dias: r.vence_mandato_30dias,
  }))

  const stats = {
    total: cotizantes.length,
    afiliadosApops: cotizantes.filter((c) => c.afiliado_apops).length,
    noAfiliadosApops: cotizantes.filter((c) => !c.afiliado_apops).length,
    cotizaPapel: cotizantes.filter((c) => c.cotiza_papel).length,
    otrosGremios: cotizantes.filter(
      (c) =>
        !c.afiliado_apops &&
        (c.afiliado_ate ||
          c.afiliado_sec ||
          c.afiliado_upcn ||
          c.afiliado_secasfpi),
    ).length,
    sinGremio: cotizantes.filter(
      (c) =>
        !c.afiliado_apops &&
        !c.afiliado_ate &&
        !c.afiliado_sec &&
        !c.afiliado_upcn &&
        !c.afiliado_secasfpi &&
        !c.cotiza_papel,
    ).length,
  }

  return {
    cotizantes,
    edificios: Array.from(misEdificios).sort((a, b) => a.localeCompare(b, 'es')),
    stats,
  }
}
