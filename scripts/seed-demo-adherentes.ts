// Seed sintético de adherentes para demo. Suma ~30 familiares ficticios
// atados a los 6 cotizantes demo del seed inicial + algunos cotizantes
// reales del padrón JULIO 2016 (para que la credencial digital se pueda
// probar con titulares y adherentes en pantalla).
//
// Usage: npx tsx scripts/seed-demo-adherentes.ts
//
// Idempotente: borra adherentes con source_batch="DEMO_SEED_ADHERENTES"
// antes de insertar. Los 4 adherentes del seed original (migration 0023)
// quedan intactos.

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DEMO_BATCH = '00000000-0000-4000-9000-000000000999'

// Cargar .env.cloud o .env.local
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
if (!loadEnv('.env.cloud')) loadEnv('.env.local')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error(
    'Faltan vars. Crear .env.cloud con NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.',
  )
  process.exit(1)
}
console.log('🔗 Conectando a:', url)
const admin = createClient(url, key, { auth: { persistSession: false } })

type Adherente = {
  titular_dni: string | null
  titular_legajo: string | null
  nombre: string
  dni: string | null
  vinculo:
    | 'conyuge'
    | 'hijo'
    | 'hija'
    | 'padre'
    | 'madre'
    | 'hermano'
    | 'hermana'
    | 'otro'
  fecha_nacimiento: string | null
  numero_afiliado: string | null
  email: string | null
  telefono: string | null
}

// ===========================================================================
// Datos sintéticos por titular
// ===========================================================================

const adherentes: Adherente[] = [
  // ─── Méndez Carolina (admin demo) — DNI 99000001, L-SIEMPREAPOPS
  {
    titular_dni: '99000001',
    titular_legajo: 'L-SIEMPREAPOPS',
    nombre: 'Méndez, Daniel',
    dni: '28000001',
    vinculo: 'conyuge',
    fecha_nacimiento: '1978-09-12',
    numero_afiliado: 'AD-99000001-01',
    email: 'daniel.mendez@test.local',
    telefono: '5491155000101',
  },
  {
    titular_dni: '99000001',
    titular_legajo: 'L-SIEMPREAPOPS',
    nombre: 'Méndez, Mateo',
    dni: '52000001',
    vinculo: 'hijo',
    fecha_nacimiento: '2014-04-23',
    numero_afiliado: 'AD-99000001-02',
    email: null,
    telefono: null,
  },
  {
    titular_dni: '99000001',
    titular_legajo: 'L-SIEMPREAPOPS',
    nombre: 'Méndez, Sofía',
    dni: null,
    vinculo: 'hija',
    fecha_nacimiento: '2020-11-03',
    numero_afiliado: 'AD-99000001-03',
    email: null,
    telefono: null,
  },

  // ─── García Lucía (delegada norte) — DNI 99000002, L-N0001
  {
    titular_dni: '99000002',
    titular_legajo: 'L-N0001',
    nombre: 'García, Hernán',
    dni: '27000002',
    vinculo: 'conyuge',
    fecha_nacimiento: '1976-02-18',
    numero_afiliado: 'AD-99000002-01',
    email: 'hernan.g@test.local',
    telefono: '5491155000202',
  },
  {
    titular_dni: '99000002',
    titular_legajo: 'L-N0001',
    nombre: 'García, Tomás',
    dni: '50000002',
    vinculo: 'hijo',
    fecha_nacimiento: '2013-07-09',
    numero_afiliado: 'AD-99000002-02',
    email: null,
    telefono: null,
  },
  {
    titular_dni: '99000002',
    titular_legajo: 'L-N0001',
    nombre: 'García, Camila',
    dni: '55000002',
    vinculo: 'hija',
    fecha_nacimiento: '2016-12-15',
    numero_afiliado: 'AD-99000002-03',
    email: null,
    telefono: null,
  },

  // ─── Sosa Roberto (delegado sur) — DNI 99000003, L-S0001
  {
    titular_dni: '99000003',
    titular_legajo: 'L-S0001',
    nombre: 'Sosa, Patricia',
    dni: '28000003',
    vinculo: 'conyuge',
    fecha_nacimiento: '1979-06-30',
    numero_afiliado: 'AD-99000003-01',
    email: 'patricia.s@test.local',
    telefono: '5491155000303',
  },
  {
    titular_dni: '99000003',
    titular_legajo: 'L-S0001',
    nombre: 'Sosa, Lucas',
    dni: '48000003',
    vinculo: 'hijo',
    fecha_nacimiento: '2011-10-08',
    numero_afiliado: 'AD-99000003-02',
    email: null,
    telefono: null,
  },

  // ─── Pérez María — DNI 30000001 (ya tiene 3 adherentes en el seed migration 0023)
  // No agrego más para no duplicar.

  // ─── Martínez Pablo — DNI 30000003 (ATE, no APOPS)
  {
    titular_dni: '30000003',
    titular_legajo: null,
    nombre: 'Martínez, Cecilia',
    dni: '29000003',
    vinculo: 'conyuge',
    fecha_nacimiento: '1981-03-21',
    numero_afiliado: 'AD-30000003-01',
    email: 'cecilia.m@test.local',
    telefono: '5491155000402',
  },

  // ─── Rodríguez Ana — DNI 20000001 (ya tiene 1 adherente en el seed)
  // Sumo 1 más
  {
    titular_dni: '20000001',
    titular_legajo: null,
    nombre: 'Rodríguez, Florencia',
    dni: '45000010',
    vinculo: 'hija',
    fecha_nacimiento: '1985-08-14',
    numero_afiliado: 'AD-20000001-02',
    email: 'flor.r@test.local',
    telefono: '5491155000501',
  },

  // ─── Algunos cotizantes reales del padrón JULIO 2016 (con DNI conocido del Excel)
  // Para que cuando se busque por DNI en la credencial pública, se vea
  // ejemplo con adherentes.

  // FONTANA, OSVALDO — DNI 4390999, L-979222 (primer row del Excel real)
  {
    titular_dni: '4390999',
    titular_legajo: '979222',
    nombre: 'Fontana, Marta',
    dni: '5210000',
    vinculo: 'conyuge',
    fecha_nacimiento: '1945-01-20',
    numero_afiliado: 'AD-4390999-01',
    email: null,
    telefono: '5491155001001',
  },
  // Algunos hijos adultos para Fontana
  {
    titular_dni: '4390999',
    titular_legajo: '979222',
    nombre: 'Fontana, Roberto',
    dni: '25400000',
    vinculo: 'hijo',
    fecha_nacimiento: '1975-05-10',
    numero_afiliado: 'AD-4390999-02',
    email: 'roberto.f@test.local',
    telefono: '5491155001002',
  },
]

