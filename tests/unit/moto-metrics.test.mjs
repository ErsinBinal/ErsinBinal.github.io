import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const dataSource = await readFile(new URL('../../assets/js/moto-data.js', import.meta.url), 'utf8');
const metricsSource = await readFile(new URL('../../assets/js/moto-metrics.js', import.meta.url), 'utf8');

function loadMoto() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(dataSource, context, { filename: 'moto-data.js' });
  vm.runInContext(metricsSource, context, { filename: 'moto-metrics.js' });
  return context.window.ConviviumMoto;
}

const moto = loadMoto();
const { GARAGE, CLASSES, metrics } = moto;
const byId = (id) => GARAGE.find((bike) => bike.id === id);

test('garaj: 5 sinif x 2 motor, 9 markanin tamami, benzersiz kimlikler', () => {
  assert.equal(GARAGE.length, 10);
  assert.equal(new Set(GARAGE.map((bike) => bike.id)).size, 10);

  for (const klass of CLASSES) {
    const members = GARAGE.filter((bike) => bike.class === klass.key);
    assert.equal(members.length, 2, `${klass.key} sinifi 2 motor icermeli`);
    assert.equal(new Set(members.map((bike) => bike.brand)).size, 2, `${klass.key} icinde marka tekrari olmamali`);
  }

  const brands = new Set(GARAGE.map((bike) => bike.brand));
  for (const brand of ['BMW', 'Triumph', 'Honda', 'CFMoto', 'Suzuki', 'Kawasaki', 'Yamaha', 'Royal Enfield', 'Harley-Davidson']) {
    assert.equal(brands.has(brand), true, `${brand} garajda olmali`);
  }
});

test('veri sozlesmesi: agirlik daima kerb, zorunlu alanlar dolu, veri donmus', () => {
  for (const bike of GARAGE) {
    assert.equal(bike.weight.kind, 'kerb', `${bike.id} kerb agirlik tasimali`);
    assert.ok(bike.weight.kg > 0 && bike.power.hp > 0 && bike.torque.nm > 0, `${bike.id} olcumleri pozitif olmali`);
    assert.ok(bike.source && bike.source.length > 4, `${bike.id} kaynak tasimali`);
    assert.equal(Object.isFrozen(bike), true);
  }
  assert.equal(Object.isFrozen(GARAGE), true);
});

test('her motorun fosfor karesi diskte var', () => {
  for (const bike of GARAGE) {
    const url = new URL(`../../assets/img/moto/${bike.id}.webp`, import.meta.url);
    assert.equal(existsSync(url), true, `${bike.id}.webp uretilmemis (npm run build:moto)`);
  }
});

test('turetilmis metrikler: hp/ton, Nm/100kg, kg/hp', () => {
  const mt09 = byId('yamaha-mt-09');
  const derived = metrics.derive(mt09);

  assert.equal(Number(derived.hpPerTon.toFixed(1)), 607.8);
  assert.equal(Number(derived.nmPer100.toFixed(2)), 48.19);
  assert.equal(Number(derived.kgPerHp.toFixed(3)), 1.645);
  assert.equal(metrics.valueOf(mt09, 'weight'), 193);
  assert.throws(() => metrics.valueOf(mt09, 'yakit'), /Bilinmeyen metrik/);
});

test('garaj olcegi kirpma sonrasi [0,1] araliginda kalir', () => {
  const scale = metrics.buildScale(GARAGE, 'garaj');
  for (const bike of GARAGE) {
    for (const metric of metrics.METRICS) {
      const value = scale(bike, metric.key);
      assert.ok(value >= 0 && value <= 1, `${bike.id}/${metric.key} olcek disina tasti: ${value}`);
    }
  }
  // En agir motor kirpilmis ust sinira oturur, en hafifi tabana.
  assert.equal(scale(byId('harley-davidson-fat-boy-114'), 'weight'), 1);
  assert.equal(scale(byId('triumph-scrambler-400x'), 'weight'), 0);
});

test('sinif olcegi medyan oranidir: medyanin ustu 0.5 ustu verir', () => {
  const scale = metrics.buildScale(GARAGE, 'sinif');
  // Naked sinifi: MT-09 (117.3 hp) vs 700CL-X (74.8 hp) -> medyan 96.05
  assert.ok(scale(byId('yamaha-mt-09'), 'power') > 0.5);
  assert.ok(scale(byId('cfmoto-700clx'), 'power') < 0.5);
  // Olcek log2 oranidir: iki kat guc tam +1 kademe (0.5 -> 1.0) demektir.
  const doubled = { ...byId('cfmoto-700clx'), power: { hp: 96.05 * 2, kw: 0, rpm: 0, estimated: false } };
  assert.equal(Number(scale(doubled, 'power').toFixed(6)), 1);
});

test('Pareto siniri: agirligina gore domine edilmeyenler', () => {
  assert.deepEqual([...metrics.paretoFront(GARAGE)], [
    'yamaha-mt-09',
    'bmw-r-1300-gs',
    'honda-cl500',
    'triumph-scrambler-400x'
  ]);
});

test('siralamalar: garaj ve sinif ici', () => {
  assert.deepEqual({ ...metrics.rankInGarage(GARAGE, byId('bmw-r-1300-gs'), 'power') }, { rank: 1, total: 10 });
  assert.deepEqual({ ...metrics.rankInGarage(GARAGE, byId('harley-davidson-fat-boy-114'), 'torque') }, { rank: 1, total: 10 });
  assert.deepEqual({ ...metrics.rankInClass(GARAGE, byId('kawasaki-vulcan-s'), 'torque') }, { rank: 2, total: 2 });
});

test('bilanco deterministiktir ve sasi borcunu okur', () => {
  const mt09 = byId('yamaha-mt-09');
  const fatboy = byId('harley-davidson-fat-boy-114');

  const first = metrics.verdict(mt09, fatboy, GARAGE);
  const second = metrics.verdict(mt09, fatboy, GARAGE);
  assert.equal(first, second);
  assert.match(first, /MT-09 her beygire 1\.65 kg düşürüyor/);
  assert.match(first, /Fat Boy 114 aynı işi 3\.37 kg ile yazıyor/);
  assert.match(first, /Pareto sınırında/);
  assert.equal(metrics.verdict(null, fatboy, GARAGE), '');
});
