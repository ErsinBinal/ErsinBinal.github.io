/**
 * Demir At Terazisi - kare uretici
 *
 * Wikimedia Commons'taki OZGUR LISANSLI motosiklet fotograflarini indirir,
 * motora sikica kirpar ve Convivium'un fosfor-yesil tarama maskesini uygular.
 * Ham fotograflar repoya girmez; bu betik onlari her zaman yeniden uretebilir.
 *
 * Kullanim:  node scripts/build-moto-frames.js
 * Cikti:     assets/img/moto/<id>.webp  (720x450, ~30-50 KB)
 *
 * Lisans/atif kaydi: assets/img/moto/SOURCES.md (bu betik gunceller).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'img', 'moto');
const CACHE_DIR = path.join(ROOT, '.moto-src-cache');
const UA = { 'User-Agent': 'ConviviumSiteBuild/1.0 (https://ersinbinal.github.io)' };

const W = 720;
const H = 450;

/**
 * box: motorun goruntudeki yeri [x0, y0, x1, y1] (0-1 normalize). Kare icine
 * `contain` ile oturur; artan yer koyu zeminle dolar, motor asla kesilmez.
 * mul/off: gri kanal seviye ayari (koyu motorlar daha yuksek mul ister).
 */
const FRAMES = [
  {
    id: 'yamaha-mt-09',
    file: 'File:Yamaha MT-09 SP 2025.jpg',
    box: [0.00, 0.14, 0.98, 0.96], mul: 1.32, off: -22,
    note: 'Gorselde MT-09 SP donanimi (Ohlins/altin catal); veri satiri standart MT-09.'
  },
  {
    id: 'cfmoto-700clx',
    file: 'File:2022 CFMoto 700CL-X, front left.jpg',
    box: [0.10, 0.08, 0.98, 0.92], mul: 1.30, off: -24
  },
  {
    id: 'harley-davidson-fat-boy-114',
    file: 'File:Harley Davidson - Fat Boy 114 (2).jpg',
    box: [0.03, 0.10, 0.97, 0.98], mul: 1.30, off: -24
  },
  {
    id: 'kawasaki-vulcan-s',
    file: 'File:KawasakiVulcanS2020.jpg',
    box: [0.15, 0.38, 0.95, 0.86], mul: 1.55, off: -12
  },
  {
    id: 'triumph-bonneville-bobber',
    file: 'File:Triumph Bobber 2017 black side.jpg',
    box: [0.03, 0.34, 0.97, 0.99], mul: 1.28, off: -22
  },
  {
    id: 'royal-enfield-shotgun-650',
    file: 'File:Royal enfield 650 shotgun Twin, Cape Town.jpg',
    box: [0.06, 0.18, 0.96, 0.94], mul: 1.30, off: -22
  },
  {
    id: 'bmw-r-1300-gs',
    file: 'File:2024 BMW R1300GS Option 719 Tramuntana (1).jpg',
    box: [0.02, 0.10, 0.93, 0.96], mul: 1.28, off: -22
  },
  {
    id: 'suzuki-v-strom-800de',
    file: 'File:Suzuki V-Strom 800DE (2).png',
    box: [0.00, 0.02, 1.00, 1.00], mul: 1.30, off: -24,
    note: '800DE\'nin ozgur lisansli tam yan profili yok; en butun fuar karesi kullanildi.'
  },
  {
    id: 'honda-cl500',
    file: 'File:Honda CL500.jpg',
    box: [0.02, 0.28, 0.96, 0.96], mul: 1.30, off: -22
  },
  {
    id: 'triumph-scrambler-400x',
    file: 'File:Triumph-Scrambler-400X.jpg',
    box: [0.12, 0.22, 0.94, 0.96], mul: 1.30, off: -22
  }
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const strip = (value) => String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

async function fetchInfo(title) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo'
    + `&titles=${encodeURIComponent(title)}&iiprop=url|extmetadata&iiurlwidth=1200`;
  const json = await (await fetch(url, { headers: UA })).json();
  const info = Object.values(json?.query?.pages || {})[0]?.imageinfo?.[0];
  if (!info) throw new Error(`Commons kaydi bulunamadi: ${title}`);
  return {
    thumb: info.thumburl,
    page: info.descriptionurl,
    license: strip(info.extmetadata?.LicenseShortName?.value),
    licenseUrl: strip(info.extmetadata?.LicenseUrl?.value),
    author: strip(info.extmetadata?.Artist?.value)
  };
}

// Commons thumb ureticisi yogunlukta HTML hata sayfasi dondurur; dogrulayip yeniden dener.
async function fetchImage(url, cachePath) {
  if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 20000) {
    return fs.readFileSync(cachePath);
  }
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const buffer = Buffer.from(await (await fetch(url, { headers: UA })).arrayBuffer());
    const isImage = buffer.length > 20000 && (buffer[0] === 0xFF || buffer[0] === 0x89);
    if (isImage) {
      fs.writeFileSync(cachePath, buffer);
      return buffer;
    }
    await wait(3000 * attempt);
  }
  throw new Error(`Gorsel indirilemedi: ${url}`);
}

