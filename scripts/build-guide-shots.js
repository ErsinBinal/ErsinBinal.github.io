// Kilavuz ekran goruntuleri — GERCEK terminalden, elle degil.
//
// Kilavuzdaki her gorsel canli siteden uretilir: komut calistirilir, cikti
// beklenir, terminal paneli kirpilir. Boylece gorsel bayatlamaz — komut
// degisirse `npm run build:guide-shots` yeniden ceker.
//
// Kullanim: npm run build:guide-shots

const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const OUT = path.join(root, 'assets', 'img', 'guides', 'kilavuz');
const PORT = 8089;

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.xml': 'application/xml',
  '.glb': 'model/gltf-binary'
};

// Her kare: komut, ciktinin bittigini anlatan son satir, dosya adi.
const SHOTS = [
  {
    file: 'terminal-help',
    command: 'help',
    done: /TAM LISTE/,
    alt: 'Convivium terminalinde help komutunun ciktisi: alti niyet grubu, bulundugun oda ve siradaki hedef'
  },
  {
    file: 'terminal-kaz',
    command: 'kaz',
    done: /uydurulmadi/,
    alt: 'kaz komutunun ciktisi: deponun gercek git gecmisinden kazilmis bir karot, tarih, commit ve dosya bilgisiyle'
  },
  {
    file: 'terminal-neden',
    command: 'neden hepl',
    done: /skorlama tablosundan gelir/,
    alt: 'neden komutunun ciktisi: oneri motorunun skorunu hangi etkenlerden topladigi'
  },
  {
    file: 'terminal-ara',
    command: 'ara hologram',
    done: /Tamamen tarayicida, cevrimdisi/,
    alt: 'ara komutunun ciktisi: arsiv aramasi ve her sonucun altinda skor dokumu'
  },
  {
    file: 'terminal-tabaka',
    command: 'tabaka',
    done: /aktif gun \/ \d+ era/,
    alt: 'tabaka komutunun ciktisi: deponun eralari, Turkce adlariyla ve commit sayilariyla'
  },
  {
    file: 'terminal-iz',
    command: 'iz',
    done: /yeniden turetilir/,
    alt: 'iz komutunun ciktisi: paylasilabilir adres, alti haneli muhur ve gorsel parmak izi'
  }
];

function serve() {
  const server = http.createServer(async (request, response) => {
    let target = decodeURIComponent(request.url.split('?')[0]);
    if (target.endsWith('/')) target += 'index.html';
    try {
      const file = path.join(root, target);
      const body = fs.readFileSync(file);
      response.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });

  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(6500);
  await page.click('#command-launch');
  await page.waitForFunction(
    () => /terminal ready/i.test(document.getElementById('command-output')?.textContent || ''),
    { timeout: 30000 }
  );

  const written = [];
  for (const shot of SHOTS) {
    // Once temizle: yoksa panel kayar ve ciktinin BASI (baslik satiri) kesilir.
    await page.fill('#command-input', 'clear');
    await page.press('#command-input', 'Enter');
    await page.waitForTimeout(350);

    await page.fill('#command-input', shot.command);
    await page.press('#command-input', 'Enter');
    await page.waitForFunction(
      (pattern) => new RegExp(pattern).test(document.getElementById('command-output')?.textContent || ''),
      shot.done.source,
      { timeout: 30000 }
    ).catch(() => console.warn(`  uyari: "${shot.command}" son satiri beklenmedi`));
    await page.waitForTimeout(400);
    await page.evaluate(() => { const o = document.getElementById('command-output'); if (o) o.scrollTop = 0; });
    await page.waitForTimeout(200);

    // Yalniz terminal panelini kirp: sayfanin geri kalani gurultu.
    const element = await page.$('#command-shell');
    const png = await element.screenshot();
    const file = path.join(OUT, `${shot.file}.webp`);
    await sharp(png).webp({ quality: 82 }).toFile(file);
    written.push({ file: `${shot.file}.webp`, kb: Math.round(fs.statSync(file).size / 1024) });
    console.log(`  ${shot.command.padEnd(16)} -> ${shot.file}.webp`);
  }

  await browser.close();
  server.close();

  const total = written.reduce((sum, item) => sum + item.kb, 0);
  console.log(`\n${written.length} gorsel, toplam ${total} KB`);
  written.forEach((item) => console.log(`  ${String(item.kb).padStart(4)} KB  ${item.file}`));
})();
