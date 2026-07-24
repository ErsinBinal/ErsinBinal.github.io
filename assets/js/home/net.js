/**
 * Convivium - /net "Sinyal Agi" (ag-kesif bulmacasi) - FAZ 1 iskelet
 *
 * scan/connect + sifresiz cihazlarda ls/cd/cat. Bulmaca (sifre/WoL/odul) FAZ 2-3.
 * Deterministik + cevrimdisi (ruins/dream deseni): online durumu zaman-dilimi
 * hash'iyle uretilir. Canli/dekor dugumler o an online kullanici handle'larindan
 * (yetmezse uydurma). TUM icerik kurgusal; gercek kullanici verisi kullanilmaz.
 *
 * createNet({ now, getOnlineHandles }) -> { roomExtension, scan, connect,
 *   disconnect, isConnected, ls, cd, cat, status }
 */
(() => {
  'use strict';
  const root = window.ConviviumHome = window.ConviviumHome || {};

  const BUCKET_MS = 10 * 60 * 1000;   // 10 dk online penceresi
  const hash = (str) => {
    let h = 2166136261 >>> 0;
    const s = String(str);
    for (let i = 0; i < s.length; i += 1) h = (Math.imul(h ^ s.charCodeAt(i), 16777619)) >>> 0;
    return h >>> 0;
  };

  // --- Sabit cihazlar (Faz 1: hepsi sifresiz, gezilebilir dosya agaci) ---
  // tree: string deger = dosya icerigi; nesne = klasor.
  const FIXED_DEVICES = [
    {
      id: 'cvm-relay', ip: '10.13.0.1', mac: '00:CV:M0:00:00:01', host: 'CVM-RELAY',
      kind: 'altyapi', alwaysOn: true, onlineChance: 100,
      tree: {
        'README.txt': [
          'CONVIVIUM RELAY // dugum 00',
          'Bu, agin omurga rolesi. Tarama trafigi buradan gecer.',
          'Ag: 10.13.0.0/16 -- gezginler ve altyapi dugumleri.',
          'Ipucu: nmap ile dugumleri gor, connect <ip> ile bagla.',
          'Not: bazi dugumler kilitli; onlar sonraki katman (yakinda).'
        ].join('\n'),
        'relay.log': [
          '[00:00] role acildi, tasiyici stabil',
          '[--:--] gezginler geliyor ve gidiyor; hepsi kayitli degil',
          '[--:--] bir dugum yanit vermeyi kesti: 10.13.13.66 (???)',
          '[--:--] uyari: bu satiri okuyan biri fazla meraklı.'
        ].join('\n')
      }
    },
    {
      id: 'aura-node', ip: '10.13.0.2', mac: '00:CV:M0:00:00:02', host: 'AURA-NODE',
      kind: 'dugum', alwaysOn: false, onlineChance: 82,
      tree: {
        notlar: {
          'gunluk.txt': [
            'gunluk // aura',
            'terminali cok gec buldum ama tam zamaninda.',
            'her gece ayni ruyayi goruyoruz galiba. dream komutu bunu biliyor.',
            'birinin kapisi hep acik kaliyor: /ruins.'
          ].join('\n'),
          'aklima-gelenler.txt': 'sinyal susunca da devam ediyor.\nsessizlik de bir frekans.'
        },
        bos: {},
        'imza.txt': 'AURA-NODE burada. gecerken selam birak: chat.'
      }
    },
    {
      id: 'kiosk-guest', ip: '10.13.4.7', mac: '00:CV:M0:04:00:07', host: 'KIOSK-GUEST',
      kind: 'kiosk', alwaysOn: false, onlineChance: 58,
      tree: {
        'foto.jpg': [
          '[ foto: eski bir crt terminal, karanlik oda ]',
          '   .----------------.',
          '   |  > _           |',
          '   |                |',
          '   |________________|',
          '     ||          ||',
          'altyazi: "ilk giris, 03.07" -- kim, bilinmiyor.'
        ].join('\n'),
        'ziyaretci-defteri.txt': [
          'ZIYARETCI DEFTERI (herkese acik kiosk)',
          '- buradan gecen herkes bir iz birakiyor',
          '- sifre yok, gizli de yok; sadece bir esik',
          '- daha derini icin: dugumleri taramaya devam et'
        ].join('\n')
      }
    }
  ];

  // Yeterli online kullanici yoksa doldurulacak kanonik handle havuzu
  const FAB_HANDLES = [
    'nightowl', 'driftsignal', 'staticbloom', 'ghostpixel', 'lowbattery',
    'neonfog', 'carrierlost', 'dusktrace', 'modemhum', 'coldsolder',
    'baudrate', 'nullpointer', 'phosphor', 'deadpixel', 'signalfade'
  ];

  const sanitizeHandle = (raw) => String(raw || '')
    .replace(/^wanderer-/i, '')
    .replace(/[^a-z0-9_]/gi, '')
    .slice(0, 14)
    .toLowerCase();

  function createNet({ now, getOnlineHandles } = {}) {
    const nowFn = typeof now === 'function' ? now : () => Date.now();
    const onlineFn = typeof getOnlineHandles === 'function' ? getOnlineHandles : () => [];

    let connected = null;   // baglanili cihaz
    let cwd = [];           // cihaz icindeki yol (klasor adlari)

    const bucket = () => Math.floor(nowFn() / BUCKET_MS);
    const isOnline = (dev, b = bucket()) => dev.alwaysOn || (hash(dev.id + ':' + b) % 100) < dev.onlineChance;

    const lastSeen = (dev) => {
      const b = bucket();
      for (let i = 1; i <= 288; i += 1) {          // ~2 gun geriye bak
        if (isOnline(dev, b - i)) {
          const dk = i * 10;
          if (dk < 60) return dk + ' dk once';
          const sa = Math.floor(dk / 60);
          return sa < 24 ? sa + ' sa once' : Math.floor(sa / 24) + ' gun once';
        }
      }
      return 'bir sure once';
    };

    // Canli/dekor dugumler: online kullanici handle'lari + doldurma (10-20 toplam)
    const decoys = () => {
      const b = bucket();
      const seen = new Set();
      const handles = [];
      (onlineFn() || []).forEach((h) => {
        const s = sanitizeHandle(h);
        if (s && !seen.has(s)) { seen.add(s); handles.push({ name: s, live: true }); }
      });
      const target = 9 + (hash('count:' + Math.floor(b / 6)) % 6);   // 9-14 dekor
      let fi = hash('fab:' + Math.floor(b / 6)) % FAB_HANDLES.length;
      while (handles.length < target) {
        const s = FAB_HANDLES[fi % FAB_HANDLES.length]; fi += 1;
        if (!seen.has(s)) { seen.add(s); handles.push({ name: s, live: false }); }
        if (fi > FAB_HANDLES.length * 2) break;
      }
      return handles.map((h) => {
        const g = hash(h.name);
        return {
          id: 'wl-' + h.name,
          ip: '10.13.' + (5 + (g % 18)) + '.' + (2 + (g % 250)),   // 10.13.5-22 (sabitlerden ayri)
          mac: 'WL:' + (g % 100),
          host: '@' + h.name,
          kind: 'gezgin',
          decoy: true,
          live: h.live,
          alwaysOn: true            // online kullanicilar -> ONLINE
        };
      });
    };

    const allDevices = () => {
      const fixed = FIXED_DEVICES.map((d) => ({ ...d, decoy: false }));
      // Kasa (Faz 3'te acilir) -- simdilik gizli/offline atmosfer
      const vault = { id: 'vault-cvm', ip: '10.13.13.66', mac: '00:CV:MV:13:00:66', host: '??? [gizli]', kind: 'kasa', vaultLocked: true, onlineChance: 0, alwaysOn: false };
      return [...fixed, vault, ...decoys()];
    };

    const findByIp = (ip) => allDevices().find((d) => d.ip === String(ip).trim());

    // --- dosya agaci gezinme (bagli cihazda) ---
    // Terminal ls/cat/cd argumani NORMALIZE ederek gonderir (README.txt -> "readme txt").
    // Bu yuzden agac anahtarlarini da normalize edip eslestiririz.
    const norm = (s) => String(s || '').toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[._-]+/g, ' ').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const findKey = (dir, target) => {
      if (!dir) return null;
      const t = norm(target);
      return Object.keys(dir).find((k) => norm(k) === t) || null;
    };
    const nodeAt = (path) => path.reduce((n, seg) => (n && typeof n[seg] === 'object' ? n[seg] : null), connected ? connected.tree : null);
    const promptPath = () => '/' + cwd.join('/');

    const scan = () => {
      const b = bucket();
      const rows = allDevices().map((d) => {
        const on = d.vaultLocked ? false : isOnline(d, b);
        const durum = on ? '● ONLINE ' : '○ OFFLINE';
        const son = on ? '—' : (d.vaultLocked ? '—' : lastSeen(d));
        const tag = d.decoy ? '(gezgin)' : d.vaultLocked ? '(???)' : '(dugum)';
        const wake = on ? '' : (d.vaultLocked ? '' : '  [wake?]');
        return `  ${d.ip.padEnd(12)} ${String(d.host).padEnd(15)} ${durum}  ${son.padEnd(11)} ${tag}${wake}`;
      });
      const online = allDevices().filter((d) => !d.vaultLocked && isOnline(d, b)).length;
      return [
        `  convivium agi taraniyor 10.13.0.0/16 ........ ${allDevices().length} dugum (${online} online)`,
        '',
        `  IP           HOST            DURUM     SON GORULME`,
        ...rows,
        '',
        '  ● online gezgin handle\'lari  ·  baglan: connect <ip>  ·  cik: disconnect'
      ].join('\n');
    };

    const connect = (ipRaw) => {
      const ip = String(ipRaw || '').trim();
      if (!ip) return 'connect: kullanim: connect <ip>   (once nmap)';
      const d = findByIp(ip);
      if (!d) return `connect: ${ip} agda gorunmuyor. once: nmap`;
      if (d.vaultLocked) return `connect: ${d.host} -- bu dugum yanit vermiyor. (kilit sonraki katmanda cozulur)`;
      if (!isOnline(d)) return `connect: ${d.host} (${ip}) OFFLINE -- son gorulme ${lastSeen(d)}. (Wake-on-LAN yakinda)`;
      if (d.decoy) return `connect: ${d.host} (${ip}) -- baglanti reddedildi, acik port yok. (canli gezgin dugumu)`;
      connected = d; cwd = [];
      return [
        `▸ baglanildi: ${d.host} (${ip}) -- kimlik dogrulama yok, acik dugum`,
        `] net:${d.host}$ ls`,
        ls('')
      ].join('\n');
    };

    const disconnect = () => {
      if (!connected) return 'disconnect: zaten bagli degilsin. (net odasindasin)';
      const h = connected.host; connected = null; cwd = [];
      return `▸ ${h} baglantisi kapatildi. net odasina donuldu. (scan)`;
    };

    const isConnected = () => connected !== null;

    const ls = () => {
      if (!connected) return 'ls: bir cihaza bagli degilsin. (scan / connect <ip>)';
      const dir = nodeAt(cwd);
      if (!dir) return 'ls: dizin yok.';
      const keys = Object.keys(dir);
      if (!keys.length) return `] net:${connected.host}:${promptPath()}$  (bos klasor)`;
      const listed = keys.map((k) => (typeof dir[k] === 'object' ? k + '/' : k)).join('   ');
      return `] net:${connected.host}:${promptPath()}$\n  ${listed}`;
    };

    const cd = (targetRaw) => {
      if (!connected) return 'cd: bir cihaza bagli degilsin.';
      const target = String(targetRaw || '').trim();
      // "cd /", "cd ~", "cd .." ve yalin "cd" (normalize'da arg silinir) -> koke don.
      if (target === '' || target === '/' || target === '~' || target === '..' || norm(target) === '') {
        cwd = []; return `] net:${connected.host}:/$  (kok)`;
      }
      const dir = nodeAt(cwd);
      const key = findKey(dir, target);
      if (key && typeof dir[key] === 'object') { cwd = [...cwd, key]; return `] net:${connected.host}:${promptPath()}$`; }
      if (key && typeof dir[key] === 'string') return `cd: ${key} bir dosya, klasor degil. (cat ${key})`;
      return `cd: ${target} yok. (ls ile bak)`;
    };

    const cat = (targetRaw) => {
      if (!connected) return 'cat: bir cihaza bagli degilsin.';
      const target = String(targetRaw || '').trim();
      if (!target) return 'cat: kullanim: cat <dosya>';
      const dir = nodeAt(cwd);
      const key = findKey(dir, target);
      const v = key ? dir[key] : undefined;
      if (typeof v === 'string') return v;
      if (typeof v === 'object') return `cat: ${key} bir klasor. (cd ${key})`;
      return `cat: ${target} bulunamadi. (ls ile bak)`;
    };

    const status = () => (connected
      ? `net: ${connected.host} (${connected.ip}) bagli, konum ${promptPath()}`
      : 'net: bagli degil. nmap ile dugumleri gor.');

    const roomExtension = Object.freeze({
      path: '/net',
      title: 'Sinyal Agi',
      room: {
        look: [
          'Sinyal Agi. Convivium dugum agi 10.13.0.0/16 -- gezginler ve altyapi.',
          'Cevredeki cihazlari tara: nmap. Online bir dugume bagla: connect <ip>.',
          'Bazi dugumler kilitli (sonraki katman).'
        ].join(' '),
        objects: {
          tarama: 'Cevredeki cihazlari listeler (online/offline, son gorulme). Yaz: nmap',
          dugum: 'Online sifresiz dugumlere baglanip dosyalarina bakabilirsin: connect <ip>',
          kasa: 'Yanit vermeyen gizli bir dugum var (10.13.13.66). Kilidi sonraki katmanda.'
        },
        navigation: ['nmap', 'connect <ip>', 'cd /']
      }
    });

    // /net odasi VFS'e mount (cd net calissin; bagli degilken README gorunur)
    const vfsMount = Object.freeze({
      path: '/net',
      files: ['README'],
      documents: {
        README: [
          'SINYAL AGI // /net -- Convivium dugum agi 10.13.0.0/16',
          '',
          '  nmap          cevredeki cihazlari tara (online/offline, son gorulme)',
          '  connect <ip>  online sifresiz bir dugume baglan',
          '  ls / cat / cd bagli cihazin dosyalarinda gez',
          '  disconnect    cihazdan cik',
          '',
          'Bazi dugumler kilitli; onlar sonraki katmanda cozulur.'
        ].join('\n')
      }
    });

    return Object.freeze({
      roomExtension, vfsMount, scan, connect, disconnect, isConnected, ls, cd, cat, status,
      // test/introspection
      _isOnline: isOnline, _allDevices: allDevices
    });
  }

  root.createNet = createNet;
})();
