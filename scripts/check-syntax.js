// Sozdizimi kapisi — elle dosya listesi YOKTUR.
//
// Kapsam dosya sisteminden turetilir: kok service-worker, assets/js, workers ve
// scripts altindaki tum .js dosyalari. Yeni bir modul eklendiginde package.json'a
// dokunmak gerekmez; dosya kapiya kendiliginden girer.
//
// Kullanim: node scripts/check-syntax.js [--list]

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const root = path.resolve(__dirname, '..');
const ignoredDirs = new Set(['.git', 'node_modules', '.wrangler', 'playwright-report', 'test-results']);

// Ucuncu taraf paketler kendi sozdizimlerinden sorumlu; onlari kapiya sokma.
const skipFile = (file) => /\.min\.js$/.test(file) || file.includes(`${path.sep}vendor${path.sep}`);

const roots = [
  path.join(root, 'service-worker.js'),
  path.join(root, 'assets', 'js'),
  path.join(root, 'workers'),
  path.join(root, 'scripts')
];

function listJs(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return target.endsWith('.js') && !skipFile(target) ? [target] : [];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirs.has(entry.name)) return [];
    return listJs(path.join(target, entry.name));
  });
}

const files = [...new Set(roots.flatMap(listJs))].sort();

if (process.argv.includes('--list')) {
  files.forEach((file) => console.log(path.relative(root, file)));
  process.exit(0);
}

if (!files.length) {
  console.error('check-syntax: hicbir dosya bulunamadi — kapsam kokleri yanlis olabilir.');
  process.exit(1);
}

// node --check'i sinirli eszamanlilikla kos; 65 dosya icin surec patlamasini onler.
const CONCURRENCY = 8;
const failures = [];
let cursor = 0;

function runOne(file) {
  return new Promise((resolve) => {
    execFile(process.execPath, ['--check', file], (error, _stdout, stderr) => {
      if (error) failures.push({ file: path.relative(root, file), stderr: (stderr || '').trim() });
      resolve();
    });
  });
}

async function worker() {
  while (cursor < files.length) {
    const file = files[cursor];
    cursor += 1;
    await runOne(file);
  }
}

Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker)).then(() => {
  if (failures.length) {
    console.error('Sozdizimi kontrolu basarisiz:');
    for (const failure of failures) {
      console.error(`- ${failure.file}`);
      if (failure.stderr) console.error(`  ${failure.stderr.split('\n')[0]}`);
    }
    process.exit(1);
  }
  console.log(`Syntax check passed (${files.length} JS files).`);
});
