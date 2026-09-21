// KENAR DILI — kunyeden URETILIR, elle yazilmaz.
//
// Site 34 sayfadan olusuyor ve stil dosyalari BILEREK ayri (dart skorbordunun
// CSS'i makale okuyana inmemeli). O mimari korunuyor. Ama dili 17 dosyaya
// kopyalamak kacinilmaz surukleme demek: alti ay sonra bir dosyada kesik 9px,
// otekinde 8px, ucuncusunde duz kenar kalir ve kimse fark etmez.
//
// Cozum: deger TEK yerde (assets/css/kenar-kunye.json), CSS ondan uretilir,
// ve UC KAPI bekcilik eder:
//   1) kapsama  — kunyede olmayan kenarli sinif var mi?
//   2) sizinti  — dil sinifi yalniz uygulama/oyun CSS'inde mi tanimli?
//   3) catisma  — sayfanin kendi zemini/gecisi dili sessizce yutuyor mu?
//
// Uretilen dosya @layer kenar icinde: katmanli kurallar katmansiz kurallara
// HER ZAMAN yenilir. Yani kenar.css bir TABAN dildir, sayfanin kendi CSS'ini
// asla ezmez. Sayfa kendi zeminini yazmissa o kazanir; dil geri cekilir.
//
// Kullanim:
//   npm run build:kenar            # assets/css/kenar.css
//   npm run build:kenar -- --check # guncel mi + kapsama/sizinti/catisma raporu

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const KUNYE = path.join(root, 'assets', 'css', 'kenar-kunye.json');
const OUT = path.join(root, 'assets', 'css', 'kenar.css');
const CSS_DIR = path.join(root, 'assets', 'css');

const kunye = JSON.parse(fs.readFileSync(KUNYE, 'utf8'));
const { olcu, basilan, izlenen } = kunye;
const disari = kunye.disarida;
const disDosya = new Set(Object.keys(disari._dosya || {}));
const disOnek = Object.keys(disari._onek || {});

