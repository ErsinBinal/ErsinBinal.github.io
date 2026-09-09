(() => {
  'use strict';

  // NABIZ — ana sayfanin canli yuzeyleri.
  //
  // Terminale koydugumuz alti grafigin ayni mantigi ana sayfaya tasiniyor:
  // hesaplanan seyi GOSTER, anlatma. Dort yerlesim var ve dordu de gercek
  // veriyle calisir.
  //
  // UC KURAL BU DOSYAYI BELIRLEDI:
  //
  //   1. UYDURMA SAYI YOK. Butun rakamlar assets/data/nabiz.json ve
  //      filiz.json'dan gelir. nabiz.json build'de turetilir
  //      (scripts/build-nabiz.js) ve --check ile suruklemeye karsi korunur.
  //      Veri yoksa yuzey ACILMAZ — bos bir kutu, olmayan kutudan kotudur.
  //
  //   2. SAYFAYI KARMASIKLASTIRMAZ. Hicbir yuzey yeni bir kutu, baslik ya da
  //      aciklama eklemez. Var olan elemanlarin uzerine/kosesine yerlesir.
  //      Metin yok; yalniz hareket ve sayi.
  //
  //   3. BEDAVA DEGILSE CALISMAZ. Ekranda gorunmeyen canvas cizmez
  //      (IntersectionObserver), sekme arkadayken durur, hareket azaltma
  //      isteginde tek kare cizip biter. Sayfanin agirlik merkezi
  //      degismemeli.
  //
  // Bu modul DOM'a dokunur — chat-deck, night-mode ve ux gibi. Karar mantigi
  // (hangi yuzey acilir, veri yeterli mi) saf ve disaridan test edilebilir.

  const root = window.ConviviumHome = window.ConviviumHome || {};

  const C = Object.freeze({
    bg: '#060a08',
    dim: '#6f8479',
    faint: '#47584f',
    phos: '#9fffb5',
    green: '#00ff66',
    signal: '#00f3ff',
    hot: '#ff0096',
    warn: '#ffc247',
    band: ['#9fffb5', '#00f3ff', '#ffc247', '#ff0096', '#7c6cff', '#ff7a3d']
  });

  const FONT = (s) => `${s}px 'Share Tech Mono', ui-monospace, 'Cascadia Code', Menlo, monospace`;
  const tr = (n) => Number(n).toLocaleString('tr-TR');

  root.createPulse = function createPulse(deps = {}) {
    const {
      getNabiz = () => null,
      getFiliz = () => null,
      prefersReducedMotion = () => false,
      documentRef = (typeof document !== 'undefined' ? document : null)
    } = deps;

    const doc = documentRef;
    const temizle = [];

    // --- Karar mantigi (saf) -------------------------------------------------
    // Hangi yuzey acilabilir? Veri sozlesmesi burada, cizimde degil.
    const hazir = (yuzey) => {
      if (yuzey === 'cmd') {
        const n = getNabiz();
        return Boolean(n && n.terminal && n.terminal.yazilabilir > 0);
      }
      if (yuzey === 'serit') {
        const n = getNabiz();
        return Boolean(n && n.kazi && Array.isArray(n.kazi.donem) && n.kazi.donem.length > 1);
      }
      if (yuzey === 'atolye') {
        const f = getFiliz();
        return Boolean(f && f.elek && f.elek.aday > 0 && f.raf);
      }
      if (yuzey === 'rozet') {
        const n = getNabiz();
        return Boolean(n && n.arsiv && n.yayin);
      }
      return false;
    };

    // --- Cizim altyapisi -----------------------------------------------------
    // Gorunmeyen canvas CIZMEZ. Sayfanin agirlik merkezi degismemeli.
    const kur = (canvas, oran) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 300;
      const h = Math.max(24, Math.round(w * oran));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, W: w, H: h };
    };

    const oynat = (canvas, oran, sure, ciz, { hepsi = false, seffaf = false } = {}) => {
      let raf = 0;
      let gorunur = false;
      let olcu = kur(canvas, oran);

      const kare = (p) => {
        // Seffaf yuzeyler kendi zeminini BOYAMAZ: HUD satirinin uzerinde
        // kucuk bir kutu gibi durmasinlar, satirin zemini gorunsun.
        if (seffaf) olcu.ctx.clearRect(0, 0, olcu.W, olcu.H);
        else { olcu.ctx.fillStyle = C.bg; olcu.ctx.fillRect(0, 0, olcu.W, olcu.H); }
        ciz(olcu.ctx, olcu.W, olcu.H, p);
      };

      if (prefersReducedMotion()) { kare(1); return () => {}; }

      const t0 = performance.now();
      const dongu = (now) => {
        raf = 0;
        if (!gorunur) return;
        const p = hepsi ? Math.min(1, (now - t0) / sure) : ((now - t0) % sure) / sure;
        kare(p);
        if (!hepsi || p < 1) raf = requestAnimationFrame(dongu);
      };

      const io = new IntersectionObserver((girisler) => {
        gorunur = girisler.some((g) => g.isIntersecting);
        if (gorunur && !raf) raf = requestAnimationFrame(dongu);
        if (!gorunur && raf) { cancelAnimationFrame(raf); raf = 0; }
      }, { rootMargin: '80px' });
      io.observe(canvas);

      const gorunurluk = () => {
        if (doc.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
        else if (!doc.hidden && gorunur && !raf) raf = requestAnimationFrame(dongu);
      };
      doc.addEventListener('visibilitychange', gorunurluk);

      let yenidenOlc = 0;
      const olcek = () => {
        window.clearTimeout(yenidenOlc);
        yenidenOlc = window.setTimeout(() => { olcu = kur(canvas, oran); }, 160);
      };
      window.addEventListener('resize', olcek, { passive: true });

      return () => {
        io.disconnect();
        doc.removeEventListener('visibilitychange', gorunurluk);
        window.removeEventListener('resize', olcek);
        if (raf) cancelAnimationFrame(raf);
      };
    };

    // --- 1 · CMD karti -------------------------------------------------------
    // Butona gelince acilir. Ne oldugunu SOYLEMEZ, ne kadar oldugunu gosterir.
    const cmdKarti = () => {
      const buton = doc.getElementById('command-launch');
      if (!buton || !hazir('cmd')) return;
      const n = getNabiz().terminal;
      const o = getNabiz().okkam || {};

      const kart = doc.createElement('div');
      kart.className = 'pulse-card';
      kart.hidden = true;
      kart.setAttribute('aria-hidden', 'true');   // yardimci teknoloji icin gurultu degil
      kart.innerHTML =
        '<div class="pulse-card-bar">TERMINALDE NE VAR</div>' +
        '<dl class="pulse-card-list">' +
        `<div><dt>yazilabilir</dt><dd>${tr(n.yazilabilir)}</dd></div>` +
        `<div><dt>oyun komutu</dt><dd>${tr(n.oyunKomut)}</dd></div>` +
        `<div><dt>okkam bulmacasi</dt><dd>${tr(o.bulmaca || 0)}</dd></div>` +
        `<div><dt>sozluk terimi</dt><dd>${tr(n.sozlukTerim)}</dd></div>` +
        '</dl>' +
        '<canvas class="pulse-card-grid"></canvas>' +
        `<p class="pulse-card-foot">${tr(n.komut)} komut · ${tr(n.takmaAd)} takma ad</p>`;
      buton.parentElement.appendChild(kart);

      const cv = kart.querySelector('.pulse-card-grid');
      let durdur = null;

      const ac = () => {
        if (!kart.hidden) return;
        kart.hidden = false;
        // Izgara HER acilista bastan dolar: kart "canli" hissettirsin.
        // Izgara alcak tutulur: kart 243px'e cikip altindaki seridi ve
        // SINYAL satirini orttugu icin kisaltildi. Bes satir yerine uc.
        durdur = oynat(cv, 0.16, 1400, (g, W, H, p) => {
          const COLS = 30, ROWS = 3;
          const cw = W / COLS, ch = H / ROWS;
          const dolu = Math.floor(Math.pow(p, 0.7) * COLS * ROWS);
          for (let i = 0; i < dolu; i += 1) {
            const komutMu = i < Math.round((n.komut / n.yazilabilir) * COLS * ROWS);
            g.fillStyle = komutMu ? C.signal : '#1e4a35';
            g.globalAlpha = komutMu ? 0.75 : 0.5;
            g.fillRect((i % COLS) * cw, Math.floor(i / COLS) * ch, cw - 1, ch - 1);
          }
          g.globalAlpha = 1;
        }, { hepsi: true });
      };
      const kapa = () => {
        if (kart.hidden) return;
        kart.hidden = true;
        if (durdur) { durdur(); durdur = null; }
      };

      buton.addEventListener('pointerenter', ac);
      buton.addEventListener('focus', ac);
      buton.addEventListener('pointerleave', kapa);
      buton.addEventListener('blur', kapa);
      // Dokunmatikte hover yok: kart acilirsa tiklamayi ENGELLEMEZ, sadece
      // gorunur olur ve bir sonraki dokunusta kapanir.
      doc.addEventListener('pointerdown', (e) => {
        if (!kart.contains(e.target) && e.target !== buton) kapa();
      });
      temizle.push(kapa);
    };

    // --- 2 · Kazi seridi -----------------------------------------------------
    // Hero altinda ince bir serit: butun gecmis, sekiz donem rengiyle.
    // Hicbir sey aciklamaz; ustune gelen donemi gorur, tiklayan terminali acar.
    const kaziSeridi = () => {
      const yuva = doc.querySelector('.primary-actions');
      if (!yuva || !hazir('serit')) return;
      // tortu.json 86 KB; serit icin sekiz ad+sayi yeter ve o ozet
      // nabiz.json'da (0,5 KB) build'de cikarilmis durumda.
      const kazi = getNabiz().kazi;
      const eras = kazi.donem.map((e, i) => ({
        ad: e.ad, n: e.n, renk: C.band[i % C.band.length]
      }));
      const toplam = kazi.commit || eras.reduce((a, b) => a + b.n, 0);

      const sarmal = doc.createElement('div');
      sarmal.className = 'pulse-strip';
      sarmal.innerHTML =
        '<canvas class="pulse-strip-canvas"></canvas>' +
        '<span class="pulse-strip-label" aria-hidden="true"></span>';
      // Erisilebilir cekirdek: sarmal bir buton gibi davranir ama METIN tasir.
      sarmal.setAttribute('role', 'button');
      sarmal.setAttribute('tabindex', '0');
      sarmal.setAttribute('aria-label',
        `${toplam} commit, ${eras.length} donem — terminalde tabaka komutunu calistir`);
      yuva.insertAdjacentElement('afterend', sarmal);

      const cv = sarmal.querySelector('.pulse-strip-canvas');
      const etiket = sarmal.querySelector('.pulse-strip-label');

      temizle.push(oynat(cv, 0.075, 26000, (g, W, H, p) => {
        let idx = 0, run = 0;
        for (let i = 0; i < toplam; i += 1) {
          while (idx < eras.length - 1 && i >= run + eras[idx].n) { run += eras[idx].n; idx += 1; }
          const x = (i / toplam) * W;
          // Yukseklik farki KUCUK olmali: genis aralik testere disi gibi
          // okunuyordu, veri bandi gibi degil. Taban yuksek, doku hafif.
          const h = H * (0.58 + ((((i * 1103515245) + 12345) >>> 16) % 7) * 0.022);
          g.fillStyle = eras[idx].renk;
          g.globalAlpha = 0.28;
          g.fillRect(x, (H - h) / 2, Math.max(1, W / toplam), h);
        }
        g.globalAlpha = 1;
        const lx = p * W;
        const grad = g.createLinearGradient(lx - W * 0.06, 0, lx + 2, 0);
        grad.addColorStop(0, 'rgba(0,243,255,0)');
        grad.addColorStop(1, 'rgba(0,243,255,.26)');
        g.fillStyle = grad;
        g.fillRect(lx - W * 0.06, 0, W * 0.06 + 2, H);
        g.strokeStyle = 'rgba(0,243,255,.7)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx, H); g.stroke();
      }));

      const donemAdi = (oran) => {
        const d = Math.floor(oran * toplam);
        let a = 0;
        for (const e of eras) { a += e.n; if (d < a) return `${e.ad} · ${e.n} commit`; }
        return eras[eras.length - 1].ad;
      };
      const uzerinde = (event) => {
        const r = cv.getBoundingClientRect();
        const oran = Math.max(0, Math.min(1, (event.clientX - r.left) / r.width));
        etiket.textContent = donemAdi(oran);
        sarmal.classList.add('is-hover');
      };
      cv.addEventListener('pointermove', uzerinde);
      cv.addEventListener('pointerleave', () => {
        sarmal.classList.remove('is-hover');
        etiket.textContent = '';
      });

      const ac = () => {
        doc.getElementById('command-launch')?.click();
        window.setTimeout(() => {
          const giris = doc.getElementById('command-input');
          if (!giris) return;
          giris.value = 'tabaka';
          giris.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        }, 900);
      };
      sarmal.addEventListener('click', ac);
      sarmal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ac(); }
      });
    };

    // --- 3 · Kart rozetleri --------------------------------------------------
    // Dort kartin kosesinde mini akis. Her rozet KENDI kartinin verisinden.
    const kartRozetleri = () => {
      if (!hazir('rozet')) return;
      const n = getNabiz();
      // Kartlari METINDEN degil data-action'dan bul: metin degisirse rozet
      // sessizce kaybolmasin. Bu nitelikler HTML'de zaten var.
      const HARITA = {
        OPEN:  { renk: C.signal, tur: 'bar',   deger: n.arsiv.pasaj },
        GUIDE: { renk: C.phos,   tur: 'grid',  deger: n.terminal.yazilabilir },
        LOGIN: { renk: C.warn,   tur: 'pulse', deger: n.sayfa.arac },
        DASH:  { renk: C.hot,    tur: 'line',  deger: n.yayin.changelogGirdi }
      };
      doc.querySelectorAll('.terminal-command[data-action]').forEach((kart) => {
        const tarif = HARITA[kart.dataset.action];
        if (!tarif || !tarif.deger) return;
        const rozet = doc.createElement('span');
        rozet.className = 'pulse-badge';
        rozet.setAttribute('aria-hidden', 'true');
        rozet.innerHTML = '<canvas></canvas>';
        kart.appendChild(rozet);
        const cv = rozet.querySelector('canvas');
        temizle.push(oynat(cv, 0.30, 7000, (g, W, H, p) => {
          g.fillStyle = tarif.renk;
          if (tarif.tur === 'bar') {
            const N = Math.max(6, Math.floor(W / 6));
            for (let b = 0; b < N; b += 1) {
              const h = H * (0.25 + ((b * 7 + Math.floor(p * N)) % 5) / 8);
              g.globalAlpha = 0.3 + 0.6 * (b / N);
              g.fillRect(b * (W / N), H - h, W / N - 1.2, h);
            }
          } else if (tarif.tur === 'grid') {
            const COLS = Math.max(8, Math.floor(W / 6)), ROWS = 3;
            for (let b = 0; b < COLS * ROWS; b += 1) {
              g.globalAlpha = ((b + Math.floor(p * COLS * ROWS)) % 7 === 0) ? 0.95 : 0.2;
              g.fillRect((b % COLS) * (W / COLS), Math.floor(b / COLS) * (H / ROWS),
                W / COLS - 1.2, H / ROWS - 1.2);
            }
          } else if (tarif.tur === 'pulse') {
            const r = H * 0.16 + Math.sin(p * Math.PI * 2) * H * 0.10;
            g.globalAlpha = 0.35 + 0.35 * Math.sin(p * Math.PI * 2);
            g.beginPath(); g.arc(W / 2, H / 2, r + H * 0.2, 0, 6.284); g.fill();
            g.globalAlpha = 1;
            g.beginPath(); g.arc(W / 2, H / 2, H * 0.14, 0, 6.284); g.fill();
          } else {
            g.globalAlpha = 0.9; g.strokeStyle = tarif.renk; g.lineWidth = 1.2;
            g.beginPath();
            const N = 24;
            for (let b = 0; b <= N; b += 1) {
              const x = (b / N) * W;
              const y = H / 2 - Math.sin((b / N + p) * Math.PI * 3) * H * 0.28;
              b === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
            }
            g.stroke();
          }
          g.globalAlpha = 1;
        }));
      });
    };

    // --- 4 · Atolye nabzi ----------------------------------------------------
    // Sitenin gece calistigini gosteren tek isaret. Ilan etmez, kipirdar.
    const atolyeNabzi = () => {
      const yuva = doc.querySelector('.os-snapshot');
      if (!yuva || !hazir('atolye')) return;
      const f = getFiliz();
      const aday = f.elek.aday, elenen = f.elek.elenen, acik = f.raf.acik;

      const sarmal = doc.createElement('div');
      sarmal.className = 'pulse-workshop';
      sarmal.innerHTML =
        '<canvas class="pulse-workshop-canvas"></canvas>' +
        `<span class="pulse-workshop-text">${tr(aday)} aday · ${tr(elenen)} elendi · ` +
        `<b>${tr(acik)}</b> acik</span>`;
      sarmal.setAttribute('aria-label',
        `Atolye: ${aday} adaydan ${elenen} elendi, ${acik} acik meydan okuma kaldi`);
      yuva.insertAdjacentElement('afterend', sarmal);

      const cv = sarmal.querySelector('.pulse-workshop-canvas');
      temizle.push(oynat(cv, 0.052, 9000, (g, W, H, p) => {
        const elekY = H * 0.62;
        const N = Math.max(24, Math.floor(W / 12));
        for (let i = 0; i < N; i += 1) {
          const faz = (p * 2 + i / N) % 1;
          const x = ((i * 37) % 100) / 100 * W;
          const y = H * 0.10 + faz * (elekY - H * 0.10);
          const elenirMi = i / N < elenen / aday;
          g.globalAlpha = faz < 0.85 ? Math.max(0, 0.5 * (1 - faz) + 0.15) : 0;
          g.fillStyle = elenirMi ? C.faint : C.phos;
          g.fillRect(x, y, 1.6, Math.max(3, H * 0.10));
        }
        g.globalAlpha = 1;
        g.strokeStyle = 'rgba(0,243,255,.34)'; g.lineWidth = 1;
        g.setLineDash([3, 4]);
        g.beginPath(); g.moveTo(0, elekY); g.lineTo(W, elekY); g.stroke();
        g.setLineDash([]);
        // Birikim bir SLAB degil ince bir olcek: 80 segment yan yana
        // neredeyse dolu bir blok yapiyordu.
        const birik = Math.max(1, Math.round(acik * Math.min(1, p * 1.4)));
        const bw = W / acik;
        const bh = Math.max(2, (H - elekY) * 0.42);
        for (let i = 0; i < birik; i += 1) {
          g.fillStyle = C.phos; g.globalAlpha = 0.62;
          g.fillRect(i * bw, elekY + 3, Math.max(1, bw - 1.4), bh);
        }
        g.globalAlpha = 1;
      }));
    };


    // --- 5 · YAKINDAKI ------------------------------------------------------
    // Sitede BASKA BIR INSAN yuzunden degisen tek sey. presence.js zaten
    // Supabase gercek zamanli kanaliyla bagli ve `#hud-presence`e
    // "N nearby" yaziyor; biz o METNI izleyip takimyildizi ciziyoruz.
    //
    // Neden MutationObserver: presence modulunun ic yapisina baglanmadan,
    // protokole tek satir eklemeden calisir. Sayi veridir; nokta gorseldir.
    const yakindaki = () => {
      const deger = doc.getElementById('hud-presence');
      if (!deger) return;

      const cv = doc.createElement('canvas');
      cv.className = 'pulse-nearby';
      cv.setAttribute('aria-hidden', 'true');   // sayi zaten metinde, tekrar degil
      deger.parentElement.insertBefore(cv, deger);

      let sayi = 0;
      const oku = () => {
        const m = String(deger.textContent || '').match(/(\d+)\s*nearby/i);
        sayi = m ? Math.min(12, Number(m[1])) : 0;
      };
      oku();

      const gozlemci = new MutationObserver(oku);
      gozlemci.observe(deger, { childList: true, characterData: true, subtree: true });
      temizle.push(() => gozlemci.disconnect());

      // Sen HER ZAMAN varsin: ilk nokta sensin, digerleri sayidan gelir.
      temizle.push(oynat(cv, 0.42, 12000, (g, W, H, p) => {
        const toplam = sayi + 1;
        for (let i = 0; i < toplam; i += 1) {
          // Deterministik yerlesim: ayni sayi ayni deseni verir.
          const a = (i * 2.399) + p * 0.6;
          const r = i === 0 ? 0 : Math.min(W, H) * (0.20 + (i % 3) * 0.09);
          const x = W / 2 + Math.cos(a) * r;
          const y = H / 2 + Math.sin(a) * r * 0.8;
          if (i > 0) {
            g.strokeStyle = 'rgba(0,243,255,.16)'; g.lineWidth = 1;
            g.beginPath(); g.moveTo(W / 2, H / 2); g.lineTo(x, y); g.stroke();
          }
          const nabiz = 0.65 + 0.35 * Math.sin(p * 6.284 + i * 1.7);
          g.globalAlpha = 0.22 * nabiz;
          g.fillStyle = i === 0 ? C.phos : C.signal;
          g.beginPath(); g.arc(x, y, 6, 0, 6.284); g.fill();
          g.globalAlpha = nabiz;
          g.beginPath(); g.arc(x, y, 2.2, 0, 6.284); g.fill();
          g.globalAlpha = 1;
        }
      }, { seffaf: true }));
    };


    // --- 6 · ZIYARET NABZI --------------------------------------------------
    // Son 30 gunun GUNLUK sayfa acilisi. Tek bir buyuk sayi degil, SEKIL:
    //
    // Cunku tek sayi burada YANILTICI olurdu. Bu olcum gelistirme gunlerinde
    // patliyor (bir gun 298, sessiz gunler 1-2) cunku tarayici testleri de
    // sayiliyor. Sekli gostermek dogruyu gosterir: patlamalar ve sessizlik
    // birlikte gorunur. Etiket de "ziyaretci" degil "sayfa acilisi" —
    // olculen sey tekil insan degil, home.view olayi.
    const ziyaretNabzi = (gunler) => {
      const yuva = doc.querySelector('.pulse-workshop') || doc.querySelector('.os-snapshot');
      if (!yuva || !Array.isArray(gunler) || !gunler.length) return;

      // 30 gunluk tam eksen: yayin YAPILMAYAN gunler de gorunmeli.
      const bugun = new Date();
      const dizi = [];
      for (let i = 29; i >= 0; i -= 1) {
        const d = new Date(bugun);
        d.setDate(d.getDate() - i);
        const anahtar = d.toISOString().slice(0, 10);
        const kayit = gunler.find((g) => String(g.gun).slice(0, 10) === anahtar);
        dizi.push(kayit ? Number(kayit.ziyaret) || 0 : 0);
      }
      const enYuksek = Math.max(1, ...dizi);
      const toplam = dizi.reduce((a, b) => a + b, 0);
      const acikGun = dizi.filter((n) => n > 0).length;

      const sarmal = doc.createElement('div');
      sarmal.className = 'pulse-visits';
      sarmal.innerHTML =
        '<canvas class="pulse-visits-canvas"></canvas>' +
        `<span class="pulse-visits-text">${tr(toplam)} sayfa açılışı · ` +
        `<b>${acikGun}</b>/30 gün</span>`;
      sarmal.setAttribute('aria-label',
        `Son 30 gunde ${toplam} sayfa acilisi, ${acikGun} gun hareketli`);
      yuva.insertAdjacentElement('afterend', sarmal);

      const cv = sarmal.querySelector('.pulse-visits-canvas');
      temizle.push(oynat(cv, 0.052, 11000, (g, W, H, p) => {
        const bw = W / dizi.length;
        dizi.forEach((n, i) => {
          const x = i * bw;
          if (!n) {
            g.fillStyle = '#1b2a22';
            g.fillRect(x, H - 2, Math.max(1, bw - 1.4), 2);
            return;
          }
          const h = Math.max(2, (n / enYuksek) * (H - 3));
          // Yuksek gunler farkli renk: patlamalar gizlenmiyor, isaretleniyor.
          g.fillStyle = n >= enYuksek * 0.5 ? C.signal : C.phos;
          g.globalAlpha = 0.72;
          g.fillRect(x, H - h, Math.max(1, bw - 1.4), h);
        });
        g.globalAlpha = 1;
        const lx = p * W;
        g.strokeStyle = 'rgba(0,243,255,.5)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx, H); g.stroke();
      }));
    };

    const baslat = () => {
      if (!doc) return;
      try { cmdKarti(); } catch (e) { console.error('[pulse] cmd', e); }
      try { kaziSeridi(); } catch (e) { console.error('[pulse] serit', e); }
      try { kartRozetleri(); } catch (e) { console.error('[pulse] rozet', e); }
      try { atolyeNabzi(); } catch (e) { console.error('[pulse] atolye', e); }
      try { yakindaki(); } catch (e) { console.error('[pulse] yakindaki', e); }
    };

    const dur = () => { temizle.forEach((f) => { try { f(); } catch { /* yoksay */ } }); };

    // Atolye nabzi filiz.json'u bekledigi icin ayrica cagrilabilir olmali.
    return Object.freeze({
      baslat, dur, hazir,
      _atolyeTek: atolyeNabzi,
      _ziyaretTek: ziyaretNabzi,
      _renkler: C
    });
  };

  // --- ONYUKLEYICI ----------------------------------------------------------
  // Protokole tek satir bile eklemiyoruz: bu bir ANA SAYFA yuzeyi, terminal
  // degil. Modul kendi verisini kendi ceker.
  //
  // Yuk butcesi: nabiz.json 0,5 KB — hemen. filiz.json 12 KB — BOSTA
  // (requestIdleCallback), cunku atolye nabzi zaten kivrimin altinda.
  // tortu.json (86 KB) HIC cekilmiyor; seridin ihtiyaci olan sekiz satir
  // build'de nabiz.json'a ozetlendi.
  const cek = (yol) => fetch(yol)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  const bosta = (fn) => (window.requestIdleCallback
    ? window.requestIdleCallback(fn, { timeout: 4000 })
    : window.setTimeout(fn, 1400));

  const baslat = async () => {
    if (!document.getElementById('command-launch')) return;   // ana sayfa degil
    const nabiz = await cek('/assets/data/nabiz.json');
    if (!nabiz) return;                                       // veri yoksa yuzey yok

    let filiz = null;
    const pulse = root.createPulse({
      getNabiz: () => nabiz,
      getFiliz: () => filiz,
      prefersReducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    });
    pulse.baslat();

    // Atolye nabzi filiz.json'u, ziyaret nabzi Supabase'i bekler; ikisi de
    // BOSTA gelir ve tek tek eklenir. Gelmezlerse sayfa eksiksiz calisir.
    bosta(async () => {
      filiz = await cek('/assets/data/filiz.json');
      const gec = root.createPulse({
        getNabiz: () => nabiz,
        getFiliz: () => filiz,
        prefersReducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
      });
      if (filiz) gec._atolyeTek();

      // Ziyaret nabzi: RPC yoksa ya da ag dusukse sessizce ATLANIR.
      try {
        const gunler = await window.ConviviumBackend?.fetchSitePulse?.();
        if (gunler && gunler.length) gec._ziyaretTek(gunler);
      } catch { /* olcum asla deneyimi bozmaz */ }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', baslat, { once: true });
  } else {
    baslat();
  }
})();
