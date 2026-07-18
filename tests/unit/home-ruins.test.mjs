import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const ruinsSource = await readFile(
  new URL('../../assets/js/home/ruins.js', import.meta.url),
  'utf8'
);
const worldSource = await readFile(
  new URL('../../assets/js/home/world.js', import.meta.url),
  'utf8'
);
const vfsSource = await readFile(
  new URL('../../assets/js/home/vfs.js', import.meta.url),
  'utf8'
);
const protocolSource = await readFile(
  new URL('../../assets/js/home-protocol.js', import.meta.url),
  'utf8'
);

function normalizeCommand(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .trim()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/^[>/\\]+/, '')
    .replace(/[._-]+/g, ' ')
    .replace(/[^\w\s?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadModules(...sources) {
  const context = vm.createContext({ window: {}, console });
  sources.forEach(([source, filename]) => vm.runInContext(source, context, { filename }));
  return context.window.ConviviumHome;
}

function createRuinsFixture(dayKey = '2026-07-18') {
  const home = loadModules([ruinsSource, 'ruins.js']);
  const ruins = home.createRuins({ getDayKey: () => dayKey });
  return { home, ruins };
}

const expectedArtifacts = [
  {
    id: 'bbs-1997.log',
    object: 'terminal',
    title: 'Kapanmayan BBS',
    summary: '1997 tarihli kapanmamis bir BBS oturumu. Tasiyici sesi kaydin sonunda hala acik.',
    body: [
      'CONVIVIUM RELAY // NODE 04',
      '1997-11-03 02:14',
      '> baglanti sayisi: 1',
      '> son kullanici cikti ama tasiyici hala acik.',
      '> mesaj: "gelecekte biri bu satiri bulursa, sistemi kapatma."',
      'NO CARRIER_'
    ].join('\n')
  },
  {
    id: 'todo-fragment.txt',
    object: 'todo',
    title: 'Yarim TODO',
    summary: '2004 tarihli bir gelistirme listesi. Bazi maddeler yirmi iki yil sonra kendiliginden tamamlanmis.',
    body: [
      'TODO // kurtarilan parca // 2004',
      '[x] haritayi ciz',
      '[x] terminale ses ver',
      '[ ] ziyaretcilerin birbirini hissetmesini sagla',
      '[ ] arsivi tamamla',
      'not: bitmis bir sistem, terk edilmis bir sistemdir.'
    ].join('\n')
  },
  {
    id: 'arcade-recovery.scr',
    object: 'ekran',
    title: 'Kayip Baslangic Ekrani',
    summary: 'Tarihsiz bir arcade ekran dokumu. Oyun baslamadan once oyuncunun adini unutmus.',
    body: [
      'RECOVERED SCREEN 03',
      '+------------------------------+',
      '| PLAYER 1: ???                |',
      '| SECTOR  : CONVIVIUM/ORIGIN   |',
      '| CREDIT  : 00                 |',
      '+------------------------------+',
      'INSERT MEMORY'
    ].join('\n')
  }
];

test('Ruins preserves the exact immutable artifact registry', () => {
  const { home } = createRuinsFixture();
  const artifacts = JSON.parse(JSON.stringify(home.ruinsArtifactRegistry));

  assert.deepEqual(artifacts, expectedArtifacts);
  assert.equal(Object.isFrozen(home.ruinsArtifactRegistry), true);
  assert.equal(Array.from(home.ruinsArtifactRegistry).every(Object.isFrozen), true);
});

test('Ruins selects one deterministic shared artifact per UTC day', () => {
  const current = createRuinsFixture('2026-07-18').ruins;
  const next = createRuinsFixture('2026-07-19').ruins;
  const following = createRuinsFixture('2026-07-20').ruins;

  assert.equal(current.dayKey, '2026-07-18');
  assert.equal(current.dailyArtifact.id, 'arcade-recovery.scr');
  assert.equal(next.dailyArtifact.id, 'bbs-1997.log');
  assert.equal(following.dailyArtifact.id, 'todo-fragment.txt');
  assert.equal(createRuinsFixture('2026-07-18').ruins.dailyArtifact.id, current.dailyArtifact.id);
});

test('Ruins creates the exact world room and VFS mount without side effects', () => {
  const { ruins } = createRuinsFixture();

  assert.equal(ruins.roomExtension.path, '/ruins');
  assert.equal(ruins.roomExtension.title, 'Sinyal Arkeolojisi');
  assert.deepEqual(JSON.parse(JSON.stringify(ruins.roomExtension.room)), {
    look: 'Sinyal Arkeolojisi. Kurmaca arsivin tozu altinda uc dijital kalinti var: terminal, todo, ekran. Bugunun yuzey sinyali: arcade-recovery.scr.',
    objects: {
      terminal: '1997 tarihli kapanmamis bir BBS oturumu. Tasiyici sesi kaydin sonunda hala acik. Oku: cat bbs-1997.log',
      todo: '2004 tarihli bir gelistirme listesi. Bazi maddeler yirmi iki yil sonra kendiliginden tamamlanmis. Oku: cat todo-fragment.txt',
      ekran: 'Tarihsiz bir arcade ekran dokumu. Oyun baslamadan once oyuncunun adini unutmus. Oku: cat arcade-recovery.scr',
      buluntu: 'Bugunun ortak buluntusu: arcade-recovery.scr / Kayip Baslangic Ekrani. Her gezgin bugun ayni parcayi gorur. Oku: cat arcade-recovery.scr'
    }
  });
  assert.deepEqual(Array.from(ruins.vfsMount.files), [
    'bbs-1997.log',
    'todo-fragment.txt',
    'arcade-recovery.scr'
  ]);
  assert.deepEqual(
    JSON.parse(JSON.stringify(ruins.vfsMount.documents)),
    Object.fromEntries(expectedArtifacts.map((artifact) => [artifact.id, artifact.body]))
  );
  assert.equal(Object.isFrozen(ruins.roomExtension), true);
  assert.equal(Object.isFrozen(ruins.roomExtension.room.objects), true);
  assert.equal(Object.isFrozen(ruins.vfsMount), true);
  assert.equal(Object.isFrozen(ruins.vfsMount.documents), true);
});

test('World accepts Ruins as an optional ninth room while preserving core progression', () => {
  const home = loadModules([ruinsSource, 'ruins.js'], [worldSource, 'world.js']);
  const ruins = home.createRuins({ getDayKey: () => '2026-07-18' });
  const state = { cwd: '/ruins', inventory: [], unlocked: [], discovered: [] };
  const world = home.createWorld({
    normalizeCommand,
    getCwd: () => state.cwd,
    getInventory: () => state.inventory,
    getUnlocked: () => state.unlocked,
    getDiscovered: () => state.discovered,
    onDiscoverRoom: (path) => { state.discovered = [...new Set([...state.discovered, path])]; },
    roomExtensions: [ruins.roomExtension]
  });

  assert.deepEqual(Array.from(world.listRooms()), [
    '/', '/routes', '/lab', '/notes', '/system', '/vault', '/core', '/atlas', '/ruins'
  ]);
  assert.equal(world.getRoom('/ruins').objects.buluntu, ruins.roomExtension.room.objects.buluntu);
  assert.equal(world.roomExits('/'), 'ROUTES  LAB  NOTES  SYSTEM  VAULT*  RUINS');
  assert.equal(world.roomPanel('/ruins'), [
    '] /CONVIVIUM/RUINS',
    '',
    '  SINYAL ARKEOLOJISI  ::  GEZGIN',
    '  Sinyal Arkeolojisi. Kurmaca arsivin tozu altinda uc dijital kalinti var: terminal, todo, ekran. Bugunun yuzey sinyali: arcade-recovery.scr.',
    '',
    '  INCELE  terminal  todo  ekran  buluntu',
    '  GIT     /  ROUTES  LAB  NOTES  SYSTEM  VAULT*    (* kilitli)',
    '  CANTA   (bos)',
    "  GOREV   notes esigine git, 'clue' incele, shard'i al",
    ']'
  ].join('\n'));
});

test('VFS mounts Ruins files and documents without changing personal storage semantics', () => {
  const home = loadModules([ruinsSource, 'ruins.js'], [vfsSource, 'vfs.js']);
  const ruins = home.createRuins({ getDayKey: () => '2026-07-18' });
  const storage = new Map();
  const cwdChanges = [];
  const vfs = home.createVfs({
    normalizeCommand,
    storage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value))
    },
    getAudioEnabled: () => false,
    getRoom: (path) => path === '/ruins' ? ruins.roomExtension.room : path === '/' ? {} : null,
    isRoomUnlocked: () => true,
    onCwdChange: (path) => cwdChanges.push(path),
    onDiscoverRoom: () => {},
    renderRoom: (path) => `ROOM:${path}`,
    mounts: [ruins.vfsMount]
  });

  assert.equal(vfs.ls('/'), [
    '/:',
    '  routes',
    '  lab',
    '  notes',
    '  system',
    '  vault',
    '  home',
    '  ruins'
  ].join('\n'));
  assert.equal(vfs.ls('ruins'), [
    '/ruins:',
    '  bbs-1997.log',
    '  todo-fragment.txt',
    '  arcade-recovery.scr'
  ].join('\n'));
  assert.equal(vfs.cd('ruins'), 'ROOM:/ruins');
  assert.deepEqual(cwdChanges, ['/ruins']);
  assert.equal(vfs.cat('arcade-recovery.scr'), expectedArtifacts[2].body);
  assert.equal(vfs.writeFile('kaz-notu.txt', 'bulundu'), 'yazildi: /home/kaz-notu.txt (7 karakter)');
  assert.equal(vfs.readFile('kaz-notu.txt'), 'bulundu');
});