async function main() {
  console.log(`📋 Adherentes a insertar: ${adherentes.length}`)

  // Borrar batch demo anterior si existe
  console.log('🧹 Borrando batch demo previo...')
  const del = await admin
    .from('padron_adherentes')
    .delete()
    .eq('source_batch', DEMO_BATCH)
  if (del.error) console.error('  Error borrando:', del.error.message)
  else console.log('  ✓ batch demo borrado')

  // Borrar también las mismas personas cargadas por OTROS batches (típico:
  // el seed de la migration 0023, que usa otra convención de legajo para
  // el mismo titular). Sin esto chocarían contra el índice único
  // uq_adherente_por_titular de la migration 0039 y el script fallaría.
  console.log('🧹 Borrando esas mismas personas de otros batches...')
  let colisiones = 0
  for (const a of adherentes) {
    const { error: e, count } = await admin
      .from('padron_adherentes')
      .delete({ count: 'exact' })
      .eq('titular_dni', a.titular_dni)
      .eq('nombre', a.nombre)
      .eq('vinculo', a.vinculo)
    if (e) console.error(`  Error con ${a.nombre}:`, e.message)
    else colisiones += count ?? 0
  }
  console.log(`  ✓ ${colisiones} filas previas removidas`)

  // Insertar nuevos
  console.log('\n🌱 Insertando adherentes demo...')
  const batch = adherentes.map((a) => ({
    ...a,
    source_batch: DEMO_BATCH,
  }))
  const { error } = await admin.from('padron_adherentes').insert(batch)
  if (error) {
    console.error('💥 Error:', error.message)
    process.exit(1)
  }
  console.log(`✓ ${batch.length} adherentes insertados`)

  // Verificar total
  const { count } = await admin
    .from('padron_adherentes')
    .select('id', { count: 'exact', head: true })
  console.log(`\n📊 Total adherentes en BD ahora: ${count}`)
}

main().catch((e) => {
  console.error('💥', e)
  process.exit(1)
})
