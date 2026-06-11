const fs = require('fs');
const path = require('path');

const endpoint = String(process.argv[2] || '').trim();

if (!endpoint) {
  console.error('Usage: npm run set:oracle-endpoint -- https://your-worker.workers.dev');
  process.exit(1);
}

let url;
try {
  url = new URL(endpoint);
} catch {
  console.error(`Invalid Oracle endpoint URL: ${endpoint}`);
  process.exit(1);
}

if (url.protocol !== 'https:') {
  console.error('Oracle endpoint must use https.');
  process.exit(1);
}

if (!url.hostname.endsWith('.workers.dev')) {
  console.error('Oracle endpoint must be a workers.dev URL for the current CSP.');
  process.exit(1);
}

url.pathname = url.pathname.replace(/\/+$/, '') || '/';
url.search = '';
url.hash = '';

const normalized = url.toString().replace(/\/$/, '');
const indexPath = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
const next = html.replace(
  /(<meta\s+name="convivium-oracle-endpoint"\s+content=")[^"]*(">\s*)/,
  `$1${normalized}$2`
);

if (next === html) {
  console.error('Could not find convivium-oracle-endpoint meta tag in index.html.');
  process.exit(1);
}

fs.writeFileSync(indexPath, next);
console.log(`Oracle endpoint set: ${normalized}`);
