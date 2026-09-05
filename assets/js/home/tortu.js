(() => {
  'use strict';

  // TORTU — sitenin kendi jeolojisi.
  //
  // /ruins uydurma kalintilar tasir ve bunu artik acikca soyler ("kurulus miti").
  // TORTU ise KAZILMIS katmandir: kaynagi deponun gercek git tarihidir.
  // Bu modul saf okuyucudur — veri getirme ve DOM yazimi protocol callback'lerinde.

  const root = window.ConviviumHome = window.ConviviumHome || {};

  const deepFreeze = (value) => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };

  // Gunun karotu deterministik secilir: ayni gun herkes ayni katmani kazar.
  // mulberry32 degil basit bir toplam hash — tek ihtiyac tekrar edilebilirlik.
  const hashKey = (key) => Array.from(String(key)).reduce(
    (total, char) => (total * 31 + char.charCodeAt(0)) >>> 0,
    7
  );

  const pad = (value, width) => String(value).padStart(width, ' ');

  root.createTortu = function createTortu(deps = {}) {
    const {
      getData = () => null,
      getDayKey = () => '1970-01-01'
    } = deps;

    const ready = () => {
      const data = getData();
      return Boolean(data && Array.isArray(data.cores) && data.cores.length);
    };

    const cores = () => {
      const data = getData();
      return (data && Array.isArray(data.cores)) ? data.cores : [];
    };

    // Kazi ekseni: karotlar eskiden yeniye siralanir, boylece "derinlik"
    // gercek bir anlam tasir — derin = eski.
    const byDepth = () => [...cores()].sort((left, right) => String(left.date).localeCompare(right.date));

    const dailyIndex = () => {
      const list = byDepth();
      if (!list.length) return -1;
      return hashKey(getDayKey()) % list.length;
    };

    const eras = () => {
      const data = getData();
      return (data && Array.isArray(data.eras)) ? data.eras : [];
    };

    // Bir karot hangi eraya duser? Tarih araligina gore; era siniri commit
    // indeksinde bulunur ama disari tarihle anlatilir.
    const eraOf = (core) => {
      if (!core) return null;
      return eras().find((era) => core.date >= era.from && core.date <= era.to) || null;
    };

    const renderCore = (core, depth, total) => {
      if (!core) return 'kaz: bu derinlikte tabaka yok.';
      const lines = [
        `] COMMIT ${pad(depth + 1, 3)}/${total}  ${total - depth - 1} commit geride`,
        `  tarih   ${core.date}`,
        `  commit  ${core.sha}`,
        `  dosya   ${core.path}`,
        `  kayit   ${core.subject}`
      ];
      if (Array.isArray(core.coauthors) && core.coauthors.length) {
        // Ortak-yazar atfi korunur ve GOSTERILIR (Madde 3: mekanizma sirri olmaz).
        lines.push(`  ortak   ${core.coauthors.join(', ')}`);
      }
      const era = eraOf(core);
      if (era) lines.push(`  katman  ${era.no}. ${era.label}  (${era.from} -> ${era.to})`);
      lines.push('', '  --- kazilan katman ---');
      (core.lines || []).forEach((line) => lines.push(`  ${line}`));
      lines.push('', `  bu tabaka uydurulmadi; ${core.sha} commit'inden kazildi.`);
      return lines.join('\n');
    };

    // `kaz` — argumansiz gunun karotu, sayiyla belirli derinlik, sha ile tam hedef.
    const dig = (raw = '') => {
      if (!ready()) {
        return 'kaz: tortu katmani henuz yuklenmedi. Birazdan tekrar dene.';
      }
      const list = byDepth();
      const query = String(raw || '').trim().toLowerCase();

      if (!query) {
        const index = dailyIndex();
        return renderCore(list[index], index, list.length);
      }

      if (/^\d+$/.test(query)) {
        const index = Number(query) - 1;
        if (index < 0 || index >= list.length) {
          return `kaz: derinlik 1-${list.length} arasinda olmali.`;
        }
        return renderCore(list[index], index, list.length);
      }

      const found = list.findIndex((core) => String(core.sha).toLowerCase().startsWith(query));
      if (found === -1) return `kaz: "${raw.trim()}" ile baslayan bir tabaka yok.`;
      return renderCore(list[found], found, list.length);
    };

    // `taban` — commit frekansi cok yuksek dosyalar bir damar degil, TABAN KAYADIR.
    const bedrock = () => {
      const data = getData();
      if (!ready()) return 'taban: veri henuz yuklenmedi.';
      const rocks = Array.isArray(data.bedrock) ? data.bedrock : [];
      if (!rocks.length) return 'taban: bu depoda cekirdek dosya cikmadi.';

      const lines = [
        '] CORE FILES  (cekirdek dosyalar)',
        '  Neredeyse her commit\'te degisen dosyalar bir CLUSTER degildir —',
        '  sitenin uzerinde durdugu zemindir. Analiz bunlari ayri tutar,',
        '  yoksa butun cluster\'lari birbirine baglayip yapiyi yok ederler.',
        ''
      ];
      rocks.forEach((rock) => {
        const percent = Math.round((rock.share || 0) * 100);
        const bar = '#'.repeat(Math.max(1, Math.round(percent / 4)));
        lines.push(`  ${pad(percent, 3)}%  ${bar}  ${rock.path}`);
      });
      lines.push('', `  ${data.repo.commits} commit / ${data.repo.activeDays} aktif gun`);
      return lines.join('\n');
    };

    // `tabaka` — eralari listeler. Era siniri PELT ile COMMIT INDEKSINDE
    // bulunur; takvim gununde degil. Gerekce: 574 commit / 62 aktif gun,
    // gun serisinin ~%89'u sifir olurdu.
    const layers = () => {
      if (!ready()) return 'tabaka: veri henuz yuklenmedi.';
      const list = eras();
      if (!list.length) return 'tabaka: epoch hesaplanmamis.';

      const data = getData();
      const lines = [
        '] EPOCHS  (donemler)',
        '  Donemler "ne zaman" ekseninde degil "neyle ugrasiyordu" ekseninde',
        '  BULUNUR: her commit\'in dosyalari sekiz kategoriye dagilir ve bu',
        '  dagilimin degistigi noktalar PELT (changepoint detection) ile',
        '  isaretlenir. Elle yazilmaz.',
        ''
      ];
      list.forEach((era) => {
        const mix = (era.mix || []).map((m) => `${m.key} %${m.pct}`).join(' · ');
        const bar = '#'.repeat(Math.max(1, Math.round(era.commits / 8)));
        lines.push(`  ${String(era.no).padStart(2)}. ${era.label}`);
        lines.push(`      ${era.from} -> ${era.to}   ${String(era.commits).padStart(3)} commit  ${bar}`);
        lines.push(`      ${mix}`);
      });
      lines.push('', `  ${data.repo.commits} commit / ${data.repo.activeDays} aktif gun / ${list.length} epoch`);
      return lines.join('\n');
    };

    // `damar` — birlikte degisen dosya kumeleri. Kenar agirligi Jaccard,
    // topluluk tespiti Louvain. Taban kaya grafa hic girmez; girerse butun
    // damarlari birbirine baglayip yapiyi yok eder.
    const veins = () => {
      if (!ready()) return 'damar: veri henuz yuklenmedi.';
      const data = getData();
      const block = data.veins || {};
      const list = Array.isArray(block.veins) ? block.veins : [];
      if (!list.length) return 'damar: bu depoda cluster olusmamis.';

      const lines = [
        '] CLUSTERS  (birlikte degisen dosyalar)',
        '  Iki dosya ayni commit\'te sik degisiyorsa aralarinda bir bag vardir.',
        '  Kenar agirligi ham sayim degil Jaccard; kumeler Louvain (community',
        '  detection) ile bulunur.',
        `  modulerlik Q = ${block.modularity}  (0.30 ustu anlamli yapi demektir)`,
        ''
      ];
      list.forEach((vein) => {
        lines.push(`  ${String(vein.no).padStart(2)}. ${vein.label}  (${vein.size} dosya)`);
        (vein.files || []).slice(0, 4).forEach((file) => lines.push(`      ${file}`));
        if (vein.size > 4) lines.push(`      ... +${vein.size - 4}`);
      });
      lines.push('', '  Cekirdek dosyalar bu grafa girmez; `taban` ile ayri bak.');
      return lines.join('\n');
    };

    // Terminal navigasyonu icin: bu odada anlamli sonraki hareketler.
    const navigation = () => deepFreeze(['kaz', 'tabaka', 'damar', 'taban', 'cd /']);

    return deepFreeze({
      ready,
      dig,
      layers,
      veins,
      bedrock,
      eraOf,
      navigation,
      // Test ve ileriki dilimler (Z1.2 tabakalar, Z1.3 damarlar) icin.
      _depthOrder: byDepth,
      _dailyIndex: dailyIndex
    });
  };
})();
