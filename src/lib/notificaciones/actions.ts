'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentAfiliado } from '@/lib/auth/role'
import {
  enviarNotificacionFormSchema,
  responderHiloFormSchema,
  type NotifFormState,
} from '@/types/notificaciones'
import { puedeEnviarA } from './queries'

// =====================================================================
// enviarNotificacion — crea N hilos paralelos (uno por destinatario)
// =====================================================================
//
// Permisos según rol del autor — validados con puedeEnviarA() para cada
// destinatario. Si alguno no es válido, se filtra silenciosamente y
// reportamos el conteo final al usuario.

export async function enviarNotificacion(
  _prev: NotifFormState,
  formData: FormData,
): Promise<NotifFormState> {
  const session = await getCurrentAfiliado()
  if (!session) {
    return { error: 'Sesión expirada. Iniciá sesión de nuevo.' }
  }

  const raw = {
    asunto: (formData.get('asunto')?.toString() ?? '').trim(),
    mensaje: (formData.get('mensaje')?.toString() ?? '').trim(),
    destinatarios: formData.getAll('destinatarios').map(String),
  }

  const parsed = enviarNotificacionFormSchema.safeParse(raw)
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return {
      fieldErrors: {
        asunto: fe.asunto?.[0],
        mensaje: fe.mensaje?.[0],
        destinatarios: fe.destinatarios?.[0],
      },
    }
  }

  // Validar permisos para cada destinatario
  const destinatariosValidos: string[] = []
  for (const destId of parsed.data.destinatarios) {
    const ok = await puedeEnviarA(session, destId)
    if (ok) destinatariosValidos.push(destId)
  }

  if (destinatariosValidos.length === 0) {
    return {
      error: 'Ninguno de los destinatarios seleccionados es válido para tu rol.',
    }
  }

  const admin = createAdminClient()
  const ahora = new Date().toISOString()

  // Crear N hilos
  const hilosToInsert = destinatariosValidos.map((destId) => ({
    autor_id: session.afiliadoId,
    destinatario_id: destId,
    asunto: parsed.data.asunto,
    ultimo_mensaje_at: ahora,
    leido_destinatario: false,
    leido_autor: true,
  }))

  const { data: hilosCreados, error: errHilos } = await admin
    .from('hilos_notificacion')
    .insert(hilosToInsert)
    .select('id')
  if (errHilos || !hilosCreados) {
    return { error: 'No pudimos enviar la notificación. Intentá de nuevo.' }
  }

  // Crear 1 mensaje por hilo
  const mensajesToInsert = hilosCreados.map((h) => ({
    hilo_id: h.id,
    autor_id: session.afiliadoId,
    mensaje: parsed.data.mensaje,
  }))
  const { error: errMsj } = await admin
    .from('mensajes_notificacion')
    .insert(mensajesToInsert)
  if (errMsj) {
    // Rollback de los hilos creados
    const ids = hilosCreados.map((h) => h.id)
    await admin.from('hilos_notificacion').delete().in('id', ids)
    return { error: 'No pudimos enviar la notificación. Intentá de nuevo.' }
  }

  // Audit
  await admin.from('audit_log').insert({
    evento: 'notificacion_enviada',
    afiliado_id: session.afiliadoId,
    metadata: {
      asunto: parsed.data.asunto,
      destinatarios_count: destinatariosValidos.length,
      destinatarios_solicitados: parsed.data.destinatarios.length,
    },
  })

  // Push notifications — best effort, no abortamos si falla.
  // Se dispara a las suscripciones de cada destinatario.
  try {
    const { sendPushToAfiliado } = await import('@/lib/push/send')
    const bodyPreview =
      parsed.data.mensaje.length > 100
        ? parsed.data.mensaje.slice(0, 100) + '…'
        : parsed.data.mensaje
    await Promise.all(
      destinatariosValidos.map((destId, idx) => {
        const hiloId = hilosCreados[idx]?.id
        return sendPushToAfiliado(admin, destId, {
          title: parsed.data.asunto,
          body: bodyPreview,
          url: hiloId ? `/notificaciones/${hiloId}` : '/notificaciones',
          tag: `hilo-${hiloId ?? destId}`,
        })
      }),
    )
  } catch (e) {
    console.warn('[notif.push] error:', e)
  }

  revalidatePath('/notificaciones')

  const filtrados =
    parsed.data.destinatarios.length - destinatariosValidos.length
  const hint =
    filtrados > 0
      ? ` (${filtrados} se filtraron por permisos)`
      : ''
  return {
    success: `Notificación enviada a ${destinatariosValidos.length} destinatario${destinatariosValidos.length > 1 ? 's' : ''}.${hint}`,
  }
}

