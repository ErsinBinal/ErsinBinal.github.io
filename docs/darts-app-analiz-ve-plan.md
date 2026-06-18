# Convivium Darts — Analiz ve Uygulama Planı

> **Amaç:** Mevcut `dart-skorbord` prototipini, sıfırdan kurulacak **bağımsız bir
> dart uygulamasına** dönüştürmek. Bu doküman hem mevcut kodun analizini hem de
> yeni ürünün gereksinim + mimari + veri modeli + yol haritasını içerir.
>
> **Karar bağlamı (kullanıcı tercihleri):**
> - Frontend: *öneri bekleniyor* → bu dokümanda kıyaslanıp seçildi.
> - Backend: *öneri bekleniyor* → bu dokümanda kıyaslanıp seçildi.
> - Konum: **Yeni bağımsız repo.** Eski prototipten yalnızca bilgi + şema taşınır.
> - Format: Analiz + uygulama planı (tek kapsamlı doküman).
>
> Tarih: 2026-06-18 · Sahip: Ersin Binal

---

## 1. Yönetici Özeti

Mevcut prototip; tek HTML sayfası + vanilla JS ile yazılmış, **iki slotlu (RED/BLUE)
501 dart skorbordudur.** Supabase Auth + RLS üzerinde atış-bazlı istatistik kaydeder,
beş sabit isimli CPU rakip içerir ve manuel/keypad skor girişi sunar. Oyun çekirdeği
(bust kuralı, checkout tablosu, tur/ortalama hesapları, atış granülerliği) sağlam ve
**yeniden kullanılmaya değer.**

