'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentAfiliado } from '@/lib/auth/role'
import {
  mensajeDelegadoFormSchema,
  type MensajeFormState,
} from '@/types/mensajes'

// Server actions para mensajería delegado → CD.
//   - enviarMensaje: el delegado envía. Solo rol='delegado' puede.
//   - marcarLeido: cualquier admin marca un mensaje como leído.
// Todas usan service_role (admin client). RLS de la tabla es deny-by-default.

// =====================================================================
// enviarMensaje (delegado)
// =====================================================================

export async function enviarMensaje(
  _prev: MensajeFormState,
  formData: FormData,
): Promise<MensajeFormState> {
  const session = await getCurrentAfiliado()
  if (!session) {
    return { error: 'Sesión expirada. Iniciá sesión de nuevo.' }
  }
  if (session.rol !== 'delegado') {
    return { error: 'Solo los delegados pueden enviar mensajes.' }
  }

  const raw = {
    asunto: (formData.get('asunto')?.toString() ?? '').trim(),
    mensaje: (formData.get('mensaje')?.toString() ?? '').trim(),
  }

  const parsed = mensajeDelegadoFormSchema.safeParse(raw)
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return {
      fieldErrors: {
        asunto: fe.asunto?.[0],
        mensaje: fe.mensaje?.[0],
      },
    }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('mensajes_delegado').insert({
    delegado_id: session.afiliadoId,
    asunto: parsed.data.asunto,
    mensaje: parsed.data.mensaje,
  })
  if (error) {
    return { error: 'No pudimos enviar el mensaje. Probá de nuevo.' }
  }

  await admin.from('audit_log').insert({
    evento: 'mensaje_delegado_enviado',
    afiliado_id: session.afiliadoId,
    metadata: { asunto: parsed.data.asunto },
  })

  revalidatePath('/delegados')
  revalidatePath('/admin/mensajes')

  return { success: 'Mensaje enviado.' }
}

// =====================================================================
// marcarLeido (admin)
// =====================================================================

export async function marcarLeido(
  _prev: { error?: string; success?: string },
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const session = await getCurrentAfiliado()
  if (!session || session.rol !== 'admin') {
    return { error: 'No tenés permisos.' }
  }

  const id = formData.get('mensaje_id')?.toString() ?? ''
  if (!id) return { error: 'Mensaje inválido.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('mensajes_delegado')
    .update({
      leido: true,
      leido_por: session.afiliadoId,
      leido_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('leido', false) // idempotencia: si ya estaba leído, no toca
  if (error) {
    return { error: 'No pudimos marcar el mensaje como leído.' }
  }

  await admin.from('audit_log').insert({
    evento: 'mensaje_delegado_leido',
    afiliado_id: session.afiliadoId,
    metadata: { mensaje_id: id },
  })

  revalidatePath('/admin/mensajes')
  return { success: 'Marcado como leído.' }
}
