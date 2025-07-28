// BUNGU SQUAD Service Worker for PWA functionality
// Update version to force SW update - Change this whenever you need to force update
const SW_VERSION = '2.0.1'; // Updated to force refresh
const CACHE_NAME = 'bungu-squad-v2';
const STATIC_CACHE = 'bungu-squad-static-v2';

// Assets to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/src/assets/main-character.png',
  '/src/assets/pencil-warrior.png',
  '/src/assets/tape-ninja.png'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - Network First strategy for better updates
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    // Try network first
    fetch(event.request)
      .then((fetchResponse) => {
        // Don't cache API calls or external resources
        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
          return fetchResponse;
        }

        // Cache the response
        const responseToCache = fetchResponse.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });

        return fetchResponse;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline fallback for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Push notification handling (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/src/assets/main-character.png',
        badge: '/src/assets/main-character.png',
        tag: 'bungu-squad-notification'
      })
    );
  }
});