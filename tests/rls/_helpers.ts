import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// Helpers para tests RLS. Conectan al stack local de Supabase usando las
// variables de entorno cargadas por tests/setup.ts desde .env.local.

export function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      'Tests RLS requieren NEXT_PUBLIC_SUPABASE_URL, ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY en .env.local. ' +
        'Corré `npx supabase status` y copiá los valores.',
    )
  }
  return { url, anonKey, serviceRoleKey }
}

export function makeAnonClient(): SupabaseClient<Database> {
  const { url, anonKey } = getEnv()
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function makeServiceRoleClient(): SupabaseClient<Database> {
  const { url, serviceRoleKey } = getEnv()
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// Crea un usuario en auth.users con admin API (bypassea signup disabled)
// y devuelve un cliente Supabase con sesión activa de ese user.
// Útil para verificar que `authenticated` (rol Postgres) tampoco accede.
export async function makeAuthenticatedClient(
  email: string,
): Promise<{ client: SupabaseClient<Database>; userId: string }> {
  const { url, anonKey } = getEnv()
  const admin = makeServiceRoleClient()

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  })
  if (created.error || !created.data.user) {
    throw new Error(
      `No se pudo crear user de test: ${created.error?.message ?? 'sin user'}`,
    )
  }
  const userId = created.data.user.id

  const link = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (link.error || !link.data.properties?.hashed_token) {
    throw new Error(
      `No se pudo generar magic link de test: ${link.error?.message ?? 'sin token'}`,
    )
  }

  const client = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const verified = await client.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link.data.properties.hashed_token,
  })
  if (verified.error || !verified.data.session) {
    throw new Error(
      `No se pudo verificar magic link: ${verified.error?.message ?? 'sin sesion'}`,
    )
  }

  return { client, userId }
}

export async function deleteTestUser(userId: string): Promise<void> {
  const admin = makeServiceRoleClient()
  await admin.auth.admin.deleteUser(userId)
}
