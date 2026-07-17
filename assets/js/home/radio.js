/**
 * Convivium - Radio (prosedurel ambient yayin)
 * WebAudio ile tamamen yerel uretilen dusuk sesli ambient. Dis istek yok
 * (CSP dostu). Gunun tarihi seed'dir: herkes ayni gun ayni "yayini" duyar;
 * sayfa yoluna gore kucuk bir baz frekans farki olur. Ses toggle'i (audio
 * off) kapaliyken radyo calismaz/susar.
 * createRadio(deps) fabrikasi ile kurulur.
 * (c) 2026 Ersin Binal - https://ersinbinal.github.io
 */
(() => {
  window.ConviviumHome = window.ConviviumHome || {};

  window.ConviviumHome.createRadio = (deps) => {
    const { isAudioEnabled } = deps;

    const STATIONS = ['drift', 'pulse', 'rain'];
    // Pentatonik dereceler: hangi seed gelirse gelsin uyumlu kalir.
    const SCALE = [0, 3, 5, 7, 10, 12, 15, 17];

    let ctx = null;
    let master = null;
    let active = false;
    let stationIndex = 0;
    let nodes = [];
    let timers = [];

    const mulberry32 = (seed) => {
      let a = seed >>> 0;
      return () => {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };

    const daySeed = () => {
      const key = new Date().toISOString().slice(0, 10);
      return [...key].reduce((hash, ch) => (Math.imul(hash, 31) + ch.charCodeAt(0)) | 0, 11);
    };

    // Sayfa basina baz frekans farki (yarim ton adimlariyla, kucuk).
    const pageOffset = () => {
      const hash = [...location.pathname].reduce((sum, ch) => (Math.imul(sum, 33) + ch.charCodeAt(0)) | 0, 5);
      return (Math.abs(hash) % 5) - 2; // -2..+2 yarim ton
    };

    const baseFreq = () => 110 * Math.pow(2, pageOffset() / 12);

    const ensureContext = () => {
      if (ctx) return ctx;
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(ctx.destination);
      return ctx;
    };

    const clearTimers = () => {
      timers.forEach((t) => window.clearInterval(t));
      timers = [];
    };

    const teardownNodes = () => {
      nodes.forEach((node) => {
        try { node.stop?.(); } catch { /* zaten durmus */ }
        try { node.disconnect?.(); } catch { /* zaten kopmus */ }
      });
      nodes = [];
    };

    const noteFreq = (degree, octave = 0) =>
      baseFreq() * Math.pow(2, (SCALE[degree % SCALE.length] + octave * 12) / 12);

    const startDrift = (rng) => {
      // Iki detune osilator + cok yavas nefes alan gain: koyu drone.
      const chordRoot = Math.floor(rng() * SCALE.length);
      const voices = [0, 2, 4].map((step, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = index === 0 ? 'triangle' : 'sine';
        osc.frequency.value = noteFreq(chordRoot + step, index === 2 ? 1 : 0);
        osc.detune.value = (rng() - 0.5) * 14;
        gain.gain.value = 0.05 + rng() * 0.03;
        osc.connect(gain);
        gain.connect(master);
        osc.start();
        nodes.push(osc, gain);
        return { osc, step };
      });
      // ~13 sn'de bir akor kaydirma (gunun rng dizisiyle herkese ayni sira).
      timers.push(window.setInterval(() => {
        const root = Math.floor(rng() * SCALE.length);
        voices.forEach(({ osc, step }, index) => {
          osc.frequency.linearRampToValueAtTime(
            noteFreq(root + step, index === 2 ? 1 : 0),
            ctx.currentTime + 4
          );
        });
      }, 13000));
    };

    const startPulse = (rng) => {
      // Yumusak kare dalga arpej: yavas nabiz.
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      osc.type = 'square';
      osc.frequency.value = noteFreq(0, 1);
      gain.gain.value = 0;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc.start();
      nodes.push(osc, filter, gain);
      timers.push(window.setInterval(() => {
        const degree = Math.floor(rng() * SCALE.length);
        const octave = rng() > 0.72 ? 2 : 1;
        osc.frequency.setValueAtTime(noteFreq(degree, octave), ctx.currentTime);
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
      }, 640));
    };

    const startRain = (rng) => {
      // Dongulu gurultu + sallanan lowpass: statik yagmur.
      const seconds = 2;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (rng() * 2 - 1) * 0.6;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 620;
      const gain = ctx.createGain();
      gain.gain.value = 0.06;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.07;
      lfoGain.gain.value = 320;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();
      lfo.start();
      nodes.push(source, filter, gain, lfo, lfoGain);
    };

    const startStation = () => {
      teardownNodes();
      clearTimers();
      const rng = mulberry32(daySeed() + stationIndex * 977);
      const name = STATIONS[stationIndex];
      if (name === 'drift') startDrift(rng);
      else if (name === 'pulse') startPulse(rng);
      else startRain(rng);
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 1.6);
    };

    const stop = () => {
      if (!active) return;
      active = false;
      clearTimers();
      if (ctx && master) {
        try {
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
          master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
        } catch { /* kapanis rampasi best-effort */ }
      }
      const oldNodes = nodes;
      nodes = [];
      window.setTimeout(() => {
        oldNodes.forEach((node) => {
          try { node.stop?.(); } catch { /* zaten durmus */ }
          try { node.disconnect?.(); } catch { /* zaten kopmus */ }
        });
        try { ctx?.suspend?.(); } catch { /* uyutma best-effort */ }
      }, 500);
    };

    const start = () => {
      if (typeof isAudioEnabled === 'function' && !isAudioEnabled()) {
        return 'radio: ses kapali. once "volume on" de, sonra frekansi ac.';
      }
      if (!ensureContext()) return 'radio: bu tarayici WebAudio konusamiyor.';
      try { ctx.resume?.(); } catch { /* uyandirma best-effort */ }
      active = true;
      startStation();
      return [
        `radio: ${STATIONS[stationIndex]} istasyonu acik (gunun yayini).`,
        'radio next -> istasyon degistir · radio -> kapat',
        '(herkes bugun ayni yayini duyar; oda farki kucuk bir perde kaymasidir)'
      ].join('\n');
    };

    const command = (rawArg = '') => {
      const arg = String(rawArg || '').trim().toLowerCase();
      if (!arg || arg === 'toggle') {
        if (active) {
          stop();
          return 'radio: kapandi. frekans sessizlige dondu.';
        }
        return start();
      }
      if (arg === 'on' || arg === 'ac') return active ? `radio: zaten acik (${STATIONS[stationIndex]}).` : start();
      if (arg === 'off' || arg === 'kapat' || arg === 'stop') {
        if (!active) return 'radio: zaten kapali.';
        stop();
        return 'radio: kapandi.';
      }
      if (arg === 'next' || arg === 'sonraki') {
        stationIndex = (stationIndex + 1) % STATIONS.length;
        if (!active) return `radio: istasyon ${STATIONS[stationIndex]} secildi (acmak icin: radio).`;
        if (typeof isAudioEnabled === 'function' && !isAudioEnabled()) {
          stop();
          return 'radio: ses kapali.';
        }
        startStation();
        return `radio: istasyon degisti -> ${STATIONS[stationIndex]}`;
      }
      if (arg === 'status' || arg === 'durum') {
        return `radio: ${active ? `acik (${STATIONS[stationIndex]})` : 'kapali'} / istasyonlar: ${STATIONS.join(', ')}`;
      }
      return 'radio: usage radio | radio next | radio off | radio status';
    };

    return {
      command,
      stop,
      isActive: () => active
    };
  };
})();
