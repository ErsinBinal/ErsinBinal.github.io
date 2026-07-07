# Stratejik Düşünce Ekolleri Matrisi — Tasarım ve Besleme Dokümanı

> Bir ziyaretçinin yaşanmışlık temelli yanıtlarını, arka planda konumlanmış siyasi/politik yönetim ekolleriyle eşleştiren; en yüksek tutarlılıkla gelen ekolü seçen ve tutarsızlıkları o ekolün çekirdek mantığıyla ("doğrusallarıyla") yorumlayan bir soru/seçenek–değerlendirme motorunun ontoloji ve besleme katmanı.

Bu doküman **kodlama öncesi** referanstır. Amaç, sorular ve puanlama yazılmadan önce ekolleri ve onları ayıran eksenleri sabitlemektir; böylece sorular ekolleri ölçer, tasarımcının sezgilerini değil.

---

## 0. Mimarinin Özeti

Motor beş katmandan oluşur:

1. **Eksenler (axes)** — Ekolleri birbirinden ayıran boyutlar. Matrisin sütunları.
2. **Ekoller (schools)** — Her biri eksenler üzerinde bir *konum vektörü*. Matrisin satırları. Her ekolün bir **çekirdek doğrusalı** (tek cümlelik özsel aksiyomu) vardır; tutarsızlık yorumu bu cümleden üretilir.
3. **Sorular (questions)** — Her seçenek bir veya birkaç eksende ağırlık taşır. Yaşanmışlık senaryoları biçimindedir. İlişkisel olarak dallanır.
4. **Puanlama (scoring)** — Ziyaretçi vektörü ile ekol vektörleri arasında ağırlıklı benzerlik; en yakın ekol + tutarlılık skoru.
5. **Yorum (interpretation)** — En büyük sapma ekseni bulunur, baskın ekolün çekirdek doğrusalından geçirilerek ya *asimile* edilir ya da *komşu ekole* çekilir.

```
Ziyaretçi yanıtları ──► eksen vektörü ──► [ EKOL × EKSEN MATRİSİ ] ──► benzerlik skorları
                                                                        │
                    ┌───────────────────────────────────────────────────┘
                    ▼
        en yakın ekol + tutarlılık ──► en büyük sapma ekseni ──► çekirdek doğrusalla yorum
                                                                   ├─ asimilasyon (sapma ≤ τ)
                                                                   └─ komşuya çekme (sapma > τ)
```

---

## 1. Ayırt Edici Eksenler (Matrisin Sütunları)

Her eksen bir *ölçüm boyutu*dur. Sıralı (ordinal) eksenler `-1.0 … +1.0` aralığına; kategorik eksenler ayrık kümelere eşlenir. Her sorunun görevi ziyaretçiyi bu eksenlerden en az birinde konumlandırmaktır.

| Kod | Eksen | Tip | Uçlar / Değerler |
|---|---|---|---|
| `human_nature` | İnsan doğası | sıralı | tehlikeli/bencil (−1) ↔ nötr/şekillenebilir (0) ↔ iyi/mükemmelleşebilir (+1) |
| `legitimacy` | Meşruiyet kaynağı | kategorik | güç-etkinlik · rıza/sözleşme · erdem/bilgelik · gelenek/miras · hukuk/usul · sınıf/tarih |
| `ends_means` | Amaç–araç etiği | kategorik | sonuççu · kuralcı/haklar · erdem-temelli |
| `authority_locus` | Otoritenin yeri | sıralı | tek (−1) ↔ seçkin/az (−0.33) ↔ çok/halk (+0.33) ↔ dağınık/yok (+1) |
| `change` | Değişime tutum | sıralı | devrimci (−1) ↔ reformcu (0) ↔ koruyucu/gelenekçi (+1) |
| `order_liberty` | Öncelik | sıralı | düzen/güvenlik (−1) ↔ denge (0) ↔ özgürlük/özerklik (+1) |
| `instrument` | Yönetim aracı | kategorik | zor/kuvvet · hukuk/kurum · ahlaki örnek/ikna · teşvik/piyasa · müzakere · propaganda/mit |
| `conflict` | Çatışmaya bakış | kategorik | kurucu-kaçınılmaz · patoloji (uyumla giderilir) · üretken gerilim (denge/fren) |

