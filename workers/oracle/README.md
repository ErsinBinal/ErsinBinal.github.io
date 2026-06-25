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

Yalnizca GERCEK arama kullanilir; arama tutmazsa **uydurma uretilmez**,
`provider: "unavailable"` doner. Iki ucretsiz saglayici desteklenir (en az
birini yapilandir):

**1) Google Programmable Search (UCRETSIZ, gunde 100 sorgu) — onerilen**

Gercek Google sonuc ozetlerini alir, Cloudflare AI (ucretsiz) ile ozetler.

- Arama motoru olustur (tum web'i aramaya ayarla) ve `cx` kimligini al:
  https://programmablesearchengine.google.com
- "Custom Search API" anahtari (Google Cloud Console):
  https://console.cloud.google.com -> APIs & Services -> Custom Search API -> Enable -> Credentials -> API key

```bash
# cx genelde gizli degildir; wrangler.toml [vars] icine GOOGLE_CSE_CX olarak da koyabilirsin
wrangler secret put GOOGLE_CSE_KEY
wrangler secret put GOOGLE_CSE_CX   # veya wrangler.toml [vars]
```

**2) Gemini + Google Search grounding (gunluk ucretsiz kota)**

```bash
wrangler secret put GEMINI_API_KEY   # https://aistudio.google.com/apikey
```

Ikisi de tanimliysa once CSE, sonra Gemini denenir. Basarili (bilgi bulunan veya
"bulunamadi" diyen) sonuc 24 saat cachelenir; basarisiz aramalar (kota/hata)
CACHELENMEZ, kullanici sonra tekrar deneyebilir. Cevap kullaniciya yazilmadan
once frontend'de "dogrula" onayindan gecer; kullanici onaylamadan profile
kaydedilmez.

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
