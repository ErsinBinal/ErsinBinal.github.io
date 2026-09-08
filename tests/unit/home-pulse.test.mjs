import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// NABIZ — ana sayfanin canli yuzeyleri.
//
// Bu testlerin asil isi cizimi dogrulamak degil, SOZLESMEYI kilitlemek:
//   - ana sayfada gorunen hicbir sayi ELLE yazilmamis olmali
//   - veri yoksa yuzey ACILMAMALI (bos kutu, olmayan kutudan kotudur)
//   - agir veri ana sayfaya CEKILMEMELI (tortu.json 86 KB)
//   - hareket azaltma ve gorunurluk kurallari korunmali

const pulseSource = await readFile(new URL('../../assets/js/home/pulse.js', import.meta.url), 'utf8');
const buildSource = await readFile(new URL('../../scripts/build-nabiz.js', import.meta.url), 'utf8');
const indexSource = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
const nabiz = JSON.parse(await readFile(new URL('../../assets/data/nabiz.json', import.meta.url), 'utf8'));

// Yorum satirlari haric kaynak: iddialar KODA baksin.
const kod = (src) => src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

function loadPulse({ veri = nabiz, filiz = null, reduce = false } = {}) {
  const cagri = [];
  const ctx = new Proxy({}, {
    get(_, prop) {
      if (prop === 'measureText') return () => ({ width: 30 });
      if (prop === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (['setTransform', 'save', 'restore', 'setLineDash'].includes(prop)) return () => {};
      return (...a) => { cagri.push(String(prop)); return undefined; };
    },
    set() { return true; }
  });
  const el = () => ({
    hidden: true, className: '', dataset: {}, style: {}, clientWidth: 260,
    width: 0, height: 0, textContent: '', innerHTML: '',
    children: [], classList: { add() {}, remove() {}, contains: () => false },
    getContext: () => ctx, setAttribute() {}, appendChild() {}, contains: () => false,
    addEventListener() {}, removeEventListener() {}, querySelector: () => el(),
    querySelectorAll: () => [], insertAdjacentElement() {}, getBoundingClientRect: () => ({ width: 260, left: 0 })
  });
  const kartlar = [
    Object.assign(el(), { dataset: { action: 'OPEN' } }),
    Object.assign(el(), { dataset: { action: 'GUIDE' } }),
    Object.assign(el(), { dataset: { action: 'LOGIN' } }),
    Object.assign(el(), { dataset: { action: 'DASH' } })
  ];
  const doc = {
    hidden: false,
    getElementById: (id) => (id === 'command-launch' ? Object.assign(el(), { parentElement: el() }) : el()),
    querySelector: () => el(),
    querySelectorAll: (sel) => (sel.includes('data-action') ? kartlar : []),
    createElement: () => el(),
    addEventListener() {}, removeEventListener() {}
  };
  const context = vm.createContext({
    window: {
      devicePixelRatio: 1,
      matchMedia: () => ({ matches: reduce }),
      setTimeout: (fn) => 1, clearTimeout() {},
      addEventListener() {}, removeEventListener() {},
      requestIdleCallback: null
    },
    document: doc,
    console,
    performance: { now: () => 0 },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    IntersectionObserver: class { observe() {} disconnect() {} },
    fetch: () => Promise.resolve({ ok: false }),
    Math, Object, Array, String, Number
  });
  vm.runInContext(pulseSource, context, { filename: 'pulse.js' });
  const pulse = context.window.ConviviumHome.createPulse({
    getNabiz: () => veri,
    getFiliz: () => filiz,
    prefersReducedMotion: () => reduce,
    documentRef: doc
  });
  return { pulse, cagri, kartlar };
}

// --- SOZLESME: uydurma sayi yok ---------------------------------------------

test('ANA SAYFADAKI SAYILAR ELLE YAZILMIYOR — hepsi turetiliyor', () => {
  // Modulde gomulu sayi olmamali: her rakam nabiz.json/filiz.json'dan gelir.
  const k = kod(pulseSource);
  assert.doesNotMatch(k, /\b434\b|\b114\b|\b320\b|\b575\b|\b2414\b/,
    'gercek veriden gelmesi gereken bir sayi koda gomulmus');
  assert.match(k, /getNabiz\(\)/);
  assert.match(k, /getFiliz\(\)/);
});

test('nabiz.json GERCEK kaynaktan turetiliyor', () => {
  assert.match(buildSource, /commandDefinitions/, 'komut sayisi protokolden okunmali');
  assert.match(buildSource, /glossary\.js/, 'sozluk terimi glossary den sayilmali');
  assert.match(buildSource, /changelog\.html/);
  assert.match(buildSource, /signals\.xml/);
});

test('SURUKLEME KAPISI var — sayilar bayatlarsa yakalanir', () => {
  assert.match(buildSource, /--check/);
  assert.match(buildSource, /guncel DEGIL/);
  assert.match(buildSource, /process\.exit\(1\)/);
});

test('uretilen veri makul ve dolu', () => {
  assert.ok(nabiz.terminal.komut > 50 && nabiz.terminal.takmaAd > 50);
  assert.equal(nabiz.terminal.yazilabilir, nabiz.terminal.komut + nabiz.terminal.takmaAd);
  assert.ok(nabiz.kazi.donem.length >= 2, 'kazi seridi icin en az iki donem');
  assert.ok(nabiz.kazi.commit > 0);
  assert.ok(nabiz.arsiv.pasaj > 0 && nabiz.yayin.changelogGirdi > 0);
});

// --- Veri yoksa yuzey yok ----------------------------------------------------

test('VERI YOKSA YUZEY ACILMIYOR', () => {
  const { pulse } = loadPulse({ veri: null });
  assert.equal(pulse.hazir('cmd'), false);
  assert.equal(pulse.hazir('serit'), false);
  assert.equal(pulse.hazir('rozet'), false);
  assert.equal(pulse.hazir('atolye'), false);
});

test('eksik veri tek tek degerlendiriliyor', () => {
  const { pulse } = loadPulse({ veri: { terminal: { yazilabilir: 5 } } });
  assert.equal(pulse.hazir('cmd'), true, 'terminal verisi varsa cmd acilir');
  assert.equal(pulse.hazir('serit'), false, 'donem yoksa serit acilmaz');
  assert.equal(pulse.hazir('atolye'), false, 'filiz yoksa atolye acilmaz');
});

test('atolye yalniz filiz verisiyle aciliyor', () => {
  const az = { elek: { aday: 100, elenen: 40 }, raf: { cozulen: 2, acik: 8 } };
  assert.equal(loadPulse({ filiz: az }).pulse.hazir('atolye'), true);
  assert.equal(loadPulse({ filiz: { elek: { aday: 0 } } }).pulse.hazir('atolye'), false);
});

// --- Yuk butcesi -------------------------------------------------------------

test('TORTU.JSON ANA SAYFAYA CEKILMIYOR (86 KB)', () => {
  assert.doesNotMatch(kod(pulseSource), /tortu\.json/,
    'seridin ihtiyaci olan ozet nabiz.json da olmali');
  assert.ok(Array.isArray(nabiz.kazi.donem) && nabiz.kazi.donem.length > 0,
    'donem ozeti nabiz.json da bulunmali');
});

test('filiz.json BOSTA cekiliyor, acilista degil', () => {
  assert.match(pulseSource, /requestIdleCallback/);
  assert.match(kod(pulseSource), /bosta\(/);
});

test('nabiz.json kucuk kaliyor', async () => {
  const ham = await readFile(new URL('../../assets/data/nabiz.json', import.meta.url), 'utf8');
  assert.ok(ham.length < 4096, `nabiz.json ${ham.length} bayt — ana sayfa yuku buyumemeli`);
});

// --- Bedava degilse calismaz -------------------------------------------------

test('GORUNMEYEN CANVAS CIZMIYOR', () => {
  assert.match(kod(pulseSource), /IntersectionObserver/);
  assert.match(kod(pulseSource), /visibilitychange/);
});

test('HAREKET AZALTMA istegine uyuluyor — tek kare', () => {
  const { pulse, cagri } = loadPulse({ reduce: true });
  pulse.baslat();
  assert.ok(cagri.length > 0, 'yine de cizilmeli, bilgi kaybolmamali');
  assert.match(kod(pulseSource), /prefersReducedMotion\(\)\)\s*\{\s*kare\(1\)/);
});

// --- Sayfayi karmasiklastirmaz ----------------------------------------------

test('rozetler METINDEN degil data-action dan bulunuyor', () => {
  assert.match(kod(pulseSource), /data-action/);
  assert.match(kod(pulseSource), /kart\.dataset\.action/);
});

test('kartlarin data-action nitelikleri HTML de duruyor', () => {
  for (const a of ['OPEN', 'GUIDE', 'LOGIN', 'DASH']) {
    assert.match(indexSource, new RegExp(`data-action="${a}"`), `${a} kartı kaybolmus`);
  }
});

test('yuzeyler var olan elemanlara TUTUNUYOR, yeni bolum acmiyor', () => {
  const k = kod(pulseSource);
  assert.match(k, /\.primary-actions/);
  assert.match(k, /\.os-snapshot/);
  assert.doesNotMatch(k, /<section|<h2/, 'yeni baslik/bolum eklenmemeli');
});

test('PROTOKOLE DOKUNULMADI — bu bir ana sayfa yuzeyi', async () => {
  const protocol = await readFile(new URL('../../assets/js/home-protocol.js', import.meta.url), 'utf8');
  // Dikkat: `ritual-pulse.js` protokolde GECIYOR ve bizimle ilgisi yok.
  assert.doesNotMatch(protocol, /createPulse|home\/pulse\.js|nabiz\.json/,
    'nabiz protokolden bagimsiz olmali');
});

test('modul kendi kendini baslatiyor', () => {
  assert.match(pulseSource, /DOMContentLoaded/);
  assert.match(kod(pulseSource), /command-launch'\)\) return/);
});
