import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const vfsSource = await readFile(
  new URL('../../assets/js/home/vfs.js', import.meta.url),
  'utf8'
);
const presenceSource = await readFile(
  new URL('../../assets/js/home/presence.js', import.meta.url),
  'utf8'
);
const chatSource = await readFile(
  new URL('../../assets/js/home/chat.js', import.meta.url),
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

function loadHomeModules({ withConsumers = false } = {}) {
  const storage = new Map();
  const context = vm.createContext({
    window: {},
    location: { pathname: '/' },
    document: {
      getElementById: () => null,
      querySelectorAll: () => []
    },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    },
    sessionStorage: {
      getItem: (key) => storage.get(`session:${key}`) ?? null,
      setItem: (key, value) => storage.set(`session:${key}`, String(value))
    },
    console,
    Date,
    Math
  });
  vm.runInContext(vfsSource, context, { filename: 'vfs.js' });
  if (withConsumers) {
    vm.runInContext(presenceSource, context, { filename: 'presence.js' });
    vm.runInContext(chatSource, context, { filename: 'chat.js' });
  }
  return context.window.ConviviumHome;
}

function createStorage(initial = {}, { failGet = false, failSet = false } = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      if (failGet) throw new Error('storage get blocked');
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (failSet) throw new Error('storage set blocked');
      values.set(key, String(value));
    },
    value(key) { return values.get(key) ?? null; }
  };
}

function createFixture(overrides = {}) {
  const home = loadHomeModules();
  const rooms = {
    '/': { locked: false },
    '/routes': { locked: false },
    '/lab': { locked: false },
    '/notes': { locked: false },
    '/system': { locked: false },
    '/vault': { locked: true },
    '/core': { locked: true },
    '/atlas': { locked: true }
  };
  const cwdChanges = [];
  const discoveries = [];
  const storage = overrides.storage || createStorage();
  let unlocked = false;
  const vfs = home.createVfs({
    normalizeCommand,
    storage,
    getAudioEnabled: () => false,
    getRoom: (path) => rooms[path] || null,
    isRoomUnlocked: () => unlocked,
    onCwdChange: (path) => cwdChanges.push(path),
    onDiscoverRoom: (path) => discoveries.push(path),
    renderRoom: (path) => `ROOM:${path}`,
    ...overrides
  });
  return {
    home,
    vfs,
    storage,
    cwdChanges,
    discoveries,
    unlock: () => { unlocked = true; }
  };
}

test('VFS preserves path resolution, navigation callbacks and locked-room behavior', () => {
  const { vfs, cwdChanges, discoveries, unlock } = createFixture();

  assert.equal(vfs.getCwd(), '/');
  assert.equal(vfs.hasDirectory('/notes'), true);
  assert.equal(vfs.hasDirectory('/missing'), false);
  assert.equal(vfs.resolvePath('notes'), '/notes');
  assert.equal(vfs.cd('notes'), 'ROOM:/notes');
  assert.equal(vfs.getCwd(), '/notes');
  assert.deepEqual(cwdChanges, ['/notes']);
  assert.deepEqual(discoveries, ['/notes']);
  assert.equal(vfs.resolvePath('..'), '/');
  assert.equal(vfs.resolvePath('vault'), '/vault');

  assert.equal(
    vfs.cd('vault'),
    'cd: /vault: muhurlu. "unlock vault" ile ya da dogru anahtarla ac.'
  );
  assert.equal(vfs.getCwd(), '/notes');
  assert.deepEqual(cwdChanges, ['/notes']);

  unlock();
  assert.equal(vfs.cd('vault'), 'ROOM:/vault');
  assert.equal(vfs.getCwd(), '/vault');
  assert.deepEqual(cwdChanges, ['/notes', '/vault']);
  assert.deepEqual(discoveries, ['/notes', '/vault']);

  assert.equal(vfs.cd('missing'), 'cd: /vault/missing: no such virtual directory');
  assert.equal(vfs.restoreCwd('/home'), true);
  assert.equal(vfs.getCwd(), '/home');
  assert.equal(vfs.restoreCwd('/missing'), false);
  assert.equal(vfs.getCwd(), '/home');
});