// =====================================================================
// responderHilo — agrega un mensaje a un hilo existente
// =====================================================================

export async function responderHilo(
  _prev: { error?: string; success?: string },
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const session = await getCurrentAfiliado()
  if (!session) {
    return { error: 'Sesión expirada.' }
  }

  const raw = {
    hilo_id: formData.get('hilo_id')?.toString() ?? '',
    mensaje: (formData.get('mensaje')?.toString() ?? '').trim(),
  }

  const parsed = responderHiloFormSchema.safeParse(raw)
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return {
      error: fe.mensaje?.[0] ?? fe.hilo_id?.[0] ?? 'Datos inválidos.',
    }
  }

  const admin = createAdminClient()

  // Validar que el usuario es parte del hilo
  const { data: hilo } = await admin
    .from('hilos_notificacion')
    .select('id, autor_id, destinatario_id')
    .eq('id', parsed.data.hilo_id)
    .maybeSingle()
  if (!hilo) {
    return { error: 'Hilo no encontrado.' }
  }
  const yoSoyAutor = hilo.autor_id === session.afiliadoId
  const yoSoyDestinatario = hilo.destinatario_id === session.afiliadoId
  if (!yoSoyAutor && !yoSoyDestinatario) {
    return { error: 'No podés responder este hilo.' }
  }

  // Insertar mensaje
  const { error: errMsj } = await admin
    .from('mensajes_notificacion')
    .insert({
      hilo_id: parsed.data.hilo_id,
      autor_id: session.afiliadoId,
      mensaje: parsed.data.mensaje,
    })
  if (errMsj) {
    return { error: 'No pudimos enviar la respuesta.' }
  }

  // Actualizar el hilo:
  //   - ultimo_mensaje_at
  //   - el OTRO lado se marca como NO leído (le entró algo nuevo)
  //   - mi lado queda como leído (yo acabo de mandar el mensaje)
  const ahora = new Date().toISOString()
  if (yoSoyAutor) {
    await admin
      .from('hilos_notificacion')
      .update({
        ultimo_mensaje_at: ahora,
        leido_autor: true,
        leido_destinatario: false,
      })
      .eq('id', parsed.data.hilo_id)
  } else {
    await admin
      .from('hilos_notificacion')
      .update({
        ultimo_mensaje_at: ahora,
        leido_autor: false,
        leido_destinatario: true,
      })
      .eq('id', parsed.data.hilo_id)
  }

  revalidatePath('/notificaciones')
  revalidatePath(`/notificaciones/${parsed.data.hilo_id}`)

  return { success: 'Mensaje enviado.' }
}

// =====================================================================
// marcarHiloLeido — marca el lado correspondiente del hilo como leído
// =====================================================================
//
// Llamado cuando el usuario abre la vista del hilo. Idempotente: si ya
// estaba leído no hace nada.

export async function marcarHiloLeido(hiloId: string): Promise<void> {
  const session = await getCurrentAfiliado()
  if (!session) return

  const admin = createAdminClient()

  const { data: hilo } = await admin
    .from('hilos_notificacion')
    .select('id, autor_id, destinatario_id, leido_autor, leido_destinatario')
    .eq('id', hiloId)
    .maybeSingle()
  if (!hilo) return

  const yoSoyAutor = hilo.autor_id === session.afiliadoId
  const yoSoyDestinatario = hilo.destinatario_id === session.afiliadoId
  if (!yoSoyAutor && !yoSoyDestinatario) return

  // Idempotente
  if (yoSoyAutor && hilo.leido_autor) return
  if (yoSoyDestinatario && hilo.leido_destinatario) return

  if (yoSoyAutor) {
    await admin
      .from('hilos_notificacion')
      .update({ leido_autor: true })
      .eq('id', hiloId)
  } else {
    await admin
      .from('hilos_notificacion')
      .update({ leido_destinatario: true })
      .eq('id', hiloId)
  }

  revalidatePath('/notificaciones')
}

// =====================================================================
// Helpers de navegación (Server Action wrappers para usar como action de form)
// =====================================================================

export async function navegarANuevaNotificacion(): Promise<void> {
  redirect('/notificaciones/nueva')
}
