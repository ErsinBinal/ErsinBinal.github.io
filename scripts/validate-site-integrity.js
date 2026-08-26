const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const ignoredDirs = new Set([
  '.git',
  'node_modules',
  '.wrangler',
  'playwright-report',
  'test-results'
]);

function listFiles(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    if (ignoredDirs.has(entry.name)) return [];
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath, predicate);
    return predicate(fullPath) ? [fullPath] : [];
  });
}

const htmlFiles = listFiles(root, (file) => file.endsWith('.html'));

const errors = [];
const versionedAssets = new Map();
const pinnedSupabaseVersion = '2.110.7';
const exactSemverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
let cspCount = 0;
let externalScriptCount = 0;
const browserFiles = [
  ...htmlFiles,
  ...fs.readdirSync(path.join(root, 'assets', 'js'))
    .filter((file) => file.endsWith('.js'))
    .map((file) => path.join(root, 'assets', 'js', file))
];

function relative(file) {
  return path.relative(root, file) || '.';
}

function addError(message) {
  errors.push(message);
}

function recordAsset(asset, file) {
  const match = asset.match(/^([^?]+)\?v=([^&#]+)$/);
  if (!match) return;
  const [, pathname, version] = match;
  if (!versionedAssets.has(pathname)) versionedAssets.set(pathname, new Map());
  const versions = versionedAssets.get(pathname);
  if (!versions.has(version)) versions.set(version, []);
  versions.get(version).push(relative(file));
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const csp = html.match(/<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*content="([^"]+)"/i);

  if (!csp) {
    addError(`${relative(file)} CSP meta etiketi icermiyor`);
  } else {
    cspCount += 1;
    const policy = csp[1];
    const firstScriptIndex = html.search(/<script\b/i);
    const headEndIndex = html.search(/<\/head>/i);
    if (
      (firstScriptIndex !== -1 && csp.index > firstScriptIndex) ||
      (headEndIndex !== -1 && csp.index > headEndIndex)
    ) {
      addError(`${relative(file)} CSP meta etiketi ilk script ve </head> oncesinde olmali`);
    }
    if (!policy.includes("default-src 'self'")) {
      addError(`${relative(file)} CSP eksik: default-src 'self'`);
    }
    if (!policy.includes("object-src 'none'")) {
      addError(`${relative(file)} CSP eksik: object-src 'none'`);
    }
    if (!policy.includes("base-uri 'self'")) {
      addError(`${relative(file)} CSP eksik: base-uri 'self'`);
    }
    if (relative(file) === path.join('oracle', 'index.html') && !policy.includes('https://*.workers.dev')) {
      addError('/oracle/ CSP connect-src workers.dev icermiyor');
    }
    if (html.includes('/assets/js/sfx.js') && !policy.includes("media-src 'self' data: blob:")) {
      addError(`${relative(file)} CSP eksik: media-src 'self' data: blob:`);
    }
  }

  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["'](https?:\/\/[^"']+)["'][^>]*>/gi)) {
    externalScriptCount += 1;
    const scriptUrl = match[1];
    const jsDelivrNpm = scriptUrl.match(
      /^https:\/\/cdn\.jsdelivr\.net\/npm\/((?:@[^/@]+\/)?[^/@]+)@([^/?#]+)(?:[/?#]|$)/
    );

    if (scriptUrl.startsWith('https://cdn.jsdelivr.net/npm/')) {
      if (!jsDelivrNpm) {
        addError(`${relative(file)} jsDelivr script tam paket surumu icermiyor: ${scriptUrl}`);
        continue;
      }

      const [, packageName, version] = jsDelivrNpm;
      if (!exactSemverPattern.test(version)) {
        addError(`${relative(file)} CDN script tam semver kullanmiyor: ${scriptUrl}`);
      }
      if (packageName === '@supabase/supabase-js' && version !== pinnedSupabaseVersion) {
        addError(
          `${relative(file)} Supabase CDN surumu ${pinnedSupabaseVersion} olmali: ${scriptUrl}`
        );
      }
      continue;
    }

    const cdnJs = scriptUrl.match(
      /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/[^/]+\/([^/?#]+)\//
    );
    if (cdnJs && exactSemverPattern.test(cdnJs[1])) continue;

    addError(`${relative(file)} surumu dogrulanamayan harici script kullaniyor: ${scriptUrl}`);
  }

  for (const match of html.matchAll(/\b(?:href|src)=["'](\/assets\/[^"']+)["']/g)) {
    recordAsset(match[1], file);
  }
}

for (const [asset, versions] of versionedAssets.entries()) {
  if (versions.size <= 1) continue;
  const details = [...versions.entries()]
    .map(([version, files]) => `v=${version} (${[...new Set(files)].join(', ')})`)
    .join('; ');
  addError(`${asset} icin birden fazla cache versiyonu var: ${details}`);
}

for (const file of browserFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (/pollinations\.ai/i.test(source)) {
    addError(`${relative(file)} browser tarafindan Pollinations'a dogrudan baglaniyor`);
  }
}

const swPath = path.join(root, 'service-worker.js');
const sw = fs.readFileSync(swPath, 'utf8');
const precacheMatch = sw.match(/const\s+PRECACHE_ASSETS\s*=\s*\[([\s\S]*?)\];/);
const precacheAssets = new Set();

if (!precacheMatch) {
  addError('service-worker.js PRECACHE_ASSETS listesi okunamadi');
} else {
  for (const match of precacheMatch[1].matchAll(/'([^']+)'/g)) {
    precacheAssets.add(match[1]);
  }
}

const indexPath = path.join(root, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

// Surumlu asset referanslarini index.html'den TURET; elle pin tutma.
// Kural: isimler politika (asagidaki listeler), surumler otomatik.
const versionedAssetRef = /\b(?:href|src)=["'](\/assets\/[^"'?#]+)\?v=([^"'&#]+)[^"']*["']/g;
const indexVersionedAssets = new Map();
for (const match of indexHtml.matchAll(versionedAssetRef)) {
  indexVersionedAssets.set(match[1], match[2]);
}

// Cevrimdisi calismasi gereken rotalar — urun karari, elle tutulur.
const mustPrecacheRoutes = [
  '/',
  '/index.html',
  '/pages/makaleler.html',
  '/account/auth.html',
  '/account/dashboard.html',
  '/oracle/',
  '/holo/',
  '/arsiv/',
  '/offline.html'
];

// Ana sayfa disindan gelen, yine de cevrimdisi gereken asset'ler (yolsuz, surumsuz).
const extraMustPrecacheAssets = [
  '/assets/js/dart-skorbord.js'
];

// Bilincli olarak precache DISI birakilan turler (D6: kucuk ilk yuk).
// Gorseller tembel yuklenir; service worker calisma aninda cache'ler.
const lazyAssetPattern = /\.(?:jpg|jpeg|png|webp|gif|svg|glb)$/i;

for (const route of mustPrecacheRoutes) {
  if (!precacheAssets.has(route)) {
    addError(`service-worker.js precache eksik: ${route}`);
  }
}

// index.html'in yukledigi her surumlu script/stil precache'de olmali.
for (const [assetPath, version] of indexVersionedAssets.entries()) {
  if (lazyAssetPattern.test(assetPath)) continue;
  const ref = `${assetPath}?v=${version}`;
  if (!precacheAssets.has(ref)) {
    addError(`service-worker.js precache eksik (index.html yukluyor): ${ref}`);
  }
}

for (const assetPath of extraMustPrecacheAssets) {
  const hit = [...precacheAssets].some((entry) => entry.split('?')[0] === assetPath);
  if (!hit) {
    addError(`service-worker.js precache eksik: ${assetPath}`);
  }
}
// Kritik home modulleri — ISIMLER politika, surumler index.html'den okunur.
// Surum pini YOK: bir modul bumplandiginda bu liste degismez.
const criticalHomeModules = [
  '/assets/js/home/route-commands.js',
  '/assets/js/home/guide-commands.js',
  '/assets/js/home/ruins.js',
  '/assets/js/home/world.js',
  '/assets/js/home/economy.js',
  '/assets/js/home/shop.js',
  '/assets/js/home/world-actions.js',
  '/assets/js/home/vfs.js',
  '/assets/js/home/navigator.js',
  '/assets/js/home/chat-symbols.js'
];
const homeProtocolPathRef = '/assets/js/home-protocol.js';

// Yukleme sirasi: script etiketlerinin index.html icindeki gercek konumu.
const scriptOrder = new Map();
for (const match of indexHtml.matchAll(/<script\b[^>]*\bsrc=["']([^"'?#]+)[^"']*["']/g)) {
  if (!scriptOrder.has(match[1])) scriptOrder.set(match[1], match.index);
}

const homeProtocolAt = scriptOrder.get(homeProtocolPathRef);
if (homeProtocolAt === undefined) {
  addError(`index.html script eksik: ${homeProtocolPathRef}`);
} else {
  for (const modulePath of criticalHomeModules) {
    const at = scriptOrder.get(modulePath);
    if (at === undefined) {
      addError(`index.html script eksik: ${modulePath}`);
    } else if (at > homeProtocolAt) {
      addError(`index.html script sirasi hatali: ${modulePath} home-protocol.js sonrasinda`);
    }
  }
  // Kural, listedekilerle sinirli degil: her home modulu protocol'den once gelmeli.
  const alreadyChecked = new Set(criticalHomeModules);
  for (const [scriptPath, at] of scriptOrder.entries()) {
    if (!scriptPath.startsWith('/assets/js/home/')) continue;
    if (alreadyChecked.has(scriptPath)) continue;
    if (at > homeProtocolAt) {
      addError(`index.html script sirasi hatali: ${scriptPath} home-protocol.js sonrasinda`);
    }
  }
}

if (!indexHtml.includes('role="combobox"') || !indexHtml.includes('aria-controls="command-suggestions"')) {
  addError('index.html terminal tamamlama combobox sozlesmesi eksik');
}
if (!indexHtml.includes('id="command-suggestions" role="listbox"')) {
  addError('index.html terminal tamamlama listbox sozlesmesi eksik');
}

const homeProtocolPath = path.join(root, 'assets', 'js', 'home-protocol.js');
const homeProtocol = fs.readFileSync(homeProtocolPath, 'utf8');
if (!homeProtocol.includes('createRouteCommands')) {
  addError('home-protocol.js route command factory baglantisi eksik');
}
if (!homeProtocol.includes('createGuideCommands')) {
  addError('home-protocol.js guide command factory baglantisi eksik');
}
if (!homeProtocol.includes('createRuins')) {
  addError('home-protocol.js ruins factory baglantisi eksik');
}
if (!homeProtocol.includes('createWorld')) {
  addError('home-protocol.js world factory baglantisi eksik');
}
if (!homeProtocol.includes('createEconomy')) {
  addError('home-protocol.js economy factory baglantisi eksik');
}
if (!homeProtocol.includes('createShop')) {
  addError('home-protocol.js shop factory baglantisi eksik');
}
if (!homeProtocol.includes('createWorldActions')) {
  addError('home-protocol.js world actions factory baglantisi eksik');
}
if (!homeProtocol.includes('createVfs')) {
  addError('home-protocol.js VFS factory baglantisi eksik');
}
if (!homeProtocol.includes('createNavigator')) {
  addError('home-protocol.js Navigator factory baglantisi eksik');
}

if (!/const\s+CACHE_NAME\s*=\s*'convivium-v\d+'/.test(sw)) {
  addError('service-worker.js CACHE_NAME beklenen version formatinda degil');
}

if (errors.length) {
  console.error('Site integrity check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Site integrity check passed (${htmlFiles.length} HTML; ${cspCount} CSP; ` +
  `${externalScriptCount} exact-version external scripts).`
);
