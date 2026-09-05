// Kazi Evi — kabul testi (Faz 0 + Z1 TORTU).
//
// Yerel statik sunucu + Chromium. Canli siteye DEGIL, calisma agacina bakar;
// yani yayindan ONCE kosar (playwright.config.mjs canliya bakiyor, bu bakmiyor).
//
// Kosmak icin: npm run test:accept
//
// Kapsam:
//   - `neden` komutu oneri motorunun gerekcesini dokuyor mu
//   - girissiz onur hatti: uc dusunsel yuzey giris istemeden aciliyor mu
//   - `kaz` gercek git gecmisinden bir tabaka kaziyor mu
//   - `taban` taban kayayi ayri gosteriyor mu
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = '/Users/ersin/Documents/GitHub/ErsinBinal.github.io';
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.xml':'application/xml', '.glb':'model/gltf-binary' };

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  try {
    const file = path.join(root, p);
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('nope'); }
});
await new Promise((r) => server.listen(8099, r));
const base = 'http://localhost:8099';

const browser = await chromium.launch();
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'GECTI' : 'KALDI'}  ${name}${detail ? ' — ' + detail : ''}`); };

// --- 1. Ana terminal: neden komutu ---
{
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
  // Boot dizisi ~4.2 sn (index.html sabit gecikmesi); terminal hazir olana kadar bekle.
  await page.waitForFunction(() => {
    const out = document.getElementById('command-output');
    return out && !/initializing/i.test(out.textContent || '');
  }, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);

  // Kabuk acilinca boot dizisi yazilir; komutlar ancak "terminal ready" sonrasi islenir.
  await page.click('#command-launch');
  await page.waitForFunction(
    () => /terminal ready/i.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 25000 }
  );
  await page.fill('#command-input', 'neden hepl');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    // Cikti animasyonla yazilir; son satir gorunene kadar bekle.
    () => /skorlama tablosundan gelir/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 15000 }
  ).catch(() => {});
  const out = { text: await page.textContent('#command-output') };

  const t = out.text || '';
  check('neden komutu gerekce dokuyor', /neden "hepl"/.test(t) && /yazim mesafesi/.test(t), t.slice(0, 90).replace(/\n/g, ' | '));
  check('gerekce toplam skor gosteriyor', /toplam \d+/.test(t));
  check('ana sayfada page error yok', errors.length === 0, errors[0] || '');
  // --- TORTU: gercek jeoloji ---
  await page.fill('#command-input', 'kaz');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /uydurulmadi/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 20000 }
  ).catch(() => {});
  const kaz = await page.textContent('#command-output');
  check('kaz gercek bir commit kaziyor', /COMMIT/.test(kaz) && /commit/.test(kaz) && /uydurulmadi/.test(kaz));
  check('kazilan tabaka surum bumpi degil', !/\?v=\d+/.test(kaz.slice(kaz.indexOf('kazilan katman'))));

  await page.fill('#command-input', 'tabaka');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /era$/m.test(document.getElementById('command-output')?.textContent || '') ||
          /aktif gun \/ \d+ era/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 20000 }
  ).catch(() => {});
  const tabaka = await page.textContent('#command-output');
  check('tabaka epoch lari Turkce adlariyla listeliyor',
    /EPOCHS/.test(tabaka) && /Katmani/.test(tabaka) && /neyle ugrasiyordu/.test(tabaka));

  await page.fill('#command-input', 'damar');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /Taban kaya bu grafa girmez/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 20000 }
  ).catch(() => {});
  const damar = await page.textContent('#command-output');
  check('cluster Jaccard + Louvain sonucunu gosteriyor',
    /CLUSTERS/.test(damar) && /Jaccard/.test(damar) && /modulerlik Q = 0\.[3-9]/.test(damar));

  await page.fill('#command-input', 'taban');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    // Cikti animasyonla yazilir. `tabaka` da 'aktif gun' yazdigi icin ona
    // degil, taban kayanin kendi satirina bak.
    () => /service-worker\.js/.test(
      (document.getElementById('command-output')?.textContent || '').split('CORE FILES').pop()
    ),
    { timeout: 20000 }
  ).catch(() => {});
  const taban = await page.textContent('#command-output');
  check('cekirdek dosyalar ayri gosteriliyor', /CORE FILES/.test(taban) && /index\.html/.test(taban) && /service-worker\.js/.test(taban));

  // --- Z1.4: /ruins devri — kurmaca ile kazilmis ayriliyor ---
  await page.fill('#command-input', 'cd ruins');
  await page.press('#command-input', 'Enter');
  await page.waitForTimeout(900);
  await page.fill('#command-input', 'look');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /uydurulmadi/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 15000 }
  ).catch(() => {});
  const ruins = await page.textContent('#command-output');
  check('/ruins kurmaca ile kazilmis olani ayiriyor',
    /KURMACA/.test(ruins) && /uydurulmadi/.test(ruins));

  await page.fill('#command-input', 'examine terminal');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /KURULUS MITI/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 15000 }
  ).catch(() => {});
  const myth = await page.textContent('#command-output');
  check('uydurma kalinti KURULUS MITI rozeti tasiyor', /KURULUS MITI/.test(myth));

  await page.close();
}

// --- SOZLUK: whatis / apropos (terminalin dili) ---
{
  const page = await browser.newPage();
  await page.goto(`${base}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(6500);
  await page.click('#command-launch');
  await page.waitForFunction(
    () => /terminal ready/i.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 25000 }
  );

  await page.fill('#command-input', 'whatis checksum');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /bkz: digest · trace/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 15000 }
  ).catch(() => {});
  const w = await page.textContent('#command-output');
  check('whatis terimi tanimliyor ve kaynagini soyluyor',
    /bozulup bozulmadigini/.test(w) && /bilgisayar bilimi/.test(w));

  await page.fill('#command-input', 'whatis TORTU');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /repository archaeology/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 15000 }
  ).catch(() => {});
  const tr = await page.textContent('#command-output');
  check('bize ozel adlar ACIKCA isaretleniyor', /bu siteye ozel ad/.test(tr));

  await page.fill('#command-input', 'apropos git');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /apropos git/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 15000 }
  ).catch(() => {});
  const ap = await page.textContent('#command-output');
  check('apropos kelimeye gore ariyor', /commit/.test(ap));

  await page.fill('#command-input', 'help');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /BILMEDIGIN KELIME whatis <terim> · apropos <kelime>/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 15000 }
  ).catch(() => {});
  const h = await page.textContent('#command-output');
  check('help sozluge yol gosteriyor', /whatis <terim>/.test(h));

  await page.close();
}

