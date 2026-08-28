// ARSIV — cevrimdisi arama indeksi.
//
// Oracle bir Worker'dan gecer ve maliyetlidir. Bu indeks tamamen tarayicida,
// tamamen cevrimdisi ve bedava calisir. Amac yalniz "arama" degil: Oracle'in
// her cumlesi icin bir DAYANAK ZEMINI kurmak (Kazi Evi Z4).
//
// Neden BM25, gomu degil:
//   Gomu "neden bu pasaj" sorusunu cevaplayamaz; BM25 terim terim cevaplayabilir.
//   Gorunurluk icin leksik omurga sart. Ayrica 384 boyut = Ingilizce bge-small;
//   Turkce bge-m3 (1024) butceyi 2.7 kat sisirirdi.
//
// Kullanim:
//   node scripts/build-arsiv-index.js            # assets/data/arsiv-index.json
//   node scripts/build-arsiv-index.js --stats    # yalniz olcum

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const OUT = path.join(root, 'assets', 'data', 'arsiv-index.json');

const read = (relative) => {
  try { return fs.readFileSync(path.join(root, relative), 'utf8'); } catch { return ''; }
};

// --- Turkce normalizasyon -----------------------------------------------
// Tam bir govdeleyici (stemmer) DEGIL: kural tabanli ek kirpma. Turkce
// sondan eklemeli oldugu icin bu kadari BM25 icin kayda deger kazanc verir
// ve yanlis kokleme riski dusuk kalir.
const TR_MAP = { 'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c', 'İ': 'i', 'Ğ': 'g', 'Ü': 'u', 'Ş': 's', 'Ö': 'o', 'Ç': 'c' };

const foldTurkish = (text) => String(text)
  .replace(/[ıİğĞüÜşŞöÖçÇ]/g, (c) => TR_MAP[c] || c)
  .toLowerCase();

// Sik ekler, uzundan kisaya. Kok en az 3 harf kalmali.
const SUFFIXES = [
  'lardan', 'lerden', 'larin', 'lerin', 'lara', 'lere', 'ları', 'leri',
  'imiz', 'iniz', 'lar', 'ler', 'dan', 'den', 'tan', 'ten', 'nin', 'nın',
  'nun', 'nun', 'ile', 'ken', 'dir', 'dır', 'mek', 'mak', 'siz', 'sız',
  'lik', 'lık', 'luk', 'luk', 'ci', 'cı', 'da', 'de', 'ta', 'te', 'in',
  'ın', 'un', 'un', 'la', 'le', 'ya', 'ye', 'yi', 'yı', 'si', 'sı', 'i', 'e', 'a'
];

const trimSuffix = (word) => {
  for (const suffix of SUFFIXES) {
    if (word.length - suffix.length >= 3 && word.endsWith(suffix)) {
      return word.slice(0, word.length - suffix.length);
    }
  }
  return word;
};

const STOPWORDS = new Set([
  've', 'ile', 'bir', 'bu', 'da', 'de', 'icin', 'gibi', 'ama', 'ya', 'ki',
  'the', 'and', 'for', 'that', 'with', 'this', 'you', 'are', 'not', 'but'
]);

const tokenize = (text) => foldTurkish(text)
  .replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/)
  .filter((word) => word.length >= 2 && !STOPWORDS.has(word))
  .map(trimSuffix)
  .filter((word) => word.length >= 2);

// --- Kaynaklar ------------------------------------------------------------
// Yalniz PUBLIC metin. docs/ altindaki 44 bin kelime bilerek DISARIDA:
// yayimlanmadan indekslenirse arama, ziyaretcinin goremedigi bir seye
// dayanak gosterir. Yayimlandiginda buraya eklenecek.

const stripTags = (html) => String(html)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z]+;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// JS kaynagindan tek/cift tirnakli uzun metin parcalari cikar.
const stringsFrom = (source, minLength = 40) => {
  const out = [];
  for (const match of String(source).matchAll(/'((?:[^'\\]|\\.){40,})'|"((?:[^"\\]|\\.){40,})"/g)) {
    const value = (match[1] || match[2] || '').replace(/\\n/g, ' ').replace(/\\'/g, "'");
    if (value.length >= minLength && /\s/.test(value)) out.push(value);
  }
  return out;
};

