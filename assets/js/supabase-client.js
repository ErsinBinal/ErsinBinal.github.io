(function() {
  'use strict';

  const config = window.CONVIVIUM_SUPABASE || {};
  let cachedClient = null;
  const storageKey = 'convivium-auth-session';

  function isConfigured() {
    return Boolean(
      config.url &&
      config.anonKey &&
      /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url)
    );
  }

  function getClient() {
    if (!isConfigured()) return null;
    if (cachedClient) return cachedClient;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      console.warn('[Convivium] Supabase SDK not loaded.');
      return null;
    }

    cachedClient = window.supabase.createClient(config.url, config.anonKey, {
      auth: {
        storage: window.sessionStorage,
        storageKey,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    return cachedClient;
  }

  function toMessage(error) {
    if (!error) return '';
    return error.message || String(error);
  }

  function slugify(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 96);
  }

  function normalizeArticle(row) {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      date: (row.published_at || row.created_at || '').slice(0, 10),
      summary: row.summary || '',
      content: row.content_html || '',
      status: row.status,
      published_at: row.published_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  async function requireClient() {
    const client = getClient();
    if (!client) {
      throw new Error('Supabase henuz yapilandirilmadi. assets/js/supabase-config.js dosyasini doldurun.');
    }
    return client;
  }

  async function getSession() {
    const client = await requireClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw new Error(toMessage(error));
    return data.session;
  }

  function clearLegacyAuthStorage() {
    try {
      const legacyPrefix = `sb-${new URL(config.url).hostname.split('.')[0]}-auth-token`;
      [window.localStorage, window.sessionStorage].forEach((storage) => {
        if (!storage) return;
        Object.keys(storage).forEach((key) => {
          if (
            key === legacyPrefix ||
            key === storageKey ||
            key.startsWith('sb-') && key.endsWith('-auth-token')
          ) {
            storage.removeItem(key);
          }
        });
      });
    } catch (error) {
      console.warn('[Convivium] Auth storage cleanup failed.', error);
    }
  }

  async function getUser() {
    const client = await requireClient();
    const { data, error } = await client.auth.getUser();
    if (error) throw new Error(toMessage(error));
    return data.user;
  }

  async function signUp(email, password, displayName) {
    const client = await requireClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: config.redirectTo || `${window.location.origin}/auth.html`,
        data: { display_name: displayName || '' }
      }
    });
    if (error) throw new Error(toMessage(error));
    return data;
  }

  async function signIn(email, password) {
    const client = await requireClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(toMessage(error));
    return data;
  }

  async function signOut() {
    const client = await requireClient();
    const { error } = await client.auth.signOut();
    if (error) throw new Error(toMessage(error));
    clearLegacyAuthStorage();
  }

  async function getProfile() {
    const client = await requireClient();
    const user = await getUser();
    if (!user) return null;

    const { data, error } = await client
      .from('profiles')
      .select('user_id, display_name, role, created_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw new Error(toMessage(error));
    return data;
  }

  async function isAdmin() {
    const profile = await getProfile();
    return Boolean(profile && profile.role === 'admin');
  }

  async function fetchPublishedArticles() {
    const client = await requireClient();
    const { data, error } = await client
      .from('articles')
      .select('id, slug, title, summary, content_html, status, published_at, created_at, updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) throw new Error(toMessage(error));
    return (data || []).map(normalizeArticle);
  }

  async function fetchManagedArticles() {
    const client = await requireClient();
    const { data, error } = await client
      .from('articles')
      .select('id, slug, title, summary, content_html, status, published_at, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(toMessage(error));
    return data || [];
  }

  async function saveArticle(article) {
    const client = await requireClient();
    const user = await getUser();
    if (!user) throw new Error('Oturum bulunamadi.');

    const payload = {
      slug: slugify(article.slug || article.title),
      title: article.title.trim(),
      summary: article.summary.trim(),
      content_html: article.content_html.trim(),
      status: article.status,
      published_at: article.status === 'published'
        ? (article.published_at || new Date().toISOString())
        : null
    };

    if (!payload.slug) throw new Error('Gecerli bir slug ya da baslik gerekli.');

    let query;
    if (article.id) {
      query = client.from('articles').update(payload).eq('id', article.id).select().single();
    } else {
      query = client.from('articles').insert({
        ...payload,
        author_id: user.id
      }).select().single();
    }

    const { data, error } = await query;
    if (error) throw new Error(toMessage(error));
    return data;
  }

  async function deleteArticle(id) {
    const client = await requireClient();
    const { error } = await client.from('articles').delete().eq('id', id);
    if (error) throw new Error(toMessage(error));
  }

  async function saveGameScore(score) {
    const client = await requireClient();
    const user = await getUser();
    if (!user) throw new Error('Global skor icin once giris yapmalisiniz.');

    const fallbackInitials = String(
      score.initials ||
      user.user_metadata?.display_name ||
      user.email ||
      'USR'
    )
      .trim()
      .toUpperCase()
      .replace(/Ğ/g, 'G')
      .replace(/Ü/g, 'U')
      .replace(/Ş/g, 'S')
      .replace(/[İIı]/g, 'I')
      .replace(/Ö/g, 'O')
      .replace(/Ç/g, 'C')
      .replace(/[^A-Z]/g, '')
      .padEnd(3, 'X')
      .slice(0, 3);

    const payload = {
      game_key: score.game_key || 'cyberpunk-logic',
      user_id: user.id,
      initials: fallbackInitials,
      score: Number(score.score) || 0,
      duration_seconds: Math.max(0, Number(score.duration_seconds) || 0),
      trace: Math.max(0, Math.min(100, Number(score.trace) || 0)),
      best_streak: Math.max(0, Number(score.best_streak) || 0)
    };

    const { data, error } = await client
      .from('game_scores')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(toMessage(error));
    return data;
  }

  async function fetchGameLeaderboard(gameKey = 'cyberpunk-logic', limit = 10) {
    const client = await requireClient();
    const { data, error } = await client
      .from('game_scores')
      .select('id, initials, score, duration_seconds, trace, best_streak, created_at')
      .eq('game_key', gameKey)
      .order('score', { ascending: false })
      .order('duration_seconds', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw new Error(toMessage(error));
    return data || [];
  }

  async function fetchUserGameScores(limit = 30) {
    const client = await requireClient();
    const user = await getUser();
    if (!user) throw new Error('Oyun gecmisi icin once giris yapmalisiniz.');

    const { data, error } = await client
      .from('game_scores')
      .select('id, game_key, initials, score, duration_seconds, trace, best_streak, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(toMessage(error));
    return data || [];
  }

  async function saveAppSession(session) {
    const client = await requireClient();
    const user = await getUser();
    if (!user) throw new Error('Oturum kaydi icin once giris yapmalisiniz.');

    const payload = {
      user_id: user.id,
      item_key: String(session.item_key || 'unknown').slice(0, 120),
      item_type: session.item_type === 'game' ? 'game' : 'app',
      item_title: String(session.item_title || session.item_key || 'Convivium').slice(0, 160),
      duration_seconds: Math.max(0, Number(session.duration_seconds) || 0),
      meta: session.meta && typeof session.meta === 'object' ? session.meta : {}
    };

    const { data, error } = await client
      .from('user_app_sessions')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(toMessage(error));
    return data;
  }

  async function fetchUserAppSessions(limit = 40) {
    const client = await requireClient();
    const user = await getUser();
    if (!user) throw new Error('Oturum gecmisi icin once giris yapmalisiniz.');

    const { data, error } = await client
      .from('user_app_sessions')
      .select('id, item_key, item_type, item_title, duration_seconds, meta, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(toMessage(error));
    return data || [];
  }

  async function saveAppRecommendation(recommendation) {
    const client = await requireClient();
    const user = await getUser();
    if (!user) throw new Error('Oneri kaydi icin once giris yapmalisiniz.');

    const payload = {
      user_id: user.id,
      app_key: String(recommendation.app_key || 'unknown').slice(0, 120),
      app_title: String(recommendation.app_title || recommendation.app_key || 'Uygulama').slice(0, 160),
      recommendation_title: String(recommendation.recommendation_title || recommendation.title || 'Oneri').slice(0, 220),
      recommendation_summary: String(recommendation.recommendation_summary || recommendation.summary || '').slice(0, 1200),
      recommendation_meta: recommendation.recommendation_meta && typeof recommendation.recommendation_meta === 'object'
        ? recommendation.recommendation_meta
        : {}
    };

    const { data, error } = await client
      .from('app_recommendations')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(toMessage(error));
    return data;
  }

  async function fetchUserAppRecommendations(limit = 25) {
    const client = await requireClient();
    const user = await getUser();
    if (!user) throw new Error('Oneri gecmisi icin once giris yapmalisiniz.');

    const { data, error } = await client
      .from('app_recommendations')
      .select('id, app_key, app_title, recommendation_title, recommendation_summary, recommendation_meta, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(toMessage(error));
    return data || [];
  }

  window.ConviviumBackend = {
    isConfigured,
    getClient,
    getSession,
    getUser,
    getProfile,
    isAdmin,
    signUp,
    signIn,
    signOut,
    clearLegacyAuthStorage,
    fetchPublishedArticles,
    fetchManagedArticles,
    saveArticle,
    deleteArticle,
    saveGameScore,
    fetchGameLeaderboard,
    fetchUserGameScores,
    saveAppSession,
    fetchUserAppSessions,
    saveAppRecommendation,
    fetchUserAppRecommendations,
    slugify
  };
})();
