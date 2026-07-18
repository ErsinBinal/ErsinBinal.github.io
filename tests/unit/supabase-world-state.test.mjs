import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(
  new URL('../../assets/js/supabase-client.js', import.meta.url),
  'utf8'
);

const storage = () => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  key: () => null,
  length: 0
});

function createBackend({ user = { id: 'user-1' }, responses = [] } = {}) {
  const calls = [];
  const queue = [...responses];
  const builder = {
    select(columns) {
      calls.push({ type: 'select', columns });
      return this;
    },
    eq(column, value) {
      calls.push({ type: 'eq', column, value });
      return this;
    },
    upsert(payload, options) {
      calls.push({
        type: 'upsert',
        payload: JSON.parse(JSON.stringify(payload)),
        options
      });
      return this;
    },
    async maybeSingle() {
      calls.push({ type: 'maybeSingle' });
      return queue.shift() || { data: null, error: null };
    },
    async single() {
      calls.push({ type: 'single' });
      return queue.shift() || { data: null, error: null };
    }
  };
  const client = {
    auth: {
      getUser: async () => ({ data: { user }, error: null })
    },
    from(table) {
      calls.push({ type: 'from', table });
      return builder;
    }
  };
  const window = {
    CONVIVIUM_SUPABASE: {
      url: 'https://project.supabase.co',
      anonKey: 'public-anon-key'
    },
    sessionStorage: storage(),
    localStorage: storage(),
    supabase: { createClient: () => client },
    location: { origin: 'https://ersinbinal.github.io' }
  };
  const context = vm.createContext({
    window,
    document: { querySelector: () => null },
    fetch: async () => new Response('{}'),
    console: { log() {}, warn() {}, error() {} },
    URL,
    Date,
    Map
  });
  vm.runInContext(source, context, { filename: 'supabase-client.js' });
  return { backend: window.ConviviumBackend, calls };
}

test('World fetch retries without shards when the migration column is unavailable', async () => {
  const legacyRow = {
    unlocked: ['/vault'],
    inventory: ['shard'],
    discovered: ['/notes'],
    level: 3,
    updated_at: '2026-07-18T00:00:00.000Z'
  };
  const { backend, calls } = createBackend({
    responses: [
      { data: null, error: { message: 'column world_state.shards does not exist' } },
      { data: legacyRow, error: null }
    ]
  });

  assert.deepEqual(await backend.fetchWorldState(), legacyRow);
  assert.deepEqual(
    calls.filter((call) => call.type === 'select').map((call) => call.columns),
    [
      'unlocked, inventory, discovered, level, shards, updated_at',
      'unlocked, inventory, discovered, level, updated_at'
    ]
  );
});

test('World save retries a sanitized legacy payload without shards', async () => {
  const saved = {
    unlocked: ['/vault', '/core'],
    inventory: ['shard'],
    discovered: ['/notes'],
    level: 99,
    updated_at: '2026-07-18T00:00:00.000Z'
  };
  const { backend, calls } = createBackend({
    responses: [
      { data: null, error: { message: "Could not find the 'shards' column" } },
      { data: saved, error: null }
    ]
  });

  const result = await backend.saveWorldState({
    unlocked: ['/vault', '/vault', '/core'],
    inventory: ['shard', 'shard'],
    discovered: ['/notes'],
    level: 140,
    shards: 1_500_000
  });
  assert.deepEqual(result, saved);

  const payloads = calls
    .filter((call) => call.type === 'upsert')
    .map((call) => call.payload);
  assert.equal(payloads.length, 2);
  assert.deepEqual(payloads[0].unlocked, ['/vault', '/core']);
  assert.deepEqual(payloads[0].inventory, ['shard']);
  assert.equal(payloads[0].level, 99);
  assert.equal(payloads[0].shards, 999999);
  assert.equal(Object.hasOwn(payloads[1], 'shards'), false);
});

test('World sync does not retry unrelated backend errors', async () => {
  const { backend: fetchBackend, calls: fetchCalls } = createBackend({
    responses: [{ data: null, error: { message: 'network unavailable' } }]
  });
  await assert.rejects(fetchBackend.fetchWorldState(), /network unavailable/);
  assert.equal(fetchCalls.filter((call) => call.type === 'from').length, 1);

  const { backend: saveBackend, calls: saveCalls } = createBackend({
    responses: [{ data: null, error: { message: 'permission denied' } }]
  });
  await assert.rejects(saveBackend.saveWorldState({ shards: 5 }), /permission denied/);
  assert.equal(saveCalls.filter((call) => call.type === 'from').length, 1);
});

test('World fetch is a no-op without a user and save stays explicitly guarded', async () => {
  const { backend, calls } = createBackend({ user: null });
  assert.equal(await backend.fetchWorldState(), null);
  await assert.rejects(
    backend.saveWorldState({ shards: 5 }),
    /once giris yapmalisiniz/
  );
  assert.equal(calls.filter((call) => call.type === 'from').length, 0);
});
