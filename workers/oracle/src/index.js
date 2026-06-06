const ORACLE_SYSTEM_PROMPT = [
  'Kisa, net, Turkce cevap ver.',
  'Convivium terminali tonunda ol.',
  'Dis servis, model veya API kullandigindan bahsetme.',
  'Bilmedigin konuda belirsizligi kisaca soyle.',
  'En fazla 4 cumle.'
].join(' ');

const FALLBACK_LINES = [
  'oracle: Sinyal zayif ama rota net. Soruyu kucult, ilk varsayimi test et, sonra tekrar genislet.',
  'oracle: Su an dis kanallar sessiz. En iyi hamle, soruyu tek karar noktasina indirip oradan ilerlemek.',
  'oracle: Cevap gecikiyorsa sistem sana beklemeyi degil, daha iyi bir soru yazmayi ogretiyor olabilir.'
];

const normalizeAnswer = (answer) => String(answer || '')
  .replace(/\r/g, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim()
  .slice(0, 900);

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers
  }
});

const corsHeaders = (request, env) => {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
};

const hashText = async (text) => {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
};

const readJson = async (request) => {
  try {
    return await request.json();
  } catch {
    return {};
  }
};

const cacheTtl = (env) => {
  const ttl = Number(env.ORACLE_CACHE_TTL || 900);
  return Number.isFinite(ttl) && ttl > 0 ? Math.floor(ttl) : 900;
};

const readCache = async (cacheKey) => {
  try {
    return await caches.default.match(cacheKey);
  } catch {
    return null;
  }
};

const readCachedBody = async (cacheKey) => {
  const cached = await readCache(cacheKey);
  if (!cached) return null;
  try {
    return await cached.json();
  } catch {
    return null;
  }
};

const writeCache = async (cacheKey, body, env) => {
  try {
    await caches.default.put(cacheKey, json(body, 200, {
      'Cache-Control': `max-age=${cacheTtl(env)}`
    }));
  } catch {
    // Cache failures should never prevent the oracle answer from reaching the UI.
  }
};

const buildPrompt = (question) => `${ORACLE_SYSTEM_PROMPT} Soru: ${question}`;

const askPollinations = async (prompt, signal) => {
  const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, { signal });
  if (!response.ok) {
    const error = new Error(`pollinations status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const answer = normalizeAnswer(await response.text());
  if (!answer) throw new Error('empty pollinations response');
  return answer;
};

const askCloudflareAI = async (question, env) => {
  if (!env.AI) throw new Error('cloudflare ai binding missing');

  const response = await env.AI.run(env.CLOUDFLARE_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: ORACLE_SYSTEM_PROMPT },
      { role: 'user', content: question }
    ],
    max_tokens: 220,
    temperature: 0.45
  });

  const answer = normalizeAnswer(response?.response || response?.result?.response);
  if (!answer) throw new Error('empty cloudflare ai response');
  return answer;
};

const askGroq = async (question, env, signal) => {
  if (!env.GROQ_API_KEY) throw new Error('groq key missing');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL || 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: ORACLE_SYSTEM_PROMPT },
        { role: 'user', content: question }
      ],
      max_tokens: 220,
      temperature: 0.45
    })
  });

  if (!response.ok) {
    const error = new Error(`groq status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const answer = normalizeAnswer(data?.choices?.[0]?.message?.content);
  if (!answer) throw new Error('empty groq response');
  return answer;
};

const askOpenRouter = async (question, env, signal) => {
  if (!env.OPENROUTER_API_KEY) throw new Error('openrouter key missing');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ersinbinal.github.io/',
      'X-Title': 'Convivium Oracle'
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL || 'mistralai/mistral-small-3.2-24b-instruct:free',
      messages: [
        { role: 'system', content: ORACLE_SYSTEM_PROMPT },
        { role: 'user', content: question }
      ],
      max_tokens: 220,
      temperature: 0.45
    })
  });

  if (!response.ok) {
    const error = new Error(`openrouter status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const answer = normalizeAnswer(data?.choices?.[0]?.message?.content);
  if (!answer) throw new Error('empty openrouter response');
  return answer;
};

const askGemini = async (question, env, signal) => {
  if (!env.GEMINI_API_KEY) throw new Error('gemini key missing');

  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: ORACLE_SYSTEM_PROMPT }]
      },
      contents: [{
        role: 'user',
        parts: [{ text: question }]
      }],
      generationConfig: {
        maxOutputTokens: 220,
        temperature: 0.45
      }
    })
  });

  if (!response.ok) {
    const error = new Error(`gemini status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const answer = normalizeAnswer(data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join(''));
  if (!answer) throw new Error('empty gemini response');
  return answer;
};

const withTimeout = async (callback, ms = 18000) => {
  const controller = new AbortController();
  let timeout = null;
  try {
    return await Promise.race([
      callback(controller.signal),
      new Promise((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error('provider timeout'));
        }, ms);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const fallbackAnswer = async (question) => {
  const hash = await hashText(question);
  const index = parseInt(hash.slice(0, 2), 16) % FALLBACK_LINES.length;
  return FALLBACK_LINES[index];
};

const answerOracle = async (question, env) => {
  const prompt = buildPrompt(question);
  const providers = [
    { name: 'cloudflare-ai', ask: () => askCloudflareAI(question, env) },
    { name: 'groq', ask: signal => askGroq(question, env, signal) },
    { name: 'openrouter', ask: signal => askOpenRouter(question, env, signal) },
    { name: 'gemini', ask: signal => askGemini(question, env, signal) },
    { name: 'pollinations', ask: signal => askPollinations(prompt, signal) }
  ];
  const errors = [];

  for (const provider of providers) {
    try {
      const answer = await withTimeout(provider.ask);
      return { answer, provider: provider.name };
    } catch (error) {
      errors.push({
        provider: provider.name,
        message: error?.message || String(error),
        status: error?.status || 0
      });
    }
  }

  return {
    answer: await fallbackAnswer(question),
    provider: 'local',
    degraded: true,
    errors
  };
};

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return json({ error: 'method not allowed' }, 405, cors);
    }

    const body = await readJson(request);
    const question = normalizeAnswer(body.question || body.query || '').slice(0, 520);
    if (!question) {
      return json({ error: 'empty question' }, 400, cors);
    }

    const cacheKey = new Request(`https://oracle.cache/${await hashText(question.toLowerCase())}`);
    const cachedBody = await readCachedBody(cacheKey);
    if (cachedBody) {
      return json({ ...cachedBody, cached: true }, 200, cors);
    }

    const result = await answerOracle(question, env);
    const responseBody = {
      answer: result.answer,
      provider: result.provider,
      degraded: Boolean(result.degraded)
    };

    await writeCache(cacheKey, responseBody, env);

    return json(responseBody, 200, cors);
  }
};
