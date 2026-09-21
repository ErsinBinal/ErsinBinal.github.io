/**
 * YORUM ADASI — kalici adres sayfalarindaki ziyaretci yorumlari.
 *
 * NEDEN SUPABASE SDK YOK
 *   SDK jsDelivr'dan geliyor; bu sayfaya baglamak CSP'ye ucuncu taraf bir
 *   script kaynagi eklemek demekti. Sayfanin SDK'dan ihtiyaci olan sey iki
 *   RPC cagrisi — onlari fetch ile yapmak ~100 satir. Boylece CSP
 *   `script-src 'self'` kaliyor: inline yok, ucuncu taraf yok.
 *
 * NEDEN ILERLEYICI KATMAN
 *   Sayfa JS olmadan da TAM render olur; yazinin kendisi hicbir betige
 *   bagli degil. Ada yuklenmezse yalniz yorumlar gorunmez, yazi degil.
 *
 * OTURUM UYARISI
 *   Site oturumu sessionStorage'da tutuyor (bilincli: sekme kapaninca biter).
 *   Yani paylasilan bir baglantiyla YENI sekmede gelen kisi oturumsuzdur:
 *   yorumlari okur, yazmak icin giris yapmasi gerekir. Bunu gizlemiyoruz,
 *   arayuzde soyluyoruz.
 */
