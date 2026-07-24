/**
 * Convivium - /net "Sinyal Agi" (ag-kesif bulmacasi) - FAZ 1 + FAZ 2
 *
 * FAZ 1: nmap/connect + sifresiz cihazlarda ls/cat/cd.
 * FAZ 2: sifre bilmece zinciri (pass/hint), Wake-on-LAN (wake), kalici ilerleme.
 * FAZ 3 (yakinda): kasa dugumu + indirilebilir hologram ekran koruyuculari.
 *
 * Deterministik + cevrimdisi (ruins/dream deseni): online durumu zaman-dilimi
 * hash'iyle uretilir. Canli/dekor dugumler o an online kullanici handle'larindan
 * (yetmezse uydurma). TUM icerik kurgusal; gercek kullanici verisi kullanilmaz.
 *
 * createNet({ now, getOnlineHandles }) -> { roomExtension, vfsMount, scan,
 *   connect, pass, wake, hint, disconnect, isConnected, pendingAuth, ls, cd,
 *   cat, status }
 */
(() => {
  'use strict';
  const root = window.ConviviumHome = window.ConviviumHome || {};

  const BUCKET_MS = 10 * 60 * 1000;   // 10 dk online penceresi
  const STORE_KEY = 'convivium.net.progress';
  const hash = (str) => {
    let h = 2166136261 >>> 0;
    const s = String(str);
    for (let i = 0; i < s.length; i += 1) h = (Math.imul(h ^ s.charCodeAt(i), 16777619)) >>> 0;
    return h >>> 0;
  };
  // Sifre/MAC eslesmesi: harf/rakam disi her seyi at ("1.618"==="1618", MAC nokta/iki-nokta serbest).
  const normPass = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // --- Cihazlar. tree: string=dosya, nesne=klasor. auth yoksa sifresiz. ---
  const FIXED_DEVICES = [
    {
      id: 'cvm-relay', ip: '10.13.0.1', mac: '00:CV:M0:00:01', host: 'CVM-RELAY',
      kind: 'altyapi', alwaysOn: true, onlineChance: 100,
      tree: {
        'README.txt': [
          'CONVIVIUM RELAY // dugum 00 -- agin omurgasi.',
          'Ag: 10.13.0.0/16. nmap ile tara, connect <ip> ile bagla.',
          'Kilitli dugumler var; sifreler baska dugumlerin notlarinda saklı.',
          'Zincirin ucu: kamera dugumu (CAM-BALKON, 10.13.0.7).',
          'Yanit vermeyen bir kasa da var: 10.13.13.66 (odul icerde, kilitli).'
        ].join('\n'),
        'relay.log': [
          '[00:00] role acildi, tasiyici stabil',
          '[--:--] not: GSM-TEL dugumu uykuda; biri onu uyandirmaya calisiyor',
          '[--:--] uyari: bu satiri okuyan biri fazla merakli.'
        ].join('\n')
      }
    },
    {
      id: 'aura-node', ip: '10.13.0.2', mac: '00:CV:M0:00:02', host: 'AURA-NODE',
      kind: 'dugum', alwaysOn: false, onlineChance: 85,
      tree: {
        notlar: {
          'gunluk.txt': [
            'gunluk // aura',
            'kamera dugumunun (CAM-BALKON) sifresini unuttum ama ipucu birak(t)im:',
            '  "Log: altin deger" -- matematikteki o meshur oran. ~1.6, noktasiz yaz.',
            'her gece ayni ruyayi goruyoruz galiba: dream. kapisi acik olan: /ruins.'
          ].join('\n'),
          'aklima-gelenler.txt': 'sinyal susunca da devam ediyor.\nsessizlik de bir frekans.'
        },
        bos: {},
        'imza.txt': 'AURA-NODE burada. gecerken selam birak: chat.'
      }
    },
    {
      id: 'kiosk-guest', ip: '10.13.4.7', mac: '00:CV:M0:04:07', host: 'KIOSK-GUEST',
      kind: 'kiosk', alwaysOn: false, onlineChance: 62,
      tree: {
        'foto.jpg': [
          '[ foto: eski bir crt terminal, karanlik oda ]',
          '   .----------------.',
          '   |  > _           |',
          '   |________________|',
          'altyazi: "ilk giris: 03.07" -- bir dogum gunu? kim, bilinmiyor.',
          '(not: bazi dugumlerin PIN\'i bir dogum tarihidir -> 0307)'
        ].join('\n'),
        'ziyaretci-defteri.txt': [
          'ZIYARETCI DEFTERI (herkese acik kiosk)',
          '- buradan gecen herkes bir iz birakir; sifre yok, gizli de yok',
          '- daha derini icin dugumleri taramaya ve kirmaya devam et'
        ].join('\n')
      }
    },
    // --- Kilitli zincir ---
    {
      id: 'cam-balkon', ip: '10.13.0.7', mac: '00:CV:MC:07:07', host: 'CAM-BALKON',
      kind: 'kamera', alwaysOn: true, onlineChance: 100,
      auth: {
        password: '1618',
        hint: 'Log: "altin deger". Matematikte altin oran ~1.618 -> noktasiz: 1618.',
        hint2: 'Altin oran ilk dort hane, nokta yok. (1-6-1-8)'
      },
      tree: {
        'goruntu.jpg': [
          '[ kamera: bos balkon, gece; sag altta 03:07 saati ]',
          '(hareket yok. sadece bir kayit donuyor.)'
        ].join('\n'),
        'gsm.txt': [
          'ag notu // kamera',
          'NAS-EV (10.13.0.11) sifresi: rakamlar 3-ten 7-ye ardisik.',
          '  yani: 3,4,5,6,7 -> tek dizi.',
          'ayrica: uykuda bir telefon dugumu var (GSM-TEL). onu NAS uyandiriyor.'
        ].join('\n')
      }
    },
    {
      id: 'nas-ev', ip: '10.13.0.11', mac: '00:CV:MN:00:11', host: 'NAS-EV',
      kind: 'depolama', alwaysOn: true, onlineChance: 100,
      auth: {
        password: '34567',
        hint: 'CAM-BALKON notu: "3-ten 7-ye ardisik rakamlar".',
        hint2: 'Ardisik: 3,4,5,6,7 -> bosluksuz yaz: 34567.'
      },
      tree: {
        'hesaplar.xlsx': [
          '+-----------------------------------------------+',
          '| HESAPLAR.xlsx (salt-okunur gorunum)           |',
          '+----------------+---------------+--------------+',
          '| dugum          | erisim        | not          |',
          '+----------------+---------------+--------------+',
          '| CAM-BALKON     | acildi        | 1618         |',
          '| NAS-EV         | buradasin     | 34567        |',
          '| GSM-TEL        | UYKUDA        | once uyandir |',
          '| ???-KASA       | kilitli       | Faz 3        |',
          '+----------------+---------------+--------------+'
        ].join('\n'),
        'oku-beni.txt': [
          'GSM-TEL dugumu uykuda (offline).',
          'Uyandirmak icin Wake-on-LAN: wake 5A:0F:13:07:07',
          'Uyaninca sifresi bir DOGUM tarihi PIN\'i (kioskta gordun: 03.07 -> 0307).'
        ].join('\n')
      }
    },
    {
      id: 'gsm-tel', ip: '10.13.7.7', mac: '5A:0F:13:07:07', host: 'GSM-TEL',
      kind: 'telefon', alwaysOn: false, onlineChance: 0, wakeable: true,
      auth: {
        password: '0307',
        hint: 'Bir DOGUM tarihi PIN. Kiosk fotosundaki tarih: 03.07 -> 0307.',
        hint2: '03 Temmuz -> gun+ay: 0307.'
      },
      tree: {
        'mesajlar.txt': [
          'GSM-TEL // acildi',
          'Zincirin sonu yaklasti: 1618 -> 34567 -> uyandir -> 0307.',
          '',
          'SON DUGUM: gizli kasa 10.13.13.66. O da uykuda.',
          '  uyandir -> wake C0:FF:EE:13:66',
          '  son sifre -> ilk iki anahtarin TOPLAMI: 1618 + 0307 = ?',
          '',
          'Kasadaki odul: indirilebilir hologram ekran koruyucular.'
        ].join('\n')
      }
    },
    // --- Kasa (Faz 3 odulu): uyku + son sifre (1618+0307=1925) -> ekran koruyucular ---
    {
      id: 'holo-kasa', ip: '10.13.13.66', mac: 'C0:FF:EE:13:66', host: 'HOLO-KASA',
      kind: 'kasa', alwaysOn: false, onlineChance: 0, wakeable: true, hidden: true,
      auth: {
        password: '1925',
        hint: 'Ilk iki anahtarin toplami: 1618 + 0307.',
        hint2: '1618 + 0307 = 1925.'
      },
      downloads: {
        'holo-saver-terminal.html': '/assets/savers/holo-saver-terminal.html',
        'holo-saver-gameboy.html': '/assets/savers/holo-saver-gameboy.html',
        'holo-saver-drone.html': '/assets/savers/holo-saver-drone.html'
      },
      tree: {
        'TEBRIKLER.txt': [
          '>>> HOLO-KASA ACILDI <<<',
          'Zinciri bastan sona cozdun. Iyi is, gezgin.',
          'Odul: /paylasim/ekran-koruyucu/ altinda indirilebilir hologramlar.',
          'Her biri tam-ekran donen bir yesil hologram; Windows ve Mac\'te calisir.'
        ].join('\n'),
        paylasim: {
          'ekran-koruyucu': {
            'README.txt': [
              'HOLOGRAM EKRAN KORUYUCULAR (bagimsiz HTML, offline calisir)',
              '',
              'Indir:  download <dosya>',
              '  ornek: download holo-saver-terminal.html',
              '',
              'Kullan: indirilen .html dosyasina cift tikla -> tikla (tam ekran).',
              '  Windows: F11 de tam ekran yapar. Mac: yesil dugme / Ctrl+Cmd+F.',
              '  Cikis: Esc.',
              '',
              'Not: gercek .scr/.saver yerine bu HTML kullanilir -- her yerde acilir,',
              'guvenlidir ve internet gerektirmez.'
            ].join('\n'),
            'holo-saver-terminal.html': 'Kapanmayan Terminal hologrami (donen). Indir: download holo-saver-terminal.html',
            'holo-saver-gameboy.html': 'Avuc konsolu hologrami (donen). Indir: download holo-saver-gameboy.html',
            'holo-saver-drone.html': 'Atil drone hologrami (donen). Indir: download holo-saver-drone.html'
          }
        }
      }
    }
  ];

  const FAB_HANDLES = [
    'nightowl', 'driftsignal', 'staticbloom', 'ghostpixel', 'lowbattery',
    'neonfog', 'carrierlost', 'dusktrace', 'modemhum', 'coldsolder',
    'baudrate', 'nullpointer', 'phosphor', 'deadpixel', 'signalfade'
  ];
  const sanitizeHandle = (raw) => String(raw || '')
    .replace(/^wanderer-/i, '').replace(/[^a-z0-9_]/gi, '').slice(0, 14).toLowerCase();

  function createNet({ now, getOnlineHandles, triggerDownload } = {}) {
    const nowFn = typeof now === 'function' ? now : () => Date.now();
    const onlineFn = typeof getOnlineHandles === 'function' ? getOnlineHandles : () => [];
    const dl = typeof triggerDownload === 'function' ? triggerDownload : () => {};
    const store = (typeof localStorage !== 'undefined') ? localStorage : null;

    // Kalici ilerleme: kirilan + uyandirilan cihazlar
    const loadProgress = () => {
      try { const p = JSON.parse(store?.getItem(STORE_KEY) || '{}'); return { cracked: new Set(p.cracked || []), woken: new Set(p.woken || []) }; }
      catch { return { cracked: new Set(), woken: new Set() }; }
    };
    const progress = loadProgress();
    const saveProgress = () => {
      try { store?.setItem(STORE_KEY, JSON.stringify({ cracked: [...progress.cracked], woken: [...progress.woken] })); } catch { /* yok say */ }
    };

    let connected = null;    // erisim saglanmis cihaz
    let pending = null;      // kilitli, kimlik bekleyen cihaz
    let attempts = 0;        // pending icin yanlis deneme sayaci
    let cwd = [];

    const bucket = () => Math.floor(nowFn() / BUCKET_MS);
    const isOnline = (dev, b = bucket()) => Boolean(
      dev.alwaysOn || (dev.wakeable && progress.woken.has(dev.id)) || (dev.onlineChance > 0 && (hash(dev.id + ':' + b) % 100) < dev.onlineChance)
    );

    const lastSeen = (dev) => {
      const b = bucket();
      for (let i = 1; i <= 288; i += 1) {
        if (isOnline(dev, b - i)) {
          const dk = i * 10;
          if (dk < 60) return dk + ' dk once';
          const sa = Math.floor(dk / 60);
          return sa < 24 ? sa + ' sa once' : Math.floor(sa / 24) + ' gun once';
        }
      }
      return 'bir sure once';
    };

    const decoys = () => {
      const b = bucket();
      const seen = new Set(); const handles = [];
      (onlineFn() || []).forEach((h) => { const s = sanitizeHandle(h); if (s && !seen.has(s)) { seen.add(s); handles.push(s); } });
      const target = 9 + (hash('count:' + Math.floor(b / 6)) % 6);
      let fi = hash('fab:' + Math.floor(b / 6)) % FAB_HANDLES.length;
      while (handles.length < target) { const s = FAB_HANDLES[fi % FAB_HANDLES.length]; fi += 1; if (!seen.has(s)) { seen.add(s); handles.push(s); } if (fi > FAB_HANDLES.length * 2) break; }
      return handles.map((name) => {
        const g = hash(name);
        return { id: 'wl-' + name, ip: '10.13.' + (5 + (g % 18)) + '.' + (2 + (g % 250)), mac: 'WL:' + (g % 100), host: '@' + name, kind: 'gezgin', decoy: true, alwaysOn: true };
      });
    };

    const allDevices = () => [...FIXED_DEVICES.map((d) => ({ ...d, decoy: false })), ...decoys()];
    // Gizli/kilitli dugumun tarama gorunumu: kirilana kadar "??? [gizli]".
    const shownHost = (d) => (d.hidden && !progress.cracked.has(d.id)) ? '??? [gizli]' : d.host;
    const findByIp = (ip) => allDevices().find((d) => d.ip === String(ip).trim());
    const findByMac = (mac) => allDevices().find((d) => d.mac && normPass(d.mac) === normPass(mac));

    // --- dosya agaci (normalize-uyumlu eslesme) ---
    const norm = (s) => String(s || '').toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[._-]+/g, ' ').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const findKey = (dir, target) => { if (!dir) return null; const t = norm(target); return Object.keys(dir).find((k) => norm(k) === t) || null; };
    const nodeAt = (path) => path.reduce((n, seg) => (n && typeof n[seg] === 'object' ? n[seg] : null), connected ? connected.tree : null);
    const promptPath = () => '/' + cwd.join('/');

    const enter = (d) => { connected = d; pending = null; attempts = 0; cwd = []; return [`▸ baglanildi: ${d.host} (${d.ip})`, `] net:${d.host}$ ls`, ls('')].join('\n'); };

    const scan = () => {
      const b = bucket();
      const rows = allDevices().map((d) => {
        const on = isOnline(d, b);
        const hiddenUncracked = d.hidden && !progress.cracked.has(d.id);
        const durum = on ? '● ONLINE ' : '○ OFFLINE';
        const son = on ? '—' : lastSeen(d);
        const lock = (d.auth && !hiddenUncracked) ? (progress.cracked.has(d.id) ? ' [+]' : ' [!]') : '';
        const tag = d.decoy ? '(gezgin)' : hiddenUncracked ? '(???)' : '(dugum)';
        const wake = (!on && !d.decoy) ? '  [wake]' : '';
        return `  ${d.ip.padEnd(12)} ${(shownHost(d) + lock).padEnd(16)} ${durum}  ${son.padEnd(11)} ${tag}${wake}`;
      });
      const online = allDevices().filter((d) => isOnline(d, b)).length;
      return [
        `  convivium agi taraniyor 10.13.0.0/16 ........ ${allDevices().length} dugum (${online} online)`,
        '', '  IP           HOST             DURUM     SON GORULME', ...rows, '',
        '  [!] sifreli · [+] kirildi · baglan: connect <ip> · uyandir: wake <mac> · sifre: pass <deneme>'
      ].join('\n');
    };

    const connect = (ipRaw) => {
      const ip = String(ipRaw || '').trim();
      if (!ip) return 'connect: kullanim: connect <ip>   (once nmap)';
      const d = findByIp(ip);
      if (!d) return `connect: ${ip} agda gorunmuyor. once: nmap`;
      const host = shownHost(d);
      if (!isOnline(d)) {
        if (d.wakeable) return `connect: ${host} (${ip}) OFFLINE -- uykuda.${d.hidden ? ' MAC\'ini bir dugumun notunda bulman gerek.' : ` uyandir: wake ${d.mac}`}`;
        return `connect: ${host} (${ip}) OFFLINE -- son gorulme ${lastSeen(d)}.`;
      }
      if (d.decoy) return `connect: ${host} (${ip}) -- baglanti reddedildi, acik port yok. (canli gezgin)`;
      if (!d.auth || progress.cracked.has(d.id)) return enter(d);
      // kilitli, henuz kirilmamis -> kimlik bekle
      pending = d; attempts = 0;
      return [`connect: ${host} (${ip}) -- KIMLIK DOGRULAMA GEREKLI`, `  ipucu: ${d.auth.hint}`, '  dene: pass <deneme>   ·   ipucu: hint'].join('\n');
    };

    const pass = (attemptRaw) => {
      if (!pending) return 'pass: once kilitli bir dugume connect ol.';
      const attempt = String(attemptRaw || '').trim();
      if (!attempt) return `pass: kullanim: pass <deneme>   (${pending.host})`;
      if (normPass(attempt) === normPass(pending.auth.password)) {
        progress.cracked.add(pending.id); saveProgress();
        const d = pending;
        return ['  >> ACCESS GRANTED <<', enter(d)].join('\n');
      }
      attempts += 1;
      const extra = attempts >= 2 ? `\n  ipucu (2): ${pending.auth.hint2 || pending.auth.hint}` : '';
      return `  X ACCESS DENIED (${pending.host}). yanlis deneme: ${attempts}.${extra}\n  tekrar: pass <deneme>  ·  ipucu: hint`;
    };

    const wake = (macRaw) => {
      const mac = String(macRaw || '').trim();
      if (!mac) return 'wake: kullanim: wake <mac>   (offline dugumu Wake-on-LAN ile uyandir)';
      const d = findByMac(mac);
      if (!d) return `wake: ${mac} agda bir dugume karsilik gelmiyor. (MAC\'i bir dugumun notunda ara)`;
      if (d.vaultLocked || d.decoy) return `wake: ${d.host} bu sekilde uyandirilamaz.`;
      if (isOnline(d)) return `wake: ${d.host} zaten online.`;
      if (!d.wakeable) return `wake: ${d.host} WoL\'a yanit vermiyor.`;
      progress.woken.add(d.id); saveProgress();
      return `  ▸ WoL paketi gonderildi -> ${d.host} (${d.ip}) UYANDI. artik online. (connect ${d.ip})`;
    };

    const hint = () => {
      if (!pending) return null;   // net baglami yok -> normal ipucu komutu calissin
      const h = attempts >= 2 && pending.auth.hint2 ? pending.auth.hint2 : pending.auth.hint;
      return `ipucu (${pending.host}): ${h}\n  dene: pass <deneme>`;
    };

    const disconnect = () => {
      if (!connected && !pending) return 'disconnect: zaten bagli degilsin. (net odasindasin)';
      const h = (connected || pending).host; connected = null; pending = null; attempts = 0; cwd = [];
      return `▸ ${h} baglantisi kapatildi. net odasina donuldu. (nmap)`;
    };

    const isConnected = () => connected !== null;
    const pendingAuth = () => pending !== null;

    const ls = () => {
      if (!connected) return 'ls: bir cihaza bagli degilsin. (nmap / connect <ip>)';
      const dir = nodeAt(cwd); if (!dir) return 'ls: dizin yok.';
      const keys = Object.keys(dir);
      if (!keys.length) return `] net:${connected.host}:${promptPath()}$  (bos klasor)`;
      return `] net:${connected.host}:${promptPath()}$\n  ${keys.map((k) => (typeof dir[k] === 'object' ? k + '/' : k)).join('   ')}`;
    };
    const cd = (targetRaw) => {
      if (!connected) return 'cd: bir cihaza bagli degilsin.';
      const target = String(targetRaw || '').trim();
      if (target === '' || target === '/' || target === '~' || target === '..' || norm(target) === '') { cwd = []; return `] net:${connected.host}:/$  (kok)`; }
      const dir = nodeAt(cwd); const key = findKey(dir, target);
      if (key && typeof dir[key] === 'object') { cwd = [...cwd, key]; return `] net:${connected.host}:${promptPath()}$`; }
      if (key && typeof dir[key] === 'string') return `cd: ${key} bir dosya, klasor degil. (cat ${key})`;
      return `cd: ${target} yok. (ls ile bak)`;
    };
    const cat = (targetRaw) => {
      if (!connected) return 'cat: bir cihaza bagli degilsin.';
      const target = String(targetRaw || '').trim();
      if (!target) return 'cat: kullanim: cat <dosya>';
      const dir = nodeAt(cwd); const key = findKey(dir, target); const v = key ? dir[key] : undefined;
      if (typeof v === 'string') return v;
      if (typeof v === 'object') return `cat: ${key} bir klasor. (cd ${key})`;
      return `cat: ${target} bulunamadi. (ls ile bak)`;
    };

    const download = (fileRaw) => {
      if (!connected) return 'download: bir cihaza bagli degilsin.';
      if (!connected.downloads) return 'download: bu cihazda indirilecek bir sey yok.';
      const file = String(fileRaw || '').trim();
      if (!file) return `download: kullanim: download <dosya>   (ls: /paylasim/ekran-koruyucu)`;
      const key = Object.keys(connected.downloads).find((k) => norm(k) === norm(file));
      if (!key) return `download: ${file} yok. (ls ile bak)`;
      dl(connected.downloads[key], key);
      return `  ▸ indiriliyor: ${key}\n  Ac: cift tikla -> ekranda tikla (tam ekran). Cikis: Esc. (Windows + Mac)`;
    };

    const status = () => (connected
      ? `net: ${connected.host} (${connected.ip}) bagli, konum ${promptPath()}`
      : pending ? `net: ${pending.host} kimlik bekliyor (pass <deneme>)` : 'net: bagli degil. nmap ile dugumleri gor.');

    const roomExtension = Object.freeze({
      path: '/net', title: 'Sinyal Agi',
      room: {
        look: [
          'Sinyal Agi. Convivium dugum agi 10.13.0.0/16 -- gezginler ve altyapi.',
          'Tara: nmap. Baglan: connect <ip>. Kilitli dugum: pass <deneme> (ipucu: hint).',
          'Uyuyan dugum: wake <mac>. Bir kasa gizli (odul Faz 3\'te).'
        ].join(' '),
        objects: {
          tarama: 'Cevredeki cihazlari listeler (online/offline/kilit). Yaz: nmap',
          dugum: 'Online dugume baglan: connect <ip>. Sifreliyse: pass <deneme>',
          kilit: 'Sifreler baska dugumlerin notlarinda. Ilk halka: CAM-BALKON (Log: altin deger).',
          kasa: 'Gizli kasa 10.13.13.66. Zinciri coz, uyandir ve ac -> odul: indirilebilir hologram ekran koruyucular (download).'
        },
        navigation: ['nmap', 'connect <ip>', 'pass <deneme>', 'wake <mac>', 'cd /']
      }
    });
    const vfsMount = Object.freeze({
      path: '/net', files: ['README'],
      documents: {
        README: [
          'SINYAL AGI // /net -- Convivium dugum agi 10.13.0.0/16', '',
          '  nmap          cevredeki cihazlari tara',
          '  connect <ip>  bir dugume baglan',
          '  pass <deneme> kilitli dugumun sifresini dene (ipucu: hint)',
          '  wake <mac>    uyuyan dugumu Wake-on-LAN ile uyandir',
          '  ls / cat / cd bagli cihazin dosyalarinda gez  ·  disconnect: cik', '',
          'Ilk halka: CAM-BALKON (10.13.0.7). Ipucu bir notta: "Log: altin deger".'
        ].join('\n')
      }
    });

    return Object.freeze({
      roomExtension, vfsMount, scan, connect, pass, wake, hint, disconnect, download,
      isConnected, pendingAuth, ls, cd, cat, status,
      _isOnline: isOnline, _allDevices: allDevices
    });
  }

  root.createNet = createNet;
})();
