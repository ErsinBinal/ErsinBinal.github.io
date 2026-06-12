/**
 * ConviviumSFX — site-wide retro sound engine.
 * Saf Web Audio API, sıfır harici dosya.
 * window.ConviviumSFX olarak yayınlanır.
 */
(function () {
  'use strict';

  const PREF_KEY = 'convivium.audio.enabled';

  let _ctx = null;
  let _enabled = false;
  try { _enabled = localStorage.getItem(PREF_KEY) === 'true'; } catch {}

  // ── Çekirdek primitifler ───────────────────────────────────────────────────

  const audioCtx = () => {
    if (!_enabled) return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    _ctx = _ctx || new AC();
    _ctx.resume?.().catch?.(() => {});
    return _ctx;
  };

  /** Oscillatör tabanlı tek nota */
  const tone = (freq, dur, type = 'square', vol = 0.04, offset = 0) => {
    const c = audioCtx(); if (!c) return;
    const osc = c.createOscillator();
    const g   = c.createGain();
    const t   = c.currentTime + offset;
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.min(0.14, vol), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  };

  /** Filtrelenmiş gürültü patlaması */
  const burst = (f0, f1, dur, vol = 0.045, offset = 0) => {
    const c = audioCtx(); if (!c) return;
    const n   = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n * 0.6);
    const src = c.createBufferSource();
    const flt = c.createBiquadFilter();
    const g   = c.createGain();
    const t   = c.currentTime + offset;
    src.buffer  = buf;
    flt.type    = 'lowpass';
    flt.frequency.setValueAtTime(f0, t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.min(0.13, vol), t + Math.min(0.1, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt).connect(g).connect(c.destination);
    src.start(t);
    src.stop(t + dur + 0.04);
  };

  // ── İsimlendirilmiş sesler ─────────────────────────────────────────────────

  const sfx = {
    /** Genel buton tıklaması */
    click:    ()    => tone(400, 0.045, 'square',   0.032),
    /** Sayfa / link geçişi */
    nav:      ()    => { tone(240, 0.055, 'square', 0.030); tone(480, 0.045, 'square', 0.026, 0.055); },
    /** Açma / kapama toggle */
    toggle:   (on)  => tone(on ? 520 : 160, 0.075, 'square', 0.038),
    /** Liste / kart seçimi */
    select:   ()    => tone(300, 0.055, 'square',   0.032),
    /** İşlem onayı */
    confirm:  ()    => { tone(440, 0.07, 'triangle', 0.038); tone(660, 0.09, 'triangle', 0.034, 0.07); },
    /** Hata / red */
    error:    ()    => { tone(155, 0.11, 'sawtooth', 0.038); tone(110, 0.09, 'sawtooth', 0.032, 0.10); },
    /** Satır / kart açılması */
    reveal:   ()    => tone(270, 0.038, 'square',   0.026),
    /** Sistem açılışı */
    boot: () => {
      burst(220, 2600, 1.45, 0.050);
      tone(330, 0.07, 'square',   0.028, 0.08);
      tone(660, 0.08, 'square',   0.032, 0.28);
      tone(880, 0.11, 'triangle', 0.030, 0.46);
    },
    /** Sistem kapanışı */
    shutdown: () => {
      burst(1900, 90, 1.25, 0.048);
      tone(420, 0.08, 'square',   0.032, 0.08);
      tone(260, 0.12, 'triangle', 0.030, 0.34);
      tone(120, 0.18, 'sine',     0.028, 0.76);
    },
    /** Yeniden başlatma */
    restart: () => {
      burst(1500, 420, 0.36, 0.038);
      tone(520, 0.06, 'square', 0.030, 0.04);
      tone(520, 0.06, 'square', 0.030, 0.16);
      tone(740, 0.08, 'triangle', 0.032, 0.34);
    },
    /** Genel pulse — home-protocol.js uyumluluğu */
    pulse: (freq = 220, dur = 0.045) => tone(freq, dur, 'sine', 0.042),
  };

  // ── Durum yönetimi ─────────────────────────────────────────────────────────

  Object.defineProperty(sfx, 'enabled', { get: () => _enabled, enumerable: true });

  sfx.setEnabled = (val, withSound = false) => {
    _enabled = Boolean(val);
    try { localStorage.setItem(PREF_KEY, String(_enabled)); } catch {}
    document.querySelectorAll('[data-sfx-toggle]').forEach(el => {
      el.textContent = _enabled ? 'audio on' : 'audio off';
      el.setAttribute('aria-pressed', String(_enabled));
    });
    if (withSound) sfx.toggle(_enabled);
  };

  // ── Otomatik click sesi — event delegation ─────────────────────────────────

  document.addEventListener('click', (e) => {
    if (!_enabled) return;
    const el = e.target.closest(
      'button:not([data-sfx-skip]), [role="button"]:not([data-sfx-skip]), a[href]:not([data-sfx-skip])'
    );
    if (!el) return;
    // home-protocol.js kendi seslerini yönetir; HUD ve komut alanları hariç
    if (el.closest('#command-shell, .hud, .journey-gate')) return;
    const t = el.dataset.sfx;
    if (t === 'nav'     || el.tagName === 'A') return sfx.nav();
    if (t === 'confirm')                       return sfx.confirm();
    if (t === 'select')                        return sfx.select();
    if (t === 'error')                         return sfx.error();
    if (t === 'reveal')                        return sfx.reveal();
    sfx.click();
  });

  // ── Ortam sesi (ambient) ───────────────────────────────────────────────────

  let _amb = null;
  sfx.ambient = {
    get active() { return Boolean(_amb); },
    start() {
      const c = audioCtx(); if (!c || _amb) return;
      const sr  = c.sampleRate;
      const buf = c.createBuffer(1, sr * 2, sr);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.16;
      const src = c.createBufferSource();
      const flt = c.createBiquadFilter();
      const g   = c.createGain();
      src.buffer    = buf;
      src.loop      = true;
      flt.type      = 'lowpass';
      flt.frequency.value = 260;
      g.gain.value  = 0.010;
      src.connect(flt).connect(g).connect(c.destination);
      src.start();
      _amb = { src, g };
    },
    stop() {
      if (!_amb) return;
      try { _amb.src.stop(); } catch {}
      _amb = null;
    },
  };

  window.ConviviumSFX = sfx;
})();
