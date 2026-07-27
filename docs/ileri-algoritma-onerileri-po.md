# İleri Özellik & Algoritma Önerileri — Product Owner İncelemesi

Tarih: 2026-07-27
Kapsam: Convivium'un tamamı kavramsal olarak incelendi; ürün kimliğini
**bozmadan** derinlik ekleyen, "gelişmiş yazılım kurgusu + gelişmiş algoritma"
barını karşılayan yeni özellik önerileri. Bu belge **kodlama öncesi** üründür:
her öneri mimari + algoritma + fazlanmış plan + doğrulama kancası içerir.

Referanslar (bu belge onların üstüne inşa eder):
- [Product Owner Plan](product-owner-plan.md)
- [Site Teknik Değerlendirmesi 2026-07-17](site-teknik-degerlendirme-2026-07-17.md)
- [Yenilik Kuyruğu Handoff](yenilik-kuyrugu-handoff.md)
- [Stratejik Ekol Matrisi](stratejik-ekol-matrisi.md)
- [/net Sinyal Ağı Tasarımı](net-bulmaca-tasarim.md)

---

## 0. Yönetici Özeti (PO gözü)

Convivium teknik olarak sağlam ve yaratıcı kimliği çok güçlü. Teknik
değerlendirmenin de saptadığı gibi **asıl gerilim işlevsizlik değil, iki
eksende çözülmemiş ürün problemi**:

1. **Keşif problemi (yeni ziyaretçi yoğunluğu).** 132 komut, 28 rota, 8 oyun,
   7 araç, ritüeller, hologramlar, hesap sistemi — hepsi aynı anda dikkat
   istiyor. Teknik rapor "üç amiral gemisi" ve girişsiz demo önerdi ama
   **ziyaretçiyi doğru sinyale götüren bir motor yok**; navigasyon hâlâ elle
   yazılmış öneri listeleri. (Bkz. teknik rapor §5, N3 "Yaşayan Atlas" hedefi
   [terminal-navigation-handoff.md](terminal-navigation-handoff.md).)

2. **Üretim–bakım makası.** Her yeni kalıntı/oda/kart elle yazılıyor. İçerik
   büyüdükçe elle küratörlük maliyeti artıyor. Bugünkü prosedürel hologram işi
   (Nefertiti / Dünya / Kurtarılmış Şehir — [holo/index.html](../holo/index.html)
   `PROC_BUILDERS`) bunun panzehirinin ilk kıvılcımı: **üretimi elden algoritmaya
   devretmek.**

Bu iki problem, sitenin mevcut tasarım DNA'sına (deterministik + offline +
framework'süz modül) sadık iki **amiral gemisi** ve dört destek diliminde
çözülebilir. Hiçbiri framework değişimi, yeni ağır bağımlılık veya yeni gizli
sır gerektirmez.

| # | Öneri | Sınıf | Algoritma çekirdeği | Etki | Efor | Risk |
|---|---|---|---|---|:---:|:---:|
| **A1** | **Sinyal Atlası** — içerik grafiği + kişiselleştirilmiş öneri | Amiral gemisi | Personalized PageRank (RWR) + MMR + topluluk tespiti | ★★★ | ●● | ○ |
| **A2** | **Prosedürel Kalıntı Grameri** — tohumdan yapı üreten motor | Amiral gemisi | Shape grammar + Wave Function Collapse | ★★☆ | ●● | ○ |
| B1 | **Yerel Anlamsal Arama** — offline `find`/`ara` | Destek | BM25 + kuantize gömü + RRF hibrit | ★★☆ | ● | ○ |
| B2 | **Yaşayan Harita** — presence sürümlü sinyal iklimi | Destek | Reaksiyon-difüzyon (Gray-Scott) / CA | ★☆☆ | ●● | ○ |
| B3 | **Deterministik Co-op Netcode** — Crude Buster rollback | Destek | Lockstep + rollback (GGPO tarzı) | ★★☆ | ●●● | ●● |
| B4 | **Ekol Aynası — Bayesçi aktif öğrenme** | Destek | İnanç durumu + beklenen bilgi kazancı (CAT/IRT) | ★☆☆ | ●● | ○ |

