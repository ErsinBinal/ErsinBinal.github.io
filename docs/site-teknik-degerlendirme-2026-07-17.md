# Convivium Site Teknik Değerlendirmesi

Tarih: 17 Temmuz 2026  
İncelenen commit: `32aad94871608fdf68023d1f0271d0c32cc1cfc1` (`32aad94`)  
Kapsam: statik site, ortak frontend altyapısı, PWA, Supabase veri/yetki
katmanı, Cloudflare Oracle Worker, otomasyonlar, güvenlik, performans,
erişilebilirlik ve bakım maliyeti.

Bu belge belirli bir commit üzerindeki nokta-zaman değerlendirmesidir. Yaşayan
mimari için [architecture/README.md](architecture/README.md), uygulanan veri
şeması için [database/README.md](database/README.md) izlenmelidir.

## 0. Uygulama İlerlemesi

Aktif plan, kabul kapıları, rollback ve yarıda kalma kaydı:
[Üretim Sertleştirme Handoff](production-hardening-handoff.md).

| Hat | Güncel durum | Sonuç |
|---|---|---|
| Terminal monolit Faz 1A | Ağaçta hazır; push bekliyor | 23 route komutu ve 99 alias registry'ye taşındı; 132 komut korundu; headless smoke geçti |
| P0 tekrarlanabilir kurulum | Tamamlandı | `npm ci` tekrarlanabilir; audit 0; CI `npm ci` + `npm run check` kullanıyor |
| P0 Worker kötüye kullanım sınırı | Kod + testler ağaçta; push bekliyor | DO sayaç, Supabase auth, bounded JSON, yerel-only beacon, `/health`; Worker 12/12 |
| P0 Worker deploy kapısı | Ağaçta hazır; push bekliyor | deploy-worker.yml: npm ci -> check -> dry-run -> deploy -> health smoke |
| P1 Service Worker yaşam döngüsü | Tamamlandı; push bekliyor | waitUntil/cache.put + kritik/best-effort precache; event testleri 5/5 |
| P1 CSP/CDN/header | Sırada | A2/A3/B1 canlı doğrulamasından sonra başlanacak |

Bu tablo inceleme anındaki bulguyu değiştirmez; yapılan işlerin güncel sonucunu
gösterir. Ayrıntılı doğrulama komutları yaşayan handoff'ta tutulur.

## 1. Yönetici Özeti

Convivium klasik bir portfolyo değil; oyun, terminal, kişisel arşiv ve deneysel
ürünleri aynı kurgu evreninde buluşturan bir web laboratuvarıdır. Yaratıcı
kimliği çok güçlüdür. Teknik açıdan site çalışır durumda ve tek kişilik bir
proje için dikkate değer ölçüde dokümante edilmiştir.

Ana problem işlevsizlik değil, büyüme hızıdır. Yaratıcı üretim hızı mimari
sadeleştirme hızını geçmiş; ana terminal, büyük tek-dosya oyunlar, PWA cache'i,
CI ve Worker güvenlik sınırları bakım maliyeti üretmeye başlamıştır.

Öznel değerlendirme:

| Alan | Puan |
|---|---:|
| Görsel kimlik ve özgünlük | 9/10 |
| Ürün/deneyim çeşitliliği | 9/10 |
| Teknik mimari | 7/10 |
| Güvenlik yaklaşımı | 7/10 |
| Test ve dağıtım disiplini | 6/10 |
| Uzun vadeli bakım kolaylığı | 5.5/10 |
| Genel | **7.5/10** |

## 2. Sayısal Envanter

Aşağıdaki değerler git tarafından izlenen dosyalar üzerinden çıkarılmıştır.

| Ölçüm | Değer |
|---|---:|
| İzlenen dosya | 187 |
| Toplam içerik büyüklüğü | yaklaşık 5,87 MB |
| Metin / ikili dosya | 153 / 34 |
| Toplam metin satırı | 64.078 |
| HTML sayfası | 27 |
| JavaScript/MJS | 51 dosya, 26.199 satır |
| CSS | 15 dosya, 11.500 satır |
| SQL | 14 dosya, 1.391 satır |
| Görsel | 34 PNG + 7 SVG |
| Oyun | 8 |
| Araç/ritüel uygulaması | 7 |
| Terminal rota tanımı | 28 |
| Terminal komutu | 132 |
| Supabase tablo tanımı | 14 benzersiz tablo |
| Ana şemadaki RLS politikası | 41 |
| Service Worker precache | 105 öğe, yaklaşık 3,74 MB |
| Sitemap URL sayısı | 23 |
| RSS öğesi | 21 |
| Commit | 497 |
| Geliştirme dönemi | 13 Şubat 2025 – 17 Temmuz 2026 |

