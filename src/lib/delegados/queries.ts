import { createAdminClient } from '@/lib/supabase/admin'

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
  const { data: rows } = (await admin
    .from('padron_cotizantes')
    .select(
      'id, dni, nombre, legajo, afiliado_apops, cotiza_papel, afiliado_ate, afiliado_sec, afiliado_upcn, afiliado_secasfpi, representante, lugar_trabajo_padron, lugar_trabajo_rrhh, provincia, regional, tipo_planta, categoria, vence_mandato_30dias',
    )
    .not('representante', 'is', null)) as { data: Row[] | null }

  const matched = (rows ?? []).filter(
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
