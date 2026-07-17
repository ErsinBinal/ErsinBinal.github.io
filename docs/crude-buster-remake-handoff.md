# Crude Buster (1990) — Remake Handoff / Geliştirme Dökümanı

> Durum: **v1 KODLANDI — canlı (2 tarayıcı) test bekliyor** · Tarih: 2026-07-14
>
> **Uygulanan (Faz 0–6 çekirdeği):** motor (fizik x/derinlik/z + yerçekimi), oyuncu durum
> makinesi, yumruk kombosu, zıplama + zıplama tekmesi, düşman kavra/fırlat, nesne kaldır/savur/fırlat
> (küçük→araba), özel hamle, **takım atışı (M9)**, yiyecek/can, canlar+devam, saldırı-jetonlu
> düşman AI (punk/knife/brute/thrower), veri-güdümlü sahne/arena/dalga/GO, 2 boss (brute + cyborg
> charge), iki-oyuncu kamera clamp'i, prosedürel piksel render + parallax, WebAudio SFX/müzik,
> klavye (P1/P2) + mobil dokunmatik, skor + leaderboard, ve **online co-op netcode**
> (`crude-buster-net.js`, host-otoriter snapshot + interpolasyon, lobi/oda-kodu/duraklat/gameover).
> Dosyalar: `games/crude-buster.html`, `assets/js/crude-buster.js`, `assets/js/crude-buster-net.js`,
> `assets/css/crude-buster.css`. Entegrasyon (§11) tamam: routes, SW (v168→v169), canary CVM-6841BBDC,
> CSP, sitemap, changelog, README, terminal `run crude`.
>
> **Kalan (Faz 6 içerik + Faz 7 cila):** 3–5. sahneler (STAGES dizisine veri ekleme), mutant/gang-lord/
> final boss, guest client-side prediction (şu an interpolasyon-only), sanat/denge geçişleri,
> kontrol remap. **Guest tarafı yalnız interpolasyonla render eder** (v1 kararı; prediction cila).
> Hedef: Convivium sitesine, siteye **giriş yapmış iki kullanıcının online co-op** oynayabildiği,
> Data East'in _Crude Buster_ (arcade, 1990 / Genesis'te _Two Crude Dudes_, 1991) oyununun
> sadık ve eksiksiz bir beat 'em up remake'i.

Bu döküman, kod yazılmadan önce **tek doğruluk kaynağı**dır. Sıfırdan, bağımsız bir motor
kurulacak; sitedeki mevcut oyunlara sadık kalma zorunluluğu yoktur. Yalnızca Convivium'un
altyapı sözleşmelerine (auth, canary/origin imzası, service worker cache, CSP, Supabase RLS)
uyulacaktır.

---

## 0. İçindekiler

1. Vizyon ve kapsam
2. Kaynak oyun analizi (hiçbir mekanik atlanmadan)
3. Kapsam kararları (v1 içi / dışı)
4. Teknik mimari ve dosya haritası
5. Online co-op netcode tasarımı (kritik)
6. Oyun sistemleri (fizik, dövüş, tutma/fırlatma, düşman AI, boss, sahne, kamera, skor)
7. İçerik: sahneler, düşman kadrosu, bosslar, nesneler, itemlar
8. Kontroller (online / yerel co-op / mobil)
9. Sanat ve ses (prosedürel piksel + WebAudio)
10. UI/UX akışı (lobi, HUD, duraklat, game over, devam, skor)
11. Convivium entegrasyon kontrol listesi
12. Veri ve kalıcılık (Supabase, RLS, co-op skor)
13. Build fazları ve kilometre taşları
14. Test planı
15. Riskler ve açık sorular
16. Dosya-dosya spesifikasyon
17. Ek: origin-id, canary üretimi, CSP, HTML iskeleti

---

## 1. Vizyon ve Kapsam

**Ne yapıyoruz:** Yatay kaydırmalı (side-scrolling), 2 oyunculu eşzamanlı co-op bir beat 'em up.
Nükleer sonrası harabeye dönmüş "Big Apple" (New York, 2010) sokaklarında iki kaslı kahraman,
"Big Valley" suç örgütünü temizler. Oyunun **imza mekaniği**: düşmanlar dahil neredeyse **her şeyi
kaldırıp fırlatmak** — arabalar, direkler, tabelalar, variller, duvar parçaları ve **co-op'ta
partnerini bile fırlatmak**.

**Neden bu oyun siteye uyuyor:** Convivium zaten Supabase Realtime ile maliyetsiz gerçek zamanlı
1v1 (`dart-online.js`) çözümüne sahip. Crude Buster **co-op (PvE)** olduğu için, relay tabanlı
düşük hassasiyetli senkron (host-otoriter snapshot) burada **rekabetten çok daha affedici** çalışır:
küçük gecikme/desync oyunu bozmaz. "Siteye giriş yapan 2 kullanıcıyla co-op" gereksinimi bu yüzden
gerçekçidir.

**Platform:** GitHub Pages statik + Supabase (anon key, RLS) + Supabase Realtime (broadcast+presence).
Vanilla JS + Canvas 2D. Framework yok (AGENTS.md kuralı). Mobil/PWA uyumlu.

**Kalite çıtası:** Piksel-art, akıcı 60 FPS simülasyon, hit-stop + screen-shake + partikül "juice",
sadık dövüş hissi. "Hiçbir detayı atlamadan" ilkesi: kaynak oyunun bilinen tüm mekaniklerinin
karşılığı v1'de ya var ya da açıkça faz olarak planlı.

