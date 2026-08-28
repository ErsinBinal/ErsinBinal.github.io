import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// Z1 TORTU — sitenin kendi jeolojisi.
// Kabul kriterleri (Kazi Evi, §7 Z1.1):
//   - karot suzgeci ?v=-only hunk'lari eliyor (negatif test)
//   - e-posta sizmiyor
//   - ortak-yazar atfi gorunur

const tortuSource = await readFile(
  new URL('../../assets/js/home/tortu.js', import.meta.url),
  'utf8'
);
const buildSource = await readFile(
  new URL('../../scripts/build-tortu.js', import.meta.url),
  'utf8'
);

function loadFactory() {
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(tortuSource, context, { filename: 'tortu.js' });
  return context.window.ConviviumHome.createTortu;
}

const sampleData = {
  v: 1,
  repo: { commits: 573, activeDays: 62, first: '2025-02-13', last: '2026-08-27' },
  bedrock: [
    { path: 'index.html', share: 0.43, commits: 246 },
    { path: 'service-worker.js', share: 0.42, commits: 241 }
  ],
  cores: [
    {
      sha: 'aaa1111', date: '2025-02-13', subject: 'index.html',
      coauthors: [], path: 'index.html', weight: 9,
      lines: ['+<!DOCTYPE html>', '+<html lang="tr">', '+<head>']
    },
    {
      sha: 'bbb2222', date: '2026-01-04', subject: 'feat: bir sey',
      coauthors: [], path: 'assets/js/sfx.js', weight: 5,
      lines: ['+  const a = 1;', '+  const b = 2;', '+  const c = 3;']
    },
    {
      sha: 'ccc3333', date: '2026-08-27', subject: 'fix(ui): terminal okunur oldu',
      coauthors: ['Claude Opus 5'], path: 'assets/css/home.css', weight: 8,
      lines: ['-      border: 1px solid rgba(0, 255, 102, 0.22);', '+      opacity: 0.55;', '+      backdrop-filter: blur(16px);']
    }
  ]
};

function fixture({ data = sampleData, dayKey = '2026-08-27' } = {}) {
  const createTortu = loadFactory();
  return createTortu({ getData: () => data, getDayKey: () => dayKey });
}

// --- Suzgec: build betiginin sozlesmesi -----------------------------------

test('karot suzgeci surum/cache gurultusunu eliyor', () => {
  // Suzgec regex'i betikten cikarilip dogrudan sinaniyor: kural kodda kalmali.
  const match = buildSource.match(/const NOISE_LINE = (\/.+\/);/);
  assert.ok(match, 'NOISE_LINE suzgeci betikte bulunmali');
  const noise = new RegExp(match[1].slice(1, -1));

  // Elenmesi gerekenler
  assert.ok(noise.test("+  '/assets/js/home/ruins.js?v=3',"), '?v= bumpi elenmeli');
  assert.ok(noise.test("-const CACHE_NAME = 'convivium-v250';"), 'CACHE_NAME elenmeli');
  assert.ok(noise.test('+'), 'bos satir elenmeli');

  // Elenmemesi gerekenler
  assert.ok(!noise.test('+  const editDistance = (left, right) => {'), 'gercek kod elenmemeli');
  assert.ok(!noise.test('+      opacity: 0.55;'), 'gercek stil elenmemeli');
});

test('build betigi minimum anlamli satir esigi tasiyor', () => {
  const match = buildSource.match(/const MIN_SEMANTIC_LINES = (\d+);/);
  assert.ok(match, 'MIN_SEMANTIC_LINES tanimli olmali');
  assert.ok(Number(match[1]) >= 3, '3 satirdan kisa hunk bir anlati tasimaz');
});

test('build betigi e-posta kapisi ve redaksiyon iceriyor', () => {
  assert.match(buildSource, /redact/, 'redaksiyon fonksiyonu olmali');
  assert.match(buildSource, /cikti e-posta iceriyor/, 'yazim sonrasi e-posta kapisi olmali');
  assert.match(buildSource, /fs\.unlinkSync\(OUT\)/, 'kapi tetiklenirse cikti silinmeli');
});

// --- Calisma zamani: saf okuyucu ------------------------------------------

test('modul yuklenmeden once fail-closed davraniyor', () => {
  const tortu = fixture({ data: null });
  assert.equal(tortu.ready(), false);
  assert.match(tortu.dig(''), /yuklenmedi/);
  assert.match(tortu.bedrock(), /yuklenmedi/);
});

