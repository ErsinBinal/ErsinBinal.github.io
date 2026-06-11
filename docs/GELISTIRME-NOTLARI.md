# Convivium — Geliştirme Notları

> İnceleme tarihi: 2026-06-11
> Kapsam: `index.html` (ana sayfa) ve doğrudan bağlı varlıklar
> (`home-protocol.js`, `home.css`, `service-worker.js`, `supabase-config.js`).

Bu döküman, ana sayfanın mevcut durumunun teknik incelemesini ve
önceliklendirilmiş geliştirme maddelerini içerir. Maddeler etki/çaba
oranına göre sıralanmıştır.

---

## 0. Genel İzlenim

Convivium, retro-terminal estetiğine sahip, bilinçli olarak *seçici* bir
kişisel indeks. Konsept bütünlüğü güçlü: `Origin → Index → Lab → Trace →
Map → Archive → Notes → Hidden` akışı bir hikâye gibi ilerliyor. Teknik
temel (CSP, OpenGraph, PWA, JSON-LD, preconnect/preload) düzgün kurulmuş.
Aşağıdaki notlar bu sağlam temeli kırılganlaştıran küçük tutarsızlıklara
odaklanır.

---

## 1. Kritik / Yüksek Öncelik

### 1.1 Service Worker ile sayfa arasında sürüm (`?v=`) uyuşmazlığı
**Durum:** `index.html` bazı varlıkları SW precache listesinden farklı
sürümle istiyor. Aynı dosya iki kez (iki ayrı cache anahtarıyla) iniyor;
kullanıcı bazen eski sürümü görebiliyor.

| Dosya | index.html | service-worker.js |
|---|---|---|
| `components.css` | `?v=30` | `?v=31` |
| `deb-companion.js` | `?v=4` | `?v=3` |
| `supabase-client.js` | `?v=21` | `?v=23` |

