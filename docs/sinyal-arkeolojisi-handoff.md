# Sinyal Arkeolojisi — Ürün Handoff

Son güncelleme: 18 Temmuz 2026 (yerel doğrulama)
Durum: **KOD/TEST TAMAM; commit/push/yayın bekliyor.**
Başlangıç main: `a6a1bb8`

Bu belge `/ruins` terminal deneyiminin tek takip noktasıdır. Terminal
modülerleştirmesi Faz 3B canlı sınırında park edilmiştir; kart/collect veya
başka mimari taşıma bu ürün dilimine karıştırılmayacaktır.

## Ürün amacı

Convivium'un geçmiş sürümlerinden kalmış gibi görünen üç sahte dijital kalıntıyı
mevcut terminal kabuğuyla keşfedilebilir hale getirmek:

1. 1997 tarihli kapanmamış BBS kaydı,
2. yarım bırakılmış bir `TODO` parçası,
3. kurtarılmış bir arcade ekran dökümü.

Her UTC gününde üç kalıntıdan biri herkes için aynı "yüzey sinyali" olur.
Deneyim tamamen statik ve deterministik kalır; backend, hesap veya saatlik görev
gerektirmez.

## Sabit kapsam

- `/ruins` açık ve kilitsiz bir sanal terminal odası olacak.
- `ls /`, `cd ruins`, `look`, `examine <nesne>` ve `cat <dosya>` mevcut parser
  ve çıktı akışını kullanacak.
- Üç kayıt immutable ürün registry'sinde tutulacak.
- Günlük seçim enjekte edilen gün anahtarından deterministik üretilecek.
- İlk keşif mevcut world discovery davranışı üzerinden +2 shard verebilir;
  yeni ekonomi kuralı eklenmeyecek.
- Ürün modülü yoksa yalnız `/ruins` mount'u kaybolacak; core world, VFS,
  economy ve terminal çalışmayı sürdürecek.
- Kullanıcıya görünür ürün olduğu için changelog ve `signals.xml` güncellenecek.
- Ürün çevrimdışı Service Worker kontrollü reload'da çalışacak.

## Kapsam dışı

- Yeni terminal komutu, Supabase tablosu/RPC, Worker endpoint'i veya framework.
- Gerçek site geçmişini temsil etme iddiası; bütün kalıntılar kurmaca olacak.
- Zamanla sunucuda açılan içerik, çok kullanıcılı kazı veya shard loterisi.
- Kart/collect modülerleştirmesi ve diğer ürün havuzu maddeleri.

## Teknik sınır

- `assets/js/home/ruins.js`: artifact registry, günlük seçim, world room
  extension ve VFS mount üreten saf `createRuins(deps)` factory'si.
- `world.js`: yalnız doğrulanmış opsiyonel oda extension'larını core registry'ye
  ekleyecek; Ruins metnini bilmeyecek.
- `vfs.js`: yalnız doğrulanmış opsiyonel mount/dokümanları core VFS'ye ekleyecek;
  Ruins metnini bilmeyecek.
- `home-protocol.js`: modülü kuracak ve iki saf extension'ı world/VFS'ye
  geçecek. localStorage veya ürün kararı burada tutulmayacak.

## Uygulama ve kabul sırası

1. Artifact sırası/metni, günlük seed ve immutability için kırmızı unit test.
2. World extension ve VFS mount davranışları için kırmızı unit test.
3. `ruins.js` factory; ardından world/VFS'nin opsiyonel extension desteği.
4. Protocol fail-closed kurulumu ve atomik asset/cache sürümleri.
5. Normal Chromium: `ls / → cd ruins → look → examine buluntu → cat`.
6. Ruins asset'i yokluğu: `/ruins` yok, core `cd notes/look` çalışır.
7. Service Worker kontrollü çevrimdışı reload ve aynı günlük buluntu.
8. `npm run check`, smoke, E2E, changelog/RSS ve canlı kabul.

## Uygulanan dilim

- `ruinsArtifactRegistry` üç kurmaca kalıntının id/object/title/summary/body
  verisini derin dondurulmuş biçimde tutuyor.
- `createRuins({ getDayKey })` UTC gün anahtarını 31 tabanlı deterministik hash
  ile üç artifact'tan birine eşliyor; aynı gün herkes aynı buluntuyu görüyor.
- Factory `/ruins` için room extension ve üç dosyalı VFS mount üretiyor;
  localStorage, DOM, backend veya network'e erişmiyor.
- World core sekiz oda snapshot'ını varsayılan kullanımda koruyor; yalnız
  doğrulanmış extension verildiğinde dokuzuncu odayı ekliyor.
- VFS core dizin/doküman davranışını varsayılan kullanımda koruyor. Opsiyonel
  mount core public doküman anahtarlarını ezemiyor; `/home` yazma davranışı aynı.
- Protocol Ruins modülünü fail-closed kuruyor. Asset yoksa konsola tek açık
  hata yazılıyor, `/ruins` mount edilmiyor; core world/VFS/economy çalışıyor.
- `ruins.js?v=1`, `world.js?v=2`, `vfs.js?v=3`,
  `home-protocol.js?v=83` ve `convivium-v205` atomik yayın dilimidir. Managed
  asset sayısı 26 oldu; ana sayfa 38 script etiketi yüklüyor.
