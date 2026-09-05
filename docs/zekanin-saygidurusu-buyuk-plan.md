# Zekânın Saygıduruşu — Kazı Evi

**Convivium İnşaat Programı**

Tarih: 2026-08-23 (son güncelleme: 2026-08-26)
Durum: **Faz -1, Faz 0, Z1, Z2, Z3, Z4.3, Z5.1 ve FİLİZ (5. boyut) TAMAMLANDI.** Kalan: Z4.1 (0212 korpusu — veri tedariki), Z4.2, Z4.4–Z4.5, Z2.3–Z2.4, Z5.2–Z5.3.
Başlangıç main: `4ad68b8` · Canlı Service Worker: `convivium-v250`

Bu belge Convivium'un bir sonraki büyük dönemini tanımlar. Fikir listesi değil,
bir eserin inşaat programıdır: her amiral gemisi adıyla anılan gerçek algoritma,
sözde-kod, veri modeli, dosya haritası, tek başına yayınlanabilir fazlar ve
ölçülebilir kabul kriteri taşır.

Referanslar (bu belge onların üstüne inşa eder ve bir kısmını **yutar**):
[Product Owner Plan](product-owner-plan.md) ·
[İleri Algoritma Önerileri](ileri-algoritma-onerileri-po.md) ·
[Site Teknik Değerlendirmesi](site-teknik-degerlendirme-2026-07-17.md) ·
[Sinyal Pusulası](terminal-navigation-handoff.md) ·
[Yenilik Kuyruğu](yenilik-kuyrugu-handoff.md) ·
[Stratejik Ekol Matrisi](stratejik-ekol-matrisi.md) ·
[/net Tasarımı](net-bulmaca-tasarim.md)

---

## 0. Nasıl üretildi

Beş bağımsız yaratıcı yönelim ayrı ayrı tasarlandı (siberpunk kültürü ve ağ
mitolojisi · oyun algoritmaları ve emergent sistemler · 21. yy generatif siber
sanat · zekânın saygıduruşu / malzeme olarak düşünme · yeni arayüz fiziği). Her
yönelim, kendisini tanımayan bir baş mühendis tarafından fizibilite ve DNA uyumu
açısından yıkılmaya çalışıldı. Sonra bağımsız bir jüri 15 amiral gemisi önerisini
altı eksende puanladı, ayrı bir tamlık eleştirmeni "ne eksik kaldı" diye sordu.

**Sonuç: 15 öneriden 5'i kaldı, 10'u elendi (§11).** Elenenlerin gerekçeleri de
kayda geçti — çünkü bir fikri neden almadığını bilmek, aldığını bilmek kadar
değerlidir.

Muhalif ve jüri turlarının taşıyıcı iddiaları bu belgeye girmeden önce depoda tek
tek ölçüldü (§2). Ölçülemeyen iddia plana girmedi.

---

## 1. Tez

Convivium'un sorunu içerik kıtlığı değil. 132 komut, 30 rota, 8 oyun, 19 kalıntı
var. Sorun şu: **hiçbir şeyin nedeni, adresi ve dayanağı yok.**

