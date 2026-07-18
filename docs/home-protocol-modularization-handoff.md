# Home Protocol Modülerleştirme — Handoff

Son güncelleme: 18 Temmuz 2026 (Faz 2A yerel doğrulama)
Durum: **Faz 0/1A/1B canlıda; Faz 1B `convivium-v198` kabulü tamamlandı. Faz
2A VFS navigation çekirdeği kod, karakterizasyon, tarayıcı ve çevrimdışı test
tarafında tamam; kullanıcı incelemesi/commit/push bekliyor.**
Kapsam: `assets/js/home-protocol.js` ve ana terminalin doğrudan bağımlılıkları.

> Öncelik kilidi 18 Temmuz 2026'da kapandı: A1, A2, A3, B1 ve B2 canlı
> doğrulandı. [Üretim Sertleştirme Handoff](production-hardening-handoff.md)
> artık kapanış kaydıdır; aktif ilerleyiş bu belgeden sürdürülür.

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

Bu P0/P1 işleri ve B2 canlı kabulü tamamlandı. Faz 1B canlıya alındı; Faz 2 VFS
çalışması küçük ve geri alınabilir dilimlerle ilerliyor.

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

| Ölçüm | Başlangıç | Faz 1A sonrası | Faz 1B canlı | Faz 2A yerel |
|---|---:|---:|---:|---:|
| `home-protocol.js` | 4.530 satır | 4.390 satır | 4.329 satır | 4.298 satır |
| Terminal komutu | 132 | 132 | 132 | 132 |
| `home-protocol.js` içindeki komut tanımı | 132 | 109 | 95 | 95 |
| `route-commands.js` içindeki komut | yok | 23 | 23 | 23 |
| `guide-commands.js` içindeki komut | yok | yok | 14 | 14 |
| `vfs.js` | yok | yok | yok | 132 satır |
| Route / rehber registry alias'ı | yok | 99 / yok | 99 / 75 | 99 / 75 |
| Ana sayfa `<script>` etiketi | 30 | 31 | 32 | 33 |
| Service Worker cache sürümü | v194 | v195 | v198 | v199 (yerel) |

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

### Faz 1B — Kalan saf komut tanımları — TAMAMLANDI VE CANLI DOĞRULANDI

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

Uygulanan sonuç:

- `tests/unit/home-command-space.test.mjs`, gerçek monolit ile iki registry'yi
  birlikte okuyarak 132 komut, 589 komut/alias etiketi ve normalize edilmiş 545
  anahtarı snapshot ile kilitliyor.
- Bilinen ve bilinçli son-yazan kazanır çakışmaları değişmedi: `pipes`
  (`shell` → `pipe`) ve `unlock` (`unlock` → `unlock hidden`). Aynı komut
  sahibindeki 42 Türkçe normalizasyon katlanması ayrıca korunuyor.
- 36 `parameterActions` öneki, iki gizli komut (`resonate`, `rezonans`), ham
  önek yolları, ham shell kümesi ve dispatch sırası karakterize edildi. Dokuz
  bilinen parameter/commandMap örtüşmesi snapshot altında.
- İlk bitişik ve yan etkisiz 14 rehber/yönlendirme komutu ile 75 alias,
  `assets/js/home/guide-commands.js` içindeki immutable registry/factory'ye
  taşındı. Komut sırası, metin, rota ve callback davranışı değiştirilmedi.
- Modül veya factory yüklenemezse yalnız bu 14 komut devre dışı kalıyor;
  terminal boot'u ve diğer komutlar çalışmaya devam edip konsola açık hata
  yazıyor.
- `index.html` yükleme sırası, syntax/site-integrity kapıları, cache sync ve
  Service Worker precache sözleşmesi güncellendi. `home-protocol.js?v=76`,
  `guide-commands.js?v=1` ve `convivium-v198` aynı yayın dilimiydi.

Değişen/yeni dosyalar:

| Dosya | Amaç |
|---|---|
| `assets/js/home/guide-commands.js` | 14 komutluk rehber registry/factory |
| `assets/js/home-protocol.js` | Inline tanımlar yerine güvenli factory çıktısı |
| `tests/unit/home-command-space.test.mjs` | Global komut/alias/önek/dispatch karakterizasyonu |
| `tests/unit/home-guide-commands.test.mjs` | Registry snapshot ve factory davranışı |
| `index.html` | Rehber modülü yükleme sırası ve protocol v76 |
| `service-worker.js` | Yeni asset, v76 referansı ve cache v198 |
| `scripts/validate-site-integrity.js` | Precache, asset ve script sırası doğrulaması |
| `scripts/sync-cache-versions.js` | Rehber modülünü managed asset listesine alma |
| `package.json` | Rehber modülünü syntax kapısına alma |
| `tests/README.md` | Genişleyen karakterizasyon katmanı notu |

18 Temmuz 2026 yerel doğrulaması:

- `npm run check`: unit 18/18, Worker 12/12, 27 HTML / 27 CSP / 22 tam
  sürümlü harici script ile geçti.
