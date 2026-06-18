(function() {
  'use strict';

  const backend = window.ConviviumBackend;
  const status = document.getElementById('dashboardStatus');
  const profileEl = document.getElementById('dashboardProfile');
  const gamesEl = document.getElementById('dashboardGames');
  const recommendationsEl = document.getElementById('dashboardRecommendations');
  const sessionsEl = document.getElementById('dashboardSessions');
  const dartStatsEl = document.getElementById('dashboardDartStats');
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

  function renderProfile(session, profile) {
    profileEl.innerHTML = [
      `<strong>${escapeHtml(profile?.display_name || session.user.email || 'Convivium kullanicisi')}</strong>`,
      `<span>${escapeHtml(session.user.email || session.user.id)}</span>`,
      `<span>Rol: ${escapeHtml(profile?.role || 'reader')}</span>`
    ].join('');
  }

  function renderGames(scores) {
    if (!scores.length) {
      empty(gamesEl, 'Henuz kaydedilmis oyun skoru yok.');
      return;
    }

    gamesEl.innerHTML = scores.map((score) => `
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

    sessionsEl.innerHTML = sessions.slice(0, 12).map((session) => `
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

  function dartModeCard(mode, b) {
    if (!b || !b.matches) return '';
    const wlParts = [`${b.wins}G`, `${b.losses}M`];
    if (mode === 'cricket' && b.draws) wlParts.push(`${b.draws}B`);
    let extra;
    if (mode === 'x01') {
      extra = [['Ort.', Number(b.average || 0).toFixed(1)], ['En yuksek', b.highestTurn || 0], ['180', b.oneEighties || 0]];
    } else if (mode === 'atc') {
      extra = [['Ort. ok', b.avgDarts || 0], ['En hizli', b.bestDarts || '-']];
    } else {
      extra = [['Ort. puan', b.avgPoints || 0], ['En yuksek', b.bestPoints || 0]];
    }
    return `
      <article class="dart-mode-card dart-mode-${mode}">
        <header>
          <span class="dart-mode-tag">${escapeHtml(DART_MODE_LABELS[mode])}</span>
          <strong>${b.matches} mac</strong>
        </header>
        <p class="dart-mode-wl">${escapeHtml(wlParts.join(' / '))}</p>
        <div class="dart-mode-metrics">
          ${extra.map(([l, v]) => `<span><strong>${escapeHtml(v)}</strong><em>${escapeHtml(l)}</em></span>`).join('')}
        </div>
      </article>`;
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

    const cards = ['x01', 'atc', 'cricket'].map((mode) => dartModeCard(mode, stats.byMode[mode])).join('');
    const recent = (stats.recent || []).slice(0, 10).map((match) => {
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

    dartStatsEl.innerHTML = `<div class="dart-mode-cards">${cards}</div>${recent}`;
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
        location.replace(`/auth.html?returnTo=${encodeURIComponent('/dashboard.html')}`);
        return;
      }

      const [profile, scores, recommendations, sessions, dartStats] = await Promise.all([
        backend.getProfile(),
        backend.fetchUserGameScores(40),
        backend.fetchUserAppRecommendations(30),
        backend.fetchUserAppSessions(40),
        backend.fetchUserDartStats
          ? backend.fetchUserDartStats(12).catch((error) => ({ error }))
          : Promise.resolve(null)
      ]);

      renderProfile(session, profile);
      renderGames(scores);
      renderRecommendations(recommendations);
      renderDartStats(dartStats);
      renderSessions(sessions);
      setStatus('Hazir.', 'success');
    } catch (error) {
      setStatus(friendlyError(error), 'error');
    }
  }

  signOutButton?.addEventListener('click', async () => {
    try {
      setStatus('Oturum kapatiliyor...');
      await backend.signOut();
      location.href = '/auth.html';
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });

  document.addEventListener('DOMContentLoaded', init);
})();
