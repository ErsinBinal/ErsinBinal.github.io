import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const economySource = await readFile(
  new URL('../../assets/js/home/economy.js', import.meta.url),
  'utf8'
);
const protocolSource = await readFile(
  new URL('../../assets/js/home-protocol.js', import.meta.url),
  'utf8'
);

function loadFactory() {
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(economySource, context, { filename: 'economy.js' });
  return context.window.ConviviumHome.createEconomy;
}

function createFixture(initialBalance = 4, overrides = {}) {
  let balance = initialBalance;
  const calls = [];
  const createEconomy = loadFactory();
  const economy = createEconomy({
    getBalance: () => balance,
    setBalance: (value) => {
      balance = value;
      calls.push(`setBalance:${value}`);
    },
    persist: () => calls.push('persist'),
    scheduleWorldSave: () => calls.push('scheduleWorldSave'),
    playCoinAudio: () => calls.push('playCoinAudio'),
    setStatus: (message) => calls.push(`setStatus:${message}`),
    ...overrides
  });
  return { createEconomy, economy, calls, getBalance: () => balance };
}

test('Economy preserves award normalization, mutation order and status output', () => {
  const { economy, calls, getBalance } = createFixture();

  assert.equal(economy.award(-2, 'ignored'), undefined);
  assert.equal(economy.award('invalid', 'ignored'), undefined);
  assert.deepEqual(calls, []);

  assert.equal(economy.award(1.6, 'ritual'), undefined);
  assert.equal(getBalance(), 6);
  assert.deepEqual(calls, [
    'setBalance:6',
    'persist',
    'scheduleWorldSave',
    'playCoinAudio',
    'setStatus:+2 shard / ritual'
  ]);
});

test('Economy preserves insufficient funds and zero-cost spend semantics', () => {
  const { economy, calls, getBalance } = createFixture(6);

  assert.equal(economy.spend(6.6), false);
  assert.equal(getBalance(), 6);
  assert.deepEqual(calls, []);

  assert.equal(economy.spend(1.4), true);
  assert.equal(getBalance(), 5);
  assert.deepEqual(calls, ['setBalance:5', 'persist', 'scheduleWorldSave']);

  calls.length = 0;
  assert.equal(economy.spend(-3), true);
  assert.equal(getBalance(), 5);
  assert.deepEqual(calls, ['setBalance:5', 'persist', 'scheduleWorldSave']);
});

test('Economy cloud merge always preserves the higher local or remote balance', () => {
  const { economy, calls, getBalance } = createFixture(5);

  assert.equal(economy.mergeRemoteBalance(11), 11);
  assert.equal(getBalance(), 11);
  assert.deepEqual(calls, ['setBalance:11']);

  calls.length = 0;
  assert.equal(economy.mergeRemoteBalance(3), 11);
  assert.equal(getBalance(), 11);
  assert.deepEqual(calls, ['setBalance:11']);
});

test('Economy preserves the shards terminal summary', () => {
  const { economy } = createFixture(17);
  assert.equal(economy.summary(), [
    '] SIGNAL SHARDS',
    '',
    '  bakiye: 17 shard',
    '',
    '  kazanim: gunluk ilk ziyaret +2, yeni esik kesfi +2, take +3,',
    '           unlock +5, ritual +1, rezonans +3',
    '  harcama: shop (kozmetik dukkan)',
    ']'
  ].join('\n'));
});

test('Economy factory rejects every missing orchestration dependency', () => {
  const { createEconomy } = createFixture();
  assert.throws(
    () => createEconomy({ getBalance: () => 0 }),
    /setBalance, persist, scheduleWorldSave, playCoinAudio, setStatus/
  );
});

test('Home protocol delegates shard decisions while retaining persistence and cloud ownership', () => {
  assert.doesNotMatch(economySource, /localStorage|ConviviumBackend|document\./);
  assert.match(protocolSource, /createEconomy/);
  assert.match(protocolSource, /economyMod\?\.award/);
  assert.match(protocolSource, /economyMod\?\.spend/);
  assert.match(protocolSource, /economyMod\?\.mergeRemoteBalance/);
  assert.doesNotMatch(protocolSource, /state\.shards\s*=\s*Math\.max\(0,[\s\S]*?\+\s*gain\)/);
  assert.doesNotMatch(protocolSource, /state\.shards\s*-=\s*cost/);
  assert.match(protocolSource, /setBalance:[\s\S]*?state\.shards\s*=/);
  assert.match(protocolSource, /persist,[\s\S]*?scheduleWorldSave/);
  assert.match(protocolSource, /saveWorldState\(\{[\s\S]*?shards:/);
});