- Changelog, RSS ve yaşayan mimari harita güncellendi. Yeni HTML veya SQL yok.

## Yerel doğrulama

- Yeni `tests/unit/home-ruins.test.mjs` 7/7: artifact snapshot/immutability,
  üç günlük deterministik seçim, room/VFS üretimi, opsiyonel dokuzuncu oda,
  mount/doküman okuma, dependency/sahiplik ve core doküman override guard'ı.
- Global unit toplamı 60/60; Worker 12/12. Komut uzayı 132 komutu koruyor.
- Normal Chromium: `ls / → cd ruins → look → examine buluntu → cat` geçti;
  ilk keşif +2 shard verdi, reload kalıcılığı ve bugünün
  `arcade-recovery.scr` seçimi doğrulandı.
- Ruins asset'i engellendiğinde yalnız mount kayboldu; `cd ruins` kontrollü
  hata, `cd notes` normal oda çıktısı verdi. Page error yok.
- Service Worker kontrollü çevrimdışı reload'da oda, günlük buluntu ve artifact
  gövdesi çalıştı; page error yok.
- Terminal dialog/focus/live-region sözleşmesi korundu ve masaüstünde yatay
  taşma oluşmadı. Yerel smoke 8/8, standart Playwright E2E 7/7 geçti; gerçek
  signup testi bilinçli olarak skip edildi.

## Güncel ölçüm ve yayın hash'leri

| Ölçüm | Sonuç |
|---|---:|
| `ruins.js` | 104 satır |
| `world.js` | 255 satır |
| `vfs.js` | 232 satır |
| `home-protocol.js` | 4.066 satır |
| Core / extension oda | 8 / 1 |
| Artifact | 3 |
| Terminal komutu | 132 |
| Service Worker | v205 (yerel) |

Beklenen SHA-256:

- ruins: `56f0d1115b8d2ff7d1b1ad413db536baedea452a7cf89532542602d00add823d`
- world: `518c970073520adb39007a964e2d466865f38bc63650bc91fcaef2379f9596e5`
- VFS: `fd392650c4500298fe1df44845c79024ee0992d2071f2da69ebeea7b4d8628c3`
- protocol: `ad793a4bff34cfdc72c373a9f6e9dbd27fa06f9971b2a9901f169af51d0097ac`

## Değişen/yeni dosyalar

| Dosya | Amaç |
|---|---|
| `assets/js/home/ruins.js` | Artifact registry, günlük seçim ve iki extension |
| `assets/js/home/world.js` | Opsiyonel room extension desteği |
| `assets/js/home/vfs.js` | Opsiyonel güvenli mount/doküman desteği |
| `assets/js/home-protocol.js` | Fail-closed Ruins kurulumu ve delegasyon |
| `tests/unit/home-ruins.test.mjs` | Ürün, entegrasyon ve sınır karakterizasyonu |
| `index.html` | Ruins/world/VFS/protocol atomik asset sürümleri |
| `service-worker.js` | Ruins precache ve cache v205 |
| `scripts/validate-site-integrity.js` | Asset/factory/sıra/sürüm sözleşmesi |
| `scripts/sync-cache-versions.js` | Ruins managed asset kaydı |
| `package.json` | Ruins syntax kapısı |
| `pages/changelog.html`, `signals.xml` | Kullanıcıya görünür yayın kaydı |
| `docs/architecture/README.md` | Yaşayan `/ruins` mimari düğümü |

## Değişmez kabul ölçütleri

- Global terminal komutu 132 kalır.
- Core sekiz oda ve mevcut çıktı snapshot'ları varsayılan factory kullanımında
  değişmez; `/ruins` yalnız extension verildiğinde dokuzuncu oda olur.
- VFS core dizin/doküman davranışı extension verilmediğinde birebir korunur.
- Üç artifact ve günlük seçim test altında, içerik HTML olarak basılmaz;
  terminal `textContent` yolu kullanılmaya devam eder.
- Page error, beklenmeyen protocol error veya çevrimdışı eksik asset olmaz.

## Rollback

1. Protocol'den Ruins kurulumu ve world/VFS extension geçişini kaldır.
2. World/VFS'nin genel opsiyonel extension desteği başka tüketici yoksa kaldır;
   core registry snapshot'larını koru.
3. `ruins.js` script, syntax, precache, validator ve cache-sync bağlantılarını
   kaldır.
4. Changelog/RSS girdisini ürün canlıdan çekildiyse geri al.
5. Asset query ve Service Worker cache sürümünü ileri bump et; canlıya çıkmış
   cache sürümüne geri dönme.

## Yarım kalırsa kesin başlangıç noktası

Mevcut diff'i ve yukarıdaki dört hash'i kontrol et; `npm run check` ve
`npm run sync:cache` yeniden temizse ürün commit'ini oluşturup main'e push et.
GitHub Pages yayını sonrası canlı asset sürümlerini, dört hash'i,
`convivium-v205` değerini ve `cd ruins → examine buluntu → cat` akışını doğrula.
Sonucu bu belgeye ve yenilik kuyruğuna işle. Commit/push/canlı yayın bu ürün
hattında kullanıcı tarafından Codex'e açıkça yetkilendirilmiştir.
