# Convivium Yenilik Kuyrugu — Handoff

Tarih: 2026-07-17. Bu dokuman, site incelemesi sonrasi onaylanan 8 yaratici
yenilik + gelistirici notlarinin uygulama kuyrugunu tasir. Uc parca tamamlandi
ve canliya alindi; kalanlar sirayla uygulanacak. Her biten parca ayri commit
ile main'e push edilir (GitHub Pages otomatik yayinlar).

## Tamamlananlar

| Parca | Commit | Not |
|---|---|---|
| Crude Buster -> Lab "Yan protokoller" + arsiv agaci linki | `09fff6d` | index.html, SW v173 |
| RSS feed `/signals.xml` + changelog girdisi + kesif linkleri | `c8d6301` | SW v174 |
| home-protocol.js modullestirme (dev notu 1/2) | `7b0e9c4` | 5698 -> ~3970 satir; SW v175 |

## Kurulan modul deseni (yeni ozellikler bunu izlemeli)

- Yeni frontend alt sistemleri `assets/js/home/<ad>.js` dosyasina yazilir.
- Dosya `window.ConviviumHome.create<Ad>(deps)` fabrikasi tanimlar (IIFE, ES module degil).
- home-protocol.js icinde bagimliliklarla kurulur, `let <ad>Mod = null` tutucusuna atanir.
- index.html'de script etiketi **home-protocol.js'ten ONCE** eklenir (`defer`, `?v=1`).
- Su listelere ekleme yapilir: service-worker.js `PRECACHE_ASSETS`,
  `scripts/validate-site-integrity.js mustPrecache`, `scripts/sync-cache-versions.js managedAssets`,
  package.json `check:syntax`.
- Her deploy'da: degisen versiyonlu asset'lerin `?v=` degeri + SW `CACHE_NAME` artirilir
  (su an v175). index.html degistiyse zaten SW bump gerekir.
- Ornekler: `assets/js/home/pipe-90.js`, `outrun-86.js`, `screen-saver.js`.

## Diger kurallar