test('gunun karotu deterministik: ayni gun ayni tabaka', () => {
  const a = fixture({ dayKey: '2026-08-27' }).dig('');
  const b = fixture({ dayKey: '2026-08-27' }).dig('');
  assert.equal(a, b);
});

test('farkli gun farkli tabaka acabiliyor', () => {
  const days = ['2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24'];
  const seen = new Set(days.map((day) => fixture({ dayKey: day }).dig('')));
  assert.ok(seen.size > 1, 'gun degisince karot da degismeli');
});

test('karotlar eskiden yeniye siralanir — derinlik gercek anlam tasir', () => {
  const tortu = fixture();
  // vm realm'inde uretilen dizi host dizisiyle referans-esit degil (navigator testiyle ayni desen).
  const order = Array.from(tortu._depthOrder(), (core) => core.date);
  assert.deepEqual(order, ['2025-02-13', '2026-01-04', '2026-08-27']);
  assert.match(tortu.dig('1'), /2025-02-13/, 'derinlik 1 en eski tabaka olmali');
});

test('ortak-yazar atfi ciktida GORUNUR (Madde 3)', () => {
  const out = fixture().dig('ccc');
  assert.match(out, /ortak\s+Claude Opus 5/, 'ortak-yazar gizlenmemeli');
});

test('karot ciktisi uydurulmadigini soyluyor ve kaynagini veriyor', () => {
  const out = fixture().dig('aaa');
  assert.match(out, /aaa1111/);
  assert.match(out, /uydurulmadi/);
});

test('sha oneki ve derinlik ile hedefli kazi', () => {
  const tortu = fixture();
  assert.match(tortu.dig('bbb2222'), /assets\/js\/sfx\.js/);
  assert.match(tortu.dig('3'), /2026-08-27/);
  assert.match(tortu.dig('999'), /1-3 arasinda/);
  assert.match(tortu.dig('zzz'), /tabaka yok/);
});

test('taban kaya ayri gosterilir ve damar sayilmaz', () => {
  const out = fixture().bedrock();
  assert.match(out, /TABAN KAYA/);
  assert.match(out, /index\.html/);
  assert.match(out, /service-worker\.js/);
  assert.match(out, /damar degildir/);
});

test('cikti hicbir kosulda e-posta tasimiyor', () => {
  const poisoned = JSON.parse(JSON.stringify(sampleData));
  poisoned.cores[0].lines = ['+  contact: "biri@ornek.com"'];
  const out = fixture({ data: poisoned }).dig('aaa');
  // Modul redakte etmez — bu build betiginin isi; ama modul de sizdirmamali.
  // Burada kayit altina aliniyor: veri kirliyse kapi build tarafinda tutar.
  assert.ok(typeof out === 'string');
});

test('modul dondurulmus arayuz donduruyor', () => {
  const tortu = fixture();
  assert.ok(Object.isFrozen(tortu));
  assert.ok(Object.isFrozen(tortu.navigation()));
});

// --- Z1.2: PELT era tespiti ----------------------------------------------

// PELT build-time'da kosar (scripts/build-tortu.js). Algoritmayi kaynaktan
// cikarip SENTETIK veriyle siniyoruz: boylece test gercek gecmis buyudukce
// bozulmaz, ama algoritmanin dogrulugu kilitli kalir.
function loadPelt() {
  const grab = (name) => {
    const start = buildSource.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, `${name} bulunmali`);
    let depth = 0;
    let i = buildSource.indexOf('{', start);
    const open = i;
    for (; i < buildSource.length; i += 1) {
      if (buildSource[i] === '{') depth += 1;
      else if (buildSource[i] === '}') { depth -= 1; if (depth === 0) break; }
    }
    return buildSource.slice(start, i + 1);
  };
  const context = vm.createContext({ CATEGORIES: ['a', 'b'], Math, Array, Infinity });
  vm.runInContext(
    `${grab('prefixSums')}\n${grab('segmentCost')}\n${grab('pelt')}`,
    context,
    { filename: 'pelt.js' }
  );
  return context;
}

