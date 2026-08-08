import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAllRows } from '@/lib/supabase/paginate'
import type { AfiliadoSession } from '@/lib/auth/role'

// Link al grupo de WhatsApp del edificio. Un edificio = un grupo,
// compartido por todos sus delegados (ver migration 0038).
//
// El nombre del edificio es texto libre del padrón, así que todo el
// matching se hace normalizado — misma regla que delegados/queries.ts.

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

/** Edificio donde trabaja el afiliado, según el padrón. */
export async function getEdificioDelAfiliado(
  session: AfiliadoSession,
): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('padron_cotizantes_actual')
    .select('lugar_trabajo_padron, lugar_trabajo_rrhh')
    .or(
      `dni.eq.${session.dni}${session.legajo ? `,legajo.eq.${session.legajo}` : ''}`,
    )
    .maybeSingle()

  const row = data as {
    lugar_trabajo_padron: string | null
    lugar_trabajo_rrhh: string | null
  } | null
  return row?.lugar_trabajo_padron ?? row?.lugar_trabajo_rrhh ?? null
}

/** Edificios donde este delegado figura como representante. */
export async function getEdificiosDelDelegado(
  nombreDelegado: string,
): Promise<string[]> {
  type Row = {
    representante: string | null
    lugar_trabajo_padron: string | null
    lugar_trabajo_rrhh: string | null
  }

  // Paginado: hoy hay ~800 filas con representante, pero está a un padrón
  // de cruzar las 1000 que PostgREST corta en silencio.
  const admin = createAdminClient()
  const data = await fetchAllRows<Row>(async (from, to) => {
    const res = await admin
      .from('padron_cotizantes_actual')
      .select('representante, lugar_trabajo_padron, lugar_trabajo_rrhh')
      .not('representante', 'is', null)
      .range(from, to)
    return { data: res.data as Row[] | null, error: res.error }
  })

  const target = normalize(nombreDelegado)
  const edificios = new Set<string>()
  for (const r of data) {
    if (!r.representante || normalize(r.representante) !== target) continue
    const edif = r.lugar_trabajo_padron ?? r.lugar_trabajo_rrhh
    if (edif) edificios.add(edif)
  }
  return Array.from(edificios).sort((a, b) => a.localeCompare(b, 'es'))
}

/** Links ya cargados para una lista de edificios, indexados por nombre. */
export async function getLinksDeEdificios(
  edificios: string[],
): Promise<Map<string, string>> {
  if (edificios.length === 0) return new Map()

  const admin = createAdminClient()
  const { data } = (await admin
    .from('edificios_whatsapp')
    .select('edificio, link')) as {
    data: Array<{ edificio: string; link: string }> | null
  }

  const wanted = new Map(edificios.map((e) => [normalize(e), e]))
  const out = new Map<string, string>()
  for (const row of data ?? []) {
    const original = wanted.get(normalize(row.edificio))
    if (original) out.set(original, row.link)
  }
  return out
}

/**
 * Link del grupo que le corresponde al afiliado, resuelto por su edificio.
 * null si no está en el padrón o si nadie cargó el link todavía.
 */
export async function getWhatsappGrupoDelAfiliado(
  session: AfiliadoSession,
): Promise<string | null> {
  const edificio = await getEdificioDelAfiliado(session)
  if (!edificio) return null
  const links = await getLinksDeEdificios([edificio])
  return links.get(edificio) ?? null
}
