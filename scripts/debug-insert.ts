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

const payload = {
  apellido_nombre: 'TEST DEBUG, Borrar',
  tipo_documento: 'DNI',
  numero_documento: '99999000',
  celular: '1144445555',
  email: `debug-${Date.now()}@example.com`,
  numero_legajo: '999000',
  edificio_udai: 'TEST',
  acepta_descuento: true,
  firma_png:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=',
}

async function main() {
  const res = await fetch(`${URL}/rest/v1/solicitudes_afiliacion`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })
  console.log(`Status: ${res.status} ${res.statusText}`)
  const text = await res.text()
  console.log(`Body:\n${text}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
