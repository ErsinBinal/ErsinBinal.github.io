import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../../service-worker.js', import.meta.url), 'utf8');

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const createHarness = ({ cache = {}, caches = {}, fetchImpl } = {}) => {
  const handlers = new Map();
  const cacheMock = {
    addAll: async () => {},
    add: async () => {},
    put: async () => {},
    ...cache
  };
  const cachesMock = {
    open: async () => cacheMock,
    match: async () => null,
    keys: async () => [],
    delete: async () => true,
    ...caches
  };
  const self = {
    location: { origin: 'https://ersinbinal.github.io' },
    clients: { claim: async () => {} },
    registration: { showNotification: async () => {} },
    skipWaiting: async () => {},
    addEventListener(type, handler) {
      handlers.set(type, handler);
    }
  };
  const quietConsole = { log() {}, warn() {}, error() {} };

  vm.runInContext(source, vm.createContext({
    self,
    caches: cachesMock,
    fetch: (...args) => fetchImpl?.(...args),
    clients: self.clients,
    console: quietConsole,
    URL,
    Request,
    Response
  }), { filename: 'service-worker.js' });

  return { handlers, cache: cacheMock, caches: cachesMock };
};

const createExtendableEvent = (request) => {
  const waitUntilPromises = [];
  let responsePromise = null;
  return {
    request,
    waitUntilPromises,
    get responsePromise() {
      return responsePromise;
    },
    waitUntil(promise) {
      waitUntilPromises.push(Promise.resolve(promise));
    },
    respondWith(promise) {
      responsePromise = Promise.resolve(promise);
    }
  };
};

test('service worker install fails when mandatory precache fails', async () => {
  const precacheError = new Error('precache unavailable');
  const { handlers } = createHarness({
    cache: { addAll: async () => { throw precacheError; } }
  });
  const event = createExtendableEvent();

  handlers.get('install')(event);

  assert.equal(event.waitUntilPromises.length, 1);
  await assert.rejects(event.waitUntilPromises[0], precacheError);
});

test('optional precache failures do not invalidate an installed critical shell', async () => {
  let optionalCalls = 0;
  const { handlers } = createHarness({
    cache: {
      addAll: async () => {},
      add: async () => {
        optionalCalls += 1;
        if (optionalCalls === 1) throw new Error('edge rollout miss');
      }
    }
  });
  const event = createExtendableEvent();

  handlers.get('install')(event);

  await assert.doesNotReject(event.waitUntilPromises[0]);
  assert.ok(optionalCalls > 1);
});

test('stale response revalidation stays alive until cache.put completes', async () => {
  const put = deferred();
  const cached = new Response('old', { status: 200 });
  const fresh = new Response('new', { status: 200 });
  const request = {
    method: 'GET',
    url: 'https://ersinbinal.github.io/assets/js/theme.js',
    mode: 'cors',
    destination: 'script'
  };
  const { handlers } = createHarness({
    cache: { put: () => put.promise },
    caches: { match: async () => cached },
    fetchImpl: async () => fresh
  });
  const event = createExtendableEvent(request);

  handlers.get('fetch')(event);

  assert.equal(event.waitUntilPromises.length, 1, 'revalidation must call waitUntil synchronously');
  assert.equal(await (await event.responsePromise).text(), 'old');

  let revalidationSettled = false;
  event.waitUntilPromises[0].then(() => { revalidationSettled = true; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(revalidationSettled, false, 'waitUntil must include pending cache.put');

  put.resolve();
  await event.waitUntilPromises[0];
  assert.equal(revalidationSettled, true);
});

test('cache miss response waits for cache.put before completing', async () => {
  const put = deferred();
  const request = {
    method: 'GET',
    url: 'https://ersinbinal.github.io/assets/css/common.css',
    mode: 'cors',
    destination: 'style'
  };
  const { handlers } = createHarness({
    cache: { put: () => put.promise },
    caches: { match: async () => null },
    fetchImpl: async () => new Response('fresh', { status: 200 })
  });
  const event = createExtendableEvent(request);

  handlers.get('fetch')(event);

  let responseSettled = false;
  event.responsePromise.then(() => { responseSettled = true; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(responseSettled, false, 'response must retain pending cache.put');

  put.resolve();
  assert.equal(await (await event.responsePromise).text(), 'fresh');
  assert.equal(responseSettled, true);
});

test('offline navigation falls back to the precached offline document', async () => {
  const offline = new Response('<h1>cached offline</h1>', {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
  const request = {
    method: 'GET',
    url: 'https://ersinbinal.github.io/games/neon-river.html',
    mode: 'navigate',
    destination: 'document'
  };
  const { handlers } = createHarness({
    caches: {
      match: async (target) => target === '/offline.html' ? offline : null
    },
    fetchImpl: async () => { throw new Error('offline'); }
  });
  const event = createExtendableEvent(request);

  handlers.get('fetch')(event);

  const response = await event.responsePromise;
  await Promise.all(event.waitUntilPromises);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /cached offline/);
});
