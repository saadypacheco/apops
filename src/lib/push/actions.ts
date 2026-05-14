'use server'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentAfiliado } from '@/lib/auth/role'

// Server actions para gestionar suscripciones Web Push del afiliado logueado.
// El cliente llama a estas funciones desde EnablePushButton.tsx después de
// que el browser le devolvió una PushSubscription.

export type SubscribePushInput = {
  endpoint: string
  p256dh: string
  auth: string
}

export type SubscribePushResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

export async function subscribePush(
  input: SubscribePushInput,
): Promise<SubscribePushResult> {
  const session = await getCurrentAfiliado()
  if (!session) return { ok: false, error: 'Sesión expirada.' }

  if (!input.endpoint || !input.p256dh || !input.auth) {
    return { ok: false, error: 'Subscription incompleta.' }
  }

  const admin = createAdminClient()
  const userAgent = headers().get('user-agent') ?? null

  // Upsert por endpoint (unique). Si el browser re-subscribe con la misma
  // sub, actualizamos last_used_at + user_agent + afiliado.
  const { data, error } = await admin
    .from('push_subscriptions')
    .upsert(
      {
        afiliado_id: session.afiliadoId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        user_agent: userAgent,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    )
    .select('id')
    .single()

  if (error) {
    console.error('[push.subscribe] error:', error.message)
    return { ok: false, error: 'No pudimos guardar la suscripción.' }
  }
  return { ok: true, id: data.id }
}

export async function unsubscribePush(
  endpoint: string,
): Promise<{ ok: boolean }> {
  const session = await getCurrentAfiliado()
  if (!session) return { ok: false }

  const admin = createAdminClient()
  await admin
    .from('push_subscriptions')
    .delete()
    .eq('afiliado_id', session.afiliadoId)
    .eq('endpoint', endpoint)
  return { ok: true }
}
