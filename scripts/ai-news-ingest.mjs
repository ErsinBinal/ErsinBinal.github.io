import crypto from 'node:crypto';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_NEWS_MODEL = process.env.OPENAI_NEWS_MODEL || 'gpt-5.5';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://airmhxfgtslsgrdhvfin.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_ITEMS = Number(process.env.AI_NEWS_MAX_ITEMS || 5);

const required = [
  ['OPENAI_API_KEY', OPENAI_API_KEY],
  ['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY]
];

for (const [name, value] of required) {
  if (!value) {
    throw new Error(`${name} is required.`);
  }
}

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      maxItems: MAX_ITEMS,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          category: { type: 'string', enum: ['finance', 'academic', 'software'] },
          title: { type: 'string', minLength: 8, maxLength: 120 },
          summary: { type: 'string', minLength: 30, maxLength: 260 },
          body_html: { type: 'string', minLength: 120, maxLength: 2600 },
          primary_source_name: { type: 'string', minLength: 2, maxLength: 120 },
          primary_source_url: { type: 'string', minLength: 12, maxLength: 500 },
          source_published_at: { type: ['string', 'null'] },
          significance: { type: 'string', minLength: 20, maxLength: 320 }
        },
        required: [
          'category',
          'title',
          'summary',
          'body_html',
          'primary_source_name',
          'primary_source_url',
          'source_published_at',
          'significance'
        ]
      }
    }
  },
  required: ['items']
};

const prompt = `
You are Convivium's scheduled AI intelligence editor.

Task:
Find important artificial intelligence developments from the last 6 hours, or if there are too few, the newest still-relevant developments not already likely to be stale. Cover only meaningful developments in these categories:
1. finance: AI funding, acquisitions, earnings, market-moving AI infrastructure, chips, cloud, regulation with financial impact.
2. academic: peer-reviewed papers, arXiv/preprint releases from identifiable institutions, benchmark releases, model/system cards, official research lab posts.
3. software: model/API releases, developer tooling, open-source releases, security advisories, framework/runtime updates.

Strict source rules:
- Use primary or first-hand sources only: company blogs, investor relations, SEC/regulator filings, official docs, GitHub releases/repos, arXiv/publisher pages, university/lab pages, government/regulator pages.
- Do not use social posts, influencers, newsletters, blogs summarizing others, YouTube, Reddit, or generic tech media as sources.
- If a claim is only available through commentary or press coverage, omit it.
- Prefer source URLs that directly verify the development.
- Avoid duplicates and avoid items already represented by the same primary URL/title.

Writing rules:
- Return Turkish text.
- Keep headlines short and concrete.
- body_html must be safe article HTML using only p, ul, li, strong, a. No script, style, img, iframe, or inline events.
- Include why it matters, what changed, and what to watch next.
- Use cautious wording. Do not speculate beyond the source.
- If fewer than ${MAX_ITEMS} verified items exist, return fewer items.

Return only valid JSON that matches the schema.
`;

function extractOutputText(response) {
  if (response.output_text) return response.output_text;

  const chunks = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) chunks.push(content.text);
      if (content.type === 'text' && content.text) chunks.push(content.text);
    }
  }
  return chunks.join('\n');
}

function sanitizeHtml(html) {
  return String(html || '')
    .replace(/<\s*(script|style|iframe|object|embed|img|video|audio)[^>]*>.*?<\s*\/\s*\1\s*>/gis, '')
    .replace(/<\s*(script|style|iframe|object|embed|img|video|audio)[^>]*\/?\s*>/gis, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\shref\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, '');
}

function hashItem(item) {
  const key = [
    item.primary_source_url,
    item.title,
    item.source_published_at ? String(item.source_published_at).slice(0, 10) : ''
  ].join('|').toLowerCase();

  return crypto.createHash('sha256').update(key).digest('hex');
}

function normalizeItem(item) {
  return {
    content_hash: hashItem(item),
    category: item.category,
    title: String(item.title || '').trim(),
    summary: String(item.summary || '').trim(),
    body_html: sanitizeHtml(item.body_html),
    primary_source_name: String(item.primary_source_name || '').trim(),
    primary_source_url: String(item.primary_source_url || '').trim(),
    source_published_at: item.source_published_at || null,
    significance: String(item.significance || '').trim(),
    collected_at: new Date().toISOString()
  };
}

async function fetchExistingHashes() {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const url = `${SUPABASE_URL}/rest/v1/ai_news_items?select=content_hash&collected_at=gte.${encodeURIComponent(since)}`;
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Could not read existing news hashes: ${response.status} ${await response.text()}`);
  }

  return new Set((await response.json()).map((row) => row.content_hash));
}

async function askOpenAI() {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_NEWS_MODEL,
      tools: [{ type: 'web_search' }],
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'ai_news_digest',
          schema,
          strict: true
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status} ${await response.text()}`);
  }

  const outputText = extractOutputText(await response.json());
  return JSON.parse(outputText);
}

async function insertItems(items) {
  if (!items.length) return [];

  const response = await fetch(`${SUPABASE_URL}/rest/v1/ai_news_items?on_conflict=content_hash`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=representation'
    },
    body: JSON.stringify(items)
  });

  if (!response.ok) {
    throw new Error(`Supabase insert failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

const existingHashes = await fetchExistingHashes();
const digest = await askOpenAI();
const incoming = (digest.items || [])
  .map(normalizeItem)
  .filter((item) => item.title && item.primary_source_url && item.body_html && !existingHashes.has(item.content_hash))
  .slice(0, MAX_ITEMS);

const inserted = await insertItems(incoming);
console.log(`AI news ingest complete. Incoming: ${incoming.length}. Inserted: ${inserted.length}.`);