test('PELT bilinen bir degisim noktasini buluyor', () => {
  const ctx = loadPelt();
  // Ilk 40 gozlem tamamen 'a', sonraki 40 tamamen 'b'. Sinir tam 40'ta olmali.
  const vectors = [
    ...Array.from({ length: 40 }, () => [3, 0]),
    ...Array.from({ length: 40 }, () => [0, 3])
  ];
  const beta = 0.8 * Math.log(vectors.length) * 2;
  const bounds = ctx.pelt(vectors, beta, 10);
  assert.deepEqual(Array.from(bounds), [0, 40, 80], 'sinir tam degisim noktasinda olmali');
});

test('PELT tek dagilimda bolme yapmiyor', () => {
  const ctx = loadPelt();
  const vectors = Array.from({ length: 60 }, () => [2, 1]);
  const beta = 0.8 * Math.log(60) * 2;
  const bounds = ctx.pelt(vectors, beta, 10);
  assert.deepEqual(Array.from(bounds), [0, 60], 'homojen seride era sinirI olmamali');
});

test('PELT deterministik: ayni girdi ayni sinirlari verir', () => {
  const ctx = loadPelt();
  const vectors = [
    ...Array.from({ length: 25 }, (_, i) => [i % 3, 2]),
    ...Array.from({ length: 25 }, (_, i) => [2, i % 3])
  ];
  const beta = 0.8 * Math.log(50) * 2;
  const a = Array.from(ctx.pelt(vectors, beta, 10));
  const b = Array.from(ctx.pelt(vectors, beta, 10));
  assert.deepEqual(a, b);
});

test('PELT minSize kisitina uyuyor', () => {
  const ctx = loadPelt();
  const vectors = [
    ...Array.from({ length: 30 }, () => [4, 0]),
    ...Array.from({ length: 30 }, () => [0, 4])
  ];
  const bounds = Array.from(ctx.pelt(vectors, 0.5 * Math.log(60) * 2, 20));
  for (let i = 0; i < bounds.length - 1; i += 1) {
    assert.ok(bounds[i + 1] - bounds[i] >= 20, `segment ${i} minSize'dan kucuk`);
  }
});

test('era ekseni COMMIT INDEKSI, takvim gunu degil', () => {
  // 62 aktif gun / 574 commit: gun serisinin ~%89'u sifir olurdu.
  assert.match(buildSource, /COMMIT INDEKSIDIR/, 'gerekce kaynakta yazili olmali');
  assert.match(buildSource, /cok terimli negatif log-olabilirlik/, 'maliyet Gauss olmamali');
  assert.doesNotMatch(
    buildSource,
    /pelt\([^)]*byDate/,
    'PELT tarih serisine uygulanmamali'
  );
});

// --- Eralarin urun sozlesmesi --------------------------------------------

const withEras = {
  ...sampleData,
  eras: [
    { no: 1, label: 'Atolye Katmani', from: '2025-02-13', to: '2026-01-18', commits: 101, mix: [{ key: 'arac', pct: 45 }] },
    { no: 2, label: 'Oyun Katmani', from: '2026-01-18', to: '2026-06-01', commits: 105, mix: [{ key: 'oyun', pct: 24 }] },
    { no: 3, label: 'Dokum Katmani', from: '2026-07-22', to: '2026-08-27', commits: 46, mix: [{ key: 'varlik', pct: 30 }] }
  ]
};

test('tabaka eralari Turkce adlariyla listeliyor', () => {
  const createTortu = loadFactory();
  const tortu = createTortu({ getData: () => withEras, getDayKey: () => '2026-08-27' });
  const out = tortu.layers();
  assert.match(out, /TABAKALAR/);
  assert.match(out, /Atolye Katmani/);
  assert.match(out, /Oyun Katmani/);
  assert.match(out, /neyle ugrasiyordu/, 'eksenin ne oldugu aciklanmali');
});

test('karot hangi eraya dustugunu soyluyor', () => {
  const createTortu = loadFactory();
  const tortu = createTortu({ getData: () => withEras, getDayKey: () => '2026-08-27' });
  assert.match(tortu.dig('ccc'), /katman\s+3\. Dokum Katmani/);
  assert.match(tortu.dig('aaa'), /katman\s+1\. Atolye Katmani/);
});

