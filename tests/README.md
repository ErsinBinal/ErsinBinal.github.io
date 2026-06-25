# Akis Testleri

Sitenin uctan uca calistigini dogrulayan testler. İki katman:

## 1. Smoke (hafif, bagimliliksiz)

Dis uclari yoklar: sayfalar 200 mu, worker `/oracle` ve `/enrich-profile`
yanit veriyor mu, Supabase erisilebilir mi.

```bash
npm run test:smoke
# Worker (AI arama) kontrollerini atla:
SKIP_WORKER=1 npm run test:smoke
# Baska hedef:
SITE_BASE=http://localhost:8000 npm run test:smoke
```

## 2. E2E (Playwright, gercek tarayici)

Sayfa yuklemeleri, uyelik onay akisi (zorunlu/opsiyonel kutular), hukuki
baglantilar.

```bash
npm install
npx playwright install chromium   # ilk sefer
npm run test:e2e
```

Tam kayit akisini da denemek icin (**DIKKAT: prod'da gercek kullanici olusturur**):

```bash
RUN_SIGNUP=1 TEST_EMAIL=ornek@example.com TEST_PASSWORD=GucluSifre123 npm run test:e2e
```

## 3. CI ile (elle tetikleme)

GitHub -> Actions -> **Flow Check (smoke + e2e)** -> Run workflow.
E2E raporu calisma sonunda `playwright-report` artifact'i olarak indirilebilir.

> Hepsi birden: `npm test` (once smoke, sonra e2e).
