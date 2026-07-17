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

  // Supabase auth hatalarini ziyaretcinin anlayacagi Turkce mesaja cevir.
  const AUTH_ERROR_TR = {
    weak_password: 'Sifre yeterince guclu degil: en az 10 karakter olmali; kucuk harf, buyuk harf, rakam ve ozel karakter icermeli.',
    user_already_exists: 'Bu e-posta ile zaten bir uyelik var. Giris yapmayi veya sifre sifirlamayi deneyin.',
    email_exists: 'Bu e-posta ile zaten bir uyelik var. Giris yapmayi veya sifre sifirlamayi deneyin.',
    invalid_credentials: 'E-posta veya sifre hatali.',
    email_address_invalid: 'E-posta adresi gecersiz gorunuyor. Yazimi kontrol edin.',
    email_not_confirmed: 'E-posta adresiniz henuz dogrulanmamis. Gelen kutunuzdaki dogrulama bagini tiklayin.',
    over_email_send_rate_limit: 'Cok sik denediniz. Lutfen birkac dakika bekleyip tekrar deneyin.',
    signup_disabled: 'Yeni uyelik kaydi su anda kapali.',
    same_password: 'Yeni sifre eski sifrenizle ayni olamaz.',
    otp_expired: 'Baglantinin suresi dolmus. Lutfen yeni bir sifre sifirlama baglantisi isteyin.'
  };

  function toMessage(error) {
    if (!error) return '';
    const code = error.code || error.error_code;
    if (code && AUTH_ERROR_TR[code]) return AUTH_ERROR_TR[code];
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

  // Onaylanan hukuki metinlerin surumu (legal/*.html ile ayni tutulmali).
  const CONSENT_VERSION = '2026-06-26';

  async function signUp(email, password, firstName, lastName, consents = {}) {
    const client = await requireClient();
    const displayName = [firstName, lastName].filter(Boolean).join(' ').trim();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: config.redirectTo || `${window.location.origin}/account/auth.html`,
        data: {
          display_name: displayName || '',
          first_name: firstName || '',
          last_name: lastName || '',
          terms_accepted: consents.termsAccepted === true,
          terms_version: consents.termsAccepted === true ? CONSENT_VERSION : '',
          ai_consent: consents.aiConsent === true
        }
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

  // Sifremi unuttum: e-postaya sifirlama baglantisi gonderir.
  async function requestPasswordReset(email) {
    const client = await requireClient();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: config.redirectTo || `${window.location.origin}/account/auth.html`
    });
    if (error) throw new Error(toMessage(error));
  }

  // Sifirlama baglantisiyla gelen oturumda yeni sifreyi kaydeder.
  async function updatePassword(password) {
    const client = await requireClient();
    const { data, error } = await client.auth.updateUser({ password });
    if (error) throw new Error(toMessage(error));
    return data;
  }

  // Auth olaylarina abone ol (or. PASSWORD_RECOVERY).
  function onAuthChange(callback) {
    const client = getClient();
    if (!client) return null;
    const { data } = client.auth.onAuthStateChange((event, session) => callback(event, session));
    return data ? data.subscription : null;
  }

  async function getProfile() {
    const client = await requireClient();
    const user = await getUser();
    if (!user) return null;

    const { data, error } = await client
      .from('profiles')
      .select('user_id, display_name, first_name, last_name, role, profession, education, department, ai_consent, terms_version, terms_accepted_at, companion_pref, created_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw new Error(toMessage(error));
    return data;
  }

  async function upsertProfile(profileData) {
    const client = await requireClient();
    const user = await getUser();
    if (!user) throw new Error('Profil kaydetmek icin once giris yapmalisiniz.');

    const payload = { user_id: user.id };
    if (profileData.display_name !== undefined) {
      payload.display_name = String(profileData.display_name || '').slice(0, 80) || null;
    } else if (profileData.first_name !== undefined || profileData.last_name !== undefined) {
      payload.display_name = String(`${profileData.first_name || ''} ${profileData.last_name || ''}`.trim()).slice(0, 80) || null;
    }
    if (profileData.first_name !== undefined) {
      payload.first_name = String(profileData.first_name || '').slice(0, 40) || null;
    }
    if (profileData.last_name !== undefined) {
      payload.last_name = String(profileData.last_name || '').slice(0, 40) || null;
    }
    if (profileData.profession !== undefined) {
      payload.profession = String(profileData.profession || '').slice(0, 120) || null;
    }
    if (profileData.education !== undefined) {
      payload.education = String(profileData.education || '').slice(0, 120) || null;
    }
    if (profileData.department !== undefined) {
      payload.department = String(profileData.department || '').slice(0, 120) || null;
    }
    if (profileData.ai_consent !== undefined) {
      payload.ai_consent = profileData.ai_consent === true;
      payload.ai_consent_at = profileData.ai_consent === true ? new Date().toISOString() : null;
    }
    if (profileData.companion_pref !== undefined) {
      const pref = String(profileData.companion_pref || '');
      payload.companion_pref = ['off', 'v1', 'v2', 'v3', 'v4', 'pet'].includes(pref) ? pref : null;
    }
    payload.updated_at = new Date().toISOString();

    const { data, error } = await client
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw new Error(toMessage(error));
    return data;
  }

  // Profil arastirma yalnizca giris yapmis kullanicinin Supabase access token'i
  // ile cagrilir. Worker token'i dogrulamadan arama saglayicilarina ulasmaz.
  // Sonuc, kullanici onaylamadan profile yazilmaz.
  async function predictProfileFromName(firstName, lastName) {
    const session = await getSession();
    const accessToken = String(session?.access_token || '');
    if (!accessToken) {
      throw new Error('Profil arastirmasi icin once giris yapmalisiniz.');
    }

    const endpoint = (
      window.CONVIVIUM_ORACLE_ENDPOINT ||
      document.querySelector('meta[name="convivium-oracle-endpoint"]')?.content ||
      ''
    ).trim();
    if (!endpoint) {
      throw new Error('Oracle endpoint yapilandirilamadi.');
    }

    const url = `${endpoint.replace(/\/+$|$/, '')}/enrich-profile`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        first_name: String(firstName || '').trim().slice(0, 64),
        last_name: String(lastName || '').trim().slice(0, 64)
      })
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('Tahmin cevabi okunamadi.');
    }

    if (!response.ok) {
      throw new Error(data?.error || `Tahmin basarisiz: ${response.status}`);
    }

    return {
      profession: String(data.profession || '').trim() || null,
      education: String(data.education || '').trim() || null,
      department: String(data.department || '').trim() || null,
      note: String(data.note || '').trim() || null,
      grounded: Boolean(data.grounded),
      // Arama hic calistirilamadi mi (kota/gecici hata)? O zaman tekrar denenebilir.
      available: data.provider !== 'unavailable' && !data.degraded
    };
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
      mode: ['x01', 'atc', 'cricket'].includes(match.mode) ? match.mode : 'x01',
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
      segment: throwRow.segment || null,
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

  // --- Bugy / Ped sanal evcil hayvan ---------------------------------------
  async function fetchBugyPet() {
    const client = await requireClient();
    const user = await getUser();
    if (!user) return null;
    const { data, error } = await client
      .from('bugy_pets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw new Error(toMessage(error));
    return data;
  }

  async function upsertBugyPet(pet) {
    const client = await requireClient();
    const user = await getUser();
    if (!user) throw new Error('Bugy icin once giris yapmalisiniz.');
    const clampPct = (value, fallback) => {
      const n = Number(value);
      return Math.max(0, Math.min(100, Number.isFinite(n) ? Math.round(n) : fallback));
    };
    const stages = ['egg', 'hatchling', 'juvenile', 'adult'];
    const moods = ['happy', 'neutral', 'grumpy', 'feral'];
    const payload = {
      user_id: user.id,
      species: String(pet.species || 'clippy').slice(0, 40),
      name: String(pet.name || 'Bugy').slice(0, 60),
      stage: stages.includes(pet.stage) ? pet.stage : 'hatchling',
      hatched: pet.hatched !== false,
      hunger: clampPct(pet.hunger, 80),
      energy: clampPct(pet.energy, 80),
      hygiene: clampPct(pet.hygiene, 80),
      bond: clampPct(pet.bond, 40),
      mood_state: moods.includes(pet.mood_state) ? pet.mood_state : 'neutral',
      care_points: Math.max(0, Number(pet.care_points) || 0),
      born_at: pet.born_at || new Date().toISOString(),
      last_care_at: pet.last_care_at || new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      meta: pet.meta && typeof pet.meta === 'object' ? pet.meta : {},
      updated_at: new Date().toISOString()
    };
    const { data, error } = await client
      .from('bugy_pets')
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
      .select('id, mode, red_user_id, blue_user_id, winner_user_id, winner_slot, start_score, duration_seconds, red_final_score, blue_final_score, status, summary, completed_at, created_at, opponent_label, opponent_type')
      .or(`red_user_id.eq.${user.id},blue_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) throw new Error(toMessage(error));

    const matches = data || [];

    // Mod-bazli toplamlar.
    const byMode = {
      x01: { matches: 0, wins: 0, losses: 0, scored: 0, darts: 0, highestTurn: 0, oneEighties: 0, busts: 0, average: 0 },
      atc: { matches: 0, wins: 0, losses: 0, dartsSum: 0, bestDarts: 0, avgDarts: 0 },
      cricket: { matches: 0, wins: 0, losses: 0, draws: 0, pointsSum: 0, bestPoints: 0, avgPoints: 0 }
    };

    const recent = matches.map((match) => {
      const mode = ['x01', 'atc', 'cricket'].includes(match.mode) ? match.mode : 'x01';
      const slot = match.red_user_id === user.id ? 'RED' : 'BLUE';
      const opponentSlot = slot === 'RED' ? 'BLUE' : 'RED';
      const own = dartPlayerSummary(match.summary, slot);
      const opponent = dartPlayerSummary(match.summary, opponentSlot);
      const completed = match.status === 'completed';
      const won = match.winner_slot === slot;
      const draw = completed && !match.winner_slot;

      const bucket = byMode[mode];
      if (completed) {
        bucket.matches += 1;
        if (draw) { if (mode === 'cricket') bucket.draws += 1; }
        else if (won) bucket.wins += 1;
        else bucket.losses += 1;
      }

      if (mode === 'x01') {
        bucket.darts += Number(own.totalDarts || 0);
        bucket.scored += Number(own.totalScored || 0);
        bucket.highestTurn = Math.max(bucket.highestTurn, Number(own.highestTurn || 0));
        bucket.oneEighties += Number(own.oneEighties || 0);
        bucket.busts += Number(own.busts || 0);
      } else if (mode === 'atc') {
        const d = Number(own.darts || 0);
        bucket.dartsSum += d;
        if (won && d > 0) bucket.bestDarts = bucket.bestDarts ? Math.min(bucket.bestDarts, d) : d;
      } else {
        const p = Number(own.points || 0);
        bucket.pointsSum += p;
        bucket.bestPoints = Math.max(bucket.bestPoints, p);
      }

      return {
        id: match.id,
        mode,
        slot,
        won,
        draw,
        status: match.status,
        created_at: match.completed_at || match.created_at,
        duration_seconds: match.duration_seconds,
        opponentType: match.opponent_type || 'human',
        own: {
          label: own.label || (slot === 'RED' ? 'Kirmizi Oyuncu' : 'Mavi Oyuncu'),
          average: Number(own.average || 0),
          highestTurn: Number(own.highestTurn || 0),
          totalDarts: Number(own.totalDarts || 0),
          oneEighties: Number(own.oneEighties || 0),
          busts: Number(own.busts || 0),
          darts: Number(own.darts || 0),
          hits: Number(own.hits || 0),
          completed: Boolean(own.completed),
          targetsLeft: Number(own.targetsLeft || 0),
          points: Number(own.points || 0),
          closed: Number(own.closed || 0),
          segments: (own.segments && typeof own.segments === 'object') ? own.segments : {}
        },
        opponent: {
          label: opponent.label || match.opponent_label || (opponentSlot === 'RED' ? 'Kirmizi Oyuncu' : 'Mavi Oyuncu'),
          points: Number(opponent.points || 0)
        }
      };
    });

    // Ortalamalari hesapla.
    byMode.x01.average = byMode.x01.darts > 0
      ? Number(((byMode.x01.scored / byMode.x01.darts) * 3).toFixed(1)) : 0;
    byMode.atc.avgDarts = byMode.atc.matches > 0
      ? Number((byMode.atc.dartsSum / byMode.atc.matches).toFixed(1)) : 0;
    byMode.cricket.avgPoints = byMode.cricket.matches > 0
      ? Number((byMode.cricket.pointsSum / byMode.cricket.matches).toFixed(0)) : 0;

    return {
      byMode,
      totalMatches: matches.filter((m) => m.status === 'completed').length,
      matches: recent
    };
  }

  async function fetchDartLeaderboard(mode = 'all', limit = 200) {
    const client = await requireClient();
    const m = ['all', 'x01', 'atc', 'cricket'].includes(mode) ? mode : 'all';
    const { data, error } = await client.rpc('dart_leaderboard', {
      p_mode: m,
      p_limit: Math.max(1, Number(limit) || 200)
    });
    if (error) throw new Error(toMessage(error));
    return data || [];
  }

  // shards kolonu migration'i henuz calistirilmamis olabilir; kolon hatasinda
  // eski secime dusulur ki world senkronu asla kirilmasin.
  const isShardsColumnError = (error) => /shards/i.test(String(error?.message || ''));

  async function fetchWorldState() {
    const client = await requireClient();
    const user = await getUser();
    if (!user) return null;
    let { data, error } = await client
      .from('world_state')
      .select('unlocked, inventory, discovered, level, shards, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error && isShardsColumnError(error)) {
      ({ data, error } = await client
        .from('world_state')
        .select('unlocked, inventory, discovered, level, updated_at')
        .eq('user_id', user.id)
        .maybeSingle());
    }
    if (error) throw new Error(toMessage(error));
    return data;
  }

  async function saveWorldState(worldState) {
    const client = await requireClient();
    const user = await getUser();
    if (!user) throw new Error('World state icin once giris yapmalisiniz.');
    const toArray = (value) => Array.isArray(value)
      ? [...new Set(value.map((item) => String(item).slice(0, 120)))].slice(0, 200)
      : [];
    const payload = {
      user_id: user.id,
      unlocked: toArray(worldState.unlocked),
      inventory: toArray(worldState.inventory),
      discovered: toArray(worldState.discovered),
      level: Math.max(0, Math.min(99, Number(worldState.level) || 0)),
      shards: Math.max(0, Math.min(999999, Number(worldState.shards) || 0)),
      updated_at: new Date().toISOString()
    };
    let { data, error } = await client
      .from('world_state')
      .upsert(payload, { onConflict: 'user_id' })
      .select('unlocked, inventory, discovered, level, shards, updated_at')
      .single();
    if (error && isShardsColumnError(error)) {
      const { shards, ...legacyPayload } = payload;
      ({ data, error } = await client
        .from('world_state')
        .upsert(legacyPayload, { onConflict: 'user_id' })
        .select('unlocked, inventory, discovered, level, updated_at')
        .single());
    }
    if (error) throw new Error(toMessage(error));
    return data;
  }

  async function fetchDailySignal(signalDate) {
    const client = await requireClient();
    const today = signalDate || new Date().toISOString().slice(0, 10);
    const { data, error } = await client
      .from('daily_signal')
      .select('signal_date, body')
      .eq('signal_date', today)
      .maybeSingle();
    if (error) throw new Error(toMessage(error));
    return data;
  }

  async function fetchWallMarks(room, limit = 8) {
    const client = await requireClient();
    let query = client
      .from('wall_marks')
      .select('id, room, body, created_at')
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(50, Number(limit) || 8)));
    if (room) query = query.eq('room', String(room).slice(0, 64));
    const { data, error } = await query;
    if (error) throw new Error(toMessage(error));
    return data || [];
  }

  async function leaveWallMark(mark) {
    const client = await requireClient();
    const user = await getUser();
    if (!user) throw new Error('Iz birakmak icin once giris yapmalisiniz.');
    const body = String(mark.body || '')
      .replace(/[\x00-\x1f\x7f]/g, " ")
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 280);
    if (!body) throw new Error('Bos iz birakilamaz.');
    const payload = {
      user_id: user.id,
      room: String(mark.room || '/').slice(0, 64),
      body
    };
    const { data, error } = await client
      .from('wall_marks')
      .insert(payload)
      .select('id, room, body, created_at')
      .single();
    if (error) throw new Error(toMessage(error));
    return data;
  }

  // --- Sisedeki mesaj (bottle): RPC tabanli, gunluk limit sunucuda ----------
  async function throwBottle(body, replyTo) {
    const client = await requireClient();
    const { data, error } = await client.rpc('throw_bottle', {
      p_body: String(body || '').slice(0, 280),
      p_reply_to: replyTo || null
    });
    if (error) throw new Error(toMessage(error));
    return Array.isArray(data) ? data[0] : data;
  }

  async function catchBottle() {
    const client = await requireClient();
    const { data, error } = await client.rpc('catch_bottle');
    if (error) throw new Error(toMessage(error));
    const row = Array.isArray(data) ? data[0] : data;
    return row && row.id ? row : null;
  }

  async function listBottles(limit = 10) {
    const client = await requireClient();
    const user = await getUser();
    if (!user) throw new Error('Giris gerekli.');
    const { data, error } = await client
      .from('bottle_messages')
      .select('id, sender_id, body, status, catcher_id, caught_at, reply_to, created_at')
      .or(`sender_id.eq.${user.id},catcher_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(30, Number(limit) || 10)));
    if (error) throw new Error(toMessage(error));
    return { userId: user.id, rows: data || [] };
  }

  // Gizlilik-dostu olcum (PO-6): cerezsiz, kimliksiz olay sayaci.
  // - Kimlik YOK: user_id/IP/fingerprint gonderilmez; yalnizca olay adi + sayfa.
  // - Oturum basina olay basi 1 kayit (sessionStorage tekillestirme).
  // - Tablo yoksa / Supabase kapaliysa SESSIZCE no-op (deneyim bozulmaz).
  // Sema: docs/database/2026-07-02-site-events.sql (anon yalniz INSERT; SELECT yok).
  const SITE_EVENT_KEYS = new Set([
    'home.view', 'articles.view', 'command.first', 'oracle.ask',
    'game.start', 'login.done', 'offline.node.solved'
  ]);
  async function recordSiteEvent(eventKey, page) {
    try {
      if (!SITE_EVENT_KEYS.has(eventKey)) return false;
      const dedupeKey = `convivium.evt.${eventKey}`;
      if (sessionStorage.getItem(dedupeKey)) return false;
      sessionStorage.setItem(dedupeKey, '1');
      const client = await requireClient();
      const { error } = await client.from('site_events').insert({
        event_key: eventKey,
        page: String(page || location.pathname).slice(0, 80)
      });
      return !error;
    } catch {
      return false; // olcum asla deneyimi bozmaz
    }
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
    upsertProfile,
    isAdmin,
    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
    onAuthChange,
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
    fetchDartLeaderboard,
    fetchBugyPet,
    upsertBugyPet,
    predictProfileFromName,
    fetchOracleProfile,
    upsertOracleProfile,
    updateRecommendationOutcome,
    fetchWorldState,
    saveWorldState,
    fetchDailySignal,
    fetchWallMarks,
    leaveWallMark,
    throwBottle,
    catchBottle,
    listBottles,
    recordSiteEvent,
    slugify
  };
})();
