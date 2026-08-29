// OKKAM bulmaca havuzu — zorluk ELLE YAZILMAZ, OLCULUR.
//
// Her aday dizi icin Levin aramasi gercekten kosulur; bulunan en kisa
// programin uzunlugu, gereken faz ve denenen program sayisi kaydedilir.
// Boylece "zorluk" bir tahmin degil, olculmus arama maliyetidir.
//
// Cok pahali cikanlar havuza ALINMAZ: terminalde bir saniyeden uzun donan
// bir komut sergi degil, kilitlenme gibi hissedilir.
//
// Kullanim:
//   npm run build:okkam            # assets/data/okkam.json
//   npm run build:okkam -- --stats # yalniz olcum

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const OUT = path.join(root, 'assets', 'data', 'okkam.json');

// Motoru MODULDEN yukle: build ile runtime ayni aramayi kosmali, yoksa
// olculen zorluk kullanicinin gordugu zorluk olmaz.
const source = fs.readFileSync(path.join(root, 'assets', 'js', 'home', 'okkam.js'), 'utf8');
const context = vm.createContext({ window: {}, console, Math, Array, Number, Object, String });
vm.runInContext(source, context, { filename: 'okkam.js' });
const okkam = context.window.ConviviumHome.createOkkam({});

// Aday diziler. Hepsi tanidik oruntuler — ziyaretci "bunu ben de yazabilirim"
// diyebilmeli, yoksa duello anlamsiz.
const CANDIDATES = [
  ['dogal sayilar', [1, 2, 3, 4]],
  ['ciftler', [2, 4, 6, 8]],
  ['ucun katlari', [3, 6, 9]],
  ['sabit bir', [1, 1, 1]],
  ['sifirlar', [0, 0, 0]],
  ['geri sayim', [-1, -2, -3]],
  ['kareler', [1, 4, 9]],
  ['besin katlari', [5, 10, 15]],
  ['dorder artan', [4, 8, 12]],
  ['bir eksik', [0, 1, 2, 3]],
  ['ikiser geri', [-2, -4, -6]],
  ['yediler', [7, 14, 21]]
];

// Terminalde kabul edilebilir tavan. Uzeri havuza girmez.
const MAX_TRIED = 3_000_000;
const MAX_MS = 900;

const measured = [];
const rejected = [];

for (const [label, target] of CANDIDATES) {
  const started = process.hrtime.bigint();
  const result = okkam._search(target, { maxPhase: 12, maxTried: MAX_TRIED });
  const ms = Number(process.hrtime.bigint() - started) / 1e6;

  if (!result.found) {
    // "Bulunamadi" ile "butce bitti" ayni sey DEGIL. Ikincisi makinenin
    // sinirini gosterir, dizinin cozulemezligini degil.
    rejected.push({
      label,
      why: result.exhausted
        ? `arama butcesi bitti (${result.tried.toLocaleString('tr-TR')} deneme) — program muhtemelen 5+ talimat`
        : 'bu dilde uretilemiyor'
    });
    continue;
  }
  if (result.tried > MAX_TRIED || ms > MAX_MS) {
    rejected.push({ label, why: `cok pahali (${result.tried.toLocaleString('tr-TR')} deneme / ${Math.round(ms)}ms)` });
    continue;
  }

  measured.push({
    label,
    target,
    // Runtime ayni sonucu bu sinirlarla bulmali; fazla arama yaptirmayalim.
    phase: result.phase,
    length: result.length,
    // Olculmus maliyet — zorluk etiketi bundan turer, elle yazilmaz.
    tried: result.tried,
    ms: Math.round(ms),
    program: result.text,
    bits: result.bits
  });
}

const payload = { v: 1, ops: okkam._ops, puzzles: measured };

if (process.argv.includes('--stats')) {
  console.log(`aday    : ${CANDIDATES.length}`);
  console.log(`havuz   : ${measured.length}`);
  console.log(`elenen  : ${rejected.length}`);
  console.log('');
  measured
    .sort((a, b) => a.tried - b.tried)
    .forEach((p) => console.log(
      `  ${p.label.padEnd(16)} ${String(p.length)} talimat / ${String(p.bits).padStart(2)} bit  ` +
      `faz ${String(p.phase).padStart(2)}  ${String(p.tried).padStart(9)} deneme  ${String(p.ms).padStart(4)}ms  ${p.program}`
    ));
  if (rejected.length) {
    console.log('\nelenenler:');
    rejected.forEach((r) => console.log(`  ${r.label.padEnd(16)} ${r.why}`));
  }
  console.log(`\nboyut: ${Math.round(JSON.stringify(payload).length / 1024)} KB`);
  process.exit(0);
}

if (!measured.length) {
  console.error('build-okkam: havuz bos, dosya yazilmadi.');
  process.exit(1);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(payload)}\n`);
console.log(`okkam.json yazildi: ${measured.length} bulmaca, ${rejected.length} elendi, ${Math.round(fs.statSync(OUT).size / 1024)} KB`);
