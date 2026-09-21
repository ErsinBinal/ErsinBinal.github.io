// ICERIK OMURGASI — tek depo, iki cikti.
//
// NEDEN
//   Bugun bir yazinin adresi yok. articles.js paylas baglantisini
//   `pathname#slug` diye kuruyor; yani her yazi TEK bir sayfanin icindeki bir
//   capa. Bedeli: yaziyi tek basina paylasamiyorsun, arama motoru ayri ayri
//   dizine alamiyor, yaziya ozel OG gorseli olamiyor, arsivdeki 274 kayit hep
//   ayni yere isaret ediyor.
//
//   Cozum tasarim degil ADRES. Bu betik yayimlanmis her icerige statik bir
//   sayfa uretir: /y/<slug>.html
//
// IKI CIKTI, TEK KAYNAK
//   assets/data/icerik.json  — omurga. Retro okuma odasi da, ileride gelecek
//                              modern yuzey de BUNU okur. Iki yuzey, tek veri.
//   y/<slug>.html            — kalici adres. Sifir JS, kati CSP, surumsuz CSS.
//
// NEDEN NOTUN GOVDESI JSON'DA, MAKALENIN DEGIL
//   Not zaten kisa; akista satir ici gorunmeli, ikinci bir istek sacma olur.
//   Makale govdesi JSON'a konursa akis yuku patlar (arsiv dizini tek basina
//   184 KB). Not satir ici, makale referansla.
//
// NEDEN URETILEN SAYFALAR SURUMLU ASSET KULLANMIYOR
//   validate-site-integrity ayni asset'in iki farkli ?v= ile gecmesini HATA
//   sayar. Uretilen 100 sayfa surum tasirsa her bump'ta hepsini yeniden
//   uretmek zorunda kalirdik; unutulan tek sayfa yayini durdururdu. Bu yuzden
//   permalink sayfalari YALNIZ surumsuz CSS'e dokunur: kapi hic calamaz.
//
// NEDEN SIFIR JS
//   Sayfanin JS'e ihtiyaci yok. Olmayinca script-src 'none' yazabiliyoruz —
//   govde admin tarafindan yazilmis HTML oldugu icin bu ucuz ve gercek bir
//   savunma. Ayrica offline ve yavas baglantida aninda aciliyor.
//
// --check NEYI DOGRULAR
//   Uzaktaki veritabaniyla senkronu DEGIL — o hareketli bir hedef ve `npm run
//   check` ucakta da kosabilmeli. Kapi REPO ICI tutarliligi olcer: json'daki
//   her kaydin sayfasi var mi, ortada sahipsiz sayfa kalmis mi, sayfalar
//   mevcut json'dan uretilenle ayni mi. Suruklenme burada yakalanir.
//
// Kullanim:
//   npm run build:icerik              # Supabase'ten cek, json + sayfalar yaz
//   npm run build:icerik -- --check   # yazma, repo ici suruklenmeyi bildir
//   npm run build:icerik -- --offline # agi hic deneme, mevcut json'dan uret

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const OUT_JSON = path.join(root, 'assets', 'data', 'icerik.json');
const OUT_DIR = path.join(root, 'y');
const SITE = 'https://ersinbinal.github.io';

const kontrol = process.argv.includes('--check');
const agsiz = process.argv.includes('--offline');

// --- Surumlu asset: SITENIN KENDI HTML'inden turetilir ----------------------
//
// .btn kenar dilini tasiyor ve components.css'te tanimli; permalink sayfasi
// onu cekmezse butonlar tarayici varsayilani olarak kaliyor (bir sure oyle
// kaldi). Ama components.css SURUMLU (?v=N) ve validate-site-integrity ayni
// asset'in iki farkli surumle gecmesini hata sayar.
//
// Cozum surumu buraya yazmak DEGIL — o an dogru olur, ilk bump'ta yalan olur.
// Surum her uretimde okuma odasinin HTML'inden okunur: tek kaynak sitenin
// kendisi, suruklenme imkansiz.
function surumOku(dosya, asset) {
  try {
    const html = fs.readFileSync(path.join(root, dosya), 'utf8');
    const kalip = new RegExp(`${asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?v=([^"'&#]+)`);
    const m = html.match(kalip);
    return m ? `?v=${m[1]}` : '';
  } catch { return ''; }
}