---

## 2. Kaynak Oyun Analizi (Data East — Crude Buster / Two Crude Dudes, 1990)

### 2.1 Kurgu / atmosfer
- New York, 2010. "Big Bang" nükleer patlaması şehri harabeye çevirmiş; hükümet terk etmiş.
  Kalıntılar "Big Apple" diye anılır, **Big Valley** suç örgütünün kontrolündedir.
- İki kaslı, abartılı kahraman örgütü yıkmak için sokaklara iner.
- Ton: kaba, komik, aşırı; 90'lar arcade beat 'em up estetiği.
- **Kahraman isimleri (karar):** **E.Binal = RED / host / P1**, **De.Binal = BLUE / guest / P2**
  (slot kimliği dart online şemasıyla tutarlı).

### 2.2 Çekirdek mekanikler (kataloglanmış — v1 hedefi bunların tamamı)
| # | Mekanik | Açıklama | v1 |
|---|---------|----------|----|
| M1 | Yumruk kombosu | Ardışık vuruş; son vuruş yere serer | ✔ |
| M2 | Zıplama + zıplama tekmesi | Havadayken saldırı | ✔ |
| M3 | Düşman kavrama (grab) | Sersemlemiş/yakın düşmanı tut | ✔ |
| M4 | Düşman fırlatma | Tuttuğun düşmanı ileri / **başka düşmana** fırlat | ✔ |
| M5 | Nesne kaldır/fırlat | Araba, direk, varil, tabela, taş, duvar parçası vb. | ✔ |
| M6 | Nesneyle vurma (swing) | Kaldırdığın nesneyi silah gibi savur | ✔ |
| M7 | Büyük nesneler | Araba/direk: yavaş, kısa menzil, yüksek hasar | ✔ |
| M8 | Özel/çaresizlik hamlesi | Kısa HP karşılığı çevredeki herkese hasar | ✔ |
| M9 | **Co-op partner fırlatma** | Partnerini kaldırıp düşmanlara fırlat (imza hamle) | ✔ |
| M10 | Yiyecek ile can yenileme | Düşman/kutu düşürür; HP verir | ✔ |
| M11 | Canlar + devam (continue) | 0 HP → can kaybı; 0 can → game over → devam | ✔ |
| M12 | Kilitli arena dalgaları | Kamera kilitlenir, dalga temizlenince "GO →" | ✔ |
| M13 | Boss savaşları | Sahne sonu, çok fazlı, HP barlı | ✔ |
| M14 | 2 oyuncu eşzamanlı | Yerel + **online** co-op | ✔ |
| M15 | Düşmanlar da nesne/silah kullanır | Şişe/taş fırlatan düşmanlar | ✔ (stretch) |
| M16 | Skor / stil bonusu | Fırlatma comboları, team-throw bonusu | ✔ |

### 2.3 Adaptasyon dürüstlüğü
Orijinal sahne yerleşimleri (piksel-piksel harita) yeniden üretilmez; **mekanikler ve his** sadık,
**seviye tasarımı "ruhuna uygun" özgün**dir. Bu, hem telif/özgünlük (Convivium NOTICE.md) hem de
netcode ile uyumlu, veri-güdümlü sahne sistemi için gereklidir.

---

## 3. Kapsam Kararları (alınmış — gerekirse revize)

- **Mod seti:** Solo (1p), Yerel co-op (aynı klavye 2p), **Online co-op (2 giriş yapmış kullanıcı)**.
  Online co-op birincil hedeftir; yerel co-op hem test aracı hem de düşük-gecikme deneyimidir.
- **Rol modeli:** Host-otoriter. Oda kuran = RED/P1 = simülasyon otoritesi. Katılan = BLUE/P2 =
  yalnız input + render (istemci-taraflı hafif tahmin ile).
