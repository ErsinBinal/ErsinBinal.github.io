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
  const effectCell = 96;
  const characterTile = 16;
  const characterStride = 17;
  const characterCells = {
    classic: {
      label: 'Forest Bugy',
      frames: [[0, 3], [1, 3]],
      shadow: '#4f8a38'
    },
    matrix: {
      label: 'Circuit Scout',
      frames: [[0, 9], [1, 9]],
      shadow: '#24d8c4'
    },
    ember: {
      label: 'Ember Runner',
      frames: [[0, 7], [1, 7]],
      shadow: '#e87835'
    },
    ghost: {
      label: 'Bone Glitch',
      frames: [[0, 8], [1, 8]],
      shadow: '#d8e8f0'
    },
    royal: {
      label: 'Royal Courier',
      frames: [[0, 5], [1, 5]],
      shadow: '#d2aa58'
    }
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
    canvas.setAttribute('aria-label', 'Bugy V3 native canvas actor');
    layer.appendChild(canvas);
    document.body.appendChild(layer);

    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    const resizeCanvas = () => {
      const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.imageSmoothingEnabled = false;
    };
    resizeCanvas();
    const effectAtlas = new Image();
    let effectAtlasReady = false;
    effectAtlas.onload = () => {
      effectAtlasReady = true;
      renderAtlas();
    };
    effectAtlas.src = '/assets/sprites/bugy-v3-atlas.svg?v=1';
    const characterSheet = new Image();
    let characterReady = false;
    characterSheet.onload = () => {
      characterReady = true;
      renderAtlas();
    };
    characterSheet.src = '/assets/vendor/kenney/roguelike-characters/roguelikeChar_transparent.png?v=1';
    let active = false;
    let randomEnabled = true;
    let last = 0;
    let raf = 0;
    let nextAction = 0;
    let nextRandom = performance.now() + 18000;
    let skin = skins.includes(localStorage.getItem(skinKey)) ? localStorage.getItem(skinKey) : 'classic';
    let core = null;
    let behaviorMode = 'walk';
    let behaviorUntil = 0;

    const dispatch = () => {
      window.dispatchEvent(new CustomEvent('bugy:state', { detail: api.getState() }));
      window.dispatchEvent(new CustomEvent('bugy-v3:state', { detail: api.getState() }));
    };

    const scheduleRandom = () => {
      nextRandom = performance.now() + 18000 + Math.random() * 16000;
    };
    const scheduleBehavior = () => {
      const roll = Math.random();
      behaviorMode = roll < 0.22 ? 'idle' : roll < 0.44 ? 'hop' : roll < 0.64 ? 'peek' : 'walk';
      behaviorUntil = performance.now() + 1200 + Math.random() * 3400;
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
        actionTime: 0,
        targetX: 180,
        speedBias: 1
      };

      return {
        mode: 'canvas-fallback',
        init() {},
        update(dt) {
          const safeDt = Math.min(dt, 40);
          if (state.state === 0) {
            if (performance.now() > behaviorUntil) {
              scheduleBehavior();
              state.targetX = 18 + Math.random() * 260;
              state.speedBias = 0.72 + Math.random() * 0.8;
            }
            const speed = behaviorMode === 'idle' ? 0 : behaviorMode === 'peek' ? 0.012 : behaviorMode === 'hop' ? 0.024 : 0.031;
            const delta = state.targetX - state.x;
            if (Math.abs(delta) > 5 && speed > 0) {
              state.face = delta > 0 ? 1 : -1;
              state.x += Math.sign(delta) * safeDt * speed * state.speedBias;
            } else if (behaviorMode === 'walk') {
              state.targetX = 18 + Math.random() * 260;
            }
            if (state.x < 12 || state.x > 286) {
              state.face *= -1;
              state.targetX = state.x < 12 ? 260 : 28;
            }
            state.x = Math.max(12, Math.min(286, state.x));
            state.y = behaviorMode === 'hop'
              ? 130 - Math.abs(Math.sin(performance.now() / 170)) * 8
              : behaviorMode === 'peek'
                ? 134 + Math.sin(performance.now() / 280) * 1.4
              : 136;
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
          if (state.state !== 0 || action < 0 || action >= actions.length) return 0;
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
        face: () => state.face,
        state: () => state.state,
        skin: () => state.skin
      };
    }

    const clear = () => context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const screenX = x => 18 + (x / 320) * Math.max(1, window.innerWidth - 92);
    const groundY = () => window.innerHeight - 82;
    const drawSprite = (name, x, y, scale = 1, alpha = 1) => {
      if (!effectAtlasReady) return;
      const index = atlasCells[name];
      if (index === undefined) return;
      context.save();
      context.globalAlpha = alpha;
      context.drawImage(effectAtlas, index * effectCell, 0, effectCell, effectCell, Math.round(x), Math.round(y), effectCell * scale, effectCell * scale);
      context.restore();
    };
    const frameBugy = () => {
      if (core?.state?.() !== 0) return 'bugy-idle';
      return Math.floor(performance.now() / 180) % 2 ? 'bugy-walk-a' : 'bugy-walk-b';
    };
    const drawCharacterShadow = (x, y, scale, color, alpha = 0.28) => {
      const width = characterTile * scale * 0.78;
      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.beginPath();
      context.ellipse(Math.round(x), Math.round(y - 2), width * 0.5, Math.max(3, scale * 1.2), 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    };
    const drawCharacter = (x, y, scale = 3, alpha = 1) => {
      if (!characterReady) return false;
      const skinName = skins[core?.skin?.() || 0] || skin;
      const profile = characterCells[skinName] || characterCells.classic;
      const fallbackStill = core?.mode === 'canvas-fallback' && (behaviorMode === 'idle' || behaviorMode === 'peek');
      const moving = core?.state?.() === 0 && !fallbackStill;
      const frameIndex = moving && Math.floor(performance.now() / 210) % 2 ? 1 : 0;
      const frame = profile.frames[frameIndex] || profile.frames[0];
      const sx = frame[0] * characterStride;
      const sy = frame[1] * characterStride;
      const size = characterTile * scale;
      const face = typeof core?.face === 'function' ? core.face() : 1;
      drawCharacterShadow(x, y, scale, profile.shadow, alpha * 0.3);
      context.save();
      context.globalAlpha = alpha;
      context.translate(Math.round(x), Math.round(y - size));
      context.scale(face < 0 ? -1 : 1, 1);
      context.drawImage(characterSheet, sx, sy, characterTile, characterTile, Math.round(-size / 2), 0, size, size);
      context.restore();
      return true;
    };
    const renderAtlas = () => {
      clear();
      if (!core) return;
      const x = screenX(core.x());
      const baseY = groundY();
      const y = baseY + ((core.y() - 136) * 0.62);
      const state = core.state();
      const actorScale = Math.max(2.45, Math.min(3.05, window.innerWidth / 560));
      if (state === 1) {
        drawSprite('storm-cloud', x - 30, y - 106, 0.72);
        if (Math.floor(performance.now() / 140) % 2) drawSprite('lightning', x - 4, y - 88, 0.52, 0.92);
      } else if (state === 2) {
        drawSprite('tornado', x - 26, y - 96, 0.72);
      } else if (state === 3) {
        drawSprite('portal', x - 29, y - 22, 0.62);
      } else if (state === 4) {
        drawSprite('clone-echo', x - 28, y - 58, 0.62, 0.78);
      } else if (state === 6) {
        drawSprite('ufo', x - 28, y - 104, 0.72);
      }
      if (state === 4) drawCharacter(x + 12, y, actorScale, 0.48);
      if (!drawCharacter(x, y, actorScale)) drawSprite(frameBugy(), x - 28, y - 54, 0.58);
    };

    try {
      core = await createWasmCore();
    } catch (error) {
      core = createFallbackCore();
    }
    core.init();
    core.setSkin(skinCodes[skin] || 0);
    scheduleBehavior();

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
      version: '3.1.0',
      actions: [...actions],
      assetSource: 'Kenney Roguelike Characters',
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
        renderAtlas();
        dispatch();
        return skin;
      },
      getState() {
        return {
          engine: 'v3',
          version: this.version,
          mode: core?.mode || 'loading',
          assetSource: this.assetSource,
          active,
          state: stateNames[core?.state?.() || 0] || 'walk',
          skin,
          skinLabel: (characterCells[skin] || characterCells.classic).label,
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
    window.addEventListener('resize', () => {
      resizeCanvas();
      renderAtlas();
    }, { passive: true });

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
