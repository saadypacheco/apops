import { createAdminClient } from '@/lib/supabase/admin'

// Dado el edificio que declara el aspirante en /afiliarse, encuentra
// los emails de los delegados que lo representan. Se usa para
// mandarles copia del PDF cuando llega una nueva solicitud.
//
// Estrategia (igual que actions-padron::notifyDelegatesAboutMovements):
//   1. En el padrón actual, buscar filas con lugar_trabajo_padron = X.
//   2. De esas filas, juntar todos los valores de `representante` (texto
//      libre con el nombre del delegado, viene del Excel).
//   3. Buscar en `afiliados` los que tengan rol='delegado' Y cuyo nombre
//      normalizado matchee con alguno de esos `representante`.
//   4. Devolver sus emails.
//
// Limitación conocida del MVP: el matching por nombre normalizado es
// frágil (mismos issues que delegados/queries.ts). Si no encuentra
// match, devuelve [] sin error. El aspirante igual se da de alta;
// solo no se notifica al delegado.

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

export async function lookupDelegadoEmailsByEdificio(
  edificio: string,
): Promise<string[]> {
  if (!edificio || !edificio.trim()) return []

  const admin = createAdminClient()

  // 1+2: representantes del padrón cuyo lugar_trabajo_padron matchea
  type PadronRow = {
    representante: string | null
    lugar_trabajo_padron: string | null
    lugar_trabajo_rrhh: string | null
  }
  const { data: padronRows } = (await admin
    .from('padron_cotizantes_actual')
    .select('representante, lugar_trabajo_padron, lugar_trabajo_rrhh')
    .not('representante', 'is', null)) as { data: PadronRow[] | null }

  const target = normalize(edificio)
  const nombresDelegados = new Set<string>()
  for (const r of padronRows ?? []) {
    const e = (r.lugar_trabajo_padron ?? r.lugar_trabajo_rrhh ?? '').trim()
    if (!e || normalize(e) !== target) continue
    if (r.representante) nombresDelegados.add(normalize(r.representante))
  }

  if (nombresDelegados.size === 0) return []

  // 3+4: afiliados con rol delegado cuyo nombre normalizado matchea
  type AfilRow = { nombre: string; email: string | null }
  const { data: delegados } = (await admin
    .from('afiliados')
    .select('nombre, email')
    .eq('rol', 'delegado')) as { data: AfilRow[] | null }

  const emails = new Set<string>()
  for (const d of delegados ?? []) {
    if (!d.email) continue
    if (nombresDelegados.has(normalize(d.nombre))) emails.add(d.email)
  }

  return Array.from(emails)
}
