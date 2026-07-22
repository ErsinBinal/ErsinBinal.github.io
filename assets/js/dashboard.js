(function() {
  'use strict';

  const backend = window.ConviviumBackend;
  const status = document.getElementById('dashboardStatus');
  const profileEl = document.getElementById('dashboardProfile');
  const gamesEl = document.getElementById('dashboardGames');
  const recommendationsEl = document.getElementById('dashboardRecommendations');
  const sessionsEl = document.getElementById('dashboardSessions');
  const bugyEl = document.getElementById('dashboardBugy');
  const dartStatsEl = document.getElementById('dashboardDartStats');
  const leaderboardEl = document.getElementById('dashboardDartLeaderboard');
  const signOutButton = document.getElementById('dashboardSignOut');
  const handleChipEl = document.getElementById('dashboardHandle');
  const accessChipEl = document.getElementById('dashboardAccessChip');
  const statStripEl = document.getElementById('dashboardStats');
  const socialEl = document.getElementById('dashboardSocial');

  const ROLE_LABELS = { admin: 'ARCHITECT', operator: 'OPERATOR', reader: 'READER' };

  const gameNames = {
    'cyberpunk-logic': 'Cyberpunk Logic',
    'neon-river': 'Neon River',
    'universe-2': 'Universe-2',
    'ash-runner': 'Kul Hatti'
  };

  function setStatus(message, type = 'info') {
    status.textContent = message;
    status.dataset.type = type;
  }

  function friendlyError(error) {
    const message = error?.message || String(error || '');
    if (/dart_leaderboard/i.test(message)) {
      return "Siralama fonksiyonu eksik. docs/database/2026-06-18-dart-leaderboard.sql dosyasini SQL Editor'de calistirin.";
    }
    if (/column .*mode.* does not exist|dart_matches\.mode/i.test(message)) {
      return "Dart mod kolonu eksik. docs/database/2026-06-18-dart-modes.sql dosyasini SQL Editor'de calistirin.";
    }
    if (/dart_matches|dart_throws/i.test(message)) {
      return "Dart tablolari henuz Supabase tarafinda yok. docs/database/2026-06-01-dart-skorbord.sql dosyasini SQL Editor'de calistirin.";
    }
    if (/user_app_sessions|app_recommendations|relation .* does not exist/i.test(message)) {
      return "Dashboard tablolari henuz Supabase tarafinda yok. docs/database/2026-05-18-dashboard-activity.sql dosyasini SQL Editor'de calistirin.";
    }
    return message || 'Dashboard yuklenemedi.';
  }

  function formatDate(value) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  }

  function formatDay(value) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value));
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours}sa ${minutes % 60}dk`;
    }
    return `${minutes}dk ${String(rest).padStart(2, '0')}sn`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function empty(container, message) {
    container.innerHTML = `<p class="dashboard-empty">${escapeHtml(message)}</p>`;
  }

  // Genel sparkline: kronolojik (eski -> yeni) deger dizisini kucuk SVG cizgiye cevirir.
  // Dart trendiyle ayni gorsel dil; statik SVG oldugu icin reduced-motion sorunu yok.
  function sparkline(values, headLabel, rangeText) {
    if (!Array.isArray(values) || values.length < 2) return '';
    const max = Math.max(...values);
    const min = Math.min(...values);
    const W = 280;
    const H = 46;
    const pad = 3;
    const span = max - min || 1;
    const pts = values.map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (W - 2 * pad);
      const y = H - pad - ((v - min) / span) * (H - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `
      <div class="spark-trend">
        <div class="spark-trend-head"><span>${escapeHtml(headLabel)}</span><span>${escapeHtml(rangeText)}</span></div>
        <svg viewBox="0 0 ${W} ${H}" class="spark-line" preserveAspectRatio="none"><polyline points="${pts}"></polyline></svg>
        <div class="spark-trend-foot"><span>ESKİ</span><span>YENİ</span></div>
      </div>`;
  }

  // Oyun skorlari (yeni -> eski gelir) icin oyun bazli skor trend grafikleri.
  function gameTrends(scores) {
    const byGame = {};
    scores.forEach((s) => {
      const key = s.game_key;
      (byGame[key] = byGame[key] || []).push(s);
    });
    return Object.keys(byGame).map((key) => {
      const chrono = byGame[key].slice().reverse(); // eski -> yeni
      const vals = chrono.map((s) => Number(s.score) || 0);
      if (vals.length < 2) return '';
      const name = gameNames[key] || key;
      const min = Math.min(...vals).toLocaleString('tr-TR');
      const max = Math.max(...vals).toLocaleString('tr-TR');
      return sparkline(vals, `${name} · skor`, `${min} – ${max}`);
    }).join('');
  }

  // Oturum sureleri (yeni -> eski gelir) icin tek bir sure trend grafigi.
  function sessionTrend(sessions) {
    const chrono = sessions.slice(0, 24).reverse(); // eski -> yeni
    const vals = chrono.map((s) => Math.max(0, Number(s.duration_seconds) || 0));
    if (vals.filter((v) => v > 0).length < 2) return '';
    const min = formatDuration(Math.min(...vals));
    const max = formatDuration(Math.max(...vals));
    return sparkline(vals, 'Oturum süresi / zaman', `${min} – ${max}`);
  }

  function renderProfile(session, profile) {
    const displayName = escapeHtml(profile?.display_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || session.user.email || 'Convivium kullanicisi');
    const lines = [
      `<strong>${displayName}</strong>`,
      `<span>${escapeHtml(session.user.email || session.user.id)}</span>`,
      `<span>Rol: ${escapeHtml(profile?.role || 'reader')}</span>`
    ];

    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
    if (fullName) {
      lines.push(`<span>Ad Soyad: ${escapeHtml(fullName)}</span>`);
    }
    if (profile?.profession) {
      lines.push(`<span>Meslek: ${escapeHtml(profile.profession)}</span>`);
    }
    if (profile?.education) {
      lines.push(`<span>Eğitim: ${escapeHtml(profile.education)}</span>`);
    }
    if (profile?.department) {
      lines.push(`<span>Bölüm: ${escapeHtml(profile.department)}</span>`);
    }

    const profileMissing = fullName && !(profile?.profession || profile?.education || profile?.department);
    if (profileMissing && profile?.ai_consent) {
      // Acik riza var: dogrudan otomatik tamamlama butonu.
      lines.push('<button id="dashboardProfilePredict" class="btn btn-small" type="button">Profilimi otomatik tamamla</button>');
      lines.push('<div id="dashboardPredictResult"></div>');
    } else if (profileMissing) {
      // Acik riza yok: once riza iste (KVKK).
      lines.push('<p class="muted" style="font-size:.85rem">Profilini internet aramasiyla otomatik doldurmak istersen, KVKK kapsaminda acik riza gerekir.</p>');
      lines.push('<button id="dashboardAiConsent" class="btn btn-small" type="button">Acik riza ver ve profilimi tamamla</button>');
      lines.push('<div id="dashboardPredictResult"></div>');
    }

    profileEl.innerHTML = lines.join('');

    const predictButton = document.getElementById('dashboardProfilePredict');
    if (predictButton) {
      predictButton.addEventListener('click', () => runProfilePrediction(session, profile, predictButton));
    }

    const consentButton = document.getElementById('dashboardAiConsent');
    if (consentButton) {
      consentButton.addEventListener('click', async () => {
        consentButton.disabled = true;
        setStatus('Açık rıza kaydediliyor...', 'info');
        try {
          const updated = await backend.upsertProfile({ ai_consent: true });
          renderProfile(session, updated);
          // Riza alindiktan hemen sonra otomatik tamamlamayi baslat.
          const btn = document.getElementById('dashboardProfilePredict');
          if (btn) runProfilePrediction(session, updated, btn);
        } catch (error) {
          setStatus(error.message, 'error');
          consentButton.disabled = false;
        }
      });
    }
  }

  // AI internette arar, KULLANICI onaylarsa profile yazilir (acik riza gerekir).
  async function runProfilePrediction(session, profile, button) {
    const resultEl = document.getElementById('dashboardPredictResult');
    button.disabled = true;
    setStatus('Profilin araştırılıyor...', 'info');
    try {
      const guess = await backend.predictProfileFromName(profile.first_name, profile.last_name);

      // Arama hic calistirilamadi (kota/gecici yogunluk): uydurma gosterme, tekrar dene.
      if (!guess.available) {
        if (resultEl) resultEl.innerHTML = `<p class="muted">${escapeHtml(guess.note || 'Araştırma şu an yapılamadı, biraz sonra tekrar dene.')}</p>`;
        setStatus('Araştırma şu an yapılamadı, biraz sonra tekrar dene.', 'info');
        button.disabled = false;
        return;
      }

      const rows = [
        ['Meslek', guess.profession],
        ['Eğitim', guess.education],
        ['Bölüm', guess.department]
      ].filter(([, v]) => v);

      // Arama calisti ama kisi hakkinda guvenilir bilgi bulunamadi.
      if (!rows.length) {
        if (resultEl) resultEl.innerHTML = '<p class="muted">İnternette senin hakkında güvenilir bilgi bulunamadı.</p>';
        setStatus('Sonuç çıkmadı.', 'info');
        button.disabled = false;
        return;
      }

      const list = rows.map(([k, v]) => `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</li>`).join('');
      if (resultEl) {
        resultEl.innerHTML = [
          '<div class="predict-card">',
          '<p class="muted"><em>Bunlar internette senin adınla bulunan bilgiler. <strong>Sana ait olduklarını doğrula</strong> — aynı isimli başka biri olabilir.</em></p>',
          `<ul>${list}</ul>`,
          '<button id="dashboardPredictConfirm" class="btn btn-small" type="button">Bunlar doğru, profilime ekle</button>',
          '<button id="dashboardPredictDismiss" class="btn btn-small btn-ghost" type="button">Boşver</button>',
          '</div>'
        ].join('');
      }
      setStatus('Bugy seni buldu. Doğruysa profiline ekleyebilirsin.', 'success');

      document.getElementById('dashboardPredictConfirm')?.addEventListener('click', async () => {
        setStatus('Profiline kaydediliyor...', 'info');
        try {
          const updated = await backend.upsertProfile({
            first_name: profile.first_name,
            last_name: profile.last_name,
            profession: guess.profession,
            education: guess.education,
            department: guess.department
          });
          renderProfile(session, updated);
          setStatus('Profil bilgilerin kaydedildi.', 'success');
        } catch (error) {
          setStatus(error.message, 'error');
        }
      });
      document.getElementById('dashboardPredictDismiss')?.addEventListener('click', () => {
        if (resultEl) resultEl.innerHTML = '';
        button.disabled = false;
      });
    } catch (error) {
      setStatus(error.message, 'error');
      button.disabled = false;
    }
  }

  // --- Bugy / Ped inceleme (salt okunur; bakim companion uzerinden yapilir) ---
  const BUGY_NEEDS = [['hunger', 'Açlık'], ['energy', 'Enerji'], ['hygiene', 'Hijyen'], ['bond', 'Bağ']];
  const BUGY_DECAY = { hunger: 4, energy: 3, hygiene: 2.5, bond: 1.5 };
  const BUGY_STAGE = { egg: 'yumurta', hatchling: 'yavru', juvenile: 'genç', adult: 'yetişkin' };
  const BUGY_MOOD = { happy: 'mutlu', neutral: 'sakin', grumpy: 'huysuz', feral: 'canavar' };
  const BUGY_SPECIES = {
    spark: 'Bitik', volt: 'Voltik', aqua: 'Glupi', ember: 'Korcuk',
    leaf: 'Filizo', frost: 'Buzcuk', luna: 'Pufmis'
  };
  // Eski Office skinlerini yeni yaratiklara esle (gocurme).
  const BUGY_LEGACY = {
    clippy: 'spark', merlin: 'luna', rover: 'volt', f1: 'frost',
    genie: 'aqua', scribble: 'leaf', dot: 'ember'
  };
  const BUGY_ABILITIES = {
    spark: ['Tarama', 'Derleme', 'Aşırı Yük'], volt: ['Kıvılcım', 'Şok', 'Yıldırım'],
    aqua: ['Damla', 'Kabarcık', 'Dalga'], ember: ['Kor', 'Alev', 'Yangın'],
    leaf: ['Tomurcuk', 'Sürgün', 'Çiçek'], frost: ['Buz', 'Kırağı', 'Tipi'],
    luna: ['Toz', 'Pırıltı', 'Ay Tozu']
  };
  const BUGY_STAGE_IDX = { egg: 0, hatchling: 0, juvenile: 1, adult: 2 };
  const bugySpeciesKey = (k) => (BUGY_SPECIES[k] ? k : (BUGY_LEGACY[k] || 'spark'));
  const bugyAbility = (pet) => {
    const key = bugySpeciesKey(pet.species);
    return (BUGY_ABILITIES[key] || [])[BUGY_STAGE_IDX[pet.stage] || 0] || '';
  };

  function bugyCurrentNeeds(pet) {
    const hours = Math.max(0, (Date.now() - new Date(pet.last_care_at).getTime()) / 3600000);
    const out = {};
    BUGY_NEEDS.forEach(([k]) => {
      out[k] = Math.max(0, Math.min(100, Math.round((Number(pet[k]) || 0) - BUGY_DECAY[k] * hours)));
    });
    return out;
  }

  function bugyMood(needs) {
    const vals = BUGY_NEEDS.map(([k]) => needs[k]);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const min = Math.min(...vals);
    if (avg < 18 || min <= 2) return 'feral';
    if (avg >= 70) return 'happy';
    if (avg >= 35) return 'neutral';
    return 'grumpy';
  }

  // --- Bugy Secimi ----------------------------------------------------------
  // Kullanici companion'ini panelden secer; secim profile yazilir ve
  // degistirilmedikce her cihazda ayni bugy gorunur.
  //
  // KILIT KURGUSU: Bugy Yaratiklar (v4) ve Surpriz Pet AYNI canavarlari
  // kullanir; ikisi de "offline node" bulmacasinin oduludur. Bulmacayi
  // cozmeyen kullanici bu iki secenegi GOREMEZ ve secemez; yalnizca
  // Classic / Arcade / Native herkese aciktir.
  const FREE_OPTIONS = [
    { key: 'v1', label: 'Bugy Classic', note: 'neon kuzu · taban katman' },
    { key: 'v2', label: 'Bugy Arcade', note: 'retro paletli maskot' },
    { key: 'v3', label: 'Bugy Native', note: 'canvas çekirdek, gelişmiş efektler' }
  ];
  const LOCKED_PREFS = ['v4', 'pet'];
  const ENGINE_LS_KEY = 'convivium.bugy.engine';
  const UNLOCK_LS_KEY = 'convivium.bugy.unlocked';

  function petUnlockedLocally() {
    try {
      if (localStorage.getItem(UNLOCK_LS_KEY) === '1') return true;
      const node = JSON.parse(localStorage.getItem('convivium.offline.node') || '{}');
      return Boolean(node && node.solved);
    } catch { return false; }
  }

  // Canavarlara (v4 + pet) erisim hakki: bulmaca cozulmus ya da zaten bir
  // pet var (eski hak sahibi; yumurta yalnizca kilit acilinca cikardi).
  function creaturesUnlocked(pet) {
    return Boolean(pet && pet.hatched) || petUnlockedLocally();
  }

  function currentCompanionPref(profile, pet) {
    const valid = ['off', 'v1', 'v2', 'v3', 'v4', 'pet'];
    let pref = 'v1';
    if (profile && valid.includes(profile.companion_pref)) pref = profile.companion_pref;
    else if (pet && pet.hatched) pref = 'pet';
    else {
      try {
        const ls = localStorage.getItem(ENGINE_LS_KEY);
        if (valid.includes(ls)) pref = ls;
      } catch { /* yok say */ }
    }
    // Guvenlik: kilitli tercih (v4/pet) hak edilmemisse Classic'e dus.
    if (LOCKED_PREFS.includes(pref) && !creaturesUnlocked(pet)) pref = 'v1';
    return pref;
  }

  async function applyCompanionPref(pref) {
    // Canli uygulama: bugy-pet yuklu ise orkestrasyonu ona birak.
    if (window.BugyPet && window.BugyPet.setPref) {
      await window.BugyPet.setPref(pref);
      return;
    }
    // Yedek yol: profile yaz + LS aynasi (sonraki sayfa yuklemesinde uygulanir).
    try { await backend.upsertProfile({ companion_pref: pref }); } catch { /* yok say */ }
    try { localStorage.setItem(ENGINE_LS_KEY, pref === 'pet' ? 'v4' : (pref === 'off' ? 'v1' : pref)); } catch { /* yok say */ }
  }

  function renderCompanionPicker(profile, pet) {
    const active = currentCompanionPref(profile, pet);
    const unlocked = creaturesUnlocked(pet);
    const rows = FREE_OPTIONS.map((opt) => `
      <label class="bugy-pick ${active === opt.key ? 'is-active' : ''}">
        <input type="radio" name="companionPref" value="${opt.key}" ${active === opt.key ? 'checked' : ''}>
        <strong>${opt.label}</strong><span>${opt.note}</span>
      </label>`);
    if (unlocked) {
      // Canavarlar acildi: v4 (serbest yaratik) + Tamagotchi pet.
      rows.push(`
      <label class="bugy-pick bugy-pick-pet ${active === 'v4' ? 'is-active' : ''}">
        <input type="radio" name="companionPref" value="v4" ${active === 'v4' ? 'checked' : ''}>
        <strong>👾 Bugy Yaratıklar</strong><span>synthwave yaratıklar · serbest dolaşır</span>
      </label>`);
      rows.push(`
      <label class="bugy-pick bugy-pick-pet ${active === 'pet' ? 'is-active' : ''}">
        <input type="radio" name="companionPref" value="pet" ${active === 'pet' ? 'checked' : ''}>
        <strong>🥚 Sürpriz Bugy</strong><span>${pet && pet.hatched ? 'bakım isteyen yaratığın (Tamagotchi)' : 'yumurtan bir içerik sayfasında bekliyor'}</span>
      </label>`);
    } else {
      // Kilitli: canavarlar tek bir gizemli satirla temsil edilir.
      rows.push(`
      <div class="bugy-pick bugy-pick-locked" title="Gizli görev tamamlanınca açılır">
        <strong>🔒 ???</strong><span>gizli bir ödül — sinyali kaybedince açılan node'u çöz</span>
      </div>`);
    }
    return `
      <fieldset class="bugy-picker">
        <legend>Bugy Seçimi</legend>
        ${rows.join('')}
        <p class="bugy-picker-note" id="bugyPickerNote">Seçimin hesabına kaydedilir; değiştirmedikçe tüm sayfalarda aynı bugy sana eşlik eder.</p>
      </fieldset>`;
  }

  function bindCompanionPicker(profile, pet) {
    const note = document.getElementById('bugyPickerNote');
    bugyEl.querySelectorAll('input[name="companionPref"]').forEach((input) => {
      input.addEventListener('change', async () => {
        const pref = input.value;
        bugyEl.querySelectorAll('.bugy-pick').forEach((el) => {
          el.classList.toggle('is-active', el.contains(input));
        });
        if (note) note.textContent = 'Kaydediliyor…';
        try {
          await applyCompanionPref(pref);
          if (profile) profile.companion_pref = pref;
          if (note) note.textContent = 'Kaydedildi. Seçimin tüm sayfalarda geçerli.';
        } catch {
          if (note) note.textContent = 'Kaydedilemedi; bağlantıyı kontrol edip tekrar dene.';
        }
      });
    });
  }

  function renderBugy(pet, profile) {
    if (!bugyEl) return;
    const picker = renderCompanionPicker(profile, pet);
    if (!pet) {
      bugyEl.innerHTML = picker + '<p class="dashboard-empty">Henuz bir Bugy yaratigin yok. Yaratik buyutme hakki gizli bir oduldur — kazananlara bir icerik sayfasinda yumurta belirir. Ipucu: sinyali kaybedince acilan node.</p>';
      bindCompanionPicker(profile, pet);
      return;
    }
    const needs = bugyCurrentNeeds(pet);
    const mood = bugyMood(needs);
    const meters = BUGY_NEEDS.map(([k, label]) => {
      const v = needs[k];
      const level = v < 30 ? 'low' : v < 60 ? 'mid' : 'high';
      return `
        <div class="bugy-meter" data-level="${level}">
          <div class="bugy-meter-top"><span>${label}</span><span>${v}</span></div>
          <div class="bugy-meter-track"><i style="width:${v}%"></i></div>
        </div>`;
    }).join('');
    bugyEl.innerHTML = picker + `
      <article class="bugy-dash bugy-mood-${mood}">
        <div class="bugy-dash-head">
          <strong>${escapeHtml(pet.name)}</strong>
          <span>${escapeHtml(BUGY_SPECIES[bugySpeciesKey(pet.species)] || pet.species)} · ${BUGY_STAGE[pet.stage] || pet.stage} · ${BUGY_MOOD[mood] || mood}</span>
        </div>
        <div class="bugy-meters">${meters}</div>
        <div class="bugy-dash-foot">
          <span>Güç: ${escapeHtml(bugyAbility(pet))}</span>
          <span>Bakım puanı: ${Number(pet.care_points) || 0}</span>
          <span>Doğum: ${formatDay(pet.born_at)}</span>
        </div>
        ${mood === 'feral' ? '<p class="bugy-dash-warn">⚠ Canavarlaştı — bir içerik sayfasında bakım yaparak sakinleştir.</p>' : ''}
      </article>`;
    bindCompanionPicker(profile, pet);
  }

  function renderGames(scores) {
    if (!scores.length) {
      empty(gamesEl, 'Henuz kaydedilmis oyun skoru yok.');
      return;
    }

    gamesEl.innerHTML = gameTrends(scores) + scores.map((score) => `
      <article class="dashboard-row">
        <div>
          <strong>${escapeHtml(gameNames[score.game_key] || score.game_key)}</strong>
          <span>${formatDate(score.created_at)}</span>
        </div>
        <div class="dashboard-metrics">
          <span>${Number(score.score || 0).toLocaleString('tr-TR')} puan</span>
          <span>${formatDuration(score.duration_seconds)}</span>
        </div>
      </article>
    `).join('');
  }

  function renderRecommendations(recommendations) {
    if (!recommendations.length) {
      empty(recommendationsEl, 'Henuz uygulama onerisi kaydedilmedi.');
      return;
    }

    recommendationsEl.innerHTML = recommendations.map((item) => `
      <article class="dashboard-row dashboard-recommendation">
        <div>
          <strong>${escapeHtml(item.recommendation_title)}</strong>
          <span>${escapeHtml(item.app_title)} / ${formatDate(item.created_at)}</span>
        </div>
        <p>${escapeHtml(item.recommendation_summary || 'Oneri ayrintisi yok.')}</p>
      </article>
    `).join('');
  }

  function renderSessions(sessions) {
    if (!sessions.length) {
      empty(sessionsEl, 'Henuz oyun veya uygulama oturumu yok.');
      return;
    }

    sessionsEl.innerHTML = sessionTrend(sessions) + sessions.slice(0, 12).map((session) => `
      <article class="dashboard-row">
        <div>
          <strong>${escapeHtml(session.item_title)}</strong>
          <span>${session.item_type === 'game' ? 'Oyun' : 'Uygulama'} / ${formatDate(session.created_at)}</span>
        </div>
        <div class="dashboard-metrics">
          <span>${formatDuration(session.duration_seconds)}</span>
        </div>
      </article>
    `).join('');
  }

  const DART_MODE_LABELS = { x01: '501', atc: 'Around the Clock', cricket: 'Cricket' };

  let dartState = { matches: [], mode: 'all', range: 'all' };

  function dartFilterMatches() {
    const now = Date.now();
    const rangeMs = dartState.range === '7d' ? 7 * 864e5 : dartState.range === '30d' ? 30 * 864e5 : 0;
    return dartState.matches.filter((m) => {
      if (m.status !== 'completed') return false;
      if (dartState.mode !== 'all' && m.mode !== dartState.mode) return false;
      if (rangeMs && (now - new Date(m.created_at).getTime()) > rangeMs) return false;
      return true;
    });
  }

  function winPctOf(list) {
    const w = list.filter((m) => m.won).length;
    const l = list.filter((m) => !m.won && !m.draw).length;
    return (w + l) ? Math.round((w / (w + l)) * 100) : 0;
  }

  function avgOf(list, pick) {
    const vals = list.map(pick).filter((v) => v > 0);
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  function dartWinStreak(list) {
    let streak = 0;
    for (const m of list) { if (m.draw || !m.won) break; streak += 1; }
    return streak;
  }

  function dartKpis(list) {
    const total = list.length;
    const wins = list.filter((m) => m.won).length;
    const losses = list.filter((m) => !m.won && !m.draw).length;
    const winPct = (wins + losses) ? Math.round((wins / (wins + losses)) * 100) : 0;
    const half = Math.floor(total / 2);
    const wpDelta = half ? (winPctOf(list.slice(0, half)) - winPctOf(list.slice(half))) : 0;

    const cards = [
      { label: 'Maç', value: total },
      { label: 'Galibiyet %', value: winPct + '%', delta: wpDelta },
      { label: 'Galibiyet Serisi', value: dartWinStreak(list) }
    ];

    const mode = dartState.mode;
    if (mode === 'x01' || mode === 'all') {
      const x01 = list.filter((m) => m.mode === 'x01');
      if (x01.length) {
        const h = Math.floor(x01.length / 2);
        const avgDelta = h ? (avgOf(x01.slice(0, h), (m) => m.own.average) - avgOf(x01.slice(h), (m) => m.own.average)) : 0;
        cards.push({ label: '3-Dart Ort. (501)', value: avgOf(x01, (m) => m.own.average).toFixed(1), delta: Number(avgDelta.toFixed(1)) });
        cards.push({ label: 'En Yüksek Tur', value: Math.max(0, ...x01.map((m) => m.own.highestTurn || 0)) });
        cards.push({ label: '180', value: x01.reduce((a, m) => a + (m.own.oneEighties || 0), 0) });
      }
    }
    if (mode === 'atc') {
      const avgD = avgOf(list, (m) => m.own.darts);
      cards.push({ label: 'Ort. Ok', value: avgD ? avgD.toFixed(1) : '-' });
      const best = Math.min(Infinity, ...list.filter((m) => m.won && m.own.darts).map((m) => m.own.darts));
      cards.push({ label: 'En Hızlı (ok)', value: isFinite(best) ? best : '-' });
    }
    if (mode === 'cricket') {
      const avgP = avgOf(list, (m) => m.own.points);
      cards.push({ label: 'Ort. Puan', value: avgP ? Math.round(avgP) : '-' });
      cards.push({ label: 'En Yüksek Puan', value: Math.max(0, ...list.map((m) => m.own.points || 0)) });
    }
    return cards;
  }

  function dartArrow(delta) {
    if (!delta || Math.abs(delta) < 0.05) return '';
    const up = delta > 0;
    return `<em class="dart-delta ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(delta)}</em>`;
  }

  function dartSparkline(list) {
    const x01 = list.filter((m) => m.mode === 'x01' && m.own.average > 0).slice().reverse();
    if (x01.length < 2) return '';
    const vals = x01.map((m) => m.own.average);
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const W = 280;
    const H = 46;
    const pad = 3;
    const span = max - min || 1;
    const pts = vals.map((v, i) => {
      const x = pad + (i / (vals.length - 1)) * (W - 2 * pad);
      const y = H - pad - ((v - min) / span) * (H - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `
      <div class="dart-trend">
        <div class="dart-trend-head"><span>3-Dart Ort. / Maç (501)</span><span>${min.toFixed(1)} – ${max.toFixed(1)}</span></div>
        <svg viewBox="0 0 ${W} ${H}" class="dart-spark" preserveAspectRatio="none"><polyline points="${pts}"></polyline></svg>
        <div class="dart-trend-foot"><span>ESKİ</span><span>YENİ</span></div>
      </div>`;
  }

  function dartHeatmapData(list) {
    const counts = {};
    let miss = 0;
    let totalDarts = 0;
    list.forEach((m) => {
      const segs = (m.own && m.own.segments) || {};
      Object.keys(segs).forEach((s) => {
        const c = Number(segs[s]) || 0;
        totalDarts += c;
        if (s === 'MISS') { miss += c; return; }
        counts[s] = (counts[s] || 0) + c;
      });
    });
    return { counts, miss, totalDarts, hasData: Object.keys(counts).length > 0 };
  }

  function segmentLabel(code) {
    if (code === 'OUTER_BULL') return '25';
    if (code === 'BULL') return 'Bull';
    return code;
  }

  function dartHeatmapSection(list) {
    const data = dartHeatmapData(list);
    if (!data.hasData) {
      return `
        <div class="dart-heat">
          <div class="dart-heat-head"><span>Isabet Isı Haritası</span></div>
          <p class="dashboard-empty">Segment verisi henüz yok. Tahta/keypad ile oynanan yeni maçlar kaydedildikçe dolar.</p>
        </div>`;
    }
    const top = Object.keys(data.counts)
      .map((k) => [k, data.counts[k]])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, n]) => `<span class="dart-heat-chip">${escapeHtml(segmentLabel(code))} <strong>×${n}</strong></span>`)
      .join('');
    return `
      <div class="dart-heat">
        <div class="dart-heat-head"><span>Isabet Isı Haritası</span><span class="dart-heat-hint">Segmente gelince adet · ${data.totalDarts} ok</span></div>
        <svg class="dart-heat-svg" data-heat="1" xmlns="http://www.w3.org/2000/svg"></svg>
        <div class="dart-heat-legend"><span>AZ</span><i class="dart-heat-bar"></i><span>ÇOK</span>${data.miss ? ` · <span class="dart-heat-miss">Iska: ${data.miss}</span>` : ''}</div>
        <div class="dart-heat-top">${top}</div>
      </div>`;
  }

  function dartMatchBadges(m) {
    if (m.mode === 'atc') {
      return [`${m.own.darts} ok`, m.own.completed ? 'Bitirdi' : `${m.own.targetsLeft} hedef kaldi`];
    }
    if (m.mode === 'cricket') {
      return [`${m.own.points} puan`, `${m.own.closed}/7 kapali`];
    }
    const badges = [`Ort. ${Number(m.own.average || 0).toFixed(1)}`, `Max ${m.own.highestTurn || 0}`];
    if (m.own.oneEighties) badges.push(`180 ×${m.own.oneEighties}`);
    if (m.own.busts) badges.push(`Bust ${m.own.busts}`);
    return badges;
  }

  function renderDartStats(stats) {
    if (!dartStatsEl) return;

    if (!stats) {
      empty(dartStatsEl, 'Dart istatistikleri henuz kullanilabilir degil.');
      return;
    }

    if (stats.error) {
      empty(dartStatsEl, friendlyError(stats.error));
      return;
    }

    if (!stats.totalMatches) {
      empty(dartStatsEl, 'Henuz kaydedilmis dart maci yok. 501, Around the Clock veya Cricket oynayip iki hesapla (ya da bir hesap + CPU) giris yapin.');
      return;
    }

    dartState.matches = stats.matches || [];
    renderDartDash();
  }

  function renderDartDash() {
    const list = dartFilterMatches();
    const kpis = dartKpis(list);
    const modeBtns = [['all', 'Tümü'], ['x01', '501'], ['atc', 'ATC'], ['cricket', 'Cricket']];
    const rangeBtns = [['all', 'Tümü'], ['30d', '30 gün'], ['7d', '7 gün']];

    const controls = `
      <div class="dart-dash-controls">
        <div class="dart-filter" data-filter="mode">
          ${modeBtns.map(([v, l]) => `<button type="button" class="${dartState.mode === v ? 'is-active' : ''}" data-value="${v}">${l}</button>`).join('')}
        </div>
        <div class="dart-filter" data-filter="range">
          ${rangeBtns.map(([v, l]) => `<button type="button" class="${dartState.range === v ? 'is-active' : ''}" data-value="${v}">${l}</button>`).join('')}
        </div>
      </div>`;

    const kpiGrid = `<div class="dart-kpi-grid">
      ${kpis.map((k) => `<div class="dart-kpi"><strong>${escapeHtml(k.value)}</strong><span>${escapeHtml(k.label)}</span>${k.delta !== undefined ? dartArrow(k.delta) : ''}</div>`).join('')}
    </div>`;

    const recent = list.slice(0, 12).map((match) => {
      const oppTag = match.opponentType === 'cpu' ? 'CPU' : match.opponentType === 'guest' ? 'Misafir' : null;
      const oppLabel = (oppTag ? `${oppTag} · ` : '') + escapeHtml(match.opponent.label);
      const result = match.draw ? '■ Berabere' : match.won ? '▲ Galibiyet' : '▼ Maglubiyet';
      const badges = dartMatchBadges(match);
      return `
        <article class="dashboard-row dart-match-row dart-result-${match.draw ? 'draw' : match.won ? 'win' : 'loss'}">
          <div>
            <strong>${result} · ${oppLabel}</strong>
            <span><span class="dart-mode-pill">${escapeHtml(DART_MODE_LABELS[match.mode] || match.mode)}</span> ${formatDay(match.created_at)}</span>
          </div>
          <div class="dashboard-metrics">
            ${badges.map((b) => `<span>${escapeHtml(b)}</span>`).join('')}
          </div>
        </article>`;
    }).join('');

    const emptyNote = list.length ? '' : '<p class="dashboard-empty">Bu filtrede mac bulunamadi.</p>';
    dartStatsEl.innerHTML = controls + kpiGrid + dartSparkline(list) + dartHeatmapSection(list) + (recent || emptyNote);

    const heatSvg = dartStatsEl.querySelector('.dart-heat-svg[data-heat]');
    if (heatSvg && window.ConviviumDartBoard && window.ConviviumDartBoard.heatmap) {
      window.ConviviumDartBoard.heatmap(heatSvg, dartHeatmapData(list).counts);
    }

    dartStatsEl.querySelectorAll('.dart-filter').forEach((group) => {
      group.addEventListener('click', (event) => {
        const btn = event.target.closest('button[data-value]');
        if (!btn) return;
        dartState[group.dataset.filter] = btn.dataset.value;
        renderDartDash();
      });
    });
  }

  const DART_LB_MODES = [['all', 'Tümü'], ['x01', '501'], ['atc', 'ATC'], ['cricket', 'Cricket']];
  let dartLb = { mode: 'all', rows: [], userId: null, loading: false };

  function wireLbFilter() {
    const group = leaderboardEl.querySelector('[data-lb-filter="mode"]');
    if (!group) return;
    group.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-value]');
      if (!btn || btn.dataset.value === dartLb.mode) return;
      dartLb.mode = btn.dataset.value;
      loadDartLeaderboard();
    });
  }

  function renderLeaderboard() {
    if (!leaderboardEl) return;
    const controls = `
      <div class="dart-dash-controls">
        <div class="dart-filter" data-lb-filter="mode">
          ${DART_LB_MODES.map(([v, l]) => `<button type="button" class="${dartLb.mode === v ? 'is-active' : ''}" data-value="${v}">${l}</button>`).join('')}
        </div>
      </div>`;

    if (dartLb.loading) {
      leaderboardEl.innerHTML = controls + '<p class="dashboard-empty">Yukleniyor...</p>';
      wireLbFilter();
      return;
    }

    const rows = dartLb.rows || [];
    if (!rows.length) {
      leaderboardEl.innerHTML = controls + '<p class="dashboard-empty">Bu modda siralama icin yeterli kayit yok.</p>';
      wireLbFilter();
      return;
    }

    const myIndex = rows.findIndex((r) => r.user_id === dartLb.userId);
    const myRank = myIndex >= 0 ? `<p class="dart-lb-myrank">Senin siran: <strong>#${myIndex + 1}</strong> / ${rows.length}</p>` : '';

    const table = `
      <div class="dart-lb">
        <div class="dart-lb-row dart-lb-head">
          <span>#</span><span>Oyuncu</span><span>Maç</span><span>Gal%</span><span>3-Ort</span><span>En Yük.</span>
        </div>
        ${rows.slice(0, 20).map((r, i) => `
          <div class="dart-lb-row${r.user_id === dartLb.userId ? ' is-me' : ''}">
            <span class="dart-lb-rank">${i + 1}</span>
            <span class="dart-lb-name">${escapeHtml(r.display_name || 'Oyuncu')}</span>
            <span>${Number(r.matches) || 0}</span>
            <span>${r.win_pct != null ? r.win_pct + '%' : '-'}</span>
            <span>${r.avg_three_dart != null ? Number(r.avg_three_dart).toFixed(1) : '-'}</span>
            <span>${Number(r.best_high) || 0}</span>
          </div>`).join('')}
      </div>`;

    leaderboardEl.innerHTML = controls + myRank + table;
    wireLbFilter();
  }

  async function loadDartLeaderboard() {
    if (!leaderboardEl || !backend.fetchDartLeaderboard) return;
    dartLb.loading = true;
    renderLeaderboard();
    try {
      dartLb.rows = await backend.fetchDartLeaderboard(dartLb.mode, 200);
      dartLb.loading = false;
      renderLeaderboard();
    } catch (error) {
      dartLb.loading = false;
      empty(leaderboardEl, friendlyError(error));
    }
  }

  // --- Iz Raporu (Wrapped): mevcut verilerden prosedurel ozet karti --------
  function wrappedStats(scores, sessions, dartStats, oracleProfile) {
    const bestScore = scores.reduce((best, row) => (Number(row.score) || 0) > (Number(best?.score) || -1) ? row : best, null);
    const totalMinutes = Math.round(sessions.reduce((sum, row) => sum + (Number(row.duration_seconds) || 0), 0) / 60);
    const appCounts = {};
    sessions.forEach((row) => {
      appCounts[row.item_title] = (appCounts[row.item_title] || 0) + 1;
    });
    const topApp = Object.entries(appCounts).sort((a, b) => b[1] - a[1])[0] || null;
    const dart = dartStats && !dartStats.error ? dartStats : null;
    const dartWins = dart ? ['x01', 'atc', 'cricket'].reduce((sum, mode) => sum + (dart.byMode?.[mode]?.wins || 0), 0) : 0;
    return {
      totalGames: scores.length,
      bestScore,
      totalMinutes,
      topApp,
      dartMatches: dart?.totalMatches || 0,
      dartWins,
      oracleReadings: Number(oracleProfile?.reading_count) || 0,
      oracleAxis: oracleProfile?.dominant_axis || null,
      hasData: Boolean(scores.length || sessions.length || (dart && dart.totalMatches) || oracleProfile)
    };
  }

  function renderWrapped(session, profile, scores, sessions, dartStats, oracleProfile) {
    const canvas = document.getElementById('wrappedCanvas');
    const emptyEl = document.getElementById('wrappedEmpty');
    const downloadBtn = document.getElementById('wrappedDownload');
    if (!canvas || !emptyEl || !downloadBtn) return;

    const stats = wrappedStats(scores, sessions, dartStats, oracleProfile);
    if (!stats.hasData) {
      emptyEl.style.display = '';
      return;
    }

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const green = '#00ff66';
    const pale = '#caffd8';
    const cyan = '#00eaff';

    ctx.fillStyle = '#050d05';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0, 255, 102, 0.65)';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, W - 24, H - 24);
    ctx.strokeStyle = 'rgba(0, 234, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(22, 22, W - 44, H - 44);

    // Arka plan yildiz izi (deterministik).
    for (let i = 0; i < 90; i += 1) {
      const x = (i * 137) % (W - 60) + 30;
      const y = (i * 211) % (H - 60) + 30;
      ctx.fillStyle = i % 4 ? 'rgba(202, 255, 216, 0.16)' : 'rgba(0, 234, 255, 0.2)';
      ctx.fillRect(x, y, 2, 2);
    }

    const mono = (size, weight = '') => `${weight ? `${weight} ` : ''}${size}px "IBM Plex Mono", "Share Tech Mono", monospace`;
    let y = 82;
    ctx.fillStyle = pale;
    ctx.font = mono(16);
    ctx.fillText('> CONVIVIUM PROTOCOL', 44, y);
    y += 42;
    ctx.fillStyle = green;
    ctx.font = mono(38, 'bold');
    ctx.fillText('IZ RAPORU', 44, y);
    y += 30;
    ctx.fillStyle = cyan;
    ctx.font = mono(15);
    const name = profile?.display_name || session.user.email || 'gezgin';
    ctx.fillText(`${name} / ${new Date().getFullYear()}`, 44, y);
    y += 18;
    ctx.strokeStyle = 'rgba(0, 255, 102, 0.4)';
    ctx.beginPath();
    ctx.moveTo(44, y);
    ctx.lineTo(W - 44, y);
    ctx.stroke();
    y += 44;

    const statLine = (label, value) => {
      ctx.fillStyle = 'rgba(202, 255, 216, 0.75)';
      ctx.font = mono(14);
      ctx.fillText(label.toUpperCase(), 44, y);
      ctx.fillStyle = green;
      ctx.font = mono(26, 'bold');
      ctx.fillText(String(value), 44, y + 30);
      y += 66;
    };

    statLine('kaydedilen oyun skoru', stats.totalGames);
    if (stats.bestScore) {
      statLine('en iyi skor', `${Number(stats.bestScore.score || 0).toLocaleString('tr-TR')} (${gameNames[stats.bestScore.game_key] || stats.bestScore.game_key})`);
    }
    statLine('protokollerde gecen sure', `${stats.totalMinutes} dk`);
    if (stats.topApp) statLine('en cok donulen protokol', `${stats.topApp[0]} (${stats.topApp[1]}x)`);
    if (stats.dartMatches) statLine('dart maci / galibiyet', `${stats.dartMatches} / ${stats.dartWins}`);
    if (stats.oracleReadings) statLine('oracle okumasi', `${stats.oracleReadings}${stats.oracleAxis ? ` (baskin eksen: ${stats.oracleAxis})` : ''}`);

    ctx.fillStyle = 'rgba(0, 234, 255, 0.7)';
    ctx.font = mono(13);
    ctx.fillText('selective / online / not optimized for everyone', 44, H - 52);
    ctx.fillStyle = 'rgba(202, 255, 216, 0.5)';
    ctx.fillText('ersinbinal.github.io', 44, H - 32);

    canvas.style.display = '';
    downloadBtn.style.display = '';
    downloadBtn.onclick = () => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `convivium-wrapped-${new Date().toISOString().slice(0, 10)}.png`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      });
    };
  }

  // --- Kontrol guvertesi: ust kimlik cipleri ---
  function renderIdentityChips(session, profile) {
    if (handleChipEl) {
      const handle = profile?.handle;
      if (handle) {
        handleChipEl.textContent = `@${handle}`;
        handleChipEl.hidden = false;
      } else {
        handleChipEl.hidden = true;
      }
    }
    if (accessChipEl) {
      const role = String(profile?.role || 'reader').toLowerCase();
      accessChipEl.textContent = `ACCESS: ${ROLE_LABELS[role] || role.toUpperCase()}`;
      accessChipEl.hidden = false;
    }
  }

  // --- Stat seridi: tek bakista durum ---
  function renderStatStrip(worldState, scores, sessions, dartStats) {
    if (!statStripEl) return;
    const shards = Math.max(0, Number(worldState?.shards) || 0);
    const inventory = Array.isArray(worldState?.inventory) ? worldState.inventory : [];
    const cards = inventory.filter((item) => String(item).startsWith('card:')).length;
    const unlocked = Array.isArray(worldState?.unlocked) ? worldState.unlocked.length : 0;
    const dart = dartStats && !dartStats.error ? dartStats : null;
    const dartWins = dart ? ['x01', 'atc', 'cricket'].reduce((sum, mode) => sum + (dart.byMode?.[mode]?.wins || 0), 0) : 0;
    const dartLosses = dart ? ['x01', 'atc', 'cricket'].reduce((sum, mode) => sum + (dart.byMode?.[mode]?.losses || 0), 0) : 0;
    const totalMinutes = Math.round((sessions || []).reduce((sum, row) => sum + (Number(row.duration_seconds) || 0), 0) / 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const durationValue = hours > 0 ? `${hours}<small>s</small> ${mins}<small>dk</small>` : `${mins}<small>dk</small>`;

    const tiles = [
      { cls: '', k: 'shards', v: String(shards), meter: Math.min(100, Math.round((shards / 60) * 100)) },
      { cls: 'is-cyan', k: 'kartlar', v: `${cards} <small>/ 30</small>`, meter: Math.min(100, Math.round((cards / 30) * 100)) },
      { cls: '', k: 'acilan oda', v: `${unlocked} <small>/ 8</small>`, meter: Math.min(100, Math.round((unlocked / 8) * 100)) },
      { cls: 'is-cyan', k: 'oyun', v: String((scores || []).length) },
      { cls: '', k: 'dart G / M', v: `${dartWins}<small> / ${dartLosses}</small>` },
      { cls: 'is-mag', k: 'protokol suresi', v: durationValue }
    ];

    statStripEl.innerHTML = tiles.map((t) => `
      <div class="deck-stat ${t.cls}">
        <div class="k">${t.k}</div>
        <div class="v">${t.v}</div>
        ${t.meter !== undefined ? `<div class="deck-meter"><i style="width:${t.meter}%"></i></div>` : ''}
      </div>
    `).join('');
  }

  // --- Sosyal kimlik karti (yeni sosyal katmanin vitrini) ---
  function renderSocial(session, profile, snapshot) {
    if (!socialEl) return;
    const handle = profile?.handle || snapshot?.profile?.handle;
    if (!handle) {
      socialEl.innerHTML = `<p class="deck-social-empty">Henuz bir gezgin adin (@handle) yok. Ana terminalde sohbet guverte'sini acinca kimligin olusur; sonra buradan arkadaslarini ve finger gorunurlugunu yonetirsin.</p>`;
      return;
    }
    const friends = Array.isArray(snapshot?.friends) ? snapshot.friends.length : 0;
    const incoming = Array.isArray(snapshot?.incoming) ? snapshot.incoming.length : 0;
    const outgoing = Array.isArray(snapshot?.outgoing) ? snapshot.outgoing.length : 0;
    const displayName = profile?.display_name || snapshot?.profile?.display_name || handle;
    const role = ROLE_LABELS[String(profile?.role || 'reader').toLowerCase()] || 'READER';
    const days = profile?.created_at
      ? Math.max(0, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000))
      : null;
    const isPublic = profile?.public_profile === true;

    socialEl.innerHTML = `
      <div class="deck-social-hero">
        <div class="deck-avatar" aria-hidden="true">&#9670;</div>
        <div class="who">
          <b>@${escapeHtml(handle)}</b>
          <span>${escapeHtml(displayName)} &middot; ${role}${days !== null ? ` &middot; ${days} gun` : ''}</span>
        </div>
      </div>
      <div class="deck-social-stats">
        <div><div class="n">${friends}</div><div class="l">arkadas</div></div>
        <div><div class="n">${incoming}</div><div class="l">bekleyen davet</div></div>
        <div><div class="n">${outgoing}</div><div class="l">giden davet</div></div>
      </div>
      <div class="deck-toggle-row">
        <span class="t">gezgin kartin <b>${isPublic ? 'herkese acik' : 'gizli'}</b>${isPublic ? ` &middot; finger @${escapeHtml(handle)}` : ''}</span>
        <button class="deck-switch ${isPublic ? '' : 'is-off'}" id="dashboardFingerToggle" type="button" aria-pressed="${isPublic}">${isPublic ? 'ACIK' : 'KAPALI'}</button>
      </div>
    `;

    const toggle = document.getElementById('dashboardFingerToggle');
    if (toggle && backend.setPublicProfile) {
      toggle.addEventListener('click', async () => {
        const next = !(profile.public_profile === true);
        toggle.disabled = true;
        try {
          const applied = await backend.setPublicProfile(next);
          profile.public_profile = applied === true;
          renderSocial(session, profile, snapshot);
        } catch (error) {
          toggle.disabled = false;
          toggle.textContent = 'HATA';
        }
      });
    }
  }

  async function init() {
    if (!backend || !backend.isConfigured()) {
      setStatus('Supabase baglantisi yapilandirilmadi.', 'error');
      return;
    }

    try {
      setStatus('Dashboard yukleniyor...');
      const session = await backend.getSession();
      if (!session) {
        location.replace(`/account/auth.html?returnTo=${encodeURIComponent('/account/dashboard.html')}`);
        return;
      }

      const [profile, scores, recommendations, sessions, dartStats, bugy, oracleProfile, worldState, social] = await Promise.all([
        backend.getProfile(),
        backend.fetchUserGameScores(40),
        backend.fetchUserAppRecommendations(30),
        backend.fetchUserAppSessions(40),
        backend.fetchUserDartStats
          ? backend.fetchUserDartStats(12).catch((error) => ({ error }))
          : Promise.resolve(null),
        backend.fetchBugyPet
          ? backend.fetchBugyPet().catch(() => null)
          : Promise.resolve(null),
        backend.fetchOracleProfile
          ? backend.fetchOracleProfile().catch(() => null)
          : Promise.resolve(null),
        backend.fetchWorldState
          ? backend.fetchWorldState().catch(() => null)
          : Promise.resolve(null),
        backend.getSocialSnapshot
          ? backend.getSocialSnapshot().catch(() => null)
          : Promise.resolve(null)
      ]);

      renderIdentityChips(session, profile);
      renderStatStrip(worldState, scores, sessions, dartStats);
      renderSocial(session, profile, social);
      renderProfile(session, profile);
      renderBugy(bugy, profile);
      renderGames(scores);
      renderRecommendations(recommendations);
      renderDartStats(dartStats);
      renderSessions(sessions);
      renderWrapped(session, profile, scores, sessions, dartStats, oracleProfile);
      setStatus('Hazir.', 'success');

      dartLb.userId = session.user.id;
      loadDartLeaderboard();
    } catch (error) {
      setStatus(friendlyError(error), 'error');
    }
  }

  signOutButton?.addEventListener('click', async () => {
    try {
      setStatus('Oturum kapatiliyor...');
      await backend.signOut();
      location.href = '/account/auth.html';
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });

  document.addEventListener('DOMContentLoaded', init);
})();
