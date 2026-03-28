const CACHE_NAME = 'sporcu-paneli-v2'
const OFFLINE_PAGE = '/offline.html'

const PRECACHE = [
  '/',
  '/dashboard',
  '/athletes',
  '/payments',
  '/attendance',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase')) return
  if (event.request.url.includes('fonts.googleapis') || event.request.url.includes('fonts.gstatic')) return

  // Network first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && response.type !== 'opaque') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request).then(cached => cached || new Response(
        '<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>🏅 Sporcu Paneli</h2><p>İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      )))
  )
})

// Push notification handling
self.addEventListener('push', event => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'Sporcu Paneli', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      if (list.length) return list[0].focus()
      return clients.openWindow('/')
    })
  )
})
