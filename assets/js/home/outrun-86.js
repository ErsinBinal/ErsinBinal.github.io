/**
 * Convivium - OUT RUN '86 // CONVIVIUM COAST
 * Sozde-3B ASCII yol surusu; home-protocol.js icinden cikarilmis modul.
 * createOutrun86(deps) fabrikasi ile kurulur. is-game-mode sinifini
 * pipe ile paylasir; resetPipe geri cagrisi karsilikli dislama saglar.
 * (c) 2026 Ersin Binal - https://ersinbinal.github.io
 */
(() => {
  window.ConviviumHome = window.ConviviumHome || {};

  window.ConviviumHome.createOutrun86 = (deps) => {
    const {
      commandShell,
      commandOutput,
      pulse,
      audioCue,
      normalizeCommand,
      resetPipe
    } = deps;

    let outrun = null;
    let outrunRaf = null;
    let outrunLastTs = 0;
    let outrunIntroTimers = [];
    let outrunIntroActive = false;

    const OUTRUN_W = 61;
    const OUTRUN_H = 20;
    const OUTRUN_HORIZON = 6;
    const OUTRUN_TICK = 45; // ms (~22 fps)
    const OUTRUN_DEPTH = 6;  // her satir = 6 yol birimi
    const OUTRUN_VMAX = 305; // km/s tavan (donem havasi)

    // Zorluk rampasi: ileri etaplar daha keskin viraj, daha yogun trafik, daha kit zaman.
    // time = o etabin checkpoint'inde EKLENEN saniye (etap 0 = baslangic suresi).
    const outrunStages = [
      { name: 'CONVIVIUM COAST', curve: 1.00, traffic: 0.75, len: 1500, time: 23, sky: 'dawn',   scen: 'palm'  },
      { name: 'NEON DELTA',      curve: 1.70, traffic: 1.10, len: 1650, time: 19, sky: 'dusk',   scen: 'neon'  },
      { name: 'CORE TUNNELS',    curve: 2.40, traffic: 1.40, len: 1700, time: 18, sky: 'tunnel', scen: 'pylon' },
      { name: 'VAULT RIDGE',     curve: 2.10, traffic: 1.30, len: 1750, time: 18, sky: 'storm',  scen: 'rock'  },
      { name: 'ATLAS SUMMIT',    curve: 2.80, traffic: 1.60, len: 1850, time: 18, sky: 'aurora', scen: 'palm'  }
    ];

    const outrunBestKey = 'convivium.outrun.best';
    const readOutrunBest = () => { try { return parseInt(window.localStorage.getItem(outrunBestKey) || '0', 10) || 0; } catch { return 0; } };
    const writeOutrunBest = (v) => { try { window.localStorage.setItem(outrunBestKey, String(v)); } catch {} };

    const outrunRadio = [
      { id: 'magical', label: 'MAGICAL SOUND SHOWER', tone: 392 },
      { id: 'breeze',  label: 'PASSING BREEZE',       tone: 440 },
      { id: 'splash',  label: 'SPLASH WAVE',          tone: 523 }
    ];

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    const clearOutrun = () => {
      if (outrunRaf !== null) { window.cancelAnimationFrame(outrunRaf); outrunRaf = null; }
      outrunLastTs = 0;
      outrunIntroTimers.forEach(t => window.clearTimeout(t));
      outrunIntroTimers = [];
    };

    const setOutrunMode = (active) => {
      commandShell?.classList.toggle('is-game-mode', Boolean(active));
      // Gercek-zamanli oyun saniyede ~18 kez ciktiyi tazeler; ekran okuyucuyu bogmamak icin sus.
      if (commandOutput) commandOutput.setAttribute('aria-live', active ? 'off' : 'polite');
    };

    const outrunCurveAt = (d, mult) => (
      Math.sin(d * 0.0180) * 0.9 +
      Math.sin(d * 0.0067 + 1.3) * 0.55 +
      Math.sin(d * 0.0310 + 0.7) * 0.22
    ) * mult;

    const outrunCarColors = ['#3b6bd8', '#e0c93b', '#d8d8e0', '#37b0c0', '#e07b3b', '#9a55d0'];
    const outrunSpawnCar = () => {
      const depthSpan = (OUTRUN_H - 1) - OUTRUN_HORIZON;
      const truck = Math.random() < 0.22;
      // Daha UZAKTAN spawn -> tepki suresi. Yakindaki araclarla daima gecilebilir
      // bir bosluk birak (tum yolu kapatma): bos serit bul.
      const dist = outrun.pos + (depthSpan + 6) * OUTRUN_DEPTH + Math.random() * 90;
      const nearbyLanes = outrun.cars
        .filter(c => Math.abs(c.dist - dist) < OUTRUN_DEPTH * 4)
        .map(c => c.lane);
      let lane = (Math.random() * 2 - 1) * 0.85;
      for (let tries = 0; tries < 8; tries++) {
        if (nearbyLanes.every(l => Math.abs(l - lane) > 0.62)) break;
        lane = (Math.random() * 2 - 1) * 0.85;
      }
      outrun.cars.push({
        dist,
        lane: clamp(lane, -0.9, 0.9),
        speed: truck ? 2.0 + Math.random() * 1.2 : 4.0 + Math.random() * 4.0,
        truck,
        color: truck ? '#5e5e68' : outrunCarColors[Math.floor(Math.random() * outrunCarColors.length)],
        scored: false
      });
    };

    // --- Renk paleti / yardimcilar (donem arcade hissi) ---
    const OR_PAL = {
      road1: '#36363f', road2: '#3b3b45',
      rumA: '#d23a3a', rumB: '#eef0f4',
      grass1: '#1e7a35', grass2: '#1a6e2f',
      grassFast: '#9fe6b4', lane: '#f2f3f7',
      carB: '#e6362f', carDk: '#7c1410', carTail: '#ff8a3c', carWin: '#1a1a26', carLight: '#fff1b0',
      frame: '#00ff66', hud: '#c4f8cf', hudDim: '#5fae74', hudBg: '#04140a', warn: '#ff5a4d', amber: '#ffd166'
    };
    const OR_SKY = {
      dawn:   { top: '#241e4d', bot: '#ff9d63', sun: '#ffd07a', mtn: '#3a2b58', star: true },
      dusk:   { top: '#190f3a', bot: '#d44e6b', sun: '#ff885a', mtn: '#281640', star: true },
      tunnel: { top: '#04050a', bot: '#181b29', sun: '#3b4258', mtn: '#0a0c14', star: false },
      storm:  { top: '#23252e', bot: '#565b6a', sun: '#8a8f9e', mtn: '#181a22', star: false },
      aurora: { top: '#06112a', bot: '#0c5a4a', sun: '#7affd0', mtn: '#04203a', star: true }
    };
    const OR_SCEN = {
      palm:  { a: 'Y', b: '♣', f: '#2fbf57' },
      neon:  { a: '╪', b: '◊', f: '#ff5ad0' },
      pylon: { a: 'I', b: 'I', f: '#d8d8e0' },
      rock:  { a: '▲', b: 'Δ', f: '#9a8a6a' }
    };
    const _hx = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const orMix = (a, b, t) => {
      const A = _hx(a), B = _hx(b);
      const m = (i) => Math.round(A[i] + (B[i] - A[i]) * clamp(t, 0, 1)).toString(16).padStart(2, '0');
      return '#' + m(0) + m(1) + m(2);
    };
    const orMtnH = (x, pos) => {
      const s = Math.sin(x * 0.42 + pos * 0.006) * 1.1 + Math.sin(x * 0.17 + pos * 0.0021) * 1.7 + 1.7;
      return clamp(Math.round(s), 0, 3);
    };

    const OUTRUN_W2 = OUTRUN_W + 2;
    const OUTRUN_LINES = 6 + OUTRUN_H + 3; // head(6) + body(H) + foot(3)
    const K = (c, f, b) => ({ c, f, b });

    // SAF tampon: OUTRUN_LINES x OUTRUN_W2 hucre dizisi dondurur (DOM'a dokunmaz; test edilebilir).
    const outrunBuffer = () => {
      const W = OUTRUN_W, H = OUTRUN_H, horizon = OUTRUN_HORIZON;
      const stage = outrunStages[Math.min(outrun.stageIndex, outrunStages.length - 1)];
      const spd = outrun.speed;
      const pos = outrun.pos;
      const depthSpan = (H - 1) - horizon;
      const sky = OR_SKY[stage.sky] || OR_SKY.dawn;
      const scen = OR_SCEN[stage.scen] || OR_SCEN.palm;
      const shakeAmt = outrun.shake > 0 ? (Math.floor(pos) % 2 === 0 ? 1 : -1) * Math.min(2, outrun.shake) : 0;
      const scroll = Math.floor(pos / OUTRUN_DEPTH); // satir-tutarli kayma fazi
      const grid = Array.from({ length: H }, () => Array.from({ length: W }, () => K(' ', '#000', '#000')));
      const put = (x, y, c, f, b) => { if (x >= 0 && x < W && y >= 0 && y < H) { const cell = grid[y][x]; cell.c = c; cell.f = f; cell.b = b; } };

      // GOKYUZU: dikey gradyan
      for (let y = 0; y < horizon; y++) {
        const t = horizon <= 1 ? 0 : y / (horizon - 1);
        const bg = orMix(sky.top, sky.bot, t * t);
        for (let x = 0; x < W; x++) { grid[y][x].f = bg; grid[y][x].b = bg; }
      }
      if (sky.star) {
        for (let y = 0; y < Math.max(1, horizon - 2); y++) for (let x = 0; x < W; x++) {
          if ((x * 7 + y * 29 + Math.floor(pos * 0.015)) % 47 === 0) { grid[y][x].c = '·'; grid[y][x].f = OR_PAL.lane; }
        }
      }
      // GUNES (kavise gore yatay parallax + hafif dikey salinim)
      const sunBob = Math.round(Math.sin(pos * 0.004) * 1.2);
      const sunCx = clamp(Math.round(W * 0.30 - outrunCurveAt(pos + depthSpan * OUTRUN_DEPTH, stage.curve) * 3), 6, W - 6);
      const sunCy = clamp(horizon - 4 + sunBob, 1, horizon - 1);
      for (let dy = -3; dy <= 3; dy++) for (let dx = -5; dx <= 5; dx++) {
        const d = (dx * dx) / 25 + (dy * dy) / 9;
        const yy = sunCy + dy, xx = sunCx + dx;
        if (d <= 1 && yy >= 0 && yy < horizon && xx >= 0 && xx < W) {
          const col = d < 0.45 ? sky.sun : orMix(sky.sun, sky.bot, 0.55);
          grid[yy][xx].c = ' '; grid[yy][xx].f = col; grid[yy][xx].b = col;
        }
      }
      // DAGLAR (parallax silüet)
      for (let x = 0; x < W; x++) {
        const mh = orMtnH(x, pos);
        for (let k = 0; k < mh; k++) { const yy = horizon - 1 - k; if (yy >= 0) { grid[yy][x].c = ' '; grid[yy][x].f = sky.mtn; grid[yy][x].b = sky.mtn; } }
      }

      // YOL
      const rows = [];
      let curve = 0;
      let center = (W / 2) + shakeAmt;
      for (let y = H - 1; y >= horizon; y--) {
        const depth = (H - 1) - y;
        const t = depthSpan > 0 ? depth / depthSpan : 0;
        const segDist = pos + depth * OUTRUN_DEPTH;
        curve += outrunCurveAt(segDist, stage.curve) * 0.085;
        center += curve;
        const halfW = Math.max(2, Math.round((W * 0.46) * (1 - t * 0.85)));
        const cInt = Math.round(center);
        const left = cInt - halfW;
        const right = cInt + halfW;
        // Satir-tutarli kayan serit: komsu satirlar degisir, butun olarak akar (strobe yok).
        const stripe = (depth + scroll) % 2;
        const grassCol = stripe ? OR_PAL.grass1 : OR_PAL.grass2;
        const roadCol = stripe ? OR_PAL.road1 : OR_PAL.road2;
        const rumCol = stripe ? OR_PAL.rumA : OR_PAL.rumB;
        for (let x = 0; x < W; x++) { grid[y][x].c = ' '; grid[y][x].f = grassCol; grid[y][x].b = grassCol; }
        if (spd > 0.5 && depth < depthSpan * 0.7) {
          for (let x = 0; x < W; x++) {
            if ((x < left - 1 || x > right + 1) && ((x + depth + scroll * 2) % 5 === 0)) { grid[y][x].c = '⋅'; grid[y][x].f = OR_PAL.grassFast; }
          }
        }
        for (let x = Math.max(0, left + 1); x <= Math.min(W - 1, right - 1); x++) { grid[y][x].c = ' '; grid[y][x].f = roadCol; grid[y][x].b = roadCol; }
        put(left, y, ' ', rumCol, rumCol);
        put(right, y, ' ', rumCol, rumCol);
        if (halfW > 6) { put(left - 1, y, ' ', rumCol, rumCol); put(right + 1, y, ' ', rumCol, rumCol); }
        const dash = (depth + scroll) % 2;
        if (dash && halfW > 3) put(cInt, y, ' ', OR_PAL.lane, OR_PAL.lane);
        if (depth > 1 && (depth + scroll) % 4 === 0) {
          const g = (depth % 2) ? scen.a : scen.b;
          put(left - 2, y, g, scen.f, grassCol);
          put(right + 2, y, g, scen.f, grassCol);
        }
        rows.push({ y, depth, center: cInt, halfW });
      }

      // TRAFIK (renkli, yakinda buyur)
      outrun.cars.forEach(car => {
        const rel = (car.dist - pos) / OUTRUN_DEPTH;
        if (rel < 0 || rel > depthSpan) return;
        const y = (H - 1) - Math.round(rel);
        const row = rows.find(r => r.y === y);
        if (!row) return;
        const x = Math.round(row.center + car.lane * (row.halfW - 1));
        const near = rel < depthSpan * 0.6;
        const mid = rel < depthSpan * 0.85;
        const sprite = car.truck
          ? (near ? '▐███▌' : (mid ? '▟█▙' : '▄▄'))
          : (near ? '╓███╖' : (mid ? '╓█╖' : '▴'));
        const body = car.color || (car.truck ? '#5e5e68' : '#3b6bd8');
        const start = x - Math.floor(sprite.length / 2);
        for (let i = 0; i < sprite.length; i++) put(start + i, y, sprite[i], '#0e0f16', body);
        // stop lambalari (yakinken)
        if (near) { put(start, y, '▐', OR_PAL.carTail, body); put(start + sprite.length - 1, y, '▌', OR_PAL.carTail, body); }
      });

      // OYUNCU ARABASI (renkli, fren/spin'de degisir)
      const near0 = rows[0];
      const px = Math.round(near0.center + outrun.playerX * near0.halfW) + shakeAmt;
      const braking = Boolean(outrun.input?.brake);
      const spinning = outrun.spin > 0;
      const lean = !spinning ? ((outrun.input?.right ? 1 : 0) - (outrun.input?.left ? 1 : 0)) : 0;
      const carArt = spinning
        ? ((Math.floor(pos) % 2 === 0) ? [' ╲╳╱ ', '◂ ✸ ▸', ' ╱╳╲ '] : [' ╱╳╲ ', '▸ ✸ ◂', ' ╲╳╱ '])
        : [lean < 0 ? '▟█▙  ' : lean > 0 ? '  ▟█▙' : ' ▟█▙ ', '▐███▌', braking ? '▝◉─◉▘' : '▘╨─╨▝'];
      for (let gx = -2; gx <= 2; gx++) put(px + gx, H - 1, ' ', '#0a0a0a', '#0a0a0a'); // golge
      carArt.forEach((str, i) => {
        const row = H - carArt.length + i;
        const s = px - Math.floor(str.length / 2);
        for (let kx = 0; kx < str.length; kx++) {
          const ch = str[kx];
          if (ch === ' ') continue;
          let f = OR_PAL.carDk, b = OR_PAL.carB;
          if (spinning) { f = OR_PAL.amber; b = '#2a2a30'; }
          else if (ch === '◉') { f = braking ? '#fff04a' : OR_PAL.carTail; b = OR_PAL.carB; }
          else if (i === 0) { f = OR_PAL.carLight; b = OR_PAL.carB; }
          put(s + kx, row, ch, f, b);
        }
      });

      // --- HUD hucreleri ---
      const frame = OR_PAL.frame, hb = OR_PAL.hudBg, hud = OR_PAL.hud;
      const kmh = Math.round(spd * OUTRUN_VMAX);
      const lowTime = outrun.time <= 5;
      const timeStr = Math.max(0, outrun.time).toFixed(1).padStart(5, ' ');
      const stageNo = outrun.stageIndex + 1;
      const toGo = Math.max(0, Math.round(stage.len - outrun.stageDist));
      const meter = (val, max, w, full = '█', empty = '·') => {
        const n = Math.round(clamp(val / max, 0, 1) * w);
        return full.repeat(n) + empty.repeat(Math.max(0, w - n));
      };
      const aheadCurve = outrunCurveAt(pos + depthSpan * OUTRUN_DEPTH * 0.6, stage.curve);
      const cm = Math.min(3, Math.round(Math.abs(aheadCurve) * 1.3));
      const curveSig = cm === 0 ? '  STRAIGHT  ' : (aheadCurve < 0 ? ('«'.repeat(cm) + ' LEFT ').padStart(12, ' ') : (' RIGHT ' + '»'.repeat(cm)).padEnd(12, ' '));
      const combo = outrun.combo > 1 ? `  x${outrun.combo}` : '';
      const strCells = (str, f, b) => { const s = str.length >= W + 2 ? str.slice(0, W + 2) : str.padEnd(W + 2, ' '); const a = []; for (let i = 0; i < W + 2; i++) a.push(K(s[i], f, b)); return a; };
      const hudRow = (interior, f = hud) => { const s = interior.slice(0, W).padEnd(W, ' '); const a = [K('║', frame, hb)]; for (let i = 0; i < W; i++) a.push(K(s[i], f, hb)); a.push(K('║', frame, hb)); return a; };
      const borderRow = (l, m, r) => { const a = [K(l, frame, hb)]; for (let i = 0; i < W; i++) a.push(K(m, frame, hb)); a.push(K(r, frame, hb)); return a; };
      const playRow = (pc) => { const a = [K('║', frame, hb)]; for (let i = 0; i < W; i++) a.push(pc[i]); a.push(K('║', frame, hb)); return a; };

      return [
        borderRow('╔', '═', '╗'),
        hudRow(` OUTRUN'86  S${stageNo}/5 ${stage.name.padEnd(15, ' ')} ♪${outrun.radio.slice(0, 14)}`),
        hudRow(` TIME ${timeStr}s${lowTime ? ' ⚠' : '  '} TACHO[${meter(spd, 1, 16, '▮')}] ${String(kmh).padStart(3, ' ')}km/h`, lowTime ? OR_PAL.warn : hud),
        hudRow(` SCORE ${String(outrun.score).padStart(7, '0')}${combo}   BEST ${String(outrun.best || 0).padStart(7, '0')}   NEXT ${String(toGo).padStart(4, ' ')}m`),
        hudRow(` CURVE ${curveSig}`),
        borderRow('╠', '═', '╣'),
        ...grid.map(playRow),
        borderRow('╚', '═', '╝'),
        strCells((outrun.msg || '').slice(0, W + 2), combo ? OR_PAL.amber : hud, '#000'),
        strCells('DRIVE  ← → steer · ↑/SPACE gas · ↓ brake · outrun quit', OR_PAL.hudDim, '#000')
      ];
    };

    // DOM izgarayi BIR KEZ kur (kalici span'ler). Sonra sadece degisen hucre guncellenir.
    const outrunBuildScreen = () => {
      if (!commandOutput || typeof document === 'undefined' || !outrun) return;
      commandOutput.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.style.cssText = 'font:13px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,"Courier New",monospace;white-space:nowrap;text-shadow:none;display:inline-block;';
      const cells = [];
      for (let r = 0; r < OUTRUN_LINES; r++) {
        const rowEl = document.createElement('div');
        rowEl.style.cssText = 'height:13px;white-space:nowrap;';
        const rowCells = [];
        for (let c = 0; c < OUTRUN_W2; c++) {
          const sp = document.createElement('span');
          sp.style.cssText = 'display:inline-block;width:1ch;height:13px;line-height:13px;text-align:center;';
          sp.textContent = ' ';
          rowEl.appendChild(sp);
          rowCells.push({ el: sp, c: '', f: '', b: '' });
        }
        wrap.appendChild(rowEl);
        cells.push(rowCells);
      }
      commandOutput.appendChild(wrap);
      outrun.screen = cells;
    };

    // Tamponu kalici izgaraya uygula (yalniz degisen hucreyi guncelle -> flicker yok).
    const outrunPaint = (buf) => {
      if (!outrun?.screen) return;
      const cells = outrun.screen;
      for (let r = 0; r < OUTRUN_LINES; r++) {
        const row = cells[r], brow = buf[r];
        if (!row || !brow) continue;
        for (let c = 0; c < OUTRUN_W2; c++) {
          const cell = row[c], bc = brow[c];
          if (!bc) continue;
          if (cell.c !== bc.c) { cell.el.textContent = bc.c; cell.c = bc.c; }
          if (cell.f !== bc.f) { cell.el.style.color = bc.f; cell.f = bc.f; }
          if (cell.b !== bc.b) { cell.el.style.backgroundColor = bc.b; cell.b = bc.b; }
        }
      }
    };

    const outrunFinale = (success) => {
      const stage = outrunStages[Math.min(outrun.stageIndex, outrunStages.length - 1)];
      const flag = success
        ? ['   ▟▙▟▙▟▙▟▙▟▙', '   ▜▛▜▛▜▛▜▛▜▛', '    ★  G O A L  ★']
        : ['     .  ✸  .', '    OUT OF TIME', '     `  .  `'];
      const record = outrun.newRecord ? '   ✦✦✦ NEW RECORD ✦✦✦' : '';
      return [
        `OUT RUN '86 — ${success ? 'ALL STAGES CLEARED!' : 'GAME OVER'}`,
        ...flag,
        record,
        `STAGE    : ${stage.name} (${outrun.checkpoints}/5 checkpoint)`,
        `DISTANCE : ${Math.round(outrun.dist)} m`,
        success ? `TIME BONUS: +${outrun.timeBonus}` : `TIME OUT at ${Math.round(outrun.dist)} m`,
        `SCORE    : ${String(outrun.score).padStart(7, '0')}`,
        `BEST     : ${String(outrun.best || 0).padStart(7, '0')}`,
        '',
        'tekrar: outrun new   ·   cikis: outrun quit'
      ].filter(l => l !== '').join('\n');
    };

    const endOutrun = (success) => {
      clearOutrun();
      if (!outrun) return;
      outrun.timeBonus = 0;
      if (success) {
        outrun.timeBonus = Math.round(Math.max(0, outrun.time) * 60);
        outrun.score += outrun.timeBonus;
      }
      const prevBest = readOutrunBest();
      outrun.newRecord = outrun.score > prevBest;
      outrun.best = Math.max(prevBest, outrun.score);
      if (outrun.newRecord) writeOutrunBest(outrun.best);
      outrun.active = false;
      outrun.over = true;
      outrun.input = {};
      outrun.screen = null;
      audioCue(success ? 'terminal.complete' : 'terminal.error');
      pulse(success ? 320 : 90, 0.12);
      if (commandOutput && commandShell?.classList.contains('is-open')) {
        commandOutput.textContent = outrunFinale(success);
      }
    };

    // Framerate-bagimsiz adim: tum artislar k = dt/baz ile olceklenir; boylece
    // 30fps veya 60fps fark etmez, denge ayni kalir (baz = 45ms = eski tick).
    const outrunStep = (dt) => {
      if (!outrun?.active) return;
      const k = dt / (OUTRUN_TICK / 1000);
      const stage = outrunStages[outrun.stageIndex];
      const inp = outrun.input || {};
      const spinning = outrun.spin > 0;
      if (outrun.shake > 0) outrun.shake -= 1;

      // --- Hiz: ease-out hizlanma (dusuk devirde tork, tavanda yumusama) ---
      if (spinning) {
        outrun.spin -= dt;
        outrun.speed -= 0.034 * k;
      } else {
        if (inp.accel) outrun.speed += (0.030 * (1 - outrun.speed) + 0.006) * k; // egri: hizli kalkis, yumusak tavan
        else outrun.speed -= 0.012 * k;                                          // motor freni
        if (inp.brake) outrun.speed -= 0.072 * k;                                // fren guclu
      }

      // --- Direksiyon (cevik) + merkezkaç (hiz² ile, biraz daha hafif) ---
      const nearCurve = outrunCurveAt(outrun.pos, stage.curve);
      const steer = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      if (!spinning) outrun.playerX += steer * 0.062 * (0.55 + outrun.speed * 0.7) * k;
      outrun.playerX -= nearCurve * 0.034 * (outrun.speed * outrun.speed) * k;

      // --- Yol disi (cim/cakil): agir ceza ---
      const offRoad = Math.abs(outrun.playerX) > 1.0;
      if (offRoad) {
        outrun.speed = Math.min(outrun.speed, 0.36);
        outrun.speed -= 0.022 * k;
        outrun.playerX += Math.sign(outrun.playerX) * 0.018 * k;
        outrun.shake = 2;
        outrun.combo = 0;
        if (!outrun.offMsgAt || outrun.dist - outrun.offMsgAt > 40) { outrun.msg = '⚠ CIMDE — yola don!'; outrun.offMsgAt = outrun.dist; }
      }
      outrun.playerX = clamp(outrun.playerX, -2.3, 2.3);
      outrun.speed = clamp(outrun.speed, 0, 1);

      // --- Ilerle (v = bu karedeki mesafe) ---
      const v = outrun.speed * 18 * k;
      outrun.pos += v;
      outrun.dist += v;
      outrun.stageDist += v;
      if (!offRoad && !spinning) outrun.score += Math.round(v * (1 + outrun.stageIndex * 0.3));

      // --- Trafik: ilerlet, temizle, spawn ---
      outrun.cars.forEach(c => { c.dist += c.speed * k; });
      outrun.cars = outrun.cars.filter(c => c.dist > outrun.pos - 24);
      const wantCars = Math.round(2 + stage.traffic * 1.7);
      if (outrun.cars.length < wantCars && Math.random() < (0.040 + stage.traffic * 0.032) * k) {
        outrunSpawnCar();
      }

      // --- Carpisma + near-miss (kalkista kisa dokunulmazlik) ---
      if (!spinning && outrun.dist > 120) {
        for (const c of outrun.cars) {
          const rel = (c.dist - outrun.pos) / OUTRUN_DEPTH;
          const dx = Math.abs(outrun.playerX - c.lane);
          const hitW = c.truck ? 0.58 : 0.42;
          if (rel >= -0.4 && rel <= 1.5 && dx < hitW) {
            outrun.spin = 1.2;
            outrun.speed *= 0.16;
            outrun.time -= 2.0;
            outrun.combo = 0;
            outrun.shake = 3;
            outrun.msg = c.truck ? '✸ KAMYON! spin-out -2s' : '✸ CARPISMA! spin-out -2s';
            audioCue('terminal.error');
            pulse(70, 0.12);
            c.dist = outrun.pos - 26;
            c.scored = true;
            break;
          }
          if (!c.scored && rel < 0 && rel > -1.1 && dx < hitW + 0.45 && outrun.speed > 0.62) {
            c.scored = true;
            outrun.combo = Math.min((outrun.combo || 0) + 1, 9);
            const bonus = 120 * outrun.combo;
            outrun.score += bonus;
            outrun.msg = `≈ NEAR MISS x${outrun.combo}  +${bonus}`;
            audioCue('terminal.suggest');
            pulse(700 + outrun.combo * 30, 0.05);
          }
        }
      }

      // --- Checkpoint / etap gecisi ---
      if (outrun.stageDist >= stage.len) {
        outrun.stageIndex += 1;
        outrun.checkpoints += 1;
        if (outrun.stageIndex >= outrunStages.length) { outrun.finished = true; return endOutrun(true); }
        const next = outrunStages[outrun.stageIndex];
        outrun.time += next.time;
        outrun.stageDist = 0;
        outrun.cars = [];
        outrun.score += 1500;
        const fork = outrun.playerX <= 0 ? '◀ COAST' : 'INLAND ▶';
        outrun.msg = `✔ CHECKPOINT ${outrun.checkpoints} +${next.time}s · ${fork} → ${next.name}`;
        audioCue('terminal.complete');
        pulse(523, 0.1);
      }

      // --- Zaman ---
      outrun.time -= dt;
      if (outrun.time <= 0) { outrun.time = 0; return endOutrun(false); }
    };

    // rAF tabanli ~30fps dongu (akici, gercek dt ile).
    const outrunLoop = (ts) => {
      if (!outrun?.active) { outrunRaf = null; return; }
      if (!outrunLastTs) outrunLastTs = ts;
      const dt = (ts - outrunLastTs) / 1000;
      if (dt >= 0.028) {
        outrunLastTs = ts;
        outrunStep(Math.min(dt, 0.06));
        if (outrun?.active && commandOutput && commandShell?.classList.contains('is-open')) {
          outrunPaint(outrunBuffer());
        }
      }
      outrunRaf = window.requestAnimationFrame(outrunLoop);
    };

    const startOutrunLoop = () => {
      if (outrunRaf !== null) return;
      outrunLastTs = 0;
      outrunRaf = window.requestAnimationFrame(outrunLoop);
    };

    const launchOutrun = (radioLabel) => {
      clearOutrun();
      resetPipe();
      outrunIntroActive = false;
      setOutrunMode(true);
      outrun = {
        active: true, over: false, finished: false,
        pos: 0, dist: 0, stageDist: 0, speed: 0, playerX: 0,
        time: outrunStages[0].time, score: 0, spin: 0, shake: 0, combo: 0,
        stageIndex: 0, checkpoints: 0,
        cars: [], input: {},
        best: readOutrunBest(),
        radio: radioLabel || outrunRadio[0].label,
        msg: 'GREEN LIGHT — GO!'
      };
      for (let i = 0; i < 2; i++) outrunSpawnCar();
      outrunBuildScreen();
      outrunPaint(outrunBuffer());
      startOutrunLoop();
      pulse(523, 0.12);
    };

    const startOutrun = () => {
      clearOutrun();
      resetPipe();
      outrun = null;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion || !commandOutput) {
        outrunIntroActive = false;
        launchOutrun(outrunRadio[0].label);
        return outrun ? 'OUT RUN: kontak acildi (oklarla sur, outrun quit ile cik)' : '';
      }
      // Donem dokunusu: motor kontagi + radyo istasyonu secim sekansi (normal kutuda, kompakt).
      outrunIntroActive = true;
      const car = ['        ___', '   __/  |_ \\__', '  |_o____o___|'];
      const baseLines = (radioIndex, sub) => [
        "OUT RUN '86  //  CONVIVIUM COAST",
        ...car,
        '',
        'IGNITION... ' + sub,
        'SELECT RADIO:',
        ...outrunRadio.map((r, i) => `  ${i === radioIndex ? '▶' : ' '} ♪ ${r.label}`)
      ].join('\n');
      const frames = [
        baseLines(0, 'priming engine'),
        baseLines(1, 'engine warm'),
        baseLines(2, 'tires gripping'),
        baseLines(0, 'READY')
      ];
      const step = 560;
      frames.forEach((frame, index) => {
        const timer = window.setTimeout(() => {
          if (outrun || !commandShell?.classList.contains('is-open')) return;
          commandOutput.textContent = frame;
          pulse(outrunRadio[index % outrunRadio.length].tone, 0.06);
        }, index * step);
        outrunIntroTimers.push(timer);
      });
      const finishTimer = window.setTimeout(() => {
        outrunIntroActive = false;
        if (!commandShell?.classList.contains('is-open')) { setOutrunMode(false); return; }
        launchOutrun(outrunRadio[0].label);
      }, frames.length * step + 220);
      outrunIntroTimers.push(finishTimer);
      return frames[0];
    };

    const outrunHelpText = () => [
      "OUT RUN '86 — kontroller:",
      '  ← →  : direksiyon   ↑/SPACE : gaz   ↓ : fren',
      '  (oklar her zaman; giris alanina yazi da yazabilirsin)',
      '',
      'puf noktasi:',
      '  • Viraja YUKSEK hizda girersen merkezkac seni cime atar.',
      '    CURVE gostergesine bak, gerekirse FRENLE + viraja kir.',
      '  • Cim = agir yavaslama. Trafige carpma = spin-out + -2s.',
      '  • Trafigi yuksek hizda siyirip gec -> NEAR MISS combo skoru.',
      '  • Her checkpoint sure ekler; ileri etaplar daha sert.',
      'komutlar: outrun new | outrun quit | outrun help'
    ].join('\n');

    const outrunCommand = (action = '') => {
      const command = normalizeCommand(action || 'new');
      if (outrunIntroActive) return 'outrun: motor isiniyor...';
      if (['quit', 'exit', 'q', 'stop', 'kapat'].includes(command)) {
        clearOutrun();
        setOutrunMode(false);
        outrun = null;
        return 'OUT RUN: kontak kapatildi';
      }
      if (['help', '?', 'yardim', 'yardım'].includes(command)) return outrunHelpText();
      if (!outrun?.active || ['new', 'start', 'play', 'restart', 'yeni'].includes(command)) return startOutrun();
      return 'OUT RUN: surus devam ediyor (oklarla sur, outrun quit ile cik)';
    };

    return {
      command: outrunCommand,
      isActive: () => Boolean(outrun?.active),
      isOver: () => Boolean(outrun?.over),
      // Komut kabugu yeniden acilinca surusu kaldigi yerden baslat.
      resume: () => {
        setOutrunMode(true);
        outrun.input = {};
        outrunBuildScreen();
        outrunPaint(outrunBuffer());
        startOutrunLoop();
      },
      // Bitmis oyunun skor tabelasini yeniden goster.
      showFinale: () => {
        setOutrunMode(true);
        if (commandOutput) commandOutput.textContent = outrunFinale(Boolean(outrun.finished));
      },
      // Kabuk kapaninca donguyu durdur (durum korunur, acilinca devam eder).
      stopLoop: clearOutrun,
      // Matrix kapanisi gibi tam sifirlama.
      shutdown: () => {
        if (!outrun) return;
        clearOutrun();
        outrun = null;
        setOutrunMode(false);
      },
      setKey: (name, pressed) => { if (outrun) outrun.input[name] = pressed; },
      clearInput: () => { if (outrun) outrun.input = {}; }
    };
  };
})();
