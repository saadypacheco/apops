// Bar chart server-rendered (SVG inline, sin librería).
// Soporta múltiples series (barras agrupadas lado a lado por período).

export type BarPoint = {
  /** Label del eje X */
  x: string
  /** Valores por series.key */
  values: Record<string, number>
}

export type BarSeries = {
  key: string
  label: string
  color: string
}

type Props = {
  data: BarPoint[]
  series: BarSeries[]
  height?: number
  yLabel?: string
}

const VB_W = 600

export function BarChart({ data, series, height = 240, yLabel }: Props) {
  if (data.length === 0 || series.length === 0) {
    return <div className="text-sm text-brand-muted">Sin datos.</div>
  }

  const padTop = 18
  const padBottom = 36
  const padLeft = 48
  const padRight = 16
  const plotW = VB_W - padLeft - padRight
  const plotH = height - padTop - padBottom

  // Max para escalar Y
  const allValues = data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0))
  const yMax = Math.max(1, ...allValues) * 1.1

  // X: ancho de grupo y de cada barra dentro
  const groupGap = 12
  const groupW = (plotW - groupGap * (data.length + 1)) / data.length
  const barW = (groupW - 4) / series.length

  const py = (v: number) => padTop + plotH - (v / yMax) * plotH

  // Gridlines Y
  const ticks = 4
  const yTicks: { value: number; y: number }[] = []
  for (let i = 0; i <= ticks; i++) {
    const value = (i / ticks) * yMax
    yTicks.push({ value, y: py(value) })
  }

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${VB_W} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full"
        aria-label={yLabel ?? 'Gráfico de barras'}
      >
        {/* Gridlines + Y labels */}
        <g>
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                x2={VB_W - padRight}
                y1={t.y}
                y2={t.y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={padLeft - 6}
                y={t.y}
                fontSize="10"
                fill="#64748b"
                textAnchor="end"
                dominantBaseline="central"
              >
                {Math.round(t.value).toLocaleString('es-AR')}
              </text>
            </g>
          ))}
        </g>

        {/* Bars + X labels */}
        {data.map((d, idx) => {
          const groupX = padLeft + groupGap + idx * (groupW + groupGap)
          return (
            <g key={idx}>
              {series.map((s, si) => {
                const value = d.values[s.key] ?? 0
                const barX = groupX + si * barW + 2
                const yTop = py(value)
                const barH = padTop + plotH - yTop
                return (
                  <g key={s.key}>
                    <rect
                      x={barX}
                      y={yTop}
                      width={barW}
                      height={Math.max(0, barH)}
                      fill={s.color}
                      rx={2}
                    >
                      <title>{`${s.label} · ${d.x}: ${value.toLocaleString('es-AR')}`}</title>
                    </rect>
                    {value > 0 && barH > 14 && (
                      <text
                        x={barX + barW / 2}
                        y={yTop + 11}
                        fontSize="9"
                        fontWeight="700"
                        fill="white"
                        textAnchor="middle"
                      >
                        {value}
                      </text>
                    )}
                  </g>
                )
              })}
              <text
                x={groupX + groupW / 2}
                y={height - padBottom + 16}
                fontSize="10"
                fill="#64748b"
                textAnchor="middle"
              >
                {d.x}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Leyenda */}
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-brand-ink">{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
