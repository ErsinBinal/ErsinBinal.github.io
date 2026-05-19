(() => {
  'use strict';

  const engineKey = 'convivium.bugy.engine';
  const skinKey = 'convivium.bugy.v2.skin';
  const skins = {
    classic: { label: 'Klasik Neon', model: 'mascot', palette: 'neon' },
    matrix: { label: 'Matrix Drone', model: 'mech', palette: 'gameboy' },
    ember: { label: 'Ember Runner', model: 'runner', palette: 'famicom' },
    ghost: { label: 'Ghost Wisp', model: 'wisp', palette: 'mono' },
    royal: { label: 'Royal Boss', model: 'boss', palette: 'neogeo' }
  };
  const actions = ['storm', 'tornado', 'portal', 'clone', 'gravity', 'abduct'];
  const lockedStates = new Set(actions);

  const boot = () => {
    const kit = window.ConviviumArcadeKit;
    if (!kit || window.BugyV2) return;

    const layer = document.createElement('div');
    layer.id = 'bugy-v2-layer';
    layer.className = 'bugy-v2-layer';
    layer.hidden = true;
    document.body.appendChild(layer);

    const stage = kit.createStage({
      mount: layer,
      palette: 'neon',
      className: 'bugy-v2-stage',
      minHeight: window.innerHeight
    });
    const hardenOverlay = () => {
      Object.assign(stage.el.style, {
        background: 'transparent',
        border: '0',
        boxShadow: 'none',
        outline: '0',
        pointerEvents: 'none'
      });
      layer.style.pointerEvents = 'none';
    };
    hardenOverlay();
    const scene = kit.createScene({
      stage,
      fps: 30,
      update: (_, dt) => update(dt)
    });

    const actor = scene.actor({
      id: 'bugy-v2-actor',
      type: 'bugy-v2',
      model: 'mascot',
      pose: 'idle',
      x: 120,
      y: 120,
      scale: 1.08,
      hitbox: { x: 7, y: 5, w: 28, h: 45 },
      tags: ['bugy', 'actor']
    });

    actor.el.classList.add('bugy-v2-actor');
    actor.el.setAttribute('role', 'button');
    actor.el.tabIndex = 0;
    actor.el.setAttribute('aria-label', 'Bugy V2 aksiyon tetikle');

    const state = {
      active: false,
      state: 'idle',
      skin: skins[localStorage.getItem(skinKey)] ? localStorage.getItem(skinKey) : 'classic',
      randomEnabled: true,
      nextAction: 0,
      encounterAt: performance.now() + 14000,
      gravityUntil: 0,
      vx: 0.065,
      vy: 0,
      face: 1
    };

    const rand = (min, max) => min + Math.random() * (max - min);
    const groundY = () => window.innerHeight - 74;
    const clampX = x => kit.clamp(x, 12, window.innerWidth - 70);
    const dispatch = () => {
      window.dispatchEvent(new CustomEvent('bugy:state', { detail: api.getState() }));
      window.dispatchEvent(new CustomEvent('bugy-v2:state', { detail: api.getState() }));
    };
    const setState = next => {
      state.state = next;
      actor.el.dataset.v2State = next;
      dispatch();
    };
    const scheduleRandom = () => {
      state.encounterAt = performance.now() + rand(16000, 30000);
    };
    const syncVisibility = () => {
      layer.hidden = !state.active;
      document.body.classList.toggle('bugy-v2-active', state.active);
      document.body.classList.toggle('bugy-v1-muted', state.active);
    };
    const applySkin = skin => {
      const nextSkin = skins[skin] ? skin : 'classic';
      const spec = skins[nextSkin];
      state.skin = nextSkin;
      localStorage.setItem(skinKey, nextSkin);
      stage.setPalette(spec.palette);
      hardenOverlay();
      actor.model(spec.model);
      actor.el.dataset.skin = nextSkin;
      dispatch();
      return nextSkin;
    };
    const clearV2Effects = () => {
      stage.el.querySelectorAll('.bugy-v2-ufo, .bugy-v2-clone, .arcade-effect').forEach(node => node.remove());
      actor.el.classList.remove('is-v2-cloning', 'is-v2-ashed', 'is-v2-abducted');
      actor.el.removeAttribute('aria-hidden');
    };
    const resetWalk = () => {
      clearV2Effects();
      setState('walk');
      state.vx = rand(0.048, 0.086) * (Math.random() > 0.5 ? 1 : -1);
      state.vy = 0;
      state.face = state.vx >= 0 ? 1 : -1;
      actor.moveTo(clampX(actor.x), groundY()).face(state.face).pose('walk');
      scheduleRandom();
    };
    const startAction = action => {
      clearV2Effects();
      state.vx = 0;
      state.vy = 0;
      setState(action);
      actor.pose('cast');
      scheduleRandom();
    };

    function update(dt) {
      if (!state.active) return;
      if (state.state === 'walk') {
        actor.moveBy(state.vx * dt, 0).pose('walk');
        if (actor.x <= 12 || actor.x >= window.innerWidth - 70) {
          state.vx *= -1;
          state.face *= -1;
          actor.face(state.face);
        }
        actor.moveTo(clampX(actor.x), groundY());
        if (state.randomEnabled && performance.now() > state.encounterAt) {
          api.trigger(actions[Math.floor(Math.random() * actions.length)]);
        }
      } else if (state.state === 'gravity') {
        state.vy += dt * 0.00022;
        actor.moveBy(state.vx * dt, state.vy * dt);
        if (actor.x <= 12 || actor.x >= window.innerWidth - 70) {
          state.vx *= -1;
          actor.face(state.vx >= 0 ? 1 : -1);
        }
        if (actor.y > groundY()) {
          actor.moveTo(actor.x, groundY());
          state.vy = -Math.abs(state.vy) * 0.62;
        }
        if (performance.now() > state.gravityUntil && Math.abs(actor.y - groundY()) < 2) resetWalk();
      }
    }

    const runStorm = () => {
      startAction('storm');
      const x = actor.x - 18;
      const y = Math.max(22, actor.y - 118);
      return kit.timeline({ tail: 250 })
        .at(80, () => kit.fx.rain(stage, { x, y, w: 96, h: 92, duration: 980 }))
        .at(620, () => actor.pose('hit'))
        .at(680, () => kit.fx.lightning(stage, { x: actor.x + 16, y: y + 16, w: 46, h: 106 }))
        .at(1040, () => actor.el.classList.add('is-v2-ashed'))
        .at(1580, resetWalk)
        .play();
    };

    const runTornado = () => {
      startAction('tornado');
      const tornadoX = clampX(actor.x - 22);
      kit.fx.tornado(stage, { x: tornadoX, y: actor.y - 52, w: 86, h: 126, duration: 1450 });
      return kit.timeline({ tail: 200 })
        .at(120, () => actor.pose('jump'))
        .tween(actor, { x: clampX(actor.x + 62), y: actor.y - 82 }, 520, { at: 220 })
        .tween(actor, { x: clampX(actor.x - 84), y: actor.y - 42 }, 520, { at: 760 })
        .tween(actor, { x: clampX(actor.x + 34), y: groundY() }, 460, { at: 1280 })
        .at(1800, resetWalk)
        .play();
    };

    const runPortal = () => {
      startAction('portal');
      const fromX = actor.x;
      const toX = clampX(rand(34, window.innerWidth - 92));
      return kit.timeline({ tail: 250 })
        .at(0, () => kit.fx.portal(stage, { x: fromX - 10, y: actor.y + 22, w: 76, h: 36, duration: 860 }))
        .at(360, () => actor.el.setAttribute('aria-hidden', 'true'))
        .at(720, () => actor.moveTo(toX, groundY()))
        .at(740, () => kit.fx.portal(stage, { x: toX - 10, y: actor.y + 22, w: 76, h: 36, duration: 860 }))
        .at(1050, () => actor.el.removeAttribute('aria-hidden'))
        .at(1400, resetWalk)
        .play();
    };

    const runClone = () => {
      startAction('clone');
      actor.el.classList.add('is-v2-cloning');
      for (let index = 0; index < 3; index += 1) {
        const clone = actor.el.cloneNode(true);
        clone.removeAttribute('id');
        clone.classList.add('bugy-v2-clone');
        clone.style.setProperty('--clone-offset', `${(index - 1) * 18}px`);
        stage.el.appendChild(clone);
        window.setTimeout(() => clone.remove(), 1100);
      }
      return kit.timeline({ tail: 180 })
        .at(160, () => kit.fx.burst(stage, { x: actor.x + 22, y: actor.y + 22, count: 26 }))
        .at(1180, resetWalk)
        .play();
    };

    const runGravity = () => {
      clearV2Effects();
      setState('gravity');
      actor.pose('jump');
      state.vx = rand(0.042, 0.08) * (Math.random() > 0.5 ? 1 : -1);
      state.vy = -rand(0.24, 0.34);
      state.gravityUntil = performance.now() + 2600;
      kit.fx.popup(stage, 'LOW G', { x: actor.x - 2, y: actor.y - 24 });
      kit.fx.burst(stage, { x: actor.x + 22, y: actor.y + 42, count: 18, distance: 34 });
      scheduleRandom();
      return true;
    };

    const runAbduct = () => {
      startAction('abduct');
      const ufo = document.createElement('div');
      ufo.className = 'bugy-v2-ufo';
      ufo.innerHTML = '<span></span><span></span><span></span>';
      stage.el.appendChild(ufo);
      const ufoX = clampX(actor.x - 44);
      ufo.style.setProperty('--ufo-x', `${ufoX}px`);
      ufo.style.setProperty('--ufo-y', `${Math.max(26, actor.y - 148)}px`);
      return kit.timeline({ tail: 240 })
        .at(220, () => ufo.classList.add('is-beaming'))
        .tween(actor, { x: ufoX + 54, y: Math.max(48, actor.y - 94) }, 920, { at: 420 })
        .at(1200, () => actor.el.classList.add('is-v2-abducted'))
        .at(1480, () => actor.el.setAttribute('aria-hidden', 'true'))
        .at(1900, () => {
          ufo.remove();
          actor.el.removeAttribute('aria-hidden');
          actor.el.classList.remove('is-v2-abducted');
          actor.moveTo(clampX(rand(34, window.innerWidth - 92)), -52);
        })
        .tween(actor, { y: groundY() }, 720, { at: 1960 })
        .at(2760, resetWalk)
        .play();
    };

    const triggerNext = () => {
      if (lockedStates.has(state.state)) return false;
      const action = actions[state.nextAction % actions.length];
      state.nextAction += 1;
      return api.trigger(action);
    };

    const api = {
      version: '2.0.0',
      actions: [...actions],
      activate() {
        state.active = true;
        localStorage.setItem(engineKey, 'v2');
        syncVisibility();
        scene.start();
        applySkin(state.skin);
        resetWalk();
        return true;
      },
      deactivate() {
        state.active = false;
        syncVisibility();
        clearV2Effects();
        scene.stop();
        return true;
      },
      summon() {
        if (!state.active) this.activate();
        actor.moveTo(clampX(window.innerWidth / 2 - 24), groundY()).face(1);
        resetWalk();
        return true;
      },
      trigger(action) {
        if (!state.active) this.activate();
        if (lockedStates.has(state.state)) return false;
        if (action === 'storm') runStorm();
        else if (action === 'tornado') runTornado();
        else if (action === 'portal') runPortal();
        else if (action === 'clone') runClone();
        else if (action === 'gravity') runGravity();
        else if (action === 'abduct') runAbduct();
        else return false;
        return true;
      },
      next: triggerNext,
      setRandom(enabled) {
        state.randomEnabled = Boolean(enabled);
        scheduleRandom();
        dispatch();
        return state.randomEnabled;
      },
      setSkin: applySkin,
      getState() {
        return {
          engine: 'v2',
          version: this.version,
          active: state.active,
          state: state.state,
          skin: state.skin,
          skins: Object.keys(skins),
          randomEnabled: state.randomEnabled,
          x: Math.round(actor.x),
          y: Math.round(actor.y)
        };
      }
    };

    actor.el.addEventListener('click', triggerNext);
    actor.el.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      triggerNext();
    });
    window.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !state.active) return;
      api.deactivate();
      if (localStorage.getItem(engineKey) === 'v2') localStorage.setItem(engineKey, 'v1');
    });
    window.addEventListener('resize', () => {
      stage.el.style.minHeight = `${window.innerHeight}px`;
      actor.moveTo(clampX(actor.x), groundY());
    }, { passive: true });

    applySkin(state.skin);
    window.BugyV2 = api;
    if (localStorage.getItem(engineKey) === 'v2') api.activate();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