// --- FILIZ: 5. boyut, sitenin atolyesi ---
{
  const page = await browser.newPage();
  await page.goto(`${base}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(6500);
  await page.click('#command-launch');
  await page.waitForFunction(
    () => /terminal ready/i.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 25000 }
  );

  await page.fill('#command-input', 'filiz');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /Nasil calisiyor/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 25000 }
  ).catch(() => {});
  const genel = await page.textContent('#command-output');
  check('filiz atolyeyi gosteriyor', /GENERATOR/.test(genel) && /FILTER/.test(genel));
  check('filiz red sebeplerini YAYINLIYOR', /filtreden neden gecemediler/.test(genel) && /MDL kazanci yok/.test(genel));
  check('filiz acik meydan okuma sunuyor', /site kendi cozemedigi soruyu soruyor/.test(genel));

  await page.fill('#command-input', 'filiz nasil');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /Kaynak: \/assets\/data\/filiz\.json/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 15000 }
  ).catch(() => {});
  const nasil = await page.textContent('#command-output');
  check('filiz mekanizmasini ACIKLIYOR',
    /Dogrulayicisi olmayan sey uretilmez/.test(nasil) && /kendi filtresini/.test(nasil));

  // Yanlis cevap kabul edilmemeli.
  await page.fill('#command-input', 'filiz coz OUT OUT OUT');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /tutturmuyor|DOGRULANDI|KAYBETTI/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 15000 }
  ).catch(() => {});
  const yanlis = await page.textContent('#command-output');
  check('filiz yanlis cevabi reddediyor', /tutturmuyor/.test(yanlis));

  await page.close();
}

// --- Z5 OKKAM: en kisa program duellosu ---
{
  const page = await browser.newPage();
  await page.goto(`${base}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(6500);
  await page.click('#command-launch');
  await page.waitForFunction(
    () => /terminal ready/i.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 25000 }
  );

  await page.fill('#command-input', 'okkam 1 2 3 4');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /okkam calistir|Daha kisasini/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 25000 }
  ).catch(() => {});
  const solved = await page.textContent('#command-output');
  check('okkam en kisa programi buluyor',
    /INC OUT JNZ/.test(solved) && /bit/.test(solved) && /kazanc/.test(solved));

  // Makinenin siniri gizlenmemeli.
  await page.fill('#command-input', 'okkam 7 13 2 99');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /Sen daha kisasini bulabilirsen/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 30000 }
  ).catch(() => {});
  const limit = await page.textContent('#command-output');
  check('okkam sinirini ILAN ediyor',
    /(PES ETTI|BULAMADI)/.test(limit) && /8 katina cikiyor/.test(limit));

  await page.fill('#command-input', 'okkam dil');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /Calistir: okkam calistir/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 15000 }
  ).catch(() => {});
  const lang = await page.textContent('#command-output');
  check('okkam dil sekiz opcode\'u anlatiyor', /OKK-8/.test(lang) && /JNZ/.test(lang));

  await page.close();
}

