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

  const FILE_STORAGE_KEY = 'convivium.shell.files';
  const MAX_FILES = 24;
  const MAX_FILE_NAME = 32;
  const MAX_FILE_CONTENT = 4000;

  function createVfs({
    normalizeCommand,
    storage,
    getAudioEnabled,
    getRoom,
    isRoomUnlocked,
    onCwdChange,
    onDiscoverRoom,
    renderRoom
  } = {}) {
    const missing = [];
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
      missing.push('storage');
    }
    const functions = {
      normalizeCommand,
      getAudioEnabled,
      getRoom,
      isRoomUnlocked,
      onCwdChange,
      onDiscoverRoom,
      renderRoom
    };
    missing.push(...Object.entries(functions)
      .filter(([, value]) => typeof value !== 'function')
      .map(([name]) => name));
    if (missing.length) {
      throw new TypeError(`createVfs: zorunlu fonksiyonlar eksik: ${missing.join(', ')}`);
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

    const loadFiles = () => {
      try {
        const raw = JSON.parse(storage.getItem(FILE_STORAGE_KEY) || '{}');
        return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
      } catch {
        return {};
      }
    };

    const saveFiles = (files) => {
      try {
        storage.setItem(FILE_STORAGE_KEY, JSON.stringify(files));
      } catch {
        // Storage kapali veya doluysa terminal best-effort calismaya devam eder.
      }
    };

    const normalizeFileName = (input = '') => {
      const cleaned = String(input).toLowerCase().trim()
        .replace(/^\/?(home\/)?/, '')
        .replace(/[ıİ]/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
        .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
      if (!cleaned || cleaned.length > MAX_FILE_NAME) return null;
      return cleaned;
    };

    const listFiles = () => Object.keys(loadFiles()).sort();

    const readFile = (name) => {
      const key = normalizeFileName(name);
      if (!key) return null;
      const files = loadFiles();
      return Object.prototype.hasOwnProperty.call(files, key) ? files[key] : null;
    };

    const writeFile = (name, content, append = false) => {
      const key = normalizeFileName(name);
      if (!key) {
        return `yaz: gecersiz dosya adi (kucuk harf, rakam, tire; en cok ${MAX_FILE_NAME} karakter).`;
      }
      const files = loadFiles();
      const exists = Object.prototype.hasOwnProperty.call(files, key);
      if (!exists && Object.keys(files).length >= MAX_FILES) {
        return `yaz: /home dolu (en cok ${MAX_FILES} dosya). "rm <ad>" ile yer ac.`;
      }
      const body = (append && exists ? files[key] + '\n' : '') + String(content ?? '');
      if (body.length > MAX_FILE_CONTENT) {
        return `yaz: dosya cok buyuk (tavan ${MAX_FILE_CONTENT} karakter).`;
      }
      files[key] = body;
      saveFiles(files);
      return `${append && exists ? 'eklendi' : 'yazildi'}: /home/${key} (${body.length} karakter)`;
    };

    const removeFile = (name) => {
      const key = normalizeFileName(name);
      const files = loadFiles();
      if (!key || !Object.prototype.hasOwnProperty.call(files, key)) {
        return `rm: ${name || '?'}: /home altinda boyle bir dosya yok`;
      }
      delete files[key];
      saveFiles(files);
      return `silindi: /home/${key}`;
    };

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
        const files = loadFiles();
        const names = Object.keys(files).sort();
        if (!names.length) return '/home: (bos) — "echo merhaba > not.txt" ile ilk dosyani yaz.';
        return [
          `/home: ${names.length}/${MAX_FILES} dosya`,
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
      const file = readFile(target);
      if (file !== null) return file === '' ? '(bos dosya)' : file;
      const key = normalizeCommand(target || 'about');
      return virtualDocs[key] || `cat: ${target || 'empty'}: public document not found`;
    };

    return Object.freeze({
      getCwd,
      hasDirectory,
      restoreCwd,
      resolvePath,
      normalizeFileName,
      listFiles,
      readFile,
      writeFile,
      removeFile,
      ls,
      cd,
      cat
    });
  }

  root.createVfs = createVfs;
})();
