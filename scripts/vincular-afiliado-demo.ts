// Vincula la cuenta demo de afiliado (Méndez Carolina, DNI 99000001) al
// padrón como COTIZANTE de un edificio representado por otra cuenta demo
// (García Lucía). Sin esto, Carolina no tiene edificio ni delegado, y por
// eso ve "0 contactos disponibles" en Nueva consulta y no le aparece el
// botón del grupo de WhatsApp en su inicio.
//
// Ojo: `asignar-delegados-demo.ts` pone a Carolina como REPRESENTANTE de
// un edificio (para poder demostrar la vista de delegada). Este script es
// el complemento: la suma también como cotizante representada, que es lo
// que necesita la vista de afiliada.
//
// Usage: npx tsx scripts/vincular-afiliado-demo.ts
//
// Idempotente: si Carolina ya está en el snapshot actual, actualiza su
// edificio/representante en vez de duplicar.

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv(file: string): boolean {
  const p = resolve(process.cwd(), file)
  if (!existsSync(p)) return false
  for (const line of readFileSync(p, 'utf-8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
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

const db = createClient(url, key)

const AFILIADO_DNI = '99000001' // Méndez, Carolina
const DELEGADO_NOMBRE = 'García, Lucía'

async function main() {
  // 1. Cuenta del afiliado demo
  const { data: afiliado } = await db
    .from('afiliados')
    .select('id, nombre, dni, legajo')
    .eq('dni', AFILIADO_DNI)
    .maybeSingle()
  if (!afiliado) {
    console.error(`No existe la cuenta demo con DNI ${AFILIADO_DNI}.`)
    process.exit(1)
  }

  // 2. Snapshot más reciente (el que alimenta padron_cotizantes_actual)
  const { data: snapshots } = await db
    .from('padron_snapshots')
    .select('id, periodo_year, periodo_month')
    .order('periodo_year', { ascending: false })
    .order('periodo_month', { ascending: false })
    .limit(1)
  const snapshot = snapshots?.[0]
  if (!snapshot) {
    console.error('No hay snapshots de padrón cargados.')
    process.exit(1)
  }

  // 3. Un edificio que represente el delegado demo
  const { data: filasDelegado } = await db
    .from('padron_cotizantes')
    .select('lugar_trabajo_padron, lugar_trabajo_rrhh, source_batch')
    .eq('padron_snapshot_id', snapshot.id)
    .eq('representante', DELEGADO_NOMBRE)
    .limit(50)

  const edificio = (filasDelegado ?? [])
    .map((r) => r.lugar_trabajo_padron ?? r.lugar_trabajo_rrhh)
    .find((e): e is string => !!e)

  if (!edificio) {
    console.error(
      `${DELEGADO_NOMBRE} no representa ningún edificio con nombre. ` +
        'Corré antes: npx tsx scripts/asignar-delegados-demo.ts',
    )
    process.exit(1)
  }
  const sourceBatch = filasDelegado![0]!.source_batch

  // 4. ¿Ya está Carolina como cotizante en este snapshot?
  const { data: existente } = await db
    .from('padron_cotizantes')
    .select('id')
    .eq('padron_snapshot_id', snapshot.id)
    .eq('dni', AFILIADO_DNI)
    .maybeSingle()

  const fila = {
    dni: afiliado.dni,
    nombre: afiliado.nombre,
    legajo: afiliado.legajo,
    lugar_trabajo_padron: edificio,
    representante: DELEGADO_NOMBRE,
    afiliado_apops: true,
    cotiza_papel: false,
    padron_snapshot_id: snapshot.id,
    source_batch: sourceBatch,
  }

  if (existente) {
    const { error } = await db
      .from('padron_cotizantes')
      .update({
        lugar_trabajo_padron: edificio,
        representante: DELEGADO_NOMBRE,
        afiliado_apops: true,
      })
      .eq('id', existente.id)
    if (error) throw error
    console.log(`✓ Actualizada: ${afiliado.nombre} → ${edificio}`)
  } else {
    const { error } = await db.from('padron_cotizantes').insert(fila)
    if (error) throw error
    console.log(`✓ Insertada: ${afiliado.nombre} → ${edificio}`)
  }

  console.log(`  Edificio:     ${edificio}`)
  console.log(`  Representante: ${DELEGADO_NOMBRE}`)
  console.log(`  Snapshot:     ${snapshot.periodo_month}/${snapshot.periodo_year}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
