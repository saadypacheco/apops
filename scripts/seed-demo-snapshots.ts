// Seed para demo: carga el ministerio.xlsx real como JULIO 2016 y genera
// 3 períodos pasados (ABRIL/MAYO/JUNIO 2016) derivados del real con
// variaciones controladas: altas, bajas, cambios de categoría, cambios
// de gremio. Permite que la CD vea el dashboard con datos reales en vez
// del seed de 6 filas inventadas.
//
// Usage: npx tsx scripts/seed-demo-snapshots.ts
//
// Idempotente: borra cualquier snapshot 2016 previo antes de insertar.
// Borra también la CARGA INICIAL 2026-05 (los 6 cotizantes inventados).

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseXlsxPadron } from '../src/lib/admin/padron-parser'
import type { PadronRow } from '../src/types/padron'

// Carga .env.cloud (apunta al Supabase cloud, gitignored). Si no existe,
// cae a .env.local (stack local, sólo si está corriendo `supabase start`).
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
  console.error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Creá .env.cloud con:\n' +
      '  NEXT_PUBLIC_SUPABASE_URL=https://pozbdplbichrhojjeqiv.supabase.co\n' +
      '  SUPABASE_SERVICE_ROLE_KEY=<service_role_key del dashboard de Supabase>',
  )
  process.exit(1)
}
if (url.includes('127.0.0.1') || url.includes('localhost')) {
  console.error(
    '⚠️  Estás apuntando a Supabase LOCAL (' +
      url +
      '). Esta seed pisa el cloud productivo. ' +
      'Si querés usar local, asegurate de que `supabase start` esté corriendo ' +
      'y que las migrations estén aplicadas localmente. Continuando en 3s...',
  )
}
console.log('🔗 Conectando a:', url)
const admin = createClient(url, key, { auth: { persistSession: false } })

// =====================================================================
// Generadores y mutadores
// =====================================================================

function createFakeRow(seed: number): PadronRow {
  // Legajo con prefijo DEMO para no colisionar con reales (que son numéricos).
  const legajo = `DEMO${String(seed).padStart(5, '0')}`
  const provincias = [
    'Capital Federal',
    'Buenos Aires',
    'Córdoba',
    'Santa Fe',
    'Mendoza',
  ]
  const edificios = [
    'PIEDRAS 353',
    'ALSINA 250',
    'CHACABUCO 467',
    'CORDOBA 720',
    'UDAI AYACUCHO',
  ]
  return {
    legajo,
    dni: null, // fakes sin DNI — no colisionan con reales
    nombre: `DEMO BAJA ${seed}`,
    cuil: null,
    fecha_ingreso: '2010-01-01',
    fecha_nacimiento: '1970-01-01',
    fecha_actualizacion_delegados: null,
    categoria: 15 + (seed % 12),
    tipo_planta: seed % 5 === 0 ? 'PT' : 'PP',
    lugar_trabajo_padron: edificios[seed % edificios.length]!,
    lugar_trabajo_relevamiento: null,
    lugar_trabajo_rrhh: edificios[seed % edificios.length]!,
    afiliado_apops: seed % 4 === 0, // 25% APOPS
    afiliado_ate: seed % 7 === 0,
    afiliado_sec: false,
    afiliado_upcn: seed % 5 === 0,
    afiliado_secasfpi: seed % 9 === 0,
    cotiza_papel: false,
    sexo: seed % 2 === 0 ? 'Varón' : 'Mujer',
    provincia: provincias[seed % provincias.length]!,
    regional: null,
    representante: null,
    periodo_mandato: null,
    vence_mandato_30dias: false,
    fecha_baja_excel: null,
  }
}

type MutateConfig = {
  /** Cuántas filas reales remover (= altas que aparecerán entre este mes y el siguiente) */
  altas: number
  /** Cuántas filas fake agregar (= bajas que ocurrirán entre este mes y el siguiente) */
  bajas: number
  /** Cuántas filas cambiar de categoría (entre este mes y el siguiente alguien asciende) */
  cambiosCategoria: number
  /** Cuántas filas cambiar gremio (alguien se cambia entre APOPS y otro) */
  cambiosGremio: number
  /** Seed offset para fakes únicos por período */
  fakeSeedStart: number
}

