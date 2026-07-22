const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ignoredDirs = new Set(['.git', 'node_modules', '.wrangler']);
const managedAssets = [
  '/assets/css/components.css',
  '/assets/css/home.css',
  '/assets/js/deb-companion.js',
  '/assets/js/home/routes.js',
  '/assets/js/home/route-commands.js',
  '/assets/js/home/guide-commands.js',
  '/assets/js/home/ruins.js',
  '/assets/js/home/ritual-pulse.js',
  '/assets/js/home/dreams.js',
  '/assets/js/home/world.js',
  '/assets/js/home/economy.js',
  '/assets/js/home/shop.js',
  '/assets/js/home/world-actions.js',
  '/assets/js/home/vfs.js',
  '/assets/js/home/navigator.js',
  '/assets/js/home/pipe-90.js',
  '/assets/js/home/outrun-86.js',
  '/assets/js/home/screen-saver.js',
  '/assets/js/home/presence.js',
  '/assets/js/home/coop-gate.js',
  '/assets/js/home/night-mode.js',
  '/assets/js/home/radio.js',
  '/assets/js/home/chat.js',
  '/assets/js/home/chat-symbols.js',
  '/assets/js/home/chat-deck.js',
  '/assets/js/home-protocol.js',
  '/assets/js/sfx.js',
  '/assets/js/supabase-client.js',
  '/assets/js/dart-skorbord.js',
  '/assets/js/service-worker-register.js'
];

function listFiles(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirs.has(entry.name)) return [];
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath, predicate);
    return predicate(fullPath) ? [fullPath] : [];
  });
}

function collectAssetVersions() {
  const htmlFiles = listFiles(root, (file) => file.endsWith('.html'));
  const versions = new Map();

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/\b(?:href|src)=["'](\/assets\/[^"'?#]+)\?v=([^"'&#]+)[^"']*["']/g)) {
      const [, assetPath, version] = match;
      if (!managedAssets.includes(assetPath)) continue;
      if (!versions.has(assetPath)) versions.set(assetPath, new Set());
      versions.get(assetPath).add(version);
    }
  }

  return versions;
}

function replaceManagedRefs(filePath, versions) {
  let source = fs.readFileSync(filePath, 'utf8');
  let next = source;

  for (const [assetPath, foundVersions] of versions.entries()) {
    if (foundVersions.size !== 1) {
      throw new Error(`${assetPath} has ${foundVersions.size} versions: ${[...foundVersions].join(', ')}`);
    }
    const version = [...foundVersions][0];
    const escaped = assetPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next.replace(new RegExp(`${escaped}\\?v=[^'"]+`, 'g'), `${assetPath}?v=${version}`);
  }

  if (next !== source) fs.writeFileSync(filePath, next);
}

function bumpCacheName() {
  const swPath = path.join(root, 'service-worker.js');
  const source = fs.readFileSync(swPath, 'utf8');
  const next = source.replace(/const\s+CACHE_NAME\s*=\s*'convivium-v(\d+)'/, (_, version) => {
    return `const CACHE_NAME = 'convivium-v${Number(version) + 1}'`;
  });
  if (next !== source) fs.writeFileSync(swPath, next);
}

const versions = collectAssetVersions();
replaceManagedRefs(path.join(root, 'service-worker.js'), versions);
replaceManagedRefs(path.join(root, 'scripts', 'validate-site-integrity.js'), versions);

if (process.argv.includes('--bump')) bumpCacheName();

console.log(`Synced ${versions.size} managed asset versions.`);
