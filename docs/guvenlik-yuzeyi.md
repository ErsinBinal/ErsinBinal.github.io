# Guvenlik Yuzeyi Envanteri (PO-3)

Son guncelleme: 2026-07-17. Bu dosya, sitenin dis dunyaya acilan tum
noktalarini tek yerde tutar: hangi origin neden whitelist'te, hangi sayfada.
Yeni bir dis servis eklerken BURAYI da guncelle.

## Whitelist'teki origin'ler ve gerekceleri

| Origin | Ne icin | Hangi sayfalar |
|---|---|---|
| `https://cdn.jsdelivr.net` | supabase-js v2 istemcisi + Phaser (ash-runner-2) | index, account/*, admin, oyunlar, tools/* (supabase kullananlar), makaleler, oracle |
| `https://*.supabase.co` + `wss://*.supabase.co` | Auth, profil, skor, makale, realtime (dart-online) | Supabase kullanan tum sayfalar |
| `https://*.workers.dev` | Convivium Oracle worker (public AI proxy, /enrich-profile, /beacon) | index, oracle, dashboard |
| `https://convivium-oracle.convivium.workers.dev` (img-src) | origin-beacon pikseli (canary phone-home) | 404 (acik); diger sayfalarda `img-src https:` genisligi icinden gecer |
| `https://fonts.googleapis.com` + `https://fonts.gstatic.com` | Google Fonts (stil + font dosyasi) | index, account/*, admin, legal/*, bugy-studio, makaleler |
| `https://cdnjs.cloudflare.com` | Font Awesome webfont | SADECE games/cyberpunk-logic-game.html |
| `https://www.youtube.com`, `https://www.youtube-nocookie.com`, `https://player.vimeo.com` (frame-src) | Makale/admin editorunde video embed | makaleler, admin |

## Bilincli genislikler (kabul edilen riskler)

* `img-src https:` bircok sayfada acik: admin/makale editorunde kullanicinin
  harici gorsel URL'si gomabilmesi + beacon pikseli icin. Riski dusuk
  (img exfiltration yuzeyi), kullanim degeri yuksek. Daraltilacaksa once
  makale gorsellerinin origin envanteri cikarilmali.
* `script-src 'unsafe-inline'`: sayfalarin cogu tek-dosya (inline script)
  mimarisinde. Nonce/hash'e gecis buyuk refactor; statik sitede kazanim
  sinirli. Acik karar: simdilik kaliyor.
* `bugy-studio.html` script-src'te 'unsafe-inline' YOK (en siki sayfa).

## 2026-07-02 kirpmalari (yapildi)

* `tools/barista.html`: `unpkg.com` (lottie-player) script'i kaldirildi —
  sayfada hicbir `<lottie-player>` ogesi yoktu, kutuphane olu yuktu.
  `connect-src`'teki asiri genis `https:` de kaldirildi.
* `index.html`: script-src'ten kullanilmayan `unpkg.com` dusuruldu;
  karsiliksiz `cdnjs.cloudflare.com` preconnect'i silindi.
* `pages/makaleler.html`: script-src'ten kullanilmayan `unpkg.com` dusuruldu.

## Dis cagri yapan JS envanteri

* `assets/js/supabase-client.js` -> `*.supabase.co` (tum backend islemleri)
* `assets/js/home-protocol.js` -> worker (oracle sorgusu; endpoint meta tag
  `convivium-oracle-endpoint` uzerinden)
* `assets/js/supabase-client.js predictProfileFromName` -> worker
  `/enrich-profile` (Supabase access token Bearer; Worker `/auth/v1/user` ile
  dogrular, ham token loglanmaz)
* `assets/js/origin-beacon.js` -> worker /beacon (img pikseli, oturumda 1 kez)
* Service worker: yalnizca same-origin fetch'leri cache'ler; dis istekler
  pass-through.

## Worker istek siniri (2026-07-17)

* Oracle, enrich-auth, enrich ve beacon ayri SQLite-backed Durable Object kota
  bucket'lari kullanir; aktor hash'i ayni Cloudflare lokasyonundan bagimsiz ayni
  sayaca gider.
* JSON endpoint'leri `application/json` ve 4096 byte govde sinirinda.
* Beacon `GET/HEAD`, 2048 karakter, bilinen protokol ve gecerli host ile
  sinirli. Triyaj AI/webhook cagirmaz; yalniz yerel ignore/watch logu uretir.
* `/health` no-store servis ve Worker version metadata doner.
* Yapilandirilmis loglar ham IP, Bearer token veya istek govdesi yazmaz.

## Sir yonetimi

* Frontend'te SIR YOK: Supabase anon key public'tir (RLS korur);
  worker sirlari (TAVILY_API_KEY, GEMINI_API_KEY) `wrangler secret` ile
  worker tarafinda tutulur; repo'da yalnizca isimleri gecer.

## Kontrol listesi (yeni servis eklerken)

1. Origin'i SADECE ihtiyac duyan sayfanin CSP'sine ekle (hepsine degil).
2. Bu dosyaya satir ekle (ne icin, hangi sayfa).
3. `connect-src https:` gibi joker ASLA ekleme; tam host yaz.
4. Worker'a yeni endpoint eklediysen CORS origin kontrolunu unutma.
