(() => {
  'use strict';

  const engineKey = 'convivium.bugy.engine';
  const skinKey = 'convivium.bugy.v3.skin';
  const script = document.currentScript;
  const wasmUrl = script?.dataset.wasm || '';
  const skins = ['classic', 'matrix', 'ember', 'ghost', 'royal'];
  const actions = ['storm', 'tornado', 'portal', 'clone', 'gravity', 'abduct'];
  const stateNames = ['walk', 'storm', 'tornado', 'portal', 'clone', 'gravity', 'abduct'];
  const actionCodes = Object.fromEntries(actions.map((name, index) => [name, index]));
  const skinCodes = Object.fromEntries(skins.map((name, index) => [name, index]));
  const effectBase = '/assets/vendor/kenney/smoke-particles/';
  const effectGroups = {
    white: ['whitePuff00.png', 'whitePuff04.png', 'whitePuff08.png', 'whitePuff12.png', 'whitePuff16.png'],
    black: ['blackSmoke00.png', 'blackSmoke04.png', 'blackSmoke08.png', 'blackSmoke12.png', 'blackSmoke16.png'],
    flash: ['flash00.png', 'flash02.png', 'flash04.png', 'flash06.png', 'flash08.png'],
    explosion: ['explosion00.png', 'explosion03.png', 'explosion06.png', 'explosion08.png']
  };
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
    const loadEffectImage = file => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => renderAtlas();
      image.src = `${effectBase}${file}?v=1`;
      return image;
    };
    const effectImages = Object.fromEntries(
      Object.entries(effectGroups).map(([name, files]) => [name, files.map(loadEffectImage)])
    );
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
    let actionStarted = 0;

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
      if (!wasmUrl) throw new Error('bugy-v3 wasm disabled');
      const response = await fetch(wasmUrl, { cache: 'no-store' });
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
        actionTime: () => state.actionTime,
        state: () => state.state,
        skin: () => state.skin
      };
    }

    const clear = () => context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const screenX = x => 18 + (x / 320) * Math.max(1, window.innerWidth - 92);
    const groundY = () => window.innerHeight - 82;
    const readyImage = image => image?.complete && image.naturalWidth > 0;
    const effectFrame = (group, speed = 110, offset = 0) => {
      const frames = effectImages[group] || [];
      const ready = frames.filter(readyImage);
      if (!ready.length) return null;
      return ready[(Math.floor(performance.now() / speed) + offset) % ready.length];
    };
    const drawEffectImage = (image, x, y, width, height = width, alpha = 1, rotation = 0) => {
      if (!readyImage(image)) return false;
      context.save();
      context.globalAlpha = alpha;
      context.translate(Math.round(x), Math.round(y));
      context.rotate(rotation);
      context.drawImage(image, Math.round(-width / 2), Math.round(-height / 2), Math.round(width), Math.round(height));
      context.restore();
      return true;
    };
    const rect = (x, y, w, h, fill, alpha = 1) => {
      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = fill;
      context.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      context.restore();
    };
    const drawLightningBolt = (x, y, scale = 1, alpha = 1) => {
      context.save();
      context.globalAlpha = alpha;
      context.translate(Math.round(x), Math.round(y));
      context.scale(scale, scale);
      context.fillStyle = '#171417';
      context.beginPath();
      context.moveTo(4, 0);
      context.lineTo(22, 0);
      context.lineTo(14, 25);
      context.lineTo(28, 25);
      context.lineTo(0, 68);
      context.lineTo(8, 38);
      context.lineTo(-5, 38);
      context.closePath();
      context.fill();
      context.fillStyle = '#f8f067';
      context.beginPath();
      context.moveTo(6, 3);
      context.lineTo(18, 3);
      context.lineTo(10, 29);
      context.lineTo(23, 29);
      context.lineTo(4, 58);
      context.lineTo(10, 34);
      context.lineTo(0, 34);
      context.closePath();
      context.fill();
      context.fillStyle = '#fff8bf';
      context.fillRect(8, 8, 4, 9);
      context.restore();
    };
    const drawStormEffect = (x, y, elapsed) => {
      const t = elapsed / 180;
      drawEffectImage(effectFrame('black', 160, 2), x - 22, y - 103, 74, 52, 0.52, Math.sin(t) * 0.08);
      drawEffectImage(effectFrame('white', 170, 1), x + 2, y - 112, 82, 56, 0.82, Math.cos(t) * 0.05);
      drawEffectImage(effectFrame('black', 190, 4), x + 26, y - 100, 64, 46, 0.42, -0.08);
      for (let i = 0; i < 6; i += 1) {
        const dropX = x - 31 + i * 12 + Math.sin(t + i) * 3;
        const dropY = y - 78 + ((elapsed / 9 + i * 11) % 48);
        rect(dropX, dropY, 3, 12, i % 2 ? '#b8f7ff' : '#40d8ff', 0.8);
      }
      if (Math.floor(elapsed / 130) % 2 === 0) drawLightningBolt(x - 2, y - 88, 0.78, 0.92);
    };
    const drawTornadoEffect = (x, y, elapsed) => {
      const t = elapsed / 150;
      context.save();
      context.globalAlpha = 0.28;
      context.fillStyle = '#14181a';
      context.beginPath();
      context.moveTo(x - 41, y - 92);
      context.lineTo(x + 43, y - 92);
      context.lineTo(x + 12, y - 6);
      context.lineTo(x - 10, y - 6);
      context.closePath();
      context.fill();
      context.restore();
      for (let i = 0; i < 8; i += 1) {
        const top = i / 7;
        const size = 74 - i * 6;
        const offset = Math.sin(t + i * 0.9) * (24 - i * 2.5);
        const cy = y - 88 + i * 12;
        const frame = i % 2 ? effectFrame('white', 140, i) : effectFrame('black', 145, i);
        drawEffectImage(frame, x + offset, cy, size * 1.15, size * 0.7, i % 2 ? 0.33 : 0.28, Math.sin(t + i) * 0.18);
        context.save();
        context.globalAlpha = 0.62 - top * 0.03;
        context.fillStyle = i % 2 ? '#e7eef0' : '#8a969b';
        context.strokeStyle = '#252a2d';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(x + offset - size * 0.52, cy - 3);
        context.lineTo(x + offset + size * 0.52, cy - 7);
        context.lineTo(x + offset + size * 0.35, cy + 5);
        context.lineTo(x + offset - size * 0.34, cy + 8);
        context.closePath();
        context.fill();
        context.stroke();
        context.restore();
      }
      for (let i = 0; i < 12; i += 1) {
        const angle = t + i * 0.7;
        const radius = 14 + (i % 3) * 11;
        rect(x + Math.cos(angle) * radius, y - 24 - i * 6 + Math.sin(angle) * 5, 5, 3, i % 2 ? '#d9c489' : '#9ad7e7', 0.82);
      }
    };
    const drawPortalEffect = (x, y, elapsed) => {
      const t = elapsed / 240;
      drawEffectImage(effectFrame('flash', 95, 0), x, y - 17, 82, 72, 0.86, t * 0.28);
      drawEffectImage(effectFrame('white', 150, 2), x, y - 16, 58, 48, 0.38, -t * 0.2);
      context.save();
      context.translate(Math.round(x), Math.round(y - 17));
      context.rotate(Math.sin(t) * 0.14);
      context.lineWidth = 5;
      context.strokeStyle = '#ff42d0';
      context.beginPath();
      context.ellipse(0, 0, 34, 24, 0, 0, Math.PI * 2);
      context.stroke();
      context.lineWidth = 3;
      context.strokeStyle = '#50f7ff';
      context.beginPath();
      context.ellipse(0, 0, 23, 15, 0, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = 'rgba(20, 10, 32, .3)';
      context.fillRect(-18, -10, 36, 20);
      context.restore();
      for (let i = 0; i < 8; i += 1) {
        const angle = t + i * 0.8;
        rect(x + Math.cos(angle) * 42, y - 17 + Math.sin(angle) * 28, 4, 4, i % 2 ? '#ff42d0' : '#50f7ff', 0.78);
      }
      rect(x - 39, y + 11, 78, 5, '#171417', 0.28);
    };
    const drawCloneEffect = (x, y, elapsed) => {
      const t = elapsed / 120;
      drawEffectImage(effectFrame('flash', 120, 1), x - 12, y - 30, 58, 48, 0.36, t * 0.12);
      drawEffectImage(effectFrame('black', 150, 3), x + 20, y - 28, 54, 46, 0.22, -t * 0.08);
      rect(x - 30 + Math.sin(t) * 4, y - 49, 7, 38, '#35f3ff', 0.42);
      rect(x + 23 + Math.cos(t) * 4, y - 51, 7, 36, '#ff42d0', 0.42);
    };
    const drawGravityEffect = (x, y, elapsed) => {
      const pulse = 0.65 + Math.sin(elapsed / 120) * 0.18;
      drawEffectImage(effectFrame('explosion', 125, 0), x, y - 26, 70 * pulse, 62 * pulse, 0.42, elapsed / 500);
      drawEffectImage(effectFrame('white', 150, 4), x, y - 2, 86, 36, 0.3, 0);
      for (let i = 0; i < 5; i += 1) {
        const lift = ((elapsed / 13 + i * 19) % 58);
        rect(x - 32 + i * 16, y - lift, 4, 4, i % 2 ? '#fbdf7b' : '#83f4ff', 0.72);
      }
    };
    const drawUfoEffect = (x, y, elapsed) => {
      const t = elapsed / 180;
      drawEffectImage(effectFrame('flash', 115, 2), x, y - 83, 68, 46, 0.28, t * 0.08);
      context.save();
      context.translate(Math.round(x), Math.round(y - 101 + Math.sin(t) * 3));
      context.fillStyle = '#171417';
      context.fillRect(-31, 4, 62, 14);
      context.fillRect(-18, -8, 36, 13);
      context.fillStyle = '#b9fff6';
      context.fillRect(-14, -11, 28, 12);
      context.fillStyle = '#48e5ff';
      context.fillRect(-26, 1, 52, 12);
      context.fillStyle = '#ffdf61';
      context.fillRect(-19, 9, 6, 4);
      context.fillStyle = '#ff42d0';
      context.fillRect(-3, 10, 6, 4);
      context.fillStyle = '#63ff86';
      context.fillRect(13, 9, 6, 4);
      context.restore();
      context.save();
      context.globalAlpha = 0.24 + Math.sin(t) * 0.05;
      context.fillStyle = '#56f4ff';
      context.beginPath();
      context.moveTo(x - 15, y - 85);
      context.lineTo(x + 15, y - 85);
      context.lineTo(x + 38, y - 8);
      context.lineTo(x - 38, y - 8);
      context.closePath();
      context.fill();
      context.restore();
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
    const drawCharacterFallback = (x, y, scale = 1, alpha = 1) => {
      const size = 34 * scale;
      context.save();
      context.globalAlpha = alpha;
      context.translate(Math.round(x - size / 2), Math.round(y - size));
      context.fillStyle = '#121517';
      context.fillRect(4, 8, size - 8, size - 10);
      context.fillStyle = '#4f8a38';
      context.fillRect(8, 4, size - 16, size - 8);
      context.fillStyle = '#d8f1c8';
      context.fillRect(12, 10, size - 24, 8);
      context.restore();
    };
    const renderAtlas = () => {
      clear();
      if (!core) return;
      const x = screenX(core.x());
      const baseY = groundY();
      const y = baseY + ((core.y() - 136) * 0.62);
      const state = core.state();
      const elapsed = typeof core?.actionTime === 'function' ? core.actionTime() : Math.max(0, performance.now() - actionStarted);
      const actorScale = Math.max(2.45, Math.min(3.05, window.innerWidth / 560));
      if (state === 1) {
        drawStormEffect(x, y, elapsed);
      } else if (state === 2) {
        drawTornadoEffect(x, y, elapsed);
      } else if (state === 3) {
        drawPortalEffect(x, y, elapsed);
      } else if (state === 4) {
        drawCloneEffect(x, y, elapsed);
      } else if (state === 5) {
        drawGravityEffect(x, y, elapsed);
      } else if (state === 6) {
        drawUfoEffect(x, y, elapsed);
      }
      if (state === 4) drawCharacter(x + 12, y, actorScale, 0.48);
      if (!drawCharacter(x, y, actorScale)) drawCharacterFallback(x, y, actorScale * 0.42);
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
        if (core.trigger(Math.floor(Math.random() * actions.length))) actionStarted = now;
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
      version: '3.2.0',
      actions: [...actions],
      assetSource: 'Kenney Roguelike Characters + Kenney Smoke Particles',
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
        if (ok) actionStarted = performance.now();
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
