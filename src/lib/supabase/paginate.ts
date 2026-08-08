// Paginación para PostgREST.
//
// Supabase Cloud corta las respuestas en 1000 filas y NO avisa: la query
// vuelve "bien", con menos datos. Inflar el .range() no sirve, hay que
// pedir en chunks. Con snapshots de 15k+ filas, olvidarse de esto hace
// que los totales salgan mal por lo bajo, en silencio.
//
// Vivía privado en admin/dashboard-queries.ts; se extrajo acá cuando el
// panel del delegado necesitó lo mismo.

const CHUNK = 1000

export type ChunkQuery<Row> = (
  from: number,
  to: number,
) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>

export async function fetchAllRows<Row>(
  query: ChunkQuery<Row>,
): Promise<Row[]> {
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
