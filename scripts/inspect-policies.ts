// Inspecciona policies actuales de solicitudes_afiliacion y
// padron_cotizantes_actual para entender por qué los tests RLS fallan.

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
  // Vista padron_cotizantes_actual: chequear privilegios
  const { data: viewGrants, error: e1 } = await admin.rpc('exec_sql' as never, {
    sql: `SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = 'padron_cotizantes_actual'`,
  } as never)
  if (e1) console.log('No tengo exec_sql RPC; uso introspección alternativa\n')

  // Alternativa: query directo a pg_policies + pg_views
  type Policy = {
    schemaname: string
    tablename: string
    policyname: string
    permissive: string
    roles: string[]
    cmd: string
    qual: string | null
    with_check: string | null
  }
  // No podemos hacer raw SQL sin RPC. Pero podemos usar pg_meta de Supabase
  // via REST. La forma más simple: consultar la vista de policies que SI es
  // accesible.

  // Workaround: hago un INSERT con service_role para verificar que el insert
  // FUNCIONA con service_role (bypass de RLS). Si funciona con service y
  // falla con anon, es 100% RLS.
  const payload = {
    apellido_nombre: 'TEST INSPECT, Borrar',
    tipo_documento: 'DNI',
    numero_documento: '99999999',
    celular: '1144445555',
    email: `inspect-${Date.now()}@example.com`,
    numero_legajo: '999000',
    edificio_udai: 'TEST',
    acepta_descuento: true,
    firma_png:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=',
  }
  const r = await admin
    .from('solicitudes_afiliacion')
    .insert(payload)
    .select('id')
    .single()
  if (r.error) {
    console.log('INSERT con service_role FALLA:', r.error.message)
    console.log('Eso significa que NO es RLS sino un CHECK constraint.')
  } else {
    console.log('INSERT con service_role OK:', r.data?.id)
    console.log('Eso significa que el problema con anon ES RLS')
    // cleanup
    if (r.data?.id)
      await admin.from('solicitudes_afiliacion').delete().eq('id', r.data.id)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
