(() => {
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDebugSurface = () => document.body.classList.contains('bugy-debug') || Boolean(document.querySelector('.bugy-admin-panel'));

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

    const storm = document.createElement('div');
    storm.className = 'neon-storm';
    storm.id = 'neon-storm';
    storm.setAttribute('aria-hidden', 'true');
    storm.innerHTML = [
      '<span class="neon-storm__cloud"></span>',
      '<span class="neon-storm__rain"></span>',
      '<span class="neon-storm__lightning"></span>'
    ].join('');

    const tornado = document.createElement('div');
    tornado.className = 'neon-tornado';
    tornado.id = 'neon-tornado';
    tornado.setAttribute('aria-hidden', 'true');
    tornado.innerHTML = [
      '<span></span>',
      '<span></span>',
      '<span></span>',
      '<span></span>'
    ].join('');

    const portal = document.createElement('div');
    portal.className = 'neon-portal';
    portal.id = 'neon-portal';
    portal.setAttribute('aria-hidden', 'true');

    const sheep = document.createElement('div');
    sheep.className = 'neon-sheep';
    sheep.id = 'neon-sheep';
    sheep.dataset.state = 'walk';
    sheep.setAttribute('aria-hidden', 'true');
    sheep.setAttribute('aria-label', 'bugy aksiyon tetikle');
    sheep.setAttribute('role', 'button');
    sheep.tabIndex = 0;
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

    document.body.append(storm, tornado, portal, ufo, sheep);
  };

  const startNeonSheep = () => {
    if (prefersReducedMotion() && !isDebugSurface()) return;
    createLayer();

    const neonSheep = document.getElementById('neon-sheep');
    const neonUfo = document.getElementById('neon-ufo');
    const neonStorm = document.getElementById('neon-storm');
    const neonTornado = document.getElementById('neon-tornado');
    const neonPortal = document.getElementById('neon-portal');
    const consoleLine = document.getElementById('console-line');
    const microOracle = document.getElementById('micro-oracle');
    if (!neonSheep || !neonUfo || !neonStorm || !neonTornado || !neonPortal) return;

    const sheep = {
      x: Math.min(180, window.innerWidth - 90),
      y: 0,
      vx: 0.06,
      vy: 0,
      face: 1,
      state: 'walk',
      until: 0,
      target: null,
      encounterAt: performance.now() + 22000 + Math.random() * 16000,
      effect: {
        type: null,
        phase: null,
        start: 0,
        until: 0,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        angle: 0,
        nextX: 0
      },
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
    const clickEncounters = ['storm', 'tornado', 'portal', 'clone', 'gravity'];
    const randomEncounters = ['storm', 'tornado', 'portal', 'clone', 'gravity'];
    const lockedStates = new Set(['abduct', 'storm', 'tornado', 'portal', 'clone', 'gravity']);
    const airborneStates = new Set(['climb', 'fall', 'abduct', 'storm', 'tornado', 'portal', 'gravity']);
    let clickEncounterIndex = 0;
    let randomEncountersEnabled = true;
    const rand = (min, max) => min + Math.random() * (max - min);
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const groundY = () => window.innerHeight - petHeight - (window.innerWidth < 720 ? 18 : 28);
    const scheduleEncounter = (now) => {
      sheep.encounterAt = now + rand(24000, 46000);
    };
    const setState = (state) => {
      sheep.state = state;
      neonSheep.dataset.state = state;
      window.dispatchEvent(new CustomEvent('bugy:state', {
        detail: {
          state,
          randomEnabled: randomEncountersEnabled
        }
      }));
    };
    const clearEffects = () => {
      neonStorm.classList.remove('is-active', 'is-raining', 'is-lightning');
      neonTornado.classList.remove('is-active');
      neonPortal.classList.remove('is-active');
      neonUfo.classList.remove('is-active', 'is-beaming');
      neonSheep.classList.remove('is-ashed', 'is-shocked', 'is-cloning');
      neonSheep.removeAttribute('aria-hidden');
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
      clearEffects();
      setState('walk');
      sheep.target = null;
      sheep.vy = 0;
      sheep.y = groundY();
      sheep.vx = rand(0.045, 0.095) * (Math.random() > 0.5 ? 1 : -1);
      sheep.face = sheep.vx >= 0 ? 1 : -1;
      sheep.until = now + rand(2200, 5600);
    };

    const startNap = (now) => {
      clearEffects();
      setState('nap');
      sheep.vx = 0;
      sheep.vy = 0;
      sheep.y = groundY();
      sheep.until = now + rand(1600, 3400);
    };

    const startFall = () => {
      clearEffects();
      setState('fall');
      sheep.target = null;
      sheep.vx = rand(0.015, 0.04) * sheep.face;
      sheep.vy = rand(0.05, 0.12);
    };

    const startClimb = (now) => {
      clearEffects();
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
      clearEffects();
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
      if (consoleLine) consoleLine.textContent = 'bugy signal intercepted';
    };

    const startStorm = (now) => {
      clearEffects();
      setState('storm');
      sheep.target = null;
      sheep.vx = 0;
      sheep.vy = 0;
      sheep.y = groundY();
      sheep.effect = {
        ...sheep.effect,
        type: 'storm',
        phase: 'cloud',
        start: now,
        until: now + 760,
        x: clamp(sheep.x - 28, 8, window.innerWidth - 112),
        y: clamp(sheep.y - 118, 24, window.innerHeight * 0.54)
      };
      neonStorm.style.setProperty('--storm-x', `${Math.round(sheep.effect.x)}px`);
      neonStorm.style.setProperty('--storm-y', `${Math.round(sheep.effect.y)}px`);
      neonStorm.classList.add('is-active');
      if (consoleLine) consoleLine.textContent = 'storm cell tracking bugy';
    };

    const startTornado = (now) => {
      clearEffects();
      setState('tornado');
      sheep.target = null;
      sheep.vx = 0;
      sheep.vy = 0;
      sheep.y = groundY();
      sheep.effect = {
        ...sheep.effect,
        type: 'tornado',
        phase: 'spin',
        start: now,
        until: now + 1900,
        x: clamp(sheep.x + petWidth / 2 - 36, 10, window.innerWidth - 84),
        y: groundY() - 50,
        vx: 0,
        vy: 0,
        angle: 0
      };
      neonTornado.style.setProperty('--tornado-x', `${Math.round(sheep.effect.x)}px`);
      neonTornado.style.setProperty('--tornado-y', `${Math.round(sheep.effect.y)}px`);
      neonTornado.classList.add('is-active');
      if (consoleLine) consoleLine.textContent = 'tornado protocol caught bugy';
    };

    const startPortal = (now) => {
      clearEffects();
      setState('portal');
      sheep.target = null;
      sheep.vx = 0;
      sheep.vy = 0;
      sheep.y = groundY();
      sheep.effect = {
        ...sheep.effect,
        type: 'portal',
        phase: 'sink',
        start: now,
        until: now + 820,
        x: clamp(sheep.x + petWidth / 2 - 42, 8, window.innerWidth - 92),
        y: groundY() + 30,
        nextX: clamp(rand(38, window.innerWidth - 96), 8, window.innerWidth - petWidth - 8)
      };
      neonPortal.style.setProperty('--portal-x', `${Math.round(sheep.effect.x)}px`);
      neonPortal.style.setProperty('--portal-y', `${Math.round(sheep.effect.y)}px`);
      neonPortal.classList.add('is-active');
      if (consoleLine) consoleLine.textContent = 'bugy found a portal';
    };

    const startClone = (now) => {
      clearEffects();
      setState('clone');
      sheep.target = null;
      sheep.vx = 0;
      sheep.vy = 0;
      sheep.y = groundY();
      sheep.effect = {
        ...sheep.effect,
        type: 'clone',
        phase: 'glitch',
        start: now,
        until: now + 1800,
        x: sheep.x,
        y: sheep.y
      };
      neonSheep.classList.add('is-cloning');
      if (microOracle) microOracle.textContent = 'bugy has duplicate shadows';
    };

    const startGravity = (now) => {
      clearEffects();
      setState('gravity');
      sheep.target = null;
      sheep.vx = rand(0.035, 0.075) * (Math.random() > 0.5 ? 1 : -1);
      sheep.vy = -rand(0.18, 0.28);
      sheep.effect = {
        ...sheep.effect,
        type: 'gravity',
        phase: 'float',
        start: now,
        until: now + 2600
      };
      if (consoleLine) consoleLine.textContent = 'low gravity around bugy';
    };

    const startEncounter = (type, now, forced = false) => {
      if (!forced && lockedStates.has(sheep.state)) return false;
      scheduleEncounter(now);
      if (type === 'storm') startStorm(now);
      else if (type === 'tornado') startTornado(now);
      else if (type === 'portal') startPortal(now);
      else if (type === 'clone') startClone(now);
      else if (type === 'gravity') startGravity(now);
      else return false;
      return true;
    };

    const chooseNext = (now) => {
      if (now > sheep.abductAt) {
        startAbduction(now);
        sheep.abductAt = now + 28000 + Math.random() * 24000;
        return;
      }

      if (randomEncountersEnabled && now > sheep.encounterAt) {
        startEncounter(randomEncounters[Math.floor(Math.random() * randomEncounters.length)], now);
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
          if (microOracle) microOracle.textContent = 'bugy temporarily archived';
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
          if (consoleLine) consoleLine.textContent = 'bugy re-entry detected';
        }
      }
    };

    const updateStorm = (now) => {
      const effect = sheep.effect;
      sheep.y = groundY();
      neonStorm.style.setProperty('--storm-x', `${Math.round(effect.x)}px`);
      neonStorm.style.setProperty('--storm-y', `${Math.round(effect.y)}px`);

      if (effect.phase === 'cloud' && now > effect.until) {
        effect.phase = 'rain';
        effect.until = now + 1200;
        neonStorm.classList.add('is-raining');
        if (microOracle) microOracle.textContent = 'bugy rain test started';
        return;
      }

      if (effect.phase === 'rain' && now > effect.until) {
        effect.phase = 'lightning';
        effect.until = now + 430;
        neonStorm.classList.remove('is-raining');
        neonStorm.classList.add('is-lightning');
        neonSheep.classList.add('is-shocked');
        if (consoleLine) consoleLine.textContent = 'lightning strike on bugy';
        return;
      }

      if (effect.phase === 'lightning' && now > effect.until) {
        effect.phase = 'ash';
        effect.until = now + 1500;
        neonStorm.classList.remove('is-active', 'is-lightning');
        neonSheep.classList.remove('is-shocked');
        neonSheep.classList.add('is-ashed');
        if (microOracle) microOracle.textContent = 'bugy ash recovery running';
        return;
      }

      if (effect.phase === 'ash' && now > effect.until) {
        startWalk(now);
      }
    };

    const updateTornado = (now, dt) => {
      const effect = sheep.effect;
      if (effect.phase === 'spin') {
        const elapsed = now - effect.start;
        const radius = Math.min(44, 12 + elapsed * 0.018);
        effect.angle += dt * 0.026;
        sheep.x = clamp(effect.x + 36 + Math.cos(effect.angle) * radius - petWidth / 2, 8, window.innerWidth - petWidth - 8);
        sheep.y = clamp(groundY() - 22 - Math.abs(Math.sin(effect.angle)) * 58 - elapsed * 0.012, 18, groundY());
        sheep.face = Math.sin(effect.angle) > 0 ? 1 : -1;
        if (now > effect.until) {
          effect.phase = 'throw';
          effect.vx = rand(0.22, 0.36) * (Math.random() > 0.5 ? 1 : -1);
          effect.vy = -rand(0.44, 0.58);
          effect.until = now + 2600;
          neonTornado.classList.remove('is-active');
          if (consoleLine) consoleLine.textContent = 'bugy launched by tornado';
        }
        return;
      }

      if (effect.phase === 'throw') {
        effect.vy += dt * 0.001;
        sheep.x = clamp(sheep.x + effect.vx * dt, 8, window.innerWidth - petWidth - 8);
        sheep.y += effect.vy * dt;
        sheep.face = effect.vx >= 0 ? 1 : -1;
        if (sheep.y >= groundY() || now > effect.until) {
          sheep.y = groundY();
          startWalk(now);
        }
      }
    };

    const updatePortal = (now, dt) => {
      const effect = sheep.effect;
      if (effect.phase === 'sink') {
        sheep.y += dt * 0.06;
        if (now > effect.until) {
          effect.phase = 'travel';
          effect.until = now + 540;
          neonSheep.setAttribute('aria-hidden', 'true');
          effect.x = clamp(effect.nextX + petWidth / 2 - 42, 8, window.innerWidth - 92);
          neonPortal.style.setProperty('--portal-x', `${Math.round(effect.x)}px`);
          if (microOracle) microOracle.textContent = 'bugy routed through portal';
        }
        return;
      }

      if (effect.phase === 'travel' && now > effect.until) {
        effect.phase = 'rise';
        effect.until = now + 860;
        neonSheep.removeAttribute('aria-hidden');
        sheep.x = effect.nextX;
        sheep.y = groundY() + 52;
        return;
      }

      if (effect.phase === 'rise') {
        sheep.y += (groundY() - sheep.y) * Math.min(1, dt / 260);
        if (now > effect.until || Math.abs(sheep.y - groundY()) < 1) {
          sheep.y = groundY();
          startWalk(now);
        }
      }
    };

    const updateClone = (now) => {
      const elapsed = now - sheep.effect.start;
      sheep.y = groundY();
      sheep.x = clamp(sheep.effect.x + Math.sin(elapsed / 42) * 4, 8, window.innerWidth - petWidth - 8);
      sheep.face = Math.sin(elapsed / 140) > 0 ? 1 : -1;
      if (now > sheep.effect.until) startWalk(now);
    };

    const updateGravity = (now, dt) => {
      sheep.vy += dt * 0.00023;
      sheep.x = clamp(sheep.x + sheep.vx * dt, 8, window.innerWidth - petWidth - 8);
      sheep.y += sheep.vy * dt;
      if (sheep.x <= 8 || sheep.x >= window.innerWidth - petWidth - 8) sheep.vx *= -1;
      if (sheep.y > groundY()) {
        sheep.y = groundY();
        sheep.vy = -Math.abs(sheep.vy) * 0.52;
      }
      sheep.face = sheep.vx >= 0 ? 1 : -1;
      if (now > sheep.effect.until && Math.abs(sheep.y - groundY()) < 1) startWalk(now);
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
      } else if (sheep.state === 'storm') {
        updateStorm(now);
      } else if (sheep.state === 'tornado') {
        updateTornado(now, dt);
      } else if (sheep.state === 'portal') {
        updatePortal(now, dt);
      } else if (sheep.state === 'clone') {
        updateClone(now);
      } else if (sheep.state === 'gravity') {
        updateGravity(now, dt);
      }

      render();
      requestAnimationFrame(tick);
    };

    window.addEventListener('resize', () => {
      sheep.x = clamp(sheep.x, 8, window.innerWidth - petWidth - 8);
      if (!airborneStates.has(sheep.state)) {
        sheep.y = groundY();
      }
      render();
    }, { passive: true });

    const triggerClickEncounter = () => {
      if (lockedStates.has(sheep.state)) return;
      const now = performance.now();
      const type = clickEncounters[clickEncounterIndex % clickEncounters.length];
      clickEncounterIndex += 1;
      startEncounter(type, now, true);
    };

    neonSheep.addEventListener('click', triggerClickEncounter);
    neonSheep.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      triggerClickEncounter();
    });

    window.Bugy = {
      actions: ['storm', 'tornado', 'portal', 'clone', 'gravity', 'abduct'],
      trigger(type) {
        const now = performance.now();
        if (type === 'abduct') {
          scheduleEncounter(now);
          startAbduction(now);
          return true;
        }
        return startEncounter(type, now, true);
      },
      next() {
        const type = clickEncounters[clickEncounterIndex % clickEncounters.length];
        clickEncounterIndex += 1;
        return this.trigger(type);
      },
      summon() {
        const now = performance.now();
        clearEffects();
        sheep.x = clamp(window.innerWidth / 2 - petWidth / 2, 8, window.innerWidth - petWidth - 8);
        sheep.y = groundY();
        sheep.face = 1;
        scheduleEncounter(now);
        startWalk(now);
        render();
        return true;
      },
      setRandom(enabled) {
        randomEncountersEnabled = Boolean(enabled);
        scheduleEncounter(performance.now());
        window.dispatchEvent(new CustomEvent('bugy:state', {
          detail: {
            state: sheep.state,
            randomEnabled: randomEncountersEnabled
          }
        }));
        return randomEncountersEnabled;
      },
      getState() {
        return {
          state: sheep.state,
          randomEnabled: randomEncountersEnabled,
          x: Math.round(sheep.x),
          y: Math.round(sheep.y)
        };
      }
    };

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
