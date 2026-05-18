(() => {
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const createLayer = () => {
    if (document.getElementById('neon-sheep')) return;

    const ufo = document.createElement('div');
    ufo.className = 'neon-ufo';
    ufo.id = 'neon-ufo';
    ufo.setAttribute('aria-hidden', 'true');
    ufo.innerHTML = [
      '<span class="neon-ufo__dome"></span>',
      '<span class="neon-ufo__hull"></span>',
      '<span class="neon-ufo__beam"></span>'
    ].join('');

    const sheep = document.createElement('div');
    sheep.className = 'neon-sheep';
    sheep.id = 'neon-sheep';
    sheep.dataset.state = 'walk';
    sheep.setAttribute('aria-hidden', 'true');
    sheep.innerHTML = [
      '<span class="neon-sheep__tail"></span>',
      '<span class="neon-sheep__body"></span>',
      '<span class="neon-sheep__head"></span>',
      '<span class="neon-sheep__ear"></span>',
      '<span class="neon-sheep__leg"></span>',
      '<span class="neon-sheep__leg"></span>',
      '<span class="neon-sheep__leg"></span>',
      '<span class="neon-sheep__leg"></span>',
      '<span class="neon-sheep__eye"></span>'
    ].join('');

    document.body.append(ufo, sheep);
  };

  const startNeonSheep = () => {
    if (prefersReducedMotion()) return;
    createLayer();

    const neonSheep = document.getElementById('neon-sheep');
    const neonUfo = document.getElementById('neon-ufo');
    const consoleLine = document.getElementById('console-line');
    const microOracle = document.getElementById('micro-oracle');
    if (!neonSheep || !neonUfo) return;

    const sheep = {
      x: Math.min(180, window.innerWidth - 90),
      y: 0,
      vx: 0.06,
      vy: 0,
      face: 1,
      state: 'walk',
      until: 0,
      target: null,
      last: performance.now(),
      abductAt: performance.now() + 18000 + Math.random() * 13000,
      ufo: {
        x: -160,
        y: 60,
        phase: 'idle',
        until: 0
      }
    };

    const petWidth = 58;
    const petHeight = 42;
    const rand = (min, max) => min + Math.random() * (max - min);
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const groundY = () => window.innerHeight - petHeight - (window.innerWidth < 720 ? 18 : 28);
    const setState = (state) => {
      sheep.state = state;
      neonSheep.dataset.state = state;
    };
    const render = () => {
      neonSheep.style.setProperty('--pet-x', `${Math.round(sheep.x)}px`);
      neonSheep.style.setProperty('--pet-y', `${Math.round(sheep.y)}px`);
      neonSheep.style.setProperty('--pet-face', String(sheep.face));
      neonUfo.style.setProperty('--ufo-x', `${Math.round(sheep.ufo.x)}px`);
      neonUfo.style.setProperty('--ufo-y', `${Math.round(sheep.ufo.y)}px`);
    };
    const visibleFrames = () => [...document.querySelectorAll('.site-header, .command-deck, .journey-gate, .site-footer')]
      .map(element => element.getBoundingClientRect())
      .filter(rect => rect.width > 160 && rect.height > 56 && rect.bottom > 72 && rect.top < window.innerHeight - 48);

    const startWalk = (now) => {
      setState('walk');
      sheep.target = null;
      sheep.vy = 0;
      sheep.y = groundY();
      sheep.vx = rand(0.045, 0.095) * (Math.random() > 0.5 ? 1 : -1);
      sheep.face = sheep.vx >= 0 ? 1 : -1;
      sheep.until = now + rand(2200, 5600);
    };

    const startNap = (now) => {
      setState('nap');
      sheep.vx = 0;
      sheep.vy = 0;
      sheep.y = groundY();
      sheep.until = now + rand(1600, 3400);
    };

    const startFall = () => {
      setState('fall');
      sheep.target = null;
      sheep.vx = rand(0.015, 0.04) * sheep.face;
      sheep.vy = rand(0.05, 0.12);
    };

    const startClimb = (now) => {
      const frames = visibleFrames();
      if (!frames.length) {
        startWalk(now);
        return;
      }

      const rect = frames[Math.floor(Math.random() * frames.length)];
      const side = Math.random() > 0.5 ? 'left' : 'right';
      const x = side === 'left'
        ? clamp(rect.left - petWidth + 12, 8, window.innerWidth - petWidth - 8)
        : clamp(rect.right - 10, 8, window.innerWidth - petWidth - 8);
      const bottom = clamp(rect.bottom - petHeight + 6, 54, groundY());
      const top = clamp(rect.top + 8, 22, bottom - 72);

      setState('climb');
      sheep.target = {
        phase: 'approach',
        x,
        bottom,
        top,
        side
      };
      sheep.face = x >= sheep.x ? 1 : -1;
      sheep.until = now + 7600;
    };

    const startAbduction = (now) => {
      setState('abduct');
      sheep.target = null;
      sheep.vx = 0;
      sheep.vy = 0;
      sheep.y = groundY();
      sheep.ufo.phase = 'approach';
      sheep.ufo.x = -150;
      sheep.ufo.y = clamp(sheep.y - 142, 30, window.innerHeight * 0.42);
      sheep.ufo.until = now + 980;
      neonUfo.classList.add('is-active');
      neonUfo.classList.remove('is-beaming');
      if (consoleLine) consoleLine.textContent = 'tiny signal intercepted';
    };

    const chooseNext = (now) => {
      if (now > sheep.abductAt) {
        startAbduction(now);
        sheep.abductAt = now + 28000 + Math.random() * 24000;
        return;
      }

      const roll = Math.random();
      if (roll < 0.2) startNap(now);
      else if (roll < 0.54) startClimb(now);
      else startWalk(now);
    };

    const updateUfo = (now, dt) => {
      const petCenter = sheep.x + petWidth / 2;
      const desiredX = clamp(petCenter - 58, 8, window.innerWidth - 124);

      if (sheep.ufo.phase === 'approach') {
        sheep.ufo.x += (desiredX - sheep.ufo.x) * Math.min(1, dt / 520);
        if (Math.abs(sheep.ufo.x - desiredX) < 2 || now > sheep.ufo.until) {
          sheep.ufo.x = desiredX;
          sheep.ufo.phase = 'beam';
          sheep.ufo.until = now + 850;
          neonUfo.classList.add('is-beaming');
        }
        return;
      }

      if (sheep.ufo.phase === 'beam') {
        if (now > sheep.ufo.until) {
          sheep.ufo.phase = 'lift';
          sheep.ufo.until = now + 1450;
        }
        return;
      }

      if (sheep.ufo.phase === 'lift') {
        sheep.y -= dt * 0.12;
        sheep.x += (desiredX + 31 - sheep.x) * Math.min(1, dt / 360);
        if (now > sheep.ufo.until || sheep.y < sheep.ufo.y + 34) {
          neonSheep.setAttribute('aria-hidden', 'true');
          neonUfo.classList.remove('is-beaming');
          sheep.ufo.phase = 'exit';
          sheep.ufo.until = now + 980;
          if (microOracle) microOracle.textContent = 'pet temporarily archived';
        }
        return;
      }

      if (sheep.ufo.phase === 'exit') {
        sheep.ufo.x += dt * 0.36;
        sheep.ufo.y -= dt * 0.08;
        if (now > sheep.ufo.until || sheep.ufo.x > window.innerWidth + 140) {
          neonUfo.classList.remove('is-active');
          neonSheep.removeAttribute('aria-hidden');
          sheep.x = clamp(rand(40, window.innerWidth - 90), 8, window.innerWidth - petWidth - 8);
          sheep.y = -petHeight - 12;
          sheep.face = Math.random() > 0.5 ? 1 : -1;
          startFall();
          if (consoleLine) consoleLine.textContent = 'pet re-entry detected';
        }
      }
    };

    const tick = (now) => {
      const dt = Math.min(now - sheep.last, 34);
      sheep.last = now;

      if (sheep.state === 'walk') {
        sheep.x += sheep.vx * dt;
        sheep.y = groundY();
        if (sheep.x < 8 || sheep.x > window.innerWidth - petWidth - 8) {
          sheep.x = clamp(sheep.x, 8, window.innerWidth - petWidth - 8);
          sheep.vx *= -1;
          sheep.face *= -1;
        }
        if (now > sheep.until) chooseNext(now);
      } else if (sheep.state === 'nap') {
        sheep.y = groundY();
        if (now > sheep.until) startWalk(now);
      } else if (sheep.state === 'climb' && sheep.target) {
        const target = sheep.target;
        if (target.phase === 'approach') {
          const dx = target.x - sheep.x;
          sheep.face = dx >= 0 ? 1 : -1;
          sheep.x += Math.sign(dx) * Math.min(Math.abs(dx), dt * 0.11);
          sheep.y += (target.bottom - sheep.y) * Math.min(1, dt / 380);
          if (Math.abs(dx) < 2) target.phase = 'climb';
        } else {
          sheep.x = target.x;
          sheep.face = target.side === 'left' ? 1 : -1;
          sheep.y -= dt * 0.07;
          if (sheep.y <= target.top || now > sheep.until) startFall();
        }
      } else if (sheep.state === 'fall') {
        sheep.vy += dt * 0.0009;
        sheep.x += sheep.vx * dt;
        sheep.y += sheep.vy * dt;
        sheep.x = clamp(sheep.x, 8, window.innerWidth - petWidth - 8);
        if (sheep.y >= groundY()) {
          sheep.y = groundY();
          startWalk(now);
        }
      } else if (sheep.state === 'abduct') {
        updateUfo(now, dt);
      }

      render();
      requestAnimationFrame(tick);
    };

    window.addEventListener('resize', () => {
      sheep.x = clamp(sheep.x, 8, window.innerWidth - petWidth - 8);
      if (sheep.state !== 'climb' && sheep.state !== 'fall' && sheep.state !== 'abduct') {
        sheep.y = groundY();
      }
      render();
    }, { passive: true });

    neonSheep.removeAttribute('aria-hidden');
    startWalk(performance.now());
    render();
    requestAnimationFrame(tick);
  };

  const boot = () => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startNeonSheep, { once: true });
      return;
    }
    startNeonSheep();
  };

  boot();
})();
