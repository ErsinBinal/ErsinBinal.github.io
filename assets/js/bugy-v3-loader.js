(() => {
  'use strict';

  const engineKey = 'convivium.bugy.engine';
  const skinKey = 'convivium.bugy.v3.skin';
  const skins = ['classic', 'matrix', 'ember', 'ghost', 'royal'];
  const actions = ['storm', 'tornado', 'portal', 'clone', 'gravity', 'abduct'];
  const stateNames = ['walk', 'storm', 'tornado', 'portal', 'clone', 'gravity', 'abduct'];
  const actionCodes = Object.fromEntries(actions.map((name, index) => [name, index]));
  const skinCodes = Object.fromEntries(skins.map((name, index) => [name, index]));

  const rgba = (r, g, b, a = 255) => `rgba(${r},${g},${b},${a / 255})`;
  const palettes = {
    classic: ['#00eaff', '#00ff66', '#ff2ea6', '#f5ff6b', '#c9ffd6'],
    matrix: ['#306230', '#8bac0f', '#0f380f', '#c4d43a', '#d9f06b'],
    ember: ['#29adff', '#43d637', '#ff77a8', '#ffcc00', '#fff1e8'],
    ghost: ['#00d9ff', '#00ff99', '#ff005d', '#ffe14a', '#f4f7ff'],
    royal: ['#cfcfcf', '#f4f4f4', '#8f8f8f', '#ffffff', '#5c5c5c']
  };

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
    let image = context.createImageData(canvas.width, canvas.height);
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
      const memory = exports.memory;
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
        draw() {
          const width = api.width();
          const height = api.height();
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            image = context.createImageData(width, height);
            context.imageSmoothingEnabled = false;
          }
          const ptr = api.framebuffer();
          const source = new Uint8ClampedArray(memory.buffer, ptr, width * height * 4);
          image.data.set(source);
          context.putImageData(image, 0, 0);
        }
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

      const color = slot => palettes[skins[state.skin] || 'classic'][slot];
      const rect = (x, y, w, h, fill) => {
        context.fillStyle = fill;
        context.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      };
      const outlineRect = (x, y, w, h, fill) => {
        rect(x - 1, y - 1, w + 2, h + 2, '#000');
        rect(x, y, w, h, fill);
      };
      const pixel = (x, y, fill) => rect(x, y, 2, 2, fill);
      const clear = () => context.clearRect(0, 0, canvas.width, canvas.height);

      const drawBugy = () => {
        const x = state.x;
        const y = state.y;
        rect(x + 3, y + 35, 34, 5, rgba(0, 0, 0, 118));
        outlineRect(x + 7, y + 16, 25, 22, color(0));
        rect(x + 10, y + 18, 20, 7, color(4));
        outlineRect(x + 29, y + 10, 15, 18, color(4));
        rect(x + (state.face > 0 ? 39 : 31), y + 17, 3, 3, '#000');
        outlineRect(x + 14, y + 36, 5, 12, color(1));
        outlineRect(x + 27, y + 36, 5, 12, color(1));
        outlineRect(x + 2, y + 23, 8, 8, color(2));
        if (state.skin === 4) {
          rect(x + 31, y + 4, 12, 4, color(3));
          pixel(x + 32, y + 2, color(3));
          pixel(x + 37, y, color(3));
          pixel(x + 42, y + 2, color(3));
        }
      };

      const drawRain = (x, y) => {
        outlineRect(x + 12, y + 5, 50, 14, color(4));
        rect(x + 16, y + 22, 4, 18, color(0));
        rect(x + 32, y + 28, 4, 18, color(0));
        rect(x + 50, y + 22, 4, 18, color(0));
        rect(x + 66, y + 30, 4, 18, color(0));
      };
      const drawLightning = (x, y) => {
        rect(x + 14, y, 11, 26, color(3));
        rect(x + 6, y + 22, 28, 10, color(3));
        rect(x + 5, y + 30, 12, 34, color(3));
        rect(x + 14, y + 48, 20, 10, color(3));
      };
      const drawTornado = (x, y) => {
        rect(x + 3, y + 3, 68, 8, '#000');
        rect(x + 7, y + 5, 58, 8, color(4));
        rect(x + 11, y + 26, 54, 8, '#000');
        rect(x + 16, y + 28, 42, 8, color(0));
        rect(x + 21, y + 50, 42, 8, '#000');
        rect(x + 26, y + 52, 29, 8, color(2));
        rect(x + 28, y + 73, 30, 8, '#000');
        rect(x + 33, y + 75, 19, 8, color(3));
        rect(x + 37, y + 96, 16, 16, color(4));
      };
      const drawPortal = (x, y) => {
        rect(x + 8, y + 8, 56, 6, color(2));
        rect(x + 14, y + 14, 44, 6, color(0));
        rect(x + 22, y + 19, 28, 5, color(4));
        rect(x + 31, y + 22, 10, 3, color(3));
      };
      const drawUfo = (x, y) => {
        outlineRect(x + 23, y, 28, 12, color(4));
        outlineRect(x + 7, y + 11, 62, 16, color(0));
        rect(x + 22, y + 28, 32, 48, rgba(0, 234, 255, 74));
      };
      const draw = () => {
        clear();
        if (state.state === 1) {
          drawRain(state.x - 17, state.y - 80);
          if (state.actionTime > 620) drawLightning(state.x + 6, state.y - 58);
        } else if (state.state === 2) drawTornado(state.x - 22, state.y - 86);
        else if (state.state === 3) drawPortal(state.x - 10, state.y + 33);
        else if (state.state === 4) {
          rect(state.x - 18, state.y + 16, 25, 22, rgba(0, 234, 255, 94));
          rect(state.x + 30, state.y + 16, 25, 22, rgba(255, 46, 166, 94));
        } else if (state.state === 6) drawUfo(state.x - 18, state.y - 92);
        drawBugy();
      };

      return {
        mode: 'canvas-fallback',
        init() {
          draw();
        },
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
          draw();
        },
        trigger(action) {
          if (state.state !== 0) return 0;
          state.state = action + 1;
          state.actionTime = 0;
          state.vy = action === 4 ? -0.18 : 0;
          draw();
          return 1;
        },
        next() {
          this.trigger(nextAction % actions.length);
          nextAction += 1;
        },
        setSkin(nextSkin) {
          state.skin = Math.max(0, Math.min(4, nextSkin));
          draw();
        },
        draw,
        x: () => Math.round(state.x),
        y: () => Math.round(state.y),
        state: () => state.state,
        skin: () => state.skin
      };
    }

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
      core.draw?.();
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