- **Sahne sayısı v1:** 5 sahne + final boss. (Faz 6'da içerik tam.)
- **Sanat:** Prosedürel, kod-çizimli piksel-art (siteyle tutarlı; harici görsel yok). Kaslı iki
  kahraman RED/BLUE paletinde.
- **Ses:** WebAudio prosedürel SFX + hafif chiptune döngü (mute toggle; harici dosya yok).
- **Kalıcılık:** `game_scores` tablosuna `game_key = 'crude-buster'` ile skor; opsiyonel `coop_runs`
  tablosu (zengin co-op istatistiği) — bkz. §12.
- **Anti-cheat:** Yok (hobi ölçeği, güven tabanlı — dart-online ile aynı ilke).

---

## 4. Teknik Mimari ve Dosya Haritası

### 4.1 Yeni dosyalar
```
games/crude-buster.html                 # sayfa kabuğu (auth-gate + canvas + lobi + HUD)
assets/js/crude-buster.js               # OYUN MOTORU (sim, render, dövüş, AI, sahne)  [?v=1]
assets/js/crude-buster-net.js           # NETCODE (Supabase realtime, host/guest, snapshot) [?v=1]
assets/css/crude-buster.css             # sayfa + HUD + lobi + mobil kontrol stilleri     [?v=1]
docs/database/2026-07-14-coop-runs.sql  # (opsiyonel) co-op skor tablosu + RLS
docs/crude-buster-remake-handoff.md     # bu döküman
```

> Neden ayrı `.js`? Beat 'em up motoru neon-serpent gibi inline barındırmak için fazla büyük.
> Dart bölünmesini (skorbord.js + online.js + css) izliyoruz.

### 4.2 Katman diyagramı
```
crude-buster.html
 ├─ supabase-js (CDN) + supabase-config.js + supabase-client.js   → ConviviumBackend
 ├─ auth-gate.js  (data-item-key="crude-buster")                  → oturum zorunlu
 ├─ crude-buster-net.js   → window.CrudeNet  (dart-online şablonu)
 └─ crude-buster.js       → window.CrudeBuster (motor); Net'i inject eder
```

### 4.3 Motor iç modülleri (tek dosyada, IIFE + alt-nesneler)
- `Engine.loop` — sabit adım 60 Hz simülasyon + rAF render (arcade-kit `createLoop` mantığı).
- `Engine.world` — entity havuzu (players, enemies, objects, projectiles, items, fx).
- `Engine.physics` — x / depthY / z + yerçekimi, çarpışma (AABB + derinlik bandı + z eşiği).
- `Engine.combat` — durum makinesi, hitbox/hurtbox, hasar, knockback, hit-stop.
- `Engine.grab` — kavrama/fırlatma (düşman + nesne + partner).
- `Engine.ai` — düşman FSM + saldırı-jetonu (attack token) grup yönetimi.
- `Engine.stage` — veri-güdümlü sahne/arena betiği, spawn dalgaları, kamera kilit/scroll.
- `Engine.camera` — iki-oyuncu takip + clamp (oyuncular ekrandan ayrılamaz).
- `Engine.render` — parallax arka plan + entity çizim (derinlik sıralı) + HUD + fx.
- `Engine.audio` — WebAudio SFX/müzik.
- `Engine.input` — yerel klavye (P1/P2) + mobil touch + online input köprüsü.
- `Engine.score` — puan, combo, stil bonusu, leaderboard yazımı.
- `Engine.netbridge` — host: snapshot üret/yayınla; guest: snapshot uygula + interpolasyon.

---

## 5. Online Co-op Netcode Tasarımı  ⭐ (kritik bölüm)

### 5.1 Taşıma katmanı
- `dart-online.js` birebir şablon: **Supabase Realtime `channel('crude-room-<CODE>')`**,
  `broadcast + presence`. Tablo/RLS gerektirmez, anon key ile çalışır (ücretsiz katman).
- Oda kuran host RED; katılan guest BLUE. 5 karakterlik oda kodu (karışması kolay harfler yok).
- Presence ile karşı tarafın varlığı; join olduğunda host tam state gönderir (dart'taki
  `request-sync-source` deseni).
- CSP zaten `connect-src ... https://*.supabase.co wss://*.supabase.co` (bkz. neon-serpent) → hazır.

### 5.2 Otorite modeli
- **Host** tüm simülasyonu koşturur: düşman AI, spawn, fizik, çarpışma, hasar, skor, boss, sahne.
- **Guest** yalnız kendi input'unu gönderir ve host snapshot'ını render eder.
- PvE olduğu için host-otorite adil: guest "haksız" hisleri yaşamaz (rakip yok). Küçük gecikme,
  host'un düşman konumlarını biraz geç görmek demektir — kabul edilebilir.

### 5.3 Mesaj protokolü (broadcast event'leri)
| Yön | event | payload | frekans |
|-----|-------|---------|---------|
| guest→host | `input` | `{seq, ax, ay, btn}` (btn = bitmask) | ~30 Hz veya değişimde |
| host→guest | `snap` | dünya snapshot'ı (aşağıda) | ~15–20 Hz |
| host→guest | `event` | tek-atım olaylar (spawn, KO, boss-intro, SFX tetik, ekran-sarsıntı) | anlık |
| iki yön | `sys` | lobi/kontrol: `ready`, `pause`, `resume`, `stage-clear`, `game-over`, `sync-request` | anlık |

**Buton bitmask (btn):** `1=attack, 2=jump, 4=pickup/grab/throw, 8=special, 16=teamgrab`.

**Snapshot şeması (`snap`) — kompakt, ekran-dışı entity kültü:**
```js
{
  f: 1234,                       // host frame no (interpolasyon/geç-paket ayıklama)
  cam: 812,                      // kamera worldX
  sc: [12400, 8300],            // [redScore, blueScore]
  st: { stage: 2, arena: 3, locked: 1, boss: 0 },
  p: [                           // oyuncular [RED, BLUE]
    {x, y, z, f:1, s:'punch', hp:82, lives:2, hold:'obj:44'},
    {x, y, z, f:-1, s:'walk', hp:64, lives:3, hold:0}
  ],
  e: [ {id, t:'punk', x, y, z, f, s:'walk', hp} , ... ],   // yalnız kameraya yakın olanlar
  o: [ {id, t:'car', x, y, z, held:0} , ... ],             // fırlatılabilir nesneler
  j: [ {id, t:'bottle', x, y, z, vx, vz} , ... ],          // uçan projektiller
  it:[ {id, t:'food', x, y} , ... ]                        // itemlar
}
```
- Alan adları kısa (bant genişliği). `y` = derinlik (depthY), `z` = zıplama yüksekliği.
- Delta yok (v1); tam snapshot ama ekran-dışı entity gönderilmez. Ölçüm sonrası gerekirse
  delta-encode (§15 risk).

### 5.4 Guest tarafı düzeltme (smoothing)
- **Kendi avatarı (BLUE):** input'u yerel olarak hemen uygular (client-side prediction, yalnız
  hareket) → tuş hissi anlık. Host snapshot'ı gelince pozisyonu yumuşak (lerp) düzeltir; büyük
  sapmada (ör. >24px) snap'le. Dövüş sonucu (isabet/hasar) **daima host** kararı.