### Sayfa ağırlıkları

- Ana sayfa yaklaşık 920 KB yerel statik kaynak bağlıyor: 27 JavaScript ve
  10 CSS dosyası. Supabase CDN ve Google Fonts bunun dışındadır.
- `ash-runner.html` ve `ash-runner-2.html`, yerel Phaser paketi nedeniyle
  yaklaşık 1,3 MB yerel kaynak kullanıyor.
- Ana Service Worker ilk kurulumda 105 girdiden oluşan yaklaşık 3,74 MB'lık
  precache listesi hazırlıyor.

## 3. Mimari Kanaat

```mermaid
flowchart TD
  U[Ziyaretçi] --> GH[GitHub Pages]
  GH --> FE[Vanilla HTML / CSS / JS]
  FE --> PWA[Service Worker + Manifest]
  FE --> SB[Supabase Auth / Postgres / Realtime]
  SB --> RLS[Row Level Security]
  FE --> W[Cloudflare Oracle Worker]
  W --> CFAI[Workers AI]
  W --> SEARCH[Tavily / Google / Gemini]
  W --> LOCAL[Yerel güvenli fallback]
```

Bu proje için framework kullanmamak halen doğru karardır. Site statik, deneysel
ve sayfa bazlıdır; tam bir React/Next benzeri yeniden yazım mevcut durumda
faydadan çok maliyet getirir. Buna karşılık native ES modules, küçük domain
modülleri ve sayfa bazlı geç yükleme artık gereklidir.

### Güçlü yönler

- Public AI istekleri tarayıcıdan doğrudan model sağlayıcılarına çıkmıyor;
  Worker güvenlik sınırı olarak kullanılıyor.
- Supabase anon anahtarı sır olarak değerlendirilmiyor; asıl yetki RLS
  politikalarında uygulanıyor.
- Auth oturumu `sessionStorage` içinde tutuluyor ve `returnTo` açık yönlendirme
  riskine karşı kontrol ediliyor.
- Makale içeriğinde tag, attribute ve URL allowlist'li sanitizasyon uygulanıyor.
- Profil araştırması açık rıza ve kullanıcının son onayına bağlanmış; yurt dışı
  aktarım KVKK metninde açıklanıyor.
- Güvenlik yüzeyi, veri katmanı ve yaşayan mimari ayrı belgelerde tutuluyor.
- PWA güncellemesi kullanıcı onaylı `SKIP_WAITING` akışıyla ele alınıyor.
- Kodun büyük bölümü üçüncü taraf framework bağımlılığı olmadan çalışıyor.

## 4. Öncelikli Teknik Bulgular

### P0 — Worker kötüye kullanım sınırı

Kanıt:

- [`workers/oracle/src/index.js`](../workers/oracle/src/index.js) içindeki rate
  limit, isolate belleğindeki `RATE_LIMITS` adlı `Map` ile tutuluyor.
- `/beacon` rotası genel CORS, yöntem ve rate-limit kontrollerinden önce
  işleniyor.
- `/enrich-profile` çağrısında tarayıcı açık rıza kontrolü var; ancak endpoint
  kendi başına doğrulanmış kullanıcı zorunluluğu taşımıyor.

Risk:

- Bellek içi sayaç Cloudflare lokasyonları/isolate'ları arasında paylaşılmaz ve
  yeniden başlatmada sıfırlanır.
- CORS yalnızca tarayıcının yanıtı okumasını sınırlar; sunucudan veya script ile
  doğrudan HTTP isteği yapılmasını engellemez.
- Rastgele beacon host değerleri AI triyajı veya webhook maliyeti üretebilir.
- Genel Oracle ve profil araştırma kotaları otomasyonla tüketilebilir.

