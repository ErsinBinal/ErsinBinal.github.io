# Home Protocol Modülerleştirme — Handoff

Son güncelleme: 17 Temmuz 2026 (gece — yerel doğrulama)  
Durum: **Faz 0 ve Faz 1A çalışma ağacında tamamlandı ve push bekliyor;
Faz 1B ve sonrası, üretim sertleştirme kapıları kapanana dek beklemede.**  
Kapsam: `assets/js/home-protocol.js` ve ana terminalin doğrudan bağımlılıkları.

> Öncelik kilidi: Bu hat Faz 1A sonunda donduruldu. Aktif çalışma ve geri dönüş
> koşulları [Üretim Sertleştirme Handoff](production-hardening-handoff.md)
> belgesindedir. Oradaki A1, A2, A3, B1 ve B2 kapıları sonuçlanmadan Faz 1B'ye geçme.

Bu belge, refaktör yarım kaldığında sonraki oturumun güvenli biçimde devam
edebilmesi için tek takip noktasıdır. Davranış değişiklikleri ve yeni özellikler
bu çalışma ile aynı dilimde yapılmamalıdır.

## Karar ve öncelik sırası

Modülerleştirmeye bu uçtan başlamak uygundur. İlk dilim saf yönlendirme verisi
olduğu için düşük risklidir ve sonraki ayrıştırmalar için test/desen oluşturur.
Bununla birlikte teknik değerlendirmedeki P0 maddeleri daha yüksek operasyonel
önceliğe sahiptir:

1. Worker kötüye kullanım sınırı, tekrarlanabilir bağımlılık kurulumu ve Worker
   deploy kapısı ayrı bir P0 hattı olarak kapatılmalıdır.
2. Service Worker Promise yaşam döngüsü, daha fazla frontend modülü eklenmeden
   önce düzeltilmelidir.
3. Terminalde yüksek bağlılıklı VFS, ekonomi ve Oracle ayrıştırmalarına ancak bu
   güvenlik/dağıtım işleri ve ilgili karakterizasyon testleri hazırken geçilmelidir.

P0 işleri Faz 1A'nın yapılmasına engel değildir; fakat Faz 2 ve sonrasını onların
önüne geçirmek doğru değildir.

## Değişmez kurallar

- Aynı dilimde komut adı, açıklama, alias, rota veya kullanıcı metni değiştirme.
- Komut ekleme/silme ile dosya taşıma işlemini aynı commit'te birleştirme.
- Mevcut IIFE + `window.ConviviumHome` modül sözleşmesini şimdilik koru.
- Native ES module veya framework geçişini bu refaktöre karıştırma.
- Her dilimde önce karakterizasyon testi, sonra taşıma, sonra tarayıcı smoke yap.
- Modül yüklenemediğinde terminalin tamamı çökmemeli; ilgili alan kontrollü
  biçimde devre dışı kalmalı ve konsola açık hata yazılmalı.
- Sürümü değişen asset'in `?v=` değeri ve Service Worker `CACHE_NAME` birlikte
  artırılmalı.

## Başlangıç ve güncel ölçüm

| Ölçüm | Başlangıç | Faz 1A sonrası |
|---|---:|---:|
| `home-protocol.js` | 4.530 satır | 4.390 satır |
| Terminal komutu | 132 | 132 |
| `home-protocol.js` içindeki komut tanımı | 132 | 109 |
| `route-commands.js` içindeki komut | yok | 23 |
| Taşınan alias | yok | 99 |
| Ana sayfa `<script>` etiketi | 30 | 31 |
| Service Worker cache sürümü | v194 | v195 |

Script sayısının bir artması bu faz için bilinçli bir ara sonuçtur. Faz 1'in
hedefi bakım sınırı kurmaktır; ilk yükteki script/byte azaltımı ölçümlü lazy-load
fazında ele alınacaktır.

## Faz durumu

### Faz 0 — Güvenlik ağı — TAMAMLANDI

- Node'un yerleşik test koşucusu `npm run test:unit` olarak eklendi.
- `npm run check`, syntax ve site bütünlüğü yanında unit testleri de çalıştırıyor.
- Route registry snapshot'ı 23 komutun sırasını, 99 alias'ı, açıklamaları,
  route key/fallback değerlerini ve doğrudan hedefleri kilitliyor.
- Kritik Türkçe alias'lar ayrıca okunabilir assertion'larla doğrulanıyor.

