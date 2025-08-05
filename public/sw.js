// BUNGU SQUAD Service Worker for PWA functionality with camera support
// Update version to force SW update - Change this whenever you need to force update
const SW_VERSION = '2.4.1'; // Production: Quiet API bypass logs
const CACHE_NAME = 'bungu-squad-v2-4-1';
const STATIC_CACHE = 'bungu-squad-static-v2-4-1';

// Debug flag - only show logs in development (localhost)
const DEBUG = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

// Assets to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/main-character.png',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Enhanced message handling for PWA camera permissions
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CAMERA_PERMISSION_REQUEST') {
    console.log('BUNGU SQUAD: Service Worker received camera permission request');
    // Notify client about camera permission handling
    event.ports[0].postMessage({type: 'CAMERA_PERMISSION_ACKNOWLEDGED'});
  }
});

// Install event - cache essential assets and force update
self.addEventListener('install', (event) => {
  if (DEBUG) console.log(`SW v${SW_VERSION} installing...`);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => {
        if (DEBUG) console.log(`SW v${SW_VERSION} installed, skipping waiting...`);
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  if (DEBUG) console.log(`SW v${SW_VERSION} activating...`);
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE)
            .map((cacheName) => {
              if (DEBUG) console.log(`Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        if (DEBUG) console.log(`SW v${SW_VERSION} claiming clients...`);
        return self.clients.claim();
      })
  );
});

// Fetch event - Network First strategy with proper API handling
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension, moz-extension and other extension schemes
  if (event.request.url.startsWith('chrome-extension://') ||
      event.request.url.startsWith('moz-extension://') ||
      event.request.url.startsWith('safari-extension://') ||
      event.request.url.startsWith('webkit-extension://')) {
    return;
  }
  
  // Don't interfere with camera/media requests
  if (event.request.url.includes('getUserMedia') || 
      event.request.url.includes('mediaDevices') ||
      event.request.destination === 'video' ||
      event.request.destination === 'audio' ||
      event.request.url.includes('blob:')) {
    return;
  }

  const url = new URL(event.request.url);
  
  // API endpoints: Never cache, always fetch fresh
  if (url.pathname.startsWith('/api/')) {
    if (DEBUG) console.log(`SW v${SW_VERSION}: Bypassing cache for API: ${url.pathname}`);
    event.respondWith(fetch(event.request));
    return;
  }

  // Static resources: Cache with error response prevention
  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      
      const fresh = fetch(event.request).then((response) => {
        // Only cache successful responses (200-299)
        if (response.ok && response.type === 'basic') {
          cache.put(event.request, response.clone());
        }
        return response;
      }).catch(() => cached); // Fallback to cache on network error

      // Return cached version immediately if available, otherwise wait for network
      return cached || fresh;
    })
  );
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/src/assets/main-character.png',
        badge: '/src/assets/main-character.png',
        tag: 'bungu-squad-notification',
        requireInteraction: true,
        actions: data.actions || []
      })
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action || 'default';
  const data = event.notification.data || {};
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if any client is already open
      for (let client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          // Send message to client about the notification action
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            action: action,
            data: data
          });
          return;
        }
      }
      
      // If no client is open, open a new window
      if (clients.openWindow) {
        let url = '/';
        switch (data.type) {
          case 'match_start':
            url = '/#/match-waiting';
            break;
          case 'match_approved':
            url = '/#/dashboard';
            break;
          case 'tournament_start':
            url = '/#/tournament-waiting';
            break;
          case 'your_turn':
            url = '/#/tournament-waiting';
            break;
          default:
            url = '/';
        }
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync for notifications (when online again)
self.addEventListener('sync', (event) => {
  if (event.tag === 'notification-sync') {
    event.waitUntil(
      // Check for pending notifications when back online
      self.registration.sync.register('check-pending-matches')
    );
  }
});