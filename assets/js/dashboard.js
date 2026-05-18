(function() {
  'use strict';

  const backend = window.ConviviumBackend;
  const status = document.getElementById('dashboardStatus');
  const profileEl = document.getElementById('dashboardProfile');
  const gamesEl = document.getElementById('dashboardGames');
  const recommendationsEl = document.getElementById('dashboardRecommendations');
  const sessionsEl = document.getElementById('dashboardSessions');
  const signOutButton = document.getElementById('dashboardSignOut');

  const gameNames = {
    'cyberpunk-logic': 'Cyberpunk Logic',
    'neon-river': 'Neon River',
    'universe-2': 'Universe-2',
    'universe-3': 'Universe-3',
    'ash-runner': 'Kul Hatti'
  };

  function setStatus(message, type = 'info') {
    status.textContent = message;
    status.dataset.type = type;
  }

  function friendlyError(error) {
    const message = error?.message || String(error || '');
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

      const [profile, scores, recommendations, sessions] = await Promise.all([
        backend.getProfile(),
        backend.fetchUserGameScores(40),
        backend.fetchUserAppRecommendations(30),
        backend.fetchUserAppSessions(40)
      ]);

      renderProfile(session, profile);
      renderGames(scores);
      renderRecommendations(recommendations);
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
