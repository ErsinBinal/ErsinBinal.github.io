/**
 * Convivium - Bugy v4 Sinematik Aksiyon Motoru ("Signature Moves")
 * ----------------------------------------------------------------------------
 * Yaratiklarin imza yeteneklerini Bugy Classic'ten TAMAMEN ayri, sinematik bir
 * sekilde oynatir. Kendi tam ekran <canvas> FX katmani, bir sequencer (fazli
 * zaman cizelgesi) ve ekran-uzayi efektleri (flas, kamera sarsintisi, scanline/
 * glitch, sok halkasi, partikuller, Kenney sprite patlamalari) icerir.
 *
 * Tetikleme (hepsi acik):
 *   - Sarj gostergeli "yetenek" butonu (sol-alt; bakim 🩺'ten ayri)
 *   - Yaratiga cift-tik  -> normal cast
 *   - Yaratiga basili-tut (>=550ms) -> CRITICAL cast (daha buyuk)
 *   - Sarj dolu + bostayken ara sira OTONOM cast (mood duyarli)
 *
 * Public API: window.BugyCinema = { version, cast, ready, addCharge, getState }
 * Yalnizca BugyV4 aktifken gorunur/calisir. Reduced-motion + dusuk guc fallback.
 */
(() => {
  'use strict';
  if (window.BugyCinema) return;

  // --- Yardimcilar ---------------------------------------------------------
  const reduceMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowPower = () =>
    (navigator.deviceMemory && navigator.deviceMemory <= 4) || window.innerWidth < 640;
  const sfx = (name) => {
    const e = window.ConviviumSFX;
    if (e && e.play) { try { e.play(name); } catch { /* yok say */ } }
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion() ? Math.min(ms, 120) : ms));

  // Kenney duman/patlama kareleri (repo'da + service-worker precache'li).
  const SPRITE_NAMES = ['flash04', 'flash08', 'explosion00', 'explosion06', 'whitePuff08', 'blackSmoke08'];
  const SPR = {};
  let spritesReady = false;
  const preloadSprites = () => {
    if (spritesReady) return;
    spritesReady = true;
    SPRITE_NAMES.forEach((n) => {
      const img = new Image();
      img.src = `/assets/vendor/kenney/smoke-particles/${n}.png`;
      SPR[n] = img;
    });
  };

  // --- Durum + FX havuzlari ------------------------------------------------
  const CHARGE_SECONDS = 38;             // bostan dolusa ~38 sn
  const state = {
    booted: false, active: false, casting: false,
    charge: 1, ready: true, raf: 0, last: 0, freezeUntil: 0,
    combo: 0, lastCastEnd: 0
  };
  let maxParticles = 260;     // mobilde dusurulur (ensure'da ayarlanir)
  const particles = [];
  const rings = [];
  const bolts = [];
  const sprites = [];
  const beams = [];

  let canvas, ctx, dpr = 1;
  let screen, flashEl, scanEl;          // ekran-uzayi efekt katmanlari

  // --- Canvas kurulum ------------------------------------------------------
  function ensure() {
    if (state.booted) return;
    state.booted = true;
    maxParticles = lowPower() ? 120 : 260;
    preloadSprites();

    canvas = document.createElement('canvas');
    canvas.id = 'bugy-cinema-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize, { passive: true });

    screen = document.createElement('div');
    screen.id = 'bugy-cinema-screen';
    screen.setAttribute('aria-hidden', 'true');
    flashEl = document.createElement('div');
    flashEl.className = 'cine-flash';
    scanEl = document.createElement('div');
    scanEl.className = 'cine-scan';
    screen.append(flashEl, scanEl);
    document.body.appendChild(screen);
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, lowPower() ? 1.5 : 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }

  // --- BugyV4 koprusu ------------------------------------------------------
  const bv4 = () => window.BugyV4;
  const bv4State = () => { const a = bv4(); try { return a && a.getState(); } catch { return null; } };
  const charEl = () => document.querySelector('#bugy-v4-layer .bugy-v4-char');

  function anchor() {
    const el = charEl();
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const css = getComputedStyle(el);
    return {
      el,
      cx: r.left + r.width / 2,
      cy: r.top + r.height * 0.42,
      groundY: r.bottom - 6,
      accent: (css.getPropertyValue('--v4-accent') || '#00f3ff').trim() || '#00f3ff',
      accent2: (css.getPropertyValue('--v4-accent2') || '#ffffff').trim() || '#ffffff'
    };
  }

  // --- Render dongusu (yalnizca efekt varken calisir) ----------------------
  const liveFx = () => particles.length || rings.length || bolts.length || sprites.length || beams.length;
  function startLoop() {
    if (state.raf) return;
    state.last = performance.now();
    state.raf = requestAnimationFrame(loop);
  }
  function loop(ts) {
    let dt = ts - state.last; state.last = ts;
    if (ts < state.freezeUntil) dt = 0;           // hit-stop
    dt = Math.min(dt, 48) / 1000;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';

    for (let i = beams.length - 1; i >= 0; i--) { if (!stepBeam(beams[i], dt)) beams.splice(i, 1); }
    for (let i = bolts.length - 1; i >= 0; i--) { if (!stepBolt(bolts[i], dt)) bolts.splice(i, 1); }
    for (let i = rings.length - 1; i >= 0; i--) { if (!stepRing(rings[i], dt)) rings.splice(i, 1); }
    for (let i = particles.length - 1; i >= 0; i--) { if (!stepParticle(particles[i], dt)) particles.splice(i, 1); }

    ctx.globalCompositeOperation = 'source-over';
    for (let i = sprites.length - 1; i >= 0; i--) { if (!stepSprite(sprites[i], dt)) sprites.splice(i, 1); }

    if (liveFx() || state.casting) state.raf = requestAnimationFrame(loop);
    else { state.raf = 0; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }

  // partikul
  function stepParticle(p, dt) {
    p.life -= dt;
    if (p.life <= 0) return false;
    p.vy += (p.grav || 0) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.4 + a * 0.6), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    return true;
  }
  // sok halkasi
  function stepRing(rg, dt) {
    rg.life -= dt;
    if (rg.life <= 0) return false;
    rg.r += rg.vr;
    const a = clamp(rg.life / rg.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.strokeStyle = rg.color;
    ctx.lineWidth = rg.width * a + 0.5;
    ctx.beginPath();
    ctx.ellipse(rg.x, rg.y, rg.r, rg.r * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return true;
  }
  // simsek (catallanan)
  function stepBolt(b, dt) {
    b.life -= dt;
    if (b.life <= 0) return false;
    const a = clamp(b.life / b.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.strokeStyle = b.color;
    ctx.lineWidth = b.width;
    ctx.shadowColor = b.color; ctx.shadowBlur = 16;
    drawJagged(b.x1, b.y1, b.x2, b.y2, b.seed, b.width);
    if (b.branches) {
      for (let k = 0; k < b.branches; k++) {
        const t = 0.3 + k * 0.2;
        const mx = b.x1 + (b.x2 - b.x1) * t + rand(-10, 10);
        const my = b.y1 + (b.y2 - b.y1) * t;
        ctx.lineWidth = b.width * 0.6;
        drawJagged(mx, my, mx + rand(-40, 40), my + rand(20, 60), b.seed + k + 1, b.width * 0.6);
      }
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    return true;
  }
  function drawJagged(x1, y1, x2, y2, seed, w) {
    const segs = 9;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const jitter = (Math.sin(seed * 9.7 + i * 2.3) * 0.5 + Math.sin(i * 5.1) * 0.5) * 16 * (1 - t * 0.3);
      ctx.lineTo(x1 + (x2 - x1) * t + jitter, y1 + (y2 - y1) * t);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  // dikey isik huzmesi (ay isigi / kolon)
  function stepBeam(b, dt) {
    b.life -= dt;
    if (b.life <= 0) return false;
    const a = clamp(b.life / b.maxLife, 0, 1);
    const g = ctx.createLinearGradient(0, b.top, 0, b.bottom);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, b.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a * 0.5;
    ctx.fillStyle = g;
    ctx.fillRect(b.x - b.w / 2, b.top, b.w, b.bottom - b.top);
    ctx.globalAlpha = 1;
    return true;
  }
  // Kenney sprite (kare)
  function stepSprite(s, dt) {
    s.life -= dt;
    if (s.life <= 0) return false;
    const img = SPR[s.name];
    if (img && img.complete && img.naturalWidth) {
      const a = clamp(s.life / s.maxLife, 0, 1);
      const sz = s.base * (1.4 - a * 0.4);
      ctx.globalAlpha = a;
      ctx.drawImage(img, s.x - sz / 2, s.y - sz / 2, sz, sz);
      ctx.globalAlpha = 1;
    }
    return true;
  }

  // --- Efekt primitifleri (move'lar bunlari cagirir) -----------------------
  // Mobil/dusuk guc: yariya indir; ayrica genel partikul tavanini asma.
  const cap = (n) => {
    const room = Math.max(0, maxParticles - particles.length);
    return Math.min(lowPower() ? Math.round(n * 0.5) : n, room);
  };

  const addParticles = (x, y, opts = {}) => {
    const n = cap(opts.count || 14);
    for (let i = 0; i < n; i++) {
      const ang = opts.dir != null ? opts.dir + rand(-opts.spread || -0.5, opts.spread || 0.5)
        : rand(0, Math.PI * 2);
      const spd = rand(opts.spdMin || 60, opts.spdMax || 220);
      particles.push({
        x, y,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - (opts.lift || 0),
        life: rand(opts.lifeMin || 0.4, opts.lifeMax || 0.9),
        maxLife: 0.9, size: rand(opts.sizeMin || 1.5, opts.sizeMax || 4),
        grav: opts.grav != null ? opts.grav : 220, color: opts.color || '#fff'
      });
    }
    startLoop();
  };
  const addConverging = (x, y, color, n = 16) => {
    n = cap(n);
    for (let i = 0; i < n; i++) {
      const ang = rand(0, Math.PI * 2);
      const dist = rand(60, 140);
      particles.push({
        x: x + Math.cos(ang) * dist, y: y + Math.sin(ang) * dist,
        vx: -Math.cos(ang) * dist * 2.4, vy: -Math.sin(ang) * dist * 2.4,
        life: rand(0.35, 0.5), maxLife: 0.5, size: rand(1.5, 3.5), grav: 0, color
      });
    }
    startLoop();
  };
  const addRing = (o) => { rings.push(Object.assign({ r: 6, vr: 2, width: 4, life: 0.6, maxLife: 0.6 }, o)); startLoop(); };
  const addBolt = (o) => {
    bolts.push(Object.assign({ life: 0.32, maxLife: 0.32, width: 3, seed: Math.random() * 100 }, o));
    startLoop();
  };
  const addSprite = (name, x, y, base, ms) => { sprites.push({ name, x, y, base: base || 80, life: (ms || 360) / 1000, maxLife: (ms || 360) / 1000 }); startLoop(); };
  // Ekran geneli "yagmur": kod/kar/damla — tepeden duser.
  const addRain = (color, n, opts = {}) => {
    n = cap(n || 24);
    for (let i = 0; i < n; i++) {
      particles.push({
        x: rand(0, window.innerWidth), y: rand(-40, 0),
        vx: rand(-20, 20), vy: rand(opts.vyMin || 140, opts.vyMax || 340),
        life: rand(opts.lifeMin || 0.7, opts.lifeMax || 1.4), maxLife: 1.4,
        size: rand(opts.sizeMin || 1.5, opts.sizeMax || 3), grav: opts.grav != null ? opts.grav : 40, color
      });
    }
    startLoop();
  };
  // Dikey isik huzmesi.
  const addBeam = (x, w, color, top, bottom, life = 0.7) => {
    beams.push({ x, w: w || 60, color, top: top || 0, bottom: bottom != null ? bottom : window.innerHeight, life, maxLife: life });
    startLoop();
  };
  const hitStop = (ms) => { if (!reduceMotion()) state.freezeUntil = performance.now() + ms; };

  function flash(color, peak, dur) {
    if (!flashEl || reduceMotion()) { if (flashEl) { flashEl.style.background = color; flashEl.animate([{ opacity: 0 }, { opacity: (peak || 0.6) * 0.4 }, { opacity: 0 }], { duration: 200 }); } return; }
    flashEl.style.background = color;
    flashEl.animate([{ opacity: 0 }, { opacity: peak || 0.7, offset: 0.18 }, { opacity: 0 }], { duration: dur || 240, easing: 'ease-out' });
  }
  function scan(dur) {
    if (!scanEl || reduceMotion()) return;
    scanEl.animate([{ opacity: 0 }, { opacity: 0.55, offset: 0.2 }, { opacity: 0.35, offset: 0.7 }, { opacity: 0 }], { duration: dur || 320, easing: 'linear' });
    const el = charEl();
    if (el) { el.classList.add('is-cine-glitch'); setTimeout(() => el.classList.remove('is-cine-glitch'), dur || 320); }
  }
  function shake(mag, dur) {
    if (reduceMotion()) return;
    const layer = document.getElementById('bugy-v4-layer');
    const targets = [layer, canvas].filter(Boolean);
    const frames = [];
    const steps = 9;
    for (let i = 0; i <= steps; i++) {
      const d = (mag || 8) * (1 - i / steps);
      frames.push({ transform: `translate(${rand(-d, d).toFixed(1)}px, ${rand(-d, d).toFixed(1)}px)` });
    }
    frames.push({ transform: 'translate(0,0)' });
    targets.forEach((t) => t.animate(frames, { duration: dur || 420, easing: 'linear' }));
  }

  // --- Move sozlesmesi -----------------------------------------------------
  function buildCtx(st, opts) {
    const a = anchor();
    if (!a) return null;
    return {
      cx: a.cx, cy: a.cy, groundY: a.groundY,
      accent: a.accent, accent2: a.accent2,
      stage: st.stage || 'adult', critical: Boolean(opts.critical),
      say: (t) => { const v = bv4(); if (v && v.say) v.say(t); },
      sfx, wait,
      flash, scan, shake, hitStop,
      particles: addParticles, converge: addConverging, ring: addRing, bolt: addBolt,
      sprite: addSprite, rain: addRain, beam: addBeam
    };
  }

  // AMIRAL GEMISI: Voltik - "Yildirim"
  async function voltThunder(c) {
    const big = c.stage === 'adult' || c.critical;
    const el = charEl();
    if (el) el.classList.add('is-cine-charge');

    // 1) sarj
    c.sfx('system.unlock');
    c.converge(c.cx, c.cy, c.accent, big ? 22 : 14);
    await c.wait(440);

    // 2) on-flas (nefes)
    c.flash(c.accent2, 0.22, 150);
    if (el) { el.classList.remove('is-cine-charge'); el.classList.add('is-cine-cast'); }
    await c.wait(130);

    // 3) DARBE
    c.sfx('game.laser'); c.sfx('game.explosion');
    c.bolt({ x1: c.cx, y1: 0, x2: c.cx, y2: c.groundY, color: c.accent, width: big ? 5 : 3, life: 0.4, maxLife: 0.4, branches: big ? 3 : 1 });
    c.sprite('flash08', c.cx, c.cy, big ? 200 : 130, 360);
    c.flash('#ffffff', big ? 0.85 : 0.6, 220);
    c.shake(big ? 13 : 7, big ? 480 : 360);
    c.hitStop(80);
    c.particles(c.cx, c.cy, { count: big ? 30 : 18, color: c.accent, spdMax: 320, lift: 60, sizeMax: 4.5 });
    if (c.critical && big) {
      setTimeout(() => {
        c.bolt({ x1: c.cx + rand(-30, 30), y1: 0, x2: c.cx + rand(-14, 14), y2: c.groundY, color: c.accent2, width: 4, life: 0.36, maxLife: 0.36, branches: 2 });
        c.sprite('explosion06', c.cx, c.cy, 180, 320);
        c.shake(9, 320); c.sfx('game.hazard');
      }, 170);
    }
    await c.wait(130);

    // 4) carpma halkasi + glitch + replik
    c.ring({ x: c.cx, y: c.groundY, r: 8, vr: big ? 2.6 : 1.8, width: 4, color: c.accent, life: big ? 0.7 : 0.52, maxLife: big ? 0.7 : 0.52 });
    c.scan(big ? 440 : 300);
    c.say(c.critical ? '⚡ AŞIRI YÜK!' : '⚡ Yıldırım!');
    await c.wait(big ? 820 : 640);

    if (el) el.classList.remove('is-cine-cast');
  }

  // Diger turler icin (Faz C'ye dek) genel "sarj patlamasi" — accent renginde
  // sade ama hosca bir cinematik; ileride her ture ozel move ile degisecek.
  async function genericSurge(c) {
    const big = c.stage === 'adult' || c.critical;
    const el = charEl();
    if (el) el.classList.add('is-cine-charge');
    c.sfx('system.unlock');
    c.converge(c.cx, c.cy, c.accent, big ? 20 : 12);
    await c.wait(420);
    if (el) { el.classList.remove('is-cine-charge'); el.classList.add('is-cine-cast'); }
    c.sfx('game.power'); c.sfx('game.explosion');
    c.sprite('explosion06', c.cx, c.cy, big ? 190 : 130, 380);
    c.flash(c.accent, big ? 0.7 : 0.5, 220);
    c.shake(big ? 10 : 6, big ? 420 : 320);
    c.hitStop(70);
    c.particles(c.cx, c.cy, { count: big ? 26 : 16, color: c.accent, spdMax: 280, lift: 50 });
    c.particles(c.cx, c.cy, { count: big ? 14 : 8, color: c.accent2, spdMax: 200, lift: 30 });
    c.ring({ x: c.cx, y: c.groundY, r: 8, vr: big ? 2.4 : 1.7, width: 4, color: c.accent2, life: 0.6, maxLife: 0.6 });
    c.scan(big ? 380 : 260);
    const ability = (bv4State() || {}).ability || 'Güç';
    c.say(`✦ ${c.critical ? ability.toUpperCase() + '!' : ability}!`);
    await c.wait(big ? 760 : 600);
    if (el) el.classList.remove('is-cine-cast');
  }

  // Glupi - "Dalga": su sutunu + ekrani supuren dalga + damla yagmuru
  async function aquaWave(c) {
    const big = c.stage === 'adult' || c.critical;
    const el = charEl(); if (el) el.classList.add('is-cine-charge');
    c.sfx('system.unlock');
    c.converge(c.cx, c.cy, c.accent, big ? 20 : 12);
    await c.wait(420);
    if (el) { el.classList.remove('is-cine-charge'); el.classList.add('is-cine-cast'); }
    c.sfx('game.power'); c.sfx('ui.transmit');
    c.particles(c.cx, c.groundY, { count: big ? 26 : 16, color: c.accent, dir: -Math.PI / 2, spread: 0.5, spdMax: 340, lift: 120, grav: 380, sizeMax: 4.5 });
    c.flash(c.accent, big ? 0.4 : 0.3, 240);
    c.ring({ x: c.cx, y: c.groundY, r: 10, vr: big ? 5 : 3.6, width: 5, color: c.accent, life: big ? 0.9 : 0.7, maxLife: big ? 0.9 : 0.7 });
    c.ring({ x: c.cx, y: c.groundY, r: 10, vr: big ? 3.4 : 2.4, width: 3, color: c.accent2, life: big ? 0.9 : 0.7, maxLife: big ? 0.9 : 0.7 });
    c.particles(c.cx, c.groundY - 10, { count: big ? 18 : 12, color: c.accent2, dir: 0, spread: 0.35, spdMax: 380, grav: 120 });
    c.particles(c.cx, c.groundY - 10, { count: big ? 18 : 12, color: c.accent2, dir: Math.PI, spread: 0.35, spdMax: 380, grav: 120 });
    c.shake(big ? 7 : 4, 360);
    c.hitStop(60);
    if (c.critical) setTimeout(() => { c.rain(c.accent, 30, { vyMax: 400 }); c.sfx('ui.transmit'); }, 200);
    await c.wait(140);
    c.rain(c.accent, big ? 22 : 14, { vyMin: 160, vyMax: 360 });
    c.say(c.critical ? '🌊 DALGA!' : '🌊 Dalga!');
    await c.wait(big ? 820 : 640);
    if (el) el.classList.remove('is-cine-cast');
  }

  // Korcuk - "Yangin": cekirdek patlamasi + yukselen alev + duman + hazard
  async function emberInferno(c) {
    const big = c.stage === 'adult' || c.critical;
    const el = charEl(); if (el) el.classList.add('is-cine-charge');
    c.sfx('system.unlock');
    c.converge(c.cx, c.cy, c.accent, big ? 20 : 12);
    await c.wait(420);
    if (el) { el.classList.remove('is-cine-charge'); el.classList.add('is-cine-cast'); }
    c.sfx('game.explosion'); c.sfx('game.hazard');
    c.sprite('explosion06', c.cx, c.cy, big ? 200 : 140, 420);
    c.sprite('blackSmoke08', c.cx, c.cy - 24, big ? 160 : 110, 720);
    c.flash(c.accent, big ? 0.7 : 0.5, 240);
    c.shake(big ? 11 : 6, big ? 460 : 340);
    c.hitStop(80);
    c.particles(c.cx, c.cy, { count: big ? 30 : 18, color: c.accent2, dir: -Math.PI / 2, spread: 0.7, spdMax: 300, lift: 80, grav: -60, lifeMax: 1.1, sizeMax: 5 });
    c.particles(c.cx, c.cy, { count: big ? 18 : 12, color: c.accent, dir: -Math.PI / 2, spread: 0.9, spdMax: 240, grav: -30 });
    c.ring({ x: c.cx, y: c.groundY, r: 8, vr: big ? 2.6 : 1.8, width: 4, color: c.accent2, life: 0.6, maxLife: 0.6 });
    if (c.critical) setTimeout(() => { c.sprite('explosion00', c.cx + rand(-30, 30), c.cy - rand(0, 30), 150, 360); c.shake(8, 300); c.sfx('game.hazard'); }, 180);
    if (big) c.scan(300);
    c.say(c.critical ? '🔥 YANGIN!' : '🔥 Yangın!');
    await c.wait(big ? 820 : 640);
    if (el) el.classList.remove('is-cine-cast');
  }

  // Bitik - "Asiri Yuk": EMP halkasi + datamosh (scanline/RGB glitch + kod yagmuru)
  async function sparkOverload(c) {
    const big = c.stage === 'adult' || c.critical;
    const el = charEl(); if (el) el.classList.add('is-cine-charge');
    c.sfx('ui.glitch'); c.scan(180);
    c.converge(c.cx, c.cy, c.accent, big ? 22 : 14);
    await c.wait(420);
    if (el) { el.classList.remove('is-cine-charge'); el.classList.add('is-cine-cast'); }
    c.sfx('system.unlock'); c.sfx('game.power');
    c.ring({ x: c.cx, y: c.cy, r: 6, vr: big ? 6 : 4.2, width: 5, color: c.accent, life: big ? 0.7 : 0.55, maxLife: big ? 0.7 : 0.55 });
    c.ring({ x: c.cx, y: c.cy, r: 6, vr: big ? 4.4 : 3, width: 3, color: c.accent2, life: big ? 0.7 : 0.55, maxLife: big ? 0.7 : 0.55 });
    c.flash(c.accent, big ? 0.6 : 0.45, 200);
    c.shake(big ? 9 : 5, 340);
    c.hitStop(70);
    c.scan(big ? 520 : 340);
    setTimeout(() => c.scan(big ? 420 : 220), 260);
    c.rain(c.accent, big ? 40 : 24, { vyMin: 200, vyMax: 520, sizeMin: 1, sizeMax: 2.6 });
    if (c.critical) setTimeout(() => { c.scan(420); c.rain(c.accent2, 30, { vyMax: 560 }); c.sfx('ui.glitch'); }, 220);
    c.say(c.critical ? '▚ AŞIRI YÜK!' : '▚ Aşırı Yük!');
    await c.wait(big ? 880 : 680);
    if (el) el.classList.remove('is-cine-cast');
  }

  // Filizo - "Cicek": sarmasiklar buyur + cicek/bokeh patlamasi (yumusak)
  async function leafBloom(c) {
    const big = c.stage === 'adult' || c.critical;
    const el = charEl(); if (el) el.classList.add('is-cine-charge');
    c.sfx('ui.reveal');
    c.converge(c.cx, c.cy, c.accent, big ? 18 : 12);
    await c.wait(440);
    if (el) { el.classList.remove('is-cine-charge'); el.classList.add('is-cine-cast'); }
    c.sfx('oracle.draw'); c.sfx('game.pickup');
    const vines = big ? 5 : 3;
    for (let i = 0; i < vines; i++) {
      const ang = -Math.PI / 2 + rand(-0.8, 0.8);
      const len = rand(60, 120);
      c.bolt({ x1: c.cx, y1: c.groundY, x2: c.cx + Math.cos(ang) * len, y2: c.groundY + Math.sin(ang) * len, color: c.accent, width: 3, life: 0.5, maxLife: 0.5, branches: 1 });
    }
    c.flash(c.accent, big ? 0.4 : 0.3, 260);
    c.particles(c.cx, c.cy, { count: big ? 28 : 18, color: c.accent2, spdMax: 200, grav: -20, lifeMax: 1.2, sizeMax: 5 });
    c.particles(c.cx, c.cy, { count: big ? 16 : 10, color: '#ffd23f', spdMax: 160, grav: 0, lifeMax: 1.0, sizeMax: 3 });
    c.ring({ x: c.cx, y: c.groundY, r: 8, vr: big ? 2.2 : 1.5, width: 3, color: c.accent, life: 0.7, maxLife: 0.7 });
    c.shake(big ? 4 : 2, 240);
    if (c.critical) setTimeout(() => c.rain(c.accent2, 24, { vyMin: 60, vyMax: 160, sizeMax: 4 }), 220);
    c.say(c.critical ? '🌸 ÇİÇEK!' : '🌸 Çiçek!');
    await c.wait(big ? 820 : 660);
    if (el) el.classList.remove('is-cine-cast');
  }

  // Buzcuk - "Tipi": ekran donar + kar + kristal kirilmasi (shatter)
  async function frostBlizzard(c) {
    const big = c.stage === 'adult' || c.critical;
    const el = charEl(); if (el) el.classList.add('is-cine-charge');
    c.sfx('system.unlock');
    c.converge(c.cx, c.cy, c.accent, big ? 20 : 12);
    await c.wait(440);
    if (el) { el.classList.remove('is-cine-charge'); el.classList.add('is-cine-cast'); }
    c.sfx('game.power');
    c.flash('#bfeeff', big ? 0.5 : 0.38, 600);
    c.rain(c.accent, big ? 44 : 26, { vyMin: 90, vyMax: 240, sizeMin: 1.5, sizeMax: 3.5 });
    c.ring({ x: c.cx, y: c.cy, r: 8, vr: big ? 3.2 : 2.2, width: 4, color: c.accent2, life: 0.7, maxLife: 0.7 });
    c.particles(c.cx, c.cy, { count: big ? 22 : 14, color: c.accent, spdMax: 220, grav: 60, lifeMax: 1.1 });
    await c.wait(big ? 520 : 380);
    c.sfx('ui.glitch'); c.sfx('game.hazard');
    c.sprite('flash04', c.cx, c.cy, big ? 180 : 120, 320);
    c.flash('#ffffff', big ? 0.7 : 0.5, 200);
    c.shake(big ? 10 : 6, 360);
    c.hitStop(70);
    c.particles(c.cx, c.cy, { count: big ? 30 : 18, color: c.accent2, spdMax: 360, grav: 140, sizeMax: 4 });
    if (c.critical) setTimeout(() => { c.rain(c.accent2, 30, { vyMax: 300 }); c.shake(6, 260); }, 180);
    c.say(c.critical ? '❄ TİPİ!' : '❄ Tipi!');
    await c.wait(big ? 640 : 520);
    if (el) el.classList.remove('is-cine-cast');
  }

  // Pufmis - "Ay Tozu": ay isigi huzmesi + yercekimi kaldirmasi (suzulen toz)
  async function lunaMoondust(c) {
    const big = c.stage === 'adult' || c.critical;
    const el = charEl(); if (el) el.classList.add('is-cine-charge');
    c.sfx('oracle.stir');
    c.converge(c.cx, c.cy, c.accent, big ? 18 : 12);
    await c.wait(440);
    if (el) { el.classList.remove('is-cine-charge'); el.classList.add('is-cine-cast'); }
    c.sfx('system.unlock'); c.sfx('game.portal');
    c.beam(c.cx, big ? 70 : 50, c.accent2, 0, c.groundY + 8, big ? 0.9 : 0.7);
    c.flash(c.accent2, big ? 0.4 : 0.3, 300);
    c.particles(c.cx, c.groundY - 10, { count: big ? 30 : 18, color: c.accent, dir: -Math.PI / 2, spread: 1.2, spdMax: 160, grav: -120, lifeMax: 1.4, sizeMax: 4 });
    c.particles(c.cx, c.cy, { count: big ? 20 : 12, color: c.accent2, grav: -80, spdMax: 120, lifeMax: 1.3 });
    c.ring({ x: c.cx, y: c.cy, r: 8, vr: big ? 2.4 : 1.6, width: 3, color: c.accent2, life: 0.7, maxLife: 0.7 });
    c.shake(big ? 5 : 3, 300);
    if (c.critical) setTimeout(() => { c.beam(c.cx, 100, c.accent, 0, c.groundY + 8, 0.7); c.particles(c.cx, c.cy, { count: 20, color: '#ffffff', grav: -100, spdMax: 140 }); }, 220);
    c.say(c.critical ? '✦ AY TOZU!' : '✦ Ay Tozu!');
    await c.wait(big ? 860 : 680);
    if (el) el.classList.remove('is-cine-cast');
  }

  const MOVES = {
    volt: voltThunder, aqua: aquaWave, ember: emberInferno,
    spark: sparkOverload, leaf: leafBloom, frost: frostBlizzard, luna: lunaMoondust
  };
  const moveFor = (skin) => MOVES[skin] || genericSurge;

  // --- Cast akisi ----------------------------------------------------------
  function cast(opts = {}) {
    ensure();
    if (state.casting) return false;
    const st = bv4State();
    if (!st || !st.active) return false;
    if (!state.ready) return false;

    // Combo: kisa pencere icinde ardisik cast -> yogunluk artar (>=2 critical).
    const now = performance.now();
    state.combo = (now - state.lastCastEnd < 7000) ? state.combo + 1 : 1;
    if (state.combo >= 2) opts.critical = true;

    // Nadir "overdrive" varyant (otonomda kapali) -> altin parlama + critical.
    const rare = !opts.auto && Math.random() < 0.12;
    if (rare) { opts.critical = true; opts.rare = true; }

    const c = buildCtx(st, opts);
    if (!c) return false;
    state.casting = true;
    setCharge(0);
    startLoop();
    if (rare) rareFlourish(c);

    Promise.resolve(moveFor(st.skin)(c))
      .catch(() => { /* yok say */ })
      .finally(() => { state.casting = false; state.lastCastEnd = performance.now(); });
    return true;
  }

  // Nadir varyant: altin flas + rozet + zirve patlamasi (move'un ustune biner).
  function rareFlourish(c) {
    c.sfx('ui.reveal');
    c.flash('#ffe27a', 0.45, 320);
    flashRareBadge();
    setTimeout(() => {
      c.particles(c.cx, c.cy, { count: 22, color: '#ffe27a', spdMax: 280, grav: -40, lifeMax: 1.3, sizeMax: 4 });
      c.sprite('flash08', c.cx, c.cy, 160, 360);
    }, 460);
  }
  function flashRareBadge() {
    const b = document.createElement('div');
    b.className = 'cine-rare-badge';
    b.textContent = 'NADİR ✦';
    document.body.appendChild(b);
    setTimeout(() => b.classList.add('is-out'), 1200);
    setTimeout(() => b.remove(), 1700);
  }

  // --- Director: bostayken kucuk sinematik tic'ler (cast'tan ayri, sarj yemez)
  function ambientTic() {
    if (reduceMotion()) return;
    const a = anchor();
    if (!a) return;
    const st = bv4State();
    const feral = st && st.feral;
    const kinds = feral ? ['flicker', 'ping', 'flicker'] : ['ping', 'sparkle', 'flicker', 'scanflick'];
    const k = kinds[Math.floor(Math.random() * kinds.length)];
    if (k === 'ping') {
      addRing({ x: a.cx, y: a.cy, r: 4, vr: 1.4, width: 2, color: feral ? '#ff2e5e' : a.accent, life: 0.5, maxLife: 0.5 });
    } else if (k === 'sparkle') {
      addParticles(a.cx, a.cy, { count: 4, color: a.accent2, spdMax: 90, grav: -30, lifeMax: 0.8, sizeMax: 2.5 });
    } else if (k === 'flicker') {
      const el = charEl();
      if (el) { el.classList.add('is-cine-glitch'); setTimeout(() => el.classList.remove('is-cine-glitch'), 180); }
      addParticles(a.cx, a.cy, { count: 3, color: feral ? '#ff2e5e' : a.accent, spdMax: 70, lifeMax: 0.6, sizeMax: 2 });
    } else {
      scan(160);
    }
  }

  // --- Sarj -----------------------------------------------------------------
  function setCharge(v) {
    state.charge = clamp(v, 0, 1);
    state.ready = state.charge >= 1;
  }
  function addCharge(frac) { if (!state.casting) setCharge(state.charge + frac); }

  // --- Yaratiga dogrudan tetikleyiciler (cift-tik / basili-tut) -------------
  let charBound = false;
  function bindChar() {
    const el = charEl();
    if (!el || charBound) return;
    charBound = true;
    let timer = 0; let longed = false;
    el.addEventListener('pointerdown', () => {
      longed = false;
      timer = window.setTimeout(() => { longed = true; cast({ critical: true, via: 'hold' }); }, 550);
    });
    const clear = () => window.clearTimeout(timer);
    el.addEventListener('pointerup', clear);
    el.addEventListener('pointerleave', clear);
    el.addEventListener('pointercancel', clear);
    el.addEventListener('dblclick', (e) => { e.preventDefault(); if (!longed) cast({ via: 'dblclick' }); });
  }

  // --- Sarj saati + otonom cast (saniyede bir) -----------------------------
  window.setInterval(() => {
    if (!state.active) return;
    bindChar();
    if (!state.casting && state.charge < 1) setCharge(state.charge + 1 / CHARGE_SECONDS);
    // Combo rozeti suresi dolunca temizle.
    if (state.combo && performance.now() - state.lastCastEnd > 7000) state.combo = 0;
    if (state.casting || document.hidden) return;
    const st = bv4State();
    if (!st || !st.active || st.state !== 'idle') return;
    // Otonom imza cast (hazirsa, nadiren).
    if (state.ready && Math.random() < (st.feral ? 0.06 : 0.035)) { cast({ auto: true }); return; }
    // Director ambient tic'leri (sarj yemez, sik ama hafif).
    if (Math.random() < 0.1) ambientTic();
  }, 1000);

  // --- BugyV4 durum koprusu ------------------------------------------------
  window.addEventListener('bugy-v4:state', (e) => {
    const d = e && e.detail;
    state.active = Boolean(d && d.active);
    if (state.active && !state.booted) ensure();
  });

  // Sayfa gec yuklenirse mevcut durumu yakala.
  window.setTimeout(() => {
    const st = bv4State();
    if (st && st.active) { state.active = true; ensure(); }
  }, 800);

  window.BugyCinema = {
    version: '1.0.0',
    cast,
    ready: () => state.ready,
    addCharge,
    getState: () => ({ active: state.active, casting: state.casting, charge: state.charge, ready: state.ready })
  };
})();
