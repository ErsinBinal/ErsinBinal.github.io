(() => {
  'use strict';

  const root = window.ConviviumHome = window.ConviviumHome || {};

  const VIRTUAL_FS = Object.freeze({
    '/': Object.freeze(['routes', 'lab', 'notes', 'system', 'vault', 'home']),
    '/routes': Object.freeze(['home', 'map', 'archive', 'notes', 'open dossier']),
    '/lab': Object.freeze(['run logic', 'run signal', 'run ash', 'run flow', 'pipe', 'outrun']),
    '/notes': Object.freeze(['quote', 'note', 'ritual', 'manifest', 'clues']),
    '/system': Object.freeze(['whoami', 'uptime', 'version', 'memory', 'ps', 'shutdown', 'restart', 'screen saver']),
    '/vault': Object.freeze(['satir']),
    '/core': Object.freeze(['cekirdek', 'gunluk']),
    '/atlas': Object.freeze(['harita', 'imza']),
    '/home': Object.freeze([])
  });

  function createVfs({
    normalizeCommand,
    loadHomeFiles,
    readHomeFile,
    maxHomeFiles,
    getAudioEnabled,
    getRoom,
    isRoomUnlocked,
    onCwdChange,
    onDiscoverRoom,
    renderRoom
  } = {}) {
    const functions = {
      normalizeCommand,
      loadHomeFiles,
      readHomeFile,
      getAudioEnabled,
      getRoom,
      isRoomUnlocked,
      onCwdChange,
      onDiscoverRoom,
      renderRoom
    };
    const missing = Object.entries(functions)
      .filter(([, value]) => typeof value !== 'function')
      .map(([name]) => name);
    if (missing.length) {
      throw new TypeError(`createVfs: zorunlu fonksiyonlar eksik: ${missing.join(', ')}`);
    }
    if (!Number.isFinite(maxHomeFiles) || maxHomeFiles < 1) {
      throw new TypeError('createVfs: maxHomeFiles pozitif bir sayi olmali');
    }

    let cwd = '/';
    const virtualDocs = Object.freeze({
      about: 'Convivium: public deneysel terminal alanı. Route, oyun, oracle ve not katmanları browser içinde çalışır.',
      system: 'system: static GitHub Pages shell / Worker üzerinden public oracle / local secrets unavailable.',
      routes: 'routes: home, map, archive, notes, open dossier, lab komutları.',
      lab: 'lab: logic, signal, ash, flow, pipe ve companion deneyleri.',
      audio: `audio: ${getAudioEnabled() ? 'on' : 'off'} / preference persisted locally.`
    });

    const getCwd = () => cwd;
    const hasDirectory = (path) => Object.prototype.hasOwnProperty.call(VIRTUAL_FS, path);

    const restoreCwd = (path) => {
      if (!hasDirectory(path)) return false;
      cwd = path;
      return true;
    };

    const resolvePath = (target = '') => {
      const normalized = normalizeCommand(target).replace(/\s+/g, '-');
      if (!normalized || normalized === '/') return '/';
      if (normalized === '..') return cwd.split('/').slice(0, -1).join('/') || '/';
      const path = (normalized.startsWith('/')
        ? normalized
        : `${cwd === '/' ? '' : cwd}/${normalized}`
      ).replace(/\/+/g, '/');
      if (!hasDirectory(path) && hasDirectory(`/${normalized}`)) return `/${normalized}`;
      return path;
    };

    const ls = (target = '') => {
      const path = resolvePath(target);
      const items = VIRTUAL_FS[path];
      if (!items) return `ls: ${path}: not found`;
      if (path === '/home') {
        const files = loadHomeFiles();
        const names = Object.keys(files).sort();
        if (!names.length) return '/home: (bos) — "echo merhaba > not.txt" ile ilk dosyani yaz.';
        return [
          `/home: ${names.length}/${maxHomeFiles} dosya`,
          ...names.map((name) => `  ${name}  (${files[name].length}b)`)
        ].join('\n');
      }
      return [`${path}:`, ...items.map((item) => `  ${item}`)].join('\n');
    };

    const cd = (target = '/') => {
      const path = resolvePath(target);
      if (!hasDirectory(path)) return `cd: ${path}: no such virtual directory`;
      const room = getRoom(path);
      if (room?.locked && !isRoomUnlocked(path)) {
        return `cd: ${path}: muhurlu. "unlock ${path.replace(/^\//, '')}" ile ya da dogru anahtarla ac.`;
      }
      cwd = path;
      onCwdChange(path);
      if (room) {
        onDiscoverRoom(path);
        return renderRoom(path);
      }
      return cwd;
    };

    const cat = (target = '') => {
      const file = readHomeFile(target);
      if (file !== null) return file === '' ? '(bos dosya)' : file;
      const key = normalizeCommand(target || 'about');
      return virtualDocs[key] || `cat: ${target || 'empty'}: public document not found`;
    };

    return Object.freeze({
      getCwd,
      hasDirectory,
      restoreCwd,
      resolvePath,
      ls,
      cd,
      cat
    });
  }

  root.createVfs = createVfs;
})();
