// Wrapper cliente de la Edge Function validar-padron.
// Tipos derivados del contrato: contracts/edge-validar-padron.json
//
// Uso desde Server Action / Server Component / Client Component:
//   const outcome = await validarPadron({ dni, legajo, flujo: 'activo' })
//   if (outcome.ok) {
//     if (outcome.data.match) { /* tipo activo o jubilado */ }
//     else { /* motivo: dni_no_en_padron | sin_apops | sin_papel */ }
//   } else {
//     /* outcome.error.code: dni_invalido | legajo_requerido | rate_limit_* | server */
//   }

import type { SubFlujo, Tipo } from '@/types/auth'

export type MotivoNoMatch = 'dni_no_en_padron' | 'sin_apops' | 'sin_papel'

export type ValidarPadronData =
  | { match: true; tipo: Tipo }
  | { match: false; motivo: MotivoNoMatch }

export type ValidarPadronError =
  | {
      type: 'validation'
      code:
        | 'dni_invalido'
        | 'legajo_requerido'
        | 'legajo_no_aplica'
        | 'flujo_invalido'
      message: string
    }
  | {
      type: 'rate_limit'
      code: 'rate_limit_dni' | 'rate_limit_ip'
      retryAfterSeconds: number
      message: string
    }
  | { type: 'server'; message: string }

export type ValidarPadronOutcome =
  | { ok: true; data: ValidarPadronData }
  | { ok: false; error: ValidarPadronError }

export interface ValidarPadronInput {
  dni: string
  legajo?: string | undefined
  flujo: SubFlujo
}

const SERVER_FALLBACK_MSG =
  'Tuvimos un problema. Intentá de nuevo en un momento.'

export async function validarPadron(
  input: ValidarPadronInput,
): Promise<ValidarPadronOutcome> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return {
      ok: false,
      error: { type: 'server', message: SERVER_FALLBACK_MSG },
    }
  }

  let res: Response
  try {
    res = await fetch(`${url}/functions/v1/validar-padron`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        dni: input.dni,
        legajo: input.legajo,
        flujo: input.flujo,
      }),
    })
  } catch {
    return {
      ok: false,
      error: { type: 'server', message: SERVER_FALLBACK_MSG },
    }
  }

  let parsed: unknown = null
  try {
    parsed = await res.json()
  } catch {
    parsed = null
  }
  const body = (parsed ?? {}) as Record<string, unknown>

  if (res.status === 200 && body['match'] === true) {
    return {
      ok: true,
      data: { match: true, tipo: body['tipo'] as Tipo },
    }
  }
  if (res.status === 200 && body['match'] === false) {
    return {
      ok: true,
      data: { match: false, motivo: body['motivo'] as MotivoNoMatch },
    }
  }

  if (res.status === 400) {
    const code = body['code'] as
      | 'dni_invalido'
      | 'legajo_requerido'
      | 'legajo_no_aplica'
      | 'flujo_invalido'
    return {
      ok: false,
      error: {
        type: 'validation',
        code,
        message:
          (body['error'] as string) ??
          'Hay un problema con los datos ingresados.',
      },
    }
  }

  if (res.status === 429) {
    const code = body['code'] as 'rate_limit_dni' | 'rate_limit_ip'
    return {
      ok: false,
      error: {
        type: 'rate_limit',
        code,
        retryAfterSeconds: Number(body['retry_after_seconds'] ?? 3600),
        message:
          (body['error'] as string) ??
          'Demasiados intentos. Esperá un rato y volvé a probar.',
      },
    }
  }

  return {
    ok: false,
    error: {
      type: 'server',
      message: (body['error'] as string) ?? SERVER_FALLBACK_MSG,
    },
  }
}
