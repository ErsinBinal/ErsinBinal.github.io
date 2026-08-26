// Tek dogruluk kaynagi: HTML dosyalari.
//
// Bir asset HTML icinde `?v=N` ile referanslaniyorsa, ayni surum
// service-worker.js ve scripts/validate-site-integrity.js icinde de
// gecerlidir. Bu betik farki kapatir; elle tutulan bir asset listesi YOKTUR.
//
// Kullanim:
//   node scripts/sync-cache-versions.js           # surumleri esitle
//   node scripts/sync-cache-versions.js --bump    # + CACHE_NAME ilerlet
//   node scripts/sync-cache-versions.js --check   # yaz, sadece farki bildir

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ignoredDirs = new Set(['.git', 'node_modules', '.wrangler']);

// Surum tasiyan asset referansi: href/src="/assets/...?v=N"
const ASSET_REF = /\b(?:href|src)=["'](\/assets\/[^"'?#]+)\?v=([^"'&#]+)[^"']*["']/g;

// Senkron hedefleri: HTML'deki surumun yansitilacagi dosyalar.
const SYNC_TARGETS = [
  path.join(root, 'service-worker.js'),
  path.join(root, 'scripts', 'validate-site-integrity.js')
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

// HTML'de gecen her surumlu asset'i topla. Elle liste yok: kaynak HTML'in kendisi.
function collectAssetVersions() {
  const htmlFiles = listFiles(root, (file) => file.endsWith('.html'));
  const versions = new Map();

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(ASSET_REF)) {
      const [, assetPath, version] = match;
      if (!versions.has(assetPath)) versions.set(assetPath, new Map());
      const seen = versions.get(assetPath);
      if (!seen.has(version)) seen.set(version, []);
      seen.get(version).push(path.relative(root, file));
    }
  }

  return versions;
}

// Ayni asset iki farkli surumle referanslaniyorsa senkron anlamsizdir:
// hangi surumun dogru oldugunu betik bilemez, insan karari gerekir.
function assertSingleVersion(versions) {
  const conflicts = [];
  for (const [assetPath, seen] of versions.entries()) {
    if (seen.size === 1) continue;
    const detail = [...seen.entries()]
      .map(([version, files]) => `v=${version} (${files.join(', ')})`)
      .join(' vs ');
    conflicts.push(`${assetPath}: ${detail}`);
  }
  if (conflicts.length) {
    console.error('Surum catismasi — once HTML tarafinda teklestir:');
    for (const line of conflicts) console.error(`- ${line}`);
    process.exit(1);
  }
}

function replaceManagedRefs(filePath, versions) {
  if (!fs.existsSync(filePath)) return 0;
  const source = fs.readFileSync(filePath, 'utf8');
  let next = source;

  for (const [assetPath, seen] of versions.entries()) {
    const version = [...seen.keys()][0];
    const escaped = assetPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // `?v=` hemen yolun ardindan gelmeli; boylece /a/chat.js, /a/chat-deck.js ile karismaz.
    next = next.replace(new RegExp(`${escaped}\\?v=[^'"\\s)]+`, 'g'), `${assetPath}?v=${version}`);
  }

  if (next === source) return 0;
  if (!checkOnly) fs.writeFileSync(filePath, next);
  return 1;
}

function bumpCacheName() {
  const swPath = path.join(root, 'service-worker.js');
  const source = fs.readFileSync(swPath, 'utf8');
  let bumped = null;
  const next = source.replace(/const\s+CACHE_NAME\s*=\s*'convivium-v(\d+)'/, (_, version) => {
    bumped = Number(version) + 1;
    return `const CACHE_NAME = 'convivium-v${bumped}'`;
  });
  if (bumped === null) {
    console.error('service-worker.js CACHE_NAME bulunamadi; bump yapilmadi.');
    process.exit(1);
  }
  if (!checkOnly) fs.writeFileSync(swPath, next);
  return bumped;
}

const checkOnly = process.argv.includes('--check');

const versions = collectAssetVersions();
assertSingleVersion(versions);

let changed = 0;
for (const target of SYNC_TARGETS) changed += replaceManagedRefs(target, versions);

if (process.argv.includes('--bump')) {
  const next = bumpCacheName();
  console.log(`CACHE_NAME -> convivium-v${next}`);
}

if (checkOnly && changed) {
  console.error(`Senkron disi: ${changed} hedef dosya HTML surumleriyle uyusmuyor.`);
  console.error('Duzeltmek icin: npm run sync:cache');
  process.exit(1);
}

console.log(`Synced ${versions.size} versioned asset(s) across ${SYNC_TARGETS.length} target(s).`);
