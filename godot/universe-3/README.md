# Universe-3: Axiom Rift

Godot 4 kaynak projesi. Universe-2'de kalan skor ve filo basinci artik daha modern bir arena/haritalama dongusune tasindi: oyuncu Axiom Rift icinde ankrajlari tarar, dusmanlardan cekirdek toplar, isi ve enerjiyi yonetir, son olarak Axiom Kapisi'ni stabilize eder.

## Oyun dongusu

- Ankraj halkasinin icinde kalarak tarama ilerletilir.
- Dusmanlar cekirdek dusurur; cekirdekler stabilite, enerji ve pulse kazandirir.
- Sol tik odak atesi daha gucludur ama isiyi hizli yukseltir.
- Space blink enerji harcar ve kisa sure dokunulmazlik verir.
- X pulse hazir oldugunda dusman mermilerini temizler ve yakin basinci kirar.

## Calistirma

1. Godot 4.3+ ile bu klasoru ac: `godot/universe-3/project.godot`
2. Ana sahne zaten ayarli: `res://scenes/Main.tscn`
3. Play tusu ile oyunu calistir.

## Web export

Export preset hazir. Godot editorunde `Project > Export > Web > Export Project` ile cikti yolu olarak su dosyayi kullan:

```text
games/universe-3/index.html
```

Godot web export dosyalari ayni klasorde `index.html`, `.js`, `.pck`, `.wasm` ve splash `.png` olarak durmali. Root'taki `universe-3.html` bu export hazir oldugunda oyunu otomatik olarak iframe icinde acar; export yoksa gelismis canvas fallback oynanir.

## Kontroller

- WASD / oklar: hareket
- Mouse: hedef
- Sol tik: odak atesi
- Space: blink / baslat
- X: rift pulse
- R: yeniden baslat
