import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const actionsSource = await readFile(
  new URL('../../assets/js/home/world-actions.js', import.meta.url),
  'utf8'
);
const protocolSource = await readFile(
  new URL('../../assets/js/home-protocol.js', import.meta.url),
  'utf8'
);

function normalizeCommand(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .trim()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/^[>/\\]+/, '')
    .replace(/[._-]+/g, ' ')
    .replace(/[^\w\s?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadFactory() {
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(actionsSource, context, { filename: 'world-actions.js' });
  return context.window.ConviviumHome.createWorldActions;
}

function createFixture(overrides = {}) {
  const state = {
    cwd: '/notes',
    inventory: [],
    unlocked: [],
    trail: [],
    ...overrides.state
  };
  const calls = [];
  const rooms = {
    '/': { locked: false },
    '/notes': { grants: { item: 'shard' } },
    '/vault': { locked: true, key: 'shard' },
    '/core': { locked: true, key: 'coolant' },
    '/atlas': { locked: true, key: 'prism' }
  };
  const createWorldActions = loadFactory();
  const actions = createWorldActions({
    normalizeCommand,
    resolvePath: (name) => name.startsWith('/') ? name : `/${name}`,
    getCurrentRoom: () => rooms[state.cwd] || null,
    getRoom: (path) => rooms[path] || null,
    getInventory: () => state.inventory,
    getUnlocked: () => state.unlocked,
    setInventory: (items) => {
      state.inventory = Array.from(items);
      calls.push(`setInventory:${state.inventory.join(',')}`);
    },
    setUnlocked: (paths) => {
      state.unlocked = Array.from(paths);
      calls.push(`setUnlocked:${state.unlocked.join(',')}`);
    },
    appendTrail: (entry) => {
      state.trail = [...state.trail, entry].slice(-4);
      calls.push(`appendTrail:${entry}`);
    },
    persist: () => calls.push('persist'),
    scheduleWorldSave: () => calls.push('scheduleWorldSave'),
    awardAccess: (amount) => calls.push(`awardAccess:${amount}`),
    refreshAccess: () => calls.push('refreshAccess'),
    playUnlockAudio: () => calls.push('playUnlockAudio'),
    awardShards: (amount, reason) => calls.push(`awardShards:${amount}:${reason}`),
    prodosPath: (path) => path === '/' ? '/CONVIVIUM' : `/CONVIVIUM${path.toUpperCase()}`,
    rankTitle: () => state.unlocked.includes('/atlas')
      ? 'ARCHITECT'
      : state.unlocked.includes('/vault') && state.unlocked.includes('/core')
        ? 'KEEPER'
        : state.unlocked.includes('/vault') || state.unlocked.includes('/core')
          ? 'INITIATE'
          : 'GEZGIN',
    currentObjective: () => state.unlocked.includes('/atlas')
      ? 'her sey tamam'
      : state.unlocked.includes('/vault') && state.unlocked.includes('/core')
        ? "shard'i coolant ile birlestir: use shard on coolant"
        : state.unlocked.includes('/vault')
          ? 'lab esigine git'
          : 'unlock vault',
    ...overrides.dependencies
  });
  return { createWorldActions, actions, state, calls };
}

test('World actions preserve take validation, mutation order and output', () => {
  const fixture = createFixture();
  const { actions, state, calls } = fixture;

  assert.equal(actions.take(), 'take: usage take <nesne>');
  assert.equal(actions.take('coolant'), 'take: "coolant" burada alinabilir degil.');
  assert.deepEqual(calls, []);
  assert.equal(
    actions.take('shard'),
    'aldin: shard. (+3 shard — inventory ile bak, sonra muhuru ac)'
  );
  assert.deepEqual(state.inventory, ['shard']);
  assert.deepEqual(state.trail, ['take:shard']);
  assert.deepEqual(calls, [
    'setInventory:shard',
    'appendTrail:take:shard',
    'persist',
    'scheduleWorldSave',
    'playUnlockAudio',
    'awardShards:3:take shard'
  ]);
  calls.length = 0;
  assert.equal(actions.take('shard'), 'take: shard zaten cantanda.');
  assert.deepEqual(calls, []);
});

test('World actions preserve unlock guards, mutation order and vault ceremony', () => {
  const { actions, state, calls } = createFixture({ state: { inventory: ['shard'] } });

  assert.equal(actions.unlock(), 'unlock: usage unlock <oda> [with <anahtar>]');
  assert.equal(actions.unlock('missing'), 'unlock: missing: boyle bir esik yok.');
  assert.equal(actions.unlock('notes'), 'unlock: /notes zaten acik.');
  assert.equal(actions.unlock('vault with coolant'), 'unlock: "coolant" bu muhru acmiyor.');
  assert.deepEqual(calls, []);

  assert.equal(actions.unlock('vault with shard'), [
    '] MUHUR COZULDU',
    '',
    '  /CONVIVIUM/VAULT acildi.',
    '  unvan: INITIATE',
    '',
    '  simdi: cd vault',
    '  sonraki: lab esigine git',
    ']'
  ].join('\n'));
  assert.deepEqual(state.unlocked, ['/vault']);
  assert.deepEqual(state.trail, ['unlock:/vault']);
  assert.deepEqual(calls, [
    'setUnlocked:/vault',
    'appendTrail:unlock:/vault',
    'persist',
    'scheduleWorldSave',
    'awardAccess:3',
    'refreshAccess',
    'playUnlockAudio',
    'awardShards:5:unlock /vault'
  ]);
  calls.length = 0;
  assert.equal(actions.unlock('vault'), 'unlock: /vault zaten cozuldu.');
  assert.deepEqual(calls, []);
});

test('World actions preserve missing-key, keeper and architect unlock branches', () => {
  const missingKey = createFixture({ state: { cwd: '/', inventory: [] } });
  assert.equal(
    missingKey.actions.unlock('core'),
    'unlock: /core icin "coolant" gerekiyor. Once onu bul ve take et.'
  );
  assert.deepEqual(missingKey.calls, []);

  const keeper = createFixture({
    state: { cwd: '/', inventory: ['coolant'], unlocked: ['/vault'] }
  });
  const keeperOutput = keeper.actions.unlock('core');
  assert.match(keeperOutput, /Iki iz de tamamlandi \(KEEPER\)/);
  assert.match(keeperOutput, /son iz: shard'i coolant ile birlestir/);

  const architect = createFixture({
    state: { cwd: '/', inventory: ['prism'], unlocked: ['/vault', '/core'] }
  });
  const architectOutput = architect.actions.unlock('atlas');
  assert.match(architectOutput, /Tum izler tamam\. Artik bir ARCHITECT'sin/);
  assert.match(architectOutput, /cd atlas ile son odayi gor/);
});

test('World actions preserve use guards, vault delegation and prism forge order', () => {
  const missing = createFixture({ state: { inventory: [] } });
  assert.equal(missing.actions.use(), 'use: usage use <nesne> on <hedef>');
  assert.equal(missing.actions.use('shard on vault'), 'use: "shard" cantanda yok. inventory ile bak.');
  assert.deepEqual(missing.calls, []);

  const noTarget = createFixture({ state: { inventory: ['shard'] } });
  assert.equal(noTarget.actions.use('shard'), 'use: shard neyin uzerinde? (use shard on <hedef>)');
  assert.equal(
    noTarget.actions.use('shard on coolant'),
    'use: prizma icin hem shard hem coolant gerekiyor (iki izi de bitir).'
  );
  assert.deepEqual(noTarget.calls, []);

  const vault = createFixture({ state: { inventory: ['shard'] } });
  assert.match(vault.actions.use('shard on vault'), /MUHUR COZULDU/);
  assert(vault.state.unlocked.includes('/vault'));
  assert(vault.calls.includes('awardShards:5:unlock /vault'));

  const forge = createFixture({ state: { inventory: ['shard', 'coolant'] } });
  assert.equal(
    forge.actions.use('shard on coolant'),
    'shard ve coolant birlesti -> prism doktun. simdi: unlock atlas'
  );
  assert.deepEqual(forge.state.inventory, ['shard', 'coolant', 'prism']);
  assert.deepEqual(forge.state.trail, ['forge:prism']);
  assert.deepEqual(forge.calls, [
    'setInventory:shard,coolant,prism',
    'appendTrail:forge:prism',
    'persist',
    'scheduleWorldSave',
    'playUnlockAudio'
  ]);
  forge.calls.length = 0;
  assert.equal(forge.actions.use('coolant on shard'), 'use: prizmayi zaten doktun. (unlock atlas)');
  assert.deepEqual(forge.calls, []);

  const useless = createFixture({ state: { inventory: ['shard'] } });
  assert.equal(useless.actions.use('shard on system'), 'use: shard, system uzerinde bir ise yaramiyor.');
});

test('World actions factory rejects every missing dependency', () => {
  const { createWorldActions } = createFixture();
  assert.throws(
    () => createWorldActions({ normalizeCommand }),
    /resolvePath, getCurrentRoom, getRoom, getInventory, getUnlocked/
  );
});

test('Home protocol delegates action decisions but retains all side-effect ownership', () => {
  assert.match(protocolSource, /createWorldActions/);
  assert.match(protocolSource, /worldActionsMod\?\.take/);
  assert.match(protocolSource, /worldActionsMod\?\.unlock/);
  assert.match(protocolSource, /worldActionsMod\?\.use/);
  assert.doesNotMatch(protocolSource, /state\.easterTrail\s*=.*take:/);
  assert.doesNotMatch(protocolSource, /state\.easterTrail\s*=.*unlock:/);
  assert.doesNotMatch(protocolSource, /state\.easterTrail\s*=.*forge:prism/);
  assert.match(protocolSource, /setInventory:[\s\S]*?state\.inventory\s*=/);
  assert.match(protocolSource, /setUnlocked:[\s\S]*?state\.unlocked\s*=/);
  assert.match(protocolSource, /persist,[\s\S]*?scheduleWorldSave,[\s\S]*?awardShards,/);
});
