# Convivium Oracle Worker

Cloudflare Worker proxy for the public command/oracle AI channel.

The website is static on GitHub Pages, so it cannot safely host an LLM endpoint by itself. This Worker is the safety boundary between the browser command shell and external AI providers.

## Provider order

1. Cloudflare Workers AI through the `AI` binding
2. Pollinations text endpoint from inside the Worker
3. Local canned answer if every external provider fails

No provider API key is required for the default setup.

Cloudflare Workers AI currently includes a free daily allocation on Workers Free plans. Pollinations is used only as a no-key fallback from the Worker, not directly from the browser.

## Profil arastirma (`/enrich-profile`)

`POST /enrich-profile` `{ "first_name": "...", "last_name": "..." }` alir ve
kisinin olasi meslek/egitim/departman bilgisini doner.

Saglayici sirasi:

1. **Gemini + Google Search grounding** — kisiyi internette GERCEKTEN arar
   (`grounded: true`). `GEMINI_API_KEY` gerektirir.
2. Cloudflare AI / Pollinations — anahtar yoksa veya arama basarisizsa, isimden
   eglence amacli TAHMIN (`grounded: false`).

Gemini anahtarini Google AI Studio'dan al ve gizli olarak ekle:

```bash
wrangler secret put GEMINI_API_KEY
```

Sonuc 24 saat cachelenir. Cevap kullaniciya yazilmadan once frontend'de
"dogrula" onayindan gecer; kullanici onaylamadan profile kaydedilmez.

## Safety rules

- Browser requests are accepted only from `ALLOWED_ORIGINS`.
- Public HTML/JS never stores provider secrets.
- The Worker does not expose files, shell commands, repository writes, admin actions, or local developer tools.
- Responses are short text answers only.
- Basic per-IP rate limiting is enabled with `ORACLE_RATE_LIMIT`.
- Repeated questions are cached briefly with `ORACLE_CACHE_TTL`.

## Deploy

```bash
npm run deploy:oracle
```

If Cloudflare is not logged in on the machine:

```bash
npx wrangler login
npm run deploy:oracle
```

In non-interactive shells, provide a Cloudflare API token instead:

```bash
CLOUDFLARE_API_TOKEN=... npm run deploy:oracle
```

After deploy, copy the Worker URL and set it in `index.html`:

```bash
npm run set:oracle-endpoint -- https://your-worker.workers.dev
```

Then push the site to GitHub Pages.

## Local test

After deploy:

```bash
curl -i https://your-worker.workers.dev \
  -H 'Origin: https://ersinbinal.github.io' \
  -H 'Content-Type: application/json' \
  --data '{"question":"Bu site ne yapar?"}'
```

Expected response shape:

```json
{
  "answer": "oracle: ...",
  "provider": "cloudflare-ai",
  "degraded": false
}
```
