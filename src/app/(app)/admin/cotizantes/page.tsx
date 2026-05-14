import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/role'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/app/AppShell'

export const metadata: Metadata = {
  title: 'Cotizantes — admin',
}

const PAGE_SIZE = 50

type SearchParams = {
  q?: string
  gremio?: string
  planta?: string
  pagina?: string
}

type CotizanteRow = {
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
  tipo_planta: string | null
}

// Sanitiza la query para PostgREST .or() — quita caracteres que rompen
// la sintaxis. Mantiene letras, dígitos, espacios, tildes, guiones.
function sanitizeSearch(s: string): string {
  return s.trim().replace(/[%_,()\\;]/g, '').slice(0, 50)
}

export default async function CotizantesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await requireRole('admin')
  const admin = createAdminClient()

  const q = (searchParams.q ?? '').trim()
  const qSafe = sanitizeSearch(q)
  const gremio = searchParams.gremio ?? ''
  const planta = searchParams.planta ?? ''
  const pagina = Math.max(1, parseInt(searchParams.pagina ?? '1', 10) || 1)
  const offset = (pagina - 1) * PAGE_SIZE

  // Query con filtros
  let query = admin
    .from('padron_cotizantes_actual')
    .select(
      'legajo, dni, nombre, lugar_trabajo_padron, lugar_trabajo_rrhh, provincia, afiliado_apops, afiliado_ate, afiliado_upcn, afiliado_secasfpi, cotiza_papel, categoria, tipo_planta',
      { count: 'exact' },
    )

  if (qSafe.length > 0) {
    // Búsqueda por nombre (ilike), legajo (ilike sobre uppercase), o DNI exacto si es numérico
    const isDni = /^\d{7,8}$/.test(qSafe)
    const orParts = [
      `nombre.ilike.%${qSafe}%`,
      `legajo.ilike.%${qSafe.toUpperCase()}%`,
    ]
    if (isDni) orParts.push(`dni.eq.${qSafe}`)
    query = query.or(orParts.join(','))
  }

  if (gremio === 'apops') query = query.eq('afiliado_apops', true)
  else if (gremio === 'ate') query = query.eq('afiliado_ate', true)
  else if (gremio === 'upcn') query = query.eq('afiliado_upcn', true)
  else if (gremio === 'secasfpi') query = query.eq('afiliado_secasfpi', true)
  else if (gremio === 'papel') query = query.eq('cotiza_papel', true)

  if (planta === 'pp') query = query.eq('tipo_planta', 'PP')
  else if (planta === 'pt') query = query.eq('tipo_planta', 'PT')

  const { data, count, error } = (await query
    .order('nombre')
    .range(offset, offset + PAGE_SIZE - 1)) as {
    data: CotizanteRow[] | null
    count: number | null
    error: { message: string } | null
  }

  const rows = data ?? []
  const total = count ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="admin">
      <div className="flex flex-col gap-5">
        <header>
          <Link
            href="/admin"
            className="text-sm font-medium text-brand-blue hover:underline"
          >
            ← Volver al panel
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-brand-ink">
            Cotizantes
          </h1>
          <p className="text-sm text-brand-muted">
            Buscá por nombre, legajo o DNI dentro del padrón vigente.
          </p>
        </header>

        {/* Formulario de búsqueda — GET nativo, no requiere JS */}
        <form
          method="GET"
          className="rounded-2xl bg-white p-4 shadow-card"
          aria-label="Filtros de búsqueda"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Nombre, legajo (L-1234) o DNI (8 dígitos)"
              maxLength={50}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
            />
            <select
              name="gremio"
              defaultValue={gremio}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Todos los gremios</option>
              <option value="apops">APOPS</option>
              <option value="ate">ATE</option>
              <option value="upcn">UPCN</option>
              <option value="secasfpi">SECASFPI</option>
              <option value="papel">Cotiza solo papel</option>
            </select>
            <select
              name="planta"
              defaultValue={planta}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Toda planta</option>
              <option value="pp">Planta Permanente</option>
              <option value="pt">Planta Transitoria</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90"
            >
              Buscar
            </button>
          </div>
          {(q || gremio || planta) && (
            <div className="mt-2 text-xs text-brand-muted">
              Filtros activos.{' '}
              <Link
                href="/admin/cotizantes"
                className="text-brand-blue hover:underline"
              >
                Limpiar
              </Link>
            </div>
          )}
        </form>

        {/* Resultados */}
        <section className="flex flex-col gap-3">
          <header className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-brand-ink">
              {total === 0
                ? 'Sin resultados'
                : `${total.toLocaleString('es-AR')} cotizantes`}
              {total > 0 && totalPaginas > 1 && (
                <span className="ml-2 text-xs font-normal text-brand-muted">
                  · página {pagina} de {totalPaginas}
                </span>
              )}
            </h2>
          </header>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              Error en la búsqueda: {error.message}
            </div>
          )}

          {rows.length === 0 && !error && (q || gremio || planta) && (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-brand-muted">
              No se encontró ningún cotizante con esos filtros.
            </div>
          )}

          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
              <table className="w-full text-xs">
                <thead className="border-b border-neutral-200 text-left text-brand-muted">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Nombre</th>
                    <th className="px-3 py-2 font-semibold">Legajo</th>
                    <th className="px-3 py-2 font-semibold">DNI</th>
                    <th className="px-3 py-2 font-semibold">Edificio</th>
                    <th className="px-3 py-2 font-semibold">Provincia</th>
                    <th className="px-3 py-2 font-semibold">Gremios</th>
                    <th className="px-3 py-2 text-right font-semibold">Cat</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={`${r.legajo ?? r.dni ?? r.nombre}`}
                      className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50"
                    >
                      <td className="px-3 py-2 text-brand-ink">{r.nombre}</td>
                      <td className="px-3 py-2 font-mono text-brand-muted">
                        {r.legajo ?? '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-brand-muted">
                        {r.dni ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-brand-muted">
                        {r.lugar_trabajo_padron ?? r.lugar_trabajo_rrhh ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-brand-muted">
                        {r.provincia ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        <GremioTags row={r} />
                      </td>
                      <td className="px-3 py-2 text-right text-brand-muted">
                        {r.categoria ?? '—'}
                        {r.tipo_planta && (
                          <span className="ml-1 text-[10px] uppercase">
                            {r.tipo_planta}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {totalPaginas > 1 && (
            <Paginacion
              pagina={pagina}
              total={totalPaginas}
              q={q}
              gremio={gremio}
              planta={planta}
            />
          )}
        </section>
      </div>
    </AppShell>
  )
}

function GremioTags({ row }: { row: CotizanteRow }) {
  const tags: { label: string; cls: string }[] = []
  if (row.afiliado_apops)
    tags.push({
      label: 'APOPS',
      cls: 'bg-brand-blue/10 text-brand-blue font-semibold',
    })
  if (row.afiliado_ate) tags.push({ label: 'ATE', cls: 'bg-red-100 text-red-800' })
  if (row.afiliado_upcn)
    tags.push({ label: 'UPCN', cls: 'bg-orange-100 text-orange-800' })
  if (row.afiliado_secasfpi)
    tags.push({ label: 'SECASFPI', cls: 'bg-purple-100 text-purple-800' })
  if (row.cotiza_papel)
    tags.push({ label: 'Papel', cls: 'bg-amber-100 text-amber-900' })
  if (tags.length === 0)
    tags.push({ label: '—', cls: 'bg-neutral-100 text-brand-muted' })
  return (
    <span className="flex flex-wrap gap-1">
      {tags.map((t, i) => (
        <span
          key={i}
          className={`rounded-full px-2 py-0.5 text-[10px] ${t.cls}`}
        >
          {t.label}
        </span>
      ))}
    </span>
  )
}

function Paginacion({
  pagina,
  total,
  q,
  gremio,
  planta,
}: {
  pagina: number
  total: number
  q: string
  gremio: string
  planta: string
}) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (gremio) params.set('gremio', gremio)
  if (planta) params.set('planta', planta)
  const baseQs = params.toString()
  function href(p: number) {
    const sep = baseQs ? '&' : ''
    return `/admin/cotizantes?${baseQs}${sep}pagina=${p}` as `/admin/cotizantes?${string}`
  }

  return (
    <nav
      aria-label="Paginación"
      className="flex items-center justify-center gap-2 text-sm"
    >
      {pagina > 1 && (
        <Link
          href={href(pagina - 1)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-brand-ink hover:bg-neutral-50"
        >
          ← Anterior
        </Link>
      )}
      <span className="text-brand-muted">
        Página <strong className="text-brand-ink">{pagina}</strong> de {total}
      </span>
      {pagina < total && (
        <Link
          href={href(pagina + 1)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-brand-ink hover:bg-neutral-50"
        >
          Siguiente →
        </Link>
      )}
    </nav>
  )
}
