(() => {
  'use strict';

  const root = window.ConviviumHome = window.ConviviumHome || {};

  function createWorldActions({
    normalizeCommand,
    resolvePath,
    getCurrentRoom,
    getRoom,
    getInventory,
    getUnlocked,
    setInventory,
    setUnlocked,
    appendTrail,
    persist,
    scheduleWorldSave,
    awardAccess,
    refreshAccess,
    playUnlockAudio,
    awardShards,
    prodosPath,
    rankTitle,
    currentObjective
  } = {}) {
    const functions = {
      normalizeCommand,
      resolvePath,
      getCurrentRoom,
      getRoom,
      getInventory,
      getUnlocked,
      setInventory,
      setUnlocked,
      appendTrail,
      persist,
      scheduleWorldSave,
      awardAccess,
      refreshAccess,
      playUnlockAudio,
      awardShards,
      prodosPath,
      rankTitle,
      currentObjective
    };
    const missing = Object.entries(functions)
      .filter(([, value]) => typeof value !== 'function')
      .map(([name]) => name);
    if (missing.length) {
      throw new TypeError(`createWorldActions: zorunlu fonksiyonlar eksik: ${missing.join(', ')}`);
    }

    const inventory = () => {
      const value = getInventory();
      return Array.isArray(value) ? value : [];
    };
    const unlockedRooms = () => {
      const value = getUnlocked();
      return Array.isArray(value) ? value : [];
    };

    const take = (target = '') => {
      const room = getCurrentRoom();
      if (!target.trim()) return 'take: usage take <nesne>';
      const grant = room?.grants;
      const wanted = normalizeCommand(target);
      if (grant && normalizeCommand(grant.item) === wanted) {
        if (inventory().includes(grant.item)) return `take: ${grant.item} zaten cantanda.`;
        setInventory([...new Set([...inventory(), grant.item])]);
        appendTrail(`take:${grant.item}`);
        persist();
        scheduleWorldSave();
        playUnlockAudio();
        awardShards(3, `take ${grant.item}`);
        return `aldin: ${grant.item}. (+3 shard — inventory ile bak, sonra muhuru ac)`;
      }
      return `take: "${target}" burada alinabilir degil.`;
    };

    const unlockCeremony = (path, roomName) => {
      const unlocked = new Set(unlockedRooms());
      const both = unlocked.has('/vault') && unlocked.has('/core');
      const lines = [
        '] MUHUR COZULDU',
        '',
        `  ${prodosPath(path)} acildi.`,
        `  unvan: ${rankTitle()}`,
        ''
      ];
      if (path === '/atlas') {
        lines.push('  Tum izler tamam. Artik bir ARCHITECT\'sin.');
        lines.push('  cd atlas ile son odayi gor.');
      } else if (both) {
        lines.push('  Iki iz de tamamlandi (KEEPER).');
        lines.push(`  son iz: ${currentObjective()}`);
      } else {
        lines.push(`  simdi: cd ${roomName}`);
        lines.push(`  sonraki: ${currentObjective()}`);
      }
      lines.push(']');
      return lines.join('\n');
    };

    const unlock = (arg = '') => {
      const parts = normalizeCommand(arg)
        .replace(/\b(with|ile|kullan|kullanarak)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean);
      const roomName = parts[0];
      if (!roomName) return 'unlock: usage unlock <oda> [with <anahtar>]';
      const path = resolvePath(roomName);
      const room = getRoom(path);
      if (!room) return `unlock: ${roomName}: boyle bir esik yok.`;
      if (!room.locked) return `unlock: ${path} zaten acik.`;
      if (unlockedRooms().includes(path)) return `unlock: ${path} zaten cozuldu.`;
      const needed = room.key;
      if (!inventory().includes(needed)) {
        return `unlock: ${path} icin "${needed}" gerekiyor. Once onu bul ve take et.`;
      }
      const providedKey = parts[1];
      if (providedKey && normalizeCommand(providedKey) !== normalizeCommand(needed)) {
        return `unlock: "${providedKey}" bu muhru acmiyor.`;
      }
      setUnlocked([...new Set([...unlockedRooms(), path])]);
      appendTrail(`unlock:${path}`);
      persist();
      scheduleWorldSave();
      awardAccess(3);
      refreshAccess();
      playUnlockAudio();
      awardShards(5, `unlock ${path}`);
      return unlockCeremony(path, roomName);
    };

    const use = (arg = '') => {
      const normalized = normalizeCommand(arg);
      if (!normalized) return 'use: usage use <nesne> on <hedef>';
      const parts = normalized.split(/\s+(?:on|uzerine|ustune|ile|to)\s+/);
      const item = (parts[0] || '').trim();
      const target = (parts[1] || '').trim();
      if (!item) return 'use: usage use <nesne> on <hedef>';
      if (!inventory().includes(item)) return `use: "${item}" cantanda yok. inventory ile bak.`;
      if (!target) return `use: ${item} neyin uzerinde? (use ${item} on <hedef>)`;
      if (item === 'shard' && /vault|kasa/.test(target)) {
        return unlock(`vault with ${item}`);
      }
      if ((item === 'shard' && /coolant/.test(target)) || (item === 'coolant' && /shard/.test(target))) {
        const items = inventory();
        if (!items.includes('shard') || !items.includes('coolant')) {
          return 'use: prizma icin hem shard hem coolant gerekiyor (iki izi de bitir).';
        }
        if (items.includes('prism')) return 'use: prizmayi zaten doktun. (unlock atlas)';
        setInventory([...new Set([...items, 'prism'])]);
        appendTrail('forge:prism');
        persist();
        scheduleWorldSave();
        playUnlockAudio();
        return 'shard ve coolant birlesti -> prism doktun. simdi: unlock atlas';
      }
      return `use: ${item}, ${target} uzerinde bir ise yaramiyor.`;
    };

    return Object.freeze({ take, unlock, use });
  }

  root.createWorldActions = createWorldActions;
})();
