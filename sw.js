const CACHE_NAME = 'prince-cash-v1.4';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png',
  '/icon-192.png',
  '/icon-512.png'
];

// Install Service Worker and pre-cache essential shells
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline assets');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate & clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch standard static assets while keeping Firebase and dynamic APIs live
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip caching for Firebase Firestore / Authentication, live database, and hot reload sockets
  if (
    url.hostname.includes('firebase') || 
    url.hostname.includes('firestore') ||
    url.pathname.startsWith('/__/auth') ||
    url.pathname.includes('/ws') ||
    request.method !== 'GET'
  ) {
    return; // Pass through to browser network default
  }

  // Network-first with dynamic caching for local scripts/styles; cache-first for images
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return image or offline asset immediately, then fetch in background to refresh (Stale-While-Revalidate)
        if (request.destination === 'image' || url.pathname.endsWith('.svg') || url.pathname.endsWith('.png')) {
          return cachedResponse;
        }
      }

      return fetch(request)
        .then((networkResponse) => {
          // If response is valid, clone it and put in cache for offline availability
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return cachedResponse || caches.match('/');
        });
    })
  );
});
