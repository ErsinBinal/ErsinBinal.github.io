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

const mustPrecache = [
  '/',
  '/index.html',
  '/pages/makaleler.html',
  '/account/auth.html',
  '/account/dashboard.html',
  '/oracle/',
  '/offline.html',
  '/assets/css/components.css?v=37',
  '/assets/js/deb-companion.js?v=4',
  '/assets/js/home/routes.js?v=5',
  '/assets/js/home/route-commands.js?v=1',
  '/assets/js/home/guide-commands.js?v=1',
  '/assets/js/home/vfs.js?v=2',
  '/assets/js/home/pipe-90.js?v=1',
  '/assets/js/home/outrun-86.js?v=1',
  '/assets/js/home/screen-saver.js?v=4',
  '/assets/js/home/presence.js?v=2',
  '/assets/js/home/chat-deck.js?v=3',
  '/assets/js/home/coop-gate.js?v=1',
  '/assets/js/home/night-mode.js?v=1',
  '/assets/js/home/radio.js?v=1',
  '/assets/js/home/chat.js?v=3',
  '/assets/js/supabase-client.js?v=36',
  '/assets/js/sfx.js?v=19',
  '/assets/js/home-protocol.js?v=78',
  '/assets/js/dart-skorbord.js?v=10',
  '/assets/js/service-worker-register.js?v=3'
];

for (const asset of mustPrecache) {
  if (!precacheAssets.has(asset)) {
    addError(`service-worker.js precache eksik: ${asset}`);
  }
}

const indexPath = path.join(root, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const routeCommandsRef = '/assets/js/home/route-commands.js?v=1';
const guideCommandsRef = '/assets/js/home/guide-commands.js?v=1';
const vfsRef = '/assets/js/home/vfs.js?v=2';
const homeProtocolRef = '/assets/js/home-protocol.js?v=78';
const routeCommandsIndex = indexHtml.indexOf(routeCommandsRef);
const guideCommandsIndex = indexHtml.indexOf(guideCommandsRef);
const vfsIndex = indexHtml.indexOf(vfsRef);
const homeProtocolIndex = indexHtml.indexOf(homeProtocolRef);

if (routeCommandsIndex === -1) {
  addError(`index.html script eksik: ${routeCommandsRef}`);
} else if (guideCommandsIndex === -1) {
  addError(`index.html script eksik: ${guideCommandsRef}`);
} else if (vfsIndex === -1) {
  addError(`index.html script eksik: ${vfsRef}`);
} else if (homeProtocolIndex === -1) {
  addError(`index.html script eksik: ${homeProtocolRef}`);
} else if ([routeCommandsIndex, guideCommandsIndex, vfsIndex].some((index) => index > homeProtocolIndex)) {
  addError('index.html script sirasi hatali: home modulleri home-protocol oncesinde olmali');
}

const homeProtocolPath = path.join(root, 'assets', 'js', 'home-protocol.js');
const homeProtocol = fs.readFileSync(homeProtocolPath, 'utf8');
if (!homeProtocol.includes('createRouteCommands')) {
  addError('home-protocol.js route command factory baglantisi eksik');
}
if (!homeProtocol.includes('createGuideCommands')) {
  addError('home-protocol.js guide command factory baglantisi eksik');
}
if (!homeProtocol.includes('createVfs')) {
  addError('home-protocol.js VFS factory baglantisi eksik');
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
