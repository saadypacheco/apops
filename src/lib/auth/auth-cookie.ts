// Cookie HTTP-only de corta vida (10 min) que mantiene el contexto entre
// pantallas del flujo de auth (DNI/legajo → email → magic link).
//
// El cliente NUNCA puede leer ni escribir esta cookie (httpOnly). Solo la
// usan Server Actions y Server Components. La Edge Function igualmente
// re-valida server-side (defense in depth) — si un atacante manipulase el
// browser y rebuild la cookie, no bypasea la validación de padrón.

import { cookies } from 'next/headers'
import type { MotivoNoMatch } from './validar-padron'
import type { SubFlujo, Tipo } from '@/types/auth'

const COOKIE_NAME = 'apops-auth-ctx'
const TTL_SECONDS = 10 * 60

export interface AuthContext {
  flujo: SubFlujo
  dni: string
  legajo?: string
  // Resultado de validar-padron
  match: boolean
  // Solo cuando match=true
  tipo?: Tipo
  // Solo cuando match=false
  motivo?: MotivoNoMatch
  // Solo en sub-flujo sin_legajo cuando DNI no está en padrón (US3 fase posterior)
  nombreCompleto?: string
}

export function setAuthContext(ctx: AuthContext): void {
  cookies().set({
    name: COOKIE_NAME,
    value: JSON.stringify(ctx),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
  })
}

export function getAuthContext(): AuthContext | null {
  const raw = cookies().get(COOKIE_NAME)
  if (!raw) return null
  try {
    return JSON.parse(raw.value) as AuthContext
  } catch {
    return null
  }
}

export function clearAuthContext(): void {
  cookies().delete(COOKIE_NAME)
}