// --- Supabase ayarlari: TEK kaynaktan, elle kopyalanmaz ---------------------
function supabaseAyar() {
  const src = fs.readFileSync(path.join(root, 'assets', 'js', 'supabase-config.js'), 'utf8');
  const url = src.match(/url:\s*'([^']+)'/);
  const key = src.match(/anonKey:\s*'([^']+)'/);
  if (!url || !key) throw new Error('supabase-config.js icinde url/anonKey bulunamadi');
  return { url: url[1].replace(/\/+$/, ''), key: key[1] };
}

// --- Yardimcilar ------------------------------------------------------------

// Slug dosya yoluna giriyor. Buraya guvenmiyoruz: disari cikabilecek her sey
// atilir. `../` veya `/` tasiyan bir slug sessizce temizlenir, kayit atlanir.
//
// Turkce harfler ONCE cevrilir, sonra suzulur. Sira onemli: veritabanindaki
// slug'lar ayrisik Unicode tasiyabiliyor ("o" + birlesen umlaut). Once suzup
// sonra cevirirsen "Otesinde" -> "o-tesinde" olur; umlaut tireye doner ve
// kelime ortadan ikiye boluner. NFD + birlesen isaretleri at, bu bitiyor.
const TR_HARF = { 'ı': 'i', 'İ': 'i', 'ş': 's', 'Ş': 's', 'ğ': 'g', 'Ğ': 'g' };

function guvenliSlug(ham) {
  const cevrili = String(ham || '')
    .replace(/[ıİşŞğĞ]/g, (c) => TR_HARF[c])
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // birlesen isaretler (umlaut, cedilla)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (cevrili.length <= 80) return cevrili;
  // Kelime ortasindan kesme: yarim kelimeyle biten URL cirkin ve okunmaz.
  const kesik = cevrili.slice(0, 80);
  const son = kesik.lastIndexOf('-');
  return (son > 40 ? kesik.slice(0, son) : kesik).replace(/-+$/, '');
}