test('Ruins factory rejects a missing day provider and keeps orchestration ownership outside', () => {
  const { home } = createRuinsFixture();
  assert.throws(() => home.createRuins(), /getDayKey/);
  assert.doesNotMatch(ruinsSource, /localStorage|ConviviumBackend|document\.|fetch\(/);
  assert.doesNotMatch(worldSource, /CONVIVIUM RELAY|RECOVERED SCREEN|kurtarilan parca/);
  assert.doesNotMatch(vfsSource, /CONVIVIUM RELAY|RECOVERED SCREEN|kurtarilan parca/);
  assert.match(protocolSource, /createRuins/);
  assert.match(protocolSource, /roomExtensions:/);
  assert.match(protocolSource, /mounts:/);
});

test('Optional VFS mounts cannot override core public documents', () => {
  const home = loadModules([vfsSource, 'vfs.js']);
  const vfs = home.createVfs({
    normalizeCommand,
    storage: { getItem: () => null, setItem: () => {} },
    getAudioEnabled: () => false,
    getRoom: () => null,
    isRoomUnlocked: () => true,
    onCwdChange: () => {},
    onDiscoverRoom: () => {},
    renderRoom: () => '',
    mounts: [{ path: '/extension', files: ['about'], documents: { about: 'override' } }]
  });

  assert.equal(
    vfs.cat('about'),
    'Convivium: public deneysel terminal alanı. Route, oyun, oracle ve not katmanları browser içinde çalışır.'
  );
});
