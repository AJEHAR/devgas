// GAS DEV Hub — Service Worker
// Versi cache: update ini bila ada perubahan pada static assets
const CACHE_NAME = 'gasdevhub-v1';

const STATIC_ASSETS = [
  '/devgas/',
  '/devgas/index.html',
  '/devgas/manifest.json',
  '/devgas/icon-192.png',
  '/devgas/icon-512.png'
];

// Domain yang MESTI bypass (jangan cache)
const BYPASS_DOMAINS = [
  'script.google.com',
  'googleapis.com',
  'google.com'
];

// ── Install: cache static assets ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: buang cache lama ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: bypass GAS/Google, cache-first untuk static ───────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Bypass: semua Google/GAS requests — biar browser handle terus
  const isBypass = BYPASS_DOMAINS.some(domain => url.hostname.includes(domain));
  if (isBypass) return; // no respondWith = browser default

  // Bypass: non-GET requests
  if (event.request.method !== 'GET') return;

  // Cache-first strategy untuk static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          // Simpan dalam cache kalau response ok
          if (response && response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: return cached index.html
          return caches.match('/devgas/index.html');
        });
    })
  );
});
