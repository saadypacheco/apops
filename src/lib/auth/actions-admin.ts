'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentAfiliado } from './role'

// Server Actions usadas desde el panel admin para invocar la Edge Function
// resolver-pendiente con el JWT del invocante (la Edge Function valida rol
// admin via roles_admin).

interface ResolverResult {
  ok: true
  status: 'aprobada' | 'rechazada'
  afiliadoId?: string
}
interface ResolverError {
  ok: false
  message: string
}
type Outcome = ResolverResult | ResolverError

async function callResolver(
  solicitudId: string,
  body: Record<string, unknown>,
): Promise<Outcome> {
  const session = await getCurrentAfiliado()
  if (!session || session.rol !== 'admin') {
    return { ok: false, message: 'No tenés permisos.' }
  }

  const supabase = createClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const jwt = sessionData.session?.access_token
  if (!jwt) return { ok: false, message: 'Sesión expirada.' }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return { ok: false, message: 'Configuración inválida.' }

  let res: Response
  try {
    res = await fetch(`${url}/functions/v1/resolver-pendiente`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ solicitud_id: solicitudId, ...body }),
    })
  } catch {
    return { ok: false, message: 'No pudimos conectar con el servidor.' }
  }

  let parsed: unknown = null
  try {
    parsed = await res.json()
  } catch {
    parsed = null
  }
  const data = (parsed ?? {}) as Record<string, unknown>

  if (res.status === 200 && (data['status'] === 'aprobada' || data['status'] === 'rechazada')) {
    return {
      ok: true,
      status: data['status'] as 'aprobada' | 'rechazada',
      afiliadoId: typeof data['afiliado_id'] === 'string' ? data['afiliado_id'] : undefined,
    }
  }

  return {
    ok: false,
    message:
      typeof data['error'] === 'string'
        ? (data['error'] as string)
        : 'No pudimos procesar la solicitud.',
  }
}

export async function aprobarSolicitud(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const id = formData.get('solicitud_id')?.toString() ?? ''
  if (!id) return { error: 'Solicitud inválida.' }

  const result = await callResolver(id, { accion: 'aprobar' })
  if (!result.ok) return { error: result.message }

  revalidatePath('/admin')
  return { success: 'Solicitud aprobada. Se envió el email con el enlace.' }
}

export async function rechazarSolicitud(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const id = formData.get('solicitud_id')?.toString() ?? ''
  const motivo = formData.get('motivo_rechazo')?.toString().trim() ?? ''
  if (!id) return { error: 'Solicitud inválida.' }
  if (motivo.length < 5) {
    return { error: 'Tenés que indicar un motivo de rechazo.' }
  }

  const result = await callResolver(id, {
    accion: 'rechazar',
    motivo_rechazo: motivo,
  })
  if (!result.ok) return { error: result.message }

  revalidatePath('/admin')
  return { success: 'Solicitud rechazada. Se notificó al solicitante.' }
}

export async function navegarPanelAdmin(): Promise<void> {
  redirect('/admin')
}
