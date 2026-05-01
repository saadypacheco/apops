import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { makeServiceRoleClient } from '../rls/_helpers'
import type { Database } from '@/lib/supabase/types'

// US1 happy path — Escenario 1 de quickstart.md
// Reproduce: trabajador con DNI/legajo en padrón APOPS=true, ingresa email,
// recibe magic link, autentica, queda con tipo='activo' y session válida.

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const MAILPIT_URL = 'http://127.0.0.1:54324'

const DNI = '30000001'
const LEGAJO = 'L-0001'
const RUN_ID = Date.now().toString(36)
const EMAIL = `happy-${DNI}+${RUN_ID}@test.local`

async function callSolicitarMagicLink(body: unknown) {
  const res = await fetch(`${FUNCTIONS_URL}/solicitar-magic-link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

async function purgeMailpit(): Promise<void> {
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: 'DELETE' })
}

interface MailpitMessage {
  ID: string
  Subject: string
  To: { Address: string }[]
}

async function waitForEmailTo(
  address: string,
  timeoutMs = 10000,
): Promise<MailpitMessage> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`,
    )
    if (res.ok) {
      const data = (await res.json()) as { messages: MailpitMessage[] }
      if (data.messages.length > 0) return data.messages[0]!
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`No llegó email para ${address} en ${timeoutMs}ms`)
}

async function cleanupAll(): Promise<void> {
  const admin = makeServiceRoleClient()
  const { data: af } = await admin
    .from('afiliados')
    .select('auth_user_id')
    .eq('dni', DNI)
  if (af) {
    for (const row of af) {
      if (row.auth_user_id) await admin.auth.admin.deleteUser(row.auth_user_id)
    }
  }
  await admin.from('afiliados').delete().eq('dni', DNI)
  await admin.from('audit_log').delete().eq('dni_intentado', DNI)
  // borra cualquier user con email del test run
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  for (const u of list.data.users) {
    if (u.email?.includes(`+${RUN_ID}@test.local`)) {
      await admin.auth.admin.deleteUser(u.id)
    }
  }
  await purgeMailpit()
}

describe('Integración: flujo activo happy path (US1)', () => {
  beforeAll(cleanupAll)
  afterAll(cleanupAll)
  beforeEach(cleanupAll)

  it('crea afiliado tipo=activo, despacha email, audita y permite autenticar', async () => {
    // 1. Solicitar magic link end-to-end
    const res = await callSolicitarMagicLink({
      dni: DNI,
      legajo: LEGAJO,
      email: EMAIL,
      flujo: 'activo',
    })
    expect(res.status).toBe(200)
    expect(res.body['status']).toBe('magic_link_sent')

    // 2. Verificar afiliado creado con tipo='activo' y datos del padrón
    const admin = makeServiceRoleClient()
    const { data: afiliado } = await admin
      .from('afiliados')
      .select('dni, legajo, tipo, estado, padron_id, nombre')
      .eq('dni', DNI)
      .single()
    expect(afiliado).toMatchObject({
      dni: DNI,
      legajo: LEGAJO,
      tipo: 'activo',
      estado: 'activo',
    })
    expect(afiliado?.padron_id).toBeTruthy()
    expect(afiliado?.nombre).toBeTruthy()

    // 3. Verificar email en Mailpit (subject del email custom enviado por
    //    la Edge Function vía SMTP, no del template default de gotrue)
    const msg = await waitForEmailTo(EMAIL)
    expect(msg.Subject.toLowerCase()).toContain('apops')

    // 4. Verificar audit completo del flujo
    const { data: events } = await admin
      .from('audit_log')
      .select('evento')
      .eq('dni_intentado', DNI)
      .order('created_at', { ascending: true })
    const eventos = events?.map((e) => e.evento) ?? []
    expect(eventos).toContain('magic_link_sent')

    // 5. Simular click del magic link (genera nuevo link y verifyOtp)
    //    No invocamos el callback Next.js (tests in-process); el route
    //    handler se cubre con e2e/Playwright en un paso futuro. Acá
    //    verificamos que la sesión se puede crear y que un cliente
    //    authenticated lee SU PROPIA fila de afiliados (RLS self-select).
    const link = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: EMAIL,
    })
    expect(link.error).toBeNull()
    const tokenHash = link.data.properties?.hashed_token
    expect(tokenHash).toBeTruthy()

    const userClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    const verified = await userClient.auth.verifyOtp({
      type: 'magiclink',
      token_hash: tokenHash!,
    })
    expect(verified.error).toBeNull()
    expect(verified.data.session).toBeTruthy()

    // 6. Lee su propio afiliado (verifica RLS self-select implícitamente)
    const { data: ownAfiliado, error } = await userClient
      .from('afiliados')
      .select('dni, tipo')
      .single()
    expect(error).toBeNull()
    expect(ownAfiliado).toMatchObject({ dni: DNI, tipo: 'activo' })
  }, 30000)
})
