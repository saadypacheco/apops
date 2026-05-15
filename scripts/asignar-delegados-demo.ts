// Asigna las cuentas demo (Méndez Carolina / García Lucía / Sosa Roberto)
// como `representante` en padron_cotizantes, sobre los top 3 edificios
// por cantidad de cotizantes. Sin esto, las cuentas demo entran a
// /delegados y ven 0 cotizantes porque los representantes del padrón
// ANSES real son nombres distintos.
//
// Usage: npx tsx scripts/asignar-delegados-demo.ts
//
// Idempotente: si una cuenta demo ya tiene representados, no toca esas
// filas. Solo agrega nuevas si están vacías. Re-correr no duplica.

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv(file: string): boolean {
  const p = resolve(process.cwd(), file)
  if (!existsSync(p)) return false
  const raw = readFileSync(p, 'utf-8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!(key in process.env)) process.env[key] = value
  }
  return true
}

const usedCloud = loadEnv('.env.cloud')
if (!usedCloud) loadEnv('.env.local')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}
if (url.includes('127.0.0.1') || url.includes('localhost')) {
  console.error('⚠ La URL apunta al stack local. Querés correr esto contra el cloud.')
  process.exit(1)
}

const admin = createClient(url, key)

type DelegadoCfg = {
  nombre: string
  cuenta: string
  cantidad: number
}

const DELEGADOS: DelegadoCfg[] = [
  { nombre: 'Méndez, Carolina', cuenta: 'siempreapops@apops.org.ar', cantidad: 40 },
  { nombre: 'García, Lucía', cuenta: 'delegado.norte@apops.org.ar', cantidad: 30 },
  { nombre: 'Sosa, Roberto', cuenta: 'delegado.sur@apops.org.ar', cantidad: 25 },
]

async function main() {
  console.log(`▸ Cloud: ${url}\n`)

  // 1. Verificar estado actual
  type CountRow = { representante: string | null }
  const { data: existing } = await admin
    .from('padron_cotizantes_actual')
    .select('representante')
    .in('representante', DELEGADOS.map((d) => d.nombre))
  const existingCount = new Map<string, number>()
  for (const r of (existing ?? []) as CountRow[]) {
    if (!r.representante) continue
    existingCount.set(r.representante, (existingCount.get(r.representante) ?? 0) + 1)
  }

  console.log('Estado actual de los delegados demo:')
  for (const d of DELEGADOS) {
    const n = existingCount.get(d.nombre) ?? 0
    console.log(`  ${d.nombre.padEnd(22)} → ${n} representados`)
  }
  console.log('')

  // 2. Buscar top edificios por cantidad de cotizantes SIN representante
  //    (para no pisar asignaciones existentes).
  type PadronRow = {
    id: string
    lugar_trabajo_padron: string | null
    lugar_trabajo_rrhh: string | null
    representante: string | null
  }
  const { data: padron } = (await admin
    .from('padron_cotizantes_actual')
    .select('id, lugar_trabajo_padron, lugar_trabajo_rrhh, representante')) as {
    data: PadronRow[] | null
  }

  if (!padron || padron.length === 0) {
    console.error('No hay padrón cargado en el cloud.')
    process.exit(1)
  }

  // Agrupar IDs por edificio (con prioridad a lugar_trabajo_padron), solo los
  // que están sin representante o con representante demo (idempotencia).
  const demoNames = new Set(DELEGADOS.map((d) => d.nombre))
  const idsPorEdificio = new Map<string, string[]>()
  for (const r of padron) {
    const edif = (r.lugar_trabajo_padron ?? r.lugar_trabajo_rrhh ?? '').trim()
    if (!edif) continue
    // Saltear si ya tiene un representante NO demo (no queremos pisar reales).
    if (r.representante && !demoNames.has(r.representante)) continue
    const list = idsPorEdificio.get(edif) ?? []
    list.push(r.id)
    idsPorEdificio.set(edif, list)
  }

  const topEdificios = Array.from(idsPorEdificio.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, DELEGADOS.length)

  console.log('Top edificios disponibles (sin representante real):')
  for (const [edif, ids] of topEdificios) {
    console.log(`  ${edif.padEnd(40)} → ${ids.length} cotizantes`)
  }
  console.log('')

  // 3. Asignar
  for (let i = 0; i < DELEGADOS.length; i++) {
    const d = DELEGADOS[i]!
    const tup = topEdificios[i]
    if (!tup) {
      console.warn(`⚠ No hay edificio suficiente para ${d.nombre}, salteo.`)
      continue
    }
    const [edif, ids] = tup
    const targetIds = ids.slice(0, d.cantidad)

    // Update en chunks de 100 (PostgREST se pone lento con IN gigantes)
    let updated = 0
    for (let j = 0; j < targetIds.length; j += 100) {
      const batch = targetIds.slice(j, j + 100)
      const { error, count } = await admin
        .from('padron_cotizantes')
        .update({ representante: d.nombre }, { count: 'exact' })
        .in('id', batch)
      if (error) {
        console.error(`❌ Error con ${d.nombre}: ${error.message}`)
        break
      }
      updated += count ?? batch.length
    }

    console.log(`✓ ${d.nombre.padEnd(22)} → ${updated} cotizantes asignados en "${edif}"`)
  }

  console.log('\nListo. Probá entrar con cualquiera de las 3 cuentas demo:')
  for (const d of DELEGADOS) {
    console.log(`  ${d.cuenta}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
