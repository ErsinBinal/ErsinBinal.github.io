(() => {
  'use strict';

  const engineKey = 'convivium.bugy.engine';
  const stateKey = 'convivium.nova.state';
  const actions = ['scan', 'rift', 'bloom', 'mirror', 'perch', 'sleep'];
  const actionLines = {
    scan: 'nova scan: active panels mapped',
    rift: 'nova rift: route memory folded',
    bloom: 'nova bloom: field notes charged',
    mirror: 'nova mirror: cursor shadow copied',
    perch: 'nova perch: nearest gate selected',
    sleep: 'nova sleep: signal dimmed'
  };

  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const rand = (min, max) => min + Math.random() * (max - min);
  const ease = (current, target, factor) => current + (target - current) * factor;

  const boot = () => {
    if (window.NovaCompanion || prefersReducedMotion()) return;

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
    coreButton.setAttribute('aria-label', 'NOVA protokolunu tetikle');
    coreButton.innerHTML = '<span>NOVA</span>';

    const chip = document.createElement('div');
    chip.id = 'nova-status-chip';
    chip.className = 'nova-status-chip';
    chip.hidden = true;
    chip.textContent = 'nova / dormant';

    document.body.append(layer, coreButton, chip);

    const context = canvas.getContext('2d');
    const consoleLine = document.getElementById('console-line');
    const microOracle = document.getElementById('micro-oracle');
    const hudRoute = document.getElementById('hud-route');

    const saved = (() => {
      try {
        return JSON.parse(localStorage.getItem(stateKey) || '{}');
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
    };

    const dispatch = () => {
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
      if (microOracle) microOracle.textContent = line.replace(/^nova\s*\/\s*/i, '').slice(0, 42);
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

    const triggerMode = (mode, forced = false) => {
      if (!forced && ['rift', 'bloom', 'mirror', 'scan'].includes(state.mode)) return false;
      state.mode = mode;
      state.modeUntil = performance.now() + (mode === 'sleep' ? 2600 : mode === 'perch' ? 1900 : 2300);
      state.energy = mode === 'sleep' ? 0.28 : 1;
      const line = actionLines[mode] || `nova ${mode}`;
      setStatus(`nova / ${mode}`);
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
        setStatus(`nova / ${state.mode}`);
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
      drawNova();
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

    const deactivateLegacy = () => {
      window.BugyV2?.deactivate?.();
      window.BugyV3?.deactivate?.();
    };

    const api = {
      version: '1.0.0',
      actions: [...actions],
      activate() {
        deactivateLegacy();
        state.active = true;
        state.mode = 'orbit';
        state.last = 0;
        localStorage.setItem(engineKey, 'nova');
        syncVisibility();
        resize();
        choosePanelTarget();
        setStatus('nova / online');
        if (consoleLine) consoleLine.textContent = 'nova companion online';
        cancelAnimationFrame(state.raf);
        state.raf = requestAnimationFrame(loop);
        dispatch();
        return true;
      },
      deactivate() {
        state.active = false;
        cancelAnimationFrame(state.raf);
        syncVisibility();
        context.clearRect(0, 0, window.innerWidth, window.innerHeight);
        if (localStorage.getItem(engineKey) === 'nova') localStorage.setItem(engineKey, 'v1');
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
          engine: 'nova',
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
    window.NovaCompanion = api;
    if (localStorage.getItem(engineKey) === 'nova') api.activate();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
