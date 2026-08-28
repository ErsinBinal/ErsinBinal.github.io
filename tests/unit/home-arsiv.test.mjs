import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// Z4 ARSIV — cevrimdisi BM25 arama.
//
// Iki kritik sozlesme:
//   1. Build ve runtime AYNI normalizasyonu kullanmali; ayrisirsa sorgu
//      indekste hicbir seye denk gelmez ve arama sessizce bos doner.
//   2. Bulmaca cevaplari indekse SIZMAMALI (Madde 3: icerik sirri mesru).

const arsivSource = await readFile(
  new URL('../../assets/js/home/arsiv.js', import.meta.url),
  'utf8'
);
const buildSource = await readFile(
  new URL('../../scripts/build-arsiv-index.js', import.meta.url),
  'utf8'
);
const netSource = await readFile(
  new URL('../../assets/js/home/net.js', import.meta.url),
  'utf8'
);
const index = JSON.parse(await readFile(
  new URL('../../assets/data/arsiv-index.json', import.meta.url),
  'utf8'
));

function loadArsiv(data = index) {
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(arsivSource, context, { filename: 'arsiv.js' });
  return context.window.ConviviumHome.createArsiv({ getData: () => data });
}

// --- Sozlesme 1: normalizasyon esitligi -----------------------------------

test('build ve runtime AYNI normalizasyonu kullaniyor', () => {
  // Iki tarafin da tokenize'ini kaynaktan cikarip ayni girdilerde karsilastir.
  const grab = (source) => {
    const parts = ['TR_MAP', 'foldTurkish', 'SUFFIXES', 'trimSuffix', 'STOPWORDS', 'tokenize']
      .map((name) => {
        const start = source.indexOf(`const ${name} =`);
        assert.notEqual(start, -1, `${name} bulunmali`);
        let end = source.indexOf('\n\n', start);
        if (end === -1) end = source.length;
        return source.slice(start, end);
      });
    const context = vm.createContext({ String, Set, Math, Array });
    vm.runInContext(`${parts.join('\n')}\nglobalThis.__tok = tokenize;`, context);
    return context.__tok;
  };

  const buildTok = grab(buildSource);
  const runtimeTok = grab(arsivSource);

  const samples = [
    'Oracle kanalı', 'HOLOGRAM kalıntıları', 'dart skorbordu',
    'şifreler ipuçlarında saklı', 'Türkçe ığüşöç ÇĞİÖŞÜ',
    'terminal komutları ve rehberler', '', '   ', 'a', 'bir ve ile bu'
  ];
  for (const sample of samples) {
    assert.deepEqual(
      Array.from(buildTok(sample)),
      Array.from(runtimeTok(sample)),
      `normalizasyon ayrisiyor: "${sample}"`
    );
  }
});

// --- Sozlesme 2: bulmaca cevabi sizmiyor ---------------------------------

test('bulmaca cevaplari indekse SIZMIYOR', () => {
  const answers = [...netSource.matchAll(/password:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(answers.length >= 3, 'net.js cevaplari okunabilmeli');
  const raw = JSON.stringify(index);
  for (const answer of answers) {
    assert.ok(!raw.includes(answer), `bulmaca cevabi indekste gorunmemeli: ${answer}`);
  }
});

test('redaksiyon listesi ELLE degil, net.js\'ten turetiliyor', () => {
  // Elle liste bulmaca degisince sessizce bayatlar ve cevap sizar.
  assert.match(buildSource, /puzzleAnswers/, 'redaksiyon katmani olmali');
  assert.match(buildSource, /password:\\s\*'\(\[\^'\]\+\)'/, 'cevaplar net.js\'ten cikarilmali');
});

test('/net bulmacasi indekse hic girmiyor', () => {
  assert.ok(
    !buildSource.includes("'assets/js/home/net.js']"),
    'net.js kaynak listesinde olmamali'
  );
  assert.match(buildSource, /net\.js BILEREK DISARIDA/, 'gerekce kaynakta yazili olmali');
});

// --- BM25 davranisi -------------------------------------------------------

