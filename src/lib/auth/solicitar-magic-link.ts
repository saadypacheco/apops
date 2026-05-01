// Wrapper cliente de la Edge Function solicitar-magic-link.
// Tipos derivados del contrato: contracts/edge-solicitar-magic-link.json

import type { SubFlujo } from '@/types/auth'

export type SolicitarMagicLinkData =
  | { status: 'magic_link_sent'; emailSentTo: string | null }
  | { status: 'pendiente_validacion'; mensaje: string }

export type SolicitarMagicLinkError =
  | {
      type: 'validation'
      code:
        | 'dni_invalido'
        | 'email_invalido'
        | 'legajo_requerido'
        | 'nombre_completo_requerido'
        | 'flujo_invalido'
      message: string
    }
  | { type: 'conflict'; code: 'email_ya_usado_por_otro_dni'; message: string }
  | { type: 'rate_limit'; retryAfterSeconds: number; message: string }
  | { type: 'server'; message: string }

export type SolicitarMagicLinkOutcome =
  | { ok: true; data: SolicitarMagicLinkData }
  | { ok: false; error: SolicitarMagicLinkError }

export interface SolicitarMagicLinkInput {
  dni: string
  legajo?: string | undefined
  nombreCompleto?: string | undefined
  email: string
  flujo: SubFlujo
}

const SERVER_FALLBACK_MSG =
  'Tuvimos un problema. Intentá de nuevo en un momento.'

export async function solicitarMagicLink(
  input: SolicitarMagicLinkInput,
): Promise<SolicitarMagicLinkOutcome> {
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
    res = await fetch(`${url}/functions/v1/solicitar-magic-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        dni: input.dni,
        legajo: input.legajo,
        nombre_completo: input.nombreCompleto,
        email: input.email,
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

  if (res.status === 200 && body['status'] === 'magic_link_sent') {
    return {
      ok: true,
      data: {
        status: 'magic_link_sent',
        emailSentTo: (body['email_sent_to'] as string) ?? null,
      },
    }
  }
  if (res.status === 200 && body['status'] === 'pendiente_validacion') {
    return {
      ok: true,
      data: {
        status: 'pendiente_validacion',
        mensaje:
          (body['mensaje'] as string) ??
          'Estamos verificando tu afiliación.',
      },
    }
  }

  if (res.status === 400) {
    return {
      ok: false,
      error: {
        type: 'validation',
        code: body['code'] as 'dni_invalido' | 'email_invalido' | 'legajo_requerido' | 'nombre_completo_requerido' | 'flujo_invalido',
        message:
          (body['error'] as string) ??
          'Hay un problema con los datos ingresados.',
      },
    }
  }

  if (res.status === 409) {
    return {
      ok: false,
      error: {
        type: 'conflict',
        code: 'email_ya_usado_por_otro_dni',
        message:
          (body['error'] as string) ??
          'Este email ya está asociado a otro afiliado.',
      },
    }
  }

  if (res.status === 429) {
    return {
      ok: false,
      error: {
        type: 'rate_limit',
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
