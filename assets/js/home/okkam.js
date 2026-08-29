(() => {
  'use strict';

  // OKKAM — en kisa program.
  //
  // Bir oruntunun kuralini aramak: hedef diziyi ureten EN KISA programi
  // evrensel (Levin) aramayla bul. Olcu bit cinsindendir (MDL, Rissanen).
  //
  // Serginin konusu makinenin gucu DEGIL, SINIRI: 8 opcode = 3 bit, yani
  // n talimatlik arama uzayi 8^n. 6 talimat 262 bin program, 9 talimat 134
  // milyon. Makine bir yerde durur ve bunu SOYLER. Insanin kazanmasi bir
  // tasarim jesti degil, hesaplanabilirligin dogal sonucudur.
  //
  // Bu modul SAFTIR: DOM yok, ag yok, zaman yok, rastgelelik yok.

  const root = window.ConviviumHome = window.ConviviumHome || {};

  const deepFreeze = (value) => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };

  // OKK-8: iki kayit (A, B) + cikti bandi. Sekiz opcode, hicbiri operand
  // tasimaz — operand olsaydi arama uzayi K^n olmaktan cikardi ve Levin
  // agirliklandirmasi anlamsizlasirdi.
  const OPS = Object.freeze(['INC', 'DEC', 'SWP', 'ADD', 'MUL', 'OUT', 'JNZ', 'CLR']);
  const K = OPS.length;
  const BITS_PER_OP = Math.log2(K);          // 3
  const MAX_MAGNITUDE = 1e12;
  const MAX_LENGTH = 9;                       // pratik tavan; asagida ilan edilir

  const describe = (program) => program.map((op) => OPS[op]).join(' ');

  // Yorumlayici. Butce ADIM cinsindendir, milisaniye degil (Kazi Evi, Madde 3):
  // yavas telefon ile hizli masaustu ayni p*'i bulur, yalniz bekleme degisir.
  const run = (program, budget, maxOut) => {
    let a = 0;
    let b = 0;
    let pc = 0;
    let steps = 0;
    const out = [];
    while (pc < program.length && steps < budget) {
      steps += 1;
      switch (program[pc]) {
        case 0: a += 1; break;
        case 1: a -= 1; break;
        case 2: { const t = a; a = b; b = t; break; }
        case 3: a += b; break;
        case 4: a *= b; break;
        case 5:
          out.push(a);
          if (out.length >= maxOut) return { out, steps, done: true };
          break;
        case 6: if (a !== 0) pc = -1; break;
        case 7: a = 0; break;
        default: break;
      }
      if (!Number.isSafeInteger(a) || Math.abs(a) > MAX_MAGNITUDE) {
        return { out, steps, overflow: true };
      }
      pc += 1;
    }
    return { out, steps, done: pc >= program.length };
  };

  root.createOkkam = function createOkkam(deps = {}) {
    const { getData = () => null, getDayKey = () => '1970-01-01' } = deps;

    // Kanonik numaralandirma + budama.
    // OUT icermeyen program hicbir hedefi tutturamaz: hic calistirilmadan elenir.
    function* enumerate(length) {
      const program = new Array(length).fill(0);
      for (;;) {
        if (program.includes(5)) yield program;
        let i = length - 1;
        while (i >= 0 && program[i] === K - 1) { program[i] = 0; i -= 1; }
        if (i < 0) return;
        program[i] += 1;
      }
    }

    const matches = (out, target) => {
      if (out.length < target.length) return false;
      for (let i = 0; i < target.length; i += 1) if (out[i] !== target[i]) return false;
      return true;
    };

    // Levin (evrensel) aramasi.
    //   faz p icin toplam butce 2^faz ADIM; her programa 2^(faz - |p|) dusar.
    //   Kisa programlar daha cok adim alir — Levin agirliklandirmasi budur.
    // maxTried ZORUNLU bir siniftir, sadece hiz ayari degil: onsuz ziyaretci
    // `okkam 7 13 2` yazip terminali dondurabilir. Butce ADIM ve DENEME
    // cinsindendir, milisaniye degil — yavas cihaz ayni sonucu bulur.
    const search = (target, { maxPhase = 10, maxLength = MAX_LENGTH, maxTried = 3_000_000 } = {}) => {
      let tried = 0;
      let skipped = 0;
      for (let phase = 1; phase <= maxPhase; phase += 1) {
        for (let length = 1; length <= Math.min(phase, maxLength); length += 1) {
          const budget = 2 ** (phase - length);
          if (budget < 1) continue;
          for (const program of enumerate(length)) {
            if (tried >= maxTried) {
              return deepFreeze({
                found: false, tried, skipped, maxPhase, maxLength, exhausted: true
              });
            }
            tried += 1;
            const result = run(program, budget, target.length);
            if (!matches(result.out, target)) { skipped += 1; continue; }
            return deepFreeze({
              found: true,
              program: program.slice(),
              text: describe(program),
              length: program.length,
              bits: Math.round(program.length * BITS_PER_OP),
              phase,
              tried,
              skipped
            });
          }
        }
      }
      return deepFreeze({ found: false, tried, skipped, maxPhase, maxLength });
    };

    // Ham dizinin bit maliyeti: MDL karsilastirmasinin tabani.
    // Kaba ama durust ust sinir — her terim icin isaret + buyukluk.
    const dataBits = (target) => target.reduce(
      (sum, value) => sum + Math.max(1, Math.ceil(Math.log2(Math.abs(value) + 2))) + 1,
      0
    );

    const puzzles = () => {
      const data = getData();
      return (data && Array.isArray(data.puzzles)) ? data.puzzles : [];
    };

    const ready = () => puzzles().length > 0;

    // Gunun dizisi deterministik secilir: ayni gun herkes ayni bulmacayi gorur.
    const hashKey = (key) => Array.from(String(key)).reduce(
      (total, char) => (total * 31 + char.charCodeAt(0)) >>> 0,
      11
    );

    const daily = () => {
      const list = puzzles();
      if (!list.length) return null;
      return list[hashKey(getDayKey()) % list.length];
    };

    const parseSequence = (raw) => String(raw || '')
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .map(Number)
      .filter((value) => Number.isSafeInteger(value));

    const renderResult = (target, result) => {
      const lines = [];
      const dataCost = dataBits(target);
      lines.push(`  hedef   [${target.join(', ')}]`);
      lines.push(`  ham veri  ${dataCost} bit`);
      lines.push('');

      if (!result.found) {
        lines.push(result.exhausted ? '  MAKINE PES ETTI (arama butcesi bitti).' : '  MAKINE BULAMADI.');
        lines.push(`  ${result.tried.toLocaleString('tr-TR')} program denendi.`);
        lines.push('');
        lines.push(`  Bu makine ${result.maxLength} talimattan uzun programi arayamaz:`);
        lines.push('  arama uzayi her talimatta 8 katina cikiyor.');
        lines.push(`    6 talimat -> ${(8 ** 6).toLocaleString('tr-TR')} program`);
        lines.push(`    9 talimat -> ${(8 ** 9).toLocaleString('tr-TR')} program`);
        lines.push('  Sen daha kisasini bulabilirsen makine kaybetmis olur.');
        return lines.join('\n');
      }

      const gain = Math.round(((dataCost - result.bits) / dataCost) * 100);
      lines.push(`  program ${result.text}`);
      lines.push(`  uzunluk ${result.length} talimat = ${result.bits} bit`);
      lines.push(`  kazanc  %${gain}  (${dataCost} bit veri -> ${result.bits} bit kural)`);
      lines.push('');
      lines.push(`  arama   faz ${result.phase}, ${result.tried.toLocaleString('tr-TR')} program denendi`);
      lines.push('');
      lines.push('  Daha kisasini bulursan makine kaybeder. Denemek icin:');
      lines.push('    okkam calistir INC OUT JNZ');
      return lines.join('\n');
    };

    // `okkam` — gunun dizisi, ya da verilen dizi.
    const solve = (raw = '') => {
      const query = String(raw || '').trim();

      if (!query) {
        const puzzle = daily();
        if (!puzzle) return 'okkam: bulmaca havuzu yuklenmedi. Birazdan tekrar dene.';
        const target = puzzle.target;
        const lines = [
          '] OKKAM — en kisa program',
          '  Bir oruntunun kuralini ariyoruz: bu diziyi ureten en KISA program hangisi?',
          '  Olcu bit cinsinden (MDL). Makine evrensel arama yapar; sen daha kisasini',
          '  bulabilirsen makine acikca kaybeder.',
          '',
          `  GUNUN DIZISI  (${puzzle.label})`,
          ''
        ];
        const result = search(target, { maxPhase: puzzle.phase, maxLength: puzzle.length });
        lines.push(renderResult(target, result));
        lines.push('');
        lines.push('  Kendi dizini dene: okkam 1 2 3 4');
        lines.push('  Dili gor:          okkam dil');
        return lines.join('\n');
      }

      if (/^dil$/i.test(query)) {
        // Ornek ciktilar ELLE YAZILMAZ, CALISTIRILARAK turetilir.
        // Elle yazildiginda makine uretmedigi bir ciktiyi ilan edebiliyordu:
        // `INC SWP ADD OUT INC JNZ` kareler sanilmisti, oysa 1, 4, 9, 17 verir.
        const demo = (text) => {
          const program = text.split(' ').map((op) => OPS.indexOf(op));
          const out = run(program, 400, 6).out;
          return `    ${text.padEnd(24)} -> ${out.join(', ')}, ...`;
        };
        return [
          '] OKK-8 — sekiz opcode, iki kayit (A, B), bir cikti bandi',
          '',
          '  INC   A = A + 1        ADD   A = A + B',
          '  DEC   A = A - 1        MUL   A = A * B',
          '  SWP   A ile B degisir  OUT   A yi banda yaz',
          '  CLR   A = 0            JNZ   A sifir degilse basa don',
          '',
          '  Hicbiri operand tasimaz. Tasisaydi arama uzayi 8^n olmaktan cikardi',
          '  ve Levin agirliklandirmasi anlamsizlasirdi.',
          '',
          '  Ornekler (ciktilar bu satirlar basilirken CALISTIRILDI):',
          demo('INC OUT JNZ'),
          demo('INC INC OUT JNZ'),
          demo('INC SWP ADD OUT INC JNZ'),
          '',
          '  Ucuncusune dikkat: ilk uc terimi 1, 4, 9 — kareler gibi duruyor,',
          '  sonra ayriliyor. En kisa programi aramanin zor olmasinin sebebi bu:',
          '  kisa ve YANLIS bir kural, uzun ve dogru olandan once bulunur.',
          '',
          '  Calistir: okkam calistir INC OUT JNZ'
        ].join('\n');
      }

      const runMatch = query.match(/^calistir\s+(.+)$/i);
      if (runMatch) {
        const tokens = runMatch[1].toUpperCase().split(/[\s,]+/).filter(Boolean);
        const program = tokens.map((token) => OPS.indexOf(token));
        if (program.some((op) => op === -1)) {
          const bad = tokens.filter((token) => !OPS.includes(token));
          return `okkam: bilinmeyen opcode: ${bad.join(', ')}. Dili gormek icin: okkam dil`;
        }
        if (!program.length || program.length > 24) {
          return 'okkam: program 1-24 talimat olmali.';
        }
        const result = run(program, 4096, 10);
        return [
          `] OKKAM calistir`,
          `  program ${describe(program)}`,
          `  uzunluk ${program.length} talimat = ${Math.round(program.length * BITS_PER_OP)} bit`,
          `  cikti   [${result.out.join(', ')}]${result.out.length ? '' : ' (bos)'}`,
          `  adim    ${result.steps}${result.overflow ? ' (tasma ile durdu)' : ''}`
        ].join('\n');
      }

      const target = parseSequence(query);
      if (target.length < 2) {
        return 'okkam: en az iki sayi ver. Ornek: okkam 1 2 3 4';
      }
      if (target.length > 8) {
        return 'okkam: en fazla sekiz terim aranabilir.';
      }

      const result = search(target, { maxPhase: 10 });
      return ['] OKKAM — arama', ''].concat(renderResult(target, result)).join('\n');
    };

    const navigation = () => deepFreeze(['okkam', 'okkam dil', 'cd /']);

    return deepFreeze({
      ready,
      solve,
      navigation,
      // Test ve ileriki dilimler icin.
      _ops: OPS,
      _run: run,
      _search: search,
      _daily: daily,
      _dataBits: dataBits
    });
  };
})();
