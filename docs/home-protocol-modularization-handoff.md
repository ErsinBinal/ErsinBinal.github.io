# Home Protocol Modülerleştirme — Handoff

Son güncelleme: 18 Temmuz 2026 (Faz 2C yerel doğrulama)
Durum: **Faz 0/1A/1B/2A/2B canlıda; Faz 2B `convivium-v200` kabulü tamamlandı.
Faz 2C salt okunur world/room modeli kod, karakterizasyon, tarayıcı, fail-closed
fallback ve çevrimdışı test tarafında tamam; kullanıcı
incelemesi/commit/push/yayın bekliyor.**
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

| Ölçüm | Başlangıç | Faz 1A sonrası | Faz 1B canlı | Faz 2A canlı | Faz 2B canlı | Faz 2C yerel |
|---|---:|---:|---:|---:|---:|---:|
| `home-protocol.js` | 4.530 satır | 4.390 satır | 4.329 satır | 4.298 satır | 4.253 satır | 4.113 satır |
| Terminal komutu | 132 | 132 | 132 | 132 | 132 | 132 |
| `home-protocol.js` içindeki komut tanımı | 132 | 109 | 95 | 95 | 95 | 95 |
| `route-commands.js` içindeki komut | yok | 23 | 23 | 23 | 23 | 23 |
| `guide-commands.js` içindeki komut | yok | yok | 14 | 14 | 14 | 14 |
| `vfs.js` | yok | yok | yok | 132 satır | 205 satır | 205 satır |
| `world.js` | yok | yok | yok | yok | yok | 234 satır |
| Route / rehber registry alias'ı | yok | 99 / yok | 99 / 75 | 99 / 75 | 99 / 75 | 99 / 75 |
| Ana sayfa `<script>` etiketi | 30 | 31 | 32 | 33 | 33 | 34 |
| Service Worker cache sürümü | v194 | v195 | v198 | v199 | v200 | v201 (yerel) |

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

### Faz 2A — VFS navigation çekirdeği — TAMAMLANDI VE CANLI DOĞRULANDI

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
- Kullanıcı yayını sonrası canlı ana sayfada `vfs.js?v=1`,
  `home-protocol.js?v=77` ve Service Worker `convivium-v199` doğrulandı. VFS
  SHA-256 `2cc765c30455b14f9b0bfa6ec02ade40c4c3b0c98b9c6375feac6e7afc440e7c`,
  protocol SHA-256
  `bb56650c835e1d7c8796078cb40bd0f85af4de9e43c06a24b7ce1b2c9644612a`;
  iki canlı dosya da main ile birebir eşleşti.

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

### Faz 2B — Kalıcı `/home` dosya motoru — TAMAMLANDI VE CANLI DOĞRULANDI

Uygulanan güvenli dilim:

- `convivium.shell.files` storage anahtarı ile 24 dosya, 32 karakter dosya adı
  ve 4.000 karakter içerik sınırlarının sahipliği `vfs.js` içine taşındı.
- `normalizeFileName/listFiles/readFile/writeFile/removeFile` artık VFS
  factory'sinin açık sözleşmesidir. Bozuk JSON, dizi biçiminde veri ve
  `localStorage` erişim/yazma hatalarındaki eski best-effort davranış korundu.
- `home-protocol.js` storage şeması veya motoru tutmuyor; yalnız VFS çağrılarını
  shell `touch`, `rm/del`, `tee`, `>` ve `>>` yollarına bağlıyor.
- Shell yönlendirme çıktıları, dosya sıralaması, tekrar `touch`, korumalı
  `rm -rf home`, yazma/ekleme semantiği ve hata metinleri değiştirilmedi.
- `index.html` için `vfs.js?v=2` ve `home-protocol.js?v=78`; Service Worker için
  `convivium-v200` atomik olarak hazırlandı. Precache ve site-integrity
  sözleşmeleri aynı sürümlere bağlandı; managed asset sayısı 21'de kaldı.
- Faz 2A'da kaydedilen `cd ..`/`cd /` ve noktalı `cat` normalizasyon sorunları
  bu dilimde bilinçli olarak düzeltilmedi.

Karakterizasyon ve doğrulama:

- `tests/unit/home-vfs.test.mjs` 8/8: navigation/oda tüketicilerine ek olarak
  ad normalizasyonu, yazma, ekleme, listeleme, silme, üç limit ve bozuk/kapalı
  storage davranışları kilitlendi. Protocol'ün storage motorunu yeniden
  sahiplenmediği ve tüm yazma yollarını VFS'ye verdiği kaynak testiyle korunuyor.
- `npm run check`: unit 26/26, Worker 12/12, 27 HTML / 27 CSP / 22 tam sürümlü
  harici script ile geçti. `npm run sync:cache` 21 asset'i senkron buldu.
- Normal Chromium akışında `>`, `>>`, `cat`, iki kez `touch`, `ls home`, `tee`,
  `rm`, `del` ve korumalı `rm -rf home` geçti. Son storage içeriği yalnız
  beklenen `{ "kopya": "filtre" }` oldu; page error yok.