Öneri:

1. Cloudflare Rate Limiting binding veya Durable Object tabanlı ortak sayaç
   kullan.
2. `/enrich-profile` için Supabase JWT doğrulaması veya Turnstile uygula.
3. `/beacon` için ayrı ve daha sert bir limit, host/protokol doğrulaması ve
   maksimum olay boyutu tanımla.
4. JSON isteklerinde `Content-Type` ve makul `Content-Length` sınırı uygula.
5. Endpoint bazında yapılandırılmış log ve ölçüm ekle.

Kabul ölçütü:

- Aynı istemcinin farklı isolate/lokasyonlara dağılan istekleri ortak kotaya
  tabi olmalı.
- Yetkisiz `/enrich-profile` çağrısı sağlayıcıya ulaşmadan reddedilmeli.
- Rastgele beacon host bombardımanı AI çağrısı üretememeli.
- Worker testleri `@cloudflare/vitest-pool-workers` içinde çalışmalı.

Referans:
[Cloudflare Workers Best Practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)

**Çözüm durumu — 17 Temmuz 2026:** Aktör hash'ine ayrılmış SQLite-backed
Durable Object kotaları uygulandı; Oracle, enrich-auth, enrich ve beacon ayrı
bucket. Enrich Supabase Bearer token doğruluyor. JSON 4 KiB, beacon URL 2048
karakter ve host/protokol/yöntem sınırında. Beacon AI/webhook çağırmıyor.
Workers-runtime testleri 12/12, frontend auth unit testleri 2/2 ve Wrangler
production dry-run geçti. Yeni revizyon push/deploy bekliyor.

### P0 — Tekrarlanabilir kurulum ve bağımlılık zinciri

Kanıt:

- `npm ci`, `package.json` ile `package-lock.json` senkron olmadığı için
  başarısız oluyor.
- CI bu durumu `npm install` kullanarak dolaşıyor.
- Commit'teki lock üzerinde `npm audit`, `picomatch 2.3.1` için bir yüksek önem
  dereceli araç-zinciri bildirimi veriyor.

Risk:

- Aynı commit farklı tarihlerde farklı bağımlılık ağacı kurabilir.
- CI sonucu geliştirici makinesindeki sonuçla birebir tekrarlanamayabilir.
- Güvenlik düzeltmeleri lock dosyasına yansımamış olabilir.

Öneri:

1. Desteklenen Node sürümünde lock dosyasını yeniden üret.
2. Yerelde ve CI'da `npm ci` kullan.
3. `npm audit` bulgusunu bağımlılık güncellemesiyle kapat.
4. CI'a `npm run check` ve mümkünse salt-okunur lock kontrolü ekle.

Kabul ölçütü:

- Temiz checkout üzerinde `npm ci` geçmeli.
- `git diff` üretmeden testler kurulup çalışmalı.
- Orta/yüksek önem dereceli audit bulgusu kalmamalı ya da belgeli bir risk
  kabulü bulunmalı.

**Çözüm durumu — 17 Temmuz 2026:** Lock senkronlandı; CI `npm ci` kullanıyor,
audit orta/yüksek 0 ve temiz kurulum lock hash'ini değiştirmiyor.

### P0 — Worker deploy kapısı

Kanıt:

- [`.github/workflows/deploy-worker.yml`](../.github/workflows/deploy-worker.yml)
  Worker dosyaları main'e geldikten sonra doğrudan deploy ediyor.
- [`.github/workflows/flow-check.yml`](../.github/workflows/flow-check.yml) ayrı
  çalışıyor; iki workflow arasında zorunlu bağımlılık yok.
- Flow Check canlı site ve canlı Worker'ı yokladığı için yeni commit yerine eski
  deploy'u test edebilir.

Öneri:

- Worker unit/integration testlerini deploy job'ının zorunlu ön adımı yap.
- Önce preview/staging deploy, sonra smoke, sonra production deploy uygula.
- Production deploy sonrasında sürüm/commit bilgisini doğrula.

Kabul ölçütü:

- Başarısız testli commit production Worker'a deploy edilememeli.
- Smoke testinin hangi Worker sürümünü test ettiği görülebilmeli.

