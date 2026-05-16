// Resetea las passwords de las cuentas demo a los valores documentados
// en RESUME.md. Necesario porque los delegados.norte/sur nunca se
// loguearon y sus passwords reales se perdieron en algún seed previo.
//
// Usage: npx tsx scripts/reset-demo-passwords.ts

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

if (!URL || !SERVICE) {
  console.error('Faltan URL o SERVICE_ROLE en .env.cloud')
  process.exit(1)
}

const CUENTAS = [
  { email: 'siempreapops@apops.org.ar', password: 'siempreapops' },
  { email: 'delegado.norte@apops.org.ar', password: 'delegadonorte' },
  { email: 'delegado.sur@apops.org.ar', password: 'delegadosur' },
]

async function main() {
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 })

  for (const c of CUENTAS) {
    const u = users.users.find((x) => x.email === c.email)
    if (!u) {
      console.log(`❌ ${c.email}: no existe en auth.users, salteo`)
      continue
    }
    const { error } = await admin.auth.admin.updateUserById(u.id, {
      password: c.password,
    })
    if (error) {
      console.log(`❌ ${c.email}: ${error.message}`)
    } else {
      console.log(`✓ ${c.email}: password reseteada a "${c.password}"`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
