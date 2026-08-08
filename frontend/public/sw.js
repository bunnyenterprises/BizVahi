/* Business Vahi Service Worker
 * Caches app shell for offline use on iOS and Android
 * API calls always go to network (need fresh data)
 */

const CACHE_NAME = 'fintr-v1';
const OFFLINE_URL = '/offline.html';

// Files to cache immediately on install
const PRECACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE);
    }).catch(() => {
      // Don't fail install if some files can't be cached
    })
  );
  self.skipWaiting();
});

// ── Activate — clean old caches ──────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API calls — always go to network
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    event.respondWith(
      fetch(request).catch(() => {
        // If API fails (offline), return a JSON error
        if (request.headers.get('accept')?.includes('application/json')) {
          return new Response(
            JSON.stringify({ error: 'You are offline. Please check your internet connection.' }),
            { headers: { 'Content-Type': 'application/json' }, status: 503 }
          );
        }
      })
    );
    return;
  }

  // For HTML pages — network first, fall back to cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request)
            .then(cached => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  // For static assets (JS, CSS, images) — cache first, then network
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, copy));
        }
        return response;
      });
    })
  );
});

// ── Push Notifications (Android Chrome) ─────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Business Vahi', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
