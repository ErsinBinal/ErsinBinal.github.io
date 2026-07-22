# Convivium Yenilik Kuyrugu — Handoff

Tarih: 2026-07-17 (son güncelleme: 2026-07-20). Site incelemesi sonrası onaylanan 8 yaratıcı
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

## KULLANICI KONTROLU / AKSIYONU BEKLEYENLER (Supabase)

1. `docs/database/2026-07-17-bottles.sql` — bottle_messages tablosu + RLS +
   throw_bottle/catch_bottle RPC'leri. Calistirilana kadar `bottle` komutu
   "sise agi henuz kurulmamis" der (zarif fallback, hata yok).
2. `docs/database/2026-07-17-shards.sql` — world_state.shards kolonu.
   Calistirilana kadar shard bakiyesi yalniz localStorage'da yasar
   (client kolon hatasinda eski secime otomatik duser; senkron kirilmaz).
3. `docs/database/2026-07-20-social-chat.sql` — benzersiz handle, arkadaslik,
   sunucu engeli, kalici birebir mesaj ve grup sohbeti. Anon `PGRST202`, RPC'ler
   tasarim geregi anon rolden gizli oldugu icin migration durumunu kanitlamaz.
   Girisli hesapla kontrol et; arayuz acikca sunucunun etkin olmadigini soylerse
   SQL'i bir kez calistir. Ortak kanal her durumda acik, uye katmani fail-closed.
   Ayrinti:
   [Sosyal Sohbet UX Handoff](chat-social-ux-handoff.md).

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

> Üretim sertleştirme hattı kapandı; Faz 1A/1B/2A/2B/2C/2D/3A canlıya alındı.
> Faz 3B shop satın alma sınırı da canlı kabul edildi; terminal
> modülerleştirmesi burada park edildi. Kart/collect mimari işi ayrı bekliyor.
>
> Son tamamlanan ürün: [Sinyal Arkeolojisi Handoff](sinyal-arkeolojisi-handoff.md).
> Park edilen mimari hat: [Home Protocol Modülerleştirme Handoff](home-protocol-modularization-handoff.md).
> Terminal navigasyon programı: [Sinyal Pusulası Handoff](terminal-navigation-handoff.md)
> (N1 ve N1.1 canlı; N2 sıradaki ayrı dilim).
> Sosyal sohbet aktivasyon ve UX kaydı:
> [Sosyal Sohbet UX Handoff](chat-social-ux-handoff.md).

### Tamamlanan deneyim omurgası — Sinyal Pusulası N1

Terminal yön bulma katmanının ilk atomik dilimi `4bf06c2` ile main'e gönderildi
ve canlı kabul edildi. Kısa niyet tabanlı `help`,
`help all` uyumluluğu, en fazla üç bağlamsal canonical öneri, alias/fuzzy
düzeltme, `cd/examine/help/man` parametre tamamlama, combobox/listbox
erişilebilirliği ve ilk SW kurulumunda terminali kapatan reload koruması aynı
atomik canlı v206 paketinde. Beş canlı asset hash'i main ile eşleşti; temiz
mobil Chromium'da ilk claim, gerçek offline reload ve öneri etkileşimleri
hatasız geçti. N2 bağlamsal `look`/yerel rota, N3 Yaşayan Atlas olarak ayrı
dilimlerde ilerleyecek; ikisi de henüz başlamadı.

N1.1'de eski hardcoded `help` gövdesi ve protocol içindeki ikinci typo motoru
kaldırıldı. `help all` artık 132 kanonik komut/589 etiketi canlı registry'den
üretiyor; kişisel alias'lar ve gizli rotalara erişim korundu, tam indeks ve typo
kararı navigator'da tekleşti. Navigator v2, protocol v85 ve canlı SW v207;
unit 71/71, özel Chromium 3/3, standart E2E 7/7 ve smoke 11/11 geçti. Yayın ve
canlı kabul `df7a609`/SW v207 ile tamamlandı; üç canlı asset hash'i main ile
eşleşti. Gerçek sitede tam indeks, kişisel alias, navigator-yokluğu ve offline
reload 3/3 geçti. N2 henüz başlamadı.

### Tamamlanan yeni ürün — Sinyal Arkeolojisi

