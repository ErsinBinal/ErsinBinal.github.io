const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const ignoredDirs = new Set(['.git', 'node_modules', '.wrangler']);

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

  if (csp) {
    const policy = csp[1];
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

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  if (/<script\s+src=["']https:\/\/[^"']*latest/i.test(html)) {
    addError(`${relative(file)} CDN script latest etiketi kullaniyor`);
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
  '/assets/js/home/pipe-90.js?v=1',
  '/assets/js/home/outrun-86.js?v=1',
  '/assets/js/home/screen-saver.js?v=1',
  '/assets/js/home/presence.js?v=1',
  '/assets/js/home/coop-gate.js?v=1',
  '/assets/js/supabase-client.js?v=34',
  '/assets/js/sfx.js?v=19',
  '/assets/js/home-protocol.js?v=62',
  '/assets/js/dart-skorbord.js?v=9',
  '/assets/js/service-worker-register.js?v=3'
];

for (const asset of mustPrecache) {
  if (!precacheAssets.has(asset)) {
    addError(`service-worker.js precache eksik: ${asset}`);
  }
}

if (!/const\s+CACHE_NAME\s*=\s*'convivium-v\d+'/.test(sw)) {
  addError('service-worker.js CACHE_NAME beklenen version formatinda degil');
}

if (errors.length) {
  console.error('Site integrity check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Site integrity check passed (${htmlFiles.length} HTML files).`);
