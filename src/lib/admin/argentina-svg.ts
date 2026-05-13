// Convierte GeoJSON de provincias argentinas a paths SVG pre-proyectados.
// Se evalúa una sola vez al import (módulo del lado servidor en el dashboard).
//
// Fuente del GeoJSON: https://github.com/matischroder/argentinaJson
// (23 provincias — no incluye CABA. CABA se renderiza como marker aparte.)
//
// Proyección: lineal con corrección de coseno para la latitud media de
// Argentina (~-38°). Suficiente para una vista a nivel país en un dashboard.

import geojson from './data/argentina-provincias.geojson.json'

type LngLat = [number, number]
type Ring = LngLat[]
type Geometry =
  | { type: 'Polygon'; coordinates: Ring[] }
  | { type: 'MultiPolygon'; coordinates: Ring[][] }

type Feature = {
  type: 'Feature'
  properties: { name: string }
  geometry: Geometry
}

const COLLECTION = geojson as { type: 'FeatureCollection'; features: Feature[] }

// =====================================================================
// Proyección
// =====================================================================

// Bounding box hardcodeada para que el aspect ratio quede consistente entre
// renders y no dependa de cambios futuros en el archivo. CABA cae adentro.
const LNG_MIN = -73.6
const LNG_MAX = -53.6
const LAT_MIN = -55.1
const LAT_MAX = -21.7
const LAT_MID = (LAT_MIN + LAT_MAX) / 2

// Corrección de aspecto a la latitud media: longitudes "se acercan" cerca
// de los polos. cos(-38°) ≈ 0.788.
const COS_LAT_MID = Math.cos((LAT_MID * Math.PI) / 180)

// viewBox: ancho fijo 400, alto calculado del aspect real proyectado.
export const VB_W = 400
const ASPECT =
  ((LAT_MAX - LAT_MIN) * 1) / ((LNG_MAX - LNG_MIN) * COS_LAT_MID)
export const VB_H = Math.round(VB_W * ASPECT)
export const ARGENTINA_VIEWBOX = `0 0 ${VB_W} ${VB_H}`

function project(lng: number, lat: number): [number, number] {
  const x =
    ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * VB_W
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * VB_H
  return [x, y]
}

// =====================================================================
// Conversión a path SVG
// =====================================================================

function ringToPath(ring: Ring): string {
  if (ring.length === 0) return ''
  let d = ''
  for (let i = 0; i < ring.length; i++) {
    const pair = ring[i]!
    const [px, py] = project(pair[0], pair[1])
    d += (i === 0 ? 'M' : 'L') + px.toFixed(1) + ',' + py.toFixed(1)
  }
  d += 'Z'
  return d
}

function geometryToPath(g: Geometry): string {
  if (g.type === 'Polygon') {
    return g.coordinates.map(ringToPath).join(' ')
  }
  // MultiPolygon: cada polígono es array de rings
  return g.coordinates
    .map((poly) => poly.map(ringToPath).join(' '))
    .join(' ')
}

// =====================================================================
// Output: paths pre-computados por provincia + marker de CABA
// =====================================================================

export type ProvinciaPath = {
  /** Nombre como viene del geojson (sin tildes la mayoría) */
  geojsonName: string
  d: string
}

export const ARGENTINA_PROVINCES: ProvinciaPath[] = COLLECTION.features.map(
  (f) => ({
    geojsonName: f.properties.name,
    d: geometryToPath(f.geometry),
  }),
)

// CABA como marker. Coordenadas aproximadas del microcentro: -58.42, -34.61.
const [cabaCx, cabaCy] = project(-58.42, -34.61)
export const CABA_MARKER = {
  cx: Number(cabaCx.toFixed(1)),
  cy: Number(cabaCy.toFixed(1)),
  r: 6,
}

// =====================================================================
// Normalizador de nombres padron → geojson
// =====================================================================
//
// El padrón ANSES usa nombres en castellano con tildes: "Córdoba",
// "Tucumán", "Río Negro", "Capital Federal", etc.
// El geojson usa nombres sin tildes en su mayoría: "Cordoba", "Tucuman".
// Esta función trae el nombre del padrón al espacio del geojson.

const PADRON_TO_GEOJSON: Record<string, string> = {
  'capital federal': '__CABA__',
  caba: '__CABA__',
  cordoba: 'Cordoba',
  'córdoba': 'Cordoba',
  'rio negro': 'Rio Negro',
  'río negro': 'Rio Negro',
  neuquen: 'Neuquen',
  'neuquén': 'Neuquen',
  tucuman: 'Tucuman',
  'tucumán': 'Tucuman',
  'entre rios': 'Entre Rios',
  'entre ríos': 'Entre Rios',
  // Las demás coinciden 1:1 case-insensitive
}

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

/**
 * Mapea un nombre de provincia del padrón al nombre canónico del geojson.
 * Para CABA devuelve "__CABA__" — el caller debería renderizarlo como marker.
 * Para nombres no reconocidos devuelve el nombre original capitalizado
 * (para no perder los datos silenciosamente).
 */
export function provinciaToGeojsonName(padronName: string): string {
  const norm = normalize(padronName)
  const direct = PADRON_TO_GEOJSON[norm]
  if (direct) return direct
  // Default: matchear case-insensitive con los geojsonNames
  const match = ARGENTINA_PROVINCES.find(
    (p) => normalize(p.geojsonName) === norm,
  )
  if (match) return match.geojsonName
  // No matchea — devolvemos el original para que sea visible en debug
  return padronName
}