**Çözüm durumu — 17 Temmuz 2026:** Deploy workflow `npm ci`, bütün `npm run
check` katmanları ve Wrangler dry-run geçmeden production adımına ulaşmıyor.
Deploy version tag'ini `GITHUB_SHA` yapıyor; sonrasında `/health` tag eşitliğini
zorunlu tutup metadata'yı logluyor. Repo kapısı hazır; ilk yeni main
workflow/version smoke'u operasyonel kapanış olarak bekleniyor.

### P1 — Service Worker Promise yaşam döngüsü

Kanıt:

- [`service-worker.js`](../service-worker.js) içindeki stale-while-revalidate
  `fetchPromise`, `event.waitUntil()` ile yaşam döngüsüne bağlanmıyor.
- Bazı `cache.put()` çağrıları Promise zincirine geri döndürülmüyor.
- Precache hatası loglandıktan sonra yutuluyor; kurulum başarılı görünebilir.

Risk:

- Runtime yanıt döndükten sonra arka plan güncellemesini yarıda kesebilir.
- Kullanıcı yeni cache sürümüne geçtiğini sanarken eksik offline varlıklarla
  kalabilir.

Öneri:

- Tüm arka plan cache yazımlarını `event.waitUntil()` ile izle.
- `cache.put()` Promise'larını geri döndür veya await et.
- Zorunlu precache hatasında kurulumu başarısız say; isteğe bağlı varlıkları ayrı
  best-effort gruba taşı.
- Service Worker için offline/update entegrasyon testi ekle.

**Çözüm durumu — 17 Temmuz 2026:** Kritik shell install hatası kurulumu
başarısız yapıyor; büyük oyun/vendor listesi edge rollout için best-effort.
`cache.put()` işlemleri await ediliyor, arka plan güncellemeleri
`event.waitUntil()` ile bağlı. Kritik/opsiyonel install, revalidation,
cache-miss ve offline fallback testleri 5/5 geçti.

### P1 — CSP, CDN ve gerçek HTTP header'ları

Kanıt:

- `games/neon-river.html` ve `games/universe-2.html` CSP içermiyor.
- 24 sayfada `script-src 'unsafe-inline'` bulunuyor.
- 19 sayfa `@supabase/supabase-js@2` major etiketi kullanıyor; tam sürüm sabit
  değil.
- `_headers` dosyası GitHub Pages tarafından uygulanmıyor.
- `validate-site-integrity.js`, CSP varsa içeriğini kontrol ediyor fakat CSP'nin
  hiç bulunmamasını hata saymıyor.

Risk:

- CSP koruması sayfalar arasında tutarsız.
- CDN içeriğinin davranışı major sürüm sınırları içinde değişebilir.
- HSTS, `nosniff`, `frame-ancestors` ve Permissions Policy gibi korumalar gerçek
  response header olarak uygulanamıyor.

Öneri:

1. Eksik iki CSP'yi tamamla ve validator'da CSP'yi zorunlu yap.
2. Supabase ve diğer CDN scriptlerini tam sürüme sabitle veya yerel vendor olarak
   tut.
3. Inline script/style bloklarını kademeli olarak dosyalara çıkar.
4. Gerçek HTTP header desteği isteniyorsa Cloudflare Pages benzeri bir hostu
   değerlendir.

Kabul ölçütü:

- Tüm 27 HTML sayfasında CSP bulunmalı.
- Harici scriptlerde `latest` veya yalnız major sürüm etiketi kalmamalı.
- Validator eksik CSP ve sürüm sapmasını CI'da yakalamalı.

### P1 — Monolitler ve global script bağımlılıkları

Uygulama sırası ve güncel ilerleme kaydı:
[Home Protocol Modülerleştirme Handoff](home-protocol-modularization-handoff.md).

Kanıt:

- `assets/js/home-protocol.js` 4.530 satır ve 132 komut içeriyor.
- Ana sayfa 30 script etiketi yüklüyor.
- Bazı oyunlar 2.000–3.500 satırlık tek HTML dosyalarıdır.
- Birçok modül `window.*` global sözleşmeleri ve script sırasına bağımlıdır.

Risk:

