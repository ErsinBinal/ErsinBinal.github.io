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

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const pick = (items, index = Math.floor(Math.random() * items.length)) => items[index % items.length];

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

  window.ConviviumArcadeKit = {
    version: '0.2.0',
    palettes,
    characterModels,
    characterPoses,
    bus,
    clamp,
    pick,
    createStage,
    createSprite,
    createCharacter,
    setSpritePosition,
    input: { create: createInput },
    fx: { flash, shake, popup, burst }
  };
})();