Önerilen sıra: **A1 → A2 → B1 → B2 → (B4 / B3)**. Gerekçe §7'de.

---

## 1. Tasarım DNA'sı (her öneri buna uymak zorunda)

Bu kısıtlar sitenin kimliğidir; öneriler bunları **ihlal etmez**, kullanır:

- **D1 — Deterministik + offline.** Rastgelelik yok; `hash(tohum + zaman
  dilimi)` var (ruins/dreams/net/günlük kart deseni; mulberry32). Herkes aynı
  şeyi görür, sunucu gerekmez.
- **D2 — Fail-closed zarafeti.** Supabase tablosu/şeması yoksa özellik sessizce
  ve hatasız kapanır (bottle/shards örneği).
- **D3 — Framework'süz modül deseni.** `assets/js/home/<ad>.js`, IIFE,
  `window.ConviviumHome.create<Ad>(deps)` fabrikası; karar mantığı modülde, yan
  etkiler home-protocol callback'lerinde. (Bkz.
  [yenilik-kuyrugu-handoff.md](yenilik-kuyrugu-handoff.md) §"Kurulan modül deseni".)
- **D4 — AI yalnız Worker sınırından.** Tarayıcı doğrudan model sağlayıcıya
  çıkmaz. **Sonuç:** ziyaretçi başına ağır/pahalı hesap tercih edilmez;
  önerilerin çoğu build-time'da önceden hesaplanıp tarayıcıda ucuz çalışır.
- **D5 — RSS/changelog ritüeli.** Kullanıcıya görünür her özellik `signals.xml`
  + `pages/changelog.html`e işlenir; `?v=` + SW `CACHE_NAME` bump; `npm run
  check` + `validate-site-integrity.js`.
- **D6 — Küçük ilk yük.** Teknik rapor precache/monolit şişkinliğini işaretledi.
  Yeni motorlar **veri-tabanlı ve tembel yüklenir**; ağır tablo build-time
  JSON'a gömülür, runtime yalnız okur.

---

## A1. Sinyal Atlası — İçerik Grafiği + Kişiselleştirilmiş Öneri Motoru

> Sitenin tüm parçalarını (oda, oyun, araç, kalıntı, hologram, makale, anahtar
> komut, HANE lore düğümleri) **tipli, ağırlıklı bir grafiğe** oturtan ve
> ziyaretçinin bıraktığı izlere göre "sıradaki sinyali" **graf üstünde rastgele
> yürüyüşle** öneren motor. Terminal-navigation yol haritasındaki N3 "Yaşayan
> Atlas" hedefinin eksik olan **algoritmik çekirdeği** budur.

### A1.1 Neden bu, neden şimdi

Teknik rapor §5'in "yoğunluk yüksek / üç amiral gemisi / ilk temas anlaşılır
olsun" tespitinin doğrudan çözümü. Elle yazılmış öneri listelerini, içerik
büyüdükçe kendini güncelleyen **bir grafik algoritmasıyla** değiştirir. Yeni
backend yok; mevcut `easterTrail` / `world_state` / localStorage izleri +
presence sinyalleri kişiselleştirme girdisi olur.

### A1.2 Veri modeli — grafik

Grafik `G = (V, E)`:

- **V (düğümler, ~120–150):** rota tanımları (`assets/js/home/routes.js`, 28),
  oyunlar (8), araçlar (7), ruins artifact'ları, holo kalıntıları (prosedürel
  dahil), makaleler, kilit komutlar, HANE/lore düğümleri.
