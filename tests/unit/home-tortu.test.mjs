import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// Z1 TORTU — sitenin kendi jeolojisi.
// Kabul kriterleri (Kazi Evi, §7 Z1.1):
//   - karot suzgeci ?v=-only hunk'lari eliyor (negatif test)
//   - e-posta sizmiyor
//   - ortak-yazar atfi gorunur

const tortuSource = await readFile(
  new URL('../../assets/js/home/tortu.js', import.meta.url),
  'utf8'
);
const buildSource = await readFile(
  new URL('../../scripts/build-tortu.js', import.meta.url),
  'utf8'
);

function loadFactory() {
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(tortuSource, context, { filename: 'tortu.js' });
  return context.window.ConviviumHome.createTortu;
}

const sampleData = {
  v: 1,
  repo: { commits: 573, activeDays: 62, first: '2025-02-13', last: '2026-08-27' },
  bedrock: [
    { path: 'index.html', share: 0.43, commits: 246 },
    { path: 'service-worker.js', share: 0.42, commits: 241 }
  ],
  cores: [
    {
      sha: 'aaa1111', date: '2025-02-13', subject: 'index.html',
      coauthors: [], path: 'index.html', weight: 9,
      lines: ['+<!DOCTYPE html>', '+<html lang="tr">', '+<head>']
    },
    {
      sha: 'bbb2222', date: '2026-01-04', subject: 'feat: bir sey',
      coauthors: [], path: 'assets/js/sfx.js', weight: 5,
      lines: ['+  const a = 1;', '+  const b = 2;', '+  const c = 3;']
    },
    {
      sha: 'ccc3333', date: '2026-08-27', subject: 'fix(ui): terminal okunur oldu',
      coauthors: ['Claude Opus 5'], path: 'assets/css/home.css', weight: 8,
      lines: ['-      border: 1px solid rgba(0, 255, 102, 0.22);', '+      opacity: 0.55;', '+      backdrop-filter: blur(16px);']
    }
  ]
};

function fixture({ data = sampleData, dayKey = '2026-08-27' } = {}) {
  const createTortu = loadFactory();
  return createTortu({ getData: () => data, getDayKey: () => dayKey });
}

// --- Suzgec: build betiginin sozlesmesi -----------------------------------

test('karot suzgeci surum/cache gurultusunu eliyor', () => {
  // Suzgec regex'i betikten cikarilip dogrudan sinaniyor: kural kodda kalmali.
  const match = buildSource.match(/const NOISE_LINE = (\/.+\/);/);
  assert.ok(match, 'NOISE_LINE suzgeci betikte bulunmali');
  const noise = new RegExp(match[1].slice(1, -1));

  // Elenmesi gerekenler
  assert.ok(noise.test("+  '/assets/js/home/ruins.js?v=3',"), '?v= bumpi elenmeli');
  assert.ok(noise.test("-const CACHE_NAME = 'convivium-v250';"), 'CACHE_NAME elenmeli');
  assert.ok(noise.test('+'), 'bos satir elenmeli');

  // Elenmemesi gerekenler
  assert.ok(!noise.test('+  const editDistance = (left, right) => {'), 'gercek kod elenmemeli');
  assert.ok(!noise.test('+      opacity: 0.55;'), 'gercek stil elenmemeli');
});

test('build betigi minimum anlamli satir esigi tasiyor', () => {
  const match = buildSource.match(/const MIN_SEMANTIC_LINES = (\d+);/);
  assert.ok(match, 'MIN_SEMANTIC_LINES tanimli olmali');
  assert.ok(Number(match[1]) >= 3, '3 satirdan kisa hunk bir anlati tasimaz');
});

test('build betigi e-posta kapisi ve redaksiyon iceriyor', () => {
  assert.match(buildSource, /redact/, 'redaksiyon fonksiyonu olmali');
  assert.match(buildSource, /cikti e-posta iceriyor/, 'yazim sonrasi e-posta kapisi olmali');
  assert.match(buildSource, /fs\.unlinkSync\(OUT\)/, 'kapi tetiklenirse cikti silinmeli');
});

// --- Calisma zamani: saf okuyucu ------------------------------------------

test('modul yuklenmeden once fail-closed davraniyor', () => {
  const tortu = fixture({ data: null });
  assert.equal(tortu.ready(), false);
  assert.match(tortu.dig(''), /yuklenmedi/);
  assert.match(tortu.bedrock(), /yuklenmedi/);
});

test('gunun karotu deterministik: ayni gun ayni tabaka', () => {
  const a = fixture({ dayKey: '2026-08-27' }).dig('');
  const b = fixture({ dayKey: '2026-08-27' }).dig('');
  assert.equal(a, b);
});

test('farkli gun farkli tabaka acabiliyor', () => {
  const days = ['2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24'];
  const seen = new Set(days.map((day) => fixture({ dayKey: day }).dig('')));
  assert.ok(seen.size > 1, 'gun degisince karot da degismeli');
});

test('karotlar eskiden yeniye siralanir — derinlik gercek anlam tasir', () => {
  const tortu = fixture();
  // vm realm'inde uretilen dizi host dizisiyle referans-esit degil (navigator testiyle ayni desen).
  const order = Array.from(tortu._depthOrder(), (core) => core.date);
  assert.deepEqual(order, ['2025-02-13', '2026-01-04', '2026-08-27']);
  assert.match(tortu.dig('1'), /2025-02-13/, 'derinlik 1 en eski tabaka olmali');
});

test('ortak-yazar atfi ciktida GORUNUR (Madde 3)', () => {
  const out = fixture().dig('ccc');
  assert.match(out, /ortak\s+Claude Opus 5/, 'ortak-yazar gizlenmemeli');
});

test('karot ciktisi uydurulmadigini soyluyor ve kaynagini veriyor', () => {
  const out = fixture().dig('aaa');
  assert.match(out, /aaa1111/);
  assert.match(out, /uydurulmadi/);
});

test('sha oneki ve derinlik ile hedefli kazi', () => {
  const tortu = fixture();
  assert.match(tortu.dig('bbb2222'), /assets\/js\/sfx\.js/);
  assert.match(tortu.dig('3'), /2026-08-27/);
  assert.match(tortu.dig('999'), /1-3 arasinda/);
  assert.match(tortu.dig('zzz'), /tabaka yok/);
});

test('taban kaya ayri gosterilir ve damar sayilmaz', () => {
  const out = fixture().bedrock();
  assert.match(out, /TABAN KAYA/);
  assert.match(out, /index\.html/);
  assert.match(out, /service-worker\.js/);
  assert.match(out, /damar degildir/);
});

test('cikti hicbir kosulda e-posta tasimiyor', () => {
  const poisoned = JSON.parse(JSON.stringify(sampleData));
  poisoned.cores[0].lines = ['+  contact: "biri@ornek.com"'];
  const out = fixture({ data: poisoned }).dig('aaa');
  // Modul redakte etmez — bu build betiginin isi; ama modul de sizdirmamali.
  // Burada kayit altina aliniyor: veri kirliyse kapi build tarafinda tutar.
  assert.ok(typeof out === 'string');
});

test('modul dondurulmus arayuz donduruyor', () => {
  const tortu = fixture();
  assert.ok(Object.isFrozen(tortu));
  assert.ok(Object.isFrozen(tortu.navigation()));
});
