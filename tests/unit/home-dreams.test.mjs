import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../../assets/js/home/dreams.js', import.meta.url), 'utf8');

const load = () => {
  const window = {};
  vm.runInNewContext(source, { window });
  return window.ConviviumHome.createDreams;
};

const make = (overrides = {}) => load()({
  fetchStats: overrides.fetchStats ?? (async () => [
    { event_key: 'home.view', total: 7 },
    { event_key: 'oracle.ask', total: 2 },
    { event_key: 'bilinmeyen.olay', total: 99 }
  ]),
  getDayKey: () => overrides.day ?? '2026-07-22'
});

test('ayni gun ayni ruya: compose deterministik', () => {
  const a = make().composeDream('2026-07-21', null);
  const b = make().composeDream('2026-07-21', null);
  assert.deepEqual([...a], [...b]);
  const c = make().composeDream('2026-07-20', null);
  assert.notDeepEqual([...a], [...c]);
});

test('istatistikler ruyaya dokunur; bilinmeyen anahtar atlanir', async () => {
  const text = await make().dreamCommand();
  assert.ok(text.includes('] RUYA 2026-07-21'));
  assert.ok(text.includes('7 kez kapi aralandi'));
  assert.ok(text.includes('2 kez soru soruldu'));
  assert.ok(!text.includes('bilinmeyen'));
  assert.ok(text.includes('herkes bu gece ayni ruyayi gorur'));
});

test('rpc hatasi soluk ruyaya duser, komut yine calisir', async () => {
  const text = await make({ fetchStats: async () => { throw new Error('yok'); } }).dreamCommand();
  assert.ok(text.includes('Sinyal kaydi eksik'));
  assert.ok(text.includes("seed'den dokundu"));
});

test('kalinti: 7 gun oncesi, deterministik asinmis, senkron', () => {
  const r1 = make().relic();
  const r2 = make().relic();
  assert.equal(r1.dateKey, '2026-07-15');
  assert.equal(r1.id, 'ruya-arsivi.log');
  assert.equal(r1.body, r2.body);
  assert.ok(r1.body.includes('▒'));
  assert.ok(r1.body.includes('RUYA ARSIVI // 2026-07-15'));
});

test('eksik dependency acik hata verir', () => {
  assert.throws(() => load()({}), /zorunlu fonksiyonlar eksik/);
});
