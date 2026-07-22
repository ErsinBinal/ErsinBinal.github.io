/**
 * Convivium - Kolektif Rituel (frekans nabzi)
 * Gunluk sinyal karti toplamalari site genelinde sayilir (site_events,
 * kimliksiz). Gunun toplami esigi asarsa, o gun kart toplamis her gezgin
 * bir kez "frekans esigi" bonusu alabilir. Sayim RPC'si yoksa modul
 * zarifce "olcum cevrimdisi" der; kart/collect davranisi degismez.
 *
 * Factory hicbir storage/DOM/ag erisimine dogrudan sahip degildir:
 * sayim fetchPulse ile, gun anahtari getDayKey ile, sahiplik/odul/anons
 * callback'lerle disaridan verilir (ev deseni: karar burada, yan etki
 * protokolde).
 * createRitualPulse(deps) fabrikasi ile kurulur.
 * (c) 2026 Ersin Binal - https://ersinbinal.github.io
 */
(() => {
  'use strict';

  const root = window.ConviviumHome = window.ConviviumHome || {};

  const DEFAULT_THRESHOLD = 5;
  const BONUS_SHARDS = 2;

  function createRitualPulse({
    fetchPulse,
    getDayKey,
    ownsTodayCard,
    hasClaimed,
    markClaimed,
    onBonus,
    onStorm,
    threshold = DEFAULT_THRESHOLD
  } = {}) {
    const required = { fetchPulse, getDayKey, ownsTodayCard, hasClaimed, markClaimed, onBonus };
    const missing = Object.entries(required)
      .filter(([, value]) => typeof value !== 'function')
      .map(([name]) => name);
    if (missing.length) {
      throw new TypeError(`createRitualPulse: zorunlu fonksiyonlar eksik: ${missing.join(', ')}`);
    }
    const limit = Number.isFinite(threshold) && threshold >= 1 ? Math.floor(threshold) : DEFAULT_THRESHOLD;

    const readPulse = async () => {
      const raw = await fetchPulse();
      const count = Number(raw);
      if (!Number.isFinite(count) || count < 0) return null;
      return Math.floor(count);
    };

    // Esik asilmis + bugunun karti toplanmis + bugun daha once alinmamissa
    // bonusu bir kez verir. Donen satirlar terminale eklenir.
    const maybeClaim = async () => {
      const day = String(getDayKey() || '');
      if (!day || !ownsTodayCard()) return [];
      if (hasClaimed(day)) return [];
      let count;
      try {
        count = await readPulse();
      } catch {
        return [];
      }
      if (count === null || count < limit) return [];
      markClaimed(day);
      onBonus(BONUS_SHARDS, 'frekans esigi');
      try { onStorm?.(count); } catch { /* firtina gorseli best-effort */ }
      return [
        '',
        `>> FREKANS ESIGI ASILDI: bugun ${count} gezgin karti topladi.`,
        `>> ortak rezonans bonusu: +${BONUS_SHARDS} shard.`
      ];
    };

    const report = async () => {
      let count;
      try {
        count = await readPulse();
      } catch {
        count = null;
      }
      const day = String(getDayKey() || '');
      const lines = ['] FREKANS', ''];
      if (count === null) {
        lines.push('  olcum cevrimdisi. (sayim RPC\'si henuz kurulmamis olabilir)');
        lines.push(']');
        return lines.join('\n');
      }
      const bar = '█'.repeat(Math.min(count, limit)) + '░'.repeat(Math.max(0, limit - count));
      lines.push(`  bugunku toplama: ${count} gezgin   esik: ${limit}`);
      lines.push(`  [${bar}] ${count >= limit ? 'ESIK ASILDI' : 'birikiyor'}`);
      if (count >= limit) {
        if (!ownsTodayCard()) {
          lines.push('  bonus icin once bugunun kartini topla: collect');
        } else if (hasClaimed(day)) {
          lines.push('  bugunku rezonans bonusun alindi.');
        } else {
          lines.push('  bonusun hazir — bu komut onu simdi verdi mi bak: collect sonrasi otomatik.');
        }
      } else {
        lines.push('  esik asilirsa o gun kart toplayan herkes +2 shard alir.');
      }
      lines.push(']');
      const claimLines = await maybeClaim();
      return lines.concat(claimLines).join('\n');
    };

    return Object.freeze({
      report,
      maybeClaim,
      threshold: limit,
      bonus: BONUS_SHARDS
    });
  }

  root.createRitualPulse = createRitualPulse;
})();
