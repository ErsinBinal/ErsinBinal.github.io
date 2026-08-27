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

    const renderCore = (core, depth, total) => {
      if (!core) return 'kaz: bu derinlikte tabaka yok.';
      const lines = [
        `] KAROT ${pad(depth + 1, 3)}/${total}  derinlik ${total - depth - 1} tabaka`,
        `  tarih   ${core.date}`,
        `  commit  ${core.sha}`,
        `  dosya   ${core.path}`,
        `  kayit   ${core.subject}`
      ];
      if (Array.isArray(core.coauthors) && core.coauthors.length) {
        // Ortak-yazar atfi korunur ve GOSTERILIR (Madde 3: mekanizma sirri olmaz).
        lines.push(`  ortak   ${core.coauthors.join(', ')}`);
      }
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
      if (!ready()) return 'taban: tortu katmani henuz yuklenmedi.';
      const rocks = Array.isArray(data.bedrock) ? data.bedrock : [];
      if (!rocks.length) return 'taban: bu depoda taban kaya olusmamis.';

      const lines = [
        '] TABAN KAYA',
        '  Her commit\'te degisen dosyalar bir damar degildir; sitenin uzerinde',
        '  durdugu zemindir. Kazi bunlari ayri tutar, yoksa her katmanda cikarlar.',
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

    // Terminal navigasyonu icin: bu odada anlamli sonraki hareketler.
    const navigation = () => deepFreeze(['kaz', 'taban', 'cd /']);

    return deepFreeze({
      ready,
      dig,
      bedrock,
      navigation,
      // Test ve ileriki dilimler (Z1.2 tabakalar, Z1.3 damarlar) icin.
      _depthOrder: byDepth,
      _dailyIndex: dailyIndex
    });
  };
})();
