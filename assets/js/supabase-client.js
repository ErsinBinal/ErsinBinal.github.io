(function() {
  'use strict';

  const config = window.CONVIVIUM_SUPABASE || {};
  let cachedClient = null;
  const scopedClients = new Map();
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

  function createScopedClient(customStorageKey) {
    if (!isConfigured()) return null;
    const key = String(customStorageKey || '').trim();
    if (!key) return getClient();
    if (scopedClients.has(key)) return scopedClients.get(key);
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      console.warn('[Convivium] Supabase SDK not loaded.');
      return null;
    }

    const client = window.supabase.createClient(config.url, config.anonKey, {
      auth: {
        storage: window.sessionStorage,
        storageKey: key,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });

    scopedClients.set(key, client);
    return client;
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
      status: ['draft', 'published', 'archived'].includes(article.status) ? article.status : 'draft',
      published_at: article.status === 'published'
        ? (article.published_at || new Date().toISOString())
        : null
    };

    validateArticlePayload(payload);

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
    if (error) {
      const message = toMessage(error);
      if (/duplicate key|unique/i.test(message)) {
        throw new Error('Bu slug zaten kullaniliyor. Slug alanini benzersiz yapin.');
      }
      throw new Error(message);
    }
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

  async function updateRecommendationOutcome(id, accepted) {
    const client = await requireClient();
    const user = await getUser();
    if (!user) return;
    const { data, error: fetchError } = await client
      .from('app_recommendations')
      .select('recommendation_meta')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    if (fetchError) throw new Error(toMessage(fetchError));
    const meta = { ...(data?.recommendation_meta || {}), accepted, outcome_at: new Date().toISOString() };
    const { error } = await client
      .from('app_recommendations')
      .update({ recommendation_meta: meta })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw new Error(toMessage(error));
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

  function dartPlayerSummary(summary, slot) {
    const players = summary && typeof summary === 'object' ? summary.players || {} : {};
    return players[slot] || {};
  }

  async function createDartMatchWithClient(client, match) {
    if (!client) throw new Error('Dart mac kaydi icin Supabase oturumu gerekli.');
    const payload = {
      red_user_id: match.red_user_id || null,
      blue_user_id: match.blue_user_id || null,
      winner_user_id: match.winner_user_id || null,
      winner_slot: match.winner_slot || null,
      start_score: Math.max(1, Number(match.start_score) || 501),
      duration_seconds: Math.max(0, Number(match.duration_seconds) || 0),
      red_final_score: Math.max(0, Number(match.red_final_score) || 0),
      blue_final_score: Math.max(0, Number(match.blue_final_score) || 0),
      status: match.status === 'completed' ? 'completed' : 'in_progress',
      summary: match.summary && typeof match.summary === 'object' ? match.summary : {},
      completed_at: match.status === 'completed' ? (match.completed_at || new Date().toISOString()) : null,
      opponent_label: match.opponent_label || null,
      opponent_type: match.opponent_type || 'human'
    };

    const { data, error } = await client
      .from('dart_matches')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(toMessage(error));
    return data;
  }

  async function saveDartThrowsWithClient(client, throws) {
    if (!client) throw new Error('Dart atis kaydi icin Supabase oturumu gerekli.');
    const rows = (throws || []).map((throwRow) => ({
      match_id: throwRow.match_id,
      user_id: throwRow.user_id,
      player_slot: throwRow.player_slot === 'BLUE' ? 'BLUE' : 'RED',
      turn_number: Math.max(1, Number(throwRow.turn_number) || 1),
      dart_number: Math.max(1, Math.min(3, Number(throwRow.dart_number) || 1)),
      dart_value: Math.max(0, Math.min(60, Number(throwRow.dart_value) || 0)),
      turn_total: Math.max(0, Number(throwRow.turn_total) || 0),
      remaining_score: Math.max(0, Number(throwRow.remaining_score) || 0),
      is_bust: Boolean(throwRow.is_bust),
      is_winning_throw: Boolean(throwRow.is_winning_throw),
      thrown_at: throwRow.thrown_at || new Date().toISOString()
    }));

    if (!rows.length) return [];

    const { data, error } = await client
      .from('dart_throws')
      .insert(rows)
      .select();

    if (error) throw new Error(toMessage(error));
    return data || [];
  }

  async function fetchOracleProfile() {
    const client = await requireClient();
    const user = await getUser();
    if (!user) return null;
    const { data, error } = await client
      .from('oracle_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw new Error(toMessage(error));
    return data;
  }

  async function upsertOracleProfile(profileData) {
    const client = await requireClient();
    const user = await getUser();
    if (!user) throw new Error('Oracle profili icin once giris yapmalisiniz.');
    const payload = {
      user_id: user.id,
      reading_count: Math.max(0, Number(profileData.reading_count) || 0),
      accepted_count: Math.max(0, Number(profileData.accepted_count) || 0),
      refused_count: Math.max(0, Number(profileData.refused_count) || 0),
      axis_scores: profileData.axis_scores || {},
      accepted_axes: profileData.accepted_axes || {},
      refused_axes: profileData.refused_axes || {},
      dominant_axis: profileData.dominant_axis || null,
      last_reading_at: profileData.last_reading_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await client
      .from('oracle_profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw new Error(toMessage(error));
    return data;
  }

  async function fetchUserDartStats(limit = 12) {
    const client = await requireClient();
    const user = await getUser();
    if (!user) throw new Error('Dart istatistikleri icin once giris yapmalisiniz.');
    const recentLimit = Math.max(1, Number(limit) || 12);

    const { data, error } = await client
      .from('dart_matches')
      .select('id, red_user_id, blue_user_id, winner_user_id, winner_slot, start_score, duration_seconds, red_final_score, blue_final_score, status, summary, completed_at, created_at, opponent_label, opponent_type')
      .or(`red_user_id.eq.${user.id},blue_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw new Error(toMessage(error));

    const matches = data || [];
    const totals = {
      matches: matches.length,
      wins: 0,
      losses: 0,
      darts: 0,
      scored: 0,
      highestTurn: 0,
      oneEighties: 0,
      busts: 0
    };

    const recent = matches.map((match) => {
      const slot = match.red_user_id === user.id ? 'RED' : 'BLUE';
      const opponentSlot = slot === 'RED' ? 'BLUE' : 'RED';
      const own = dartPlayerSummary(match.summary, slot);
      const opponent = dartPlayerSummary(match.summary, opponentSlot);
      const won = match.winner_user_id === user.id;

      if (match.status === 'completed') {
        if (won) totals.wins += 1;
        else totals.losses += 1;
      }

      totals.darts += Number(own.totalDarts || 0);
      totals.scored += Number(own.totalScored || 0);
      totals.highestTurn = Math.max(totals.highestTurn, Number(own.highestTurn || 0));
      totals.oneEighties += Number(own.oneEighties || 0);
      totals.busts += Number(own.busts || 0);

      return {
        id: match.id,
        slot,
        won,
        status: match.status,
        created_at: match.completed_at || match.created_at,
        duration_seconds: match.duration_seconds,
        opponentType: match.opponent_type || 'human',
        own: {
          label: own.label || (slot === 'RED' ? 'Kirmizi Oyuncu' : 'Mavi Oyuncu'),
          average: Number(own.average || 0),
          highestTurn: Number(own.highestTurn || 0),
          totalDarts: Number(own.totalDarts || 0),
          turnsCount: Number(own.turnsCount || 0),
          busts: Number(own.busts || 0),
          oneEighties: Number(own.oneEighties || 0),
          finalScore: slot === 'RED' ? match.red_final_score : match.blue_final_score
        },
        opponent: {
          label: opponent.label || match.opponent_label || (opponentSlot === 'RED' ? 'Kirmizi Oyuncu' : 'Mavi Oyuncu'),
          finalScore: opponentSlot === 'RED' ? match.red_final_score : match.blue_final_score
        }
      };
    });

    return {
      totals: {
        ...totals,
        average: totals.darts > 0 ? Number(((totals.scored / totals.darts) * 3).toFixed(1)) : 0
      },
      recent: recent.slice(0, recentLimit)
    };
  }

  function validateArticlePayload(payload) {
    if (!payload.title) throw new Error('Baslik gerekli.');
    if (!payload.slug) throw new Error('Gecerli bir slug gerekli.');
    if (!payload.summary) throw new Error('Ozet gerekli.');
    if (!payload.content_html) throw new Error('Makale icerigi gerekli.');
    if (!['draft', 'published', 'archived'].includes(payload.status)) {
      throw new Error('Gecerli bir yayin durumu secin.');
    }
  }

  window.ConviviumBackend = {
    isConfigured,
    getClient,
    createScopedClient,
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
    createDartMatchWithClient,
    saveDartThrowsWithClient,
    fetchUserDartStats,
    fetchOracleProfile,
    upsertOracleProfile,
    updateRecommendationOutcome,
    slugify
  };
})();
