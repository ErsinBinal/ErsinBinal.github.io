import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const worldSource = await readFile(
  new URL('../../assets/js/home/world.js', import.meta.url),
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

function loadWorldFactory() {
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(worldSource, context, { filename: 'world.js' });
  return context.window.ConviviumHome.createWorld;
}

function createFixture() {
  const state = {
    cwd: '/',
    inventory: [],
    unlocked: [],
    discovered: []
  };
  const discoveries = [];
  const createWorld = loadWorldFactory();
  const world = createWorld({
    normalizeCommand,
    getCwd: () => state.cwd,
    getInventory: () => state.inventory,
    getUnlocked: () => state.unlocked,
    getDiscovered: () => state.discovered,
    onDiscoverRoom: (path) => {
      discoveries.push(path);
      state.discovered = [...new Set([...state.discovered, path])];
    }
  });
  return { createWorld, world, state, discoveries };
}

test('World registry preserves every room, lock, grant and object description', () => {
  const { world } = createFixture();
  const paths = Array.from(world.listRooms());
  assert.deepEqual(paths, ['/', '/routes', '/lab', '/notes', '/system', '/vault', '/core', '/atlas']);
  assert.equal(Object.isFrozen(world.getRoom('/notes')), true);
  assert.equal(Object.isFrozen(world.getRoom('/notes').objects), true);
  assert.equal(world.getRoom('/missing'), null);

  const snapshot = Object.fromEntries(paths.map((path) => [path, world.getRoom(path)]));
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), {
    '/': {
      look: 'Convivium ana hattindasin. Dort esik soluk soluk yaniyor: routes, lab, notes, system. Zeminde tek bir cizik isaret var.',
      objects: {
        isaret: 'Zemindeki cizik bir glyph. Dikkatle bakinca dort esigin ortak bir merkeze baktigini gosteriyor. Merkez muhurlu: /vault.',
        glyph: 'Ayni cizik. /vault adli muhurlu bir duguma isaret ediyor. Onu acan sey notlarin arasinda saklı.'
      }
    },
    '/routes': {
      look: 'Rotalar esigi. Public sayfalara acilan kapilar burada dizili: home, map, archive, dossier.',
      objects: {
        dossier: 'Yarisi acik bir dosya. Erisim seviyen yukseldikce daha fazla satir okunuyor.'
      }
    },
    '/lab': {
      look: 'Lab esigi. Oynanabilir deneyler ve companion ritleri burada calisir. Bir kosede pipe reaktoru, yaninda tozlu bir arcade kabini bekliyor.',
      objects: {
        reactor: 'Pipe reaktoru bekleme modunda. "pipe" yazip coolant hattini cekirdege ulastiran birine /core mühru acilir.',
        pipe: 'Reaktorun kontrol paneli. pipe komutu ile coolant bulmacasini baslat; cozersen cekirdek (/core) erisilir olur.',
        cabinet: '1986 yapimi bir OUT RUN kabini. Anahtar uzerinde. "outrun" yaz, kontagi cevir, sahili tuttur.',
        arcade: 'Tozlu arcade kabini: OUT RUN \'86. "outrun" komutu motoru calistirir.'
      }
    },
    '/notes': {
      look: 'Saha notlari esigi. Alintilar, ritueller ve yarim birakilmis izler. Bir kosede sicacik parlayan bir clue var.',
      objects: {
        clues: 'Notlarin arasinda kucuk, sicak bir parca: bir shard. Almak icin: take shard.',
        ritual: 'Tekrarlanan kucuk bir jest. Her tekrar bir ritmi pekistirir.'
      },
      grants: { item: 'shard' }
    },
    '/system': {
      look: 'Sistem esigi. whoami, uptime, memory, power. Soguk ve duzenli.',
      objects: {
        memory: 'Bellek haritasi. 0400: companion bus satiri yeni acilmis gibi titreseyor.'
      }
    },
    '/vault': {
      look: 'Kasa. Muhur cozuldu. Iceride tek satir var: "Arayuz, dusunme bicimini degistiren kucuk bir sistemdir." Convivium burada baslar.',
      locked: true,
      key: 'shard',
      objects: {
        satir: 'Kurucu cumle. Ilk iz tamamlandi; terminal bunu hatirlayacak.'
      }
    },
    '/core': {
      look: 'Cekirdek. Coolant hatti kilitlendi, sicaklik dustu. Burasi sitenin nabzi: her deney, her route buradan beslenir. Duvarda bir gunluk asili.',
      locked: true,
      key: 'coolant',
      objects: {
        cekirdek: 'Soguyan cekirdek. Reaktoru sen soguttun; ikinci iz tamamlandi.',
        gunluk: 'Gunluk: "Bir sistemi anlamak, onu soguk tutabilmektir." Notun altinda: "shard ile coolant bir araya gelince yol acilir."'
      }
    },
    '/atlas': {
      look: 'Atlas. Convivium\'un gizli haritasi: tum esikler, tum izler tek bir desende. Burayi yalnizca iki izi de tamamlayip prizmayi doku biri gorur.',
      locked: true,
      key: 'prism',
      objects: {
        harita: 'Butun rotalarin ortak deseni. Artik kabugu sen de okuyabiliyorsun.',
        imza: 'Kosede tek satir: "Burayi gormus biri artik bir ARCHITECT\'tir. Convivium senin de evindir."'
      }
    }
  });
});

