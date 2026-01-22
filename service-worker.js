/**
 * Convivium - Service Worker
 * Offline destek ve cache yonetimi
 */

const CACHE_NAME = 'convivium-v1';
const OFFLINE_URL = '/offline.html';

// Cache'lenecek dosyalar
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/makaleler.html',
  '/ozgecmisim.html',
  '/assets/css/common.css',
  '/assets/css/animations.css',
  '/assets/css/components.css',
  '/assets/js/lazy-load.js',
  '/assets/js/theme.js',
  '/assets/js/utils.js',
  '/manifest.json'
];

// Install event - precache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Hemen aktif ol
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Precache failed:', err);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Tum client'lari kontrol et
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Sadece GET isteklerini isle
  if (event.request.method !== 'GET') {
    return;
  }

  // Chrome extension isteklerini atla
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Cache'de varsa, arka planda guncelle (stale-while-revalidate)
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              // Basarili response'u cache'e ekle
              if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseClone);
                  });
              }
              return networkResponse;
            })
            .catch(() => {
              // Network hatasi, cache'den dön
              return cachedResponse;
            });

          return cachedResponse;
        }

        // Cache'de yoksa network'ten al
        return fetch(event.request)
          .then((networkResponse) => {
            // Basarili response'u cache'e ekle
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  // Sadece ayni origin'den gelen dosyalari cache'le
                  if (event.request.url.startsWith(self.location.origin)) {
                    cache.put(event.request, responseClone);
                  }
                });
            }
            return networkResponse;
          })
          .catch(() => {
            // Offline ve cache'de yok - offline sayfasi goster
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL)
                .then((offlineResponse) => {
                  return offlineResponse || new Response(
                    '<h1>Offline</h1><p>Internet baglantisi yok.</p>',
                    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
                  );
                });
            }
            // Diger istekler icin bos response
            return new Response('', { status: 503, statusText: 'Service Unavailable' });
          });
      })
  );
});

// Push notification (opsiyonel, gelecek icin)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'Yeni bir bildirim var!',
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Convivium', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Acik pencere varsa ona odaklan
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // Yoksa yeni pencere ac
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
