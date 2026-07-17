# Convivium Yenilik Kuyrugu — Handoff

Tarih: 2026-07-17 (guncellendi). Site incelemesi sonrasi onaylanan 8 yaratici
yenilik + gelistirici notlari kuyrugu TAMAMLANDI. Her parca ayri commit ile
main'e push edildi (GitHub Pages otomatik yayinlar).

## Tamamlananlar

| Parca | Commit | Not |
|---|---|---|
| Crude Buster -> Lab "Yan protokoller" + arsiv agaci linki | `09fff6d` | index.html, SW v173 |
| RSS feed `/signals.xml` + changelog girdisi + kesif linkleri | `c8d6301` | SW v174 |
| home-protocol.js modullestirme (dev notu 1/2) | `7b0e9c4` | 5698 -> ~3970 satir; SW v175 |
| 1. Canli varlik katmani: who + Signals HUD + atlas parlamasi | `74bead1` | home/presence.js; SW v176 |
| 2. Sisedeki mesaj: bottle throw/catch/list | `da1d325` | RPC tabanli; SW v177; **SQL bekliyor** |
| 3. Co-op kapi altyapisi: gizli resonate komutu | `14812ef` | home/coop-gate.js; SW v178 |
| 4. Signal Shards: kazanim + bakiye + shop | `4db96dd` | world_state.shards; SW v179; **SQL bekliyor** |
| 5. Gunun sinyal karti: card/collect/cards | `89163ff` | mulberry32 seed; SW v180 |
| 6. Convivium Wrapped: wrapped + dashboard PNG kart | `de99024` | yeni tablo yok; SW v181 |
| 7. Gece frekansi 00:00-05:59 | `113b46c` | home/night-mode.js; SW v182 |
| 8. Convivium Radio: prosedurel ambient | `b56278c` | home/radio.js; SW v183 |

## KULLANICI AKSIYONU BEKLEYENLER (Supabase SQL Editor)

1. `docs/database/2026-07-17-bottles.sql` — bottle_messages tablosu + RLS +
   throw_bottle/catch_bottle RPC'leri. Calistirilana kadar `bottle` komutu
   "sise agi henuz kurulmamis" der (zarif fallback, hata yok).
2. `docs/database/2026-07-17-shards.sql` — world_state.shards kolonu.
   Calistirilana kadar shard bakiyesi yalniz localStorage'da yasar
   (client kolon hatasinda eski secime otomatik duser; senkron kirilmaz).

## Kurulan modul deseni (yeni ozellikler bunu izlemeli)

- Yeni frontend alt sistemleri `assets/js/home/<ad>.js` dosyasina yazilir.
- Dosya `window.ConviviumHome.create<Ad>(deps)` fabrikasi tanimlar (IIFE, ES module degil).
- home-protocol.js icinde bagimliliklarla kurulur, `let <ad>Mod = null` tutucusuna atanir.
- index.html'de script etiketi **home-protocol.js'ten ONCE** eklenir (`defer`, `?v=1`).
- Su listelere ekleme yapilir: service-worker.js `PRECACHE_ASSETS`,
  `scripts/validate-site-integrity.js mustPrecache`, `scripts/sync-cache-versions.js managedAssets`,
  package.json `check:syntax`.
- Her deploy'da: degisen versiyonlu asset'lerin `?v=` degeri + SW `CACHE_NAME` artirilir
  (su an v183). index.html degistiyse zaten SW bump gerekir.
- Ornekler: `assets/js/home/presence.js`, `coop-gate.js`, `night-mode.js`, `radio.js`.

## Diger kurallar

- Yeni HTML sayfasi eklenirse canary semasi uygulanir (gorunur origin-meta +
  zero-width imza + origin-beacon.js; mevcut sayfalardan kopyala, origin-id =
  `CVM-` + goreli yolun MD5 ilk 8 hex'i).
- Kullaniciya gorunur her yeni ozellik icin: `pages/changelog.html`e girdi +
  `signals.xml`e item eklenir (RSS ritueli). (resonate gibi gizli ozellikler haric.)
- Supabase semasi degisiklikleri `docs/database/YYYY-MM-DD-<ad>.sql` dosyasina
  yazilir + `supabase-schema.sql` guncellenir. **SQL'i Supabase panelinde calistirmak
  kullanicinin isi** — frontend tablo yokken zarifce susmali (bottle/shards ornegi).
- Node yerelde VAR (v22): push oncesi `npm run check:syntax` +
  `node scripts/validate-site-integrity.js` + `node scripts/sync-cache-versions.js --bump`
  calistirilir; push sonrasi Actions "Flow Check" smoke yesil mi bakilir.

## Olasi sonraki fazlar (kullanici karariyla)

- **Co-op kapi fazi 2**: rezonans yakalaninca acilacak gercek kapi/oda
  (coop-gate.js `onSync` su an yalniz iz + mesaj birakir; easterTrail'de
  `resonate:<kelime>` kaydi var).
- **Kart paylasim sayfasi**: gunun sinyal kartinin SVG gorselini paylasma
  (buildDailyCard home-protocol.js icinde; ayni seed mantigiyla SVG uretilebilir).
- **Shards genisletmesi**: oyun sayfalarindan (game_scores kaydinda) shard
  kazanimi + shop'a yeni kozmetikler. Bugy bayragi bayragi (`convivium.bugy.flag`)
  su an yalniz localStorage'da; bugy modulleri henuz okumuyor.
- **Gelistirici notu 2/2 (acik)**: RSS feed'i makaleler Supabase'den dinamik
  geldigi icin simdilik changelog sinyallerini tasiyor. Istenirse Worker
  uzerinden articles tablosunu okuyup feed'i zenginlestiren endpoint yazilabilir.

## Dogrulama ritueli (her parca icin)

1. Degisen dosyalarda `?v=` bump + SW `CACHE_NAME` artir (`sync:cache:bump`).
2. `npm run check:syntax` + `node scripts/validate-site-integrity.js`.
3. Commit + push -> Actions "Flow Check" smoke yesil mi bak.
4. Canlida hizli el testi (terminal komutu calisiyor mu).
5. Kullaniciya gorunur ozellikse changelog + signals.xml guncelle.
