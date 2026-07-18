# Terminal Navigasyonu — Sinyal Pusulası Handoff

Son güncelleme: 18 Temmuz 2026 (N1 yerel kabul)
Durum: **N1 KOD/TEST TAMAM; commit/push/canlı kabul bekliyor.**
Başlangıç main: `c672f35`

Bu belge terminal yön bulma düzeninin tek takip noktasıdır. Ürün havuzu ve
park edilen domain modülerleştirmesi bu değişiklik setine karıştırılmayacaktır.

## Problem

- Terminal 132 komutu koruyor; ana `help` çıktısı keşif, rota, oyun, sistem,
  shell, sosyal özellik ve gizli ilerlemeyi aynı düzlemde gösteriyor.
- `basla`, `guide`, oyun/uygulama/skor rehberleri doğru bilgi taşısa da ilk
  yön kararını çoğaltıyor.
- Görsel öneriler kapalı; görünmez Tab tamamlama yalnız ilk kelimede ve tek
  eşleşmede input'u kendiliğinden değiştiriyor.
- `map`, sayfa rotası ve terminal world kavramları kullanıcı zihninde
  ayrışmıyor. Oda çıkışları yerel rota yerine geniş bir listeye dönüşüyor.

## Tasarım ilkesi

Convivium sıradan bir menüye dönmeyecek. Temel yön bulma açık, keşfedilen
içerik ve gizli yollar esrarengiz kalacak. Kullanıcı komut ezberlemek yerine
şu kanonik dili öğrenecek:

- `cd`: terminal odasında yer değiştir,
- `open`: içerik/araç aç,
- `run`: oyun/deneyim başlat,
- doğrudan fiiller: bulunduğun bağlamla etkileş (`look`, `examine`, `chat`).

Eski komut ve alias'lar kaldırılmayacak; bu dil yalnız görünür yönlendirme
katmanıdır.

## Fazlar

### N0 — Güvenlik ağı

- 132 komut, 589 etiket, 545 normalize anahtar ve dispatch sırası korunacak.
- Eski `help` çıktısı `help all` altında erişilebilir kalacak.
- Yeni saf navigator factory için ranking, typo, parametre ve yardım snapshot
  testleri yazılacak.

### N1 — Sinyal Pusulası + bağlamsal tamamlama

- Ana `help` en fazla altı niyet grubuna ayrılacak: keşfet, oku, oyna,
  ritüel, bağlan, sistem.
- `help <niyet>` kısa detay; `man <komut>` tek komut açıklaması olacak.
- Kullanıcı yazarken en fazla üç kanonik öneri gösterilecek.
- `h` girdisinde `help` ilk öneri; `hepl` girdisinde güvenli düzeltme olarak
  `help` gösterilecek.
- Alias eşleşmesi kanonik sahibini gösterecek (`yard` -> `help`); alias
  kalabalığı ayrı seçenekler üretmeyecek.
- Parametre bağlamı desteklenecek: `cd r` oda, `examine b` mevcut oda nesnesi,
  `help o` niyet ve `man car` komut önerisi üretecek.
- Tab aktif öneriyi input'a alacak. Ok tuşuyla açıkça seçilen öneri Enter ile
  çalıştırılabilecek; varsayılan/fuzzy öneri kendiliğinden yürütülmeyecek.
- Mouse/touch seçimi yalnız input'u dolduracak; çalıştırmak için ayrıca Enter
  gerekecek.
- Öneri motoru yoksa terminal, komut dispatch'i ve eski `help` çalışacak.

### N2 — Bağlamsal `look` ve yerel rota

- Oda başına en fazla üç sonraki hareket.
- Bütün oda listesini her yerde göstermek yerine yerel geçiş dili.
- Hata/kilit mesajlarında kontrollü geri kazanım önerisi.

### N3 — Yaşayan Atlas

- Terminal odası, site içeriği ve deneyim düğümleri görsel olarak ayrılacak.
- Keşfedilen yollar ve son rota gösterilecek; gizli düğüm adları sızmayacak.
- Aynı navigation metadata'sı help, look, öneri ve Atlas tarafından tüketilecek.

## N1 teknik sınırı

- `assets/js/home/navigator.js`: niyet registry'si, kısa yardım ve saf ranking.
- `home-protocol.js`: factory kurulumu, DOM render ve klavye orkestrasyonu.
- Navigator DOM, localStorage, backend, network veya komut çalıştırma yetkisi
  taşımayacak.
- Öneriler yalnız `commandDefinitions`, world oda/nesne read-model'i ve CWD
  getter'ından üretilecek. Gizli sonradan eklenen komutlar kaynak listeye
  girmediği için önerilerde görünmeyecek.
- Yeni framework, backend, SQL veya analytics yok.

## N1 kabul kapıları

1. Unit: ana/niyet help snapshot'ı, canonical/alias/fuzzy ranking, `cd`,
   `examine`, `help`, `man` parametreleri, üçlü sınır ve immutability.
2. Komut uzayı: 132 komut ve mevcut alias snapshot'ı aynı.
3. Chromium: `h`, `hepl`, `cd r`, `examine b`; mouse, Tab, ok+Enter.
4. Güvenlik: fuzzy öneri yalnız görünür; açık seçim olmadan yürütülmez.
5. Erişilebilirlik: combobox/listbox ilişkisi, `aria-expanded`, aktif option,
   klavye odağı ve `aria-live` korunur.
6. Mobil: üç öneride yatay taşma ve terminal yüksekliği sorunu yok.
7. Modül-yokluğu: terminal boot, `help all` ve normal komut çalışır.
8. Service Worker kontrollü offline reload'da navigator ve öneriler çalışır.
9. `npm run check`, smoke ve standart E2E yeşil.

