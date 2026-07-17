/**
 * Convivium - PIPE-90 (tokamak coolant boru bulmacasi)
 * home-protocol.js icinden cikarilmis terminal oyunu modulu.
 * createPipe90(deps) fabrikasi ile kurulur; DOM referanslari ve dunya
 * durumu (state/award/persist) home-protocol tarafindan enjekte edilir.
 * (c) 2026 Ersin Binal - https://ersinbinal.github.io
 */
(() => {
  window.ConviviumHome = window.ConviviumHome || {};

  window.ConviviumHome.createPipe90 = (deps) => {
    const {
      commandShell,
      commandOutput,
      pulse,
      audioCue,
      normalizeCommand,
      award,
      state,
      persist,
      scheduleWorldSave,
      updateAccess
    } = deps;

    let pipeGame = null;
    let pipeAnimationTimers = [];
    let pipeIntroActive = false;

    const pipePieces = [
      { id: 'straight', glyphs: ['│', '─'], masks: [5, 10], weight: 4 },
      { id: 'bend', glyphs: ['└', '┌', '┐', '┘'], masks: [3, 6, 12, 9], weight: 5 },
      { id: 'junction', glyphs: ['┴', '├', '┬', '┤'], masks: [11, 7, 14, 13], weight: 1 },
      { id: 'cross', glyphs: ['┼'], masks: [15], weight: 1 }
    ];
    const pipeDirs = [
      { bit: 1, dr: -1, dc: 0, opposite: 4, name: 'north' },
      { bit: 2, dr: 0, dc: 1, opposite: 8, name: 'east' },
      { bit: 4, dr: 1, dc: 0, opposite: 1, name: 'south' },
      { bit: 8, dr: 0, dc: -1, opposite: 2, name: 'west' }
    ];
    const pipeBag = pipePieces.flatMap(piece => Array.from({ length: piece.weight }, () => piece));

    const createPipePiece = () => {
      const template = pipeBag[Math.floor(Math.random() * pipeBag.length)];
      return { id: template.id, rotation: Math.floor(Math.random() * template.glyphs.length) };
    };

    const pipeMask = (piece) => {
      const template = pipePieces.find(item => item.id === piece.id);
      return template?.masks[piece.rotation % template.masks.length] || 0;
    };

    const pipeGlyph = (piece) => {
      if (piece.kind === 'source') return 'P';
      if (piece.kind === 'drain') return 'C';
      if (piece.kind === 'block') return '█';
      const template = pipePieces.find(item => item.id === piece.id);
      return template?.glyphs[piece.rotation % template.glyphs.length] || '?';
    };

    const clearPipeAnimation = () => {
      pipeAnimationTimers.forEach(timer => window.clearTimeout(timer));
      pipeAnimationTimers = [];
    };

    const setPipeGameMode = (active) => {
      commandShell?.classList.toggle('is-game-mode', Boolean(active));
    };

    // Pipe giris sinematigi (konuya uygun): reaktor coolant alarm + priming sekansi.
    // schedulePipeFinale ile ayni dil; tahta acilmadan once kisa bir sahne oynar.
    const pipeIntroFrames = () => ([
      [
        '╔══════════════════════════════════════╗',
        '║  PIPE-90  ·  TOKAMAK COOLANT CONTROL   ║',
        '╚══════════════════════════════════════╝',
        '',
        '  ⚠  ALARM — COOLANT LOOP OFFLINE',
        '     CORE TEMP 9200K ▲ RISING'
      ].join('\n'),
      [
        '  ▸ priming pump ........... [████░░░░░░]',
        '  ▸ pressurizing line ...... [██░░░░░░░░]',
        '',
        '     CORE TEMP 9200K ▲'
      ].join('\n'),
      [
        '  ▸ priming pump ........... [██████████] OK',
        '  ▸ charging plasma ring ... [███████░░░]',
        '',
        '     containment field forming...'
      ].join('\n'),
      [
        '  ▸ all systems primed ..... [██████████]',
        '',
        '     >>> OPERATOR REQUIRED <<<',
        '     route coolant: PUMP → CORE before meltdown'
      ].join('\n')
    ]);

    const startPipeGame = () => {
      clearPipeAnimation();
      // Intro sirasinda buyuk oyun-modu kutusuna GECME; aksi halde cikti kutusu
      // birden buyuyup intro metni giris alaninin altina kayiyor. Tahta hazir
      // olunca buildPipeGame() oyun modunu acar.
      pipeGame = null;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion || !commandOutput) {
        pipeIntroActive = false;
        return buildPipeGame();
      }
      pipeIntroActive = true;
      const frames = pipeIntroFrames();
      const step = 560;
      frames.forEach((frame, index) => {
        const timer = window.setTimeout(() => {
          if (pipeGame || !commandShell?.classList.contains('is-open')) return;
          commandOutput.textContent = frame;
          pulse(110);
          audioCue('terminal.suggest');
        }, index * step);
        pipeAnimationTimers.push(timer);
      });
      const finishTimer = window.setTimeout(() => {
        pipeIntroActive = false;
        if (!commandShell?.classList.contains('is-open')) { setPipeGameMode(false); return; }
        commandOutput.textContent = buildPipeGame();
        pulse(260);
      }, frames.length * step + 220);
      pipeAnimationTimers.push(finishTimer);
      return frames[0];
    };

    const buildPipeGame = () => {
      setPipeGameMode(true);
      const rows = 7;
      const cols = 8;
      const drainRow = 1 + Math.floor(Math.random() * 5);
      pipeGame = {
        active: true,
        rows,
        cols,
        cursor: { r: 3, c: 1 },
        source: { r: 3, c: 0, mask: 2 },
        drain: { r: drainRow, c: cols - 1, mask: 8 },
        grid: Array.from({ length: rows }, () => Array.from({ length: cols }, () => null)),
        queue: Array.from({ length: 6 }, createPipePiece),
        placed: 0,
        skipped: 0,
        flowIn: 36,
        score: 0,
        flowPath: new Set(),
        flowWave: new Set(),
        leakAt: null,
        temp: 9200,
        status: 'REACTOR COOLANT ready. containment opens after 36 actions.',
        resolving: false,
        won: false,
        lost: false
      };
      pipeGame.grid[pipeGame.source.r][pipeGame.source.c] = { kind: 'source', mask: pipeGame.source.mask };
      pipeGame.grid[pipeGame.drain.r][pipeGame.drain.c] = { kind: 'drain', mask: pipeGame.drain.mask };
      [
        { r: 1, c: 3 },
        { r: 5, c: 4 }
      ].forEach(block => {
        if (block.r !== pipeGame.drain.r || block.c !== pipeGame.drain.c) {
          pipeGame.grid[block.r][block.c] = { kind: 'block', mask: 0 };
        }
      });
      return renderPipeGame();
    };

    const pipeCellMask = (cell) => {
      if (!cell) return 0;
      if (cell.kind) return cell.mask || 0;
      return pipeMask(cell);
    };

    const pipeScore = (win) => {
      if (!pipeGame) return 0;
      const base = win ? 1000 : 0;
      return Math.max(0, base + (pipeGame.flowIn * 35) - (pipeGame.placed * 25) - (pipeGame.skipped * 60));
    };

    const pipeMeter = (value, max, width = 12) => {
      const clamped = Math.max(0, Math.min(max, value));
      const filled = Math.round((clamped / max) * width);
      return `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`;
    };

    const pipeTileLines = (cell, r, c) => {
      const key = `${r},${c}`;
      const cursor = pipeGame.cursor.r === r && pipeGame.cursor.c === c;
      const leak = pipeGame.leakAt === key;
      const wet = pipeGame.flowPath?.has(key);
      const wave = pipeGame.flowWave?.has(key);
      let lines = ['       ', '   .   ', '       '];

      if (cell?.kind === 'block') {
        lines = ['███████', '██ROD██', '███████'];
      } else if (cell?.kind === 'source') {
        lines = wet || wave
          ? ['╔════╗ ', '║PUMP╠≈', '╚════╝ ']
          : ['╔════╗ ', '║PUMP╠═', '╚════╝ '];
      } else if (cell?.kind === 'drain') {
        const label = pipeGame.won ? 'COLD' : pipeGame.lost ? 'HOT!' : 'CORE';
        lines = wet || wave
          ? [' ╔════╗', `≈╣${label}║`, ' ╚════╝']
          : [' ╔════╗', `═╣${label}║`, ' ╚════╝'];
      } else if (cell) {
        const mask = pipeCellMask(cell);
        const tile = Array.from({ length: 3 }, () => Array.from({ length: 7 }, () => ' '));
        const horizontal = wave ? '≋' : wet ? '≈' : '═';
        const vertical = wave ? '≋' : wet ? '≈' : '║';
        const core = wave ? '▓' : wet ? '≈' : pipeGlyph(cell);
        if (mask & 1) tile[0][3] = vertical;
        if (mask & 4) tile[2][3] = vertical;
        if (mask & 8) {
          tile[1][1] = horizontal;
          tile[1][2] = horizontal;
        }
        if (mask & 2) {
          tile[1][4] = horizontal;
          tile[1][5] = horizontal;
        }
        tile[1][3] = core;
        lines = tile.map(row => row.join(''));
      }

      if (leak) lines = ['!!XX!!!', '!KACAK!', '!!XX!!!'];
      if (cursor && !leak) {
        lines = lines.map((line, index) => {
          const chars = line.split('');
          chars[0] = index === 0 ? '┌' : index === 1 ? '│' : '└';
          chars[6] = index === 0 ? '┐' : index === 1 ? '│' : '┘';
          return chars.join('');
        });
      }
      return lines;
    };

    const pipeQueuePreview = () => pipeGame.queue
      .map((piece, index) => `${index === 0 ? 'NEXT' : `Q${index}`}[${pipeGlyph(piece)}:${piece.id.slice(0, 4)}]`)
      .join(' ');

    const pipeFinaleFrame = (title, art, lines = []) => [
      renderPipeGame(),
      '',
      title,
      art.join('\n'),
      ...lines
    ].join('\n');

    const schedulePipeFinale = (success) => {
      if (!pipeGame || !commandOutput) return;
      clearPipeAnimation();
      const gameRef = pipeGame;
      const score = pipeGame.score;
      const frames = success
        ? [
          pipeFinaleFrame('COOLANT FLOW CONFIRMED / CORE TEMP 9200K', ['        (###)', '       (#####)', '        (###)'], ['coolant valves opening...']),
          pipeFinaleFrame('CORE TEMP 5100K', ['        {***}', '       {*****}', '        {***}'], ['plasma ring stabilizing...']),
          pipeFinaleFrame('CORE TEMP 1800K', ['        [~~~]', '       [~~~~~]', '        [~~~]'], ['containment pressure dropping...']),
          pipeFinaleFrame('CORE STABLE / COOLANT LOOP LOCKED', ['        [   ]', '       [  C  ]', '        [___]'], [`score: ${score}`, 'reactor: cold enough to breathe'])
        ]
        : [
          pipeFinaleFrame('COOLANT FLOW FAILED / CORE TEMP RISING', ['        (###)', '       (#####)', '        (###)'], ['alarm: return line not sealed']),
          pipeFinaleFrame('CONTAINMENT BREACH', ['      \\  |  /', '    --- ### ---', '      /  |  \\'], ['pressure spike detected']),
          pipeFinaleFrame('*** REACTOR FLASH ***', ['    .  *  .  *  .', '  *   #######   *', '    *  *****  *'], ['coolant lost / chamber flooded with light']),
          pipeFinaleFrame('SYSTEM SCRAM / SESSION LOST', ['        .....', '      ..     ..', '        .....'], ['reactor: emergency shutdown'])
        ];

      frames.forEach((frame, index) => {
        const timer = window.setTimeout(() => {
          if (pipeGame !== gameRef || !commandOutput) return;
          commandOutput.textContent = frame;
        }, 420 + (index * 620));
        pipeAnimationTimers.push(timer);
      });
    };

    const renderPipeGame = () => {
      if (!pipeGame) return 'pipe: inactive';
      const rows = [];
      const heat = Math.min(10000, Math.max(0, pipeGame.temp));
      const pressure = Math.max(pipeGame.flowIn, 0);
      rows.push('╔══════════════════════════════════════════════════════════════════════════════╗');
      rows.push('║ PIPE-90 // TOKAMAK COOLANT EMERGENCY                                       ║');
      rows.push('╠══════════════════════════════════════════════════════════════════════════════╣');
      rows.push(`║ TEMP ${String(pipeGame.temp).padStart(4, ' ')}K [${pipeMeter(heat, 10000)}]  PRESS ${String(pressure).padStart(2, '0')} [${pipeMeter(pressure, 36, 8)}] ║`);
      rows.push(`║ SCORE ${String(pipeGame.score).padStart(4, '0')}   PLACED ${String(pipeGame.placed).padStart(2, '0')}   DUMP ${String(pipeGame.skipped).padStart(2, '0')}   LOOP: PUMP >>> CORE             ║`);
      rows.push('╚══════════════════════════════════════════════════════════════════════════════╝');
      rows.push('');
      for (let r = 0; r < pipeGame.rows; r += 1) {
        const tileRows = ['', '', ''];
        for (let c = 0; c < pipeGame.cols; c += 1) {
          const cell = pipeGame.grid[r][c];
          const tile = pipeTileLines(cell, r, c);
          tileRows[0] += tile[0];
          tileRows[1] += tile[1];
          tileRows[2] += tile[2];
        }
        rows.push(...tileRows);
      }
      const next = pipeGame.queue[0];
      rows.push('');
      rows.push(`QUEUE: ${pipeQueuePreview()}`);
      rows.push(`ACTIVE: ${pipeGlyph(next)} ${next.id.toUpperCase()}   STATUS: ${pipeGame.status}`);
      rows.push('');
      rows.push('KEYS: arrows move | SPACE/R rotate | ENTER weld | F flow | X dump | Q quit');
      rows.push('(oklar her zaman; harf kisayollari giris bos iken — "pipe flow" de yazabilirsin)');
      return rows.join('\n');
    };

    const setPipeOutput = () => {
      if (commandOutput) commandOutput.textContent = renderPipeGame();
    };

    const movePipeCursor = (dr, dc) => {
      if (!pipeGame?.active) return;
      pipeGame.cursor.r = Math.max(0, Math.min(pipeGame.rows - 1, pipeGame.cursor.r + dr));
      pipeGame.cursor.c = Math.max(0, Math.min(pipeGame.cols - 1, pipeGame.cursor.c + dc));
      pipeGame.status = `cursor: ${pipeGame.cursor.r},${pipeGame.cursor.c}`;
      setPipeOutput();
    };

    const tickPipePressure = () => {
      if (!pipeGame?.active || pipeGame.won || pipeGame.lost) return null;
      pipeGame.flowIn -= 1;
      pipeGame.temp = Math.min(9999, pipeGame.temp + 180);
      if (pipeGame.flowIn <= 0) {
        pipeGame.status = 'CONTAINMENT OPEN / coolant forced into line';
        return flowPipe(true);
      }
      return null;
    };

    const rotatePipe = () => {
      if (!pipeGame?.active) return 'pipe: inactive';
      if (pipeGame.won || pipeGame.lost || pipeGame.resolving) return renderPipeGame();
      const { r, c } = pipeGame.cursor;
      const cell = pipeGame.grid[r][c];
      if (cell && !cell.kind) {
        const template = pipePieces.find(item => item.id === cell.id);
        cell.rotation = (cell.rotation + 1) % template.glyphs.length;
        pipeGame.status = `rotated placed ${cell.id}`;
      } else if (!cell) {
        const template = pipePieces.find(item => item.id === pipeGame.queue[0].id);
        pipeGame.queue[0].rotation = (pipeGame.queue[0].rotation + 1) % template.glyphs.length;
        pipeGame.status = `rotated next ${pipeGame.queue[0].id}`;
      } else {
        pipeGame.status = 'source/drain cannot rotate';
      }
      return tickPipePressure() || renderPipeGame();
    };

    const placePipe = () => {
      if (!pipeGame?.active) return 'pipe: inactive';
      if (pipeGame.won || pipeGame.lost || pipeGame.resolving) return renderPipeGame();
      const { r, c } = pipeGame.cursor;
      if (pipeGame.grid[r][c]) {
        pipeGame.status = 'cell occupied';
        return renderPipeGame();
      }
      pipeGame.grid[r][c] = pipeGame.queue.shift();
      pipeGame.queue.push(createPipePiece());
      pipeGame.placed += 1;
      pipeGame.status = 'piece placed';
      pulse(360, 0.04);
      return tickPipePressure() || renderPipeGame();
    };

    const dumpPipe = () => {
      if (!pipeGame?.active) return 'pipe: inactive';
      if (pipeGame.won || pipeGame.lost || pipeGame.resolving) return renderPipeGame();
      const skipped = pipeGame.queue.shift();
      pipeGame.queue.push(createPipePiece());
      pipeGame.skipped += 1;
      pipeGame.status = `dumped ${skipped.id} / penalty armed`;
      pulse(180, 0.04);
      return tickPipePressure() || renderPipeGame();
    };

    const tracePipeFlow = () => {
      const visited = new Set();
      const order = [];
      const leaks = [];
      let reachedDrain = false;
      const queue = [{ r: pipeGame.source.r, c: pipeGame.source.c }];
      while (queue.length) {
        const current = queue.shift();
        const key = `${current.r},${current.c}`;
        if (visited.has(key)) continue;
        visited.add(key);
        order.push(key);
        const cell = pipeGame.grid[current.r]?.[current.c];
        const mask = pipeCellMask(cell);
        if (current.r === pipeGame.drain.r && current.c === pipeGame.drain.c) {
          reachedDrain = true;
          continue;
        }
        pipeDirs.forEach(dir => {
          if (!(mask & dir.bit)) return;
          const nr = current.r + dir.dr;
          const nc = current.c + dir.dc;
          const next = pipeGame.grid[nr]?.[nc];
          if (!next) {
            leaks.push({ r: nr, c: nc, from: key, dir: dir.name });
            return;
          }
          const nextMask = pipeCellMask(next);
          if (!(nextMask & dir.opposite)) {
            leaks.push({ r: nr, c: nc, from: key, dir: dir.name });
            return;
          }
          if (nextMask & dir.opposite) queue.push({ r: nr, c: nc });
        });
      }
      return { ok: reachedDrain && leaks.length === 0, reachedDrain, leaks, visited, order };
    };

    const finishPipeFlow = (result, auto) => {
      if (!pipeGame) return;
      pipeGame.flowWave = new Set();
      pipeGame.flowPath = new Set(result.order);
      pipeGame.leakAt = result.leaks[0]?.from || null;
      pipeGame.won = result.ok;
      pipeGame.lost = !result.ok;
      pipeGame.resolving = false;
      pipeGame.score = pipeScore(result.ok);
      pipeGame.temp = result.ok ? 640 : 9999;
      pipeGame.status = result.ok
        ? `CORE COOLING / ${pipeGame.score} pts / ${pipeGame.placed} pipes`
        : result.reachedDrain
          ? `COOLANT LEAK / open outlet ${result.leaks[0]?.dir || 'unknown'}`
          : `CORE STARVED / coolant never reached chamber / wet cells ${result.visited.size}`;
      if (result.ok) {
        award(Math.max(state.level, 2));
        pulse(720, 0.09);
        // Pipe'i cozmek dunyaya baglanir: coolant kazandirir ve /core muhrunu acar (Faz 5).
        if (!(state.unlocked || []).includes('/core')) {
          state.inventory = [...new Set([...(state.inventory || []), 'coolant'])];
          state.unlocked = [...new Set([...(state.unlocked || []), '/core'])];
          state.easterTrail = [...(state.easterTrail || []), 'unlock:/core'].slice(-4);
          persist();
          scheduleWorldSave();
          updateAccess();
          pipeGame.status = `CORE COOLING / muhur cozuldu: /core acildi (cd core) / ${pipeGame.score} pts`;
        }
      } else {
        pulse(130, 0.08);
      }
      if (auto && !result.ok) pipeGame.status = `AUTO SCRAM / ${pipeGame.status}`;
      setPipeOutput();
      schedulePipeFinale(result.ok);
    };

    const schedulePipeFlow = (result, auto) => {
      if (!pipeGame || !commandOutput) return;
      const gameRef = pipeGame;
      const order = result.order.length ? result.order : Array.from(result.visited);
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) {
        finishPipeFlow(result, auto);
        return;
      }
      order.forEach((key, index) => {
        const timer = window.setTimeout(() => {
          if (pipeGame !== gameRef || !commandOutput) return;
          pipeGame.flowWave = new Set([key]);
          pipeGame.flowPath.add(key);
          pipeGame.status = `COOLANT MOVING / wet cell ${index + 1}/${order.length}`;
          commandOutput.textContent = renderPipeGame();
        }, index * 145);
        pipeAnimationTimers.push(timer);
      });
      const finishTimer = window.setTimeout(() => {
        if (pipeGame !== gameRef) return;
        finishPipeFlow(result, auto);
      }, (order.length * 145) + 220);
      pipeAnimationTimers.push(finishTimer);
    };

    const flowPipe = (auto = false) => {
      if (!pipeGame?.active) return 'pipe: inactive';
      if (pipeGame.won || pipeGame.lost || pipeGame.resolving) return renderPipeGame();
      clearPipeAnimation();
      const result = tracePipeFlow();
      pipeGame.flowPath = new Set();
      pipeGame.flowWave = new Set();
      pipeGame.leakAt = null;
      pipeGame.resolving = true;
      pipeGame.status = auto ? 'AUTO RELEASE / coolant charge entering loop' : 'MANUAL RELEASE / coolant charge entering loop';
      schedulePipeFlow(result, auto);
      return renderPipeGame();
    };

    const pipeCommand = (action = '') => {
      const command = normalizeCommand(action || 'new');
      if (pipeIntroActive) return 'pipe: reaktör hazırlanıyor...';
      if (!pipeGame?.active || ['new', 'start', 'play'].includes(command)) return startPipeGame();
      if (['rotate', 'r'].includes(command)) return rotatePipe();
      if (['place', 'put', 'enter'].includes(command)) return placePipe();
      if (['dump', 'skip', 'x', 'discard'].includes(command)) return dumpPipe();
      if (['flow', 'run', 'f'].includes(command)) return flowPipe();
      if (['quit', 'exit', 'q'].includes(command)) {
        clearPipeAnimation();
        setPipeGameMode(false);
        pipeGame.active = false;
        pipeGame = null;
        return 'pipe: session closed';
      }
      if (['help', '?'].includes(command)) return renderPipeGame();
      return 'pipe: usage pipe new|rotate|place|flow|dump|quit';
    };

    return {
      command: pipeCommand,
      isActive: () => Boolean(pipeGame?.active),
      restore: () => { setPipeGameMode(true); setPipeOutput(); },
      moveCursor: movePipeCursor,
      rotate: rotatePipe,
      place: placePipe,
      flow: flowPipe,
      dump: dumpPipe,
      // Outrun gibi baska bir oyun ekrani devralirken sessiz sifirlama
      // (oyun modunu kapatmaz; devralan oyun ayni sinifi kullanir).
      reset: () => { clearPipeAnimation(); pipeGame = null; }
    };
  };
})();
