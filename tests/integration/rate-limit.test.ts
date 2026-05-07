import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeServiceRoleClient } from '../rls/_helpers'
import {
  RATE_LIMIT_CONFIG,
  bloquearTemporal,
  checkRateLimit,
  desbloquear,
  isBloqueadoFromRow,
  recordAttempt,
} from '@/lib/auth/rate-limit'

// Tests de integración para el rate limiter del login v2.
// Usan la DB local — limpian sus propios registros por identifier para no
// interferir con otros tests.

const RUN_ID = Date.now().toString(36)
const IDENTIFIER = `rl-${RUN_ID}`
const IP = '203.0.113.99'

const client = makeServiceRoleClient()

async function cleanupAttempts(identifier: string, ip?: string) {
  const c = makeServiceRoleClient()
  await c.from('auth_attempts').delete().eq('identifier', identifier)
  if (ip) await c.from('auth_attempts').delete().eq('ip_address', ip)
}

beforeEach(async () => {
  await cleanupAttempts(IDENTIFIER, IP)
})

afterEach(async () => {
  await cleanupAttempts(IDENTIFIER, IP)
})

describe('checkRateLimit', () => {
  it('permite el primer intento', async () => {
    const result = await checkRateLimit({
      identifier: IDENTIFIER,
      ip: IP,
      client,
    })
    expect(result.ok).toBe(true)
  })

  it(`rechaza después de ${RATE_LIMIT_CONFIG.MAX_ATTEMPTS} fallos por identifier`, async () => {
    for (let i = 0; i < RATE_LIMIT_CONFIG.MAX_ATTEMPTS; i++) {
      await recordAttempt({
        identifier: IDENTIFIER,
        ip: null,
        exitoso: false,
        metodo: 'password',
        client,
      })
    }
    const result = await checkRateLimit({
      identifier: IDENTIFIER,
      ip: IP,
      client,
    })
    expect(result).toEqual({ ok: false, razon: 'too_many_attempts' })
  })

  it(`rechaza después de ${RATE_LIMIT_CONFIG.MAX_ATTEMPTS} fallos por IP`, async () => {
    // Mismos N fallos pero con identifiers distintos para aislar el conteo por IP
    for (let i = 0; i < RATE_LIMIT_CONFIG.MAX_ATTEMPTS; i++) {
      await recordAttempt({
        identifier: `${IDENTIFIER}-other-${i}`,
        ip: IP,
        exitoso: false,
        metodo: 'password',
        client,
      })
    }
    const result = await checkRateLimit({
      identifier: 'recien-llegado',
      ip: IP,
      client,
    })
    expect(result).toEqual({ ok: false, razon: 'too_many_attempts' })
    // Cleanup extra de los identifiers fantasma
    for (let i = 0; i < RATE_LIMIT_CONFIG.MAX_ATTEMPTS; i++) {
      await cleanupAttempts(`${IDENTIFIER}-other-${i}`)
    }
  })

  it('los intentos exitosos no cuentan al rate limit', async () => {
    for (let i = 0; i < RATE_LIMIT_CONFIG.MAX_ATTEMPTS + 3; i++) {
      await recordAttempt({
        identifier: IDENTIFIER,
        ip: IP,
        exitoso: true,
        metodo: 'password',
        client,
      })
    }
    const result = await checkRateLimit({
      identifier: IDENTIFIER,
      ip: IP,
      client,
    })
    expect(result.ok).toBe(true)
  })
})

describe('isBloqueadoFromRow', () => {
  it('devuelve false si bloqueado_hasta es null', () => {
    expect(isBloqueadoFromRow({ bloqueado_hasta: null })).toBe(false)
  })

  it('devuelve true si bloqueado_hasta es futuro', () => {
    const futuro = new Date(Date.now() + 60_000).toISOString()
    expect(isBloqueadoFromRow({ bloqueado_hasta: futuro })).toBe(true)
  })

  it('devuelve false si bloqueado_hasta es pasado', () => {
    const pasado = new Date(Date.now() - 60_000).toISOString()
    expect(isBloqueadoFromRow({ bloqueado_hasta: pasado })).toBe(false)
  })
})

describe('bloquearTemporal + desbloquear', () => {
  it('setea bloqueado_hasta y motivo, después limpia', async () => {
    // Necesito un afiliado real para mutar. Creo uno de prueba.
    const supabase = makeServiceRoleClient()
    const email = `rl-bloq+${RUN_ID}@test.local`
    // DNI sintético 8 dígitos: prefijo 888 + 5 dígitos de timestamp
    const dni = `888${Date.now().toString().slice(-5)}`

    const userRes = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (userRes.error || !userRes.data.user) {
      throw new Error(`createUser: ${userRes.error?.message}`)
    }
    const ins = await supabase
      .from('afiliados')
      .insert({
        auth_user_id: userRes.data.user.id,
        dni,
        legajo: `BL-${RUN_ID.slice(0, 6)}`,
        nombre: `Bloqueo Test ${RUN_ID}`,
        tipo: 'activo',
        email,
      })
      .select('id')
      .single()
    if (ins.error || !ins.data) {
      throw new Error(`insert afiliado: ${ins.error?.message}`)
    }
    const afiliadoId = ins.data.id

    try {
      await bloquearTemporal({
        afiliadoId,
        motivo: 'test',
        duracionMs: 60_000,
        client,
      })
      const after = await supabase
        .from('afiliados')
        .select('bloqueado_hasta, bloqueado_motivo')
        .eq('id', afiliadoId)
        .single()
      expect(after.data?.bloqueado_motivo).toBe('test')
      expect(isBloqueadoFromRow(after.data!)).toBe(true)

      await desbloquear({ afiliadoId, client })
      const after2 = await supabase
        .from('afiliados')
        .select('bloqueado_hasta, bloqueado_motivo')
        .eq('id', afiliadoId)
        .single()
      expect(after2.data?.bloqueado_hasta).toBeNull()
      expect(after2.data?.bloqueado_motivo).toBeNull()
    } finally {
      await supabase.from('afiliados').delete().eq('id', afiliadoId)
      await supabase.auth.admin.deleteUser(userRes.data.user.id)
    }
  })
})
