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

  // Saat basina ihtiyac dususu (gercek zaman; last_care_at uzerinden hesaplanir).
  // Yumusak tutuldu: gunluk ugrayan kullanici rahatca dengeyi korur.
  const DECAY = { hunger: 4, energy: 3, hygiene: 2.5, bond: 1.5 };

  // Bakim aksiyonlari: ihtiyac deltalari + companion mood animasyonu (bugy-v4).
  const CARE = {
    feed:  { label: 'Besle',   icon: '🍙', mood: 'tada',  d: { hunger: 38, hygiene: -6, bond: 4 } },
    rest:  { label: 'Uyut',    icon: '🌙', mood: 'think', d: { energy: 42, bond: 2 } },
    clean: { label: 'Temizle', icon: '🧼', mood: 'magic', d: { hygiene: 46, bond: 3 } },
    play:  { label: 'Oyna',    icon: '🎈', mood: 'wave',  d: { bond: 26, energy: -12, hunger: -6 } }
  };
  const NEEDS = [
    { key: 'hunger',  label: 'Açlık' },
    { key: 'energy',  label: 'Enerji' },
    { key: 'hygiene', label: 'Hijyen' },
    { key: 'bond',    label: 'Bağ' }
  ];

  const clampPct = (v) => Math.max(0, Math.min(100, Math.round(v)));

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
  // Aktif pet (bakim UI'i bunun uzerinde calisir).
  let currentPet = null;

  function activateCompanion(pet) {
    currentPet = pet;
    const v4 = window.BugyV4;
    if (!v4) return;
    try { localStorage.setItem(ENGINE_KEY, 'v4'); } catch { /* yok say */ }
    if (v4.setSkin) v4.setSkin(SPECIES[pet.species] ? pet.species : 'clippy');
    if (v4.activate) v4.activate();
    mountCareButton();
  }
  function hideCompanion() {
    const v4 = window.BugyV4;
    if (v4 && v4.deactivate) v4.deactivate();
    unmountCare();
  }

  // --- Ihtiyac dususu + bakim ---------------------------------------------
  // Depolanan ihtiyac degerleri last_care_at anindaki "anlik goruntu"dur.
  // Guncel degerler = anlik goruntu - DECAY * gecen_saat.
  function currentNeeds(pet) {
    const hours = Math.max(0, (Date.now() - new Date(pet.last_care_at).getTime()) / 3600000);
    const out = {};
    NEEDS.forEach(({ key }) => { out[key] = clampPct((Number(pet[key]) || 0) - DECAY[key] * hours); });
    return out;
  }

  function moodFromNeeds(needs) {
    const avg = NEEDS.reduce((sum, { key }) => sum + needs[key], 0) / NEEDS.length;
    if (avg >= 70) return 'happy';
    if (avg >= 35) return 'neutral';
    return 'grumpy'; // 'feral' Faz 3'te dibe vurunca devreye girecek.
  }

  async function applyCare(type) {
    if (!currentPet || !CARE[type]) return;
    const base = currentNeeds(currentPet);     // once dususu uygula
    const deltas = CARE[type].d;
    NEEDS.forEach(({ key }) => {
      currentPet[key] = clampPct(base[key] + (deltas[key] || 0));
    });
    currentPet.last_care_at = new Date().toISOString();
    currentPet.care_points = (Number(currentPet.care_points) || 0) + 1;
    currentPet.mood_state = moodFromNeeds(currentPet); // depolanan = yeni anlik goruntu
    renderCarePanel();
    const v4 = window.BugyV4;
    if (v4 && v4.trigger) v4.trigger(CARE[type].mood);
    await savePet(currentPet);
  }

  // --- Bakim UI ------------------------------------------------------------
  let careBtn = null;
  let carePanel = null;

  function unmountCare() {
    if (careBtn && careBtn.parentNode) careBtn.parentNode.removeChild(careBtn);
    if (carePanel && carePanel.parentNode) carePanel.parentNode.removeChild(carePanel);
    careBtn = null;
    carePanel = null;
  }

  function mountCareButton() {
    if (careBtn) { refreshCareBadge(); return; }
    careBtn = document.createElement('button');
    careBtn.type = 'button';
    careBtn.className = 'bugy-care-btn bugy-onboard';
    careBtn.setAttribute('aria-label', 'Bugy bakım menüsü');
    careBtn.innerHTML = '<span aria-hidden="true">🩺</span>';
    careBtn.addEventListener('click', toggleCarePanel);
    document.body.appendChild(careBtn);
    refreshCareBadge();
  }

  function refreshCareBadge() {
    if (!careBtn || !currentPet) return;
    const needs = currentNeeds(currentPet);
    const low = NEEDS.some(({ key }) => needs[key] < 30);
    careBtn.classList.toggle('has-alert', low);
  }

  function toggleCarePanel() {
    if (carePanel) { unmountPanel(); return; }
    carePanel = document.createElement('div');
    carePanel.className = 'bugy-care-panel bugy-onboard';
    carePanel.setAttribute('role', 'dialog');
    carePanel.setAttribute('aria-label', 'Bugy bakımı');
    document.body.appendChild(carePanel);
    renderCarePanel();
  }

  function unmountPanel() {
    if (carePanel && carePanel.parentNode) carePanel.parentNode.removeChild(carePanel);
    carePanel = null;
  }

  const MOOD_LABEL = { happy: 'mutlu', neutral: 'sakin', grumpy: 'huysuz', feral: 'canavar' };

  function renderCarePanel() {
    refreshCareBadge();
    if (!carePanel || !currentPet) return;
    const needs = currentNeeds(currentPet);
    const mood = moodFromNeeds(needs);
    const meters = NEEDS.map(({ key, label }) => {
      const v = needs[key];
      const level = v < 30 ? 'low' : v < 60 ? 'mid' : 'high';
      return `
        <div class="bugy-meter" data-level="${level}">
          <div class="bugy-meter-top"><span>${label}</span><span>${v}</span></div>
          <div class="bugy-meter-track"><i style="width:${v}%"></i></div>
        </div>`;
    }).join('');
    const buttons = Object.keys(CARE).map((type) => `
      <button type="button" class="bugy-care-action" data-care="${type}">
        <span aria-hidden="true">${CARE[type].icon}</span>${CARE[type].label}
      </button>`).join('');
    const speciesLabel = SPECIES[currentPet.species] ? SPECIES[currentPet.species].label : currentPet.species;
    carePanel.innerHTML = `
      <div class="bugy-care-head">
        <strong>${escapeText(currentPet.name)}</strong>
        <span>${escapeText(speciesLabel)} · ${MOOD_LABEL[mood] || mood}</span>
        <button type="button" class="bugy-care-close" aria-label="Kapat">×</button>
      </div>
      <div class="bugy-meters">${meters}</div>
      <div class="bugy-care-actions">${buttons}</div>`;
    carePanel.querySelector('.bugy-care-close').addEventListener('click', unmountPanel);
    carePanel.querySelectorAll('.bugy-care-action').forEach((btn) => {
      btn.addEventListener('click', () => applyCare(btn.dataset.care));
    });
  }

  function escapeText(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
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
