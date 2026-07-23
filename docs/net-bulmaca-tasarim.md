# /net — "Sinyal Ağı" Ağ Keşif Bulmacası — Tasarım Çalışması

Tarih: 2026-07-23
Durum: **TASARIM — onay bekliyor.** Onaylanınca Faz 1'den kodlanır.
Kararlar (kilitli): ekran koruyucu = **HTML tam-ekran** (native .scr/.saver
statik sitede üretilemez); ilerleme = **önce bu doküman, sonra faz faz kod**.

---

## 1. Özet

Terminale bir ağ-keşif (network recon) bulmacası ekleniyor: kullanıcı
çevredeki cihazları `scan` eder, online olanlara `connect` olur, dosya
sistemlerine sızar, notlardaki **bilmece-şifrelerle** daha derin cihazları
kırar ve sonunda **indirilebilir hologram ekran koruyucular** içeren "kasa"
cihaza ulaşır. Retro hacker-sim havası; site kimliğine (fosfor yeşili
terminal) ve mevcut oda/VFS desenine oturur.

**Temel ilke:** ruins/dream gibi **deterministik + çevrimdışı**. "Rastgele
zamanlama" gerçek random değil, `hash(cihaz + zaman dilimi)` ile üretilir →
her tarama farklı görünür ama tekrar edilebilir, adil, offline çalışır.

---

## 2. Tasarım ilkeleri

1. **Deterministik.** Online/offline durumu ve içerik zaman+tohum hash'iyle;
   sunucu gerekmez, herkes aynı ağı görür, offline çalışır.
2. **Çıkmaz sokak yok.** Her şifreli cihazda `hint`; her ipucu oyun içinde
   bulunabilir; hiçbir bilmece dış bilgi (altın oran gibi genel kültür
   dışında) gerektirmez.
3. **Kademeli.** Şifresiz/kolay cihazlar → ipucu → zor cihazlar → kasa.
4. **Kalıcı ilerleme.** Kırılan cihazlar, uyandırılan (WoL) cihazlar ve
   bulunan ipuçları `localStorage`'da tutulur (site geneli ilerleme deseni).
5. **Retro doku.** ASCII tablo/kutu çıktılar, `nmap`/`ProDOS` estetiği,
   fosfor yeşili. Ekran okuyucu ve `prefers-reduced-motion` saygılı.
6. **Mevcut mimariye oturur.** `assets/js/home/net.js` modülü (ruins/dreams
   deseni): karar mantığı modülde, yan etkiler home-protocol callback'leriyle.
   `/net` bir VFS odası/mount olarak görünür.

---

## 3. Komut seti

