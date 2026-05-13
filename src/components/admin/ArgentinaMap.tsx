// Mapa SVG de Argentina con choropleth por provincia. Server component
// (sin JS de cliente). Tooltips nativos del browser vía <title> dentro de
// cada <path>. Si después quieren tooltip más rico, lo hacemos client.

import {
  ARGENTINA_PROVINCES,
  ARGENTINA_VIEWBOX,
  CABA_MARKER,
  VB_H,
  VB_W,
  provinciaToGeojsonName,
} from '@/lib/admin/argentina-svg'

type Props = {
  /**
   * Conteos por nombre de provincia tal como vienen del padrón.
   * Ej: { "Buenos Aires": 1200, "Capital Federal": 3100, "Córdoba": 400, ... }
   */
  data: Record<string, number>
  /** Etiqueta del bloque para tooltip y leyenda. Default "APOPS". */
  label?: string
}

// Color base del brand (brand-blue del tailwind) en RGB: corresponde a ~#1d4ed8
const COLOR_R = 29
const COLOR_G = 78
const COLOR_B = 216

function colorForRatio(ratio: number): string {
  // ratio 0..1 → opacidad en el azul base + base gris claro.
  // Cap mínimo 0.06 para que se vea aún provincias con muy poco data.
  const alpha = ratio === 0 ? 0 : Math.max(0.08, Math.min(1, ratio))
  if (alpha === 0) return '#f1f5f9' // neutral-100 — provincia sin data
  return `rgba(${COLOR_R}, ${COLOR_G}, ${COLOR_B}, ${alpha.toFixed(3)})`
}

export function ArgentinaMap({ data, label = 'APOPS' }: Props) {
  // 1. Re-indexar data por nombre del geojson (y CABA aparte)
  const byGeojson: Record<string, number> = {}
  let caba = 0
  for (const [provName, count] of Object.entries(data)) {
    const geoName = provinciaToGeojsonName(provName)
    if (geoName === '__CABA__') {
      caba += count
    } else {
      byGeojson[geoName] = (byGeojson[geoName] ?? 0) + count
    }
  }

  // 2. Escala: max para normalizar.
  const allCounts = [...Object.values(byGeojson), caba]
  const max = Math.max(0, ...allCounts)

  // 3. Renderizar
  return (
    <div className="flex flex-col gap-2">
      <div className="relative w-full max-w-md mx-auto">
        <svg
          viewBox={ARGENTINA_VIEWBOX}
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          aria-label="Mapa de Argentina por provincia"
        >
          {/* Provincias */}
          <g stroke="#fff" strokeWidth="0.8">
            {ARGENTINA_PROVINCES.map((p) => {
              const count = byGeojson[p.geojsonName] ?? 0
              const fill = colorForRatio(max === 0 ? 0 : count / max)
              return (
                <path key={p.geojsonName} d={p.d} fill={fill}>
                  <title>{`${p.geojsonName}: ${count.toLocaleString('es-AR')} ${label}`}</title>
                </path>
              )
            })}
          </g>

          {/* CABA — círculo, no polígono (falta del geojson) */}
          {caba > 0 && (
            <g>
              <circle
                cx={CABA_MARKER.cx}
                cy={CABA_MARKER.cy}
                r={CABA_MARKER.r}
                fill={colorForRatio(max === 0 ? 0 : caba / max)}
                stroke="#fff"
                strokeWidth="1"
              >
                <title>{`CABA: ${caba.toLocaleString('es-AR')} ${label}`}</title>
              </circle>
              <text
                x={CABA_MARKER.cx + 9}
                y={CABA_MARKER.cy + 3}
                fontSize="10"
                fill="#1e293b"
                style={{ pointerEvents: 'none' }}
              >
                CABA
              </text>
            </g>
          )}
        </svg>
        {/* Mini leyenda */}
        <div className="mt-1 flex items-center gap-2 text-xs text-brand-muted">
          <span>0</span>
          <div
            className="h-2 flex-1 rounded-full"
            style={{
              background: `linear-gradient(to right, ${colorForRatio(0)}, ${colorForRatio(0.5)}, ${colorForRatio(1)})`,
            }}
            aria-hidden
          />
          <span>{max.toLocaleString('es-AR')}</span>
        </div>
      </div>
    </div>
  )
}

// Re-export sizes para uso del caller si quiere ajustar contenedores.
export { VB_W as ARGENTINA_VB_WIDTH, VB_H as ARGENTINA_VB_HEIGHT }
