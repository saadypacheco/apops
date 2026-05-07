import { describe, expect, it } from 'vitest'
import { parseIdentifier } from '@/lib/auth/identifier'

describe('parseIdentifier', () => {
  describe('DNI', () => {
    it.each([
      ['12345678', '12345678'], // 8 dígitos
      ['1234567', '1234567'], // 7 dígitos
      ['  12345678  ', '12345678'], // trim
    ])('reconoce %s como DNI', (input, expected) => {
      expect(parseIdentifier(input)).toEqual({
        tipo: 'dni',
        valor: expected,
      })
    })
  })

  describe('Legajo', () => {
    it.each([
      ['L-1234', 'L-1234'], // formato típico ANSES
      ['l-1234', 'L-1234'], // normaliza a uppercase
      ['ABC123', 'ABC123'], // sin guion
      ['  L-9999  ', 'L-9999'], // trim
      ['123456', '123456'], // 6 dígitos (no es DNI: requiere 7-8)
      ['123456789', '123456789'], // 9 dígitos (no es DNI: requiere 7-8)
    ])('reconoce %s como legajo', (input, expected) => {
      expect(parseIdentifier(input)).toEqual({
        tipo: 'legajo',
        valor: expected,
      })
    })
  })

  describe('Edge cases', () => {
    it('respeta el guion en legajos', () => {
      expect(parseIdentifier('L-9999-X')).toEqual({
        tipo: 'legajo',
        valor: 'L-9999-X',
      })
    })

    it('un DNI con letra no es DNI sino legajo', () => {
      expect(parseIdentifier('1234567A')).toEqual({
        tipo: 'legajo',
        valor: '1234567A',
      })
    })
  })
})
