import { createAdminClient } from '@/lib/supabase/admin'

// Catálogo de beneficios del gremio (migration 0040). Es el "hub de
// servicios" del afiliado: subsidios, salud, recreación, capacitaciones.

export type Beneficio = {
  id: string
  titulo: string
  resumen: string
  detalle: string | null
  categoria: CategoriaBeneficio
  icono: string | null
  imagen_url: string | null
  link_externo: string | null
  destaque: string | null
  orden: number
  publicado: boolean
  proximamente: boolean
}

export type CategoriaBeneficio =
  | 'subsidio'
  | 'salud'
  | 'recreacion'
  | 'educacion'
  | 'legal'
  | 'capacitacion'
  | 'otro'

// Orden de aparición de las secciones en /beneficios. Salud va primero
// porque encabeza la cobertura en farmacias, que es el beneficio de uso
// más cotidiano; capacitaciones al final porque está en "próximamente".
export const ORDEN_CATEGORIAS: CategoriaBeneficio[] = [
  'salud',
  'subsidio',
  'recreacion',
  'educacion',
  'legal',
  'capacitacion',
  'otro',
]

export const LABEL_CATEGORIA: Record<CategoriaBeneficio, string> = {
  subsidio: 'Subsidios',
  salud: 'Salud',
  recreacion: 'Recreación y turismo',
  educacion: 'Educación',
  legal: 'Asesoramiento',
  capacitacion: 'Capacitaciones',
  otro: 'Otros beneficios',
}

const COLUMNAS =
  'id, titulo, resumen, detalle, categoria, icono, imagen_url, link_externo, destaque, orden, publicado, proximamente'

/** Beneficios publicados, ordenados para mostrar al afiliado. */
export async function getBeneficiosPublicados(): Promise<Beneficio[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('beneficios')
    .select(COLUMNAS)
    .eq('publicado', true)
    .order('orden', { ascending: true })
    .order('titulo', { ascending: true })

  return (data ?? []) as Beneficio[]
}

/** Agrupa por categoría respetando ORDEN_CATEGORIAS. Saltea las vacías. */
export function agruparPorCategoria(
  beneficios: Beneficio[],
): Array<{ categoria: CategoriaBeneficio; label: string; items: Beneficio[] }> {
  return ORDEN_CATEGORIAS.map((categoria) => ({
    categoria,
    label: LABEL_CATEGORIA[categoria],
    items: beneficios.filter((b) => b.categoria === categoria),
  })).filter((g) => g.items.length > 0)
}

/**
 * Beneficio para destacar en el home. Prioriza los disponibles sobre los
 * "próximamente" — no tiene sentido tentar al afiliado con algo que
 * todavía no puede usar.
 */
export async function getBeneficioDestacado(): Promise<Beneficio | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('beneficios')
    .select(COLUMNAS)
    .eq('publicado', true)
    .eq('proximamente', false)
    .order('orden', { ascending: true })
    .limit(1)

  return ((data ?? [])[0] as Beneficio | undefined) ?? null
}

/** Todos los beneficios, incluidos los despublicados. Solo para admin. */
export async function getTodosLosBeneficios(): Promise<Beneficio[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('beneficios')
    .select(COLUMNAS)
    .order('orden', { ascending: true })
    .order('titulo', { ascending: true })

  return (data ?? []) as Beneficio[]
}

export async function getBeneficioPorId(
  id: string,
): Promise<Beneficio | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('beneficios')
    .select(COLUMNAS)
    .eq('id', id)
    .maybeSingle()

  return (data as Beneficio | null) ?? null
}
