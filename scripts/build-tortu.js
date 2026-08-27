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

// --- Era tespiti icin gozlem uzayi ---------------------------------------
// "Ne zaman" degil "NEYLE UGRASIYORDU" ekseni. Bir commit'in dosyalari bu
// sekiz kategoriye dagilir; era tespiti bu dagilimin degistigi yeri arar.
const CATEGORIES = Object.freeze(['kabuk', 'oyun', 'arac', 'govde', 'altyapi', 'varlik', 'belge', 'test']);

// Kategori -> jeolojik ad. Era adi bu tablodan deterministik uretilir.
const CATEGORY_LABEL = Object.freeze({
  kabuk: 'Kabuk', oyun: 'Oyun', arac: 'Atolye', govde: 'Govde',
  altyapi: 'Zemin', varlik: 'Dokum', belge: 'Kayit', test: 'Kapi'
});

function classifyPath(file) {
  if (/^tests\//.test(file)) return 'test';
  if (/^(docs\/|README|AGENTS|NOTICE|LICENSE|not\.txt)/.test(file) && /\.(md|txt)$/.test(file)) return 'belge';
  if (/^assets\/(img|models|sprites|vendor|icons|savers|wasm)\//.test(file)) return 'varlik';
  if (/^assets\/js\/home|home-protocol|^assets\/js\/(sfx|utils|theme|supabase|auth|origin-beacon|service-worker-register|lazy-load)/.test(file)) return 'kabuk';
  if (/^games\/|runner|universe|logic-game|neon-|crude|three-body|serpent/.test(file)) return 'oyun';
  if (/^tools\/|Bartender|TheOracle|^oracle\/|barista|bartender|dart|bugy|ekol|paradox|moto|demir-at|realists/i.test(file)) return 'arac';
  if (/^(service-worker\.js|scripts\/|workers\/|\.github\/|package|vitest|playwright|manifest\.json|robots|sitemap|signals\.xml|_headers)/.test(file)) return 'altyapi';
  return 'govde';
}

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

// --- Eralar: PELT degisim noktasi tespiti --------------------------------
// Killick / Fearnhead / Eckley (2012), "Optimal detection of changepoints
// with a linear computational cost".
//
// Seri TAKVIM GUNU DEGIL, COMMIT INDEKSIDIR. Gerekce olculdu: 573 commit ama
// yalniz 62 aktif gun var; gun serisinin ~%89'u sifir olurdu ve tespit
// bosluklari degisim sanirdi. Commit indeksi "neyle ugrasiyordu" sorusunu
// dogru eksende sorar.
//
// Maliyet Gauss DEGIL cok terimli negatif log-olabilirlik — gozlem sayim
// vektorudur, surekli bir buyukluk degil.
//   C(seg) = -sum_k n_k * ln(n_k / N)

const ERA_BETA_SCALE = 0.8;   // ceza katsayisi; buyudukce daha az era
const ERA_MIN_SIZE = 20;      // bir era en az bu kadar commit tasir

function categoryVector(commit) {
  const counts = CATEGORIES.map(() => 0);
  for (const file of commit.files) {
    counts[CATEGORIES.indexOf(classifyPath(file.path))] += 1;
  }
  return counts;
}

function prefixSums(vectors) {
  const pre = [CATEGORIES.map(() => 0)];
  vectors.forEach((vector, index) => {
    pre.push(pre[index].map((value, k) => value + vector[k]));
  });
  return pre;
}

function segmentCost(pre, start, end) {
  let total = 0;
  const counts = CATEGORIES.map((_, k) => {
    const n = pre[end][k] - pre[start][k];
    total += n;
    return n;
  });
  if (total === 0) return 0;
  let cost = 0;
  for (const n of counts) {
    if (n > 0) cost -= n * Math.log(n / total);
  }
  return cost;
}

function pelt(vectors, beta, minSize) {
  const n = vectors.length;
  const pre = prefixSums(vectors);
  const F = new Array(n + 1).fill(Infinity);
  const prev = new Array(n + 1).fill(0);
  F[0] = -beta;
  let candidates = [0];

  for (let t = minSize; t <= n; t += 1) {
    let best = Infinity;
    let bestStart = 0;
    for (const s of candidates) {
      if (t - s < minSize) continue;
      const value = F[s] + segmentCost(pre, s, t) + beta;
      if (value < best) { best = value; bestStart = s; }
    }
    if (best === Infinity) continue;
    F[t] = best;
    prev[t] = bestStart;
    // Budama: F[s] + C(s,t) > F[t] olan s bir daha optimum olamaz.
    candidates = candidates.filter((s) => F[s] + segmentCost(pre, s, t) <= F[t]);
    candidates.push(t);
  }

  const bounds = [];
  let cursor = n;
  while (cursor > 0) { bounds.unshift(cursor); cursor = prev[cursor]; }
  bounds.unshift(0);
  return bounds;
}

// Era adi: baskin kategori DEGIL, taban ortalamadan EN COK SAPAN kategori.
// "govde" her yerde yuksek oldugu icin baskinlik ayirt edici degil; sapma ise
// o donemin gercekten neyle ugrastigini soyler.
function nameEras(segments, globalShare) {
  const used = new Map();
  return segments.map((segment) => {
    const total = segment.counts.reduce((sum, value) => sum + value, 0) || 1;
    const lift = CATEGORIES.map((key, k) => ({
      key,
      share: segment.counts[k] / total,
      lift: segment.counts[k] / total - globalShare[k]
    })).sort((left, right) => right.lift - left.lift);

    const top = lift[0];
    let label = `${CATEGORY_LABEL[top.key]} Katmani`;
    const seen = (used.get(label) || 0) + 1;
    used.set(label, seen);
    if (seen > 1) label = `${CATEGORY_LABEL[top.key]} Katmani ${'I'.repeat(seen)}`;

    return {
      ...segment,
      label,
      dominant: top.key,
      mix: lift.slice(0, 2).map((entry) => ({
        key: entry.key,
        pct: Math.round(entry.share * 100)
      }))
    };
  });
}

function computeEras(commits) {
  // commits en yeniden eskiye geliyor; era ekseni eskiden yeniye olmali.
  const ordered = [...commits].reverse();
  const vectors = ordered.map(categoryVector);
  const beta = ERA_BETA_SCALE * Math.log(vectors.length) * CATEGORIES.length;
  const bounds = pelt(vectors, beta, ERA_MIN_SIZE);

  const grandTotal = CATEGORIES.map((_, k) => vectors.reduce((sum, v) => sum + v[k], 0));
  const grandSum = grandTotal.reduce((sum, value) => sum + value, 0) || 1;
  const globalShare = grandTotal.map((value) => value / grandSum);

  const segments = [];
  for (let i = 0; i < bounds.length - 1; i += 1) {
    const start = bounds[i];
    const end = bounds[i + 1];
    const slice = ordered.slice(start, end);
    segments.push({
      from: slice[0].date,
      to: slice[slice.length - 1].date,
      commits: end - start,
      firstSha: slice[0].sha,
      lastSha: slice[slice.length - 1].sha,
      counts: CATEGORIES.map((_, k) => vectors.slice(start, end).reduce((sum, v) => sum + v[k], 0))
    });
  }

  return nameEras(segments, globalShare).map((era, index) => ({
    no: index + 1,
    label: era.label,
    from: era.from,
    to: era.to,
    commits: era.commits,
    mix: era.mix
  }));
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
  eras: computeEras(commits),
  cores: withCores
};

if (process.argv.includes('--stats')) {
  console.log(`commit          : ${payload.repo.commits}`);
  console.log(`aktif gun       : ${payload.repo.activeDays}`);
  console.log(`donem           : ${payload.repo.first} -> ${payload.repo.last}`);
  console.log(`taban kaya      : ${bedrock.map((b) => `${b.path} (%${Math.round(b.share * 100)})`).join(', ') || '(yok)'}`);
  console.log(`era             : ${payload.eras.length}`);
  payload.eras.forEach((era) => {
    const mix = era.mix.map((m) => `${m.key} %${m.pct}`).join(' + ');
    console.log(`  ${String(era.no).padStart(2)}. ${era.label.padEnd(20)} ${era.from} -> ${era.to}  ${String(era.commits).padStart(3)} commit  ${mix}`);
  });
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
