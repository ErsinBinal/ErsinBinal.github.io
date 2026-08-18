# Demir At Terazisi — Tasarım ve Uygulama Kaydı

Tarih: 2026-08-18
Durum: **yayına hazır** (`npm run check` yeşil)
Rota: [/tools/demir-at.html](../tools/demir-at.html) · Terminal komutu: `moto`

---

## 0. Tek cümle

Motosikleti rakamla değil, **rakamın taşıdığı bedenle** kıyaslayan bir terminal:
ağırlık / beygir / tork üçlüsünü sınıf bağlamında normalize eder, her modeli fosfor
taramalı bir kareyle gösterir, sonucu tek paragraflık bir bilançoya indirir.

## 1. Ürün kararı: neden ham tablo yetmez

Ham tablo (193 kg / 117 hp / 93 Nm) internette zaten var. Katkı üç yerde:

1. **Bağlam.** 161 Nm'lik bir Fat Boy ile 37.5 Nm'lik bir Scrambler 400 X'i aynı barda
   göstermek yanıltıcıdır. İki ölçüm kipi var: **garaj** (10 motorun %5–%95 aralığı,
   uç değer kırpmalı) ve **sınıf medyanı** (motorun kendi sınıfının medyanına log2 oranı).
2. **Türetilmiş metrik.** Asıl hikâye hp'de değil **hp/ton**, **Nm/100kg** ve
   **kg/hp** ("şasi borcu") oranlarında. Bir motosikletin karakteri burada okunur.
3. **Kimlik.** Kareler stok fotoğraf değil; özgür lisanslı fotoğraflardan üretilen
   **fosfor-yeşil tarama** görüntüleri (§4).

## 2. Onaylanan kararlar

| Karar | Sonuç |
|---|---|
| Veri | Web'den doğrulandı (üretici teknik föyleri); her satır `source` taşır |
| Görsel | Fotoğraf + ağır maskeleme (prosedürel siluet yerine) |
| Erişim | Herkese açık — `auth-gate.js` yok, SEO açık |
| İsim/rota | **Demir At Terazisi** @ `/tools/demir-at.html` |

## 3. Dosya haritası

| Dosya | İş |
|---|---|
| [tools/demir-at.html](../tools/demir-at.html) | İskele, CSP, OG, origin marker |
| [assets/css/demir-at.css](../assets/css/demir-at.css) | Fosfor-terminal düzeni, duyarlı ızgara |
| [assets/js/moto-data.js](../assets/js/moto-data.js) | Garaj verisi (donmuş), sınıflar, kare yolu |
| [assets/js/moto-metrics.js](../assets/js/moto-metrics.js) | Saf hesap çekirdeği (DOM'suz, rastgeleliksiz) |
| [assets/js/demir-at.js](../assets/js/demir-at.js) | Durum + DOM + SVG çizim |
| [scripts/build-moto-frames.js](../scripts/build-moto-frames.js) | Kare üretim hattı (`npm run build:moto`) |
| [tests/unit/moto-metrics.test.mjs](../tests/unit/moto-metrics.test.mjs) | 9 birim testi |
| [assets/img/moto/SOURCES.md](../assets/img/moto/SOURCES.md) | Kaynak + lisans kaydı (betik üretir) |

## 4. Kare üretim hattı

Gerçek fotoğraf istendi; telif kökten çözülmesi gereken bir sorundu. Yol:

1. **Kaynak**: yalnızca Wikimedia Commons'taki **özgür lisanslı** fotoğraflar
   (CC0 / CC BY / CC BY-SA). Her karenin yapanı ve lisansı `SOURCES.md`de.
2. **Kırpma**: her fotoğraf için elle belirlenmiş normalize kutu; kare içine
   `contain` ile oturur, artan yer koyu zeminle dolar — hiçbir motosiklet kesilmez.
3. **Maske**: gri tonlama → normalise → seviye (motora özel `mul`/`off`) →
   fosfor-yeşil duotone → radyal vinyet → tarama çizgisi deseni.
4. **Çıktı**: 720×450 webp, ~30–80 KB. Toplam 473 KB, tembel yüklenir ve
   **precache'e girmez** (service worker çalışma anında cache'ler).

