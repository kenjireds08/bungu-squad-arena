// BUNGU SQUAD Service Worker for PWA functionality with camera support
// Update version to force SW update - Change this whenever you need to force update
const SW_VERSION = '3.3.0'; // Fix: MIME type issues and cache problems
const CACHE_NAME = 'bungu-squad-v3-3-0';
const STATIC_CACHE = 'bungu-squad-static-v3-3-0';

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
        // Force immediate activation for critical updates
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up ALL old caches and claim clients
self.addEventListener('activate', (event) => {
  if (DEBUG) console.log(`SW v${SW_VERSION} activating...`);
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Delete ALL caches that don't match current version
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== CACHE_NAME) {
              if (DEBUG) console.log(`Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        if (DEBUG) console.log(`SW v${SW_VERSION} claiming clients...`);
        // Immediately take control of all clients
        return self.clients.claim();
      })
      .then(() => {
        // Notify all clients about the update
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_UPDATED',
              version: SW_VERSION,
              timestamp: Date.now()
            });
          });
        });
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
  
  // CRITICAL: Skip worker and script destinations to avoid SPA fallback issues
  const dest = event.request.destination;
  if (dest === 'worker' || dest === 'script') {
    if (DEBUG) console.log(`SW: Bypassing cache for ${dest}: ${event.request.url}`);
    return; // Let the browser handle these directly
  }
  
  // Don't interfere with camera/media requests
  if (event.request.url.includes('getUserMedia') || 
      event.request.url.includes('mediaDevices') ||
      event.request.destination === 'video' ||
      event.request.destination === 'audio' ||
      event.request.url.includes('blob:')) {
    return;
  }
  
  // Skip QR Scanner worker files specifically
  if (event.request.url.includes('qr-scanner-worker') || 
      event.request.url.includes('.worker.') ||
      event.request.url.includes('worker.min')) {
    if (DEBUG) console.log(`SW: Bypassing cache for worker file: ${event.request.url}`);
    return;
  }

  const url = new URL(event.request.url);
  
  // API endpoints: Never cache, always fetch fresh and NEVER retry
  if (url.pathname.startsWith('/api/')) {
    if (DEBUG) console.log(`SW v${SW_VERSION}: Bypassing cache for API: ${url.pathname}`);
    event.respondWith(
      fetch(event.request)
        .catch(error => {
          console.error(`SW v${SW_VERSION}: API fetch failed for ${url.pathname}:`, error);
          // Return error response instead of retrying
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Network error',
            message: 'ネットワークエラーが発生しました'
          }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // CRITICAL FIX: Never return HTML fallback for JS/CSS/assets
  // This prevents the "MIME type text/html" error
  const isNavigationRequest = event.request.mode === 'navigate';
  const isAssetRequest = 
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    event.request.destination === 'image' ||
    event.request.destination === 'font' ||
    url.pathname.includes('/assets/') ||
    url.pathname.includes('/_next/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.mjs') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.json');

  if (isAssetRequest) {
    // CRITICAL: Always fetch JS/CSS files fresh - NEVER cache or fallback to HTML
    if (url.pathname.endsWith('.js') || url.pathname.endsWith('.mjs') || 
        url.pathname.endsWith('.css') || url.pathname.includes('/assets/')) {
      event.respondWith(
        fetch(event.request, {
          cache: 'no-cache', // Force fresh fetch
          credentials: 'same-origin'
        })
          .then(response => {
            // Verify response is OK and has correct MIME type
            if (!response.ok) {
              console.error(`SW: Failed to fetch ${url.pathname}: ${response.status}`);
              return new Response('Not Found', { status: 404 });
            }
            
            const contentType = response.headers.get('content-type') || '';
            
            // Check MIME type for JS files
            if ((url.pathname.endsWith('.js') || url.pathname.endsWith('.mjs')) && 
                !contentType.includes('javascript')) {
              console.error(`SW: Invalid MIME type for JS: ${url.pathname} - ${contentType}`);
              return new Response('Invalid MIME type', { status: 500 });
            }
            
            // Check MIME type for CSS files
            if (url.pathname.endsWith('.css') && !contentType.includes('css')) {
              console.error(`SW: Invalid MIME type for CSS: ${url.pathname} - ${contentType}`);
              return new Response('Invalid MIME type', { status: 500 });
            }
            
            return response;
          })
          .catch(error => {
            console.error(`SW: Network error fetching ${url.pathname}:`, error);
            // NEVER return HTML for asset requests
            return new Response('Network Error', { status: 503 });
          })
      );
      return;
    }
    
    // For other assets: Try network first, fallback to cache, never HTML
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses - clone BEFORE any async operations
          if (response.ok) {
            const responseClone = response.clone();
            // Use async/await to ensure proper handling
            (async () => {
              try {
                const cache = await caches.open(STATIC_CACHE);
                await cache.put(event.request, responseClone);
              } catch (cacheError) {
                if (DEBUG) console.warn('Failed to cache asset:', cacheError);
              }
            })();
          }
          return response;
        })
        .catch(() => {
          // Try cache for assets
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            // For missing assets, return 404 instead of HTML
            return new Response('Not Found', { status: 404 });
          });
        })
    );
    return;
  }

  // Navigation requests (HTML pages): Network first with cache fallback
  if (isNavigationRequest) {
    event.respondWith(
      fetch(event.request, {
        credentials: 'same-origin',
        cache: 'default' // Use browser's default cache strategy
      })
        .then((response) => {
          // Only cache successful HTML responses
          if (response.ok && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then(cache => {
              cache.put(event.request, responseClone).catch(err => {
                if (DEBUG) console.warn('Failed to cache navigation:', err);
              });
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache for offline support
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            // Last resort: return root HTML for SPA routing
            return caches.match('/').then(root => {
              if (root) return root;
              return new Response('Offline', { status: 503 });
            });
          });
        })
    );
    return;
  }

  // Other requests: Network only
  event.respondWith(fetch(event.request));
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