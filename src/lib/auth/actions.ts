'use server'

// Server Actions del flujo de auth v1.
//
// Las actions del wizard viejo (submitDniLegajo, submitDniSinLegajo,
// submitNombreCompleto, submitEmail) fueron reemplazadas por loginConClave
// y registrar en actions-v2.ts. Quedan acá:
//   - resendMagicLink (FR-017): reenvío del link sin reingresar datos.
//     Va a ser revisado en F3 cuando el flujo de magic link v2 lo absorba.
//   - logoutAction (FR-014): cerrar sesión + audit. Vigente.

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import {
  clearAuthContext,
  getRecentValidation,
  setRecentValidation,
  clearRecentValidation,
} from './auth-cookie'
import { solicitarMagicLink } from './solicitar-magic-link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// =====================================================================
// Action: resendMagicLink (FR-017)
// =====================================================================
// Reenvía el magic link sin reingresar DNI/legajo/email, leyendo la cookie
// de validación reciente. Si la cookie expiró, redirige al login.
// La Edge Function solicitar-magic-link igual re-valida contra padrón
// (defense in depth).

export async function resendMagicLink(): Promise<void> {
  const rv = getRecentValidation()
  if (!rv) {
    redirect('/login')
  }

  const result = await solicitarMagicLink({
    dni: rv.dni,
    legajo: rv.legajo,
    nombreCompleto: rv.nombreCompleto,
    email: rv.email,
    flujo: rv.flujo,
  })

  if (!result.ok) {
    if (result.error.type === 'rate_limit') {
      redirect('/magic-link-expirado?reason=rate_limit')
    }
    clearRecentValidation()
    redirect('/login?error=resend_failed')
  }

  if (result.data.status === 'magic_link_sent') {
    setRecentValidation(rv)
    redirect('/magic-link-enviado')
  }

  clearRecentValidation()
  redirect('/pendiente-validacion')
}

// =====================================================================
// Action: logoutAction (FR-014)
// =====================================================================
// Cierra la sesión del usuario, registra el evento en audit_log con
// service_role (la sesión todavía está viva al momento de auditar) y
// redirige al login. Si no hay sesión activa, igual redirigimos a /login
// — es la pantalla esperada de "deslogueado".

export async function logoutAction(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const admin = createAdminClient()
    const { data: afiliado } = await admin
      .from('afiliados')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    const h = headers()
    const fwd = h.get('x-forwarded-for')
    const ip = fwd ? (fwd.split(',')[0]?.trim() ?? null) : h.get('x-real-ip')
    const userAgent = h.get('user-agent')

    await admin.from('audit_log').insert({
      evento: 'logout',
      afiliado_id: afiliado?.id ?? null,
      ip_address: ip,
      user_agent: userAgent,
      metadata: null,
    })

    await supabase.auth.signOut()
  }

  // Limpiar cookies de auth flow por si hubieran quedado (device compartido).
  clearAuthContext()
  clearRecentValidation()

  redirect('/')
}