// --- KAYNAKLAR -------------------------------------------------------------
// Kenarli sinif yalniz assets/css'te yasamiyor: oracle, barista, offline gibi
// sayfalar stilini kendi <style> blogunda tasiyor. Kapi oralari gormezse
// kapsama %100 gorunur ama yalan olur.
const ATLA = new Set(['node_modules', '.git', 'tests', 'scripts', 'workers', 'src']);
const htmlDosyalari = (dizin, acc = []) => {
  for (const e of fs.readdirSync(dizin, { withFileTypes: true })) {
    const p = path.join(dizin, e.name);
    // Dizin ADIYLA elenir, yolla degil: depo adi "ErsinBinal.github.io" ve
    // yol uzerinde desen aramak ".git" ile eslesip tum siteyi atliyordu.
    if (e.isDirectory()) { if (!ATLA.has(e.name)) htmlDosyalari(p, acc); }
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
};

const kaynaklar = [];   // { ad, metin, uygulama }
for (const f of fs.readdirSync(CSS_DIR).filter((f) => f.endsWith('.css'))) {
  if (f === 'kenar.css') continue;
  kaynaklar.push({
    ad: f,
    metin: fs.readFileSync(path.join(CSS_DIR, f), 'utf8'),
    uygulama: disDosya.has(f)
  });
}
for (const f of htmlDosyalari(root)) {
  const metin = fs.readFileSync(f, 'utf8');
  if (!metin.includes('kenar.css')) continue;      // dili yuklemeyen sayfa ilgisiz
  const stil = [...metin.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map((m) => m[1]).join('\n');
  if (stil.trim()) {
    kaynaklar.push({ ad: path.relative(root, f), metin: stil, uygulama: false });
  }
}

// --- URETIM ----------------------------------------------------------------
const sec = (liste) => liste.map((s) => `.${s}`).join(',\n');
const tepki = [...new Set(basilan.flatMap((s) =>
  [`.${s}:hover`, `.${s}:focus-visible`, `.${s}:focus-within`]))].join(',\n');
const ayracKatman = (n) => Array.from({ length: n },
  () => '    linear-gradient(var(--kenar-ayrac-renk), var(--kenar-ayrac-renk))').join(',\n');

const css = `/* ==========================================================================
   KENAR DILI — URETILMIS DOSYA, ELLE DUZENLEME
   ==========================================================================
   Kaynak : assets/css/kenar-kunye.json
   Uretec : scripts/build-kenar.js   ·   npm run build:kenar
   Kapi   : npm run build:kenar -- --check  (npm run check icinde)

   Kural: kenar bir uslup degil bir DIL.
     basilan -> kesik kose; hover'da kose ACILIR (donme yok)
     izlenen -> kose ayraci; kenar cizilmez, ima edilir

   @layer kenar: bu dosyanin TAMAMI bir katmanda. Katmanli kural, katmansiz
   kurala her zaman yenilir — yukleme sirasi ne olursa olsun. Yani burasi bir
   TABAN dil: sayfa kendi zeminini/kesimini yazmissa sayfa kazanir, dil geri
   cekilir. Uygulamalar ve oyunlar bu yuzden zarar goremez.

   Stil dosyalarinin ayri olmasi BILEREK: her sayfa yalniz kendi CSS'ini
   yukler. Bu dosya o mimariyi bozmaz — dili tek kaynaktan tasir.
   ====================================================================== */

@property --kesik {
  syntax: '<length>';
  initial-value: ${olcu.kesik};
  inherits: false;
}

/* Ayrac recetesi. Katmanin DISINDA cunku kendi zeminini tasiyan paneller
   (bkz. kunye "zeminliler") bu degiskenleri kendi kurallarinda cagiriyor —
   katmanli bir :root degeri onlarin katmansiz kuralina gorunmez olmaz ama
   burada tutmak niyeti acik birakiyor: bu bir RECETE, bir kural degil. */
:root {
  --kenar-ayrac: ${olcu.ayrac};
  --kenar-ayrac-renk: ${olcu.ayracRenk};
  --kenar-ayrac-katman:
${ayracKatman(8)};
  --kenar-ayrac-boy:
    var(--kenar-ayrac) 1px, 1px var(--kenar-ayrac),
    var(--kenar-ayrac) 1px, 1px var(--kenar-ayrac),
    var(--kenar-ayrac) 1px, 1px var(--kenar-ayrac),
    var(--kenar-ayrac) 1px, 1px var(--kenar-ayrac);
  --kenar-ayrac-yer:
    left top, left top, right top, right top,
    left bottom, left bottom, right bottom, right bottom;
}

@layer kenar {

  /* --- BASILAN: kesik kose (${basilan.length} sinif) --------------------- */
${sec(basilan).split('\n').map((l) => '  ' + l).join('\n')} {
    --kesik: ${olcu.kesik};
    clip-path: polygon(
      var(--kesik) 0, 100% 0,
      100% calc(100% - var(--kesik)), calc(100% - var(--kesik)) 100%,
      0 100%, 0 var(--kesik)
    );
    transition: --kesik ${olcu.gecis},
                border-color .22s ease, background .22s ease, color .22s ease;
  }

  /* Tepki: kose ACILIR. Ilk denemede donen bir conic-gradient vardi;
     "radar" gibi okundu ve elendi. Bu mekanik, tek gecis, ucuz. */
${tepki.split('\n').map((l) => '  ' + l).join('\n')} {
    --kesik: ${olcu.kesikAcik};
  }

  /* --- IZLENEN: kose ayraci (${izlenen.length} sinif) -------------------- */
${sec(izlenen).split('\n').map((l) => '  ' + l).join('\n')} {
    background-image: var(--kenar-ayrac-katman);
    background-repeat: no-repeat;
    background-size: var(--kenar-ayrac-boy);
    background-position: var(--kenar-ayrac-yer);
  }

  @media (prefers-reduced-motion: reduce) {
${sec(basilan).split('\n').map((l) => '    ' + l).join('\n')} { transition: none; }
  }

}
`;

// --- KAPI 1: KAPSAMA -------------------------------------------------------
// Kunyede olmayan kenarli sinif = sessizce dilin disinda kalmis demektir.
const bilinen = new Set([...basilan, ...izlenen, ...Object.keys(disari._sinif || {})]);

const kapsama = () => {
  const eksikler = [];
  let toplam = 0, kapsanan = 0;
  for (const { ad, metin, uygulama } of kaynaklar) {
    if (uygulama) continue;                        // bilerek disarida
    const sinif = new Set();
    for (const blok of metin.matchAll(/([^{}]+)\{([^}]*border\s*:[^}]*)\}/g)) {
      for (const m of blok[1].matchAll(/\.([a-z][a-z0-9_-]*)/g)) sinif.add(m[1]);
    }
    for (const s of sinif) {
      if (disOnek.some((o) => s.startsWith(o))) continue;
      toplam += 1;
      if (bilinen.has(s)) kapsanan += 1;
      else eksikler.push(`${ad}: .${s}`);
    }
  }
  return { toplam, kapsanan, eksikler };
};