- Küçük değişiklikler geniş regresyon yüzeyi oluşturuyor.
- Kod sahipliği ve test izolasyonu zorlaşıyor.
- İlk yükte ziyaretçinin kullanmayacağı motorlar da indirilebiliyor.

Öneri:

- Terminal komutlarını veri tabanlı registry ve domain modüllerine ayır:
  çekirdek shell, navigasyon, VFS, ekonomi, Oracle, Bugy, oyun komutları.
- Büyük oyunların inline CSS/JS'sini kendi dosyalarına çıkar.
- Bugy sürümlerini ortak adapter arayüzünün arkasında topla.
- Native ES modules ve dinamik `import()` kullan; framework dönüşümü yapma.

Kabul ölçütü:

- `home-protocol.js` yalnız orchestration/boot görevi taşımalı.
- Yeni komut eklemek ana protokol dosyasında geniş değişiklik gerektirmemeli.
- Ana sayfa kullanılmayan Bugy/oyun motorlarını ilk yükte indirmemeli.

### P1 — Performans ve cache kapsamı

Öneri:

- Ana sayfada Bugy motorlarını ve Supabase istemcisini ihtiyaç anında yükle.
- 105 öğelik tam precache yerine shell + kritik offline içerik kullan; büyük
  oyunları runtime cache'e bırak.
- Phaser kullanan sayfalarda paylaşılmış uzun süreli immutable cache uygula.
- Gerçek cihazlarda LCP, INP ve CLS ölçümü ekle.

Hedefler ilk ölçümden sonra kesinleştirilmeli; başlangıç için ana sayfanın yerel
ilk-yük JavaScript/CSS toplamını anlamlı şekilde düşürmek yeterlidir.

### P2 — Erişilebilirlik

Basit DOM denetiminde görünür görsellerde eksik `alt`, isimsiz buton veya tekrar
eden ID bulunmadı. Bununla birlikte dört sayfada toplam 10 görünür input yalnız
placeholder kullanıyor ve programatik label taşımıyor:

- Ana terminal komut inputu,
- Admin makale başlığı,
- Crude Buster oda kodu,
- Dart Skorbord online/oturum/skor inputları.

Öneri:

- Görsel olarak gizli olsa bile her input için `<label>` veya `aria-label`
  ekle.
- Klavye odağını ve dialog focus trap davranışını otomatik test et.
- Renk karşıtlığı, reduced motion ve ekran okuyucu akışını WCAG denetimiyle
  tamamla.

### P2 — Veri şeması tek kaynak ilkesi

14 benzersiz tablo migration dosyalarında bulunuyor; ana
`supabase-schema.sql` dosyasında 13 tablo var. `site_events` isteğe bağlı ayrı
migration olarak tutuluyor. Bu bilinçli bir tasarım olsa da “ilk kurulumda hangi
şema tam olarak uygulanmalı?” sorusunu açık bırakıyor.

Öneri:

- `site_events` tablosunu ana şemaya ekle veya ana şemanın çekirdek/opsiyonel
  ayrımını README'de açıkça tanımla.
- Migration durumunu kayıt altına alan küçük bir `schema_migrations` yaklaşımı
  veya Supabase CLI migration düzeni değerlendir.

## 5. Ürün ve Deneyim Kanaati

Sitenin en kıymetli tarafı teknik özellik sayısı değil, kendine ait bir dilinin
olmasıdır. Ekol Aynası, Oracle, Bugy ve terminal aynı dünyanın parçaları gibi
görünüyor. Bu, çoğu kişisel sitede bulunmayan güçlü bir kimliktir.

Yeni ziyaretçi açısından ise yoğunluk yüksektir. HUD, yolculuk rayı, komut
satırı, 132 komut, oyunlar, ritüeller ve hesap sistemi aynı anda dikkat ister.
Ayrıca iyi projelerin önemli bölümü üyelik arkasında olduğundan portfolyo ve
paylaşılabilirlik etkisi azalabilir.

Önerilen üç amiral gemisi:

1. **Ekol Aynası** — düşünsel/kişisel ürün,
2. **Crude Buster veya Kül Hattı** — oyun mühendisliği,
3. **Oracle/Convivium Terminal** — AI, etkileşim ve dünya kurma.

