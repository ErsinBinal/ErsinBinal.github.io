# Üretim Sertleştirme — Handoff

Son güncelleme: 18 Temmuz 2026 (Home Protocol Faz 2C eş güdümü)
Durum: **KAPANDI — A0/A1/A2/A3/B1/B2 tamamlandı ve canlı doğrulandı. Aktif
geliştirme hattı yeniden Home Protocol modülerleştirmesidir.**
Aktif hat: [Home Protocol Modülerleştirme](home-protocol-modularization-handoff.md).

Bu belge P0/P1 üretim güvenliği çalışmalarının tek yaşayan takip noktasıdır.
Oturum yarıda kalırsa önce buradaki “Güncel durum” ve “Sonraki kesin adım”
bölümleri okunmalıdır. Teknik bulguların başlangıç kanıtı
[Site Teknik Değerlendirmesi](site-teknik-degerlendirme-2026-07-17.md) içindedir.

## Öncelik kilidi

Monolit refaktörünün Faz 1B ve sonrası için konan aşağıdaki öncelik kilidi
18 Temmuz 2026'da tamamen kapandı:

1. Tekrarlanabilir Node kurulumu: senkron lock, `npm ci`, temiz audit.
2. Worker kötüye kullanım sınırı: kalıcı/ortak kota, `/enrich-profile` kimliği,
   beacon ve JSON gövde sınırları, yapılandırılmış loglar.
3. Worker deploy kapısı: aynı commit için unit/integration test, syntax/config
   preflight, production deploy ve sürüm görünürlüğü.
4. Service Worker Promise yaşam döngüsü ve offline/update testi.
5. Eksik CSP'ler, CDN sürüm sabitleme ve gerçek HTTP header hosting kararı.
6. Ardından terminal Faz 1B ve daha bağlı VFS/ekonomi/Oracle modülleri.

Faz 1B `convivium-v198`, Faz 2A VFS navigation çekirdeği `convivium-v199`, Faz
2B kalıcı `/home` motoru `convivium-v200` ile canlıya alındı. Çalışma ağacındaki
`convivium-v201`, henüz yayımlanmamış Faz 2C world/room read-model dilimini
temsil eder.

## Değişmez kurallar

- Canlı Worker'a doğrudan deploy etme; bu çalışma yalnız repo/workflow
  hazırlığıdır. Deploy kullanıcı veya CI yetkisiyle yapılır.
- Provider çağrısı yapan testler dış AI maliyeti üretmemeli; ağ çağrıları mock
  edilmeli veya doğrulama katmanında reddedilmelidir.
- Provider sırlarını kaynak, test fixture veya workflow loguna yazma.
- CORS'u kimlik doğrulama veya rate limit yerine güvenlik sınırı sayma.
- Yeni rate-limit çözümünün gerçek tutarlılık kapsamını belgelemeksizin
  “global” deme.
- Her faz sonunda bu belgeyi ve teknik değerlendirmedeki durum tablosunu aynı
  değişiklik setinde güncelle.
- Çalışma ağacındaki Home Protocol Faz 1A değişikliklerini koru; P0 çalışması
  onları geri almamalı veya aynı mantıksal commit'e karıştırmamalıdır.

## Teknik karar notları

### Rate Limiting binding tek başına yeterli değil

Cloudflare'ın 23 Nisan 2026 tarihli Rate Limiting API dokümanına göre binding
sayaçları isolate belleğindeki `Map`'ten daha güçlüdür; ancak limit her
Cloudflare lokasyonu için ayrıdır ve eventual-consistent çalışır. Bu nedenle
rapordaki “farklı lokasyonlara dağılan çağrılar ortak kotaya tabi” kabulü için
kalıcı tek-koordinatör (ör. Durable Object) veya eşdeğer global tasarım gerekir.

### `/enrich-profile` kimliği