Yeni ürün bunun üzerine şunları ekleyecek: **online çok oyunculu oyun, çoklu oyun
modu (X01, Around the Clock, Bob's 27, Turnuva), CPU zorluk seviyeleri, görsel dart
tahtası üzerinden skor girişi ve derin istatistik dashboard'u.** Temel mimari ilkesi:
**UI'dan bağımsız, saf (headless) bir oyun motoru** — aynı motor hot-seat, CPU ve
online senkronu besler.

---

## 2. Mevcut Durum Analizi (devralınan prototip)

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

### 2.2 Oyun çekirdeği (çalıştığı kanıtlanmış — TAŞINACAK)

- **501 mantığı:** Slot başına kalan skor, tur başına 3 ok, `currentSetDarts` dizisi,
  `turn_total` toplama.
- **Bust kuralı:** Kalan `< 0` **veya** `== 1` → tur başı skora (`currentTurnStartScore`)
  geri dönülür, sıra rakibe geçer, bust sayacı artar. *(Not: mevcut sürüm yalnızca
  "straight-out" mantığında; double-out kuralı yok.)*
- **Checkout = tam 0.** Kazanan atış `is_winning_throw` ile işaretlenir.
- **Checkout öneri tablosu:** 170→2 arası kalan skorlar için rota önerileri
  (`170: T20-T20-BULL`, `100: T20-D20`, `50: BULLSEYE`, `40: D20` …). ≤170 ama tabloda
  olmayan skorlar için "Setup shot düşünün" mesajı.
- **Tur akışı:** 3 ok dolunca skora göre overlay (`Perfect 180`, `Harika set`,
  `Düşük set`) gösterilir, sıra ilerler. `advanceTurn()` sırayı çevirir, CPU sırasını
  planlar.
- **Undo:** Her oktan önce `snapshot()` ile derin kopya alınır; `history` üzerinden geri
  alma. (Kalıcılaştırılmış maçta ve CPU oyunda devre dışı.)

### 2.3 İstatistik / veri kaydı (TAŞINACAK granülerlik)

- **Atış-bazlı kayıt (`throwRecords`):** her ok için `player_slot`, `turn_number`,
  `dart_number`, `dart_value`, `turn_total`, `remaining_score`, `is_bust`,
  `is_winning_throw`, `thrown_at`. Bu granülerlik derin istatistik (heatmap, checkout %)
  için **kritik** — koru ve tüm modlara genelle.
- **Oyuncu istatistikleri:** `totalScored`, `totalDarts`, `turnsCount`, `highestTurn`,
  `oneEighties`, `busts`. Ortalama = `3 × totalScored / totalDarts`.
- **Maç özeti (`summary` JSON):** kazanan slot, oyuncu başına özet metrikler,
  `totalThrows`, `completedAt`.

### 2.4 CPU motoru (YENİDEN PARAMETRİZE EDİLECEK)

- 5 sabit oyuncu: Littler (2025), Humphries (2024), M. Smith (2023), Wright (2022),
  Price (2021). Her biri `trebleRate`, `doubleRate`, `pressureBoost` taşır.
- `cpuSimDart()`: her oku tek tek üreten olasılıksal model. Kalan skor checkout
  bölgesindeyse (== 50 ya da 2–40 çift) double bitirme olasılığı ayrı hesaplanır;
  değilse treble-20 ağırlıklı dağılım. Rakip ≤50'deyken `pressureBoost` devreye girer.
- `scheduleCpuTurn()` / `playCpuDarts()`: `cpuTurnToken` ile yarış koşulu koruması,
  oklar arası gecikmeli (680ms) animasyon hissi.
- **Eksik:** Zorluk seviyesi yok (oyuncular sabit), gerçek 2D tahta sapması yok (sadece
  puan dağılımı), sektör ID kaydı yok.

### 2.5 Kimlik & kalıcılık (DEĞİŞTİRİLECEK)

- **İki scoped Supabase client** aynı tarayıcıda iki ayrı oturum tutar
  (`dart-red-session`, `dart-blue-session`) → yerel "iki kişi tek cihaz" senaryosu.
- Maç bitince: en az bir gerçek kullanıcı varsa `dart_matches` + ilgili oyuncunun
  `dart_throws` satırları yazılır. CPU/misafir için `opponent_type` (`human`/`cpu`/`guest`)
  ve `opponent_label`.
- **RLS:** Katılımcı okur/yazar, admin siler deseni. `is_admin()` yardımcı fonksiyonu.

### 2.6 Bilinen sınırlar / teknik borç

1. **Online yok** — yalnızca tek cihaz (hot-seat) veya CPU.
2. **Tek oyun modu** — sadece 501, leg/set yapısı yok, double-out yok.
3. **Görsel tahta yok** — giriş soyut sayı (0–60) üzerinden.
4. **CPU zorluk seçici yok** ve sapma modeli gerçekçi değil.
5. **Sektör verisi yok** — heatmap / hedef-isabet analizi imkânsız.
6. **Mimari monolit** — oyun mantığı, UI ve backend tek IIFE içinde; test edilemez.
7. **Çift-oturum hilesi** — gerçek online yerine tarayıcıda iki oturum; ölçeklenmez.

### 2.7 Web Audio / SFX notu (taşınacak yaklaşım)

Prototip `window.ConviviumAudio?.play?.(name)` ile ses ipuçları çalıyor
(`app.score`, `app.highScore`, `game.bust`, `game.win`, `game.power`, `app.undo`,
`app.reset`, `app.notify`, `app.denied`). Yeni üründe ses katmanını koru; ön-render
edilmiş buffer mimarisi ve iOS sessize-alma davranışı bilinen kısıt
(bkz. proje hafızası: sfx pre-render architecture).

---

## 3. Yeni Ürün Hedefi

Tek başına çalışan (web + PWA, ileride mobil sarmalanabilir), hesap tabanlı,
**online ve CPU'ya karşı oynanabilen, çoklu oyun modlu, derin istatistikli** bir dart
uygulaması. Misafir modunda tam oynanabilir; giriş yapınca her şey buluta kaydedilir.

**Tasarım ilkeleri**
- **Headless engine first:** Tüm oyun kuralları UI'dan ve ağdan bağımsız saf modülde.
- **Otoriter sunucu (online):** İstemci "şu segmente attım" der; skoru sunucu doğrular.
- **Granüler veri:** Her ok segment ID'siyle kaydedilir (heatmap + analiz için).
- **Erişilebilir & mobil-öncelikli:** Dokunmatik tahta, aria-live skor duyuruları.

---

## 4. Teknoloji Seçimi (öneri + gerekçe)

### 4.1 Frontend → **Öneri: SvelteKit + Vite**

| Kriter | React + Vite | SvelteKit | Vanilla JS (devam) |
|---|---|---|---|
| Öğrenme/geçiş (mevcut vanilla'dan) | Orta | **Kolay** | En kolay |
| Boilerplate / paket boyutu | Yüksek | **Düşük** | En düşük |
| Reaktif state (skor/turn) | İyi | **Çok iyi** | El emeği |
| SVG dart tahtası reaktivitesi | İyi | **Çok iyi** | Zahmetli |
| Ekosistem / işe alım | **En geniş** | Orta | — |
| PWA + SSR/lobi sayfaları | Manuel | **Dahili (SvelteKit)** | Manuel |

**Karar:** **SvelteKit.** Gerekçe — uygulamanın kalbi yoğun reaktif state (skorlar,
sıra, 3 ok rozeti, tahta üzerinde anlık segment vurgusu) ve interaktif SVG. Svelte'in
reaktivitesi bu işi en az kodla, vanilla sezgisine yakın bir biçimde çözer; SvelteKit
lobi/dashboard sayfaları, PWA ve dağıtım hattını hazır getirir. (React de geçerli bir
alternatiftir; ekip/işe-alım önceliği yüksekse React'e dön. Vanilla JS, online senkron
yükü nedeniyle önerilmez.)

> **Esneklik:** Oyun motoru framework'ten tamamen bağımsız saf TypeScript yazılacağı
> için frontend seçimi sonradan değişse bile motor aynen taşınır.

### 4.2 Backend → **Öneri: Supabase + (online için) Edge Functions; ölçek artarsa Cloudflare Durable Objects**

| İhtiyaç | Çözüm |
|---|---|
| Auth, profil, kalıcılık, RLS | **Supabase Postgres + Auth** (mevcut yatırımı korur) |
| İstatistik agregasyonu | Postgres view / RPC (materialized view ile hızlandırılabilir) |
| Online maç senkronu (MVP) | **Supabase Realtime** (Presence + Broadcast) |
| Otoriter skor doğrulama / matchmaking | **Supabase Edge Functions** (Deno) |
| Yüksek eşzamanlı oda / düşük gecikme (ileride) | **Cloudflare Durable Objects** (oda başına tek otorite) |

**Karar:** MVP'de **Supabase Realtime + Edge Functions** yeterli ve en az sürtünmeli;
mevcut şema/RLS deseni doğrudan genişletilir. Online ölçeği büyürse (turnuvalar, çok
sayıda eşzamanlı oda, anlık state otoritesi) oda mantığını **Cloudflare Durable Objects**'e
taşıyacak şekilde, online katmanı arayüz arkasına (adapter) soyutla. *Bu repoda
Cloudflare Workers/Wrangler altyapısı zaten mevcut* — ikinci faz için doğal uyum.

### 4.3 Repo & dağıtım

- **Yeni bağımsız repo** (örn. `convivium-darts`). Eski prototipten yalnızca bilgi +
  SQL şeması taşınır.
- Yapı (öneri):
  ```
  /src
    /engine        → saf TS oyun motoru (X01, AroundClock, Bobs27, turnuva)
    /engine/cpu    → CPU sapma modeli + zorluk kalibrasyonu
    /lib/board     → SVG dart tahtası bileşeni + segment geometrisi
    /lib/online    → realtime adapter (Supabase impl + ileride DO impl)
    /routes        → SvelteKit sayfaları (oyun, lobi, dashboard, turnuva)
    /lib/supabase  → client + RLS-uyumlu sorgular
  /supabase/migrations
  /tests           → engine birim testleri (Vitest)
  ```
- **PWA:** offline misafir modu, service worker, kurulabilir manifest.
- **Tema:** Convivium koyu/neon estetiği (theme-color `#0f172a`, kicker tipografi) ama
  bağımsız ürün kimliği.

---

## 5. Oyun Modları

Tüm modlar ortak `GameEngine` arayüzünü uygular (strateji deseni). Çekirdek imza
(TypeScript taslağı):

```ts
interface DartThrow { segment: Segment; value: number; multiplier: 1|2|3; }
interface GameEngine {
  mode: GameMode;
  applyDart(input: DartThrow): EngineEvent[];   // bust/win/turn-end olaylarını döndürür
  undo(): void;
  currentPlayer(): PlayerId;
  getCheckoutHint(): string | null;
  isLegOver(): boolean;
  isMatchOver(): boolean;
  serialize(): EngineState;                       // online senkron + replay + recovery
  static deserialize(state: EngineState): GameEngine;
}
```

### 5.1 X01 (301 / 501 / 701) — çekirdek
- Seçenekler: başlangıç skoru; **double-in / double-out** (aç/kapat); **leg & set**
  yapısı (best-of-N legs / sets); straight-out.
- Bust kuralını double-out'a göre genişlet: kalan `1` veya double ile bitirilemeyen
  durum → bust. (Mevcut tablo `40→D20`, `50→BULLSEYE` zaten double-out uyumlu.)

### 5.2 Around the Clock (Around the World)
- 1→20→Bull sırayla hedef vurma yarışı; ilk bitiren kazanır.
- Varyantlar: yalnız single / her hedefte single→double→treble zorunluluğu.
- Tahta girişi doğal: oyuncu hedeflediği sektörü gösterir, isabet sayacı ilerler.

### 5.3 Bob's 27 (çift antrenmanı)
- D1→D20→Bull sırayla; her hedefte 3 ok. İsabet `+2×numara`, hepsi ıska `−2×numara`.
- 27 puanla başla; toplam 0'ın altına düşerse elenirsin.
- Tek kişilik antrenman + kişisel rekor / skor tablosu.

### 5.4 Turnuva (Tournament)
- Single/double elimination bracket **veya** round-robin lig.
- Online: lobiye katılanları otomatik eşleştir; bot dolgusu opsiyonu.
- Her maç bir X01 (yapılandırılabilir leg/set). Bracket görselleştirme, tur ilerleme,
  şampiyon ekranı. **Durum kalıcı** (kapatılıp dönülebilir).

### 5.5 Genişletilebilirlik
- Cricket, Shanghai, Halve-It için motor arayüzü açık kalsın (kapsam dışı, mimaride yer
  ayır).

---

## 6. Skor Girişi — Görsel Tahta + Klasik

Varsayılan giriş **interaktif SVG dart tahtası** olacak; klasik keypad ikincil kalacak.

- **SVG tahta:** 20 sektör + single/double/treble halkaları + outer/inner bull.
  Dokun/tıkla → segment değeri otomatik (T20=60, D16=32). Vurulan segment görsel
  işaretlenir; 3 ok rozeti dolar; tahta dışı = MISS.
- **Multiplier modu:** Önce halka (S/D/T) sonra sektör seçimi de mümkün olsun.
- **Klasik keypad:** Mevcut 0–60 / D20 / T20 / BULL / D-BULL kısayolları (toggle).
- **Klavye / manuel:** Erişilebilirlik ve hız için kalsın.
- **Segment kaydı:** Her ok için *hedeflenen* ve *vurulan* segment ID kaydedilir
  (heatmap + CPU kalibrasyonu için).

---

## 7. CPU — Zorluk Seviyeli

Mevcut 5 isimli oyuncuyu **avatar/tema** olarak koru; ortogonal bir **zorluk ekseni** ekle.

- **Seviyeler:** `Beginner / Amateur / Pro / Legend` (veya 1–5 yıldız). Her seviye
  `trebleRate`, `doubleRate`, `pressureBoost` ve **hedef sapmasını** ölçekler.
- **3-dart average hedefiyle kalibrasyon:** Beginner ~40, Amateur ~60, Pro ~85,
  Legend ~100+. Parametreler bu hedefe göre türetilir.

  | Seviye | Hedef 3-dart avg | Sapma (σ, mm eşdeğeri) | Treble eğilimi |
  |---|---|---|---|
  | Beginner | ~40 | yüksek | düşük |
  | Amateur | ~60 | orta-yüksek | orta |
  | Pro | ~85 | düşük | yüksek |
  | Legend | ~100+ | çok düşük | çok yüksek |

- **Gerçek 2D sapma:** Hedeflenen segment + Gauss dağılımıyla komşu segmentlere kayma
  (yalnız olasılık tablosu değil). Bu, heatmap'i ve "hedef vs isabet" analizini anlamlı
  kılar.
- **Checkout zekâsı:** Kalan skora göre en iyi bitiş rotasını seç (checkout tablosunu
  kullan); zorluk arttıkça doğru setup atışları.
- **Mod uyumu:** CPU her moda uyarlanır (Around the Clock'ta sıradaki hedef, Bob's 27'de
  çiftler).

---

## 8. Online Oyun

- **Profil:** kullanıcı adı, avatar, ülke/bayrak (ops.), ayarlar.
- **Lobi:** oda oluştur / koda göre katıl / hızlı eşleşme. Mod + kuralları kurucu belirler.
- **Realtime senkron:** Presence (kim çevrimiçi/sırada), Broadcast (atışlar). Bağlantı
  kopması → reconnect + sunucu otoriteli state recovery (`serialize()`/`deserialize()`).
- **Anti-hile:** Skor değişimini Edge Function doğrular; istemci yalnız segment bildirir,
  kalan skoru sunucu hesaplar.
- **Akışlar:** rakip ayrıldı / teslim oldu, hızlı emoji/sohbet (ops.).
- **Çevrimdışı modlar:** Hot-seat ve CPU online olmadan da tam çalışır.

---

## 9. İstatistik & Dashboard

Atış-bazlı veriden zengin dashboard:

- **Genel kartlar:** 3-dart average, first-9 average, checkout %, en yüksek checkout,
  180 sayısı, 140+/100+ tur sayıları, bust oranı, kazanma oranı, en uzun galibiyet serisi.
- **Trend grafikleri:** zaman içinde ortalama, son N maç formu.
- **Tahta heatmap'i:** segment ID kaydından isabet yoğunluğu.
- **Checkout istatistikleri:** denenen/başarılan finişler, double başarı yüzdesi
  (hedef-hedef bazında).
- **Mod bazlı:** X01 / Around the Clock / Bob's 27 kişisel rekorlar.
- **Maç geçmişi:** rakip (insan / CPU+seviye / misafir), mod, sonuç, ortalama, süre,
  **adım adım replay** (atış kayıtlarından).
- **Karşılaştırma / liderlik tablosu:** arkadaş veya global.

---

## 10. Veri Modeli (Postgres / Supabase, RLS ile)

Mevcut şemayı genişlet:

- **`profiles`** — `user_id`, `username`, `avatar`, `country`, `settings` (jsonb).
- **`matches`** — mevcut `dart_matches` +
  `mode`, `rules` (jsonb: double_in/out, legs, sets), `is_online`, `room_id`,
  `opponent_difficulty` (CPU için). Oyuncu yapısını 2+ oyuncuya hazır kur.
- **`legs` / `sets`** — çoklu-leg yapısı için maç altı ara tablolar.
- **`throws`** — mevcut `dart_throws` +
  `segment` (`T20`, `D16`, `S5`, `OUTER_BULL`, `INNER_BULL`, `MISS`),
  `target_segment` (hedeflenen), `mode`.
- **`tournaments`, `tournament_participants`, `tournament_matches`** — bracket / lig.
- **Agregasyon:** Postgres view veya RPC (yoğun ekranlar için materialized view).
- **RLS:** Mevcut "katılımcı okur/yazar, admin siler" desenini tüm yeni tablolara uygula.
  Online maçlarda yazma yetkisi Edge Function / service role tarafından kontrol edilir
  (istemci doğrudan skor yazamaz).

### 10.1 Migrasyon notları
- Eski `dart_matches` / `dart_throws` verisini (varsa) yeni şemaya taşıyan SQL yaz;
  eksik kolonlara default ver (`mode='x01'`, `segment=null`, `rules` boş obje).
- Eski **iki-scoped-client** yerel oturum yaklaşımını **bırak**; tek hesap +
  online/CPU/hot-seat modeline geç.

---

## 11. Yol Haritası (Milestone'lar)

| # | Milestone | Kapsam | Çıktı |
|---|---|---|---|
| **M1** | Çekirdek motor (headless) | X01 + Around the Clock + Bob's 27 saf TS engine + Vitest birim testleri | Test edilebilir, UI'sız motor |
| **M2** | UI + SVG tahta girişi | SvelteKit iskeleti, interaktif tahta, hot-seat oynanabilir | Tek cihaz oynanabilir sürüm |
| **M3** | CPU + zorluk seviyeleri | 2D sapma modeli, 4 seviye kalibrasyonu, checkout zekâsı | CPU'ya karşı tam oyun |
| **M4** | Auth + kalıcılık + dashboard | Supabase entegrasyonu, segmentli atış kaydı, istatistik ekranları | Bulut kayıtlı, dashboard'lu sürüm |
| **M5** | Online | Lobi, Realtime, Edge Function otorite, reconnect/recovery | Online çok oyunculu |
| **M6** | Turnuva + cila | Bracket/lig, liderlik tablosu, replay, PWA, ses cilası | Tam ürün |

---

## 12. Kalite, Erişilebilirlik & Kısıtlar

- **Erişilebilirlik:** klavye girişi, `aria-live` skor duyuruları, yeterli kontrast,
  dokunmatik hedef boyutu.
- **Mobil-öncelikli:** tahta hassasiyeti, başparmakla erişilebilir kontroller.
- **Test:** saf motor için kapsamlı birim testleri; online akışlar için entegrasyon
  testleri; bust/checkout/double-out kenar durumları öncelikli.
- **Ses:** Convivium SFX cue'larını koru (score / highScore / bust / win / power / undo).
  Ön-render buffer mimarisi + iOS sessize-alma kısıtı bilinir.
- **Güvenlik:** Online'da otoriter doğrulama; RLS her tabloda; istemciye güvenme.

---

## 13. Açık Sorular (ürün kararı bekleyenler)

1. **Leg/set varsayılanı:** Online maçlar varsayılan kaç leg/set? (öneri: best-of-5 legs)
2. **Double-out varsayılan mı?** (Resmî dart standardı double-out; ama yeni başlayanlar
   için straight-out seçeneği önerilir.)
3. **Liderlik tablosu kapsamı:** global mi, arkadaş-bazlı mı, her ikisi mi?
4. **Matchmaking:** beceriye göre (ELO benzeri) eşleştirme istenir mi, yoksa açık lobi mi?
5. **Mobil:** uzun vadede React Native / Capacitor sarmalama hedefleniyor mu? (frontend
   kararı buna göre gözden geçirilebilir.)
