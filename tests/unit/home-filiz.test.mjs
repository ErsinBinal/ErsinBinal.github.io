import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// FILIZ — sitenin atolyesi (5. boyut).
//
// Bu testler yetenegi degil SINIRI kilitler. Kendi kendine ureten bir yapinin
// guvenligi, ne yapabildiginde degil NE YAPAMADIGINDA durur.

const filizSource = await readFile(new URL('../../assets/js/home/filiz.js', import.meta.url), 'utf8');
const buildSource = await readFile(new URL('../../scripts/build-filiz.js', import.meta.url), 'utf8');
const zarSource = await readFile(new URL('../../scripts/filiz-zar.js', import.meta.url), 'utf8');
const workflow = await readFile(new URL('../../.github/workflows/filiz-gece.yml', import.meta.url), 'utf8');
const okkamSource = await readFile(new URL('../../assets/js/home/okkam.js', import.meta.url), 'utf8');
const data = JSON.parse(await readFile(new URL('../../assets/data/filiz.json', import.meta.url), 'utf8'));

function loadFiliz(payload = data, dayKey = '2026-09-04') {
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(filizSource, context, { filename: 'filiz.js' });
  return context.window.ConviviumHome.createFiliz({ getData: () => payload, getDayKey: () => dayKey });
}

function loadOkkam() {
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(okkamSource, context, { filename: 'okkam.js' });
  return context.window.ConviviumHome.createOkkam({});
}

// --- MADDE 6/2: elek reddedebilmeli -----------------------------------------

test('FILTER GERCEKTEN REDDEDIYOR — hicbir seyi elemeyen filtre tiyatrodur', () => {
  assert.ok(data.elek.elenen > 0, 'red sayisi sifir olamaz');
  const oran = data.elek.elenen / data.elek.aday;
  assert.ok(oran > 0.2, `red orani cok dusuk (%${Math.round(oran * 100)}) — kapi bozulmus olabilir`);
  assert.ok(oran < 1, 'her seyi eleyen elek de bozuktur');
});

test('build eleyemezse DOSYA YAZMIYOR', () => {
  assert.match(buildSource, /elek hicbir seyi reddetmedi/);
  assert.match(buildSource, /process\.exit\(1\)/);
});

test('red sebepleri YAYINLANIYOR — filter ne attigini saklamaz', () => {
  assert.ok(Array.isArray(data.red) && data.red.length > 0);
  for (const r of data.red) {
    assert.ok(Array.isArray(r.target), 'reddedilen hedef kayitli olmali');
    assert.ok(typeof r.why === 'string' && r.why.length > 3, 'her red gerekceli olmali');
  }
  assert.match(loadFiliz().overview(), /filtreden neden gecemediler/);
});

// --- MADDE 6/1: dogrulayicisi olmayan sey uretilmez --------------------------

test('URETILEN HER DIZI GERCEKTEN URETILEBILIR — uydurma yok', () => {
  const okkam = loadOkkam();
  const OPS = Array.from(okkam._ops);
  for (const p of data.cozulen) {
    const program = p.program.split(' ').map((op) => OPS.indexOf(op));
    assert.ok(program.every((op) => op >= 0), `gecerli opcode: ${p.program}`);
    const out = Array.from(okkam._run(program, 4096, p.target.length).out);
    assert.deepEqual(out, p.target, `${p.program} iddia edilen diziyi uretmiyor`);
  }
});

test('ACIK raftaki her hedef icin FILIZ gercekten bir program biliyor', () => {
  // Muhur, cevabin varligini kanitlar: sallanmiyor.
  for (const p of data.acik) {
    assert.ok(typeof p.seal === 'string' && p.seal.length > 0, 'muhur olmali');
    assert.ok(p.length >= 1 && p.bits > 0);
    assert.ok(Array.isArray(p.target) && p.target.length >= 3);
  }
});

test('ACIK cevabi gercekten DOGRULANABILIYOR (muhur calisiyor)', () => {
  const filiz = loadFiliz();
  const okkam = loadOkkam();
  const OPS = Array.from(okkam._ops);
  // Havuzdan bir acik hedef al, onu ureten programi kaba kuvvetle bul,
  // sonra `filiz coz` ile dogrulat. Muhur tutmuyorsa sistem yalan soyluyordur.
  const hedef = data.acik.find((p) => p.length <= 5);
  assert.ok(hedef, 'kisa bir acik hedef olmali');

  let bulunan = null;
  const K = OPS.length;
  const gez = function* (len) {
    const p = new Array(len).fill(0);
    for (;;) {
      if (p.includes(5)) yield p;
      let i = len - 1;
      while (i >= 0 && p[i] === K - 1) { p[i] = 0; i -= 1; }
      if (i < 0) return;
      p[i] += 1;
    }
  };
  for (let len = 1; len <= hedef.length && !bulunan; len += 1) {
    for (const p of gez(len)) {
      const out = Array.from(okkam._run(p, 400, hedef.target.length).out);
      if (out.length === hedef.target.length && out.every((v, i) => v === hedef.target[i])) {
        bulunan = p.slice(); break;
      }
    }
  }
  assert.ok(bulunan, 'acik hedefi ureten program bulunabilmeli');
  const cevap = filiz.verify(bulunan.map((op) => OPS[op]).join(' '), OPS, okkam._run);
  assert.match(cevap, /DOGRULANDI|MAKINE KAYBETTI|ESIT UZUNLUKTA/);
});

