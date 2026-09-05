import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// VIZ — sergilerin gorsel katmani.
//
// Bu testlerin en onemli isi cizimi dogrulamak DEGIL (canvas'i test etmek
// pahali ve kirilgan). Asil is SOZLESMEYI kilitlemek:
//   - metin ciktisi kanonik surum olmaya devam ediyor mu
//   - gorsel, verisi yokken kendini aciyor mu (acmamali)
//   - hareket azaltma isteyene hareket gidiyor mu (gitmemeli)

const vizSource = await readFile(new URL('../../assets/js/home/viz.js', import.meta.url), 'utf8');
const protocolSource = await readFile(new URL('../../assets/js/home-protocol.js', import.meta.url), 'utf8');
const indexSource = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
const tortu = JSON.parse(await readFile(new URL('../../assets/data/tortu.json', import.meta.url), 'utf8'));


// Yorum satirlari haric kaynak: iddialarimiz KODA baksin, aciklamaya degil.
const kod = (src) => src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

// Canvas'i test ortaminda taklit et: cagrilari sayar, cizmez.
function fakeCanvas() {
  const calls = [];
  const ctx = new Proxy({}, {
    get(_, prop) {
      if (prop === 'measureText') return () => ({ width: 40 });
      if (prop === 'setTransform' || prop === 'save' || prop === 'restore') return () => {};
      return (...args) => { calls.push([String(prop), args.length]); };
    },
    set() { return true; }
  });
  return {
    calls,
    node: { clientWidth: 720, width: 0, height: 0, style: {}, getContext: () => ctx }
  };
}

function loadViz({ data = tortu, reduce = false, withCanvas = true } = {}) {
  const timers = [];
  const frames = { n: 0 };
  const context = vm.createContext({
    window: {
      devicePixelRatio: 1,
      matchMedia: () => ({ matches: reduce }),
      setTimeout: (fn, ms) => { timers.push([fn, ms]); return timers.length; },
      clearTimeout: () => {}
    },
    console,
    // Ilk kareyi GERCEKTEN cagir; loop kendini yeniden planladigi icin
    // sonrakiler yutulur, yoksa test sonsuz doner.
    requestAnimationFrame: (fn) => { if (frames.n === 0) { frames.n = 1; fn(16); } return 1; },
    cancelAnimationFrame: () => {},
    performance: { now: () => 0 },
    Math, Object, Array, String, Number
  });
  vm.runInContext(vizSource, context, { filename: 'viz.js' });
  const cv = fakeCanvas();
  const figure = { hidden: true };
  const caption = { textContent: '' };
  const viz = context.window.ConviviumHome.createViz({
    canvas: withCanvas ? cv.node : null,
    figure,
    caption,
    getTortu: () => data,
    prefersReducedMotion: () => reduce
  });
  return { viz, figure, caption, canvas: cv, timers };
}

// --- SOZLESME: metin kanonik kalir ------------------------------------------

