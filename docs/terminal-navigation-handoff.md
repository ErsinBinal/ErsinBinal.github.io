# Terminal Navigasyonu — Sinyal Pusulası Handoff

Son güncelleme: 18 Temmuz 2026 (N1.1 canlı kabul)
Durum: **N1 VE N1.1 TAMAMLANDI/CANLIDA; N2 BAŞLAMADI.**
Başlangıç main: `c672f35`
N1 ürün/yayın commit'i: `4bf06c2`
N1.1 ürün/yayın commit'i: `df7a609`

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
- N1 geçişinde eski `help` çıktısı `help all` altında erişilebilir kalacak;
  N1.1'de aynı komut adı veri tabanlı tam indekse geçirilecek.
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
- Öneri motoru yoksa terminal, komut dispatch'i ve acil kısa yardım çalışacak.

### N1.1 — Eski katman konsolidasyonu

- Hardcoded eski yardım gövdesi kaldırılacak; `help all` komut adı korunacak,
  fakat tam indeks canlı `commandDefinitions` verisinden navigator tarafından
  üretilecek.
- Protocol içindeki ikinci Levenshtein/typo motoru kaldırılacak. Tamamlama,
  `man` düzeltmesi ve çalıştırma sonrası kontrollü öneri aynı navigator kararını
  kullanacak.
- 132 komut, bütün mevcut alias'lar, kişisel alias davranışı ve gizli rotalara
  erişim korunacak. Gizli `resonate` öneri/indeks kaynağına alınmayacak.
- Navigator yokluğunda normal komut dispatch'i ve küçük bir acil yardım
  çalışacak; eski uzun gövde geri dönmeyecek.
- Yeni framework, backend, SQL veya terminal komutu eklenmeyecek.

N1.1 kabulü: `help all` veriyle aynı ve deterministik olmalı; `hepl`, `man hepl`,
`which`, `find`, kişisel alias ve bilinmeyen komut akışları korunmalı; eski yardım
metni ile protocol içi `editDistance/suggestNearestCommand` kaynakta kalmamalı.
Normal, navigator-yokluğu ve çevrimdışı Chromium akışları atomik sürüm paketiyle
geçmeden N1.1 yayımlanmayacak.

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
  `help <niyet>` kısa detaydır. N1'de korunan eski `help all` gövdesi N1.1'de
  canlı komut indeksine dönüştürüldü.
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
- Navigator yoksa küçük acil yardım, normal komut dispatch'i ve basit prefix
  fallback çalışıyor; konsola açık tek hata yazılıyor.
- İlk Service Worker kurulumundaki `clients.claim()` artık açık terminali
  gereksiz reload etmiyor. Zaten controller'ı olan gerçek güncelleme kabulünde
  tek reload davranışı korunuyor ve iki unit testle kilitleniyor.
- Atomik canlı paket: navigator v1, Ruins v2, protocol v84, home CSS v28,
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

## N1 ölçüm ve canlı yayın hash'leri

| Ölçüm | Sonuç |
|---|---:|
| `navigator.js` | 353 satır |
| `home-protocol.js` | 4.160 satır |
| `ruins.js` | 109 satır |
| Ana sayfa script | 39 |
| Terminal komutu | 132 |
| Görünen öneri tavanı | 3 |
| Service Worker | v206 (canlı) |

- navigator: `beb796a9a834c2a8bc759339c23373dcbe6cff84e16c42eea9bf16fa22b008bc`
- protocol: `74d54db4d33eca6ea8b4870323f32e204c5c8a09bd41d6a1395171f51adc4bc8`
- Ruins: `69c8d2c04f6ed4c05c9061f61bbfbfe5290087959f9c344daf4c5e539098ea8b`
- home CSS: `16d2f0ba42a7f71dce6528051132a2fd048b48e9ec343c1ce1ecfee9ad335125`
- SW register: `156e000d9a07057b9c8b4bbcfa92e422e4bfc0a7010382d4d0e0a96ef0b660aa`

## N1 canlı kabul — 18 Temmuz 2026

- `4bf06c2` main'e gönderildi; GitHub Pages ana sayfası home CSS v28, Ruins
  v2, navigator v1, protocol v84 ve SW register v4 referanslarını doğru sırada
  yüklüyor. Canlı Service Worker `convivium-v206`.
- Navigator, protocol, Ruins, home CSS ve SW register canlı SHA-256 değerleri
  yukarıdaki yerel kabul değerleriyle birebir eşleşti. Changelog ve RSS girdisi
  canlı uçtan okundu.
- Temiz mobil Chromium oturumunda ilk `clients.claim()` sonrasında açık terminal,
  `h` girdisi ve tek ana sayfa navigasyonu korundu; istemsiz reload oluşmadı.
- Canlıda `h → Tab → help`, iki aşamalı `hepl → help`, açık ok seçimiyle
  `help oyna`, tıklamayla `cd ruins` ve bağlamsal `examine buluntu` geçti.
- Service Worker kontrolü ve v206 cache'i doğrulandıktan sonra ağ kapatıldı.
  Ana sayfa offline reload edildi; öneriler ve mobil geometri page error veya
  yatay taşma olmadan çalıştı.

## N1.1 uygulanan sonuç ve yerel kabul — 18 Temmuz 2026

