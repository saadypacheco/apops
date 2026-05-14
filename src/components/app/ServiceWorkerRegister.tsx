'use client'

import { useEffect } from 'react'

/**
 * Registra el Service Worker de la PWA al cargar la app (cliente).
 * - Solo en producción (en dev hace ruido + interfiere con HMR).
 * - Si el navegador no soporta SW (Safari viejos, navegadores embebidos),
 *   no hace nada — la app sigue funcionando como web normal.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          // Sin retry — si falla por algún motivo, la app sigue funcionando.
          console.warn('[SW] registro falló:', err)
        })
    }

    // Esperá window.load para no competir con el render inicial.
    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad, { once: true })
    return () => window.removeEventListener('load', onLoad)
  }, [])

  return null
}