function shuffledIndices(n: number, rng: () => number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

// PRNG determinístico para que el seed sea reproducible.
// Mulberry32 con seed fija = los mismos cambios cada vez que corre.
function makeRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function deriveOlderSnapshot(
  newer: PadronRow[],
  config: MutateConfig,
  rng: () => number,
): PadronRow[] {
  // 1. Empezar copiando el newer
  const older: PadronRow[] = newer.map((r) => ({ ...r }))

  // 2. Quitar `altas` filas reales al azar (estas son personas que ENTRARÁN
  //    al organismo entre este mes "older" y el siguiente "newer").
  const idxs = shuffledIndices(older.length, rng)
  const toRemove = new Set(idxs.slice(0, config.altas))
  const keptIndexes: number[] = []
  for (let i = 0; i < older.length; i++) {
    if (!toRemove.has(i)) keptIndexes.push(i)
  }
  const kept = keptIndexes.map((i) => older[i]!)

  // 3. Agregar `bajas` filas fake (estas serán bajas en el mes "newer" porque
  //    aparecen sólo acá).
  const fakes: PadronRow[] = []
  for (let i = 0; i < config.bajas; i++) {
    fakes.push(createFakeRow(config.fakeSeedStart + i))
  }
  const result = [...kept, ...fakes]

  // 4. Mutar categorías en N filas reales (no fakes). En el snapshot older,
  //    estas personas tienen categoría inferior — ascienden en el newer.
  const realIndicesAfterRemoval = shuffledIndices(kept.length, rng)
  const catIdxs = realIndicesAfterRemoval.slice(0, config.cambiosCategoria)
  for (const idx of catIdxs) {
    const r = result[idx]!
    if (r.categoria !== null && r.categoria > 1) {
      r.categoria = r.categoria - 1
    }
  }

  // 5. Mutar gremio en N filas — simulación de afiliación/desafiliación.
  const gremioIdxs = realIndicesAfterRemoval.slice(
    config.cambiosCategoria,
    config.cambiosCategoria + config.cambiosGremio,
  )
  for (const idx of gremioIdxs) {
    const r = result[idx]!
    // Flip: si era APOPS, en el older era de otro gremio (se afilió a APOPS
    // en el newer). Si era de otro, en el older era APOPS (se desafilió).
    if (r.afiliado_apops) {
      r.afiliado_apops = false
      r.afiliado_ate = true
    } else if (r.afiliado_ate) {
      r.afiliado_ate = false
      r.afiliado_apops = true
    } else {
      r.afiliado_apops = true
    }
  }

  return result
}

// =====================================================================
// Insertador
// =====================================================================

async function insertSnapshot(
  rows: PadronRow[],
  label: string,
  year: number,
  month: number,
  filename: string,
): Promise<string> {
  const totals = {
    total_filas: rows.length,
    total_apops: rows.filter((r) => r.afiliado_apops).length,
    total_ate: rows.filter((r) => r.afiliado_ate).length,
    total_upcn: rows.filter((r) => r.afiliado_upcn).length,
    total_secasfpi: rows.filter((r) => r.afiliado_secasfpi).length,
    total_planta_perm: rows.filter((r) => r.tipo_planta === 'PP').length,
    total_planta_trans: rows.filter((r) => r.tipo_planta === 'PT').length,
    total_papel: rows.filter((r) => r.cotiza_papel).length,
    total_delegados: rows.filter((r) => !!r.fecha_actualizacion_delegados)
      .length,
  }

  const { data: snap, error: snapErr } = await admin
    .from('padron_snapshots')
    .insert({
      periodo_label: label,
      periodo_year: year,
      periodo_month: month,
      archivo_nombre: filename,
      ...totals,
    })
    .select('id')
    .single()

  if (snapErr || !snap) {
    throw new Error(`Snapshot insert failed: ${snapErr?.message}`)
  }
  const snapshotId = snap.id

  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map((r) => ({
      padron_snapshot_id: snapshotId,
      source_batch: snapshotId,
      legajo: r.legajo,
      dni: r.dni,
      nombre: r.nombre,
      cuil: r.cuil,
      fecha_ingreso: r.fecha_ingreso,
      fecha_nacimiento: r.fecha_nacimiento,
      fecha_actualizacion_delegados: r.fecha_actualizacion_delegados,
      categoria: r.categoria,
      tipo_planta: r.tipo_planta,
      lugar_trabajo_padron: r.lugar_trabajo_padron,
      lugar_trabajo_relevamiento: r.lugar_trabajo_relevamiento,
      lugar_trabajo_rrhh: r.lugar_trabajo_rrhh,
      afiliado_apops: r.afiliado_apops,
      afiliado_ate: r.afiliado_ate,
      afiliado_sec: r.afiliado_sec,
      afiliado_upcn: r.afiliado_upcn,
      afiliado_secasfpi: r.afiliado_secasfpi,
      cotiza_papel: r.cotiza_papel,
      sexo: r.sexo,
      provincia: r.provincia,
      regional: r.regional,
      representante: r.representante,
      periodo_mandato: r.periodo_mandato,
      vence_mandato_30dias: r.vence_mandato_30dias,
    }))
    const { error } = await admin.from('padron_cotizantes').insert(batch)
    if (error) {
      throw new Error(`Batch insert ${i}: ${error.message}`)
    }
  }

  console.log(
    `  ✓ ${label}: ${rows.length.toLocaleString('es-AR')} filas (APOPS ${totals.total_apops}, delegados ${totals.total_delegados})`,
  )
  return snapshotId
}