**Not — sıralı vs kategorik:** Sıralı eksenlerde mesafe anlamlıdır (tek ile seçkin, seçkin ile çok arasından yakın); kategorikler için mesafe "eşit/eşit değil" (one-hot) ya da elle tanımlanmış bir yakınlık tablosuyla hesaplanır. Örn. `legitimacy` içinde "rıza" ve "hukuk" birbirine, "güç"e göre daha yakındır.

---

## 2. Ekoller ve Çekirdek Doğrusalları

Ekoller **aile kümeleri** hâlinde gruplanır. Matris önce aileye, sonra ekole indirger: bu hem puanlamayı sadeleştirir hem de soru dallanmasını yönlendirir. Her ekolün **çekirdek doğrusalı** tutarsızlık yorumunun ham maddesidir.

### A. İktidar-Realist / Otoriter Küme

- **Makyavelci realizm** — *İktidarı elde etmek ve korumak nihai ölçüttür; erdem görünürde gerekli, etkililik gerçekte gereklidir; fortuna'ya karşı virtù.*
- **Hobbesçu güvenlik-mutlakiyeti** — *Düzensizlik en büyük kötülüktür; güvenlik uğruna mutlak egemene yetki devredilir.*
- **Legalizm (Han Feizi)** — *İnsana değil sisteme güven; tek tip yasa ve katı ödül-ceza düzeni her şeyi yönetir.*
- **Organik otoriter korporatizm** — *Bütün (ulus/millet) bireyden önce gelir; birlik lider ve mit etrafında sağlanır.*
  > Tanısal bütünlük için dahildir; tarihsel bedeli baskı ve şiddettir. Raporlamada daima eleştirel çerçevede tutulur, olumlanmaz.

### B. Liberal-Anayasal Küme

- **Lockeçu liberalizm** — *Devlet doğal hakları korumak için vardır; rıza olmadan meşruiyet yoktur, iktidar sınırlıdır.*
- **Rawlsçu adalet-liberalizmi** — *Adil kurallar, kendi konumunu bilmeden herkesin kabul edebileceği kurallardır; en dezavantajlıyı gözet.*

### C. Cumhuriyet-Erdem / İdealist Küme

- **Cumhuriyetçilik (sivil erdem)** — *Özgürlük tahakküm altında olmamaktır; erdemli yurttaş ve karma kurumlar bunu korur.*
- **Aristotelesçi politeia** — *Aşırılıklar arası orta yol ve güçlü orta sınıf istikrar getirir; yönetim pratik bilgelik (phronesis) ister.*
- **Platoncu filozof-kral** — *Yönetmek bir uzmanlıktır; İyi'yi görebilenler yönetmelidir.*
- **Konfüçyüsçü erdem yönetimi** — *Yönetici ahlaki örnektir; düzen zorla değil erdem ve ritüelle sağlanır.*

### D. Gelenek Kümesi

- **Burke'çü muhafazakârlık** — *Miras alınan kurumlar biriken bilgeliktir; değişim ani değil kademeli olmalıdır.*

### E. Radikal-Özgürleşimci Küme

- **Marksist materyalizm** — *Siyaset, maddi/sınıfsal çıkarların üstyapısıdır; kurtuluş sınıf mücadelesinden geçer.*
- **Anarşizm / mutualizm** — *Zorlayıcı otorite gereksiz ve bozucudur; düzen gönüllü karşılıklılıktan doğar.*

### F. Teknokratik Küme

- **Teknokratik ütilitarizm** — *En büyük faydayı kanıt ve uzmanlık üretir; politika ölçülüp optimize edilmelidir.*

### Ω. Modifiye Edici Katman (satır değil, örtü)

- **Sun Tzu stratejik ekolü** — *Bir yönetim modeli değil, "nasıl" sorusunu değiştiren operasyonel örtüdür: aldatma, dolaylı yaklaşım, "savaşmadan kazanma", konumlanma.* Matriste ayrı satır **değildir**; kazanan ekolün üzerine binen bir modifikatördür (bkz. §7).

---

## 3. Ekol × Eksen Matrisi (Besleme Tablosu)

Okunabilirlik için felsefi çekirdek ve operasyonel çekirdek diye ikiye bölünmüştür. Kodda bu hücreler §6'daki sayısal/kategorik değerlere çevrilir.

### 3.1 Felsefi Çekirdek

