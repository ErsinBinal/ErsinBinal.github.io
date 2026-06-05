# Convivium Oracle Worker

Cloudflare Worker proxy for the command-shell oracle.

## Deploy

```bash
npx wrangler deploy -c workers/oracle/wrangler.toml
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
