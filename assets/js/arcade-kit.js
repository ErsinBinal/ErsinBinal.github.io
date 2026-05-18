(() => {
  'use strict';

  const palettes = {
    neon: ['#00ff66', '#00eaff', '#ff2ea6', '#f5ff6b'],
    gameboy: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
    famicom: ['#29adff', '#43d637', '#ff77a8', '#ffcc00'],
    neogeo: ['#00ff99', '#00d9ff', '#ff005d', '#ffe14a'],
    mono: ['#0b0b0b', '#8f8f8f', '#cfcfcf', '#ffffff']
  };
  const characterModels = {
    mascot: {
      label: 'Mascot',
      parts: ['shadow', 'body', 'head', 'arm-l', 'arm-r', 'leg-l', 'leg-r', 'accent']
    },
    runner: {
      label: 'Runner',
      parts: ['shadow', 'body', 'head', 'arm-l', 'arm-r', 'leg-l', 'leg-r', 'backpack']
    },
    mech: {
      label: 'Mech',
      parts: ['shadow', 'body', 'head', 'arm-l', 'arm-r', 'leg-l', 'leg-r', 'antenna']
    },
    wisp: {
      label: 'Wisp',
      parts: ['shadow', 'body', 'head', 'arm-l', 'arm-r', 'tail', 'accent']
    },
    boss: {
      label: 'Boss',
      parts: ['shadow', 'body', 'head', 'arm-l', 'arm-r', 'leg-l', 'leg-r', 'crown']
    }
  };
  const characterPoses = ['idle', 'walk', 'jump', 'hit', 'cast'];
  const version = '0.3.0';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const pick = (items, index = Math.floor(Math.random() * items.length)) => items[index % items.length];
  const uid = (prefix = 'entity') => `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

  function createBus() {
    const listeners = new Map();
    return {
      on(type, handler) {
        const bucket = listeners.get(type) || new Set();
        bucket.add(handler);
        listeners.set(type, bucket);
        return () => bucket.delete(handler);
      },
      emit(type, detail = {}) {
        (listeners.get(type) || []).forEach(handler => handler(detail));
        window.dispatchEvent(new CustomEvent(`arcade:${type}`, { detail }));
      }
    };
  }

  const bus = createBus();

  function createStorage(scope = 'default') {
    const prefix = `convivium.arcade.${scope}.`;
    const keyFor = key => `${prefix}${key}`;
    return {
      keyFor,
      get(key, fallback = null) {
        try {
          const raw = localStorage.getItem(keyFor(key));
          return raw === null ? fallback : JSON.parse(raw);
        } catch (error) {
          return fallback;
        }
      },
      set(key, value) {
        localStorage.setItem(keyFor(key), JSON.stringify(value));
        bus.emit('storage:set', { scope, key, value });
        return value;
      },
      number(key, fallback = 0) {
        const value = Number(this.get(key, fallback));
        return Number.isFinite(value) ? value : fallback;
      },
      best(key, value) {
        const next = Math.max(this.number(key, 0), Number(value) || 0);
        this.set(key, next);
        return next;
      },
      remove(key) {
        localStorage.removeItem(keyFor(key));
      },
      clear() {
        Object.keys(localStorage)
          .filter(key => key.startsWith(prefix))
          .forEach(key => localStorage.removeItem(key));
      }
    };
  }

  function createLoop(options = {}) {
    const step = 1000 / (options.fps || 60);
    const maxDelta = options.maxDelta || 100;
    let running = false;
    let frame = 0;
    let last = 0;
    let accumulator = 0;
    let raf = 0;

    const tick = (now) => {
      if (!running) return;
      if (!last) last = now;
      const delta = Math.min(maxDelta, now - last);
      last = now;

      if (options.fixed === false) {
        options.update?.(delta, now, frame);
      } else {
        accumulator += delta;
        let guard = 0;
        while (accumulator >= step && guard < 6) {
          options.update?.(step, now, frame);
          accumulator -= step;
          frame += 1;
          guard += 1;
        }
      }

      options.render?.(options.fixed === false ? 1 : accumulator / step, now, frame);
      raf = requestAnimationFrame(tick);
    };

    return {
      start() {
        if (running) return this;
        running = true;
        last = 0;
        accumulator = 0;
        raf = requestAnimationFrame(tick);
        bus.emit('loop:start', { fps: options.fps || 60 });
        return this;
      },
      stop() {
        running = false;
        cancelAnimationFrame(raf);
        bus.emit('loop:stop', { frame });
        return this;
      },
      step: (dt = step) => {
        options.update?.(dt, performance.now(), frame);
        options.render?.(1, performance.now(), frame);
        frame += 1;
      },
      isRunning: () => running,
      getFrame: () => frame
    };
  }

  function rectsIntersect(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function createEntity(config = {}) {
    const entity = {
      id: config.id || uid(config.type || 'entity'),
      type: config.type || 'entity',
      x: Number(config.x || 0),
      y: Number(config.y || 0),
      vx: Number(config.vx || 0),
      vy: Number(config.vy || 0),
      w: Number(config.w || config.width || 24),
      h: Number(config.h || config.height || 24),
      alive: config.alive !== false,
      solid: Boolean(config.solid),
      tags: new Set(config.tags || []),
      data: { ...(config.data || {}) },
      el: config.el || null,
      view: config.view || null,
      hitbox: {
        x: config.hitbox?.x || 0,
        y: config.hitbox?.y || 0,
        w: config.hitbox?.w || config.w || config.width || 24,
        h: config.hitbox?.h || config.h || config.height || 24
      },
      moveTo(x, y) {
        this.x = Number(x || 0);
        this.y = Number(y || 0);
        this.render?.();
        return this;
      },
      moveBy(x, y) {
        return this.moveTo(this.x + Number(x || 0), this.y + Number(y || 0));
      },
      setVelocity(x, y) {
        this.vx = Number(x || 0);
        this.vy = Number(y || 0);
        return this;
      },
      addTag(tag) {
        this.tags.add(tag);
        return this;
      },
      hasTag(tag) {
        return this.tags.has(tag);
      },
      toRect() {
        return {
          x: this.x + this.hitbox.x,
          y: this.y + this.hitbox.y,
          w: this.hitbox.w,
          h: this.hitbox.h
        };
      },
      overlaps(other) {
        return rectsIntersect(this.toRect(), other.toRect());
      },
      update(dt, scene) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        config.update?.(this, dt, scene);
      },
      render() {
        if (this.view?.moveTo) this.view.moveTo(this.x, this.y);
        else if (this.el) setSpritePosition(this.el, this.x, this.y);
        config.render?.(this);
      },
      destroy() {
        this.alive = false;
        this.view?.remove?.();
        this.el?.remove?.();
        config.destroy?.(this);
      }
    };
    return entity;
  }

  function createStage(options = {}) {
    const mount = typeof options.mount === 'string' ? document.querySelector(options.mount) : options.mount;
    const stage = document.createElement('div');
    stage.className = `arcade-stage ${options.className || ''}`.trim();
    stage.dataset.palette = options.palette || 'neon';
    stage.style.setProperty('--arcade-width', `${options.width || 320}px`);
    stage.style.setProperty('--arcade-height', `${options.height || 180}px`);
    if (options.minHeight) stage.style.minHeight = `${options.minHeight}px`;
    if (mount) mount.replaceChildren(stage);

    return {
      el: stage,
      setPalette(name) {
        stage.dataset.palette = palettes[name] ? name : 'neon';
        bus.emit('palette', { palette: stage.dataset.palette, stage });
      },
      sprite(config) {
        const sprite = createSprite(config);
        stage.appendChild(sprite);
        return sprite;
      },
      character(config) {
        return createCharacter(stage, config);
      },
      clear() {
        stage.replaceChildren();
      },
      destroy() {
        stage.remove();
      }
    };
  }

  function createCanvasRenderer(options = {}) {
    const mount = typeof options.mount === 'string' ? document.querySelector(options.mount) : options.mount;
    const parent = options.stage ? (options.stage.el || options.stage) : mount;
    const canvas = document.createElement('canvas');
    const width = options.width || 320;
    const height = options.height || 180;
    canvas.className = `arcade-canvas ${options.className || ''}`.trim();
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.setAttribute('aria-label', options.label || 'Arcade canvas renderer');
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    if (parent) {
      if (options.replace) parent.replaceChildren(canvas);
      else parent.appendChild(canvas);
    }

    const renderer = {
      canvas,
      context,
      width,
      height,
      clear(color = '#050505') {
        context.fillStyle = color;
        context.fillRect(0, 0, renderer.width, renderer.height);
        return renderer;
      },
      rect(x, y, w, h, color = '#00eaff') {
        context.fillStyle = color;
        context.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
        return renderer;
      },
      outline(x, y, w, h, color = '#f5ff6b') {
        context.strokeStyle = color;
        context.lineWidth = 1;
        context.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(h));
        return renderer;
      },
      text(text, x, y, options = {}) {
        context.fillStyle = options.color || '#c9ffd6';
        context.font = options.font || '10px monospace';
        context.textBaseline = options.baseline || 'top';
        context.fillText(String(text), Math.round(x), Math.round(y));
        return renderer;
      },
      drawEntity(entity, color = '#00eaff') {
        renderer.rect(entity.x, entity.y, entity.w, entity.h, color);
        if (options.debug) {
          const rect = entity.toRect();
          renderer.outline(rect.x, rect.y, rect.w, rect.h, '#f5ff6b');
        }
        return renderer;
      },
      resize(nextWidth, nextHeight) {
        renderer.width = canvas.width = nextWidth;
        renderer.height = canvas.height = nextHeight;
        context.imageSmoothingEnabled = false;
        return renderer;
      },
      destroy() {
        canvas.remove();
      }
    };
    return renderer;
  }

  function createPhaserAdapter(options = {}) {
    const PhaserRef = window.Phaser;
    return {
      available: Boolean(PhaserRef),
      boot(config = {}) {
        if (!PhaserRef) {
          throw new Error('Phaser is not loaded. Include assets/js/phaser.min.js before booting this adapter.');
        }
        return new PhaserRef.Game({
          type: PhaserRef.AUTO,
          width: config.width || options.width || 320,
          height: config.height || options.height || 180,
          parent: config.parent || options.parent,
          backgroundColor: config.backgroundColor || '#050505',
          pixelArt: config.pixelArt !== false,
          roundPixels: config.roundPixels !== false,
          physics: config.physics,
          scene: config.scene,
          scale: config.scale,
          ...config
        });
      },
      scene(definition = {}) {
        if (!PhaserRef) return null;
        return class ConviviumArcadeScene extends PhaserRef.Scene {
          constructor() {
            super(definition.key || 'ConviviumArcadeScene');
          }

          preload() {
            definition.preload?.(this);
          }

          create() {
            definition.create?.(this);
          }

          update(time, delta) {
            definition.update?.(this, time, delta);
          }
        };
      }
    };
  }

  function createScene(options = {}) {
    const stage = options.stage || createStage(options);
    const entities = new Map();
    const collisionRules = [];
    const debugBoxes = new Map();
    let debug = Boolean(options.debug);

    const matches = (entity, filter) => {
      if (!filter) return true;
      if (typeof filter === 'function') return filter(entity);
      if (Array.isArray(filter)) return filter.some(item => matches(entity, item));
      return entity.type === filter || entity.id === filter || entity.hasTag(filter);
    };

    const syncDebug = () => {
      stage.el.classList.toggle('arcade-debug', debug);
      if (!debug) {
        debugBoxes.forEach(node => node.remove());
        debugBoxes.clear();
        return;
      }

      entities.forEach(entity => {
        let box = debugBoxes.get(entity.id);
        if (!box) {
          box = document.createElement('span');
          box.className = 'arcade-hitbox';
          box.dataset.entity = entity.id;
          stage.el.appendChild(box);
          debugBoxes.set(entity.id, box);
        }
        const rect = entity.toRect();
        box.style.setProperty('--hitbox-x', `${Math.round(rect.x)}px`);
        box.style.setProperty('--hitbox-y', `${Math.round(rect.y)}px`);
        box.style.setProperty('--hitbox-w', `${Math.round(rect.w)}px`);
        box.style.setProperty('--hitbox-h', `${Math.round(rect.h)}px`);
      });

      debugBoxes.forEach((node, id) => {
        if (!entities.has(id)) {
          node.remove();
          debugBoxes.delete(id);
        }
      });
    };

    const scene = {
      stage,
      entities,
      add(config) {
        const entity = config.toRect ? config : createEntity(config);
        entities.set(entity.id, entity);
        entity.render();
        bus.emit('scene:add', { scene, entity });
        return entity;
      },
      sprite(config = {}) {
        const el = stage.sprite(config);
        return this.add(createEntity({
          ...config,
          type: config.type || 'sprite',
          el,
          w: config.w || 24,
          h: config.h || 24
        }));
      },
      actor(config = {}) {
        const view = createCharacter(stage, config);
        const entity = this.add(createEntity({
          ...config,
          type: config.type || 'actor',
          view,
          el: view.el,
          w: config.w || 42,
          h: config.h || 54,
          hitbox: config.hitbox || { x: 7, y: 5, w: 28, h: 45 }
        }));
        entity.pose = pose => {
          view.pose(pose);
          return entity;
        };
        entity.model = model => {
          view.model(model);
          return entity;
        };
        entity.face = direction => {
          view.face(direction);
          return entity;
        };
        return entity;
      },
      remove(entityOrId) {
        const id = typeof entityOrId === 'string' ? entityOrId : entityOrId.id;
        const entity = entities.get(id);
        if (!entity) return false;
        entity.destroy();
        entities.delete(id);
        return true;
      },
      clear() {
        entities.forEach(entity => entity.destroy());
        entities.clear();
        syncDebug();
      },
      onCollision(a, b, handler) {
        collisionRules.push({ a, b, handler });
        return () => {
          const index = collisionRules.findIndex(rule => rule.a === a && rule.b === b && rule.handler === handler);
          if (index >= 0) collisionRules.splice(index, 1);
        };
      },
      setDebug(enabled) {
        debug = Boolean(enabled);
        syncDebug();
        bus.emit('scene:debug', { scene, debug });
        return debug;
      },
      isDebug: () => debug,
      update(dt) {
        entities.forEach(entity => {
          if (!entity.alive) return;
          entity.update(dt, scene);
          entity.render();
        });

        collisionRules.forEach(rule => {
          const groupA = [...entities.values()].filter(entity => entity.alive && matches(entity, rule.a));
          const groupB = [...entities.values()].filter(entity => entity.alive && matches(entity, rule.b));
          groupA.forEach(a => {
            groupB.forEach(b => {
              if (a.id !== b.id && a.overlaps(b)) rule.handler(a, b, scene);
            });
          });
        });

        [...entities.values()]
          .filter(entity => !entity.alive)
          .forEach(entity => entities.delete(entity.id));
        syncDebug();
        options.update?.(scene, dt);
      },
      render(alpha) {
        options.render?.(scene, alpha);
      }
    };

    const loop = createLoop({
      fps: options.fps || 60,
      update: dt => scene.update(dt),
      render: alpha => scene.render(alpha)
    });

    scene.loop = loop;
    scene.start = () => {
      loop.start();
      return scene;
    };
    scene.stop = () => {
      loop.stop();
      return scene;
    };
    scene.step = dt => {
      loop.step(dt);
      return scene;
    };
    scene.setDebug(debug);
    return scene;
  }

  function createSprite(config = {}) {
    const sprite = document.createElement('div');
    sprite.className = `arcade-sprite ${config.className || ''}`.trim();
    sprite.dataset.form = config.form || 'hero';
    sprite.style.setProperty('--sprite-x', `${config.x || 0}px`);
    sprite.style.setProperty('--sprite-y', `${config.y || 0}px`);
    sprite.style.setProperty('--sprite-w', `${config.w || 24}px`);
    sprite.style.setProperty('--sprite-h', `${config.h || 24}px`);
    if (config.label) sprite.setAttribute('aria-label', config.label);
    if (config.html) sprite.innerHTML = config.html;
    return sprite;
  }

  function setSpritePosition(sprite, x, y) {
    sprite.style.setProperty('--sprite-x', `${Math.round(x)}px`);
    sprite.style.setProperty('--sprite-y', `${Math.round(y)}px`);
  }

  function createCharacter(stageRef, config = {}) {
    const stage = stageRef.el || stageRef;
    const character = document.createElement('div');
    const model = characterModels[config.model] ? config.model : 'mascot';
    character.className = `arcade-character ${config.className || ''}`.trim();
    character.dataset.model = model;
    character.dataset.pose = characterPoses.includes(config.pose) ? config.pose : 'idle';
    character.style.setProperty('--char-x', `${config.x || 0}px`);
    character.style.setProperty('--char-y', `${config.y || 0}px`);
    character.style.setProperty('--char-scale', String(config.scale || 1));
    character.style.setProperty('--char-face', String(config.face || 1));
    character.setAttribute('aria-label', config.label || characterModels[model].label);

    const build = nextModel => {
      character.replaceChildren();
      character.dataset.model = characterModels[nextModel] ? nextModel : 'mascot';
      characterModels[character.dataset.model].parts.forEach(part => {
        const node = document.createElement('span');
        node.className = `arcade-character__part arcade-character__${part}`;
        node.dataset.part = part;
        character.appendChild(node);
      });
    };

    build(model);
    stage.appendChild(character);

    return {
      el: character,
      moveTo(x, y) {
        character.style.setProperty('--char-x', `${Math.round(x)}px`);
        character.style.setProperty('--char-y', `${Math.round(y)}px`);
        return this;
      },
      face(direction) {
        character.style.setProperty('--char-face', direction < 0 ? '-1' : '1');
        return this;
      },
      pose(nextPose) {
        character.dataset.pose = characterPoses.includes(nextPose) ? nextPose : 'idle';
        bus.emit('character:pose', { model: character.dataset.model, pose: character.dataset.pose, character });
        return this;
      },
      model(nextModel) {
        build(nextModel);
        bus.emit('character:model', { model: character.dataset.model, character });
        return this;
      },
      remove() {
        character.remove();
      }
    };
  }

  function flash(target, options = {}) {
    const stage = target.el || target;
    const node = document.createElement('div');
    node.className = 'arcade-flash';
    node.style.setProperty('--flash-color', options.color || 'rgba(245, 255, 107, 0.38)');
    node.style.setProperty('--flash-duration', `${options.duration || 180}ms`);
    stage.appendChild(node);
    window.setTimeout(() => node.remove(), options.duration || 180);
  }

  function shake(target, options = {}) {
    const stage = target.el || target;
    stage.style.animation = 'none';
    stage.offsetHeight;
    stage.style.animation = `arcade-stage-shake ${options.duration || 260}ms steps(5, end)`;
    window.setTimeout(() => {
      stage.style.animation = '';
    }, options.duration || 260);
  }

  function popup(target, text, options = {}) {
    const stage = target.el || target;
    const node = document.createElement('div');
    node.className = 'arcade-popup';
    node.textContent = String(text || 'READY');
    node.style.setProperty('--popup-x', `${options.x || 24}px`);
    node.style.setProperty('--popup-y', `${options.y || 24}px`);
    stage.appendChild(node);
    window.setTimeout(() => node.remove(), options.duration || 820);
  }

  function burst(target, options = {}) {
    const stage = target.el || target;
    const colors = palettes[stage.dataset.palette] || palettes.neon;
    const count = options.count || 18;
    const x = options.x || stage.clientWidth / 2;
    const y = options.y || stage.clientHeight / 2;

    for (let index = 0; index < count; index += 1) {
      const particle = document.createElement('span');
      const angle = (Math.PI * 2 * index) / count;
      const distance = options.distance || 42;
      particle.className = 'arcade-particle';
      particle.style.setProperty('--particle-x', `${x}px`);
      particle.style.setProperty('--particle-y', `${y}px`);
      particle.style.setProperty('--particle-dx', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--particle-dy', `${Math.sin(angle) * distance}px`);
      particle.style.setProperty('--particle-color', pick(colors, index));
      particle.style.setProperty('--particle-size', `${options.size || 4}px`);
      stage.appendChild(particle);
      window.setTimeout(() => particle.remove(), options.duration || 560);
    }
  }

  function spawnEffect(target, className, options = {}) {
    const stage = target.el || target;
    const node = document.createElement('div');
    node.className = className;
    node.style.setProperty('--effect-x', `${options.x || stage.clientWidth / 2}px`);
    node.style.setProperty('--effect-y', `${options.y || stage.clientHeight / 2}px`);
    node.style.setProperty('--effect-w', `${options.w || 64}px`);
    node.style.setProperty('--effect-h', `${options.h || 64}px`);
    stage.appendChild(node);
    window.setTimeout(() => node.remove(), options.duration || 900);
    return node;
  }

  function rain(target, options = {}) {
    return spawnEffect(target, 'arcade-effect arcade-effect--rain', { duration: 1200, ...options });
  }

  function lightning(target, options = {}) {
    flash(target, { color: 'rgba(245, 255, 107, 0.48)', duration: 130 });
    shake(target, { duration: 180 });
    return spawnEffect(target, 'arcade-effect arcade-effect--lightning', { duration: 360, ...options });
  }

  function portal(target, options = {}) {
    return spawnEffect(target, 'arcade-effect arcade-effect--portal', { duration: 1100, ...options });
  }

  function tornado(target, options = {}) {
    return spawnEffect(target, 'arcade-effect arcade-effect--tornado', { duration: 1300, ...options });
  }

  function createInput(target, handlers = {}) {
    const pressed = new Set();
    const down = event => {
      pressed.add(event.key.toLowerCase());
      handlers.down?.(event.key.toLowerCase(), event);
    };
    const up = event => {
      pressed.delete(event.key.toLowerCase());
      handlers.up?.(event.key.toLowerCase(), event);
    };
    target.addEventListener('keydown', down);
    target.addEventListener('keyup', up);
    return {
      pressed,
      isDown: key => pressed.has(key.toLowerCase()),
      destroy() {
        target.removeEventListener('keydown', down);
        target.removeEventListener('keyup', up);
      }
    };
  }

  function createTimeline(defaults = {}) {
    const steps = [];
    let timers = [];
    let active = false;
    const speed = defaults.speed || 1;
    const api = {
      at(time, action) {
        steps.push({ time: Math.max(0, Number(time) || 0), action });
        return api;
      },
      wait(time) {
        const previous = steps.reduce((max, step) => Math.max(max, step.time), 0);
        return api.at(previous + Math.max(0, Number(time) || 0), () => {});
      },
      call(action) {
        const previous = steps.reduce((max, step) => Math.max(max, step.time), 0);
        return api.at(previous, action);
      },
      tween(target, props, duration = 300, options = {}) {
        const startAt = Number(options.at ?? steps.reduce((max, step) => Math.max(max, step.time), 0));
        return api.at(startAt, () => {
          const from = {};
          Object.keys(props).forEach(key => {
            from[key] = Number(target[key] || 0);
          });
          const started = performance.now();
          const ease = options.ease || (t => t);
          const run = (now) => {
            if (!active) return;
            const progress = clamp((now - started) / duration, 0, 1);
            const eased = ease(progress);
            Object.keys(props).forEach(key => {
              target[key] = from[key] + (Number(props[key]) - from[key]) * eased;
            });
            target.render?.();
            if (progress < 1) requestAnimationFrame(run);
          };
          requestAnimationFrame(run);
        });
      },
      play(context = {}) {
        api.stop();
        active = true;
        const ordered = [...steps].sort((a, b) => a.time - b.time);
        const total = ordered.reduce((max, step) => Math.max(max, step.time), 0);
        ordered.forEach(step => {
          const timer = window.setTimeout(() => {
            if (active) step.action?.(context, api);
          }, step.time / speed);
          timers.push(timer);
        });
        return new Promise(resolve => {
          const timer = window.setTimeout(() => {
            active = false;
            resolve(context);
          }, (total + (defaults.tail || 0)) / speed);
          timers.push(timer);
        });
      },
      stop() {
        timers.forEach(timer => window.clearTimeout(timer));
        timers = [];
        active = false;
        return api;
      },
      clear() {
        api.stop();
        steps.length = 0;
        return api;
      },
      getSteps: () => [...steps]
    };
    return api;
  }

  function createPetActionTemplate(options = {}) {
    const ownsStage = !options.stage;
    const stage = options.stage || createStage({
      mount: options.mount,
      palette: options.palette || 'neon',
      minHeight: options.minHeight || 190
    });
    const actor = stage.character({
      model: options.model || 'mascot',
      pose: 'idle',
      x: options.x || 136,
      y: options.y || 104,
      scale: options.scale || 1.1,
      label: options.label || 'arcade pet actor'
    });

    const runAction = (action = 'storm') => {
      const t = createTimeline({ tail: 300 });
      if (action === 'storm') {
        t.at(0, () => actor.pose('idle'))
          .at(120, () => rain(stage, { x: 120, y: 22, w: 86, h: 78 }))
          .at(680, () => actor.pose('hit'))
          .at(720, () => lightning(stage, { x: 146, y: 34, w: 46, h: 96 }))
          .at(1120, () => actor.pose('idle'));
      } else if (action === 'tornado') {
        t.at(0, () => actor.pose('walk'))
          .at(80, () => tornado(stage, { x: 118, y: 56, w: 88, h: 112 }))
          .at(260, () => actor.pose('jump'))
          .at(860, () => actor.moveTo(220, 56).face(-1))
          .at(1260, () => actor.moveTo(136, 104).pose('idle').face(1));
      } else if (action === 'portal') {
        t.at(0, () => portal(stage, { x: 128, y: 104, w: 72, h: 36 }))
          .at(360, () => actor.el.setAttribute('aria-hidden', 'true'))
          .at(720, () => actor.moveTo(58, 104))
          .at(820, () => portal(stage, { x: 48, y: 104, w: 72, h: 36 }))
          .at(1120, () => actor.el.removeAttribute('aria-hidden'));
      } else {
        t.at(0, () => actor.pose('cast'))
          .at(120, () => burst(stage, { x: 158, y: 92, count: 24 }))
          .at(680, () => actor.pose('idle'));
      }
      return t.play({ stage, actor, action });
    };

    return {
      stage,
      actor,
      runAction,
      destroy() {
        actor.remove();
        if (ownsStage) stage.destroy();
      }
    };
  }

  function createMiniShooterTemplate(options = {}) {
    const stage = options.stage || createStage({
      mount: options.mount,
      palette: options.palette || 'neogeo',
      minHeight: options.minHeight || 190
    });
    const scene = createScene({ stage, fps: 30, debug: options.debug });
    const player = scene.sprite({
      id: 'player',
      type: 'player',
      form: 'ship',
      x: 144,
      y: 138,
      w: 28,
      h: 30,
      hitbox: { x: 6, y: 5, w: 16, h: 20 },
      tags: ['player']
    });

    for (let index = 0; index < 4; index += 1) {
      scene.sprite({
        type: 'enemy',
        form: index % 2 ? 'orb' : 'hero',
        x: 34 + index * 68,
        y: 28 + (index % 2) * 18,
        w: 24,
        h: 24,
        vx: index % 2 ? -0.026 : 0.026,
        tags: ['enemy'],
        update(entity) {
          if (entity.x < 18 || entity.x > 278) entity.vx *= -1;
        }
      });
    }

    scene.onCollision('player', 'enemy', (a, b) => {
      b.alive = false;
      burst(stage, { x: b.x + 12, y: b.y + 12, count: 14, distance: 28 });
      flash(stage, { color: 'rgba(255, 46, 166, 0.22)', duration: 90 });
    });

    let direction = 1;
    scene.loop.stop();
    const originalUpdate = scene.update.bind(scene);
    scene.update = (dt) => {
      player.x += direction * dt * 0.055;
      if (player.x < 28 || player.x > 260) direction *= -1;
      originalUpdate(dt);
    };
    scene.start();

    return {
      stage,
      scene,
      player,
      destroy() {
        scene.stop();
        scene.clear();
      }
    };
  }

  window.ConviviumArcadeKit = {
    version,
    palettes,
    characterModels,
    characterPoses,
    bus,
    clamp,
    pick,
    uid,
    storage: { create: createStorage },
    loop: { create: createLoop },
    collision: { rectsIntersect },
    timeline: createTimeline,
    createLoop,
    createStorage,
    createStage,
    createCanvasRenderer,
    createPhaserAdapter,
    createScene,
    createEntity,
    createSprite,
    createCharacter,
    setSpritePosition,
    input: { create: createInput },
    renderers: {
      canvas2d: createCanvasRenderer
    },
    adapters: {
      phaser: createPhaserAdapter
    },
    fx: { flash, shake, popup, burst, rain, lightning, portal, tornado },
    templates: {
      petAction: createPetActionTemplate,
      miniShooter: createMiniShooterTemplate
    }
  };
})();