### Faz 1A — Yönlendirme registry'si — TAMAMLANDI

- `assets/js/home/route-commands.js` eklendi.
- Saf komut verisi `routeCommandRegistry`, çalışma zamanı üretimi
  `createRouteCommands({ route, goTo, scrollToOrigin })` içinde ayrıldı.
- 23 tanım, `home-protocol.js` içindeki aynı konuma spread edilerek komut sırası
  korundu.
- Modül/factory hatasında terminal boot'u sürüyor; yalnız route komutları boş
  listeye düşüyor ve konsola hata yazılıyor.
- Script, `index.html` içinde `home-protocol.js` öncesinde yükleniyor.
- Precache, cache sync, syntax kontrolü ve site validator sözleşmeleri güncellendi.
- Validator, script'in varlığını ve yükleme sırasını da kontrol ediyor.

Değişen/yeni dosyalar:

| Dosya | Amaç |
|---|---|
| `assets/js/home/route-commands.js` | Yeni veri tabanlı route komut registry/factory |
| `assets/js/home-protocol.js` | Inline tanımları çıkarıp factory çıktısını ekleme |
| `tests/unit/home-route-commands.test.mjs` | Davranış ve snapshot karakterizasyonu |
| `index.html` | Modül yükleme sırası ve `home-protocol` v75 |
| `service-worker.js` | Yeni asset, v75 referansı ve cache v195 |
| `scripts/validate-site-integrity.js` | Precache + script sırası doğrulaması |
| `scripts/sync-cache-versions.js` | Yeni managed asset |
| `package.json` | Unit test ve syntax kapısı |
| `tests/README.md` | Unit/karakterizasyon test katmanı kullanım notu |

## Doğrulama kaydı

17 Temmuz 2026 yerel sonuçları:

- `npm run check`: geçti.
- Route unit testleri: 5/5 geçti.
- Site integrity: 27 HTML dosyasıyla geçti.
- Runtime toplamı: 109 inline + 23 registry = 132 komut.
- Yerel Chromium smoke: açılış, `level`, `home`, `open dossier`, `mantık`,
  `üç güneş`, `giriş` ve `open manifest` geçti; page/protocol hatası görülmedi.
- Service Worker testi: `route-commands.js?v=1` dosyasının `convivium-v195`
  cache'inde bulunduğu ve çevrimdışı reload'da factory'nin 23 komutla kurulduğu
  doğrulandı.

Faz 1A için aşağıdaki yerel tarayıcı kontrolleri tamamlandı:

1. Ana sayfa açılışında uncaught exception olmamalı.
2. `help` ve `level` gibi taşınmayan komutlar çalışmalı.
3. `home` scroll davranışı çalışmalı.
4. `open dossier`, `mantık`, `üç güneş`, `giriş` ve `open manifest` doğru
   hedefe yönlenmeli.
5. Offline/reload senaryosunda `route-commands.js?v=1` cache'ten yüklenmeli.

## Sonraki fazlar

### Faz 1B — Kalan saf komut tanımları

Önce tüm command/alias alanında çakışma testi ekle. Ardından yalnız yan etkisiz
yardım metni ve saf navigasyon komutlarını ikinci registry'ye taşı. Parser,
history ve autocomplete davranışına dokunma.

> **Uyarı (canlıya alma incelemesi, 2026-07-17):** Komut uzayı TEK katman
> değildir; çakışma testi üç katmanı birlikte kapsamalı:
> 1. `commandMap` + kayıt SONRASI elle eklenen gizli komutlar
>    (`commandMap['resonate']`, `commandMap['rezonans']`),
> 2. sıraya duyarlı `parameterActions` önekleri (`shop `, `radio `, `chat `,
>    `resonate `, `pipe `, `outrun ` ...),
> 3. `runCommand` içinde normalize'dan ÖNCE çalışan ham-önek yolları
>    (`say|soyle|söyle`, `bottle|sise|şişe`, `mark/leave mark`, `ask/sor`).
> Yalnız commandMap'e bakan test yeşilken gerçek gölgeleme kaçırır (örn. yeni
> bir alias'ın ham-önek yolunu gölgelemesi). Ayrıca karşılaştırma
> `normalizeCommand` TR katlaması SONRASI anahtar uzayında yapılmalı
> (`mantık` ve `mantik` aynı anahtara düşer).

