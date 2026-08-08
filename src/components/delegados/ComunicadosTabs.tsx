'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Comunicado, TemaComunicado } from '@/lib/delegados/panel-queries'
import { LABEL_TEMA } from '@/lib/delegados/panel-queries'

// Comunicados del delegado agrupados por tema. Los marcados como
// exclusivos (audiencia='delegados') llevan distintivo: es información que
// el afiliado común no ve, y el delegado tiene que saberlo antes de
// reenviarla.

type Filtro = 'todos' | TemaComunicado

const FILTROS: Filtro[] = ['todos', 'paritaria', 'material', 'campana']

const LABEL_FILTRO: Record<Filtro, string> = {
  todos: 'Todos',
  ...LABEL_TEMA,
}

function esReciente(iso: string): boolean {
  const dias = (Date.now() - new Date(iso).getTime()) / 86_400_000
  return dias <= 7
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function ComunicadosTabs({
  comunicados,
}: {
  comunicados: Comunicado[]
}) {
  const [filtro, setFiltro] = useState<Filtro>('todos')

  const conteos = useMemo(() => {
    const c: Record<Filtro, number> = {
      todos: comunicados.length,
      general: 0,
      paritaria: 0,
      material: 0,
      campana: 0,
    }
    for (const x of comunicados) c[x.tema]++
    return c
  }, [comunicados])

  const visibles = useMemo(
    () =>
      filtro === 'todos'
        ? comunicados
        : comunicados.filter((c) => c.tema === filtro),
    [comunicados, filtro],
  )

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Temas" className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filtro === f}
            onClick={() => setFiltro(f)}
            className={
              'rounded-full px-3 py-1.5 text-sm font-semibold transition ' +
              (filtro === f
                ? 'bg-brand-blue text-white'
                : 'bg-white text-brand-muted shadow-card hover:text-brand-ink')
            }
          >
            {LABEL_FILTRO[f]}
            {conteos[f] > 0 && ` (${conteos[f]})`}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-brand-muted">
          No hay comunicados en esta sección.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibles.map((c) => (
            <li key={c.id}>
              <Link
                href={`/noticias/${c.id}`}
                className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-card transition hover:shadow-cardHover"
              >
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-xl"
                >
                  {c.tema === 'paritaria'
                    ? '📄'
                    : c.tema === 'material'
                      ? '📎'
                      : c.tema === 'campana'
                        ? '📣'
                        : '📰'}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-brand-ink">
                      {c.titulo}
                    </h3>
                    {esReciente(c.publicada_at) && (
                      <span className="rounded-full bg-brand-lime/20 px-2 py-0.5 text-[10px] font-bold text-brand-deep">
                        Nuevo
                      </span>
                    )}
                    {c.audiencia === 'delegados' && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                        Solo delegados
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-brand-muted">
                    {c.resumen}
                  </p>
                  <p className="mt-1 text-[11px] text-brand-muted">
                    {formatFecha(c.publicada_at)}
                  </p>
                </div>

                <span aria-hidden className="shrink-0 text-brand-blue">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
