// FILIZ — sitenin atolyesi. Kendi bulmacalarini URETIR.
//
// Anayasa Madde 6: uretim, ancak DOGRULAYICISI olan yerde serbesttir.
// Uretilen sey bir OKK-8 programidir; dogrulayicisi onu calistirmaktir.
// Bu yuzden burada uydurma yoktur: her dizinin altinda onu GERCEKTEN ureten
// bir program durur ve o program her an tekrar kosulabilir.
//
// Uc organ:
//   URETEC : butun kisa programlari tarar, ne urettiklerine bakar (kesif)
//   ELEK   : mekanik olarak eler; REDDEDEBILMEK zorundadir, redleri yayinlar
//   ZAR    : bu script hicbir seyi yayina sokmaz. Yalniz dosya yazar.
//            4. boyuta gecis git diff + insan onayi ile olur (Madde 6/3).
//
// Uretec ile elek AYNI motoru kullanir (assets/js/home/okkam.js): olculen
// zorluk, ziyaretcinin gordugu zorluktur.
//
// Kullanim:
//   npm run build:filiz              # assets/data/filiz.json
//   npm run build:filiz -- --stats   # yalniz olcum, dosya yazmaz
//   npm run build:filiz -- --butce 60

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const OUT = path.join(root, 'assets', 'data', 'filiz.json');
const POOL = path.join(root, 'assets', 'data', 'okkam.json');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : fallback;
};

// --- Motoru MODULDEN yukle -------------------------------------------------
const source = fs.readFileSync(path.join(root, 'assets', 'js', 'home', 'okkam.js'), 'utf8');
const context = vm.createContext({ window: {}, console, Math, Array, Number, Object, String });
vm.runInContext(source, context, { filename: 'okkam.js' });
const okkam = context.window.ConviviumHome.createOkkam({});
const OPS = okkam._ops;
const K = OPS.length;

// Ziyaretcinin terminalde sahip oldugu butce. Siniflandirma bununla yapilir:
// "cozuldu" demek, "okkam <dizi>" yazan biri gercekten cevap alir demektir.
const VISITOR = Object.freeze({ maxPhase: 10, maxTried: 3_000_000 });

const MAX_DISCOVER_LENGTH = arg('uzunluk', 7);
const CLASSIFY_BUDGET_MS = arg('butce', 240) * 1000;
const TERMS = 6;              // hedef dizinin terim sayisi — kural sonsuz, ornek sonlu: 6 terim MDL'i durust kilar
const MAX_MAGNITUDE = 10_000; // okunamayacak kadar buyuk sayi bulmaca olmaz

const show = (program) => program.map((op) => OPS[op]).join(' ');

// --- URETEC ----------------------------------------------------------------
// Butun programlari kanonik sirayla tarar. OUT icermeyen program cikti
// uretemez: hic calistirilmadan elenir.
function* enumerate(length) {
  const p = new Array(length).fill(0);
  for (;;) {
    if (p.includes(5)) yield p;
    let i = length - 1;
    while (i >= 0 && p[i] === K - 1) { p[i] = 0; i -= 1; }
    if (i < 0) return;
    p[i] += 1;
  }
}

const discover = () => {
  const found = new Map();   // dizi -> bulunan EN KISA program
  let scanned = 0;
  for (let length = 1; length <= MAX_DISCOVER_LENGTH; length += 1) {
    for (const program of enumerate(length)) {
      scanned += 1;
      const result = okkam._run(program, 300, TERMS + 1);
      if (result.out.length < 3) continue;
      const target = result.out.slice(0, TERMS);
      const key = target.join(',');
      // Kisa uzunluktan uzuna tarandigi icin ilk goren en kisadir.
      if (!found.has(key)) found.set(key, { target, program: program.slice(), length });
    }
  }
  return { found, scanned };
};

// --- ELEK ------------------------------------------------------------------
// Her ret GEREKCELIDIR ve yayinlanir. Hicbir seyi reddetmeyen elek tiyatrodur.
const existingPool = JSON.parse(fs.readFileSync(POOL, 'utf8'));
const known = new Set(existingPool.puzzles.map((p) => p.target.join(',')));

const sieve = (candidate) => {
  const { target, program } = candidate;
  if (target.length < 3) return 'uc terimden kisa';
  if (new Set(target).size === 1) return 'sabit dizi — oruntu yok';
  if (target.some((v) => Math.abs(v) > MAX_MAGNITUDE)) return 'sayilar okunamayacak kadar buyuk';
  if (known.has(target.join(','))) return 'zaten OKKAM havuzunda';
  const dataBits = okkam._dataBits(target);
  const ruleBits = Math.round(program.length * Math.log2(K));
  if (ruleBits >= dataBits) return `MDL kazanci yok (kural ${ruleBits} bit >= veri ${dataBits} bit)`;
  return null;
};