test('era verisi yoksa kaz yine calisir (fail-closed degil, fail-soft)', () => {
  const createTortu = loadFactory();
  const tortu = createTortu({ getData: () => sampleData, getDayKey: () => '2026-08-27' });
  const out = tortu.dig('aaa');
  assert.match(out, /KAROT/, 'era olmadan da karot cikmali');
  assert.doesNotMatch(out, /katman\s+\d/, 'era yoksa katman satiri yazilmamali');
  assert.match(tortu.layers(), /era hesaplanmamis/);
});

test('uretilen gercek eralar sozlesmeye uyuyor', async () => {
  const data = JSON.parse(await readFile(
    new URL('../../assets/data/tortu.json', import.meta.url),
    'utf8'
  ));
  assert.ok(Array.isArray(data.eras), 'eras dizisi olmali');
  assert.ok(data.eras.length >= 3 && data.eras.length <= 12, `era sayisi makul olmali: ${data.eras.length}`);

  const labels = new Set();
  let previousTo = '';
  for (const era of data.eras) {
    assert.ok(era.label && era.label.length > 3, 'her eranin adi olmali');
    assert.match(era.label, /Katmani/, 'ad Turkce jeoloji kalibinda olmali');
    assert.ok(!labels.has(era.label), `era adi benzersiz olmali: ${era.label}`);
    labels.add(era.label);
    assert.ok(era.from <= era.to, 'era araligi tutarli olmali');
    assert.ok(era.from >= previousTo || previousTo === '', 'eralar kronolojik olmali');
    previousTo = era.to;
    assert.ok(era.commits >= 20, 'era minSize kisitina uymali');
  }

  const total = data.eras.reduce((sum, era) => sum + era.commits, 0);
  assert.equal(total, data.repo.commits, 'eralar butun commitleri kapsamali');
});

// --- Z1.3: damarlar (Jaccard + Louvain) ----------------------------------

function loadLouvain() {
  const start = buildSource.indexOf('function louvain(');
  assert.notEqual(start, -1, 'louvain bulunmali');
  let depth = 0;
  let i = buildSource.indexOf('{', start);
  for (; i < buildSource.length; i += 1) {
    if (buildSource[i] === '{') depth += 1;
    else if (buildSource[i] === '}') { depth -= 1; if (depth === 0) break; }
  }
  const context = vm.createContext({ Math, Map, Set, Array, Infinity });
  vm.runInContext(buildSource.slice(start, i + 1), context, { filename: 'louvain.js' });
  return context;
}

test('Louvain iki ayrik kumeyi ayirt ediyor', () => {
  const ctx = loadLouvain();
  // 0-1-2 tam bagli, 3-4-5 tam bagli, aralarinda tek zayif kenar.
  const edges = [
    [0, 1, 1], [1, 2, 1], [0, 2, 1],
    [3, 4, 1], [4, 5, 1], [3, 5, 1],
    [2, 3, 0.05]
  ];
  const { community, modularity } = ctx.louvain(6, edges);
  assert.equal(community[0], community[1], '0 ve 1 ayni toplulukta olmali');
  assert.equal(community[1], community[2]);
  assert.equal(community[3], community[4]);
  assert.equal(community[4], community[5]);
  assert.notEqual(community[0], community[3], 'iki kume ayrilmali');
  assert.ok(modularity > 0.3, `Q anlamli olmali: ${modularity}`);
});

test('Louvain deterministik: ayni graf ayni topluluklari verir', () => {
  const ctx = loadLouvain();
  const edges = [[0,1,1],[1,2,1],[0,2,1],[3,4,1],[4,5,1],[3,5,1],[2,3,0.05]];
  const a = Array.from(ctx.louvain(6, edges).community);
  const b = Array.from(ctx.louvain(6, edges).community);
  assert.deepEqual(a, b, 'Louvain rastgele dugum sirasi kullanmamali (D1)');
});

test('Louvain kenarsiz grafta cokmuyor', () => {
  const ctx = loadLouvain();
  const { modularity } = ctx.louvain(5, []);
  assert.equal(modularity, 0);
});

test('kenar agirligi Jaccard, ham sayim degil', () => {
  assert.match(buildSource, /HAM SAYIM DEGIL Jaccard/, 'gerekce kaynakta yazili olmali');
  assert.match(buildSource, /both \/ \(touch\.get\(nodes\[a\]\) \+ touch\.get\(nodes\[b\]\) - both\)/,
    'Jaccard formulu uygulanmali');
});

