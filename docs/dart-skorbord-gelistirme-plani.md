# Dart Skorbord — Site Sürümü Geliştirme Planı

> **Amaç:** `ersinbinal.github.io` sitesindeki mevcut `dart-skorbord` deneyimini
> **yerinde geliştirmek** — bağımsız bir uygulamaya dönüştürmek değil. Özellikler
> mevcut vanilla JS + Supabase mimarisine kademeli olarak eklenir.
>
> **Not (karar geçmişi):** Önce bağımsız bir app planlanmış, sonra bundan vazgeçilip
> site sürümünü geliştirmeye karar verilmiştir. Bağımsız app için yazılan headless
> oyun motoru (TypeScript) **referans/port kaynağı** olarak `convivium-darts`
> (private repo: `ErsinBinal/convivium-darts`) içinde durur. Bu plan onu siteye
> taşıma fırsatlarını işaretler.
>
> Güncelleme: 2026-06-18 · Sahip: Ersin Binal

---

## 1. Yönetici Özeti

Mevcut `dart-skorbord.html` + `assets/js/dart-skorbord.js`; iki slotlu (RED/BLUE) 501
dart skorbordudur. Supabase Auth + RLS üzerinde atış-bazlı istatistik kaydeder, beş
sabit CPU rakip içerir, manuel/keypad skor girişi sunar. Oyun çekirdeği (bust kuralı,
checkout tablosu, ortalama/tur hesapları, atış granülerliği) sağlamdır.

Bu plan, mevcut yapıyı bozmadan şu geliştirmeleri **siteye** ekler: CPU zorluk
seviyeleri, yeni oyun modları (Around the Clock, Bob's 27, leg/set'li 501, turnuva),
görsel dart tahtası üzerinden skor girişi, daha derin istatistik dashboard'u ve —
isteğe bağlı/ileride — gerçek zamanlı online oyun.

**Mimari ilke:** Geliştirmeden önce oyun mantığını `dart-skorbord.js` içindeki UI/
backend kodundan ayır; UI'dan bağımsız bir **oyun motoru modülü** çıkar. Bu, yeni
modları ve testleri mümkün kılar ve `convivium-darts` reposundaki hazır motorun port
edilmesine zemin hazırlar.

---

## 2. Mevcut Durum Analizi

### 2.1 Dosya envanteri

| Dosya | Rol |
|---|---|
| `dart-skorbord.html` | Skorbord arayüzü, oturum kartları, keypad, overlay |
| `assets/js/dart-skorbord.js` | Tüm oyun mantığı + CPU + Supabase kalıcılık (IIFE, ~790 satır) |
| `assets/css/dart-skorbord.css` | Skorbord stilleri |
| `docs/database/2026-06-01-dart-skorbord.sql` | `dart_matches` + `dart_throws` şeması + RLS |
| `docs/database/2026-06-12-dart-solo-matches.sql` | Tekli oyuncu (CPU/misafir) için kısıt gevşetme migrasyonu |
| `assets/js/supabase-client.js` | Backend yardımcıları (`createDartMatchWithClient`, `saveDartThrowsWithClient`, `fetchUserDartStats`) |
| `dashboard.html` + `assets/js/dashboard.js` | Dart istatistiklerinin gösterimi |

### 2.2 Oyun çekirdeği (çalışıyor — KORUNACAK, refactor edilecek)

- **501 mantığı:** Slot başına kalan skor, tur başına 3 ok, `currentSetDarts`, `turn_total`.
- **Bust kuralı:** Kalan `< 0` veya `== 1` → tur başı skoruna dönülür, sıra rakibe.
  *(Şu an straight-out; double-out yok.)*
- **Checkout = tam 0.** Kazanan atış `is_winning_throw` ile işaretlenir.
- **Checkout öneri tablosu:** 170→2 arası rotalar (`170: T20-T20-BULL`, `100: T20-D20`,
  `50: BULLSEYE`, `40: D20` …). Tablo dışı ≤170 için "Setup shot düşünün".
- **Undo:** Her oktan önce `snapshot()` ile derin kopya; `history` üzerinden geri alma.

### 2.3 İstatistik / veri kaydı (granülerlik KORUNACAK)

- **Atış-bazlı kayıt:** her ok için `player_slot`, `turn_number`, `dart_number`,
  `dart_value`, `turn_total`, `remaining_score`, `is_bust`, `is_winning_throw`, `thrown_at`.
- **Oyuncu istatistikleri:** `totalScored`, `totalDarts`, `turnsCount`, `highestTurn`,
  `oneEighties`, `busts`. Ortalama = `3 × totalScored / totalDarts`.
- **Maç özeti (`summary` JSON):** kazanan slot, oyuncu özetleri, `totalThrows`, `completedAt`.