- **E (kenarlar, tipli + ağırlıklı `w ≥ 0`):**
  - `mechanic` — ortak etkileşim (terminal / canvas oyun / ritüel araç).
  - `theme` — lore/konu yakınlığı (sinyal-arkeolojisi, cyberpunk, mısır, kozmos,
    müzik/radyo). Etiketlerden türetilir (`routes.js` zaten tag taşıyor).
  - `flow` — kurgusal/gözlenen geçiş ("X odasından Y'ye").
  - `prereq` — ilerleme/kilit kenarları (vault, resonate, net kasa).

```jsonc
// build-time üretilen atlas-graph.json (runtime yalnız okur)
{
  "nodes": [
    { "id": "holo", "label": "Hologram Kasası", "kind": "room",
      "tags": ["sinyal-arkeolojisi","3d","kozmos"], "gated": false },
    { "id": "ekol-aynasi", "label": "Ekol Aynası", "kind": "tool",
      "tags": ["dusunsel","kisisel"], "flagship": true }
  ],
  "edges": [
    { "u": "ruins", "v": "holo", "type": "theme", "w": 0.9 },
    { "u": "holo", "v": "arsiv", "type": "flow",  "w": 0.7 }
  ]
}
```

Grafik **build-time'da** `scripts/build-atlas.js` ile derlenir (routes tag'leri
+ ruins/holo registry + makale meta + elle küratör dosyası
`docs/atlas-curation.json`). Deterministik; runtime maliyeti sıfır.

### A1.3 Algoritma — Personalized PageRank (Random Walk with Restart)

Öneri = grafik üstünde, ziyaretçinin izlerine **yeniden başlayan (restart)**
rastgele yürüyüşün durağan dağılımı.

- **Geçiş matrisi `M`:** sütun-normalize ağırlıklı komşuluk; tip ağırlıkları
  `θ_type` ile ölçeklenir (`prereq > flow > theme > mechanic` gibi). Dangling
  (çıkışsız) düğümler uniform'a bağlanır.
- **Kişiselleştirme vektörü `p`:** kütle ziyaretçinin son ziyaret ettiği
  düğümlerde yoğunlaşır (`easterTrail` / localStorage geçmişi), üstüne küçük
  uniform taban. **Soğuk başlangıç (izi yok):** `p` = üç amiral gemisine
  (Ekol Aynası, Crude Buster, Oracle) yığılır — teknik raporun "üç amiral
  gemisi" reçetesinin tam olarak algoritmik gövdesi.
- **Çözüm:** güç yinelemesi
  `r ← (1−α)·M·r + α·p`, `α ≈ 0.15`, `‖r_{k+1}−r_k‖₁ < ε` olana dek (~30–50
  yineleme). `|E|` birkaç yüz → tarayıcıda `< 1 ms`, offline, deterministik.

```
function personalizedPageRank(M, p, alpha=0.15, eps=1e-6, maxIter=60):
    r = p.copy()
    for _ in range(maxIter):
        r_next = (1 - alpha) * matvec(M, r) + alpha * p
        if l1(r_next - r) < eps: return r_next
        r = r_next
    return r
```

**İnce ayarlar (gelişmişlik katmanı):**

- **MMR yeniden sıralama (çeşitlilik).** Ham PPR skoru tek kümeye yığılabilir.
  Maximal Marginal Relevance ile alaka (PPR) ve yenilik (grafik mesafesi/kümesi)
  dengelenir: `score = λ·ppr(v) − (1−λ)·max_{s∈seçilmiş} sim(v, s)`.
- **Topluluk tespiti (takımadalar).** Build-time'da **etiket yayılımı (label
  propagation, tohumlu → deterministik)** ile grafik "takımadalara" bölünür;
  atlas görselinde tematik bölgeler ve MMR için küme mesafesi verir.
- **Solucan deliği (serendipity).** Günün mulberry32 tohumuyla düşük olasılıklı
  bir "ışınlanma" kenarı enjekte edilir → atlas canlı hisseder ama gün içinde
  tekrar edilebilir (D1 korunur).
