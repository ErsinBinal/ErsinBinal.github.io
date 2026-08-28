import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// Z3 SIGIL — adres motoru.
// Kazi Evi, Madde 1: IZ TASINMAZ, YENIDEN TURETILIR.
// Adres icerik tasimaz; yalnizca {tur, girdi} tasir ve cikti alicida yeniden
// hesaplanir. Bu testler o sozlesmeyi kilitler.

const sigilSource = await readFile(
  new URL('../../assets/js/home/sigil.js', import.meta.url),
  'utf8'
);

function loadSigil() {
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(sigilSource, context, { filename: 'sigil.js' });
  return context.window.ConviviumHome.createSigil();
}

const CASES = [
  ['kaz', 'cdbbc3f'],
  ['kaz', ''],
  ['kaz', '42'],
  ['tabaka', ''],
  ['damar', ''],
  ['taban', ''],
  ['neden', 'hepl'],
  ['neden', 'cd ruins'],
  ['neden', 'türkçe ığüşöç'],
  ['neden', '  bosluklu  girdi  ']
];

test('her yuk tipi gidip donuyor', () => {
  const sigil = loadSigil();
  for (const [kind, input] of CASES) {
    const encoded = sigil.encode(kind, input);
    assert.ok(encoded, `${kind}/${input} kodlanmali`);
    const decoded = sigil.decode(encoded);
    assert.ok(decoded, `${kind}/${input} cozulmeli`);
    assert.equal(decoded.kind, kind);
    assert.equal(decoded.input, input);
  }
});

test('kodlama deterministik: ayni yuk ayni adresi verir', () => {
  const a = loadSigil();
  const b = loadSigil();
  for (const [kind, input] of CASES) {
    assert.equal(a.encode(kind, input), b.encode(kind, input));
  }
});

test('tek karakter degisen adres REDDEDILIYOR', () => {
  const sigil = loadSigil();
  const good = sigil.encode('kaz', 'cdbbc3f');
  let checked = 0;
  for (let i = 0; i < good.length; i += 1) {
    const replacement = good[i] === 'A' ? 'B' : 'A';
    const tampered = good.slice(0, i) + replacement + good.slice(i + 1);
    if (tampered === good) continue;
    checked += 1;
    assert.equal(sigil.decode(tampered), null, `${i}. karakter degisince reddedilmeli`);
  }
  assert.ok(checked > 10, 'anlamli sayida varyant sinanmali');
});

test('bozuk ve cop girdiler cokmeden reddediliyor', () => {
  const sigil = loadSigil();
  for (const bad of ['', '!!!', 'A', 'AAAA', '../../etc', 'AQEHY2RiYmMzZg', null, undefined, '%%%%']) {
    assert.equal(sigil.decode(bad), null, `reddedilmeli: ${bad}`);
  }
});

test('bilinmeyen yuk tipi kodlanmiyor', () => {
  const sigil = loadSigil();
  assert.equal(sigil.encode('bilinmeyen', 'x'), null);
  assert.equal(sigil.seal('bilinmeyen', 'x'), null);
  assert.equal(sigil.art('bilinmeyen', 'x'), null);
});

test('adres kisa kaliyor — Huffman gerekmiyor', () => {
  const sigil = loadSigil();
  // Plan: "once p95 URL uzunlugu olculur; 96 karakteri gercekten asiyorsa
  // kanonik Huffman sonradan eklenir." Olcum burada kilitli.
  for (const [kind, input] of CASES) {
    const encoded = sigil.encode(kind, input);
    assert.ok(encoded.length <= 96, `${kind}/${input} -> ${encoded.length} karakter, 96 asilmamali`);
  }
});

test('adres yalnizca URL-guvenli alfabe kullaniyor', () => {
  const sigil = loadSigil();
  for (const [kind, input] of CASES) {
    assert.match(sigil.encode(kind, input), /^[A-Za-z0-9_-]+$/);
  }
});

test('gorunur muhur 6 hane ve karistirilabilir harf icermiyor', () => {
  const sigil = loadSigil();
  for (const [kind, input] of CASES) {
    const seal = sigil.seal(kind, input);
    assert.equal(seal.length, 6);
    assert.doesNotMatch(seal, /[IO01]/, 'elle kopyalanirken karisan karakter olmamali');
    assert.match(seal, /^[2-9A-HJ-NP-Z]+$/);
  }
});

test('farkli yuk farkli muhur veriyor', () => {
  const sigil = loadSigil();
  const seals = new Set(CASES.map(([kind, input]) => sigil.seal(kind, input)));
  assert.equal(seals.size, CASES.length, 'muhurler carpismamali');
});

test('randomart deterministik ve sabit boyutlu', () => {
  const sigil = loadSigil();
  const first = sigil.art('kaz', 'cdbbc3f');
  const second = sigil.art('kaz', 'cdbbc3f');
  assert.equal(first, second, 'ayni yuk ayni deseni vermeli');

  const lines = first.split('\n');
  assert.equal(lines.length, 11, 'cerceve dahil 11 satir (9 yukseklik)');
  for (const line of lines) assert.equal(line.length, 19, 'her satir 19 karakter');
  assert.match(first, /S/, 'baslangic isaretli olmali');
  assert.match(first, /E/, 'bitis isaretli olmali');

  const other = sigil.art('kaz', 'aaaaaaa');
  assert.notEqual(first, other, 'farkli yuk farkli desen vermeli');
});

test('FNV-1a bilinen vektorlerle uyusuyor', () => {
  const sigil = loadSigil();
  // Referans degerler: FNV-1a 32 bit.
  const bytes = (text) => Array.from(text, (c) => c.charCodeAt(0));
  assert.equal(sigil._fnv1a(bytes('')), 0x811c9dc5);
  assert.equal(sigil._fnv1a(bytes('a')), 0xe40c292c);
  assert.equal(sigil._fnv1a(bytes('foobar')), 0xbf9cf968);
});

test('modul saf: DOM, ag ve location kullanmiyor', () => {
  assert.doesNotMatch(sigilSource, /document\./, 'DOM kullanilmamali');
  assert.doesNotMatch(sigilSource, /location\./, 'location kullanilmamali');
  assert.doesNotMatch(sigilSource, /fetch\(/, 'ag kullanilmamali');
  assert.doesNotMatch(sigilSource, /localStorage/, 'depolama kullanilmamali');
});

test('adres icerik TASIMIYOR — yalnizca tur ve girdi', () => {
  const sigil = loadSigil();
  // Uzun bir cikti metnini girdi olarak vermiyoruz; adres yalniz sha tasir.
  const encoded = sigil.encode('kaz', 'cdbbc3f');
  const decoded = sigil.decode(encoded);
  assert.deepEqual(Object.keys(decoded).sort(), ['hash', 'input', 'kind', 'seal']);
  assert.ok(encoded.length < 25, 'adres bir karotun icerigini tasiyamayacak kadar kisa olmali');
});

test('arayuz dondurulmus', () => {
  const sigil = loadSigil();
  assert.ok(Object.isFrozen(sigil));
  assert.ok(Object.isFrozen(sigil.decode(sigil.encode('kaz', 'x'))));
});