| Ekol | `human_nature` | `legitimacy` | `ends_means` | `conflict` |
|---|---|---|---|---|
| Makyavelci | tehlikeli | güç/etkinlik | sonuççu | kurucu (kullan) |
| Hobbesçu | tehlikeli | rıza→mutlak | sonuççu (güvenlik) | patoloji |
| Legalizm | tehlikeli | hukuk/güç | sonuççu | patoloji (bastır) |
| Organik otoriter | mit/irade | lider/karizma | sonuççu | patoloji (birlik) |
| Lockeçu | nötr | rıza/haklar | kuralcı | üretken gerilim |
| Rawlsçu | makul/işbirlikçi | rıza/hakkaniyet | kuralcı | üretken gerilim |
| Cumhuriyetçi | şekillenebilir | erdem+hukuk | erdem-temelli | üretken gerilim |
| Aristotelesçi | nötr (alışkanlık) | hukuk+erdem | erdem-temelli | üretken gerilim |
| Platoncu | eşitsiz doğalar | bilgelik | erdem-temelli | patoloji (uyum) |
| Konfüçyüsçü | iyileştirilebilir | erdem/gök mandası | erdem-temelli | patoloji (uyum) |
| Burke'çü | kusurlu→terbiye | gelenek | erdem/ihtiyat | organik denge |
| Marksist | koşullar belirler | sınıf/tarih | sonuççu | kurucu (motor) |
| Anarşist | iyi/işbirlikçi | gönüllü rıza | kuralcı (tahakküm yok) | gönüllü/red |
| Teknokrat | nötr/ölçülebilir | uzmanlık/sonuç | sonuççu | verimlilikle çöz |

### 3.2 Operasyonel Çekirdek

| Ekol | `authority_locus` | `change` | `order_liberty` | `instrument` |
|---|---|---|---|---|
| Makyavelci | tek (esnek) | fırsatçı reform | düzen (esnek) | zor + ikna |
| Hobbesçu | tek | koruyucu | düzen (uç) | hukuk + zor |
| Legalizm | tek | değiştirici | düzen | katı hukuk/ceza |
| Organik otoriter | tek (lider) | devrimci-restoratif | düzen/birlik (uç) | zor + propaganda |
| Lockeçu | çok (sınırlı) | reformcu (direnme) | özgürlük | hukuk/kurum |
| Rawlsçu | çok (anayasal) | reformcu (dağıtım) | özgürlük+eşitlik | hukuk + dağıtım |
| Cumhuriyetçi | çok/karma | reformcu | denge | müzakere + hukuk |
| Aristotelesçi | karma/orta | ölçülü reform | denge | hukuk + müzakere |
| Platoncu | seçkin | durağan ideal | düzen/adalet | eğitim + ikna |
| Konfüçyüsçü | tek/hiyerarşik | koruyucu (yenilenen) | düzen/uyum | ahlaki örnek |
| Burke'çü | karma/yerleşik | kademeli | denge (düzen ağır) | kurum/gelenek |
| Marksist | çok→yoğun geçiş | devrimci | geçişte düzen | mücadele/örgüt |
| Anarşist | dağınık/yok | devrimci (kendiliğinden) | özgürlük (uç) | karşılıklı yardım |
| Teknokrat | seçkin (uzman) | kanıta göre reform | optimizasyon | teşvik/kanıt |

---

## 4. Soruların Matristen Beslenmesi

Ziyaretçi teorisyen değildir. Sorular **yaşanmışlık senaryoları** biçiminde olmalı; "sonuççuluğu onaylıyor musun" gibi teorik sorular yasak. Her seçenek arka planda bir veya birkaç eksen ağırlığı taşır.

### 4.1 Soru Anatomisi

Bir soru maddesi şu parçalardan oluşur:

- **prompt**: gündelik senaryo (apartman, iş yeri, mahalle, aile).
- **options[]**: her seçenek `{ metin, eksen_ağırlıkları }` taşır.
- **probes[]**: seçeneğin yokladığı eksenlerin listesi (dallanma mantığı için).
- **stage**: `broad` (aileye oturtan ilk turlar) veya `discriminator` (adayları ayıran hedefli soru).

### 4.2 Örnek — Geniş (broad) Madde

