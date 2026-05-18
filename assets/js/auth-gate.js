(function() {
  'use strict';

  const script = document.currentScript;
  const item = {
    key: script?.dataset.itemKey || document.body?.dataset.itemKey || location.pathname.replace(/^\//, '') || 'convivium',
    type: script?.dataset.itemType === 'game' ? 'game' : 'app',
    title: script?.dataset.itemTitle || document.title.replace(/\s*\|\s*Convivium\s*$/i, '') || 'Convivium'
  };
  const startedAt = Date.now();
  let sessionChecked = false;
  let sessionUser = null;
  let lastSessionWrite = 0;

  function lockPage() {
    document.documentElement.classList.add('auth-locking');
    if (!document.getElementById('auth-lock-style')) {
      const style = document.createElement('style');
      style.id = 'auth-lock-style';
      style.textContent = [
        'html.auth-locking body>*:not(#auth-required-gate){visibility:hidden!important;pointer-events:none!important}',
        'html.auth-locking #auth-required-gate{visibility:visible!important;pointer-events:auto!important}'
      ].join('');
      document.head.appendChild(style);
    }
  }

  function unlockPage() {
    document.documentElement.classList.remove('auth-locking');
  }

  function loginUrl() {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return `/auth.html?returnTo=${encodeURIComponent(returnTo)}`;
  }

  function setGateMessage(message) {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', () => setGateMessage(message), { once: true });
      return;
    }

    let gate = document.getElementById('auth-required-gate');
    if (!gate) {
      gate = document.createElement('section');
      gate.id = 'auth-required-gate';
      gate.setAttribute('role', 'alert');
      gate.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:2147483647',
        'display:grid',
        'place-items:center',
        'padding:24px',
        'background:rgba(0,0,0,0.94)',
        'color:#9fffb5',
        'font:16px/1.5 ui-monospace,Consolas,monospace',
        'text-align:center'
      ].join(';');
      document.body.appendChild(gate);
    }

    document.body.style.visibility = 'visible';
    document.body.style.pointerEvents = 'auto';
    gate.innerHTML = [
      '<div style="max-width:520px;border:1px solid #00ff00;padding:22px;background:#050505;box-shadow:0 0 18px rgba(0,255,0,.22)">',
      '<strong style="display:block;color:#00ff00;font-size:1.1rem;margin-bottom:8px">Uyelik gerekli</strong>',
      `<p style="margin:0 0 16px">${message}</p>`,
      `<a href="${loginUrl()}" style="color:#000;background:#00ff00;padding:10px 14px;text-decoration:none;font-weight:700">Giris Yap</a>`,
      '</div>'
    ].join('');
  }

  async function requireSession() {
    if (!window.ConviviumBackend || !window.ConviviumBackend.isConfigured()) {
      setGateMessage('Bu alan Supabase oturumu ile acilir. Once Supabase ayarlarini tamamlayin.');
      return null;
    }

    try {
      const session = await window.ConviviumBackend.getSession();
      sessionChecked = true;
      sessionUser = session?.user || null;
      if (!session) {
        location.replace(loginUrl());
        return null;
      }

      unlockPage();
      if (document.body) {
        document.body.classList.add('auth-granted');
        document.body.dataset.authUser = session.user.email || session.user.id;
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          document.body.classList.add('auth-granted');
          document.body.dataset.authUser = session.user.email || session.user.id;
        }, { once: true });
      }
      return session;
    } catch (error) {
      setGateMessage(error.message || 'Oturum kontrolu yapilamadi.');
      return null;
    }
  }

  async function recordSession(force = false) {
    if (!sessionChecked || !sessionUser || !window.ConviviumBackend?.saveAppSession) return;

    const now = Date.now();
    const duration = Math.max(0, Math.floor((now - startedAt) / 1000));
    if (!force && duration - lastSessionWrite < 20) return;
    lastSessionWrite = duration;

    try {
      await window.ConviviumBackend.saveAppSession({
        item_key: item.key,
        item_type: item.type,
        item_title: item.title,
        duration_seconds: duration,
        meta: { path: location.pathname }
      });
    } catch (error) {
      console.warn('[Convivium] Activity session could not be saved.', error);
    }
  }

  async function recordRecommendation(payload) {
    if (!window.ConviviumBackend?.saveAppRecommendation) return;
    try {
      return await window.ConviviumBackend.saveAppRecommendation({
        app_key: payload.app_key || item.key,
        app_title: payload.app_title || item.title,
        recommendation_title: payload.recommendation_title || payload.title,
        recommendation_summary: payload.recommendation_summary || payload.summary,
        recommendation_meta: payload.recommendation_meta || payload.meta || {}
      });
    } catch (error) {
      console.warn('[Convivium] Recommendation could not be saved.', error);
      return null;
    }
  }

  async function recordGameScore(payload) {
    if (!window.ConviviumBackend?.saveGameScore) return;
    try {
      return await window.ConviviumBackend.saveGameScore({
        game_key: payload.game_key || item.key,
        initials: payload.initials,
        score: payload.score,
        duration_seconds: payload.duration_seconds,
        trace: payload.trace,
        best_streak: payload.best_streak
      });
    } catch (error) {
      console.warn('[Convivium] Game score could not be saved.', error);
      return null;
    }
  }

  window.ConviviumActivity = {
    item,
    requireSession,
    recordSession,
    recordRecommendation,
    recordGameScore,
    getElapsedSeconds() {
      return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    }
  };

  lockPage();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') recordSession(true);
  });
  window.addEventListener('pagehide', () => recordSession(true));
  function initGate() {
    requireSession().then((session) => {
      if (session) recordSession();
    });
  }

  initGate();
})();
