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
    if (!_ctx) {
      try { _ctx = new AC(); } catch { return null; }
    }
    if (_ctx.state === 'suspended') {
      try { await _ctx.resume(); } catch {}
    }
    return _ctx.state === 'running' ? _ctx : null;
  };

  // ── Yardımcı: tek oscillatör tonu ────────────────────────────────────────

  const tone = async (freq, dur, type, vol, offset) => {
    const c = await getCtx(); if (!c) return;
    try {
      const osc = c.createOscillator();
      const g   = c.createGain();
      const t   = c.currentTime + (offset || 0);
      osc.type = type || 'square';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.min(0.12, Math.max(0.001, vol || 0.04)), t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(c.destination);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    } catch {}
  };

  // ── Yardımcı: filtrelenmiş gürültü ───────────────────────────────────────

  const noise = async (f0, f1, dur, vol, offset) => {
    const c = await getCtx(); if (!c) return;
    try {
      const n   = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, n, c.sampleRate);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n * 0.6);
      const src = c.createBufferSource();
      const flt = c.createBiquadFilter();
      const g   = c.createGain();
      const t   = c.currentTime + (offset || 0);
      src.buffer = buf;
      flt.type   = 'lowpass';
      flt.frequency.setValueAtTime(f0, t);
      flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(Math.min(0.12, Math.max(0.001, vol || 0.04)), t + Math.min(0.08, dur / 4));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(flt).connect(g).connect(c.destination);
      src.start(t); src.stop(t + dur + 0.04);
    } catch {}
  };

  // ── Yardımcı: bandpass noise ──────────────────────────────────────────────

  const noiseHP = async (freq, dur, vol, offset) => {
    const c = await getCtx(); if (!c) return;
    try {
      const n   = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, n, c.sampleRate);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1);
      const src = c.createBufferSource();
      const flt = c.createBiquadFilter();
      const g   = c.createGain();
      const t   = c.currentTime + (offset || 0);
      src.buffer = buf; flt.type = 'highpass'; flt.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(Math.min(0.12, Math.max(0.001, vol || 0.04)), t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(flt).connect(g).connect(c.destination);
      src.start(t); src.stop(t + dur + 0.02);
    } catch {}
  };

  // ── İsimlendirilmiş sesler ────────────────────────────────────────────────
  // v2 deseni: sync fonksiyonlar, async tone/noise/noiseHP çağırır

  const sfx = {

    // Kısa detuned çift tık
    click() {
      tone(400, 0.045, 'square', 0.028);
      tone(404, 0.040, 'square', 0.022);
    },

    // Sayfa geçişi: düşen noise whoosh + iniş pingleri
    nav() {
      noise(2200, 340, 0.18, 0.048);
      tone(460, 0.08, 'triangle', 0.030, 0.12);
      tone(380, 0.06, 'triangle', 0.022, 0.20);
    },

    // Açma: yüksek; kapama: alçak
    toggle(on) {
      noiseHP(on ? 1400 : 200, 0.022, 0.045);
      tone(on ? 620 : 210, 0.07, 'square', 0.034, 0.008);
    },

    // Seçim: iki harmonik ping
    select() {
      tone(660, 0.18, 'sine', 0.038);
      tone(990, 0.10, 'sine', 0.016);
    },

    // Onay: yükselen 4 notlu arpej
    confirm() {
      tone(330, 0.13, 'triangle', 0.033, 0.000);
      tone(415, 0.13, 'triangle', 0.031, 0.068);
      tone(495, 0.13, 'triangle', 0.029, 0.136);
      tone(660, 0.15, 'triangle', 0.034, 0.204);
    },

    // Hata: inen sawtooth arpej + gürültü
    error() {
      tone(440, 0.10, 'sawtooth', 0.030, 0.000);
      tone(330, 0.10, 'sawtooth', 0.028, 0.075);
      tone(220, 0.12, 'sawtooth', 0.026, 0.150);
      noiseHP(900, 0.04, 0.050);
    },

    // Oracle reveal: yükselen frekans sweep (tone helper ile taklit)
    reveal() {
      tone(160, 0.09, 'square', 0.020, 0.000);
      tone(260, 0.08, 'square', 0.022, 0.030);
      tone(380, 0.07, 'square', 0.024, 0.060);
      tone(540, 0.07, 'square', 0.026, 0.090);
    },

    // Piksel glitch: aralıklı highpass noise
    glitch() {
      noiseHP(1100, 0.018, 0.048, 0.000);
      noiseHP(1400, 0.012, 0.036, 0.030);
      noiseHP(900,  0.020, 0.040, 0.055);
    },

    // Morse-like sinyal dizisi
    transmit() {
      tone(880, 0.035, 'square', 0.024, 0.000);
      tone(880, 0.035, 'square', 0.024, 0.060);
      tone(880, 0.035, 'square', 0.024, 0.120);
      tone(880, 0.095, 'square', 0.026, 0.220);
    },

    // Sistem açılışı
    boot() {
      noise(220, 2600, 1.45, 0.046);
      tone(110, 0.13, 'square',   0.026, 0.10);
      tone(165, 0.13, 'square',   0.027, 0.21);
      tone(220, 0.13, 'square',   0.028, 0.32);
      tone(330, 0.13, 'square',   0.029, 0.43);
      tone(440, 0.14, 'triangle', 0.030, 0.54);
      tone(550, 0.14, 'triangle', 0.031, 0.65);
      tone(660, 0.14, 'triangle', 0.032, 0.76);
      tone(440, 0.40, 'triangle', 0.018, 0.92);
      tone(550, 0.40, 'triangle', 0.018, 0.92);
      tone(660, 0.40, 'triangle', 0.018, 0.92);
    },

    // Sistem kapanışı
    shutdown() {
      tone(660, 0.16, 'triangle', 0.030, 0.00);
      tone(550, 0.16, 'triangle', 0.028, 0.10);
      tone(440, 0.16, 'triangle', 0.026, 0.20);
      tone(330, 0.16, 'square',   0.024, 0.30);
      tone(220, 0.18, 'square',   0.022, 0.40);
      tone(110, 0.20, 'square',   0.020, 0.50);
      noise(1800, 90, 1.15, 0.040);
    },

    // Restart: üçlü bip + sweep
    restart() {
      noise(1500, 420, 0.36, 0.034);
      tone(520, 0.06, 'square',   0.026, 0.04);
      tone(520, 0.06, 'square',   0.026, 0.16);
      tone(740, 0.09, 'triangle', 0.028, 0.34);
      tone(200, 0.06, 'triangle', 0.024, 0.50);
      tone(350, 0.06, 'triangle', 0.024, 0.58);
      tone(680, 0.09, 'triangle', 0.026, 0.66);
    },

    /** home-protocol.js geriye dönük uyumluluk */
    pulse(freq, dur) { tone(freq || 220, dur || 0.045, 'sine', 0.036); },

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
    if (t === 'nav'      || el.tagName === 'A') { sfx.nav();      return; }
    if (t === 'confirm')                         { sfx.confirm();  return; }
    if (t === 'select')                          { sfx.select();   return; }
    if (t === 'error')                           { sfx.error();    return; }
    if (t === 'reveal')                          { sfx.reveal();   return; }
    if (t === 'glitch')                          { sfx.glitch();   return; }
    if (t === 'transmit')                        { sfx.transmit(); return; }
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
