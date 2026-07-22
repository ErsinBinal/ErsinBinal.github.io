# Meshy Üretim Brief'i — Convivium 3D Varlıkları

Tarih: 2026-07-22
Amaç: Süresi dolan Meshy kredilerini, sitenin retro-terminal kimliğini
**bozmadan** kalıcı varlıklara çevirmek. Krediler biter, ürettiğin GLB/PNG'ler
bitmez — bu yüzden önce üret & indir, entegrasyonu Claude paralel kurar.

İki parti üretiyoruz:
- **Parti H — Hologram Kasası** (amiral gemisi): terminalde yeşil hologram
  olarak dönen "kurtarılmış 3D kalıntılar". Ruins/arkeoloji temasının 3D evrimi.
- **Parti S — Sprite hammaddesi**: oyun/eşya/ikon için 3D'den ön-render
  edilecek nesneler (runtime'da 3D yok; piksel sprite olur).

> Not: Prompt'lar İngilizce yazıldı (Meshy İngilizce'de çok daha iyi sonuç
> verir). Ayar adları Meshy arayüzüne yaklaşık eşlenir; sürüm farkı olabilir.

---

## Global ayarlar (her iki parti için)

| Ayar | Değer | Neden |
|---|---|---|
| Mod | **Text-to-3D** | Elde görsel yok, tema kurgusal |
| Art Style | **Stylized / low-poly** (Realistic DEĞİL) | Gerçekçilik kimliği bozar; low-poly hem tel-kafes hologramda hem pikselde iyi durur |
| Target polycount | **2.000–5.000 tris** | Web ağırlığı + wireframe okunurluğu |
| Topology | Triangle (fark etmez) | Web'de üçgen zaten |
| Export | **GLB** (her ikisi) + **PNG turntable render** (varsa indir) | GLB three.js'in yerlisi; PNG sprite için başlangıç |

### Kredi tasarrufu (önemli)
- **Parti H (hologram):** Yeşil shader ardında göstereceğiz, **gerçek doku/PBR
  GEREKMİYOR.** Mümkünse **preview aşamasında bırak** ya da texture/refine
  adımını atla → çok daha az kredi. Bize sadece **geometri** lazım.
- **Parti S (sprite):** Burada renk/doku işe yarar (sprite'a render edeceğiz),
  ama yine **stylized/low-poly** tut. Refine'a değer.

### Dosya isimlendirme + klasör
İndirince şu düzenle ver (Claude bu adları bekleyecek):
```
assets/models/holo/    <- Parti H (GLB)
  holo-01-terminal.glb
  holo-02-relay.glb
  holo-03-arcade.glb
  holo-04-prism.glb
  holo-05-drone.glb
  holo-06-core.glb
assets/models/src/     <- Parti S (GLB + varsa PNG)
  prop-coolant.glb
  prop-chip.glb
  ...
```
Küçük tut: her GLB ideali **< 1.5 MB** (Meshy'de düşük polycount seç; gerekirse
Claude sıkıştırır/decimate eder).

---

## PARTİ H — Hologram Kasası (6 kalıntı)

Her biri sitenin mevcut kurgusuna bağlı. Prompt sonuna ortak stil kuyruğu ekle:
`, low-poly, stylized, clean topology, isolated object, neutral pose, sci-fi relic, weathered`

| # | Dosya | Prompt (İngilizce) | Kurgu bağı |
|---|---|---|---|
| 1 | holo-01-terminal | `a broken vintage computer terminal with a cracked CRT monitor, 1980s, dust and damage` | BBS kalıntısı (bbs-1997.log) |
| 2 | holo-02-relay | `a damaged satellite signal relay dish with a bent antenna, abandoned, sci-fi` | "sinyal" teması / relay |
| 3 | holo-03-arcade | `a worn retro arcade cabinet, faded, unplugged, standing` | arcade-recovery.scr kalıntısı |
| 4 | holo-04-prism | `a mysterious faceted crystalline prism artifact floating on a small pedestal, geometric` | shard → prism → /vault lore |
| 5 | holo-05-drone | `a small derelict robot companion drone, powered down, single eye lens, cute but damaged` | Bugy lore / kuluçka |
| 6 | holo-06-core | `an ancient server rack data core with tangled cables and blinking-off panels` | /core odası lore |

Her biri için: preview üret → beğendiğini **GLB indir** (texture'sız yeterli).

---

## PARTİ S — Sprite hammaddesi (8 nesne)

Ön-render edilip piksel sprite/ikon olacak. Ortak stil kuyruğu:
`, low-poly, stylized, single object, centered, plain background, game asset`

| # | Dosya | Prompt (İngilizce) | Kullanım |
|---|---|---|---|
| 1 | prop-coolant | `a green industrial coolant canister with a valve, cyberpunk` | pipe oyunu / lore |
| 2 | prop-chip | `a glowing microchip circuit shard, teal, faceted edges` | shard ekonomisi ikonu |
| 3 | prop-cassette | `a retro audio cassette tape, worn label` | radio modülü |
| 4 | prop-keycard | `a futuristic access key card with a magnetic stripe, neon edge` | access / giriş |
| 5 | prop-crate | `a stackable wooden crate with metal corners, beat-em-up prop` | Crude Buster fırlatılabilir |
| 6 | prop-barrel | `a dented steel barrel, industrial, beat-em-up prop` | Crude Buster fırlatılabilir |
| 7 | prop-dartboard | `a classic dartboard with three darts, front view` | Dart Skorbord kart görseli |
| 8 | prop-mug | `a steaming coffee mug and a cocktail glass pair, ritual objects` | barista/bartender ritüel araçları |

Bunlarda **texture/refine'a değer** (renkli sprite çıkacak). GLB **+ PNG
turntable** indir; Claude ortografik açılardan piksel sprite'a çevirir.

---

## Sıra (kredi baskısı önce)

1. **Sen (şimdi, Meshy):** Parti H'yi üret (texture'sız, hızlı, ucuz) → 6 GLB
   indir. Sonra Parti S → 8 GLB (+PNG). Yukarıdaki adlarla bir klasöre koy.
2. **Claude (paralel):** İlk 1–2 gerçek model gelince Hologram Kasası
   viewer'ını kurar — three.js lazy-load (yalnız o sayfada/odada), **yeşil
   fresnel + tarama-çizgisi shader** (terminal hologramı), sürükle-çevir,
   `prefers-reduced-motion` saygılı, CSP/SW/ağırlık halledilir. Sonra sprite
   hattı: GLB → ortografik render → oyun/ikon entegrasyonu.
3. Her dilim: kapılar + headless + canlı doğrulama + changelog/RSS.

### Karar günlüğü
- 2026-07-22: Kullanıcı kararı Claude'a bıraktı; Claude (c)'yi seçti —
  kredi baskısı nedeniyle önce hammadde brief'i. Amiral gemisi: Hologram
  Kasası (Mod A, markaya uygun). Sprite hattı iş atı (Mod B).
