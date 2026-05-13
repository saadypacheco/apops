// Diagnóstico rápido: lista snapshots y total cotizantes existentes.
// Temporal — borrar cuando el dashboard esté validado.

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  const raw = readFileSync(envPath, 'utf-8')
  for (const line of raw.split(/\r?\n/)) {
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
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  console.log('Conectando a', url)
  const start = Date.now()
  const { data, error } = await admin
    .from('padron_snapshots')
    .select('id, periodo_label, total_filas')
    .order('periodo_year', { ascending: false })
    .order('periodo_month', { ascending: false })
  console.log(`Query padron_snapshots: ${Date.now() - start}ms`)

  if (error) {
    console.error('Error:', error.message)
    return
  }
  console.log(`Snapshots: ${data?.length ?? 0}`)
  data?.forEach((s) => console.log(`  ${s.periodo_label}: ${s.total_filas}`))

  const t2 = Date.now()
  const { count, error: e2 } = await admin
    .from('padron_cotizantes')
    .select('id', { count: 'exact', head: true })
  console.log(`Count padron_cotizantes: ${Date.now() - t2}ms`)
  if (e2) console.error('Count error:', e2.message)
  console.log(`Total cotizantes en DB: ${count}`)
}

main().catch((e) => {
  console.error('💥', e)
  process.exit(1)
})
