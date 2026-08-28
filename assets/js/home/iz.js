(() => {
  'use strict';

  // IZ — kararin kendi kaydi.
  //
  // Kazi Evi, Madde 2: karar mantigi {value, why} dondurur. IZ bunun kare kare
  // halidir: bir algoritmanin adimlarini, sinirini ve her adimda NEDEN o secimi
  // yaptigini tasir.
  //
  // `step <komut>` komutu CALISTIRMAZ; karar fonksiyonunu iz kipinde cagirir.
  // Bu, D3'un "saf karar mantigi modulde" kuralinin bedava sonucudur.
  //
  // Bu modul SAFTIR: DOM yok, ag yok, zaman yok.

  const root = window.ConviviumHome = window.ConviviumHome || {};

  const deepFreeze = (value) => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };

  const IZ_VERSION = 1;

  // navigator.js'teki canli erken cikis. Sergi bunu TAKLIT ETMEK zorunda:
  // aksi halde makinenin ne yaptigi hakkinda yalan soyler.
  const LENGTH_GUARD = 2;
  const GUARD_VALUE = 99;

  root.createIz = function createIz() {
    // --- Levenshtein: sergilenebilir uygulama ----------------------------
    //
    // UYARI (kaynakta kayitli): navigator.js rolling DP kullanir ve matris
    // tutmaz. Sergi icin ikinci bir uygulama gerekti. Ikisinin AYNI mesafeyi
    // vermesi bir kabul kriteridir — birim testte capraz dogrulaniyor.
    const traceLevenshtein = (leftRaw, rightRaw) => {
      const left = String(leftRaw || '');
      const right = String(rightRaw || '');
      const frames = [];

      // Erken cikis bir kusur degil, serginin konusu: makine bu cifti HIC
      // hesaplamaz. Gostermek, gizlemekten daha ogretici.
      if (Math.abs(left.length - right.length) > LENGTH_GUARD) {
        frames.push({
          i: 0,
          op: 'budama',
          delta: null,
          secilen: null,
          why: [
            { etken: 'uzunluk farki', deger: Math.abs(left.length - right.length), katki: 0 },
            { etken: 'esik', deger: LENGTH_GUARD, katki: 0 },
            { etken: 'sonuc', deger: `hic hesaplanmadi (${GUARD_VALUE})`, katki: 0 }
          ]
        });
        return deepFreeze({
          v: IZ_VERSION,
          tur: 'lev-typo',
          tohum: `${left}|${right}`,
          girdi: { left, right },
          kareler: frames,
          sonuc: GUARD_VALUE,
          budandi: true,
          matris: null,
          yol: [],
          meta: {
            algo: 'Levenshtein mesafesi (dinamik programlama)',
            kaynak: 'assets/js/home/navigator.js editDistance'
          }
        });
      }

      const rows = left.length + 1;
      const cols = right.length + 1;
      const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));
      const parent = Array.from({ length: rows }, () => new Array(cols).fill(null));

      for (let i = 0; i < rows; i += 1) { matrix[i][0] = i; if (i) parent[i][0] = 'sil'; }
      for (let j = 0; j < cols; j += 1) { matrix[0][j] = j; if (j) parent[0][j] = 'ekle'; }

      let step = 0;
      for (let i = 1; i < rows; i += 1) {
        for (let j = 1; j < cols; j += 1) {
          const same = left[i - 1] === right[j - 1];
          const substitute = matrix[i - 1][j - 1] + (same ? 0 : 1);
          const remove = matrix[i - 1][j] + 1;
          const insert = matrix[i][j - 1] + 1;

          const options = [
            { op: same ? 'esit' : 'degistir', value: substitute },
            { op: 'sil', value: remove },
            { op: 'ekle', value: insert }
          ];
          // Esitlikte kosegen kazanir: hem klasik hem deterministik.
          const best = options.reduce((winner, option) => (option.value < winner.value ? option : winner));

          matrix[i][j] = best.value;
          parent[i][j] = best.op;
          step += 1;

          frames.push({
            i: step,
            op: 'hucre',
            delta: { i, j, deger: best.value },
            secilen: best.op,
            why: [
              { etken: 'harfler', deger: `${left[i - 1]} / ${right[j - 1]}`, katki: same ? 0 : 1 },
              { etken: 'degistir', deger: substitute, katki: substitute },
              { etken: 'sil', deger: remove, katki: remove },
              { etken: 'ekle', deger: insert, katki: insert }
            ]
          });
        }
      }

      // Geri izleme: sonuctan baslangica hangi yol izlendi.
      const path = [];
      let i = rows - 1;
      let j = cols - 1;
      while (i > 0 || j > 0) {
        const op = parent[i][j];
        path.unshift({ i, j, op, deger: matrix[i][j] });
        if (op === 'sil') i -= 1;
        else if (op === 'ekle') j -= 1;
        else { i -= 1; j -= 1; }
      }

      return deepFreeze({
        v: IZ_VERSION,
        tur: 'lev-typo',
        tohum: `${left}|${right}`,
        girdi: { left, right },
        kareler: frames,
        sonuc: matrix[rows - 1][cols - 1],
        budandi: false,
        matris: matrix.map((row) => row.slice()),
        yol: path,
        meta: {
          algo: 'Levenshtein mesafesi (dinamik programlama)',
          kaynak: 'assets/js/home/navigator.js editDistance'
        }
      });
    };

    // --- Oneri gerekcesi izi ---------------------------------------------
    // navigator.suggest zaten {value, why, score} donduruyor (Faz 0.3).
    // Burada o karar bir IZ nesnesine sarilir: ayni oynatici, ayni bicim.
    const traceSuggest = (query, suggestions) => {
      const list = Array.isArray(suggestions) ? suggestions : [];
      return deepFreeze({
        v: IZ_VERSION,
        tur: 'nav-why',
        tohum: String(query || ''),
        girdi: { query: String(query || '') },
        kareler: list.map((item, index) => ({
          i: index + 1,
          op: 'aday',
          delta: { deger: item.score },
          secilen: item.value,
          why: Array.isArray(item.why) ? item.why : []
        })),
        sonuc: list.length ? list[0].value : null,
        budandi: false,
        matris: null,
        yol: [],
        meta: {
          algo: 'oneri siralamasi (onek + alias + baglam + cekirdek + yazim mesafesi)',
          kaynak: 'assets/js/home/navigator.js suggest'
        }
      });
    };

    // --- Cizim -------------------------------------------------------------

    // Yol hucreleri [n] ile isaretlenir. Isaretin hangi sayiya ait oldugu
    // belirsiz kalmamali: yildiz sayidan once basilinca "1*" okunusu yaniltiyordu.
    const renderMatrix = (iz) => {
      const { left, right } = iz.girdi;
      const lines = [];
      lines.push(['     ', ' -- '].concat(Array.from(right, (c) => ` ${c}  `)).join(''));
      iz.matris.forEach((row, i) => {
        const label = i === 0 ? '-' : left[i - 1];
        const cells = row.map((value, j) => {
          const onPath = iz.yol.some((node) => node.i === i && node.j === j);
          const text = String(value).padStart(2);
          return onPath ? `[${text}]` : ` ${text} `;
        });
        lines.push(`  ${label} ${cells.join('')}`);
      });
      return lines;
    };

    const render = (iz) => {
      if (!iz) return 'step: iz uretilemedi.';
      const lines = [
        `] IZ · ${iz.tur}`,
        `  algo    ${iz.meta.algo}`,
        `  kaynak  ${iz.meta.kaynak}`,
        `  girdi   ${iz.tohum}`,
        ''
      ];

      if (iz.tur === 'lev-typo') {
        if (iz.budandi) {
          lines.push('  BUDANDI — makine bu cifti hic hesaplamadi.');
          iz.kareler[0].why.forEach((part) => lines.push(`    ${part.etken}: ${part.deger}`));
          lines.push('', `  sonuc: ${iz.sonuc} (hesaplanmadi, esik disi)`);
          return lines.join('\n');
        }
        lines.push(`  ${iz.kareler.length} hucre hesaplandi. [koseli parantez] geri izleme yolu.`);
        lines.push('');
        renderMatrix(iz).forEach((line) => lines.push(line));
        lines.push('', '  --- yol ---');
        iz.yol.forEach((node) => {
          const label = { esit: 'esit (bedava)', degistir: 'degistir', sil: 'sil', ekle: 'ekle' }[node.op] || node.op;
          lines.push(`    (${node.i},${node.j})  ${label.padEnd(16)} -> ${node.deger}`);
        });
        lines.push('', `  sonuc: mesafe = ${iz.sonuc}`);
        return lines.join('\n');
      }

      if (iz.tur === 'nav-why') {
        if (!iz.kareler.length) {
          lines.push('  Bu girdi icin aday uretilmedi.');
          return lines.join('\n');
        }
        iz.kareler.forEach((frame) => {
          lines.push(`  ${frame.i}. ${frame.secilen}   toplam ${frame.delta.deger}`);
          frame.why.forEach((part) => {
            const sign = part.katki >= 0 ? '+' : '';
            lines.push(`       ${part.etken}: ${part.deger} -> ${sign}${part.katki}`);
          });
        });
        lines.push('', `  secilen: ${iz.sonuc}`);
        return lines.join('\n');
      }

      return lines.join('\n');
    };

    // Iz tasinmaz, yeniden turetilir: hash bir kimlik degil, DETERMINIZM kanitidir.
    const hash = (iz) => {
      const canonical = JSON.stringify({
        v: iz.v, tur: iz.tur, tohum: iz.tohum, sonuc: iz.sonuc,
        kareler: iz.kareler.map((f) => [f.i, f.op, f.secilen, f.why.map((w) => [w.etken, w.deger, w.katki])])
      });
      let value = 0x811c9dc5;
      for (let i = 0; i < canonical.length; i += 1) {
        value ^= canonical.charCodeAt(i) & 0xff;
        value = Math.imul(value, 0x01000193) >>> 0;
      }
      return (value >>> 0).toString(16).padStart(8, '0');
    };

    return deepFreeze({
      traceLevenshtein,
      traceSuggest,
      render,
      hash
    });
  };
})();