function kacis(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Govde admin yazisi, yani yari-guvenilir. Yine de script/iframe/on* atilir:
// script-src 'none' zaten calistirmaz, bu ikinci kilit. Ucuz, geri donusu yok.
function govdeTemizle(html) {
  return String(html || '')
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<iframe\b[\s\S]*?<\/iframe\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

function duzMetin(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function okumaSuresi(html) {
  const kelime = duzMetin(html).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(kelime / 200));
}

// --- Turler -----------------------------------------------------------------
// Her tur bir BOLUM degil, ayni omurganin bir mercegi. Kategori menusu bu
// listeden uretilir; yeni tur eklemek tek satir.
const TURLER = {
  makale: { ad: 'Makale',    coklu: 'Makaleler',    basliksiz: false },
  kitap:  { ad: 'Kitap',     coklu: 'Kitaplar',     basliksiz: false },
  film:   { ad: 'Film',      coklu: 'Filmler',      basliksiz: false },
  not:    { ad: 'Karalama',  coklu: 'Karalamalar',  basliksiz: true }
};

// Ture ozgu meta alanlari. Beyaz liste: veritabani ne tasirsa tasisin,
// sayfaya yalniz bunlar cikar. Tanimsiz alan sessizce dusurulur.
const META_ALANLARI = {
  kitap: ['yazar', 'yil', 'puan', 'kapak', 'sayfa', 'cevirmen'],
  film:  ['yonetmen', 'yil', 'puan', 'afis', 'sure', 'ulke'],
  makale: [],
  not: []
};

function metaTemizle(tur, ham) {
  const izinli = META_ALANLARI[tur] || [];
  const cikti = {};
  if (!ham || typeof ham !== 'object' || Array.isArray(ham)) return cikti;
  for (const alan of izinli) {
    const deger = ham[alan];
    if (deger == null || deger === '') continue;
    if (typeof deger === 'number') {
      if (Number.isFinite(deger)) cikti[alan] = deger;
    } else {
      const metin = String(deger).trim().slice(0, 120);
      if (metin) cikti[alan] = metin;
    }
  }
  return cikti;
}

const AY = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran',
  'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];
function tarihYaz(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${AY[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// --- Kaynak: once ag, olmazsa mevcut anlik goruntu --------------------------
async function kayitlariGetir() {
  if (agsiz || kontrol) return { kaynak: 'yerel', satirlar: null };
  let ayar;
  try { ayar = supabaseAyar(); } catch (e) {
    console.warn(`  ag atlandi: ${e.message}`);
    return { kaynak: 'yerel', satirlar: null };
  }
  const TEMEL = 'id,slug,title,summary,content_html,published_at,created_at,updated_at';
  const TURLU = `${TEMEL},kind,tags`;
  const TAM = `${TURLU},meta`;

  const cek = async (alanlar) => {
    const url = `${ayar.url}/rest/v1/articles`
      + `?select=${alanlar}&status=eq.published&order=published_at.desc.nullslast`;
    const cevap = await fetch(url, {
      headers: { apikey: ayar.key, Authorization: `Bearer ${ayar.key}` }
    });
    if (!cevap.ok) throw new Error(`HTTP ${cevap.status} ${(await cevap.text()).slice(0, 120)}`);
    return cevap.json();
  };

  // Sema UC durumda olabilir, cunku migration'lar sirayla kosuyor:
  //   tam    : kind + tags + meta   (kitap/film degerlendirmeleri calisir)
  //   turlu  : kind + tags          (not calisir, meta yok)
  //   temel  : hicbiri              (hepsi makale)
  // Kademeli dusus: eksik kolon yayini DURDURMAZ, yalniz o ozelligi kapatir.
  const kademeler = [
    ['supabase', TAM],
    ['supabase-meta-yok', TURLU],
    ['supabase-eski-sema', TEMEL]
  ];
  let sonHata = null;
  for (const [ad, alanlar] of kademeler) {
    try {
      const satirlar = await cek(alanlar);
      if (ad === 'supabase-meta-yok') {
        console.warn('  meta kolonu yok — kitap/film alanlari bos gecilecek.');
        console.warn('  Kosmak icin: docs/database/PENDING.sql');
      } else if (ad === 'supabase-eski-sema') {
        console.warn('  kind/tags/meta kolonlari yok — migration henuz kosmamis.');
        console.warn('  Hepsi makale sayildi. Kosmak icin: docs/database/PENDING.sql');
      }
      return { kaynak: ad, satirlar };
    } catch (e) { sonHata = e; }
  }
  // Ag yoksa yayini durdurmuyoruz: elde anlik goruntu varsa onunla devam.
  console.warn(`  Supabase okunamadi (${sonHata && sonHata.message}) — mevcut icerik.json kullanilacak.`);
  return { kaynak: 'yerel', satirlar: null };
}

function mevcutJson() {
  try { return JSON.parse(fs.readFileSync(OUT_JSON, 'utf8')); }
  catch { return null; }
}

// --- Normalizasyon ----------------------------------------------------------
function normalize(satirlar) {
  const gorulen = new Set();
  const kayitlar = [];
  const atlanan = [];

  for (const satir of satirlar) {
    const slug = guvenliSlug(satir.slug);
    if (!slug) { atlanan.push(`slug gecersiz: ${JSON.stringify(satir.slug)}`); continue; }
    if (gorulen.has(slug)) { atlanan.push(`slug tekrar: ${slug}`); continue; }
    gorulen.add(slug);

    const tur = TURLER[satir.kind] ? satir.kind : 'makale';
    const govde = govdeTemizle(satir.content_html);
    const baslik = String(satir.title || '').trim();
    if (!TURLER[tur].basliksiz && !baslik) {
      atlanan.push(`${tur} bassiz: ${slug}`); continue;
    }
    const meta = metaTemizle(tur, satir.meta);

    const tarih = satir.published_at || satir.created_at || null;
    const etiketler = Array.isArray(satir.tags)
      ? satir.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 6)
      : [];

    const kayit = {
      tur,
      slug,
      id: satir.id || null,
      baslik,
      ozet: String(satir.summary || '').trim() || duzMetin(govde).slice(0, 180),
      tarih,
      etiketler,
      yol: `/y/${slug}.html`,
      sure: okumaSuresi(govde)
    };
    if (Object.keys(meta).length) kayit.meta = meta;
    // Not kisa: govdesi omurgada tasinir, akis satir ici gosterir.
    // Uzun turlerin govdesi yalniz kendi sayfasinda durur.
    if (tur === 'not') kayit.govde = govde;
    kayitlar.push({ ...kayit, _govde: govde });
  }

  kayitlar.sort((a, b) => new Date(b.tarih || 0) - new Date(a.tarih || 0));
  return { kayitlar, atlanan };
}

// --- Permalink sayfasi ------------------------------------------------------
// Kitap/film kunyesi: degerlendirmenin KONUSU. Makalede boyle bir sey yok —
// makalenin konusu kendisidir. Bu yuzden kunye yalniz meta tasiyan turde cikar.
const META_ETIKET = {
  yazar: 'Yazar', cevirmen: 'Ceviri', yil: 'Yil', sayfa: 'Sayfa',
  yonetmen: 'Yonetmen', sure: 'Sure', ulke: 'Ulke'
};

function kunyeUret(kayit) {
  const meta = kayit.meta || {};
  const satirlar = Object.entries(META_ETIKET)
    .filter(([alan]) => meta[alan] != null)
    .map(([alan, etiket]) =>
      `<div class="yazi-kunye-satir"><dt>${kacis(etiket)}</dt><dd>${kacis(meta[alan])}</dd></div>`);

  // Puan ayri: sayi degil OLCU. 10 uzerinden, gorsel olarak da okunur.
  const puan = Number(meta.puan);
  const puanBlok = Number.isFinite(puan) && puan > 0 && puan <= 10
    ? `<p class="yazi-puan" aria-label="Puan: ${puan} / 10">`
      + `<span class="yazi-puan-sayi">${puan}</span>`
      + `<span class="yazi-puan-bar"><span style="width:${Math.round(puan * 10)}%"></span></span>`
      + `<span class="yazi-puan-max">/ 10</span></p>`
    : '';

  if (!satirlar.length && !puanBlok) return '';
  const gorsel = meta.kapak || meta.afis;
  return '<aside class="yazi-kunye">'
    + (gorsel ? `<img class="yazi-kunye-gorsel" src="${kacis(gorsel)}" alt="" loading="lazy">` : '')
    + '<div class="yazi-kunye-govde">'
    + (satirlar.length ? `<dl class="yazi-kunye-liste">${satirlar.join('')}</dl>` : '')
    + puanBlok
    + '</div></aside>';
}

function sayfaUret(kayit) {
  const turBilgi = TURLER[kayit.tur] || TURLER.makale;
  const baslik = kayit.baslik || `Karalama — ${tarihYaz(kayit.tarih)}`;
  const kanonik = `${SITE}${kayit.yol}`;
  const etiket = kayit.etiketler.length
    ? `<ul class="yazi-etiketler">${kayit.etiketler.map((t) => `<li>${kacis(t)}</li>`).join('')}</ul>`
    : '';
  const ustBilgi = [
    turBilgi.ad.toUpperCase(),
    tarihYaz(kayit.tarih),
    kayit.tur === 'not' ? null : `${kayit.sure} dk okuma`
  ].filter(Boolean).join(' &middot; ');
  const kunye = kunyeUret(kayit);

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta name="referrer" content="strict-origin-when-cross-origin">
<!--
  Convivium Origin Marker
  (c) 2026 Ersin Binal - https://ersinbinal.github.io
  Bu kaynak kod, tasarim ve icerik teliflidir. Kopyalama veya yeniden yayim,
  LICENSE ve NOTICE.md uyarinca yazili izin olmadan yasaktir.
  origin-id: CVM-28386996
-->
<meta name="author" content="Ersin Binal">
<meta name="x-convivium-origin" content="ersinbinal.github.io#CVM-28386996">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${kacis(baslik)} - Convivium</title>
  <meta name="description" content="${kacis(kayit.ozet.slice(0, 200))}">
  <link rel="canonical" href="${kacis(kanonik)}">
  <meta name="robots" content="index, follow">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src https://*.supabase.co; form-action 'none'; frame-ancestors 'self'">

  <meta property="og:site_name" content="Convivium">
  <meta property="og:title" content="${kacis(baslik)}">
  <meta property="og:description" content="${kacis(kayit.ozet.slice(0, 200))}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${kacis(kanonik)}">
  <meta property="og:locale" content="tr_TR">
  <meta property="og:image" content="${SITE}/assets/icons/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${kacis(baslik)}">
  <meta name="twitter:description" content="${kacis(kayit.ozet.slice(0, 200))}">
  <meta name="twitter:image" content="${SITE}/assets/icons/og-image.png">

  <meta name="theme-color" content="#00ff00">
  <link rel="icon" type="image/svg+xml" href="/assets/icons/icon.svg">
  <link rel="stylesheet" href="/assets/css/common.css">
  <link rel="stylesheet" href="/assets/css/components.css${surumOku('pages/makaleler.html', '/assets/css/components.css')}">
  <link rel="stylesheet" href="/assets/css/yazi.css">
  <link rel="stylesheet" href="/assets/css/kenar.css">
</head>
<body class="yazi-page">
  <a class="skip-link" href="#content">Icerigi atla</a>

  <div class="site yazi-site">
    <nav class="yazi-nav" aria-label="Site navigasyonu">
      <a href="/" class="btn">&#8592; Ana Sayfa</a>
      <a href="/pages/makaleler.html" class="btn">Okuma Odasi</a>
    </nav>

    <main id="content" role="main">
      <article class="yazi" data-tur="${kacis(kayit.tur)}">
        <header class="yazi-baslik">
          <p class="yazi-ust">${ustBilgi}</p>
          <h1>${kacis(baslik)}</h1>
        </header>
        ${kunye}
        <div class="yazi-govde">
${kayit._govde}
        </div>
        ${etiket}
      </article>
    </main>

    ${kayit.id ? `<section class="yorumlar" id="yorumlar" data-makale="${kacis(kayit.id)}" aria-label="Yorumlar">
      <h2 class="yorumlar-baslik">Yorumlar</h2>
      <p class="yorumlar-durum" id="yorumlarDurum">Yorumlar yukleniyor...</p>
    </section>` : ''}

    <footer class="yazi-alt">
      <a href="/pages/makaleler.html" class="btn">Tum yazilar</a>
      <a href="/signals.xml" class="btn">RSS</a>
    </footer>
  </div>

  <script type="application/ld+json">
${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': { makale: 'Article', kitap: 'Review', film: 'Review', not: 'SocialMediaPosting' }[kayit.tur] || 'Article',
  headline: baslik,
  description: kayit.ozet.slice(0, 200),
  url: kanonik,
  datePublished: kayit.tarih || undefined,
  keywords: kayit.etiketler.length ? kayit.etiketler.join(', ') : undefined,
  author: { '@type': 'Person', name: 'Ersin Binal' }
}, null, 2)}
  </script>
${kayit.id ? `  <script src="/assets/js/supabase-config.js"></script>
  <script src="/assets/js/yorum.js" defer></script>` : ''}
</body>
</html>
`;
}

// --- Sitemap ----------------------------------------------------------------
// sitemap.xml elle tutuluyor ve oyle kalmali: oradaki 26 girdinin lastmod ve
// priority degerleri dusunulmus kararlar. Bu yuzden dosyayi yeniden URETMIYOR,
// yalniz isaretli bir BOLGEYI yonetiyoruz. Elle yazilanlara dokunulmaz,
// uretilenler tek blokta durur — kimin neyi sahiplendigi belli.
const SITEMAP = path.join(root, 'sitemap.xml');
const BAS = '  <!-- ICERIK:BASLANGIC (uretilir — scripts/build-icerik.js) -->';
const BIT = '  <!-- ICERIK:BITIS -->';

function sitemapBolgesi(kayitlar) {
  const girdiler = kayitlar.map((k) => {
    const lastmod = (k.tarih || '').slice(0, 10);
    return [
      '  <url>',
      `    <loc>${SITE}${k.yol}</loc>`,
      lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
      '    <changefreq>monthly</changefreq>',
      `    <priority>${k.tur === 'makale' ? '0.7' : '0.5'}</priority>`,
      '  </url>'
    ].filter(Boolean).join('\n');
  });
  return [BAS, ...girdiler, BIT].join('\n');
}

function sitemapYaz(kayitlar, yalnizDogrula) {
  let xml;
  try { xml = fs.readFileSync(SITEMAP, 'utf8'); }
  catch { return { durum: 'yok' }; }

  const bolge = sitemapBolgesi(kayitlar);
  const basIdx = xml.indexOf(BAS);
  const bitIdx = xml.indexOf(BIT);

  let yeni;
  if (basIdx !== -1 && bitIdx !== -1) {
    yeni = xml.slice(0, basIdx) + bolge + xml.slice(bitIdx + BIT.length);
  } else {
    // Ilk kurulum: bolgeyi </urlset> oncesine ac.
    const kapanis = xml.lastIndexOf('</urlset>');
    if (kapanis === -1) return { durum: 'bicim-bozuk' };
    yeni = xml.slice(0, kapanis) + bolge + '\n' + xml.slice(kapanis);
  }

  if (yeni === xml) return { durum: 'guncel' };
  if (yalnizDogrula) return { durum: 'suruklendi' };
  fs.writeFileSync(SITEMAP, yeni);
  return { durum: 'yazildi', adet: kayitlar.length };
}

// --- Cikti paketi -----------------------------------------------------------
function paketle(kayitlar, kaynak) {
  const etiketler = [...new Set(kayitlar.flatMap((k) => k.etiketler))].sort();
  return {
    v: 1,
    kaynak,
    sayim: Object.keys(TURLER).reduce(
      (acc, tur) => ({ ...acc, [tur]: kayitlar.filter((k) => k.tur === tur).length }),
      { toplam: kayitlar.length }
    ),
    turler: Object.entries(TURLER).map(([anahtar, t]) => ({
      anahtar, ad: t.ad, coklu: t.coklu
    })),
    etiketler,
    kayitlar: kayitlar.map(({ _govde, ...genel }) => genel)
  };
}

(async () => {
  const { kaynak, satirlar } = await kayitlariGetir();

  let kayitlar, atlanan = [], kaynakAdi = kaynak;
  if (satirlar) {
    ({ kayitlar, atlanan } = normalize(satirlar));
  } else {
    // Ag yok: mevcut omurgadan uret. Govde notlarda var, makalelerde sayfada —
    // bu yuzden makale sayfalari agsiz modda YENIDEN uretilemez, korunur.
    const eski = mevcutJson();
    if (!eski) {
      console.error('icerik.json yok ve Supabase okunamadi. Once agli calistir:');
      console.error('  npm run build:icerik');
      process.exit(kontrol ? 0 : 1);
    }
    kayitlar = eski.kayitlar.map((k) => ({ ...k, _govde: k.govde || null }));
    kaynakAdi = eski.kaynak || 'yerel';
  }

  const paket = paketle(kayitlar, kaynakAdi);
  const metin = `${JSON.stringify(paket, null, 2)}\n`;

  // --- Kapi: repo ici tutarlilik -------------------------------------------
  if (kontrol) {
    const eski = mevcutJson();
    if (!eski) {
      console.log('icerik.json yok — omurga henuz kurulmamis, kapi atlandi.');
      process.exit(0);
    }
    const hatalar = [];
    const diskte = fs.existsSync(OUT_DIR)
      ? new Set(fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.html')))
      : new Set();
    const beklenen = new Set(eski.kayitlar.map((k) => `${k.slug}.html`));

    for (const d of beklenen) if (!diskte.has(d)) hatalar.push(`sayfa eksik: /y/${d}`);
    for (const d of diskte) if (!beklenen.has(d)) hatalar.push(`sahipsiz sayfa: /y/${d}`);

    const sayim = eski.kayitlar.length;
    if (eski.sayim && eski.sayim.toplam !== sayim) {
      hatalar.push(`sayim tutmuyor: ${eski.sayim.toplam} yazili, ${sayim} kayit var`);
    }

    const sm = sitemapYaz(eski.kayitlar, true);
    if (sm.durum === 'suruklendi') hatalar.push('sitemap.xml icerik bolgesi guncel degil');

    if (hatalar.length) {
      console.error('icerik omurgasi surukleniyor:');
      hatalar.slice(0, 15).forEach((h) => console.error(`  ${h}`));
      if (hatalar.length > 15) console.error(`  ... +${hatalar.length - 15}`);
      console.error('Duzeltmek icin: npm run build:icerik');
      process.exit(1);
    }
    const ozet = Object.keys(TURLER)
      .filter((t) => eski.sayim[t]).map((t) => `${eski.sayim[t]} ${TURLER[t].ad.toLowerCase()}`);
    console.log(`icerik omurgasi tutarli (${sayim} kayit`
      + `${ozet.length ? ': ' + ozet.join(', ') : ''}).`);
    process.exit(0);
  }

  // --- Yaz ------------------------------------------------------------------
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Silinen/arsivlenen yazinin sayfasi kalmamali: once sahipsizleri temizle.
  const beklenen = new Set(kayitlar.map((k) => `${k.slug}.html`));
  let silinen = 0;
  for (const dosya of fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.html'))) {
    if (!beklenen.has(dosya)) { fs.unlinkSync(path.join(OUT_DIR, dosya)); silinen += 1; }
  }

  let yazilan = 0, korunan = 0;
  for (const kayit of kayitlar) {
    if (kayit._govde == null) { korunan += 1; continue; } // agsiz mod: makale sayfasina dokunma
    fs.writeFileSync(path.join(OUT_DIR, `${kayit.slug}.html`), sayfaUret(kayit));
    yazilan += 1;
  }

  fs.writeFileSync(OUT_JSON, metin);
  const sm = sitemapYaz(paket.kayitlar, false);

  console.log(`icerik omurgasi yazildi (kaynak: ${kaynakAdi})`);
  const dokum = Object.keys(TURLER)
    .map((t) => `${paket.sayim[t]} ${TURLER[t].ad.toLowerCase()}`).join(', ');
  console.log(`  ${paket.sayim.toplam} kayit: ${dokum}`);
  console.log(`  /y/ : ${yazilan} sayfa yazildi`
    + (korunan ? `, ${korunan} korundu (agsiz)` : '')
    + (silinen ? `, ${silinen} sahipsiz silindi` : ''));
  console.log(`  etiket: ${paket.etiketler.length ? paket.etiketler.join(', ') : '-'}`);
  console.log(`  sitemap: ${sm.durum}${sm.adet ? ` (${sm.adet} url)` : ''}`);
  console.log(`  boyut : ${(fs.statSync(OUT_JSON).size / 1024).toFixed(1)} KB`);
  if (atlanan.length) {
    console.log(`  atlanan (${atlanan.length}):`);
    atlanan.slice(0, 10).forEach((a) => console.log(`    ${a}`));
  }
})();
