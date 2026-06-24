/**
 * Convivium - Bugy Pet (Faz 1)
 * Kayitli kullanicilar icin Tamagotchi benzeri "Ped" sistemi.
 *
 * Faz 1 kapsami: gating (girisli kullanici + icerik sayfasi), yumurta
 * onboarding'i, tur (skin) secimi, isimlendirme, kalicilik (Supabase +
 * localStorage ayna) ve secilen turla bugy-v4 companion'ini aktive etme.
 *
 * Ihtiyac/bakim dongusu, buyume/evrim ve "canavarlasma" (feral) sonraki
 * fazlarda gelir; veri modeli simdiden o alanlari tasiyor.
 */
(() => {
  'use strict';

  if (window.BugyPet) return;

  const LS_KEY = 'convivium.bugy.pet';
  const ENGINE_KEY = 'convivium.bugy.engine';

  // Uygulama/oyun sayfalarinda pet gozukmesin (istek: yalnizca icerik sayfalari).
  const BLOCKED_PATH = /\/(games|tools)\//;
  const AUTH_PATH = /\/account\/auth/;

  // Secilebilir turler = bugy-v4 asistan skinleri + kisilik notu.
  const SPECIES = {
    clippy:   { label: 'Clippy',   blurb: 'Merakli ve yardimsever; surekli bir seyler onerir.' },
    merlin:   { label: 'Merlin',   blurb: 'Bilge ve sakin; gizemli isaretlerle konusur.' },
    rover:    { label: 'Rover',    blurb: 'Sadik bir refakatci; pesinden gelmeyi sever.' },
    f1:       { label: 'F1 / K-9', blurb: 'Hizli ve mekanik; gorev odakli minik robot.' },
    genie:    { label: 'Genie',    blurb: 'Capkin bir cin; dilek ve sürprizlere bayilir.' },
    scribble: { label: 'Scribble', blurb: 'Dagilik ve yaratici; kagit ustunde dans eder.' },
    dot:      { label: 'The Dot',  blurb: 'Minimal ve hizli; tek nokta, sonsuz enerji.' }
  };
  const SPECIES_KEYS = Object.keys(SPECIES);

  const backend = () => window.ConviviumBackend;

  // --- Kalicilik -----------------------------------------------------------
  const readLocal = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); }
    catch { return null; }
  };
  const writeLocal = (pet) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(pet)); } catch { /* storage kapali olabilir */ }
  };

  // Supabase'i kaynak kabul et; yoksa/yanlissa localStorage'a dus.
  async function loadPet() {
    const api = backend();
    if (api && api.isConfigured && api.isConfigured() && api.fetchBugyPet) {
      try {
        const remote = await api.fetchBugyPet();
        if (remote) { writeLocal(remote); return remote; }
        // remote null = bu kullanicinin henuz peti yok; yerel kopyayi guvenme.
        return null;
      } catch {
        // Tablo yoksa / ag hatasi: yerel kopyayla devam (zarif dusus).
        return readLocal();
      }
    }
    return readLocal();
  }

  async function savePet(pet) {
    writeLocal(pet);
    const api = backend();
    if (api && api.isConfigured && api.isConfigured() && api.upsertBugyPet) {
      try {
        const saved = await api.upsertBugyPet(pet);
        if (saved) writeLocal(saved);
        return saved || pet;
      } catch {
        // Tablo henuz olusturulmamis olabilir; yerelde tutmaya devam et.
      }
    }
    return pet;
  }

  function newPet(species, name) {
    const now = new Date().toISOString();
    return {
      species,
      name: (name || SPECIES[species].label).slice(0, 60),
      stage: 'hatchling',
      hatched: true,
      hunger: 80,
      energy: 80,
      hygiene: 80,
      bond: 45,
      mood_state: 'neutral',
      care_points: 0,
      born_at: now,
      last_care_at: now,
      last_seen_at: now,
      meta: {}
    };
  }

  // --- Companion surucusu (bugy-v4) ---------------------------------------
  function activateCompanion(pet) {
    const v4 = window.BugyV4;
    if (!v4) return;
    try { localStorage.setItem(ENGINE_KEY, 'v4'); } catch { /* yok say */ }
    if (v4.setSkin) v4.setSkin(SPECIES[pet.species] ? pet.species : 'clippy');
    if (v4.activate) v4.activate();
  }
  function hideCompanion() {
    const v4 = window.BugyV4;
    if (v4 && v4.deactivate) v4.deactivate();
  }

  // --- Onboarding UI -------------------------------------------------------
  let rootEl = null;

  function teardown() {
    if (rootEl && rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
    rootEl = null;
  }

  function spawnEgg() {
    teardown();
    rootEl = document.createElement('div');
    rootEl.className = 'bugy-onboard';
    rootEl.innerHTML = `
      <button type="button" class="bugy-egg" aria-label="Gizemli yumurta - kirmak icin tikla">
        <span class="bugy-egg-shell" aria-hidden="true">🥚</span>
        <span class="bugy-egg-hint">dokun</span>
      </button>`;
    document.body.appendChild(rootEl);
    const egg = rootEl.querySelector('.bugy-egg');
    egg.addEventListener('click', () => crackEgg(egg), { once: true });
  }

  function crackEgg(egg) {
    egg.classList.add('is-cracking');
    egg.disabled = true;
    window.setTimeout(openSelection, 720);
  }

  function openSelection() {
    teardown();
    rootEl = document.createElement('div');
    rootEl.className = 'bugy-onboard bugy-select-overlay';
    rootEl.setAttribute('role', 'dialog');
    rootEl.setAttribute('aria-modal', 'true');
    rootEl.setAttribute('aria-label', 'Bugy secimi');

    const cards = SPECIES_KEYS.map((key) => `
      <button type="button" class="bugy-card" data-species="${key}">
        <strong>${SPECIES[key].label}</strong>
        <span>${SPECIES[key].blurb}</span>
      </button>`).join('');

    rootEl.innerHTML = `
      <div class="bugy-select">
        <h2>Yumurtadan ne çıkacak?</h2>
        <p class="bugy-select-sub">Bir Bugy seç — sonra ona bir isim ver. Bakımını sen üstleneceksin.</p>
        <div class="bugy-card-grid">${cards}</div>
        <form class="bugy-name-row" novalidate>
          <input type="text" class="bugy-name-input" maxlength="24" autocomplete="off" spellcheck="false"
                 placeholder="Bugy'nin adı" aria-label="Bugy adı" disabled>
          <button type="submit" class="bugy-confirm" disabled>Çıkar</button>
        </form>
      </div>`;
    document.body.appendChild(rootEl);

    let chosen = null;
    const input = rootEl.querySelector('.bugy-name-input');
    const confirm = rootEl.querySelector('.bugy-confirm');
    const form = rootEl.querySelector('.bugy-name-row');

    rootEl.querySelectorAll('.bugy-card').forEach((card) => {
      card.addEventListener('click', () => {
        chosen = card.dataset.species;
        rootEl.querySelectorAll('.bugy-card').forEach((c) => c.classList.toggle('is-active', c === card));
        input.disabled = false;
        confirm.disabled = false;
        if (!input.value) input.value = SPECIES[chosen].label;
        input.focus();
        input.select();
      });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!chosen) return;
      confirm.disabled = true;
      const pet = newPet(chosen, input.value.trim());
      await savePet(pet);
      teardown();
      activateCompanion(pet);
      if (window.BugyV4 && window.BugyV4.summon) window.BugyV4.summon();
    });
  }

  // --- Baslat --------------------------------------------------------------
  async function init() {
    if (BLOCKED_PATH.test(location.pathname) || AUTH_PATH.test(location.pathname)) return;

    const api = backend();
    if (!api || !api.isConfigured || !api.isConfigured()) return;

    let session = null;
    try { session = await api.getSession(); } catch { session = null; }
    if (!session) { hideCompanion(); return; } // Yalnizca kayitli/girisli kullanicilar.

    const pet = await loadPet();
    if (pet && pet.hatched) {
      activateCompanion(pet);
    } else {
      hideCompanion();
      spawnEgg();
    }
  }

  const api = {
    init,
    species: () => ({ ...SPECIES }),
    get: loadPet,
    save: savePet
  };
  window.BugyPet = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
