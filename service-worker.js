/**
 * Convivium - Service Worker
 * Offline destek ve cache yonetimi
 */

const CACHE_NAME = 'convivium-v221';
const OFFLINE_URL = '/offline.html';

// Cache'lenecek dosyalar
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/games/ash-runner.html',
  '/games/ash-runner-2.html',
  '/games/crude-buster.html',
  '/games/cyberpunk-logic-game.html',
  '/games/neon-river.html',
  '/games/neon-serpent.html',
  '/games/three-body-signal.html',
  '/games/universe-2.html',
  '/pages/makaleler.html',
  '/pages/ozgecmisim.html',
  '/pages/changelog.html',
  '/account/auth.html',
  '/account/dashboard.html',
  '/admin/',
  '/oracle/',
  '/holo/',
  '/arsiv/',
  '/tools/barista.html',
  '/tools/bartender.html',
  '/tools/bugy-studio.html',
  '/tools/dart-skorbord.html',
  '/tools/ekol-aynasi.html',
  '/tools/paradox-terminal.html',
  '/tools/the-realists-bar.html',
  '/offline.html',
  '/assets/css/common.css',
  '/assets/css/animations.css',
  '/assets/css/components.css?v=37',
  '/assets/css/dart-dashboard.css?v=6',
  '/assets/css/dashboard.css?v=1',
  '/assets/css/articles.css?v=4',
  '/assets/css/dart-skorbord.css?v=3',
  '/assets/css/arcade-kit.css?v=36',
  '/assets/css/neon-sheep.css?v=30',
  '/assets/css/bugy-v4.css?v=6',
  '/assets/css/bugy-cinema.css?v=3',
  '/assets/css/bugy-pet.css?v=7',
  '/assets/css/deb-companion.css?v=2',
  '/assets/css/home.css?v=34',
  '/assets/css/bugy-studio.css?v=3',
  '/assets/js/lazy-load.js',
  '/assets/js/theme.js',
  '/assets/js/utils.js',
  '/assets/js/arcade-kit.js?v=32',
  '/assets/js/neon-sheep.js?v=29',
  '/assets/js/bugy-v2.js?v=2',
  '/assets/js/bugy-v3-loader.js?v=6',
  '/assets/js/bugy-v4.js?v=12',
  '/assets/js/bugy-v4-cinema.js?v=4',
  '/assets/js/bugy-pet.js?v=12',
  '/assets/js/deb-companion.js?v=4',
  '/assets/js/home/routes.js?v=7',
  '/assets/js/home/route-commands.js?v=3',
  '/assets/js/home/guide-commands.js?v=1',
  '/assets/js/home/ruins.js?v=2',
  '/assets/js/home/ritual-pulse.js?v=1',
  '/assets/js/home/dreams.js?v=1',
  '/assets/js/home/world.js?v=2',
  '/assets/js/home/economy.js?v=1',
  '/assets/js/home/shop.js?v=1',
  '/assets/js/home/world-actions.js?v=1',
  '/assets/js/home/vfs.js?v=3',
  '/assets/js/home/navigator.js?v=2',
  '/assets/js/home/pipe-90.js?v=1',
  '/assets/js/home/outrun-86.js?v=1',
  '/assets/js/home/screen-saver.js?v=4',
  '/assets/js/home/presence.js?v=3',
  '/assets/js/home/coop-gate.js?v=1',
  '/assets/js/home/night-mode.js?v=1',
  '/assets/js/home/radio.js?v=1',
  '/assets/js/home/chat.js?v=5',
  '/assets/js/home/chat-symbols.js?v=1',
  '/assets/js/home/chat-deck.js?v=8',
  '/assets/js/sfx.js?v=19',
  '/assets/js/home-protocol.js?v=91',
  '/assets/js/bugy-studio.js?v=6',
  '/assets/js/service-worker-register.js?v=4',
  '/assets/js/origin-beacon.js?v=1',
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
  '/assets/js/supabase-client.js?v=41',
  '/assets/js/articles.js?v=7',
  '/assets/img/guides/apps-guide.svg',
  '/assets/img/guides/games-guide.svg',
  '/assets/img/guides/score-guide.svg',
  '/assets/img/guides/terminal-games-guide.svg',
  '/assets/img/guides/terminal-guide.svg',
  '/assets/js/auth-gate.js?v=22',
  '/assets/css/crude-buster.css?v=1',
  '/assets/js/crude-buster-net.js?v=2',
  '/assets/js/crude-buster.js?v=2',
  '/assets/js/dart-board-svg.js?v=3',
  '/assets/js/dart-online.js?v=2',
  '/assets/js/dart-atc.js?v=4',
  '/assets/js/dart-cricket.js?v=3',
  '/assets/js/dart-skorbord.js?v=10',
  '/assets/js/auth.js?v=6',
  '/assets/js/admin.js?v=37',
  '/assets/js/dashboard.js?v=37',
  '/manifest.json'
];

