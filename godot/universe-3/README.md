# Universe-3: Rift Cartographer

Godot 4 kaynak projesi. Universe-2'de artan boyutsal basincin devami olarak tasarlandi: oyuncu filo savasindan sonra yarigin icinde sinyal isaretleri toplar, gecitleri stabilize eder ve bir sonraki evrene rota acar.

## Calistirma

1. Godot 4.3+ ile bu klasoru ac: `godot/universe-3/project.godot`
2. Ana sahne zaten ayarli: `res://scenes/Main.tscn`
3. Play tusu ile oyunu calistir.

## Web export

Export preset hazir. Godot editorunde `Project > Export > Web > Export Project` ile cikti yolu olarak su dosyayi kullan:

```text
games/universe-3/index.html
```

Godot web export dosyalari ayni klasorde `index.html`, `.js`, `.pck`, `.wasm` ve splash `.png` olarak durmali. Root'taki `universe-3.html` bu export hazir oldugunda oyunu otomatik olarak iframe icinde acar.

## Kontroller

- WASD / oklar: hareket
- Mouse: hedef
- Space: dash / baslat
- X: pulse
- R: yeniden baslat