### 2.4 CPU motoru (GELİŞTİRİLECEK)

- 5 sabit oyuncu (Littler→Price), her biri `trebleRate`/`doubleRate`/`pressureBoost`.
- `cpuSimDart()` her oku olasılık tablosuyla üretir; checkout bölgesinde double bitirme
  ayrı hesaplanır; rakip ≤50'deyken `pressureBoost`.
- **Eksik:** Zorluk seçici yok, gerçek 2D tahta sapması yok, sektör ID kaydı yok.

### 2.5 Kimlik & kalıcılık

- Aynı tarayıcıda **iki scoped Supabase client** (RED/BLUE) → yerel hot-seat.
- Maç bitince en az bir gerçek kullanıcı varsa `dart_matches` + `dart_throws` yazılır.
  CPU/misafir için `opponent_type` / `opponent_label`.
- RLS: katılımcı okur/yazar, admin siler.

### 2.6 Bilinen sınırlar (bu planın hedefleri)

1. Tek oyun modu (sadece 501), leg/set yok, double-out yok.
2. CPU zorluk seçici yok, sapma modeli gerçekçi değil.
3. Görsel tahta yok — giriş soyut sayı (0–60).
4. Sektör verisi yok → heatmap/hedef analizi yapılamıyor.
5. Online yok (yalnız hot-seat/CPU).
6. Oyun mantığı tek IIFE içinde UI+backend'e gömülü → test edilemez, yeni mod eklemek zor.

---

## 3. Geliştirme İlkeleri (siteye özgü)

- **Mevcut yığını koru:** Vanilla JS + Supabase. Yeni framework/derleme zinciri **yok**;
  ES modülleriyle ilerle (site zaten `defer` script'ler kullanıyor).
- **Önce ayrıştır (refactor):** `dart-skorbord.js` içindeki saf oyun kurallarını
  `assets/js/dart/engine.js` (ve mod dosyaları) gibi UI'dan bağımsız modüllere taşı.
  Bu, `convivium-darts` reposundaki TS motorunun port edilmesini kolaylaştırır.
- **Geriye dönük uyum:** Mevcut Supabase şeması ve dashboard çalışmaya devam etsin;
  yeni kolonlar `default`'lu ve opsiyonel eklensin.
- **Aşamalı teslim:** Her faz tek başına siteye deploy edilebilir olmalı.

---

## 4. Geliştirme Fazları

### Faz A — Motoru ayrıştır (temel refactor)
- `dart-skorbord.js` içindeki kuralları saf modüllere çıkar: skor/bust/checkout/undo.
- `convivium-darts` reposundaki `src/engine` (board, checkout, x01) **port kaynağı**:
  TS'ten siteye uyumlu ES modüllerine (JS) dönüştür veya basit bir derleme adımıyla al.
- Çıktı: davranış aynı, ama mantık test edilebilir ve mod-eklenebilir.

### Faz B — Görsel dart tahtası girişi
- İnteraktif **SVG dart tahtası**: 20 sektör + S/D/T halkaları + outer/inner bull + MISS.
  Dokun/tıkla → segment değeri otomatik (T20=60, D16=32). Vurulan segment işaretlenir.
- Mevcut keypad + manuel giriş **ikincil** olarak kalsın (toggle).
- **Segment kaydı:** Her ok için sektör ID'sini de kaydet (`dart_throws.segment`) —
  heatmap ve hedef analizi için. `convivium-darts/src/engine/cpu/geometry.ts` tahta
  geometrisi (segment↔koordinat) bu SVG için doğrudan referans.

### Faz C — CPU zorluk seviyeleri
- Mevcut 5 oyuncuyu **avatar** olarak koru; ortogonal **zorluk ekseni** ekle:
  `Beginner / Amateur / Pro / Legend` (3-dart avg hedefleri ~40/60/85/100).
- Olasılık tablosu yerine (veya yanında) **geometrik 2D sapma modeli** kullan:
  hedefe nişan al + Gauss gürültüsü (σ). `convivium-darts/src/engine/cpu/model.ts` hazır.
- UI'da zorluk seçici ekle (CPU kartlarına).

### Faz D — Yeni oyun modları
Motor `mode` parametresiyle çoğullanır (Faz A'daki ayrıştırma sayesinde):
- **501 geliştirmeleri:** double-in/out seçeneği, **leg & set** (best-of-N).
- **Around the Clock:** 1→20→Bull; singles/doubles/trebles varyantları.
- **Bob's 27:** double antrenmanı, eleme kuralı, kişisel rekor.
- **Turnuva:** bracket/lig; her maç yapılandırılabilir 501. (Online'dan bağımsız, yerel
  turnuva ile başlanabilir.)
- Hepsinin motoru `convivium-darts` reposunda referans implementasyona sahip.

### Faz E — Derin dashboard
Mevcut `dashboard.html` / `dashboard.js` üzerine:
- 3-dart average, first-9 average, checkout %, en yüksek checkout, 180 sayısı,
  140+/100+ tur, bust oranı, kazanma oranı, galibiyet serisi.
- **Tahta heatmap'i** (Faz B'deki segment kaydından).
- Mod bazlı kişisel rekorlar, maç geçmişi + adım adım replay (atış kayıtlarından).
- Trend grafikleri (zaman içinde ortalama).

### Faz F — Online (opsiyonel/ileride)
- Supabase **Realtime** (Presence + Broadcast) ile lobi + maç senkronu.
- Otoriter skor doğrulama için **Edge Function** (anti-hile).
- Hot-seat ve CPU modları online olmadan çalışmaya devam etsin.
- *Not: Bu faz en yüksek eforlu olan; site için isteğe bağlı. Önce A–E daha yüksek değer.*

---

## 5. Veri Modeli Değişiklikleri (mevcut şema üzerine)

Mevcut `dart_matches` / `dart_throws` korunur; yeni kolonlar opsiyonel + default'lu:

- **`dart_matches`** + `mode` (default `'x01'`), `rules` jsonb (double_in/out, legs, sets),
  `opponent_difficulty` (CPU için), ileride online için `is_online` / `room_id`.
- **`dart_throws`** + `segment` (`T20`/`D16`/`S5`/`25`/`BULL`/`MISS`), opsiyonel
  `target_segment` (CPU heatmap için).
- Yeni modların skorları aynı `summary` JSON deseniyle saklanabilir; gerekirse
  mod-spesifik alanlar eklenir.
- Yeni migrasyon SQL'leri `docs/database/` altına eklenir (mevcut iki dosyanın deseniyle).
- RLS politikaları mevcut "katılımcı okur/yazar, admin siler" deseniyle uyumlu kalır.

---

## 6. Önceliklendirme (öneri)

| Sıra | Faz | Değer / Efor | Gerekçe |
|---|---|---|---|
| 1 | **B — Görsel tahta** | Yüksek değer / orta efor | En görünür kullanıcı iyileştirmesi; segment kaydını da açar |
| 2 | **C — CPU zorluk** | Yüksek değer / düşük efor | Hazır model var (`convivium-darts`), tek oyunculu deneyimi büyütür |
| 3 | **A — Refactor** | Orta değer / orta efor | B ve D için ön koşul; aslında 1'den önce kısmen gerekli |
| 4 | **D — Yeni modlar** | Yüksek değer / yüksek efor | Refactor sonrası açılır |
| 5 | **E — Dashboard** | Orta değer / orta efor | Veri biriktikçe (segment kaydı) anlam kazanır |
| 6 | **F — Online** | Yüksek değer / çok yüksek efor | İsteğe bağlı; en sona |

> Pratik sıra: küçük bir **A refactor**'ü ile başla (B ve C'nin temiz oturması için),
> sonra **B (görsel tahta)** ve **C (CPU zorluk)** ile gözle görülür değer üret.

