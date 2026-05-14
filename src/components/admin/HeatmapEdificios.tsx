// Heatmap edificios × métricas. Tabla compacta donde cada celda toma un
// color verde/amarillo/rojo según rangos por columna.
// Server component, sin librería.

import type { HeatmapEdificioRow } from '@/lib/admin/dashboard-queries'

function pct(part: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((part / total) * 100)}%`
}

type Tone = 'green' | 'amber' | 'red' | 'neutral'

const TONE_CLASS: Record<Tone, string> = {
  green: 'bg-emerald-100 text-emerald-900',
  amber: 'bg-amber-100 text-amber-900',
  red: 'bg-red-100 text-red-900',
  neutral: 'bg-neutral-50 text-brand-ink',
}

/** Color basado en un ratio 0..1 y dos umbrales (low, mid). */
function ratioTone(ratio: number, low: number, mid: number): Tone {
  if (ratio < low) return 'red'
  if (ratio < mid) return 'amber'
  return 'green'
}

/** Verde si count >= 1, rojo si 0. */
function presenceTone(count: number): Tone {
  return count >= 1 ? 'green' : 'red'
}

/** Verde si count == 0, amber si 1, rojo si >= 2 (escala de "cosas a atender"). */
function pendingTone(count: number): Tone {
  if (count === 0) return 'green'
  if (count === 1) return 'amber'
  return 'red'
}

export function HeatmapEdificios({ rows }: { rows: HeatmapEdificioRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-brand-muted">
        Sin edificios para mostrar.
      </p>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-brand-muted">
            <th className="py-2 pr-3 font-semibold">Edificio</th>
            <th className="py-2 px-3 text-right font-semibold">Cotizantes</th>
            <th className="py-2 px-3 text-right font-semibold">APOPS</th>
            <th className="py-2 px-3 text-right font-semibold">
              <span className="hidden sm:inline">% Planta Permanente</span>
              <span className="sm:hidden">% PP</span>
            </th>
            <th className="py-2 px-3 text-right font-semibold">Delegados</th>
            <th className="py-2 px-3 text-right font-semibold">
              <span className="hidden sm:inline">Mandatos &lt; 30d</span>
              <span className="sm:hidden">Mand. 30d</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const apopsRatio = r.cotizantes ? r.apops / r.cotizantes : 0
            const ppRatio = r.cotizantes ? r.plantaPerm / r.cotizantes : 0
            return (
              <tr
                key={r.edificio}
                className="border-b border-neutral-100 last:border-b-0"
              >
                <td className="py-2 pr-3 max-w-[200px] truncate text-brand-ink" title={r.edificio}>
                  {r.edificio}
                </td>
                <td className="py-1.5 px-1">
                  <Cell tone="neutral" align="right">
                    {r.cotizantes.toLocaleString('es-AR')}
                  </Cell>
                </td>
                <td className="py-1.5 px-1">
                  <Cell tone={ratioTone(apopsRatio, 0.25, 0.5)} align="right">
                    <strong>{r.apops}</strong>
                    <span className="ml-1 text-[10px] opacity-80">
                      {pct(r.apops, r.cotizantes)}
                    </span>
                  </Cell>
                </td>
                <td className="py-1.5 px-1">
                  <Cell tone={ratioTone(ppRatio, 0.5, 0.8)} align="right">
                    <strong>{r.plantaPerm}</strong>
                    <span className="ml-1 text-[10px] opacity-80">
                      {pct(r.plantaPerm, r.cotizantes)}
                    </span>
                  </Cell>
                </td>
                <td className="py-1.5 px-1">
                  <Cell tone={presenceTone(r.delegados)} align="right">
                    {r.delegados}
                  </Cell>
                </td>
                <td className="py-1.5 px-1">
                  <Cell tone={pendingTone(r.mandatosVencen)} align="right">
                    {r.mandatosVencen}
                  </Cell>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <Legend />
    </div>
  )
}

function Cell({
  children,
  tone,
  align = 'left',
}: {
  children: React.ReactNode
  tone: Tone
  align?: 'left' | 'right'
}) {
  return (
    <div
      className={`rounded px-2 py-1 font-medium ${TONE_CLASS[tone]} ${align === 'right' ? 'text-right' : ''}`}
    >
      {children}
    </div>
  )
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-brand-muted">
      <span className="font-semibold uppercase tracking-wide">Leyenda:</span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2.5 w-2.5 rounded bg-emerald-100 ring-1 ring-emerald-300" />
        Bien
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2.5 w-2.5 rounded bg-amber-100 ring-1 ring-amber-300" />
        Atención
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2.5 w-2.5 rounded bg-red-100 ring-1 ring-red-300" />
        Acción
      </span>
    </div>
  )
}