// --- Bulmaca cevabi redaksiyonu ------------------------------------------
// Madde 3: site ICERIK hakkinda sir tutabilir (bir bulmacanin cevabi),
// MEKANIZMA hakkinda asla. Cevaplar net.js'ten OTOMATIK cikarilir — elle
// liste bayatlar ve bulmaca degisince sessizce sizar.
//
// NOT: changelog'un kendisi ilk sifreyi zaten aciktan yaziyor (kullanicinin
// 2026-07-24 girdisi). Bu katman onu da yakalar; changelog metnine
// dokunulmuyor, yalniz INDEKS temizlenir.
const puzzleAnswers = (() => {
  const net = read('assets/js/home/net.js');
  const values = new Set();
  for (const match of net.matchAll(/password:\s*'([^']+)'/g)) values.add(match[1]);
  for (const match of net.matchAll(/mac:\s*'([^']+)'/g)) values.add(match[1]);
  return [...values].filter((value) => value.length >= 3);
})();

const redactAnswers = (text) => puzzleAnswers.reduce(
  (out, answer) => out.split(answer).join('[bulmaca cevabi]'),
  String(text)
);

function collectDocuments() {
  const docs = [];
  const add = (source, route, title, text) => {
    const clean = String(text).replace(/\s+/g, ' ').trim();
    if (clean.length < 60) return;
    docs.push({ source, route, title, text: redactAnswers(clean) });
  };

  // Makaleler
  stringsFrom(read('assets/js/articles.js')).forEach((text, i) => {
    add('makale', '/pages/makaleler.html', `Makale parcasi ${i + 1}`, text);
  });

  // Changelog — sitenin kendi degisim kaydi
  const changelog = read('pages/changelog.html');
  for (const match of changelog.matchAll(/<article class="entry">([\s\S]*?)<\/article>/g)) {
    const block = match[1];
    const date = (block.match(/datetime="([^"]+)"/) || [])[1] || '';
    const title = stripTags((block.match(/<h2>([\s\S]*?)<\/h2>/) || [])[1] || '');
    const body = stripTags((block.match(/<p>([\s\S]*?)<\/p>/) || [])[1] || '');
    add('changelog', '/pages/changelog.html', `${date} ${title}`.trim(), `${title} ${body}`);
  }

  // Terminal dunyasi: odalar, kalintilar, ruyalar.
  //
  // net.js BILEREK DISARIDA. Sifreleri kaynakta zaten aciktir, ama terminalden
  // ARANABILIR olmasi bariyeri "kaynagi oku"dan "ara sifre yaz"a indirir ve
  // bulmacayi bozar. Madde 3 bunu zaten ayirir: site ICERIK hakkinda sir
  // tutabilir (bir bulmacanin cevabi), MEKANIZMA hakkinda asla.
  [
    ['oda', '/', 'assets/js/home/world.js'],
    ['kalinti', '/', 'assets/js/home/ruins.js'],
    ['ruya', '/', 'assets/js/home/dreams.js']
  ].forEach(([source, route, file]) => {
    stringsFrom(read(file)).forEach((text, i) => {
      add(source, route, `${source} ${i + 1}`, text);
    });
  });

  // Ozgecmis ve hukuk metinleri
  add('profil', '/pages/ozgecmisim.html', 'Ozgecmis', stripTags(read('pages/ozgecmisim.html')));
  add('hukuk', '/legal/kullanim-kosullari.html', 'Kullanim kosullari', stripTags(read('legal/kullanim-kosullari.html')));
  add('hukuk', '/legal/kvkk-aydinlatma.html', 'KVKK aydinlatma', stripTags(read('legal/kvkk-aydinlatma.html')));

  return docs;
}

// --- Pasajlama ------------------------------------------------------------
const WINDOW_WORDS = 60;
const OVERLAP = 0.25;

function windowize(doc) {
  const words = doc.text.split(/\s+/);
  if (words.length <= WINDOW_WORDS) return [{ ...doc, text: doc.text }];
  const stride = Math.max(1, Math.round(WINDOW_WORDS * (1 - OVERLAP)));
  const out = [];
  for (let start = 0; start < words.length; start += stride) {
    const slice = words.slice(start, start + WINDOW_WORDS);
    if (slice.length < 20 && out.length) break;
    out.push({ ...doc, text: slice.join(' ') });
  }
  return out;
}

