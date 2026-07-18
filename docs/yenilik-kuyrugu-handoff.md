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
| Ek: Canli sohbet chat/say (kullanici istegi) | `c591d90` | home/chat.js; ucucu broadcast; SW v184 |
| Ek: Ortak ekran koruyucu (gezgin uydulari + mesaj yildizlari) | `d0ddb1e` | presence.list() + screenSaver.pushSignal; SW v185 |
| Ek: Chat guvertesi + davetler + sinyal cipi + Bugy balon entegrasyonu | `eb97127`..`32aad94` | chat-deck.js, oyun davet URL'leri; SW v186-v194 |

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
  (guncel deger icin service-worker.js'e bak; bu belgede sabit sayi tutma).
  index.html degistiyse zaten SW bump gerekir.
- **Uyari (2026-07-17):** icerigi degisen HER versiyonlu asset'te `?v=` bump
  ZORUNLU — SW bump tek basina yetmez (tarayici HTTP cache'i ayni `?v=` ile
  bayat icerik verebilir; supabase-client v36 vakasi).
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

## Ucu acik isler / olasi sonraki fazlar (kullanici karariyla)

> Üretim sertleştirme hattı kapandı; Faz 1A/1B/2A/2B/2C/2D canlıya alındı.
> Faz 3A shard ekonomi çekirdeği yerelde doğrulandı ve kullanıcı
> incelemesi/commit/push/yayını bekliyor.
>
> Güncel durum, test kapıları, rollback ve sıradaki kesin adım:
> [Home Protocol Modülerleştirme Handoff](home-protocol-modularization-handoff.md).

### 0. Fikir havuzu (2026-07-17 beyin firtinasi; kullanici "sonra ele alalim" dedi)
- **Sinyal Arkeolojisi**: sitenin "eski surumlerinden kalma" sahte kalintilar
  (bozuk 1997 BBS sayfasi, yarim TODO.txt, kurtarilmis oyun ekrani). `cd /ruins`
  ile girilen, zamanla kazilan statik katman. Sifir maliyet, yuksek kesif hissi.
- **Gezgin Mirasi**: bilincli `depart` komutuyla tek cumlelik veda izi birakma;
  sonraki ziyaretci rastgele bir vedayla karsilanir (wall_marks benzeri tablo).
- **Kolektif Rituel**: gunluk kart toplamada site geneli esik (orn. 10 collect)
  asilirsa herkese ortak bonus — "frekans esigi asildi". site_events + count.
- **Sinyal Firtinasi (shard loteri)**: gunun seed'iyle belirli dakikalarda 30
  sn'lik firtina; o an sitede olup `catch signal` yazan shard kazanir.
- **Kart Takasi**: gunluk kartlar bottle uzerinden takas edilir
  (`bottle throw card:2026-07-12`); kacan gunlerin kartlari dolasima girer.
- **Oracle Ruya Gunlugu**: Worker cron her gece site_events toplamlarindan tek
  paragraflik anonim "ruya" yazar; `dream` komutuyla okunur.
- **Webring/Antenna**: baska kisisel sitelerin RSS'lerini Worker'da toplayan
  kucuk bir antenna sayfasi (signals.xml'in tersi; eski internet ruhu).
- (Ortak ekran koruyucu fikri SECILDI ve uygulandi — asagidaki tabloya bakin.)

### 1. Rezonans kapisi — FAZ 2 (kullanici karari: SIMDILIK BEKLIYOR)
Altyapi hazir: gizli `resonate <kelime>` komutu var; 8 sn icinde iki gezgin
ayni kelimeyi yazarsa `coop-gate.js onSync` tetikleniyor (su an yalniz iz +
mesaj + 3 shard; easterTrail'e `resonate:<kelime>` yaziliyor). Kapinin
kendisi YOK. Secenekler (kombinasyon da olur, orn. c+a):
- (a) **Gizli oda**: rezonans olusunca iki gezgine ozel sanal oda acilir
  (`worldRooms`a `/resonance` eklenir, `cd resonance`); icinde ortak iz/odul.
- (b) **Ozel fisilti kanali**: rezonans yakalayan iki kisi chat altyapisiyla
  (home/chat.js deseni) otomatik ozel bir kanala duser (`chat:res-<kelime>`).
- (c) **Tek dogru sifre kelimesi**: rastgele degil; sitede ipuclariyla sakli
  tek bir kelime (duvar yazilari, gece frekansi, kart sozleri icine gomulur).
  Onu bulan iki kisi kapiyi acar.

### 2. Chat genisletmeleri
- Oda-bazli `whisper`: yalniz ayni terminal odasindakilere (`virtualCwd`)
  giden mesaj; chat.js'te payload'da `room` zaten var, filtre yeterli.
- Kanal ayrimi istenirse `chat:site` yerine oda basina kanal.

### 3. Kart paylasim sayfasi
Gunun sinyal kartinin SVG/PNG gorselini uretip paylasma sayfasi.
`buildDailyCard` home-protocol.js icinde; ayni seed mantigiyla (mulberry32 +
tarih) SVG uretilebilir. Wrapped'daki canvas->PNG indirme deseni ornek.

### 4. Shards genisletmesi
- Oyun sayfalarindan shard kazanimi (game_scores kaydina eklemlenir).
- Shop'a yeni kozmetikler (dilim c'nin devami).
- Bugy bayragi (`convivium.bugy.flag`) su an yalniz localStorage'da bir
  bayrak; bugy modulleri henuz okumuyor — gorsel aksesuara baglanmali.

### 5. Gelistirici notu 2/2 (acik)
RSS feed'i makaleler Supabase'den dinamik geldigi icin simdilik changelog
sinyallerini tasiyor. Istenirse Worker uzerinden articles tablosunu okuyup
feed'i zenginlestiren bir endpoint yazilabilir.

## Dogrulama ritueli (her parca icin)

1. Degisen dosyalarda `?v=` bump + SW `CACHE_NAME` artir (`sync:cache:bump`).
2. `npm run check:syntax` + `node scripts/validate-site-integrity.js`.
3. Commit + push -> Actions "Flow Check" smoke yesil mi bak.
4. Canlida hizli el testi (terminal komutu calisiyor mu).
5. Kullaniciya gorunur ozellikse changelog + signals.xml guncelle.