// --- KAPI 2: SIZINTI -------------------------------------------------------
// Kullanicinin siniri: "stil guncellemesi uygulama ve oyunlari etkilememeli."
// Bir dil sinifi YALNIZ uygulama/oyun CSS'inde tanimliysa dil oraya sizmis
// demektir. Bunu goz kararina birakmiyoruz; kapi olcuyor.
const sizinti = () => {
  const nerede = new Map();
  for (const c of [...basilan, ...izlenen]) nerede.set(c, { site: 0, uyg: [] });
  for (const { ad, metin, uygulama } of kaynaklar) {
    for (const blok of metin.matchAll(/([^{}]+)\{/g)) {
      for (const m of blok[1].matchAll(/\.([a-z][a-z0-9_-]*)(?![a-z0-9_-])/g)) {
        const kayit = nerede.get(m[1]);
        if (!kayit) continue;
        if (uygulama) { if (!kayit.uyg.includes(ad)) kayit.uyg.push(ad); }
        else kayit.site += 1;
      }
    }
  }
  return [...nerede].filter(([, v]) => v.uyg.length && v.site === 0)
    .map(([c, v]) => `.${c} -> yalniz ${v.uyg.join(', ')}`);
};

// --- KAPI 3: CATISMA -------------------------------------------------------
// @layer sayesinde catisma zarar vermiyor ama SESSIZ kaliyor: sayfanin kendi
// zemini varsa ayrac hic gorunmez. Bunu bilmek istiyoruz — yoksa "uyguladim"
// deyip uygulanmamis olur.
const catisma = () => {
  const zeminli = [], gecisli = [];
  const kural = (c) => {
    const out = [];
    for (const { ad, metin, uygulama } of kaynaklar) {
      if (uygulama) continue;
      // Bosluk YOK: `.x a::before` bu sinifin kurali degil, torununun.
      const re = new RegExp(`(?:^|[,{}])\\s*\\.${c}(?![a-z0-9_-])[^{}, ]*\\s*\\{([^}]*)\\}`, 'gm');
      let m; while ((m = re.exec(metin))) out.push({ ad, govde: m[1] });
    }
    return out;
  };
  for (const c of izlenen) {
    const v = kural(c).find((r) => /background(-image)?\s*:[^;]*(gradient|url\()/.test(r.govde));
    if (v) zeminli.push(`.${c} (${v.ad})`);
  }
  for (const c of basilan) {
    const v = kural(c).find((r) => /transition\s*:/.test(r.govde) && !/--kesik|\ball\b/.test(r.govde));
    if (v) gecisli.push(`.${c} (${v.ad})`);
  }
  return { zeminli, gecisli };
};

// --- KAPI 4: ZEMINLILER ----------------------------------------------------
// Kendi zemini olan panele katmanli kural yenilir; ayrac ancak panel receteyi
// KENDI kuralinda cagirirsa gorunur. Bu cagri kaybolursa ayrac sessizce yok
// olur — kapi bunu hata sayar. Ayrica listede olmayan yeni bir zeminli panel
// cikarsa da hata: karar verilmemis bir sessizlik birakmiyoruz.
const zeminKapisi = () => {
  const beyan = Object.entries(kunye.zeminliler || {}).filter(([c]) => c !== '_');
  const cagirmayan = [], listeDisi = [];
  for (const [c, dosya] of beyan) {
    const yol = path.join(root, dosya);
    const metin = fs.existsSync(yol) ? fs.readFileSync(yol, 'utf8') : '';
    const re = new RegExp(`(?:^|[,{}])\\s*\\.${c}(?![a-z0-9_-])[^{}, ]*\\s*\\{([^}]*)\\}`, 'gm');
    let bulundu = false, m;
    while ((m = re.exec(metin))) if (m[1].includes('--kenar-ayrac-katman')) bulundu = true;
    if (!bulundu) cagirmayan.push(`.${c} (${dosya}) receteyi cagirmiyor`);
  }
  const beyanli = new Set(beyan.map(([c]) => c));
  for (const z of zeminli) {
    const ad = z.slice(1, z.indexOf(' '));
    if (!beyanli.has(ad)) listeDisi.push(z);
  }
  return { cagirmayan, listeDisi };
};

const { toplam, kapsanan, eksikler } = kapsama();
const sizanlar = sizinti();
const { zeminli, gecisli } = catisma();
const { cagirmayan, listeDisi } = zeminKapisi();
const yuzde = toplam ? Math.round((kapsanan / toplam) * 100) : 100;

const liste = (baslik, dizi, n = 12) => {
  if (!dizi.length) return;
  console.log(`\n  ${baslik} (${dizi.length}):`);
  dizi.slice(0, n).forEach((e) => console.log('    ' + e));
  if (dizi.length > n) console.log(`    ... +${dizi.length - n}`);
};

if (process.argv.includes('--check')) {
  let hata = false;
  const mevcut = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  if (mevcut !== css) {
    console.error('kenar.css kunyeyle uyusmuyor. Duzeltmek icin: npm run build:kenar');
    hata = true;
  }
  if (eksikler.length) {
    console.error(`\nKUNYEDE OLMAYAN ${eksikler.length} kenarli sinif var.`);
    console.error('Her biri icin bir ROL sec (basilan / izlenen) ya da');
    console.error('bilerek disarida birak — gerekcesiyle. Karar, kaza degil.\n');
    eksikler.slice(0, 40).forEach((e) => console.error('  ' + e));
    if (eksikler.length > 40) console.error(`  ... +${eksikler.length - 40}`);
    hata = true;
  }
  if (sizanlar.length) {
    console.error(`\nSIZINTI: ${sizanlar.length} dil sinifi yalniz uygulama/oyun CSS'inde tanimli.`);
    console.error('Dil site kabugunun dili; uygulamalarin ic arayuzune girmez.\n');
    sizanlar.forEach((e) => console.error('  ' + e));
    hata = true;
  }
  if (cagirmayan.length || listeDisi.length) {
    console.error('\nZEMINLI PANEL: ayrac gorunmuyor.');
    console.error('Kendi zemini olan panel ayraci kendi kuralinda cagirmali:');
    console.error('  background-image: var(--kenar-ayrac-katman), var(--zemin);\n');
    cagirmayan.forEach((e) => console.error('  ' + e));
    listeDisi.forEach((e) => console.error('  ' + e + ' — kunye "zeminliler" listesinde yok'));
    hata = true;
  }
  if (hata) { console.error(`\nkapsama: %${yuzde} (${kapsanan}/${toplam})`); process.exit(1); }
  console.log(`kenar dili guncel · kapsama %${yuzde} (${kapsanan}/${toplam} sinif) · ` +
    `${basilan.length} basilan, ${izlenen.length} izlenen · sizinti yok`);
  console.log(`  ${zeminli.length} zeminli panel ayraci kendi kuralinda cagiriyor · ` +
    `${gecisli.length} buton kendi gecisini tasiyor (kose ani acilir)`);
  process.exit(0);
}

fs.writeFileSync(OUT, css);
console.log('kenar.css uretildi:');
console.log(`  basilan  ${String(basilan.length).padStart(3)} sinif — kesik kose`);
console.log(`  izlenen  ${String(izlenen.length).padStart(3)} sinif — kose ayraci`);
console.log(`  disarida ${String(Object.keys(disari._sinif || {}).length).padStart(3)} sinif + ` +
  `${disDosya.size} dosya + ${disOnek.length} onek (gerekceli)`);
console.log(`  kaynak   ${kaynaklar.length} dosya tarandi (assets/css + sayfa ici <style>)`);
console.log(`  kapsama  %${yuzde} (${kapsanan}/${toplam})`);
liste('kunyede olmayan', eksikler, 25);
liste('SIZINTI — uygulamaya kaciyor', sizanlar);
liste('kendi zemini var — receteyi kendi cagiriyor', zeminli);
liste('RECETEYI CAGIRMIYOR', cagirmayan);
liste('kunye "zeminliler" listesinde yok', listeDisi);
liste('kendi gecisi var, kose ani acilir', gecisli);