- VFS asset'i bilinçli engellendiğinde
  `[home-protocol] VFS module unavailable` görüldü; yönlendirme kontrollü
  `yaz: virtual filesystem unavailable` döndürdü, `level` çalışmayı sürdürdü
  ve page error oluşmadı.
- Service Worker kontrollü çevrimdışı reload'da `convivium-v200` içindeki
  `vfs.js?v=2` ve `home-protocol.js?v=78` doğrulandı; yazma → ekleme → `cat` →
  silme zinciri çevrimdışı geçti ve storage boş kaldı.
- Yerel smoke 8/8; Playwright E2E 7/7 geçti. Gerçek kullanıcı oluşturan kayıt
  testi bilinçli olarak skip edildi.
- Kullanıcı yayını sonrası canlı ana sayfada `vfs.js?v=2`,
  `home-protocol.js?v=78` ve Service Worker `convivium-v200` doğrulandı. VFS
  SHA-256 `4f478a182918304e9490577c7c4e3acdcb79bb2baee13ecbf815f4756bf22bf4`,
  protocol SHA-256
  `2d0eb0846ad23ca58a2c544947f9e99f57626b09baf4369133b7d769f7eba852`;
  iki canlı dosya da main `a32247c` ile birebir eşleşti.

Değişen dosyalar:

| Dosya | Amaç |
|---|---|
| `assets/js/home/vfs.js` | Kalıcı `/home` storage ve dosya işlemleri sahipliği |
| `assets/js/home-protocol.js` | İnce shell/VFS orkestrasyon çağrıları |
| `tests/unit/home-vfs.test.mjs` | Storage, limit, sahiplik ve hata karakterizasyonu |
| `index.html` | VFS v2 ve protocol v78 referansları |
| `service-worker.js` | Aynı asset sürümleri ve cache v200 |
| `scripts/validate-site-integrity.js` | Precache/script sürüm sözleşmeleri |

### Faz 2C — Salt okunur world/room modeli — KOD/TEST TAMAM; YAYIN BEKLİYOR

Uygulanan güvenli dilim:

- Sekiz odanın registry'si, başlıkları, nesne metinleri, `locked/key/grants`
  verisi ve sırası yeni `assets/js/home/world.js` içinde deep-frozen tek kaynak
  oldu.
- `roomExits`, `currentObjective`, `rankTitle`, `prodosPath`, `roomPanel`,
  `look`, `examine` ve fuzzy nesne eşleme salt okunur world factory'sine taşındı.
- World factory state'i doğrudan yazmıyor. Envanter, kilit, CWD ve keşif
  durumunu getter'larla okuyor; ilk `look` keşfini protocol callback'ine
  bildiriyor. Persist sahipliği protocol'de kaldı.
- `take`, `unlock`, `use`, inventory mutasyonu, `persist`, `scheduleWorldSave`,
  audio, seviye/shard ödülleri ve Supabase yan etkileri taşınmadı. Bu komutlar
  immutable registry'yi `worldMod.getRoom/getCurrentRoom` üzerinden okuyor.
- World modülü eksik veya kurulamazsa VFS fail-closed kapanıyor; kilitli odalara
  `cd` ile girilemiyor. World/VFS komutları açık unavailable mesajı verirken
  terminalin geri kalanı çalışmayı sürdürüyor.
- `world.js?v=1`, `home-protocol.js?v=79` ve `convivium-v201` atomik yayın dilimi
  olarak bağlandı. World asset'i syntax/precache/validator/cache-sync
  sözleşmelerine eklendi; managed asset sayısı 22 oldu.
- Faz 2A'dan kalan `cd ..`/`cd /` ve noktalı `cat` parser sorunları yine bu
  refaktöre karıştırılmadı.

Karakterizasyon ve doğrulama:

- Yeni `tests/unit/home-world.test.mjs` 5/5: sekiz odanın tam veri snapshot'ı,
  deep-freeze, panel metni, keşfin tek çağrısı, fuzzy `examine`, boş oda
  fallback'i, çıkış/unvan/görev geçişleri, eksik dependency ve protocol sahiplik
  sınırı.
- Unit toplamı 31/31; komut uzayı snapshot'ı hâlâ 132 komut, 589 etiket ve 545
  normalize anahtarı kilitliyor.
- `npm run check`: unit 31/31, Worker 12/12, 27 HTML / 27 CSP / 22 tam sürümlü
  harici script ile geçti. `npm run sync:cache` 22 asset'i senkron buldu.
- Normal Chromium akışında root `look/examine`, `cd notes`, clue inceleme,
  `take shard`, inventory, `unlock vault`, `cd vault`, vault `look/examine`
  geçti. Inventory/unlocked/discovered state'i doğru; page/protocol hatası yok.
