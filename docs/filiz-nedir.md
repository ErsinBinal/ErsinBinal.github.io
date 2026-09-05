# FİLİZ nedir — sade anlatım

> Bu doküman teknik değil. Aylar sonra açıp "biz burada ne yapmıştık?" diye
> baktığında tek başına anlaşılsın diye yazıldı. Teknik ayrıntı
> [büyük planda](zekanin-saygidurusu-buyuk-plan.md) (Madde 6 ve FİLİZ bölümü).
>
> Tarih: 2026-09-04 · Sürüm: `convivium-v266` · Commit: `74cfe1f`

---

## 1. Tek cümleyle

**Site artık kendi bulmacalarını kendisi üretiyor** — ama ürettiği hiçbir şey
sen onaylamadan siteye girmiyor.

---

## 2. Neden buna ihtiyaç vardı

Site bugüne kadar bir **müze**ydi. Vitrindeki her şey gerçekten olmuş bir
şeydi: senin attığın commit'ler, gerçek geçmiş. `kaz` komutu o geçmişi
kazıyor, `tortu` katmanları gösteriyor. Buna **4. boyut** diyoruz: *olmuş olan*.

Sen bir de **atölye** istedin. Site sadece geçmişi sergilemesin, yeni şeyler de
yapsın. Buna **5. boyut** diyoruz: *olabilecek olan*.

Tehlike belliydi: başıboş bir çırak ya çöp üretir ya uydurur.

---

## 3. Çözüm — üç cümle

**1. Çırak sadece kontrol edilebilir şey yapabilir.**
Bulmaca yapabilir, çünkü çalıştırıp doğru mu diye bakarız.
Sitenin geçmişi hakkında hikâye **yazamaz**, çünkü kontrol edemeyiz — o uydurma
olur. Sınır tam burada ve makine tarafından zorlanıyor.

