# CRUDE BUSTER — "Phosphor Big Apple" Kült Planı

> Yönetmen notu (kendime): Bu dosya benim pusulam. Her fazın **"bitti" kriteri**
> var; her adım **kendi başına yayınlanabilir ve test edilebilir**. Küçük, sık,
> ölçülmüş gönderiler. Kod davranışı = kutsal; sanat = ruh. İkisini de bırakma.

## 0. Kimlik cümlesi
**Baba ve oğul, fosfor ışığına batmış harabe bir New York'u co-op yumruklayarak temizler.**
Referans ruh: Streets of Rage'in nabzı + River City'nin kalbi + Scott Pilgrim'in
mizahı, ama Convivium'un CRT-fosfor estetiğinde ve **elle render edilmiş 3B karakterlerle.**

## 1. Sanatsal Pusula (5 sütun)
1. **KALP** — Bu bir baba-oğul (E.Binal & De.Binal) hikâyesi. Co-op mekaniği
   duygusal olarak da anlam taşımalı (kurtarma, sırt sırta, takım atışı).
2. **ZANAAT** — Tüm dövüşçüler Meshy 3B → sprite hattından geçmiş, elle
   render edilmiş karakterler. Kutu prosedürel BİTTİ.
3. **YAŞAYAN DÜNYA** — CRT'ye batmış, nefes alan bir metropol: parallax, pencere
   ışıkları, duman, hava, ufuk parıltısı, set-piece anları.
4. **HİS** — Okunabilir, sulu, tatmin edici dövüş. Her yumruk "hisset" gelir;
   hitstop/flash/parçacık/ekran sarsıntısı ölçülü ve amaçlı.