// Kutu yalnizca motoru cevreler; kare icine `contain` ile oturur, artan yer
// koyu zeminle doldurulur. Boylece hicbir motosiklet kadrajdan kesilmez.
function cropBox(box, imageWidth, imageHeight) {
  const [x0, y0, x1, y1] = box;
  const left = Math.round(Math.max(0, x0 * imageWidth));
  const top = Math.round(Math.max(0, y0 * imageHeight));
  return {
    left,
    top,
    width: Math.max(8, Math.round(Math.min(x1 * imageWidth, imageWidth) - left)),
    height: Math.max(8, Math.round(Math.min(y1 * imageHeight, imageHeight) - top))
  };
}

// Fosfor maskesi: gri tonlama -> seviye -> yesil duotone -> vinyet + tarama cizgisi.
function overlaySvg() {
  return Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs>`
    + '<radialGradient id="v" cx="50%" cy="50%" r="72%">'
    + '<stop offset="45%" stop-color="#02160a" stop-opacity="0"/>'
    + '<stop offset="100%" stop-color="#02160a" stop-opacity="0.93"/></radialGradient>'
    + '<pattern id="s" width="3" height="3" patternUnits="userSpaceOnUse">'
    + '<rect width="3" height="1.5" fill="#001a08" opacity="0.40"/></pattern></defs>'
    + '<rect width="100%" height="100%" fill="url(#v)"/>'
    + '<rect width="100%" height="100%" fill="url(#s)"/></svg>'
  );
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const rows = [];
  for (const frame of FRAMES) {
    const info = await fetchInfo(frame.file);
    // Onbellek anahtari KAYNAK DOSYAYA baglidir; kare baska bir Commons
    // dosyasina gecince eski goruntu yeniden kullanilmaz.
    const cacheKey = crypto.createHash('sha1').update(frame.file).digest('hex').slice(0, 16);
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.src`);
    const buffer = await fetchImage(info.thumb, cachePath);
    const meta = await sharp(buffer).metadata();

    const base = await sharp(buffer)
      .extract(cropBox(frame.box, meta.width, meta.height))
      .resize(W, H, { fit: 'contain', background: '#0a0a0a' })
      .greyscale()
      .normalise()
      .linear(frame.mul, frame.off)
      .toColourspace('srgb')
      .toBuffer();

    const outPath = path.join(OUT_DIR, `${frame.id}.webp`);
    await sharp(base)
      .tint({ r: 46, g: 255, b: 122 })
      .composite([{ input: overlaySvg(), blend: 'over' }])
      .webp({ quality: 68 })
      .toFile(outPath);

    const size = fs.statSync(outPath).size;
    rows.push({ ...frame, ...info, size });
    console.log(`${frame.id.padEnd(30)} ${String(size).padStart(6)} B  ${info.license}`);
    await wait(400);
  }

  const total = rows.reduce((sum, row) => sum + row.size, 0);
  const doc = [
    '# Demir At Terazisi — Kare Kaynaklari ve Lisanslar',
    '',
    'Bu klasordeki `.webp` kareler **Wikimedia Commons\'taki ozgur lisansli**',
    'fotograflardan `scripts/build-moto-frames.js` ile uretilmistir. Uretim hatti:',
    'motora sıkı kirpma → gri tonlama → seviye → fosfor-yesil duotone → vinyet +',
    'tarama cizgisi. Ham fotograflar repoda tutulmaz; betik onlari Commons\'tan',
    'yeniden indirir.',
    '',
    '**Marka ve model adlari yalnizca tanimlayicidir; marka logosu kullanilmaz.**',
    'Turetilmis kareler, kaynak fotografin lisansina tabidir (CC BY / CC BY-SA icin',
    'atif ve ayni lisansla paylasim kosullari gecerlidir).',
    '',
    `Toplam: ${rows.length} kare, ${(total / 1024).toFixed(0)} KB.`,
    '',
    '| Motosiklet | Commons dosyasi | Yapan | Lisans |',
    '|---|---|---|---|',
    ...rows.map((row) => {
      const name = row.file.replace(/^File:/, '');
      const lic = row.licenseUrl ? `[${row.license}](${row.licenseUrl})` : row.license;
      return `| \`${row.id}\` | [${name}](${row.page}) | ${row.author || '—'} | ${lic} |`;
    }),
    '',
    '## Notlar',
    '',
    ...rows.filter((row) => row.note).map((row) => `- \`${row.id}\`: ${row.note}`),
    ''
  ].join('\n');

  fs.writeFileSync(path.join(OUT_DIR, 'SOURCES.md'), doc);
  console.log(`\nToplam ${rows.length} kare, ${(total / 1024).toFixed(0)} KB. SOURCES.md yazildi.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
