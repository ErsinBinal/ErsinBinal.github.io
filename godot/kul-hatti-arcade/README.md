# Kül Hattı: Arcade (Godot 4 + GDScript)

90'lar arcade tarzı **side-scroller beat 'em up** prototipi. Web sitesinden ayrı,
Godot 4.x masaüstü motorunda çalışan bir oyun projesidir.

> Geliştirme notları ve standartlar için repo kökündeki **`games.txt`** dosyasına bakın.

## Çalıştırma

1. [Godot 4.x](https://godotengine.org) indir (standart/GDScript sürümü; .NET gerekmez).
2. Godot'u aç → **Import** → bu klasördeki `project.godot` dosyasını seç.
3. **F5** (Play).

## Kontroller

| Tuş | Eylem |
|-----|-------|
| WASD / Ok tuşları | Hareket (yatay + derinlik) |
| J veya Z | Yumruk (3'lü kombo; 3. vuruş ağır) |
| R | Oyuncu ölünce yeniden başla |

## M0 (mevcut) ne içeriyor?

- 8 yön hareket eden oyuncu (sahte-Z derinlik bandı), 3'lü kombo yumruk,
  knockback, i-frame, can.
- Oyuncuyu takip eden, temas hasarı veren, can/hurt/ölüm-fade'li düşmanlar.
- Yatay kamera takibi, zemin + derinlik panelleri, HUD (HP + düşman sayısı).

Tüm görseller şimdilik **yer tutucu primitif** (kod ile çizilen dikdörtgenler);
asset gerektirmez. Sonraki adımlar `games.txt` milestone planında.

## Yapı

```
godot/kul-hatti-arcade/
├── project.godot      # Godot 4 proje ayarı (main scene = Main.tscn)
├── Main.tscn          # kök sahne (Node2D + Main.gd)
└── scripts/
    ├── Main.gd        # dünya, kamera, HUD, spawn, akış
    ├── Player.gd      # hareket + kombo + can
    └── Enemy.gd       # takip AI + hasar
```
