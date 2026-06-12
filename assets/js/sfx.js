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

  // ── AudioContext — user gesture sonrası oluşturulur ───────────────────────

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

  // ── Temel primitifler ─────────────────────────────────────────────────────

  const tone = async (freq, dur, type, vol, offset) => {
    const c = await getCtx(); if (!c) return;
    try {
      const osc = c.createOscillator();
      const g   = c.createGain();
      const t   = c.currentTime + (offset || 0);
      osc.type = type || 'square';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.min(0.13, vol || 0.04), t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(c.destination);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    } catch {}
  };

  const burst = async (f0, f1, dur, vol, offset) => {
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
      g.gain.linearRampToValueAtTime(Math.min(0.12, vol || 0.04), t + Math.min(0.1, dur / 4));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(flt).connect(g).connect(c.destination);
      src.start(t); src.stop(t + dur + 0.04);
    } catch {}
  };

  // ── İsimlendirilmiş sesler ────────────────────────────────────────────────

  const sfx = {
    click:    ()   => tone(400, 0.045, 'square',   0.030),
    nav:      ()   => { tone(240, 0.05, 'square', 0.028); tone(480, 0.04, 'square', 0.024, 0.05); },
    toggle:   (on) => tone(on ? 520 : 160, 0.07, 'square', 0.036),
    select:   ()   => tone(300, 0.05,  'square',   0.030),
    confirm:  ()   => { tone(440, 0.07, 'triangle', 0.036); tone(660, 0.09, 'triangle', 0.032, 0.07); },
    error:    ()   => { tone(155, 0.11, 'sawtooth', 0.036); tone(110, 0.09, 'sawtooth', 0.030, 0.10); },
    reveal:   ()   => tone(270, 0.036, 'square',   0.024),
    boot: () => {
      burst(220, 2600, 1.45, 0.048);
      tone(330, 0.07, 'square',   0.026, 0.08);
      tone(660, 0.08, 'square',   0.030, 0.28);
      tone(880, 0.11, 'triangle', 0.028, 0.46);
    },
    shutdown: () => {
      burst(1900, 90, 1.25, 0.046);
      tone(420, 0.08, 'square',   0.030, 0.08);
      tone(260, 0.12, 'triangle', 0.028, 0.34);
      tone(120, 0.18, 'sine',     0.026, 0.76);
    },
    restart: () => {
      burst(1500, 420, 0.36, 0.036);
      tone(520, 0.06, 'square',   0.028, 0.04);
      tone(520, 0.06, 'square',   0.028, 0.16);
      tone(740, 0.08, 'triangle', 0.030, 0.34);
    },
    /** home-protocol.js uyumluluğu için — pulse(freq, dur) */
    pulse: (freq, dur) => tone(freq || 220, dur || 0.045, 'sine', 0.040),
  };

  // ── Durum yönetimi ────────────────────────────────────────────────────────

  Object.defineProperty(sfx, 'enabled', { get: () => _enabled, enumerable: true });

  const syncToggleButtons = () => {
    document.querySelectorAll('[data-sfx-toggle]').forEach(el => {
      el.textContent    = _enabled ? 'audio on' : 'audio off';
      el.setAttribute('aria-pressed', String(_enabled));
    });
  };

  sfx.setEnabled = (val, withSound) => {
    _enabled = Boolean(val);
    try { localStorage.setItem(PREF_KEY, String(_enabled)); } catch {}
    syncToggleButtons();
    if (withSound) sfx.toggle(_enabled);
  };

  // ── Toggle buton enjeksiyonu ───────────────────────────────────────────────
  // Sayfada zaten data-sfx-toggle varsa enjekte etme; yoksa küçük yüzen buton ekle

  const injectToggleIfNeeded = () => {
    if (document.querySelector('[data-sfx-toggle]')) {
      syncToggleButtons();
      return;
    }
    // Ana sayfaya zaten home-protocol.js bağlıyor; diğer sayfalar için enjekte et
    const btn = document.createElement('button');
    btn.type             = 'button';
    btn.dataset.sfxToggle = '';
    btn.setAttribute('aria-pressed', String(_enabled));
    btn.textContent      = _enabled ? 'audio on' : 'audio off';
    btn.style.cssText    = [
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
    if (el.dataset.sfxToggle !== undefined) return; // toggle kendi sesini yönetir
    if (el.closest('#command-shell, .system-hud, .journey-gate')) return;
    const t = el.dataset.sfx;
    if (t === 'nav'     || el.tagName === 'A') return void sfx.nav();
    if (t === 'confirm')                       return void sfx.confirm();
    if (t === 'select')                        return void sfx.select();
    if (t === 'error')                         return void sfx.error();
    if (t === 'reveal')                        return void sfx.reveal();
    sfx.click();
  });

  // ── Ambient ───────────────────────────────────────────────────────────────

  let _amb = null;
  sfx.ambient = {
    get active() { return Boolean(_amb); },
    async start() {
      const c = await getCtx(); if (!c || _amb) return;
      try {
        const sr  = c.sampleRate;
        const buf = c.createBuffer(1, sr * 2, sr);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.16;
        const src = c.createBufferSource();
        const flt = c.createBiquadFilter();
        const g   = c.createGain();
        src.buffer = buf; src.loop = true;
        flt.type   = 'lowpass'; flt.frequency.value = 260;
        g.gain.value = 0.009;
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
    document.addEventListener('DOMContentLoaded', injectToggleIfNeeded);
  } else {
    injectToggleIfNeeded();
  }

  window.ConviviumSFX = sfx;
})();
