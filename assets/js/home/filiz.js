(() => {
  'use strict';

  // FILIZ — sitenin atolyesi.
  //
  // TORTU gecmisi KAZAR. FILIZ yeni olani URETIR. Aradaki fark anayasadadir:
  // uretim, ancak DOGRULAYICISI olan yerde serbesttir (Madde 6). Burada
  // dogrulayici basittir — uretilen sey bir programdir, calistirilir, bakilir.
  // Bu yuzden FILIZ bulmaca uretebilir ama gecmis hakkinda hikaye uretemez:
  // hikayenin calistirilacak hali yoktur.
  //
  // Iki raf:
  //   COZULEN : OKKAM ziyaretci butcesiyle buluyor -> oynanabilir bulmaca
  //   ACIK    : FILIZ programi biliyor (kendisi uretti), OKKAM bulamiyor.
  //             Site kendi coazemedigi soruyu soruyor ve bunu ilan ediyor.
  //
  // Bu modul SAF okuyucudur: DOM yok, ag yok, zaman yok, rastgelelik yok.

  const root = window.ConviviumHome = window.ConviviumHome || {};

  const deepFreeze = (value) => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };

  const hashKey = (key) => Array.from(String(key)).reduce(
    (total, char) => (total * 31 + char.charCodeAt(0)) >>> 0,
    13
  );

  // FNV-1a 32 bit — build tarafi ve sigil.js ile ayni muhur.
  // Kriptografik degil ve oyle sunulmuyor: amaci cevabi DOGRULATMAK.
  const sealOf = (program) => {
    let hash = 0x811c9dc5;
    for (const op of program) {
      hash ^= op & 0xff;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(36);
  };

  root.createFiliz = function createFiliz(deps = {}) {
    const { getData = () => null, getDayKey = () => '1970-01-01' } = deps;

    const data = () => getData() || null;
    const ready = () => {
      const d = data();
      return Boolean(d && (Array.isArray(d.cozulen) || Array.isArray(d.acik)));
    };

    const list = (name) => {
      const d = data();
      return (d && Array.isArray(d[name])) ? d[name] : [];
    };

    const seq = (target) => `[${target.join(', ')}]`;

    // Gunun acik meydan okumasi deterministik secilir.
    const dailyOpen = () => {
      const open = list('acik');
      if (!open.length) return null;
      return open[hashKey(getDayKey()) % open.length];
    };

    const overview = () => {
      const d = data();
      const uretim = d.uretim || {};
      const elek = d.elek || {};
      const cozulen = list('cozulen');
      const acik = list('acik');
      const red = list('red');
      const redOrani = elek.aday ? Math.round((elek.elenen / elek.aday) * 100) : 0;

      const lines = [
        '] FILIZ — atolye',
        '  TORTU gecmisi kazar. FILIZ yeni olani uretir.',
        '  Uretilen her dizinin altinda onu GERCEKTEN ureten bir program var;',
        '  o program her an tekrar kosulabilir. Dogrulanamayan sey uretilmez.',
        '',
        '  URETEC',
        `    tarandi   ${Number(uretim.tarandi || 0).toLocaleString('tr-TR')} program (uzunluk <= ${uretim.uzunluk || '?'})`,
        `    bulundu   ${Number(uretim.dizi || 0).toLocaleString('tr-TR')} farkli dizi`,
        '',
        '  ELEK',
        `    aday      ${elek.aday || 0}`,
        `    gecen     ${elek.gecen || 0}`,
        `    elenen    ${elek.elenen || 0}  (%${redOrani} red)`,
        ''
      ];

      // Red sebepleri YAYINLANIR. Ne attigini saklayan elek, elek degildir.
      // Sayim TAM dokumden gelir; `red` listesi kirpilmis ornektir ve onu
      // saymak "1624 elendi" deyip 40 gostermek olurdu.
      const sayim = (elek && elek.sayim) ? elek.sayim : null;
      if (sayim) {
        lines.push('    neden elendiler:');
        Object.entries(sayim)
          .sort((a, b) => b[1] - a[1])
          .forEach(([why, n]) => lines.push(`      ${String(n).padStart(5)}  ${why}`));
        lines.push('');
      }

      // Raf sayilari da TAM sayidan gelir; asagidaki listeler kirpiktir.
      const raf = d.raf || { cozulen: cozulen.length, acik: acik.length };
      lines.push(`  RAFLAR    cozulen ${raf.cozulen} · acik ${raf.acik}`);
      if (elek.siniflandirilamayan) {
        lines.push(`            ${elek.siniflandirilamayan} aday siniflandirilamadi — gece butcesi yetmedi.`);
        lines.push('            Bu bir eksiklik degil, ILAN EDILEN bir sinir.');
      }
      lines.push('');

      if (cozulen.length) {
        lines.push('  COZULEN — OKKAM bunlari buluyor:');
        cozulen.slice(0, 5).forEach((p) => lines.push(
          `    ${seq(p.target).padEnd(26)} ${String(p.program).padEnd(28)} %${p.gain} kazanc`
        ));
        lines.push('');
      }

      const today = dailyOpen();
      if (today) {
        lines.push('  ACIK — site kendi cozemedigi soruyu soruyor:');
        lines.push('');
        lines.push(`    ${seq(today.target)}`);
        lines.push(`    FILIZ bu diziyi ureten ${today.length} talimatlik bir program BILIYOR`);
        lines.push('    — kendisi uretti. Ama OKKAM ziyaretci butcesiyle onu bulamiyor.');
        lines.push(`    muhur ${today.seal}   (cevabin dogrulugu bununla olculur)`);
        lines.push('');
        lines.push('    Denemek icin:  filiz coz INC OUT JNZ');
      }

      lines.push('');
      lines.push('  Butun acik meydan okumalar: filiz acik');
      lines.push('  Nasil calisiyor:            filiz nasil');
      return lines.join('\n');
    };

    const openList = () => {
      const acik = list('acik');
      if (!acik.length) return 'filiz: acik meydan okuma yok.';
      const lines = [
        '] FILIZ — acik meydan okumalar',
        '  FILIZ bu dizileri ureten programi biliyor. OKKAM bulamiyor.',
        '  Makinenin siniri burada somut: uzunlugu yaziyor, cevabi degil.',
        ''
      ];
      acik.slice(0, 16).forEach((p) => lines.push(
        `    ${seq(p.target).padEnd(30)} ${p.length} talimat / ${p.bits} bit   muhur ${p.seal}`
      ));
      lines.push('');
      lines.push('  Cozmek icin: filiz coz <program>   (ornek: filiz coz INC OUT JNZ)');
      return lines.join('\n');
    };

    const how = () => [
      '] FILIZ nasil calisiyor',
      '',
      '  UC ORGAN',
      '    URETEC  butun kisa programlari tarar, ne urettiklerine bakar',
      '    ELEK    mekanik olarak eler ve REDDEDEBILIR; redlerini yayinlar',
      '    ZAR     hicbir sey siteye kendiliginden girmez: git diff + onay',
      '',
      '  UC KURAL (Anayasa Madde 6)',
      '    1. Dogrulayicisi olmayan sey uretilmez.',
      '       Bulmaca uretilebilir — calistirip bakariz.',
      '       Gecmis hakkinda hikaye uretilemez — calistiracak halimiz yok.',
      '    2. Elek reddedebilmeli. Red orani sifira duserse kapi bozulmustur.',
      '    3. Uretec kendi elegini, anayasasini ya da yayin ritualini uretemez.',
      '',
      '  Uretec ile elek AYNI motoru kullanir (okkam.js): olculen zorluk,',
      '  senin gordugun zorluktur.',
      '',
      '  Havuz: filiz · Kaynak: /assets/data/filiz.json'
    ].join('\n');

    // Ziyaretcinin cevabini DOGRULA. Cevap saklidir, dogrulugu degil.
    const verify = (raw, ops, runner) => {
      const tokens = String(raw || '').toUpperCase().split(/[\s,]+/).filter(Boolean);
      if (!tokens.length) return 'filiz: bir program ver. Ornek: filiz coz INC OUT JNZ';
      const program = tokens.map((token) => ops.indexOf(token));
      const bad = tokens.filter((token) => !ops.includes(token));
      if (bad.length) return `filiz: bilinmeyen opcode: ${bad.join(', ')}. Dili gormek icin: okkam dil`;
      if (program.length > 24) return 'filiz: program en fazla 24 talimat.';

      const acik = list('acik');
      if (!acik.length) return 'filiz: acik meydan okuma yok.';

      const out = Array.from(runner(program, 4096, 8).out);
      // Hangi acik hedefi tutturdu?
      const hit = acik.find((p) => p.target.every((value, i) => out[i] === value));
      if (!hit) {
        return [
          '] FILIZ coz',
          `  program ${tokens.join(' ')}`,
          `  cikti   [${out.join(', ')}]`,
          '',
          '  Bu cikti acik hedeflerin hicbirini tutturmuyor.',
          '  Acik listeyi gor: filiz acik'
        ].join('\n');
      }

      const bits = Math.round(program.length * 3);
      const lines = [
        '] FILIZ coz',
        `  hedef   ${seq(hit.target)}`,
        `  program ${tokens.join(' ')}`,
        `  uzunluk ${program.length} talimat = ${bits} bit`,
        ''
      ];
      if (sealOf(program) === hit.seal) {
        lines.push('  DOGRULANDI — FILIZ in bildigi programin ta kendisi.');
        lines.push('  OKKAM bunu arayarak bulamamisti. Sen buldun.');
      } else if (program.length < hit.length) {
        lines.push(`  MAKINE KAYBETTI — FILIZ ${hit.length} talimat biliyordu, sen ${program.length} buldun.`);
        lines.push('  Bu bir jest degil: arama uzayi ustel, insan sezgisi degil.');
      } else if (program.length === hit.length) {
        lines.push('  ESIT UZUNLUKTA baska bir program buldun. Ikisi de gecerli.');
      } else {
        lines.push(`  Tutuyor ama daha uzun: FILIZ ${hit.length} talimatlik bir program biliyor.`);
      }
      return lines.join('\n');
    };

    const navigation = () => deepFreeze(['filiz', 'filiz acik', 'okkam', 'cd /']);

    return deepFreeze({
      ready,
      overview,
      openList,
      how,
      verify,
      navigation,
      _dailyOpen: dailyOpen,
      _seal: sealOf
    });
  };
})();
