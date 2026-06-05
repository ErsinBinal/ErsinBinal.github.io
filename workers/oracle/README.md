# Convivium Oracle Worker

Cloudflare Worker proxy for the command-shell oracle.

## Deploy

```bash
npx wrangler deploy -c workers/oracle/wrangler.toml
```

## Optional fallback secrets

Pollinations works without a secret. Add one or both secrets to enable provider fallbacks:

```bash
npx wrangler secret put OPENROUTER_API_KEY -c workers/oracle/wrangler.toml
npx wrangler secret put GEMINI_API_KEY -c workers/oracle/wrangler.toml
```

After deploy, set the worker URL in `index.html`:

```html
<meta name="convivium-oracle-endpoint" content="https://your-worker.workers.dev">
```

