import { describe, expect, it } from 'vitest'
import { isBloqueadoFromRow } from '@/lib/auth/rate-limit'

// `now` inyectable hace estos tests determinísticos y baratos: no necesitan
// mockear Date global ni Date.now.

describe('isBloqueadoFromRow', () => {
  const now = new Date('2026-05-10T12:00:00.000Z')

  it('devuelve false si bloqueado_hasta es null', () => {
    expect(isBloqueadoFromRow({ bloqueado_hasta: null }, now)).toBe(false)
  })

  it('devuelve true si bloqueado_hasta es futuro', () => {
    const futuro = new Date(now.getTime() + 60_000).toISOString()
    expect(isBloqueadoFromRow({ bloqueado_hasta: futuro }, now)).toBe(true)
  })

  it('devuelve false si bloqueado_hasta es pasado', () => {
    const pasado = new Date(now.getTime() - 60_000).toISOString()
    expect(isBloqueadoFromRow({ bloqueado_hasta: pasado }, now)).toBe(false)
  })

  it('devuelve false si bloqueado_hasta es exactamente now (lock recién expirado libera)', () => {
    expect(
      isBloqueadoFromRow({ bloqueado_hasta: now.toISOString() }, now),
    ).toBe(false)
  })

  it('por default usa new Date() — si el lock fue ayer, está libre', () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    expect(isBloqueadoFromRow({ bloqueado_hasta: ayer })).toBe(false)
  })

  it('por default usa new Date() — si el lock es dentro de 1h, está bloqueado', () => {
    const enUnaHora = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    expect(isBloqueadoFromRow({ bloqueado_hasta: enUnaHora })).toBe(true)
  })
})