- `npm run sync:cache`: 20 managed asset sürümü senkron.
- Normal tarayıcı akışında `basla`, `yardim`, `guide`, `how to play`, `app
  guide`, `terminal games`, `score guide` ve `keys` çalıştı; page/protocol
  hatası yok.
- `read guide`, doğru makale anchor'ına yönlendi.
- Rehber modülü bilinçli engellendiğinde beklenen konsol hatası görüldü ve
  taşınmayan `level` komutu çalışmaya devam etti.
- Service Worker kontrolündeki çevrimdışı reload'da `convivium-v198` içinden
  `guide-commands.js?v=1` ve `home-protocol.js?v=76` bulundu; registry 14
  komutla kuruldu ve `guide` çevrimdışı çalıştı. Page error yok.
- Yerel smoke 8/8; Playwright E2E 7/7 geçti. Gerçek kullanıcı oluşturan kayıt
  testi bilinçli olarak skip edildi.
- Kullanıcı yayını sonrası canlı ana sayfada `guide-commands.js?v=1`,
  `home-protocol.js?v=76` ve Service Worker `convivium-v198` doğrulandı. Guide
  ve protocol dosyalarının canlı SHA-256 değerleri main ile birebir eşleşti.

### Faz 2A — VFS navigation çekirdeği — KOD/TEST TAMAM; YAYIN BEKLİYOR

`virtualCwd`, sanal dosya sistemi, oda/çevre komutları ve bunların storage
erişimini tek factory sınırında topla. Önce `pwd`, `ls`, `cd`, `cat` ve room
geçişlerinin karakterizasyon testlerini yaz.

> **Uyarı (2026-07-17):** `virtualCwd`'nin terminal dışında iki canlı tüketicisi
> var: `presence.js` (cd sonrası `presenceMod.sync()` ile oda takibi + atlas
> parlaması) ve `chat.js` (mesaj payload'ındaki `room` alanı, güverte/koruyucu
> gösterimleri). VFS taşınırken bu ikisinin aynı kaynaktan okumaya devam ettiği
> karakterizasyon testine dahil edilmeli; ayrıca `cd` başarısında presence
> sync çağrısının kaybolmadığı doğrulanmalı.

Uygulanan güvenli dilim:

- `assets/js/home/vfs.js`, CWD sahipliğini, statik sanal dizin haritasını,
  public dokümanları ve `resolve/ls/cd/cat` davranışını `createVfs(deps)`
  factory'sinde topluyor.
- `home-protocol.js` artık ayrı bir `virtualCwd` değişkeni tutmuyor. Tercih
  snapshot/restore, `$CWD`, world/look, Oracle bağlamı, wall, Presence, Chat ve
  Chat Deck aynı `getVirtualCwd()` → `vfsMod.getCwd()` kaynağını kullanıyor.
- Başarılı `cd`, CWD'yi değiştirdikten sonra kullanıcı tercihini yazar,
  `presenceMod.sync()` çağırır ve oda keşif/ödül callback'ini çalıştırır. Kilitli
  veya bulunamayan odada bu yan etkilerin hiçbiri oluşmaz.
- Modül/factory yokluğunda terminal boot'u sürer; `pwd/ls/cd/cat` kontrollü
  unavailable mesajı verirken `level`, `help` ve diğer alanlar çalışır.
- Bu dilimde `/home` localStorage yazma/silme motoru (`vfsLoad/save/name/write/
  remove`), world room içeriği ve `look/examine/take/unlock/use` mantığı
  taşınmadı. Davranış değişikliği veya storage şeması değişikliği yok.

Karakterizasyon ve doğrulama:

- `tests/unit/home-vfs.test.mjs` 5/5: path/lock/restore; dizin, kişisel dosya ve
  public belge çıktısı; Presence sync; Chat payload room; protocol wiring ve
  eksik dependency sınırı.
- Unit toplamı 23/23; komut uzayı snapshot'ı hâlâ 132 komut, 589 etiket ve 545
  normalize anahtarı kilitliyor.
- `npm run check`: unit 23/23, Worker 12/12, 27 HTML / 27 CSP / 22 tam sürümlü
  harici script ile geçti.
- Normal Chromium akışı 13 komutla geçti: `pwd`, kilitli `cd vault`, `cd notes`,
  `ls notes`, top-level geçiş, `/home` yaz/list/read, `$CWD` ve `look`.
  Page/protocol hatası yok.
- VFS asset'i bilinçli engellendiğinde beklenen
  `[home-protocol] VFS module unavailable` görüldü; `pwd` kontrollü kapandı,
  `level` ve `help` çalıştı; page error yok.
- Service Worker kontrollü çevrimdışı reload'da `convivium-v199` içinden
  `vfs.js?v=1` ve `home-protocol.js?v=77` bulundu; `pwd → cd notes → pwd`
  çevrimdışı çalıştı.