test('World look and examine preserve panel output, discovery and fuzzy matching', () => {
  const { world, state, discoveries } = createFixture();
  const expected = [
    '] /CONVIVIUM',
    '',
    '  ANA HAT  ::  GEZGIN',
    '  Convivium ana hattindasin. Dort esik soluk soluk yaniyor: routes, lab, notes, system. Zeminde tek bir cizik isaret var.',
    '',
    '  INCELE  isaret  glyph',
    '  GIT     ROUTES  LAB  NOTES  SYSTEM  VAULT*    (* kilitli)',
    '  CANTA   (bos)',
    "  GOREV   notes esigine git, 'clue' incele, shard'i al",
    ']'
  ].join('\n');

  assert.equal(world.look(), expected);
  assert.deepEqual(discoveries, ['/']);
  assert.equal(world.look(), expected);
  assert.deepEqual(discoveries, ['/']);
  assert.equal(
    world.look('glyph'),
    'Ayni cizik. /vault adli muhurlu bir duguma isaret ediyor. Onu acan sey notlarin arasinda saklı.'
  );
  assert.equal(world.examine(), 'examine: usage examine <nesne> (once look yaz).');
  assert.equal(world.examine('olmayan'), 'examine: "olmayan" burada yok. look ile etrafa bak.');

  state.cwd = '/home';
  assert.equal(world.look(), 'look: /home: bu esikte gorulecek bir sey yok.');
  assert.equal(world.examine('not'), 'examine: burada inceleyecek bir sey yok.');
});

test('World read model preserves room exits, rank and objective transitions', () => {
  const { world, state } = createFixture();
  assert.equal(world.rankTitle(), 'GEZGIN');
  assert.equal(world.roomExits('/'), 'ROUTES  LAB  NOTES  SYSTEM  VAULT*');
  assert.equal(world.currentObjective(), "notes esigine git, 'clue' incele, shard'i al");

  state.inventory = ['shard'];
  assert.equal(world.currentObjective(), 'unlock vault ile kasayi ac, sonra cd vault');
  state.unlocked = ['/vault'];
  assert.equal(world.rankTitle(), 'INITIATE');
  assert.equal(world.currentObjective(), 'lab esigine git, pipe bulmacasini coz (-> /core acilir)');
  assert.equal(world.roomExits('/vault'), '/  ROUTES  LAB  NOTES  SYSTEM');

  state.unlocked = ['/vault', '/core'];
  state.inventory = ['shard', 'coolant'];
  assert.equal(world.rankTitle(), 'KEEPER');
  assert.equal(world.currentObjective(), "shard'i coolant ile birlestir: use shard on coolant");
  assert.equal(world.roomExits('/core'), '/  ROUTES  LAB  NOTES  SYSTEM  VAULT  ATLAS*');

  state.inventory.push('prism');
  assert.equal(world.currentObjective(), 'unlock atlas ile son odayi ac, sonra cd atlas');
  state.unlocked.push('/atlas');
  assert.equal(world.rankTitle(), 'ARCHITECT');
  assert.equal(world.currentObjective(), 'her sey tamam, ARCHITECT · wall ile iz birak, daily ile gunun sinyali');
  assert.equal(world.prodosPath('/notes'), '/CONVIVIUM/NOTES');
});

test('World factory rejects every incomplete orchestration dependency', () => {
  const { createWorld } = createFixture();
  assert.throws(
    () => createWorld({ normalizeCommand }),
    /getCwd, getInventory, getUnlocked, getDiscovered, onDiscoverRoom/
  );
});

test('Home protocol delegates world read ownership while retaining mutation wrappers', () => {
  assert.doesNotMatch(protocolSource, /const\s+worldRooms\s*=/);
  assert.doesNotMatch(protocolSource, /Convivium ana hattindasin/);
  assert.match(protocolSource, /createWorld/);
  assert.match(protocolSource, /worldMod\?\.look/);
  assert.match(protocolSource, /worldMod\?\.examine/);
  assert.match(protocolSource, /worldMod\?\.getRoom/);
  assert.match(protocolSource, /const\s+takeCommand\s*=/);
  assert.match(protocolSource, /const\s+unlockRoomCommand\s*=/);
  assert.match(protocolSource, /const\s+useCommand\s*=/);
});
