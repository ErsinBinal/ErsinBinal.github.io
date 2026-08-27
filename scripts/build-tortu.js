// TORTU — sitenin kendi jeolojisini kazar.
//
// Convivium kalinti YAZMAYI birakir, kalinti KAZAR. Kaynak uydurma degil:
// deponun gercek git tarihi. Cikti build-time'da uretilir, calisma aninda
// yalnizca okunur (D6: tembel, precache disi).
//
// Kullanim:
//   node scripts/build-tortu.js            # assets/data/tortu.json uret
//   node scripts/build-tortu.js --stats    # yalniz olcum bas, dosya yazma
//
// GIZLILIK: yazar e-postasi ASLA yayinlanmaz. Ortak-yazar ATFI korunur ve
// gosterilir — mekanizma sirri olmaz (Kazi Evi, Madde 3).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const OUT = path.join(root, 'assets', 'data', 'tortu.json');

const git = (args) => execFileSync('git', args, {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 512 * 1024 * 1024
});

// --- Karot suzgeci (pazarliksiz) ---------------------------------------
// Bu suzgec olmadan kazi "surum bumpi arkeolojisi"ne doner: olculdu, hunk'larin
// %57'si surum/cache gurultusu ya da anlamsiz kadar kucuk.
const NOISE_LINE = /(\?v=\d+)|(CACHE_NAME)|(convivium-v\d+)|^[+-]\s*$/;
const BINARY_PATH = /\.(png|jpe?g|webp|gif|svg|glb|ico|woff2?|ttf|otf|mp3|wav|pdf|zip)$/i;
const GENERATED_PATH = /^(package-lock\.json|node_modules\/|\.moto-src-cache\/)/;

const MIN_SEMANTIC_LINES = 3;   // bundan kisa hunk bir anlati tasimaz
const MAX_CORE_LINES = 10;      // karot bir vitrin, bir dosya dokumu degil
const MAX_LINE_CHARS = 96;
const TARGET_CORES = 140;       // butce: dosya boyutu bunun dogrusal fonksiyonu

const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const stripEmail = (value) => String(value || '').replace(/<[^>]*>/g, '').trim();

// Karot icerigi gercek diff'tir; icinde mesru olarak e-posta gecebilir
// (KVKK sayfasi, commit mesajindaki ortak-yazar satiri, ornek yapilandirma).
// Yayinlanan hicbir satir adres tasimaz: burada REDAKTE edilir, asagidaki
// kapi ise son guvencedir.
const redact = (line) => String(line).replace(EMAIL, '[e-posta redakte]');

function readCommits() {
  // Alan ayraci olarak birim ayraci kullan: subject icinde bulunma ihtimali yok.
  const SEP = '';
  const REC = '';
  const raw = git([
    'log',
    '--no-merges',
    `--format=${REC}%h${SEP}%ad${SEP}%s${SEP}%b`,
    '--date=short',
    '--numstat'
  ]);

  return raw.split(REC).slice(1).map((chunk) => {
    const newline = chunk.indexOf('\n');
    const head = newline === -1 ? chunk : chunk.slice(0, newline);
    const body = newline === -1 ? '' : chunk.slice(newline + 1);
    const [sha, date, subject, ...rest] = head.split(SEP);

    // Govde (%b) numstat ile ayni bloga dusuyor; ortak-yazar satirlarini
    // oradan ayikla ve YALNIZ ISMI al.
    const bodyAndStats = [rest.join(SEP), body].filter(Boolean).join('\n');
    const coauthors = [...bodyAndStats.matchAll(/Co-authored-by:\s*([^<\n]+)/gi)]
      .map((match) => stripEmail(match[1]))
      .filter(Boolean);

    const files = [];
    for (const line of bodyAndStats.split('\n')) {
      const stat = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
      if (!stat) continue;
      const [, added, removed, file] = stat;
      if (GENERATED_PATH.test(file)) continue;
      files.push({
        path: file,
        add: added === '-' ? 0 : Number(added),
        del: removed === '-' ? 0 : Number(removed)
      });
    }

    return {
      sha,
      date,
      subject: String(subject || '').slice(0, 120),
      coauthors: [...new Set(coauthors)],
      files
    };
  }).filter((commit) => commit.sha);
}

