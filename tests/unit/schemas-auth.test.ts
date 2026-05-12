import { describe, expect, it } from 'vitest'
import {
  cambioClaveFormSchema,
  dniSchema,
  emailSchema,
  identifierSchema,
  legajoSchema,
  loginConClaveFormSchema,
  loginMagicLinkFormSchema,
  passwordSchema,
  registroFormSchema,
  solicitarAccesoFormSchema,
} from '@/types/auth'

describe('dniSchema', () => {
  it.each(['12345678', '1234567', '  12345678  '])(
    'acepta %s',
    (input) => {
      expect(dniSchema.parse(input)).toBe(input.trim())
    },
  )

  it.each([
    ['', 'vacío'],
    ['123456', '6 dígitos'],
    ['123456789', '9 dígitos'],
    ['1234567A', 'con letra'],
    ['12.345.678', 'con puntos'],
  ])('rechaza %s (%s)', (input) => {
    expect(dniSchema.safeParse(input).success).toBe(false)
  })
})

describe('legajoSchema', () => {
  it.each(['L-1234', 'ABC123', 'L-9999-X', '  L-1234  '])(
    'acepta %s',
    (input) => {
      expect(legajoSchema.parse(input)).toBe(input.trim())
    },
  )

  it('rechaza menos de 3 chars', () => {
    expect(legajoSchema.safeParse('AB').success).toBe(false)
  })

  it('rechaza más de 20 chars', () => {
    expect(legajoSchema.safeParse('A'.repeat(21)).success).toBe(false)
  })

  it.each(['L 1234', 'L.1234', 'L#1234', 'L_1234'])(
    'rechaza %s (chars inválidos)',
    (input) => {
      expect(legajoSchema.safeParse(input).success).toBe(false)
    },
  )
})

describe('emailSchema', () => {
  it('acepta email válido y lo normaliza a lowercase + trim', () => {
    expect(emailSchema.parse('  USER@Example.COM  ')).toBe('user@example.com')
  })

  it.each(['', 'noemail', 'a@', '@b.com', 'a@b'])(
    'rechaza %s',
    (input) => {
      expect(emailSchema.safeParse(input).success).toBe(false)
    },
  )
})

describe('passwordSchema', () => {
  it('acepta 8 chars', () => {
    expect(passwordSchema.parse('12345678')).toBe('12345678')
  })

  it('acepta hasta 72 chars (límite bcrypt)', () => {
    expect(passwordSchema.parse('a'.repeat(72))).toBe('a'.repeat(72))
  })

  it('rechaza menos de 8 chars', () => {
    expect(passwordSchema.safeParse('1234567').success).toBe(false)
  })

  it('rechaza más de 72 chars', () => {
    expect(passwordSchema.safeParse('a'.repeat(73)).success).toBe(false)
  })
})

describe('identifierSchema', () => {
  it.each(['12345678', 'L-1234', 'ABC123'])('acepta %s', (input) => {
    expect(identifierSchema.parse(input)).toBe(input)
  })

  it('rechaza menos de 3 chars', () => {
    expect(identifierSchema.safeParse('AB').success).toBe(false)
  })

  it('rechaza más de 20 chars', () => {
    expect(identifierSchema.safeParse('A'.repeat(21)).success).toBe(false)
  })

  it.each(['L 1234', '12.345.678', 'L_1234'])(
    'rechaza %s (chars inválidos)',
    (input) => {
      expect(identifierSchema.safeParse(input).success).toBe(false)
    },
  )
})

describe('loginConClaveFormSchema', () => {
  it('acepta identifier + password no vacío', () => {
    const r = loginConClaveFormSchema.parse({
      identifier: '12345678',
      password: 'x',
    })
    expect(r).toEqual({ identifier: '12345678', password: 'x' })
  })

  it('rechaza password vacío', () => {
    const r = loginConClaveFormSchema.safeParse({
      identifier: '12345678',
      password: '',
    })
    expect(r.success).toBe(false)
  })

  it('rechaza identifier vacío', () => {
    const r = loginConClaveFormSchema.safeParse({
      identifier: '',
      password: 'algo',
    })
    expect(r.success).toBe(false)
  })

  it('a diferencia del registro, el login NO exige password de 8+ chars (chequea la cuenta guardada, no la fuerza)', () => {
    const r = loginConClaveFormSchema.parse({
      identifier: '12345678',
      password: 'corta',
    })
    expect(r.password).toBe('corta')
  })
})

describe('loginMagicLinkFormSchema', () => {
  it('acepta identifier válido', () => {
    expect(
      loginMagicLinkFormSchema.parse({ identifier: '12345678' }),
    ).toEqual({ identifier: '12345678' })
  })

  it('rechaza identifier vacío', () => {
    expect(
      loginMagicLinkFormSchema.safeParse({ identifier: '' }).success,
    ).toBe(false)
  })
})

