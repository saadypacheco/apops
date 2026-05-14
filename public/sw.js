// Service Worker mínimo de APOPS Siempre.
//
// Por ahora solo cumple el criterio "installable" de PWA (necesario para
// que el browser muestre el botón de instalar y para que iOS permita push).
// No cachea recursos — la app sigue funcionando online y se actualiza
// instantáneo en cada deploy de Vercel.
//
// PRÓXIMO: cuando esté VAPID + push real, sumamos:
//   - self.addEventListener('push', ...) para mostrar notificaciones
//   - self.addEventListener('notificationclick', ...) para abrir URLs

self.addEventListener('install', (event) => {
  // Toma control de inmediato (no espera tabs viejas)
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Toma control de clients ya abiertos
  event.waitUntil(self.clients.claim())
})

// fetch passthrough: no cacheamos nada (red transparente)
self.addEventListener('fetch', () => {
  // sin handler explícito = el browser maneja la request normalmente
})
