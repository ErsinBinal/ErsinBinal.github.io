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
  let unlocked = false;
  const vfs = home.createVfs({
    normalizeCommand,
    loadHomeFiles: () => ({}),
    readHomeFile: () => null,
    maxHomeFiles: 24,
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
  const { vfs } = createFixture({
    loadHomeFiles: () => ({ ...files }),
    readHomeFile: (name) => Object.prototype.hasOwnProperty.call(files, name) ? files[name] : null,
    getAudioEnabled: () => true
  });

  assert.equal(vfs.ls(), [
    '/:',
    '  routes',
    '  lab',
    '  notes',
    '  system',
    '  vault',
    '  home'
  ].join('\n'));
  assert.equal(vfs.ls('home'), [
    '/home: 3/24 dosya',
    '  a.txt  (0b)',
    '  note.md  (7b)',
    '  z.log  (3b)'
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
    loadHomeFiles: () => ({}),
    readHomeFile: () => null,
    maxHomeFiles: 24,
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
});

test('VFS factory rejects incomplete orchestration dependencies', () => {
  const home = loadHomeModules();
  assert.throws(
    () => home.createVfs({ normalizeCommand }),
    /loadHomeFiles, readHomeFile, getAudioEnabled, getRoom, isRoomUnlocked, onCwdChange, onDiscoverRoom, renderRoom/
  );
});
