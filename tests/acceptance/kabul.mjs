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
  check('kaz gercek bir tabaka kaziyor', /KAROT/.test(kaz) && /commit/.test(kaz) && /uydurulmadi/.test(kaz));
  check('kazilan tabaka surum bumpi degil', !/\?v=\d+/.test(kaz.slice(kaz.indexOf('kazilan katman'))));

  await page.fill('#command-input', 'tabaka');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    () => /era$/m.test(document.getElementById('command-output')?.textContent || '') ||
          /aktif gun \/ \d+ era/.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 20000 }
  ).catch(() => {});
  const tabaka = await page.textContent('#command-output');
  check('tabaka eralari Turkce adlariyla listeliyor',
    /TABAKALAR/.test(tabaka) && /Katmani/.test(tabaka) && /neyle ugrasiyordu/.test(tabaka));

  await page.fill('#command-input', 'taban');
  await page.press('#command-input', 'Enter');
  await page.waitForFunction(
    // Cikti animasyonla yazilir. `tabaka` da 'aktif gun' yazdigi icin ona
    // degil, taban kayanin kendi satirina bak.
    () => /service-worker\.js/.test(
      (document.getElementById('command-output')?.textContent || '').split('TABAN KAYA').pop()
    ),
    { timeout: 20000 }
  ).catch(() => {});
  const taban = await page.textContent('#command-output');
  check('taban kaya ayri gosteriliyor', /TABAN KAYA/.test(taban) && /index\.html/.test(taban) && /service-worker\.js/.test(taban));

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