test('VFS preserves directory, personal file and public document output', () => {
  const files = { 'z.log': '123', 'a.txt': '', 'note.md': 'merhaba' };
  const storage = createStorage({ 'convivium.shell.files': JSON.stringify(files) });
  const { vfs } = createFixture({
    storage,
    getAudioEnabled: () => true
  });

  assert.equal(vfs.ls(), [
    '/:',
    '  routes',
    '  lab',
    '  notes',
    '  system',
    '  vault',
    '  home',
    '  (oku: cat <dosya>)'
  ].join('\n'));
  assert.equal(vfs.ls('home'), [
    '/home: 3/24 dosya',
    '  a.txt  (0b)',
    '  note.md  (7b)',
    '  z.log  (3b)',
    '  (oku: cat <dosya>)'
  ].join('\n'));
  assert.equal(vfs.ls('missing'), 'ls: /missing: not found');
  assert.equal(vfs.cat('a.txt'), '(bos dosya)');
  assert.equal(vfs.cat('note.md'), 'merhaba');
  assert.equal(
    vfs.cat(),
    'Convivium: public deneysel terminal alanı. Route, oyun, oracle ve not katmanları browser içinde çalışır.'
  );
  assert.equal(vfs.cat('audio'), 'audio: on / preference persisted locally.');
  assert.equal(vfs.cat('missing'), 'cat: missing: public document not found');
});

test('Persistent /home engine preserves names, write, append, list and remove output', () => {
  const { vfs, storage } = createFixture();

  assert.equal(vfs.normalizeFileName('/home/Çalışma Notu.TXT'), 'calisma-notu.txt');
  assert.equal(vfs.normalizeFileName('..'), null);
  assert.equal(vfs.normalizeFileName('a'.repeat(33)), null);
  assert.equal(
    vfs.writeFile('Not.TXT', 'ilk'),
    'yazildi: /home/not.txt (3 karakter)'
  );
  assert.equal(vfs.readFile('not.txt'), 'ilk');
  assert.deepEqual(Array.from(vfs.listFiles()), ['not.txt']);
  assert.equal(
    vfs.writeFile('not.txt', 'ikinci', true),
    'eklendi: /home/not.txt (10 karakter)'
  );
  assert.equal(vfs.readFile('/home/not.txt'), 'ilk\nikinci');
  assert.equal(vfs.cat('not.txt'), 'ilk\nikinci');
  assert.equal(vfs.ls('home'), '/home: 1/24 dosya\n  not.txt  (10b)\n  (oku: cat <dosya>)');
  assert.equal(vfs.removeFile('not.txt'), 'silindi: /home/not.txt');
  assert.equal(vfs.readFile('not.txt'), null);
  assert.deepEqual(JSON.parse(storage.value('convivium.shell.files')), {});
  assert.equal(vfs.removeFile('not.txt'), 'rm: not.txt: /home altinda boyle bir dosya yok');
});

test('Persistent /home engine preserves file count and content ceilings', () => {
  const full = Object.fromEntries(
    Array.from({ length: 24 }, (_, index) => [`f${index}`, index === 0 ? 'eski' : ''])
  );
  const storage = createStorage({ 'convivium.shell.files': JSON.stringify(full) });
  const { vfs } = createFixture({ storage });

  assert.equal(
    vfs.writeFile('yeni', 'x'),
    'yaz: /home dolu (en cok 24 dosya). "rm <ad>" ile yer ac.'
  );
  assert.equal(vfs.writeFile('f0', 'guncel'), 'yazildi: /home/f0 (6 karakter)');
  assert.equal(vfs.readFile('f0'), 'guncel');
  assert.equal(
    vfs.writeFile('f0', 'x'.repeat(4001)),
    'yaz: dosya cok buyuk (tavan 4000 karakter).'
  );
  assert.equal(vfs.readFile('f0'), 'guncel');
  assert.equal(
    vfs.writeFile('?', 'x'),
    'yaz: gecersiz dosya adi (kucuk harf, rakam, tire; en cok 32 karakter).'
  );
});