> **"Oturduğun apartmanda ortak bir sorun aylardır çözülemiyor. Sence en doğru yol?"**
>
> - **a)** Kararlı, güçlü bir yönetici seçip yetkiyi ona verelim, gerekirse kuralları esnetsin, yeter ki çözsün.
>   → `authority_locus: tek`, `instrument: zor`, `order_liberty: düzen` → **A kümesi**
> - **b)** Herkesin oyuyla net kurallar koyalım, kurallar istisnasız herkesi bağlasın.
>   → `authority_locus: çok`, `instrument: hukuk`, `legitimacy: rıza` → **B–C kümeleri**
> - **c)** En deneyimli/bilen komşuya danışıp onun dediğini yapalım.
>   → `legitimacy: bilgelik`, `authority_locus: seçkin` → **Platon / Teknokrat / Konfüçyüs**
> - **d)** Kimse kimseye dayatmasın; komşular gönüllü anlaşsın.
>   → `authority_locus: dağınık`, `instrument: müzakere`, `order_liberty: özgürlük` → **Anarşist / mutualist**

### 4.3 İlişkisel Dallanma ("farklı devamlılıklarla keskinleştirme")

İlk 4–5 madde ziyaretçiyi bir **aileye** oturtur. Sonra sistem, en yüksek iki adayı **ayıran** bir *diskriminatör* soru sorar. Ziyaretçi A kümesindeyse:

> **"Güçlü yöneticinin bazen kuralları esnetmesi normal mi?"**
>
> - Evet, sonuç önemli → **Makyavelci**
> - Hayır, kural herkes için katı olmalı → **Legalizm / Hobbesçu**

**Seçim ilkesi (bilgi kazancı):** Sistem her adımda hangi eksenlerde belirsizlik en yüksekse, o ekseni en çok ayıran ekol çiftini bulur ve bir sonraki soruyu oradan seçer. Bu, bir karar ağacında entropiyi en çok düşüren dalı seçmeye denktir.

```
belirsiz_eksenler = ziyaretçi_vektörünün en yüksek varyanslı / en zayıf sinyalli eksenleri
aday_ekoller       = mevcut ilk 2–3 skor
sıradaki_soru      = aday_ekolleri bu eksenlerde en fazla ayıran soruyu seç
```

### 4.4 Soru Tasarım Kuralları

- Her madde en az bir sıralı ekseni **kademelendirmeli** (uç değil orta seçenekler de sunulmalı) ki denge/melez profiller yakalanabilsin.
- Aynı ekseni farklı senaryolarla en az iki kez yokla (güvenilirlik / gürültü azaltma).
- Sosyal istenirlik yanlılığını kır: "güçlü lider" seçeneğini de "gönüllü anlaşma" seçeneğini de eşit meşru dille yaz.
- Diskriminatör sorular yalnızca ilk iki aday arasındaki **en yüksek sinyalli farkı** hedeflemeli.

---

## 5. Puanlama: En Yakın Ekol ve Tutarlılık

### 5.1 Vektörleştirme

- **Sıralı eksenler:** doğrudan `-1.0 … +1.0`.
- **Kategorik eksenler:** one-hot; ya da elle tanımlı yakınlık tablosuyla yumuşak eşleşme.
- Ziyaretçi vektörü, yanıtların **ağırlıklı ortalamasıyla** birikir (bir seçenek birden çok eksene katkı verebilir).

### 5.2 Benzerlik

Ağırlıklı kosinüs benzerliği ya da `1 − normalize_mesafe`:

```
skor(ekol) = Σ_eksen  w_eksen · benzerlik( ziyaretçi[eksen], ekol[eksen] )
             ────────────────────────────────────────────────────────────
                                    Σ_eksen w_eksen
```

- `w_eksen`: eksenin ayırt ediciliğine göre ağırlık (örn. `ends_means` ve `legitimacy` genelde daha ayırt edici → daha yüksek ağırlık).
- Sıralı eksende `benzerlik = 1 − |a − b| / 2`.
- Kategorik eksende `benzerlik = yakınlık_tablosu[a][b]` (aynı = 1, komşu = 0.5, uzak = 0).

### 5.3 En Yakın Ekol + Tutarlılık Skoru

```
en_yakın   = argmax skor
tutarlılık = skor[1.] − skor[2.]     # birinci ile ikinci arasındaki fark
```

- **Net eşleşme:** `tutarlılık ≥ δ` → tek ekol raporlanır.
- **Melez profil:** `tutarlılık < δ` → "iki ekol arası" raporlanır (örn. "Cumhuriyetçi–Aristotelesçi eksende"). Bu bir hata değil, bulgudur.

