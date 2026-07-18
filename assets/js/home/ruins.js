(() => {
  'use strict';

  const root = window.ConviviumHome = window.ConviviumHome || {};

  const deepFreeze = (value) => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };

  const ruinsArtifactRegistry = deepFreeze([
    {
      id: 'bbs-1997.log',
      object: 'terminal',
      title: 'Kapanmayan BBS',
      summary: '1997 tarihli kapanmamis bir BBS oturumu. Tasiyici sesi kaydin sonunda hala acik.',
      body: [
        'CONVIVIUM RELAY // NODE 04',
        '1997-11-03 02:14',
        '> baglanti sayisi: 1',
        '> son kullanici cikti ama tasiyici hala acik.',
        '> mesaj: "gelecekte biri bu satiri bulursa, sistemi kapatma."',
        'NO CARRIER_'
      ].join('\n')
    },
    {
      id: 'todo-fragment.txt',
      object: 'todo',
      title: 'Yarim TODO',
      summary: '2004 tarihli bir gelistirme listesi. Bazi maddeler yirmi iki yil sonra kendiliginden tamamlanmis.',
      body: [
        'TODO // kurtarilan parca // 2004',
        '[x] haritayi ciz',
        '[x] terminale ses ver',
        '[ ] ziyaretcilerin birbirini hissetmesini sagla',
        '[ ] arsivi tamamla',
        'not: bitmis bir sistem, terk edilmis bir sistemdir.'
      ].join('\n')
    },
    {
      id: 'arcade-recovery.scr',
      object: 'ekran',
      title: 'Kayip Baslangic Ekrani',
      summary: 'Tarihsiz bir arcade ekran dokumu. Oyun baslamadan once oyuncunun adini unutmus.',
      body: [
        'RECOVERED SCREEN 03',
        '+------------------------------+',
        '| PLAYER 1: ???                |',
        '| SECTOR  : CONVIVIUM/ORIGIN   |',
        '| CREDIT  : 00                 |',
        '+------------------------------+',
        'INSERT MEMORY'
      ].join('\n')
    }
  ]);

  const hashDay = (dayKey) => Array.from(dayKey).reduce(
    (hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0,
    0
  );

  function createRuins({ getDayKey } = {}) {
    if (typeof getDayKey !== 'function') {
      throw new TypeError('createRuins: zorunlu fonksiyon eksik: getDayKey');
    }

    const dayKey = String(getDayKey() || 'unknown');
    const dailyArtifact = ruinsArtifactRegistry[hashDay(dayKey) % ruinsArtifactRegistry.length];
    const objects = Object.fromEntries(ruinsArtifactRegistry.map((artifact) => [
      artifact.object,
      `${artifact.summary} Oku: cat ${artifact.id}`
    ]));
    objects.buluntu = [
      `Bugunun ortak buluntusu: ${dailyArtifact.id} / ${dailyArtifact.title}.`,
      'Her gezgin bugun ayni parcayi gorur.',
      `Oku: cat ${dailyArtifact.id}`
    ].join(' ');

    const roomExtension = deepFreeze({
      path: '/ruins',
      title: 'Sinyal Arkeolojisi',
      room: {
        look: [
          'Sinyal Arkeolojisi. Kurmaca arsivin tozu altinda uc dijital kalinti var: terminal, todo, ekran.',
          `Bugunun yuzey sinyali: ${dailyArtifact.id}.`
        ].join(' '),
        objects
      }
    });
    const vfsMount = deepFreeze({
      path: '/ruins',
      files: ruinsArtifactRegistry.map((artifact) => artifact.id),
      documents: Object.fromEntries(
        ruinsArtifactRegistry.map((artifact) => [artifact.id, artifact.body])
      )
    });

    return Object.freeze({ dayKey, dailyArtifact, roomExtension, vfsMount });
  }

  root.ruinsArtifactRegistry = ruinsArtifactRegistry;
  root.createRuins = createRuins;
})();