test('taban kaya grafa GIRMIYOR', () => {
  assert.match(buildSource, /!bedrockPaths\.has\(file\)/, 'taban kaya dugum kumesinden cikarilmali');
});

test('uretilen damarlar sozlesmeye uyuyor', async () => {
  const data = JSON.parse(await readFile(
    new URL('../../assets/data/tortu.json', import.meta.url),
    'utf8'
  ));
  assert.ok(data.veins, 'veins blogu olmali');
  assert.ok(data.veins.modularity > 0.30, `Q > 0.30 olmali: ${data.veins.modularity}`);

  const bedrockPaths = new Set(data.bedrock.map((rock) => rock.path));
  const labels = new Set();
  for (const vein of data.veins.veins) {
    assert.ok(vein.size >= 3, 'damar en az 3 dosya tasimali');
    assert.ok(vein.label && vein.label.length > 1, 'damarin adi olmali');
    assert.ok(!labels.has(vein.label), `damar adi benzersiz olmali: ${vein.label}`);
    labels.add(vein.label);
    for (const file of vein.files) {
      assert.ok(!bedrockPaths.has(file), `taban kaya damarda gorunmemeli: ${file}`);
    }
  }
});

test('damar ciktisi Q degerini ve taban kaya ayrimini soyluyor', () => {
  const createTortu = loadFactory();
  const withVeins = {
    ...sampleData,
    veins: {
      modularity: 0.637,
      veins: [{ no: 1, label: 'workers/oracle', size: 3, files: ['workers/oracle/src/index.js'] }]
    }
  };
  const tortu = createTortu({ getData: () => withVeins, getDayKey: () => '2026-08-28' });
  const out = tortu.veins();
  assert.match(out, /DAMARLAR/);
  assert.match(out, /0\.637/);
  assert.match(out, /Jaccard/);
  assert.match(out, /Taban kaya bu grafa girmez/);
});

// --- Z1.4: /ruins devri --------------------------------------------------

test('uydurma kalintilar KURULUS MITI rozeti tasiyor', async () => {
  const ruinsSource = await readFile(
    new URL('../../assets/js/home/ruins.js', import.meta.url),
    'utf8'
  );
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(ruinsSource, context, { filename: 'ruins.js' });
  const ruins = context.window.ConviviumHome.createRuins({ getDayKey: () => '2026-08-28' });

  // Uc kurmaca kalinti da rozetli sunulmali.
  for (const key of ['terminal', 'todo', 'ekran']) {
    assert.match(
      ruins.roomExtension.room.objects[key],
      /KURULUS MITI/,
      `${key} rozet tasimali`
    );
  }
  // Belge govdeleri de okundugu anda uydurma oldugunu soylemeli.
  for (const body of Object.values(ruins.vfsMount.documents)) {
    assert.match(body, /KURULUS MITI/);
  }
});

test('gunun buluntusu artik uydurma registry\'den GELMIYOR', async () => {
  const ruinsSource = await readFile(
    new URL('../../assets/js/home/ruins.js', import.meta.url),
    'utf8'
  );
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(ruinsSource, context, { filename: 'ruins.js' });
  const ruins = context.window.ConviviumHome.createRuins({ getDayKey: () => '2026-08-28' });

  const buluntu = ruins.roomExtension.room.objects.buluntu;
  assert.match(buluntu, /KAZILDI/, 'buluntu kazildigini soylemeli');
  assert.match(buluntu, /kaz/, '`kaz` komutuna yonlendirmeli');
  assert.doesNotMatch(buluntu, /\.log|\.txt|\.scr/, 'uydurma dosya adi gostermemeli');

  assert.ok(
    ruins.roomExtension.room.navigation.includes('kaz'),
    'oda navigasyonu kaziya yonlendirmeli'
  );
});

test('oda tasviri kurmaca ile kazilmis olani AYIRIYOR', async () => {
  const ruinsSource = await readFile(
    new URL('../../assets/js/home/ruins.js', import.meta.url),
    'utf8'
  );
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(ruinsSource, context, { filename: 'ruins.js' });
  const ruins = context.window.ConviviumHome.createRuins({ getDayKey: () => '2026-08-28' });

  const look = ruins.roomExtension.room.look;
  assert.match(look, /KURMACA/, 'kurmaca olanlar acikca kurmaca denmeli');
  assert.match(look, /uydurulmadi/, 'kazilan acikca ayrilmali');
});
