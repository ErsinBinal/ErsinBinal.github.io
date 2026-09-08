// NABIZ — ana sayfadaki canli sayilarin kaynagi.
//
// Kural: ana sayfada gorunen HICBIR SAYI elle yazilmaz. "434 komut" bugun
// dogru, uc ay sonra yalan olur. Bu script sayilari gercek kaynaktan turetir;
// `--check` ile de surukleme (drift) yakalanir, tipki sync-cache-versions'ta
// oldugu gibi.
//
// Kullanim:
//   npm run build:nabiz            # assets/data/nabiz.json
//   npm run build:nabiz -- --check # sadece dogrula, yazma (CI kapisi)

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const OUT = path.join(root, 'assets', 'data', 'nabiz.json');
const oku = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const sayHtml = (dir) => {
  try { return fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith('.html')).length; }
  catch { return 0; }
};

// --- Terminal komut uzayi: protokolun KENDI tanimindan sayilir --------------
const protocol = oku('assets/js/home-protocol.js');
const start = protocol.indexOf('const commandDefinitions = ');
const body = protocol.slice(start, protocol.indexOf('\n      ];', start));
const komutlar = [...body.matchAll(/command:\s*'([^']+)'/g)].map((m) => m[1]);
const takmaAd = [...body.matchAll(/aliases:\s*\[([^\]]*)\]/g)]
  .reduce((n, m) => n + (m[1].match(/'([^']*)'/g) || []).length, 0);

// Oyun komutlari: oyun modullerine giden komutlar.
const OYUN = /^(pipe|outrun|deb|bugy|screen saver|run logic|neon)/;
const oyunKomut = komutlar.filter((c) => OYUN.test(c)).length;

// --- Sozluk ----------------------------------------------------------------
const glossary = oku('assets/js/home/glossary.js');
const sozlukTerim = (glossary.match(/^\s{4}'?[A-Za-z][\w .-]*'?:\s*\{$/gm) || []).length;

// --- Veri havuzlari --------------------------------------------------------
const json = (p) => { try { return JSON.parse(oku(p)); } catch { return null; } };
const okkam = json('assets/data/okkam.json');
const arsiv = json('assets/data/arsiv-index.json');
const tortu = json('assets/data/tortu.json');

// Kazi seridi tortu.json'un TAMAMINA ihtiyac duymaz: sekiz ad + sayi yeter.
// tortu.json 86 KB; ana sayfaya cekmek dekoratif bir serit icin fahis olurdu.
// Ozet burada cikarilir, ana sayfa tek kucuk dosya yukler.
const donem = tortu && Array.isArray(tortu.eras)
  ? tortu.eras.map((e) => ({ ad: e.label, n: e.commits }))
  : [];

// --- Yayin -----------------------------------------------------------------
const changelogGirdi = (oku('pages/changelog.html').match(/class="entry"/g) || []).length;
const rssSinyal = (oku('signals.xml').match(/<item>/g) || []).length;

const payload = {
  v: 1,
  terminal: {
    komut: komutlar.length,
    takmaAd,
    yazilabilir: komutlar.length + takmaAd,
    oyunKomut,
    sozlukTerim
  },
  okkam: {
    bulmaca: okkam ? okkam.puzzles.length : 0,
    opcode: okkam ? okkam.ops.length : 0
  },
  arsiv: { pasaj: arsiv && Array.isArray(arsiv.docs) ? arsiv.docs.length : 0 },
  yayin: { changelogGirdi, rssSinyal },
  sayfa: { oyun: sayHtml('games'), arac: sayHtml('tools') },
  kazi: {
    commit: tortu && tortu.repo ? tortu.repo.commits : 0,
    aktifGun: tortu && tortu.repo ? tortu.repo.activeDays : 0,
    donem
  }
};

const metin = `${JSON.stringify(payload)}\n`;

if (process.argv.includes('--check')) {
  let mevcut = null;
  try { mevcut = fs.readFileSync(OUT, 'utf8'); } catch { mevcut = null; }
  if (mevcut !== metin) {
    console.error('nabiz.json guncel DEGIL — ana sayfadaki sayilar gercegi yansitmiyor.');
    console.error('Duzeltmek icin: npm run build:nabiz');
    if (mevcut) {
      try {
        const eski = JSON.parse(mevcut);
        console.error(`  komut      ${eski.terminal.komut} -> ${payload.terminal.komut}`);
        console.error(`  yazilabilir ${eski.terminal.yazilabilir} -> ${payload.terminal.yazilabilir}`);
      } catch { /* bicimi bozuksa fark dokumu atlanir */ }
    }
    process.exit(1);
  }
  console.log(`nabiz.json guncel (${payload.terminal.yazilabilir} yazilabilir, ${payload.okkam.bulmaca} bulmaca).`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, metin);
console.log('nabiz.json yazildi:');
console.log(`  terminal : ${payload.terminal.komut} komut + ${payload.terminal.takmaAd} takma ad = ${payload.terminal.yazilabilir}`);
console.log(`  oyun komutu ${payload.terminal.oyunKomut} · sozluk ${payload.terminal.sozlukTerim} terim`);
console.log(`  okkam ${payload.okkam.bulmaca} bulmaca · arsiv ${payload.arsiv.pasaj} pasaj`);
console.log(`  yayin ${payload.yayin.changelogGirdi} girdi · ${payload.yayin.rssSinyal} sinyal`);
console.log(`  sayfa ${payload.sayfa.oyun} oyun · ${payload.sayfa.arac} arac`);
console.log(`  kazi ${payload.kazi.commit} commit · ${payload.kazi.donem.length} donem`);
console.log(`  boyut ${(fs.statSync(OUT).size / 1024).toFixed(1)} KB`);