Site "arayüzler düşünme biçimini değiştiren küçük sistemlerdir" diyor ve gerçekten
çalışan zekâ barındırıyor: `ekol-aynasi.html` içinde eksen benzerliği + kritik
sapma + adaptif ayırt edici soru seçimi; [navigator.js](../assets/js/home/navigator.js)
içinde gerçek bir Levenshtein DP'si; [holo/index.html](../holo/index.html) içinde
deterministik prosedürel geometri. **Hiçbiri görünmüyor.** Daha kötüsü, Oracle'ın
sistem promptu mekanizmayı gizlemeyi açıkça emrediyor
([workers/oracle/src/index.js:62](../workers/oracle/src/index.js#L62)).

Üç açık problemin — keşif, üretim–bakım makası, paylaşılamazlık — tek bir kökü var:
**site eser değil efekt üretiyor.** Efektin adresi olmaz, kökeni olmaz, gerekçesi
olmaz.

Bu planın tezi tek cümle:

> **Zekâya saygı, sonucu süslemek değil, gerekçesini seyredilebilir kılmaktır.**

Ve imzası üç şeydir — üçü de ölçülebilir:

> **Gerekçeni seyredilebilir kılmak · senin hakkındaki ölçüyü sana yazdırmak ·
> yenilebileceğini kabul etmek.**

---

## 2. Ölçülen gerçekler

Bu bölüm planın zeminidir. Her satır depoda doğrulandı; tahmin yok.

| # | Bulgu | Kanıt | Sonuç |
|---|---|---|---|
| B1 | Oracle'a mekanizmayı gizlemesi emrediliyor | `workers/oracle/src/index.js:62` — `'Dis servis, model veya API kullandigindan bahsetme.'` | İmzanın tam tersi. Faz 0'da silinir. |
| B2 | **13 sayfa `auth-gate.js` arkasında** — Oracle ve 7 oyunun tamamı dahil | `oracle/index.html`, `tools/ekol-aynasi.html`, `tools/paradox-terminal.html`, `games/*.html` (7) | Paylaşılamazlık probleminin doğrudan kaynağı. |
| B3 | **580 commit ama yalnız 59 aktif gün** (2025-02-13 → 2026-08-18) | `git rev-list --count HEAD`; `git log --date=short --format='%ad' \| sort -u` | Era tespiti takvim gününde **kurulamaz** — gün serisi %89 sıfır. Commit indeksinde kurulur (Z1). |
| B4 | Birlikte-değişim grafının iki devasa hub'ı | `index.html` **%41,7** · `service-worker.js` **%41,6** · `home-protocol.js` %19,8 | Bunlar damar değil **taban kaya**; dürüstçe ayrı katman olarak gösterilir. |
| B5 | **Terminalde sıfır History API** | `home-protocol.js` + 23 `home/` modülü: 0 eşleşme. Tüm sitede yalnız `demir-at.js:69-70` ve `articles.js:689` | Keşfedilen hiçbir şey paylaşılamıyor, geri tuşu düşüncede çalışmıyor. `demir-at.js` deseni **zaten kanıtlanmış**; genellenecek (Z3). |
| B6 | Public proza ≈ **13.000 kelime**; `docs/` altında **36.855 kelime** yayımlanmamış | `articles.js` 3.620 · changelog 3.243 · `net.js` 2.639 · `world.js` 1.272 · `ruins.js` 358 · legal 1.853 | Sitenin en iyi yazısı gömülü. Arşiv, denetim makinesinden **önce** gelir. |
| B7 | **Dört günlük çekiliş birbirinden habersiz** | `ruins.js:69` `hashDay(dayKey) % registry.length` · `dreams.js:32,102` ayrı `seedOf`+`mulberry32` · `home-protocol.js` kart · `net.js` 10 dk kovası | Hiçbiri dünü okumuyor. Akış-ayrılmış tek PRNG kuralı bunu birleştirir (§4). |
| B8 | Workers AI modeli logprobs döndürmüyor | `wrangler.toml:12` → `@cf/meta/llama-3.1-8b-instruct-fp8`, `[ai]` binding `{response}` döner | "Belirsizlik ısı haritası" fazı ölü doğar. Plandan çıkarıldı. |
| B9 | Hiçbir CSP'de `wasm-unsafe-eval` yok; `assets/wasm/` boş | 33 HTML tarandı, 0 eşleşme; `assets/wasm/` yalnız `.gitkeep` (1 bayt) | WASM yolu kapalı. Tüm WASM vaatleri plandan çıkarıldı. |
| B10 | **23 dosyada `Math.random()`** — `crude-buster.js`'te 12 çağrı | `crude-buster.js:97,98,129,1048,1569…`; ayrıca `home-protocol.js`, `presence.js`, `outrun-86.js`, `screen-saver.js` | "Deterministik DNA" kısmen temenni. §4 kuralı bunu kapatır. **Düzeltme (2026-08-29): ilk ölçüm `head -20` ile yapıldığı için liste kırpılmıştı; gerçek sayı hep 23'tü.** |
| B11 | Gerekçe motoru **zaten yazılmış**, sadece render edilmiyor | `navigator.js:344-350` → `{value, description, reason, score}`; skor bileşenleri açık: `contextRank +220`, `CORE_PRIORITY +100`, `editDistance` cezası | "NEDEN?" tuşunun %80'i hazır. Faz 0'da bağlanır. |
| B12 | `editDistance` matris tutmuyor | `navigator.js:110-127` — rolling DP + `if (Math.abs(left.length-right.length) > 2) return 99` erken çıkışı | DP matrisi sergisi ikinci bir implementasyon ister (~150 satır). Maliyet sayıldı. |
| B13 | D5 ritüeli **7 elle dokunuş** gerektiriyor | `index.html` `?v=` · SW PRECACHE (134 öğe) · `validate-site-integrity.js` `mustPrecache` (elle pinli `?v=N`) · xRef sabitleri · `package.json check:syntax` (25 elle girdi) · `CACHE_NAME` · changelog+RSS | Uzun yol haritası = ~110 mekanik düzenleme. **Faz -1 zorunlu.** |
| B14 | `check:syntax` elle liste; `net.js` (21.7 KB) ve `routes.js` zaten düşmüş | `package.json` | Glob'a çevrilmesi 2 satır. |
| B15 | E2E kabul testi **canlı siteye** koşuyor, tek tarayıcı | `playwright.config.mjs` → `baseURL: 'https://ersinbinal.github.io'`, `projects: [chromium]` | "Üç tarayıcıda aynı hash" kabul kriteri yazılamaz. §4 Madde 5 bunu yeniden tanımlar. |
| B16 | **CI altyapısı hazır** | `flow-check.yml` her main push'unda `npm ci` + `npm run check` + smoke koşuyor | Determinizm kapısı için altyapı var; eksik olan yalnız **kural**. |
| B17 | `Math.log/exp/pow` ECMA-262'de implementation-defined | Spec | Float hash'lemek sahte güven. Determinizm sıralama + tamsayı üzerinden kurulur. |
| B18 | **`@media print` sayısı sıfır** | `assets/css/` taraması | "İz taşınmaz, yeniden türetilir" diyen sitenin hiçbir izi ekrandan çıkamıyor. |
| B19 | Site 33 HTML'e büyümüş (değerlendirmedeki 27 bayat) | `validate-site-integrity.js` → 33 HTML / 33 CSP / 22 tam sürümlü script | CSP disiplini korunmuş; §10 ölçüleri bu sayıdan başlar. |

**B3, B4 ve B6 en önemlileri.** İlk ikisi sitenin altında *gerçek* bir jeoloji
olduğunu ve onun nasıl okunması gerektiğini söylüyor. Üçüncüsü, sitenin en yoğun
düşünsel üretiminin `docs/` altında gömülü durduğunu. Bu üçü birlikte planın
omurgasını belirledi.

---

## 3. En büyük kör nokta

Tamlık eleştirisinin bulduğu şey, teknik bir eksik değil kültürel bir eksik:

> **Site Türkçe konuşuyor ama mitolojisi baştan sona Anglo-Amerikan.**

Depoda `mIRC`, çevirmeli hat, Kablonet, TurkNet, yerel demoscene'e dair **sıfır**
eşleşme var. Gibson var, Bell Labs var, warez sahnesi var. Ve en acısı:
`/ruins`'teki "1997 BBS logu" — sitenin en yerel görünen şeyi — **uydurma.**

Bu, planın kültürel merkezine yerleştirildi (Z4 · 0212).

---

## 4. Omurga: Kazı Evi

**Tek nesne İZ'dir** — bir kararın yeniden türetilebilir kaydı. **Tek yasa altı
maddedir** (ilk beşi geçmişi, altıncısı üretimi yönetir).

### Madde 1 — Yeniden türetme

Convivium hiçbir şeyi otorite olarak saklamaz. Görünen her şey ya **kazılmıştır**
(gerçek bir tortudan) ya **türetilmiştir** (bir tohumdan); ikisi de ~40 baytlık
bir adresten yeniden üretilebilir. localStorage bir önbellektir, Supabase bir
yayın kanalıdır; doğruluk kaynağı her zaman yeniden hesaplanandır.

Bu maddenin değeri şu: **D1 (determinizm) bir kısıt olmaktan çıkıp paylaşım
altyapısı olur.** Sunucusu olmayan bir site otorite saklayamaz — dolayısıyla
saklıyormuş gibi yapmamalıdır. Statik GitHub Pages'in "sır tutamama" hâli burada
zaaf değil anayasa maddesidir.

### Madde 2 — Kazı > üretim > taklit

Bir şeyi **kazabiliyorsan üretme**; üretiyorsan bir **seçiciden** geçir (çözücü
kapısı, uygunluk fonksiyonu ya da novelty eşiği); hiçbirini yapamıyorsan o şeyi
**"kuruluş miti" rozetiyle** etiketle ve dürüstçe elle yaz.

Bu madde planın en büyük çatalını çözer. "İçerik kıtlığını yeni substrat imal
ederek çöz" (gramer, MAP-Elites, sertifikalı seri) ile "zaten var olan substratı
onurlandır" (gerçek git tarihi, gerçek arşiv metni) aynı anda alınırsa site hem
uydurulmuş hem gerçek bir geçmişe sahip olur — bu doğrudan Madde 3'ün ihlalidir.
Gerilim bastırılmaz, **sıraya** çevrilir.

### Madde 3 — Mekanizma sırrı olmaz

Site **İÇERİK** hakkında sır tutabilir, **MEKANİZMA** hakkında asla. Bir bulmacanın
cevabı gizli olabilir; nasıl üretildiği, nasıl doğrulandığı ve neye göre puanlandığı
gizlenemez. "İmzalı" diyorsa doğrulanmalı; "eski" diyorsa gerçekten eski olmalı ya
da açıkça "kuruluş miti" rozeti taşımalı.

Bu ayrım, siberpunk'ın sır/asimetri talebi ile zekâ-saygıduruşunun şeffaflık
talebi arasındaki çelişkiyi kendiliğinden eler.

### Madde 4 — Makine kaybedebilir, ve öğrenmesi görünür olur

Ziyaretçiyi ölçen, tahmin eden ya da yenen her sistem **ölçüsünü yazdırmak,
gerekçesini göstermek ve yenilmeyi kabul etmek** zorundadır. Yazdırılan gerekçe
ile uygulanan karar arasındaki sapma bir tasarım tercihi değil, bir **test
hatasıdır**.

Öğrenme gerilimi de burada çözülür: **determinizm öğrenmeyi yasaklamaz, GİZLİ
öğrenmeyi yasaklar.** Öğrenme build-time'da olur, öğrenilen artefakt repoya
işlenir ve `git diff`'lenir.

### Madde 5 — Determinizm float'tan geçmez

Hash yalnız **sıralama + 1e6 ölçekli tamsayı** skorlar üzerinden alınır; ham float
asla hash'lenmez (B17). Bütçe **adımda** ölçülür, milisaniyede değil — yavaş telefon
ile hızlı masaüstü aynı sonucu bulur, yalnız bekleme süresi değişir. Kabul kriteri
"üç tarayıcıda aynı" değil, **"node birim testinde referans hash + tek Chromium
kabulü"**dür (B15).

**Çapraz kesen kural:** tüm günlük çekilişler tek bir akış-ayrılmış üreteçten gelir —
`rng(GENESIS, gün, altsistem)`. B7'deki dört habersiz çekiliş burada birleşir.

### Madde 6 — Üretim, doğrulayıcısı olan yerde serbesttir

*(2026-09-04'te eklendi. Madde 1–5 sitenin **geçmişini** yönetiyordu; bu madde
sitenin kendi **ürettiğini** yönetir.)*

Beş madde 4. boyutu kurdu: olmuş olan kazılabilir, adreslenebilir, yeniden
türetilebilir. Madde 6 **5. boyutu** kurar: olabilecek olan. Site yalnız kendi
geçmişini sergilemez, yeni malzeme de üretir — ama yasa altında.

**6/1 — Doğrulayıcısı olmayan şey üretilmez.** Üretilen her artefaktın, onu
*düşürebilecek* mekanik bir kontrolü olmak zorundadır. Kontrolü yazamıyorsan
o şeyi üretemezsin. Bir OKK-8 programı üretilebilir: çalıştırılır, bakılır.
1990'lar BBS kültürü hakkında bir paragraf üretilemez: çalıştıracak hâli yoktur.
Bu tek kural, uydurma arşivi ve halüsinasyon prozayı bir çırpıda eler — ve
Madde 2'nin "kazı > üretim > taklit" sırasını bozmadan üretime yer açar.

**6/2 — Elek reddedebilmeli, ve reddi yayınlanmalı.** Kabul oranı %100'e çıkan
elek bozulmuştur; red oranı ölçülür ve ekrana yazılır. Hiçbir şeyi elemeyen
build **düşer**, dosya yazmaz. (Tavan testinin tiyatroya dönüştüğü yerden
öğrenilen ders, bu kez baştan yasada.)

**6/3 — Üretilen şey 4. boyuta ancak diff ile geçer.** Runtime asla siteye
yazmaz. Üretim → build artefaktı → `git diff` → yayın ritüeli. **Site
önerebilir; ancak commit gerçek yapar.** Gece işi `main`'e push edemez, yalnız
PR açar.

> **Değişiklik (2026-09-05) — otomatik onay.** Ersin: *"ben her gün bunu
> onaylamakla uğraşamam."* Haklı, ve bu teknik bir mesele değil: **uygulanamaz
> bir güvenlik kontrolü, iyi tasarlanmış otomatik bir kontrolden daha
> kötüdür** — çünkü sonunda göz ardı edilir.
>
> Maddenin şartı **diff**tir, insan tıklaması değil. Diff kalıcı: her gece bir
> PR açılır, squash merge edilir, geçmişte durur, tek komutla geri alınır.
>
> Otomatik onay **ancak kapı, insanın bakacağı her şeyi kapsıyorsa** meşrudur.
> Bu iş için öyle — ve ikisi de merge'den **önce** koşar:
> - **ZAR:** yalnızca `assets/data/filiz.json` değişebilir, başka hiçbir şey
> - **TEST:** üretilen her diziyi **çalıştırarak** doğrular — bir insanın JSON
>   diff'ine bakarak yapamayacağı şey
>
> **Koşul:** izinli liste bir gün veri dışına çıkarsa otomatik onay
> kapatılmalıdır. Bu, iş akışının içine yorum olarak yazıldı ve testle kilitli.
> Elle çalıştırmada `otomatik: false` ile her zaman kapatılabilir.

**6/4 — Üreteç kendi üreticisini üretemez.** Üreteç içerik üretir; **eleğini,
anayasasını, yayın ritüelini ve kendi kaynağını asla.** Bu, döngünün kendi
kısıtlarını gevşetmesini yapısal olarak imkânsız kılar — "güvenli kendi kendine
üretim" denen şeyin tek gerçek garantisi budur. İzinli yazma alanı tek bir
dosyadır ve o liste testte kilitlidir; genişletmek bir anayasa değişikliğidir,
sessizce olmaz.

**6/5 — Üreteç zeki olabilir; elek aptal ve deterministik olmak zorundadır.**
AI (Worker sınırından ya da build-time'da) **aday üretebilir**, hiçbir zaman
*seçemez*. Zeki bir elek kandırılabilir ve sessizce kayar; aptal bir elek
kayamaz. Madde 4'ün "gizli öğrenme yasak" hükmünün üretim tarafındaki karşılığı.

**6/6 — Her üretilmiş şey soyunu taşır.** Tohum + üreteç sürümü + elek sürümü
kaydedilir; üretilen artefakt yeniden türetilebilir ve denetlenebilir
(Madde 1'in üretim tarafına uzantısı).

> **Tek cümle:** site kendi kendine üretir, ama **eli yoktur, sesi vardır.**

`Math.random()` ödül ve içerik yollarından çıkar (B10).

### Kesen ilkeler

- **Girişsiz onur hattı.** Sergi, iz, düello, kanıt sütunu, arama — hiçbiri giriş
  istemez. Giriş yalnızca kalıcılığı ve sosyal katmanı açar.
- **Her sergi tek cümlelik Türkçe kapı taşır.** "BM25", "Levin araması", "PELT"
  vitrin değil kapıdır; jargonsuz "bu ne işe yarar" satırı zorunlu kabul kriteridir.
- **Saf karar sözleşmesi.** Karar mantığı yan etkisiz bir fonksiyondur ve
  `{value}` ya da `{value, why}` döndürür. `step` ve NEDEN? tuşu bunun bedava
  sonucudur. CI, `why` üretmeyen yeni karar fonksiyonunu reddeder.

### Bina

Beş amiral gemisi bir liste değil, tek bir cümledir:

> **Convivium kendi geçmişini kazar, kazısını seyredilebilir kılar, seyrettiğini
> adreslenebilir yapar, adreslediği her şeyi gerçek bir arşive dayandırır, ve
> dayandırdığı her yerde ziyaretçiye kendisini yenme hakkı tanır.**

| Kat | Gemi | İş |
|---|---|---|
| Zemin | **Z1 TORTU** | substrat — kalıntı yazmayı bırak, kalıntı kaz |
| Makine dairesi | **Z2 İZ + `step`** | mekanizma — kazıyı ve her kararı seyredilebilir kıl |
| Taşıma | **Z3 SİGİL** | adres — her izi ~40 baytta taşınabilir yap |
| Arşiv | **Z4 ARŞİV · 0212** | dayanak — gerçek yerel korpus + çevrimdışı BM25 |
| Düello odası | **Z5 OKKAM** | sınır — makine kaybedebilir |

---

## 5. Faz -1 — Ritüel borcunu kapat ✅ TAMAMLANDI (2026-08-26)

**Bu yapılmadan hiçbir amiral gemisine başlanmaz.** Beş bağımsız eleştirinin üçü
bunu birbirinden habersiz işaretledi.

B13'e göre bir modülün sürümünü bumplamak 7 ayrı yere elle dokunmak demek. Bu
planın dilim sayısıyla çarpınca ~110 mekanik düzenleme borcu çıkıyor — ritüel
maliyeti geliştirmenin kendisini geçiyor.

**Kapsam:**
- `scripts/sync-cache-versions.js` genişletilir: `validate-site-integrity.js`
  içindeki `mustPrecache` listesini ve `?v=N` pinlerini **üretir**.
- `package.json` `check:syntax` → glob. 2 satır; düşmüş olan `net.js` ve
  `routes.js` kapıya geri girer (B14).
- `scripts/publish-slice.js`: changelog + `signals.xml` + `?v=` + `CACHE_NAME`
  tek komutta.

**Sonuç.** Üç elle liste de öldü; hiçbiri kaynakta kalmadı.

| Ölçü | Önce | Sonra |
|---|---:|---:|
| Bir dilim yayınlamak için elle dokunuş | 7 | **1** (`npm run publish:slice`) |
| `sync-cache-versions.js` kapsamı | 30 (elle liste) | **72** (HTML'den türetilir) |
| `validate-site-integrity.js` sürüm pini | 39 + 11 xRef | **0** |
| `check:syntax` kapsamı | 25 (elle) | **66** (glob, 0.6 sn) |
| Sürüm sapması yakalama | yok | `npm run check:sync` (kapı) |

Yeni dosyalar: `scripts/check-syntax.js`, `scripts/publish-slice.js`.
Yeniden yazıldı: `scripts/sync-cache-versions.js` ve
`validate-site-integrity.js`'in precache/sıra blokları.

**İlke: isimler politika, sürümler türetilir.** Hangi rotanın çevrimdışı çalışacağı
ve hangi modülün kritik olduğu insan kararıdır ve elle durur; sürüm numarası asla
elle yazılmaz.

**Kanıtlar.** `net.js` bumplandığında `--check` sapmayı yakalıyor ve senkron her iki
hedefte düzeltiyor (eski sistemde bu asset kapsam dışıydı). Kritik modül silinince,
`home-protocol.js` sonrasına taşınınca ve precache'den düşünce üç negatif test de
hata veriyor. Uçtan uca `publish:slice` denemesi yedi dokunuşun tamamını yaptı
(`ruins.js` v2→v3, SW senkron, `convivium-v250`→`v251`, changelog, RSS, check yeşil)
ve geri alındı. `npm run check`: syntax 66, unit 102/102, worker 12/12, 33 HTML/33 CSP.

---

## 6. Faz 0 — Bedava hamleler ✅ TAMAMLANDI (2026-08-26)

Sıfır yeni altyapıyla planın tezinin büyük kısmını satın alır.

| # | Hamle | Dosya | Efor |
|---|---|---|---|
| 0.1 | Gizleme emrini sil; yerine görünür motor imzası | `workers/oracle/src/index.js:62` | 20 dk |
| 0.2 | `auth-gate.js` satırını Ekol Aynası, Paradoks Terminali ve Oracle'dan kaldır | 3 HTML | 30 dk |
| 0.3 | **NEDEN? tuşu** — `navigator.suggest`'in zaten döndürdüğü `{reason, score}` render edilir; skor bileşenleri dökülür | `navigator.js` + protocol render | ~60 satır |
| 0.4 | `help` üç kapıya iner (KEŞFET / OYNA / OKU), ham liste `help --hepsi` altına | `navigator.js` | 1 akşam |
| 0.5 | `home-protocol.js` için satır tavanı testi (mevcut 4436 tavan) | `tests/unit/` | ~15 satır |

**Neden bu sıra:** 0.3 planın başlangıç noktasıdır — graf/PPR değil. Gerekçe
motorunun %80'i yazılmış (B11); imzayı bugün teslim eder.

### Sonuç

**0.1 — Mekanizma görünür.** `index.js:62` gizleme emri silindi; yerine
*"bir dil modeli olduğunu gizleme; sorulursa hangi motor üzerinde çalıştığını
söyle"* geldi. Worker yanıtı artık `model` alanı taşıyor; terminalde cevabın
altına `motor: @cf/meta/llama-3.1-8b-instruct-fp8` düşüyor, model sessizse
`motor: yerel yanit zinciri — dis model sessiz` yazıyor. `/oracle/` sayfası da
yorumu üreten motoru gösteriyor.

**0.2 — Girişsiz onur hattı.** `auth-gate.js`'e `data-auth-mode="open"` kipi
eklendi: sayfa kilitlenmez, giriş istenmez, yönlendirme yapılmaz — ama oturum
varsa kayıt (öneri, oturum izi) çalışmaya devam eder. Yani **düşünmek bedava,
kalıcılık girişe bağlı.** Ekol Aynası, Paradoks Terminali ve Oracle açık kipte.
Üçü de `ConviviumActivity`'yi `?.` ile çağırdığı için oturumsuz zarifçe düşüyor.

**0.3 — NEDEN? tuşu.** Bu, Anayasa Madde 2'nin (saf karar sözleşmesi) ilk
uygulamasıdır. `navigator.matchCommand` artık `{value, why}` döndürüyor; `why`
her etkenin skora katkısını taşıyor (komut öneki, alias, yazım mesafesi,
bulunduğun bağlam, çekirdek komut). Yeni `neden <girdi>` komutu bunu döküyor:

```
neden "hepl" -> 3 oneri:
1. help  [duzelt] toplam 729
     yazim mesafesi: 1 harf -> +420
     bulundugun baglam: sira 12 -> +209
     cekirdek komut: sira 1 -> +100
```

Skor artık dönüşte soyulmuyor — şeffaflığın göstermek istediği şey buydu.
**Kilit test:** gerekçedeki katkıların toplamı ilan edilen skora eşit olmalı;
sapma bir tasarım tercihi değil test hatasıdır (Madde 4).

**0.4 — `help` üç kapı: GEREKMEDİ.** Plan bunu düz 132'lik liste varsayımıyla
yazmıştı; o varsayım **yanlış**. N1 zaten 6 niyetli 12 satırlık Pusula'yı canlıya
almış (`navigationIntentRegistry`) ve `help all` tam indeksi altta duruyor. Üçe
indirmek bilgi kaybı olurdu. Yapılan gerçek iş: `neden` SISTEM grubuna eklenerek
keşfedilebilir kılındı.

**0.5 — Monolit tavanı.** `tests/unit/home-protocol-size.test.mjs`: tavan 4520.
Faz 0 monoliti 4436 → 4500 satır büyüttü (+64); büyüme `nedenCommand`'ın
*sunum* katmanı, karar mantığı navigator'a gitti (D3'e uygun). Tavanı yükseltmek
bilinçli bir karar ve tek satır değişikliği gerektiriyor.

**Kabul.** Yeni `npm run test:accept` — yerel sunucu + Chromium, canlıya değil
**çalışma ağacına** bakar (yani yayından önce koşar). 6/6: `neden` gerekçe
döküyor, toplam skor görünüyor, ana sayfada page error yok, üç düşünsel yüzey
girişsiz açılıyor. `npm run check`: syntax 67, unit **108/108**, worker 12/12,
33 HTML / 33 CSP.

**Yayın.** Faz -1'in ürettiği ritüelin ilk gerçek kullanımı: `npm run
publish:slice` üç değişen asset'i kendisi buldu (auth-gate v22→v23, protocol
v96→v97, navigator v2→v3), senkronladı, `convivium-v250`→`v251` yaptı, changelog
ve RSS girdisini yazdı ve check'i koştu. **Tek komut.**

---

## 7. Amiral gemileri

### Z1 — TORTU: Sitenin Kendi Jeolojisi

> Convivium kalıntı **yazmayı** bırakır, kalıntı **kazar**: 580 commit'lik gerçek
> jeoloji build-time'da eralara, damarlara ve dürüstçe ayrılmış bir taban kayaya
> iner; `kaz` uydurulmuş değil kazılmış bir karot verir.

**Jüri puanı: 61.3 — birinci.** (kimlik 10 · yenilik 9 · algoritma 9 · fizibilite 7
· zekâ imzası 8 · ömür 10)

**Neden.** Üretim–bakım makası elle yazılan registry'lerin doğrudan sonucu:
`ruins.js:12` üç kalıntıyı, `net.js` yedi cihazı, holo üç `buildX()` fonksiyonunu
elle taşıyor. Her yeni kalıntı bir insan-gün. Aynı anda `/ruins`'in en dramatik
iddiası kurmaca (§3). Oysa depoda **580 commit'lik gerçek bir sediman var ve sıfır
kullanılıyor.**

Bu, makası **kalıcı olarak ve kendini besleyerek** kapatan tek dilimdir: kurulumdan
sonra her commit otomatik olarak yeni bir tabaka bırakır. Hiçbir uygunluk fonksiyonu
yazmayı gerektirmez; altı ay sonra bakım istemez.

**Kültürel kök.** Jason Scott'ın `textfiles.com`'u ve *BBS: The Documentary* (2005) —
ağın kendi enkazını tarihsel kayıt olarak ele alma pratiği. Phrack'in numaralı,
tarihli, kredili sayı disiplini.
**Sanat kökü.** Ben Fry, *On the Origin of Species: The Preservation of Favoured
Traces* (2009) — sürüm tarihinin doğrudan eser olduğu kanonik iş. Olia Lialina &
Dragan Espenschied, *One Terabyte of Kilobyte Age* (2013–).

**Algoritma.**

```
(1) ÇIKARIM
    git log --numstat --date=iso-strict
    -> commit başına {sha7, ts, subject, coauthors, files[{path,+,-}]}
    Redaksiyon: yazar e-postası ASLA yayınlanmaz.
    Ortak-yazar atfı KORUNUR ve gösterilir — Madde 3'ün en dürüst uygulaması.

(2) ERALAR — PELT (Killick/Fearnhead/Eckley 2012)
    DİKKAT: seri takvim günü DEĞİL commit indeksi (n=580).
            Çünkü yalnız 59 aktif gün var; gün serisi %89 sıfır (B3).
    gözlem  = o commit'in dosya yolu öneki dağılımı
    maliyet = çok terimli/Poisson negatif log-olabilirlik (Gauss DEĞİL)
    F[0] = -β ;  β = 3·ln(n)
    for t in 1..n:
       F[t] = min_{s∈R} ( F[s] + C(s+1..t) + β )
       R    = budama ile güncellenir
    -> eralar 'ne zaman' değil 'neyle uğraşıyordu' ekseninde çıkar

(3) DAMARLAR — birlikte-değişim topluluk tespiti
    kenar ağırlığı = HAM SAYIM DEĞİL, Jaccard (veya PMI)
    TABAN KAYA AYIRMA (zorunlu):
       commit frekansı > %25 olan düğümler graf dışına alınır
       -> index.html (%41,7) ve service-worker.js (%41,6) ayrı katman (B4)
       Anlatı bedavaya gelir: sitenin taban kayası gerçekten bu ikisidir.
    Louvain modülerlik; kabul: Q > 0.30

(4) KAROT SÜZGECİ (zorunlu, ~120 satır)
    aday hunk havuzundan elenir:
      (a) yalnız ?v= / CACHE_NAME / sürüm numarası değişenler
      (b) < 3 semantik satır içerenler
      (c) binary yollar
    Bu süzgeç olmadan Faz 0 YAYINLANMAZ — yoksa 'gerçek arkeoloji'
    vaadi ilk kazıda çürür.
```

**Yüzey.** `kaz` (karot: bir tabakadan gerçek bir diff hunk'ı + bağlamı),
`tabaka`, `damar`, `taban`. `/ruins` uydurma kalıntıları **"kuruluş miti" rozetiyle
dondurulur** ve bir daha dördüncüsü yazılmaz.

**Dosyalar.** `scripts/build-tortu.js` · `assets/data/tortu.json` (build-time,
tembel) · `assets/js/home/tortu.js` (saf okuyucu)

**Fazlar.**
- **Z1.1 — Çıkarım + süzgeç + `kaz`.** ✅ **TAMAMLANDI (2026-08-27)**

  `scripts/build-tortu.js` 573 commit'i çıkarıyor, `assets/js/home/tortu.js` saf
  okuyucu, terminalde `kaz` ve `taban`. Veri `assets/data/tortu.json` (82 KB) —
  **tembel çekilir, precache'e girmez** (D6); modül precache'te.

  **Süzgeç ölçüldü ve gerekli çıktı:** hunk'ların **%57'si** gürültü
  (`?v=` bumpı 1054, 3 satırdan kısa 1057, binary 5 / toplam 3712 örneklemde).
  Süzgeç olmasa kazı gerçekten "sürüm bumpı arkeolojisi" olurdu — planın uyarısı
  doğrulandı.

  **Ölçümler plana uydu:** taban kaya `index.html` %43 + `service-worker.js` %42;
  573 commit / 62 aktif gün; 127 karot, 49'u ortak-yazarlı.

  **Gizlilik iki katmanlı.** Karot içeriği gerçek diff'tir ve meşru olarak e-posta
  taşıyabilir (KVKK sayfası, ortak-yazar satırı): içerik **redakte** ediliyor,
  yazım sonrası **kapı** dosyayı tarıyor ve bir adres bulursa çıktıyı siliyor.
  Kapı ilk çalıştırmada gerçekten tetiklendi ve yazımı geri aldı.

  **Kabul.** Birim 121/121 (11'i TORTU'ya ait, süzgecin negatif testi dahil);
  `npm run test:accept` 9/9 — gerçek Chromium'da `kaz` bir tabaka kazıyor ve
  kazılan katmanda `?v=` yok. Örnek çıktı:

  ```
  ] KAROT  13/127  derinlik 114 tabaka
    tarih   2026-01-17
    commit  cdbbc3f
    dosya   Bartender.html
    kayit   Update print statement from 'Hello' to 'Goodbye'
    --- kazilan katman ---
    -      stopBartender();
    ...
    bu tabaka uydurulmadi; cdbbc3f commit'inden kazildi.
  ```
- **Z1.2 — PELT eraları.** ✅ **TAMAMLANDI (2026-08-27)**

  `tabaka` komutu 8 erayı Türkçe adlarıyla listeliyor. Gözlem uzayı 8 kategori
  (kabuk · oyun · araç · gövde · altyapı · varlık · belge · test); maliyet
  **çok terimli negatif log-olabilirlik** (Gauss değil — gözlem sayım vektörü).
  `β = 0.8·K·ln(n)`, minSize 20.

  **Eksen doğrulandı:** seri commit indeksi, takvim günü değil — 574 commit ama
  62 aktif gün, gün serisinin ~%89'u sıfır olurdu ve boşluklar değişim sanılırdı.

  **Adlandırma baskın kategoriden değil, taban ortalamadan sapmadan geliyor.**
  `gövde` her yerde yüksek olduğu için baskınlık ayırt edici değil; sapma
  (lift) o dönemin gerçekten neyle uğraştığını söylüyor.

  Çıkan jeoloji gerçek bir anlatı:

  | # | Katman | Dönem | Commit | Baskın sapma |
  |---|---|---|---:|---|
  | 1 | Atölye Katmanı | 2025-02-13 → 2026-01-18 | 101 | araç %45 |
  | 2 | Oyun Katmanı | 2026-01-18 → 2026-06-01 | 105 | oyun %24 |
  | 3 | Gövde Katmanı | 2026-06-02 → 2026-06-11 | 47 | gövde %49 |
  | 4 | Atölye Katmanı II | 2026-06-11 → 2026-07-08 | 188 | araç %31 |
  | 5 | Döküm Katmanı | 2026-07-08 → 2026-07-17 | 20 | varlık |
  | 6 | Zemin Katmanı | **2026-07-17 (tek gün)** | 25 | altyapı %33 |
  | 7 | Kayıt Katmanı | 2026-07-18 → 2026-07-22 | 42 | belge %21 |
  | 8 | Döküm Katmanı II | 2026-07-22 → 2026-08-27 | 46 | varlık %30 |

  **Era 6 tek gün ve bu tarihsel olarak doğru:** 2026-07-17, üretim sertleştirme
  günü — [teknik değerlendirmenin](site-teknik-degerlendirme-2026-07-17.md)
  tarihiyle birebir. Algoritma bunu kimse söylemeden buldu.

  **Kabul.** PELT sentetik veriyle test ediliyor (gerçek tarih büyüdükçe test
  bozulmasın diye): bilinen değişim noktasını tam yakalıyor, homojen seride
  bölmüyor, deterministik, minSize'a uyuyor. Üretilen eralar sözleşme testinden
  geçiyor: adlar benzersiz ve Türkçe, aralıklar kronolojik, **eraların commit
  toplamı depo toplamına eşit**. Birim 130/130, `test:accept` 10/10.
- **Z1.3 — Damarlar + taban kaya.** ✅ **TAMAMLANDI (2026-08-28)**

  `damar` komutu 14 damarı listeliyor. **Modülerlik Q = 0.637** — hedefin
  (0.30) iki katı. Kenar ağırlığı ham sayım değil **Jaccard**; topluluk tespiti
  **Louvain**, deterministik düğüm sırasıyla (Louvain normalde rastgele sıra
  kullanır — D1 gereği kullanmıyoruz).

  **Taban kaya grafa hiç girmiyor.** Girseydi `index.html` ve
  `service-worker.js` (%43'er) bütün damarları birbirine bağlayıp yapıyı yok
  ederdi. Test bunu doğruluyor: hiçbir damar dosyası taban kayada değil.

  **Süpürme commit'leri dışlanıyor:** 20+ dosyaya dokunan commit anlamsal
  bağlılık değil toplu bakım işaretidir (sürüm bumpı, yeniden adlandırma).
  569 commit'in 255'i grafa giriyor.

  Çıkan damarlar gerçek tarihi ortaya döküyor:

  | # | Damar | Ne olduğu |
  |---|---|---|
  | 1 | Atölye damarı (18) | araç ailesi |
  | 2 | **kök dizin (18)** | `Barista.html`, `Bartender.html`, `TheOracle.html`, `Paradox_Terminal.html` — **`/tools/`'a taşınmadan önceki kök seviye dönem**; bu dosyalar artık yok |
  | 3 | Atölye damarı II (8) | bugy ailesi (css + js birlikte) |
  | 5 | Zemin damarı (5) | `home-protocol.js` + `package.json` + `sync-cache-versions.js` + `validate-site-integrity.js` |
  | 6 | Candy_Pop (5) | terk edilmiş prototip alanı |
  | 10 | godot/universe-3 (4) | **depodan tamamen kaybolmuş bir Godot denemesi** |

  **Damar 5 kendi başına bir bulgu:** graf, Faz -1'de otomatikleştirdiğim yayın
  ritüeli bağlılığını kimse söylemeden buldu. Bu dört dosya birlikte değişiyordu
  çünkü bir sürüm bumpı dördüne birden dokunmayı gerektiriyordu. Otomasyon
  sonrası bu damarın zayıflaması beklenir — ölçülebilir bir tahmin.

  **Kabul.** Louvain sentetik grafta test ediliyor: iki bağlı kümeyi zayıf bir
  kenara rağmen ayırıyor, deterministik, kenarsız grafta çökmüyor. Üretilen
  damarlar sözleşmeden geçiyor: Q > 0.30, adlar benzersiz, hiçbir damar dosyası
  taban kayada değil. Birim 137/137, `test:accept` 11/11.
- **Z1.4 — `/ruins` devri.** ✅ **TAMAMLANDI (2026-08-28)**

  Üç uydurma kalıntı **silinmedi** — sitenin kuruluş anlatısının parçası. Ama
  artık `[KURULUS MITI - bu kayit uydurmadir, kazilmadi]` rozeti taşıyorlar ve
  rozet hem `examine`'de hem `cat`'te görünüyor. Rozet **veriye değil
  görüntülemeye** eklendi; registry snapshot testi bu yüzden bozulmadan geçti.

  **Günün buluntusu artık uydurma registry'den gelmiyor.** Oda hangi karotun
  çıkacağını bilmek zorunda değil: tortu verisi tembel yükleniyor (85 KB,
  precache dışı) ve odayı boot'ta beklemek D6'yı ihlal ederdi. Oda yalnızca
  buluntunun uydurulmadığını söylüyor ve `kaz`'a yönlendiriyor — hangi
  tabakanın çıkacağını `kaz` kendi belirliyor. Bu, bir veri bağımlılığını
  tamamen ortadan kaldırdı.

  Oda tasviri artık ikisini açıkça ayırıyor: *"Üç KURMACA kalıntı var — üçü de
  kuruluş miti. Bugünün buluntusu ise uydurulmadı: deponun gerçek geçmişinden
  kazılır."*

  Bu, Madde 2'nin (**kazı > üretim > taklit**) ve Madde 3'ün (*"eski" diyorsa
  gerçekten eski olmalı ya da açıkça "kuruluş miti" rozeti taşımalı*) tam
  karşılığıdır.

  **Kabul.** Birim 140/140 (`ruins.js` testleri dahil yeşil), `test:accept`
  13/13 — gerçek Chromium'da `/ruins` kurmaca ile kazılmışı ayırıyor ve
  `examine terminal` rozeti gösteriyor.

**Risk.** Karot süzgeci zayıf kalırsa kazı "sürüm bumpı arkeolojisi"ne döner —
süzgeç pazarlıksız Faz 1 kabul kriteridir.

---

### Z2 — İZ ve `step`: Makine Odası

> Sitedeki her karar tek ve aynı iz formatını üretir; `step <komut>` bir komutu
> **icra etmez, gerekçesine çevirir.** TORTU'nun kazısı da bu formatta akar — yani
> ikinci gemi birincinin görünür yüzüdür.

**Jüri puanı: 59.2 — üçüncü.**

**Kültürel kök.** Demoscene'in kaynak-gösterme etiği: gösterinin konusu efekt
değil, efekti üreten koddur.
**Sanat kökü.** *The Critical Engineering Manifesto* (2011), madde 3: "en arzu
edilir makine, iç işleyişi teşhir edilebilir biçimde açılmış olandır." Bret Victor,
*Learnable Programming* (2012).

**İz formatı.**
```
İz   = { v:1, tür, tohum, girdi, kareler:[Kare], meta:{algo, kaynak} }
Kare = { i, op, delta, sınır?, seçilen?, why:[{etken, değer, ağırlık, katkı}] }
```

**Emitörler — v1'de yalnız üç, hepsi canlı makineye bağlı:**

1. **`tortu-pelt`** — PELT'in değişim noktası araması ve Louvain birleşmeleri kare
   kare izlenir. Z1 bedavaya sergiye döner.
2. **`nav-why`** — `navigator.suggest`'in skor bileşenleri (Faz 0.3'ün büyütülmüşü).
3. **`lev-typo`** — Levenshtein DP matrisi + geri izleme yolu.
   *Uyarı (B12):* mevcut kod rolling DP + erken çıkış; matris de parent pointer da
   yok. Sergi **ikinci bir implementasyon** ister (~150 satır). "Var olan kod
   bedava sergi olur" iddiası yanlış; maliyet sayıldı.

**`step` ilkesi.**
```
step <komut>  ->  komutu ÇALIŞTIRMAZ; karar fonksiyonunu iz modunda çağırır.
```
v1 kapsamı üç komut: `step suggest`, `step cd <yanlışyazım>`, `step kaz`.

**Fazlar.** ✅ **Z2.1–Z2.2 TAMAMLANDI (2026-08-28)** · Z2.3–Z2.4 açık

- **Z2.1 — İz formatı + `lev-typo`.** ✅ `assets/js/home/iz.js`, saf modül
  (DOM/ağ/zaman/rastgelelik yok — test kilitliyor). Levenshtein DP matrisi,
  geri izleme yolu ve hücre başına gerekçe.
- **Z2.2 — `nav-why` + `step`.** ✅ `step cd <yanlışyazım>` ve
  `step suggest <girdi>`. **`step` komutu çalıştırmaz, gerekçesini çalıştırır.**

**Planın uyarısı doğru çıktı ve maliyeti ödendi.** `navigator.js:110-127` rolling
DP kullanıyor, matris de parent pointer da tutmuyor. Sergi için ikinci bir
uygulama yazıldı (~110 satır). Bu bir risk doğuruyor: iki uygulama ayrışırsa
sergi, makinenin ne yaptığı hakkında **yalan söyler.** Bu yüzden en önemli test
çapraz doğrulama: 16 kelime çiftinde sergi ile canlı `editDistance` **aynı
mesafeyi** vermek zorunda.

**Erken çıkış gizlenmiyor, serginin konusu oluyor.** `navigator.js` uzunluk farkı
2'yi aşınca hiç hesaplamıyor (`return 99`). Sergi bunu taklit ediyor ve
söylüyor: *"BUDANDI — makine bu çifti hiç hesaplamadı."* Göstermek gizlemekten
öğretici.

**`step` yan etki üretmiyor** — bu D3'ün bedava sonucu. İki katmanda kilitli:
kaynak sözleşmesi testi (`writeAddress`/`persist`/`award`/`runCommand`
çağıramaz) ve Chromium'da adresin değişmediğinin doğrulanması.

**Açık kalanlar.** Z2.3 `tortu-pelt` emitörü ve Z2.4 `/makine/` vitrini
yapılmadı. Vitrin yeni bir HTML rota; terminal yüzeyi önce geldi çünkü değer
oradaydı.

**Kabul.** Birim 165/165 (12'si İZ). `test:accept` **24/24** — gerçek
Chromium'da matris çiziliyor, kaynak söyleniyor, budama gösteriliyor,
`step suggest` gerekçe döküyor ve **adres değişmiyor** (yan etki yok).

**Kesilenler.** `wfc-relic` (3B tile seti asset işi, kod işi değil) ve `dpll-net`
(`/net` bir CSP değil, kilit-anahtar DAG'ı — doğru hesap, yanlış problem).

---

### Z3 — SİGİL: Adres Bir Enstrümandır

> Her iz `#<TLV yükü + FNV-1a mührü>` ile adreslenir; **taşınmaz, alıcının
> cihazında yeniden türetilir.** Geri tuşu ilk kez düşüncede çalışır.

**Jüri puanı: 55.6.** Jüri bunu destek diliminden amiral gemisine terfi ettirdi —
haklı olarak: B5'e göre **terminalde sıfır History API çağrısı var**, yani
keşfedilen hiçbir şey paylaşılamıyor. Paylaşılamazlık problemi bir eksiklik değil,
mekanizmasızlık.

**Zaten kanıtlanmış desen.** `demir-at.js:69-70` durumu `#a=…&b=…&m=…` ile URL'de
tutuyor: paylaşılabilir, geri/ileri tuşu çalışıyor, backend yok. Z3 bu deseni
sitenin tamamına genelleştirir.

**Algoritma.** Kanonik serileştirme → TLV alan kodlaması → LEB128 varint →
FNV-1a 32 bit mühür → Base64url (RFC 4648 §5, padsiz), tümü `location.hash` içinde.

*Huffman v1'e girmez.* Önce p95 URL uzunluğu ölçülür; 96 karakteri gerçekten
aşıyorsa kanonik Huffman sonradan eklenir (şema sürümü ilk alan olduğu için geriye
dönük uyumlu).

**Tek codec dört yük tipi taşır:** bir tortu karotu · bir `step` izi · bir OKKAM
programı · bir `ara` sonucu.

**Görünür mühür.** 6 haneli içerik mührü + Drunken Bishop (OpenSSH'in gerçek
randomart algoritması) görsel gövdesi — elenen MÜHÜR geminin kurtarılan parçası.
Mühür `EPOCH`i görünür taşır; yoksa eski SW önbelleği taşıyan ziyaretçi farklı
mühür görür ve bu bir hata sanılır.

**Fazlar.** ✅ **TAMAMLANDI (2026-08-28)**

- **Z3.1 — TLV codec + mühür.** `assets/js/home/sigil.js`, saf modül (DOM yok,
  ağ yok, `location` yok — test bunu kilitliyor). Kanonik gövde
  `[sürüm][tag][uzunluk][girdi]` → FNV-1a 32 bit mühür → Base64url padsiz.
- **Z3.2 — Beş yük tipi + geri/ileri.** `kaz` · `tabaka` · `damar` · `taban` ·
  `neden`. Tag baytı asla yeniden kullanılmaz; eski adresler çalışmaya devam eder.
  `popstate` bağlandı: **terminalde ilk kez tarayıcı geçmişi çalışıyor.**
- **Z3.3 — Görünür mühür + randomart.** 6 haneli mühür, `I/O/0/1` içermeyen
  alfabeyle (elle kopyalanırken karışmasın). Drunken Bishop görsel parmak izi.
  *Not:* planın "ssh-keygen ile bayt bayt aynı" kriteri **düşürüldü** — o kriter
  elenen MÜHÜR gemisine aitti ve SSH anahtarı semantiği gerektiriyor; burada
  yürüyüş kendi mühür baytlarımız üzerinde.

**Ölçüm plandaki tahmini doğruladı.** Plan "önce p95 URL uzunluğu ölçülür;
96 karakteri gerçekten aşıyorsa Huffman sonradan eklenir" diyordu. Ölçüldü:
adresler **10–19 karakter**. Huffman gerekmedi ve yazılmadı.

**Kabul.** Birim 154/154 (15'i SİGİL). `test:accept` **18/18** — gerçek
Chromium'da: `kaz` adres yazıyor · paylaşılan adres temiz sayfada **aynı karotu
yeniden türetiyor** (`0c32b63 = 0c32b63`) · tek karakteri değişen adres
reddediliyor · geri tuşu önceki ize dönüyor. Ayrıca birim testte 19/19 tek
karakter kurcalaması reddedildi ve FNV-1a bilinen vektörlerle doğrulandı.

---

### Z4 — ARŞİV · 0212: Dayanak

> `/ruins`'teki uydurma 1997 BBS logu emekliye ayrılır; yerine **gerçek, kaynaklı
> bir yerel siber tarih korpusu** gelir. `ara` onu tamamen çevrimdışı BM25 ile
> indeksler ve Oracle'ın her cümlesine bir dayanak zemini kurar.

**Neden.** İki problem tek hamlede: (a) B6 — arşiv boş, 300 pasajlık bir dolabı
denetlemek denetim değil; (b) §3 — sitenin kültürel kör noktası.

**0212 korpusu.** Çevirmeli hat, mIRC ve `#turk`, Kablonet/TurkNet, yerel demoscene,
Türkçe karakterin ASCII'ye çöküşü ve geri kazanımı. **Kurgu ile belge etiketle
ayrılır** ("mit" rozeti — Madde 3). Transliterasyon/deasciifier zinciri bir algoritma
olarak sergilenir: Türkçe karakterin kaybı, dilsel bir tarih olarak.

Buna `docs/` altındaki 36.855 kelimelik teknik yazının public makaleye **yeniden
yazılmış** hâli eklenir (taşıma değil — iç handoff dili public dile çevrilir).

**Algoritma.**
```
BUILD-TIME (scripts/build-arsiv-index.js):
  pasajlar = pencerele(doc, 60 kelime, %25 örtüşme)
  Türkçe ek-kırpıcı (basit, kural tabanlı — stemmer değil)
  dedup: SimHash64(p); Hamming(a,b) < 6 -> at
  BM25 (k1=1.2, b=0.75)  ->  assets/data/arsiv-index.json (gzip, <80KB)

RUNTIME:
  final = MMR(topK(BM25(q), 40), lambda=0.7, k=6)

KANIT:
  for c in cümleler(cevap):
     best = argmax_p BM25n(c, p)
     span = SmithWaterman(tokens(c), tokens(best), +2/-1/-1)
     etiket = span.score/(2·len) > 0.45 ? 'DAYANAK VAR' : 'ARŞİVDE YOK'

MODEL YOKKEN:
  TextRank (cümle grafında PageRank, d=0.85, 30 iterasyon) + MMR
  başlık: 'MODEL YOK — bu cevap yalnızca arşivden çıkarıldı.'
```

**Neden BM25, gömü değil:** gömü "neden bu pasaj" sorusunu cevaplayamaz; BM25 terim
terim cevaplayabilir. Ayrıca 384 boyut = İngilizce `bge-small`; Türkçe `bge-m3`
(1024) bütçeyi 2.7× şişirir.

**Fazlar.**
- **Z4.1 — 0212 korpusu.** ⏸ **BAŞLAMADI — ve bilerek.** Bu bir *veri tedarik*
  işi, kod işi değil. "Gerçek, kaynaklı yerel siber tarih" kaynaksız yazılamaz;
  yazılırsa `/ruins`'in sahte BBS logunu rozetleyip yerine yenisini koymuş
  oluruz — planın kendi Madde 3'ünün ihlali. Ya gerçek araştırma + kaynak
  künyesi (`assets/img/moto/SOURCES.md` deseni) ya da yazarın kendi hafızası
  gerekiyor. **Kullanıcı kararı bekliyor.**
- **Z4.2 — Makine Notları.** ⏸ Başlamadı. `docs/` altında artık **44.142 kelime**
  var (plan 36.855 ölçmüştü). Yayımlamak "taşıma" değil yeniden yazma işi ve
  yazarın kararı.
- **Z4.3 — İndeks + `ara`.** ✅ **TAMAMLANDI (2026-08-28)**

  `scripts/build-arsiv-index.js` + `assets/js/home/arsiv.js` + `ara` komutu.
  **272 pasaj, 1.752 terim**, BM25 (k1=1.2, b=0.75) + MMR çeşitlilik.
  Tamamen tarayıcıda, tamamen çevrimdışı, sıfır Worker çağrısı.

  **Skor dökülüyor** — "neden bu pasaj" cevaplanabiliyor:
  `neden: kalint (df 9, tf 2) +4527 · hologram (df 19, tf 2) +3612`.
  Gömü bunu cevaplayamazdı; leksik omurga bu yüzden seçildi.

  **Bütçe:** 178 KB ham / **63 KB gzip** — telden geçen bu, ve eleştirinin
  tahmini ("300 pasaj için gzip'li JSON ~60KB, özel ikili format saf israf")
  birebir tuttu. Delta/varint formatı **yazılmadı.** Tembel çekiliyor,
  precache dışı, ana sayfa ilk yükü değişmedi.

  **İki içerik kararı:**
  - `/net` bulmacası indekse **hiç girmiyor.** Şifreler kaynakta zaten açık ama
    terminalden aranabilir olmak bariyeri "kaynağı oku"dan "`ara sifre` yaz"a
    indirir. Madde 3 bunu ayırır: bir bulmacanın cevabı meşru bir içerik sırrıdır.
  - Ayrıca bir **redaksiyon katmanı** var ve cevapları `net.js`'ten *otomatik*
    çıkarıyor (elle liste bulmaca değişince sessizce sızardı).

  **Bulunan sızıntı (kullanıcı kararı):** `pages/changelog.html:406` ilk şifreyi
  zaten açıktan yazıyor — *("Log: altin deger" → altin oran, 1618)*. Bu indeksin
  yarattığı bir şey değil, 2026-07-24 changelog girdisinde duruyor. İndeks
  redakte ediyor; **changelog'a dokunulmadı** çünkü o yazarın içerik kararı.

  **Kabul.** Birim 178/178 (13'ü ARŞİV). En kritik test: *build ve runtime aynı
  normalizasyonu kullanmalı* — ayrışırsa sorgu indekste hiçbir şeye denk gelmez
  ve arama sessizce boş döner. `test:accept` 29/29.
- **Z4.4 — Kanıt sütunu.** ⏸ Başlamadı. Z4.1/Z4.2 olmadan denetim, boş dolabı
  denetler.
- **Z4.5 — Offline TextRank.** ⏸ Başlamadı.

---

### Z5 — OKKAM: En Kısa Program  ✅ **Z5.1 TAMAMLANDI (2026-08-29)** · Z5.2–Z5.3 açık

> Ziyaretçi bir örüntünün kuralını kurar; makine aynı örüntüyü üreten en kısa
> programı evrensel aramayla arar; ikisi **bit cinsinden** ölçülür — ve makine
> açıkça kaybedebilir.

**Jüri puanı: 59.4 — ikinci; yenilik 10, algoritmik derinlik 10, zekâ imzası 10.**

**Kültürel kök.** Demoscene'in 64k intro kültürü (Farbrausch, *fr-08*, 2000).
**Sanat kökü.** Permacomputing ve Hundred Rabbits'in Uxn/Varvara makinesi (2021–);
Dwitter / #tweetcart: program uzunluğunun kompozisyonun malzemesi olması.

**Algoritma.** Levin (evrensel) araması + MDL (Rissanen) + prefix-free kodlama +
kanonik form ile budama.

```
DİL — OKK-8 (8 opcode, 2 kayıt, çıktı bandı):
  PUSHk(0..3) ADD SUB MUL DUP SWP OUT JNZ

LSearch(hedef):
  for faz = 1,2,3,...:                          // toplam bütçe 2^faz ADIM
    for p in kanonik_programlar(L(p) <= faz):   // dedup + ölü-önek budaması
       bütçe = 2^(faz - L(p))                   // Levin ağırlıklandırması
       if çalıştır(p, bütçe).prefix == hedef: return p
```

**Kritik dürüstlük — ve serginin konusu.** 8 opcode ≈ 3 bit; `8^8 = 16.7M` program
taranır, `8^10 = 1.07 milyar` taranamaz. **Makinenin pratik tavanı 8–9 talimat.**
İnsanın kazanması bir tasarım jesti değil, varsayılan sonuçtur. Bu kusur saklanmaz,
ekrana yazılır:

> *"Bu makine 9 talimattan uzun programı arayamaz — arama uzayı her talimatta 8
> katına çıkıyor. Seni yenemiyorsa bu yüzden."*

Böylece kalibrasyon sorunu hesaplanabilirlik temasına dönüşür ve ölü Paradoks
Terminali'nin yerini gerçekten çalışan bir sergi alır.

**Sıra uyarısı.** OKKAM **en sona** konur: oynanabilir bir zorluk bandının varlığı
ölçülmeden ona tek satır arayüz yazılmamalı.

---

#### Ne yapıldı (2026-08-29)

- **Z5.1 — OKK-8 + Levin araması.** ✅ `assets/js/home/okkam.js` (saf modül,
  ~280 satır) + terminalde `okkam`, `okkam dil`, `okkam calistir <program>`.

  **Dil planda yazılandan farklı çıktı ve bu bilinçli.** Plan `PUSHk(0..3) ADD
  SUB MUL DUP SWP OUT JNZ` diyordu; `PUSHk` operand taşıyor ve arama uzayını
  `K^n` olmaktan çıkarıyordu — Levin ağırlıklandırması tam da o varsayıma
  dayanıyor. Operandsız sekizli kullanıldı:
  `INC DEC SWP ADD MUL OUT JNZ CLR`, iki kayıt (A, B), bir çıktı bandı.

  Arama gerçekten çalışıyor:
  `[1,2,3,4] → INC OUT JNZ` (3 talimat / 9 bit) · `[2,4,6,8] → INC INC OUT JNZ`
  · `[0,0,0] → OUT OUT OUT` · `[-1,-2,-3] → DEC OUT JNZ`

  **Yayından sonra gerçek bir yalan bulundu ve kapatıldı.** `okkam dil` ekranı
  `INC SWP ADD OUT INC JNZ → 1, 4, 9, 16, ...` yazıyordu. O program
  `1, 4, 9, 17, 30, 51` üretiyor: ilk üç terim kareler, sonrası değil. Örnek
  çıktılar elle yazılmıştı — makine üretmediği bir çıktıyı ilan ediyordu, tam
  da anayasanın yasakladığı şey. Tek satırı düzeltmek yetmezdi; **örnek
  çıktılar artık ekran basılırken çalıştırılarak türetiliyor**, yani yapı
  gereği yalan söylenemiyor (Madde 1: iz taşınmaz, yeniden türetilir).

  Ve yakın-isabet silinmedi, serginin konusu yapıldı: kısa ve YANLIŞ bir kural,
  uzun ve doğru olandan önce bulunur — kısa-program tümevarımının zor olmasının
  sebebi tam olarak budur. Bunu bir kapı da koruyor: `okkam dil`'deki her örnek
  satırı testte gerçekten çalıştırılıp karşılaştırılıyor; yalan geri konularak
  kapının kapandığı **kanıtlandı** (19/20 → düşüyor).

  **Sıra uyarısının istediği ölçüm yapıldı** — arayüzden önce zorluk bandı:
  3 talimat 16 ms, 6 talimat 5,5 s, 7 talimat 17 s. Oynanabilir bant 3–5 talimat;
  planın öngördüğü 8–9 talimatlık tavan JS'te gerçekçi değil, gerçek tavan daha
  alçak. Bu düzeltme sergiyi bozmuyor, konusunu güçlendiriyor.

  **Planda olmayan bir tasarım açığı bulundu ve kapatıldı.** Aramanın yalnız faz
  sınırı vardı, *iş* sınırı yoktu: ziyaretçi `okkam 7 13 2` yazıp terminali
  dondurabilirdi. Zorunlu `maxTried` bütçesi (3M deneme) eklendi. İlk build
  denemem tam bu yüzden 120 saniyede bitmedi — açık teoride değil, ölçümde çıktı.

  **Bütçe bitişi ile "üretilemez" ayrı raporlanıyor.** İkisi aynı şey değil;
  birini diğerinin yerine yazmak makinenin sınırını dizinin özelliği gibi
  göstermek olurdu (Madde 3).

  **Zorluk elle yazılmıyor, ölçülüyor.** `scripts/build-okkam.js` her adayı
  gerçekten arıyor: 12 adaydan 7'si havuza girdi (hepsi ≤330 ms), 5'i
  *"arama bütçesi bitti — program muhtemelen 5+ talimat"* diye elendi. Build,
  motoru runtime modülünden yüklüyor; ölçülen zorluk ile görülen zorluk aynı.

  **Kusur gizlenmiyor, sergileniyor.** Makine pes ettiğinde:
  *"Bu makine 9 talimattan uzun programı arayamaz — arama uzayı her talimatta
  8 katına çıkıyor. Sen daha kısasını bulabilirsen makine kaybetmiş olur."*

- **Z5.2 — Düello arayüzü (op kartları, `/okkam/` rotası).** ⏸ Başlamadı.
  Terminal yüzeyi önce geldi; yeni bir HTML rotası sahibi yokken açılmadı.
- **Z5.3 — Arama izinin Z2 formatında yayını.** ⏸ Başlamadı (Z2.3 ile birlikte).

**Kabul.** Birim 199/199 — 20'si OKKAM: makine, adım bütçesi, taşma, determinizm,
MDL, sınır ilanı, havuz sözleşmesi (her bulmaca ≤900 ms), modül saflığı.
Kabul testi 32/32 (üçü OKKAM: çözüm, sınır ilanı, dil).

**Bu dilim tavan kapısını ilk kez tetikledi.** Protokol 4849 → 4898; gerekçe
`tests/unit/home-protocol-size.test.mjs` içindeki cırcır kaydına yazıldı.

**Kesilenler.** WASM çekirdeği (B9). "Üretim döngüsü" fazı: `p* → base32 → holo
parametresi` zinciri 30 bitlik bir sayıyı tohum geçirmekten ibaret; `mulberry32`
bunu zaten bedava veriyor.

---

### FİLİZ — 5. Boyut: sitenin atölyesi  ✅ **TAMAMLANDI (2026-09-04)**

> **Sade anlatım:** [`docs/filiz-nedir.md`](filiz-nedir.md) — jargonsuz özet,
> maliyet cevabı ve "bir şey ters giderse" bölümü orada.

> TORTU geçmişi **kazar**. FİLİZ yeni olanı **üretir**. Site kendi bulmacalarını
> yapar, çoğunu kendi eler, kalanını `main`'e değil bir **PR**'a bırakır.

**Kavram.** Madde 1–5 sitenin *olmuş olanını* yönetiyordu — 4. boyut. FİLİZ
*olabilecek olanı* açar: kısa programların uzayı. Üretilen aday orada durur;
elekten geçen bir commit ile 4. boyuta iner. **Git, iki boyut arasındaki zardır.**

**Üç organ.**

| Organ | Dosya | İş |
|---|---|---|
| **ÜRETEÇ** | `scripts/build-filiz.js` | Bütün kısa programları tarar, ne ürettiklerine bakar |
| **ELEK** | aynı dosya, ayrı aşama | Mekanik eler; **reddedebilmek zorunda** |
| **ZAR** | `scripts/filiz-zar.js` | İzinli yazma alanını zorlar; dışına çıkılırsa iş düşer |

**Ölçülen ilk gece.**

```
ÜRETEÇ  1.435.945 program tarandı (uzunluk ≤ 7) → 2.414 farklı dizi
ELEK    790 geçti, 1624 elendi (%67 red)
        1431  MDL kazancı yok
        161   sayılar okunamayacak kadar büyük
        30    sabit dizi — örüntü yok
RAFLAR  çözülen 12 · açık 67 · bütçe yetmedi 711
```

**İki raf, ve asıl fikir ikincisinde.**
- **ÇÖZÜLEN** — OKKAM ziyaretçi bütçesiyle buluyor. Oynanabilir bulmaca.
- **AÇIK** — FİLİZ programı **biliyor** (kendisi üretti), OKKAM **bulamıyor.**
  Site kendi çözemediği soruyu soruyor ve bunu ilan ediyor. Cevap saklı
  (içerik sırrı serbest), ama **uzunluğu yazılı** ve **mührü var**: `filiz coz
  <program>` cevabı doğrular. Madde 4'ün "makine kaybedebilir"i burada
  soyut değil, mekanik.

**Terminal yüzeyi.** `filiz` · `filiz acik` · `filiz coz <program>` · `filiz nasil`

**Gece işi.** `.github/workflows/filiz-gece.yml`, her gece 02:17 UTC. Üretir,
eler, ZAR'dan geçer, testleri koşar, **PR açar**. `main`'e push eden tek satır
yok ve bu testle kilitli.

**Madde 6 burada mekanik hâle geldi — ve her kapı kanıtlandı:**

| Kural | Mekanizma | Kanıt |
|---|---|---|
| 6/1 doğrulayıcısız üretim yok | üretilen şey programdır, çalıştırılır | test: her `cozulen` girdisi gerçekten koşulup dizisiyle karşılaştırılıyor |
| 6/2 elek reddedebilmeli | red oranı ölçülür, yayınlanır | red 0 ise build **düşer**; testte red oranı >%20 aranıyor |
| 6/3 4. boyuta diff ile geçilir | gece işi yalnız PR açar | test: workflow'da `git push` **yok**, `add-paths` tek dosya |
| 6/4 üreteç üreticisini üretemez | ZAR izinli liste | izole depoda denendi: eleğe dokununca **kapandı** (çıkış 1) |
| 6/5 elek aptal ve deterministik | elek saf JS, AI yok | modül saflık testi: DOM/ağ/zaman/rastgelelik yok |
| 6/6 soy taşınır | tohum + FNV-1a mühür | `filiz coz` mührü doğruluyor |

**Dürüstlük düzeltmesi (aynı gün).** İlk sürüm ekranda "1624 elendi" yazıp
altında 40 sayan bir tablo gösteriyordu — dosyaya red örneklerinin yalnız 40'ı
yazıldığı için. Ekranda yalan olurdu. Tam döküm ayrı alana (`elek.sayim`)
taşındı; kırpılmış örnek listesi ayrı durur.

**Bilerek yapılmayan.** Prozа, tarih, arşiv metni, kişi/kurum adı üretimi.
Doğrulayıcısı yok → Madde 6/1 gereği yasak. Z4.1 (0212 korpusu) hâlâ **veri
tedariki** bekliyor; uydurulamaz.

**İlk gecede iki gerçek kusur çıktı ve kapatıldı (2026-09-05).**

1. **Üretim aslında "yeni" bir şey üretmiyordu.** Sayım tamamen deterministikti
   ve değişen hiçbir şeye bağlı değildi — ilk koşu her şeyi üretti, sonraki
   geceler aynı şeyi üretecekti. Farklı çıkan tek şey zamanlama gürültüsüydü,
   çünkü **bütçe milisaniye cinsindendi: Madde 5'in doğrudan ihlali.**
   Bütçe **aday sayısına** çevrildi ve sınıflandırma **kaldığı yerden devam
   ediyor**: 790 adaylık bir birikim var, her gece bir dilimi işleniyor
   (0→150→300…). Yeni iş yoksa dosyaya dokunulmuyor, yani boş PR açılmıyor.

2. **Gece commit'leri kazıyı kirletecekti.** TORTU git geçmişini kazıyor;
   günde bir bot commit'i birkaç ay içinde bütün tabakaları doldurup insan
   emeğini görünmez kılardı. `build-tortu.js` artık `--invert-grep` ile bu
   commit'leri **kazıya almıyor.**

**İlk çalıştırmada ne oldu.** İki koşu da düştü — ama **10 adımın 9'u geçti.**
Üreteç, filtre, kapı, testler, özet: hepsi çalıştı. Sadece PR açma adımı,
GitHub'ın *"Allow GitHub Actions to create and approve pull requests"* ayarı
kapalı olduğu için düştü. Dal (`filiz/gece-uretimi`) yine de itilmişti ve
içinde tek dosya değişikliği vardı — yani **güvenlik zinciri baştan sona
çalıştı**, yalnız son kozmetik adım eksik kaldı.

**Kabul.** Birim 227/227 (28'i FİLİZ) · kabul testi 41/41 (5'i FİLİZ).

---

### DİL TEMİZLİĞİ — terminal kendi kelimelerini uydurmayı bıraktı  ✅ **2026-09-05**

**Tetikleyen.** Ersin: *"terminalin gelişimini takip edemiyorum artık… terminalde
kullanılan jargon ve anlatım dili artık bana biraz yabancı geliyor. bu benim
anlayışsızlığım mı yoksa gerçekten her şey birbirine mi girdi?"*

**Ölçüm cevabı verdi: onun anlayışsızlığı değildi.**

| Bulgu | Sayı |
|---|---|
| **9 günde eklenen yeni sergi** | **6** (TORTU, SİGİL, İZ, ARŞİV — üçü aynı gün — OKKAM, FİLİZ) |
| Yazılabilir toplam | 429 (112 komut + 317 takma ad) |
| `help` çıktısı | 5 satır |
| Navigatörde görünen komut | 35 → **%76'sı görünmüyor** |
| Ayrı yardım yüzeyi | 7 (`help`, `kilavuz`, `man`, `basla`, `tour`, `next`, `neden`) |

**Ve bu planın kendi kuralı çiğnenmişti.** §9: *"Faz bütçesi kuralı. Aynı anda
birden fazla amiral gemisi açılmaz."* Dokuz günde beş amiral gemisi + FİLİZ
açıldı. Kuralı yazan da çiğneyen de aynı taraf.

**Karar (Ersin).** *"kendi uydurduğumuz sözcükleri evrensel karşılıklarıyla
değiştirelim… evrensel yazılım İngilizcesi olsun."*

**Uygulama — iki kategori.**

*İç jargon değiştirildi.* Bir kavramın gerçek dünyada adı varsa yeni ad uydurulmaz:

| Uydurma | Gerçek terim | Kaynak |
|---|---|---|
| KAROT | **COMMIT** | git |
| TABAN KAYA | **CORE FILES** / root commit | git |
| DAMAR | **CLUSTER** | community detection |
| TABAKA / era | **EPOCH** | changepoint detection |
| MÜHÜR | **CHECKSUM** | hashing |
| ELEK | **FILTER** | yazılım |
| ZAR | **GATE** | CI/CD |
| ÜRETEÇ | **GENERATOR** | yazılım |
| RAF | **BUCKET** | yazılım |
| KALINTI | **ARTIFACT** | build sistemleri |

*Sergi adları korundu* (TORTU, OKKAM, FİLİZ, SİGİL, ARŞİV, İZ) ama artık her biri
başlığında **İngilizce karşılığını** basıyor: *"(yazılım dilinde: fuzzing + filter
+ CI gate — whatis fuzz)"*.

**Yeni: sözlük — ve iki gerçek unix komutu.**
`assets/js/home/glossary.js`, 27 terim. `whatis <terim>` ve `apropos <kelime>`
uydurulmadı; ikisi de gerçek unix komutu ve burada aynı işi yapıyorlar. Her
kayıt **kaynağını** söylüyor, böylece *"bu bize mi özgü?"* sorusu cevaplanıyor:
`cluster → graf teorisi` · `gate → CI/CD` · `TORTU → bu siteye özel ad`.

**Dil bir testle kilitlendi.** `tests/unit/home-glossary.test.mjs`: uydurma
terimler kullanıcıya **basılan** metne geri sızarsa test düşer (yorum
satırlarında serbest — orada tarihi anlatıyoruz).

**Bonus: gerçek bir çakışma yakalandı.** `apropos` için düşünülen `ara terim`
takma adı, arşiv aramasının `ara ` önekiyle çarpışıyordu — komut-uzayı testi
bunu yakaladı, `terim ara` oldu.

**Kabul.** Birim 227/227 (10'u sözlük).

---

### VİZ — makineyi düşünürken göster  ✅ **TAMAMLANDI (2026-09-05)**

**Tetikleyen.** Ersin: *"sitedeki görsel animasyonları nasıl daha artırabiliriz?
bahsettiğim her şey yalnızca metinlerden ve stillerden ibaret olmasın."*

**Ölçüm, sorunun yerini tam gösterdi.**

| | |
|---|---|
| Site geneli `@keyframes` | 120 |
| Site geneli `transform` | 343 |
| Canvas kullanan dosya | 9 |
| **Altı serginin görseli** | **0 canvas · 0 rAF · 0 SVG** |

Yani site görsel olarak fakir değildi — ama **en ilginç şeylerini metin olarak
anlatıyordu.** Makine Louvain kümesi buluyor, PELT ile dönem sınırı tespit ediyor,
Levin araması koşturuyor, Levenshtein matrisi dolduruyor; hepsini ASCII tablo
olarak basıyordu.

**Karar: dekorasyon eklenmedi, zaten hesaplanan şey görünür kılındı.** Madde 3
"mekanizma sırrı olmaz" diyor — makineyi düşünürken izlemek bu sitenin tezinin
kendisi. Animasyon burada süs değil, **argüman.**

**Altı sahne** (`assets/js/home/viz.js`, ~530 satır):

| Komut | Sahne | Ne gösteriyor |
|---|---|---|
| `kaz` | **strata** | Kazı kesiti — katman kalınlığı gerçek commit yoğunluğu |
| `tabaka` | **epochs** | PELT taraması; sınırlar yerine oturuyor |
| `damar` | **clusters** | Louvain kuvvet yerleşimi; Q = 0.637 görünür oluyor |
| `okkam` | **levin** | Arama uzayı kısadan uzuna taranıyor, biri tutuyor |
| `step` | **levenshtein** | DP tablosu doluyor, sonra geri iz yanıyor |
| `iz` · `sigil` | **bishop** | Mühür bir yürüyüşün izi olarak doğuyor |

**Mimari — üç kısıt tasarımı belirledi.**

1. **Metin çıktısı hiç değişmedi.** 279 test mevcut metni kilitliyor ve bu doğru:
   metin kanonik sürüm, ekran okuyucunun ve `curl`ün gördüğü şey o. Transcript
   düz `textContent` olduğu için canvas onun **içine giremez** — görsel katman
   dışarıda, çıktının hemen üstünde yaşıyor.
2. **Protokol yükü 15 satır.** Altı sahnenin çizimi de, hangi komutun hangi
   sahneyi açtığı da modülde. Bunu bir test kilitliyor: protokolde `viz` geçen
   satır sayısı ≤ 22.
3. **Çizilen şey uydurulmuyor.** Her sahne `tortu.json`un kendi kümelerinden,
   kendi dönemlerinden besleniyor. `Math.random` yok — aynı veri aynı resmi verir.

**Fail-closed davranış.** Veri henüz gelmemişse görsel **hiç açılmıyor** (boş
canvas metinden kötüdür); kısa aralıkla 12 kez tekrar deniyor, gelmezse metin
tek başına yeterli. `prefers-reduced-motion` açıkken tek kare çiziliyor:
hareket gidiyor, **bilgi gitmiyor.**

**İki görsel hata bulundu ve düzeltildi — ikisi de ekrana bakarak.**
- Kümelerin kenar kuralı `(i*31 + j*17) % 2` idi; 31 ve 17 tek sayı olduğu için
  bu `(i+j)` paritesine eşitti ve **her kümeyi iki kopuk yarıya bölüyordu.**
  Zincir bağlantı denendi — bağlıydı ama gevşekti, kümeler birbirinin içine
  geçti. Küme içi **tam bağlantı** hem doğru (Louvain topluluğu = yoğun bağlı
  bölge) hem de ekranda sıkışık kümeler veriyor.
- Dönem yoğunluk çubukları `(i*37)%12` ile düzenli bir testere üretiyordu ve
  ekranda ok ucu gibi okunuyordu; karışık bir hash gerçek yoğunluk görünümü verdi.

**Kabul.** Birim 254/254 (16'sı viz) · kabul testi 41/41.

---

## 8. Destek dilimleri

Tamlık eleştirisinin "eklenmezse plan eksik kalır" dediği altı dilim. Her biri
birden fazla boşluğu birden kapatıyor.

| Kod | Ad | Tek cümle | Algoritma | Kapattığı boşluk |
|---|---|---|---|---|
| **D1** | **TELSİZ** | Sitenin mührü **sesle** taşınır: hoparlörden çalınan FSK modemi ikinci bir cihaz mikrofonla çözer; ekranda gerçek bir şelale spektrogram akar | Bell 202 tarzı FSK (1200/2200 Hz) + **Goertzel** filtre bankası + Hann pencereli **STFT** + CRC-16 çerçeveleme; tümü WebAudio | ses/sonifikasyon · pirate radio · sinyal işleme/FFT · **iki cihaz arası ağsız kanal** · çevirmeli hat hafızası |
| **D2** | **FÜNYE** | ÇÜRÜME yalnız bozar; FÜNYE **onarır**: bozuk bir bağlantı reddedilmek yerine tamir edilir, restorasyon bir ziyaretçi eylemi olur | **Reed-Solomon** GF(256) + Berlekamp-Massey; kolektif sürüm için **LT/fountain** kodu + robust soliton | hata düzeltme kodları · yanılgı-onarım · **katılımcı eser** · aşınmanın kaderciliğine karşı ağırlık |
| **D3** | **DİLBİLGİSİ** | Terminal kendi gramerini sergiler: `grammar` 132 komutluk dili resmî gramer olarak basar, yazdığın satırın türetme ağacını çizer | **Earley** ayrıştırıcı (kısmi ayrıştırma + hata kurtarma + tamamlama kümesi doğal gelir); gramer `commandDefinitions`'tan **üretilir** | otomat/ayrıştırıcı teorisi · keşif problemine `help`'ten dürüst çözüm · Makine Odası'nın en büyük ironisi: komutu okuyan makine sergilenmiyordu |
| **D4** | **GÖLGE** | "Tarayıcın şu an herkese ne sızdırıyor" bit cinsinden ölçülür ve bir veri-portresine dönüşür; **hiçbir şey sunucuya gitmez** | Build-time ampirik dağılım tablosu üzerinden **Shannon öz-bilgi** + k-anonimlik tahmini + hash'ten deterministik portre | gözetim/karşı-gözetim · veri emeği · veri-portresi · bilgi teorisi · **zekânın bedeli** |
| **D5** | **KÂĞIT** | Eser ekrandan çıkar: her iz, mühür ve kalıntı için gerçek baskı katmanı ve plotter çıktısı; ekran okuyucu sürümü ile baskı sürümü **eserin iki kanonik bedeni** | `@media print` + SVG kalem yolu optimizasyonu (**en-yakın-komşu turu + 2-opt**), ölçülebilir kazanç raporu ("kalem kaldırma 412mm → 98mm") | print/plotter (B18: sıfır) · maddi çıktı · optimizasyon/hesaplamalı geometri · erişilebilirlik-eser |
| **D6** | **NOSCRIPT** | Build-time üretilen statik gövde; `curl`/`w3m` okunuşu ve paylaşım önizlemesi gerçek olur | — | en yüksek fayda/satır oranı; Z3'ün ürettiği adreslerin önizlemesi |

---

## 9. Yol haritası

| Dönem | Hedef | İçerik | Bitti |
|---|---|---|---|
| **Ö** | Borç kapama | Faz -1 | Sürüm bumpı tek komut; `net.js` kapıda |
| **A** | İmzayı bugün teslim et | Faz 0 (0.1–0.5) | Oracle motorunu söylüyor; üç yüzey girişsiz; her öneri gerekçeli |
| **B** | Kaz ve adresle | **Z1.1–Z1.4 + Z3.1** *birlikte* | Kazılan ilk karotun **ilk günden adresi var** |
| **C** | Mekanizmayı aç | Z2.1–Z2.4, Z3.2–Z3.3 | `/makine` üç sergiyle canlı; `step` üç komutta |
| **D** | Dayanak kur | Z4.1–Z4.5, D6 | 0212 canlı; `ara` offline; Oracle kanıt sütunlu |
| **E** | Taşı ve onar | D1 TELSİZ, D2 FÜNYE, D5 KÂĞIT | İz üç bedende: ekran, ses, kâğıt — ve onarılabilir |
| **F** | Sınırı ilan et | Z5.1–Z5.3, D3, D4 | Paradoks Terminali yerini aldı; makine kendi tavanını yazıyor |

**Faz bütçesi kuralı.** Aynı anda **birden fazla amiral gemisi açılmaz.** Tek
istisna B dönemi: Z1 ve Z3.1 birlikte gider, çünkü adresi olmayan bir karot
paylaşılamaz ve paylaşılamayan kazı yarım kalır.

---

## 10. Ölçüler

| Ölçü | Bugün | Yön |
|---|---:|---|
| Bir dilim yayınlamak için elle dokunuş | ~~7~~ → **1** | ✅ Faz -1 |
| Ana sayfa script etiketi | **46** | sabit veya ↓ |
| Service Worker precache öğesi | ~~134~~ → **132** (5102 → 3864 KB) | ↓ |
| `home-protocol.js` satırı | ~~4436~~ → **4897** | tavan 4898, cırcır kaydı zorunlu |
| İndekslenebilir public proza (kelime) | **~13.000** | ↑↑ |
| `auth-gate.js` kullanan sayfa | **13** | → 10 |
| `Math.random()` içeren dosya | **23** | ↓ (ödül/içerik yollarından 0) |
| Sözdizimi kapısındaki JS dosyası | ~~25~~ → **79** | ✅ Faz -1 (dosya sistemi taraması) |
| `auth-gate.js` kullanan sayfa | 13 (~~13 kilitli~~ → **10 kilitli + 3 açık**) | ✅ Faz 0 |
| Gerekçe (`why`) üreten karar fonksiyonu | ~~0~~ → **navigator.suggest** | ✅ Faz 0 |
| Birim test | ~~102~~ → **254** | ✅ (kabul testi ayrıca 41) |
| Elle yazılmış kalıntı | ruins 3 (**rozetli donduruldu**) · kazılan 127 | ✅ Z1.4 |
| Terminalde History API çağrısı | ~~0~~ → **pushState + popstate** | ✅ Z3 |
| `@media print` | **0** | ↑ |
| Elle yazılmış kalıntı/cihaz/oda | ruins 3 · net 7 · holo 3 | dondurulur, artmaz |
| Gerekçe (`why`) üreten karar fonksiyonu | ölçülmedi | CI kapısı |

---

## 11. Elenenler ve gerekçeleri

Bu tablo gelecekteki kararlar için kurumsal hafızadır.

| Öneri | Jüri | Neden elendi | Kurtarılan parça |
|---|---:|---|---|
| **SAAT** — genesis'ten replay dünya | 56.7 | **TORTU ile aynı anlatı yuvası için yarışıyor ve dürüstlükte kaybediyor:** uydurulmuş 2000 günlük genesis tarihi, tam da TORTU'nun öldürdüğü "sahte-eski"dir | Akış-ayrılmış PRNG **çapraz kesen kural** oldu (§4); 6 haneli mühür SİGİL'in içine girdi |
| **KONSERVASYON** — aşınma/restorasyon | 59.1 | Substratı OPUS koleksiyonu; OPUS alınmadan yaşayamaz | **Ertelendi, öldürülmedi.** Tortu tabakaları üzerine kurulursa (aşınmış gerçek hunk'ı restore etme) ikinci dönemin ilk adayı |
| **OPUS** — sertifikalı koleksiyon | 54.6 | Tek başına bir kurum katmanı (sürüm dondurma, sertifika, nadirlik, k-DPP) kuruyor ve kalıcı ölü kod borcu satın alıyor; ECDSA boş bir tehdit modeline karşı | Kanal-izole sayaç-tabanlı PRNG kuralı |
| **TEZGÂH** — MAP-Elites dökümhanesi | 50.0 | Kullanıcının gerçek şikâyetini ("yaratıcılığım tükendi") **daha zor** bir yaratıcılık türüne — uygunluk fonksiyonu tasarımına — çeviriyor | **"Filtresiz hiçbir prosedürel çıktı yayınlanmaz"** kuralı (Madde 2) |
| **SUFLÖR** — drama manager | 53.0 | HMM yığını **doğrulanamaz**: matrisleri ve test dizilerini aynı kişi yazıyor. Medyan oturum uzunluğu ölçülmeden yakınsayacağı bile bilinmiyor | `neden`/`model` ilkesi İZ'in parçası olarak zaten girdi — 700 satırlık motor gerekmeden |
| **MÜHÜR** — şifreli yurttaşlık | 49.7 | Faz 2 kendi anayasasını ilk günde çiğniyor (odalar zaten açık URL, kripto kilit tiyatro); Faz 3 nüfusu ~1 olan evrende ölü yönetişim | Drunken Bishop sigili SİGİL'in görsel gövdesi oldu |
| **PARTİTÜR** — salonun sesi | 49.1 | Teknik olarak en güvenli ama ziyaretçi etkisi en düşük: ses varsayılan kapalı | Ses hattı **D1 TELSİZ** olarak çok daha güçlü döndü |
| **ÇÜRÜME** — zaman bir boyut | 45.3 | **Mekaniğin yönü ters:** keşfedilmemiş olanı okunaksızlaştırarak teşvik edilen davranışı cezalandırıyor; defter cihaz-yerel olduğu için "herkes aynısını görür" sözleşmesini kırıyor | "Erişilebilirlik ağacı kanonik sürümdür" bir **CI kapısı** olarak; onarım tarafı **D2 FÜNYE** oldu |
| **KARANLIK HAT** — ölü nokta | 41.8 | Faz 2, yazarın okuyamadığı ve Merkle ile silinemez kıldığı anonim içeriği kendi alan adı altında barındırmak demek — **kaldırma talebine uymayı tasarım gereği engelliyor** | Tek yönlü yayın motifi **D1 TELSİZ**'e taşındı |
| **PANE** — pencere yöneticisi | 40.5 | Gerekçesi yanlış: döşemeli WM keşif problemini çözmez, **beceri tabanını yükseltir**; faydanın tamamı masaüstü-klavye kullanıcısına ait | Satır modeli (halka tampon + tek `write()` API'si) bağımsız teknik borç ödemesi olarak, İZ oynatıcısı ihtiyaç duyunca |

---

## 12. Hâlâ eksik kalan damarlar

Dürüstlük gereği: tamlık eleştirisinin bulduğu ve bu planın **kapatmadığı**
boşluklar. Bir sonraki dönemin ham maddesi.

- **Bedensellik / protez.** Plan baştan sona bedensiz: saf zihin, saf hesap.
  Beden-makine sınırı (tuş vuruşu ritmi, yorgunluk, arayüzün protez oluşu) yok.
- **Korporat distopya / antagonist.** Convivium çatışmasız bir kurum; siberpunk
  çatışmasız olamaz. Kuşatma, EULA edebiyatı, kıtlık — hiçbiri yok.
- **Kolektif zekâ.** Stigmerji, sürü, jüri teoremi: sıfır. D2 FÜNYE'nin fountain
  kodu ilk kıvılcım ama "birlikte düşünme" hâlâ yok.
- **Hayvan / doğal zekâ.** Physarum yol bulma, arı dansı, mantar ağı — planın kör
  noktası. İnsan-dışı zekâ hiç yok.
- **Çocuk zekâsı / amaçsız oyun.** Site öğretici değil **sınayıcı**: OKKAM düello,
  `/net` bulmaca, Ekol Aynası test. Kum havuzu, sonuçsuz kurcalama yok.
- **Makine-insan ortak yazarlığı.** OKKAM'da insan makineyi **yener** (rekabet),
  Z4'te **denetler** (şüphe). Birlikte, tek başına yapılamayanı yapan hat yok.
- **Ölüm / dijital miras.** Bitmeyen bir eser var: son ziyaretçi yok, sitenin sonunun
  ne olacağına dair tek satır yok. Arşiv sanatı ölümsüzlük değil, ölümle baş etmedir.
- **CRDT / çevrimdışı birleşme.** Duvar ve chat hâlâ sunucu-otoriteli; çevrimdışı
  yazılan bir iz birleşemiyor.
- **Zekânın bedeli.** "Ağır iş build-time'a" bir performans kuralı; hiçbir yerde
  bunun bir **maliyet** olduğu söylenmiyor. D4 GÖLGE ilk adım, yeterli değil.

---

## 13. Riskler

1. **Kapsam kayması.** En büyük risk. Panzehir: faz bütçesi kuralı (§9) ve her
   fazın tek başına yayınlanabilir olması.
2. **Ritüel maliyeti geliştirmeyi geçer.** Faz -1 yapılmazsa gerçekleşir (B13).
3. **Karot süzgeci zayıf kalırsa** kazı "sürüm bumpı arkeolojisi"ne döner.
   Pazarlıksız Z1.1 kabul kriteri.
4. **Korpus büyümezse Z4 boş dolabı denetler.** Z4.1 ve Z4.2 ön koşuldur.
5. **`step` için karar fonksiyonlarının saf olması gerekiyor**, ama monolitteki bazı
   komutlar saf değil. Panzehir: v1 yalnız **zaten modülerleşmiş** komutlarla
   sınırlı; monolit topluca bölünmez.
6. **`docs/` yayımlanınca iç notlar public olur.** Z4.2 "taşıma" değil **yeniden
   yazma**dır.
7. **0212 korpusu bir veri tedarik işidir**, kod işi değil. Kaynak/lisans disiplini
   `assets/img/moto/SOURCES.md` desenini izler; kurgu "mit" rozetiyle ayrılır.

---

## 14. İlk hamle

**Faz -1 ve Faz 0 tamamlandı** (§5, §6). Site artık şunu diyebiliyor:

> *Bu cevabı şu motor üretti — ve bunu görmek için giriş yapman gerekmiyor.
> Sana bu komutu neden önerdiğimi de sorabilirsin.*

Sıradaki: **Z1 TORTU** (§7) — jürinin birinci sıradaki gemisi. İlk dilim Z1.1:
git çıkarımı + karot süzgeci + `kaz`. Süzgeç pazarlıksız kabul kriteridir;
onsuz "gerçek arkeoloji" vaadi ilk kazıda çürür. İki gün sonunda site şunu diyebilir
hâle gelir:

> *Bu cevabı şu motor üretti, şu kaynaktan okudu, şu kadarının arşivde dayanağı
> var — ve bunu görmek için giriş yapman gerekmiyor.*

İmza budur. Gerisi onu büyütmektir.

---

*Bu belge tasarım katmanıdır. Bir amiral gemisi seçildiğinde o dilim için ayrı bir
uygulama handoff'u açılır (net-bulmaca deseninde: kilitli kararlar + faz planı +
kod), sonra faz faz kodlanır.*
