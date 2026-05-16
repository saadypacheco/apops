// Helpers para tests RLS. Crea clientes con auth en distintos roles
// para verificar que las policies de Postgres efectivamente bloquean lo
// que tienen que bloquear.
//
// Lee .env.cloud si existe (apunta al cloud); si no, cae a .env.local
// (stack local de Supabase si lo tenés corriendo).
//
// IMPORTANTE: estos tests asumen que las cuentas demo existen en la DB
// objetivo (siempreapops, delegado.norte, delegado.sur) con las claves
// que figuran en RESUME.md.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// IMPORTANTE: el setup global de vitest (tests/setup.ts) carga .env.local
// y deja URL=127.0.0.1:54321 en process.env. Si .env.cloud existe debe
// ganar para los tests RLS — por eso este loader sobreescribe.
function loadEnv(file: string, overwrite: boolean): boolean {
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
    if (overwrite || !(key in process.env)) process.env[key] = value
  }
  return true
}

// .env.cloud SOBREESCRIBE lo que haya cargado tests/setup.ts (que apunta
// a local). Si no existe .env.cloud, caemos a local sin pisar.
const usedCloud = loadEnv('.env.cloud', true)
if (!usedCloud) loadEnv('.env.local', false)

export const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
export const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

export function envOk(): boolean {
  return !!URL && !!ANON && !!SERVICE_ROLE
}

export function anonClient(): SupabaseClient {
  return createClient(URL, ANON, {
    auth: { persistSession: false },
  })
}

export function serviceClient(): SupabaseClient {
  return createClient(URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  })
}

// Cuentas demo conocidas (deben existir en la DB objetivo)
export const CUENTAS_DEMO = {
  admin: {
    email: 'siempreapops@apops.org.ar',
    password: 'siempreapops',
    nombreEsperado: 'Méndez, Carolina',
    rolEsperado: 'admin',
  },
  delegadoNorte: {
    email: 'delegado.norte@apops.org.ar',
    password: 'delegadonorte',
    nombreEsperado: 'García, Lucía',
    rolEsperado: 'delegado',
  },
  delegadoSur: {
    email: 'delegado.sur@apops.org.ar',
    password: 'delegadosur',
    nombreEsperado: 'Sosa, Roberto',
    rolEsperado: 'delegado',
  },
} as const

export async function authenticatedClient(
  email: string,
  password: string,
): Promise<SupabaseClient> {
  const client = createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(
      `No pude loguear ${email}: ${error.message}. ¿Existe en la DB objetivo?`,
    )
  }
  return client
}