Ham fotoğraflar repoda tutulmaz; betik Commons'tan yeniden indirir
(`.moto-src-cache/`, gitignore'da). Önbellek anahtarı kaynak dosya adının
hash'idir — kare başka bir fotoğrafa geçince eski görüntü yeniden kullanılmaz.

**Marka logosu kullanılmaz; marka ve model adları yalnızca tanımlayıcıdır.**
Türetilmiş kareler kaynak fotoğrafın lisansına tabidir (CC BY / CC BY-SA için
atıf ve aynı lisansla paylaşım koşulları geçerlidir).

### Bilinen görsel sınırlar

- **CFMoto 800NK**: hiçbir yerde özgür lisanslı fotoğrafı yok (Commons ve
  Openverse: sıfır sonuç). Naked slotu **CFMoto 700CL-X Heritage**'a çevrildi —
  marka ve sınıf korundu.
- **Suzuki V-Strom 800DE**: özgür lisanslı tam yan profili yok; en bütün fuar
  karesi kullanıldı, kadraj kısmi.
- **Yamaha MT-09**: kullanılan kare SP donanımını gösteriyor (CC0); veri satırı
  standart MT-09. Rozet ve `SOURCES.md` bunu yazar.

## 5. Veri sözleşmesi ve garaj

Bozulursa bütün türetilmiş metrikler yanlışlanır:

- `weight.kg` **daima kerb** (yaş, tüm sıvılar dolu). Kuru ağırlık girilmez.
- `power.hp` / `torque.nm` üretici beyanı, AB homologasyon değeri.
- `estimated: true` → üretici o değeri yayımlamıyor; arayüzde rozet çıkar.

| Sınıf | Motosiklet | cc | hp | Nm | kg |
|---|---|---:|---:|---:|---:|
| naked | Yamaha MT-09 (2024) | 890 | 117.3 | 93 | 193 |
| naked | CFMoto 700CL-X Heritage (2024) | 693 | 74.8 | 68 | 196 |
| cruiser | Harley-Davidson Fat Boy 114 (2024) | 1868 | 94 * | 161 | 317 |
| cruiser | Kawasaki Vulcan S (2025) | 649 | 61 | 62.8 | 229 |
| bobber | Triumph Bonneville Bobber (2024) | 1200 | 76.9 | 106 | 251 |
| bobber | Royal Enfield Shotgun 650 (2024) | 648 | 47 | 52.3 | 240 |
| adventure | BMW R 1300 GS (2024) | 1300 | 145 | 149 | 237 |
| adventure | Suzuki V-Strom 800DE (2025) | 776 | 84 | 78 | 230 |
| scrambler | Honda CL500 (2024) | 471 | 46.2 | 43.4 | 192 |
| scrambler | Triumph Scrambler 400 X (2024) | 398 | 39.5 | 37.5 | 179 |

Dokuz markanın hepsi kadroda; yalnız Triumph iki kez geçer (bobber + scrambler).

\* Harley-Davidson, Milwaukee-Eight motorlar için beygir yayımlamaz — yalnız tork
verir. Fat Boy ikonik siluet için tutuldu ve `hp: tahmini` rozetiyle işaretlendi;
tabloda `*` ile görünür. Doğrulama sırasında torkun 155 değil **161 Nm** (119 lb-ft)
olduğu, MT-09'un 188 değil **193 kg**, Bobber'ın ön tekerleğinin 16" olduğu düzeltildi.

## 6. Hesap çekirdeği

1. **Türetilmiş metrikler** — `hp/ton`, `Nm/100kg`, `kg/hp` (sonuncusu "az iyidir"
   ekseni; delta rengi buna göre döner).
2. **İki ölçüm kipi** — *garaj*: %5–%95 yüzdelik kırpmalı min-max. *sınıf*: kendi
   sınıfının medyanına log2 oranı, ±1 kat kırpma. (Sınıf başına iki motor olduğu
   için min-max dejenere olurdu; oran anlamlı kalır.)
3. **Pareto sınırı** — ağırlık↓ × beygir↑ düzleminde domine edilmeyenler. Saçılımda
   pembe halkayla işaretli. Bugünkü garajda: MT-09, R 1300 GS, CL500, Scrambler 400 X.
4. **Bilanço grameri** — öncelik sıralı kural tablosu → şablon → sayı doldurma.
   Rastgelelik yok; aynı çift her zaman aynı cümleyi verir.
5. **Durum URL'de** — `#a=…&b=…&m=…`. Paylaşılabilir, geri/ileri tuşu çalışır, backend yok.

## 7. Erişilebilirlik ve performans

- Grafiklerin yanında gerçek `<table>` ("tabloyu göster") + `aria-label` özetleri.
- Klavye: `S` takas, `R` sıradaki çift, `Esc` seçiciyi kapat, `Tab` ile tüm kontroller.
- `prefers-reduced-motion` bar geçişlerini kapatır.
- Sıfır bağımlılık, harici script yok. HTML+CSS+JS+veri ≈ 45 KB; kareler tembel.
- CSP `script-src 'self'`; `img-src` yalnız `'self' data:` + origin-beacon host'u.

## 8. Doğrulama

- `npm run check` — sözdizimi, 102 birim testi, worker testleri, site bütünlüğü: yeşil.
- `tests/unit/moto-metrics.test.mjs` — 9 test: garaj bütünlüğü (5×2 sınıf, 9 marka,
  benzersiz kimlik), veri sözleşmesi, **her motorun karesinin diskte varlığı**,
  türetilmiş metrik doğruluğu, ölçek sınırları, Pareto kümesi, sıralamalar,
  bilanço determinizmi.
- Tarayıcı dumanı (Playwright/Chromium): masaüstü + mobil, filtre/seçici/takas
  akışı, konsol temiz.
- Komut uzayı snapshot testleri `moto` komutu için güncellendi; çapraz-sahip
  çakışması yok.

## 9. Site entegrasyonu

`index.html` (proje satırı 13 + arşiv ağacı `/garage`) · `routes.js` (`demirAt`) ·
`route-commands.js` (`moto` + 7 alias) · `home-protocol.js` rastgele rota havuzu ·
`sitemap.xml` · `service-worker.js` (sayfa + css + 3 js precache, `CACHE_NAME` v250) ·
`signals.xml` + `pages/changelog.html` · `package.json` (`npm run build:moto`).

## 10. Sonraki sinyaller

Fiyat/TL ekseni · 0–100 km/s tahmini · üçüncü slot · sınıf şampiyonu turnuvası ·
kullanıcı garajı (Supabase, oturum açana özel) · Sinyal Atlası (A1) grafiğine
`garage` düğümü olarak bağlanma · CFMoto 800NK ve V-Strom 800DE için özgür lisanslı
fotoğraf çıkarsa karelerin yenilenmesi.