- **Ustalık maskesi.** "Bitirilmiş/görülmüş" düğümler (world_state) öneriden
  düşürülür; motor keşfedilmemişe yönlendirir.

### A1.4 Yüzey (nasıl görünür)

- Terminal: `atlas` (haritayı ASCII takımadalar olarak çizer), `next` / `nereye`
  (ilk 3 öneri, kısa gerekçeyle: *"holo → arsiv: aynı sinyal-arkeoloji kümesi"*).
- Yolculuk rayı + HUD "atlas parlaması" (presence katmanında zaten var —
  [yenilik-kuyrugu-handoff.md](yenilik-kuyrugu-handoff.md) tablo satırı 1).
- Opsiyonel `/atlas` VFS odası (ruins/net deseni).

### A1.5 Mimari & fazlar

Modül: `assets/js/home/atlas.js` (D3 deseni). Saf çekirdek (graf + PPR + MMR),
yan etkiler callback. Grafik `assets/data/atlas-graph.json` (runtime-cache,
precache değil — D6).

- **Faz 1:** `build-atlas.js` + graf JSON + PPR + `next` komutu (soğuk başlangıç
  üç amiral gemisi). Backend yok; katıksız keşif kazancı.
- **Faz 2:** `easterTrail`/history ile kişiselleştirme + ustalık maskesi + MMR.
- **Faz 3:** `atlas` ASCII harita + takımada renklendirme + HUD parlaması bağı.
- **Faz 4 (ops):** presence sürümlü sıcaklık (→ B2 ile birleşir).

Doğrulama (D5): saf çekirdek için birim test (PPR yakınsama, determinizm,
soğuk-başlangıç, ustalık maskesi); modül-yokluğu fail-closed; changelog + RSS.

---

## A2. Prosedürel Kalıntı Grameri — Tohumdan Yapı Üreten Motor

> Bugünkü prosedürel hologramları ([holo/index.html](../holo/index.html)) elle yazılmış
> `buildX()` fonksiyonlarından, **bildirimsel bir biçim grameri + Wave Function
> Collapse** motoruna terfi eder. Sonuç: her günün tohumundan **sonsuz,
> deterministik "günün prosedürel kalıntısı"** — hiç yeni asset üretmeden.

### A2.1 Neden bu

Üretim–bakım makasını (§0.2) kapatır: kalıntı üretimini algoritmaya devreder.
Bugün 3 elle-yazılı prosedürel yapı var; gramer bunları **kural setine** çevirip
sonsuz varyant üretir. Meshy kredisi, yeni GLB, yeni asset **gerekmez** (D4/D6).

### A2.2 İki katmanlı algoritma

**Katman 1 — Biçim grameri (shape/split grammar, CGA Shape tarzı).** Parçalar
(pilon, kolon, obelisk, kubbe, kule, halka) bugünkü three.js primitifleriyle
(`taperedBox`, silindir, koni) parametrik üreteçlerdir. Kurallar bir aksiyomdan
türetir:

```
Yapi        → Split(Y){ Taban | Gövde | Taç }
Gövde       → Repeat(Kat, n)                    // n tohumdan
Kule        → Extrude → Taper → Cap
Cap         → pyramidion | kubbe | anten        // tohumla seçilir
Tapinak     → Symmetry(X){ Pilon Geçit Pilon } · Kolonad · Obelisk×2
```

Türetme deterministik: her `?`/`Repeat`/seçim `hash(tohum, kural-yolu)` ile
karara bağlanır → aynı gün herkes aynı kalıntıyı görür (D1).

**Katman 2 — Wave Function Collapse (şehir/yerleşim planı).** Kurtarılmış Şehir
gibi ızgara-tabanlı kalıntılar için WFC: her hücrenin karosu (kule, alçak-kat,
meydan, yol, park) **kısıt yayılımıyla** seçilir.

