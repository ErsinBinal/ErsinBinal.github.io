import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// GLOSSARY — terminal kendi kelimelerini uydurmayi biraktigi noktanin kaydi.
//
// Bu testlerin isi sozlugu dogrulamak degil, TERMINALIN DILINI kilitlemek:
// uydurma terimler geri sizarsa burasi calmali.

const glossarySource = await readFile(new URL('../../assets/js/home/glossary.js', import.meta.url), 'utf8');
const tortuSource = await readFile(new URL('../../assets/js/home/tortu.js', import.meta.url), 'utf8');
const filizSource = await readFile(new URL('../../assets/js/home/filiz.js', import.meta.url), 'utf8');

function loadGlossary() {
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(glossarySource, context, { filename: 'glossary.js' });
  return context.window.ConviviumHome.createGlossary();
}

test('whatis gercek terimi tanimliyor ve KAYNAGINI soyluyor', () => {
  const g = loadGlossary();
  for (const term of ['checksum', 'cluster', 'epoch', 'gate', 'filter', 'MDL', 'Levin']) {
    const out = g.whatis(term);
    assert.match(out, new RegExp(`^\\] ${term}`, 'm'), `${term} tanimlanmali`);
    assert.match(out, /kaynak/, `${term} nereden geldigini soylemeli`);
  }
});

test('sozluk "bu bize mi ozgu" sorusunu CEVAPLIYOR', () => {
  const g = loadGlossary();
  // Evrensel terimler kaynagini disarida gosterir...
  assert.match(g.whatis('cluster'), /graf teorisi/);
  assert.match(g.whatis('gate'), /CI\/CD/);
  // ...bize ozel adlar ise ACIKCA boyle isaretlenir.
  assert.match(g.whatis('TORTU'), /bu siteye ozel ad/);
  assert.match(g.whatis('FILIZ'), /bu siteye ozel ad/);
});

test('bize ozel her adin INGILIZCE karsiligi yazili', () => {
  const g = loadGlossary();
  assert.match(g.whatis('TORTU'), /repository archaeology/);
  assert.match(g.whatis('OKKAM'), /program synthesis/);
  assert.match(g.whatis('FILIZ'), /fuzzing/);
  assert.match(g.whatis('SIGIL'), /permalink/);
  assert.match(g.whatis('ARSIV'), /offline full-text search/);
});

test('apropos tanimlarda arayabiliyor', () => {
  const g = loadGlossary();
  assert.match(g.apropos('git'), /commit/);
  assert.match(g.apropos('bilinmeyenkelimexyz'), /eslesen terim yok/);
});

test('whatis bilinmeyen terimde apropos a yonlendiriyor', () => {
  assert.match(loadGlossary().whatis('zzzz'), /apropos/);
});

test('argumansiz whatis butun terimleri listeliyor', () => {
  const g = loadGlossary();
  const out = g.whatis('');
  assert.match(out, /terim kayitli/);
  assert.ok(g.size() >= 20, 'anlamli sayida terim olmali');
});

// --- DILIN KILIDI ---------------------------------------------------------
// Uydurma terimler kullaniciya BASILAN metne geri donmemeli. Yorum
// satirlarinda serbest (orada tarihi anlatiyoruz), ciktida degil.

const basilanMetin = (source) => source
  .split('\n')
  .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
  .join('\n');

test('TORTU ciktisi artik UYDURMA terim basmiyor', () => {
  const out = basilanMetin(tortuSource);
  assert.doesNotMatch(out, /'\] KAROT|'\] TABAN KAYA|'\] DAMARLAR|'\] TABAKALAR/,
    'baslıklar gercek terimlere gecmis olmali');
  assert.match(out, /COMMIT|CLUSTERS|EPOCHS|CORE FILES/);
});

test('FILIZ ciktisi artik UYDURMA terim basmiyor', () => {
  const out = basilanMetin(filizSource);
  assert.match(out, /GENERATOR/);
  assert.match(out, /FILTER/);
  assert.match(out, /GATE/);
  assert.match(out, /checksum/);
  assert.doesNotMatch(out, /'\s*ELEK'|'\s*ZAR\s/, 'ELEK/ZAR basliklari kalkmis olmali');
});

test('sergiler kendi INGILIZCE karsiligini basiyor', () => {
  assert.match(filizSource, /yazilim dilinde: fuzzing/);
});

test('sozluk modulu saf: DOM, ag, zaman, rastgelelik yok', () => {
  assert.doesNotMatch(glossarySource, /document\./);
  assert.doesNotMatch(glossarySource, /fetch\(/);
  assert.doesNotMatch(glossarySource, /localStorage/);
  assert.doesNotMatch(glossarySource, /Math\.random/);
  assert.doesNotMatch(glossarySource, /Date\.now|new Date/);
});