---

## 6. Tutarsızlığı "Doğrusallarla" Yorumlama

Motorun çekirdek mekaniği budur. Ham skor tavsiyeye burada dönüşür; "kusursuz eşleşme" hissi bu katmandan doğar.

### 6.1 Sapma Eksenini Bulma

```
sapma[eksen] = w_eksen · ( 1 − benzerlik( ziyaretçi[eksen], en_yakın[eksen] ) )
kritik_eksen = argmax sapma
```

Yani: baskın ekolün beklediği konumdan ziyaretçinin *en çok ayrıştığı* eksen.

### 6.2 İki Yorum Modu

Bir eşik `τ` ile ayrılır:

**Mod 1 — Asimilasyon** (`sapma[kritik] ≤ τ`): Sapmayı baskın ekolün çekirdek doğrusalıyla yeniden çerçevele; çelişki değil, o ekolün mantığı içinde bir *araç* olarak oku.

> *Örnek:* Baskın ekol **Makyavelci**, ama ziyaretçi `order_liberty` eksenine beklenmedik "özgürlük" ağırlığı vermiş.
> Yorum: "Makyavel'in doğrusalına göre bu bir çelişki değil — halkın kendini özgür hissetmesi, iktidarın nefret toplamadan sürmesinin aracıdır; senin özgürlük vurgun, aslında etkili yönetimin bir enstrümanı olarak okunabilir."

**Mod 2 — Komşuya Çekme** (`sapma[kritik] > τ`): Sapma asimile edilemeyecek kadar büyükse, ziyaretçiyi baskın ekolden **en yakın komşu ekole** doğru esneten bir tansiyon olarak raporla.

> *Örnek:* Baskın ekol **Legalizm**, ama `ends_means` eksende güçlü "sonuççu-esneklik" sinyali var.
> Yorum: "Bu eksen seni Legalizm'den Makyavelciliğe çekiyor; sistem-katılığına değil, sonuç-esnekliğine yatkınsın."

### 6.3 Komşuluk Tanımı

Komşu = matris uzayında baskın ekole en yakın ikinci/üçüncü ekol (aynı benzerlik metriğiyle ekol–ekol mesafesi). Aile kümeleri komşuluk için ön-filtre olarak kullanılabilir: önce aynı aile içi komşulara bak.

### 6.4 Yorum Şablonu

```
[EN YAKIN EKOL] · tutarlılık: [net / melez]
Çekirdek doğrusalı: "[ekolün tek cümlelik aksiyomu]"

Seni bu ekole bağlayan: [en yüksek benzerlik veren 2–3 eksen, gündelik dille]

Dikkat çeken sapma ([kritik_eksen]):
  ├─ Asimilasyon: [sapmayı ekolün doğrusalıyla yeniden çerçeveleyen cümle]
  └─ / Komşuya çekme: [seni [komşu ekol]'e doğru esneten tansiyon]

(varsa) Sun Tzu örtüsü: [operasyonel üslup notu]
```

---

## 7. Sun Tzu Modifiye Edici Katmanı

Ayrı bir ekol satırı değildir; kazanan ekolün *üslubunu* niteler. Ziyaretçi yanıtlarında "dolaylılık / aldatma / çatışmadan kaçınarak kazanma / konumlanma" sinyalleri güçlüyse, rapora bir **operasyonel örtü** eklenir:

- Makyavelci + Sun Tzu → "sonuç odaklı ama dolaylı; doğrudan güç yerine konum ve algı yönetimi."
- Cumhuriyetçi + Sun Tzu → "müzakereci ama zamanlamayı ve inisiyatifi stratejik kullanan."

Bu katman skoru değiştirmez; yorum metnine bir üslup boyutu ekler.

---

## 8. Veri Şeması (Kodlama İçin)

### 8.1 Eksen tanımı

```json
{
  "id": "authority_locus",
  "label": "Otoritenin yeri",
  "type": "ordinal",
  "weight": 1.0,
  "poles": { "-1": "tek", "-0.33": "seçkin", "0.33": "çok", "1": "dağınık" }
}
```

```json
{
  "id": "legitimacy",
  "label": "Meşruiyet kaynağı",
  "type": "categorical",
  "weight": 1.3,
  "values": ["güç", "rıza", "erdem", "gelenek", "hukuk", "sınıf"],
  "proximity": {
    "rıza":   { "hukuk": 0.5, "erdem": 0.3, "güç": 0.0 },
    "erdem":  { "gelenek": 0.5, "hukuk": 0.3 }
  }
}
```