// GitHub Pages edge'leri yeni deploy'u ayni anda gormeyebilir. Bu nedenle
// yalniz surumsuz ve offline deneyimi tek basina ayakta tutan kucuk shell seti
// install icin zorunludur; diger deneyimler best-effort cache'lenir.
const CRITICAL_PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/assets/css/common.css'
];
const OPTIONAL_PRECACHE_ASSETS = PRECACHE_ASSETS.filter(
  (asset) => !CRITICAL_PRECACHE_ASSETS.includes(asset)
);

// Install event - precache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('[SW] Precaching critical shell');
        await cache.addAll(CRITICAL_PRECACHE_ASSETS);
        const optionalResults = await Promise.allSettled(
          OPTIONAL_PRECACHE_ASSETS.map((asset) => cache.add(asset))
        );
        const failedOptional = optionalResults.filter((result) => result.status === 'rejected').length;
        if (failedOptional) {
          console.warn(`[SW] Optional precache skipped: ${failedOptional}/${OPTIONAL_PRECACHE_ASSETS.length}`);
        }
      })
      .catch((err) => {
        console.error('[SW] Precache failed:', err);
        throw err;
      })
  );
});

// Yeni surum "waiting" durumunda bekler; sayfa "yenile" onayi verince
// SKIP_WAITING mesajiyla aktive olur (bayat sekme + karisik asset riskine son).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
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

const isSameOriginRequest = (request) => request.url.startsWith(self.location.origin);

const cacheResponse = async (request, response) => {
  if (!response || response.status !== 200 || !isSameOriginRequest(request)) return;
  const responseClone = response.clone();
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, responseClone);
};

const offlineDocument = async () => {
  const offlineResponse = await caches.match(OFFLINE_URL);
  return offlineResponse || new Response(
    '<h1>Offline</h1><p>Internet baglantisi yok.</p>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
};

const networkFirstDocument = (event) => {
  const networkPromise = fetch(event.request);
  const cacheUpdate = networkPromise.then((response) => cacheResponse(event.request, response));
  event.waitUntil(cacheUpdate.catch((error) => {
    console.warn('[SW] Document cache update failed:', error);
  }));

  return networkPromise.catch(async () => {
    const cachedResponse = await caches.match(event.request);
    return cachedResponse || offlineDocument();
  });
};

const fetchAndCache = async (request) => {
  const networkResponse = await fetch(request);
  await cacheResponse(request, networkResponse);
  return networkResponse;
};

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
    event.respondWith(networkFirstDocument(event));
    return;
  }

  const cachedPromise = caches.match(event.request).catch(() => null);
  const revalidatePromise = cachedPromise.then(async (cachedResponse) => {
    if (!cachedResponse) return;
    try {
      await fetchAndCache(event.request);
    } catch {
      // Stale cevap zaten hazir; arka plan ag hatasi kullanici akisini bozmaz.
    }
  });
  event.waitUntil(revalidatePromise);

  event.respondWith(cachedPromise.then(async (cachedResponse) => {
    if (cachedResponse) return cachedResponse;
    try {
      return await fetchAndCache(event.request);
    } catch {
      return new Response('', { status: 503, statusText: 'Service Unavailable' });
    }
  }));
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
