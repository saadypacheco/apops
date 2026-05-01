'use server'

// Server Actions del flujo de auth.
// Estas funciones corren server-side (Next.js Server Actions). Los forms en
// el cliente las invocan con useFormState. La cookie HTTP-only mantiene el
// contexto entre pantallas; las Edge Functions hacen la validación real.

import { redirect } from 'next/navigation'
import {
  dniLegajoFormSchema,
  dniSinLegajoFormSchema,
  emailFormSchema,
  type FormState,
} from '@/types/auth'
import { setAuthContext, getAuthContext, clearAuthContext } from './auth-cookie'
import { validarPadron } from './validar-padron'
import { solicitarMagicLink } from './solicitar-magic-link'

// El tipo FormState vive en @/types/auth porque archivos 'use server' solo
// pueden exportar async functions.

// =====================================================================
// Action: submitDniLegajo (sub-flujo activo)
// =====================================================================

export async function submitDniLegajo(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = {
    dni: (formData.get('dni')?.toString() ?? '').trim(),
    legajo: (formData.get('legajo')?.toString() ?? '').trim(),
  }

  const parsed = dniLegajoFormSchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.flatten().fieldErrors
    return {
      fieldErrors: {
        dni: issues.dni?.[0],
        legajo: issues.legajo?.[0],
      },
    }
  }

  const result = await validarPadron({
    dni: parsed.data.dni,
    legajo: parsed.data.legajo,
    flujo: 'activo',
  })

  if (!result.ok) {
    return { error: result.error.message }
  }

  // Persistir contexto en cookie HTTP-only
  if (result.data.match) {
    setAuthContext({
      flujo: 'activo',
      dni: parsed.data.dni,
      legajo: parsed.data.legajo,
      match: true,
      tipo: result.data.tipo,
    })
  } else {
    setAuthContext({
      flujo: 'activo',
      dni: parsed.data.dni,
      legajo: parsed.data.legajo,
      match: false,
      motivo: result.data.motivo,
    })
  }

  // Tanto match como no_match continúan a captura de email.
  // (El no_match desemboca en solicitud_pendiente cuando se envíe el email.)
  redirect('/email')
}

// =====================================================================
// Action: submitDniSinLegajo (sub-flujo sin_legajo — jubilados)
// =====================================================================

export async function submitDniSinLegajo(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = {
    dni: (formData.get('dni')?.toString() ?? '').trim(),
  }

  const parsed = dniSinLegajoFormSchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.flatten().fieldErrors
    return {
      fieldErrors: {
        dni: issues.dni?.[0],
      },
    }
  }

  const result = await validarPadron({
    dni: parsed.data.dni,
    flujo: 'sin_legajo',
  })

  if (!result.ok) {
    return { error: result.error.message }
  }

  if (result.data.match) {
    setAuthContext({
      flujo: 'sin_legajo',
      dni: parsed.data.dni,
      match: true,
      tipo: result.data.tipo,
    })
    redirect('/email')
  }

  setAuthContext({
    flujo: 'sin_legajo',
    dni: parsed.data.dni,
    match: false,
    motivo: result.data.motivo,
  })

  // sin_papel: el padrón tiene el nombre, va directo a /email y la solicitud
  // queda pendiente al enviar email.
  // dni_no_en_padron: corresponde a US3 — requerirá capturar nombre_completo
  // antes de /email (T058 en Phase 5). Por ahora redirigimos a /email igual y
  // la Edge Function devolverá nombre_completo_requerido si llegan a ese paso.
  redirect('/email')
}

// =====================================================================
// Action: submitEmail (cierra el flujo: dispara magic link o crea pendiente)
// =====================================================================

export async function submitEmail(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = getAuthContext()
  if (!ctx) {
    // Sesión de auth expirada. Al login.
    redirect('/login')
  }

  const raw = {
    email: (formData.get('email')?.toString() ?? '').trim(),
  }
  const parsed = emailFormSchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.flatten().fieldErrors
    return { fieldErrors: { email: issues.email?.[0] } }
  }

  const result = await solicitarMagicLink({
    dni: ctx.dni,
    legajo: ctx.legajo,
    nombreCompleto: ctx.nombreCompleto,
    email: parsed.data.email,
    flujo: ctx.flujo,
  })

  if (!result.ok) {
    if (result.error.type === 'validation' && result.error.code === 'email_invalido') {
      return { fieldErrors: { email: result.error.message } }
    }
    return { error: result.error.message }
  }

  clearAuthContext()
  if (result.data.status === 'magic_link_sent') {
    redirect('/magic-link-enviado')
  } else {
    redirect('/pendiente-validacion')
  }
}