- **Diğer tüm entity:** iki snapshot arası pozisyon **interpolasyon** (buffer + ~100ms render
  gecikmesi). Boss/hızlı projektiller için gerekirse ekstrapolasyon.
- Animasyon durumu (`s`) host'tan gelir; guest sadece oynatır.

### 5.5 Bağlantı yaşam döngüsü
- **Join akışı:** guest odaya girer → presence join → host `sync` olarak tam state + sahne betiği
  indeksini gönderir → guest "hazır" → host oyunu başlatır/sürdürür.
- **Partner düşerse:** presence leave → oyun **duraklar**, "Partner bağlantısı koptu — bekleniyor…"
  Host, N saniye sonra solo devam seçeneği sunar. Guest için host giderse → lobiye dön.
- **Reconnect:** aynı kod ile yeniden katılım → yeni tam sync. (v1: oturum içi; kalıcı oda yok.)
- **Görünürlük:** sekme gizliyken host simülasyonu koşmaya devam eder (rAF kısılabilir; sabit-adım
  accumulator ile telafi). Guest gizliyken input nötrlenir.

### 5.6 Bant genişliği bütçesi
- Hedef: ekranda ~12 düşman + ~8 nesne + birkaç projektil → snapshot ~1–2 KB JSON.
- 15 Hz × ~1.5 KB ≈ **22 KB/s host→guest**; input ~0.1 KB × 30 Hz ≈ 3 KB/s guest→host.
- 2 istemcilik hobi ölçeği için Supabase Realtime ücretsiz katmanında kabul edilebilir.
  Faz 5 sonunda gerçek ölçüm alınacak; aşılırsa: entity kültü daralt, snapshot 12 Hz'e düşür,
  delta-encode.

### 5.7 Yerel co-op ile ortak kod
Yerel 2p ve online 2p **aynı motoru** kullanır; fark yalnız BLUE'nun input kaynağı (yerel klavye
vs. `net.remoteInput`) ve render'ın kaynağı (host = sim, guest = snapshot). Motor "iki oyuncu
entity'si" olarak yazılır; netcode üstüne ince bir köprüdür.

---

## 6. Oyun Sistemleri

### 6.1 Koordinat ve fizik (2.5D)
- Her aktör: `x` (dünya yatay), `depthY` (zemin bandı içi dikey konum, ~0..70px), `z` (zıplama
  yüksekliği), `vx, vDepth, vz`, `facing (±1)`.
- **Ekran y = groundBaseline + depthY − z** (kamera worldX çıkarılır x için).
- Yerçekimi `z`'ye uygulanır (`vz -= g·dt`; `z ≤ 0` → yere iniş, landing SFX/toz).
- **Derinlik ölçeği (opsiyonel perspektif):** üst (uzak) aktörler hafif küçük çizilir; çizim
  sırası `depthY` ile (arka önce). v1'de basit tut, faz 7'de incelt.

### 6.2 Çarpışma / isabet
- İsabet için: yatay AABB örtüşmesi **VE** `|depthY_a − depthY_b| < depthTol (≈14px)` **VE** benzer
  `z` (zıplama vuruşu havadaki hedefi tutar). Bu klasik beat 'em up "aynı hizada olma" kuralıdır.
- Hitbox/hurtbox aktör durumuna göre kare kare aktif (bkz. combat state süreleri).

### 6.3 Oyuncu durum makinesi
`idle, walk, jump, jumpKick, atk1, atk2, atk3(finisher), grab, grabHit, throwEnemy, pickup,
holdObj, swingObj, throwObj, special, teamGrab, teamThrow, hurt, knockdown, getup, downed, dead`
- **Kombo (M1):** atk1→atk2→atk3 ardışık basışta pencere (≈320ms) içinde zincirlenir; atk3 yere serer.
- **Zıplama tekmesi (M2):** havada attack → jumpKick hitbox.
- **Grab (M3/M4):** sersem/yakın düşmana pickup → grab; grab'de attack = grabHit (diz/kafa),
  pickup/throw = throwEnemy (ileri veya en yakın düşmana doğru — isabette combo bonus).
- **Nesne (M5/M6/M7):** yakın nesnede pickup → holdObj; attack = swingObj (silah vuruşu),
  throw = throwObj (parabolik/düz, kütleye göre). Büyük nesne: yavaş yürüme, kısa menzil, çok hasar,
  bazıları tek kullanımda kırılır.
- **Özel (M8):** special → yakın herkese hasar + knockback + shake; **HP maliyeti** (ör. −8).
- **Team grab/throw (M9):** teamgrab tuşu, partner yakınsa onu kaldırır (partner `beingHeld`);
  throw = partneri ağır projektil olarak fırlatır (yüksek hasar, iki tarafa da stil bonusu +
  komik SFX). Netcode: host çözer; guest partnerse kontrolü kısaca host'a bırakır (kısa "fırlatılıyor"
  animasyonu, guest input'u yok sayılır).
- **Hasar/knockdown:** eşik üstü vuruş knockdown; downed'da kısa invuln; getup.

### 6.4 Can / yaşam
- Oyuncu başına HP barı. 0 → can kaybı, blink invuln ile respawn (can varsa). 0 can → o oyuncu
  "devam bekliyor". Co-op: partner oynarken düşen oyuncu tekrar katılır (klasik "tap to join").
  Her iki oyuncu da 0 can → game over → devam ekranı (kredi/sayaç).

