// Donut chart server-rendered (SVG inline, sin librería).
// Soporta varios slices con colores propios + leyenda al costado.

type Slice = {
  label: string
  value: number
  /** Color CSS para el slice. Si no se especifica, ciclamos la paleta default. */
  color?: string
}

const DEFAULT_PALETTE = [
  '#1d4ed8', // brand-blue
  '#10b981', // emerald
  '#a78bfa', // violet-400
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#64748b', // slate-500
]

type Props = {
  slices: Slice[]
  /** Texto chico que aparece dentro del agujero. Útil para "Total / 4.631". */
  centerLabel?: string
  centerValue?: string | number
  /** Tamaño del SVG (px). Default 180. */
  size?: number
  /** Etiqueta visible en la leyenda. */
  title?: string
}

export function DonutChart({
  slices,
  centerLabel,
  centerValue,
  size = 180,
  title,
}: Props) {
  const total = slices.reduce((acc, s) => acc + s.value, 0)
  const cx = size / 2
  const cy = size / 2
  const rOuter = size / 2 - 4
  const rInner = rOuter * 0.6

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-2 text-sm text-brand-muted">
        Sin datos.
      </div>
    )
  }

  // Construye los path d="..." de cada slice como un anillo.
  // Para evitar el bug del slice == 100% (que genera un arco con same start
  // = end), si hay un solo slice con todo el valor, usamos dos paths de medio
  // círculo.
  let cum = 0
  const paths = slices.map((s, idx) => {
    const ratio = s.value / total
    if (ratio === 0) return null
    const color = s.color ?? DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length]
    const startAngle = cum * 2 * Math.PI - Math.PI / 2
    cum += ratio
    const endAngle = cum * 2 * Math.PI - Math.PI / 2
    const largeArc = ratio > 0.5 ? 1 : 0

    const x1Outer = cx + rOuter * Math.cos(startAngle)
    const y1Outer = cy + rOuter * Math.sin(startAngle)
    const x2Outer = cx + rOuter * Math.cos(endAngle)
    const y2Outer = cy + rOuter * Math.sin(endAngle)
    const x1Inner = cx + rInner * Math.cos(endAngle)
    const y1Inner = cy + rInner * Math.sin(endAngle)
    const x2Inner = cx + rInner * Math.cos(startAngle)
    const y2Inner = cy + rInner * Math.sin(startAngle)

    // Edge case: si el slice es el único (100%), el arco con start=end no
    // se renderiza. Usamos un círculo completo en su lugar.
    if (ratio >= 0.9999) {
      return (
        <g key={idx}>
          <circle cx={cx} cy={cy} r={rOuter} fill={color} />
          <circle cx={cx} cy={cy} r={rInner} fill="white" />
        </g>
      )
    }

    const d = [
      `M ${x1Outer.toFixed(2)} ${y1Outer.toFixed(2)}`,
      `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2Outer.toFixed(2)} ${y2Outer.toFixed(2)}`,
      `L ${x1Inner.toFixed(2)} ${y1Inner.toFixed(2)}`,
      `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x2Inner.toFixed(2)} ${y2Inner.toFixed(2)}`,
      'Z',
    ].join(' ')

    return (
      <path key={idx} d={d} fill={color}>
        <title>{`${s.label}: ${s.value.toLocaleString('es-AR')} (${((s.value / total) * 100).toFixed(1)}%)`}</title>
      </path>
    )
  })

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
          aria-label={title ?? 'Distribución'}
        >
          {paths}
        </svg>
        {(centerLabel || centerValue !== undefined) && (
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
            aria-hidden
          >
            {centerLabel && (
              <span className="text-[10px] uppercase tracking-wide text-brand-muted">
                {centerLabel}
              </span>
            )}
            {centerValue !== undefined && (
              <span className="text-xl font-bold text-brand-ink">
                {typeof centerValue === 'number'
                  ? centerValue.toLocaleString('es-AR')
                  : centerValue}
              </span>
            )}
          </div>
        )}
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-1">
        {slices.map((s, idx) => {
          const color = s.color ?? DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length]
          const ratio = total === 0 ? 0 : (s.value / total) * 100
          return (
            <li key={s.label} className="flex items-baseline justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 truncate">
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate text-brand-ink">{s.label}</span>
              </div>
              <span className="shrink-0 text-brand-muted">
                <strong className="text-brand-ink">
                  {s.value.toLocaleString('es-AR')}
                </strong>{' '}
                ({ratio.toFixed(1)}%)
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
