# Akis Testleri

Sitenin davranışını ve uçtan uca çalışmasını doğrulayan testler. Dört yerel
katman ve bir CI kapısı vardır:

## 1. Unit / karakterizasyon (hızlı, bağımlılıksız)

Ana terminalin route/rehber registry'lerini, global komut-alias-önek dispatch
uzayını, VFS path/lock/storage çıktılarını, kalıcı `/home` yazma-ekleme-silme
semantiği ile dosya/ad/içerik limitlerini, immutable world registry'si ile oda
paneli/inceleme/görev/unvan geçişlerini, Presence/Chat oda tüketimini,
frontend Supabase Bearer taşımasını ve Service Worker install/update/offline
yaşam döngüsünü kilitler. Dış ağa çıkmaz.

```bash
npm run test:unit
```

## 2. Worker runtime (yerel Workers ortamı)

Durable Object kotasını ve Worker HTTP sınırını Cloudflare Workers runtime
içinde çalıştırır. Remote binding'ler kapalıdır; AI/provider çağrısı yapmaz.

```bash
npm run test:worker
```

## 3. Smoke (hafif, bağımlılıksız)

Dis uclari yoklar: sayfalar 200 mu, worker `/oracle` ve `/enrich-profile`
yanit veriyor mu, Supabase erisilebilir mi.

```bash
npm run test:smoke
# Worker (AI arama) kontrollerini atla:
SKIP_WORKER=1 npm run test:smoke
# Baska hedef:
SITE_BASE=http://localhost:8000 npm run test:smoke
```

## 4. E2E (Playwright, gerçek tarayıcı)

Sayfa yuklemeleri, uyelik onay akisi (zorunlu/opsiyonel kutular), hukuki
baglantilar.

```bash
npm ci
npx playwright install chromium   # ilk sefer
npm run test:e2e
```

Tam kayit akisini da denemek icin (**DIKKAT: prod'da gercek kullanici olusturur**):

```bash
RUN_SIGNUP=1 TEST_EMAIL=ornek@example.com TEST_PASSWORD=GucluSifre123 npm run test:e2e
```

## 5. CI ve deploy kapısı

GitHub -> Actions -> **Flow Check (smoke + e2e)** -> Run workflow.
E2E raporu calisma sonunda `playwright-report` artifact'i olarak indirilebilir.
Oracle deploy workflow'u `npm ci`, `npm run check` ve Wrangler dry-run
geçmeden production deploy yapmaz; ardından `/health` version ID'yi loglar.

> Hepsi birden: `npm test` (unit, Worker runtime, smoke, ardından e2e).