### 6.5 Düşman AI (Engine.ai)
- FSM: `spawn → approach → (in-range) attack → recover/backoff → reposition`.
- **Saldırı jetonu:** aynı anda en fazla `K` düşman saldırıya "commit" eder (ör. solo K=2, co-op K=3);
  diğerleri kuşatır ama bekler → adil, klasik his.
- Tipe göre parametre: hız, menzil, saldırı gecikmesi, HP, knockback direnci, ranged mı.
- Ranged düşman (M15): mesafeden şişe/taş fırlatır (projektil sistemi paylaşımlı).
- Düşman da knockdown olur, sersemken **grab'lenip fırlatılabilir** (M4 hedefi).

### 6.6 Boss (M13)
- Büyük HP barı (üstte), çok fazlı. Telegraph → saldırı penceresi → stagger/açıklık (öğrenilebilir
  ritim). Data-güdümlü hareket tablosu: `{phase, hpThreshold, moves:[...], openings:[...]}`.
- Co-op: boss HP iki oyuncuya göre ölçeklenir; aynı anda iki hedefi yönetir (en yakın/ tehdit puanı).

### 6.7 Sahne / arena (Engine.stage)
- Veri-güdümlü betik (bkz. §7.1). Sahne = sıralı arena dizisi:
  `{scrollTo, lock:true, waves:[{at, spawns:[{t, x, depthY, count}]}], clearWhen:'all-dead', boss?}`.
- Akış: kamera hedefe scroll → arena kilit → dalgalar → temizlenince "GO →" oku + kilidi aç → sonraki.
- Sahne sonu boss arenası; boss ölünce stage-clear ekranı + skor + (online) `sys:stage-clear`.

### 6.8 Kamera (Engine.camera)
- İki oyuncunun ortalamasını takip; **clamp**: hiçbir oyuncu ekran kenarını geçemez (aralarında
  görünmez duvar — klasik kısıt). Kilitli arenada sol/sağ dünya duvarı. Yumuşak takip (lerp) + boss
  girişinde kısa sabitleme.

### 6.9 Skor (Engine.score)
- Puan: isabet, KO, düşman fırlatma, nesne fırlatma, boss, hayatta kalma.
- Stil bonusu: düşmanı düşmana fırlatma (combo), **team-throw** (büyük bonus), çoklu-KO.
- Co-op: ortak skor + oyuncu kırılımı. Game over / stage-clear'da leaderboard'a yazılır (§12).

---

## 7. İçerik

### 7.1 Sahne betiği formatı (örnek)
```js
const STAGE_1 = {
  key: 'ruined-streets', name: 'HARABE SOKAKLAR',
  bg: 'skyline-ruins',                 // parallax preset
  music: 'stage-a',
  arenas: [
    { scrollTo: 0,    lock: true,  waves: [
        { at: 0,   spawns: [{ t:'punk', n:3, depth:[10,60] }] },
        { at: 'clear', spawns: [{ t:'punk', n:2 }, { t:'knife', n:1 }] }
      ], props: [{ t:'barrel', x:180 }, { t:'sign', x:420 }] },
    { scrollTo: 900, lock: true,  waves: [ /* ... */ ], props: [{ t:'car', x:1200 }] },
    { scrollTo: 1800, boss: 'brute-boss' }
  ]
};
```

### 7.2 Düşman kadrosu (v1)
`punk` (temel melee) · `knife` (bıçaklı, hızlı) · `brute` (iri, yüksek HP, grab-dirençli) ·
`acrobat` (zıplayan tekmeci) · `thrower` (uzaktan şişe/taş) · `mutant` (post-apokaliptik, güçlü) ·
`cyborg` (zırhlı asker). Her biri prosedürel piksel sprite + parametre seti.

### 7.3 Boss kadrosu (v1)
`brute-boss` (dev kabadayı) · `cyborg-boss` · `mutant-leader` · `gang-lord` · **`big-valley-final`**.
Her biri 2–3 saldırı + stagger penceresi.

### 7.4 Fırlatılabilir nesneler
Küçük: `bottle, rock, tire` · Orta: `barrel, trashcan, sign` · Büyük: `girder, lamppost, cardoor, car`.
Kütle → hız/menzil/hasar/kırılganlık.

### 7.5 Itemlar
`food` (HP+), `treasure` (skor), `weapon` (kalıcı silah — stretch). Düşman/kırılan kutu düşürür.

### 7.6 Sahne teması (v1, 5 sahne)
1. Harabe Sokaklar → brute-boss
2. Metro/Kanalizasyon → cyborg-boss
3. Liman/Gemi → mutant-leader
4. Big Valley Girişi → gang-lord
5. Big Valley Karargâh → **big-valley-final** + final sekansı

---

## 8. Kontroller

### 8.1 Online (her kullanıcı kendi cihazında, tam klavye)
| Aksiyon | Tuş (varsayılan) | Alternatif |
|---------|------------------|-----------|
| Hareket | WASD | Ok tuşları |
| Yumruk/saldırı | J | Z |
| Zıpla | K | X |
| Kaldır/Kavra/Fırlat | L | C |
| Özel | U | V |
| Team-grab (partneri tut) | I | B |
| Duraklat | P / Esc | — |

### 8.2 Yerel co-op (aynı klavye)
- **P1 (RED):** hareket WASD, saldırı F, zıpla G, kaldır/fırlat H, özel R, team-grab T.
- **P2 (BLUE):** hareket Ok tuşları, saldırı Numpad1, zıpla Numpad2, kaldır Numpad3, özel Numpad0,
  team-grab Numpad. (çakışmasız harita; belgelenecek ve ayarlardan gösterilecek.)