```
WFC(ızgara, karolar, komşuluk_kuralları, tohum):
    while çökmemiş hücre var:
        h = min-entropi hücresi seç        # en az olasılıklı
        çök(h, tohum)                       # ağırlıklı, tohumla belirli
        yay(h)                              # komşulardan tutarsız karoları ele
        if çelişki: backtrack(anlık-görüntü) # geri izleme
    return ızgara
```

Min-entropi sezgiseli + kısıt yayılımı + geri izleme — gerçek anlamda ileri
üretken algoritma; deterministik tohumla tekrar edilebilir.

### A2.3 Mimari & fazlar

- `assets/js/holo/grammar.js` — **saf** motor: `(gramer, tohum) → sahne tarifi`
  (JSON: parça listesi + dönüşümler). three.js'ten bağımsız → birim test
  edilebilir.
- `holo/index.html` mevcut `PROC_BUILDERS` deseni gramer tarifini three.js
  mesh'lerine çeviren tek bir `buildFromGrammar(desc)` ile beslenir.
- Gramer verisi `assets/data/relic-grammars.json` (tapınak / şehir / anıt /
  kozmos aileleri).
- **Faz 1:** grammar.js + mevcut 3 yapıyı gramere port et (davranış-eşdeğer).
- **Faz 2:** "GÜNÜN PROSEDÜREL KALINTISI" — günlük tohumdan varyant; holo
  rayında `◆` işareti (günlük kart deseni).
- **Faz 3:** WFC şehir planı; parametre uzayını genişlet (yükseklik dağılımı,
  simetri, aşınma).

Doğrulama (D5): saf gramer/WFC birim testleri (determinizm: aynı tohum → aynı
tarif; WFC çelişki/backtrack; sınır kutusu makul). RSS/changelog.

---

## B1. Yerel Anlamsal Arama — Offline `find` / `ara`

> Oracle (AI) Worker'dan geçer ve maliyetlidir. Buna karşılık **tüm metinsel
> içerikte** (makaleler, ruins, komut yardımı, oda açıklamaları) çalışan,
> build-time'da indekslenmiş, tarayıcıda **offline ve bedava** bir arama.

**Algoritma — hibrit sıralama.**
- **Lexical:** BM25 (build-time ters indeks; küçük). Tam kelime/ek eşleşmesi.
- **Anlamsal (ops):** build-time üretilen **64-boyut kuantize (int8) gömüler**;
  tarayıcı birkaç yüz vektörde kosinüs (önemsiz). Product quantization payload'ı
  minik tutar (D6). AI runtime maliyeti yok (gömüler önceden, offline üretilir).
- **Füzyon:** Reciprocal Rank Fusion — `score(d) = Σ 1/(k + rank_i(d))` — lexical
  + anlamsal sıralamayı tek listede birleştirir. ANN gerekmez (ölçek küçük).

Yüzey: terminal `find <sorgu>` / `ara`, sonuçlar rota linkleriyle. `search.js`
modülü (D3), indeks `assets/data/search-index.json` (runtime-cache).
Fail-closed: indeks yoksa "arama indeksi hazır değil" (D2).

---

## B2. Yaşayan Harita — Presence Sürümlü Sinyal İklimi

> Sinyal Atlası'nın (A1) görselleştirmesi statik değil, **canlı presence
> yoğunluğu + günlük tohumla** evrilen bir "sinyal iklimi" olur.

**Algoritma — reaksiyon-difüzyon (Gray-Scott) veya totalistik hücresel
otomat.** Atlas düğüm-ızgarası üstünde küçük bir PDE/CA: presence yoğunluğu
"besleme" terimini sürer; desenler organik olarak kayar (leke, dalga,
Turing deseni). Presence yoksa **deterministik günlük tohumla** aynı iklim
(D1/D2). Offline çalışır; ağır değil (küçük ızgara, birkaç yüz hücre).

Mevcut ortak ekran koruyucu + presence HUD'a (yenilik-kuyruğu) doğal bağlanır.

---

## B3. Deterministik Co-op Netcode — Crude Buster Rollback

