# Convivium

Convivium, Ersin Binal'in GitHub Pages uzerinde tuttugu kisisel ve deneysel web alanidir. Site klasik bir portfolyo sayfasi gibi davranmak yerine terminal, oyun, rituel araclari, makale arsivi ve public AI destekli bir komut kabugunu ayni dunya icinde birlestirir.

Canli site: <https://ersinbinal.github.io/>

## Lisans ve Telif

Bu repository ve Convivium sitesindeki Ersin Binal tarafindan uretilmis ozgun kod, tasarim, metin, oyun/rituel akislari, promptlar ve gorsel kimlik unsurlari acik kaynak degildir.

Copyright (c) 2026 Ersin Binal. All rights reserved.

Ziyaret etmek, link vermek ve kisisel inceleme yapmak serbesttir; kopyalamak, yeniden yayinlamak, klon site uretmek, ticari kullanmak veya turev calisma yayinlamak icin yazili izin gerekir. Detaylar icin [LICENSE](LICENSE) ve [NOTICE.md](NOTICE.md) dosyalarina bakin.

## Bu Site Ne Anlatir?

Convivium'un ana fikri su: arayuzler sadece bilgi gosteren yuzeyler degil, dusunme bicimini degistiren kucuk sistemlerdir. Bu yuzden sitede makaleler, mini oyunlar, barista/bartender gibi rituel araclari ve terminal tabanli deneyler yan yana durur.

Ziyaretci icin site bir rota agi gibi akar:

- `index.html`: terminal estetikli ana sayfa, command shell ve proje haritasi.
- `makaleler.html`: is modeli, dijital donusum, fiyatlandirma ve teknoloji notlari.
- `TheOracle.html`: kapali isaretler, kisa okumalar ve oracle deneyimi.
- `cyberpunk-logic-game.html`, `three-body-signal.html`, `ash-runner.html`, `neon-river.html`: oynanabilir deneyler.
- `Bartender.html`, `Barista.html`, `Barista_V2.html`, `TheRealistsBar.html`: ruh hali, karar ve ritim uzerinden kurgulanmis araclar.
- `dart-skorbord.html`: Supabase destekli 501 dart skorbordu.
- `Candy_Pop/`: e-ticaret ve mobil uygulama akislari icin deneysel prototipler.

## Teknik Yapi

Proje bilerek hafif tutulmustur. Yeni bir framework yerine statik HTML, CSS ve plain JavaScript kullanilir.

Ana bilesenler:

- GitHub Pages: statik hosting.
- Vanilla HTML/CSS/JS: sayfalar ve etkilesimli deneyler.
- Supabase: auth, profil, makale, skor ve oturum verileri.
- Cloudflare Worker: public Oracle/command AI proxy.
- Service Worker + Manifest: PWA, offline destek ve cache yonetimi.
- Native/WASM helper alani: `src/native/bugy-v3`.

Public AI tarafinda browser dogrudan model veya gelistirici araclarina baglanmaz. Browser sadece Cloudflare Worker endpoint'ine istek atar; Worker sirayla Cloudflare Workers AI, Pollinations fallback ve lokal cevap zincirini kullanir.

## Neden Bu Kadar Farkli Gorunuyor?

Convivium standart bir kurumsal landing page degil. Tasarim dili bilincli olarak terminal, retro oyun, sinyal haritasi ve deneysel arayuz hissini tasir. Bu tercih dekoratif olmaktan cok islevseldir: ziyaretciyi sadece link tiklamaya degil, kesfetmeye ve komutlarla siteyi yoklamaya davet eder.

## Guvenlik ve Sinirlar

Bu repo public bir GitHub Pages sitesidir. Bu nedenle:

- Static frontend icinde gizli key veya service role token tutulmaz.
- Public AI istekleri Worker uzerinden gecmelidir.
- Browser tarafindan local shell, dosya sistemi veya gelistirici agent erisimi verilmez.
- Supabase tarafinda Row Level Security politikalarina dayanilir.
- CSP, service worker ve cache listeleri `npm run check` ile temel olarak dogrulanir.

## Gelistirme Komutlari

```bash
npm run check
npm run convert-images
npm run build:bugy-v3-atlas
```

Oracle Worker deploy akisi:

```bash
CLOUDFLARE_API_TOKEN=... npm run deploy:oracle
npm run set:oracle-endpoint -- https://your-worker.workers.dev
npm run check
```

Worker deploy olmadan command shell lokal/canned Oracle cevaplariyla calisir.

## Repo Haritasi

```text
.
├── index.html
├── TheOracle.html
├── makaleler.html
├── assets/
│   ├── css/
│   ├── js/
│   └── icons/
├── workers/oracle/
├── docs/database/
├── scripts/
└── src/native/bugy-v3/
```

## Not

Bu repository, tamamlanmis tek bir urunden cok surekli evrilen bir web laboratuvari olarak dusunulmelidir. Amac; portfolyo, oyun, makale ve AI destekli terminal davranislarini ayni kisilikte bir araya getiren ozgun bir web alani kurmaktir.
