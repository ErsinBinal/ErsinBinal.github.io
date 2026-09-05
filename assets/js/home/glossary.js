(() => {
  'use strict';

  // GLOSSARY — terminalin sozlugu ve TEK kelime kaynagi.
  //
  // Bu dosya bir karar kaydidir: terminal kendi kelimelerini UYDURMAYI birakti.
  // Onceden "karot", "taban kaya", "elek", "zar", "muhur" gibi bize ozgu
  // terimler vardi; hicbiri disarida bir sey ifade etmiyordu. Yerlerine
  // git/unix/bilgisayar biliminin ZATEN kullandigi terimler kondu.
  //
  // Kural: bir kavramin gercek dunyada adi varsa, yeni ad uydurulmaz.
  // Yeni ad ancak gercekten yeni bir sey icin konur (OKKAM'in OKK-8 dili gibi).
  //
  // `whatis <terim>` ve `apropos <kelime>` bu tablodan beslenir; iki komut da
  // gercek unix komutlaridir ve burada ayni isi yaparlar.

  const root = window.ConviviumHome = window.ConviviumHome || {};

  const deepFreeze = (value) => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };

  // kaynak: terimin geldigi yer. Ziyaretci "bu bize mi ozgu?" diye sorabilmeli.
  const TERMS = {
    // --- git / surum kontrolu ---
    commit: {
      tr: 'depoya kaydedilmis tek bir degisiklik',
      kaynak: 'git',
      uzun: 'Bir anlik goruntu: kim, ne zaman, hangi dosyalarda ne degistirdi.',
      bkz: ['log', 'diff', 'root commit']
    },
    'root commit': {
      tr: 'deponun ilk commit i — uzerinde durdugu zemin',
      kaynak: 'git',
      uzun: 'Gecmise dogru gidebilecegin en son nokta. Onceden "taban kaya" derdik.',
      bkz: ['commit', 'log']
    },
    diff: {
      tr: 'iki hal arasindaki fark',
      kaynak: 'git / unix',
      uzun: 'Neyin eklendigi, neyin silindigi. Sitede uretilen hicbir sey diff ten gecmeden yayina girmez.',
      bkz: ['commit', 'gate']
    },
    blame: {
      tr: 'bir satirin hangi commit ten geldigini gosterir',
      kaynak: 'git',
      uzun: 'Suclamak icin degil, izini surmek icin.',
      bkz: ['log', 'commit']
    },

    // --- veri / arama ---
    index: {
      tr: 'aranabilir hale getirilmis icerik listesi',
      kaynak: 'bilgi erisimi (information retrieval)',
      uzun: 'Sitenin butun yazilari onceden taranip bir indekse konur; arama internetsiz calisir.',
      bkz: ['search', 'BM25']
    },
    BM25: {
      tr: 'arama sonuclarini siralayan standart formul',
      kaynak: 'bilgi erisimi, 1994',
      uzun: 'Nadir kelimelere daha cok, uzun metinlere daha az puan verir. Sitede gercekten bu kullaniliyor.',
      bkz: ['index', 'search']
    },
    cluster: {
      tr: 'birlikte degisen dosya kumesi',
      kaynak: 'graf teorisi (community detection)',
      uzun: 'Louvain algoritmasiyla bulunur. Onceden "damar" derdik.',
      bkz: ['log', 'commit']
    },
    epoch: {
      tr: 'deponun karakterinin degistigi donem',
      kaynak: 'degisim noktasi analizi (changepoint detection)',
      uzun: 'PELT algoritmasiyla BULUNUR, elle yazilmaz. Onceden "devir" derdik.',
      bkz: ['log', 'commit']
    },

    // --- hash / dogrulama ---
    checksum: {
      tr: 'bir seyin bozulup bozulmadigini anlatan kisa sayi',
      kaynak: 'bilgisayar bilimi',
      uzun: 'Sitede FNV-1a kullanilir. Kriptografik degil ve oyle sunulmuyor: amaci dogrulamak, gizlemek degil. Onceden "muhur" derdik.',
      bkz: ['digest', 'trace']
    },
    digest: {
      tr: 'bir icerigi temsil eden kisa, sabit uzunlukta ozet',
      kaynak: 'hashing',
      uzun: 'Paylasilabilir adreslerin (#iz=...) icinde bu var.',
      bkz: ['checksum', 'trace']
    },
    trace: {
      tr: 'bir kararin yeniden oynatilabilir kaydi',
      kaynak: 'yazilim / hata ayiklama',
      uzun: 'Sitenin temel nesnesi. Sonucu degil, sonuca NASIL varildigini tasir.',
      bkz: ['digest', 'step']
    },

    // --- uretim / CI ---
    generator: {
      tr: 'aday ureten parca',
      kaynak: 'yazilim',
      uzun: 'Sitenin atolyesinde butun kisa programlari tarayan kisim. Onceden "uretec" derdik.',
      bkz: ['filter', 'gate', 'fuzz']
    },
    filter: {
      tr: 'adaylari mekanik olarak eleyen parca',
      kaynak: 'yazilim',
      uzun: 'Reddedebilmek zorundadir. Hicbir seyi elemeyen filtre bozuktur. Onceden "elek" derdik.',
      bkz: ['generator', 'gate']
    },
    gate: {
      tr: 'gecise izin veren ya da vermeyen kontrol noktasi',
      kaynak: 'CI/CD (surekli entegrasyon)',
      uzun: 'Uretilen sey siteye ancak buradan gecerek girer. Onceden "zar" derdik.',
      bkz: ['filter', 'diff', 'CI']
    },
    CI: {
      tr: 'her degisiklikte otomatik calisan kontrol hatti',
      kaynak: 'continuous integration',
      uzun: 'GitHub Actions. Gece uretimi de burada kosar.',
      bkz: ['gate', 'diff']
    },
    fuzz: {
      tr: 'otomatik aday uretip eleyerek yeni sey bulma',
      kaynak: 'yazilim guvenligi / test',
      uzun: 'Normalde hata aramak icin kullanilir; burada bulmaca uretmek icin.',
      bkz: ['generator', 'filter', 'gate']
    },
    artifact: {
      tr: 'bir uretimin ciktisi olan dosya',
      kaynak: 'build sistemleri',
      uzun: 'Onceden "kalinti" derdik — ama o kelime arkeoloji anlatisindan geliyordu, teknik karsiligi bu.',
      bkz: ['gate', 'CI']
    },

    // --- algoritma ---
    MDL: {
      tr: 'en kisa aciklama ilkesi — kural, veriden ucuzsa gercek kuraldir',
      kaynak: 'Rissanen, 1978 (minimum description length)',
      uzun: 'Olcu bit cinsindendir. OKKAM bunu kullanir.',
      bkz: ['Levin', 'Kolmogorov']
    },
    Levin: {
      tr: 'butun programlari kisadan uzuna, adil butceyle deneyen arama',
      kaynak: 'Leonid Levin, 1973',
      uzun: 'Kisa programlara daha cok adim verir. Sitede gercekten kosuyor.',
      bkz: ['MDL', 'Kolmogorov']
    },
    Kolmogorov: {
      tr: 'bir seyin karmasikligi = onu ureten en kisa program',
      kaynak: 'Kolmogorov, 1963',
      uzun: 'Hesaplanamaz — bu yuzden makine bir yerde durur ve bunu soyler.',
      bkz: ['MDL', 'Levin']
    },
    PELT: {
      tr: 'bir dizinin nerede karakter degistirdigini bulan algoritma',
      kaynak: 'Killick ve ark., 2012',
      uzun: 'Deponun donemlerini (epoch) BULUR; kimse elle yazmaz.',
      bkz: ['epoch', 'log']
    },
    Louvain: {
      tr: 'grafta birlikte hareket eden kumeleri bulan algoritma',
      kaynak: 'Blondel ve ark., 2008',
      uzun: 'Birlikte degisen dosyalari (cluster) bulur.',
      bkz: ['cluster', 'log']
    },

    // --- sergiler (ozel ad — ama ne oldugu burada yazili) ---
    TORTU: {
      tr: 'deponun kendi gecmisini kazan sergi',
      kaynak: 'bu siteye ozel ad',
      uzun: 'Ingilizce karsiligi: repository archaeology. Komut: kaz / dig / blame.',
      bkz: ['log', 'commit', 'epoch', 'cluster']
    },
    OKKAM: {
      tr: 'bir diziyi ureten en kisa programi arayan sergi',
      kaynak: 'bu siteye ozel ad (Ockham in usturasi)',
      uzun: 'Ingilizce karsiligi: program synthesis by universal search.',
      bkz: ['MDL', 'Levin', 'Kolmogorov']
    },
    FILIZ: {
      tr: 'sitenin kendi bulmacalarini urettigi atolye',
      kaynak: 'bu siteye ozel ad',
      uzun: 'Ingilizce karsiligi: fuzzing + filter + CI gate. Komut: filiz / fuzz.',
      bkz: ['generator', 'filter', 'gate', 'fuzz']
    },
    SIGIL: {
      tr: 'bir izi 40 bayta sikistiran paylasilabilir adres',
      kaynak: 'bu siteye ozel ad',
      uzun: 'Ingilizce karsiligi: permalink + digest.',
      bkz: ['digest', 'checksum', 'trace']
    },
    ARSIV: {
      tr: 'internetsiz calisan site arama motoru',
      kaynak: 'bu siteye ozel ad',
      uzun: 'Ingilizce karsiligi: offline full-text search. Komut: ara / bul / search.',
      bkz: ['index', 'BM25']
    }
  };

  const norm = (value) => String(value || '').trim().toLowerCase();

  root.createGlossary = function createGlossary() {
    const keys = Object.keys(TERMS);

    const find = (term) => {
      const q = norm(term);
      const exact = keys.find((k) => norm(k) === q);
      if (exact) return exact;
      return keys.find((k) => norm(k).startsWith(q)) || null;
    };

    // whatis <terim> — gercek unix komutu: tek satirlik tanim.
    const whatis = (raw) => {
      const q = norm(raw);
      if (!q) {
        return [
          '] whatis — terim sozlugu',
          '  Kullanim: whatis <terim>      ornek: whatis checksum',
          '  Kelimeye gore ara: apropos <kelime>',
          '',
          `  ${keys.length} terim kayitli:`,
          ...chunk(keys, 6).map((row) => `    ${row.join(' · ')}`)
        ].join('\n');
      }
      const key = find(q);
      if (!key) {
        return `whatis: "${raw}" sozlukte yok. Kelimeye gore aramak icin: apropos ${raw}`;
      }
      const entry = TERMS[key];
      const lines = [
        `] ${key}`,
        `  ${entry.tr}`,
        '',
        `  kaynak  ${entry.kaynak}`
      ];
      if (entry.uzun) lines.push(`  ${entry.uzun}`);
      if (entry.bkz && entry.bkz.length) lines.push('', `  bkz: ${entry.bkz.join(' · ')}`);
      return lines.join('\n');
    };

    // apropos <kelime> — gercek unix komutu: aciklamalarda arar.
    const apropos = (raw) => {
      const q = norm(raw);
      if (!q) return 'apropos: bir kelime ver. Ornek: apropos hash';
      const hits = keys.filter((k) => {
        const e = TERMS[k];
        return norm(k).includes(q)
          || norm(e.tr).includes(q)
          || norm(e.uzun || '').includes(q)
          || norm(e.kaynak).includes(q);
      });
      if (!hits.length) return `apropos: "${raw}" ile eslesen terim yok.`;
      return [`] apropos ${raw} — ${hits.length} sonuc`, '']
        .concat(hits.map((k) => `  ${k.padEnd(14)} ${TERMS[k].tr}`))
        .join('\n');
    };

    function chunk(list, size) {
      const out = [];
      for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
      return out;
    }

    return deepFreeze({
      whatis,
      apropos,
      has: (term) => Boolean(find(term)),
      size: () => keys.length,
      _terms: TERMS
    });
  };
})();