- Yerel smoke 8/8; Playwright E2E 7/7 geçti. Gerçek kullanıcı oluşturan kayıt
  testi bilinçli olarak skip edildi.
- `index.html`, syntax/site-integrity, cache sync ve precache bağlantıları aynı
  dilimde güncellendi. 21 managed asset senkron.

Değişen/yeni dosyalar:

| Dosya | Amaç |
|---|---|
| `assets/js/home/vfs.js` | CWD + temel VFS navigation factory'si |
| `assets/js/home-protocol.js` | VFS kurulumu ve tek CWD getter orkestrasyonu |
| `tests/unit/home-vfs.test.mjs` | VFS + Presence/Chat tüketici karakterizasyonu |
| `index.html` | VFS yükleme sırası ve protocol v77 |
| `service-worker.js` | VFS precache ve cache v199 |
| `scripts/validate-site-integrity.js` | Asset, sıra, factory ve v77 doğrulaması |
| `scripts/sync-cache-versions.js` | VFS'yi managed asset listesine alma |
| `package.json` | VFS syntax kapısı |
| `tests/README.md` | VFS karakterizasyon katmanı notu |

Bilinen, bu dilimde değiştirilmemiş kabuk davranışları:

- `runCommand` tüm girdiyi parameter dispatch'ten önce normalize ettiği için
  `cd ..` ve `cd /`, nokta/slash kaybından sonra parametresiz `cd` kullanım
  mesajına düşüyor.
- Aynı nedenle `cat not.txt`, VFS'ye `not txt` olarak ulaşıyor; noktasız adlar
  çalışıyor. Bu iki konu Faz 2A regresyonu değildir. Parser davranışını dosya
  taşıma ile karıştırmamak için ayrı düzeltme dilimine bırakıldı.

### Faz 2B — Kalıcı `/home` dosya motoru — SIRADAKİ

Önce `echo >`, `touch`, `rm`, boş/dolu/depolama-kapalı ve boyut/adet sınırı
karakterizasyonunu ekle. Ardından `vfsLoad/save/name/list/read/write/remove`
sahipliğini `vfs.js` içine al; shell yönlendirme semantiğini ve localStorage
anahtarını değiştirme. Parser normalizasyon sorununu bu taşıma ile birleştirme.

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

## Faz 1B rollback

Sorun görülürse Faz 1A registry'sini koruyarak yalnız Faz 1B geri alınır:

1. 14 rehber tanımını `home-protocol.js` içindeki
   `...guideCommandDefinitions` konumuna aynı sıra ve içerikle geri koy.
2. Guide factory bloğunu ve `guide-commands.js` script etiketini kaldır.
3. Yeni asset'i precache/validator/cache-sync/syntax listelerinden çıkar.
4. `home-protocol.js` asset sürümünü ve `CACHE_NAME` değerini yeniden ileri
   artır; canlıya çıkmış hiçbir cache sürümünü geriye düşürme.
5. Global command-space testi inline + route yapısını okuyacak biçimde korunmalı;
   bilinen çakışma ve dispatch snapshot'ları silinmemeli.

## Faz 2A rollback

Sorun görülürse yalnız Faz 2A geri alınır:

1. `virtualCwd`, statik `virtualFs`/`virtualDocs` ve
   `resolveVirtualPath/lsCommand/cdCommand/catCommand` uygulamalarını protocol
   içinde aynı konumlarına geri koy.
2. Preference, world, wall, Oracle, Presence, Chat ve Chat Deck tüketicilerini
   yeniden aynı `virtualCwd` değişkenine bağla; hiçbir tüketiciyi yarı factory,
   yarı yerel durumda bırakma.
3. `vfs.js` script'ini ve syntax/precache/validator/cache-sync bağlantılarını
   kaldır; protocol asset ve Service Worker cache sürümünü yeniden ileri bump et.
4. `home-vfs.test.mjs` dosyasını ancak inline VFS için eşdeğer CWD,
   Presence/Chat ve lock karakterizasyonu korunuyorsa uyarlayarak tut.
5. Yayınlanmış `convivium-v199` hiçbir koşulda v198'e düşürülmez; ileri cache
   sürümüyle rollback yapılır.

## Bir sonraki oturumun kesin başlangıç noktası

Faz 2A için kullanıcı mevcut diff'i inceler; commit/push/yayın kullanıcıya
aittir. Yayın sonrası canlıda `vfs.js?v=1`, `home-protocol.js?v=77` ve
`convivium-v199` doğrulanır. Terminalde en az `pwd`, `cd vault`, `cd notes`,
`ls notes`, `cd home`, `echo merhaba > faz2`, `cat faz2`, `echo $CWD` ve `look`
çalıştırılır.

Canlı kabul temizse Faz 2B'ye test-first geç: önce kalıcı `/home` dosya
motorunun storage ve limit semantiğini karakterize et, sonra sahipliği VFS
factory'sine taşı. `cd ..`/`cd /` ve noktalı `cat` parser sorunlarını bu taşıma
ile aynı değişiklik setinde düzeltme.