- Yeni HTML sayfasi eklenirse canary semasi uygulanir (gorunur origin-meta +
  zero-width imza + origin-beacon.js; mevcut sayfalardan kopyala, origin-id =
  `CVM-` + goreli yolun MD5 ilk 8 hex'i).
- Kullaniciya gorunur her yeni ozellik icin: `pages/changelog.html`e girdi +
  `signals.xml`e item eklenir (RSS ritueli).
- Supabase semasi degisiklikleri `docs/database/YYYY-MM-DD-<ad>.sql` dosyasina
  yazilir + `supabase-schema.sql` guncellenir. **SQL'i Supabase panelinde calistirmak
  kullanicinin isi** — frontend tablo yokken zarifce susmali (wall_marks ornegi).
- Node yerelde yok; dogrulama push sonrasi Actions "Flow Check" smoke ile olur.
  Buyuk JS degisikliginde brace/paren dengesi + diff incelemesi yap.

## Kuyruk (sirayla)

### 1. Canli varlik katmani ("who") — SIRADAKI
Supabase Realtime **Presence** ile anonim es-zamanli ziyaretci izi. Auth gerekmez
(anon key yeterli). Modul: `assets/js/home/presence.js` (`createPresence(deps)`).
- Kanal: `presence:site`; her istemci `{ page: location.pathname, tag: 'wanderer-xxxx' }`
  track eder (tag: sessionStorage'da uretilen kisa rasgele rumuz).
- HUD'a "signals nearby: N" satiri (`system-hud`e yeni `hud-line`).
- Terminale `who` komutu: rumuz + oda listesi ("wanderer-7f2 /lab").
- Sinyal haritasindaki dugumler (atlas-node) o an ic(er)inde insan olan sayfalara
  gore parlar (CSS sinifi `has-signal`).
- Supabase yoksa/baglanamazsa sessiz devre disi; `who` komutu "sinyal yok" der.
- Not: crude-buster-net.js'te Realtime kanal kullanim ornegi var.

### 2. Sisedeki mesaj (bottle)
Asenkron rastlantisal mesajlasma. Yeni tablo `bottle_messages`
(docs/database/2026-07-XX-bottles.sql): id, sender_id, body (<=280), status
('afloat'|'caught'), catcher_id, caught_at, reply_to, created_at. RLS:
authenticated insert (kendi adina), afloat olanlardan rastgele birini "catch"
etme bir RPC fonksiyonuyla (guvenli update) yapilir; herkes kendi gonderdigi/
yakaladigini okur. Terminal komutlari: `bottle throw <mesaj>`, `bottle catch`,
`bottle list`. Giris yapmamis kullaniciya login yonlendirmesi. Gunluk atis
limiti (ornegin 3) RPC icinde.

### 3. Co-op kapi ALTYAPISI (simdilik yalniz altyapi)
Iki kullanici ayni anda ayni komutu yazarsa acilan kapi. Bu fazda SADECE altyapi:
- Modul `assets/js/home/coop-gate.js`: Realtime broadcast kanali `coop:gate`;
  `attempt(code)` cagrisi `{ tag, code, ts }` yayinlar; 8 sn icinde ayni `code`
  ile ikinci farkli tag gelirse `onSync(code)` tetiklenir.
- Terminale gizli `resonate <kelime>` komutu baglanir; senkron yakalaninca
  simdilik yalnizca "rezonans kaydedildi" cevabi + `state.easterTrail`e iz.
- Sifreye uygun uygulama/oda SONRAKI fazda eklenecek (kullanici karari).

### 4. Signal Shards ekonomisi
Tum oyun/ritueller tek para birimine baglanir. `world_state`e `shards integer`
kolonu (migration) + localStorage yedegi. Kazanim: oyun skoru kaydinda,
ritual tamamlamada, gunluk ilk ziyarette, kesiflerde kucuk oduller (award()
cagri noktalarina eklemlenir). Harcama: terminalde `shop` komutu — kozmetik:
terminal temalari (mevcut `theme` komutu varyantlari), screensaver varyanti,
Bugy aksesuar bayragi. Envanter `world_state.inventory`e yazilir. Buyuk is;
kucuk dilimlere bol: (a) kazanim+bakiye+`shards` komutu, (b) shop, (c) kozmetik uygulama.

### 5. Gunun sinyal karti
`daily_signal` zaten var (tablo + fetch). Eklenecek: seed=YYYY-MM-DD ile
deterministik prosedurel SVG kart (glyph kombinasyonu + renk + kisa metin;
mulberry32 benzeri seeded RNG). Terminal `signal` komutu kartini gosterir
(ASCII onizleme) + `collect` karti `world_state.inventory`e `card:YYYY-MM-DD`
olarak ekler (gunde 1, kacan gun kacar). `cards` komutu koleksiyonu listeler.
Ilerisi: kart gorselini paylasma sayfasi.

### 6. Convivium Wrapped (iz raporu)
Mevcut verilerden (game_scores, user_app_sessions, oracle_profiles, dart_*)
kisisel ozet karti. Dashboard'a "iz raporu" paneli + terminale `wrapped`
komutu. Sadece giris yapmis kullanici; veri yoksa zarif bos durum. Prosedurel
SVG/canvas kart + "indir" (canvas.toBlob) butonu. Yeni tablo gerekmez.

### 7. Gece frekansi (00:00-05:00)
Modul `assets/js/home/night-mode.js`: yerel saat 00:00-05:59 arasi `body`ye
`is-night-frequency` sinifi + home.css'e soluk/alcak kontrast palet varyanti.
Oracle satirlarina gece varyantlari, HUD'a "low frequency" ibaresi. Yalnizca
gece gorunen bir `drawer-link` (hidden katmanla uyumlu kucuk bir kapi).
Saat basi kontrol (setInterval 60sn). prefers-reduced-motion'a saygi.

### 8. Convivium Radio
Modul `assets/js/home/radio.js`: WebAudio prosedurel ambient (sfx.js'in
AudioContext'ini paylas — `window.ConviviumSFX`). `radio` komutu ac/kapa,
`radio next` istasyon degistirir. Gunun seed'iyle (tarih) herkes ayni gun
ayni "yayini" duyar; sayfa basina baz frekans farki. Ses toggle'i (audio off)
kapaliyken radio da susar. Dis istek yok (CSP dostu).

### Gelistirici notu 2/2 (acik kalan)
- RSS feed'i canliya alindi; makaleler Supabase'den dinamik geldigi icin feed
  simdilik changelog sinyallerini tasiyor. Istenirse: Worker uzerinden
  articles tablosunu okuyup feed'i zenginlestiren bir endpoint dusunulebilir.

## Dogrulama ritueli (her parca icin)
1. Degisen dosyalarda `?v=` bump + SW `CACHE_NAME` artir.
2. Brace/paren dengesi: `grep -o '{' f | wc -l` vs `}` (kabaca).
3. Commit + push -> Actions "Flow Check" smoke yesil mi bak.
4. Canlida hizli el testi (terminal komutu calisiyor mu).
5. Kullaniciya gorunur ozellikse changelog + signals.xml guncelle.