> Crude Buster co-op'u bugün durum-yayınına dayanıyor. **Rollback lockstep**
> (GGPO tarzı) mimarisi gecikmede tutarlılık ve akıcılık getirir.

**Mimari + algoritma.** Sabit-nokta **deterministik simülasyon**; ağda yalnız
**girdi** senkronu (Supabase Realtime). Geç gelen uzak girdide **rollback +
yeniden simülasyon**: yerel tahmin ilerler, gerçek girdi gelince o kareye dönüp
yeniden oynatılır. Girdi gecikme tamponu + onaylı kare (confirmed frame).
Deterministik sim → aynı girdiler her iki tarafta aynı sonuç.

Not: En yüksek eforlu / en riskli dilim (fizik determinizmi, sabit-nokta
matematik). Bilinçli olarak **sona** konur; flagship oyunun kalitesini
belirgin yükseltir.

---

## B4. Ekol Aynası — Bayesçi Aktif Öğrenme Uzantısı

> Mevcut [Ekol Matrisi](stratejik-ekol-matrisi.md) motoru kosinüs benzerliği +
> açgözlü (greedy) diskriminatör soru seçimi kullanıyor. Uzantı: **inanç durumu
> (belief state)** + **beklenen bilgi kazancıyla** soru seçimi.

**Algoritma — hesaplamalı uyarlanır test (CAT/IRT ruhu).** Ziyaretçinin
konumu ekol-uzayında bir olasılık dağılımı olarak tutulur (Dirichlet/Gauss
inanç). Her aday sorunun **beklenen karşılıklı bilgisi** (mutual information /
beklenen entropi düşüşü) hesaplanır; en çok belirsizlik azaltan soru sorulur.
Mevcut belgedeki "entropiyi en çok düşüren dal" sezgisini **ilkeli** hale
getirir; daha az soruda daha keskin ekol. Mevcut tasarımı değiştirmez, üstüne
bir olasılık katmanı ekler.

---

## 7. Önceliklendirme ve Önerilen Sıra

Değer/efor/risk (§0 matrisi) + DNA uyumu + "bir öncekine yaslanma":

1. **A1 — Sinyal Atlası (Faz 1–2).** En yüksek ürün etkisi (keşif problemi,
   teknik raporun 1 numaralı bulgusu), düşük risk (additif, offline, backend
   yok), N3 "Yaşayan Atlas" hedefini gerçekler. **Başlangıç burası.**
2. **A2 — Prosedürel Kalıntı Grameri.** Bugünün prosedürel holo işine doğrudan
   yaslanır; üretim-bakım makasını kapatır; novelty yüksek, risk düşük.
3. **B1 — Yerel Anlamsal Arama.** Ucuz, offline, `find`i gerçekten kullanışlı
   yapar; A1 grafiğiyle veri paylaşır (etiketler/komşuluk).
4. **B2 — Yaşayan Harita.** A1 görselini canlandırır; presence katmanına oturur.
5. **B4 / B3.** B4 düşük riskli düşünsel derinlik; B3 en yüksek efor/risk, en
   sona.

Her dilim: D3 modül deseni · D5 doğrulama ritüeli (`?v=`+SW bump, `npm run
check`, headless + canlı kabul, changelog + `signals.xml`) · D1/D2 deterministik
+ fail-closed. Hiçbiri framework değişimi veya yeni gizli sır gerektirmez.

---

## 8. Sonraki Adım

Bu belge ontoloji/tasarım katmanıdır. Kullanıcı bir amiral gemisi seçince
(öneri: **A1 Faz 1**), o dilim için ayrı bir uygulama handoff'u açılır
(net-bulmaca deseninde: kilitli kararlar + faz planı + kod), sonra faz faz
kodlanır. Fikir havuzu güncellemesi [Yenilik Kuyruğu Handoff](yenilik-kuyrugu-handoff.md)
§0'a; backlog işareti [Product Owner Plan](product-owner-plan.md)e işlendi.