test('Persistent /home storage remains best-effort when data is corrupt or blocked', () => {
  const corrupt = createStorage({ 'convivium.shell.files': '["array-degil"]' });
  const corruptVfs = createFixture({ storage: corrupt }).vfs;
  assert.deepEqual(Array.from(corruptVfs.listFiles()), []);

  const blockedReadVfs = createFixture({ storage: createStorage({}, { failGet: true }) }).vfs;
  assert.deepEqual(Array.from(blockedReadVfs.listFiles()), []);
  assert.equal(blockedReadVfs.readFile('not'), null);

  const blockedWrite = createStorage({}, { failSet: true });
  const blockedWriteVfs = createFixture({ storage: blockedWrite }).vfs;
  assert.equal(blockedWriteVfs.writeFile('not', 'metin'), 'yazildi: /home/not (5 karakter)');
  assert.equal(blockedWriteVfs.readFile('not'), null);
  blockedWrite.setItem = () => { throw new Error('storage set blocked'); };
  assert.equal(blockedWriteVfs.removeFile('not'), 'rm: not: /home altinda boyle bir dosya yok');
});

test('Presence sync and chat payload consume the same live VFS room', () => {
  const home = loadHomeModules({ withConsumers: true });
  const tracked = [];
  const sent = [];
  const channels = {
    'presence:site': {
      on() { return this; },
      subscribe(callback) { callback('SUBSCRIBED'); return this; },
      track(payload) { tracked.push({ ...payload }); },
      presenceState() { return {}; }
    },
    'chat:site': {
      on() { return this; },
      subscribe(callback) { callback('SUBSCRIBED'); return this; },
      send(message) { sent.push(message); }
    }
  };
  const client = { channel: (name) => channels[name] };
  let presence;
  const vfs = home.createVfs({
    normalizeCommand,
    storage: createStorage(),
    getAudioEnabled: () => false,
    getRoom: () => null,
    isRoomUnlocked: () => true,
    onCwdChange: () => presence?.sync(),
    onDiscoverRoom: () => {},
    renderRoom: (path) => path
  });
  presence = home.createPresence({
    getClient: () => client,
    getRoom: () => vfs.getCwd()
  });
  assert.equal(presence.start(), true);
  assert.equal(tracked.at(-1).room, '/');

  assert.equal(vfs.cd('lab'), '/lab');
  assert.equal(tracked.at(-1).room, '/lab');

  const chat = home.createChat({
    getClient: () => client,
    getTag: () => presence.tag(),
    getRoom: () => vfs.getCwd()
  });
  chat.open();
  assert.match(chat.say('merhaba'), /sen \/lab > merhaba$/);
  assert.equal(sent.at(-1).payload.room, '/lab');
});

test('Home protocol wires every live room consumer to the VFS owner', () => {
  assert.doesNotMatch(protocolSource, /let\s+virtualCwd\s*=/);
  assert.match(protocolSource, /virtualCwd:\s*vfsMod\?\.getCwd\?\.\(\)\s*\|\|\s*'\/'/);
  assert.match(protocolSource, /if\s*\(prefs\.virtualCwd\)\s*vfsMod\?\.restoreCwd/);
  assert.equal(
    [...protocolSource.matchAll(/getRoom:\s*getVirtualCwd/g)].length,
    3,
    'presence, chat ve chat deck ayni canli CWD getterini kullanmali'
  );
  assert.match(protocolSource, /onCwdChange:[\s\S]*?presenceMod\?\.sync\(\)/);
  assert.doesNotMatch(protocolSource, /const\s+VFS_KEY|const\s+vfsLoad|const\s+vfsSave/);
  assert.match(protocolSource, /storage:\s*\{[\s\S]*?localStorage\.getItem[\s\S]*?localStorage\.setItem/);
  assert.match(protocolSource, /vfsMod\?\.writeFile/);
});

test('VFS factory rejects incomplete orchestration dependencies', () => {
  const home = loadHomeModules();
  assert.throws(
    () => home.createVfs({ normalizeCommand }),
    /storage, getAudioEnabled, getRoom, isRoomUnlocked, onCwdChange, onDiscoverRoom, renderRoom/
  );
});
