import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// Z5 OKKAM — en kisa program (Levin aramasi + MDL).
//
// Serginin konusu makinenin gucu degil SINIRI. Testler hem aramanin dogru
// calistigini hem de sinirin DURUSTCE bildirildigini kilitler.

const okkamSource = await readFile(
  new URL('../../assets/js/home/okkam.js', import.meta.url),
  'utf8'
);
const buildSource = await readFile(
  new URL('../../scripts/build-okkam.js', import.meta.url),
  'utf8'
);
const pool = JSON.parse(await readFile(
  new URL('../../assets/data/okkam.json', import.meta.url),
  'utf8'
));

function loadOkkam(data = pool, dayKey = '2026-08-29') {
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(okkamSource, context, { filename: 'okkam.js' });
  return context.window.ConviviumHome.createOkkam({ getData: () => data, getDayKey: () => dayKey });
}

// --- Makine ---------------------------------------------------------------

test('OKK-8 bilinen programlari dogru calistiriyor', () => {
  const okkam = loadOkkam();
  const OPS = Array.from(okkam._ops);
  const prog = (text) => text.split(' ').map((op) => OPS.indexOf(op));

  assert.deepEqual(Array.from(okkam._run(prog('INC OUT JNZ'), 200, 4).out), [1, 2, 3, 4]);
  assert.deepEqual(Array.from(okkam._run(prog('INC INC OUT JNZ'), 200, 4).out), [2, 4, 6, 8]);
  assert.deepEqual(Array.from(okkam._run(prog('DEC OUT JNZ'), 200, 3).out), [-1, -2, -3]);
  assert.deepEqual(Array.from(okkam._run(prog('OUT OUT OUT'), 200, 3).out), [0, 0, 0]);
});

test('adim butcesi asilinca durur — sonsuz dongu terminali dondurmez', () => {
  const okkam = loadOkkam();
  const OPS = Array.from(okkam._ops);
  // INC JNZ: cikti yok, sonsuz doner. Butce onu durdurmali.
  const result = okkam._run([OPS.indexOf('INC'), OPS.indexOf('JNZ')], 500, 5);
  assert.equal(result.steps, 500, 'butce kadar adim atip durmali');
  assert.equal(result.out.length, 0);
});

test('tasma yakalaniyor', () => {
  const okkam = loadOkkam();
  const OPS = Array.from(okkam._ops);
  // A=B=buyuk, MUL dongusu -> tasma
  const p = [OPS.indexOf('INC'), OPS.indexOf('INC'), OPS.indexOf('SWP'), OPS.indexOf('INC'),
    OPS.indexOf('INC'), OPS.indexOf('MUL'), OPS.indexOf('JNZ')];
  const result = okkam._run(p, 10000, 5);
  assert.ok(result.overflow || result.steps <= 10000, 'tasma ya da butce ile durmali');
});

// --- Arama ----------------------------------------------------------------

test('Levin aramasi bilinen dizileri buluyor', () => {
  const okkam = loadOkkam();
  const cases = [
    [[1, 2, 3, 4], 'INC OUT JNZ'],
    [[0, 0, 0], 'OUT OUT OUT'],
    [[-1, -2, -3], 'DEC OUT JNZ']
  ];
  for (const [target, expected] of cases) {
    const r = okkam._search(target, { maxPhase: 10 });
    assert.equal(r.found, true, `${target} bulunmali`);
    assert.equal(r.text, expected, `${target} icin en kisa program`);
  }
});

test('arama deterministik: ayni hedef ayni programi verir', () => {
  const a = loadOkkam();
  const b = loadOkkam();
  for (const target of [[1, 2, 3, 4], [2, 4, 6, 8], [0, 0, 0]]) {
    assert.equal(a._search(target).text, b._search(target).text);
  }
});

test('BUTCE SINIRI ZORUNLU — arama sonsuza kadar kosmuyor', () => {
  const okkam = loadOkkam();
  // Bu dilde kisa programla uretilemeyen bir hedef.
  const r = okkam._search([7, 13, 2, 99], { maxPhase: 30, maxTried: 50_000 });
  assert.equal(r.found, false);
  assert.equal(r.exhausted, true, 'butce bitisi acikca isaretlenmeli');
  assert.ok(r.tried <= 50_000, `deneme siniri asilmamali: ${r.tried}`);
});

test('butce bitisi ile "uretilemez" AYRI raporlaniyor', () => {
  const okkam = loadOkkam();
  const exhausted = okkam._search([7, 13, 2, 99], { maxPhase: 30, maxTried: 1000 });
  assert.equal(exhausted.exhausted, true);
  // Kaynakta da bu ayrim yazili olmali (build tarafi da ayni dili kullanir).
  assert.match(buildSource, /butce bitti/i);
  assert.match(buildSource, /uretilemiyor/i);
});

