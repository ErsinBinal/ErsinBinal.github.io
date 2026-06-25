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
    charge: 1, ready: true, raf: 0, last: 0, freezeUntil: 0
  };
  const particles = [];
  const rings = [];
  const bolts = [];
  const sprites = [];

  let canvas, ctx, dpr = 1;
  let screen, flashEl, scanEl;          // ekran-uzayi efekt katmanlari
  let castBtn;

  // --- Canvas kurulum ------------------------------------------------------
  function ensure() {
    if (state.booted) return;
    state.booted = true;
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

    buildCastButton();
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
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
  const liveFx = () => particles.length || rings.length || bolts.length || sprites.length;
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
  const cap = (n) => (lowPower() ? Math.round(n * 0.5) : n);

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
      particles: addParticles, converge: addConverging, ring: addRing, bolt: addBolt, sprite: addSprite
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

  const MOVES = { volt: voltThunder };
  const moveFor = (skin) => MOVES[skin] || genericSurge;

  // --- Cast akisi ----------------------------------------------------------
  function cast(opts = {}) {
    ensure();
    if (state.casting) return false;
    const st = bv4State();
    if (!st || !st.active) return false;
    if (!state.ready) {
      if (!opts.auto) buzzButton();
      return false;
    }
    const c = buildCtx(st, opts);
    if (!c) return false;
    state.casting = true;
    setCharge(0);
    updateButton();
    startLoop();
    Promise.resolve(moveFor(st.skin)(c))
      .catch(() => { /* yok say */ })
      .finally(() => { state.casting = false; updateButton(); });
    return true;
  }

  // --- Sarj + buton --------------------------------------------------------
  function setCharge(v) {
    state.charge = clamp(v, 0, 1);
    state.ready = state.charge >= 1;
    updateButton();
  }
  function addCharge(frac) { if (!state.casting) setCharge(state.charge + frac); }

  function buildCastButton() {
    castBtn = document.createElement('button');
    castBtn.type = 'button';
    castBtn.id = 'bugy-cinema-cast';
    castBtn.className = 'bugy-cinema-cast';
    castBtn.setAttribute('aria-label', 'Bugy imza yeteneği');
    castBtn.innerHTML = '<span class="cine-cast-glyph" aria-hidden="true">◈</span>';
    castBtn.addEventListener('click', () => cast({ via: 'button' }));
    document.body.appendChild(castBtn);
    updateButton();
    syncButtonVisible();
  }
  function buzzButton() {
    if (!castBtn || reduceMotion()) return;
    castBtn.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }],
      { duration: 260 }
    );
  }
  function updateButton() {
    if (!castBtn) return;
    castBtn.style.setProperty('--charge', state.charge.toFixed(3));
    castBtn.classList.toggle('is-ready', state.ready && !state.casting);
    castBtn.classList.toggle('is-casting', state.casting);
    castBtn.title = state.casting ? 'Yetenek oynatılıyor…'
      : state.ready ? 'İmza yeteneği hazır — tıkla (yaratığa çift-tık / basılı-tut da olur)'
        : `Şarj oluyor… %${Math.round(state.charge * 100)}`;
  }
  function syncButtonVisible() {
    if (!castBtn) return;
    castBtn.classList.toggle('is-shown', state.active);
  }

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
    // Otonom: hazir + bosta + gizli degil -> ara sira kendi kendine.
    if (state.ready && !state.casting && !document.hidden) {
      const st = bv4State();
      if (st && st.active && st.state === 'idle') {
        const p = st.feral ? 0.06 : 0.035;   // feral biraz daha agresif
        if (Math.random() < p) cast({ auto: true });
      }
    }
  }, 1000);

  // --- BugyV4 durum koprusu ------------------------------------------------
  window.addEventListener('bugy-v4:state', (e) => {
    const d = e && e.detail;
    const wasActive = state.active;
    state.active = Boolean(d && d.active);
    if (state.active && !state.booted) ensure();
    if (state.active !== wasActive) syncButtonVisible();
  });

  // Sayfa gec yuklenirse mevcut durumu yakala.
  window.setTimeout(() => {
    const st = bv4State();
    if (st && st.active) { state.active = true; ensure(); syncButtonVisible(); }
  }, 800);

  window.BugyCinema = {
    version: '1.0.0',
    cast,
    ready: () => state.ready,
    addCharge,
    getState: () => ({ active: state.active, casting: state.casting, charge: state.charge, ready: state.ready })
  };
})();
