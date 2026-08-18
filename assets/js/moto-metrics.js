/**
 * Demir At Terazisi - hesap cekirdegi
 *
 * Saf fonksiyonlar; DOM'a dokunmaz, rastgelelik icermez. Ayni girdi her zaman
 * ayni ciktiyi verir (Convivium determinizm kurali). Testleri:
 * tests/unit/moto-metrics.test.mjs
 */
(() => {
  // Ham olcumler + oranlar. `lowerIsBetter` olan eksende kucuk deger iyidir.
  const METRICS = Object.freeze([
    Object.freeze({ key: 'weight', label: 'ağırlık', unit: 'kg', decimals: 0, group: 'raw' }),
    Object.freeze({ key: 'power', label: 'beygir', unit: 'hp', decimals: 1, group: 'raw' }),
    Object.freeze({ key: 'torque', label: 'tork', unit: 'Nm', decimals: 1, group: 'raw' }),
    Object.freeze({ key: 'hpPerTon', label: 'güç/ağırlık', unit: 'hp/ton', decimals: 0, group: 'derived' }),
    Object.freeze({ key: 'nmPer100', label: 'tork/ağırlık', unit: 'Nm/100kg', decimals: 1, group: 'derived' }),
    Object.freeze({ key: 'kgPerHp', label: 'şasi borcu', unit: 'kg/hp', decimals: 2, group: 'derived', lowerIsBetter: true })
  ]);

  const METRIC_BY_KEY = Object.freeze(Object.fromEntries(METRICS.map((metric) => [metric.key, metric])));

  function derive(bike) {
    const kg = bike.weight.kg;
    const hp = bike.power.hp;
    return {
      hpPerTon: (hp / kg) * 1000,
      nmPer100: (bike.torque.nm / kg) * 100,
      kgPerHp: kg / hp
    };
  }

  function valueOf(bike, key) {
    if (key === 'weight') return bike.weight.kg;
    if (key === 'power') return bike.power.hp;
    if (key === 'torque') return bike.torque.nm;
    const derived = derive(bike);
    if (key in derived) return derived[key];
    throw new Error(`Bilinmeyen metrik: ${key}`);
  }

  // Dogrusal enterpolasyonlu yuzdelik; tek bir uc deger (ornegin 1868cc bir
  // cruiser) butun barlari ezmesin diye olcek %5-%95 arasina kirpilir.
  function quantile(sortedValues, ratio) {
    if (!sortedValues.length) return 0;
    const position = (sortedValues.length - 1) * ratio;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper) return sortedValues[lower];
    return sortedValues[lower] + ((sortedValues[upper] - sortedValues[lower]) * (position - lower));
  }

  function median(values) {
    return quantile([...values].sort((a, b) => a - b), 0.5);
  }

  const clamp01 = (value) => Math.min(1, Math.max(0, value));

  /**
   * Iki olcum kipi:
   *  - 'garaj': tum garajin %5-%95 araligina gore mutlak konum.
   *  - 'sinif': motorun KENDI sinifinin medyanina orani (log2, +-1 kat kirpma).
   *    Sinif basina iki motor oldugu icin min-max dejenere olurdu; oran anlamli
   *    kalir ("sinif medyaninin 1.6 kati tork").
   */
  function buildScale(garage, mode = 'garaj') {
    if (mode === 'sinif') {
      const medians = new Map();
      for (const metric of METRICS) {
        for (const bike of garage) {
          const cacheKey = `${bike.class}:${metric.key}`;
          if (medians.has(cacheKey)) continue;
          const peers = garage.filter((other) => other.class === bike.class);
          medians.set(cacheKey, median(peers.map((peer) => valueOf(peer, metric.key))));
        }
      }
      return (bike, key) => {
        const reference = medians.get(`${bike.class}:${key}`);
        if (!reference) return 0.5;
        const ratio = Math.log2(valueOf(bike, key) / reference);
        return clamp01((ratio + 1) / 2);
      };
    }

    const ranges = new Map();
    for (const metric of METRICS) {
      const sorted = garage.map((bike) => valueOf(bike, metric.key)).sort((a, b) => a - b);
      ranges.set(metric.key, { lo: quantile(sorted, 0.05), hi: quantile(sorted, 0.95) });
    }
    return (bike, key) => {
      const range = ranges.get(key);
      if (!range || range.hi === range.lo) return 0.5;
      return clamp01((valueOf(bike, key) - range.lo) / (range.hi - range.lo));
    };
  }

  // Garaj icindeki yuzdelik sira (1 = en yuksek deger).
  function rankInGarage(garage, bike, key) {
    const values = garage.map((other) => valueOf(other, key)).sort((a, b) => b - a);
    return { rank: values.indexOf(valueOf(bike, key)) + 1, total: values.length };
  }

  function rankInClass(garage, bike, key) {
    const peers = garage.filter((other) => other.class === bike.class);
    const values = peers.map((peer) => valueOf(peer, key)).sort((a, b) => b - a);
    return { rank: values.indexOf(valueOf(bike, key)) + 1, total: peers.length };
  }

  /**
   * Pareto siniri: agirlik dusuk + beygir yuksek duzleminde domine EDILMEYENLER.
   * "Hem hafif hem guclu" kumesini tek bakista verir.
   */
  function paretoFront(garage) {
    return garage
      .filter((bike) => !garage.some((other) => (
        other.id !== bike.id
        && other.weight.kg <= bike.weight.kg
        && other.power.hp >= bike.power.hp
        && (other.weight.kg < bike.weight.kg || other.power.hp > bike.power.hp)
      )))
      .map((bike) => bike.id);
  }

  const shortName = (bike) => `${bike.model}`;
  const round = (value, decimals = 1) => Number(value.toFixed(decimals));
  const relativeGap = (a, b) => Math.abs(a - b) / Math.max(a, b);

  /**
   * Bilanco grameri: kural tablosu oncelik sirasiyla taranir, ilk eslesen sablon
   * secilir. Rastgelelik yok; ayni cift her zaman ayni cumleyi verir.
   */
  function verdict(a, b, garage) {
    if (!a || !b) return '';
    const da = derive(a);
    const db = derive(b);
    const lines = [];

    const lighter = da.kgPerHp <= db.kgPerHp ? a : b;
    const heavier = lighter === a ? b : a;
    const lighterDerived = lighter === a ? da : db;
    const heavierDerived = lighter === a ? db : da;

    if (relativeGap(da.kgPerHp, db.kgPerHp) > 0.40) {
      lines.push(
        `${shortName(lighter)} her beygire ${round(lighterDerived.kgPerHp, 2)} kg düşürüyor; `
        + `${shortName(heavier)} aynı işi ${round(heavierDerived.kgPerHp, 2)} kg ile yazıyor.`
      );
    } else {
      lines.push(
        `Şasi borcu yakın: ${round(da.kgPerHp, 2)} kg/hp ile ${round(db.kgPerHp, 2)} kg/hp. `
        + 'İkisi de kütlesini benzer biçimde taşıyor.'
      );
    }

    if (relativeGap(da.nmPer100, db.nmPer100) < 0.05) {
      lines.push(
        `Tork/ağırlıkta başabaşlar (${round(da.nmPer100, 1)} ↔ ${round(db.nmPer100, 1)} Nm/100kg): `
        + 'biri bunu deviriyor, diğeri taşıyor.'
      );
    } else {
      const torquier = da.nmPer100 > db.nmPer100 ? a : b;
      const torquierValue = torquier === a ? da.nmPer100 : db.nmPer100;
      const otherValue = torquier === a ? db.nmPer100 : da.nmPer100;
      const percent = Math.round(((torquierValue / otherValue) - 1) * 100);
      lines.push(`${shortName(torquier)} her kiloya %${percent} daha fazla tork düşürüyor.`);
    }

    if (garage && garage.length) {
      const front = new Set(paretoFront(garage));
      const onFront = [a, b].filter((bike) => front.has(bike.id));
      if (onFront.length === 2) {
        lines.push('İkisi de garajın Pareto sınırında: kendi ağırlığında daha güçlüsü yok.');
      } else if (onFront.length === 1) {
        lines.push(`${shortName(onFront[0])} Pareto sınırında; diğerini ağırlığına göre geçiyor.`);
      }
    }

    return lines.join(' ');
  }

  window.ConviviumMoto = window.ConviviumMoto || {};
  window.ConviviumMoto.metrics = Object.freeze({
    METRICS,
    METRIC_BY_KEY,
    derive,
    valueOf,
    quantile,
    median,
    buildScale,
    rankInGarage,
    rankInClass,
    paretoFront,
    verdict
  });
})();
