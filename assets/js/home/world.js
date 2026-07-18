(() => {
  'use strict';

  const root = window.ConviviumHome = window.ConviviumHome || {};

  const deepFreeze = (value) => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };

  const ROOMS = deepFreeze({
    '/': {
      look: 'Convivium ana hattindasin. Dort esik soluk soluk yaniyor: routes, lab, notes, system. Zeminde tek bir cizik isaret var.',
      objects: {
        'isaret': 'Zemindeki cizik bir glyph. Dikkatle bakinca dort esigin ortak bir merkeze baktigini gosteriyor. Merkez muhurlu: /vault.',
        'glyph': 'Ayni cizik. /vault adli muhurlu bir duguma isaret ediyor. Onu acan sey notlarin arasinda saklı.'
      }
    },
    '/routes': {
      look: 'Rotalar esigi. Public sayfalara acilan kapilar burada dizili: home, map, archive, dossier.',
      objects: {
        'dossier': 'Yarisi acik bir dosya. Erisim seviyen yukseldikce daha fazla satir okunuyor.'
      }
    },
    '/lab': {
      look: 'Lab esigi. Oynanabilir deneyler ve companion ritleri burada calisir. Bir kosede pipe reaktoru, yaninda tozlu bir arcade kabini bekliyor.',
      objects: {
        'reactor': 'Pipe reaktoru bekleme modunda. "pipe" yazip coolant hattini cekirdege ulastiran birine /core mühru acilir.',
        'pipe': 'Reaktorun kontrol paneli. pipe komutu ile coolant bulmacasini baslat; cozersen cekirdek (/core) erisilir olur.',
        'cabinet': "1986 yapimi bir OUT RUN kabini. Anahtar uzerinde. \"outrun\" yaz, kontagi cevir, sahili tuttur.",
        'arcade': "Tozlu arcade kabini: OUT RUN '86. \"outrun\" komutu motoru calistirir."
      }
    },
    '/notes': {
      look: 'Saha notlari esigi. Alintilar, ritueller ve yarim birakilmis izler. Bir kosede sicacik parlayan bir clue var.',
      objects: {
        'clues': 'Notlarin arasinda kucuk, sicak bir parca: bir shard. Almak icin: take shard.',
        'ritual': 'Tekrarlanan kucuk bir jest. Her tekrar bir ritmi pekistirir.'
      },
      grants: { item: 'shard' }
    },
    '/system': {
      look: 'Sistem esigi. whoami, uptime, memory, power. Soguk ve duzenli.',
      objects: {
        'memory': 'Bellek haritasi. 0400: companion bus satiri yeni acilmis gibi titreseyor.'
      }
    },
    '/vault': {
      look: 'Kasa. Muhur cozuldu. Iceride tek satir var: "Arayuz, dusunme bicimini degistiren kucuk bir sistemdir." Convivium burada baslar.',
      locked: true,
      key: 'shard',
      objects: {
        'satir': 'Kurucu cumle. Ilk iz tamamlandi; terminal bunu hatirlayacak.'
      }
    },
    '/core': {
      look: 'Cekirdek. Coolant hatti kilitlendi, sicaklik dustu. Burasi sitenin nabzi: her deney, her route buradan beslenir. Duvarda bir gunluk asili.',
      locked: true,
      key: 'coolant',
      objects: {
        'cekirdek': 'Soguyan cekirdek. Reaktoru sen soguttun; ikinci iz tamamlandi.',
        'gunluk': 'Gunluk: "Bir sistemi anlamak, onu soguk tutabilmektir." Notun altinda: "shard ile coolant bir araya gelince yol acilir."'
      }
    },
    '/atlas': {
      look: 'Atlas. Convivium\'un gizli haritasi: tum esikler, tum izler tek bir desende. Burayi yalnizca iki izi de tamamlayip prizmayi doku biri gorur.',
      locked: true,
      key: 'prism',
      objects: {
        'harita': 'Butun rotalarin ortak deseni. Artik kabugu sen de okuyabiliyorsun.',
        'imza': 'Kosede tek satir: "Burayi gormus biri artik bir ARCHITECT\'tir. Convivium senin de evindir."'
      }
    }
  });

  const ROOM_TITLES = Object.freeze({
    '/': 'Ana Hat',
    '/routes': 'Rotalar',
    '/lab': 'Laboratuvar',
    '/notes': 'Saha Notlari',
    '/system': 'Sistem',
    '/vault': 'Kasa',
    '/core': 'Cekirdek',
    '/atlas': 'Atlas'
  });

  const ROOM_ORDER = Object.freeze(['/', '/routes', '/lab', '/notes', '/system', '/vault', '/core', '/atlas']);

  function createWorld({
    normalizeCommand,
    getCwd,
    getInventory,
    getUnlocked,
    getDiscovered,
    onDiscoverRoom,
    roomExtensions = []
  } = {}) {
    const functions = {
      normalizeCommand,
      getCwd,
      getInventory,
      getUnlocked,
      getDiscovered,
      onDiscoverRoom
    };
    const missing = Object.entries(functions)
      .filter(([, value]) => typeof value !== 'function')
      .map(([name]) => name);
    if (missing.length) {
      throw new TypeError(`createWorld: zorunlu fonksiyonlar eksik: ${missing.join(', ')}`);
    }

    const rooms = { ...ROOMS };
    const roomTitles = { ...ROOM_TITLES };
    const roomOrder = [...ROOM_ORDER];
    if (Array.isArray(roomExtensions)) {
      roomExtensions.forEach((extension) => {
        const path = typeof extension?.path === 'string' ? extension.path : '';
        const title = typeof extension?.title === 'string' ? extension.title.trim() : '';
        const room = extension?.room;
        if (!/^\/[a-z0-9-]+$/.test(path) || rooms[path] || !title || !room || typeof room !== 'object') {
          return;
        }
        rooms[path] = room;
        roomTitles[path] = title;
        roomOrder.push(path);
      });
    }
    deepFreeze(rooms);
    Object.freeze(roomTitles);
    Object.freeze(roomOrder);

    const inventory = () => {
      const value = getInventory();
      return Array.isArray(value) ? value : [];
    };
    const unlockedRooms = () => {
      const value = getUnlocked();
      return Array.isArray(value) ? value : [];
    };
    const discoveredRooms = () => {
      const value = getDiscovered();
      return Array.isArray(value) ? value : [];
    };

    const listRooms = () => [...roomOrder];
    const getRoom = (path) => rooms[path] || null;
    const getCurrentRoom = () => getRoom(getCwd());

    const roomExits = (path) => {
      const unlocked = new Set(unlockedRooms());
      const bothThreads = unlocked.has('/vault') && unlocked.has('/core');
      const parts = [];
      roomOrder.forEach((roomPath) => {
        if (roomPath === path) return;
        if (roomPath === '/core' && !unlocked.has('/core')) return;
        if (roomPath === '/atlas' && !bothThreads && !unlocked.has('/atlas')) return;
        const name = (roomPath === '/' ? '/' : roomPath.replace(/^\//, '')).toUpperCase();
        const locked = rooms[roomPath]?.locked && !unlocked.has(roomPath);
        parts.push(locked ? `${name}*` : name);
      });
      return parts.join('  ');
    };

    const currentObjective = () => {
      const inv = new Set(inventory());
      const unlocked = new Set(unlockedRooms());
      if (!unlocked.has('/vault')) {
        if (!inv.has('shard')) return "notes esigine git, 'clue' incele, shard'i al";
        return 'unlock vault ile kasayi ac, sonra cd vault';
      }
      if (!unlocked.has('/core')) return 'lab esigine git, pipe bulmacasini coz (-> /core acilir)';
      if (!unlocked.has('/atlas')) {
        if (!inv.has('prism')) return "shard'i coolant ile birlestir: use shard on coolant";
        return 'unlock atlas ile son odayi ac, sonra cd atlas';
      }
      return 'her sey tamam, ARCHITECT · wall ile iz birak, daily ile gunun sinyali';
    };

    const rankTitle = () => {
      const unlocked = new Set(unlockedRooms());
      if (unlocked.has('/atlas')) return 'ARCHITECT';
      const done = (unlocked.has('/vault') ? 1 : 0) + (unlocked.has('/core') ? 1 : 0);
      return done >= 2 ? 'KEEPER' : done === 1 ? 'INITIATE' : 'GEZGIN';
    };

    const prodosPath = (path) => path === '/' ? '/CONVIVIUM' : `/CONVIVIUM${path.toUpperCase()}`;
    const padField = (label) => (`${label}        `).slice(0, 8);

    const roomPanel = (path) => {
      const room = getRoom(path);
      if (!room) return `?NO SUCH VOLUME: ${path}`;
      const title = (roomTitles[path] || path).toUpperCase();
      const objects = Object.keys(room.objects || {});
      const inv = inventory();
      const exits = roomExits(path);
      const lockHint = exits.includes('*') ? '    (* kilitli)' : '';
      const lines = [];
      lines.push(`] ${prodosPath(path)}`);
      lines.push('');
      lines.push(`  ${title}  ::  ${rankTitle()}`);
      lines.push(`  ${room.look}`);
      lines.push('');
      if (objects.length) lines.push(`  ${padField('INCELE')}${objects.join('  ')}`);
      lines.push(`  ${padField('GIT')}${exits}${lockHint}`);
      lines.push(`  ${padField('CANTA')}${inv.length ? inv.join('  ') : '(bos)'}`);
      lines.push(`  ${padField('GOREV')}${currentObjective()}`);
      lines.push(']');
      return lines.join('\n');
    };

    const roomObjectKey = (room, target) => {
      const query = normalizeCommand(target);
      if (!room || !room.objects || !query) return null;
      return Object.keys(room.objects).find((key) => {
        const normalized = normalizeCommand(key);
        return normalized === query || normalized.includes(query) || query.includes(normalized);
      }) || null;
    };

    const examine = (target = '') => {
      const room = getCurrentRoom();
      if (!room) return 'examine: burada inceleyecek bir sey yok.';
      if (!target.trim()) return 'examine: usage examine <nesne> (once look yaz).';
      const key = roomObjectKey(room, target);
      if (!key) return `examine: "${target}" burada yok. look ile etrafa bak.`;
      return room.objects[key];
    };

    const look = (target = '') => {
      const cwd = getCwd();
      const room = getRoom(cwd);
      if (!room) return `look: ${cwd}: bu esikte gorulecek bir sey yok.`;
      if (target.trim()) return examine(target);
      if (!discoveredRooms().includes(cwd)) onDiscoverRoom(cwd);
      return roomPanel(cwd);
    };

    return Object.freeze({
      listRooms,
      getRoom,
      getCurrentRoom,
      roomExits,
      currentObjective,
      rankTitle,
      prodosPath,
      roomPanel,
      look,
      examine
    });
  }

  root.createWorld = createWorld;
})();