İlk ürün dilimi `1dba6df` ile main'e gönderildi ve canlı kabul edildi. `/ruins`
altında üç kurtarılmış kayıt, mevcut
`ls/cd/look/examine/cat` komutlarıyla keşif ve tarih tabanlı ortak günlük buluntu
sunuluyor. Yeni backend, SQL, framework veya yeni terminal komutu eklenmedi;
normal, Ruins-yokluğu ve çevrimdışı Chromium akışları geçti. Atomik yayın
paketi: ruins v1, world v2, VFS v3, protocol v83 ve canlı SW v205. Dört canlı
asset hash'i main ile birebir eşleşti; offline canlı reload page error olmadan
çalıştı.

### Sıradaki düşük riskli ürün adayı — Kart paylaşım sayfası

Mevcut günlük kart seed'ini yeniden kullanarak SVG/PNG paylaşım çıktısı üreten
bağımsız sayfa. Uygulamadan önce ayrı ürün handoff'u açılacak; mevcut
`card/collect/cards` davranışı ve ekonomi sahipliği bu dilime taşınmayacak.
Terminal navigasyonu N1 canlı kabul edildi. Sonraki çalışma, kullanıcı kararına
göre bu ürün adayı veya ayrı N2 navigasyon dilimi olarak açılacak.

### 0. Fikir havuzu (2026-07-17 beyin firtinasi)
- **Sinyal Arkeolojisi**: sitenin "eski surumlerinden kalma" sahte kalintilar
  (bozuk 1997 BBS sayfasi, yarim TODO.txt, kurtarilmis oyun ekrani). `cd /ruins`
  ile girilen, zamanla kazilan statik katman. **TAMAMLANDI; canlı v205.**
- **Gezgin Mirasi**: bilincli `depart` komutuyla tek cumlelik veda izi birakma;
  sonraki ziyaretci rastgele bir vedayla karsilanir (wall_marks benzeri tablo).
- **Kolektif Rituel**: gunluk kart toplamada site geneli esik asilirsa herkese
  ortak bonus. **TAMAMLANDI (esik 5, +2 shard); bkz.
  [Kolektif Rituel Handoff](kolektif-rituel-handoff.md). SQL bekliyor.**
  Kullanici karari (2026-07-22): 3 urunluk kuyruk onaylandi — 1) Kolektif
  Rituel, 2) Ruya Gunlugu x Ruins, 3) finger @handle + arkadasa kart hediyesi.
- **Sinyal Firtinasi (shard loteri)**: gunun seed'iyle belirli dakikalarda 30
  sn'lik firtina; o an sitede olup `catch signal` yazan shard kazanir.
- **Kart Takasi**: **TAMAMLANDI — daha iyi tasarimla: rastgele bottle yerine
  arkadasa dogrudan hediye (`gift card:YYYY-MM-DD @handle`) + `finger @handle`
  kamusal gezgin karti (opt-in). SQL bekliyor.**
- **Oracle Ruya Gunlugu**: **TAMAMLANDI (cron'suz, deterministik seed+agregat
  tasarimiyla); 7 gun onceki ruya /ruins kalintisi olur. SQL bekliyor.**
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

### 2. Sosyal sohbet — frontend canli, girisli backend kabulu bekliyor

Uyelikli kalici ozel mesaj, arkadaslik, kisi engelleme ve grup omurgasi repoda
tamamlandi. Ozel mesaj/engel eylemleri guvertede gorunur hale getirildi;
engelleme arkadaslik ile birebir thread'i kaldirdigi icin sonuclari aciklayan
onaya baglandi. Ortak ve ozel mesaj kutusuna emoji kullanmayan 24 parcalik
SMS donemi ASCII sembol rafi eklendi. Tam urun kabulü icin once girisli hesapla
backend kontrol edilmeli; schema eksikse yukaridaki SQL calistirilmali, sonra
iki hesapli kabul akisi yapilmalidir.
Frontend `52bdd38` paketiyle canli ve hash/Chromium kabulunden gecmistir.

Oda-bazli ucucu `whisper` veya oda basina broadcast kanal ayrimi bu kalici uye
mesajlasmasindan farkli, istege bagli ileriki bir urun dilimidir.

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
