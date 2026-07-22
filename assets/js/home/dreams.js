/**
 * Convivium - Ruya Gunlugu (Oracle'in gece defteri)
 * Site her gece "ruya gorur": dunun kimliksiz toplam sinyalleri
 * (site_events agregati) gunun tarihinden turetilen deterministik bir
 * grameria dokunur. Cron/AI yok; ayni gun herkes ayni ruyayi okur.
 * Istatistik RPC'si yoksa ruya yine dogar ama "soluk"tur (yalniz seed).
 *
 * Ruins baglantisi: yedi gun onceki ruya /ruins'e "asinmis kalinti"
 * olarak duser — kelimelerinin bir kismi deterministik olarak silinmistir.
 * Kalinti senkron uretilir (fetch yok), boylece cevrimdisi da calisir.
 *
 * createDreams(deps) fabrikasi ile kurulur; factory ag/DOM/storage'a
 * dogrudan erismez (fetchStats disaridan verilir).
 * (c) 2026 Ersin Binal - https://ersinbinal.github.io
 */
(() => {
  'use strict';

  const root = window.ConviviumHome = window.ConviviumHome || {};

  const mulberry32 = (seed) => {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const seedOf = (dateKey) => Array.from(String(dateKey)).reduce(
    (hash, ch) => ((hash * 31) + ch.charCodeAt(0)) >>> 0, 17
  );

  // Olay anahtarlari -> ruya imgeleri (tekil/cogul dokuma icin).
  const IMAGERY = Object.freeze({
    'home.view': 'kapi aralandi',
    'articles.view': 'okuma odasinda sayfa cevrildi',
    'command.first': 'ilk ses verildi',
    'oracle.ask': 'soru soruldu',
    'game.start': 'oyun makinesi uyandi',
    'login.done': 'iceri girildi',
    'offline.node.solved': 'karanlikta bir dugum yandi',
    'card.collect': 'kart toplandi'
  });

  const OPENERS = Object.freeze([
    'Site dun gece ruya gordu.',
    'Gece, terminal kendi kendine konustu.',
    'Isiklar sonunce arsiv nefes aldi.',
    'Dun gece frekans alcakti; ruya net.',
    'Kapali sekmelerin arasinda bir ruya gezindi.'
  ]);

  const TEXTURES = Object.freeze([
    'Koridorlar fosfor yesiliydi.',
    'Atlas haritasi tavana yansiyordu.',
    'Bir yerlerde radyo kendi kendine calisti.',
    'Ekran koruyucudan bir uydu dustu, kimse gormedi.',
    'Vault kapisi ruyada kilitsizdi.',
    'BBS tasiyici sesi hala aciktir, dedi biri.',
    'Duvar yazilari yer degistirmisti.'
  ]);

  const CLOSERS = Object.freeze([
    'Sabah oldugunda hicbiri kaydedilmemisti; yalniz bu satirlar kaldi.',
    'Uyanirken site bir satiri unuttu; belki de bunu.',
    'Ruya bitti. Terminal hala acik.',
    'Bu ruya yarin baska bir seye donusecek.'
  ]);

  function createDreams({ fetchStats, getDayKey } = {}) {
    if (typeof fetchStats !== 'function' || typeof getDayKey !== 'function') {
      throw new TypeError('createDreams: zorunlu fonksiyonlar eksik: fetchStats/getDayKey');
    }

    const dayOffset = (offset) => {
      const base = new Date(`${getDayKey()}T00:00:00Z`);
      base.setUTCDate(base.getUTCDate() + offset);
      return base.toISOString().slice(0, 10);
    };

    const pick = (rng, list) => list[Math.floor(rng() * list.length)];

    const weaveStats = (rng, rows) => {
      const known = (rows || [])
        .filter((row) => IMAGERY[row?.event_key] && Number(row.total) > 0)
        .sort((a, b) => Number(b.total) - Number(a.total))
        .slice(0, 3);
      if (!known.length) return null;
      return known.map((row) => {
        const count = Number(row.total);
        const image = IMAGERY[row.event_key];
        return count === 1
          ? `Bir kez ${image}.`
          : `${count} kez ${image}; ${pick(rng, ['sayan olmadi', 'kimse sasirmadi', 'arsiv not etti', 'yankisi hala duruyor'])}.`;
      });
    };

    const composeDream = (dateKey, statsRows) => {
      const rng = mulberry32(seedOf(dateKey));
      const lines = [pick(rng, OPENERS)];
      const woven = weaveStats(rng, statsRows);
      if (woven) {
        lines.push(...woven);
      } else {
        lines.push('Sinyal kaydi eksik; ruya soluk ama gorulmus.');
        lines.push(pick(rng, TEXTURES));
      }
      lines.push(pick(rng, TEXTURES));
      lines.push(pick(rng, CLOSERS));
      return lines;
    };

    // Kalinti: yedi gun onceki ruyanin seed-only hali, deterministik asinmis.
    const erode = (dateKey, lines) => {
      const rng = mulberry32(seedOf(`${dateKey}#erode`));
      return lines.map((line) => line
        .split(' ')
        .map((word) => (word.length > 3 && rng() < 0.22 ? '▒'.repeat(Math.min(word.length, 6)) : word))
        .join(' '));
    };

    const relic = () => {
      const dateKey = dayOffset(-7);
      const lines = erode(dateKey, composeDream(dateKey, null));
      return {
        id: 'ruya-arsivi.log',
        dateKey,
        body: [
          `RUYA ARSIVI // ${dateKey}`,
          '(kayit asinmis; istatistik tozu silinmis)',
          '',
          ...lines
        ].join('\n')
      };
    };

    const dreamCommand = async () => {
      const dateKey = dayOffset(-1);
      let rows = null;
      let faded = false;
      try {
        rows = await fetchStats(dateKey);
      } catch {
        faded = true;
      }
      const lines = composeDream(dateKey, rows);
      return [
        `] RUYA ${dateKey}`,
        '',
        ...lines.map((line) => `  ${line}`),
        '',
        faded ? '  (sinyal defteri kapali; ruya yalniz seed\'den dokundu)' : '  (herkes bu gece ayni ruyayi gorur)',
        '  arsiv: cd ruins -> cat ruya-arsivi.log',
        ']'
      ].join('\n');
    };

    return Object.freeze({ dreamCommand, relic, composeDream });
  }

  root.createDreams = createDreams;
})();