- 46 satırlık hardcoded eski yardım gövdesi kaldırıldı. `help all`, 132 kanonik
  komut ve 589 etiketi doğrudan canlı `commandDefinitions` verisinden satırları
  sarmalanmış deterministik indeks olarak üretiyor; ayrıntı `man <komut>`ta.
- Protocol içindeki ikinci `editDistance`, `commandVocab` ve
  `suggestNearestCommand` uygulaması kaldırıldı. Görsel öneri, `man` düzeltmesi
  ve çalıştırma sonrası kontrollü öneri navigator'ın tek `correct()` kararını
  kullanıyor; alias typo'su kanonik sahibine dönüyor.
- `manifest`, `clues`, `unlock hidden` gibi mevcut gizli ilerleme komutları tam
  indekste ve dispatch'te korunuyor. Registry dışında kalan gizli
  `resonate/rezonans` indeks ve önerilerde görünmüyor.
- Tam eşleşen kişisel alias, uzak bir registry alias önerisiyle çakışsa bile
  Enter'da önce çalışıyor. `alias ll look → ll` Chromium kabulüyle kilitlendi.
- Navigator yokluğunda eski gövde geri gelmiyor; küçük `SINIRLI MOD` yardımı ve
  core `look` dispatch'i çalışıyor.
- Atomik canlı paket: navigator v2, protocol v85 ve `convivium-v207`. CSS,
  komut/alias snapshot'ı, backend, SQL ve diğer domain asset'leri değişmedi.
- Unit 71/71, Worker 12/12, site integrity 27 HTML / 27 CSP / 22 tam sürümlü
  harici script; smoke 11/11 ve standart Chromium 7/7 geçti. N1.1 özel Chromium
  tam indeks/typo/`man`/`which`/`find`/alias, modül-yokluğu ve offline v207
  akışlarında 3/3 geçti; page error yok.

| N1.1 ölçümü | Sonuç |
|---|---:|
| `navigator.js` | 402 satır |
| `home-protocol.js` | 4.102 satır (N1'e göre -58) |
| Terminal komutu / etiket / normalize anahtar | 132 / 589 / 545 |
| Ana sayfa script / managed asset | 39 / 27 |
| Service Worker | v207 (canlı) |

- navigator: `46f0d78c368f1594a164687ad3a5216b4959c3101a252f2b6a6dc99d69c59b6b`
- protocol: `c04b892410813b43b2923085c4ccf8feaf92909de4858e362b2d062ad3efeec2`
- Service Worker: `bec4e63ffe106cc2b354da6c0005d36d9ebbcdf477c4b76afd24ce9457345e2b`

## N1.1 canlı kabul — 18 Temmuz 2026

- `df7a609` main'e gönderildi; GitHub Pages ana sayfası navigator v2 ve protocol
  v85'i, canlı Service Worker ise aynı referanslarla `convivium-v207` paketini
  yüklüyor.
- Navigator, protocol ve Service Worker canlı SHA-256 değerleri yukarıdaki yerel
  kabul hash'leriyle birebir eşleşti. Yeni changelog ve RSS girdisi canlı uçtan
  okundu.
- Canlı Chromium'da veri tabanlı 132 komut/589 etiket indeksi, `man hepl`,
  `manifest/unlock hidden` görünürlüğü ve `alias ll look → ll` çalıştı; eski
  `thread 1:` yardım gövdesi görünmedi.
- Navigator v2 isteği engellendiğinde küçük `SINIRLI MOD` yardımı ve core `look`
  dispatch'i çalıştı; eski gövde geri dönmedi.
- Temiz mobil oturumda v207 kontrol/cache kabulünden sonra ağ kapatıldı. Offline
  reload sonrası yeni indeks ve alias typo önerisi page error olmadan çalıştı.

## Değişmezler

- Öneri sayısı en fazla 3.
- Öneride alias değil kanonik komut görünür.
- Yazarken input otomatik değiştirilmez.
- Fuzzy öneri otomatik çalıştırılmaz.
- Pipe/Outrun aktifken öneri listesi oyun kontrollerine karışmaz.
- Gizli `resonate/rezonans` öneri kaynağına girmez.
- İçerik `textContent`/DOM node yolu ile yazılır; `innerHTML` kullanılmaz.

## Rollback

1. N1.1 sorununda yalnız N1.1 değişiklik setini geri al; canlı N1 Pusula/öneri
   katmanını veya 132 komut snapshot'ını sökme.
2. Navigator v2 `helpAll/correct` ve protocol v85 bağlantısını birlikte geri
   al; iki farklı typo sahibini kısmi biçimde bırakma.
3. Navigator/protocol asset query'lerini ve Service Worker cache adını yeni bir
   ileri sürüme bump et; yayımlanmış cache sürümünü geriye düşürme.

## Yarım kalırsa kesin başlangıç noktası

N1.1 kapandı ve canlı kabul edildi. Devam ederken önce git durumunu ve bu belgeyi
kontrol et; eski yardım/typo uygulamasını geri getirme. Sıradaki navigasyon işi
N2 `look`/yerel rotadır ve ayrı atomik yayın dilimi olarak açılmalıdır. N2 canlı
kabul edilmeden N3 Atlas'a başlama.