### 8.2 Ekol tanımı

```json
{
  "id": "machiavellian",
  "label": "Makyavelci realizm",
  "family": "A_realist",
  "core_line": "İktidarı elde etmek ve korumak nihai ölçüttür; erdem görünürde, etkililik gerçekte gereklidir.",
  "vector": {
    "human_nature": -0.8,
    "legitimacy": "güç",
    "ends_means": "sonuççu",
    "authority_locus": -0.8,
    "change": 0.0,
    "order_liberty": -0.5,
    "instrument": "zor",
    "conflict": "kurucu"
  },
  "assimilation_hooks": {
    "order_liberty": "Halkın özgür hissetmesi, nefret toplamadan iktidarı sürdürmenin aracıdır.",
    "instrument":    "İkna ve görünen erdem, zorun maliyetini düşüren araçlardır."
  },
  "neighbors": ["hobbesian", "legalism"]
}
```

### 8.3 Soru tanımı

```json
{
  "id": "q_apartment_problem",
  "stage": "broad",
  "prompt": "Apartmanında ortak bir sorun aylardır çözülemiyor. Sence en doğru yol?",
  "options": [
    {
      "text": "Güçlü bir yöneticiye yetki verelim, gerekirse kuralları esnetsin.",
      "weights": { "authority_locus": -0.8, "instrument": "zor", "order_liberty": -0.6 },
      "probes": ["authority_locus", "instrument", "order_liberty"]
    },
    {
      "text": "Herkesin oyuyla net kurallar koyalım, istisnasız herkesi bağlasın.",
      "weights": { "authority_locus": 0.4, "instrument": "hukuk", "legitimacy": "rıza" },
      "probes": ["authority_locus", "legitimacy"]
    },
    {
      "text": "En bilen komşuya danışıp onun dediğini yapalım.",
      "weights": { "legitimacy": "erdem", "authority_locus": -0.4 },
      "probes": ["legitimacy"]
    },
    {
      "text": "Kimse dayatmasın; komşular gönüllü anlaşsın.",
      "weights": { "authority_locus": 1.0, "instrument": "müzakere", "order_liberty": 0.9 },
      "probes": ["authority_locus", "order_liberty"]
    }
  ]
}
```

### 8.4 Diskriminatör soru (koşullu)

```json
{
  "id": "q_rule_flex",
  "stage": "discriminator",
  "trigger": { "top_family": "A_realist" },
  "prompt": "Güçlü yöneticinin bazen kuralları esnetmesi normal mi?",
  "options": [
    { "text": "Evet, sonuç önemli.",              "weights": { "ends_means": "sonuççu" }, "toward": "machiavellian" },
    { "text": "Hayır, kural herkes için katı olmalı.", "weights": { "ends_means": "kuralcı" },  "toward": "legalism" }
  ]
}
```

---

## 9. Motor Akışı (Sözde-kod)

```python
def degerlendir(yanitlar, eksenler, ekoller, sorular):
    # 1) Ziyaretçi vektörünü biriktir
    ziyaretci = birik_vektor(yanitlar, eksenler)

    # 2) Her ekol için ağırlıklı benzerlik
    skorlar = {
        e.id: agirlikli_benzerlik(ziyaretci, e.vector, eksenler)
        for e in ekoller
    }
    sirali = sorted(skorlar.items(), key=lambda x: -x[1])
    en_yakin_id, s1 = sirali[0]
    ikinci_id,   s2 = sirali[1]
    tutarlilik = s1 - s2
    en_yakin = ekoller[en_yakin_id]

    # 3) Kritik sapma ekseni
    sapmalar = {
        ax.id: ax.weight * (1 - benzerlik(ziyaretci[ax.id], en_yakin.vector[ax.id], ax))
        for ax in eksenler
    }
    kritik = max(sapmalar, key=sapmalar.get)

    # 4) Yorum modu
    if sapmalar[kritik] <= TAU:
        yorum = asimile_et(en_yakin, kritik)          # core_line + assimilation_hooks
    else:
        komsu = en_yakin_komsu(en_yakin, ziyaretci, ekoller)
        yorum = komsuya_cek(en_yakin, komsu, kritik)

    # 5) Sun Tzu örtüsü (opsiyonel)
    ortu = sun_tzu_ortusu(ziyaretci) if sun_tzu_sinyali(ziyaretci) else None

    return Rapor(
        en_yakin   = en_yakin,
        tutarlilik = "net" if tutarlilik >= DELTA else f"melez ({en_yakin_id}–{ikinci_id})",
        baglayan   = en_guclu_eksenler(ziyaretci, en_yakin, k=3),
        sapma      = (kritik, yorum),
        ortu       = ortu
    )
```

