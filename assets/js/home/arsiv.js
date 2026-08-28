(() => {
  'use strict';

  // ARSIV — cevrimdisi arama.
  //
  // Oracle bir Worker'dan gecer ve maliyetlidir. Bu arama tamamen tarayicida,
  // tamamen cevrimdisi ve bedava calisir.
  //
  // Skor DOKULUR: hangi terimin ne kadar katki verdigi gorunur. "Neden bu
  // pasaj?" sorusunun cevabi gomu ile verilemezdi; BM25 ile verilebilir.
  // Gorunurluk icin leksik omurga secildi (Kazi Evi, Madde 2).
  //
  // Bu modul SAFTIR: DOM yok, ag yok.

  const root = window.ConviviumHome = window.ConviviumHome || {};

  const deepFreeze = (value) => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };

  // Build betigiyle AYNI normalizasyon olmak zorunda: ayrisirsa sorgu
  // indekste hicbir seye denk gelmez. Birim test ikisini karsilastirir.
  const TR_MAP = { 'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c', 'İ': 'i', 'Ğ': 'g', 'Ü': 'u', 'Ş': 's', 'Ö': 'o', 'Ç': 'c' };

  const foldTurkish = (text) => String(text)
    .replace(/[ıİğĞüÜşŞöÖçÇ]/g, (c) => TR_MAP[c] || c)
    .toLowerCase();

  const SUFFIXES = [
    'lardan', 'lerden', 'larin', 'lerin', 'lara', 'lere', 'ları', 'leri',
    'imiz', 'iniz', 'lar', 'ler', 'dan', 'den', 'tan', 'ten', 'nin', 'nın',
    'nun', 'nun', 'ile', 'ken', 'dir', 'dır', 'mek', 'mak', 'siz', 'sız',
    'lik', 'lık', 'luk', 'luk', 'ci', 'cı', 'da', 'de', 'ta', 'te', 'in',
    'ın', 'un', 'un', 'la', 'le', 'ya', 'ye', 'yi', 'yı', 'si', 'sı', 'i', 'e', 'a'
  ];

  const trimSuffix = (word) => {
    for (const suffix of SUFFIXES) {
      if (word.length - suffix.length >= 3 && word.endsWith(suffix)) {
        return word.slice(0, word.length - suffix.length);
      }
    }
    return word;
  };

  const STOPWORDS = new Set([
    've', 'ile', 'bir', 'bu', 'da', 'de', 'icin', 'gibi', 'ama', 'ya', 'ki',
    'the', 'and', 'for', 'that', 'with', 'this', 'you', 'are', 'not', 'but'
  ]);

  const tokenize = (text) => foldTurkish(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 2 && !STOPWORDS.has(word))
    .map(trimSuffix)
    .filter((word) => word.length >= 2);

  root.createArsiv = function createArsiv(deps = {}) {
    const { getData = () => null } = deps;

    const ready = () => {
      const data = getData();
      return Boolean(data && Array.isArray(data.docs) && data.docs.length);
    };

    // Okapi BM25 (Robertson & Sparck Jones).
    //   idf = ln(1 + (N - df + 0.5) / (df + 0.5))
    //   skor = idf * tf*(k1+1) / (tf + k1*(1 - b + b*len/avgdl))
    const score = (query) => {
      const data = getData();
      if (!ready()) return [];
      const { k1, b } = data.bm25;
      const N = data.docs.length;
      const terms = tokenize(query);
      if (!terms.length) return [];

      const totals = new Map();
      const detail = new Map();

      for (const term of terms) {
        const termId = data.vocab.indexOf(term);
        if (termId === -1) continue;
        const postings = data.post[termId] || [];
        const df = postings.length;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        for (const [docId, tf] of postings) {
          const len = data.docs[docId].l;
          const norm = tf * (k1 + 1) / (tf + k1 * (1 - b + b * (len / data.avgdl)));
          const contribution = idf * norm;
          totals.set(docId, (totals.get(docId) || 0) + contribution);
          if (!detail.has(docId)) detail.set(docId, []);
          detail.get(docId).push({
            terim: term,
            df,
            tf,
            // Skor dokumunde float gostermek yaniltici: tamsayilastir (Madde 5).
            katki: Math.round(contribution * 1000)
          });
        }
      }

      return [...totals.entries()]
        .map(([docId, total]) => ({
          docId,
          skor: Math.round(total * 1000),
          why: detail.get(docId).sort((left, right) => right.katki - left.katki)
        }))
        // Siralama float'a degil TAMSAYI skora bakar; esitlikte docId ile
        // kesin ve deterministik cozulur (Madde 5).
        .sort((left, right) => right.skor - left.skor || left.docId - right.docId);
    };

    // Maximal Marginal Relevance (Carbonell & Goldstein 1998).
    // Ham BM25 ayni kaynaktan bes pasaj getirebilir; MMR alaka ile cesitliligi
    // dengeler. Benzerlik olcusu: ayni kaynak + ayni rota.
    const mmr = (ranked, limit, lambda = 0.7) => {
      const data = getData();
      const chosen = [];
      const pool = [...ranked];
      while (chosen.length < limit && pool.length) {
        let bestIndex = 0;
        let bestValue = -Infinity;
        pool.forEach((candidate, index) => {
          const doc = data.docs[candidate.docId];
          const penalty = chosen.reduce((worst, picked) => {
            const other = data.docs[picked.docId];
            const similarity = (doc.s === other.s ? 0.6 : 0) + (doc.r === other.r ? 0.4 : 0);
            return Math.max(worst, similarity);
          }, 0);
          const value = lambda * candidate.skor - (1 - lambda) * penalty * candidate.skor;
          if (value > bestValue) { bestValue = value; bestIndex = index; }
        });
        chosen.push(pool.splice(bestIndex, 1)[0]);
      }
      return chosen;
    };

    const search = (query, { limit = 5 } = {}) => {
      if (!ready()) return null;
      const ranked = score(query);
      if (!ranked.length) return deepFreeze({ query, hits: [], total: 0 });
      const data = getData();
      const picked = mmr(ranked, Math.min(limit, ranked.length));
      return deepFreeze({
        query,
        total: ranked.length,
        hits: picked.map((hit) => ({
          ...data.docs[hit.docId],
          skor: hit.skor,
          why: hit.why.slice(0, 4)
        }))
      });
    };

    const render = (query) => {
      if (!ready()) return 'ara: arsiv indeksi henuz yuklenmedi. Birazdan tekrar dene.';
      const clean = String(query || '').trim();
      if (!clean) {
        return [
          'ara: usage ara <sorgu>',
          'Arsiv tamamen cevrimdisi taranir; skor dokumu gorunur.'
        ].join('\n');
      }
      const result = search(clean);
      if (!result || !result.hits.length) {
        return `ara: "${clean}" arsivde bulunamadi. ${getData().docs.length} pasaj tarandi.`;
      }

      const lines = [
        `] ARSIV · "${clean}"`,
        `  ${result.total} pasaj eslesti, ${result.hits.length} tanesi gosteriliyor.`,
        ''
      ];
      result.hits.forEach((hit, index) => {
        lines.push(`  ${index + 1}. [${hit.s}] ${hit.t}   skor ${hit.skor}`);
        lines.push(`     ${hit.x.slice(0, 150)}${hit.x.length > 150 ? '...' : ''}`);
        const parts = hit.why.map((w) => `${w.terim} (df ${w.df}, tf ${w.tf}) +${w.katki}`);
        lines.push(`     neden: ${parts.join(' · ')}`);
        lines.push(`     rota:  ${hit.r}`);
        lines.push('');
      });
      lines.push('  BM25 (k1=1.2, b=0.75) + MMR cesitlilik. Tamamen tarayicida, cevrimdisi.');
      return lines.join('\n');
    };

    const stats = () => {
      if (!ready()) return 'arsiv: indeks yuklenmedi.';
      const data = getData();
      const bySource = new Map();
      data.docs.forEach((doc) => bySource.set(doc.s, (bySource.get(doc.s) || 0) + 1));
      const lines = [
        '] ARSIV',
        `  ${data.docs.length} pasaj · ${data.vocab.length} terim · ortalama ${data.avgdl} token`,
        ''
      ];
      [...bySource.entries()]
        .sort((left, right) => right[1] - left[1])
        .forEach(([source, count]) => lines.push(`  ${String(count).padStart(4)}  ${source}`));
      lines.push('', '  Tamamen cevrimdisi. Skor dokumu icin: ara <sorgu>');
      return lines.join('\n');
    };

    return deepFreeze({
      ready,
      search,
      render,
      stats,
      _tokenize: tokenize
    });
  };
})();