// =====================================================================
// Main
// =====================================================================

async function main() {
  console.log('🌱 Seeding demo snapshots...\n')

  const xlsxPath = resolve(process.cwd(), 'data/ministerio.xlsx')
  if (!existsSync(xlsxPath)) {
    console.error(`No encontré ${xlsxPath}. Movelo desde public/ a data/.`)
    process.exit(1)
  }
  const buffer = readFileSync(xlsxPath)
  const parsed = parseXlsxPadron(buffer)
  if (!parsed.ok) {
    console.error('Parser falló:', parsed.error)
    process.exit(1)
  }
  const julio = parsed.rows
  console.log(`📄 Parseado JULIO 2016: ${julio.length.toLocaleString('es-AR')} filas\n`)

  // Borrar snapshots demo previos: 2016/4-7 + el seed CARGA INICIAL 2026-05.
  // En queries separadas para evitar quirks del .or() con UUID.
  console.log('🧹 Borrando snapshots previos del demo...')
  const del1 = await admin
    .from('padron_snapshots')
    .delete()
    .eq('periodo_year', 2016)
  if (del1.error) console.error('  Error borrando 2016:', del1.error.message)
  else console.log('  ✓ snapshots 2016 borrados')

  const del2 = await admin
    .from('padron_snapshots')
    .delete()
    .eq('id', '00000000-0000-4000-9000-000000000099')
  if (del2.error)
    console.error('  Error borrando CARGA INICIAL:', del2.error.message)
  else console.log('  ✓ CARGA INICIAL borrada')
  console.log()

  console.log('🌱 Insertando snapshots...')

  // Determinístico: seeds fijas, mismos cambios cada vez que corre.
  const rngJunio = makeRng(20160601)
  const rngMayo = makeRng(20160501)
  const rngAbril = makeRng(20160401)

  // JUNIO derivado de JULIO
  const junio = deriveOlderSnapshot(
    julio,
    {
      altas: 38, // 38 personas entraron entre junio y julio
      bajas: 27, // 27 personas se fueron
      cambiosCategoria: 14,
      cambiosGremio: 9,
      fakeSeedStart: 10000,
    },
    rngJunio,
  )

  // MAYO derivado de JULIO con más variación
  const mayo = deriveOlderSnapshot(
    julio,
    {
      altas: 72,
      bajas: 51,
      cambiosCategoria: 28,
      cambiosGremio: 18,
      fakeSeedStart: 20000,
    },
    rngMayo,
  )

  // ABRIL derivado de JULIO con aún más variación
  const abril = deriveOlderSnapshot(
    julio,
    {
      altas: 105,
      bajas: 78,
      cambiosCategoria: 42,
      cambiosGremio: 27,
      fakeSeedStart: 30000,
    },
    rngAbril,
  )

  // Insertar de viejo a nuevo
  await insertSnapshot(abril, 'ABRIL 2016', 2016, 4, 'ministerio-abril.demo.xlsx')
  await insertSnapshot(mayo, 'MAYO 2016', 2016, 5, 'ministerio-mayo.demo.xlsx')
  await insertSnapshot(junio, 'JUNIO 2016', 2016, 6, 'ministerio-junio.demo.xlsx')
  await insertSnapshot(julio, 'JULIO 2016', 2016, 7, 'ministerio.xlsx')

  console.log('\n✅ Seed demo completo.\n')
  console.log('Los 6 afiliados del seed inicial (Méndez, García, Sosa, etc.)')
  console.log('quedaron con padron_id=null. Se siguen pudiendo loguear como')
  console.log('demo de roles, pero ya no están "en el padrón".')
}

main().catch((err) => {
  console.error('💥', err)
  process.exit(1)
})