test('yanlis cevap KABUL EDILMIYOR', () => {
  const okkam = loadOkkam();
  const OPS = Array.from(okkam._ops);
  const cevap = loadFiliz().verify('OUT OUT OUT', OPS, okkam._run);
  assert.match(cevap, /hicbirini tutturmuyor/);
});

// --- MADDE 6/4: uretec kendi uretecini uretemez ------------------------------

test('GATE: izinli alan YALNIZ uretim ciktisi', () => {
  const izinli = zarSource.match(/const IZINLI = \[([\s\S]*?)\]/);
  assert.ok(izinli, 'izinli liste bulunmali');
  const liste = izinli[1].match(/'([^']+)'/g).map((s) => s.replace(/'/g, ''));
  assert.deepEqual(liste, ['assets/data/filiz.json'],
    'izinli listeye baska dosya eklenmis — bu bir anayasa degisikligidir, sessizce olmaz');
});

test('GATE filtreyi, anayasayi ve yayin ritualini KORUYOR', () => {
  const yasak = [
    'scripts/build-filiz.js',
    'scripts/filiz-zar.js',
    'scripts/publish-slice.js',
    'docs/zekanin-saygidurusu-buyuk-plan.md',
    '.github/workflows/filiz-gece.yml',
    'assets/js/home/filiz.js'
  ];
  const izinli = ['assets/data/filiz.json'];
  for (const dosya of yasak) {
    assert.ok(!izinli.includes(dosya), `${dosya} uretim tarafindan yazilamamali`);
  }
});

test('GATE kendini deneyebiliyor (kapi tiyatro degil)', () => {
  assert.match(zarSource, /--kendini-dene/);
  assert.match(zarSource, /ZAR KENDINI DENEDI VE GECTI/);
});

// --- MADDE 6/3: 4. boyuta ancak diff ile gecilir -----------------------------

test('GECE ISI MAIN E PUSH ETMIYOR — yalniz PR aciyor', () => {
  assert.doesNotMatch(workflow, /git\s+push/, 'gece isi dogrudan push edemez');
  assert.match(workflow, /create-pull-request/, 'yalniz PR acmali');
  assert.match(workflow, /base:\s*main/);
  assert.match(workflow, /add-paths:\s*assets\/data\/filiz\.json/,
    'PR yalniz uretim ciktisini tasimali');
});

test('gece isi GATE i PR den ONCE kosuyor', () => {
  const zarIndex = workflow.indexOf('filiz-zar.js\n          code=');
  const prIndex = workflow.indexOf('create-pull-request');
  assert.ok(zarIndex > 0 && prIndex > zarIndex, 'gate, PR adimindan once gelmeli');
});

// --- Modul sozlesmesi --------------------------------------------------------

test('modul saf: DOM, ag, zaman, rastgelelik yok', () => {
  assert.doesNotMatch(filizSource, /document\./);
  assert.doesNotMatch(filizSource, /fetch\(/);
  assert.doesNotMatch(filizSource, /localStorage/);
  assert.doesNotMatch(filizSource, /Math\.random/);
  assert.doesNotMatch(filizSource, /Date\.now|new Date/);
});

test('gunun acik meydan okumasi deterministik', () => {
  assert.equal(loadFiliz(data, '2026-09-04').overview(), loadFiliz(data, '2026-09-04').overview());
});

test('veri yoksa fail-soft', () => {
  const filiz = loadFiliz(null);
  assert.equal(filiz.ready(), false);
});

test('generator ile filter AYNI motoru kullaniyor', () => {
  assert.match(buildSource, /assets', 'js', 'home', 'okkam\.js'/);
  assert.match(buildSource, /okkam\._search/);
  assert.match(buildSource, /okkam\._run/);
});

test('siniflandirma ZIYARETCI butcesiyle yapiliyor', () => {
  // "cozuldu" demek, terminale yazan birinin gercekten cevap almasi demektir.
  assert.match(buildSource, /VISITOR/);
  assert.match(buildSource, /maxTried: 3_000_000/);
});

test('filiz nasil calistigini ANLATIYOR (Madde 3)', () => {
  const how = loadFiliz().how();
  assert.match(how, /GENERATOR/);
  assert.match(how, /FILTER/);
  assert.match(how, /GATE/);
  assert.match(how, /Dogrulayicisi olmayan sey uretilmez/);
  assert.match(how, /kendi filtresini/);
});