// --- Z4 ARSIV: cevrimdisi BM25 arama ---
{
  const page = await browser.newPage();
  await page.goto(`${base}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(6500);
  await page.click('#command-launch');
  await page.waitForFunction(
    () => /terminal ready/i.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 25000 }
  );

  await page.fill('#command-input', 'ara hologram');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    // Son satiri bekle: cikti animasyonla yazilir.
    () => /Tamamen tarayicida, cevrimdisi/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 25000 }
  ).catch(() => {});
  const araOut = await page.textContent('#command-output');
  check('ara arsivi tariyor ve sonuc buluyor',
    /ARSIV ·/.test(araOut) && /pasaj eslesti/.test(araOut));
  check('ara skor dokumunu gosteriyor (neden bu pasaj)',
    /neden: .*df \d+, tf \d+/.test(araOut));
  check('ara rota veriyor', /rota:\s+\//.test(araOut));

  // Bulmaca cevabi sizmamali.
  // REGRESYON: parametreli async komut ciktisi kayboluyordu.
  // parameterActions dispatch'i sonucu await etmiyordu; `kaz` argumansiz
  // calisiyordu (commandMap yolu await ediyor) ama `kaz 1` sessizce bostu.
  await page.fill('#command-input', 'kaz 1');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /uydurulmadi/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 20000 }
  ).catch(() => {});
  const paramOut = await page.textContent('#command-output');
  check('parametreli async komut cikti veriyor (kaz 1)',
    /COMMIT\s+1\//.test(paramOut) && !/\[object Promise\]/.test(paramOut));

  await page.fill('#command-input', 'ara altin oran');
  await page.press('#command-input', 'Enter');
  await page.waitForTimeout(3500);
  const spoiler = await page.textContent('#command-output');
  check('bulmaca cevabi aramada SIZMIYOR', !/1618/.test(spoiler));

  await page.close();
}

// --- Z2 IZ + step: komutu calistirmadan gerekcesini calistir ---
{
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(6500);
  await page.click('#command-launch');
  await page.waitForFunction(
    () => /terminal ready/i.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 25000 }
  );

  const hashBefore = await page.evaluate(() => location.hash);

  await page.fill('#command-input', 'step cd hepl');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /sonuc: mesafe/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 20000 }
  ).catch(() => {});
  const stepOut = await page.textContent('#command-output');
  check('step Levenshtein matrisini ve yolu ciziyor',
    /lev-typo/.test(stepOut) && /hucre hesaplandi/.test(stepOut) && /--- yol ---/.test(stepOut));
  check('step kaynagini soyluyor', /navigator\.js editDistance/.test(stepOut));

  // step KOMUTU CALISTIRMAZ: adres degismemeli, rota degismemeli.
  const hashAfter = await page.evaluate(() => location.hash);
  check('step yan etki uretmiyor (adres degismedi)', hashBefore === hashAfter,
    `${hashBefore || '(bos)'} = ${hashAfter || '(bos)'}`);

  await page.fill('#command-input', 'step suggest hepl');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    // Son satiri bekle: cikti animasyonla yazilir, `nav-why` ilk satirda.
    () => /secilen: /.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 15000 }
  ).catch(() => {});
  const suggestOut = await page.textContent('#command-output');
  check('step suggest oneri gerekcesini dokuyor',
    /nav-why/.test(suggestOut) && /yazim mesafesi/.test(suggestOut));

  // Budama gorunur olmali: makine bazi cifti hic hesaplamiyor.
  await page.fill('#command-input', 'step cd h hologram');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /hesaplanmadi, esik disi/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 15000 }
  ).catch(() => {});
  const prunedOut = await page.textContent('#command-output');
  check('step budamayi gizlemiyor, gosteriyor',
    /BUDANDI/.test(prunedOut) && /hic hesaplamadi/.test(prunedOut));

  check('step page error uretmiyor', errors.length === 0, errors[0] || '');
  await page.close();
}

// --- Z3 SIGIL: adres motoru ---
// Iz tasinmaz, yeniden turetilir: link icerik tasimaz, cikti alicida
// yeniden hesaplanir.
{
  const page = await browser.newPage();
  await page.goto(`${base}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(6500);
  await page.click('#command-launch');
  await page.waitForFunction(
    () => /terminal ready/i.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 25000 }
  );

  await page.fill('#command-input', 'kaz');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /uydurulmadi/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 20000 }
  );
  const address = await page.evaluate(() => location.hash);
  check('kaz paylasilabilir adres yaziyor', /^#iz=[A-Za-z0-9_-]+$/.test(address), address);
  const original = (await page.textContent('#command-output')).match(/commit\s+([0-9a-f]{7})/)?.[1];

  await page.fill('#command-input', 'iz');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /yeniden turetilir/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 15000 }
  ).catch(() => {});
  const izOut = await page.textContent('#command-output');
  check('iz muhur ve gorsel parmak izi veriyor',
    /muhur\s+[2-9A-HJ-NP-Z]{6}/.test(izOut) && /\+-{17}\+/.test(izOut));

  // Paylasim: temiz sayfa ayni karotu YENIDEN TURETMELI.
  const shared = await browser.newPage();
  await shared.goto(`${base}/index.html${address}`, { waitUntil: 'load' });
  await shared.waitForTimeout(6500);
  await shared.click('#command-launch');
  await shared.waitForFunction(
    // Son satiri bekle: cikti animasyonla yazilir.
    () => /uydurulmadi/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 25000 }
  ).catch(() => {});
  const rederived = (await shared.textContent('#command-output')).match(/commit\s+([0-9a-f]{7})/)?.[1];
  check('paylasilan adres temiz sayfada AYNI karotu yeniden turetiyor',
    Boolean(original) && original === rederived, `${original} = ${rederived}`);
  await shared.close();

  // Bozuk adres sessizce yanlis sey acmamali.
  const tampered = address.slice(0, -1) + (address.slice(-1) === 'A' ? 'B' : 'A');
  const broken = await browser.newPage();
  await broken.goto(`${base}/index.html${tampered}`, { waitUntil: 'load' });
  await broken.waitForTimeout(6500);
  await broken.click('#command-launch');
  await broken.waitForFunction(
    () => /muhru tutmuyor/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 20000 }
  ).catch(() => {});
  const brokenOut = await broken.textContent('#command-output');
  check('tek karakteri degisen adres REDDEDILIYOR',
    /muhru tutmuyor/.test(brokenOut) && !/COMMIT/.test(brokenOut));
  await broken.close();

  // Geri tusu: terminalde ilk kez tarayici gecmisi.
  await page.fill('#command-input', 'tabaka');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /EPOCHS/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 20000 }
  );
  await page.goBack();
  await page.waitForTimeout(2500);
  const back = await page.evaluate(() => location.hash);
  check('geri tusu onceki ize donuyor', back === address, back);
  await page.close();
}

// --- 2. Girissiz onur hatti: uc yuzey giris istemiyor ---
for (const [name, url] of [
  ['Ekol Aynasi', '/tools/ekol-aynasi.html'],
  ['Paradoks Terminali', '/tools/paradox-terminal.html'],
  ['Oracle', '/oracle/index.html']
]) {
  const page = await browser.newPage();
  await page.goto(base + url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const state = await page.evaluate(() => ({
    locked: document.documentElement.classList.contains('auth-locking'),
    gate: Boolean(document.getElementById('auth-required-gate')),
    url: location.pathname,
    visibleText: (document.body.innerText || '').trim().length
  }));
  check(`${name} girissiz aciliyor`,
    !state.locked && !state.gate && !state.url.includes('/account/auth') && state.visibleText > 100,
    `kilit=${state.locked} kapi=${state.gate} yol=${state.url} metin=${state.visibleText}`);
  await page.close();
}

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} gecti`);
process.exit(failed.length ? 1 : 0);
