/**
 * ConviviumAudio - small retro audio engine for site UI, apps and games.
 * Web Audio only: no external sound files, limited channels, procedural presets.
 */
(function () {
  'use strict';

  const PREF_KEY = 'convivium.audio.enabled';
  const BUS_VOLUME_KEY = 'convivium.audio.busVolumes';
  const DEFAULT_BUS_VOLUMES = {
    master: 0.86,
    ui: 0.76,
    game: 0.82,
    ambient: 0.45,
    music: 0.50
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const nowMs = () => (window.performance?.now ? window.performance.now() : Date.now());

  let ctx = null;
  let enabled = false;
  let initialized = false;
  let activeUntil = [];
  let channelBudget = 8;
  let ambientNode = null;
  let musicState = null;
  let busVolumes = { ...DEFAULT_BUS_VOLUMES };

  try { enabled = localStorage.getItem(PREF_KEY) === 'true'; } catch {}
  try {
    const stored = JSON.parse(localStorage.getItem(BUS_VOLUME_KEY) || '{}');
    if (stored && typeof stored === 'object') busVolumes = { ...busVolumes, ...stored };
  } catch {}

  const graph = {
    master: null,
    buses: {}
  };

  const safeAudioParam = (param, method, value, time) => {
    try {
      if (param && typeof param[method] === 'function') param[method](value, time);
      else if (param) param.value = value;
    } catch {}
  };

  const persistBusVolumes = () => {
    try { localStorage.setItem(BUS_VOLUME_KEY, JSON.stringify(busVolumes)); } catch {}
  };

  const connect = (source, target) => {
    try {
      source.connect(target);
      return true;
    } catch {
      return false;
    }
  };

  const setupGraph = () => {
    if (!ctx || initialized) return;
    try {
      graph.master = ctx.createGain();
      graph.master.gain.value = busVolumes.master;
      connect(graph.master, ctx.destination);
      ['ui', 'game', 'ambient', 'music'].forEach((name) => {
        const gain = ctx.createGain();
        gain.gain.value = busVolumes[name];
        connect(gain, graph.master);
        graph.buses[name] = gain;
      });
      initialized = true;
    } catch {
      initialized = false;
    }
  };

  const getCtx = async () => {
    if (!enabled) return null;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    if (!ctx) {
      try { ctx = new AudioContext(); } catch { return null; }
    }
    setupGraph();
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch {}
    }
    return ctx.state === 'running' ? ctx : null;
  };

  const getBus = (bus = 'ui') => {
    if (!initialized) setupGraph();
    return graph.buses[bus] || graph.buses.ui || graph.master || ctx?.destination;
  };

  const borrowChannel = (duration, offset = 0) => {
    const t = nowMs();
    const start = t + Math.max(0, offset) * 1000;
    const end = start + Math.max(40, Math.ceil((duration || 0.05) * 1000 + 80));
    activeUntil = activeUntil.filter((item) => item > t);
    const overlapping = activeUntil.filter((item) => item > start).length;
    if (overlapping >= channelBudget) return false;
    activeUntil.push(end);
    return true;
  };

  const tone = async (freq, duration = 0.06, opts = {}) => {
    const c = await getCtx();
    if (!c || !borrowChannel(duration, opts.offset || 0)) return;
    try {
      const start = c.currentTime + (opts.offset || 0);
      const end = start + Math.max(0.015, duration);
      const attack = clamp(opts.attack ?? 0.006, 0.001, duration * 0.45);
      const volume = clamp(opts.volume ?? 0.04, 0.001, 0.18);
      const quantized = opts.raw ? freq : Math.max(12, Math.round(freq / 4) * 4);
      const osc = c.createOscillator();
      const gain = c.createGain();
      let input = osc;

      osc.type = opts.type || 'square';
      osc.frequency.setValueAtTime(quantized, start);
      if (opts.slide) {
        const target = Math.max(12, quantized + opts.slide);
        safeAudioParam(osc.frequency, 'exponentialRampToValueAtTime', target, end);
      }
      if (typeof opts.detune === 'number' && osc.detune) osc.detune.value = opts.detune;

      if (opts.filter) {
        const filter = c.createBiquadFilter();
        filter.type = opts.filter.type || 'lowpass';
        filter.frequency.setValueAtTime(opts.filter.freq || 1200, start);
        if (opts.filter.to) safeAudioParam(filter.frequency, 'exponentialRampToValueAtTime', Math.max(20, opts.filter.to), end);
        connect(osc, filter);
        input = filter;
      }

      safeAudioParam(gain.gain, 'setValueAtTime', 0.0001, start);
      safeAudioParam(gain.gain, 'linearRampToValueAtTime', volume, start + attack);
      safeAudioParam(gain.gain, 'exponentialRampToValueAtTime', 0.0001, end);
      connect(input, gain);
      connect(gain, getBus(opts.bus));
      osc.start(start);
      osc.stop(end + 0.03);
    } catch {}
  };

  const noise = async (opts = {}) => {
    const duration = Math.max(0.012, opts.duration || 0.08);
    const c = await getCtx();
    if (!c || !borrowChannel(duration, opts.offset || 0)) return;
    try {
      const start = c.currentTime + (opts.offset || 0);
      const sampleRate = opts.rate || Math.min(c.sampleRate, 22050);
      const length = Math.max(1, Math.floor(sampleRate * duration));
      const buffer = c.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      const decay = opts.decay ?? 0.68;
      for (let i = 0; i < length; i += 1) {
        const fade = 1 - (i / length) * decay;
        const bitcrush = opts.bitcrush ? (i % opts.bitcrush === 0 ? 1 : 0.42) : 1;
        data[i] = (Math.random() * 2 - 1) * fade * bitcrush;
      }

      const source = c.createBufferSource();
      const filter = c.createBiquadFilter();
      const gain = c.createGain();
      source.buffer = buffer;
      filter.type = opts.filter || 'lowpass';
      filter.frequency.setValueAtTime(opts.freq || 1100, start);
      if (opts.to) safeAudioParam(filter.frequency, 'exponentialRampToValueAtTime', Math.max(20, opts.to), start + duration);
      safeAudioParam(gain.gain, 'setValueAtTime', 0.0001, start);
      safeAudioParam(gain.gain, 'linearRampToValueAtTime', clamp(opts.volume || 0.04, 0.001, 0.18), start + Math.min(0.018, duration / 3));
      safeAudioParam(gain.gain, 'exponentialRampToValueAtTime', 0.0001, start + duration);
      connect(source, filter);
      connect(filter, gain);
      connect(gain, getBus(opts.bus));
      source.start(start);
      source.stop(start + duration + 0.02);
    } catch {}
  };

  const sequence = (steps = [], opts = {}) => {
    const stepMs = opts.stepMs || 70;
    const bus = opts.bus || 'ui';
    steps.forEach((step, index) => {
      if (!step) return;
      const at = (opts.offset || 0) + (step.at ?? index * stepMs / 1000);
      if (step.noise) {
        noise({ ...step.noise, bus, offset: at });
        return;
      }
      tone(step.freq || step[0] || 220, step.duration || step[1] || 0.06, {
        type: step.type || step[2] || opts.type || 'square',
        volume: step.volume || step[3] || opts.volume || 0.035,
        slide: step.slide,
        filter: step.filter,
        bus,
        offset: at
      });
    });
  };

  const sounds = {
    'ui.click': () => sequence([
      { freq: 404, duration: 0.038, volume: 0.026 },
      { freq: 512, duration: 0.028, volume: 0.014, at: 0.024 }
    ]),
    'ui.nav': () => {
      noise({ freq: 2200, to: 320, duration: 0.18, volume: 0.045, bus: 'ui' });
      sequence([
        { freq: 460, duration: 0.08, type: 'triangle', volume: 0.030, at: 0.12 },
        { freq: 380, duration: 0.06, type: 'triangle', volume: 0.022, at: 0.20 }
      ]);
    },
    'ui.toggleOn': () => {
      noise({ filter: 'highpass', freq: 1400, duration: 0.022, volume: 0.040, bus: 'ui' });
      tone(620, 0.07, { type: 'square', volume: 0.034, offset: 0.008 });
    },
    'ui.toggleOff': () => {
      noise({ filter: 'highpass', freq: 200, duration: 0.022, volume: 0.040, bus: 'ui' });
      tone(210, 0.07, { type: 'square', volume: 0.032, offset: 0.008 });
    },
    'ui.select': () => sequence([
      { freq: 660, duration: 0.15, type: 'sine', volume: 0.038 },
      { freq: 990, duration: 0.09, type: 'sine', volume: 0.016, at: 0.045 }
    ]),
    'ui.confirm': () => sequence([
      { freq: 330, duration: 0.13, type: 'triangle', volume: 0.033 },
      { freq: 415, duration: 0.13, type: 'triangle', volume: 0.031 },
      { freq: 495, duration: 0.13, type: 'triangle', volume: 0.029 },
      { freq: 660, duration: 0.15, type: 'triangle', volume: 0.034 }
    ], { stepMs: 68 }),
    'ui.error': () => {
      sequence([
        { freq: 440, duration: 0.10, type: 'sawtooth', volume: 0.030 },
        { freq: 330, duration: 0.10, type: 'sawtooth', volume: 0.028 },
        { freq: 220, duration: 0.12, type: 'sawtooth', volume: 0.026 }
      ], { stepMs: 75 });
      noise({ filter: 'highpass', freq: 900, duration: 0.04, volume: 0.050, bus: 'ui' });
    },
    'ui.reveal': () => sequence([
      { freq: 160, duration: 0.09, volume: 0.020 },
      { freq: 260, duration: 0.08, volume: 0.022 },
      { freq: 380, duration: 0.07, volume: 0.024 },
      { freq: 540, duration: 0.07, volume: 0.026 }
    ], { stepMs: 30 }),
    'ui.glitch': () => {
      noise({ filter: 'highpass', freq: 1100, duration: 0.018, volume: 0.048, bus: 'ui', bitcrush: 2 });
      noise({ filter: 'highpass', freq: 1400, duration: 0.012, volume: 0.036, bus: 'ui', offset: 0.030, bitcrush: 3 });
      noise({ filter: 'highpass', freq: 900, duration: 0.020, volume: 0.040, bus: 'ui', offset: 0.055, bitcrush: 2 });
    },
    'ui.transmit': () => sequence([
      { freq: 880, duration: 0.035, volume: 0.024 },
      { freq: 880, duration: 0.035, volume: 0.024, at: 0.060 },
      { freq: 880, duration: 0.035, volume: 0.024, at: 0.120 },
      { freq: 880, duration: 0.095, volume: 0.026, at: 0.220 }
    ]),
    'system.boot': () => {
      noise({ freq: 220, to: 2600, duration: 1.45, volume: 0.040, bus: 'ui' });
      sequence([
        [110, 0.13, 'square', 0.026],
        [165, 0.13, 'square', 0.027],
        [220, 0.13, 'square', 0.028],
        [330, 0.13, 'square', 0.029],
        [440, 0.14, 'triangle', 0.030],
        [550, 0.14, 'triangle', 0.031],
        [660, 0.14, 'triangle', 0.032],
        { freq: 440, duration: 0.40, type: 'triangle', volume: 0.018, at: 0.92 },
        { freq: 550, duration: 0.40, type: 'triangle', volume: 0.018, at: 0.92 },
        { freq: 660, duration: 0.40, type: 'triangle', volume: 0.018, at: 0.92 }
      ], { stepMs: 110 });
    },
    'system.shutdown': () => {
      sequence([
        [660, 0.16, 'triangle', 0.030],
        [550, 0.16, 'triangle', 0.028],
        [440, 0.16, 'triangle', 0.026],
        [330, 0.16, 'square', 0.024],
        [220, 0.18, 'square', 0.022],
        [110, 0.20, 'square', 0.020]
      ], { stepMs: 100 });
      noise({ freq: 1800, to: 90, duration: 1.15, volume: 0.038, bus: 'ui' });
    },
    'system.restart': () => {
      noise({ freq: 1500, to: 420, duration: 0.36, volume: 0.034, bus: 'ui' });
      sequence([
        { freq: 520, duration: 0.06, volume: 0.026, at: 0.04 },
        { freq: 520, duration: 0.06, volume: 0.026, at: 0.16 },
        { freq: 740, duration: 0.09, type: 'triangle', volume: 0.028, at: 0.34 },
        { freq: 200, duration: 0.06, type: 'triangle', volume: 0.024, at: 0.50 },
        { freq: 350, duration: 0.06, type: 'triangle', volume: 0.024, at: 0.58 },
        { freq: 680, duration: 0.09, type: 'triangle', volume: 0.026, at: 0.66 }
      ]);
    },
    'game.jump': () => {
      tone(176, 0.09, { bus: 'game', type: 'sawtooth', volume: 0.060, slide: 180 });
      noise({ bus: 'game', freq: 1300, duration: 0.045, volume: 0.026 });
    },
    'game.land': () => {
      noise({ bus: 'game', freq: 900, to: 160, duration: 0.075, volume: 0.065 });
      tone(88, 0.055, { bus: 'game', type: 'triangle', volume: 0.050, slide: -24 });
    },
    'game.hit': () => {
      noise({ bus: 'game', filter: 'bandpass', freq: 720, duration: 0.09, volume: 0.075, bitcrush: 2 });
      tone(116, 0.11, { bus: 'game', type: 'sawtooth', volume: 0.060, slide: -62 });
    },
    'game.pickup': () => sequence([
      { freq: 340, duration: 0.06, type: 'square', volume: 0.052 },
      { freq: 560, duration: 0.07, type: 'square', volume: 0.047 }
    ], { bus: 'game', stepMs: 62 }),
    'game.coin': () => sequence([
      { freq: 760, duration: 0.05, type: 'sine', volume: 0.050 },
      { freq: 1120, duration: 0.09, type: 'sine', volume: 0.048 }
    ], { bus: 'game', stepMs: 55 }),
    'game.laser': () => {
      tone(1180, 0.035, { bus: 'game', type: 'sawtooth', volume: 0.036, slide: 260 });
      tone(1540, 0.025, { bus: 'game', type: 'sine', volume: 0.020, offset: 0.018 });
    },
    'game.explosion': () => {
      noise({ bus: 'game', freq: 1700, to: 120, duration: 0.24, volume: 0.105, bitcrush: 2 });
      tone(64, 0.15, { bus: 'game', type: 'sawtooth', volume: 0.070, slide: -28 });
      tone(144, 0.09, { bus: 'game', type: 'square', volume: 0.050, slide: 80, offset: 0.055 });
    },
    'game.portal': () => {
      sequence([
        { freq: 196, duration: 0.09, type: 'sine', volume: 0.045 },
        { freq: 392, duration: 0.13, type: 'sawtooth', volume: 0.055 },
        { freq: 784, duration: 0.16, type: 'triangle', volume: 0.038 }
      ], { bus: 'game', stepMs: 54 });
      noise({ bus: 'game', filter: 'highpass', freq: 1200, duration: 0.12, volume: 0.035, bitcrush: 3 });
    },
    'app.notify': () => sequence([
      { freq: 520, duration: 0.045, type: 'triangle', volume: 0.030 },
      { freq: 780, duration: 0.070, type: 'triangle', volume: 0.026 }
    ], { stepMs: 70 }),
    'app.denied': () => sounds['ui.error']()
  };

  const aliases = {
    click: 'ui.click',
    nav: 'ui.nav',
    select: 'ui.select',
    confirm: 'ui.confirm',
    error: 'ui.error',
    reveal: 'ui.reveal',
    glitch: 'ui.glitch',
    transmit: 'ui.transmit',
    boot: 'system.boot',
    shutdown: 'system.shutdown',
    restart: 'system.restart',
    jump: 'game.jump',
    land: 'game.land',
    hit: 'game.hit',
    pickup: 'game.pickup',
    coin: 'game.coin',
    laser: 'game.laser',
    explosion: 'game.explosion',
    portal: 'game.portal',
    notify: 'app.notify',
    denied: 'app.denied'
  };

  const play = (name, opts = {}) => {
    const key = aliases[name] || name;
    const fn = sounds[key];
    if (typeof fn === 'function') {
      fn(opts);
      return true;
    }
    return false;
  };

  const patterns = {
    terminal: {
      bpm: 112,
      steps: [
        { freq: 110, duration: 0.055, type: 'square', volume: 0.012 },
        null,
        { freq: 165, duration: 0.050, type: 'square', volume: 0.010 },
        null,
        { freq: 220, duration: 0.060, type: 'triangle', volume: 0.012 },
        null,
        { freq: 165, duration: 0.050, type: 'square', volume: 0.010 },
        { noise: { filter: 'highpass', freq: 1100, duration: 0.018, volume: 0.012, bitcrush: 4 } }
      ]
    },
    runner: {
      bpm: 136,
      steps: [
        { freq: 98, duration: 0.045, type: 'square', volume: 0.018 },
        { noise: { freq: 900, duration: 0.022, volume: 0.012 } },
        { freq: 196, duration: 0.040, type: 'square', volume: 0.014 },
        null,
        { freq: 147, duration: 0.045, type: 'square', volume: 0.016 },
        { noise: { filter: 'highpass', freq: 1500, duration: 0.016, volume: 0.010 } },
        { freq: 220, duration: 0.050, type: 'triangle', volume: 0.012 },
        null
      ]
    },
    oracle: {
      bpm: 88,
      steps: [
        { freq: 130, duration: 0.18, type: 'sine', volume: 0.012 },
        null,
        { freq: 195, duration: 0.15, type: 'triangle', volume: 0.010 },
        null,
        { freq: 260, duration: 0.11, type: 'sine', volume: 0.009 },
        null,
        null,
        { noise: { filter: 'bandpass', freq: 540, duration: 0.06, volume: 0.010 } }
      ]
    }
  };

  const stopMusic = () => {
    if (!musicState) return;
    window.clearInterval(musicState.timer);
    musicState = null;
  };

  const startMusic = (name = 'terminal') => {
    stopMusic();
    const pattern = patterns[name] || patterns.terminal;
    const stepMs = 60000 / pattern.bpm / 2;
    let index = 0;
    const tick = () => {
      if (!enabled) return;
      const step = pattern.steps[index % pattern.steps.length];
      sequence([step], { bus: 'music' });
      index += 1;
    };
    tick();
    musicState = { name, timer: window.setInterval(tick, stepMs) };
  };

  const startAmbient = async () => {
    const c = await getCtx();
    if (!c || ambientNode) return;
    try {
      const sampleRate = Math.min(c.sampleRate, 22050);
      const buffer = c.createBuffer(1, sampleRate * 3, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.14;
      const source = c.createBufferSource();
      const filter = c.createBiquadFilter();
      const gain = c.createGain();
      source.buffer = buffer;
      source.loop = true;
      filter.type = 'lowpass';
      filter.frequency.value = 240;
      gain.gain.value = 0.018;
      connect(source, filter);
      connect(filter, gain);
      connect(gain, getBus('ambient'));
      source.start();
      ambientNode = { source, gain };
    } catch {}
  };

  const stopAmbient = () => {
    if (!ambientNode) return;
    try { ambientNode.source.stop(); } catch {}
    ambientNode = null;
  };

  const syncToggles = () => {
    document.querySelectorAll('[data-sfx-toggle]').forEach((el) => {
      el.textContent = enabled ? 'audio on' : 'audio off';
      el.setAttribute('aria-pressed', String(enabled));
    });
  };

  const setEnabled = (value, withSound = false) => {
    const next = Boolean(value);
    if (withSound && enabled && !next) play('ui.toggleOff');
    enabled = next;
    try { localStorage.setItem(PREF_KEY, String(enabled)); } catch {}
    syncToggles();
    if (!enabled) {
      stopMusic();
      stopAmbient();
      return;
    }
    if (withSound) play('ui.toggleOn');
  };

  const setBusVolume = (bus, value) => {
    if (!Object.prototype.hasOwnProperty.call(busVolumes, bus)) return false;
    busVolumes[bus] = clamp(Number(value) || 0, 0, 1);
    if (bus === 'master' && graph.master) graph.master.gain.value = busVolumes.master;
    if (graph.buses[bus]) graph.buses[bus].gain.value = busVolumes[bus];
    persistBusVolumes();
    return true;
  };

  const injectToggle = () => {
    if (document.querySelector('[data-sfx-toggle]')) {
      syncToggles();
      return;
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.sfxToggle = '';
    btn.setAttribute('aria-pressed', String(enabled));
    btn.textContent = enabled ? 'audio on' : 'audio off';
    btn.style.cssText = [
      'position:fixed', 'bottom:12px', 'right:12px', 'z-index:9999',
      'padding:4px 10px', 'font-size:10px', 'font-family:monospace',
      'background:rgba(0,0,0,0.72)', 'color:rgba(108,255,155,0.85)',
      'border:1px solid rgba(108,255,155,0.35)', 'border-radius:4px',
      'cursor:pointer', 'letter-spacing:0.06em', 'opacity:0.72'
    ].join(';');
    btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
    btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.72'; });
    btn.addEventListener('click', () => setEnabled(!enabled, true));
    document.body.appendChild(btn);
  };

  document.addEventListener('click', (event) => {
    if (!enabled) return;
    const el = event.target.closest(
      'button:not([data-sfx-skip]), [role="button"]:not([data-sfx-skip]), a[href]:not([data-sfx-skip])'
    );
    if (!el) return;
    if (el.dataset.sfxToggle !== undefined) return;
    if (el.closest('#command-shell, .system-hud, .journey-gate')) return;
    const type = el.dataset.sfx;
    if (type && play(type)) return;
    if (el.tagName === 'A') { play('nav'); return; }
    play('click');
  });

  const api = {
    get enabled() { return enabled; },
    get context() { return ctx; },
    get channels() {
      const t = nowMs();
      activeUntil = activeUntil.filter((item) => item > t);
      return activeUntil.length;
    },
    get maxChannels() { return channelBudget; },
    set maxChannels(value) { channelBudget = clamp(Number(value) || 8, 1, 24); },
    get busVolumes() { return { ...busVolumes }; },
    setEnabled,
    setBusVolume,
    play,
    tone: (freq, duration, opts) => tone(freq, duration, opts),
    noise,
    sequence,
    pulse: (freq = 220, duration = 0.045) => tone(freq, duration, { type: 'sine', volume: 0.036 }),
    click: () => play('click'),
    nav: () => play('nav'),
    select: () => play('select'),
    confirm: () => play('confirm'),
    error: () => play('error'),
    reveal: () => play('reveal'),
    glitch: () => play('glitch'),
    transmit: () => play('transmit'),
    boot: () => play('boot'),
    shutdown: () => play('shutdown'),
    restart: () => play('restart'),
    jump: () => play('jump'),
    land: () => play('land'),
    hit: () => play('hit'),
    pickup: () => play('pickup'),
    coin: () => play('coin'),
    laser: () => play('laser'),
    explosion: () => play('explosion'),
    portal: () => play('portal'),
    notify: () => play('notify'),
    toggle: (on) => play(on ? 'ui.toggleOn' : 'ui.toggleOff'),
    music: {
      get active() { return Boolean(musicState); },
      get current() { return musicState?.name || ''; },
      start: startMusic,
      stop: stopMusic
    },
    ambient: {
      get active() { return Boolean(ambientNode); },
      start: startAmbient,
      stop: stopAmbient
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectToggle);
  } else {
    injectToggle();
  }

  window.ConviviumAudio = api;
  window.ConviviumSFX = api;
})();
