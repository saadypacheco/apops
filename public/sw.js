// Service Worker de APOPS Siempre.
//
// Responsabilidades:
//   1. Cumplir criterio "installable" de PWA.
//   2. Recibir Web Push events y mostrar la notificación del SO.
//   3. Manejar el click en la notif (abrir/foco en la URL).
//
// No cachea recursos — la app sigue funcionando online y se actualiza
// instantáneo en cada deploy de Vercel.

self.addEventListener('install', (event) => {
  // Toma control de inmediato (no espera tabs viejas)
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Passthrough — sin cache
self.addEventListener('fetch', () => {})

// =====================================================================
// Push: el server hace POST al endpoint, este SW recibe el data y
// muestra la notif. El payload viene como JSON con { title, body, url, tag }.
// =====================================================================

self.addEventListener('push', (event) => {
  let data = { title: 'APOPS Siempre', body: 'Tenés una nueva notificación' }
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() }
    }
  } catch (e) {
    console.warn('[sw] push payload no es JSON:', e)
  }

  const title = data.title || 'APOPS Siempre'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'apops-default',
    data: { url: data.url || '/' },
    // Vibration pattern (Android). iOS lo ignora.
    vibrate: [120, 60, 120],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// =====================================================================
// Click en la notif: abrir/foco en la URL del payload.
// Si ya hay una ventana abierta de la app, foco en esa.
// =====================================================================

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si hay una ventana de la app, navego ahí
        for (const client of clientList) {
          if ('focus' in client) {
            if ('navigate' in client) {
              client.navigate(targetUrl)
            }
            return client.focus()
          }
        }
        // Sin ventana abierta — abrimos una nueva
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
        return null
      }),
  )
})