// --- ZAR ONCESI SINIFLANDIRMA ---------------------------------------------
// Iki raf:
//   cozulen : OKKAM ziyaretci butcesiyle buluyor -> oynanabilir bulmaca
//   acik    : FILIZ programi BILIYOR (kendisi uretti), OKKAM bulamiyor
//             -> durust meydan okuma. Makinenin sinirinin kaniti.
const classify = (candidates) => {
  const solved = [];
  const open = [];
  let unclassified = 0;
  const started = Date.now();
  for (const c of candidates) {
    if (Date.now() - started > CLASSIFY_BUDGET_MS) { unclassified += 1; continue; }
    const t0 = Date.now();
    const r = okkam._search(c.target, VISITOR);
    const ms = Date.now() - t0;
    const dataBits = okkam._dataBits(c.target);
    if (r.found) {
      solved.push({
        target: c.target,
        program: r.text,
        length: r.length,
        bits: r.bits,
        gain: Math.round(((dataBits - r.bits) / dataBits) * 100),
        tried: r.tried,
        ms,
        phase: r.phase
      });
    } else {
      const ruleBits = Math.round(c.length * Math.log2(K));
      open.push({
        target: c.target,
        // Cevap saklanir (icerik sirri serbest, Madde 3) ama UZUNLUGU ilan
        // edilir: ziyaretci neyi yenmesi gerektigini bilir.
        length: c.length,
        bits: ruleBits,
        gain: Math.round(((dataBits - ruleBits) / dataBits) * 100),
        seal: seal(c.program),
        tried: r.tried,
        ms
      });
    }
  }
  return { solved, open, unclassified };
};

// FNV-1a 32 bit — sigil.js ile ayni muhur. Kriptografik degil ve oyle
// sunulmuyor: amaci cevabi dogrulatmak, gizlemek degil.
const seal = (program) => {
  let hash = 0x811c9dc5;
  for (const op of program) {
    hash ^= op & 0xff;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
};

// --- KOS -------------------------------------------------------------------
const t0 = Date.now();
const { found, scanned } = discover();
const discoverMs = Date.now() - t0;

const rejected = [];
const passed = [];
for (const candidate of found.values()) {
  const why = sieve(candidate);
  if (why) rejected.push({ target: candidate.target, why });
  else passed.push(candidate);
}

// Once kisa programlilar: hem daha ilginc hem siniflandirmasi daha ucuz.
passed.sort((a, b) => a.length - b.length || a.target.join(',').localeCompare(b.target.join(',')));

const { solved, open, unclassified } = classify(passed);
solved.sort((a, b) => b.gain - a.gain || a.tried - b.tried);
open.sort((a, b) => a.length - b.length || b.gain - a.gain);

// Red DOKUMU tam sayilir; ornek listesi kirpilir. Ikisi karistirilirsa
// ekranda "1624 elendi" yazip altinda 40 tane sayan bir tablo cikar ve
// bu bir yalandir. Sayim ayri alanda tasinir.
const redSayim = {};
rejected.forEach((r) => {
  const key = String(r.why).replace(/\s*\(.*\)\s*/, '').trim();
  redSayim[key] = (redSayim[key] || 0) + 1;
});

const payload = {
  v: 1,
  uretim: {
    tarandi: scanned,
    uzunluk: MAX_DISCOVER_LENGTH,
    dizi: found.size,
    terim: TERMS,
    ms: discoverMs
  },
  elek: {
    aday: found.size,
    gecen: passed.length,
    elenen: rejected.length,
    siniflandirilamayan: unclassified,
    // TAM dokum — asagidaki `red` listesi yalnizca ornektir.
    sayim: redSayim
  },
  raf: { cozulen: solved.length, acik: open.length },
  cozulen: solved.slice(0, 24),
  acik: open.slice(0, 24),
  // Redler YAYINLANIR. Elek ne attigini saklarsa elek degildir.
  red: rejected.slice(0, 40)
};

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

console.log(`URETEC  ${scanned.toLocaleString('tr-TR')} program tarandi (uzunluk <= ${MAX_DISCOVER_LENGTH}), ${found.size} farkli dizi, ${discoverMs}ms`);
console.log(`ELEK    ${passed.length} gecti, ${rejected.length} elendi (%${pct(rejected.length, found.size)} red)`);
console.log(`        cozulen ${solved.length} · acik ${open.length}${unclassified ? ` · butce yetmedi ${unclassified}` : ''}`);

if (process.argv.includes('--stats')) {
  console.log('\nCOZULEN (OKKAM ziyaretci butcesiyle buluyor):');
  payload.cozulen.slice(0, 10).forEach((p) => console.log(
    `  [${p.target.join(', ')}]`.padEnd(24) + `${p.program.padEnd(30)} %${p.gain} kazanc  ${p.tried.toLocaleString('tr-TR')} deneme`
  ));
  console.log('\nACIK (FILIZ biliyor, OKKAM bulamiyor):');
  payload.acik.slice(0, 10).forEach((p) => console.log(
    `  [${p.target.join(', ')}]`.padEnd(24) + `${p.length} talimat / ${p.bits} bit  muhur ${p.seal}`
  ));
  const sebep = new Map();
  rejected.forEach((r) => sebep.set(r.why.replace(/\(.*\)/, '').trim(), (sebep.get(r.why.replace(/\(.*\)/, '').trim()) || 0) + 1));
  console.log('\nRED SEBEPLERI:');
  [...sebep.entries()].sort((a, b) => b[1] - a[1]).forEach(([w, n]) => console.log(`  ${String(n).padStart(4)}  ${w}`));
  process.exit(0);
}

// ELEK REDDEDEMIYORSA BOZUKTUR. Sessizce gecmez, build duser.
if (!rejected.length) {
  console.error('build-filiz: elek hicbir seyi reddetmedi — kapi bozuk, dosya yazilmadi.');
  process.exit(1);
}
if (!solved.length && !open.length) {
  console.error('build-filiz: hicbir aday siniflandirilamadi, dosya yazilmadi.');
  process.exit(1);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(payload)}\n`);
console.log(`\nfiliz.json yazildi: ${Math.round(fs.statSync(OUT).size / 1024)} KB`);
console.log('ZAR: bu dosya yayina GIRMEDI. git diff + onay gerekir.');
