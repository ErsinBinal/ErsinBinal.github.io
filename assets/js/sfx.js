/**
 * ConviviumSFX — site-wide retro sound engine.
 * Saf Web Audio API, sıfır harici dosya.
 * Sayfada data-sfx-toggle butonu yoksa sağ alta küçük bir toggle enjekte eder.
 */
(function () {
  'use strict';

  const PREF_KEY = 'convivium.audio.enabled';

  let _ctx = null;
  let _enabled = false;
  try { _enabled = localStorage.getItem(PREF_KEY) === 'true'; } catch {}

  // ── AudioContext ──────────────────────────────────────────────────────────

  const getCtx = async () => {
    if (!_enabled) return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!_ctx) { try { _ctx = new AC(); } catch { return null; } }
    if (_ctx.state === 'suspended') { try { await _ctx.resume(); } catch {} }
    return _ctx.state === 'running' ? _ctx : null;
  };

  // ── Yardımcı: tek oscillatör tonu ────────────────────────────────────────

  const tone = async (freq, dur, type, vol, offset) => {
    const c = await getCtx(); if (!c) return;
    try {
      const osc = c.createOscillator(), g = c.createGain();
      const t = c.currentTime + (offset || 0);
      osc.type = type || 'square'; osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.min(0.12, vol || 0.04), t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(c.destination);
      osc.start(t); osc.stop(t + dur + 0.03);
    } catch {}
  };

  // ── Yardımcı: filtrelenmiş gürültü patlaması ──────────────────────────────

  const noise = async (f0, f1, dur, vol, offset, ftype) => {
    const c = await getCtx(); if (!c) return;
    try {
      const n   = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, n, c.sampleRate);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n * 0.55);
      const src = c.createBufferSource();
      const flt = c.createBiquadFilter(), g = c.createGain();
      const t   = c.currentTime + (offset || 0);
      src.buffer = buf; flt.type = ftype || 'lowpass';
      flt.frequency.setValueAtTime(f0, t);
      flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(Math.min(0.12, vol || 0.04), t + Math.min(0.08, dur / 4));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(flt).connect(g).connect(c.destination);
      src.start(t); src.stop(t + dur + 0.04);
    } catch {}
  };

  // ── İsimlendirilmiş sesler ────────────────────────────────────────────────

  const sfx = {

    /**
     * click — iki oscillatör hafif kaymış (detuned), dolgun kısa tık
     */
    click: async () => {
      const c = await getCtx(); if (!c) return;
      try {
        const t = c.currentTime;
        [400, 404].forEach((f, i) => {
          const osc = c.createOscillator(), g = c.createGain();
          osc.type = 'square'; osc.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.030 - i * 0.004, t + 0.008);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.052);
          osc.connect(g).connect(c.destination);
          osc.start(t); osc.stop(t + 0.07);
        });
      } catch {}
    },

    /**
     * nav — bandpass whoosh + iniş tonu
     * Sayfa geçişi, link tıklaması
     */
    nav: async () => {
      const c = await getCtx(); if (!c) return;
      try {
        const t = c.currentTime;
        // Whoosh
        const n = Math.max(1, Math.floor(c.sampleRate * 0.18));
        const buf = c.createBuffer(1, n, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
        const src = c.createBufferSource();
        const flt = c.createBiquadFilter(), gw = c.createGain();
        src.buffer = buf; flt.type = 'bandpass'; flt.Q.value = 1.2;
        flt.frequency.setValueAtTime(2200, t);
        flt.frequency.exponentialRampToValueAtTime(340, t + 0.16);
        gw.gain.setValueAtTime(0.0001, t);
        gw.gain.linearRampToValueAtTime(0.050, t + 0.018);
        gw.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        src.connect(flt).connect(gw).connect(c.destination);
        src.start(t); src.stop(t + 0.2);
        // İniş tonu
        const osc = c.createOscillator(), gl = c.createGain();
        osc.type = 'triangle'; osc.frequency.value = 460;
        gl.gain.setValueAtTime(0.0001, t + 0.11);
        gl.gain.exponentialRampToValueAtTime(0.034, t + 0.124);
        gl.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
        osc.connect(gl).connect(c.destination);
        osc.start(t + 0.11); osc.stop(t + 0.27);
      } catch {}
    },

    /**
     * toggle — noise klik + yükselen/alçalan ton
     * Açma → sert klik + yüksek; kapama → yumuşak klik + alçak
     */
    toggle: async (on) => {
      const c = await getCtx(); if (!c) return;
      try {
        const t = c.currentTime;
        // Noise klik
        const n = Math.max(1, Math.floor(c.sampleRate * 0.022));
        const buf = c.createBuffer(1, n, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1);
        const src = c.createBufferSource();
        const flt = c.createBiquadFilter(), gn = c.createGain();
        src.buffer = buf; flt.type = on ? 'highpass' : 'lowpass';
        flt.frequency.value = on ? 1400 : 700;
        gn.gain.setValueAtTime(0.0001, t);
        gn.gain.linearRampToValueAtTime(0.048, t + 0.003);
        gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);
        src.connect(flt).connect(gn).connect(c.destination);
        src.start(t); src.stop(t + 0.03);
        // Ton
        const osc = c.createOscillator(), gt = c.createGain();
        osc.type = 'square'; osc.frequency.value = on ? 620 : 210;
        gt.gain.setValueAtTime(0.0001, t + 0.006);
        gt.gain.exponentialRampToValueAtTime(0.036, t + 0.018);
        gt.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        osc.connect(gt).connect(c.destination);
        osc.start(t + 0.006); osc.stop(t + 0.1);
      } catch {}
    },

    /**
     * select — sine ping + harmonik kuyruk
     * Kart seçimi, liste seçimi
     */
    select: async () => {
      const c = await getCtx(); if (!c) return;
      try {
        const t = c.currentTime;
        // Ana ping
        const osc = c.createOscillator(), g = c.createGain();
        osc.type = 'sine'; osc.frequency.value = 660;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.040, t + 0.007);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);
        osc.connect(g).connect(c.destination);
        osc.start(t); osc.stop(t + 0.23);
        // İkinci harmonik (daha kısa)
        const osc2 = c.createOscillator(), g2 = c.createGain();
        osc2.type = 'sine'; osc2.frequency.value = 990;
        g2.gain.setValueAtTime(0.0001, t);
        g2.gain.exponentialRampToValueAtTime(0.016, t + 0.007);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        osc2.connect(g2).connect(c.destination);
        osc2.start(t); osc2.stop(t + 0.15);
      } catch {}
    },

    /**
     * confirm — yükselen 4 notalu arpej (do-mi-sol-do)
     * İşlem onayı, unlock, başarı
     */
    confirm: async () => {
      const c = await getCtx(); if (!c) return;
      try {
        const t = c.currentTime;
        [330, 415, 495, 660].forEach((f, i) => {
          const osc = c.createOscillator(), g = c.createGain();
          const ts = t + i * 0.068;
          osc.type = 'triangle'; osc.frequency.value = f;
          g.gain.setValueAtTime(0.0001, ts);
          g.gain.exponentialRampToValueAtTime(0.036 - i * 0.003, ts + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, ts + 0.13);
          osc.connect(g).connect(c.destination);
          osc.start(ts); osc.stop(ts + 0.16);
        });
      } catch {}
    },

    /**
     * error — inen arpej + glitch noise burst
     * Hata, red, erişim engeli
     */
    error: async () => {
      const c = await getCtx(); if (!c) return;
      try {
        const t = c.currentTime;
        // İnen arpej
        [440, 330, 220].forEach((f, i) => {
          const osc = c.createOscillator(), g = c.createGain();
          const ts = t + i * 0.075;
          osc.type = 'sawtooth'; osc.frequency.value = f;
          g.gain.setValueAtTime(0.0001, ts);
          g.gain.exponentialRampToValueAtTime(0.032, ts + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, ts + 0.1);
          osc.connect(g).connect(c.destination);
          osc.start(ts); osc.stop(ts + 0.13);
        });
        // Glitch burst
        const n = Math.max(1, Math.floor(c.sampleRate * 0.042));
        const buf = c.createBuffer(1, n, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (i % 4 === 0 ? 1 : 0.25);
        const src = c.createBufferSource();
        const flt = c.createBiquadFilter(), gb = c.createGain();
        src.buffer = buf; flt.type = 'bandpass'; flt.frequency.value = 900; flt.Q.value = 0.9;
        gb.gain.setValueAtTime(0.0001, t);
        gb.gain.linearRampToValueAtTime(0.055, t + 0.005);
        gb.gain.exponentialRampToValueAtTime(0.0001, t + 0.042);
        src.connect(flt).connect(gb).connect(c.destination);
        src.start(t); src.stop(t + 0.05);
      } catch {}
    },

    /**
     * reveal — yükselen frekans sweep
     * Oracle satırı açılması, kart reveal
     */
    reveal: async () => {
      const c = await getCtx(); if (!c) return;
      try {
        const t = c.currentTime;
        const osc = c.createOscillator(), g = c.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(160, t);
        osc.frequency.exponentialRampToValueAtTime(540, t + 0.09);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.026, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        osc.connect(g).connect(c.destination);
        osc.start(t); osc.stop(t + 0.11);
      } catch {}
    },

    /**
     * glitch — piksel kırık, bozulma efekti
     */
    glitch: async () => {
      const c = await getCtx(); if (!c) return;
      try {
        const t = c.currentTime;
        const n = Math.max(1, Math.floor(c.sampleRate * 0.06));
        const buf = c.createBuffer(1, n, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (i % 6 === 0 ? 1 : 0.18);
        const src = c.createBufferSource();
        const flt = c.createBiquadFilter(), g = c.createGain();
        src.buffer = buf; flt.type = 'bandpass'; flt.frequency.value = 1100; flt.Q.value = 0.7;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.050, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        src.connect(flt).connect(g).connect(c.destination);
        src.start(t); src.stop(t + 0.07);
      } catch {}
    },

    /**
     * transmit — hızlı sinyal dizisi (morse-like)
     * Veri gönderme, bağlantı kurma
     */
    transmit: async () => {
      const c = await getCtx(); if (!c) return;
      try {
        const t = c.currentTime;
        // kısa-kısa-kısa uzun pattern
        [0, 0.06, 0.12, 0.22].forEach((offset, i) => {
          const osc = c.createOscillator(), g = c.createGain();
          const dur = i === 3 ? 0.10 : 0.038;
          const ts  = t + offset;
          osc.type = 'square'; osc.frequency.value = 880;
          g.gain.setValueAtTime(0.0001, ts);
          g.gain.exponentialRampToValueAtTime(0.026, ts + 0.006);
          g.gain.exponentialRampToValueAtTime(0.0001, ts + dur);
          osc.connect(g).connect(c.destination);
          osc.start(ts); osc.stop(ts + dur + 0.02);
        });
      } catch {}
    },

    /**
     * boot — tam sistem açılış sekansı
     * Güç açılışı, sistem başlatma
     */
    boot: async () => {
      const c = await getCtx(); if (!c) return;
      try {
        const t = c.currentTime;
        // Power hum: düşükten yükseğe noise
        noise(180, 2800, 1.55, 0.046);
        // Yükselen arpej — 7 nota
        [110, 165, 220, 330, 440, 550, 660].forEach((f, i) => {
          tone(f, 0.14, i < 4 ? 'square' : 'triangle', 0.030 + i * 0.003, 0.1 + i * 0.11);
        });
        // Final chord
        [440, 550, 660].forEach(f => tone(f, 0.44, 'triangle', 0.020, 0.92));
      } catch {}
    },

    /**
     * shutdown — sistem kapanış sekansı
     */
    shutdown: async () => {
      const c = await getCtx(); if (!c) return;
      try {
        // İnen arpej
        [660, 550, 440, 330, 220, 110].forEach((f, i) => {
          tone(f, 0.18, i < 3 ? 'triangle' : 'square', 0.028, i * 0.1);
        });
        // Kapanış noise: yüksekten alçağa
        noise(1800, 60, 1.15, 0.038);
      } catch {}
    },

    /**
     * restart — çift bip + sweep
     */
    restart: async () => {
      const c = await getCtx(); if (!c) return;
      try {
        [0, 0.12, 0.24].forEach((offset, i) => {
          tone([520, 520, 740][i], 0.09, 'square', 0.028, offset);
        });
        // Yükselen sweep
        const osc = c.createOscillator(), g = c.createGain();
        const ts = (await getCtx())?.currentTime + 0.40;
        if (!ts) return;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, ts);
        osc.frequency.exponentialRampToValueAtTime(680, ts + 0.22);
        g.gain.setValueAtTime(0.0001, ts);
        g.gain.exponentialRampToValueAtTime(0.032, ts + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ts + 0.22);
        osc.connect(g).connect(c.destination);
        osc.start(ts); osc.stop(ts + 0.26);
      } catch {}
    },

    /** pulse — home-protocol.js geriye dönük uyumluluk */
    pulse: (freq, dur) => tone(freq || 220, dur || 0.045, 'sine', 0.038),

  };

  // ── Durum yönetimi ────────────────────────────────────────────────────────

  Object.defineProperty(sfx, 'enabled', { get: () => _enabled, enumerable: true });

  const syncToggles = () => {
    document.querySelectorAll('[data-sfx-toggle]').forEach(el => {
      el.textContent = _enabled ? 'audio on' : 'audio off';
      el.setAttribute('aria-pressed', String(_enabled));
    });
  };

  sfx.setEnabled = (val, withSound) => {
    _enabled = Boolean(val);
    try { localStorage.setItem(PREF_KEY, String(_enabled)); } catch {}
    syncToggles();
    if (withSound) sfx.toggle(_enabled);
  };

  // ── Toggle buton enjeksiyonu ──────────────────────────────────────────────

  const injectToggle = () => {
    if (document.querySelector('[data-sfx-toggle]')) { syncToggles(); return; }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.sfxToggle = '';
    btn.setAttribute('aria-pressed', String(_enabled));
    btn.textContent = _enabled ? 'audio on' : 'audio off';
    btn.style.cssText = [
      'position:fixed', 'bottom:12px', 'right:12px', 'z-index:9999',
      'padding:4px 10px', 'font-size:10px', 'font-family:monospace',
      'background:rgba(0,0,0,0.72)', 'color:rgba(108,255,155,0.85)',
      'border:1px solid rgba(108,255,155,0.35)', 'border-radius:4px',
      'cursor:pointer', 'letter-spacing:0.06em', 'opacity:0.72',
    ].join(';');
    btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
    btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.72'; });
    btn.addEventListener('click', () => sfx.setEnabled(!_enabled, true));
    document.body.appendChild(btn);
  };

  // ── Auto-click delegation ─────────────────────────────────────────────────

  document.addEventListener('click', (e) => {
    if (!_enabled) return;
    const el = e.target.closest(
      'button:not([data-sfx-skip]), [role="button"]:not([data-sfx-skip]), a[href]:not([data-sfx-skip])'
    );
    if (!el) return;
    if (el.dataset.sfxToggle !== undefined) return;
    if (el.closest('#command-shell, .system-hud, .journey-gate')) return;
    const t = el.dataset.sfx;
    if (t === 'nav'      || el.tagName === 'A') return void sfx.nav();
    if (t === 'confirm')                        return void sfx.confirm();
    if (t === 'select')                         return void sfx.select();
    if (t === 'error')                          return void sfx.error();
    if (t === 'reveal')                         return void sfx.reveal();
    if (t === 'glitch')                         return void sfx.glitch();
    if (t === 'transmit')                       return void sfx.transmit();
    sfx.click();
  });

  // ── Ambient ───────────────────────────────────────────────────────────────

  let _amb = null;
  sfx.ambient = {
    get active() { return Boolean(_amb); },
    async start() {
      const c = await getCtx(); if (!c || _amb) return;
      try {
        const sr = c.sampleRate;
        const buf = c.createBuffer(1, sr * 3, sr);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.14;
        const src = c.createBufferSource();
        const flt = c.createBiquadFilter(), g = c.createGain();
        src.buffer = buf; src.loop = true;
        flt.type = 'lowpass'; flt.frequency.value = 240;
        g.gain.value = 0.008;
        src.connect(flt).connect(g).connect(c.destination);
        src.start();
        _amb = { src, g };
      } catch {}
    },
    stop() {
      if (!_amb) return;
      try { _amb.src.stop(); } catch {}
      _amb = null;
    },
  };

  // ── Init ──────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectToggle);
  } else {
    injectToggle();
  }

  window.ConviviumSFX = sfx;
})();