test('arama sonuc buluyor ve skoru dokuyor', () => {
  const arsiv = loadArsiv();
  const result = arsiv.search('hologram');
  assert.ok(result.hits.length > 0, 'sonuc bulunmali');
  for (const hit of result.hits) {
    assert.ok(hit.skor > 0);
    assert.ok(Array.isArray(hit.why) && hit.why.length > 0, 'her sonuc gerekce tasimali');
    for (const part of hit.why) {
      assert.equal(typeof part.terim, 'string');
      assert.equal(typeof part.df, 'number');
      assert.equal(typeof part.tf, 'number');
      assert.ok(Number.isInteger(part.katki), 'katki tamsayi olmali (Madde 5)');
    }
  }
});

test('siralama deterministik: ayni sorgu ayni sira', () => {
  const a = loadArsiv();
  const b = loadArsiv();
  for (const query of ['hologram', 'oracle', 'terminal komut', 'dart']) {
    const first = Array.from(a.search(query).hits, (h) => `${h.t}|${h.skor}`);
    const second = Array.from(b.search(query).hits, (h) => `${h.t}|${h.skor}`);
    assert.deepEqual(first, second, `siralama kararsiz: ${query}`);
  }
});

test('skor tamsayi — float hash\'lenmiyor (Madde 5)', () => {
  const arsiv = loadArsiv();
  for (const hit of arsiv.search('terminal').hits) {
    assert.ok(Number.isInteger(hit.skor), `skor tamsayi olmali: ${hit.skor}`);
  }
});

test('MMR cesitlilik uyguluyor: tek kaynaktan tas gibi dolmuyor', () => {
  const arsiv = loadArsiv();
  const hits = arsiv.search('convivium terminal').hits;
  if (hits.length >= 3) {
    const sources = new Set(Array.from(hits, (h) => h.s));
    assert.ok(sources.size >= 2, 'sonuclar en az iki farkli kaynaktan gelmeli');
  }
});

test('bilinen sorgular dogru kaynagi buluyor', () => {
  const arsiv = loadArsiv();
  const golden = [
    ['hologram', 'hologram'],
    ['dart skorbord', 'dart'],
    ['kvkk', 'kvkk'],
    ['oracle', 'oracle']
  ];
  for (const [query, expected] of golden) {
    const hits = arsiv.search(query).hits;
    assert.ok(hits.length > 0, `"${query}" sonuc vermeli`);
    const found = hits.some((hit) => `${hit.t} ${hit.x}`.toLowerCase().includes(expected));
    assert.ok(found, `"${query}" icin ilk 5'te "${expected}" gecmeli`);
  }
});

test('bos ve anlamsiz sorgu cokmuyor', () => {
  const arsiv = loadArsiv();
  assert.equal(arsiv.search('').hits.length, 0);
  assert.equal(arsiv.search('   ').hits.length, 0);
  assert.equal(arsiv.search('zzzqqqxxx').hits.length, 0);
  assert.match(arsiv.render('zzzqqqxxx'), /bulunamadi/);
});

test('indeks yoksa fail-closed', () => {
  const arsiv = loadArsiv(null);
  assert.equal(arsiv.ready(), false);
  assert.equal(arsiv.search('x'), null);
  assert.match(arsiv.render('x'), /yuklenmedi/);
  assert.match(arsiv.stats(), /yuklenmedi/);
});

test('modul saf: DOM, ag ve rastgelelik yok', () => {
  assert.doesNotMatch(arsivSource, /document\./);
  assert.doesNotMatch(arsivSource, /fetch\(/);
  assert.doesNotMatch(arsivSource, /localStorage/);
  assert.doesNotMatch(arsivSource, /Math\.random/);
});

test('indeks butcesi: gzip disi ham boyut makul', async () => {
  const { size } = await readFile(
    new URL('../../assets/data/arsiv-index.json', import.meta.url)
  ).then((buffer) => ({ size: buffer.length }));
  // gzip ile ~55 KB telden gecer; ham dosya tembel cekilir ve precache disidir.
  assert.ok(size < 400 * 1024, `indeks ${Math.round(size / 1024)} KB — cok buyudu`);
  assert.ok(index.docs.length > 100, 'anlamli sayida pasaj olmali');
});
