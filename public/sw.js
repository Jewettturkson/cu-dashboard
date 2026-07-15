// CU Dashboard service worker
// Strategy: static assets cache-first (they're content-hashed);
// everything else network-first with cache fallback, so the app
// opens and the banker's last-loaded client list is usable offline.
const CACHE = 'cu-cache-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return
  // Never cache auth/session endpoints
  if (url.pathname.startsWith('/auth')) return

  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(png|ico|svg|woff2?)$/)) {
    // Immutable assets: cache-first
    event.respondWith(
      caches.open(CACHE).then(async cache => {
        const hit = await cache.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) cache.put(req, res.clone())
        return res
      })
    )
    return
  }

  // Pages + RSC payloads: network-first, fall back to last good copy
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then(cache => cache.put(req, copy))
        }
        return res
      })
      .catch(async () => {
        const hit = await caches.match(req)
        if (hit) return hit
        return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
      })
  )
})
