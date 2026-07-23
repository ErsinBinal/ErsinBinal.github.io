# Neon River — Neon Filo (bankalanmis assetler + neon-mod plani)

> **DURUM (2026-07-23):** Neon mod canliya alindi ama kullanici geri
> bildirimiyle **GERI ALINDI** (oyun klasik haline dondu). Asagidaki GLB'ler
> `assets/models/fleet/`'te bankada duruyor; ileride baska bir amacla
> kullanilabilir. Neon sprite'lari (`assets/img/neon-fleet/`) ve oyun kodu
> kaldirildi.


Tarih: 2026-07-23
Durum: **GLB'ler bankalandi** (`assets/models/fleet/`). "Neon mod" oynanisi
henuz KODLANMADI — bu dosya o dilim icin handoff.

## Bankalanan modeller (Meshy text-to-3D, ~20 kredi/model)
Gemiler (oyuncu secilebilir): `ship-interceptor`, `ship-gunship`,
`ship-delta`, `ship-arrow`, `ship-orbiter`.
Dusmanlar: `enemy-drone`, `enemy-mine`, `enemy-hunter`, `enemy-turret`,
`enemy-swarmer`, `enemy-boss-carrier` (boss).

## Stil / palet
Neon River cyan (#00ffff) + magenta temasi. Sprite render'i icin toon shader:
cyan govde (cMid #00b0c7 civari, cHi acik cyan) + magenta rim (#ff2ea6).
Referans render harness'i: oturumdaki `.neon-sprite.html` (cDark/cMid/cHi/cRim
uniformlari). Sprite'lar 3/4 ust acidan render edildi; oyunda dikey scroller
icin ust-3/4 ya da tam ust acidan yeniden render gerekebilir.

## Neon-mod entegrasyon plani (yapilacak)
1. Her GLB'yi neon sprite PNG'ye render et (mevcut hat) -> `assets/img/neon-fleet/`.
2. Neon River (Phaser, `games/neon-river.html`) icinde:
   - Mevcut prosedurel voxel gemi dokulari yaninda, image-tabanli doku olarak
     yeni gemileri yukle (Phaser `this.load.image` / `textures.addBase64`).
   - "NEON MOD" secenegi: yeni gemi secim ekrani + yeni dusman spawn tablosu +
     boss dalgasi. Mevcut zorluk/skor mantigini koru (davranis-notr eklenti).
3. Kapilar + headless + canli + changelog. Sprite'lar runtime-cache.

## Not
GLB'ler kalici (krediler suresi doluyordu, o yuzden simdi uretildi). Oynanis
kodu istenildiginde ayri dilimde yazilacak.