// --- Karot cikarimi ------------------------------------------------------
function extractCores(commit) {
  let patch = '';
  try {
    patch = git(['show', commit.sha, '--unified=0', '--format=', '--no-color']);
  } catch {
    return [];
  }

  const cores = [];
  for (const fileChunk of patch.split(/^diff --git /m).slice(1)) {
    const header = fileChunk.match(/^a\/(\S+) b\/(\S+)/);
    if (!header) continue;
    const filePath = header[2];
    if (BINARY_PATH.test(filePath) || GENERATED_PATH.test(filePath)) continue;

    for (const hunk of fileChunk.split(/^@@/m).slice(1)) {
      const changed = hunk.split('\n')
        .filter((line) => /^[+-]/.test(line) && !/^(\+\+\+|---)/.test(line));
      const semantic = changed.filter((line) => !NOISE_LINE.test(line));
      if (semantic.length < MIN_SEMANTIC_LINES) continue;

      cores.push({
        path: filePath,
        weight: semantic.length,
        lines: semantic.slice(0, MAX_CORE_LINES).map((line) => redact(line.slice(0, MAX_LINE_CHARS)))
      });
    }
  }
  return cores;
}

// --- Taban kaya ----------------------------------------------------------
// Commit frekansi cok yuksek olan dosyalar bir "damar" degildir; sitenin
// TABAN KAYASIDIR ve dogrustce oyle adlandirilir (olculdu: index.html %41.7,
// service-worker.js %41.6).
const BEDROCK_SHARE = 0.25;

function computeBedrock(commits) {
  const touch = new Map();
  for (const commit of commits) {
    for (const file of new Set(commit.files.map((f) => f.path))) {
      touch.set(file, (touch.get(file) || 0) + 1);
    }
  }
  return [...touch.entries()]
    .map(([file, count]) => ({ path: file, share: count / commits.length, commits: count }))
    .filter((entry) => entry.share >= BEDROCK_SHARE)
    .sort((left, right) => right.share - left.share)
    .map((entry) => ({ path: entry.path, share: Math.round(entry.share * 1000) / 1000, commits: entry.commits }));
}

// --- Ana akis ------------------------------------------------------------
const commits = readCommits();
if (!commits.length) {
  console.error('build-tortu: git gecmisi okunamadi.');
  process.exit(1);
}

const activeDays = new Set(commits.map((commit) => commit.date)).size;
const bedrock = computeBedrock(commits);

// Karot secimi DETERMINISTIK: tarihe gore siralanmis commit'ler uzerinde
// esit araliklarla ornekleme. Rastgelelik yok; ayni gecmis ayni karotlari verir.
const withCores = [];
const stride = Math.max(1, Math.floor(commits.length / TARGET_CORES));
for (let index = 0; index < commits.length; index += stride) {
  const commit = commits[index];
  const cores = extractCores(commit);
  if (!cores.length) continue;
  // Commit basina en agir tek karot: en cok anlamli satir tasiyan hunk.
  const best = cores.sort((left, right) => right.weight - left.weight)[0];
  withCores.push({
    sha: commit.sha,
    date: commit.date,
    subject: commit.subject,
    coauthors: commit.coauthors,
    path: best.path,
    weight: best.weight,
    lines: best.lines
  });
}

const payload = {
  v: 1,
  repo: {
    commits: commits.length,
    activeDays,
    first: commits[commits.length - 1].date,
    last: commits[0].date
  },
  bedrock,
  cores: withCores
};

if (process.argv.includes('--stats')) {
  console.log(`commit          : ${payload.repo.commits}`);
  console.log(`aktif gun       : ${payload.repo.activeDays}`);
  console.log(`donem           : ${payload.repo.first} -> ${payload.repo.last}`);
  console.log(`taban kaya      : ${bedrock.map((b) => `${b.path} (%${Math.round(b.share * 100)})`).join(', ') || '(yok)'}`);
  console.log(`karot           : ${withCores.length}`);
  console.log(`ortak-yazarli   : ${withCores.filter((c) => c.coauthors.length).length}`);
  console.log(`tahmini boyut   : ${Math.round(JSON.stringify(payload).length / 1024)} KB`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(payload)}\n`);

// Yayinlanan cikti e-posta sizdirmamali — kapi burada.
const written = fs.readFileSync(OUT, 'utf8');
EMAIL.lastIndex = 0;
if (EMAIL.test(written)) {
  console.error('build-tortu: cikti e-posta iceriyor, yazim geri alindi.');
  fs.unlinkSync(OUT);
  process.exit(1);
}

console.log(
  `tortu.json yazildi: ${withCores.length} karot, ${bedrock.length} taban kaya, ` +
  `${Math.round(written.length / 1024)} KB`
);
