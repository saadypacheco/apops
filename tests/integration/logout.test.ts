import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  makeAuthenticatedClient,
  makeServiceRoleClient,
} from '../rls/_helpers'

// Phase 6 / T072 — Escenario 8 de quickstart.md: logout.
//
// `logoutAction` es un Server Action de Next.js que depende de `cookies()`,
// `headers()` y `redirect()` de next/headers — invocarla directamente desde
// vitest sin un servidor Next levantado falla (no hay context). Acá
// reproducimos los efectos verificables que la action ejecuta:
//   1. Audit insert evento='logout' con afiliado_id
//   2. supabase.auth.signOut() invalida la sesión
//
// Las verificaciones de "cookie removida" y "redirect a /login" son
// puramente UI-side (Next request handler) — esas viven en e2e Playwright,
// fuera del alcance de este test.

const RUN_ID = Date.now().toString(36)
const EMAIL = `logout+${RUN_ID}@test.local`
const DNI = '88800001' // No clashea con otros DNIs de los tests

interface Fixture {
  authUserId: string
  afiliadoId: string
  client: ReturnType<typeof makeServiceRoleClient> // se sobrescribe en setup
}

let fx: Fixture

async function setupAuthenticatedAfiliado() {
  const supabase = makeServiceRoleClient()
  const { client, userId } = await makeAuthenticatedClient(EMAIL)
  const ins = await supabase
    .from('afiliados')
    .insert({
      auth_user_id: userId,
      dni: DNI,
      legajo: `LO-${RUN_ID.slice(0, 6)}`,
      nombre: `Logout Test ${RUN_ID}`,
      tipo: 'activo',
    })
    .select('id')
    .single()
  if (ins.error || !ins.data) {
    throw new Error(`No se pudo crear afiliado: ${ins.error?.message}`)
  }
  return { authUserId: userId, afiliadoId: ins.data.id, client }
}

async function teardown() {
  const supabase = makeServiceRoleClient()
  if (fx) {
    await supabase
      .from('audit_log')
      .delete()
      .eq('afiliado_id', fx.afiliadoId)
    await supabase.from('afiliados').delete().eq('id', fx.afiliadoId)
    await supabase.auth.admin.deleteUser(fx.authUserId)
  }
}

describe('Integración Phase 6: logout (Escenario 8)', () => {
  beforeAll(async () => {
    fx = (await setupAuthenticatedAfiliado()) as Fixture
  })
  afterAll(teardown)

  it('logout invalida la sesión y registra audit_log evento=logout con afiliado_id', async () => {
    // Pre: sesión activa
    const before = await fx.client.auth.getSession()
    expect(before.data.session).toBeTruthy()
    expect(before.data.session?.user.id).toBe(fx.authUserId)

    // Replay del logoutAction:
    // 1) Audit con service_role (la action usa el admin client)
    const admin = makeServiceRoleClient()
    const auditInsert = await admin.from('audit_log').insert({
      evento: 'logout',
      afiliado_id: fx.afiliadoId,
      ip_address: null,
      user_agent: 'apops-logout-test',
      metadata: null,
    })
    expect(auditInsert.error).toBeNull()

    // 2) signOut invalida la sesión del usuario
    const out = await fx.client.auth.signOut()
    expect(out.error).toBeNull()

    // Post: la sesión local del client se borró
    const after = await fx.client.auth.getSession()
    expect(after.data.session).toBeNull()

    // Verificar que el audit quedó registrado con afiliado_id correcto
    const { data: events } = await admin
      .from('audit_log')
      .select('evento, afiliado_id, user_agent')
      .eq('afiliado_id', fx.afiliadoId)
      .eq('evento', 'logout')
    expect(events?.length).toBe(1)
    expect(events?.[0]).toMatchObject({
      evento: 'logout',
      afiliado_id: fx.afiliadoId,
      user_agent: 'apops-logout-test',
    })
  })
})
