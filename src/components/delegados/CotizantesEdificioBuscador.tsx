'use client'

import { useMemo, useState } from 'react'
import type { CotizanteResumido } from '@/lib/delegados/queries'

// Vista buscable del listado completo del edificio del delegado.
// Recibe la lista pre-cargada del servidor (no consulta DB acá) y
// permite filtrar por texto (nombre / DNI / legajo) y por gremio.
// Pensado para que el delegado vea el panorama completo del edificio:
// quién es APOPS, quién está en otros gremios, quién no está afiliado.

type GremioFilter =
  | 'todos'
  | 'apops'
  | 'otros_gremios'
  | 'cotiza_papel'
  | 'sin_gremio'

const FILTER_LABELS: Record<GremioFilter, string> = {
  todos: 'Todos',
  apops: 'APOPS',
  otros_gremios: 'Otros gremios',
  cotiza_papel: 'Cotiza papel',
  sin_gremio: 'Sin gremio',
}

function gremioBadge(c: CotizanteResumido): { label: string; className: string } {
  if (c.afiliado_apops) {
    return { label: 'APOPS', className: 'bg-emerald-100 text-emerald-800' }
  }
  if (c.cotiza_papel) {
    return { label: 'Cotiza papel', className: 'bg-cyan-100 text-cyan-800' }
  }
  if (c.afiliado_ate) {
    return { label: 'ATE', className: 'bg-red-100 text-red-800' }
  }
  if (c.afiliado_upcn) {
    return { label: 'UPCN', className: 'bg-orange-100 text-orange-800' }
  }
  if (c.afiliado_sec) {
    return { label: 'SEC', className: 'bg-purple-100 text-purple-800' }
  }
  if (c.afiliado_secasfpi) {
    return { label: 'SECASFPI', className: 'bg-purple-100 text-purple-800' }
  }
  return {
    label: 'Sin gremio',
    className: 'bg-neutral-200 text-brand-muted',
  }
}

function matchesFilter(c: CotizanteResumido, f: GremioFilter): boolean {
  if (f === 'todos') return true
  if (f === 'apops') return c.afiliado_apops
  if (f === 'cotiza_papel') return c.cotiza_papel && !c.afiliado_apops
  if (f === 'otros_gremios') {
    return (
      !c.afiliado_apops &&
      (c.afiliado_ate ||
        c.afiliado_sec ||
        c.afiliado_upcn ||
        c.afiliado_secasfpi)
    )
  }
  if (f === 'sin_gremio') {
    return (
      !c.afiliado_apops &&
      !c.afiliado_ate &&
      !c.afiliado_sec &&
      !c.afiliado_upcn &&
      !c.afiliado_secasfpi &&
      !c.cotiza_papel
    )
  }
  return true
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function CotizantesEdificioBuscador({
  cotizantes,
  edificios,
}: {
  cotizantes: CotizanteResumido[]
  edificios: string[]
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<GremioFilter>('todos')
  const [edificio, setEdificio] = useState<string>('todos')

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    return cotizantes.filter((c) => {
      if (!matchesFilter(c, filter)) return false
      if (edificio !== 'todos' && c.lugar_trabajo !== edificio) return false
      if (!q) return true
      return (
        normalize(c.nombre).includes(q) ||
        c.dni.includes(q) ||
        (c.legajo ?? '').toLowerCase().includes(q)
      )
    })
  }, [cotizantes, query, filter, edificio])

  return (
    <section className="flex flex-col gap-3">
      {/* Buscador */}
      <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-card ring-1 ring-neutral-200 focus-within:ring-brand-blue">
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, DNI o legajo…"
          aria-label="Buscar cotizante"
          className="w-full bg-transparent text-sm text-brand-ink placeholder:text-brand-muted/60 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Limpiar búsqueda"
            className="text-brand-muted hover:text-brand-ink"
          >
            ×
          </button>
        )}
      </div>

      {/* Filtros por gremio (chips) */}
      <div
        role="radiogroup"
        aria-label="Filtrar por gremio"
        className="-mx-1 flex flex-wrap gap-1 px-1"
      >
        {(Object.keys(FILTER_LABELS) as GremioFilter[]).map((k) => {
          const active = filter === k
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setFilter(k)}
              className={
                'rounded-full px-3 py-1 text-xs font-semibold transition ' +
                (active
                  ? 'bg-brand-blue text-white shadow-card'
                  : 'bg-white text-brand-ink ring-1 ring-neutral-200 hover:ring-brand-blue/40')
              }
            >
              {FILTER_LABELS[k]}
            </button>
          )
        })}
      </div>

      {/* Selector de edificio (sólo si hay más de uno) */}
      {edificios.length > 1 && (
        <select
          value={edificio}
          onChange={(e) => setEdificio(e.target.value)}
          aria-label="Filtrar por edificio"
          className="rounded-xl bg-white px-3 py-2 text-sm text-brand-ink shadow-card ring-1 ring-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
        >
          <option value="todos">Todos mis edificios</option>
          {edificios.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      )}

      {/* Resultado count */}
      <p className="text-xs text-brand-muted">
        {filtered.length === cotizantes.length
          ? `${filtered.length} personas en tu edificio.`
          : `Mostrando ${filtered.length} de ${cotizantes.length} personas.`}
      </p>

      {/* Listado */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-brand-muted">
          No hay coincidencias con esos filtros.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((c) => {
            const badge = gremioBadge(c)
            return (
              <li
                key={c.id}
                className="flex flex-col gap-1 rounded-xl bg-white p-3 shadow-card"
              >
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-brand-ink">
                      {c.nombre}
                    </h3>
                    <p className="text-xs text-brand-muted">
                      DNI {c.dni}
                      {c.legajo ? ` · L-${c.legajo.replace(/^L-?/, '')}` : ''}
                    </p>
                  </div>
                  <span
                    className={
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ' +
                      badge.className
                    }
                  >
                    {badge.label}
                  </span>
                </header>
                {(c.lugar_trabajo || c.tipo_planta) && (
                  <p className="text-[11px] text-brand-muted">
                    {[c.lugar_trabajo, c.tipo_planta]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
      className="h-5 w-5 shrink-0 text-brand-muted"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  )
}
