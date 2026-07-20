# Sosyal Sohbet UX — Ozel Mesaj, Engel ve Sembol Rafi Handoff

Tarih: 2026-07-20  
Durum: Frontend canli ve kabul edildi; Supabase migration kullanici aksiyonu bekliyor.
Taban: `a3eec1b`–`e21872b` sosyal sohbet omurgasi.

## 1. Urun karari

Chat guvertesinde iki farkli iletisim sinifi bilincli olarak ayridir:

| Kanal | Kimlik | Saklama | Yetki |
|---|---|---|---|
| `ORTAK KANAL · UCUCU` | Gecici gezgin rumuzu | Sunucuda kalici mesaj yok | O an kanali dinleyen ziyaretciler |
| `OZEL MESAJ` / grup | Giris yapmis, benzersiz `@handle` | Supabase'de kalici | Arkadaslik, engel ve uyelik RPC + RLS ile denetlenir |

Ozel mesaj yalniz karsilikli arkadaslar arasinda acilir. Arayuzde buton gizlemek
yetki kontrolu sayilmaz; her okuma/yazma karari sunucuda yeniden dogrulanir.
Mesajlar uctan uca sifreli degildir. Kullaniciya bu durum aktif birebir
konusmada acikca belirtilir; hukuki metinlerle ayni sozlesme korunur.

## 2. Bu dilimde olgunlastirilanlar

- Arkadas listesindeki belirsiz `YAZ` ve `SOHBET` eylemleri `OZEL MESAJ`
  olarak adlandirildi.
- Uye arama sonucu, gelen davet, arkadas satiri ve aktif birebir konusma icine
  gorunur engelleme eylemi yerlestirildi.
- Engellenenler listesi alt taraftaki kayip konumundan `GUVENLIK /
  ENGELLENENLER` basligiyla arkadaslarin hemen altina alindi.
- Engel; arkadasligi ve birebir kanali kapatip eski birebir mesajlari
  silebildigi icin islemden once sonucu anlatan zorunlu onay eklendi.
- Giris yapmayan ziyaretci de `OZEL MESAJ · KISI ENGELLEME · GRUP SOHBETI`
  yeteneklerini gorur; giris baglantisi acikca sunulur.
- Migration yoksa yetenekler sessizce kaybolmaz. Arayuz sunucu katmaninin
  etkin olmadigini bildirir ve guvensiz localStorage/istemci taklidine dusmez.
- Ortak ve ozel kanal ayni mesaj kutusunu kullandigi icin tek bir `SEMBOLLER`
  rafi iki akista da calisir.
- Sembol rafi, marka gorseli veya Unicode emoji kullanmadan 3 kategori / 24
  salt ASCII ifadeden olusur (`:)`, `:(`, `;)`, `:D`, `^_^`, `-_-` vb.).
  Secim gonderim yapmaz; aktif secimi degistirerek imlec konumuna eklenir.
- Raf klavye, Escape, odak geri donusu, dialog/label ve mobil kirilim
  davranisiyla birlikte tasarlandi.

## 3. Guvenlik davranisi

`block_member` islemi sunucuda:

1. engel kaydini olusturur,
2. iki kullanici arasindaki arkadasligi kaldirir,
3. birebir sohbet thread'ini kaldirir; bagli mesajlar cascade ile silinir,
4. iki yonlu yeni baglanti ve mesajlasmayi durdurur.

Engeli kaldirmak eski arkadasligi veya silinen sohbeti geri getirmez. Bu nedenle
engelleme tek tiklik sessiz bir eylem degil, sonuclari yazan onayli bir guvenlik
eylemidir. Grup mesajlarinin yonetim/uyelik kurallari ayri kalir.

## 4. Backend aktivasyon kapisi — KULLANICI AKSIYONU

2026-07-20 tarihinde canli Supabase anon REST yuzeyinde yapilan salt-okunur
kontrolde asagidaki RPC'ler `HTTP 404 / PGRST202` dondu:

- `get_social_snapshot`
- `open_direct_chat`
- `block_member`

