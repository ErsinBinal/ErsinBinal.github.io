# Bugy V3 Native Core

Bugy V3, CSS/DOM yerine 320x180 transparent framebuffer ureten C++ cekirdek olarak tasarlandi. Tarayici tarafinda `assets/js/bugy-v3-loader.js` bu framebuffer'i Canvas'a basar.

## Build

Emscripten SDK aktifken:

```sh
npm run build:bugy-v3
```

Elle derlemek icin:

```sh
em++ src/native/bugy-v3/bugy_v3.cpp \
  -O3 --no-entry -s STANDALONE_WASM=1 \
  -s EXPORTED_FUNCTIONS='["_bugy_init","_bugy_update","_bugy_trigger","_bugy_next","_bugy_set_skin","_bugy_framebuffer","_bugy_width","_bugy_height","_bugy_x","_bugy_y","_bugy_state","_bugy_skin"]' \
  -o assets/wasm/bugy-v3.wasm
```

`assets/wasm/bugy-v3.wasm` yoksa loader otomatik olarak Canvas fallback ile calisir. Bu sayede site Emscripten kurulu olmayan ortamlarda kirilmaz.