describe('registroFormSchema', () => {
  it('acepta inputs válidos con clave', () => {
    const r = registroFormSchema.parse({
      identifier: '12345678',
      email: 'user@example.com',
      emailConfirm: 'user@example.com',
      password: 'unaclave',
    })
    expect(r).toEqual({
      identifier: '12345678',
      email: 'user@example.com',
      password: 'unaclave',
    })
  })

  it('acepta sin clave (string vacío) y lo transforma a undefined', () => {
    const r = registroFormSchema.parse({
      identifier: '12345678',
      email: 'user@example.com',
      emailConfirm: 'user@example.com',
      password: '',
    })
    expect(r.password).toBeUndefined()
  })

  it('rechaza emailConfirm distinto a email', () => {
    const r = registroFormSchema.safeParse({
      identifier: '12345678',
      email: 'a@b.com',
      emailConfirm: 'c@d.com',
      password: 'unaclave',
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      const flat = r.error.flatten().fieldErrors
      expect(flat.emailConfirm?.[0]).toBe('Los emails no coinciden.')
    }
  })

  it('rechaza clave de 7 chars (cuando viene)', () => {
    const r = registroFormSchema.safeParse({
      identifier: '12345678',
      email: 'a@b.com',
      emailConfirm: 'a@b.com',
      password: '1234567',
    })
    expect(r.success).toBe(false)
  })

  it('normaliza emails a lowercase aún cuando vienen en mayúsculas en ambos', () => {
    const r = registroFormSchema.parse({
      identifier: '12345678',
      email: 'USER@EXAMPLE.COM',
      emailConfirm: 'user@example.com',
      password: '',
    })
    expect(r.email).toBe('user@example.com')
  })
})

describe('solicitarAccesoFormSchema', () => {
  it('acepta sin legajo y sin motivo (caso "sin_legajo")', () => {
    const r = solicitarAccesoFormSchema.parse({
      dni: '12345678',
      legajo: '',
      nombre: 'Juan Pérez',
      email: 'a@b.com',
      emailConfirm: 'a@b.com',
      motivo: '',
    })
    expect(r).toEqual({
      dni: '12345678',
      legajo: undefined,
      nombre: 'Juan Pérez',
      email: 'a@b.com',
      motivo: undefined,
    })
  })

  it('acepta con legajo y lo normaliza a uppercase (caso "activo")', () => {
    const r = solicitarAccesoFormSchema.parse({
      dni: '12345678',
      legajo: 'l-1234',
      nombre: 'Juan',
      email: 'a@b.com',
      emailConfirm: 'a@b.com',
      motivo: '',
    })
    expect(r.legajo).toBe('L-1234')
  })

  it('preserva motivo cuando viene con contenido', () => {
    const r = solicitarAccesoFormSchema.parse({
      dni: '12345678',
      legajo: '',
      nombre: 'Juan',
      email: 'a@b.com',
      emailConfirm: 'a@b.com',
      motivo: 'Soy jubilado APOPS sin legajo activo',
    })
    expect(r.motivo).toBe('Soy jubilado APOPS sin legajo activo')
  })

  it('rechaza emailConfirm distinto', () => {
    const r = solicitarAccesoFormSchema.safeParse({
      dni: '12345678',
      legajo: '',
      nombre: 'Juan',
      email: 'a@b.com',
      emailConfirm: 'otro@c.com',
      motivo: '',
    })
    expect(r.success).toBe(false)
  })

  it('rechaza DNI inválido', () => {
    const r = solicitarAccesoFormSchema.safeParse({
      dni: '123',
      legajo: '',
      nombre: 'Juan',
      email: 'a@b.com',
      emailConfirm: 'a@b.com',
      motivo: '',
    })
    expect(r.success).toBe(false)
  })

  it('rechaza nombre de menos de 2 chars', () => {
    const r = solicitarAccesoFormSchema.safeParse({
      dni: '12345678',
      legajo: '',
      nombre: 'J',
      email: 'a@b.com',
      emailConfirm: 'a@b.com',
      motivo: '',
    })
    expect(r.success).toBe(false)
  })

  it('rechaza motivo de más de 500 chars', () => {
    const r = solicitarAccesoFormSchema.safeParse({
      dni: '12345678',
      legajo: '',
      nombre: 'Juan',
      email: 'a@b.com',
      emailConfirm: 'a@b.com',
      motivo: 'x'.repeat(501),
    })
    expect(r.success).toBe(false)
  })
})

describe('cambioClaveFormSchema', () => {
  it('acepta con actual vacío (caso post magic link)', () => {
    const r = cambioClaveFormSchema.parse({
      actual: '',
      nueva: 'nuevaclave',
      confirmar: 'nuevaclave',
    })
    expect(r).toEqual({
      actual: '',
      nueva: 'nuevaclave',
      confirmar: 'nuevaclave',
    })
  })

  it('acepta con actual completo', () => {
    const r = cambioClaveFormSchema.parse({
      actual: 'clavevieja',
      nueva: 'nuevaclave',
      confirmar: 'nuevaclave',
    })
    expect(r.actual).toBe('clavevieja')
  })

  it('rechaza nueva clave de 7 chars', () => {
    const r = cambioClaveFormSchema.safeParse({
      actual: '',
      nueva: '1234567',
      confirmar: '1234567',
    })
    expect(r.success).toBe(false)
  })

  it('rechaza si nueva ≠ confirmar', () => {
    const r = cambioClaveFormSchema.safeParse({
      actual: '',
      nueva: 'nuevaclave',
      confirmar: 'distinta1',
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      const flat = r.error.flatten().fieldErrors
      expect(flat.confirmar?.[0]).toBe('La confirmación no coincide.')
    }
  })
})
