'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

// =====================================================================
// Solicitudes de afiliación online — flujo separado de solicitudes_pendientes.
// Aprobar/rechazar acá NO crea afiliado todavía (eso requiere coordinar con
// ANSES por el descuento del 3%). Solo cambia estado + registra quién y cuándo.
// El envío de email automático al solicitante queda pendiente (feature C).
// =====================================================================

async function resolverAfiliacion(
  solicitudId: string,
  body: { accion: 'aprobar' } | { accion: 'rechazar'; motivo: string },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await getCurrentAfiliado()
  if (!session || session.rol !== 'admin') {
    return { ok: false, message: 'No tenés permisos.' }
  }

  const admin = createAdminClient()

  // 1. Verificar que existe y está pendiente o en_revision
  const { data: solic } = await admin
    .from('solicitudes_afiliacion')
    .select('id, estado')
    .eq('id', solicitudId)
    .maybeSingle()
  if (!solic) {
    return { ok: false, message: 'No encontramos la solicitud.' }
  }
  if (solic.estado !== 'pendiente' && solic.estado !== 'en_revision') {
    return { ok: false, message: 'La solicitud ya fue resuelta.' }
  }

  // 2. Update con estado nuevo + audit
  const update =
    body.accion === 'aprobar'
      ? {
          estado: 'aprobada' as const,
          procesado_at: new Date().toISOString(),
          procesado_por: session.afiliadoId,
          motivo_rechazo: null,
        }
      : {
          estado: 'rechazada' as const,
          motivo_rechazo: body.motivo,
          procesado_at: new Date().toISOString(),
          procesado_por: session.afiliadoId,
        }

  const { error } = await admin
    .from('solicitudes_afiliacion')
    .update(update)
    .eq('id', solicitudId)
  if (error) {
    return { ok: false, message: 'No pudimos actualizar la solicitud.' }
  }

  // 3. Audit log
  await admin.from('audit_log').insert({
    evento:
      body.accion === 'aprobar'
        ? 'afiliacion_aprobada'
        : 'afiliacion_rechazada',
    afiliado_id: session.afiliadoId,
    metadata: {
      solicitud_id: solicitudId,
      motivo: body.accion === 'rechazar' ? body.motivo : null,
    },
  })

  return { ok: true }
}

export async function aprobarAfiliacion(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const id = formData.get('solicitud_id')?.toString() ?? ''
  if (!id) return { error: 'Solicitud inválida.' }

  const result = await resolverAfiliacion(id, { accion: 'aprobar' })
  if (!result.ok) return { error: result.message }

  revalidatePath('/admin')
  return { success: 'Afiliación aprobada. Recordá coordinar el alta en ANSES.' }
}

export async function rechazarAfiliacion(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const id = formData.get('solicitud_id')?.toString() ?? ''
  const motivo = formData.get('motivo_rechazo')?.toString().trim() ?? ''
  if (!id) return { error: 'Solicitud inválida.' }
  if (motivo.length < 5) {
    return { error: 'Tenés que indicar un motivo de rechazo.' }
  }

  const result = await resolverAfiliacion(id, { accion: 'rechazar', motivo })
  if (!result.ok) return { error: result.message }

  revalidatePath('/admin')
  return { success: 'Afiliación rechazada.' }
}