### Sıradaki soruyu seçme (uyarlanır akış)

```python
def sonraki_soru(ziyaretci, skorlar, sorular):
    adaylar = ilk_n_ekol(skorlar, n=2)
    belirsiz = en_zayif_sinyalli_eksenler(ziyaretci)
    return sorular_icinden_en_ayirt_edici(sorular, adaylar, belirsiz)
```

---

## 10. Parametreler ve Ayar Notları

| Parametre | Rol | Başlangıç önerisi |
|---|---|---|
| `w_eksen` | Eksen ağırlıkları | `ends_means`, `legitimacy` yüksek (≈1.3); diğerleri 1.0 |
| `τ` (TAU) | Asimilasyon ↔ komşuya çekme eşiği | orta (0.4–0.5); kalibrasyonla ayarla |
| `δ` (DELTA) | Net ↔ melez eşiği | küçük (0.05–0.1 normalize skorda) |
| min. soru | Aileyi oturtan geniş tur | 4–5 |
| diskriminatör | Aday ayırıcı ek soru | 2–4 |

**Kalibrasyon:** Her ekol için 2–3 "prototip yanıt seti" yazıp motoru üzerlerinde çalıştır; beklenen ekolü en yüksek skorla veriyor mu diye doğrula. Vermiyorsa ya soru ağırlıkları ya eksen ağırlıkları hatalıdır.

---

## 11. Etik ve Çerçeve Notları

- **Organik otoriter korporatizm** ve benzeri baskıcı modeller tanısal bütünlük için matriste yer alır; raporlamada olumlanmaz, tarihsel bedelleriyle (baskı/şiddet) eleştirel çerçevede sunulur.
- Rapor bir **teşhis** değil, bir **ayna**dır: "sana en yakın düşünce ekolü" der, "doğru olan budur" demez. Melez profiller bir kusur değil, bulgu olarak sunulur.
- Ziyaretçiye ekolün hem gücü hem kör noktası birlikte verilmeli (her `core_line` yanında bir "kör nokta" cümlesi tutmak faydalı olur).

---

## 12. Ekol Listesi — Kod İskeleti İçin Özet Dizin

| id | label | family | neighbors |
|---|---|---|---|
| `machiavellian` | Makyavelci realizm | A_realist | hobbesian, legalism |
| `hobbesian` | Hobbesçu güvenlik-mutlakiyeti | A_realist | machiavellian, legalism |
| `legalism` | Legalizm (Han Feizi) | A_realist | hobbesian, machiavellian |
| `organic_authoritarian` | Organik otoriter korporatizm | A_realist | hobbesian |
| `lockean` | Lockeçu liberalizm | B_liberal | rawlsian, republican |
| `rawlsian` | Rawlsçu adalet-liberalizmi | B_liberal | lockean, republican |
| `republican` | Cumhuriyetçilik (sivil erdem) | C_virtue | aristotelian, lockean |
| `aristotelian` | Aristotelesçi politeia | C_virtue | republican, burkean |
| `platonic` | Platoncu filozof-kral | C_virtue | confucian, technocrat |
| `confucian` | Konfüçyüsçü erdem yönetimi | C_virtue | platonic, burkean |
| `burkean` | Burke'çü muhafazakârlık | D_tradition | aristotelian, confucian |
| `marxist` | Marksist materyalizm | E_radical | anarchist |
| `anarchist` | Anarşizm / mutualizm | E_radical | marxist |
| `technocrat` | Teknokratik ütilitarizm | F_technocratic | platonic, rawlsian |
| `sun_tzu` | Sun Tzu stratejik örtüsü | Ω_modifier | — (modifikatör) |

---

*Bu doküman motorun ontoloji katmanıdır. Sıradaki adım: bu şemayı gerçek JSON dosyalarına (`axes.json`, `schools.json`, `questions.json`) dökmek ve benzerlik + yorum fonksiyonlarını kodlamak.*
