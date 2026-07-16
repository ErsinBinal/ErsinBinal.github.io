/**
 * ConviviumAudio - mobile-first HTMLAudio sound engine.
 *
 * This version does not use Web Audio. Every cue is rendered to a tiny WAV data
 * URI and played through HTMLAudioElement pools. The goal is predictable mobile
 * unlock behavior over theoretical low-latency graph scheduling.
 */
(function () {
  'use strict';

  const PREF_KEY = 'convivium.audio.enabled';
  const PREF_UPDATED_KEY = 'convivium.audio.updatedAt';
  const BUS_VOLUME_KEY = 'convivium.audio.busVolumes';
  const SAMPLE_RATE = 22050;
  const POOL_SIZE = 3;
  const DOUBLE_TAP_GUARD_MS = 700;
  const DEFAULT_BUS_VOLUMES = {
    master: 0.9,
    ui: 0.8,
    game: 0.86,
    ambient: 0.45,
    music: 0.46
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const nowMs = () => (window.performance?.now ? window.performance.now() : Date.now());

  let enabled = false;
  let unlocked = false;
  let lastToggleAt = 0;
  let lastPointerSfx = null;
  let poolCursor = 0;
  let musicTimer = null;
  let ambientTimer = null;
  let busVolumes = { ...DEFAULT_BUS_VOLUMES };

  const cueCache = Object.create(null);
  const pools = Object.create(null);

  try { enabled = localStorage.getItem(PREF_KEY) === 'true'; } catch {}
  try {
    const stored = JSON.parse(localStorage.getItem(BUS_VOLUME_KEY) || '{}');
    if (stored && typeof stored === 'object') busVolumes = { ...busVolumes, ...stored };
  } catch {}

  const aliases = {
    click: 'ui.click',
    nav: 'ui.nav',
    select: 'ui.select',
    confirm: 'ui.confirm',
    error: 'ui.error',
    reveal: 'ui.reveal',
    glitch: 'ui.glitch',
    transmit: 'ui.transmit',
    open: 'terminal.open',
    close: 'terminal.close',
    run: 'terminal.run',
    complete: 'terminal.complete',
    type: 'terminal.type',
    suggest: 'terminal.suggest',
    boot: 'system.boot',
    shutdown: 'system.shutdown',
    restart: 'system.restart',
    unlock: 'system.unlock',
    start: 'game.start',
    correct: 'game.correct',
    wrong: 'game.wrong',
    timeout: 'game.timeout',
    win: 'game.win',
    fail: 'game.fail',
    bust: 'game.bust',
    power: 'game.power',
    hazard: 'game.hazard',
    jump: 'game.jump',
    step: 'game.step',
    land: 'game.land',
    hit: 'game.hit',
    pickup: 'game.pickup',
    coin: 'game.coin',
    laser: 'game.laser',
    explosion: 'game.explosion',
    portal: 'game.portal',
    score: 'app.score',
    highScore: 'app.highScore',
    undo: 'app.undo',
    reset: 'app.reset',
    save: 'app.save',
    notify: 'app.notify',
    denied: 'app.denied',
    choose: 'oracle.choose',
    draw: 'oracle.draw',
    stir: 'oracle.stir',
    accept: 'oracle.accept',
    refuse: 'oracle.refuse',
    shake: 'bar.shake',
    pour: 'bar.pour'
  };

  const note = {
    c3: 130.81, d3: 146.83, e3: 164.81, f3: 174.61, g3: 196.00, a3: 220.00, b3: 246.94,
    c4: 261.63, d4: 293.66, e4: 329.63, f4: 349.23, g4: 392.00, a4: 440.00, b4: 493.88,
    c5: 523.25, d5: 587.33, e5: 659.25, f5: 698.46, g5: 783.99, a5: 880.00, b5: 987.77
  };

  const tone = (freq, dur, opts = {}) => ({
    kind: 'tone',
    freq,
    dur,
    at: opts.at || 0,
    type: opts.type || 'square',
    volume: opts.volume ?? 0.35,
    slide: opts.slide || 0,
    attack: opts.attack ?? 0.004
  });

  const noise = (dur, opts = {}) => ({
    kind: 'noise',
    dur,
    at: opts.at || 0,
    volume: opts.volume ?? 0.22,
    seed: opts.seed || 1,
    decay: opts.decay ?? 0.72,
    band: opts.band || 1
  });

  const cue = (bus, layers) => ({ bus, layers });

  // Buz-metal carpmasi. Gercekcilik icin uc kural: (1) darbeler kusursuz bir
  // izgaraya oturmaz, hafif zamanlama sapmasi olur - tam duzenli ritim makine
  // gibi duyuluyor; (2) her carpma tek bir vurus degil, birkac buz tanesinin
  // mikro-transient kumesidir; (3) ses parlak ve cok kisadir - kalin bas vurus
  // buz degil, cekic sesidir. Salinimin her yonunde bir darbe olur (guclu/zayif).
  const iceRattle = (impacts, step, seed) => {
    const layers = [];
    let s = seed >>> 0;
    const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967295; };
    for (let i = 0; i < impacts; i += 1) {
      const strong = i % 2 === 0;
      const at = Math.max(0, (i * step) + (rand() - 0.5) * 0.018);
      const grains = 2 + Math.floor(rand() * 2);
      for (let g = 0; g < grains; g += 1) {
        layers.push(noise(0.014 + rand() * 0.010, {
          at: at + g * (0.003 + rand() * 0.005),
          volume: (strong ? 0.045 : 0.028) + rand() * 0.018,
          seed: seed + (i * 13) + g,
          band: 1 + Math.floor(rand() * 3),
          decay: 0.97
        }));
      }
      layers.push(tone(430 + rand() * 160, 0.022, { at, type: 'triangle', volume: strong ? 0.022 : 0.014 }));
    }
    return layers;
  };

  const recipes = {
    // --- Fosfor-terminal cekirdek sesler: rafine sine/triangle, hafif detune,
    //     kuru ve kisik UI, nadir olaylarda ince echo + tedirgin (minor) hata ---
    'ui.click': cue('ui', [
      tone(660, 0.018, { type: 'triangle', volume: 0.13 }),
      tone(880, 0.012, { at: 0.012, type: 'sine', volume: 0.06 })
    ]),
    'ui.nav': cue('ui', [
      tone(520, 0.022, { type: 'triangle', volume: 0.12 }),
      tone(620, 0.020, { at: 0.022, type: 'sine', volume: 0.08 })
    ]),
    'ui.toggleOn': cue('ui', [
      tone(560, 0.060, { type: 'sine', volume: 0.16, slide: 180 }),
      tone(561.5, 0.060, { type: 'triangle', volume: 0.06, slide: 180 })
    ]),
    'ui.toggleOff': cue('ui', [
      tone(560, 0.065, { type: 'sine', volume: 0.16, slide: -180 }),
      tone(558.5, 0.065, { type: 'triangle', volume: 0.06, slide: -180 })
    ]),
    'ui.select': cue('ui', [
      tone(587.33, 0.045, { type: 'sine', volume: 0.16 }),
      tone(880, 0.070, { at: 0.045, type: 'sine', volume: 0.13 }),
      tone(880, 0.080, { at: 0.160, type: 'sine', volume: 0.05 })
    ]),
    'ui.confirm': cue('ui', [
      tone(392, 0.085, { type: 'sine', volume: 0.17 }),
      tone(393.5, 0.085, { type: 'triangle', volume: 0.06 }),
      tone(587.33, 0.120, { at: 0.085, type: 'sine', volume: 0.16 }),
      tone(589, 0.120, { at: 0.085, type: 'triangle', volume: 0.05 }),
      tone(587.33, 0.110, { at: 0.220, type: 'sine', volume: 0.05 })
    ]),
    'ui.error': cue('ui', [
      tone(415.30, 0.130, { type: 'sine', volume: 0.16, slide: -20 }),
      tone(311.13, 0.180, { at: 0.100, type: 'sine', volume: 0.16, slide: -20 }),
      tone(313.0, 0.180, { at: 0.100, type: 'triangle', volume: 0.07 }),
      noise(0.100, { volume: 0.05, seed: 5, band: 3, decay: 0.85 })
    ]),
    'ui.reveal': cue('ui', [
      tone(160, 0.09, { volume: 0.16 }),
      tone(260, 0.08, { at: 0.03, volume: 0.18 }),
      tone(380, 0.07, { at: 0.06, volume: 0.19 }),
      tone(540, 0.07, { at: 0.09, volume: 0.20 })
    ]),
    'ui.glitch': cue('ui', [
      noise(0.018, { volume: 0.22, seed: 6, band: 4 }),
      noise(0.012, { at: 0.03, volume: 0.18, seed: 7, band: 3 }),
      noise(0.020, { at: 0.055, volume: 0.19, seed: 8, band: 2 })
    ]),
    'ui.transmit': cue('ui', [
      tone(880, 0.035, { volume: 0.18 }),
      tone(880, 0.035, { at: 0.06, volume: 0.18 }),
      tone(880, 0.035, { at: 0.12, volume: 0.18 }),
      tone(880, 0.095, { at: 0.22, volume: 0.20 })
    ]),
    'terminal.open': cue('ui', [
      noise(0.035, { volume: 0.16, seed: 9, band: 3 }),
      tone(196, 0.055, { volume: 0.15 }),
      tone(392, 0.060, { at: 0.042, type: 'triangle', volume: 0.19 }),
      tone(784, 0.075, { at: 0.084, type: 'sine', volume: 0.16 })
    ]),
    'terminal.close': cue('ui', [
      tone(520, 0.045, { type: 'triangle', volume: 0.17 }),
      tone(260, 0.060, { at: 0.036, volume: 0.15 }),
      noise(0.080, { at: 0.072, volume: 0.13, seed: 10, band: 1 })
    ]),
    'terminal.run': cue('ui', [
      tone(660, 0.026, { volume: 0.16 }),
      tone(660, 0.026, { at: 0.045, volume: 0.16 }),
      noise(0.014, { at: 0.090, volume: 0.16, seed: 11, band: 3 })
    ]),
    'terminal.complete': cue('ui', [
      tone(330, 0.060, { type: 'triangle', volume: 0.17 }),
      tone(495, 0.070, { at: 0.058, type: 'triangle', volume: 0.17 }),
      tone(660, 0.090, { at: 0.116, type: 'sine', volume: 0.15 })
    ]),
    'terminal.type': cue('ui', [tone(980, 0.018, { volume: 0.08 })]),
    'terminal.suggest': cue('ui', [tone(740, 0.032, { type: 'triangle', volume: 0.12 })]),
    'terminal.error': cue('ui', [
      tone(180, 0.060, { type: 'square', volume: 0.18 }),
      tone(120, 0.090, { at: 0.050, type: 'sawtooth', volume: 0.17 }),
      noise(0.070, { at: 0.040, volume: 0.16, seed: 13, band: 1 })
    ]),
    'system.unlock': cue('ui', [
      noise(0.28, { volume: 0.13, seed: 12, band: 2 }),
      tone(220, 0.075, { volume: 0.16 }),
      tone(440, 0.075, { at: 0.070, type: 'triangle', volume: 0.18 }),
      tone(880, 0.110, { at: 0.140, type: 'sine', volume: 0.16 })
    ]),
    'system.boot': cue('ui', [
      noise(0.85, { volume: 0.10, seed: 13, band: 1 }),
      tone(110, 0.12, { at: 0.10, volume: 0.15 }),
      tone(165, 0.12, { at: 0.21, volume: 0.16 }),
      tone(220, 0.12, { at: 0.32, volume: 0.17 }),
      tone(330, 0.12, { at: 0.43, volume: 0.18 }),
      tone(440, 0.20, { at: 0.54, type: 'triangle', volume: 0.16 })
    ]),
    'system.shutdown': cue('ui', [
      tone(660, 0.14, { type: 'triangle', volume: 0.18 }),
      tone(440, 0.16, { at: 0.10, type: 'triangle', volume: 0.16 }),
      tone(220, 0.18, { at: 0.24, volume: 0.14 }),
      noise(0.36, { at: 0.22, volume: 0.12, seed: 14, band: 1 })
    ]),
    'system.restart': cue('ui', [
      noise(0.28, { volume: 0.12, seed: 15, band: 2 }),
      tone(520, 0.055, { at: 0.04, volume: 0.18 }),
      tone(520, 0.055, { at: 0.16, volume: 0.18 }),
      tone(740, 0.085, { at: 0.34, type: 'triangle', volume: 0.20 })
    ]),
    'game.jump': cue('game', [tone(330, 0.090, { type: 'triangle', volume: 0.18, slide: 280 }), noise(0.03, { volume: 0.05, seed: 16, band: 4 })]),
    'game.land': cue('game', [noise(0.075, { volume: 0.28, seed: 17, band: 1 }), tone(88, 0.055, { type: 'triangle', volume: 0.22, slide: -24 })]),
    'game.hit': cue('game', [noise(0.06, { volume: 0.18, seed: 18, band: 2, decay: 0.8 }), tone(120, 0.10, { type: 'sine', volume: 0.22, slide: -30 })]),
    'game.start': cue('game', [noise(0.045, { volume: 0.18, seed: 19, band: 3 }), tone(220, 0.060, { volume: 0.25 }), tone(330, 0.060, { at: 0.058, volume: 0.25 }), tone(440, 0.080, { at: 0.116, type: 'triangle', volume: 0.24 })]),
    'game.step': cue('game', [tone(96, 0.040, { type: 'triangle', volume: 0.12, slide: -16 })]),
    'game.correct': cue('game', [tone(660, 0.052, { volume: 0.28 }), tone(990, 0.090, { at: 0.062, type: 'sine', volume: 0.24 })]),
    'game.wrong': cue('game', [tone(320, 0.080, { type: 'saw', volume: 0.24, slide: -120 }), noise(0.045, { volume: 0.20, seed: 20, band: 3 })]),
    'game.timeout': cue('game', [tone(440, 0.060, { volume: 0.22 }), tone(220, 0.080, { at: 0.074, volume: 0.20 }), tone(110, 0.110, { at: 0.148, type: 'saw', volume: 0.20 })]),
    'game.win': cue('game', [tone(392, 0.10, { type: 'sine', volume: 0.16 }), tone(587.33, 0.10, { at: 0.10, type: 'sine', volume: 0.16 }), tone(783.99, 0.18, { at: 0.20, type: 'sine', volume: 0.16 }), tone(785, 0.18, { at: 0.20, type: 'triangle', volume: 0.06 }), tone(783.99, 0.16, { at: 0.40, type: 'sine', volume: 0.05 })]),
    'game.fail': cue('game', [tone(440, 0.11, { type: 'sine', volume: 0.16, slide: -30 }), tone(330, 0.13, { at: 0.10, type: 'sine', volume: 0.15, slide: -30 }), tone(220, 0.22, { at: 0.22, type: 'sine', volume: 0.16, slide: -20 }), tone(110, 0.30, { at: 0.22, type: 'sine', volume: 0.12 }), noise(0.12, { at: 0.14, volume: 0.05, seed: 21, band: 2, decay: 0.85 })]),
    'game.bust': cue('game', [tone(180, 0.080, { type: 'saw', volume: 0.26, slide: -80 }), noise(0.080, { volume: 0.28, seed: 22, band: 2 })]),
    'game.power': cue('game', [tone(620, 0.060, { type: 'triangle', volume: 0.25 }), tone(880, 0.080, { at: 0.065, type: 'triangle', volume: 0.24 })]),
    'game.hazard': cue('game', [tone(55, 0.150, { type: 'saw', volume: 0.24, slide: -18 })]),
    'game.pickup': cue('game', [tone(340, 0.060, { volume: 0.22 }), tone(560, 0.070, { at: 0.062, volume: 0.21 })]),
    'game.coin': cue('game', [tone(784, 0.035, { type: 'sine', volume: 0.15 }), tone(1175, 0.060, { at: 0.035, type: 'sine', volume: 0.13 })]),
    'game.laser': cue('game', [tone(1180, 0.035, { type: 'saw', volume: 0.22, slide: 260 }), tone(1540, 0.025, { at: 0.018, type: 'sine', volume: 0.13 })]),
    'game.explosion': cue('game', [noise(0.24, { volume: 0.36, seed: 23, band: 1 }), tone(64, 0.15, { type: 'saw', volume: 0.26, slide: -28 }), tone(144, 0.09, { at: 0.055, volume: 0.20, slide: 80 })]),
    'game.portal': cue('game', [tone(196, 0.09, { type: 'sine', volume: 0.20 }), tone(392, 0.13, { at: 0.054, type: 'saw', volume: 0.24 }), tone(784, 0.16, { at: 0.108, type: 'triangle', volume: 0.18 }), noise(0.12, { volume: 0.12, seed: 24, band: 3 })]),
    'app.notify': cue('ui', [tone(520, 0.045, { type: 'triangle', volume: 0.19 }), tone(780, 0.070, { at: 0.070, type: 'triangle', volume: 0.17 })]),
    'app.score': cue('game', [tone(300, 0.038, { volume: 0.18 }), tone(450, 0.050, { at: 0.042, type: 'triangle', volume: 0.17 })]),
    'app.highScore': cue('game', [tone(360, 0.060, { volume: 0.22 }), tone(540, 0.060, { at: 0.058, type: 'triangle', volume: 0.22 }), tone(720, 0.110, { at: 0.116, type: 'sine', volume: 0.20 })]),
    'app.undo': cue('ui', [tone(420, 0.050, { type: 'triangle', volume: 0.17, slide: -130 }), noise(0.018, { volume: 0.10, seed: 25, band: 3 })]),
    'app.reset': cue('ui', [tone(500, 0.050, { volume: 0.17 }), tone(260, 0.070, { at: 0.054, volume: 0.16 })]),
    'app.save': cue('ui', [tone(500, 0.040, { type: 'triangle', volume: 0.16 }), tone(750, 0.060, { at: 0.056, type: 'sine', volume: 0.15 })]),
    'app.denied': cue('ui', [tone(240, 0.070, { type: 'saw', volume: 0.20, slide: -80 }), noise(0.050, { volume: 0.16, seed: 26, band: 2 })]),
    'oracle.choose': cue('ui', [tone(220, 0.050, { type: 'triangle', volume: 0.16 }), tone(330, 0.070, { at: 0.052, type: 'sine', volume: 0.14 })]),
    'oracle.draw': cue('ui', [noise(0.32, { volume: 0.13, seed: 27, band: 2 }), tone(130, 0.120, { type: 'sine', volume: 0.15 }), tone(260, 0.120, { at: 0.105, type: 'triangle', volume: 0.16 }), tone(520, 0.160, { at: 0.210, type: 'sine', volume: 0.14 })]),
    'oracle.stir': cue('ui', [noise(0.090, { volume: 0.18, seed: 28, band: 3 }), tone(180, 0.090, { type: 'triangle', volume: 0.17, slide: 110 })]),
    'oracle.accept': cue('ui', [tone(330, 0.060, { type: 'sine', volume: 0.16 }), tone(660, 0.100, { at: 0.064, type: 'sine', volume: 0.15 })]),
    'oracle.refuse': cue('ui', [tone(294, 0.060, { type: 'triangle', volume: 0.16 }), tone(196, 0.090, { at: 0.064, type: 'triangle', volume: 0.15 })]),
    // Sure, bartender'daki 1.7sn'lik calkalama animasyonunu karsilar. Altta
    // sadece cok kisik bir sivi calkantisi var; surekli gurultu yatagi ya da
    // bas ugultu eklenmemeli - ikisi de sesi "makine dairesi"ne ceviriyor.
    'bar.shake': cue('ui', [
      ...iceRattle(22, 0.075, 30),
      noise(1.65, { volume: 0.012, seed: 44, band: 9, decay: 0.1 })
    ]),
    // Bardak doldukca yukselen rezonans + araya giren "glug"lar.
    'bar.pour': cue('ui', [
      noise(0.05, { volume: 0.045, seed: 51, band: 3 }),
      noise(1.10, { volume: 0.05, seed: 50, band: 5, decay: 0.35 }),
      tone(240, 1.10, { type: 'sine', volume: 0.035, slide: 300, attack: 0.09 }),
      tone(150, 0.070, { at: 0.10, type: 'triangle', volume: 0.045, slide: 70 }),
      tone(165, 0.070, { at: 0.42, type: 'triangle', volume: 0.040, slide: 70 }),
      tone(185, 0.070, { at: 0.76, type: 'triangle', volume: 0.035, slide: 70 })
    ])
  };

  const waveValue = (type, phase) => {
    const p = phase % 1;
    if (type === 'sine') return Math.sin(p * Math.PI * 2);
    if (type === 'triangle') return 1 - 4 * Math.abs(Math.round(p - 0.25) - (p - 0.25));
    if (type === 'saw') return (p * 2) - 1;
    return p < 0.5 ? 1 : -1;
  };

  const rng = (seed) => {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return ((s / 4294967295) * 2) - 1;
    };
  };

  const envelope = (t, dur, attack) => {
    if (t < attack) return t / Math.max(0.001, attack);
    const tail = clamp((dur - t) / Math.max(0.001, dur - attack), 0, 1);
    return tail * tail;
  };

  const mixTone = (samples, layer) => {
    const start = Math.floor(layer.at * SAMPLE_RATE);
    const count = Math.max(1, Math.floor(layer.dur * SAMPLE_RATE));
    let phase = 0;
    for (let i = 0; i < count && start + i < samples.length; i += 1) {
      const t = i / SAMPLE_RATE;
      const progress = i / Math.max(1, count - 1);
      const freq = Math.max(12, layer.freq + layer.slide * progress);
      phase += freq / SAMPLE_RATE;
      samples[start + i] += waveValue(layer.type, phase) * layer.volume * envelope(t, layer.dur, layer.attack);
    }
  };

  const mixNoise = (samples, layer) => {
    const start = Math.floor(layer.at * SAMPLE_RATE);
    const count = Math.max(1, Math.floor(layer.dur * SAMPLE_RATE));
    const random = rng(layer.seed);
    let held = 0;
    for (let i = 0; i < count && start + i < samples.length; i += 1) {
      if (i % layer.band === 0) held = random();
      const fade = 1 - (i / count) * layer.decay;
      samples[start + i] += held * layer.volume * fade;
    }
  };

  const renderRecipe = (recipe) => {
    let duration = 0.06;
    recipe.layers.forEach((layer) => {
      duration = Math.max(duration, layer.at + layer.dur + 0.05);
    });
    const samples = new Float32Array(Math.ceil(duration * SAMPLE_RATE));
    recipe.layers.forEach((layer) => {
      if (layer.kind === 'tone') mixTone(samples, layer);
      else mixNoise(samples, layer);
    });
    return { bus: recipe.bus, src: wavDataUri(samples) };
  };

  const wavDataUri = (samples) => {
    const bytesPerSample = 2;
    const dataSize = samples.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const write = (offset, text) => {
      for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
    };
    write(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, SAMPLE_RATE, true);
    view.setUint32(28, SAMPLE_RATE * bytesPerSample, true);
    view.setUint16(32, bytesPerSample, true);
    view.setUint16(34, 16, true);
    write(36, 'data');
    view.setUint32(40, dataSize, true);
    let offset = 44;
    for (let i = 0; i < samples.length; i += 1) {
      const value = clamp(samples[i], -1, 1);
      view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
      offset += 2;
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return `data:audio/wav;base64,${btoa(binary)}`;
  };

  const keyFor = (name) => aliases[name] || name;

  const entryFor = (name) => {
    const key = keyFor(name);
    if (!recipes[key]) return null;
    if (!cueCache[key]) cueCache[key] = renderRecipe(recipes[key]);
    return { key, ...cueCache[key] };
  };

  const preloadCore = () => {
    ['ui.click', 'ui.toggleOn', 'ui.toggleOff'].forEach((name) => {
      try { poolFor(name); } catch {}
    });
  };

  const makeAudio = (src, bus) => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = src;
    audio.playsInline = true;
    audio.setAttribute('playsinline', '');
    audio.dataset.bus = bus;
    audio.load();
    return audio;
  };

  const poolFor = (name) => {
    const entry = entryFor(name);
    if (!entry) return null;
    if (!pools[entry.key]) {
      pools[entry.key] = Array.from({ length: POOL_SIZE }, () => makeAudio(entry.src, entry.bus));
    }
    return { entry, pool: pools[entry.key] };
  };

  const volumeFor = (bus) => clamp((busVolumes.master ?? 1) * (busVolumes[bus] ?? 1), 0, 1);

  const tryPlay = (audio, bus) => {
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      audio.volume = volumeFor(bus);
      const result = audio.play();
      if (result && typeof result.catch === 'function') result.catch(() => {});
      unlocked = true;
      return true;
    } catch {
      return false;
    }
  };

  const play = (name) => {
    if (!enabled) return false;
    const item = poolFor(name);
    if (!item) return false;
    const { entry, pool } = item;
    const ready = pool.find((audio) => audio.paused || audio.ended) || pool[poolCursor++ % pool.length];
    return tryPlay(ready, entry.bus);
  };

  const emitState = () => {
    try {
      window.dispatchEvent(new CustomEvent('convivium:audio-state', { detail: { enabled, unlocked } }));
    } catch {}
  };

  const syncToggles = () => {
    document.querySelectorAll('[data-sfx-toggle]').forEach((el) => {
      el.textContent = enabled ? 'audio on' : 'audio off';
      el.setAttribute('aria-pressed', String(enabled));
    });
  };

  const unlock = () => {
    if (!enabled) return;
    const item = poolFor('ui.click');
    if (!item) return;
    const primary = item.pool[0];
    if (unlocked) return;
    try {
      primary.muted = true;
      primary.currentTime = 0;
      const result = primary.play();
      if (result && typeof result.then === 'function') {
        result.then(() => {
          primary.pause();
          primary.currentTime = 0;
          primary.muted = false;
          unlocked = true;
          emitState();
        }).catch(() => {});
      } else {
        primary.pause();
        primary.currentTime = 0;
        primary.muted = false;
        unlocked = true;
        emitState();
      }
    } catch {}
  };

  const stopToggleEvent = (event) => {
    if (!event) return;
    if (event.cancelable) event.preventDefault();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();
  };

  const setEnabled = (value, withSound = false) => {
    const next = Boolean(value);
    if (withSound && enabled && !next) play('ui.toggleOff');
    enabled = next;
    try {
      localStorage.setItem(PREF_KEY, String(enabled));
      localStorage.setItem(PREF_UPDATED_KEY, String(Date.now()));
    } catch {}
    syncToggles();
    emitState();
    if (!enabled) {
      stopMusic();
      stopAmbient();
      return;
    }
    unlock();
    if (withSound) play('ui.toggleOn');
  };

  const toggleFromGesture = (event) => {
    stopToggleEvent(event);
    lastToggleAt = nowMs();
    setEnabled(!enabled, true);
  };

  const bindToggle = (el) => {
    if (!el || el.dataset.sfxBound === 'true') return;
    el.dataset.sfxBound = 'true';
    el.addEventListener('pointerdown', toggleFromGesture, { passive: false });
    el.addEventListener('touchend', (event) => {
      if (nowMs() - lastToggleAt < DOUBLE_TAP_GUARD_MS) {
        stopToggleEvent(event);
        return;
      }
      toggleFromGesture(event);
    }, { passive: false });
    el.addEventListener('click', (event) => {
      if (nowMs() - lastToggleAt < DOUBLE_TAP_GUARD_MS) {
        stopToggleEvent(event);
        return;
      }
      toggleFromGesture(event);
    });
  };

  const bindToggles = () => {
    document.querySelectorAll('[data-sfx-toggle]').forEach(bindToggle);
  };

  const injectToggle = () => {
    preloadCore();
    const existing = document.querySelector('[data-sfx-toggle]');
    if (existing) {
      bindToggles();
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
    document.body.appendChild(btn);
    bindToggle(btn);
    syncToggles();
  };

  const captureToggle = (event) => {
    const el = event.target?.closest?.('[data-sfx-toggle]');
    if (!el) return;
    if (event.type === 'click' && nowMs() - lastToggleAt < DOUBLE_TAP_GUARD_MS) {
      stopToggleEvent(event);
      return;
    }
    if (event.type === 'pointerdown' || event.type === 'touchend' || event.type === 'click') {
      toggleFromGesture(event);
    }
  };

  ['pointerdown', 'touchend', 'click'].forEach((type) => {
    document.addEventListener(type, captureToggle, { capture: true, passive: false });
  });

  ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'keydown', 'click'].forEach((type) => {
    document.addEventListener(type, unlock, { capture: true, passive: true });
  });

  const sfxTarget = (event, includeLinks = true) => {
    if (!enabled) return null;
    const selector = includeLinks
      ? 'button:not([data-sfx-skip]), [role="button"]:not([data-sfx-skip]), a[href]:not([data-sfx-skip])'
      : 'button:not([data-sfx-skip]), [role="button"]:not([data-sfx-skip])';
    const el = event.target.closest(selector);
    if (!el || el.dataset.sfxToggle !== undefined) return null;
    if (el.closest('#command-shell, .system-hud, .journey-gate')) return null;
    return el;
  };

  const playForElement = (el) => {
    const type = el.dataset.sfx;
    if (type && play(type)) return;
    if (el.tagName === 'A') { play('nav'); return; }
    play('click');
  };

  document.addEventListener('pointerdown', (event) => {
    const el = sfxTarget(event, true);
    if (!el) return;
    playForElement(el);
    lastPointerSfx = { el, at: nowMs() };
  }, { capture: true, passive: true });

  document.addEventListener('click', (event) => {
    const el = sfxTarget(event, true);
    if (!el) return;
    if (lastPointerSfx && lastPointerSfx.el === el && nowMs() - lastPointerSfx.at < 480) return;
    playForElement(el);
  });

  document.addEventListener('keydown', (event) => {
    if (event.repeat || event.key !== 'Enter') return;
    const el = sfxTarget(event, false);
    if (!el) return;
    playForElement(el);
    lastPointerSfx = { el, at: nowMs() };
  }, { capture: true });

  const handleAudioEvent = (event) => {
    const detail = event.detail || {};
    const name = typeof detail === 'string' ? detail : detail.name || detail.sound || detail.cue;
    if (name) play(name);
  };

  window.addEventListener('convivium:audio', handleAudioEvent);
  document.addEventListener('convivium:audio', handleAudioEvent);

  const setBusVolume = (bus, value) => {
    if (!Object.prototype.hasOwnProperty.call(busVolumes, bus)) return false;
    busVolumes[bus] = clamp(Number(value) || 0, 0, 1);
    Object.values(pools).flat().forEach((audio) => {
      audio.volume = volumeFor(audio.dataset.bus || 'ui');
    });
    try { localStorage.setItem(BUS_VOLUME_KEY, JSON.stringify(busVolumes)); } catch {}
    return true;
  };

  const startMusic = (name = 'terminal') => {
    stopMusic();
    if (!enabled) return;
    const sequences = {
      terminal: ['terminal.type', 'ui.click', 'terminal.type', 'terminal.suggest'],
      runner: ['game.step', 'game.step', 'game.pickup', 'game.step'],
      oracle: ['oracle.choose', 'terminal.type', 'oracle.stir', 'terminal.type']
    };
    const pattern = sequences[name] || sequences.terminal;
    let i = 0;
    musicTimer = window.setInterval(() => {
      play(pattern[i % pattern.length]);
      i += 1;
    }, name === 'runner' ? 220 : 520);
  };

  function stopMusic() {
    if (!musicTimer) return;
    window.clearInterval(musicTimer);
    musicTimer = null;
  }

  const startAmbient = () => {
    stopAmbient();
    if (!enabled) return;
    ambientTimer = window.setInterval(() => play('terminal.type'), 2600);
  };

  function stopAmbient() {
    if (!ambientTimer) return;
    window.clearInterval(ambientTimer);
    ambientTimer = null;
  }

  const api = {
    get enabled() { return enabled; },
    get unlocked() { return unlocked; },
    get context() { return null; },
    get busVolumes() { return { ...busVolumes }; },
    setEnabled,
    setBusVolume,
    play,
    cue: play,
    dispatch: (name, opts = {}) => {
      window.dispatchEvent(new CustomEvent('convivium:audio', { detail: { ...opts, name } }));
    },
    tone: () => play('terminal.type'),
    noise: () => play('ui.glitch'),
    sequence: () => play('terminal.run'),
    pulse: () => play('terminal.type'),
    prerender: () => Object.keys(recipes).forEach(entryFor),
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
    score: () => play('score'),
    highScore: () => play('highScore'),
    undo: () => play('undo'),
    reset: () => play('reset'),
    save: () => play('save'),
    win: () => play('win'),
    fail: () => play('fail'),
    bust: () => play('bust'),
    toggle: (on) => play(on ? 'ui.toggleOn' : 'ui.toggleOff'),
    music: {
      get active() { return Boolean(musicTimer); },
      get current() { return musicTimer ? 'html-audio-loop' : ''; },
      start: startMusic,
      stop: stopMusic
    },
    ambient: {
      get active() { return Boolean(ambientTimer); },
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
  window.ConviviumAudioCue = play;
})();