---

## 7. Port Kaynağı: `convivium-darts` reposu

Bağımsız app fikri rafa kalktı ama yazılan headless motor **referans/port kaynağı**:

| Site ihtiyacı | Hazır referans (`ErsinBinal/convivium-darts`) |
|---|---|
| Çok modlu motor refactor'ü | `src/engine/{x01,around-the-clock,bobs27}.ts` |
| Görsel tahta segment geometrisi | `src/engine/cpu/geometry.ts` (segment↔koordinat) |
| CPU zorluk + 2D sapma | `src/engine/cpu/model.ts` (Beginner→Legend) |
| Checkout tablosu | `src/engine/checkout.ts` (siteyle aynı tablo) |
| Test deseni | `tests/*.test.ts` (39 test) |

TS → vanilla JS portu: ya basit tip-sıyırma (tsc ile `assets/js/dart/` altına derle),
ya da elle ES modülüne çevir. Site derleme zinciri istemiyorsa ikincisi tercih edilir.

---

## 8. Açık Sorular

1. **Görsel tahta önceliği:** İlk teslimat sadece tahta girişi mi olsun, yoksa CPU
   zorluk ile birlikte mi?
2. **Double-out:** Mevcut straight-out korunsun mu, double-out opsiyon olarak mı eklensin?
3. **Modlar:** Hangi yeni mod önce? (öneri: leg/set'li 501 + Around the Clock)
4. **TS portu:** Siteye küçük bir `tsc` derleme adımı eklemeye açık mısın, yoksa saf
   JS modülleri elle mi yazalım?
5. **Online:** Şimdilik kapsam dışı bırakıp A–E'ye mi odaklanalım?