**Öneri:** Tek doğruluk kaynağı belirleyip iki dosyayı senkronla. Orta
vadede sürüm numaralarını elle yönetmek yerine build adımında
otomatikleştirmek (ör. dosya hash'i) hata riskini bitirir.

### 1.2 Çift / çakışan page-loader mantığı
**Durum:** `index.html` (sat. 73-77) içinde sabit `setTimeout(..., 4200)`
ile loader gizleniyor. Ama `home-protocol.js` (sat. 1-20) zaten daha
akıllı bir versiyon çalıştırıyor: `load` event'ine bağlı, `prefers-
reduced-motion` farkında, min. görünürlük + 3600ms tavan. Inline 4200ms
bu yüzden ya ölü kod ya da yavaşlatan ikinci bir fren.

**Öneri:** Inline scripti kaldır; loader'ı tek noktadan (home-protocol)
yönet. Inline'ın tek faydası "JS yüklenmeden önce de kapanma garantisi";
bu garanti istenirse CSS animasyonu ile verilebilir.

### 1.3 `supabase-config.js` içindeki anahtar (bilgi notu, hata değil)
**Durum:** `anonKey` repoda açık duruyor. Bu, Supabase *publishable/anon*
anahtarı olduğu için tasarımı gereği herkese açık; güvenlik RLS
politikalarıyla sağlanıyor (dosyadaki yorum da bunu söylüyor).
**Aksiyon:** Kod tarafında değişiklik gerekmez. Yalnızca Supabase
panelinde **Row Level Security** politikalarının gerçekten aktif ve sıkı
olduğundan emin ol. Aksi halde anon key ile veri sızabilir.

---

## 2. Orta Öncelik

### 2.1 Türkçe karakter standardı tutarsız
**Durum:** Bazı metinler tam Türkçe ("düşünceyi", "değiştirir"), bazıları
ASCII'leştirilmiş: "Uc Gunes", "sureler", "oneriler", "Erisim",
"Komut satırını ac", "skorlar". Aynı sayfada iki standart karışıyor.

**Öneri:** Tek standart (tam UTF-8 Türkçe) belirle ve tüm görünür kullanıcı
metnini ona çek. `aria-label` ve görünür metinlerin tamamı dahil.

### 2.2 `home-protocol.js` boyutu (124K / 3075 satır)
**Durum:** Ana sayfanın etkileşim katmanı tek devasa IIFE. Bakımı ve
parçalı yüklemesi zor. Tüm mantık ilk açılışta render-blocking olmasa da
parse maliyeti taşıyor.

**Öneri:** Acil değil. Orta vadede modüllere böl (loader, command-shell,
signal-map canvas, state) ve gerçekten gerekenleri `defer`/dynamic import
ile ayır.

### 2.3 Ana sayfada gereksiz olabilecek scriptler
**Durum:** `bugy-v2.js`, `bugy-v3-loader.js` (24K), `deb-companion.js`
(64K), `neon-sheep.js` (24K) ana sayfada yükleniyor. Bunlar görsel
"companion/oyuncak" katmanları; hepsi origin ekranında gerekli mi
netleştirilmeli. `phaser.min.js` (1.2M) index'te doğrudan referanslı
**değil** — iyi; ama bugy-v3-loader onu çağırıyorsa lazy olmalı.

**Öneri:** Hangi efektin görünür değer kattığını ölç; görünmeyenleri
`IntersectionObserver` ile ilk etkileşimde/scroll'da yükle.

### 2.4 Sinyal haritasında (Atlas) eksik düğüm
**Durum:** `#map` bölümündeki `atlas-grid`, `04 / Map` düğümünü kendi
içinde listelemiyor (00,01,02,03,05,06,07 var; 04 atlanmış). Küçük bir
tutarlılık boşluğu — kullanıcı haritada "şu an buradayım" düğümünü
göremiyor.

**Öneri:** `04 Map (you are here)` düğümünü ekle veya bilinçli atlandıysa
yorumla belgele.

---

## 3. Düşük Öncelik / İyileştirme

- **Cache-busting yönetimi:** `?v=17`, `?v=36` gibi sürümler elle artıyor.
  Çoğaldıkça 1.1'deki gibi kaymalar kaçınılmaz. Küçük bir script ile
  HTML+SW sürümlerini tek yerden basmak çözer.
- **`articles.css?v=3` SW'de var ama index.html'de yok:** Ana sayfada
  kullanılmıyorsa precache'te taşımanın anlamı sınırlı; gereksiz indirme.
- **Erişilebilirlik ince ayar:** Bazı dekoratif `command-trigger`
  butonları odak sırasında bağlam vermiyor; `aria-label`'lar gözden
  geçirilebilir.
- **`offline.html` fallback metni** SW içinde inline HTML olarak da var
  ("Internet baglantisi yok") — Türkçe karakter ve tek kaynak için
  `offline.html`'e yönlendirme yeterli olabilir.

---

## 4. Onaylanan Sağlam Noktalar (dokunma)

- SW precache listesindeki tüm dosyalar fiziksel olarak mevcut →
  `cache.addAll` atomik 404 hatası **yok**.
- CSP başlığı kapsamlı ve makul (`connect-src` yalnız workers.dev +
  supabase).
- Navigasyon isteklerinde "network-first", varlıklarda
  "stale-while-revalidate" stratejisi doğru kurgulanmış.
- `supabase-config.js` SW tarafında `no-store` ile servis ediliyor →
  config asla eski cache'den gelmiyor. İyi detay.

---

## 5. Önerilen İlk Adımlar (sıra)

1. **1.1** — Sürüm uyuşmazlıklarını senkronla (5 dk, yüksek etki).
2. **1.2** — Çift loader'ı tekilleştir (10 dk, algılanan hız kazancı).
3. **2.1** — Türkçe karakter standardını tek tura getir (içerik turu).
4. **2.4** — Atlas'a eksik Map düğümünü ekle (kozmetik tutarlılık).
5. **3 / 2.x** — Cache-busting otomasyonu + script lazy-load (orta vade).