test('METIN CIKTISI DEGISMEDI — viz hicbir komut ciktisina dokunmuyor', () => {
  // viz yalniz TEK yerden cagriliyor ve donus degeri kullanilmiyor:
  // yani hicbir komutun metnini degistiremez.
  const calls = protocolSource.match(/vizMod\?\.\w+\(/g) || [];
  assert.ok(calls.length >= 1, 'protokolde cagrilmali');
  assert.doesNotMatch(protocolSource, /printTerminal\(\s*vizMod/,
    'viz asla transcript e yazamaz');
  assert.doesNotMatch(kod(vizSource), /command-output|transcript/,
    'viz modulu transcript i tanimamali');
});

test('viz gorsel katmani transcript in DISINDA yasiyor', () => {
  assert.match(indexSource, /id="command-viz"/);
  assert.match(indexSource, /id="command-viz-canvas"/);
  // figure, command-output'tan ONCE gelmeli (ustunde dursun)
  assert.ok(indexSource.indexOf('id="command-viz"') < indexSource.indexOf('id="command-output"'));
});

// --- Sahne secimi (saf mantik) ----------------------------------------------

test('komuttan sahne dogru cikariliyor', () => {
  const { viz } = loadViz();
  assert.equal(viz.sceneFor('kaz'), 'strata');
  assert.equal(viz.sceneFor('kaz 42'), 'strata');
  assert.equal(viz.sceneFor('tabaka'), 'epochs');
  assert.equal(viz.sceneFor('damar'), 'clusters');
  assert.equal(viz.sceneFor('okkam 1 2 3 4'), 'levin');
  assert.equal(viz.sceneFor('step tabka'), 'levenshtein');
  assert.equal(viz.sceneFor('iz'), 'bishop');
});

test('sahnesi olmayan komut gorsel ACMIYOR', () => {
  const { viz } = loadViz();
  for (const cmd of ['help', 'look', 'ara sey', 'filiz', 'whatis gate', '']) {
    assert.equal(viz.sceneFor(cmd), null, `${cmd} sahne acmamali`);
  }
});

test('okkam dil / calistir ARAMA YAPMIYOR — sahne de acilmiyor', () => {
  const { viz } = loadViz();
  assert.equal(viz.sceneFor('okkam dil'), null);
  assert.equal(viz.sceneFor('okkam calistir INC OUT JNZ'), null);
  assert.equal(viz.sceneFor('okkam'), 'levin');
});

// --- Veri yoksa acilmaz ------------------------------------------------------

test('VERI YOKSA GORSEL ACILMIYOR — bos canvas metinden kotudur', () => {
  const { viz, figure } = loadViz({ data: null });
  assert.equal(viz.show('kaz'), null);
  assert.equal(figure.hidden, true);
});

test('veri gelmedigi surece TEKRAR DENIYOR ama sonsuza kadar degil', () => {
  const { viz, timers } = loadViz({ data: null });
  viz.show('kaz');
  assert.equal(timers.length, 1, 'bir kez yeniden denemeli');
  assert.ok(timers[0][1] > 0 && timers[0][1] < 2000, 'kisa aralikla');
  assert.match(vizSource, /retries < 12/, 'deneme sayisi sinirli olmali');
});

test('canvas yoksa sessizce cekiliyor (fail-soft)', () => {
  const { viz } = loadViz({ withCanvas: false });
  assert.equal(viz.show('kaz'), null);
});

// --- Cizim gercekten oluyor --------------------------------------------------

test('veri varken sahne CIZILIYOR', () => {
  const { viz, figure, caption, canvas } = loadViz();
  const scene = viz.show('kaz');
  assert.equal(scene, 'strata');
  assert.equal(figure.hidden, false);
  assert.match(caption.textContent, /kazi kesiti/);
  assert.ok(canvas.calls.some(([m]) => m === 'fillRect'), 'canvas a cizilmeli');
  assert.ok(canvas.calls.some(([m]) => m === 'fillText'), 'etiket yazilmali');
});

test('butun sahneler cizilebiliyor', () => {
  for (const [cmd, scene] of [['kaz', 'strata'], ['tabaka', 'epochs'], ['damar', 'clusters'],
    ['okkam', 'levin'], ['step tabka', 'levenshtein'], ['iz', 'bishop']]) {
    const { viz, canvas } = loadViz();
    assert.equal(viz.show(cmd), scene, `${cmd} -> ${scene}`);
    assert.ok(canvas.calls.length > 5, `${scene} cizim yapmali`);
  }
});

// --- Erisilebilirlik ---------------------------------------------------------

test('HAREKET AZALTMA istegine uyuluyor — tek kare, dongu yok', () => {
  const { viz, canvas } = loadViz({ reduce: true });
  assert.equal(viz.show('kaz'), 'strata');
  assert.ok(canvas.calls.length > 5, 'yine de cizilmeli — bilgi kaybi olmamali');
  assert.match(vizSource, /Hareket azaltma acikken tek KARE/);
});

test('canvas ekran okuyucuya gorsel olarak isaretli', () => {
  assert.match(indexSource, /id="command-viz-canvas"[^>]*role="img"/);
  assert.match(indexSource, /figcaption/);
});

// --- Uydurma yok -------------------------------------------------------------

test('SAHNELER GERCEK VERIDEN besleniyor, sabit sayi gomulu degil', () => {
  // Donem ve kume sayilari tortu.json'dan gelmeli.
  assert.match(vizSource, /data\.eras/);
  assert.match(vizSource, /data\.veins/);
  assert.match(vizSource, /block\.modularity/);
  assert.ok(tortu.eras.length > 0 && tortu.veins.veins.length > 0);
});

test('cizim RASTGELE degil — ayni veri ayni resmi verir', () => {
  assert.doesNotMatch(kod(vizSource), /Math\.random/);
});

test('viz modulu ag ve depolama kullanmiyor', () => {
  assert.doesNotMatch(vizSource, /fetch\(/);
  assert.doesNotMatch(vizSource, /localStorage/);
});

// --- Protokol yuku -----------------------------------------------------------

test('PROTOKOL YUKU KUCUK — cizim protokole sizmadi', () => {
  const vizLines = protocolSource.split('\n').filter((l) => /viz/i.test(l));
  assert.ok(vizLines.length <= 22, `protokolde ${vizLines.length} satir — cizim modulde kalmali`);
  assert.doesNotMatch(protocolSource, /getContext\('2d'\)[\s\S]{0,80}command-viz/);
});
