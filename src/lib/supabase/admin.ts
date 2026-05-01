// Cliente Supabase con service_role para uso EXCLUSIVO server-side.
// Bypassea RLS — solo invocar desde Route Handlers, Server Actions, o
// Server Components donde haga falta operar con privilegios de servicio
// (ej: actualizar last_login_at, registrar audit_log desde el callback).
//
// La service_role_key NUNCA debe ser exportada al cliente. Si este módulo
// se importa por error en un Client Component, Next.js no fallará pero la
// var sería undefined al runtime — el hint en el error apunta acá.

import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY ' +
        'en el ambiente. Verificá .env.local.',
    )
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
