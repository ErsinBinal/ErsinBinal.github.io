/**
 * Convivium - Ekran koruyucu (GB-CVM Orbital View)
 * Galaksi + gunes sistemi canvas animasyonu; home-protocol.js icinden
 * cikarilmis modul. createScreenSaver(deps) fabrikasi ile kurulur.
 * (c) 2026 Ersin Binal - https://ersinbinal.github.io
 */
(() => {
  window.ConviviumHome = window.ConviviumHome || {};

  window.ConviviumHome.createScreenSaver = (deps) => {
    const {
      pulse,
      persistUserPreferences,
      closeCommand,
      mobileCommandButton,
      getLastFocused,
      setLastFocused,
      getWanderers
    } = deps;

    let screenSaverOverlay = null;
    let screenSaverCanvas = null;
    let screenSaverContext = null;
    let screenSaverGalaxyCanvas = null;
    let screenSaverGalaxyContext = null;
    let screenSaverFrame = null;
    let screenSaverStart = 0;
    let screenSaverPlanetOrder = [];

    const screenSaverPlanets = [
      {
        name: 'MERCURY',
        short: 'MERC',
        orbit: 0.2,
        speed: 1.6,
        phase: 0.5,
        radius: 17,
        moons: 0,
        color: '#caffd8',
        texture: 'crater',
        diameter: '4,879 km',
        density: '5.43 g/cm3',
        age: '~4.50B yr',
        mass: '3.30e23 kg',
        elements: 'Fe core / silicate mantle'
      },
      {
        name: 'VENUS',
        short: 'VEN',
        orbit: 0.31,
        speed: 1.05,
        phase: 2.2,
        radius: 25,
        moons: 0,
        color: '#9cffb8',
        texture: 'cloud',
        diameter: '12,104 km',
        density: '5.24 g/cm3',
        age: '~4.50B yr',
        mass: '4.87e24 kg',
        elements: 'CO2 veil / basalt / Fe'
      },
      {
        name: 'EARTH',
        short: 'EARTH',
        orbit: 0.43,
        speed: 0.78,
        phase: 3.1,
        radius: 26,
        moons: 1,
        color: '#d8ffe1',
        texture: 'continents',
        diameter: '12,742 km',
        density: '5.51 g/cm3',
        age: '~4.54B yr',
        mass: '5.97e24 kg',
        elements: 'Fe / O / Si / Mg'
      },
      {
        name: 'MARS',
        short: 'MARS',
        orbit: 0.55,
        speed: 0.58,
        phase: 1.4,
        radius: 20,
        moons: 2,
        color: '#7fdc92',
        texture: 'bands',
        diameter: '6,779 km',
        density: '3.93 g/cm3',
        age: '~4.50B yr',
        mass: '6.42e23 kg',
        elements: 'Fe oxide / silicate'
      },
      {
        name: 'JUPITER',
        short: 'JOV',
        orbit: 0.7,
        speed: 0.34,
        phase: 4.5,
        radius: 42,
        moons: 4,
        color: '#caffd8',
        texture: 'gas',
        diameter: '139,820 km',
        density: '1.33 g/cm3',
        age: '~4.50B yr',
        mass: '1.90e27 kg',
        elements: 'H / He / trace CH4'
      },
      {
        name: 'SATURN',
        short: 'SAT',
        orbit: 0.84,
        speed: 0.24,
        phase: 5.4,
        radius: 38,
        moons: 5,
        color: '#9cffb8',
        texture: 'rings',
        diameter: '116,460 km',
        density: '0.69 g/cm3',
        age: '~4.50B yr',
        mass: '5.68e26 kg',
        elements: 'H / He / ice traces'
      },
      {
        name: 'URANUS',
        short: 'URA',
        orbit: 0.96,
        speed: 0.17,
        phase: 0.9,
        radius: 30,
        moons: 4,
        color: '#8effc1',
        texture: 'tilt',
        diameter: '50,724 km',
        density: '1.27 g/cm3',
        age: '~4.50B yr',
        mass: '8.68e25 kg',
        elements: 'H / He / methane ice'
      },
      {
        name: 'NEPTUNE',
        short: 'NEP',
        orbit: 1.08,
        speed: 0.13,
        phase: 2.8,
        radius: 30,
        moons: 3,
        color: '#a8ffd0',
        texture: 'storm',
        diameter: '49,244 km',
        density: '1.64 g/cm3',
        age: '~4.50B yr',
        mass: '1.02e26 kg',
        elements: 'H / He / methane'
      }
    ];

    // --- Ortak ekran koruyucu: presence gezginleri uydu olarak dolasir,
    // canli sohbet mesajlari kayan yildiz olarak gecer. ---
    const SIGNAL_STREAM_MS = 7000;
    let signalStreams = []; // { text, start }

    const hashTag = (value) => Math.abs(
      [...String(value || '')].reduce((hash, ch) => (Math.imul(hash, 33) + ch.charCodeAt(0)) | 0, 9)
    );

    const drawWanderers = (ctx, cx, cy, width, height, elapsed, reduced) => {
      const list = (typeof getWanderers === 'function' ? getWanderers() : []) || [];
      if (!list.length) return;
      list.slice(0, 8).forEach((wanderer) => {
        const seed = hashTag(wanderer.tag);
        const orbit = Math.min(width, height) * (0.2 + (seed % 5) * 0.055);
        const speed = 0.045 + (seed % 7) * 0.011;
        const angle = (seed % 628) / 100 + (reduced ? 0 : elapsed * speed);
        const x = cx + Math.cos(angle) * orbit * 1.4;
        const y = cy + Math.sin(angle) * orbit * 0.56;
        ctx.save();
        ctx.fillStyle = 'rgba(0, 234, 255, 0.88)';
        ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
        ctx.strokeStyle = 'rgba(0, 234, 255, 0.32)';
        ctx.strokeRect(Math.round(x) - 6, Math.round(y) - 6, 12, 12);
        drawPixelText(ctx, wanderer.tag, x + 10, y - 4, 'rgba(0, 234, 255, 0.78)', 10);
        if (wanderer.room) drawPixelText(ctx, wanderer.room, x + 10, y + 8, 'rgba(202, 255, 216, 0.5)', 9);
        ctx.restore();
      });
      drawPixelText(ctx, `WANDERERS IN ORBIT: ${list.length}`, 14, height - 16, 'rgba(0, 234, 255, 0.6)', 10);
    };

    const drawSignalStreams = (ctx, width, height, reduced) => {
      const now = performance.now();
      signalStreams = signalStreams.filter((s) => now - s.start < SIGNAL_STREAM_MS);
      signalStreams.forEach((stream, index) => {
        const t = (now - stream.start) / SIGNAL_STREAM_MS;
        const y = height * (0.14 + index * 0.075);
        const x = reduced ? width * 0.08 : width * (1.05 - t * 1.35);
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 234, 255, 0.45)';
        ctx.beginPath();
        ctx.moveTo(x - 6, y + 2);
        ctx.lineTo(x - 52, y + 9);
        ctx.stroke();
        ctx.fillStyle = '#d8ffe1';
        ctx.fillRect(Math.round(x) - 4, Math.round(y), 4, 3);
        drawPixelText(ctx, stream.text, x + 8, y + 5, 'rgba(216, 255, 225, 0.88)', 11);
        ctx.restore();
      });
    };

    const pushSignal = (text) => {
      const body = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 72);
      if (!body) return;
      const now = performance.now();
      signalStreams = [
        ...signalStreams.filter((s) => now - s.start < SIGNAL_STREAM_MS),
        { text: body, start: now }
      ].slice(-3);
      // Reduced-motion'da animasyon dongusu durur; tek kare tazele ki mesaj gorunsun.
      if (screenSaverOverlay?.classList.contains('is-active') &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        drawScreenSaverSystem(performance.now());
      }
    };

    const stopScreenSaverSystem = () => {
      if (screenSaverFrame) window.cancelAnimationFrame(screenSaverFrame);
      screenSaverFrame = null;
    };

    const resizeScreenSaverSystem = () => {
      if (screenSaverGalaxyCanvas && screenSaverGalaxyContext) {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        screenSaverGalaxyCanvas.width = Math.max(1, Math.floor(window.innerWidth * ratio));
        screenSaverGalaxyCanvas.height = Math.max(1, Math.floor(window.innerHeight * ratio));
        screenSaverGalaxyCanvas.style.width = `${window.innerWidth}px`;
        screenSaverGalaxyCanvas.style.height = `${window.innerHeight}px`;
        screenSaverGalaxyContext.setTransform(ratio, 0, 0, ratio, 0, 0);
        screenSaverGalaxyContext.imageSmoothingEnabled = false;
      }
      if (!screenSaverCanvas || !screenSaverContext) return;
      const box = screenSaverCanvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      screenSaverCanvas.width = Math.max(1, Math.floor(box.width * ratio));
      screenSaverCanvas.height = Math.max(1, Math.floor(box.height * ratio));
      screenSaverContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      screenSaverContext.imageSmoothingEnabled = false;
    };

    const drawPixelText = (ctx, text, x, y, color = '#caffd8', size = 11) => {
      ctx.save();
      ctx.font = `${size}px "Share Tech Mono", monospace`;
      ctx.fillStyle = color;
      ctx.shadowColor = 'rgba(156, 255, 184, 0.36)';
      ctx.shadowBlur = 6;
      ctx.fillText(text, Math.round(x), Math.round(y));
      ctx.restore();
    };

    const shuffleScreenSaverPlanets = () => {
      screenSaverPlanetOrder = screenSaverPlanets.map((_, index) => index);
      for (let index = screenSaverPlanetOrder.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [screenSaverPlanetOrder[index], screenSaverPlanetOrder[swapIndex]] = [screenSaverPlanetOrder[swapIndex], screenSaverPlanetOrder[index]];
      }
    };

    const drawPlanetTexture = (ctx, planet, x, y, radius, elapsed) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = planet.color;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

      ctx.fillStyle = 'rgba(7, 20, 7, 0.34)';
      for (let row = -radius; row <= radius; row += 7) {
        const wave = Math.sin(row * 0.25 + elapsed * 1.4) * 4;
        if (planet.texture === 'gas' || planet.texture === 'cloud' || planet.texture === 'bands') {
          ctx.fillRect(Math.round(x - radius), Math.round(y + row + wave), Math.round(radius * 2), 3);
        }
      }

      if (planet.texture === 'continents') {
        [[-12, -6, 18, 9], [6, 4, 20, 7], [-4, 15, 14, 5]].forEach(([dx, dy, w, h]) => {
          ctx.fillRect(Math.round(x + dx), Math.round(y + dy), w, h);
        });
      } else if (planet.texture === 'crater') {
        [[-12, -9, 5], [9, -4, 4], [-3, 10, 6], [12, 12, 3]].forEach(([dx, dy, size]) => {
          ctx.strokeStyle = 'rgba(7, 20, 7, 0.56)';
          ctx.strokeRect(Math.round(x + dx), Math.round(y + dy), size, size);
        });
      } else if (planet.texture === 'storm') {
        ctx.strokeStyle = 'rgba(7, 20, 7, 0.5)';
        ctx.strokeRect(Math.round(x + radius * 0.12), Math.round(y - radius * 0.18), Math.round(radius * 0.46), Math.round(radius * 0.18));
      } else if (planet.texture === 'tilt') {
        ctx.fillStyle = 'rgba(7, 20, 7, 0.28)';
        for (let offset = -radius; offset < radius; offset += 9) {
          ctx.fillRect(Math.round(x + offset), Math.round(y - radius), 3, radius * 2);
        }
      }

      ctx.restore();
      ctx.strokeStyle = 'rgba(202, 255, 216, 0.84)';
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.round(x - radius), Math.round(y - radius), Math.round(radius * 2), Math.round(radius * 2));
      ctx.strokeStyle = 'rgba(7, 20, 7, 0.48)';
      ctx.beginPath();
      ctx.arc(x - radius * 0.22, y - radius * 0.28, radius * 0.9, Math.PI * 1.15, Math.PI * 1.72);
      ctx.stroke();

      if (planet.texture === 'rings') {
        ctx.strokeStyle = 'rgba(202, 255, 216, 0.86)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, y, radius * 1.7, radius * 0.42, -0.12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(7, 20, 7, 0.72)';
        ctx.beginPath();
        ctx.ellipse(x, y, radius * 1.28, radius * 0.28, -0.12, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    const drawFeaturedPlanet = (ctx, planet, width, height, elapsed, reduced) => {
      const x = width * 0.34;
      const y = height * 0.42;
      const radius = Math.max(24, Math.min(width, height) * (planet.radius / 360));
      const orbitRadius = radius * 2.1;

      ctx.save();
      ctx.strokeStyle = 'rgba(156, 255, 184, 0.24)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.ellipse(x, y, orbitRadius * 1.4, orbitRadius * 0.54, -0.18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      for (let index = 0; index < planet.moons; index += 1) {
        const angle = (reduced ? index : elapsed * (0.9 + index * 0.13)) + index * 1.72;
        const mx = x + Math.cos(angle) * orbitRadius * (0.86 + index * 0.11);
        const my = y + Math.sin(angle) * orbitRadius * 0.38;
        ctx.fillStyle = index % 2 ? 'rgba(0, 234, 255, 0.78)' : 'rgba(202, 255, 216, 0.86)';
        ctx.fillRect(Math.round(mx), Math.round(my), index > 2 ? 3 : 4, index > 2 ? 3 : 4);
        ctx.strokeStyle = 'rgba(202, 255, 216, 0.18)';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(mx, my);
        ctx.stroke();
      }

      drawPlanetTexture(ctx, planet, x, y, radius, elapsed);
      drawPixelText(ctx, `FOCUS: ${planet.name}`, x - radius * 1.35, y - radius - 20, '#d8ffe1');
      drawPixelText(ctx, `MOONS: ${planet.moons}`, x - radius * 1.35, y + radius + 20, 'rgba(202, 255, 216, 0.72)');
      ctx.restore();
    };

    const drawDataTicker = (ctx, planet, width, height, elapsed, reduced) => {
      const panelX = 12;
      const panelY = Math.max(88, height - 112);
      const panelW = width - 24;
      const panelH = 94;
      const trim = (value, max = 23) => value.length > max ? `${value.slice(0, max - 1)}.` : value;
      const rows = [
        ['PLANET', trim(planet.name, 18)],
        ['DIAM', planet.diameter],
        ['DENS', planet.density],
        ['ELEM', trim(planet.elements, 24)],
        ['AGE', planet.age],
        ['MASS', planet.mass]
      ];
      const activeRow = reduced ? -1 : Math.floor(elapsed * 0.45) % rows.length;
      const secondary = screenSaverPlanetOrder.map(index => screenSaverPlanets[index].short).join(' > ');
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
      ctx.fillRect(panelX, panelY, panelW, panelH);
      ctx.strokeStyle = 'rgba(156, 255, 184, 0.26)';
      ctx.strokeRect(panelX, panelY, panelW, panelH);
      drawPixelText(ctx, 'PLANET DATA STREAM', panelX + 8, panelY + 15, '#d8ffe1', 10);
      rows.forEach(([label, value], index) => {
        const y = panelY + 30 + index * 10;
        if (index === activeRow) {
          ctx.fillStyle = 'rgba(156, 255, 184, 0.12)';
          ctx.fillRect(panelX + 6, y - 8, panelW - 12, 10);
        }
        drawPixelText(ctx, `${label.padEnd(6, ' ')} ${value}`, panelX + 8, y, index === activeRow ? '#d8ffe1' : 'rgba(202, 255, 216, 0.78)', 9);
      });
      const marker = reduced ? 0 : Math.floor((elapsed * 7) % Math.max(1, panelW - 18));
      ctx.fillStyle = 'rgba(0, 234, 255, 0.58)';
      ctx.fillRect(panelX + 8, panelY + panelH - 13, marker, 2);
      drawPixelText(ctx, `QUEUE ${trim(secondary, 28)}`, panelX + 8, panelY + panelH - 3, 'rgba(0, 234, 255, 0.72)', 9);
      ctx.restore();
    };

    const drawScreenSaverGalaxy = (time = performance.now()) => {
      if (!screenSaverGalaxyCanvas || !screenSaverGalaxyContext || !screenSaverOverlay?.classList.contains('is-active')) return;
      const ctx = screenSaverGalaxyContext;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const elapsed = (time - screenSaverStart) / 1000;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      ctx.clearRect(0, 0, width, height);

      const hash = (value) => {
        const raw = Math.sin(value * 12.9898) * 43758.5453;
        return raw - Math.floor(raw);
      };

      const cx = width * (0.5 + (reduced ? 0 : Math.sin(elapsed * 0.06) * 0.025));
      const cy = height * (0.48 + (reduced ? 0 : Math.cos(elapsed * 0.045) * 0.02));
      const scale = Math.max(width, height);
      const travel = reduced ? 0.18 : elapsed * 0.075;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 520; i += 1) {
        const seed = i + 300;
        const lane = hash(seed) * Math.PI * 2;
        const spiral = hash(seed + 1) * 3.4;
        const loop = (hash(seed + 2) + travel * (0.55 + hash(seed + 4) * 0.7)) % 1;
        const depth = Math.pow(loop, 2.55);
        const radius = depth * scale * (0.08 + hash(seed + 3) * 0.92);
        const angle = lane + depth * 4.8 + spiral + Math.sin(elapsed * 0.08 + seed) * 0.08;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius * 0.56;
        if (x < -60 || x > width + 60 || y < -60 || y > height + 60) continue;
        const tail = reduced ? 0 : 4 + depth * 42;
        const px = cx + Math.cos(angle - 0.024) * Math.max(0, radius - tail);
        const py = cy + Math.sin(angle - 0.024) * Math.max(0, radius - tail) * 0.56;
        const alpha = 0.08 + depth * 0.44;
        ctx.strokeStyle = hash(seed + 7) > 0.68
          ? `rgba(0, 234, 255, ${alpha * 0.7})`
          : `rgba(202, 255, 216, ${alpha})`;
        ctx.lineWidth = hash(seed + 8) > 0.92 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(px), Math.round(py));
        ctx.lineTo(Math.round(x), Math.round(y));
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.34 + (reduced ? 0 : Math.sin(elapsed * 0.025) * 0.06));
      const galaxyScale = scale * 0.72;
      const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, galaxyScale * 0.18);
      coreGradient.addColorStop(0, 'rgba(230, 255, 234, 0.84)');
      coreGradient.addColorStop(0.2, 'rgba(156, 255, 184, 0.46)');
      coreGradient.addColorStop(0.58, 'rgba(0, 234, 255, 0.18)');
      coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = coreGradient;
      ctx.fillRect(-galaxyScale * 0.24, -galaxyScale * 0.24, galaxyScale * 0.48, galaxyScale * 0.48);

      ctx.globalCompositeOperation = 'lighter';
      for (let arm = 0; arm < 5; arm += 1) {
        const phase = arm * (Math.PI * 2 / 5) + (reduced ? 0 : elapsed * 0.07);
        for (let i = 0; i < 360; i += 1) {
          const t = i / 359;
          const seed = arm * 1000 + i;
          const radius = galaxyScale * (0.03 + Math.pow(t, 0.9) * 0.92);
          const angle = phase + t * 7.6 + Math.sin(t * 10 + arm + elapsed * 0.05) * 0.28;
          const jitter = (hash(seed) - 0.5) * galaxyScale * 0.05 * t;
          const x = Math.cos(angle) * radius + Math.sin(seed * 0.73 + elapsed * 0.22) * jitter;
          const y = Math.sin(angle) * radius * 0.36 + Math.cos(seed * 0.51 + elapsed * 0.2) * jitter * 0.5;
          const density = Math.max(0, 1 - t) * 0.055 + hash(seed + 77) * 0.13;
          const size = hash(seed + 9) > 0.965 ? 3 : hash(seed + 13) > 0.86 ? 2 : 1;
          ctx.fillStyle = hash(seed + 41) > 0.72
            ? `rgba(0, 234, 255, ${density * 0.8})`
            : `rgba(202, 255, 216, ${density})`;
          ctx.fillRect(Math.round(x), Math.round(y), size, size);
          if (Math.sin(t * 19 + arm + elapsed * 0.08) > 0.64 && i % 3 === 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + hash(seed + 12) * 0.12})`;
            ctx.fillRect(Math.round(x - size), Math.round(y - 1), size + 3, 2);
          }
        }
      }

      ctx.globalCompositeOperation = 'source-over';
      for (let ring = 0; ring < 8; ring += 1) {
        ctx.strokeStyle = `rgba(156, 255, 184, ${0.06 - ring * 0.004})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, galaxyScale * (0.14 + ring * 0.1), galaxyScale * (0.04 + ring * 0.028), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      const flyObjects = [
        { type: 'planet', seed: 12, offset: 0.04, lane: -0.62, color: '#caffd8', label: 'ROGUE PLANET' },
        { type: 'station', seed: 44, offset: 0.25, lane: 0.42, color: '#9cffb8', label: 'ORBITAL STATION' },
        { type: 'blackhole', seed: 71, offset: 0.47, lane: -0.16, color: '#d8ffe1', label: 'MICRO BLACK HOLE' },
        { type: 'asteroid', seed: 93, offset: 0.68, lane: 0.66, color: '#7fdc92', label: 'ASTEROID FIELD' },
        { type: 'satellite', seed: 124, offset: 0.84, lane: -0.74, color: '#a8ffd0', label: 'SIGNAL RELAY' }
      ];

      flyObjects.forEach(item => {
        const progress = reduced ? item.offset : (elapsed * 0.055 + item.offset) % 1;
        const ease = Math.pow(progress, 2.35);
        const x = cx + item.lane * width * 0.6 * ease + Math.sin(elapsed * 0.8 + item.seed) * width * 0.05 * ease;
        const y = cy + (hash(item.seed) - 0.5) * height * 0.38 * ease;
        const size = 8 + ease * Math.min(width, height) * 0.2;
        const alpha = Math.min(0.9, 0.12 + ease * 0.88);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = item.color;
        ctx.fillStyle = item.color;
        ctx.lineWidth = Math.max(1, ease * 3);

        if (item.type === 'planet') {
          ctx.beginPath();
          ctx.arc(x, y, size * 0.36, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
          for (let band = -2; band <= 2; band += 1) ctx.fillRect(x - size * 0.32, y + band * size * 0.11, size * 0.64, Math.max(1, size * 0.025));
        } else if (item.type === 'station') {
          ctx.strokeRect(x - size * 0.24, y - size * 0.12, size * 0.48, size * 0.24);
          ctx.beginPath();
          ctx.moveTo(x - size * 0.72, y);
          ctx.lineTo(x + size * 0.72, y);
          ctx.moveTo(x, y - size * 0.42);
          ctx.lineTo(x, y + size * 0.42);
          ctx.stroke();
          ctx.strokeRect(x - size * 0.88, y - size * 0.1, size * 0.28, size * 0.2);
          ctx.strokeRect(x + size * 0.6, y - size * 0.1, size * 0.28, size * 0.2);
        } else if (item.type === 'blackhole') {
          ctx.strokeStyle = 'rgba(202, 255, 216, 0.85)';
          ctx.beginPath();
          ctx.ellipse(x, y, size * 0.58, size * 0.24, elapsed * 0.22, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
          ctx.beginPath();
          ctx.arc(x, y, size * 0.22, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0, 234, 255, 0.48)';
          ctx.beginPath();
          ctx.arc(x, y, size * 0.42, 0, Math.PI * 2);
          ctx.stroke();
        } else if (item.type === 'asteroid') {
          for (let rock = 0; rock < 20; rock += 1) {
            const angle = hash(item.seed + rock) * Math.PI * 2;
            const dist = hash(item.seed + rock + 10) * size * 0.86;
            ctx.fillRect(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist * 0.5, Math.max(2, size * 0.035), Math.max(2, size * 0.025));
          }
        } else {
          ctx.strokeRect(x - size * 0.16, y - size * 0.16, size * 0.32, size * 0.32);
          ctx.beginPath();
          ctx.arc(x, y, size * 0.44, 0, Math.PI * 2);
          ctx.stroke();
          ctx.moveTo(x - size * 0.6, y - size * 0.6);
          ctx.lineTo(x + size * 0.6, y + size * 0.6);
          ctx.stroke();
        }

        if (ease > 0.38) drawPixelText(ctx, item.label, x + size * 0.36, y - size * 0.22, item.color, 10);
        ctx.restore();
      });

      drawWanderers(ctx, cx, cy, width, height, elapsed, reduced);
      drawSignalStreams(ctx, width, height, reduced);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);
    };

    const drawScreenSaverSystem = (time = performance.now()) => {
      if (!screenSaverCanvas || !screenSaverContext || !screenSaverOverlay?.classList.contains('is-active')) return;
      drawScreenSaverGalaxy(time);
      const ctx = screenSaverContext;
      const width = screenSaverCanvas.clientWidth || 1;
      const height = screenSaverCanvas.clientHeight || 1;
      const elapsed = (time - screenSaverStart) / 1000;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = '#071407';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(156, 255, 184, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 12) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
        ctx.stroke();
      }

      for (let index = 0; index < 74; index += 1) {
        const drift = reduced ? 0 : elapsed * (index % 5 + 1) * 2.2;
        const x = (index * 53 + drift) % width;
        const y = (index * 97 + Math.sin(elapsed * 0.8 + index) * 4 + height) % height;
        const alpha = 0.24 + ((index * 17) % 37) / 110;
        ctx.fillStyle = `rgba(202, 255, 216, ${alpha})`;
        ctx.fillRect(Math.round(x), Math.round(y), index % 11 === 0 ? 2 : 1, 1);
      }

      const cx = width * 0.5;
      const cy = height * 0.54;
      const maxOrbit = Math.min(width, height) * 0.36;
      const order = screenSaverPlanetOrder.length ? screenSaverPlanetOrder : screenSaverPlanets.map((_, index) => index);
      const featuredIndex = order[Math.floor((reduced ? 0 : elapsed / 20) % order.length)] || 0;
      const featuredPlanet = screenSaverPlanets[featuredIndex];
      const planets = screenSaverPlanets;

      ctx.save();
      ctx.translate(cx, cy);
      planets.forEach(planet => {
        const rx = maxOrbit * planet.orbit;
        const ry = rx * 0.47;
        ctx.strokeStyle = 'rgba(156, 255, 184, 0.22)';
        ctx.setLineDash([4, 7]);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, -0.18, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(202, 255, 216, 0.22)';
      for (let i = 0; i < 34; i += 1) {
        const angle = i * 0.46 + (reduced ? 0 : elapsed * 0.12);
        const radius = maxOrbit * (0.61 + ((i * 13) % 9) / 95);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 0.47;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(0, 234, 255, 0.54)' : 'rgba(156, 255, 184, 0.42)';
        ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
      }

      const sunPulse = reduced ? 0 : Math.sin(elapsed * 3.4) * 2;
      ctx.fillStyle = '#d8ffe1';
      ctx.shadowColor = 'rgba(156, 255, 184, 0.7)';
      ctx.shadowBlur = 18;
      ctx.fillRect(Math.round(-11 - sunPulse / 2), Math.round(-11 - sunPulse / 2), Math.round(22 + sunPulse), Math.round(22 + sunPulse));
      ctx.fillStyle = '#071407';
      ctx.fillRect(-3, -15, 6, 30);
      ctx.fillRect(-15, -3, 30, 6);
      ctx.shadowBlur = 0;

      const drawn = planets.map(planet => {
        const angle = (reduced ? 0.7 : elapsed * planet.speed) + planet.phase;
        const rx = maxOrbit * planet.orbit;
        const ry = rx * 0.47;
        return {
          ...planet,
          x: Math.cos(angle) * rx,
          y: Math.sin(angle) * ry,
          depth: Math.sin(angle)
        };
      }).sort((a, b) => a.depth - b.depth);

      drawn.forEach(planet => {
        const dim = planet.depth < 0 ? 0.58 : 1;
        const size = Math.max(3, Math.round(planet.radius / 6));
        ctx.fillStyle = planet.color;
        ctx.globalAlpha = dim;
        ctx.fillRect(Math.round(planet.x - size / 2), Math.round(planet.y - size / 2), size, size);
        if (planet.name === 'SATURN') {
          ctx.strokeStyle = 'rgba(202, 255, 216, 0.8)';
          ctx.strokeRect(Math.round(planet.x - 11), Math.round(planet.y - 3), 22, 6);
        }
        if (planet === featuredPlanet) {
          ctx.strokeStyle = 'rgba(0, 234, 255, 0.9)';
          ctx.strokeRect(Math.round(planet.x - size - 3), Math.round(planet.y - size - 3), size * 2 + 6, size * 2 + 6);
        }
        ctx.globalAlpha = 1;
        if (planet.depth > -0.2) drawPixelText(ctx, planet.short, planet.x + 8, planet.y - 7, 'rgba(202, 255, 216, 0.72)');
      });

      const cometAngle = reduced ? 2.6 : (elapsed * 0.52) % (Math.PI * 2);
      const cometX = Math.cos(cometAngle) * maxOrbit * 0.96;
      const cometY = Math.sin(cometAngle) * maxOrbit * 0.26 - maxOrbit * 0.52;
      ctx.strokeStyle = 'rgba(0, 234, 255, 0.7)';
      ctx.beginPath();
      ctx.moveTo(cometX, cometY);
      ctx.lineTo(cometX - 28, cometY + 8);
      ctx.stroke();
      ctx.fillStyle = '#caffd8';
      ctx.fillRect(Math.round(cometX), Math.round(cometY), 4, 2);
      ctx.restore();

      drawFeaturedPlanet(ctx, featuredPlanet, width, height, elapsed, reduced);
      drawDataTicker(ctx, featuredPlanet, width, height, elapsed, reduced);
      drawPixelText(ctx, 'GB-CVM ORBITAL VIEW', 14, 28, 'rgba(156, 255, 184, 0.72)');
      drawPixelText(ctx, `T+${String(Math.floor(elapsed)).padStart(4, '0')}`, width - 78, 28, 'rgba(156, 255, 184, 0.72)');

      if (!reduced) screenSaverFrame = window.requestAnimationFrame(drawScreenSaverSystem);
    };

    const startScreenSaverSystem = () => {
      stopScreenSaverSystem();
      screenSaverCanvas = screenSaverOverlay?.querySelector('.screen-saver-system-canvas');
      screenSaverContext = screenSaverCanvas?.getContext('2d') || null;
      if (!screenSaverCanvas || !screenSaverContext) return;
      screenSaverGalaxyCanvas = screenSaverOverlay?.querySelector('.screen-saver-galaxy-canvas');
      screenSaverGalaxyContext = screenSaverGalaxyCanvas?.getContext('2d') || null;
      screenSaverStart = performance.now();
      shuffleScreenSaverPlanets();
      resizeScreenSaverSystem();
      drawScreenSaverSystem(screenSaverStart);
    };

    const closeScreenSaver = () => {
      if (!screenSaverOverlay) return;
      stopScreenSaverSystem();
      screenSaverOverlay.classList.remove('is-active');
      screenSaverOverlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('screen-saver-active');
      persistUserPreferences({ screenSaverActive: false });
      const lastFocused = getLastFocused();
      if (lastFocused && document.contains(lastFocused) && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      } else {
        mobileCommandButton?.focus();
      }
    };

    const ensureScreenSaverOverlay = () => {
      if (screenSaverOverlay) return screenSaverOverlay;
      screenSaverOverlay = document.createElement('button');
      screenSaverOverlay.type = 'button';
      screenSaverOverlay.className = 'screen-saver-overlay';
      screenSaverOverlay.setAttribute('aria-hidden', 'true');
      screenSaverOverlay.setAttribute('aria-label', 'Ekran koruyucuyu kapat');
      screenSaverOverlay.innerHTML = [
        '<canvas class="screen-saver-galaxy-canvas" aria-hidden="true"></canvas>',
        '<span class="screen-saver-noise" aria-hidden="true"></span>',
        '<span class="screen-saver-logo" aria-hidden="true">Convivium</span>',
        '<span class="screen-saver-system" aria-hidden="true">',
        '  <span class="system-label">LOCAL SOLAR MAP</span>',
        '  <canvas class="screen-saver-system-canvas"></canvas>',
        '  <span class="system-sun"></span>',
        '  <span class="system-orbit orbit-1"><span class="system-planet planet-1"></span></span>',
        '  <span class="system-orbit orbit-2"><span class="system-planet planet-2"></span></span>',
        '  <span class="system-orbit orbit-3"><span class="system-planet planet-3"></span></span>',
        '  <span class="system-orbit orbit-4"><span class="system-planet planet-4"></span></span>',
        '  <span class="system-orbit orbit-5"><span class="system-planet planet-5"></span></span>',
        '</span>',
        '<span class="screen-saver-status" aria-hidden="true">',
        '  <span>SCREEN SAVER</span>',
        '  <span>PUBLIC DISPLAY IDLE</span>',
        '  <span>CLICK / KEY TO RETURN</span>',
        '</span>',
        '<span class="screen-saver-trace" aria-hidden="true">C:\\CONVIVIUM\\IDLE&gt; phosphor drift active</span>'
      ].join('');
      screenSaverOverlay.addEventListener('click', closeScreenSaver);
      document.body.appendChild(screenSaverOverlay);
      return screenSaverOverlay;
    };

    const screenSaverCommand = () => {
      const overlay = ensureScreenSaverOverlay();
      // Shop'tan alinan varyant (shards ekonomisi): mor drift renk kaymasi.
      try {
        overlay.classList.toggle('saver-variant-drift', localStorage.getItem('convivium.saver.variant') === 'drift');
      } catch { /* kozmetik; sessiz gec */ }
      setLastFocused(document.activeElement);
      closeCommand();
      overlay.classList.add('is-active');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('screen-saver-active');
      overlay.focus();
      startScreenSaverSystem();
      persistUserPreferences({ screenSaverActive: true });
      pulse(310, 0.08);
      return 'screen saver active';
    };

    return {
      command: screenSaverCommand,
      close: closeScreenSaver,
      pushSignal,
      isActive: () => Boolean(screenSaverOverlay?.classList.contains('is-active')),
      handleResize: () => {
        resizeScreenSaverSystem();
        drawScreenSaverSystem(performance.now());
      }
    };
  };
})();
