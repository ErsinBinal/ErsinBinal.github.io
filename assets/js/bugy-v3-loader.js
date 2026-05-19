(() => {
  'use strict';

  const engineKey = 'convivium.bugy.engine';
  const skinKey = 'convivium.bugy.v3.skin';
  const skins = ['classic', 'matrix', 'ember', 'ghost', 'royal'];
  const actions = ['storm', 'tornado', 'portal', 'clone', 'gravity', 'abduct'];
  const stateNames = ['walk', 'storm', 'tornado', 'portal', 'clone', 'gravity', 'abduct'];
  const actionCodes = Object.fromEntries(actions.map((name, index) => [name, index]));
  const skinCodes = Object.fromEntries(skins.map((name, index) => [name, index]));
  const atlasCells = {
    'bugy-idle': 0,
    'bugy-walk-a': 1,
    'bugy-walk-b': 2,
    'storm-cloud': 3,
    tornado: 4,
    portal: 5,
    ufo: 6,
    'clone-echo': 7,
    lightning: 8
  };
  const cell = 96;

  const boot = async () => {
    if (window.BugyV3) return;

    const layer = document.createElement('div');
    layer.id = 'bugy-v3-layer';
    layer.className = 'bugy-v3-layer';
    layer.hidden = true;

    const canvas = document.createElement('canvas');
    canvas.id = 'bugy-v3-canvas';
    canvas.className = 'bugy-v3-canvas';
    canvas.width = 320;
    canvas.height = 180;
    canvas.setAttribute('aria-label', 'Bugy V3 native canvas actor');
    layer.appendChild(canvas);
    document.body.appendChild(layer);

    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    const atlas = new Image();
    let atlasReady = false;
    atlas.onload = () => {
      atlasReady = true;
      renderAtlas();
    };
    atlas.src = '/assets/sprites/bugy-v3-atlas.svg?v=1';
    let active = false;
    let randomEnabled = true;
    let last = 0;
    let raf = 0;
    let nextAction = 0;
    let nextRandom = performance.now() + 18000;
    let skin = skins.includes(localStorage.getItem(skinKey)) ? localStorage.getItem(skinKey) : 'classic';
    let core = null;

    const dispatch = () => {
      window.dispatchEvent(new CustomEvent('bugy:state', { detail: api.getState() }));
      window.dispatchEvent(new CustomEvent('bugy-v3:state', { detail: api.getState() }));
    };

    const scheduleRandom = () => {
      nextRandom = performance.now() + 18000 + Math.random() * 16000;
    };

    const readExport = (exports, name) => exports[name] || exports[`_${name}`];

    async function createWasmCore() {
      const response = await fetch('/assets/wasm/bugy-v3.wasm', { cache: 'no-store' });
      if (!response.ok) throw new Error('bugy-v3.wasm bulunamadi');
      const bytes = await response.arrayBuffer();
      const module = await WebAssembly.instantiate(bytes, {
        env: {
          abort() {
            throw new Error('Bugy V3 WASM abort');
          }
        }
      });
      const exports = module.instance.exports;
      const fn = name => {
        const exported = readExport(exports, name);
        if (typeof exported !== 'function') throw new Error(`WASM export eksik: ${name}`);
        return exported;
      };
      const api = {
        mode: 'wasm',
        init: fn('bugy_init'),
        update: fn('bugy_update'),
        trigger: fn('bugy_trigger'),
        next: fn('bugy_next'),
        setSkin: fn('bugy_set_skin'),
        framebuffer: fn('bugy_framebuffer'),
        width: fn('bugy_width'),
        height: fn('bugy_height'),
        x: fn('bugy_x'),
        y: fn('bugy_y'),
        state: fn('bugy_state'),
        skin: fn('bugy_skin'),
        draw() {}
      };
      api.init();
      return api;
    }

    function createFallbackCore() {
      const state = {
        x: 42,
        y: 136,
        vx: 0.034,
        vy: 0,
        face: 1,
        state: 0,
        skin: skinCodes[skin] || 0,
        actionTime: 0
      };

      return {
        mode: 'canvas-fallback',
        init() {},
        update(dt) {
          const safeDt = Math.min(dt, 40);
          if (state.state === 0) {
            state.x += state.vx * safeDt;
            if (state.x < 12 || state.x > 266) {
              state.vx *= -1;
              state.face *= -1;
            }
            state.x = Math.max(12, Math.min(266, state.x));
            state.y = 136;
          } else {
            state.actionTime += safeDt;
            if (state.state === 2) state.y = 120 - ((Math.floor(state.actionTime / 90) % 4) * 8);
            if (state.state === 5) {
              state.vy += 0.00032 * safeDt;
              state.x += state.vx * 1.2 * safeDt;
              state.y += state.vy * safeDt;
              if (state.y > 136) {
                state.y = 136;
                state.vy = -state.vy * 0.55;
              }
            }
            if (state.state === 6) state.y += state.actionTime < 1150 ? -0.055 * safeDt : 0.08 * safeDt;
            if ((state.state !== 6 && state.actionTime > 1800) || (state.state === 6 && state.actionTime > 2700)) {
              state.state = 0;
              state.y = 136;
            }
          }
        },
        trigger(action) {
          if (state.state !== 0) return 0;
          state.state = action + 1;
          state.actionTime = 0;
          state.vy = action === 4 ? -0.18 : 0;
          return 1;
        },
        next() {
          this.trigger(nextAction % actions.length);
          nextAction += 1;
        },
        setSkin(nextSkin) {
          state.skin = Math.max(0, Math.min(4, nextSkin));
        },
        draw() {},
        x: () => Math.round(state.x),
        y: () => Math.round(state.y),
        state: () => state.state,
        skin: () => state.skin
      };
    }

    const clear = () => context.clearRect(0, 0, canvas.width, canvas.height);
    const drawSprite = (name, x, y, scale = 1, alpha = 1) => {
      if (!atlasReady) return;
      const index = atlasCells[name];
      if (index === undefined) return;
      context.save();
      context.globalAlpha = alpha;
      context.drawImage(atlas, index * cell, 0, cell, cell, Math.round(x), Math.round(y), cell * scale, cell * scale);
      context.restore();
    };
    const frameBugy = () => {
      if (core?.state?.() !== 0) return 'bugy-idle';
      return Math.floor(performance.now() / 180) % 2 ? 'bugy-walk-a' : 'bugy-walk-b';
    };
    const renderAtlas = () => {
      clear();
      if (!core) return;
      const x = core.x();
      const y = core.y();
      const state = core.state();
      if (state === 1) {
        drawSprite('storm-cloud', x - 28, y - 132, 1);
        if (Math.floor(performance.now() / 140) % 2) drawSprite('lightning', x - 8, y - 116, 0.9, 0.92);
      } else if (state === 2) {
        drawSprite('tornado', x - 30, y - 118, 1.08);
      } else if (state === 3) {
        drawSprite('portal', x - 24, y - 24, 1);
      } else if (state === 4) {
        drawSprite('clone-echo', x - 30, y - 86, 1, 0.78);
      } else if (state === 6) {
        drawSprite('ufo', x - 26, y - 126, 1);
      }
      drawSprite(frameBugy(), x - 26, y - 84, 1);
    };

    try {
      core = await createWasmCore();
    } catch (error) {
      core = createFallbackCore();
    }
    core.init();
    core.setSkin(skinCodes[skin] || 0);

    const loop = now => {
      if (!active) return;
      const dt = last ? now - last : 16;
      last = now;
      core.update(dt);
      renderAtlas();
      if (randomEnabled && now > nextRandom && core.state() === 0) {
        core.trigger(Math.floor(Math.random() * actions.length));
        scheduleRandom();
      }
      raf = requestAnimationFrame(loop);
    };

    const syncVisibility = () => {
      layer.hidden = !active;
      document.body.classList.toggle('bugy-v3-active', active);
      document.body.classList.toggle('bugy-v1-muted', active);
    };

    const api = {
      version: '3.0.0',
      actions: [...actions],
      activate() {
        active = true;
        localStorage.setItem(engineKey, 'v3');
        window.BugyV2?.deactivate?.();
        syncVisibility();
        last = 0;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
        dispatch();
        return true;
      },
      deactivate() {
        active = false;
        cancelAnimationFrame(raf);
        syncVisibility();
        context.clearRect(0, 0, canvas.width, canvas.height);
        dispatch();
        return true;
      },
      summon() {
        if (!active) this.activate();
        dispatch();
        return true;
      },
      trigger(action) {
        if (!active) this.activate();
        const ok = core.trigger(actionCodes[action] ?? -1);
        scheduleRandom();
        dispatch();
        return Boolean(ok);
      },
      next() {
        if (!active) this.activate();
        const action = actions[nextAction % actions.length];
        nextAction += 1;
        return this.trigger(action);
      },
      setRandom(enabled) {
        randomEnabled = Boolean(enabled);
        scheduleRandom();
        dispatch();
        return randomEnabled;
      },
      setSkin(nextSkin) {
        skin = skins.includes(nextSkin) ? nextSkin : 'classic';
        localStorage.setItem(skinKey, skin);
        core.setSkin(skinCodes[skin]);
        dispatch();
        return skin;
      },
      getState() {
        return {
          engine: 'v3',
          version: this.version,
          mode: core?.mode || 'loading',
          active,
          state: stateNames[core?.state?.() || 0] || 'walk',
          skin,
          skins: [...skins],
          randomEnabled,
          x: core?.x?.() || 0,
          y: core?.y?.() || 0
        };
      }
    };

    window.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !active) return;
      localStorage.setItem(engineKey, 'v1');
      api.deactivate();
      window.Bugy?.summon?.();
    });

    window.BugyV3 = api;
    if (localStorage.getItem(engineKey) === 'v3') api.activate();
    dispatch();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