### 8.3 Mobil (touch)
- Sol: yön için sanal D-pad / analog. Sağ: 3–4 buton (saldırı, zıpla, kaldır/fırlat, özel).
  neon-serpent'in touch yaklaşımını genişlet. `touch-action: none`, safe-area padding.
- Team-grab: partnere yakınken "kaldır/fırlat" butonu bağlamsal olarak team-grab'a döner.

---

## 9. Sanat ve Ses

### 9.1 Sanat (prosedürel piksel)
- Harici görsel yok; canvas'a **kod-çizimli piksel sprite**. Yaklaşım: her aktör/pose için küçük
  piksel matrisi (indeksli palet) veya katmanlı dikdörtgenler. Site son dönem "kodla üretilen
  piksel-mozaik figürler" yönüyle tutarlı.
- Palet: RED kahraman (turuncu/kırmızı), BLUE kahraman (mavi/teal). Post-apokaliptik zemin:
  kahve/gri/toksik yeşil/gün batımı turuncu. `arcade-kit` palet isimleriyle uyumlu tutulabilir.
- Parallax katmanlar: uzak yıkık silüet + orta moloz + ön plan detay. Derinlik sıralı çizim.
- Juice: hit-stop (isabet aninda birkaç ms dondur), screen-shake, isabet partikülleri, KO tozu,
  fırlatma iz efekti, combo popup (arcade-kit `fx.burst/shake/popup` yeniden kullanılabilir).
- `prefers-reduced-motion`: sarsıntı/flaş azaltılır (neon-serpent deseni).

### 9.2 Ses (WebAudio, harici dosya yok)
- neon-serpent'teki küçük `audio` motoru genişletilir: `punch, hit, whoosh, land, pickup, break,
  enemyDie, bossRoar, food, combo, special, teamThrow, uiBeep`.
- Hafif chiptune stage döngüsü (osilatör tabanlı, opsiyonel). **Mute toggle** + tercih hatırlama.
- `sfx.js` sitede mevcut; ortak ses için değerlendirilebilir. `media-src data: blob:` CSP'de zaten var.

---

## 10. UI/UX Akışı

1. **Auth gate:** giriş yoksa `auth-gate.js` login'e yönlendirir (giriş yapan kullanıcı şartı).
2. **Lobi ekranı:** Mod seç → [Solo] [Yerel Co-op] [Online Co-op].
   - Online: [Oda Kur] → 5 harf kod göster ("arkadaşına ilet"); [Katıl] → kod gir.
   - Presence bağlanınca "Partner hazır ✓" → [Başlat] (host).
3. **HUD:** üstte iki HP barı (RED/BLUE) + can ikonları + skor; sahne adı; boss'ta boss HP barı.
4. **Oyun:** arena/scroll/GO okları; combo/stil popup'ları.
5. **Duraklat (P):** online'da `sys:pause` iki tarafı da duraklatır.
6. **Oyuncu düştü:** "DEVAM? 9…" geri sayım; partner oynamaya devam eder.
7. **Stage clear:** skor özeti + devam.
8. **Game over:** skor kaydı + leaderboard + [Tekrar]/[Lobi].
9. **Final:** big-valley-final sonrası kısa zafer sekansı + toplam skor.

---

## 11. Convivium Entegrasyon Kontrol Listesi

> Bu adımların **hepsi** yapılmadan iş "bitmiş" sayılmaz. Node yerelde yok → push sonrası
> `.github/workflows/flow-check.yml` smoke otomatik koşar; sonuç yeşil olmalı.

- [ ] **HTML head** (bkz. §17): origin yorumu + `origin-id: CVM-6841BBDC`, `meta author`,
      `meta x-convivium-origin content="ersinbinal.github.io#CVM-6841BBDC"`, charset, viewport
      (`viewport-fit=cover`), title `Crude Buster | Convivium`, description, `robots index, follow`,
      canonical `https://ersinbinal.github.io/games/crude-buster.html`, **CSP** (neon-serpent'inkiyle
      aynı: script-src self+jsdelivr; connect-src self+supabase https+wss), OG/Twitter, theme-color,
      manifest, icon.
- [ ] **Scriptler:** supabase-js CDN, supabase-config.js, supabase-client.js?v=33,
      auth-gate.js?v=<güncel> `data-item-key="crude-buster" data-item-type="game"
      data-item-title="Crude Buster"`, sonra crude-buster-net.js?v=1, crude-buster.js?v=1.
- [ ] **Body sonu:** görünmez canary `<i data-cvm aria-hidden="true">…</i>` = zero-width kodlu
      `EB|CVM-6841BBDC|ersinbinal.github.io` (§17.2), ardından origin-beacon.js?v=1.
- [ ] **routes.js:** `crude: '/games/crude-buster.html'` ekle; SW'deki `home/routes.js?v=` bump.
- [ ] **home-protocol.js:** terminal komut/route aksiyonu ekle (`route('crude', …)`), serpent deseni.
- [ ] **index.html:** mevcut oyun kartları/listesiyle tutarlı bir giriş/kart ekle.
- [ ] **service-worker.js:** `PRECACHE_ASSETS`'e `/games/crude-buster.html`,
      `/assets/js/crude-buster.js?v=1`, `/assets/js/crude-buster-net.js?v=1`,
      `/assets/css/crude-buster.css?v=1` ekle **ve `CACHE_NAME` bump** (`convivium-v168 → v169`).
