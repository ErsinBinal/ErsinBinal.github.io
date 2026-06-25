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
    profileEl.innerHTML = [
      `<strong>${escapeHtml(profile?.display_name || session.user.email || 'Convivium kullanicisi')}</strong>`,
      `<span>${escapeHtml(session.user.email || session.user.id)}</span>`,
      `<span>Rol: ${escapeHtml(profile?.role || 'reader')}</span>`
    ].join('');
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

  function renderBugy(pet) {
    if (!bugyEl) return;
    if (!pet) {
      empty(bugyEl, 'Henuz bir Bugy yok. Icerik sayfalarinda (orn. Makaleler) beliren yumurtayi kirip Bugy\'ni sec.');
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
    bugyEl.innerHTML = `
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

      const [profile, scores, recommendations, sessions, dartStats, bugy] = await Promise.all([
        backend.getProfile(),
        backend.fetchUserGameScores(40),
        backend.fetchUserAppRecommendations(30),
        backend.fetchUserAppSessions(40),
        backend.fetchUserDartStats
          ? backend.fetchUserDartStats(12).catch((error) => ({ error }))
          : Promise.resolve(null),
        backend.fetchBugyPet
          ? backend.fetchBugyPet().catch(() => null)
          : Promise.resolve(null)
      ]);

      renderProfile(session, profile);
      renderBugy(bugy);
      renderGames(scores);
      renderRecommendations(recommendations);
      renderDartStats(dartStats);
      renderSessions(sessions);
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