- World asset'i bilinçli engellendiğinde beklenen iki konsol kaydı görüldü;
  `look/examine` kontrollü kapandı, VFS fail-closed olduğu için `cd vault`
  çalışmadı, `take` state değiştirmedi ve `level` çalıştı. Page error yok.
- Service Worker kontrollü çevrimdışı reload'da `convivium-v201` içindeki
  `world.js?v=1`, `vfs.js?v=2` ve `home-protocol.js?v=79` doğrulandı. Aynı
  keşif → shard → vault açma akışı offline geçti; page error yok.
- Yerel smoke 8/8; Playwright E2E 7/7 geçti. Gerçek kullanıcı oluşturan kayıt
  testi bilinçli olarak skip edildi.

Değişen/yeni dosyalar:

| Dosya | Amaç |
|---|---|
| `assets/js/home/world.js` | Immutable oda registry'si ve salt okunur world factory |
| `assets/js/home-protocol.js` | World kurulumu, callback'ler ve mutasyon orkestrasyonu |
| `tests/unit/home-world.test.mjs` | Registry/görünüm/geçiş/fallback karakterizasyonu |
| `index.html` | World v1 yükleme sırası ve protocol v79 |
| `service-worker.js` | World precache ve cache v201 |
| `scripts/validate-site-integrity.js` | World asset/factory/sıra/sürüm sözleşmesi |
| `scripts/sync-cache-versions.js` | World asset'ini managed listeye alma |
| `package.json` | World modülünü syntax kapısına alma |

### Faz 2D — World mutasyon komutları — 2C CANLI KABULÜ SONRASI ADAY

Önce `take/unlock/use` için inventory, unlocked, easter trail, persist,
`scheduleWorldSave`, audio, access/level ve shard ödül yan etkilerini çağrı
sırasıyla karakterize et. Ardından yalnız mutasyon kararlarını ayrı bir factory
sınırına al; state yazımı, ekonomi ve Supabase işlemleri injected callback olarak
protocol'de kalsın. Ödül veya storage semantiğini bu taşıma sırasında değiştirme.

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

## Faz 2B rollback

Sorun görülürse canlı Faz 2A sınırını koruyarak yalnız Faz 2B geri alınır:

1. `convivium.shell.files` anahtarı, üç limit ve
   `vfsLoad/save/name/list/read/write/remove` uygulamalarını aynı davranışla
   protocol içine geri koy.
2. VFS'nin navigation/CWD sahipliğini ve Presence/Chat tüketicilerini olduğu
   yerde bırak; Faz 2A'yı geri alma.
3. `home-vfs.test.mjs` içindeki storage, limit, bozuk veri ve kapalı storage
   karakterizasyonunu inline motoru doğrulayacak biçimde koru; testleri silme.
4. `vfs.js`, protocol ve Service Worker referanslarını yeni ileri `?v=` ve
   cache sürümüyle yayınla. `convivium-v200` canlıya çıktıysa v199'a düşürme.

## Faz 2C rollback

Sorun görülürse canlı Faz 2B sınırını koruyarak yalnız Faz 2C geri alınır:

1. Sekiz oda registry'sini, başlık/çıkış/görev/unvan helpers'ını ve
   `roomPanel/look/examine` uygulamalarını protocol içindeki eski sırasına geri
   koy.
2. VFS `getRoom/renderRoom` ile `take/unlock` tüketicilerini aynı inline
   registry'ye birlikte bağla; yarı world modülü/yarı inline veri bırakma.
3. `home-world.test.mjs` snapshot ve davranış testlerini inline kaynağı
   doğrulayacak biçimde koru; lock/grant/key snapshot'larını silme.
4. `world.js` script ve syntax/precache/validator/cache-sync bağlantılarını
   kaldır. Protocol ve Service Worker'ı yeni ileri sürümlere bump et;
   yayımlanmış `convivium-v201` hiçbir koşulda v200'e düşürülmez.

## Bir sonraki oturumun kesin başlangıç noktası

Faz 2C için kullanıcı mevcut diff'i inceler; commit/push/yayın kullanıcıya
aittir. Yayın sonrası canlıda `world.js?v=1`, `vfs.js?v=2`,
`home-protocol.js?v=79` ve `convivium-v201` doğrulanır; world/protocol canlı
hash'leri main ile karşılaştırılır. Bu çalışma ağacındaki beklenen SHA-256:
world `dc4ed8074e320649c1bc4e76ad2a9b4c6396a6862bd968ebac5054edd557404a`,
protocol `90fabfa59709db6c135a5cf862fe361800d4e93cf0762f4b0db7fd4c158eb83d`.
Terminalde en az `look`, `examine glyph`,
`cd notes`, `look`, `examine clues`, `take shard`, `inventory`, `unlock vault`,
`cd vault`, `look` ve `examine satir` çalıştırılır.

Canlı kabul temizse Faz 2D için önce world mutasyonlarının bütün yan etkileri ve
çağrı sırası karakterize edilir. Parser sorunları, ekonomi davranışı ve Supabase
storage semantiği bu taşıma ile aynı değişiklik setinde düzeltilmez.