- [ ] **sitemap.xml:** yeni URL ekle.
- [ ] **changelog.html:** "son sinyaller"e bir giriş.
- [ ] **README.md:** oyun listesine `crude-buster` ekle.
- [ ] **scripts/validate-site-integrity.js:** dokunduğun asset ?v'lerini SW ile tutarlı tut
      (validator zaten bayat olabilir; en azından kendi eklediklerin tutarlı olsun).
- [ ] (opsiyonel) **docs/database/2026-07-14-coop-runs.sql** + Supabase'de bir kez çalıştır.

---

## 12. Veri ve Kalıcılık

### 12.1 Mevcut şema ile (ek tablo YOK — v1 varsayılanı)
`game_scores` RLS zaten: herkes SELECT, authenticated kendi satırını INSERT. Oyun sonunda
**bağlı ve giriş yapmış her kullanıcı kendi satırını yazar** (`ConviviumActivity.recordGameScore`):
```
game_key: 'crude-buster'
score: <ortak takım skoru>       // veya kendi kırılımı; karar: ortak skor
best_streak: <ulaşılan sahne>    // beat 'em up'ta "streak" alanını "stage" olarak kullan
duration_seconds: <süre>
trace: 0                          // kullanılmıyor
initials: <display_name'den türetilir> (backend halleder)
```
Leaderboard: `fetchGameLeaderboard('crude-buster', 8)` — neon-serpent birebir deseni.

> Not: `saveGameScore` yalnız oturum açmış istemcide çalışır. Online co-op'ta host ve guest
> **ayrı ayrı kendi oturumlarıyla** yazar → iki satır (her kullanıcı kendi kaydını tutar). Bu, RLS
> `user_id = auth.uid()` kuralıyla uyumludur (host guest adına yazamaz).

### 12.2 (Opsiyonel) zengin co-op tablosu
Eğer "birlikte oynanan run" kimliği, iki oyuncu, sahne, süre birlikte istenirse:
`docs/database/2026-07-14-coop-runs.sql` — `game_scores` SQL'indeki RLS kalıbını izle
(SELECT herkese; INSERT authenticated ve `red_user_id = auth.uid() OR blue_user_id = auth.uid()`;
DELETE `public.is_admin()`). v1 için **gerekli değil**; §12.1 yeterli.

---

## 13. Build Fazları (sıralı, her faz test edilebilir)

- **Faz 0 — İskele:** HTML kabuk + CSS + auth-gate + canvas + boş loop + tüm entegrasyon kablolaması
  (routes, SW cache bump, canary, CSP). "Tek dude yürüyen boş arena" çıkar.
- **Faz 1 — Çekirdek motor:** fizik (x/depthY/z + yerçekimi), oyuncu durum makinesi, yumruk kombosu +
  zıplama, 1 düşman tipi + temel AI + saldırı jetonu, isabet/hasar/HP/KO/respawn/can. **Solo oynanır.**
- **Faz 2 — Kaldır/fırlat:** nesneler + düşman grab/throw + item drop (food). Fırlatma projektil sistemi.
- **Faz 3 — Yerel 2p co-op:** ikinci oyuncu entity, ortak kamera clamp, **team-throw (M9)**, co-op skor,
  yerel input haritası. **Koltuk co-op tam oynanır.**
- **Faz 4 — Sahne sistemi:** veri-güdümlü arena/scroll/lock/dalga/GO, çoklu düşman tipi, 1. sahne + ilk boss.
- **Faz 5 — Online netcode:** crude-buster-net.js (Supabase realtime), lobi (oda kur/katıl kod),
  host-otoriter snapshot loop, guest input + interpolasyon + prediction, join/leave/reconnect.
  **İki tarayıcı ile online co-op çalışır.** ← ana gereksinim burada tamamlanır.
- **Faz 6 — İçerik:** 5 sahne, tüm düşman/boss kadrosu, tüm nesne/item, final boss + zafer sekansı.
- **Faz 7 — Cila:** sanat geçişleri, SFX/müzik, hit-stop/shake/partikül/combo popup, mobil touch,
  erişilebilirlik (reduced-motion, remap, duraklat), leaderboard, denge.
- **Faz 8 — Entegrasyon kapanışı:** sitemap, changelog, README, SW son bump, flow-check smoke yeşil, docs.

---

## 14. Test Planı

- **Yerel:** solo + iki klavye co-op (Faz 1–3).
- **Online (Faz 5+):** iki ayrı tarayıcı profili / iki makine; **her ikisi de site hesabıyla giriş
  yapmış**; host oda kurar, guest kodla katılır. Doğrula: senkron, gecikme davranışı (interp/prediction),
  partner düşme/dönme, host çıkışı, tekrar katılım. Bant genişliğini DevTools ile ölç (§5.6).
- **Cihaz:** masaüstü klavye + mobil touch. `prefers-reduced-motion` açık/kapalı.
- **Regres:** push → GitHub Actions `flow-check` smoke otomatik. Public API ile SHA'ya göre kontrol:
  `api.github.com/repos/ErsinBinal/ErsinBinal.github.io/actions/runs?head_sha=<sha>`.
  e2e (Playwright) elle. **Node yerelde yok** → `npm run check` yerel koşmaz; asset ?v ↔ SW tutarlılığı
  ve `CACHE_NAME` bump elle güvence altına alınır.

---

## 15. Riskler ve Açık Sorular

- **R1 — Supabase Realtime limitleri:** snapshot hızında ücretsiz katman mesaj/sn sınırına takılabilir.
  Azaltım: entity kültü, 12–15 Hz, delta-encode. → Faz 5 sonunda ölç.
