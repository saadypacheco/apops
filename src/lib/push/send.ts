// Helper de envío Web Push. Lee las VAPID keys del env y envía notif a
// cada subscription registrada del destinatario. Limpia subscriptions
// caducadas automáticamente (410 Gone).
//
// Si las env vars no están seteadas, sendPushToAfiliado devuelve { skipped }
// silenciosamente. Esto permite que la app siga funcionando aunque VAPID
// no esté configurado en el ambiente (ej. dev local).

import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:apops@apops.org.ar'

let configured = false

function ensureConfigured(): boolean {
  if (configured) return true
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
  configured = true
  return true
}

export type PushPayload = {
  /** Título visible de la notif del SO. */
  title: string
  /** Cuerpo del mensaje (1-2 líneas). */
  body: string
  /** URL relativa a abrir cuando el usuario hace click. */
  url?: string
  /** Tag para agrupar / reemplazar notif del mismo tipo. */
  tag?: string
}

export type SendResult = {
  total: number
  enviadas: number
  caducadas: number
  errores: number
  skipped?: 'no_vapid_config'
}

/**
 * Envía un push a todas las subscripciones de un afiliado. Devuelve un
 * resumen. Errores individuales por dispositivo (caducados, etc) se
 * manejan sin abortar — el resto recibe.
 */
export async function sendPushToAfiliado(
  admin: SupabaseClient<Database>,
  afiliadoId: string,
  payload: PushPayload,
): Promise<SendResult> {
  if (!ensureConfigured()) {
    return { total: 0, enviadas: 0, caducadas: 0, errores: 0, skipped: 'no_vapid_config' }
  }

  // Fetch subscriptions
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('afiliado_id', afiliadoId)

  const subscriptions = (subs ?? []) as Array<{
    id: string
    endpoint: string
    p256dh: string
    auth: string
  }>
  if (subscriptions.length === 0) {
    return { total: 0, enviadas: 0, caducadas: 0, errores: 0 }
  }

  const json = JSON.stringify(payload)
  let enviadas = 0
  let caducadas = 0
  let errores = 0

  // Enviamos en paralelo pero contenido
  await Promise.all(
    subscriptions.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          json,
        )
        enviadas++
        // Update last_used_at (best effort, no esperamos)
        admin
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', s.id)
          .then(() => {})
      } catch (e) {
        const status =
          typeof e === 'object' && e !== null && 'statusCode' in e
            ? (e as { statusCode: number }).statusCode
            : 0
        if (status === 404 || status === 410) {
          // Subscription caducada / desuscripta — borrar
          caducadas++
          await admin.from('push_subscriptions').delete().eq('id', s.id)
        } else {
          errores++
          console.warn('[push] error envío:', status, e instanceof Error ? e.message : e)
        }
      }
    }),
  )

  return {
    total: subscriptions.length,
    enviadas,
    caducadas,
    errores,
  }
}