Terminalde (mevcut komut uzayına ek; adlar implementasyonda snapshot
testine karşı doğrulanacak — çakışma varsa alias'a taşınır):

| Komut | İş |
|---|---|
| `net` / `cd net` | /net odasına girer, kısa brifing + `scan` ipucu |
| `scan` | ağı tarar; cihaz tablosu (IP, host, durum, son görülme) |
| `connect <ip>` | online cihaza bağlanır; şifresizse girer, şifreliyse sorar |
| `pass <deneme>` | bağlanılan şifreli cihaza şifre dener |
| `hint` | aktif şifreli cihaz için ipucu (bulunmuş ipuçlarını da listeler) |
| `wake <mac>` | offline cihazı Wake-on-LAN ile uyandırır (bu oturum) |
| `ls` `cd` `cat` | bağlanılan cihazın dosya ağacında gezinme (mevcut VFS fiilleri) |
| `download <dosya>` | kasa cihazdaki ekran koruyucuyu indirir |
| `disconnect` / `exit` | cihazdan çıkar |
| `netmap` | keşfedilen ağ topolojisini ASCII olarak gösterir |

Bağlıyken prompt değişir: `] net:CAM-BALKON$ ` gibi.

---

## 4. Cihaz modeli (şema)

```
{
  id: 'cam-balkon',
  ip: '10.0.13.7',
  mac: 'AA:BB:CC:07:11:07',
  host: 'CAM-BALKON',
  kind: 'ip-camera',            // tv | camera | nas | router | printer | vault
  onlineChance: 55,            // 0-100; deterministik tabloya girer
  alwaysOn: false,             // router/kasa gibi
  auth: { type: 'password', value: '1618', hintKey: 'altin-oran' },
                               // veya { type: 'none' }
  files: <VFS ağacı>,          // notlar, foto (ASCII), excel (ASCII), boş klasör
  yieldsHints: ['dogum-pin'],  // burada bulunan, sonraki cihazı açan ipucu
  reward: null                 // sadece kasa cihazda: ekran koruyucu listesi
}
```

---

## 5. Deterministik online zamanlama

- Zaman dilimi: `bucket = floor(Date.now() / (10*60*1000))` (10 dk pencere).
- Online mı: `h = hash(device.id + ':' + bucket); online = alwaysOn || (h % 100) < onlineChance`.
- **Son görülme:** cihaz offline ise, geriye doğru bucket'lara bakıp en son
  online olduğu pencereyi bulur → "12 dk önce", "2 sa önce" gibi yazılır.
- **Wake-on-LAN:** `wake <mac>` doğru MAC ile çağrılınca cihaz `localStorage`'da
  "zorla online" işaretlenir (oturum/gün boyu). MAC'ler router/nas dosyalarında
  bulunur → WoL da bir keşif adımı.
- Router ve kasa `alwaysOn` değil; kasa **her zaman offline** başlar ve
  **yalnız WoL** ile açılır (senin senaryondaki "büyük sürpriz" kilidi).

Böylece her `scan` farklı bir online kümesi gösterir; sabırsız kullanıcı
bekler ya da WoL'la zorlar → senin istediğin "önceden rastgele zamanlanmış
aralıklarla online" hissi, deterministik ve adil biçimde.

---

## 6. Bulmaca zinciri (somut — çözümleriyle)

Ağ: `10.0.13.0/24` — terk edilmiş bir ev/ofis ağı (site "kurtarılmış sinyal"
temasına bağlı). 8 cihaz; 3'ü dekor/red herring, 5'i zincir.

| # | IP | Host | Erişim | Şifre / çözüm | Verdiği ipucu |
|---|---|---|---|---|---|
| A | .2 | AURA-TV | **şifresiz** | — | notta: "kamera=wifi, ipucu **Log: altın değer**" + foto altında **0307** |
| B | .7 | CAM-BALKON | şifreli | **1618** (altın oran ≈1.618) | `gsm.txt`: "SIM PIN **3-7 arası**" + "banka: doğum" |
| C | .11 | NAS-EV | şifreli | **34567** (3→7 ardışık) | excel'de admin ipucu + "PIN doğumdan" |
| D | .1 | ROUTER-GW | şifreli | **0307** (AURA-TV fotosundaki doğum) | tam cihaz listesi + **kasa MAC** + "kasa: iki anahtar toplamı" |
| E | .66 | VAULT-CVM | **offline** → WoL (D'deki MAC) sonra şifreli | **35185** (1618+34567... hayır: "iki anahtarın toplamı" = 1618+0307 = **1925**) | ÖDÜL: ekran koruyucular + shard |
| — | .20 | PRINTER-HP | şifresiz | — | boş kuyruk, mizah (red herring) |
| — | .33 | THERMO-NEST | şifresiz | — | sıcaklık logu (dekor) |
| — | .99 | ??? | offline, uyandırılamaz | — | "bu düğüm yanıt vermiyor" (atmosfer) |

**Bilmecelerin mantığı (senin örneğinle hizalı):**
- **Log: altın değer** → altın oran → **1.618** → şifre `1618`. (Senin
  "Log'un 1.618 olduğunu tahmin" örneğin birebir.)
- **GSM 3-7** → "3'ten 7'ye" → `34567`. (Basit, ipuçlu.)
- **banka: doğum** → bir doğum tarihi PIN'i; tarih AURA-TV'deki fotoğraf
  altyazısında (`0307` = 3 Temmuz) planlı. Yani "doğum" ipucunu görünce
  oyuncu daha önce gördüğü `0307`'yi hatırlar → `ROUTER` şifresi.
- **Kasa** → router notu "iki anahtar toplamı": bulunan iki net sayının
  (1618 + 0307) toplamı = **1925**. Aritmetik final; tatmin edici kapanış.

Her şifreli cihazda yanlış denemede kademeli `hint` (önce belirsiz, 2. yanlışta
daha açık). Doğru şifrede kısa "ACCESS GRANTED" animasyonu + ses.

---

## 7. Dosya sistemi içeriği (cihaz başına)

Her cihazda mevcut VFS ağacı (`ls/cd/cat`). Örnek içerikler:
- **Notlar** (`.txt`): ipuçları, şifre bilmeceleri, atmosferik günlükler.
- **Fotoğraflar** (`.jpg` → `cat` edilince **ASCII art** + altyazı; altyazı
  bazen ipucu taşır, örn. doğum tarihi).
- **Boş klasörler** (`/temp`, `/eski` — kasıtlı boş, gerçekçilik).
- **"Excel çalışma kitapları"** (`.xlsx` → `cat` edilince **ASCII tablo**:
  hesap listesi, obfuske krediler, bir hücrede ipucu).
- **Kasa cihazda ödül:** `/paylasim/ekran-koruyucu/` altında indirilebilir
  HTML ekran koruyucular (bkz. §8).

Tüm içerik deterministik üretilir; her cihaz sabit bir ağaç (gün bağımsız —
bulmaca tutarlı olmalı), yalnız online/offline durumu zamanla değişir.

---

## 8. Ödül: HTML hologram ekran koruyucuları

**Karar: native değil, tek-dosya HTML.** Neden: gerçek `.scr` (Windows) ve
`.saver` (Mac) derlenmiş ikililerdir; statik sitede üretilemez/güvenle
sunulamaz, `.exe/.scr` indirmesini tarayıcı+AV uyarır. HTML çözümü **gerçek,
çapraz-platform ve teslim edilebilir.**

**Ne indirilir:** `holo-saver-<relic>.html` — tek dosya, gömülü three.js
importmap + hologram shader + tek relic GLB'yi **base64 gömülü** (ya da aynı
origin'den çeken; base64 offline çalışır). Açılınca:
- Tam ekran (Fullscreen API), imleç gizli, yavaş dönen yeşil hologram + tarama.
- Tuş/fare/dokunuşta çıkar (ekran koruyucu davranışı).
- `prefers-reduced-motion` ve WebGL yoksa statik görsele düşer.

**Windows + Mac ayrımı:** HTML her ikisinde de aynı çalışır. Senin "ayrı"
isteğini şöyle karşılarız: indirme ekranında iki buton —
`Windows için indir` / `Mac için indir` — ikisi de HTML verir ama dosya adı
ve **kısa kurulum notu** platforma göre değişir (Windows: "tam ekran aç,
F11"; Mac: "tam ekran, Ctrl+Cmd+F" / "gerçek .saver için 3. parti sarmalayıcı").
Native ekran koruyucu isteyen için mini rehber linki.

**Hangi hologramlar:** kasadaki kalıntılar (holo-01..15) + bekleyen 4 yeni
(bobber, kaykay, konsol, gameboy). Kasa cihazda 3-4 tanesi "indirilebilir"
listelenir; ilki bedava, kalanları shard/ilerleme ile açılabilir (opsiyon).

**Ağırlık:** her saver HTML ~1 relic GLB (≈150-250KB base64 → ~350KB dosya).
İndirme anında üretilir/servis edilir; sitenin runtime yükü sıfır.

---

## 9. Ekonomi bağı (opsiyonel ama önerilir)

- Kasa (VAULT-CVM) ilk kez kırılınca: **+8 shard** + ekran koruyucu kilidi.
- Ara cihazları kırmak: her biri ilk seferde **+2 shard** (küçük teşvik).
- İlerleme `localStorage`'da; dashboard'da "ele geçirilen düğümler" rozeti
  (ileride). Supabase şart değil — tamamen istemci-tarafı başlar.

---

## 10. Ekran görünümleri (ASCII mockup)

**`scan` çıktısı:**
```
] net$ scan
  ağ taranıyor 10.0.13.0/24 ................ 8 düğüm

  IP           HOST           DURUM     SON GÖRÜLME
  10.0.13.1    ROUTER-GW      ● ONLINE  —
  10.0.13.2    AURA-TV        ● ONLINE  —
  10.0.13.7    CAM-BALKON     ○ OFFLINE  12 dk önce   [wake]
  10.0.13.11   NAS-EV         ● ONLINE  —
  10.0.13.20   PRINTER-HP     ● ONLINE  —
  10.0.13.66   ??? [gizli]    ○ OFFLINE  —            [wake?]
  ...
  bağlan: connect <ip>   ·   uyandır: wake <mac>
```

**`connect` (şifreli):**
```
] net$ connect 10.0.13.7
  CAM-BALKON (10.0.13.7) — kimlik doğrulama gerekli
  ipucu: "Log: altın değer"           (yardım: hint)
] net:CAM-BALKON? pass 1618
  ACCESS GRANTED ▸ dosya sistemine bağlanıldı
] net:CAM-BALKON$ ls
  notlar/   fotolar/   gsm.txt
```

**Kasa ödülü:**
```
] net:VAULT-CVM$ ls /paylasim/ekran-koruyucu
  holo-saver-terminal.html    holo-saver-gameboy.html   [kilitli]
  holo-saver-bobber.html      README.txt
] net:VAULT-CVM$ download holo-saver-terminal.html
  ▸ indiriliyor... tam-ekran hologram ekran koruyucu (Win/Mac)
  +8 shard · KASA ELE GEÇİRİLDİ
```

---

## 11. Mimari entegrasyon

- **Yeni modül:** `assets/js/home/net.js` (IIFE + `window.ConviviumHome.createNet(deps)`),
  ruins/dreams deseni. Cihaz tablosu, deterministik zamanlama, dosya ağaçları,
  şifre durumu, komut yönlendirmeleri burada; yan etkiler (yaz/çık, ses,
  shard ekle) callback'lerle home-protocol'de.
- **Oda/mount:** `/net` VFS'e mount; `cd net` ile girilir.
- **Komut kaydı:** yeni fiiller (`scan`,`connect`,`wake`,`pass`,`hint`,
  `download`,`netmap`) — çoğu yalnız `/net` bağlamında aktif (hidden/context
  komut). Snapshot testleri (`home-command-space`, `home-route-commands`)
  buna göre güncellenir.
- **Ekran koruyucu üretimi:** `scripts/` altında bir generator veya build-time
  adımıyla `assets/savers/holo-saver-*.html` önceden üretilir (relic başına).
  `download` bu statik dosyaları indirir (`<a download>`).
- **CSP:** saver HTML'leri three.js için jsdelivr importmap içerir (site CSP'si
  script-src'de zaten jsdelivr'e izin veriyor). İndirilen dosya bağımsız açılır.
- **Versiyon/SW:** net.js `?v=1`, home-protocol bump, SW CACHE_NAME bump,
  yeni saver dosyaları runtime-cache (precache değil).
- **Kapılar:** her faz `npm run check` + headless + canlı + changelog/RSS.

---

## 12. Faz planı

- **Faz 1 — iskelet:** `/net` odası + `scan` + deterministik online tablosu +
  `connect` + şifresiz erişim + 2-3 cihaz + `ls/cat/cd`. (Bulmaca yok, dolaşım
  çalışıyor.)
- **Faz 2 — bulmaca:** 5-8 cihaz + şifre bilmece zinciri + `pass`/`hint` +
  `wake` (WoL) + "son görülme" + excel/foto içerikleri.
- **Faz 3 — ödül:** kasa cihaz + HTML hologram ekran koruyucu üretimi +
  `download` + ekonomi kilidi (shard) + Win/Mac indirme notları.

Her faz davranış-nötr ekleme; mevcut terminal komutları etkilenmez.

---

## 13. Açık sorular (senin onayına)

1. Bilmece zorluğu: yukarıdaki 5 cihazlık zincir uygun mu, daha kısa/uzun mu?
2. Şifreler: örnekler (1618 / 34567 / 0307 / 1925) uygun mu, kendi
   sayıların/tarihlerin mi olsun (örn. gerçek bir anlam)?
3. Ekran koruyucu ödülü: hangi hologramlar (kasa kalıntıları mı, yeni 4'lü mü,
   hepsi mi)? İlki bedava + kalanları shard ile mi?
4. Ekonomi: shard ödülleri açık mı, kapalı mı başlasın?
5. Ağ teması: "terk edilmiş ev/ofis" mi, yoksa Convivium evreninden özel bir
   düğüm mü (lore bağı daha güçlü)?