- **R2 — Relay gecikmesi:** ~50–150ms. PvE co-op için kabul edilebilir; host-otorite + interpolasyon
  ile örtülür. PvP olmadığından adalet sorunu yok.
- **R3 — Eşzamanlılık:** online co-op için iki kullanıcı **aynı anda çevrimiçi** olmalı. Oda kodu
  paylaşımı oyun-dışı (mesajlaşma). İleride `wall_marks`/davet ile içselleştirilebilir (v1 dışı).
- **R4 — Mobil ergonomi:** touch'ta beat 'em up konforu. Faz 7'de sanal pad + bağlamsal butonlarla ele alınır.
- **R5 — Sanat kapsamı:** en büyük zaman kalemi. Prosedürel piksel ile sınırlandırıldı; gerekirse
  `assets/vendor/kenney` prop/particle'ları (same-origin, CSP `self`) yardımcı kullanılır.
- **Açık soru (ürün):** Skor "ortak takım skoru" mu yoksa oyuncu-başı mı sıralansın? → v1: **ortak
  takım skoru**, best_streak = sahne. (Revize edilebilir.)
- **Karar (ürün):** Kahraman adları sabit: **E.Binal** (RED), **De.Binal** (BLUE).

---

## 16. Dosya-Dosya Spesifikasyon (uygulama başlarken)

### `games/crude-buster.html`
- §17 iskeleti. `<div id="stage">` içinde `<canvas id="game">` + lobi/HUD/overlay kartları
  (neon-serpent kart deseni). CSS `assets/css/crude-buster.css`'ten.

### `assets/js/crude-buster-net.js` → `window.CrudeNet`
- `dart-online.js` API'sını genelleştir: `create({ getClient, onSnap, onInput, onEvent, onSys,
  onPresence })` → `{ host(name), join(code,name), leave(), sendInput(obj), sendSnap(obj),
  sendEvent(t,p), sendSys(t,p), isHost(), localSlot(), opponentConnected(), roomCode() }`.
- Kanal adı `crude-room-<CODE>`; event'ler §5.3. Host join'de `onSys('sync-request')` alır.

### `assets/js/crude-buster.js` → `window.CrudeBuster`
- `boot({ mount, mode, net })`. Alt-modüller §4.3.
- Sabit-adım 60 Hz sim; host render = sim; guest render = snapshot interp. `netbridge` host'ta her
  ~4 frame'de `sendSnap`, guest'te `onSnap` buffer'lar. Guest input `sendInput` (~30 Hz / değişimde).

### `assets/css/crude-buster.css`
- Tam-ekran koyu sahne, HUD barları, lobi paneli, mobil touch kontrol yerleşimi, kart overlay'leri.
  `components.css`/`arcade-kit.css` değişkenleriyle uyumlu.

---

## 17. Ek

### 17.1 Origin-id (bu dosya için)
- Path `games/crude-buster.html` → **origin-id = `CVM-6841BBDC`**
  (= `CVM-` + MD5("games/crude-buster.html")[:8], büyük harf). Doğrulandı: aynı yöntem
  neon-serpent→`CVM-C5B90093`, auth→`CVM-EA6F2EE7` ile birebir eşleşir.

### 17.2 Görünmez canary üretimi
- `</body>` öncesi `<i data-cvm aria-hidden="true">…</i>` içine, `EB|CVM-6841BBDC|ersinbinal.github.io`
  metnini şu şemayla zero-width kodla: **U+2060 = başlangıç/bitiş sınırı**, her byte UTF-8'in 8 biti,
  **U+200B = 0 bit, U+200C = 1 bit**. (Çözücü: sınırlar arası 200B/200C → 0/1 → 8'erli byte → UTF-8.)
- Dosya oluşturulurken bu string üretilip gömülecek (build adımı; elle üretilebilir).

### 17.3 CSP (head'e, neon-serpent ile aynı)
```
default-src 'self'; object-src 'none'; base-uri 'self';
script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline'; img-src 'self' data:;
media-src 'self' data: blob:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co; font-src 'self';
```

### 17.4 HTML head iskeleti (özet)
```html
<!DOCTYPE html><html lang="tr"><head>
<meta name="referrer" content="strict-origin-when-cross-origin">
<!-- Convivium Origin Marker (c) 2026 Ersin Binal ... origin-id: CVM-6841BBDC -->
<meta name="author" content="Ersin Binal">
<meta name="x-convivium-origin" content="ersinbinal.github.io#CVM-6841BBDC">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Crude Buster | Convivium</title>
<meta name="description" content="Harabe Big Apple'da iki kaslı kahraman: her şeyi kaldır, fırlat, co-op temizle. İki giriş yapmış kullanıcıyla online co-op beat 'em up.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://ersinbinal.github.io/games/crude-buster.html">
<meta http-equiv="Content-Security-Policy" content="… (§17.3) …">
<!-- OG/Twitter, theme-color, manifest, icon (neon-serpent ile aynı düzen) -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="/assets/js/supabase-config.js"></script>
<script src="/assets/js/supabase-client.js?v=33"></script>
<script src="/assets/js/auth-gate.js?v=22" data-item-key="crude-buster" data-item-type="game" data-item-title="Crude Buster"></script>
<link rel="stylesheet" href="/assets/css/crude-buster.css?v=1">
</head><body> … <canvas> … </body></html>
```

---

_Bu döküman onaylandıktan sonra Faz 0'dan başlanacak. Her faz sonunda oynanabilir bir yapı çıkması,
"hiçbir detayı atlamadan" ilkesini test edilebilir kılar._