5. **NABIZ** — Kendine ait bir ses kimliği: synthwave/chiptune müzik + katmanlı SFX.
   (SoR'un müziği efsane olduğu için efsane; biz de nabzımızı kuracağız.)

## 2. Şu anki durum (dürüst envanter)
- **Motor:** Canvas 2D, sabit adımlı simülasyon; solo / yerel co-op / online co-op
  (Supabase Realtime, host-otoriter netcode). Skor tablosu (Supabase).
- **Sanat:** Arka plan/zemin zenginleştirildi (pencereli binalar, pus, duman,
  su birikintisi, ray/travers, CRT+vignette post-fx). Karakter: **E.Binal artık
  render edilmiş 3B sprite** (8 durum). Düşmanlar + De.Binal + boss'lar HÂLÂ
  prosedürel kutu → en büyük açık.
- **Dövüş:** yürü/idle, yumruk kombosu, zıpla/jumpkick, kap/tut/fırlat, özel,
  takım atışı, hitstop/shake/popups. Sağlam iskelet ama derinlik ve okunabilirlik
  cilası eksik.
- **İçerik:** 2 bölüm (harabe sokaklar, metro), 2 boss. Kısa. Başlık/giriş/final
  yok. Müzik yok (sadece SFX).
- **Kredi:** ~1650 Meshy. Hat + tüm tuzaklar hafızada ([[crude-buster-sprite-hatti]]).

## 3. Sanat İncili
- **Palet (fosfor-noir):** fosfor yeşil #00ff66 / soft #caffd8, kehribar #ffce4a,
  tehlike kırmızı #ff5a3c, cyan #35b7ff (De.Binal), zemin #050d05. Sıcak sahne
  (harabe) turuncu ufuk; soğuk sahne (metro) cyan floresan.
- **Kadro (hepsi render sprite):**
  - E.Binal (baba) — kırmızı atlet, kot, kaslı. ✅
  - De.Binal (oğul) — cyan atlet, daha genç/atletik, aynı hat. ⏳ (üretiliyor)
  - Punk (yeşil), Knife (gri, bıçaklı), Brute (kahve, iri), Thrower (altın, fırlatıcı).
  - Boss: Brute-Boss (dev), Cyborg-Boss (cyan-neon sibernetik). Silüetleri ayrı,
    akılda kalıcı, ölçekçe büyük.
- **Karakter render kuralı:** 3/4 ön ortografik, rotY≈-0.6, 96×128 hücre, temiz
  action klipleri (yumruk=198 Punch_Combo, dönen kung-fu YASAK). Hit-flash + kontur.
- **Sahne temaları:** (1) Harabe Sokaklar → (2) Metro Kanalları → (3) Neon Çarşı
  (gece pazarı, tabelalar) → (4) Liman/İskele (sis, vinçler) → (5) Kule Çatısı
  (final, gökyüzü). En az 4-5 bölüm hedefi.
- **UI/HUD:** portreler, segmentli can + hayalet bar (yapıldı), combo sayacı
  (juicy), boss barı, bölüm kartları, stil/skor göstergesi.
- **VFX:** darbe halkası/toz/kıvılcım (var), hasar sayısı (var); eklenecek: hız
  çizgileri, özel-saldırı flaşı, çevre yıkımı geri bildirimi, hava (yağmur/kor).

## 4. Ses kimliği (WebAudio, prosedürel)
- Bölüm başına synthwave/chiptune döngü (bas + arp + davul); boss teması;
  zafer/yenilgi cıngılı. Dinamik yoğunluk (dövüş kızışınca katman ekle).
- SFX katmanı zenginleşir (yumruk/isabet/fırlatma/düşme/pickup), mix ducking.

## 5. Yol haritası (fazlar — sırayla, her adım gönderilebilir)

### FAZ 1 — KADRO (görsel kimlik) ⭐ en yüksek etki
- 1.1 De.Binal render sprite (8 durum) + P2/co-op'a bağla. **[başladı]**
- 1.2 Sprite altyapısını çok-karakterli yap: `SHEETS[pal]` kayıt defteri,
  `drawFighter` her karakter için sprite→prosedürel fallback. Facing için
  ayrı L/R render seçeneği; knockdown için kök-takipli kadraj (düşme düzelsin).
- 1.3 Düşmanlar: punk, knife, brute, thrower — her biri model→rig→animasyon→sheet.
- 1.4 Boss'lar: brute-boss, cyborg-boss — büyük ölçek, ayrı siluet, boss'a özel poz.
- **Bitti kriteri:** Ekrandaki her dövüşçü render sprite; tek bir prosedürel kutu kalmadı.

### FAZ 2 — DÖVÜŞ ŞARKI SÖYLESİN (his + kurgu sağlamlığı)
- 2.1 Hitbox/hurtbox görünür-doğru; isabet penceresi, öncelik, takas kuralları.
- 2.2 Kombo sistemi derinliği: yer kombosu → havaya kaldırma → hava vuruşu;
  fırlatma yay/hedefleme; takım atışı cilası; özel-metre ekonomisi.
- 2.3 Düşman AI çeşitliliği (kuşatma, geri çekilme, senkron saldırı), zorluk eğrisi.
- 2.4 Juice ölçümü: hitstop/flash/knockback squash — abartmadan, okunur.
- **Bitti kriteri:** Kör test eden biri "dövüş çok iyi hissettiriyor" diyor; desync/bug yok.

### FAZ 3 — KURTARILMAYA DEĞER DÜNYA (bölümler/set-piece)
- 3.1 4-5 bölüm; her birinde tema, tehlike, mini-olay; gerçek boss arenası.
- 3.2 Yıkılabilir/etkileşimli proplar; çevresel anlatı; bölüm geçiş beat'leri.
- 3.3 Atmosfer anları (yağmur, şimşek, gün batımı, neon).
- **Bitti kriteri:** Baştan sona akan, ritmi olan bir kampanya.

### FAZ 4 — NABIZ (ses)
- 4.1 Prosedürel synthwave motoru (bölüm/boss temaları, dinamik yoğunluk).
- 4.2 SFX katmanı + mix. **Bitti:** ses kapalıyken oyun yarım hissettiriyor.

### FAZ 5 — KALP & ÇERÇEVE (meta/hikâye/UX)
- 5.1 Başlık ekranı + attract/demo; karakter/mod seçimi cilası.
- 5.2 Giriş (neden dövüşüyorlar), bölüm arası beat'ler, final. Baba-oğul yayı.
- 5.3 Combo/skor/stil meta; kilitler; Convivium evrenine 1-2 gizli gönderme.
- **Bitti:** Oyun bir "eser" gibi başlıyor ve bitiyor.

### FAZ 6 — SAĞLAM ZEMİN (netcode/QA/perf)
- 6.1 Host-otoriter co-op sağlamlaştırma (desync, reconnect, lag telafi).
- 6.2 Skor tablosu bütünlüğü; performans (çok sprite); mobil/dokunmatik; erişilebilirlik.
- 6.3 Tam QA turu; regresyon; sürüm disiplini.
- **Bitti:** "backend'te kurgu sorunsuz" — hedefe ulaşıldı.

## 6. Riskler & ilkeler
- **Performans:** çok sprite + post-fx. Ölç, gerekiyorsa sprite atlası + culling.
- **Estetik tutarlılık:** tüm karakterler aynı render kuralıyla; palet disiplini.
- **Kapsam kayması:** her faz gönderilebilir dilimlere bölünür; asla "her şey bitince" değil.
- **Aile içeriği:** yalnız stilize karakterler; ham fotoğraf yok ([[crude-buster-sprite-hatti]] güvenlik).
- **Sürüm disiplini:** her gönderide `?v=` + SW cache + gate (syntax+integrity+unit).

## 7. KİLİTLİ KARARLAR (2026-07-25, kullanıcı onayı)
- **Ton/ruh:** **Fosfor-noir + sıcak kalp.** Karanlık atmosferik dünya, ama
  kahramanlarda sıcaklık + ölçülü mizah. Denge.
- **Kişisellik:** **Tam kişisel.** Gerçek baba-oğul göndermeleri, iç şakalar,
  aileye özel detaylar/replikler. → Faz 5'te (hikâye/replik) kullanıcıdan somut
  malzeme (iç şaka, paylaşılan anı, lakap) İSTENECEK. Görsel yine stilize (ham foto yok).
- **Tempo:** **Büyük kült, adım adım.** Tüm fazlar; her adım yayınlanır+test edilir.

### Bekleyen destek istekleri (zamanı gelince)
- Faz 5: baba-oğul iç şakaları / paylaşılan anı / lakaplar (replik ve beat'ler için).
- Ses/isim/özel içerik gerekirse.