Bu, frontend kodunun mevcut olmasina ragmen sosyal sohbet migration'inin canli
veritabanina uygulanmadigini gosterir. Aktivasyon icin Supabase SQL Editor'de
bir kez su dosyanin tamami calistirilmalidir:

[`database/2026-07-20-social-chat.sql`](database/2026-07-20-social-chat.sql)

Bu islem Codex tarafindan yapilmaz; repo kurali geregi kullanici aksiyonudur.
SQL uygulanana kadar ortak ucucu kanal calisir, ozel mesaj/engel katmani ise
acik bir `sunucu henuz etkin degil` durumunda kalir.

## 5. Degisen ana dosyalar

- `assets/js/home/chat-deck.js`: kesfedilebilir ozel mesaj/engel UX'i, fail-closed
  schema durumu, onay akisi ve ortak sembol rafinin UI baglantisi.
- `assets/js/home/chat-symbols.js`: salt-okunur katalog ve imlece ekleme mantigi.
- `assets/css/home.css`: guvenlik, yetenek, aktif DM ve sembol rafi stilleri.
- `docs/database/2026-07-20-social-chat.sql`: uygulanacak mevcut sosyal omurga.
- `tests/unit/home-chat-symbols.test.mjs`: katalog ve saf ekleme sozlesmesi.
- `tests/unit/social-chat-contract.test.mjs`: RLS/RPC, kesfedilebilirlik ve
  fail-closed sozlesmesi.
- `tests/e2e/site.spec.mjs`: ziyaretci kesfi ve sembol secimi tarayici akisi.

## 6. Kabul ve devam sirasi

1. Frontend kalite kapilarini ve yerel Chromium akisini gecir.
2. Frontend paketini main'e gonder; canli asset surumlerini/hash'lerini kontrol et.
3. Kullanici SQL migration'ini Supabase SQL Editor'de uygular.
4. Iki test hesabiyla: arkadas ekle → ozel mesaj ac → mesaj gonder → engelle →
   iki yonlu erisim reddi → engeli kaldir akisini kabul et.
5. Kabul sonucunu bu belgeye ve teknik degerlendirme raporuna kaydet.

Yarida kalinirsa ilk kontrol noktasi bu belgenin 4. bolumudur. Migration
uygulanmadan frontend tarafinda yeni bir kalici mesaj fallback'i yazilmayacak.

## 7. Dogrulama kaydi

2026-07-20 yerel kabul sonucu:

- `npm run check`: 82/82 unit, 12/12 Worker, syntax ve site integrity gecti.
- `SITE_BASE=http://127.0.0.1:4173 npm run test:e2e`: 9/9 aktif Chromium
  senaryosu gecti; production'da hesap olusturan opsiyonel test bilincli atlandi.
- `SITE_BASE=http://127.0.0.1:4173 SKIP_WORKER=1 npm run test:smoke`: 8/8 gecti.
- Mobil sembol rafi 390 × 844 viewport'ta yatay tasma olmadan test edildi.
- Mock uye kabulunde birebir kanal, onayli engelleme ve engellenenler listesine
  gecis tarayici icinde uctan uca dogrulandi.
- Ana semanin son 437 satiri migration dosyasiyla SHA-256 bazinda birebir ayni.

Yayin paketi: `home.css?v=32`, `chat-symbols.js?v=1`, `chat-deck.js?v=7`,
Service Worker `convivium-v211`.

Canli frontend kabul sonucu:

- Ozellik commit'i `52bdd38`; Pages yeniden tetikleme commit'i `b4386c7`.
- GitHub Pages `pages build and deployment` basarili.
- CSS, sembol modulu, chat guvertesi ve Service Worker canli SHA-256 hash'leri
  yerel main dosyalariyla birebir eslesti.
- Canli sitede iki chat Chromium senaryosu 2/2 gecti.
- Canli smoke 11/11 gecti; Oracle Worker version tag'i `52bdd38...` ile eslesti.

Frontend kabul edilmistir. Tam urun kabulunde kalan tek kapilar 4. bolumdeki
SQL ve sonrasindaki iki gercek hesapli backend senaryosudur.