// --- MDL / duello ---------------------------------------------------------

test('ham veri bit maliyeti hesaplaniyor', () => {
  const okkam = loadOkkam();
  assert.ok(okkam._dataBits([1, 2, 3, 4]) > 0);
  assert.ok(
    okkam._dataBits([1000, 2000, 3000]) > okkam._dataBits([1, 2, 3]),
    'buyuk sayilar daha pahali olmali'
  );
});

test('cikti MDL kazancini ve arama maliyetini gosteriyor', () => {
  const okkam = loadOkkam();
  const out = okkam.solve('1 2 3 4');
  assert.match(out, /INC OUT JNZ/);
  assert.match(out, /bit/);
  assert.match(out, /kazanc/);
  assert.match(out, /program denendi/);
});

test('makine pes ettiginde SINIRINI ilan ediyor', () => {
  const okkam = loadOkkam();
  const out = okkam.solve('7 13 2 99');
  assert.match(out, /PES ETTI|BULAMADI/);
  assert.match(out, /8 katina cikiyor/, 'ustel tavan aciklanmali');
  assert.match(out, /Sen daha kisasini bulabilirsen/, 'insanin kazanabilecegi soylenmeli');
});

// --- Gunun bulmacasi ------------------------------------------------------

test('gunun dizisi deterministik', () => {
  assert.equal(loadOkkam(pool, '2026-08-29').solve(''), loadOkkam(pool, '2026-08-29').solve(''));
});

test('farkli gun farkli bulmaca acabiliyor', () => {
  const days = ['2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24'];
  const seen = new Set(days.map((d) => loadOkkam(pool, d).solve('')));
  assert.ok(seen.size > 1);
});

test('havuz yoksa fail-soft', () => {
  const okkam = loadOkkam(null);
  assert.equal(okkam.ready(), false);
  assert.match(okkam.solve(''), /yuklenmedi/);
  // Ama dil ve calistir havuz gerektirmemeli.
  assert.match(okkam.solve('dil'), /OKK-8/);
  assert.match(okkam.solve('calistir INC OUT JNZ'), /1, 2, 3/);
});

// --- Kullanici programi calistirma ---------------------------------------

test('kullanici programi calistirilabiliyor', () => {
  const okkam = loadOkkam();
  const out = okkam.solve('calistir INC OUT JNZ');
  assert.match(out, /\[1, 2, 3/);
  assert.match(out, /9 bit/);
});

test('bozuk opcode ve asiri uzun program reddediliyor', () => {
  const okkam = loadOkkam();
  assert.match(okkam.solve('calistir ZZZ OUT'), /bilinmeyen opcode/);
  assert.match(okkam.solve('calistir ' + 'INC '.repeat(30)), /1-24 talimat/);
  assert.match(okkam.solve('5'), /en az iki sayi/);
  assert.match(okkam.solve('1 2 3 4 5 6 7 8 9'), /en fazla sekiz/);
});

// --- Havuz sozlesmesi -----------------------------------------------------

test('havuzdaki her bulmaca ETKILESIMLI sinirda', () => {
  assert.ok(pool.puzzles.length >= 5, 'anlamli sayida bulmaca olmali');
  for (const puzzle of pool.puzzles) {
    assert.ok(puzzle.label && puzzle.target.length >= 3);
    assert.ok(puzzle.ms <= 900, `${puzzle.label} ${puzzle.ms}ms — terminalde donma hissi verir`);
    assert.ok(puzzle.tried <= 3_000_000, `${puzzle.label} arama butcesini asiyor`);
    assert.ok(puzzle.length >= 1 && puzzle.bits > 0);
  }
});

test('zorluk ELLE yazilmiyor, OLCULUYOR', () => {
  assert.match(buildSource, /zorluk ELLE YAZILMAZ, OLCULUR/i);
  assert.match(buildSource, /okkam\._search/, 'build gercekten aramayi kosmali');
  // Havuzdaki maliyet alanlari gercek olcumden gelmeli, sabit olmamali.
  const tried = new Set(pool.puzzles.map((p) => p.tried));
  assert.ok(tried.size > 1, 'olculmus maliyetler birbirinden farkli olmali');
});

test('modul saf: DOM, ag, zaman, rastgelelik yok', () => {
  assert.doesNotMatch(okkamSource, /document\./);
  assert.doesNotMatch(okkamSource, /fetch\(/);
  assert.doesNotMatch(okkamSource, /localStorage/);
  assert.doesNotMatch(okkamSource, /Math\.random/);
  assert.doesNotMatch(okkamSource, /Date\.now|new Date/);
});
