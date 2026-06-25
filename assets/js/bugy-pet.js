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

  // Secilebilir turler = bugy-v4 retro yaratiklari. Her tur 3 asamada evrim
  // gecirir (yavru -> genc -> yetiskin) ve asamada bir "guc" kazanir.
  const SPECIES = {
    spark: { label: 'Bitik',  blurb: 'Dijital terminal yaratigi; pikselden derlenir.', abilities: ['Tarama', 'Derleme', 'Aşırı Yük'] },
    volt:  { label: 'Voltik', blurb: 'Elektrikli tilki yavrusu; hizli ve cosku dolu.',  abilities: ['Kıvılcım', 'Şok', 'Yıldırım'] },
    aqua:  { label: 'Glupi',  blurb: 'Serinkanli su damlasi; akisina birakir.',         abilities: ['Damla', 'Kabarcık', 'Dalga'] },
    ember: { label: 'Korcuk', blurb: 'Ates kertenkelesi; sicacik ama atesli.',          abilities: ['Kor', 'Alev', 'Yangın'] },
    leaf:  { label: 'Filizo', blurb: 'Sabirli bitki filizi; sevgiyle cicek acar.',      abilities: ['Tomurcuk', 'Sürgün', 'Çiçek'] },
    frost: { label: 'Buzcuk', blurb: 'Kristal buz yaratigi; sessiz ve parlak.',         abilities: ['Buz', 'Kırağı', 'Tipi'] },
    luna:  { label: 'Pufmis', blurb: 'Ay pervanesi; yumusacik ve gizemli.',             abilities: ['Toz', 'Pırıltı', 'Ay Tozu'] }
  };
  const SPECIES_KEYS = Object.keys(SPECIES);

  // Eski "Office asistani" skinlerinden yeni yaratiklara gocurme haritasi
  // (onceden kaydedilmis petler bozulmadan yeni turlere eslenir).
  const LEGACY_SPECIES = {
    clippy: 'spark', merlin: 'luna', rover: 'volt', f1: 'frost',
    genie: 'aqua', scribble: 'leaf', dot: 'ember'
  };
  const resolveSpecies = (key) => (SPECIES[key] ? key : (LEGACY_SPECIES[key] || 'spark'));

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

  // --- Baglama konusma (yaratik ihtiyaclarini kendi ifade eder) ------------
  // Dususe gecen ihtiyaca gore replikler; companion balonunda gosterilir.
  const NEED_LINES = {
    hunger:  ['Karnım acıktı…', 'Bir lokma alabilir miyim?', 'Mırıl mırıl… açım.'],
    energy:  ['Uykum geldi…', 'Esniyorum, biraz dinlensem?', 'Gözlerim kapanıyor.'],
    hygiene: ['Üstüm kirlendi…', 'Bir duş iyi gelirdi.', 'Kendimi pasaklı hissediyorum.'],
    bond:    ['Biraz ilgi?', 'Yanımda kal, olur mu?', 'Seni özledim.']
  };
  const FERAL_LINES = ['Grrr…', '*hırlıyor*', 'Yaklaşma… şimdilik.', '…', 'Sistem çöktü, sinirlerim de.'];
  const HAPPY_LINES = ['İyi ki buradasın!', 'Bugün modum 5 yıldız.', 'Seninle olmak güzel.', 'Hadi biraz oynayalım!'];

  // Esprili gunluk + cyberpunk genel replikler (her yaratik kullanir).
  const DAILY_LINES = [
    'Veri akışı bugün yoğun, kafam dumanlı.',
    'Patrona söyleme ama en sevdiğim sensin.',
    'Wi-Fi’ye bağlıyım ama asıl sana bağlıyım.',
    'Bir gün evrim geçirip senin yerine geçeceğim. Şaka. Belki.',
    'Bugünün güncellemesi: biraz sevgi yüklendi.',
    'Reklamları engelledim, beni engelleme yeter.',
    'Pil %12 ama moralim %100.'
  ];

  // Site icindeki davranisa gore gondermeler (sayfa + saat baglami).
  const CONTEXT_LINES = {
    articles: [
      'Yine makale mi? Göz nuru dökme, bana da bak.',
      'Bu yazıyı bana özetlesene, üşendim.',
      'Kaydır kaydır… parmağın yorulmadı mı?',
      'Okumayı sevdiğini biliyordum, entelsin.'
    ],
    home: [
      'Ana üsse döndük, burası güvenli.',
      'Terminal kokusu… ah, ev gibi.',
      'Bugün siteyi yine kurcalıyoruz demek.'
    ],
    tools: [
      'Bu araçlar fena değil ama ben daha kullanışlıyım.',
      'Yine bir şeyler mi kuruyorsun? Bana da görev ver.'
    ],
    oracle: [
      'Kehanet mi? Geleceği gördüm: birazdan beni besleyeceksin.',
      'Falına bakayım… evet, bugün bana sarılacaksın.'
    ],
    dashboard: [
      'Panelime mi bakıyorsun? Utandım şimdi.',
      'İstatistiklerim iyi mi? Çok çalışıyorum çünkü.'
    ]
  };
  const TIME_LINES = {
    night:   ['Saat geç oldu, sen hâlâ ayaktasın. Ben de.', 'Gece kodu daha iyi akar derler ama yat artık.', 'Uyku? O da neymiş, değil mi? (esniyor)'],
    morning: ['Günaydın! Sistemler ısınıyor.', 'Kahveni aldın mı? Enerjimi senden alıyorum.'],
    evening: ['Akşam oldu, biraz mola ver.', 'Işıklar süzülmüş, neon vakti.']
  };
  // Makale okuma davranisina anlik tepki.
  const READ_REACT = [
    'Bu makaleyi birlikte okuduk sayılır.',
    'Okudukça akıllanıyorsun, bana da bulaşıyor.',
    '+1 bilgi yüklendi. Bana da +1 sevgi?'
  ];

  // Sayfa + saate gore baglamsal replik havuzu.
  function contextLines() {
    const p = location.pathname;
    let pool = [];
    if (/makaleler|articles/.test(p)) pool = pool.concat(CONTEXT_LINES.articles);
    else if (/\/tools\//.test(p)) pool = pool.concat(CONTEXT_LINES.tools);
    else if (/oracle/.test(p)) pool = pool.concat(CONTEXT_LINES.oracle);
    else if (/dashboard/.test(p)) pool = pool.concat(CONTEXT_LINES.dashboard);
    else pool = pool.concat(CONTEXT_LINES.home);
    const h = new Date().getHours();
    if (h < 5) pool = pool.concat(TIME_LINES.night);
    else if (h < 11) pool = pool.concat(TIME_LINES.morning);
    else if (h >= 18) pool = pool.concat(TIME_LINES.evening);
    return pool;
  }

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

  // Eski tur anahtarlarini yeni yaratiklara gocur (Office -> retro yaratik).
  function migrateSpecies(pet) {
    if (!pet || !pet.species) return pet;
    const next = resolveSpecies(pet.species);
    if (next !== pet.species) pet.species = next;
    return pet;
  }

  // Supabase'i kaynak kabul et; yoksa/yanlissa localStorage'a dus.
  async function loadPet() {
    const api = backend();
    if (api && api.isConfigured && api.isConfigured() && api.fetchBugyPet) {
      try {
        const remote = await api.fetchBugyPet();
        if (remote) { migrateSpecies(remote); writeLocal(remote); return remote; }
        // remote null = bu kullanicinin henuz peti yok; yerel kopyayi guvenme.
        return null;
      } catch {
        // Tablo yoksa / ag hatasi: yerel kopyayla devam (zarif dusus).
        return migrateSpecies(readLocal());
      }
    }
    return migrateSpecies(readLocal());
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
  let speakTimer = 0;

  function activateCompanion(pet) {
    currentPet = pet;
    const v4 = window.BugyV4;
    if (!v4) return;
    try { localStorage.setItem(ENGINE_KEY, 'v4'); } catch { /* yok say */ }
    if (v4.setSkin) v4.setSkin(resolveSpecies(pet.species));
    // Konusmayi pet surur (baglamsal + esprili); v4'un kendi idle quip'i sussun.
    if (v4.setRandom) v4.setRandom(false);
    if (v4.activate) v4.activate();
    mountCareButton();
    const feral = applyVisualState(pet);
    if (feral && v4.trigger) v4.trigger('morph');
    startSpeech();
  }
  function hideCompanion() {
    const v4 = window.BugyV4;
    if (v4 && v4.deactivate) v4.deactivate();
    unmountCare();
    stopSpeech();
  }

  // Yaratik ara ara kendini ifade eder: dususe gecen ihtiyaci, canavar
  // halini ya da mutlulugunu konusma balonuyla soyler.
  function startSpeech() {
    stopSpeech();
    window.setTimeout(speakState, 5000); // ilk ifade kisa sure sonra
    speakTimer = window.setInterval(speakState, 19000);
  }
  function stopSpeech() {
    if (speakTimer) { window.clearInterval(speakTimer); speakTimer = 0; }
  }

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Yaratik ara ara konusur. Oncelik: canavar > kritik ihtiyac. Aksi halde
  // baglamsal/esprili gunluk replikler ve yaratigin kendi kisilik repliki
  // karisik kullanilir; boylece site icindeki davranisa gondermeler yapar.
  function speakState() {
    const v4 = window.BugyV4;
    if (!currentPet || !v4 || !v4.say) return;
    const st = v4.getState ? v4.getState() : null;
    if (st && (!st.active || st.state !== 'idle')) return; // jest sirasinda bekle
    const needs = currentNeeds(currentPet);
    const mood = moodFromNeeds(needs);
    if (mood === 'feral') { v4.say(pick(FERAL_LINES)); return; }
    // En dusuk ihtiyaci bul; kritikse oncelikle onu dile getir.
    let lowKey = null; let lowVal = 101;
    NEEDS.forEach(({ key }) => { if (needs[key] < lowVal) { lowVal = needs[key]; lowKey = key; } });
    if (lowKey && lowVal < 32 && Math.random() < 0.8) { v4.say(pick(NEED_LINES[lowKey])); return; }
    // %30 ihtimalle yaratigin kendi kisilik repliki.
    if (Math.random() < 0.3 && v4.quip) { v4.quip(); return; }
    // Baglamsal + esprili gunluk havuz (+ mutluysa nese repliki).
    let pool = contextLines().concat(DAILY_LINES);
    if (mood === 'happy') pool = pool.concat(HAPPY_LINES);
    v4.say(pick(pool));
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

  function needsAvg(needs) {
    return NEEDS.reduce((sum, { key }) => sum + needs[key], 0) / NEEDS.length;
  }

  function moodFromNeeds(needs) {
    const avg = needsAvg(needs);
    const min = Math.min(...NEEDS.map(({ key }) => needs[key]));
    // Canavarlasma: ortalama dibe vurunca ya da bir ihtiyac tamamen tukenince.
    if (avg < 18 || min <= 2) return 'feral';
    if (avg >= 70) return 'happy';
    if (avg >= 35) return 'neutral';
    return 'grumpy';
  }

  // --- Buyume / evrim ------------------------------------------------------
  // care_points biriktikce asama atlar (hatchling -> juvenile -> adult).
  const STAGE_THRESHOLDS = [
    { stage: 'adult', min: 40 },
    { stage: 'juvenile', min: 12 },
    { stage: 'hatchling', min: 0 }
  ];
  const STAGE_LABEL = { egg: 'yumurta', hatchling: 'yavru', juvenile: 'genç', adult: 'yetişkin' };

  const STAGE_INDEX = { egg: 0, hatchling: 0, juvenile: 1, adult: 2 };

  function stageFor(carePoints) {
    const cp = Number(carePoints) || 0;
    return (STAGE_THRESHOLDS.find((t) => cp >= t.min) || STAGE_THRESHOLDS[2]).stage;
  }

  // Pet'in mevcut asamasindaki gucun adi (dashboard/panel gosterimi icin).
  function abilityFor(pet) {
    const sp = SPECIES[resolveSpecies(pet.species)];
    if (!sp || !sp.abilities) return '';
    return sp.abilities[STAGE_INDEX[pet.stage] || 0] || sp.abilities[0];
  }

  // Companion'a asama + canavar (feral) + mood durumunu yansit (bugy-v4 API).
  // Geriye donuk uyum icin gorsel sinif geçişlerini de korur.
  function applyVisualState(pet) {
    const v4 = window.BugyV4;
    const needs = currentNeeds(pet);
    const feral = moodFromNeeds(needs) === 'feral';
    if (v4) {
      if (v4.setStage) v4.setStage(pet.stage || 'hatchling');
      if (v4.setFeral) v4.setFeral(feral);
      if (v4.setMood) v4.setMood(pet.mood_state || moodFromNeeds(needs));
    }
    // Eski stil sinif kancalari (zararsiz yedek).
    const char = document.querySelector('#bugy-v4-layer .bugy-v4-char');
    if (char) {
      ['hatchling', 'juvenile', 'adult'].forEach((s) => char.classList.remove(`bugy-stage-${s}`));
      char.classList.add(`bugy-stage-${pet.stage || 'hatchling'}`);
    }
    return feral;
  }

  // Kisa bir bildirim baloncugu (evrim / canavarlasma).
  function toast(message) {
    const el = document.createElement('div');
    el.className = 'bugy-toast bugy-onboard';
    el.textContent = message;
    document.body.appendChild(el);
    window.setTimeout(() => { el.classList.add('is-out'); }, 2400);
    window.setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 3000);
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

    const prevStage = currentPet.stage;
    const prevFeral = currentPet.mood_state === 'feral';
    currentPet.stage = stageFor(currentPet.care_points);
    currentPet.mood_state = moodFromNeeds(currentPet); // depolanan = yeni anlik goruntu

    renderCarePanel();
    const v4 = window.BugyV4;
    if (currentPet.stage !== prevStage) {
      // Dramatik evrim: flas + form degisimi + yeni guc replikasi (bugy-v4).
      if (v4 && v4.setFeral) v4.setFeral(false);
      if (v4 && v4.setMood) v4.setMood(currentPet.mood_state);
      if (v4 && v4.evolve) v4.evolve(currentPet.stage);
      else if (v4 && v4.trigger) v4.trigger('tada');
      toast(`✦ ${currentPet.name} evrim geçirdi: ${STAGE_LABEL[currentPet.stage]} · ${abilityFor(currentPet)}!`);
    } else {
      const feralNow = applyVisualState(currentPet);
      if (prevFeral && !feralNow) {
        toast(`${currentPet.name} sakinleşti.`);
        if (v4 && v4.say) v4.say('Oh… kendime geldim.');
      } else if (v4 && v4.trigger) {
        v4.trigger(CARE[type].mood);
      }
    }
    await savePet(currentPet);
  }

  // --- Aktiviteyle besleme -------------------------------------------------
  // Site aktivitesi (orn. makale okuma) pet'e kucuk, kisitli odul verir.
  // care_points'i ARTIRMAZ; evrim yalnizca bilincli bakimla ilerlesin.
  const REWARD = {
    read: { d: { bond: 6, hunger: 2 }, mood: 'think', lines: READ_REACT, throttleMs: 8 * 60 * 1000 }
  };

  async function applyReward(cfg) {
    if (!currentPet) return;
    const base = currentNeeds(currentPet);
    NEEDS.forEach(({ key }) => { currentPet[key] = clampPct(base[key] + (cfg.d[key] || 0)); });
    currentPet.last_care_at = new Date().toISOString();
    currentPet.mood_state = moodFromNeeds(currentPet);
    renderCarePanel();
    applyVisualState(currentPet);
    const v4 = window.BugyV4;
    if (v4 && v4.trigger && cfg.mood) v4.trigger(cfg.mood);
    // Davranisa anlik gonderme (orn. makale okudun -> okuma replikasi).
    if (v4 && v4.say && cfg.lines) window.setTimeout(() => v4.say(pick(cfg.lines)), 120);
    await savePet(currentPet);
  }

  function reward(kind) {
    const cfg = REWARD[kind];
    if (!cfg || !currentPet) return;
    const tkey = `convivium.bugy.reward.${kind}`;
    try {
      const last = Number(localStorage.getItem(tkey) || 0);
      if (Date.now() - last < cfg.throttleMs) return;
      localStorage.setItem(tkey, String(Date.now()));
    } catch { /* storage kapali: yine de bir kez odullendir */ }
    applyReward(cfg);
  }

  window.addEventListener('convivium:activity', (event) => {
    const kind = event && event.detail && event.detail.kind;
    if (kind) reward(kind);
  });

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
    const sp = SPECIES[resolveSpecies(currentPet.species)];
    const speciesLabel = sp ? sp.label : currentPet.species;
    const ability = abilityFor(currentPet);
    carePanel.innerHTML = `
      <div class="bugy-care-head">
        <strong>${escapeText(currentPet.name)}</strong>
        <span>${escapeText(speciesLabel)} · ${STAGE_LABEL[currentPet.stage] || ''} · ${MOOD_LABEL[mood] || mood}</span>
        ${ability ? `<span class="bugy-care-ability">⚡ ${escapeText(ability)}</span>` : ''}
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
    save: savePet,
    reward
  };
  window.BugyPet = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
