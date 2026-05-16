// Diagnóstico puntual: ¿existen las cuentas demo en el cloud y se pueden
// loguear con las credenciales que figuran en RESUME.md?

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
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

const CUENTAS = [
  { email: 'siempreapops@apops.org.ar', password: 'siempreapops' },
  { email: 'delegado.norte@apops.org.ar', password: 'delegadonorte' },
  { email: 'delegado.sur@apops.org.ar', password: 'delegadosur' },
]

async function main() {
  console.log(`Cloud: ${URL}\n`)

  // 1. ¿Existen en auth.users?
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })
  const { data: users, error: listErr } = await admin.auth.admin.listUsers({
    perPage: 200,
  })
  if (listErr) {
    console.error('No pude listar users:', listErr.message)
    return
  }
  console.log(`Total usuarios en auth: ${users.users.length}\n`)

  for (const c of CUENTAS) {
    const u = users.users.find((x) => x.email === c.email)
    if (!u) {
      console.log(`❌ ${c.email}: NO EXISTE en auth.users`)
      continue
    }
    console.log(`✓ ${c.email}:`)
    console.log(`    id: ${u.id}`)
    console.log(`    email_confirmed_at: ${u.email_confirmed_at ?? 'NULL (no confirmado)'}`)
    console.log(`    last_sign_in_at: ${u.last_sign_in_at ?? 'nunca'}`)
    console.log(`    banned_until: ${(u as any).banned_until ?? '-'}`)
  }

  // 2. Probar signIn con anon
  console.log('\n--- Probando signIn con anon key ---')
  for (const c of CUENTAS) {
    const anonClient = createClient(URL, ANON, {
      auth: { persistSession: false },
    })
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: c.email,
      password: c.password,
    })
    if (error) {
      console.log(`❌ ${c.email}: ${error.message} (status ${error.status})`)
    } else {
      console.log(`✓ ${c.email}: login OK (user.id=${data.user?.id?.slice(0, 8)}...)`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