## N1 uygulanan sonuç

- `navigationIntentRegistry`, keşfet/oku/oyna/ritüel/bağlan/sistem gruplarını
  immutable veri olarak tutuyor. Ana `help` 12 satırlık bağlamsal Pusula;
  `help <niyet>` kısa detay, `help all` eski tam döküm oldu.
- Saf `createNavigator(deps)`, kanonik komutları gösteriyor; alias'ları yalnız
  eşleştirme için kullanıyor. Prefix, alias, bağlam ve en fazla iki harflik
  fuzzy düzeltme tek puanlama katmanında birleşiyor.
- `h` gerçek komut uzayında `help · map · home` üretiyor: `help` ilk sırada,
  Türkçe `harita` alias'ı bağlama uygun canonical `map` olarak görünüyor.
- Parametre sağlayıcıları canlı world verisini tüketiyor: `cd r`, `examine b`,
  `help o` ve `man car` doğru seçenekleri üretiyor. `/ruins`, günün artifact'ı
  için kendi üç navigation metadata satırını ürün modülünden sağlıyor.
- Yazarken input değişmiyor. Tab dolduruyor; mouse/touch doldurup bekliyor;
  ok tuşuyla açıkça seçilen öneri Enter ile çalışıyor. Varsayılan veya fuzzy
  öneride ilk Enter yalnız düzeltme, ikinci Enter yürütme yapıyor.
- Input/list ARIA combobox/listbox ilişkisi, aktif option id/selected durumu ve
  `aria-expanded` ile bağlı. İçerik yalnız DOM node + `textContent` ile yazılıyor.
- Navigator yoksa eski `help`, normal komut dispatch'i ve basit prefix fallback
  çalışıyor; konsola açık tek hata yazılıyor.
- İlk Service Worker kurulumundaki `clients.claim()` artık açık terminali
  gereksiz reload etmiyor. Zaten controller'ı olan gerçek güncelleme kabulünde
  tek reload davranışı korunuyor ve iki unit testle kilitleniyor.
- Atomik yerel paket: navigator v1, Ruins v2, protocol v84, home CSS v28,
  service-worker-register v4 ve `convivium-v206`. Ana sayfa 39 script etiketi,
  cache-sync 27 managed asset içeriyor.

## N1 yerel doğrulama — 18 Temmuz 2026

- Yeni navigator unit: 7/7; Service Worker register unit: 2/2.
- Global unit: 69/69; Worker: 12/12; komut uzayı 132 komut, 589 etiket ve
  545 normalize anahtarı koruyor. Parametre öneki yalnız `help ` ile 37 oldu.
- Özel Chromium: canonical/alias/fuzzy/parametre, Tab, ok+Enter, touch,
  typo güvenliği, modül-yokluğu, mobil geometri ve offline reload 3/3.
- Standart Chromium E2E 7/7; gerçek kullanıcı oluşturan kayıt testi skip.
- Smoke 11/11; site integrity 27 HTML / 27 CSP / 22 tam sürümlü harici script.

## N1 yerel ölçüm ve beklenen yayın hash'leri

| Ölçüm | Sonuç |
|---|---:|
| `navigator.js` | 353 satır |
| `home-protocol.js` | 4.160 satır |
| `ruins.js` | 109 satır |
| Ana sayfa script | 39 |
| Terminal komutu | 132 |
| Görünen öneri tavanı | 3 |
| Service Worker | v206 (yerel) |

- navigator: `beb796a9a834c2a8bc759339c23373dcbe6cff84e16c42eea9bf16fa22b008bc`
- protocol: `74d54db4d33eca6ea8b4870323f32e204c5c8a09bd41d6a1395171f51adc4bc8`
- Ruins: `69c8d2c04f6ed4c05c9061f61bbfbfe5290087959f9c344daf4c5e539098ea8b`
- home CSS: `16d2f0ba42a7f71dce6528051132a2fd048b48e9ec343c1ce1ecfee9ad335125`
- SW register: `156e000d9a07057b9c8b4bbcfa92e422e4bfc0a7010382d4d0e0a96ef0b660aa`

## Değişmezler

- Öneri sayısı en fazla 3.
- Öneride alias değil kanonik komut görünür.
- Yazarken input otomatik değiştirilmez.
- Fuzzy öneri otomatik çalıştırılmaz.
- Pipe/Outrun aktifken öneri listesi oyun kontrollerine karışmaz.
- Gizli `resonate/rezonans` öneri kaynağına girmez.
- İçerik `textContent`/DOM node yolu ile yazılır; `innerHTML` kullanılmaz.

## Rollback

1. Protocol'den navigator kurulumu ve öneri DOM/klavye bağlantısını kaldır.
2. `commandHelpText` için eski tam çıktıyı yeniden varsayılan yap; `help all`
   uyumluluğunu koru.
3. `navigator.js` script/syntax/precache/validator/cache-sync bağlantılarını
   kaldır.
4. CSS ve protocol asset query'lerini yeni ileri sürüme bump et; yayımlanmış
   Service Worker cache sürümünü geriye düşürme.

## Yarım kalırsa kesin başlangıç noktası

Önce bu belgedeki aktif fazı ve git diff'ini kontrol et. N1 kabul kapılarının
tamamı geçmeden N2 `look`/rota veya N3 Atlas değişikliğine başlama. Canlı kabul
sonrası N1'i burada kapatıp N2'yi ayrı atomik yayın dilimi olarak aç.