**2. Çırak vitrine bir şey koyamaz.**
Yaptığını bir kutuya bırakır (GitHub'da bir PR). Sabah sen bakarsın,
"bu girsin, bu girmesin" dersin.

**3. Çırak kuralları değiştiremez.**
Mal üretir; kendini denetleyen kuralı **asla**. Bu bir söz değil, kilit —
denendi ve kapandı.

---

## 4. Nasıl çalışıyor — üç organ

| Organ | Ne yapar | Dosya |
|---|---|---|
| **GENERATOR** | Bütün kısa programları tarar, ne ürettiklerine bakar | `scripts/build-filiz.js` |
| **FILTER** | Mekanik eler; **reddedebilmek zorunda** | aynı dosya, ikinci aşama |
| **GATE** | Çırağın eline vurulan yer: nereye yazabileceğini kilitler | `scripts/filiz-zar.js` |

> **Not (2026-09-05):** Bu üç kelime önce "üreteç / elek / zar" diye
> uydurulmuştu. Hepsi gerçek yazılım terimleriyle değiştirildi —
> `generator`, `filter`, `gate` (CI/CD'nin kendi kelimesi). Terminalde
> `whatis gate` yazarsan tanımını ve nereden geldiğini görürsün.

İlk gece ölçülen:

```
GENERATOR  1.435.945 program tarandı  →  2.414 farklı dizi
FILTER     790 geçti, 1.624 elendi (%67 red)
          1431  MDL kazancı yok
           161  sayılar okunamayacak kadar büyük
            30  sabit dizi — örüntü yok
             2  zaten OKKAM havuzunda
```

**Neden %67 red iyi bir şey:** hiçbir şeyi elemeyen filtre, filtre değildir. Eğer
red oranı bir gün sıfıra düşerse kapı bozulmuş demektir — o yüzden build
o durumda **düşüyor**, dosya yazmıyor.

---

## 5. İki raf — asıl fikir ikincisinde

**ÇÖZÜLEN** — OKKAM'ın bulabildiği bulmacalar. Normal.

**AÇIK** — burası ilginç olan. FİLİZ bir diziyi üreten programı **biliyor**,
çünkü kendisi üretti. Ama OKKAM onu **arayarak bulamıyor**. Yani site kendi
çözemediği soruyu soruyor ve bunu saklamıyor:

```
[-1, -4, -7, -10, -13, -16]
FILIZ bu diziyi ureten 5 talimatlik bir program BILIYOR
— kendisi uretti. Ama OKKAM ziyaretci butcesiyle onu bulamiyor.
muhur 1h9utqp
```

Cevap saklı ama **uzunluğu yazılı** ve **checksum'ı var**. Biri doğru programı
bulursa `filiz coz` onu doğruluyor:

> **DOĞRULANDI — FİLİZ'in bildiği programın ta kendisi.
> OKKAM bunu arayarak bulamamıştı. Sen buldun.**

---

## 6. Komutlar

| Komut | Ne yapar |
|---|---|
| `filiz` | Atölyeyi gösterir: ne üretildi, ne elendi, günün açık sorusu |
| `filiz acik` | Bütün açık meydan okumalar |
| `filiz coz <program>` | Cevabını doğrular (örn. `filiz coz DEC OUT DEC JNZ`) |
| `filiz nasil` | Mekanizmayı anlatır |
| `whatis <terim>` | Bilmediğin kelimenin ne demek olduğunu ve **nereden geldiğini** yazar |
| `apropos <kelime>` | Sözlükte kelimeye göre arar |

Takma adlar: `atolye`, `uretim`.

---

## 7. Gece işi — sabah ne göreceksin

Her gece **02:17 UTC**'de GitHub'da `FILIZ gece uretimi` çalışır. Sırayla:

1. Zar kendini dener (kapı sağlam mı)
2. Üreteç + elek çalışır
3. Zar kontrol eder: izinli alanın dışına çıkıldı mı
4. Testler koşar
5. **PR açar** — `main`'e asla push etmez

**Onay otomatik (2026-09-05'ten beri).** PR açılır, kapı ve testler geçtiyse
kendiliğinden merge edilir. Her gün senin tıklamana gerek yok.

Bu neden güvenli: maddenin şartı **diff**, insan tıklaması değil. Diff kalıcı —
her gece bir PR, geçmişte duruyor, tek komutla geri alınabilir. Ve merge'den
**önce** iki kapı var:

- **GATE** — sadece `assets/data/filiz.json` değişebilir, başka hiçbir şey
- **TEST** — üretilen her diziyi *çalıştırarak* doğrular (senin JSON'a bakarak
  yapamayacağın şey)

İstediğin zaman kapatabilirsin: Actions → Run workflow → **otomatik: false**.

**Ne kadar iş kaldı?** 790 adaylık bir birikim var, her gece 150 tanesi
işleniyor. Yani yaklaşık 5-6 gece sürer, sonra biter ve **yeni iş olmadığı için
PR gelmez.** Bu bir arıza değil: işin bittiği anlamına gelir.

Elle çalıştırmak istersen: GitHub → Actions → *FILIZ gece uretimi* → *Run workflow*.

---

## 8. Para — hayır, maliyeti yok

Kısa cevap: **hiçbir ücret çıkmaz.** Uzun cevabı, sabah içi rahat olsun diye:

| Soru | Cevap |
|---|---|
| GitHub Actions ücretli mi? | **Genel (public) depolarda ücretsiz ve sınırsız.** Bu depo genel. |
| İş ne kadar sürüyor? | Gecede ~4-6 dakika |
| AI çağrısı yapıyor mu? | **Hayır.** Tek satır bile yok — kontrol edildi: `fetch` 0, `api` 0, AI 0 |
| Cloudflare Worker'ı çağırıyor mu? | **Hayır.** O ayrı bir iş, FİLİZ ona dokunmuyor |
| Bir şey saklıyor mu (artifact/storage)? | Hayır, dosya yüklemiyor |
| Sonsuz döngüye girip fatura şişirebilir mi? | Hayır — üretimin **sabit bir bütçesi** var (240 sn), sonra kendi kendine duruyor |

**Tek dikkat edilecek yer:** depoyu bir gün *özel* (private) yaparsan Actions
dakikaları ücretsiz kotadan sayılmaya başlar. Aylık kullanım ~180 dakika,
ücretsiz kota 2.000 dakika — yine rahatça içinde kalır. Yani o durumda bile
fatura çıkmaz, sadece kotadan yer.

---

## 9. Bir şey ters giderse

**Sabah PR gelmediyse.**
İki ihtimal var:

1. **İş bitmiştir.** Bütün adaylar sınıflandırıldıysa yapacak yeni iş yoktur ve
   bilerek hiçbir şey yazılmaz. Actions'ta yeşil tik görürsün, özet
   *"Bu gece yeni iş yoktu"* der. Sorun yok.
2. **İzin kapalıdır.** *Settings → Actions → General → Workflow permissions* →
   **"Read and write permissions"** ve **"Allow GitHub Actions to create and
   approve pull requests"** açık olmalı. Kapalıysa iş son adımda düşer,
   Actions'ta kırmızı görürsün. (2026-09-05'te tam bu oldu: 10 adımın 9'u
   geçti, sadece PR açma düştü.)

**"ZAR KAPANDI" yazan bir hata görürsen.**
Bu bir arıza değil, **kapının çalıştığının kanıtı**. Üretim izinli alanın
dışına çıkmış demektir. O gece PR açılmaz — doğru davranış budur.

**Üretim bir gün hiçbir şey elemezse.**
Build kendini durdurur ve dosya yazmaz. Bu da kasıtlı.

**Gece işini tamamen durdurmak istersen.**
`.github/workflows/filiz-gece.yml` dosyasını sil ya da GitHub → Actions →
*FILIZ gece uretimi* → sağ üstten *Disable workflow*.

---

## 10. Hangi dosya ne yapıyor

| Dosya | İş |
|---|---|
| `scripts/build-filiz.js` | Üreteç + elek. Bütün işi bu yapar |
| `scripts/filiz-zar.js` | Gate. Nereye yazılabileceğini kilitler |
| `assets/js/home/filiz.js` | Terminaldeki `filiz` komutunun beyni (saf okuyucu) |
| `assets/js/home/glossary.js` | Sözlük — `whatis` ve `apropos` buradan besleniyor |
| `assets/data/filiz.json` | Üretimin çıktısı. **Gece işinin yazabildiği tek dosya** |
| `.github/workflows/filiz-gece.yml` | Gece işi |
| `tests/unit/home-filiz.test.mjs` | 18 test — çoğu "ne yapabildiğini" değil **"ne yapamadığını"** kilitler |

Elle çalıştırmak: `npm run build:filiz` · Zarı denemek: `npm run filiz:zar`

---

## 11. Bilerek yapmadıklarımız

- **Metin/hikâye/tarih üretimi.** Doğrulayıcısı yok. Bir paragrafı
  "çalıştırıp" doğru mu diye bakamayız, o yüzden üretilmiyor. Sitede
  0212 siber-tarih bölümünün hâlâ beklemesinin sebebi bu — o veriyi
  **sen** tedarik etmelisin, uydurulamaz.
- **AI'nin seçim yapması.** AI aday üretebilir ama **eleyemez**. Zeki bir elek
  kandırılabilir ve sessizce kayar; aptal ve deterministik bir elek kayamaz.
- **Siteye doğrudan yazma.** Runtime hiçbir şey yazmıyor, hiç.
