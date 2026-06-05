# Convivium Oracle Worker

Cloudflare Worker proxy for the command-shell oracle.

## Deploy

CLI with Node/npm available:

```bash
npx wrangler deploy -c workers/oracle/wrangler.toml
```

Dashboard without Node/npm:

1. Open Cloudflare Dashboard.
2. Go to Workers & Pages.
3. Create a Worker named `convivium-oracle`.
4. Add a Workers AI binding named `AI`.
5. Paste `workers/oracle/src/index.js` into the Worker editor.
6. Add these environment variables:
   - `ALLOWED_ORIGINS`: `https://ersinbinal.github.io,http://localhost:8000,http://127.0.0.1:8000`
   - `CLOUDFLARE_AI_MODEL`: `@cf/meta/llama-3.1-8b-instruct`
   - `ORACLE_CACHE_TTL`: `900`
7. Deploy and copy the `https://...workers.dev` URL.
8. Put that URL into `index.html`:

```html
<meta name="convivium-oracle-endpoint" content="https://your-worker.workers.dev">
```

## Provider order

1. Cloudflare Workers AI, no extra API key, uses the Worker `AI` binding
2. Groq, optional `GROQ_API_KEY`
3. OpenRouter, optional `OPENROUTER_API_KEY`
4. Gemini, optional `GEMINI_API_KEY`
5. Pollinations, no secret, last external fallback
6. Local short oracle line

## Optional fallback secrets

Cloudflare Workers AI and Pollinations work without provider secrets. Add any of these to enable more external fallbacks:

```bash
npx wrangler secret put GROQ_API_KEY -c workers/oracle/wrangler.toml
npx wrangler secret put OPENROUTER_API_KEY -c workers/oracle/wrangler.toml
npx wrangler secret put GEMINI_API_KEY -c workers/oracle/wrangler.toml
```

After deploy, set the worker URL in `index.html`:

```html
<meta name="convivium-oracle-endpoint" content="https://your-worker.workers.dev">
```
