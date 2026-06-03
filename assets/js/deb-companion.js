(() => {
  'use strict';

  const stateKey = 'convivium.deb.state';
  const activeKey = 'convivium.deb.active';
  const legacyStateKey = 'convivium.nova.state';
  const legacyActiveKey = 'convivium.nova.active';
  const actions = ['scan', 'rift', 'bloom', 'mirror', 'perch', 'sleep', 'meteor', 'blackhole', 'deathstar'];
  const actionLines = {
    scan: 'deb scan: active panels mapped',
    rift: 'deb rift: route memory folded',
    bloom: 'deb bloom: field notes charged',
    mirror: 'deb mirror: cursor shadow copied',
    perch: 'deb perch: nearest gate selected',
    sleep: 'deb sleep: signal dimmed',
    meteor: 'deb meteor: impact vector locked on bugy',
    blackhole: 'deb blackhole: event horizon opening',
    deathstar: 'deb deathstar: orbital laser charging'
  };
  const interactionActions = new Set(['meteor', 'blackhole', 'deathstar']);

  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const rand = (min, max) => min + Math.random() * (max - min);
  const ease = (current, target, factor) => current + (target - current) * factor;

  const boot = () => {
    if (window.DebCompanion || window.NovaCompanion || prefersReducedMotion()) return;

    const layer = document.createElement('div');
    layer.id = 'nova-companion-layer';
    layer.className = 'nova-companion-layer';
    layer.hidden = true;

    const canvas = document.createElement('canvas');
    canvas.id = 'nova-companion-canvas';
    canvas.className = 'nova-companion-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    layer.appendChild(canvas);

    const coreButton = document.createElement('button');
    coreButton.id = 'nova-core-button';
    coreButton.className = 'nova-core-button';
    coreButton.type = 'button';
    coreButton.hidden = true;
    coreButton.setAttribute('aria-label', 'DEB protokolunu tetikle');
    coreButton.innerHTML = '<span>DEB</span>';

    const chip = document.createElement('div');
    chip.id = 'nova-status-chip';
    chip.className = 'nova-status-chip';
    chip.hidden = true;
    chip.textContent = 'deb / dormant';

    document.body.append(layer, coreButton, chip);

    const context = canvas.getContext('2d');
    const consoleLine = document.getElementById('console-line');
    const microOracle = document.getElementById('micro-oracle');
    const hudRoute = document.getElementById('hud-route');

    const saved = (() => {
      try {
        return JSON.parse(localStorage.getItem(stateKey) || localStorage.getItem(legacyStateKey) || '{}');
      } catch (error) {
        return {};
      }
    })();

    const state = {
      active: false,
      mode: 'orbit',
      actionIndex: 0,
      x: Number(saved.x) || window.innerWidth * 0.72,
      y: Number(saved.y) || window.innerHeight * 0.28,
      vx: 0,
      vy: 0,
      targetX: window.innerWidth * 0.72,
      targetY: window.innerHeight * 0.28,
      pointerX: window.innerWidth * 0.72,
      pointerY: window.innerHeight * 0.28,
      pointerSeen: false,
      modeUntil: 0,
      nextImpulse: performance.now() + 3600,
      lastRoute: 'ORIGIN',
      last: 0,
      raf: 0,
      energy: 0.62,
      phase: Math.random() * Math.PI * 2,
      sequence: null,
      particles: [],
      shards: Array.from({ length: 9 }, (_, index) => ({
        angle: (Math.PI * 2 * index) / 9,
        distance: rand(26, 58),
        size: rand(3, 7),
        spin: rand(-0.0024, 0.0024),
        hue: index % 3
      })),
      echoes: []
    };

    const palette = {
      green: '#00ff66',
      cyan: '#00eaff',
      pink: '#ff2ea6',
      amber: '#f5ff6b',
      text: '#c9ffd6'
    };

    const resize = () => {
      const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const persist = () => {
      localStorage.setItem(stateKey, JSON.stringify({
        x: Math.round(state.x),
        y: Math.round(state.y),
        mode: state.mode
      }));
      localStorage.removeItem(legacyStateKey);
    };

    const dispatch = () => {
      window.dispatchEvent(new CustomEvent('deb:state', { detail: api.getState() }));
      window.dispatchEvent(new CustomEvent('nova:state', { detail: api.getState() }));
      window.dispatchEvent(new CustomEvent('bugy:state', { detail: api.getState() }));
    };

    const visiblePanels = () => [...document.querySelectorAll('.site-header, .command-deck, .journey-gate, .site-footer')]
      .map(element => ({ element, rect: element.getBoundingClientRect() }))
      .filter(item => item.rect.width > 160 && item.rect.height > 72 && item.rect.bottom > 60 && item.rect.top < window.innerHeight - 42);

    const activePanel = () => {
      const panels = visiblePanels();
      if (!panels.length) return null;
      return panels
        .map(item => ({
          ...item,
          score: Math.abs((item.rect.top + item.rect.height / 2) - window.innerHeight * 0.44)
        }))
        .sort((a, b) => a.score - b.score)[0];
    };

    const commandShellRect = () => {
      const shell = document.getElementById('command-shell');
      return shell?.classList.contains('is-open') ? shell.getBoundingClientRect() : null;
    };

    const safePoint = (x, y) => {
      const shell = commandShellRect();
      let nextX = clamp(x, 36, window.innerWidth - 36);
      let nextY = clamp(y, 42, window.innerHeight - 48);
      if (shell && nextY > shell.top - 44 && nextX > shell.left - 40 && nextX < shell.right + 40) {
        nextY = shell.top - 58;
      }
      return { x: nextX, y: nextY };
    };

    const setTarget = (x, y) => {
      const point = safePoint(x, y);
      state.targetX = point.x;
      state.targetY = point.y;
    };

    const choosePanelTarget = () => {
      const panel = activePanel();
      if (!panel) {
        setTarget(window.innerWidth * 0.68, window.innerHeight * 0.32);
        return;
      }
      const side = panel.rect.left > 86 ? 'left' : 'right';
      const x = side === 'left' ? panel.rect.left - 34 : panel.rect.right + 34;
      const y = clamp(panel.rect.top + 42 + Math.sin(state.phase) * 24, 54, window.innerHeight - 72);
      setTarget(x, y);
    };

    const setStatus = (line) => {
      chip.textContent = line;
      if (microOracle) microOracle.textContent = line.replace(/^(deb|nova)\s*\/\s*/i, '').slice(0, 42);
    };

    const pushParticle = (x, y, color, life = 720, speed = 1) => {
      state.particles.push({
        x,
        y,
        vx: rand(-0.24, 0.24) * speed,
        vy: rand(-0.24, 0.24) * speed,
        life,
        maxLife: life,
        color,
        size: rand(1.2, 3.8)
      });
    };

    const pushEcho = (label, x = state.x, y = state.y) => {
      state.echoes.push({
        label,
        x,
        y,
        life: 1100,
        maxLife: 1100
      });
    };

    const v3ScreenTarget = (v3) => ({
      engine: 'v3',
      x: 18 + ((Number(v3.x) || 120) / 320) * Math.max(1, window.innerWidth - 92),
      y: window.innerHeight - 82 + (((Number(v3.y) || 136) - 136) * 0.62),
      restore: { wasActive: true }
    });

    const isUsableBugyElement = (element) => {
      if (!element || element.hidden) return false;
      const rect = element.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return false;
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) <= 0.05) return false;
      return true;
    };

    const domBugyTarget = (selector, engine) => {
      const element = document.querySelector(selector);
      if (!isUsableBugyElement(element)) return null;
      const rect = element.getBoundingClientRect();
      return {
        engine,
        element,
        ashClass: engine === 'v2' ? 'is-v2-ashed' : 'is-ashed',
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        rect,
        restore: {
          opacity: element.style.opacity,
          filter: element.style.filter,
          transform: element.style.transform,
          visibility: element.style.visibility,
          ariaHidden: element.getAttribute('aria-hidden')
        }
      };
    };

    const findBugyTarget = () => {
      const v3 = window.BugyV3?.getState?.();
      if (v3?.active) return v3ScreenTarget(v3);

      const v2 = window.BugyV2?.getState?.();
      if (v2?.active) {
        const target = domBugyTarget('#bugy-v2-actor, .bugy-v2-actor', 'v2');
        if (target) return target;
      }

      const classic = domBugyTarget('#neon-sheep', 'classic');
      if (classic) return classic;

      window.Bugy?.summon?.();
      const fallback = domBugyTarget('#neon-sheep', 'classic');
      if (fallback) return fallback;

      return {
        engine: 'virtual',
        x: window.innerWidth * 0.5,
        y: window.innerHeight - 82,
        restore: {}
      };
    };

    const setBugyHidden = (target, hidden = true) => {
      if (target.engine === 'v3') {
        if (hidden) window.BugyV3?.deactivate?.();
        else window.BugyV3?.activate?.();
        return;
      }
      if (!target.element) return;
      target.element.style.opacity = hidden ? '0' : target.restore.opacity || '';
      target.element.style.visibility = hidden ? 'hidden' : target.restore.visibility || '';
      if (hidden) target.element.setAttribute('aria-hidden', 'true');
      else if (target.restore.ariaHidden === null) target.element.removeAttribute('aria-hidden');
      else target.element.setAttribute('aria-hidden', target.restore.ariaHidden);
    };

    const setBugyAsh = (target, ash = true) => {
      if (!target.element) return;
      target.element.classList.toggle(target.ashClass || 'is-ashed', ash);
      target.element.style.filter = ash
        ? 'grayscale(1) brightness(0.48) drop-shadow(0 0 16px rgba(245, 255, 107, 0.42))'
        : target.restore.filter || '';
    };

    const restoreBugy = (target) => {
      if (!target) return;
      if (target.engine === 'v3') {
        if (target.restore.wasActive) window.BugyV3?.activate?.();
        return;
      }
      if (!target.element) return;
      target.element.classList.remove('is-ashed', 'is-v2-ashed');
      target.element.style.opacity = target.restore.opacity || '';
      target.element.style.filter = target.restore.filter || '';
      target.element.style.transform = target.restore.transform || '';
      target.element.style.visibility = target.restore.visibility || '';
      if (target.restore.ariaHidden === null) target.element.removeAttribute('aria-hidden');
      else target.element.setAttribute('aria-hidden', target.restore.ariaHidden);
    };

    const burst = (x, y, count, colors, speed = 2, life = 900) => {
      for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count + rand(-0.18, 0.18);
        const velocity = rand(0.18, 0.72) * speed;
        state.particles.push({
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: rand(life * 0.48, life),
          maxLife: life,
          color: colors[index % colors.length],
          size: rand(1.5, 5.6)
        });
      }
    };

    const startInteraction = (type) => {
      const now = performance.now();
      if (state.sequence) restoreBugy(state.sequence.target);
      const target = findBugyTarget();
      state.sequence = {
        type,
        start: now,
        duration: type === 'blackhole' ? 4300 : type === 'deathstar' ? 3400 : 3000,
        target,
        impactDone: false,
        hideDone: false,
        restoreDone: false,
        ashDone: false,
        fromX: type === 'deathstar' ? clamp(target.x + 240, 88, window.innerWidth - 92) : clamp(target.x - 360, 52, window.innerWidth - 52),
        fromY: type === 'meteor' ? -90 : clamp(target.y - 190, 56, window.innerHeight * 0.42),
        stationX: clamp(target.x + 260, 96, window.innerWidth - 96),
        stationY: clamp(target.y - 230, 72, window.innerHeight * 0.42),
        shipX: -120,
        shipY: clamp(target.y - 160, 64, window.innerHeight * 0.45)
      };
      state.mode = type;
      state.modeUntil = now + state.sequence.duration;
      state.energy = 1;
      state.x = state.sequence.fromX;
      state.y = state.sequence.fromY;
      setStatus(`deb / ${type}`);
      if (consoleLine) consoleLine.textContent = actionLines[type];
      pushEcho(type.toUpperCase(), target.x, target.y - 54);
      dispatch();
      return true;
    };

    const triggerMode = (mode, forced = false) => {
      if (interactionActions.has(mode)) return startInteraction(mode);
      if (!forced && ['rift', 'bloom', 'mirror', 'scan'].includes(state.mode)) return false;
      state.mode = mode;
      state.modeUntil = performance.now() + (mode === 'sleep' ? 2600 : mode === 'perch' ? 1900 : 2300);
      state.energy = mode === 'sleep' ? 0.28 : 1;
      const line = actionLines[mode] || `deb ${mode}`;
      setStatus(`deb / ${mode}`);
      if (consoleLine) consoleLine.textContent = line;
      pushEcho(mode.toUpperCase());

      const colors = [palette.cyan, palette.green, palette.pink, palette.amber];
      for (let index = 0; index < 44; index += 1) {
        pushParticle(state.x, state.y, colors[index % colors.length], rand(520, 1120), mode === 'rift' ? 2.4 : 1.4);
      }

      if (mode === 'scan') choosePanelTarget();
      if (mode === 'perch') {
        const panel = activePanel();
        if (panel) setTarget(panel.rect.right - 28, panel.rect.top + 28);
      }
      if (mode === 'mirror' && state.pointerSeen) setTarget(state.pointerX, state.pointerY);
      if (mode === 'sleep') setTarget(window.innerWidth - 78, window.innerHeight - 82);

      dispatch();
      return true;
    };

    const updateTargets = (now) => {
      if (state.sequence) return;
      const route = hudRoute?.textContent || 'ORIGIN';
      if (route !== state.lastRoute) {
        state.lastRoute = route;
        state.energy = 1;
        triggerMode('scan', true);
        pushEcho(route);
      }

      if (state.modeUntil && now > state.modeUntil) {
        state.mode = state.energy < 0.42 ? 'drift' : 'orbit';
        state.modeUntil = 0;
        setStatus(`deb / ${state.mode}`);
      }

      if (state.mode === 'orbit') {
        if (state.pointerSeen) {
          const dx = state.pointerX - state.x;
          const dy = state.pointerY - state.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 260) {
            setTarget(state.pointerX + Math.cos(state.phase) * 72, state.pointerY + Math.sin(state.phase * 0.8) * 48);
            return;
          }
        }
        choosePanelTarget();
      } else if (state.mode === 'drift') {
        setTarget(window.innerWidth - 86, window.innerHeight - 92);
      } else if (state.mode === 'rift') {
        setTarget(window.innerWidth * 0.5 + Math.sin(state.phase * 2) * 180, window.innerHeight * 0.42 + Math.cos(state.phase * 1.7) * 130);
      } else if (state.mode === 'bloom') {
        const notes = document.getElementById('notes')?.getBoundingClientRect();
        if (notes) setTarget(notes.left + notes.width * 0.78, clamp(notes.top + 80, 64, window.innerHeight - 92));
      }
    };

    const updatePhysics = (dt) => {
      if (state.sequence) return;
      const pull = state.mode === 'sleep' ? 0.012 : state.mode === 'rift' ? 0.032 : 0.022;
      state.vx = ease(state.vx, (state.targetX - state.x) * pull, 0.08);
      state.vy = ease(state.vy, (state.targetY - state.y) * pull, 0.08);
      state.x += state.vx * dt * 0.06;
      state.y += state.vy * dt * 0.06;
      const safe = safePoint(state.x, state.y);
      state.x = safe.x;
      state.y = safe.y;
      state.energy = clamp(state.energy - dt * 0.000035, 0.34, 1);
    };

    const updateSequence = (now) => {
      if (!state.sequence) return;
      const sequence = state.sequence;
      const target = sequence.target;
      const progress = clamp((now - sequence.start) / sequence.duration, 0, 1);

      if (sequence.type === 'meteor') {
        const impactPoint = 0.62;
        if (progress < impactPoint) {
          const p = progress / impactPoint;
          const curve = p * p;
          state.x = ease(sequence.fromX, target.x, curve);
          state.y = ease(sequence.fromY, target.y, curve);
          burst(state.x - state.vx * 4, state.y - state.vy * 4, 2, [palette.amber, '#ff5a1f', palette.pink], 0.75, 420);
        } else {
          state.x = target.x;
          state.y = target.y;
          if (!sequence.impactDone) {
            sequence.impactDone = true;
            setBugyAsh(target, true);
            burst(target.x, target.y, 92, [palette.amber, '#ff6b1a', palette.pink, palette.cyan], 3.2, 1300);
            pushEcho('IMPACT', target.x + 18, target.y - 48);
            if (consoleLine) consoleLine.textContent = 'deb meteor impact: bugy blast radius reached';
          }
        }
      } else if (sequence.type === 'blackhole') {
        state.x = ease(sequence.fromX, target.x, clamp(progress * 2.1, 0, 1));
        state.y = ease(sequence.fromY, target.y - 18, clamp(progress * 2.1, 0, 1));
        if (progress > 0.28 && !sequence.hideDone) {
          sequence.hideDone = true;
          setBugyHidden(target, true);
          burst(target.x, target.y, 70, [palette.cyan, palette.pink, '#050505', palette.green], 2.4, 1500);
          if (consoleLine) consoleLine.textContent = 'event horizon swallowed bugy';
        }
        if (progress > 0.68) {
          sequence.shipX = ease(sequence.shipX, target.x - 34, 0.045);
          sequence.shipY = ease(sequence.shipY, target.y - 92, 0.035);
        }
        if (progress > 0.82 && !sequence.restoreDone) {
          sequence.restoreDone = true;
          setBugyHidden(target, false);
          burst(target.x, target.y - 18, 58, [palette.green, palette.cyan, palette.amber], 1.8, 980);
          pushEcho('RE-ENTRY', target.x + 22, target.y - 68);
          if (consoleLine) consoleLine.textContent = 'bugy returned by deb shuttle';
        }
      } else if (sequence.type === 'deathstar') {
        state.x = ease(state.x, sequence.stationX, 0.08);
        state.y = ease(state.y, sequence.stationY, 0.08);
        if (progress > 0.44 && progress < 0.62) {
          burst(target.x, target.y, 3, [palette.pink, palette.amber, palette.cyan], 1.2, 520);
        }
        if (progress > 0.54 && !sequence.ashDone) {
          sequence.ashDone = true;
          setBugyAsh(target, true);
          burst(target.x, target.y, 64, [palette.amber, '#d8d8d8', palette.pink], 2.1, 1200);
          pushEcho('ASHED', target.x + 18, target.y - 44);
          if (consoleLine) consoleLine.textContent = 'deb deathstar beam converted bugy to ash';
        }
      }

      if (progress >= 1) {
        restoreBugy(target);
        state.sequence = null;
        state.mode = 'orbit';
        state.modeUntil = 0;
        state.energy = 0.84;
        setTarget(target.x + 86, target.y - 96);
        setStatus('deb / orbit');
        dispatch();
      }
    };

    const updateParticles = (dt) => {
      state.particles = state.particles.filter(particle => {
        particle.life -= dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= 0.992;
        particle.vy *= 0.992;
        return particle.life > 0;
      }).slice(-180);

      state.echoes = state.echoes.filter(echo => {
        echo.life -= dt;
        echo.y -= dt * 0.018;
        return echo.life > 0;
      });

      if (performance.now() > state.nextImpulse) {
        state.nextImpulse = performance.now() + rand(420, 900);
        pushParticle(state.x, state.y, [palette.cyan, palette.green, palette.pink][Math.floor(Math.random() * 3)], 620, 0.8);
      }
    };

    const drawDiamond = (x, y, radius, stroke, fill, alpha = 1, rotation = 0) => {
      context.save();
      context.globalAlpha = alpha;
      context.translate(Math.round(x), Math.round(y));
      context.rotate(rotation);
      context.beginPath();
      context.moveTo(0, -radius);
      context.lineTo(radius, 0);
      context.lineTo(0, radius);
      context.lineTo(-radius, 0);
      context.closePath();
      if (fill) {
        context.fillStyle = fill;
        context.fill();
      }
      context.strokeStyle = stroke;
      context.lineWidth = 1;
      context.stroke();
      context.restore();
    };

    const drawPanelLinks = () => {
      const panels = visiblePanels().slice(0, 5);
      context.save();
      context.lineWidth = 1;
      panels.forEach((item, index) => {
        const anchorX = clamp(item.rect.left + item.rect.width * (index % 2 ? 0.24 : 0.76), 0, window.innerWidth);
        const anchorY = clamp(item.rect.top + item.rect.height * 0.18, 0, window.innerHeight);
        const distance = Math.hypot(anchorX - state.x, anchorY - state.y);
        const alpha = clamp(1 - distance / 520, 0, 0.34);
        if (alpha <= 0.02) return;
        context.globalAlpha = alpha;
        context.strokeStyle = index % 2 ? palette.green : palette.cyan;
        context.beginPath();
        context.moveTo(state.x, state.y);
        context.lineTo(anchorX, anchorY);
        context.stroke();
        drawDiamond(anchorX, anchorY, 4, palette.amber, 'rgba(0,0,0,0.3)', alpha);
      });
      context.restore();
    };

    const drawParticles = () => {
      state.particles.forEach(particle => {
        const alpha = clamp(particle.life / particle.maxLife, 0, 1);
        context.save();
        context.globalAlpha = alpha * 0.86;
        context.fillStyle = particle.color;
        context.shadowColor = particle.color;
        context.shadowBlur = 8;
        context.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);
        context.restore();
      });
    };

    const drawEchoes = () => {
      context.save();
      context.font = '12px "Share Tech Mono", monospace';
      context.textBaseline = 'middle';
      state.echoes.forEach(echo => {
        const alpha = clamp(echo.life / echo.maxLife, 0, 1);
        context.globalAlpha = alpha;
        context.fillStyle = palette.cyan;
        context.shadowColor = palette.cyan;
        context.shadowBlur = 10;
        context.fillText(echo.label, Math.round(echo.x + 22), Math.round(echo.y - 22));
      });
      context.restore();
    };

    const drawImpactRings = (x, y, progress, colors, maxRadius = 190) => {
      context.save();
      context.globalCompositeOperation = 'lighter';
      colors.forEach((color, index) => {
        const offset = index * 0.16;
        const p = clamp((progress - offset) / (1 - offset), 0, 1);
        if (!p) return;
        context.globalAlpha = (1 - p) * 0.72;
        context.strokeStyle = color;
        context.lineWidth = 2 + index;
        context.beginPath();
        context.arc(x, y, 18 + p * maxRadius, 0, Math.PI * 2);
        context.stroke();
      });
      context.restore();
    };

    const drawMeteorSequence = (sequence, progress) => {
      const impactPoint = 0.62;
      const p = clamp(progress / impactPoint, 0, 1);
      const tailX = sequence.fromX + (state.x - sequence.fromX) * 0.34;
      const tailY = sequence.fromY + (state.y - sequence.fromY) * 0.34;

      context.save();
      context.globalCompositeOperation = 'lighter';

      if (progress < impactPoint) {
        const trail = context.createLinearGradient(tailX, tailY, state.x, state.y);
        trail.addColorStop(0, 'rgba(255, 46, 166, 0)');
        trail.addColorStop(0.42, 'rgba(245, 255, 107, 0.34)');
        trail.addColorStop(1, 'rgba(255, 90, 31, 0.9)');
        context.strokeStyle = trail;
        context.lineWidth = 14 + p * 14;
        context.lineCap = 'round';
        context.shadowColor = '#ff5a1f';
        context.shadowBlur = 28;
        context.beginPath();
        context.moveTo(tailX, tailY);
        context.lineTo(state.x, state.y);
        context.stroke();

        context.save();
        context.translate(state.x, state.y);
        context.rotate(Math.atan2(state.y - tailY, state.x - tailX));
        const fire = context.createRadialGradient(0, 0, 2, 0, 0, 42);
        fire.addColorStop(0, '#f5ff6b');
        fire.addColorStop(0.36, '#ff6b1a');
        fire.addColorStop(1, 'rgba(255, 46, 166, 0)');
        context.fillStyle = fire;
        context.beginPath();
        context.ellipse(0, 0, 42, 24, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#1b1010';
        context.strokeStyle = palette.amber;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(20, 0);
        context.lineTo(4, 16);
        context.lineTo(-18, 8);
        context.lineTo(-22, -10);
        context.lineTo(5, -17);
        context.closePath();
        context.fill();
        context.stroke();
        context.restore();
      } else {
        const blast = clamp((progress - impactPoint) / (1 - impactPoint), 0, 1);
        const flash = context.createRadialGradient(sequence.target.x, sequence.target.y, 4, sequence.target.x, sequence.target.y, 170);
        flash.addColorStop(0, `rgba(245, 255, 107, ${0.72 * (1 - blast)})`);
        flash.addColorStop(0.32, `rgba(255, 90, 31, ${0.38 * (1 - blast)})`);
        flash.addColorStop(1, 'rgba(255, 46, 166, 0)');
        context.fillStyle = flash;
        context.beginPath();
        context.arc(sequence.target.x, sequence.target.y, 170, 0, Math.PI * 2);
        context.fill();
        drawImpactRings(sequence.target.x, sequence.target.y, blast, [palette.amber, '#ff5a1f', palette.pink], 230);
      }

      context.restore();
    };

    const drawShuttle = (x, y, progress) => {
      context.save();
      context.translate(x, y + Math.sin(state.phase * 6) * 2);
      context.globalCompositeOperation = 'lighter';
      context.shadowColor = palette.cyan;
      context.shadowBlur = 16;
      context.fillStyle = 'rgba(0, 18, 18, 0.86)';
      context.strokeStyle = palette.cyan;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(38, 0);
      context.lineTo(7, 18);
      context.lineTo(-34, 10);
      context.lineTo(-46, 0);
      context.lineTo(-34, -10);
      context.lineTo(7, -18);
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = palette.green;
      context.fillRect(-12, -4, 24, 8);
      context.strokeStyle = palette.amber;
      context.beginPath();
      context.moveTo(-42, 0);
      context.lineTo(-64 - Math.sin(state.phase * 12) * 8, -8);
      context.moveTo(-42, 0);
      context.lineTo(-64 - Math.cos(state.phase * 10) * 8, 8);
      context.stroke();
      if (progress > 0.78 && progress < 0.94) {
        const alpha = Math.sin(clamp((progress - 0.78) / 0.16, 0, 1) * Math.PI);
        context.globalAlpha = alpha * 0.72;
        context.strokeStyle = palette.green;
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(0, 18);
        context.lineTo(34, 94);
        context.stroke();
      }
      context.restore();
    };

    const drawBlackholeSequence = (sequence, progress) => {
      const radius = 26 + Math.sin(state.phase * 5) * 3 + clamp(progress * 2, 0, 1) * 28;
      context.save();
      context.globalCompositeOperation = 'lighter';

      for (let ring = 0; ring < 5; ring += 1) {
        context.save();
        context.translate(state.x, state.y);
        context.rotate(state.phase * (ring % 2 ? -0.72 : 0.92) + ring);
        context.globalAlpha = 0.42 - ring * 0.045;
        context.strokeStyle = ring % 2 ? palette.pink : palette.cyan;
        context.lineWidth = ring === 0 ? 4 : 1.5;
        context.beginPath();
        context.ellipse(0, 0, radius + ring * 14, radius * 0.34 + ring * 6, 0, 0, Math.PI * 2);
        context.stroke();
        context.restore();
      }

      const gravity = context.createRadialGradient(state.x, state.y, radius * 0.18, state.x, state.y, radius * 2.2);
      gravity.addColorStop(0, '#000');
      gravity.addColorStop(0.38, 'rgba(0, 0, 0, 0.96)');
      gravity.addColorStop(0.64, 'rgba(0, 234, 255, 0.24)');
      gravity.addColorStop(1, 'rgba(255, 46, 166, 0)');
      context.fillStyle = gravity;
      context.beginPath();
      context.arc(state.x, state.y, radius * 2.2, 0, Math.PI * 2);
      context.fill();

      if (progress < 0.52) {
        context.strokeStyle = palette.cyan;
        context.lineWidth = 1;
        for (let strand = 0; strand < 12; strand += 1) {
          const angle = strand * 0.52 + state.phase * 1.8;
          const pull = 18 + strand * 3;
          context.globalAlpha = 0.12 + strand * 0.025;
          context.beginPath();
          context.moveTo(sequence.target.x + Math.cos(angle) * pull, sequence.target.y + Math.sin(angle) * pull);
          context.quadraticCurveTo(
            (sequence.target.x + state.x) / 2 + Math.sin(angle) * 38,
            (sequence.target.y + state.y) / 2 + Math.cos(angle) * 32,
            state.x,
            state.y
          );
          context.stroke();
        }
      }

      if (progress > 0.68) {
        drawShuttle(sequence.shipX, sequence.shipY, progress);
        if (progress > 0.78 && progress < 0.94) {
          const beam = context.createLinearGradient(sequence.shipX, sequence.shipY, sequence.target.x, sequence.target.y);
          beam.addColorStop(0, 'rgba(0, 255, 102, 0.06)');
          beam.addColorStop(0.5, 'rgba(0, 234, 255, 0.42)');
          beam.addColorStop(1, 'rgba(245, 255, 107, 0.12)');
          context.globalAlpha = 0.9;
          context.strokeStyle = beam;
          context.lineWidth = 18;
          context.beginPath();
          context.moveTo(sequence.shipX, sequence.shipY + 18);
          context.lineTo(sequence.target.x, sequence.target.y - 10);
          context.stroke();
        }
      }

      context.restore();
    };

    const drawDeathstarSequence = (sequence, progress) => {
      const x = state.x;
      const y = state.y;
      const radius = 46;
      context.save();
      context.globalCompositeOperation = 'lighter';

      const sphere = context.createRadialGradient(x - 18, y - 18, 4, x, y, radius);
      sphere.addColorStop(0, '#f2fff8');
      sphere.addColorStop(0.34, '#6f8588');
      sphere.addColorStop(0.74, '#1a2c31');
      sphere.addColorStop(1, '#030708');
      context.fillStyle = sphere;
      context.shadowColor = palette.cyan;
      context.shadowBlur = 18;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();

      context.shadowBlur = 0;
      context.strokeStyle = 'rgba(201, 255, 214, 0.34)';
      context.lineWidth = 1;
      for (let line = -22; line <= 22; line += 11) {
        context.beginPath();
        context.moveTo(x - 34, y + line);
        context.lineTo(x + 34, y + line * 0.6);
        context.stroke();
      }
      context.strokeStyle = palette.amber;
      context.beginPath();
      context.arc(x - 16, y - 12, 15, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = 'rgba(245, 255, 107, 0.46)';
      context.beginPath();
      context.arc(x - 16, y - 12, 5 + Math.sin(state.phase * 8) * 2, 0, Math.PI * 2);
      context.fill();

      if (progress > 0.28 && progress < 0.44) {
        const charge = clamp((progress - 0.28) / 0.16, 0, 1);
        context.strokeStyle = palette.green;
        context.lineWidth = 2;
        for (let ray = 0; ray < 8; ray += 1) {
          const angle = (Math.PI * 2 * ray) / 8 + state.phase;
          context.globalAlpha = charge * 0.74;
          context.beginPath();
          context.moveTo(x - 16 + Math.cos(angle) * 30, y - 12 + Math.sin(angle) * 30);
          context.lineTo(x - 16, y - 12);
          context.stroke();
        }
      }

      if (progress >= 0.44 && progress <= 0.66) {
        const beamPulse = Math.sin(clamp((progress - 0.44) / 0.22, 0, 1) * Math.PI);
        const beam = context.createLinearGradient(x - 16, y - 12, sequence.target.x, sequence.target.y);
        beam.addColorStop(0, palette.green);
        beam.addColorStop(0.58, palette.cyan);
        beam.addColorStop(1, palette.pink);
        context.globalAlpha = 0.35 + beamPulse * 0.55;
        context.strokeStyle = beam;
        context.lineCap = 'round';
        context.lineWidth = 8 + beamPulse * 8;
        context.shadowColor = palette.green;
        context.shadowBlur = 24;
        context.beginPath();
        context.moveTo(x - 16, y - 12);
        context.lineTo(sequence.target.x, sequence.target.y);
        context.stroke();
        context.lineWidth = 2;
        context.strokeStyle = palette.amber;
        context.beginPath();
        context.moveTo(x - 16, y - 12);
        context.lineTo(sequence.target.x, sequence.target.y);
        context.stroke();
      }

      if (progress > 0.54) {
        const ash = clamp((progress - 0.54) / 0.46, 0, 1);
        drawImpactRings(sequence.target.x, sequence.target.y, ash, [palette.cyan, '#d8d8d8', palette.amber], 132);
      }

      context.restore();
    };

    const drawInteraction = () => {
      if (!state.sequence) return;
      const progress = clamp((performance.now() - state.sequence.start) / state.sequence.duration, 0, 1);
      if (state.sequence.type === 'meteor') drawMeteorSequence(state.sequence, progress);
      if (state.sequence.type === 'blackhole') drawBlackholeSequence(state.sequence, progress);
      if (state.sequence.type === 'deathstar') drawDeathstarSequence(state.sequence, progress);
    };

    const drawNova = () => {
      const t = state.phase;
      const pulse = 1 + Math.sin(t * 2.7) * 0.08;
      const modeColor = state.mode === 'rift'
        ? palette.pink
        : state.mode === 'bloom'
          ? palette.green
          : state.mode === 'sleep'
            ? palette.amber
            : palette.cyan;

      context.save();
      context.globalCompositeOperation = 'lighter';

      drawPanelLinks();

      state.shards.forEach((shard, index) => {
        shard.angle += shard.spin * 16;
        const distance = shard.distance * (state.mode === 'rift' ? 1.45 : 1) + Math.sin(t * 1.8 + index) * 6;
        const x = state.x + Math.cos(shard.angle + t * 0.34) * distance;
        const y = state.y + Math.sin(shard.angle + t * 0.28) * distance * 0.68;
        const color = shard.hue === 0 ? palette.cyan : shard.hue === 1 ? palette.green : palette.pink;
        drawDiamond(x, y, shard.size, color, 'rgba(0, 0, 0, 0.22)', 0.72, t + index);
      });

      context.save();
      context.globalAlpha = 0.22 + state.energy * 0.14;
      context.strokeStyle = modeColor;
      context.lineWidth = 1;
      for (let ring = 0; ring < 3; ring += 1) {
        context.beginPath();
        context.ellipse(
          Math.round(state.x),
          Math.round(state.y),
          (32 + ring * 17) * pulse,
          (14 + ring * 9) * pulse,
          t * (ring % 2 ? -0.35 : 0.35),
          0,
          Math.PI * 2
        );
        context.stroke();
      }
      context.restore();

      drawDiamond(state.x, state.y, 18 * pulse, palette.text, 'rgba(0, 18, 18, 0.76)', 1, t * 0.52);
      drawDiamond(state.x, state.y, 10 * pulse, modeColor, 'rgba(0, 234, 255, 0.12)', 1, -t * 0.86);

      context.save();
      context.globalAlpha = 0.86;
      context.fillStyle = palette.amber;
      context.shadowColor = palette.amber;
      context.shadowBlur = 12;
      context.fillRect(Math.round(state.x - 8), Math.round(state.y - 1), 16, 2);
      context.restore();

      if (state.mode === 'scan') {
        context.save();
        context.globalAlpha = 0.28;
        context.strokeStyle = palette.green;
        context.beginPath();
        context.arc(state.x, state.y, 78 + Math.sin(t * 4) * 14, 0, Math.PI * 2);
        context.stroke();
        context.restore();
      }

      if (state.mode === 'mirror' && state.pointerSeen) {
        drawDiamond(state.pointerX, state.pointerY, 12, palette.pink, 'rgba(255, 46, 166, 0.08)', 0.55, -t);
      }

      context.restore();
    };

    const render = () => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      drawParticles();
      drawInteraction();
      if (!state.sequence) drawNova();
      drawEchoes();
      coreButton.style.setProperty('--nova-x', `${Math.round(state.x)}px`);
      coreButton.style.setProperty('--nova-y', `${Math.round(state.y)}px`);
      chip.style.setProperty('--nova-x', `${Math.round(state.x)}px`);
      chip.style.setProperty('--nova-y', `${Math.round(state.y)}px`);
    };

    const loop = now => {
      if (!state.active) return;
      const dt = Math.min(42, state.last ? now - state.last : 16);
      state.last = now;
      state.phase += dt * 0.0016;
      updateSequence(now);
      updateTargets(now);
      updatePhysics(dt);
      updateParticles(dt);
      render();
      state.raf = requestAnimationFrame(loop);
    };

    const syncVisibility = () => {
      layer.hidden = !state.active;
      coreButton.hidden = !state.active;
      chip.hidden = !state.active;
      document.body.classList.toggle('nova-active', state.active);
    };

    const api = {
      version: '1.0.0',
      actions: [...actions],
      activate() {
        state.active = true;
        state.mode = 'orbit';
        state.last = 0;
        localStorage.setItem(activeKey, '1');
        localStorage.removeItem(legacyActiveKey);
        syncVisibility();
        resize();
        choosePanelTarget();
        setStatus('deb / online');
        if (consoleLine) consoleLine.textContent = 'deb companion online';
        cancelAnimationFrame(state.raf);
        state.raf = requestAnimationFrame(loop);
        dispatch();
        return true;
      },
      deactivate() {
        if (state.sequence) {
          restoreBugy(state.sequence.target);
          state.sequence = null;
        }
        state.active = false;
        cancelAnimationFrame(state.raf);
        syncVisibility();
        context.clearRect(0, 0, window.innerWidth, window.innerHeight);
        localStorage.removeItem(activeKey);
        localStorage.removeItem(legacyActiveKey);
        persist();
        dispatch();
        return true;
      },
      summon() {
        if (!state.active) this.activate();
        state.x = window.innerWidth * 0.64;
        state.y = window.innerHeight * 0.3;
        triggerMode('scan', true);
        return true;
      },
      trigger(action = 'scan') {
        if (!state.active) this.activate();
        return triggerMode(actions.includes(action) ? action : 'scan', true);
      },
      next() {
        const action = actions[state.actionIndex % actions.length];
        state.actionIndex += 1;
        return this.trigger(action);
      },
      getState() {
        return {
          engine: 'deb',
          version: this.version,
          active: state.active,
          state: state.mode,
          randomEnabled: true,
          x: Math.round(state.x),
          y: Math.round(state.y),
          actions: [...actions]
        };
      }
    };

    window.addEventListener('pointermove', event => {
      state.pointerSeen = true;
      state.pointerX = event.clientX;
      state.pointerY = event.clientY;
    }, { passive: true });

    window.addEventListener('resize', () => {
      resize();
      setTarget(state.targetX, state.targetY);
      render();
    }, { passive: true });

    window.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !state.active) return;
      api.deactivate();
      window.Bugy?.summon?.();
    });

    coreButton.addEventListener('click', () => api.next());
    coreButton.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      api.next();
    });

    resize();
    window.DebCompanion = api;
    window.NovaCompanion = api;
    if (localStorage.getItem(activeKey) === '1' || localStorage.getItem(legacyActiveKey) === '1') api.activate();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
