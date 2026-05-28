// Cambia el autor de las noticias que tienen 'Saady' (cualquier
// variación) a 'Comisión Directiva'. Para la demo del cliente.
//
// Usage: npx tsx scripts/fix-autor-noticias.ts

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv(file: string) {
  const p = resolve(process.cwd(), file)
  if (!existsSync(p)) return
  const raw = readFileSync(p, 'utf-8')
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    process.env[k] = v
  }
}
loadEnv('.env.cloud')

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })

async function main() {
  console.log(`Cloud: ${URL}\n`)

  // Lista noticias que tienen 'Saady' o 'Pacheco' en autor
  const { data: noticias } = await admin
    .from('noticias')
    .select('id, titulo, autor')
    .or('autor.ilike.%saady%,autor.ilike.%pacheco%')

  if (!noticias || noticias.length === 0) {
    console.log('No hay noticias con autor Saady/Pacheco. Nada que arreglar.')
    return
  }

  console.log(`Encontradas ${noticias.length} noticias para actualizar:`)
  for (const n of noticias) {
    console.log(`  • [${n.autor}] "${n.titulo}"`)
  }

  const { error } = await admin
    .from('noticias')
    .update({ autor: 'Comisión Directiva' })
    .or('autor.ilike.%saady%,autor.ilike.%pacheco%')

  if (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }

  console.log(`\n✓ ${noticias.length} noticias actualizadas a "Comisión Directiva"`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