### Faz 2 — VFS ve dünya durumu

`virtualCwd`, sanal dosya sistemi, oda/çevre komutları ve bunların storage
erişimini tek factory sınırında topla. Önce `pwd`, `ls`, `cd`, `cat` ve room
geçişlerinin karakterizasyon testlerini yaz.

> **Uyarı (2026-07-17):** `virtualCwd`'nin terminal dışında iki canlı tüketicisi
> var: `presence.js` (cd sonrası `presenceMod.sync()` ile oda takibi + atlas
> parlaması) ve `chat.js` (mesaj payload'ındaki `room` alanı, güverte/koruyucu
> gösterimleri). VFS taşınırken bu ikisinin aynı kaynaktan okumaya devam ettiği
> karakterizasyon testine dahil edilmeli; ayrıca `cd` başarısında presence
> sync çağrısının kaybolmadığı doğrulanmalı.

### Faz 3 — Ekonomi

Shard, shop, kart ve ödül akışlarını ayır. LocalStorage/Supabase fallback
semantiğini test etmeden taşıma yapma; mevcut SQL kurulmamışken zarif fallback
korunmalı.

### Faz 4 — Oracle

Prompt/komut orkestrasyonunu frontend adapter'ına ayır; browser yalnız
Cloudflare Worker'a gitmeye devam etmeli. Provider sırrı veya yerel agent erişimi
frontend'e taşınmamalı.

### Faz 5 — Oyun komutları ve Bugy adapter

Oyun açma/başlatma sözleşmesini ortak adapter'a al. Bugy v2/v3/v4/cinema
uygulamalarının ortak yetenek matrisini çıkardıktan sonra tek arayüz tanımla;
sürümlerden birini erken aşamada silme.

### Faz 6 — Büyük tek HTML oyunlar

Her oyunu bağımsız iş dilimi olarak ele al. Önce inline CSS, sonra inline JS
çıkar; her taşıma arasında aynı oyunun açılış, input, skor ve game-over akışını
tarayıcı testiyle doğrula.

### Faz 7 — Yükleme/performance

Modül sınırları kararlı hale geldikten sonra ana sayfadaki kullanılmayan Bugy ve
oyun motorlarını lazy-load et. Script etiketi sayısından çok aktarılan byte,
LCP/INP/CLS ve tekrar ziyaret cache davranışını ölç.

> **Uyarı (2026-07-17):** `applyUserPreferences` boot'ta Bugy motorunu senkron
> aktive ediyor ve chat konuşma balonu (`speakChatEntry`) `window.BugyV4`
> varlığına bakıyor. Motorlar lazy olursa: (1) tercih geri yükleme motor
> yüklenene kadar ertelenmeli/kuyruklanmalı, (2) "Bugy mesajı balonda söylüyor"
> özelliği motor gelene dek sessiz kalır — bu bilinçli bir karar olarak
> belgelenmeli. Aynı durum `bugy-v4-cinema` köprüsü için de geçerli.

## Her dilim için kabul kapısı

```text
npm run check
npm run test:e2e       # bağımlılıklar kuruluysa
npm run sync:cache     # referans sapması olmadığını doğrula
```

Ayrıca değişen komutların manuel/browser smoke'u, Service Worker cache sürümü ve
bu belgedeki durum kaydı güncellenmelidir. Test sonucu alınmadan "tamamlandı"
yazılmamalıdır.

## Faz 1A rollback

Sorun görülürse yalnız Faz 1A geri alınır:

1. 23 tanımı `home-protocol.js` içindeki `...routeCommandDefinitions` konumuna
   geri koy.
2. Factory kurulum bloğunu ve `route-commands.js` script etiketini kaldır.
3. Yeni asset'i precache/validator/cache-sync/syntax listelerinden çıkar.
4. `home-protocol.js` asset sürümünü ve `CACHE_NAME` değerini tekrar artır;
   yayınlanmış cache sürümünü geriye düşürme.
5. Unit test dosyasını ancak inline tanımları test edecek eşdeğer koruma
   sağlanıyorsa kaldır.

## Bir sonraki oturumun kesin başlangıç noktası

Önce çalışma ağacı diff'ini gözden geçir; Faz 1A'yı tek, davranış değiştirmeyen
commit olarak kapat. Ardından P0/Service Worker önceliklerine dön; Faz 1B'ye
geçilecekse ilk iş global command/alias çakışma testidir.
