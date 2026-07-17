import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../../assets/js/supabase-client.js', import.meta.url), 'utf8');

const storage = () => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  key: () => null,
  length: 0
});

const createBackend = ({ session, fetchImpl }) => {
  const client = {
    auth: {
      getSession: async () => ({ data: { session }, error: null })
    }
  };
  const window = {
    CONVIVIUM_SUPABASE: {
      url: 'https://project.supabase.co',
      anonKey: 'public-anon-key'
    },
    CONVIVIUM_ORACLE_ENDPOINT: 'https://oracle.example',
    sessionStorage: storage(),
    localStorage: storage(),
    supabase: { createClient: () => client },
    location: { origin: 'https://ersinbinal.github.io' }
  };
  const context = vm.createContext({
    window,
    document: { querySelector: () => null },
    fetch: fetchImpl,
    console: { log() {}, warn() {}, error() {} },
    URL,
    Date,
    Map
  });
  vm.runInContext(source, context, { filename: 'supabase-client.js' });
  return window.ConviviumBackend;
};

test('profile enrichment stops before fetch when there is no authenticated session', async () => {
  let fetchCalled = false;
  const backend = createBackend({
    session: null,
    fetchImpl: async () => {
      fetchCalled = true;
      return new Response('{}');
    }
  });

  await assert.rejects(
    backend.predictProfileFromName('Ada', 'Lovelace'),
    /once giris yapmalisiniz/
  );
  assert.equal(fetchCalled, false);
});

test('profile enrichment carries the current Supabase bearer token', async () => {
  let captured;
  const backend = createBackend({
    session: { access_token: 'session-access-token' },
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return new Response(JSON.stringify({
        profession: 'Matematikci',
        provider: 'tavily',
        grounded: true,
        degraded: false
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  const result = await backend.predictProfileFromName('Ada', 'Lovelace');

  assert.equal(captured.url, 'https://oracle.example/enrich-profile');
  assert.equal(captured.init.headers.Authorization, 'Bearer session-access-token');
  assert.equal(result.profession, 'Matematikci');
  assert.equal(result.grounded, true);
});
