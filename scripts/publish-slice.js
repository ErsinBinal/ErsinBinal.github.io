// Yayin ritueli — tek komut.
//
// Bir dilim yayinlarken bugune kadar 7 ayri yere elle dokunmak gerekiyordu:
// HTML'deki ?v=, service-worker PRECACHE, validate-site-integrity pinleri,
// CACHE_NAME, changelog girdisi, signals.xml ogesi ve check zinciri.
// Bu betik altisini yapar, yedincisini (check) sonunda kosar.
//
// Kullanim:
//   node scripts/publish-slice.js --title "Baslik" --summary "Tek paragraf" \
//        [--link /rota.html] [--tag uygulama] [--assets a.js,b.css] [--dry]
//
//   --assets verilmezse degisen dosyalar `git diff` ile bulunur.
//   --dry hicbir dosyaya yazmaz, ne yapacagini basar.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const ignoredDirs = new Set(['.git', 'node_modules', '.wrangler', 'playwright-report', 'test-results']);

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || index === process.argv.length - 1) return fallback;
  return process.argv[index + 1];
}
const dry = process.argv.includes('--dry');

const title = arg('title');
const summary = arg('summary');
const link = arg('link', '/');
const tag = arg('tag', 'uygulama');

if (!title || !summary) {
  console.error('Kullanim: node scripts/publish-slice.js --title "..." --summary "..." [--link /rota] [--tag etiket] [--assets a,b] [--dry]');
  process.exit(1);
}

function listFiles(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirs.has(entry.name)) return [];
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath, predicate);
    return predicate(fullPath) ? [fullPath] : [];
  });
}

const htmlFiles = listFiles(root, (file) => file.endsWith('.html'));

// 1) Hangi asset'ler degisti?
function changedAssets() {
  const explicit = arg('assets');
  if (explicit) {
    return explicit.split(',').map((s) => s.trim()).filter(Boolean)
      .map((s) => (s.startsWith('/') ? s : `/${s}`));
  }
  let out = '';
  try {
    out = execFileSync('git', ['diff', '--name-only', 'HEAD'], { cwd: root, encoding: 'utf8' });
  } catch {
    console.error('git diff calistirilamadi; --assets ile acikca belirt.');
    process.exit(1);
  }
  return out.split('\n')
    .map((s) => s.trim())
    .filter((s) => s.startsWith('assets/'))
    .map((s) => `/${s}`);
}

// 2) Degisen asset'lerin ?v= degerini tum HTML'lerde ilerlet.
function bumpAssetVersions(assets) {
  const bumped = [];
  for (const assetPath of assets) {
    const escaped = assetPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const finder = new RegExp(`${escaped}\\?v=(\\d+)`);
    let current = null;
    for (const file of htmlFiles) {
      const match = fs.readFileSync(file, 'utf8').match(finder);
      if (match) { current = Number(match[1]); break; }
    }
    if (current === null) continue;
    const next = current + 1;
    for (const file of htmlFiles) {
      const source = fs.readFileSync(file, 'utf8');
      const updated = source.replace(new RegExp(`${escaped}\\?v=\\d+`, 'g'), `${assetPath}?v=${next}`);
      if (updated !== source && !dry) fs.writeFileSync(file, updated);
    }
    bumped.push(`${assetPath} v${current} -> v${next}`);
  }
  return bumped;
}

// 3) Changelog girdisi (en yeni en uste).
function addChangelogEntry(dateKey) {
  const file = path.join(root, 'pages', 'changelog.html');
  const source = fs.readFileSync(file, 'utf8');
  const anchor = source.indexOf('        <article class="entry">');
  if (anchor === -1) throw new Error('changelog.html icinde <article class="entry"> bulunamadi');
  const entry =
    `        <article class="entry">\n` +
    `            <time datetime="${dateKey}">${dateKey}</time><span class="tag">${escapeHtml(tag)}</span>\n` +
    `            <h2>${escapeHtml(title)}</h2>\n` +
    `            <p>${escapeHtml(summary)}</p>\n` +
    `        </article>\n`;
  const next = source.slice(0, anchor) + entry + source.slice(anchor);
  if (!dry) fs.writeFileSync(file, next);
}

// 4) RSS ogesi (en yeni en uste).
function addRssItem(dateKey, now) {
  const file = path.join(root, 'signals.xml');
  const source = fs.readFileSync(file, 'utf8');
  const anchor = source.indexOf('    <item>');
  if (anchor === -1) throw new Error('signals.xml icinde <item> bulunamadi');
  const slug = title.toLowerCase()
    .replace(/[çğıöşü]/g, (c) => ({ 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' }[c]))
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const item =
    `    <item>\n` +
    `      <title>${escapeXml(title)}</title>\n` +
    `      <link>https://ersinbinal.github.io${link}</link>\n` +
    `      <guid isPermaLink="false">cvm-signal-${dateKey}-${slug}</guid>\n` +
    `      <pubDate>${now.toUTCString().replace('GMT', '+0000')}</pubDate>\n` +
    `      <description>${escapeXml(summary)}</description>\n` +
    `    </item>\n`;
  const next = source.slice(0, anchor) + item + source.slice(anchor);
  if (!dry) fs.writeFileSync(file, next);
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeXml(text) {
  return escapeHtml(text).replace(/"/g, '&quot;');
}

const now = new Date();
const dateKey = now.toISOString().slice(0, 10);

const assets = changedAssets();
const bumped = bumpAssetVersions(assets);

console.log(`Yayin dilimi: ${title}`);
console.log(`Tarih       : ${dateKey}`);
console.log(`Degisen asset: ${assets.length ? assets.join(', ') : '(yok)'}`);
if (bumped.length) bumped.forEach((line) => console.log(`  bump ${line}`));
else console.log('  (surumlu HTML referansi olan degisen asset yok)');

addChangelogEntry(dateKey);
addRssItem(dateKey, now);
console.log(dry ? '  changelog + signals.xml girdisi eklenecek' : '  changelog + signals.xml girdisi eklendi');

if (dry) {
  console.log('\n--dry: hicbir dosya yazilmadi.');
  process.exit(0);
}

// 5) Surumleri hedeflere yay + CACHE_NAME ilerlet.
execFileSync(process.execPath, [path.join(root, 'scripts', 'sync-cache-versions.js'), '--bump'], {
  cwd: root, stdio: 'inherit'
});

// 6) Kapi.
console.log('\nnpm run check:');
try {
  execFileSync('npm', ['run', 'check'], { cwd: root, stdio: 'inherit' });
} catch {
  console.error('\nKAPI KIRIK — yayinlamadan once duzelt.');
  process.exit(1);
}

console.log('\nDilim yayina hazir. Kalan tek adim: git commit + push.');