Bu üç deneyimin girişsiz demo veya kontrollü önizleme sunması, geri kalan
evreni küçültmeden ilk temasın daha anlaşılır olmasını sağlar.

## 6. Doğrulama Sonuçları

| Kontrol | Sonuç |
|---|---|
| `npm run check` | Geçti; unit 12/12, Worker runtime 12/12, 27 HTML integrity |
| Service Worker event entegrasyonu | 5/5 geçti; kritik/opsiyonel install + update/offline |
| Wrangler production dry-run | Geçti; 34,99 KiB / gzip 9,99 KiB |
| Tüm JS/MJS syntax kontrolü | 51/51 geçti |
| Yerel HTML dosya referansları | 351 referans, eksik dosya yok |
| Worker hariç yerel smoke | 8/8 geçti |
| Yerel Chromium E2E | 7/7 geçti; gerçek signup testi bilinçli skip |
| Masaüstü sayfa açılışı | 27 sayfa kontrol edildi |
| Mobil kritik rota açılışı | 10 rota kontrol edildi |
| Mobil yatay taşma | Gözlenmedi |
| Canlı Worker CORS/yöntem | İzinli `204`, yabancı origin `403`, GET `405` |
| `npm ci` | Geçti; lock senkron ve kurulum diff üretmiyor |
| `npm audit --audit-level=moderate` | 0 bulgu |

### Test sınırları

Bu incelemede canlı veriye yazmamak ve dış AI maliyeti üretmemek için aşağıdaki
akışlar çalıştırılmadı:

- Gerçek Oracle POST cevabı,
- Tam oturumlu dashboard ve admin veri akışları,
- Supabase Realtime çok oyunculu senaryolar,
- Gerçek cihazda Service Worker offline/update geçişi,
- Lighthouse/Core Web Vitals ve tam WCAG denetimi.

## 7. Önerilen Uygulama Sırası

### Aşama A — Güvenli ve tekrarlanabilir temel

- [x] `package-lock.json` dosyasını senkronla; CI'ı `npm ci` yap.
- [x] Audit bulgusunu kapat.
- [x] `npm run check` ve Worker testlerini deploy kapısına ekle.
- [x] Worker rate limitini ortak ve kalıcı hale getir.
- [x] `/beacon` ve `/enrich-profile` kötüye kullanım sınırlarını güçlendir.

### Aşama B — PWA ve tarayıcı güvenliği

- [x] Service Worker Promise yaşam döngüsünü düzelt.
- [ ] Eksik CSP'leri ekle; validator'da zorunlu kıl.
- [ ] CDN sürümlerini tam sürüme sabitle.
- [ ] Gerçek HTTP güvenlik header'ları için hosting kararını ver.

### Aşama C — Modülerlik ve performans

- [x] Terminal komut registry'sini ayır (Faz 1A; sonrası beklemede).
- [ ] Büyük inline oyun kodlarını dış dosyalara çıkar.
- [ ] Bugy motorları için ortak adapter tanımla.
- [ ] Ana sayfa motorlarını dinamik yükle.
- [ ] Precache kapsamını küçült ve ölç.

### Aşama D — Ürün netliği ve erişilebilirlik

- [ ] Üç amiral gemisi deneyimi belirle.
- [ ] Girişsiz demo/önizleme yaklaşımını değerlendir.
- [ ] Etiketsiz inputları düzelt.
- [ ] Klavye, ekran okuyucu ve reduced-motion testlerini ekle.

## 8. Yeniden Ölçüm

Her aşama sonunda şu değerler yeniden kaydedilmelidir:

- `npm ci`, `npm run check`, smoke ve E2E sonuçları,
- Audit bulguları,
- Ana sayfa JS/CSS istek sayısı ve transfer büyüklüğü,
- Service Worker precache öğe sayısı ve toplam boyutu,
- Worker endpoint başına hata, latency ve rate-limit ölçümleri,
- CSP'siz/unsafe-inline sayfa sayısı,
- Erişilebilirlik ihlali sayısı,
- Tam oturumlu ve Realtime akışların test durumu.

Bu raporun amacı siteyi framework değişimine zorlamak değil; Convivium'un özgün
kimliğini korurken güvenlik, dağıtım ve bakım maliyetini kontrol altına almaktır.
