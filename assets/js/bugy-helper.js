/**
 * Convivium - Bugy Helper
 * v4 asistanini "yardimci moduna" alarak sayfaya ozel kullanim ipuclari sunar.
 * Basta kapalidir; sag alttaki yuzen "?" dugmesiyle cagrilir.
 * Tek giris noktasidir: bugy-v4 css/js'ini gerektiginde kendisi enjekte eder.
 */
(() => {
  'use strict';

  const V4_JS = '/assets/js/bugy-v4.js?v=2';
  const V4_CSS = '/assets/css/bugy-v4.css?v=1';
  const HELPER_CSS = '/assets/css/bugy-helper.css?v=2';

  // --- Sayfaya ozel ipucu tabani ---
  const TIPS = {
    index: [
      'Convivium\'a hos geldin! Bir sey ariyorsan terminale "help" yaz.',
      '"tour" komutu seni sayfada gezdirir; "scan" ile node\'lari tarar.',
      'Yan protokoller bolumunden oyunlara ve araclara ulasabilirsin.',
      'Tema icin "theme green|cyan|amber", ses icin "volume" dene.'
    ],
    'ash-runner': [
      'Kul Hatti\'na hos geldin! Bosluk ya da Enter ile ziplarsin.',
      'Engellerden ve bosluklardan zamaninda ziplayarak kac.',
      'Hizlandikca tempo artar; ritmi yakalamaya calis.',
      'Ses dugmesiyle muzigi acip kapatabilirsin.'
    ],
    'cyberpunk-logic-game': [
      'Mantik bulmacasi! Ipuclarini okuyup eleme yontemiyle ilerle.',
      'Emin olmadigin hucreleri bos birak, kesinleri once doldur.',
      'Kaydet ile ilerlemeni tut, Tekrar Dene ile bastan basla.'
    ],
    'three-body-signal': [
      'Uc Gunes Sinyali: terminale komut yazip Gonder ile yolla.',
      'Takilirsan Yardim\'a bas; gecmis komut icin yukari ok tusu.',
      'Yeni operasyon ile temiz bir gorevle baslayabilirsin.'
    ],
    'dart-skorbord': [
      'Dart Skorbord: once vurusu sec, 2x/3x ile carpani uygula.',
      'BULL merkez, D-BULL ise cift merkez puanidir.',
      'Kalan skoru tam kapatarak eli bitirirsin (Cikis).'
    ],
    'universe-2': [
      'Akinti Filosu: ok tuslariyla yonlen, F ile firlat.',
      'Engellerden kacarak akintida ilerlemeyi surdur.',
      'Yeniden Baslat ile tazele, Dashboard\'a Don ile cik.'
    ],
    theoracle: [
      'The Oracle: aklindaki soruyu netlestir, sonra Karistir.',
      'Kehaneti Ac dedikten sonra Evet/Hayir ile yorumla.',
      'Net bir soru, net bir kehanet getirir.'
    ],
    barista: [
      'Cyber Barista: Yeni Siparis Olustur, sonra tarifi izle.',
      'Malzemeleri dogru sirayla ekleyerek siparisi tamamla.',
      'Hizli ve dogru servis daha yuksek puan kazandirir.'
    ],
    bartender: [
      'Bartender: tarifteki olculeri dikkatle takip et.',
      'Yanlis karisimda Yeniden Baslat ile tazeleyebilirsin.',
      'Dogru kokteyl, mutlu musteri demek.'
    ],
    paradox_terminal: [
      'Paradoks Terminal: metni oku, secenege dokunarak ilerle.',
      'Her paradoks bir mantik tuzagi; acele etme, dusun.',
      'Sonraki Paradox ile yeni bir bulmacaya gec.'
    ],
    'neon-river': [
      'Neon River: yon tuslariyla akintida yolunu bul.',
      'Engellere carpmadan olabildigince ilerlemeye calis.'
    ],
    dashboard: [
      'Dashboard: oyun gecmisin ve dart istatistiklerin burada.',
      'Giris yaparsan kisisel skorlarin ve oturumlarin gorunur.'
    ],
    _default: [
      'Selam! Ben Convivium yardimcisiyim.',
      'Bana tiklayarak siradaki ipucunu gorebilirsin.',
      'Ana sayfada terminale "help" yazmayi unutma.'
    ]
  };

  const ALIASES = { barista_v2: 'barista' };

  const pageId = () => {
    let p = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    p = p.replace(/\.html?$/, '');
    return p || 'index';
  };
  const tipsForPage = () => {
    const id = ALIASES[pageId()] || pageId();
    return TIPS[id] || TIPS._default;
  };

  // --- Varlik enjeksiyonu ---
  const ensureLink = (href) => {
    if (document.querySelector(`link[data-bugy-helper][href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.bugyHelper = '';
    document.head.appendChild(link);
  };

  const ensureV4 = () => new Promise((resolve) => {
    if (window.BugyV4) { resolve(window.BugyV4); return; }
    let script = document.querySelector('script[data-bugy-helper-v4]');
    if (!script) {
      script = document.createElement('script');
      script.src = V4_JS;
      script.defer = true;
      script.dataset.autostart = 'off';
      script.dataset.bugyHelperV4 = '';
      document.body.appendChild(script);
    }
    // BugyV4 DOMContentLoaded sonrasi boot olur; kisa araliklarla bekle.
    let tries = 0;
    const poll = window.setInterval(() => {
      tries += 1;
      if (window.BugyV4) { window.clearInterval(poll); resolve(window.BugyV4); }
      else if (tries > 40) { window.clearInterval(poll); resolve(null); }
    }, 100);
  });

  // --- Durum ---
  let open = false;
  let selfActivated = false;

  const launch = async () => {
    const v4 = await ensureV4();
    if (!v4) return;
    selfActivated = !(v4.getState && v4.getState().active);
    v4.loadTips(tipsForPage());
    if (selfActivated && v4.activate) v4.activate();
    v4.summon();
    open = true;
    setLauncher(true);
  };

  const dismiss = () => {
    const v4 = window.BugyV4;
    if (v4) {
      v4.clearTips && v4.clearTips();
      if (selfActivated) v4.deactivate && v4.deactivate();
      else v4.setRandom && v4.setRandom(true); // pet olarak kaldiysa canliligini geri ver
    }
    open = false;
    setLauncher(false);
  };

  // --- Yuzen dugme ---
  let launcher;
  let hint;

  const setLauncher = (isOpen) => {
    if (!launcher) return;
    launcher.classList.toggle('is-open', isOpen);
    launcher.setAttribute('aria-expanded', String(isOpen));
    launcher.setAttribute('aria-label', isOpen ? 'Yardimciyi kapat' : 'Yardimciyi cagir');
    launcher.querySelector('.bugy-launcher-glyph').textContent = isOpen ? '✕' : '?';
  };

  const buildLauncher = () => {
    launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'bugy-launcher';
    launcher.setAttribute('aria-label', 'Yardimciyi cagir');
    launcher.setAttribute('aria-expanded', 'false');
    const glyph = document.createElement('span');
    glyph.className = 'bugy-launcher-glyph';
    glyph.textContent = '?';
    glyph.setAttribute('aria-hidden', 'true');
    launcher.appendChild(glyph);
    launcher.addEventListener('click', () => {
      if (hint) { hint.remove(); hint = null; }
      if (open) dismiss(); else launch();
    });
    document.body.appendChild(launcher);

    // Ilk girişte kisa bir ipucu balonu.
    hint = document.createElement('div');
    hint.className = 'bugy-launcher-hint';
    hint.textContent = '> yardim protokolu: tikla';
    document.body.appendChild(hint);
    window.setTimeout(() => hint && hint.classList.add('is-on'), 1200);
    window.setTimeout(() => { if (hint) { hint.classList.remove('is-on'); window.setTimeout(() => hint && hint.remove(), 400); hint = null; } }, 8000);
  };

  const init = () => {
    ensureLink(V4_CSS);
    ensureLink(HELPER_CSS);
    buildLauncher();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