(() => {
  'use strict';

  const kok = document.getElementById('yorumlar');
  if (!kok) return;

  const makaleId = kok.dataset.makale;
  const ayar = window.CONVIVIUM_SUPABASE || {};
  const taban = String(ayar.url || '').replace(/\/+$/, '');
  const anahtar = ayar.anonKey || '';
  const durum = document.getElementById('yorumlarDurum');

  if (!makaleId || !taban || !anahtar) {
    if (durum) durum.textContent = 'Yorum servisi yapilandirilmamis.';
    return;
  }

  const AY = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran',
    'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];

  function tarihYaz(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getDate()} ${AY[d.getMonth()]} ${d.getFullYear()}`;
  }

  // Oturum belirteci: SDK'nin sessionStorage'a yazdigi kaydi okuyoruz.
  // Bicimi degisirse yalniz yazma kapanir, okuma calismaya devam eder.
  function erisimBelirteci() {
    try {
      const ham = window.sessionStorage.getItem('convivium-auth-session');
      if (!ham) return null;
      const veri = JSON.parse(ham);
      const belirtec = veri && (veri.access_token
        || (veri.currentSession && veri.currentSession.access_token));
      if (!belirtec) return null;
      const bitis = veri.expires_at || (veri.currentSession && veri.currentSession.expires_at);
      if (bitis && Number(bitis) * 1000 < Date.now()) return null;
      return belirtec;
    } catch { return null; }
  }

  async function rpc(ad, govde, belirtec) {
    const cevap = await fetch(`${taban}/rest/v1/rpc/${ad}`, {
      method: 'POST',
      headers: {
        apikey: anahtar,
        Authorization: `Bearer ${belirtec || anahtar}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(govde)
    });
    const metin = await cevap.text();
    let veri = null;
    try { veri = metin ? JSON.parse(metin) : null; } catch { /* metin kalsin */ }
    if (!cevap.ok) {
      const kod = (veri && (veri.message || veri.hint)) || `HTTP ${cevap.status}`;
      throw new Error(kod);
    }
    return veri;
  }

  // Sunucu hata kodlarini insanin anlayacagi Turkceye cevir.
  const HATA_TR = {
    login_required: 'Yorum yazmak icin giris yapmalisin.',
    body_invalid: 'Yorum 1 ile 800 karakter arasinda olmali.',
    article_not_found: 'Bu icerik yayimlanmis gorunmuyor.',
    rate_limit: 'Cok hizli yaziyorsun; birkac dakika bekle.',
    daily_limit: 'Gunluk yorum sinirina ulastin.'
  };

  function hataMetni(hata) {
    const ham = String(hata && hata.message || '');
    for (const anahtarKod of Object.keys(HATA_TR)) {
      if (ham.includes(anahtarKod)) return HATA_TR[anahtarKod];
    }
    if (ham.includes('permission denied')) return HATA_TR.login_required;
    return 'Yorum gonderilemedi. Sonra tekrar dene.';
  }

  function yorumOgesi(y) {
    const li = document.createElement('li');
    li.className = 'yorum';

    const ust = document.createElement('p');
    ust.className = 'yorum-ust';
    const ad = document.createElement('strong');
    ad.textContent = y.author_name || y.author_handle || 'gezgin';
    const zaman = document.createElement('time');
    zaman.dateTime = y.created_at;
    zaman.textContent = tarihYaz(y.created_at);
    ust.append(ad, zaman);

    // textContent: govde ziyaretci metni, HTML olarak ASLA yorumlanmaz.
    const govde = document.createElement('p');
    govde.className = 'yorum-govde';
    govde.textContent = y.body;

    li.append(ust, govde);
    return li;
  }

  function formKur(belirtec) {
    if (!belirtec) {
      const giris = document.createElement('p');
      giris.className = 'yorumlar-giris';
      const bag = document.createElement('a');
      bag.className = 'btn';
      bag.href = '/account/auth.html';
      bag.textContent = 'Giris yap';
      giris.append('Yorum yazmak icin ', bag);
      kok.appendChild(giris);
      return;
    }

    const form = document.createElement('form');
    form.className = 'yorum-form';

    const alan = document.createElement('textarea');
    alan.className = 'yorum-alan';
    alan.rows = 3;
    alan.maxLength = 800;
    alan.required = true;
    alan.placeholder = 'Dusunceni yaz (en fazla 800 karakter)';
    alan.setAttribute('aria-label', 'Yorumun');

    const satir = document.createElement('div');
    satir.className = 'yorum-form-alt';
    const sayac = document.createElement('span');
    sayac.className = 'yorum-sayac';
    sayac.textContent = '0 / 800';
    const gonder = document.createElement('button');
    gonder.className = 'btn btn-primary';
    gonder.type = 'submit';
    gonder.textContent = 'Gonder';
    satir.append(sayac, gonder);

    const uyari = document.createElement('p');
    uyari.className = 'yorum-uyari';
    uyari.hidden = true;
    uyari.setAttribute('role', 'alert');

    alan.addEventListener('input', () => {
      sayac.textContent = `${alan.value.length} / 800`;
    });

    form.addEventListener('submit', async (olay) => {
      olay.preventDefault();
      const metin = alan.value.trim();
      if (!metin) return;
      gonder.disabled = true;
      gonder.textContent = 'Gonderiliyor...';
      uyari.hidden = true;
      try {
        await rpc('post_comment', { p_article: makaleId, p_body: metin },
          erisimBelirteci());
        alan.value = '';
        sayac.textContent = '0 / 800';
        await listeyiCiz();
      } catch (hata) {
        uyari.textContent = hataMetni(hata);
        uyari.hidden = false;
      } finally {
        gonder.disabled = false;
        gonder.textContent = 'Gonder';
      }
    });

    form.append(alan, satir, uyari);
    kok.appendChild(form);
  }

  async function listeyiCiz() {
    const eski = kok.querySelector('.yorum-listesi');
    if (eski) eski.remove();

    let yorumlar = [];
    try {
      yorumlar = await rpc('list_comments',
        { p_article: makaleId, p_limit: 100 }, erisimBelirteci()) || [];
    } catch (hata) {
      if (durum) durum.textContent = 'Yorumlar su an yuklenemedi.';
      return;
    }

    if (durum) {
      durum.textContent = yorumlar.length
        ? `${yorumlar.length} yorum`
        : 'Henuz yorum yok. Ilk sozu sen soyle.';
    }

    if (!yorumlar.length) return;
    const liste = document.createElement('ul');
    liste.className = 'yorum-listesi';
    yorumlar.forEach((y) => liste.appendChild(yorumOgesi(y)));
    // Liste form'dan ONCE dursun: once okunan, sonra yazilan.
    const form = kok.querySelector('.yorum-form, .yorumlar-giris');
    kok.insertBefore(liste, form || null);
  }

  (async () => {
    await listeyiCiz();
    formKur(erisimBelirteci());
  })();
})();
