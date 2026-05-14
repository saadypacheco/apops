// Line chart server-rendered (SVG inline, sin librería).
// Soporta múltiples series + tooltip nativo por punto via <title>.

export type LinePoint = {
  /** Label del eje X (ej "MAYO 2016") */
  x: string
  /** Valores numéricos keyed por series.key */
  values: Record<string, number>
}

export type LineSeries = {
  /** Key del valor en LinePoint.values */
  key: string
  /** Label visible en la leyenda */
  label: string
  /** Color CSS de la línea + puntos */
  color: string
}

type Props = {
  data: LinePoint[]
  series: LineSeries[]
  /** Alto del SVG en píxeles. Default 240. */
  height?: number
  /** Si se especifica, fuerza el min del eje Y (sino se autocalcula). */
  yMin?: number
  /** Etiqueta para el eje Y (opcional). */
  yLabel?: string
}

const VB_W = 600

export function LineChart({
  data,
  series,
  height = 240,
  yMin: yMinProp,
  yLabel,
}: Props) {
  if (data.length === 0 || series.length === 0) {
    return (
      <div className="text-sm text-brand-muted">Sin datos para graficar.</div>
    )
  }

  // Padding del plot area dentro del viewBox
  const padTop = 18
  const padBottom = 36
  const padLeft = 48
  const padRight = 16
  const plotW = VB_W - padLeft - padRight
  const plotH = height - padTop - padBottom

  // Y range
  const allValues = data.flatMap((d) =>
    series.map((s) => d.values[s.key] ?? 0),
  )
  const rawMin = Math.min(...allValues)
  const rawMax = Math.max(...allValues)
  const yMin = yMinProp ?? Math.max(0, rawMin - (rawMax - rawMin) * 0.1)
  const yMax = rawMax + (rawMax - rawMin) * 0.1 || rawMax + 1

  // Projections
  const px = (idx: number) =>
    data.length <= 1
      ? padLeft + plotW / 2
      : padLeft + (idx / (data.length - 1)) * plotW
  const py = (value: number) => {
    if (yMax === yMin) return padTop + plotH / 2
    return padTop + plotH - ((value - yMin) / (yMax - yMin)) * plotH
  }

  // Gridlines Y — 4 niveles incluyendo top y bottom
  const ticks = 4
  const yTicks: { value: number; y: number }[] = []
  for (let i = 0; i <= ticks; i++) {
    const value = yMin + (i / ticks) * (yMax - yMin)
    yTicks.push({ value, y: py(value) })
  }

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${VB_W} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full"
        aria-label={yLabel ?? 'Gráfico de evolución'}
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

        {/* X labels */}
        <g>
          {data.map((d, idx) => (
            <text
              key={idx}
              x={px(idx)}
              y={height - padBottom + 16}
              fontSize="10"
              fill="#64748b"
              textAnchor="middle"
            >
              {d.x}
            </text>
          ))}
        </g>

        {/* Una línea por serie */}
        {series.map((s) => {
          const path = data
            .map((d, idx) => {
              const x = px(idx)
              const y = py(d.values[s.key] ?? 0)
              return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
            })
            .join(' ')
          return (
            <g key={s.key}>
              <path
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {data.map((d, idx) => {
                const value = d.values[s.key] ?? 0
                return (
                  <circle
                    key={idx}
                    cx={px(idx)}
                    cy={py(value)}
                    r={4}
                    fill="white"
                    stroke={s.color}
                    strokeWidth="2"
                  >
                    <title>{`${s.label} · ${d.x}: ${value.toLocaleString('es-AR')}`}</title>
                  </circle>
                )
              })}
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
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-brand-ink">{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
