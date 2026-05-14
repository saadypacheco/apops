'use client'

import { useEffect, useState } from 'react'
import { subscribePush, unsubscribePush } from '@/lib/push/actions'

type Status =
  | 'loading'
  | 'unsupported'
  | 'no_vapid'
  | 'denied'
  | 'default'
  | 'enabled'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const out = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    out[i] = rawData.charCodeAt(i)
  }
  return out
}

export function EnablePushButton() {
  const [status, setStatus] = useState<Status>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(() => {
    let mounted = true
    async function init() {
      if (typeof window === 'undefined') return
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        if (mounted) setStatus('unsupported')
        return
      }
      if (!publicKey) {
        if (mounted) setStatus('no_vapid')
        return
      }
      const permission = Notification.permission
      if (permission === 'denied') {
        if (mounted) setStatus('denied')
        return
      }
      try {
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        if (mounted) {
          setStatus(existing ? 'enabled' : permission === 'granted' ? 'default' : 'default')
        }
      } catch {
        if (mounted) setStatus('default')
      }
    }
    init()
    return () => {
      mounted = false
    }
  }, [publicKey])

  async function activar() {
    if (!publicKey) return
    setBusy(true)
    setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'default')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // ArrayBuffer compat: PushManager.subscribe acepta BufferSource
          // pero el tipo TS exige ArrayBuffer puro (no SharedArrayBuffer)
          applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
        }))
      const json = sub.toJSON() as {
        endpoint: string
        keys?: { p256dh?: string; auth?: string }
      }
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setError('La subscripción del navegador vino incompleta.')
        return
      }
      const res = await subscribePush({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setStatus('enabled')
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No pudimos activar las notificaciones.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function desactivar() {
    setBusy(true)
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await unsubscribePush(sub.endpoint)
      }
      setStatus('default')
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No pudimos desactivar las notificaciones.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <p className="text-sm text-brand-muted">Verificando notificaciones…</p>
      </div>
    )
  }

  if (status === 'unsupported') {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <h3 className="text-sm font-semibold text-brand-ink">
          Notificaciones no soportadas
        </h3>
        <p className="mt-1 text-xs text-brand-muted">
          Este navegador no soporta Web Push. Probá desde Chrome (Android,
          desktop) o Safari con la app instalada en home screen (iOS).
        </p>
      </div>
    )
  }

  if (status === 'no_vapid') {
    return (
      <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
        <h3 className="text-sm font-semibold text-amber-900">
          Notificaciones push no configuradas
        </h3>
        <p className="mt-1 text-xs text-amber-900">
          El admin del sistema todavía no configuró las VAPID keys. Mientras
          tanto, las notif se ven solo dentro de la app (con la campanita 🔔).
        </p>
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <h3 className="text-sm font-semibold text-brand-ink">
          Notificaciones bloqueadas
        </h3>
        <p className="mt-1 text-xs text-brand-muted">
          Bloqueaste las notificaciones para este sitio. Para reactivarlas
          tenés que ir a la configuración del navegador → permisos del sitio
          → notificaciones → permitir.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-card">
      <div>
        <h3 className="text-sm font-semibold text-brand-ink">
          {status === 'enabled'
            ? '✓ Notificaciones activadas'
            : 'Recibir notificaciones'}
        </h3>
        <p className="mt-1 text-xs text-brand-muted">
          {status === 'enabled'
            ? 'Vas a recibir notificaciones del sistema operativo cuando llegue algo nuevo: mensajes del gremio, movimientos en tu edificio, novedades.'
            : 'Activá las notificaciones para que te lleguen al celular aunque la app esté cerrada. Útil para no perderte mensajes de la CD o tu delegado/a.'}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {status === 'enabled' ? (
          <button
            type="button"
            onClick={desactivar}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-brand-muted hover:bg-neutral-50 disabled:opacity-50"
          >
            {busy ? 'Desactivando…' : 'Desactivar'}
          </button>
        ) : (
          <button
            type="button"
            onClick={activar}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-card hover:bg-brand-blue/90 disabled:opacity-50"
          >
            {busy ? 'Activando…' : '🔔 Activar notificaciones'}
          </button>
        )}
      </div>

      {status === 'default' && (
        <p className="text-[10px] text-brand-muted">
          💡 En iPhone tenés que tener la app instalada en home screen (desde
          el botón Compartir → Agregar a Inicio) para que esto funcione.
        </p>
      )}
    </div>
  )
}
