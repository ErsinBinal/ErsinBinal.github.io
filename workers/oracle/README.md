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

Bu rota public anonim kullanima acik degildir. Tarayici mevcut Supabase
oturumunun access token'ini `Authorization: Bearer ...` ile gonderir; Worker
token'i Supabase `/auth/v1/user` uzerinden dogrulamadan arama saglayicilarina
gitmez. Kota IP yerine dogrulanmis `user.id` uzerinden uygulanir.

Yalnizca GERCEK arama kullanilir; arama tutmazsa **uydurma uretilmez**,
`provider: "unavailable"` doner. Uc ucretsiz saglayici desteklenir (en az
birini yapilandir). Sira: **Tavily -> Google CSE -> Gemini**.

**1) Tavily (UCRETSIZ, LLM icin arama API'si) — onerilen**

Kart gerektirmez, aylik ucretsiz kota. Gercek sonuclari Cloudflare AI (ucretsiz)
ile ozetler.

- Hesap ac ve anahtari al: https://app.tavily.com

```bash
wrangler secret put TAVILY_API_KEY
```

**2) Google Programmable Search (UCRETSIZ, gunde 100 sorgu)**

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
- Oracle, profil auth, profil arastirma ve beacon icin ayri kotalar vardir.
  Sayaclar aktor hash'ine ayrilmis SQLite-backed Durable Object'larda tutulur;
  isolate veya Cloudflare lokasyonu degisse de ayni aktor ayni sayaca gider.
- JSON rotalari yalnizca `application/json` kabul eder ve govdeyi hem bildirilen
  `Content-Length` hem de stream sirasinda 4 KiB ile sinirlar.
- Beacon yalnizca `GET/HEAD`, sinirli URL, gecerli host ve bilinen protokol kabul
  eder. Klon triyaji sadece yerel siniflandirma ve log uretir; AI saglayicisi ya
  da webhook cagirmaz.
- Loglar endpoint/karar bazli JSON kayitlaridir; bearer token ve ham IP yazilmaz.
- Repeated questions are cached briefly with `ORACLE_CACHE_TTL`.

Varsayilan kota degiskenleri:

| Akis | Limit | Pencere | Aktor |
|---|---:|---:|---|
| Oracle | 12 | 60 sn | IP hash |
| Profil auth denemesi | 20 | 60 sn | IP hash |
| Profil arastirma | 4 | 3600 sn | Supabase user ID hash |
| Beacon | 4 | 3600 sn | IP hash |

`GET /health`, `Cache-Control: no-store` ile servis durumunu ve
`CF_VERSION_METADATA` binding'inden production version ID/tag/timestamp bilgisini
doner.

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

Gercek saglayiciya ulasmayan Workers-runtime testleri ve production config
paketleme kontrolu:

```bash
npm run test:worker
npx wrangler deploy --dry-run --config workers/oracle/wrangler.toml
```

Vitest ayarinda remote binding'ler kapali tutulur. Testler yetkisiz profil
istegini provider'dan once durdurur ve AI cagrisi yapmaz.

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