// --- SimHash yakin-kopya eleme -------------------------------------------
// Ayni cumle birden cok yerde geciyorsa indeks sisiyor ve arama ayni seyi
// uc kez gosteriyor. 64 bit SimHash + Hamming < 6 ile elenir.
function simhash(tokens) {
  const vector = new Array(64).fill(0);
  for (const token of tokens) {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < token.length; i += 1) {
      h1 = Math.imul(h1 ^ token.charCodeAt(i), 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ token.charCodeAt(i), 0x85ebca6b) >>> 0;
    }
    for (let bit = 0; bit < 32; bit += 1) {
      vector[bit] += (h1 >> bit) & 1 ? 1 : -1;
      vector[bit + 32] += (h2 >> bit) & 1 ? 1 : -1;
    }
  }
  return vector.map((value) => (value > 0 ? 1 : 0));
}

const hamming = (a, b) => a.reduce((sum, bit, i) => sum + (bit === b[i] ? 0 : 1), 0);

// --- Ana akis --------------------------------------------------------------

const documents = collectDocuments();
const passages = documents.flatMap(windowize);

const kept = [];
const signatures = [];
let dropped = 0;
for (const passage of passages) {
  const tokens = tokenize(passage.text);
  if (tokens.length < 8) { dropped += 1; continue; }
  const signature = simhash(tokens);
  if (signatures.some((existing) => hamming(existing, signature) < 6)) { dropped += 1; continue; }
  signatures.push(signature);
  kept.push({ ...passage, tokens });
}

// BM25 icin ters indeks
const df = new Map();
kept.forEach((passage) => {
  for (const token of new Set(passage.tokens)) df.set(token, (df.get(token) || 0) + 1);
});

// Tek belgede gecen nadir terimler indeksi sisirir, arama kalitesine katkisi az.
const vocabulary = [...df.entries()].filter(([, count]) => count >= 2).map(([token]) => token).sort();
const termIndex = new Map(vocabulary.map((token, i) => [token, i]));

const postings = vocabulary.map(() => []);
kept.forEach((passage, docId) => {
  const counts = new Map();
  for (const token of passage.tokens) {
    if (!termIndex.has(token)) continue;
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  for (const [token, tf] of counts.entries()) {
    postings[termIndex.get(token)].push([docId, tf]);
  }
});

const lengths = kept.map((passage) => passage.tokens.length);
const avgdl = lengths.reduce((sum, value) => sum + value, 0) / (lengths.length || 1);

const payload = {
  v: 1,
  bm25: { k1: 1.2, b: 0.75 },
  avgdl: Math.round(avgdl * 100) / 100,
  docs: kept.map((passage, i) => ({
    s: passage.source,
    r: passage.route,
    t: passage.title.slice(0, 80),
    x: passage.text.slice(0, 400),
    l: lengths[i]
  })),
  vocab: vocabulary,
  post: postings
};

if (process.argv.includes('--stats')) {
  console.log(`kaynak belge   : ${documents.length}`);
  console.log(`pasaj (ham)    : ${passages.length}`);
  console.log(`elenen         : ${dropped} (kisa ya da yakin-kopya)`);
  console.log(`indekslenen    : ${kept.length}`);
  console.log(`sozluk         : ${vocabulary.length} terim (>=2 belgede)`);
  console.log(`ortalama uzunluk: ${payload.avgdl} token`);
  console.log(`boyut          : ${Math.round(JSON.stringify(payload).length / 1024)} KB`);
  const bySource = new Map();
  kept.forEach((p) => bySource.set(p.source, (bySource.get(p.source) || 0) + 1));
  console.log('kaynak dagilimi:');
  [...bySource.entries()].sort((a, b) => b[1] - a[1]).forEach(([s, n]) => console.log(`  ${s.padEnd(12)} ${n}`));
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(payload)}\n`);
console.log(
  `arsiv-index.json yazildi: ${kept.length} pasaj, ${vocabulary.length} terim, ` +
  `${Math.round(fs.statSync(OUT).size / 1024)} KB`
);
