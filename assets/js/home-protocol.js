(() => {
      const pageLoader = document.getElementById('page-loader');
      const loaderStart = performance.now();

      const hidePageLoader = () => {
        pageLoader?.classList.add('is-hidden');
      };

      if (pageLoader) {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const minimumVisible = reduceMotion ? 250 : 1900;
        const finishLoader = () => {
          const elapsed = performance.now() - loaderStart;
          window.setTimeout(hidePageLoader, Math.max(0, minimumVisible - elapsed));
        };

        if (document.readyState === 'complete') finishLoader();
        else window.addEventListener('load', finishLoader, { once: true });
        window.setTimeout(hidePageLoader, reduceMotion ? 700 : 3600);
      }

      document.body.classList.add('js');

      const stages = [...document.querySelectorAll('.stage[id]')];
      const railLinks = [...document.querySelectorAll('.rail-link')];
      const progress = document.querySelector('.rail-progress');
      const consoleLine = document.getElementById('console-line');
      const hudAccess = document.getElementById('hud-access');
      const hudRoute = document.getElementById('hud-route');
      const microOracle = document.getElementById('micro-oracle');
      const accessChip = document.getElementById('access-chip');
      const accessChipButton = document.getElementById('access-chip-button');
      const commandShell = document.getElementById('command-shell');
      const commandInput = document.getElementById('command-input');
      const commandOutput = document.getElementById('command-output');
      const commandClose = document.getElementById('command-close');
      const commandSuggestions = document.getElementById('command-suggestions');
      const commandLaunch = document.getElementById('command-launch');
      const mobileCommandButton = document.getElementById('mobile-command-button');
      const soundToggle = document.getElementById('sound-toggle');
      const lastSignal = document.getElementById('last-signal');
      const recommendedRoute = document.getElementById('recommended-route');
      const canvas = document.getElementById('signal-map');
      const context = canvas ? canvas.getContext('2d') : null;
      const signals = [
        'noise floor calibrated',
        'index nodes listening',
        'oracle channel unstable',
        'lab protocols armed',
        'hidden room partially visible'
      ];
      const oracleLines = [
        'Varsayımını küçült.',
        'Hız, niyetin düşmanıdır.',
        'Yanıtın parlaksa soruyu tekrar oku.',
        'Bir sistem önce davranış üretir.',
        'Gizli kapı genelde menü değildir.'
      ];
      const routeNames = ['ORIGIN', 'INDEX', 'LAB', 'TRACE', 'MAP', 'ARCHIVE', 'NOTES', 'HIDDEN'];
      const levels = ['GUEST', 'READER', 'OPERATOR', 'INITIATE'];
      const stateKey = 'convivium.protocol.state';
      const defaultState = () => ({
        visits: 0,
        level: 0,
        opened: [],
        unlocked: [],
        commands: 0,
        commandLog: [],
        rituals: 0,
        easterTrail: []
      });
      const readState = () => {
        try {
          const parsed = JSON.parse(localStorage.getItem(stateKey) || '{}');
          return { ...defaultState(), ...(parsed && typeof parsed === 'object' ? parsed : {}) };
        } catch {
          try {
            localStorage.removeItem(stateKey);
          } catch {
            // Ignore storage cleanup failures; the UI should still boot.
          }
          return defaultState();
        }
      };
      const oracleProxyEndpoint = (
        window.CONVIVIUM_ORACLE_ENDPOINT ||
        document.querySelector('meta[name="convivium-oracle-endpoint"]')?.content ||
        ''
      ).trim();
      const oracleProxyIsRelative = oracleProxyEndpoint.startsWith('/');
      const oracleProxyIsUsable = Boolean(oracleProxyEndpoint) &&
        !(location.hostname.endsWith('github.io') && oracleProxyIsRelative);
      const oracleWaitLines = [
        'oracle channel opening...',
        'signal queued. cevap bekleniyor...',
        'oracle hala dusunuyor. baglanti aktif...',
        'yanit paketleri toplanıyor...',
        'biraz gecikti ama islem devam ediyor...',
        'terminal hatta. cevabi bekliyorum...'
      ];
      const state = readState();
      state.visits = Number.isFinite(state.visits) ? state.visits : 0;
      state.level = Number.isFinite(state.level) ? state.level : 0;
      state.commands = Number.isFinite(state.commands) ? state.commands : 0;
      state.opened = Array.isArray(state.opened) ? state.opened : [];
      state.unlocked = Array.isArray(state.unlocked) ? state.unlocked : [];
      state.commandLog = Array.isArray(state.commandLog) ? state.commandLog.slice(-8) : [];
      state.rituals = Number.isFinite(state.rituals) ? state.rituals : 0;
      state.easterTrail = Array.isArray(state.easterTrail) ? state.easterTrail.slice(-4) : [];
      state.visits += 1;
      if (state.visits > 1) document.body.classList.add('returning-visitor');
      const audioPreferenceKey = 'convivium.audio.enabled';
      const masterVolume = 1.65;
      let signalIndex = 0;
      let audioEnabled = false;
      try {
        audioEnabled = localStorage.getItem(audioPreferenceKey) === 'true';
      } catch {
        audioEnabled = false;
      }
      let audioContext = null;
      let commandInFlight = false;
      let commandHistoryIndex = -1;
      let activeSuggestionIndex = 0;
      let commandBootTimer = null;
      let commandCloseTimer = null;
      let pendingOracleQuery = '';
      let lastFocusedElement = null;
      let powerOverlay = null;
      let powerSequenceTimers = [];
      let screenSaverOverlay = null;
      let pointer = { x: window.innerWidth * 0.72, y: window.innerHeight * 0.22 };
      let nodes = [];
      const authState = {
        checked: false,
        granted: false,
        label: 'INITIATE',
        user: null
      };

      const persist = () => {
        try {
          localStorage.setItem(stateKey, JSON.stringify(state));
        } catch {
          // Storage can be blocked in private/corporate browsers; keep the shell interactive.
        }
      };

      const setAudioEnabled = (enabled, shouldPulse = false) => {
        audioEnabled = Boolean(enabled);
        try {
          localStorage.setItem(audioPreferenceKey, String(audioEnabled));
        } catch {
          // Audio preference persistence is optional; the current page state still works.
        }
        if (soundToggle) {
          soundToggle.textContent = audioEnabled ? 'audio on' : 'audio off';
          soundToggle.setAttribute('aria-pressed', String(audioEnabled));
        }
        if (shouldPulse) pulse(audioEnabled ? 520 : 180, audioEnabled ? 0.07 : 0.04);
      };

      const getAudioContext = () => {
        if (!audioEnabled) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        audioContext ||= new AudioContextClass();
        const resume = audioContext.resume?.();
        if (resume?.catch) resume.catch(() => {});
        return audioContext;
      };

      const pulse = (frequency = 220, duration = 0.045) => {
        const context = getAudioContext();
        if (!context) return;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(Math.min(0.12, 0.045 * masterVolume), context.currentTime + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + duration + 0.02);
      };

      const playPowerNoise = (startFrequency, endFrequency, duration, volume = 0.055) => {
        const context = getAudioContext();
        if (!context) return;
        const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
        const buffer = context.createBuffer(1, frameCount, context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let index = 0; index < frameCount; index += 1) {
          const fade = 1 - (index / frameCount) * 0.62;
          data[index] = (Math.random() * 2 - 1) * fade;
        }

        const source = context.createBufferSource();
        const filter = context.createBiquadFilter();
        const gain = context.createGain();
        const now = context.currentTime;
        source.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(startFrequency, now);
        filter.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(Math.min(0.14, volume * masterVolume), now + Math.min(0.14, duration / 4));
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        source.connect(filter).connect(gain).connect(context.destination);
        source.start(now);
        source.stop(now + duration + 0.04);
      };

      const playPowerBeep = (frequency, offset, duration, type = 'square', volume = 0.04) => {
        const context = getAudioContext();
        if (!context) return;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + offset;
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(Math.min(0.12, volume * masterVolume), start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.025);
      };

      const playPowerSound = (mode) => {
        if (!getAudioContext()) return;
        if (mode === 'boot') {
          playPowerNoise(220, 2600, 1.45, 0.052);
          playPowerBeep(330, 0.08, 0.07, 'square', 0.03);
          playPowerBeep(660, 0.28, 0.08, 'square', 0.034);
          playPowerBeep(880, 0.46, 0.11, 'triangle', 0.032);
          return;
        }
        if (mode === 'shutdown') {
          playPowerNoise(1900, 90, 1.25, 0.05);
          playPowerBeep(420, 0.08, 0.08, 'square', 0.034);
          playPowerBeep(260, 0.34, 0.12, 'triangle', 0.032);
          playPowerBeep(120, 0.76, 0.18, 'sine', 0.03);
          return;
        }
        if (mode === 'restart') {
          playPowerNoise(1500, 420, 0.36, 0.04);
          playPowerBeep(520, 0.04, 0.06, 'square', 0.032);
          playPowerBeep(520, 0.16, 0.06, 'square', 0.032);
          playPowerBeep(740, 0.34, 0.08, 'triangle', 0.034);
        }
      };

      const updateAccess = () => {
        const localLevel = levels[Math.min(state.level, levels.length - 1)];
        document.body.classList.toggle('access-operator', state.level >= 2);
        document.body.classList.toggle('access-initiate', state.level >= 3);
        document.body.classList.toggle('auth-granted', authState.granted);
        document.body.classList.toggle('auth-pending', !authState.checked);
        if (hudAccess) hudAccess.textContent = authState.label;
        if (accessChip) accessChip.textContent = authState.label;
        if (accessChipButton) {
          accessChipButton.setAttribute('aria-label', authState.granted
            ? `Access granted: ${authState.user?.email || localLevel}`
            : 'Access initiate: giris ekranina git');
          accessChipButton.title = authState.granted
            ? `Oturum aktif: ${authState.user?.email || 'user'}`
            : 'Giris yapmak icin tikla';
        }
      };

      const updateAllGateButtons = () => {
        document.querySelectorAll('.journey-gate').forEach(updateGateButton);
      };

      const restoreUnlockedGates = () => {
        if (!authState.granted) return;
        state.unlocked?.forEach(id => {
          const gate = document.getElementById(id);
          if (gate) {
            gate.classList.add('is-unlocked');
            updateGateButton(gate);
          }
        });
        state.opened?.forEach(id => document.getElementById(id)?.classList.add('is-visited'));
      };

      const loginHref = () => `auth.html?returnTo=${encodeURIComponent(`${location.pathname}${location.hash}`)}`;

      const requestLogin = () => {
        if (consoleLine) consoleLine.textContent = 'access initiate: login required';
        if (microOracle) microOracle.textContent = 'auth gate waiting';
        pulse(160, 0.08);
        location.href = loginHref();
      };

      const requireAccess = () => {
        if (authState.granted) return true;
        requestLogin();
        return false;
      };

      const refreshAuthState = async () => {
        authState.checked = false;
        authState.granted = false;
        authState.label = 'CHECKING';
        updateAccess();

        if (!window.ConviviumBackend || !window.ConviviumBackend.isConfigured()) {
          authState.checked = true;
          authState.label = 'INITIATE';
          updateAccess();
          updateAllGateButtons();
          return;
        }

        try {
          const session = await window.ConviviumBackend.getSession();
          authState.checked = true;
          authState.granted = Boolean(session);
          authState.user = session?.user || null;
          authState.label = session ? 'GRANTED' : 'INITIATE';
          if (session) {
            award(3);
            restoreUnlockedGates();
            if (consoleLine) consoleLine.textContent = 'access granted';
            if (microOracle) microOracle.textContent = session.user.email || 'authenticated';
          }
        } catch (error) {
          authState.checked = true;
          authState.granted = false;
          authState.label = 'INITIATE';
          if (consoleLine) consoleLine.textContent = 'auth check failed';
        }

        updateAccess();
        updateAllGateButtons();
        renderProtocolSurfaces();
      };

      const award = (amount = 1) => {
        state.level = Math.min(levels.length - 1, Math.max(state.level, amount));
        persist();
        updateAccess();
      };

      const routeSuggestions = {
        0: 'Trace -> Oracle -> Dossier',
        1: 'Lab -> Map -> Archive',
        2: 'Dashboard -> Notes -> Ritual',
        3: 'Dossier -> Oracle -> Map',
        4: 'Archive -> Hidden -> Manifest',
        5: 'Notes -> Random -> Command',
        6: 'Signal -> Oracle -> Manifest',
        7: 'Universe-2 -> Offline Node'
      };

      const updateOsSnapshot = (step = 0, signal = '') => {
        if (lastSignal && signal) lastSignal.textContent = signal.replace(/^signal:\s*/i, '').slice(0, 34);
        if (recommendedRoute) recommendedRoute.textContent = routeSuggestions[Number(step)] || routeSuggestions[0];
      };

      const setActiveStep = (step) => {
        railLinks.forEach(link => {
          const active = link.dataset.step === String(step);
          link.classList.toggle('is-active', active);
          if (active) link.setAttribute('aria-current', 'step');
          else link.removeAttribute('aria-current');
        });

        if (progress) {
          const max = Math.max(railLinks.length - 1, 1);
          progress.style.setProperty('--rail-progress', `${(Number(step) / max) * 100}%`);
        }

        if (hudRoute) hudRoute.textContent = routeNames[Number(step)] || 'ROUTE';
        updateOsSnapshot(step);
        if (Number(step) > state.level) award(Number(step));
      };

      const renderProtocolSurfaces = () => {
        const opened = new Set(['origin', ...(state.opened || [])]);
        const unlocked = new Set(state.unlocked || []);
        const openedOrder = ['origin', ...(state.opened || [])];
        const linked = new Set(openedOrder.slice(0, -1));
        document.querySelectorAll('[data-signal-node]').forEach(node => {
          const id = node.dataset.signalNode;
          const visible = opened.has(id) || unlocked.has(id);
          node.classList.toggle('is-visited', visible);
          node.classList.toggle('is-locked', id === 'hidden' && !unlocked.has('hidden'));
          node.classList.toggle('is-linked', linked.has(id));
          const label = node.querySelector('em');
          if (label && visible) label.textContent = id === 'hidden' && !unlocked.has('hidden') ? 'seen' : 'online';
        });
      };

      const updateGateButton = (gate) => {
        const button = gate.querySelector('.gate-toggle');
        if (!button) return;
        const unlocked = gate.classList.contains('is-unlocked');
        const open = gate.classList.contains('is-open');
        button.textContent = !authState.granted && !unlocked ? 'ACCESS DENIED' : open ? 'Collapse' : 'Open';
        button.setAttribute('aria-expanded', String(open));
      };

      const unlockGate = (gate, open = true) => {
        if (!gate) return;
        gate.classList.add('is-unlocked', 'is-visited');
        gate.classList.toggle('is-open', open);
        state.unlocked = [...new Set([...(state.unlocked || []), gate.id])];
        state.opened = [...new Set([...(state.opened || []), gate.id])];
        if ((state.unlocked || []).length >= 3) award(3);
        else award(Math.max(state.level, 1));
        persist();
        renderProtocolSurfaces();
        updateGateButton(gate);
        if (consoleLine) consoleLine.textContent = `${gate.id} access granted`;
        if (microOracle) microOracle.textContent = `${gate.id}: locked surface removed`;
        pulse(open ? 330 : 180);
      };

      document.querySelectorAll('.gate-toggle').forEach(button => {
        button.textContent = 'ACCESS DENIED';
        button.addEventListener('click', () => {
          const gate = button.closest('.journey-gate');
          if (!authState.granted && !gate.classList.contains('is-unlocked') && !requireAccess()) return;
          if (!gate.classList.contains('is-unlocked')) {
            unlockGate(gate, true);
            return;
          }

          const open = !gate.classList.contains('is-open');
          gate.classList.toggle('is-open', open);
          updateGateButton(gate);
          pulse(open ? 280 : 170);
        });
      });

      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            setActiveStep(entry.target.dataset.step || 0);
            if (entry.target.id) {
              state.opened = [...new Set([...(state.opened || []), entry.target.id])];
              persist();
              renderProtocolSurfaces();
            }
          });
        }, { threshold: 0.14, rootMargin: '-8% 0px -18% 0px' });

        document.querySelectorAll('.stage').forEach(stage => observer.observe(stage));
      } else {
        document.querySelectorAll('.stage').forEach(stage => stage.classList.add('is-visible'));
      }

      if (consoleLine) {
        window.setInterval(() => {
          signalIndex = (signalIndex + 1) % signals.length;
          consoleLine.textContent = signals[signalIndex];
          updateOsSnapshot(state.level, signals[signalIndex]);
          if (microOracle) microOracle.textContent = oracleLines[signalIndex % oracleLines.length];
        }, 2800);
      }

      const commandBootLines = () => [
        'CONVIVIUM DOS/86 initializing...',
        'BIOS: public interface bus online',
        'MEM: private token banks not mounted',
        'FS: index / archive / notes / map mounted read-only',
        'NET: oracle proxy handshake queued',
        'AI: cloud edge route preferred',
        'AI: pollinations fallback downgraded to reserve',
        `USER: visitor level ${levels[state.level] || levels[0]}`,
        `STAT: public visits ${state.visits}`,
        `STAT: opened public nodes ${state.opened.length}`,
        `LOG: recent commands ${(state.commandLog || []).length}`,
        'SEC: secrets unavailable in browser runtime',
        'UI: command parser warm',
        'UI: exit vector armed',
        'OK: terminal ready'
      ];

      const commandReadyText = () => [
        'READY',
        `level: ${levels[state.level] || levels[0]} / nodes: ${state.opened.length}`,
        'type help or ask anything'
      ].join('\n');

      const renderCommandBoot = () => {
        if (!commandShell || !commandOutput || commandInFlight) return;
        window.clearInterval(commandBootTimer);
        window.clearTimeout(commandCloseTimer);
        commandShell.classList.add('is-booting');
        commandShell.classList.remove('is-closing');
        commandOutput.textContent = '';
        const lines = commandBootLines();
        let index = 0;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const writeLine = () => {
          commandOutput.textContent = lines.slice(0, index + 1).join('\n');
          index += 1;
          if (index >= lines.length) {
            window.clearInterval(commandBootTimer);
            commandBootTimer = null;
            window.setTimeout(() => {
              if (!commandShell.classList.contains('is-open') || commandInFlight) return;
              commandOutput.textContent = commandReadyText();
              commandShell.classList.remove('is-booting');
            }, 420);
          }
        };

        if (reduceMotion) {
          commandOutput.textContent = commandReadyText();
          commandShell.classList.remove('is-booting');
          return;
        }

        writeLine();
        commandBootTimer = window.setInterval(writeLine, 135);
      };

      const closeCommandWithMatrix = () => {
        if (!commandShell || !commandShell.classList.contains('is-open')) return;
        window.clearInterval(commandBootTimer);
        window.clearTimeout(commandCloseTimer);
        commandShell.classList.remove('is-booting');
        commandShell.classList.add('is-closing');
        clearCommandSuggestions();
        if (commandInput) commandInput.disabled = true;
        if (commandOutput) {
          commandOutput.textContent = [
            '010101 exit vector accepted',
            '101001 command memory dissolving',
            '001101 display buffer falling',
            '111000 session closed'
          ].join('\n');
        }

        commandCloseTimer = window.setTimeout(() => {
          commandShell.classList.remove('is-open', 'is-closing');
          commandShell.setAttribute('aria-hidden', 'true');
          if (commandInput) {
            commandInput.disabled = false;
            commandInput.value = '';
          }
          if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
        }, 620);
      };

      const openCommand = () => {
        if (!commandShell || !commandInput) return;
        lastFocusedElement = document.activeElement;
        window.clearTimeout(commandCloseTimer);
        commandShell.classList.add('is-open');
        commandShell.classList.remove('is-closing');
        commandShell.setAttribute('aria-hidden', 'false');
        renderCommandSuggestions(commandInput.value);
        commandInput.focus();
        renderCommandBoot();
        pulse(260);
      };

      const closeCommand = () => {
        if (!commandShell) return;
        window.clearInterval(commandBootTimer);
        window.clearTimeout(commandCloseTimer);
        commandShell.classList.remove('is-open', 'is-booting', 'is-closing');
        commandShell.setAttribute('aria-hidden', 'true');
        clearCommandSuggestions();
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
      };

      const clearPowerTimers = () => {
        powerSequenceTimers.forEach(timer => window.clearTimeout(timer));
        powerSequenceTimers = [];
      };

      const ensurePowerOverlay = () => {
        if (powerOverlay) return powerOverlay;
        powerOverlay = document.createElement('button');
        powerOverlay.type = 'button';
        powerOverlay.className = 'power-overlay';
        powerOverlay.setAttribute('aria-label', 'Convivium power screen');
        powerOverlay.innerHTML = [
          '<span class="power-scan" aria-hidden="true"></span>',
          '<span class="power-brand" aria-hidden="true">Convivium</span>',
          '<span class="power-mode" aria-hidden="true">POWER</span>',
          '<span class="power-sidecar" aria-hidden="true">',
          '  <span>CRT: SYNC</span>',
          '  <span>BUS: PUBLIC</span>',
          '  <span>KEYS: LOCKED</span>',
          '</span>',
          '<span class="power-terminal" aria-live="polite"></span>',
          '<span class="power-footer" aria-hidden="true">',
          '  <span>640K PUBLIC MEMORY</span>',
          '  <span>NO PRIVATE MOUNTS</span>',
          '  <span>STATIC PAGE IMAGE</span>',
          '</span>',
          '<span class="power-restart">click to restart</span>'
        ].join('');
        powerOverlay.addEventListener('click', () => {
          if (powerOverlay?.classList.contains('is-off')) renderPowerBoot();
        });
        document.body.appendChild(powerOverlay);
        return powerOverlay;
      };

      const setPowerMode = (label) => {
        const mode = ensurePowerOverlay().querySelector('.power-mode');
        if (mode) mode.textContent = label;
      };

      const renderPowerLines = (lines, done) => {
        const overlay = ensurePowerOverlay();
        const terminal = overlay.querySelector('.power-terminal');
        if (!terminal) return;
        clearPowerTimers();
        terminal.textContent = '';
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const stepMs = reduceMotion ? 1 : 145;

        lines.forEach((_, index) => {
          const timer = window.setTimeout(() => {
            terminal.textContent = lines.slice(0, index + 1).join('\n');
            terminal.scrollTop = terminal.scrollHeight;
            pulse(index % 2 ? 180 : 240, 0.028);
            if (index === lines.length - 1) done?.();
          }, stepMs * index);
          powerSequenceTimers.push(timer);
        });
      };

      const shutdownLines = () => [
        'CONVIVIUM DOS/86 SHUTDOWN',
        'REQUEST: visitor command accepted',
        'DISPLAY: switching to monochrome console',
        'PUBLIC SESSION: volatile interface only',
        'FILES: no local file handles mounted',
        'SECRETS: unavailable in browser runtime',
        'AI: external oracle channel closed',
        'NET: worker route released',
        'CACHE: static assets left untouched',
        'MEM: command buffer cleared',
        'POWER: phosphor decay started',
        '',
        'It is now safe to stop reading this screen.'
      ];

      const bootLines = () => [
        'CONVIVIUM BIOS 0.86',
        'POST: display adapter online',
        'RAM: public interface map checked',
        'DISK: static page image found',
        'SEC: private mounts skipped',
        'NET: optional oracle route on standby',
        'UI: terminal shell warming',
        'SCAN: green phosphor stable',
        'BOOT: returning to Convivium'
      ];

      const restartLines = () => [
        'CONVIVIUM DOS/86 RESTART',
        'REQUEST: warm reboot accepted',
        'DISPLAY: saving public interface state',
        'FILES: no local file handles mounted',
        'SECRETS: unavailable in browser runtime',
        'AI: oracle channel paused',
        'MEM: command buffer cleared',
        'POWER: cycling display bus',
        '',
        'Restarting...'
      ];

      const renderPowerBoot = () => {
        const overlay = ensurePowerOverlay();
        setPowerMode('BOOT');
        overlay.classList.remove('is-off', 'is-shutting-down');
        overlay.classList.add('is-active', 'is-booting');
        document.body.classList.add('power-state-active');
        playPowerSound('boot');
        renderPowerLines(bootLines(), () => {
          const timer = window.setTimeout(() => {
            overlay.classList.remove('is-active', 'is-booting');
            document.body.classList.remove('power-state-active');
            setCommandBusy(false);
            if (lastFocusedElement && document.contains(lastFocusedElement) && typeof lastFocusedElement.focus === 'function') {
              lastFocusedElement.focus();
            } else {
              mobileCommandButton?.focus();
            }
            pulse(420, 0.06);
          }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 80 : 820);
          powerSequenceTimers.push(timer);
        });
      };

      const shutdownCommand = () => {
        const overlay = ensurePowerOverlay();
        setPowerMode('SHUTDOWN');
        setCommandBusy(true);
        closeCommand();
        overlay.classList.remove('is-off', 'is-booting');
        overlay.classList.add('is-active', 'is-shutting-down');
        document.body.classList.add('power-state-active');
        playPowerSound('shutdown');
        renderPowerLines(shutdownLines(), () => {
          const timer = window.setTimeout(() => {
            overlay.classList.remove('is-shutting-down');
            overlay.classList.add('is-off');
            setPowerMode('OFFLINE');
            const terminal = overlay.querySelector('.power-terminal');
            if (terminal) terminal.textContent = '';
            pulse(90, 0.1);
          }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 80 : 720);
          powerSequenceTimers.push(timer);
        });
        return 'shutdown sequence accepted';
      };

      const restartCommand = () => {
        const overlay = ensurePowerOverlay();
        setPowerMode('RESTART');
        setCommandBusy(true);
        closeCommand();
        overlay.classList.remove('is-off');
        overlay.classList.add('is-active', 'is-booting');
        document.body.classList.add('power-state-active');
        playPowerSound('restart');
        renderPowerLines(restartLines(), () => {
          const timer = window.setTimeout(renderPowerBoot, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 80 : 540);
          powerSequenceTimers.push(timer);
        });
        return 'restart sequence accepted';
      };

      const closeScreenSaver = () => {
        if (!screenSaverOverlay) return;
        screenSaverOverlay.classList.remove('is-active');
        screenSaverOverlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('screen-saver-active');
        if (lastFocusedElement && document.contains(lastFocusedElement) && typeof lastFocusedElement.focus === 'function') {
          lastFocusedElement.focus();
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
          '<span class="screen-saver-noise" aria-hidden="true"></span>',
          '<span class="screen-saver-logo" aria-hidden="true">Convivium</span>',
          '<span class="screen-saver-system" aria-hidden="true">',
          '  <span class="system-label">LOCAL SOLAR MAP</span>',
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
        lastFocusedElement = document.activeElement;
        closeCommand();
        overlay.classList.add('is-active');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('screen-saver-active');
        overlay.focus();
        pulse(310, 0.08);
        return 'screen saver active';
      };

      const normalizeCommand = (value) => value
        .toLocaleLowerCase('tr-TR')
        .trim()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/^[>\/\\]+/, '')
        .replace(/[._-]+/g, ' ')
        .replace(/[^\w\s?]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const goTo = (href) => () => {
        location.href = href;
      };

      const scrollToSection = (id, label = id) => {
        const target = document.getElementById(id);
        if (!target) return `${label} not found`;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        state.opened = [...new Set([...(state.opened || []), id])];
        persist();
        renderProtocolSurfaces();
        setActiveStep(target.dataset.step || 0);
        return `${label} selected`;
      };

      const scrollToOrigin = () => {
        return scrollToSection('origin', 'origin');
      };

      const quickSignals = [
        'signal: karar gecikmesi dusuyor; once kucuk varsayimi test et.',
        'signal: rota acik. Bir sonraki iyi hamle, fazla aciklama istemez.',
        'signal: sistem cevap vermeden once davranisi gosterir.',
        'signal: harita tamam degil; eksik nokta dikkatin girdigi yerdir.',
        'signal: hiz iyi, ama sadece dogru soruyu tasiyorsa.'
      ];

      const fieldNoteLines = [
        'note: Fiyatlandirma, musteriye neyi ertelemeyecegini soyleyen sessiz arayuzdur.',
        'note: AI workflow degeri, guzel metinden cok karar tekrarini azaltmasinda.',
        'note: Oyun, menuye sigmayan bir geri bildirim sistemidir.',
        'note: Ritual, dikkati sifirlayan kucuk bir protokoldur.'
      ];

      const ritualLines = [
        'ritual: Bir projeyi ac, 90 saniye bak, tek bir iyilestirme notu cikar.',
        'ritual: Dossier oku; sonra ayni fikri bir oyun mekanigi gibi yeniden adlandir.',
        'ritual: Oracle kanalina bir soru sor, cevaptan sadece bir fiil sec.',
        'ritual: Dashboard ac; sayilardan cok hangi kararlarin eksik olduguna bak.',
        'ritual: Bir kahve protokolu sec; bekleme suresince tek cumlelik saha notu yaz.'
      ];

      const quoteLines = [
        'quote: "Bir sistem once davranis uretir."',
        'quote: "Menu degil, esik."',
        'quote: "Deger, karar gecikmesini dusurmesinde."',
        'quote: "Her sey menude olmak zorunda degil."'
      ];

      const randomRoutes = [
        ['makaleler.html', 'dossier'],
        ['cyberpunk-logic-game.html', 'logic'],
        ['three-body-signal.html', 'three body signal'],
        ['ash-runner.html', 'ash runner'],
        ['neon-river.html', 'neon river'],
        ['Bartender.html', 'bartender'],
        ['Barista.html', 'barista'],
        ['TheOracle.html', 'oracle room'],
        ['Paradox_Terminal.html', 'paradox terminal'],
        ['dart-skorbord.html', 'dart skorbord']
      ];

      const sample = (items) => items[Math.floor(Math.random() * items.length)];

      const registerProtocolStep = (step) => {
        state.easterTrail = [...(state.easterTrail || []), step].slice(-4);
        persist();
      };

      const hasEasterKey = () => {
        const trail = (state.easterTrail || []).slice(-3).join('>');
        return trail === 'signal>oracle>manifest';
      };

      const unlockHiddenCommand = () => {
        const ritualKeyAccepted = hasEasterKey();
        registerProtocolStep('unlock');
        if (!authState.granted && !ritualKeyAccepted) {
          if (!requireAccess()) return 'login required';
        }
        const gate = document.getElementById('hidden');
        gate?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        unlockGate(gate, true);
        award(3);
        return ritualKeyAccepted ? 'hidden layer unlocked / ritual key accepted' : 'hidden layer unlocked';
      };

      const signalCommand = () => {
        registerProtocolStep('signal');
        const line = sample(quickSignals);
        if (consoleLine) consoleLine.textContent = line.replace(/^signal: /, '');
        if (microOracle) microOracle.textContent = 'signal captured';
        return line;
      };

      const oracleCommand = () => {
        registerProtocolStep('oracle');
        const line = sample(oracleLines);
        if (microOracle) microOracle.textContent = line;
        return `oracle: ${line}`;
      };

      const oracleStatusCommand = () => [
        `oracle proxy: ${oracleProxyIsUsable ? 'configured' : 'not configured'}`,
        `endpoint: ${oracleProxyEndpoint || 'empty'}`,
        `host: ${location.hostname || 'local'}`,
        'primary ai: Cloudflare Workers AI via Worker',
        'fallback ai: Pollinations inside Worker',
        'note: GitHub Pages cannot serve /api/oracle by itself',
        'next: deploy Worker, then set convivium-oracle-endpoint to its workers.dev URL'
      ].join('\n');

      const manifestCommand = () => {
        registerProtocolStep('manifest');
        return 'manifest: residue indexed. devam etmek icin "unlock hidden" yaz veya "open manifest" ile dosyayi ac.';
      };

      const cluesCommand = () => {
        const trail = (state.easterTrail || []).slice(-3);
        const missing = ['signal', 'oracle', 'manifest'].filter(step => !trail.includes(step));
        return [
          'hidden clues:',
          '1/3 signal',
          '2/3 oracle',
          '3/3 manifest',
          '',
          missing.length ? `missing: ${missing.join(', ')}` : 'ritual key ready: unlock hidden'
        ].join('\n');
      };

      const whoamiCommand = () => {
        const level = levels[Math.min(state.level, levels.length - 1)];
        const auth = authState.granted ? `granted / ${authState.user?.email || 'user'}` : authState.checked ? 'guest' : 'checking';
        return [
          `identity: ${auth}`,
          `access level: ${level}`,
          `visits: ${state.visits}`,
          `commands: ${state.commands}`,
          `opened: ${(state.opened || []).length} nodes`
        ].join('\n');
      };

      const logCommand = () => {
        const commands = (state.commandLog || []).slice(-6).map(item => `cmd/${item}`).join('\n') || 'cmd/empty';
        const opened = (state.opened || []).slice(-6).map(item => `node/${item}`).join('\n') || 'node/origin';
        return `recent commands:\n${commands}\n\nrecent nodes:\n${opened}`;
      };

      const clearCommand = () => {
        if (commandOutput) commandOutput.textContent = '';
        return '';
      };

      const ritualCommand = () => {
        state.rituals += 1;
        if (state.rituals >= 2) award(Math.max(state.level, 2));
        persist();
        return sample(ritualLines);
      };

      const noteCommand = () => {
        scrollToSection('notes', 'field notes');
        return sample(fieldNoteLines);
      };

      const randomCommand = () => {
        const [href, label] = sample(randomRoutes);
        location.href = href;
        return `random route: ${label}`;
      };

      const debCommand = (action = 'summon') => {
        const deb = window.DebCompanion || window.NovaCompanion;
        if (!deb) return 'deb: module not ready';
        if (action === 'summon') {
          deb.summon();
          return 'deb: companion online. try deb scan / deb meteor / deb blackhole / deb deathstar.';
        }
        if (action === 'off') {
          return deb.deactivate()
            ? 'deb: entropy dispersal started. bugy channel restored.'
            : 'deb: already offline.';
        }
        deb.trigger(action);
        return `deb: ${action} protocol started`;
      };

      const bugyCommand = () => {
        window.BugyV3?.deactivate?.();
        window.BugyV2?.deactivate?.();
        window.Bugy?.summon?.();
        return (window.DebCompanion || window.NovaCompanion)?.getState?.().active
          ? 'bugy: classic companion restored / deb still online'
          : 'bugy: classic companion restored';
      };

      const commandDefinitions = [
        {
          command: 'help',
          description: 'tum kisayol komutlarini listeler',
          aliases: ['?', 'yardim', 'komutlar', 'commands', 'shortcuts'],
          action: () => commandHelpText()
        },
        {
          command: 'keys',
          description: 'klavye kisayollarini gosterir',
          aliases: ['keyboard', 'hotkeys', 'kisayollar', 'kısayollar'],
          action: () => keyboardHelpText()
        },
        {
          command: 'whoami',
          description: 'ziyaretci, access ve node durumunu gosterir',
          aliases: ['id', 'me', 'status'],
          action: whoamiCommand
        },
        {
          command: 'map',
          description: 'sinyal haritasina gider',
          aliases: ['signal map', 'harita', 'atlas'],
          action: () => scrollToSection('map', 'signal map')
        },
        {
          command: 'archive',
          description: 'arsiv odasina gider',
          aliases: ['archive room', 'arsiv', 'arşiv', 'files'],
          action: () => scrollToSection('archive', 'archive room')
        },
        {
          command: 'notes',
          description: 'saha notlari katmanina gider',
          aliases: ['field notes', 'notlar'],
          action: () => scrollToSection('notes', 'field notes')
        },
        {
          command: 'log',
          description: 'son komutlari ve gezilen node listesini gosterir',
          aliases: ['history', 'trace log'],
          action: logCommand
        },
        {
          command: 'clear',
          description: 'komut ciktisini temizler',
          aliases: ['cls', 'reset output'],
          action: clearCommand
        },
        {
          command: 'exit',
          description: 'komut ekranini kapatir',
          aliases: ['quit', 'close', 'kapat', 'cikis', 'çıkış'],
          action: () => {
            closeCommandWithMatrix();
            return commandOutput?.textContent;
          }
        },
        {
          command: 'shutdown',
          description: 'retro guvenli kapanis ekranini baslatir',
          aliases: ['shatdawn', 'shut down', 'poweroff', 'power off', 'kapan', 'kapat sistemi', 'sistemi kapat'],
          action: shutdownCommand
        },
        {
          command: 'restart',
          description: 'retro yeniden baslatma sekansini calistirir',
          aliases: ['reboot', 'reset', 'warm reboot', 'yeniden baslat', 'yeniden başlat', 'tekrar baslat', 'tekrar başlat'],
          action: restartCommand
        },
        {
          command: 'screen saver',
          description: 'retro Convivium ekran koruyucuyu acar',
          aliases: ['screensaver', 'screen server', 'screen save', 'ekran koruyucu', 'koruyucu', 'idle screen'],
          action: screenSaverCommand
        },
        {
          command: 'random',
          description: 'rastgele bir deneyim acar',
          aliases: ['shuffle', 'surprise', 'rastgele'],
          action: randomCommand
        },
        {
          command: 'deb',
          description: 'DEB alternatif companion katmanini acar',
          aliases: ['summon deb', 'deb summon', 'deb companion', 'nova', 'summon nova', 'nova summon', 'nova companion'],
          action: () => debCommand('summon')
        },
        {
          command: 'deb scan',
          description: 'DEB aktif panelleri tarar',
          aliases: ['scan deb', 'nova scan', 'scan nova'],
          action: () => debCommand('scan')
        },
        {
          command: 'deb rift',
          description: 'DEB rota hafizasini katlar',
          aliases: ['rift deb', 'nova rift', 'rift nova'],
          action: () => debCommand('rift')
        },
        {
          command: 'deb bloom',
          description: 'DEB saha notlarini yukler',
          aliases: ['bloom deb', 'nova bloom', 'bloom nova'],
          action: () => debCommand('bloom')
        },
        {
          command: 'deb mirror',
          description: 'DEB imlec golgesini kopyalar',
          aliases: ['mirror deb', 'nova mirror', 'mirror nova'],
          action: () => debCommand('mirror')
        },
        {
          command: 'deb sleep',
          description: 'DEB sinyalini dusuk guce alir',
          aliases: ['deb dim', 'nova sleep', 'nova dim'],
          action: () => debCommand('sleep')
        },
        {
          command: 'deb meteor',
          description: 'DEB meteor formuyla Bugy etkilesimi baslatir',
          aliases: ['meteor deb', 'deb meteorit', 'deb asteroid', 'deb impact', 'deb carpis', 'deb çarpış', 'nova meteor', 'meteor nova', 'nova meteorit', 'nova asteroid', 'nova impact', 'nova carpis', 'nova çarpış'],
          action: () => debCommand('meteor')
        },
        {
          command: 'deb blackhole',
          description: 'DEB karadelik formuyla Bugy etkilesimi baslatir',
          aliases: ['deb black hole', 'blackhole deb', 'deb karadelik', 'deb kara delik', 'kara delik deb', 'nova blackhole', 'nova black hole', 'blackhole nova', 'nova karadelik', 'nova kara delik', 'kara delik nova'],
          action: () => debCommand('blackhole')
        },
        {
          command: 'deb deathstar',
          description: 'DEB orbital lazer sekansini baslatir',
          aliases: ['deb death star', 'deb deatstar', 'deatstar deb', 'deathstar deb', 'deb laser', 'deb lazer', 'deb beam', 'nova deathstar', 'nova death star', 'nova deatstar', 'deatstar nova', 'deathstar nova', 'nova laser', 'nova lazer', 'nova beam'],
          action: () => debCommand('deathstar')
        },
        {
          command: 'deb off',
          description: 'DEB katmanini kapatir',
          aliases: ['dismiss deb', 'nova off', 'dismiss nova'],
          action: () => debCommand('off')
        },
        {
          command: 'bugy',
          description: 'klasik gezinen pet katmanina doner',
          aliases: ['classic bugy', 'pet classic'],
          action: bugyCommand
        },
        {
          command: 'signal',
          description: 'kisa yerel sinyal uretir',
          aliases: ['ping', 'pulse'],
          action: signalCommand
        },
        {
          command: 'oracle',
          description: 'yerel oracle sinyali verir',
          aliases: ['omen', 'kahin', 'kâhin'],
          action: oracleCommand
        },
        {
          command: 'oracle status',
          description: 'oracle ai kanalinin baglanti durumunu gosterir',
          aliases: ['ai status', 'oracle debug', 'ai debug'],
          action: oracleStatusCommand
        },
        {
          command: 'oracle yes',
          description: 'bilinmeyen sorguyu oracle kanalina onayli gonderir',
          aliases: ['ask oracle', 'confirm oracle'],
          action: () => 'oracle confirmation waiting'
        },
        {
          command: 'manifest',
          description: 'manifest izini terminalde indeksler',
          aliases: ['residue', 'manifest residue'],
          action: manifestCommand
        },
        {
          command: 'clues',
          description: 'hidden katman ipuclarini gosterir',
          aliases: ['clue', 'ipucu', 'ipuclari', 'hint'],
          action: cluesCommand
        },
        {
          command: 'ritual',
          description: 'kucuk bir kesif gorevi verir',
          aliases: ['gorev', 'görev', 'task'],
          action: ritualCommand
        },
        {
          command: 'quote',
          description: 'Convivium tonunda kisa alinti verir',
          aliases: ['alinti', 'alıntı'],
          action: () => sample(quoteLines)
        },
        {
          command: 'note',
          description: 'rastgele saha notu verir',
          aliases: ['field note', 'micro note'],
          action: noteCommand
        },
        {
          command: 'home',
          description: 'anasayfa baslangicina doner',
          aliases: ['origin', 'start', 'baslangic', 'başlangıç'],
          action: scrollToOrigin
        },
        {
          command: 'open dossier',
          description: 'makaleler ve notlar',
          aliases: ['dossier', 'makaleler', 'makale', 'articles'],
          action: goTo('makaleler.html')
        },
        {
          command: 'run logic',
          description: 'Cyberpunk Logic oyununu acar',
          aliases: ['logic', 'cyberpunk logic', 'logic game', 'mantik', 'mantık'],
          action: goTo('cyberpunk-logic-game.html')
        },
        {
          command: 'run signal',
          description: 'Uc Gunes Sinyali oyununu acar',
          aliases: ['signal game', 'three body', 'three body signal', 'uc gunes', 'üç güneş', 'uc cisim', 'üç cisim', 'relay'],
          action: goTo('three-body-signal.html')
        },
        {
          command: 'run ash',
          description: 'Ash Runner oyununu acar',
          aliases: ['ash', 'ash runner', 'scrap', 'brawler'],
          action: goTo('ash-runner.html')
        },
        {
          command: 'run flow',
          description: 'Neon River deneyimini acar',
          aliases: ['flow', 'neon river', 'river'],
          action: goTo('neon-river.html')
        },
        {
          command: 'dart',
          description: 'dart skorboard ekranini acar',
          aliases: ['skorbord', 'scoreboard', 'dart skorbord', 'dart skor', 'scores'],
          action: goTo('dart-skorbord.html')
        },
        {
          command: 'bartender',
          description: 'kokteyl asistani',
          aliases: ['bar', 'cocktail', 'kokteyl'],
          action: goTo('Bartender.html')
        },
        {
          command: 'barista',
          description: 'kahve asistani',
          aliases: ['coffee', 'kahve'],
          action: goTo('Barista.html')
        },
        {
          command: 'barista v2',
          description: 'ikinci kahve asistani',
          aliases: ['barista 2', 'coffee v2', 'kahve v2'],
          action: goTo('Barista_V2.html')
        },
        {
          command: 'realists bar',
          description: 'The Realists Bar sayfasi',
          aliases: ['the realists bar', 'realists'],
          action: goTo('TheRealistsBar.html')
        },
        {
          command: 'open oracle',
          description: 'The Oracle deneyimini acar',
          aliases: ['the oracle', 'oracle page'],
          action: goTo('TheOracle.html')
        },
        {
          command: 'paradox',
          description: 'Paradox Terminal sayfasi',
          aliases: ['paradox terminal', 'terminal'],
          action: goTo('Paradox_Terminal.html')
        },
        {
          command: 'about',
          description: 'site sahibinin ozgecmisi',
          aliases: [
            'ozgecmis',
            'özgeçmiş',
            'cv',
            'profile',
            'bu siteyi kim yaptı',
            'bu siteyi kim yapti',
            'bu sayfayı kim yaptı',
            'bu sayfayi kim yapti',
            'seni kim yaptı',
            'seni kim yapti',
            'siteyi kim yaptı',
            'siteyi kim yapti',
            'sayfayı kim yaptı',
            'sayfayi kim yapti',
            'site sahibi kim',
            'kim yaptı',
            'kim yapti'
          ],
          action: goTo('ozgecmisim.html')
        },
        {
          command: 'access',
          description: 'giris ekranini acar',
          aliases: ['login', 'auth', 'giris', 'giriş'],
          action: goTo('auth.html')
        },
        {
          command: 'dashboard',
          description: 'dashboard ekranini acar',
          aliases: ['dash', 'panel'],
          action: goTo('dashboard.html')
        },
        {
          command: 'admin',
          description: 'admin ekranini acar',
          aliases: ['manage', 'yonetim', 'yönetim'],
          action: goTo('admin.html')
        },
        {
          command: 'universe',
          description: 'Universe-2 deneyimini acar',
          aliases: ['universe 2', 'u2', 'evren'],
          action: goTo('universe-2.html')
        },
        {
          command: 'open manifest',
          description: 'site manifest dosyasini acar',
          aliases: ['manifest file'],
          action: goTo('manifest.json')
        },
        {
          command: 'unlock hidden',
          description: 'gizli katmani acar',
          aliases: ['hidden', 'unlock', 'gizli', 'gizli katman'],
          action: unlockHiddenCommand
        },
        {
          command: 'level',
          description: 'mevcut erisim seviyesini gosterir',
          aliases: ['access level', 'seviye'],
          action: () => `access level: ${levels[Math.min(state.level, levels.length - 1)]}`
        }
      ];

      const keyboardHelpText = () => 'keyboard: D dossier, L logic, T signal, B ash, F flow, M map, N notes, A access, ? command shell, Ctrl+K command shell, Tab complete, Up/Down history, ESC close';

      const commandHelpText = () => [
        'routes:',
        'home, map, archive, notes, open dossier, run logic, run signal, run ash, run flow',
        '',
        'lab:',
        'dart, bartender, barista, barista v2, realists bar, open oracle, paradox, universe',
        '',
        'system:',
        'whoami, log, clear, random, shutdown, restart, screen saver, level, access, dashboard, deb, bugy',
        '',
        'deb ops:',
        'deb scan, deb meteor, deb blackhole, deb deathstar, deb off',
                '',
        'hidden:',
        'signal -> oracle -> manifest -> unlock hidden, clues'
      ].join('\n');

      const commandMap = commandDefinitions.reduce((map, item) => {
        [item.command, ...(item.aliases || [])].forEach(alias => {
          map[normalizeCommand(alias)] = item.action;
        });
        return map;
      }, Object.create(null));

      const commandChoices = commandDefinitions.flatMap(item => [item.command, ...(item.aliases || [])]);

      const matchingCommands = (raw) => {
        const query = normalizeCommand(raw);
        if (!query) return commandChoices.slice(0, 6);
        return commandChoices
          .filter(choice => normalizeCommand(choice).includes(query))
          .slice(0, 6);
      };

      const clearCommandSuggestions = () => {
        commandShell?.classList.remove('has-suggestions');
        if (commandSuggestions) commandSuggestions.textContent = '';
      };

      const applySuggestion = (value, run = false) => {
        if (!commandInput || !value) return;
        commandInput.value = value;
        commandInput.focus();
        renderCommandSuggestions(value);
        if (run) runCommand(value);
      };

      const renderCommandSuggestions = (raw = '') => {
        if (!commandSuggestions || !commandShell) return;
        const matches = matchingCommands(raw);
        activeSuggestionIndex = Math.min(activeSuggestionIndex, Math.max(matches.length - 1, 0));
        commandSuggestions.textContent = '';
        commandShell.classList.toggle('has-suggestions', Boolean(matches.length));
        matches.forEach((match, index) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = `command-suggestion${index === activeSuggestionIndex ? ' is-active' : ''}`;
          button.textContent = match;
          button.addEventListener('click', () => applySuggestion(match, true));
          commandSuggestions.appendChild(button);
        });
      };

      const isCreatorQuery = (command) => {
        const normalized = command
          .replace(/ı/g, 'i')
          .replace(/ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/ö/g, 'o')
          .replace(/ç/g, 'c');
        return (
          /(bu\s+)?site(yi)?\s+kim\s+(yapti|hazirladi|kurdu|tasarladi)/.test(normalized) ||
          /(bu\s+)?sayfa(yi)?\s+kim\s+(yapti|hazirladi|kurdu|tasarladi)/.test(normalized) ||
          /seni\s+kim\s+(yapti|hazirladi|kurdu|tasarladi)/.test(normalized) ||
          /site\s+sahibi\s+kim/.test(normalized) ||
          /kim\s+(yapti|hazirladi|kurdu|tasarladi)/.test(normalized)
        );
      };

      const normalizeOracleAnswer = (answer) => answer
        .replace(/\r/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, 900);

      const localOracleAnswer = (command) => {
        const normalized = normalizeCommand(command);
        if (/kim|yapti|hazirladi|kurdu|tasarladi|sahibi/.test(normalized)) {
          return 'oracle: Bu site Ersin Binal tarafindan hazirlanan deneysel Convivium alanidir. Public katmanda projeler, notlar, oyunlar ve terminal rotalari gorunur.';
        }
        if (/ne yapabilirsin|komut|yardim|help/.test(normalized)) {
          return 'oracle: Kisa sorulari yanitlar, rotalari isaret eder ve public site hafizasindan guvenli ipuclari verir. Komut listesi icin help yaz.';
        }
        if (/site|convivium|burasi/.test(normalized)) {
          return 'oracle: Convivium, public projeler ve deneysel arayuzler icin kurulmus bir terminal bahcesi. Gizli anahtar ya da ozel veri yuklu degil.';
        }
        return 'oracle: Dis kanallar sessiz. Soruyu tek cumleye indir, varsayimi kucult ve tekrar dene; terminal public hafizada kalmaya devam ediyor.';
      };

      const askOracleProxy = async (command) => {
        if (!oracleProxyIsUsable) {
          throw new Error('oracle proxy endpoint not configured');
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 24000);

        try {
          const response = await fetch(oracleProxyEndpoint, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question: command })
          });

          if (!response.ok) {
            const error = new Error(`oracle proxy status ${response.status}`);
            error.status = response.status;
            throw error;
          }

          const data = await response.json();
          const answer = normalizeOracleAnswer(data?.answer);
          if (!answer) {
            throw new Error('empty oracle proxy response');
          }

          return answer;
        } finally {
          window.clearTimeout(timeout);
        }
      };

      const askOracleFallback = async (command) => {
        try {
          return await askOracleProxy(command);
        } catch {
          return localOracleAnswer(command);
        }
      };

      const setCommandBusy = (busy) => {
        commandInFlight = busy;
        if (commandInput) commandInput.disabled = busy;
        if (commandShell) commandShell.setAttribute('aria-busy', String(busy));
      };

      const sendOracleQuery = async (query) => {
        if (commandOutput) commandOutput.textContent = oracleWaitLines[0];
        if (microOracle) microOracle.textContent = 'external oracle channel';
        setCommandBusy(true);
        let waitLineIndex = 0;
        const waitSignal = window.setInterval(() => {
          if (!commandInFlight || !commandOutput) return;
          waitLineIndex = (waitLineIndex + 1) % oracleWaitLines.length;
          commandOutput.textContent = oracleWaitLines[waitLineIndex];
        }, 7000);

        try {
          const result = await askOracleFallback(query);
          if (commandOutput) commandOutput.textContent = result;
          if (microOracle) microOracle.textContent = 'oracle response received';
          updateOsSnapshot(state.level, 'oracle.response');
          award(Math.max(state.level, 1));
          pulse(520, 0.07);
        } catch (error) {
          const status = error?.status || 0;
          if (commandOutput) {
            commandOutput.textContent = status === 429
              ? 'oracle mesgul. dis servis limitine takildi; biraz sonra tekrar dene.'
              : 'oracle channel noisy. dis servis su an yanit vermiyor; biraz sonra tekrar dene.';
          }
          if (microOracle) microOracle.textContent = 'oracle unavailable';
          pulse(150, 0.08);
        } finally {
          window.clearInterval(waitSignal);
          setCommandBusy(false);
          commandInput?.focus();
        }
      };

      const runCommand = async (raw) => {
        const query = raw.trim().slice(0, 520);
        const command = normalizeCommand(query);
        if (!query || commandInFlight) return;
        state.commands += 1;
        state.commandLog = [...(state.commandLog || []), query].slice(-8);
        if (state.commands >= 3) award(2);
        persist();
        pulse(390, 0.055);
        if (['oracle yes', 'ask oracle', 'confirm oracle'].includes(command)) {
          if (!pendingOracleQuery) {
            if (commandOutput) commandOutput.textContent = 'oracle: bekleyen sorgu yok. Once serbest bir soru yaz.';
            commandInput.value = '';
            clearCommandSuggestions();
            return;
          }
          const confirmedQuery = pendingOracleQuery;
          pendingOracleQuery = '';
          commandInput.value = '';
          clearCommandSuggestions();
          await sendOracleQuery(confirmedQuery);
          return;
        }
        const action = commandMap[command];
        if (action) {
          const result = await action();
          if (commandOutput) commandOutput.textContent = result !== undefined ? result : `executing: ${query}`;
          commandInput.value = '';
          clearCommandSuggestions();
          return;
        }
        if (isCreatorQuery(command)) {
          location.href = 'ozgecmisim.html';
          commandInput.value = '';
          clearCommandSuggestions();
          return;
        }

        await sendOracleQuery(query);
        commandInput.value = '';
        clearCommandSuggestions();
      };

      commandInput?.addEventListener('keydown', event => {
        const matches = matchingCommands(commandInput.value);
        if (event.key === 'Enter') {
          event.preventDefault();
          runCommand(commandInput.value);
        } else if (event.key === 'Tab') {
          event.preventDefault();
          applySuggestion(matches[activeSuggestionIndex] || matches[0] || commandInput.value);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          const history = state.commandLog || [];
          if (!history.length) return;
          commandHistoryIndex = commandHistoryIndex < 0 ? history.length - 1 : Math.max(0, commandHistoryIndex - 1);
          commandInput.value = history[commandHistoryIndex] || '';
          renderCommandSuggestions(commandInput.value);
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          const history = state.commandLog || [];
          if (!history.length) return;
          commandHistoryIndex = commandHistoryIndex >= history.length - 1 ? -1 : commandHistoryIndex + 1;
          commandInput.value = commandHistoryIndex === -1 ? '' : history[commandHistoryIndex];
          renderCommandSuggestions(commandInput.value);
        } else if (event.key === 'Escape') {
          closeCommand();
        }
      });

      commandInput?.addEventListener('input', () => {
        commandHistoryIndex = -1;
        activeSuggestionIndex = 0;
        renderCommandSuggestions(commandInput.value);
      });

      document.querySelectorAll('.command-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => {
          openCommand();
          runCommand(trigger.dataset.command || '');
        });
      });

      commandLaunch?.addEventListener('click', openCommand);
      mobileCommandButton?.addEventListener('click', openCommand);
      commandClose?.addEventListener('click', closeCommand);
      accessChipButton?.addEventListener('click', () => {
        if (!authState.granted) {
          requestLogin();
          return;
        }
        location.href = 'auth.html';
      });

      setAudioEnabled(audioEnabled);
      soundToggle?.addEventListener('click', () => {
        setAudioEnabled(!audioEnabled, true);
      });

      window.addEventListener('pointermove', event => {
        const x = Math.round((event.clientX / window.innerWidth) * 100);
        const y = Math.round((event.clientY / window.innerHeight) * 100);
        pointer = { x: event.clientX, y: event.clientY };
        document.body.style.setProperty('--mx', `${x}%`);
        document.body.style.setProperty('--my', `${y}%`);
      }, { passive: true });

      document.addEventListener('keydown', event => {
        if (screenSaverOverlay?.classList.contains('is-active')) {
          event.preventDefault();
          closeScreenSaver();
          return;
        }
        if (event.target.matches('input, textarea')) return;
        const key = event.key.toLowerCase();
        if (key === '?' || (event.ctrlKey && key === 'k')) {
          event.preventDefault();
          openCommand();
        } else if (key === 'escape') {
          closeCommand();
          document.querySelectorAll('.journey-gate.is-open').forEach(gate => {
            gate.classList.remove('is-open');
            updateGateButton(gate);
          });
        } else if (key === 'd') location.href = 'makaleler.html';
        else if (key === 'l') location.href = 'cyberpunk-logic-game.html';
        else if (key === 't') location.href = 'three-body-signal.html';
        else if (key === 'b') location.href = 'ash-runner.html';
        else if (key === 'f') location.href = 'neon-river.html';
        else if (key === 'm') scrollToSection('map', 'signal map');
        else if (key === 'n') scrollToSection('notes', 'field notes');
        else if (key === 'a') location.href = 'auth.html';
      });

      document.querySelectorAll('a, button').forEach(item => {
        item.addEventListener('mouseenter', () => pulse(250, 0.035));
      });

      const resizeCanvas = () => {
        if (!canvas || !context) return;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(window.innerWidth * ratio);
        canvas.height = Math.floor(window.innerHeight * ratio);
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        nodes = Array.from({ length: window.innerWidth < 700 ? 28 : 54 }, (_, index) => ({
          x: (index * 173) % window.innerWidth,
          y: (index * 97) % window.innerHeight,
          vx: (((index * 13) % 9) - 4) * 0.08,
          vy: (((index * 17) % 9) - 4) * 0.08
        }));
      };

      const drawProtocolConnections = () => {
        const route = ['origin', ...(state.opened || [])];
        const uniqueRoute = [...new Set(route)]
          .map(id => document.querySelector(`[data-signal-node="${id}"]`))
          .filter(Boolean);
        if (uniqueRoute.length < 2) return;

        context.save();
        context.lineWidth = 1;
        context.strokeStyle = 'rgba(0, 234, 255, 0.26)';
        context.shadowColor = 'rgba(0, 234, 255, 0.52)';
        context.shadowBlur = 10;
        context.beginPath();
        uniqueRoute.forEach((node, index) => {
          const box = node.getBoundingClientRect();
          const x = box.left + box.width / 2;
          const y = box.top + box.height / 2;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.stroke();
        context.restore();
      };

      const drawMap = () => {
        if (!canvas || !context) return;
        context.clearRect(0, 0, window.innerWidth, window.innerHeight);
        context.lineWidth = 1;
        nodes.forEach(node => {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < 0 || node.x > window.innerWidth) node.vx *= -1;
          if (node.y < 0 || node.y > window.innerHeight) node.vy *= -1;

          const dx = node.x - pointer.x;
          const dy = node.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 220) {
            context.strokeStyle = `rgba(0, 234, 255, ${Math.max(0, 1 - distance / 220) * 0.18})`;
            context.beginPath();
            context.moveTo(node.x, node.y);
            context.lineTo(pointer.x, pointer.y);
            context.stroke();
          }

          context.fillStyle = 'rgba(0,255,102,0.34)';
          context.fillRect(node.x, node.y, 1.4, 1.4);
        });
        drawProtocolConnections();
        requestAnimationFrame(drawMap);
      };

      updateAccess();
      if (state.unlocked?.length) {
        state.unlocked.forEach(id => {
          const gate = document.getElementById(id);
          if (gate) {
            gate.classList.add('is-unlocked');
            updateGateButton(gate);
          }
        });
      }
      if (state.opened?.length) {
        state.opened.forEach(id => document.getElementById(id)?.classList.add('is-visited'));
      }
      if (state.visits > 1 && consoleLine) consoleLine.textContent = 'returning signal detected';
      updateOsSnapshot(state.level, state.visits > 1 ? 'returning.signal' : signals[0]);
      renderProtocolSurfaces();
      persist();
      resizeCanvas();
      drawMap();
      window.addEventListener('resize', resizeCanvas);
      refreshAuthState();
})();
