const CACHE_NAME = 'sporcu-paneli-v3'

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
        '<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>Sporcu Paneli</h2><p>İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      )))
  )
})

// ─── Push notification handling ────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return
  let data = {}
  try {
    data = event.data.json()
  } catch (e) {
    data = { title: 'Sporcu Paneli', body: event.data.text() }
  }
  const title = data.title || 'Sporcu Paneli'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'sporcu-paneli',
    data: { url: data.url || '/dashboard', ...(data.data || {}) },
    requireInteraction: !!data.requireInteraction,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (list.length && 'focus' in list[0]) {
        list[0].navigate?.(url)
        return list[0].focus()
      }
      return clients.openWindow(url)
    })
  )
})

self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
      .then(() => fetch('/api/push/resubscribe', { method: 'POST' }).catch(() => {}))
  )
})