Frontend onayı tek başına endpoint güvenliği değildir. Worker, sağlayıcıya
gitmeden önce geçerli Supabase oturumunu doğrulamalı ve kota anahtarını doğrulanmış
kullanıcı kimliğinden üretmelidir. Genel Oracle anonim kalabilir; ayrı ve daha
düşük maliyetli bir kota kullanmalıdır.

Uygulanan sözleşme: frontend güncel Supabase access token'ını Bearer olarak
taşır; Worker token'ı `/auth/v1/user` ile doğrular. Doğrulama öncesi IP tabanlı
ayrı bir auth-deneme kotası, doğrulama sonrası `user.id` tabanlı enrich kotası
vardır. Kaynaktaki Supabase anon/publishable key sır değildir; provider
anahtarları yalnız Worker secret olarak kalır.

> **Uyarı (canlıya alma incelemesi, 2026-07-17):** Pages ve Worker deploy'ları
> atomik değildir; JWT zorunluluğu ile frontend Authorization taşıması aynı
> push'ta gitse bile kısa bir geçiş penceresi olur. Bu yüzden: (1)
> `supabase-client.js` içeriği değişince `?v=` MUTLAKA bump edilmeli (v36
> yapıldı; bump'sız değişiklik eski HTTP-cache'li kullanıcıyı 401'e düşürür),
> (2) smoke testleri geçiş penceresinde iki sözleşmeyi de kabul etmeli
> (`tests/smoke/smoke.mjs` böyle güncellendi: kimliksiz enrich için 401 = yeni
> başarı, 200 = eski sözleşme geçici kabul; `/health` için 200 = yeni,
> 403/404/405 = eski).

### Deploy sürümü

Production smoke yalnız endpoint'in yanıt vermesini değil, dağıtılan Worker
version metadata'sını da loglamalıdır. Böylece test edilen sürüm görünür olur.

## Fazlar ve kabul kapıları

### Faz A0 — Takip ve dondurma — TAMAMLANDI

- Bu handoff'u yaşayan takip noktası yap.
- Home Protocol handoff'unu “beklemede” olarak işaretle.
- Teknik değerlendirmeye güncel uygulama durum tablosu ekle.

Kabul: Bir sonraki oturum hangi hattın aktif olduğunu tek belgeden anlayabilmeli.

### Faz A1 — Tekrarlanabilir kurulum — TAMAMLANDI

- `package-lock.json` ile `package.json` dosyalarını senkronla.
- CI'da `npm install` yerine `npm ci` kullan.
- `npm audit` orta/yüksek bulgularını kapat veya açık risk kabulü yaz.
- Temiz kurulumun çalışma ağacında diff üretmediğini doğrula.

Kabul:

```text
npm ci
npm audit --audit-level=moderate
npm run check
git diff --exit-code -- package-lock.json
```

Sonuç (17 Temmuz 2026):

- `package-lock.json`, mevcut `package.json` ve Playwright dev dependency'siyle
  yeniden üretildi.
- `picomatch` 2.3.1 -> 2.3.2 oldu; audit bulgusu kapandı.
- Worker test araçları eklendikten sonraki son temiz `npm ci` 162 paketi kurdu;
  lock SHA-256 kurulum öncesi/sonrası aynı kaldı:
  `298df2695301d8a00ed5d97aeb58dc0e9af8e2702cde127b9dfb44b6c145f3ff`.
- `npm audit --audit-level=moderate`: 0 bulgu.
- `npm run check`: geçti.
- `.github/workflows/flow-check.yml`, `npm ci` ve zorunlu `npm run check`
  kullanıyor.

### Faz A2 — Worker istek sınırı — TAMAMLANDI VE CANLI DOĞRULANDI

> **Durum notu (2026-07-17 gece):** Kod tarafı uygulandı (DO tabanlı
> RequestRateLimiter, JWT'li enrich, bounded JSON, beacon sertleştirme,
> `/health`, yapılandırılmış log). `workers/oracle/test/oracle.test.js` +
> `vitest.config.mjs` (vitest-pool-workers) ve A3 deploy kapısı
> (`deploy-worker.yml`: npm ci -> check -> dry-run -> deploy -> health smoke)
> aynı çalışma ağacına eklendi. Canlıya alma, ağaç durulduktan sonra tek
> gözden geçirilmiş push ile yapılır.
>
> **Canlıya alma incelemesinde yakalanan iki düzeltme:**
> 1. `supabase-client.js` Authorization değişikliği `?v=` bump'sızdı → v36
>    yapıldı (bump'sız içerik değişikliği eski cache'li kullanıcıyı kırardı).
> 2. `tests/smoke/smoke.mjs` kimliksiz enrich'te `res.ok` bekliyordu → yeni
>    401 sözleşmesine çevrildi (geçiş penceresi toleranslı) + `/health`
>    kontrolü eklendi. Aksi halde Flow Check her push'ta kırmızıya düşerdi.
>
> **Dilim atomikliği doğrulandı:** eski worker CORS'u yalnız `Content-Type`
> header'ına izin veriyordu; frontend Bearer göndermeye başlayınca preflight
> ancak yeni worker'la geçer. Worker + frontend Authorization değişikliği bu
> yüzden ASLA ayrı push'lara bölünmemeli (mevcut ağaçta birlikte hazır).

- Bellek içi `RATE_LIMITS` haritasını kaldır.
- Oracle, enrich ve beacon için ayrı kota uygula.
- `/enrich-profile` için doğrulanmış Supabase kullanıcı kimliği zorunlu kıl.
- JSON `Content-Type`, `Content-Length` ve akış sırasında byte sınırı uygula.
- Beacon yöntem, URL uzunluğu, host ve protokol doğrulaması ekle.
- Endpoint/karar bazlı yapılandırılmış log kullan.
- `@cloudflare/vitest-pool-workers` içinde maliyetsiz testler ekle.

Kabul:

- Aynı aktör lokasyon/isolate değişse de aynı kalıcı kotaya gider.
- Yetkisiz enrich isteği provider çağrısından önce `401` alır.
- Hatalı/iri JSON `415`/`413`; geçersiz beacon provider çağrısı üretmez.
- Kota aşımı `429` ve `Retry-After` döndürür.
- Worker runtime testleri dış ağa/provider'a ihtiyaç duymadan geçer.

Sonuç (17 Temmuz 2026):

- Bellek içi `RATE_LIMITS` kaldırıldı. Her aktör hash'i
  `REQUEST_RATE_LIMITER.getByName(...)` ile tek SQLite-backed Durable Object'a
  gidiyor; `oracle`, `enrich-auth`, `enrich` ve `beacon` ayrı bucket.
- Yeni DO, güncel Wrangler declarative `[exports.RequestRateLimiter]`
  (`storage = "sqlite"`) ile tanımlı; legacy migration dizisi kullanılmıyor.
- Frontend güncel Supabase Bearer token'ını taşıyor ve oturumsuz akış fetch'ten
  önce duruyor. Worker doğrulanmamış isteği provider'dan önce `401` ile kesiyor.
- JSON gövdesi Content-Type, bildirilen uzunluk ve gerçek stream sırasında
  4096 byte ile sınırlı. Beacon `GET/HEAD`, 2048 karakter ve doğrulanmış
  host/protokol ile sınırlı.
- Beacon AI/webhook eskalasyonu kaldırıldı; yalnız yerel benign/watch kararı,
  altı saatlik dedup ve yapılandırılmış log var.
- Workers-runtime testleri 12/12; frontend Bearer sözleşmesi iki ek unit testle
  kilitli. `remoteBindings: false`, test sırasında provider çağrısı yok.
- Wrangler 4.112.0 production dry-run başarılı: 34,99 KiB upload / 9,99 KiB
  gzip; DO, AI ve version metadata binding'leri çözüldü.

### Faz A3 — Deploy kapısı — TAMAMLANDI VE CANLI DOĞRULANDI

- Deploy job'ında `npm ci`, genel kontroller, Worker runtime testleri ve
  Wrangler dry-run production deploy'dan önce zorunlu olmalı.
- Test başarısızsa deploy adımı çalışmamalı.
- Deploy sonrasında `/health` version metadata smoke sonucu workflow logunda
  görünmeli.
- Staging/preview ayrı iş olarak değerlendirilmeli; production sırrını PR'a açma.

Kabul: Başarısız testli commit production'a gidemez ve dağıtılan version ID
workflow çıktısında görünür.

Sonuç (17 Temmuz 2026):

- Workflow artık Node 22, `npm ci`, `npm run check` ve Wrangler production
  dry-run geçmeden deploy çalıştırmıyor; production concurrency seri.
- Repo lock'undaki Wrangler kullanılıyor. İlgili Worker, frontend auth, lock,
  test config ve workflow değişiklikleri deploy tetik kapsamına alındı.
- Deploy, Worker version tag'ini `GITHUB_SHA` yapıyor. Sonrasında sabit
  `/health` URL'si retry ile yoklanıyor; health tag'i aynı SHA değilse job
  başarısız, eşleşirse service/status/commit/version JSON olarak loglanıyor.
- `preview_urls = true`; ayrı staging Worker bu dilimde kurulmadı ve production
  secret'ları PR işine açılmadı.
- İlk yeni main workflow'u production deploy ve health/version smoke'u geçti.
  18 Temmuz kontrolünde `/health` etiketi main HEAD `dc951919493450a948d736cacf6d07bb96681ba4`
  ile eşleşti; kimliksiz `/enrich-profile` provider öncesinde `401` döndürdü.

### Faz B1 — Service Worker yaşam döngüsü — TAMAMLANDI

- Background cache Promise'larını `event.waitUntil()` ile bağla.
- Tüm `cache.put()` çağrılarını await/return et.
- Zorunlu precache hatasını install başarısızlığı olarak yüzeye çıkar.
- Offline/update entegrasyon testi ekle.

Kabul: yarım cache ile başarılı install görünmez; background revalidation Worker
yaşam döngüsü bitmeden tamamlanır.

> **Uyarı (canlıya alma incelemesi, 2026-07-17):** "Zorunlu precache hatasında
> install fail" kuralını 105+ öğelik listenin TAMAMINA uygulama. GitHub Pages
> deploy'ları CDN edge'lerine kademeli yayılır; kısa süreli eski/yeni dosya
> karışımı normaldir ve tek 404 tüm install'u kalıcı kırar. Kritik seti küçük
> tut (shell + offline.html + çekirdek CSS/JS); oyun/vendor varlıklarını
> best-effort grubuna koy. `CACHE_NAME` asla geriye düşürülmez (mevcut kural
> geçerli).

Sonuç (17 Temmuz 2026):

- Zorunlu install kümesi `/`, `/offline.html` ve sürümsüz ortak CSS ile küçük
  tutuldu. Bu kümenin hatası yeniden fırlatılıyor ve install başarısız oluyor.
- Kalan deneyim/oyun/vendor girdileri tek tek best-effort cache'leniyor;
  GitHub Pages edge yayılımındaki geçici 404 yeni Worker kurulumunu bozmuyor.
- Bütün `cache.put()` çağrıları ortak helper içinde await ediliyor. Doküman
  güncellemesi ve stale revalidation senkron `event.waitUntil()` zincirinde;
  cache miss yanıtı yazım tamamlanmadan çözülmüyor.
- `SKIP_WAITING` Promise'i message event yaşam döngüsüne bağlandı.
- Beş deterministik event testi: kritik install hatası, opsiyonel rollout
  toleransı, bekleyen revalidation, cache-miss yazımı ve offline fallback.
- `supabase-client.js` v36, Service Worker `convivium-v196`; 19 yönetilen asset
  sürümü senkron.

### Faz B2 — CSP, CDN ve response header kararı — TAMAMLANDI VE CANLI DOĞRULANDI

- CSP'siz HTML sayfalarını tamamla ve validator'da CSP varlığını zorunlu yap.
- Supabase CDN major etiketini doğrulanmış tam sürüme sabitle; HTML ve cache
  referanslarını tek sürüm diliminde güncelle.
- GitHub Pages'in `_headers` uygulamadığı gerçeğini koruyarak, gerçek response
  header ihtiyacı için Cloudflare Pages/geçiş kararını mimari karar kaydına yaz.
  Hosting'i kullanıcı kararı olmadan değiştirme.

Kabul: 27 HTML'nin tamamında CSP vardır; yalnız-major/latest harici script
sürümü kalmaz; validator sapmaları CI'da reddeder; hosting trade-off'u yazılıdır.

Sonuç (18 Temmuz 2026):

- `games/neon-river.html` ve `games/universe-2.html`, kendi kaynak ihtiyaçlarıyla
  sınırlı CSP meta politikalarına kavuştu. Envanter artık 27/27 CSP.
- 19 Supabase CDN referansı, npm `latest` ve jsDelivr `x-jsd-version`
  doğrulamasıyla `@supabase/supabase-js@2.110.7` sürümüne sabitlendi. Mevcut
  `@2` ve yeni tam URL 18 Temmuz'da byte-byte aynı 208.014 bayt içeriği verdi
  (SHA-256 `61010a711aa585660cc5132babd6da57fd89a973b845412c8916f8573a455c2b`).
  Phaser, Mammoth ve PDF.js ile birlikte 22/22 harici script tam semver kullanıyor.
- Site-integrity kontrolü artık CSP yokluğunu/yerleşim sırasını, taban
  `default-src`/`object-src`/`base-uri` direktiflerini, jsDelivr'da eksik veya
  tam olmayan semver'i, bilinmeyen harici script şemasını ve Supabase pin
  sapmasını hata sayıyor. `playwright-report` ve `test-results` yayın sayfası
  olmadığı için envanterden açıkça dışlanıyor.
- HTML precache dilimi için Service Worker ileri yönde `convivium-v197` oldu.
  Canlı site 18 Temmuz kabulünde bu sürümü sunuyordu.
- Hosting değiştirilmedi ve root'a işlevsiz `_headers` eklenmedi. Karar,
  [ADR-001 — HTTP Güvenlik Header'ları ve Hosting](architecture/adr-001-http-security-headers.md)
  içinde: GitHub Pages şimdilik korunur; gerçek header önceliklenirse ayrı onaylı
  Cloudflare Pages preview/geçişi yapılır.
- `npm run check`: unit 12/12, Worker 12/12, 27 HTML / 27 CSP / 22 tam sürümlü
  harici script. `npm audit --audit-level=moderate`: 0 bulgu.
- Yerel Chromium karakterizasyonu 2/2: iki oyun HTTP 200, Supabase globali ve
  canvas hazır, Neon River'da Phaser hazır; CSP ihlali, page error veya CDN
  request failure yok.
- Canlı kabulte iki oyun HTML'inde CSP ve `@supabase/supabase-js@2.110.7`,
  `service-worker.js` içinde `convivium-v197` doğrudan doğrulandı.
- Kod hazırlama oturumu kullanıcı talimatı gereği commit, push, deploy veya
  hosting değişikliği yapmadı; yayın kullanıcı tarafından gerçekleştirildi.

## Güncel durum

| Faz | Durum | Son doğrulama |
|---|---|---|
| Home Protocol 1A | Tamamlandı; main'de | `cf63bd6`; `npm run check` + headless smoke |
| Home Protocol 1B | Tamamlandı; canlı | Guide v1/protocol v76; SW v198 |
| Home Protocol 2A | Tamamlandı; canlı | VFS v1/protocol v77 hash eşleşmesi; SW v199 |
| Home Protocol 2B | Tamamlandı; canlı | VFS v2/protocol v78 hash eşleşmesi; SW v200 |
| Home Protocol 2C | Kod/test tamam; yayın bekliyor | Unit 31/31; normal/fail-closed/offline Chromium; SW v201 yerel |
| A0 takip/dondurma | Tamamlandı | Aktif/bekleyen hatlar tüm handoff'larda bağlandı |
| A1 lock/audit | Tamamlandı | `npm ci`, audit 0, lock hash değişmedi |
| A2 Worker sınırı | Tamamlandı; canlı | Kimliksiz enrich `401`; Worker 12/12 |
| A3 deploy kapısı | Tamamlandı; canlı | `/health` tag `dc951919…`; CI version smoke eşleşti |
| B1 Service Worker | Tamamlandı; canlı | `convivium-v196`; yaşam döngüsü/offline event testleri 5/5 |
| B2 CSP/CDN/header | Tamamlandı; canlı | 27/27 CSP; 22/22 exact script; Supabase 2.110.7; SW v197; ADR-001 |

## Rollback sınırları

- A1: Yalnız lock/CI kurulum değişiklikleri geri alınır; uygulama koduna dokunmaz.
- A2: Worker kodu, config, frontend Authorization taşıması ve Worker testleri
  tek dilimdir; beraber ele alınmalıdır. Declarative DO export production'a
  çıktıktan sonra lifecycle değişikliğinin öncesindeki Worker sürümüne rollback
  yapılamaz; class/export/binding korunarak ileri düzeltme deploy edilir.
  `state = "deleted"` namespace ve veriyi kalıcı siler, rollback aracı değildir.
- A3: Deploy workflow kapısı geri alınsa bile Worker güvenlik testleri ve `/health`
  kodu korunabilir.
- B1: Service Worker değişikliğinde `CACHE_NAME` geriye düşürülmez; yeni ileri
  sürümle rollback yapılır.
- B2: CSP sorunu görülürse tüm politikayı kaldırma; yalnız engellenen meşru
  kaynağı ilgili sayfada dar kapsamla ekle. CDN uyumsuzluğunda doğrulanmış başka
  bir tam sürüme geç ve Service Worker'ı yeni bir ileri sürüme bump et; major
  etikete geri dönme.

## Son doğrulama özeti

```text
npm ci                           geçti; 162 paket, lock hash değişmedi
npm audit --audit-level=moderate 0 bulgu
npm run check                    unit 12/12; Worker 12/12; 27/27 CSP; 22/22 exact script
yerel smoke                      8/8
yerel Chromium E2E               7/7; gerçek signup 1 test bilinçli skip
B2 yerel Chromium                2/2; CSP/CDN/canvas, ihlal ve page error yok
B2 canlı kabul                   iki oyun CSP + Supabase 2.110.7 + SW v197
Wrangler production dry-run      geçti; 34,99 KiB / gzip 9,99 KiB
```

Workers Vitest ayarında `remoteBindings: false`; uyarı metnine rağmen testler AI
binding'ini çağırmıyor. `wrangler check startup` alpha komutu hazır bundle'da
`Failed to parse body as FormData` üretti; bu Wrangler alpha araç hatası kabul
kapısı yapılmadı, production dry-run paketlemesi başarılı.

## Sonraki kesin adım

Üretim sertleştirme hattı kapalıdır. Yeni aktif iş
[Home Protocol Modülerleştirme Handoff](home-protocol-modularization-handoff.md)
içindeki Faz 2C'dir. Faz 2B canlı kabulü tamamlandı; world/room read-modelinin
inceleme, yayın ve devam sırası o belgede tutulur.

Canlı Home Protocol tabanı v200 olarak kabul edilmiştir. Çalışma ağacındaki
v201 yalnız Faz 2C world/protocol asset'leriyle birlikte ele alınmalı; herhangi
bir rollback'te cache sürümü geriye düşürülmemelidir.

> **Eş güdüm kuralı (2026-07-17):** Ayni çalışma ağacında AYNI ANDA iki oturum
> yazmamalı. Rol ayrımı: geliştirici oturum kodu hazırlar ve commit ATMAZ;
> kontrol/yayin oturumu ağaç durulduktan sonra inceler, commit'ler ve canlıya
> alır. Dosya mtime'ları son 5 dakikada değişiyorsa commit başlatma.
