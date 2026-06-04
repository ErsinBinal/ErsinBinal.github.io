/**
 * Convivium - Service Worker
 * Offline destek ve cache yonetimi
 */

const CACHE_NAME = 'convivium-v56';
const OFFLINE_URL = '/offline.html';

// Cache'lenecek dosyalar
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/ash-runner.html',
  '/cyberpunk-logic-game.html',
  '/dart-skorbord.html',
  '/universe-2.html',
  '/makaleler.html',
  '/auth.html',
  '/admin.html',
  '/dashboard.html',
  '/assets/css/common.css',
  '/assets/css/animations.css',
  '/assets/css/components.css?v=31',
  '/assets/css/articles.css?v=3',
  '/assets/css/dart-skorbord.css',
  '/assets/css/arcade-kit.css?v=36',
  '/assets/css/neon-sheep.css?v=30',
  '/assets/css/deb-companion.css?v=2',
  '/assets/css/home.css?v=2',
  '/assets/js/lazy-load.js',
  '/assets/js/theme.js',
  '/assets/js/utils.js',
  '/assets/js/arcade-kit.js?v=32',
  '/assets/js/neon-sheep.js?v=29',
  '/assets/js/bugy-v2.js?v=2',
  '/assets/js/bugy-v3-loader.js?v=5',
  '/assets/js/deb-companion.js?v=3',
  '/assets/js/home-protocol.js?v=4',
  '/assets/js/service-worker-register.js?v=2',
  '/assets/vendor/kenney/roguelike-characters/roguelikeChar_transparent.png?v=1',
  '/assets/vendor/kenney/smoke-particles/whitePuff00.png?v=1',
  '/assets/vendor/kenney/smoke-particles/whitePuff04.png?v=1',
  '/assets/vendor/kenney/smoke-particles/whitePuff08.png?v=1',
  '/assets/vendor/kenney/smoke-particles/whitePuff12.png?v=1',
  '/assets/vendor/kenney/smoke-particles/whitePuff16.png?v=1',
  '/assets/vendor/kenney/smoke-particles/blackSmoke00.png?v=1',
  '/assets/vendor/kenney/smoke-particles/blackSmoke04.png?v=1',
  '/assets/vendor/kenney/smoke-particles/blackSmoke08.png?v=1',
  '/assets/vendor/kenney/smoke-particles/blackSmoke12.png?v=1',
  '/assets/vendor/kenney/smoke-particles/blackSmoke16.png?v=1',
  '/assets/vendor/kenney/smoke-particles/flash00.png?v=1',
  '/assets/vendor/kenney/smoke-particles/flash02.png?v=1',
  '/assets/vendor/kenney/smoke-particles/flash04.png?v=1',
  '/assets/vendor/kenney/smoke-particles/flash06.png?v=1',
  '/assets/vendor/kenney/smoke-particles/flash08.png?v=1',
  '/assets/vendor/kenney/smoke-particles/explosion00.png?v=1',
  '/assets/vendor/kenney/smoke-particles/explosion03.png?v=1',
  '/assets/vendor/kenney/smoke-particles/explosion06.png?v=1',
  '/assets/vendor/kenney/smoke-particles/explosion08.png?v=1',
  '/assets/js/supabase-client.js?v=23',
  '/assets/js/articles.js?v=3',
  '/assets/js/auth-gate.js?v=21',
  '/assets/js/dart-skorbord.js?v=1',
  '/assets/js/auth.js',
  '/assets/js/admin.js?v=37',
  '/assets/js/dashboard.js?v=22',
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

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin === self.location.origin && requestUrl.pathname === '/assets/js/supabase-config.js') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // Sayfa gezinmelerinde once network'e git; oyun HTML'leri eski cache'de kalmasin.
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) return cachedResponse;
              return caches.match(OFFLINE_URL)
                .then((offlineResponse) => {
                  return offlineResponse || new Response(
                    '<h1>Offline</h1><p>Internet baglantisi yok.</p>',
                    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
                  );
                });
            });
        })
    );
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
