import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../../assets/js/home/ritual-pulse.js', import.meta.url), 'utf8');

const load = () => {
  const window = {};
  vm.runInNewContext(source, { window });
  return window.ConviviumHome.createRitualPulse;
};

const harness = (overrides = {}) => {
  const calls = { bonus: [], storm: [], marked: [] };
  let claimedDay = overrides.claimedDay ?? '';
  const factory = load();
  const mod = factory({
    threshold: 5,
    fetchPulse: overrides.fetchPulse ?? (async () => 7),
    getDayKey: () => overrides.day ?? '2026-07-22',
    ownsTodayCard: () => overrides.ownsCard ?? true,
    hasClaimed: (day) => day === claimedDay,
    markClaimed: (day) => { claimedDay = day; calls.marked.push(day); },
    onBonus: (amount, reason) => calls.bonus.push([amount, reason]),
    onStorm: (count) => calls.storm.push(count)
  });
  return { mod, calls, claimed: () => claimedDay };
};

test('esik asildiginda bonus bir kez verilir ve gun isaretlenir', async () => {
  const { mod, calls, claimed } = harness();
  const lines = await mod.maybeClaim();
  assert.ok(lines.some((line) => line.includes('FREKANS ESIGI ASILDI')));
  assert.deepEqual(calls.bonus, [[2, 'frekans esigi']]);
  assert.deepEqual(calls.storm, [7]);
  assert.equal(claimed(), '2026-07-22');
  // ikinci cagri: ayni gun tekrar odul yok
  assert.equal((await mod.maybeClaim()).length, 0);
  assert.equal(calls.bonus.length, 1);
});

test('esik altinda veya kartsiz gezginde bonus verilmez', async () => {
  const low = harness({ fetchPulse: async () => 3 });
  assert.equal((await low.mod.maybeClaim()).length, 0);
  assert.equal(low.calls.bonus.length, 0);

  const noCard = harness({ ownsCard: false });
  assert.equal((await noCard.mod.maybeClaim()).length, 0);
  assert.equal(noCard.calls.bonus.length, 0);
});

test('sayim hatasi/rpc yoklugu sessiz gecer; report cevrimdisi der', async () => {
  const broken = harness({ fetchPulse: async () => { throw new Error('rpc yok'); } });
  assert.equal((await broken.mod.maybeClaim()).length, 0);
  const text = await broken.mod.report();
  assert.ok(text.includes('olcum cevrimdisi'));
  assert.equal(broken.calls.bonus.length, 0);
});

test('report esik durumunu ve bari dogru cizer; esikte claim de tetiklenir', async () => {
  const { mod, calls } = harness({ fetchPulse: async () => 5 });
  const text = await mod.report();
  assert.ok(text.includes('bugunku toplama: 5'));
  assert.ok(text.includes('ESIK ASILDI'));
  assert.ok(text.includes('█████'));
  assert.equal(calls.bonus.length, 1); // report da hakki teslim eder
});

test('gecersiz sayim degeri (NaN/negatif) bonus uretmez', async () => {
  const bad = harness({ fetchPulse: async () => 'bozuk' });
  assert.equal((await bad.mod.maybeClaim()).length, 0);
  const neg = harness({ fetchPulse: async () => -4 });
  assert.equal((await neg.mod.maybeClaim()).length, 0);
});

test('eksik zorunlu dependency actik hata verir', () => {
  const factory = load();
  assert.throws(() => factory({}), /zorunlu fonksiyonlar eksik/);
});
