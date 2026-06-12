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
      const offlineNodeKey = 'convivium.offline.node';
      const defaultState = () => ({
        visits: 0,
        level: 0,
        opened: [],
        unlocked: [],
        commands: 0,
        commandLog: [],
        rituals: 0,
        offlineNode: false,
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
      state.offlineNode = Boolean(state.offlineNode);
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
      let screenSaverCanvas = null;
      let screenSaverContext = null;
      let screenSaverGalaxyCanvas = null;
      let screenSaverGalaxyContext = null;
      let screenSaverFrame = null;
      let screenSaverStart = 0;
      let screenSaverPlanetOrder = [];
      let virtualCwd = '/';
      let pipeGame = null;
      let pipeAnimationTimers = [];
      let selectedTheme = 'green';
      let restoringUserPreferences = false;
      let pointer = { x: window.innerWidth * 0.72, y: window.innerHeight * 0.22 };
      let nodes = [];
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

      const userPreferenceKey = () => {
        const id = authState.user?.id || authState.user?.email || '';
        return authState.granted && id ? `convivium.user.${id}.preferences` : '';
      };

      const readUserPreferences = () => {
        const key = userPreferenceKey();
        if (!key) return {};
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '{}');
          return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
          return {};
        }
      };

      const writeUserPreferences = (patch = {}) => {
        const key = userPreferenceKey();
        if (!key || restoringUserPreferences) return;
        try {
          localStorage.setItem(key, JSON.stringify({
            ...readUserPreferences(),
            ...patch,
            updatedAt: new Date().toISOString()
          }));
        } catch {
          // User scoped continuity is best-effort and should never block the public UI.
        }
      };

      const currentPreferenceSnapshot = () => {
        const bugyV3 = window.BugyV3?.getState?.();
        const bugyV2 = window.BugyV2?.getState?.();
        const deb = (window.DebCompanion || window.NovaCompanion)?.getState?.();
        return {
          audioEnabled,
          theme: selectedTheme,
          virtualCwd,
          screenSaverActive: Boolean(screenSaverOverlay?.classList.contains('is-active')),
          powerState: powerOverlay?.classList.contains('is-off') ? 'off' : 'ready',
          bugyEngine: bugyV3?.active ? 'v3' : bugyV2?.active ? 'v2' : localStorage.getItem('convivium.bugy.engine') || 'v1',
          bugyV3Skin: bugyV3?.skin || localStorage.getItem('convivium.bugy.v3.skin') || 'classic',
          bugyV2Skin: bugyV2?.skin || localStorage.getItem('convivium.bugy.v2.skin') || 'classic',
          debActive: Boolean(deb?.active),
          debDetailOpen: Boolean(deb?.detailOpen)
        };
      };

      const persistUserPreferences = (patch = {}) => {
        writeUserPreferences({ ...currentPreferenceSnapshot(), ...patch });
      };

      const restorePowerOffPreference = () => {
        const overlay = ensurePowerOverlay();
        window.clearTimeout(commandCloseTimer);
        window.clearInterval(commandBootTimer);
        clearPowerTimers();
        setPowerMode('OFFLINE');
        overlay.classList.remove('is-active', 'is-booting', 'is-shutting-down');
        overlay.classList.add('is-off');
        const terminal = overlay.querySelector('.power-terminal');
        if (terminal) terminal.textContent = '';
        document.body.classList.add('power-state-active');
        setCommandBusy(false);
      };

      const applyUserPreferences = () => {
        const prefs = readUserPreferences();
        if (!Object.keys(prefs).length) {
          persistUserPreferences();
          return;
        }

        restoringUserPreferences = true;
        try {
          if (typeof prefs.audioEnabled === 'boolean') setAudioEnabled(prefs.audioEnabled);
          if (prefs.theme) themeCommand(prefs.theme);
          if (prefs.virtualCwd && virtualFs[prefs.virtualCwd]) virtualCwd = prefs.virtualCwd;

          if (prefs.bugyV3Skin) {
            localStorage.setItem('convivium.bugy.v3.skin', prefs.bugyV3Skin);
            window.BugyV3?.setSkin?.(prefs.bugyV3Skin);
          }
          if (prefs.bugyV2Skin) {
            localStorage.setItem('convivium.bugy.v2.skin', prefs.bugyV2Skin);
            window.BugyV2?.setSkin?.(prefs.bugyV2Skin);
          }
          if (prefs.bugyEngine) {
            localStorage.setItem('convivium.bugy.engine', prefs.bugyEngine);
            if (prefs.bugyEngine === 'v3') {
              window.BugyV2?.deactivate?.();
              window.BugyV3?.activate?.();
            } else if (prefs.bugyEngine === 'v2') {
              window.BugyV3?.deactivate?.();
              window.BugyV2?.activate?.();
            } else if (prefs.bugyEngine === 'v1') {
              window.BugyV3?.deactivate?.();
              window.BugyV2?.deactivate?.();
              window.Bugy?.summon?.();
            }
          }
          if (prefs.debActive) {
            const deb = window.DebCompanion || window.NovaCompanion;
            deb?.activate?.();
            if (prefs.debDetailOpen && !deb?.getState?.().detailOpen) deb?.toggleDetail?.();
          }
          if (prefs.powerState === 'off') {
            restorePowerOffPreference();
          } else if (prefs.screenSaverActive) {
            window.setTimeout(() => screenSaverCommand(), 120);
          }
        } finally {
          restoringUserPreferences = false;
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
        persistUserPreferences({ audioEnabled });
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
            applyUserPreferences();
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
        if (pipeGame?.active) {
          setPipeGameMode(true);
          setPipeOutput();
          pulse(260);
          return;
        }
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
            persistUserPreferences({ powerState: 'ready' });
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
            persistUserPreferences({ powerState: 'off' });
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
        lastFocusedElement = document.activeElement;
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

      const readOfflineNode = () => {
        try {
          const parsed = JSON.parse(localStorage.getItem(offlineNodeKey) || '{}');
          return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
          return {};
        }
      };

      const writeOfflineNode = (patch = {}) => {
        try {
          localStorage.setItem(offlineNodeKey, JSON.stringify({
            ...readOfflineNode(),
            ...patch,
            updatedAt: new Date().toISOString()
          }));
        } catch {
          // Offline node reward is best-effort; it should never block the terminal.
        }
      };

      const blackoutCommand = () => {
        const node = readOfflineNode();
        if (!node.solved) {
          return [
            'blackout: paket yok.',
            'offline node sadece gercek kesinti aninda cozulur.',
            'rota: hidden -> Offline Node'
          ].join('\n');
        }

        state.offlineNode = true;
        state.opened = [...new Set([...(state.opened || []), 'hidden'])];
        award(Math.max(state.level, 3));
        if (consoleLine) consoleLine.textContent = 'blackout seed recovered';
        if (microOracle) microOracle.textContent = 'offline node remembered';
        writeOfflineNode({ claimed: true, claimedAt: node.claimedAt || new Date().toISOString() });
        return [
          'blackout packet / recovered',
          'code: blackout.seed',
          'internet kesilince site kaybolmadi; kendi hafizasina dustu.',
          'surprise: hidden rota artik seni offline node uzerinden taniyor.'
        ].join('\n');
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

      const virtualFs = {
        '/': ['routes', 'lab', 'notes', 'system'],
        '/routes': ['home', 'map', 'archive', 'notes', 'open dossier'],
        '/lab': ['run logic', 'run signal', 'run ash', 'run flow', 'pipe'],
        '/notes': ['quote', 'note', 'ritual', 'manifest', 'clues'],
        '/system': ['whoami', 'uptime', 'version', 'memory', 'ps', 'shutdown', 'restart', 'screen saver']
      };

      const virtualDocs = {
        about: 'Convivium: public deneysel terminal alanı. Route, oyun, oracle ve not katmanları browser içinde çalışır.',
        system: 'system: static GitHub Pages shell / Worker üzerinden public oracle / local secrets unavailable.',
        routes: 'routes: home, map, archive, notes, open dossier, lab komutları.',
        lab: 'lab: logic, signal, ash, flow, pipe ve companion deneyleri.',
        audio: `audio: ${audioEnabled ? 'on' : 'off'} / preference persisted locally.`
      };

      const resolveVirtualPath = (target = '') => {
        const normalized = normalizeCommand(target).replace(/\s+/g, '-');
        if (!normalized || normalized === '/') return '/';
        if (normalized === '..') return virtualCwd.split('/').slice(0, -1).join('/') || '/';
        const path = normalized.startsWith('/') ? normalized : `${virtualCwd === '/' ? '' : virtualCwd}/${normalized}`;
        return path.replace(/\/+/g, '/');
      };

      const lsCommand = (target = '') => {
        const path = resolveVirtualPath(target);
        const items = virtualFs[path];
        if (!items) return `ls: ${path}: not found`;
        return [`${path}:`, ...items.map(item => `  ${item}`)].join('\n');
      };

      const cdCommand = (target = '/') => {
        const path = resolveVirtualPath(target);
        if (!virtualFs[path]) return `cd: ${path}: no such virtual directory`;
        virtualCwd = path;
        persistUserPreferences({ virtualCwd });
        return virtualCwd;
      };

      const catCommand = (target = '') => {
        const key = normalizeCommand(target || 'about');
        return virtualDocs[key] || `cat: ${target || 'empty'}: public document not found`;
      };

      const treeCommand = () => [
        '/',
        '|-- routes',
        '|   |-- home',
        '|   |-- map',
        '|   |-- archive',
        '|   `-- open dossier',
        '|-- lab',
        '|   |-- run logic',
        '|   |-- run signal',
        '|   |-- run ash',
        '|   |-- run flow',
        '|   `-- pipe',
        '|-- notes',
        '|   |-- note',
        '|   |-- quote',
        '|   `-- ritual',
        '`-- system',
        '    |-- whoami',
        '    |-- memory',
        '    |-- ps',
        '    `-- power'
      ].join('\n');

      const findCommand = (target = '') => {
        const query = normalizeCommand(target);
        if (!query) return 'find: usage find <term>';
        const matches = commandChoices
          .filter(choice => normalizeCommand(choice).includes(query))
          .slice(0, 12);
        return matches.length ? `find ${target}:\n${matches.map(item => `  ${item}`).join('\n')}` : `find: no command matching "${target}"`;
      };

      const uptimeCommand = () => {
        const seconds = Math.floor(performance.now() / 1000);
        const minutes = Math.floor(seconds / 60);
        return [
          `uptime: ${minutes}m ${seconds % 60}s`,
          `visits: ${state.visits}`,
          `commands: ${state.commands}`,
          `level: ${levels[Math.min(state.level, levels.length - 1)]}`
        ].join('\n');
      };

      const dateCommand = () => new Date().toLocaleString('tr-TR', {
        dateStyle: 'full',
        timeStyle: 'medium'
      });

      const versionCommand = () => [
        'Convivium Terminal 0.86',
        'protocol: public-static',
        'render: browser',
        'oracle: worker-proxy optional',
        'build: local-js'
      ].join('\n');

      const memoryCommand = () => [
        'MEMORY MAP',
        '0000: public route cache',
        '0100: command history ring',
        '0200: visual overlays',
        '0300: oracle pending buffer',
        '0400: companion bus',
        'SEC : private mounts unavailable'
      ].join('\n');

      const psCommand = () => [
        'PID  STATUS   PROCESS',
        `001  ${commandShell?.classList.contains('is-open') ? 'RUN' : 'IDLE'}     command.shell`,
        `002  ${screenSaverOverlay?.classList.contains('is-active') ? 'RUN' : 'IDLE'}     screen.saver`,
        `003  ${powerOverlay?.classList.contains('is-active') || powerOverlay?.classList.contains('is-off') ? 'RUN' : 'IDLE'}     power.overlay`,
        `004  ${(window.DebCompanion || window.NovaCompanion)?.getState?.().active ? 'RUN' : 'IDLE'}     deb.companion`,
        `005  ${commandInFlight ? 'WAIT' : 'IDLE'}     oracle.channel`,
        `006  ${pipeGame?.active ? 'RUN' : 'IDLE'}     pipe.game`
      ].join('\n');

      const themeCommand = (target = '') => {
        const theme = normalizeCommand(target);
        const colors = {
          green: ['#00ff66', '#caffd8'],
          cyan: ['#00eaff', '#d8fbff'],
          amber: ['#f5ff6b', '#fff7b0']
        };
        if (!colors[theme]) return 'theme: usage theme green|cyan|amber';
        document.documentElement.style.setProperty('--journey-green', colors[theme][0]);
        document.documentElement.style.setProperty('--journey-cyan', colors[theme][1]);
        selectedTheme = theme;
        persistUserPreferences({ theme });
        return `theme: ${theme}`;
      };

      const volumeCommand = (target = '') => {
        const action = normalizeCommand(target);
        if (['mute', 'off', 'kapali', 'kapat'].includes(action)) {
          setAudioEnabled(false);
          return 'audio off';
        }
        if (['on', 'up', 'ac', 'aç', 'open'].includes(action)) {
          setAudioEnabled(true, true);
          return 'audio on';
        }
        return `audio: ${audioEnabled ? 'on' : 'off'} / usage volume on|mute`;
      };

      const scanCommand = () => {
        document.querySelectorAll('.journey-gate, .site-header').forEach((item, index) => {
          window.setTimeout(() => item.classList.add('is-visited'), index * 80);
        });
        pulse(620, 0.08);
        return 'scan: public nodes highlighted';
      };

      const nextCommand = () => {
        const unopened = stages.find(stage => !(state.opened || []).includes(stage.id) && stage.id);
        if (!unopened) return 'next: all known public nodes have been touched';
        unopened.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return `next: ${unopened.id}`;
      };

      const tourCommand = () => {
        const ids = ['origin', 'index', 'lab', 'trace', 'map', 'archive', 'notes', 'hidden'];
        ids.forEach((id, index) => {
          window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), index * 950);
        });
        return 'tour: route playback started';
      };

      const badgeCommand = () => {
        const badge = state.commands > 30 ? 'TERMINAL OPERATOR' : state.commands > 12 ? 'FIELD USER' : 'GUEST PILOT';
        return `badge: ${badge}\ncommands: ${state.commands}\nlevel: ${levels[Math.min(state.level, levels.length - 1)]}`;
      };

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

      const startPipeGame = () => {
        clearPipeAnimation();
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
          flowIn: 30,
          score: 0,
          flowPath: new Set(),
          flowWave: new Set(),
          leakAt: null,
          temp: 9200,
          status: 'REACTOR COOLANT ready. containment opens after 30 actions.',
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
        rows.push(`║ TEMP ${String(pipeGame.temp).padStart(4, ' ')}K [${pipeMeter(heat, 10000)}]  PRESS ${String(pressure).padStart(2, '0')} [${pipeMeter(pressure, 16, 8)}] ║`);
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
        rows.push('KEYS: arrows move | SPACE/R rotate | ENTER weld | F coolant | X dump | Q quit');
        rows.push('CMDS: pipe rotate | pipe place | pipe flow | pipe dump | pipe quit | pipe new');
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
          command: 'ls',
          description: 'sanal terminal dizinini listeler',
          aliases: ['dir'],
          action: () => lsCommand()
        },
        {
          command: 'pwd',
          description: 'sanal terminal konumunu gosterir',
          aliases: ['where'],
          action: () => virtualCwd
        },
        {
          command: 'cd',
          description: 'sanal dizin degistirir',
          aliases: ['chdir'],
          action: () => 'cd: usage cd routes|lab|notes|system'
        },
        {
          command: 'cat',
          description: 'public terminal dokumani okur',
          aliases: ['type'],
          action: () => catCommand('about')
        },
        {
          command: 'tree',
          description: 'site terminal agacini gosterir',
          aliases: ['sitemap'],
          action: treeCommand
        },
        {
          command: 'find',
          description: 'komut ve route arar',
          aliases: ['search'],
          action: () => 'find: usage find <term>'
        },
        {
          command: 'uptime',
          description: 'oturum suresini ve terminal sayaclarini gosterir',
          aliases: ['runtime'],
          action: uptimeCommand
        },
        {
          command: 'date',
          description: 'lokal tarih ve saati gosterir',
          aliases: ['time', 'saat', 'tarih'],
          action: dateCommand
        },
        {
          command: 'version',
          description: 'terminal surum bilgisini gosterir',
          aliases: ['ver'],
          action: versionCommand
        },
        {
          command: 'memory',
          description: 'guvenli kurgu bellek haritasini gosterir',
          aliases: ['mem'],
          action: memoryCommand
        },
        {
          command: 'ps',
          description: 'aktif public UI sureclerini gosterir',
          aliases: ['processes', 'tasks'],
          action: psCommand
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
          command: 'pipe',
          description: 'fuzyon reaktoru sogutma oyunu Pipe-90i acar',
          aliases: ['pipes', 'pipe game', 'pipe86', 'pipe90', 'boru oyunu', 'reactor', 'reaktor', 'coolant'],
          action: () => pipeCommand('new')
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
          command: 'theme',
          description: 'terminal renk modunu degistirir',
          aliases: ['color'],
          action: () => 'theme: usage theme green|cyan|amber'
        },
        {
          command: 'volume',
          description: 'terminal sesini komuttan yonetir',
          aliases: ['audio', 'sound'],
          action: () => volumeCommand()
        },
        {
          command: 'scan',
          description: 'public node tarama efektini baslatir',
          aliases: ['node scan'],
          action: scanCommand
        },
        {
          command: 'next',
          description: 'siradaki public node onerisine gider',
          aliases: ['continue', 'ileri'],
          action: nextCommand
        },
        {
          command: 'tour',
          description: 'sayfa rotasini otomatik gezdirir',
          aliases: ['guide', 'walkthrough'],
          action: tourCommand
        },
        {
          command: 'badge',
          description: 'terminal rozetini gosterir',
          aliases: ['rank', 'achievement'],
          action: badgeCommand
        },
        {
          command: 'blackout',
          description: 'offline node paketini okur',
          aliases: ['offline node', 'blackout seed', 'return packet'],
          action: blackoutCommand
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
        'dart, bartender, barista, barista v2, realists bar, open oracle, paradox, universe, pipe, pipe dump',
        '',
        'system:',
        'whoami, uptime, date, version, memory, ps, log, clear, random, shutdown, restart, screen saver',
        '',
        'terminal:',
        'ls, pwd, cd lab, cat about, tree, find oracle, theme green, volume on, scan, next, tour, badge, blackout',
        '',
        'deb ops:',
        'deb scan, deb meteor, deb blackhole, deb deathstar, deb off',
                '',
        'hidden:',
        'signal -> oracle -> manifest -> unlock hidden, clues, offline node'
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

      const typeOracleOutput = (text) => new Promise((resolve) => {
        if (!commandOutput) {
          resolve();
          return;
        }

        const output = String(text || '');
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion || output.length < 12) {
          commandOutput.textContent = output;
          resolve();
          return;
        }

        commandOutput.textContent = '';
        let index = 0;
        const writeNext = () => {
          if (!commandInFlight) {
            resolve();
            return;
          }

          index += 1;
          commandOutput.textContent = output.slice(0, index);
          if (index >= output.length) {
            resolve();
            return;
          }

          const char = output[index - 1];
          const delay = /[.!?]/.test(char) ? 90 : /[,;:]/.test(char) ? 45 : char === '\n' ? 70 : 14;
          window.setTimeout(writeNext, delay);
        };

        writeNext();
      });

      const sendOracleQuery = async (query) => {
        if (commandOutput) commandOutput.textContent = oracleWaitLines[0];
        if (microOracle) microOracle.textContent = 'external oracle channel';
        setCommandBusy(true);
        let waitLineIndex = 0;
        let waitSignal = window.setInterval(() => {
          if (!commandInFlight || !commandOutput) return;
          waitLineIndex = (waitLineIndex + 1) % oracleWaitLines.length;
          commandOutput.textContent = oracleWaitLines[waitLineIndex];
        }, 7000);

        try {
          const result = await askOracleFallback(query);
          window.clearInterval(waitSignal);
          waitSignal = null;
          if (microOracle) microOracle.textContent = 'oracle stream receiving';
          await typeOracleOutput(result);
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
          if (waitSignal) window.clearInterval(waitSignal);
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
        const parameterActions = [
          ['ls ', value => lsCommand(value)],
          ['dir ', value => lsCommand(value)],
          ['cd ', value => cdCommand(value)],
          ['chdir ', value => cdCommand(value)],
          ['cat ', value => catCommand(value)],
          ['type ', value => catCommand(value)],
          ['find ', value => findCommand(value)],
          ['search ', value => findCommand(value)],
          ['theme ', value => themeCommand(value)],
          ['color ', value => themeCommand(value)],
          ['volume ', value => volumeCommand(value)],
          ['audio ', value => volumeCommand(value)],
          ['sound ', value => volumeCommand(value)],
          ['pipe ', value => pipeCommand(value)]
        ];
        const parameterMatch = parameterActions.find(([prefix]) => command.startsWith(prefix));
        if (parameterMatch) {
          const result = parameterMatch[1](command.slice(parameterMatch[0].length));
          if (commandOutput) commandOutput.textContent = result !== undefined ? result : `executing: ${query}`;
          commandInput.value = '';
          clearCommandSuggestions();
          return;
        }
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
        if (pipeGame?.active) {
          const key = event.key.toLowerCase();
          const pipeShortcutMode = !commandInput.value.trim();
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            movePipeCursor(-1, 0);
            return;
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            movePipeCursor(1, 0);
            return;
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            movePipeCursor(0, -1);
            return;
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            movePipeCursor(0, 1);
            return;
          }
          if (pipeShortcutMode && (key === ' ' || key === 'r')) {
            event.preventDefault();
            if (commandOutput) commandOutput.textContent = rotatePipe();
            return;
          }
          if (pipeShortcutMode && key === 'f') {
            event.preventDefault();
            if (commandOutput) commandOutput.textContent = flowPipe();
            return;
          }
          if (pipeShortcutMode && key === 'x') {
            event.preventDefault();
            if (commandOutput) commandOutput.textContent = dumpPipe();
            return;
          }
          if (pipeShortcutMode && key === 'q') {
            event.preventDefault();
            if (commandOutput) commandOutput.textContent = pipeCommand('quit');
            return;
          }
          if (event.key === 'Enter' && !commandInput.value.trim()) {
            event.preventDefault();
            if (commandOutput) commandOutput.textContent = placePipe();
            return;
          }
        }
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

      window.addEventListener('bugy-v3:state', event => {
        const detail = event.detail || {};
        persistUserPreferences({
          bugyEngine: detail.active ? 'v3' : currentPreferenceSnapshot().bugyEngine,
          bugyV3Skin: detail.skin || localStorage.getItem('convivium.bugy.v3.skin') || 'classic'
        });
      });

      window.addEventListener('bugy-v2:state', event => {
        const detail = event.detail || {};
        persistUserPreferences({
          bugyEngine: detail.active ? 'v2' : currentPreferenceSnapshot().bugyEngine,
          bugyV2Skin: detail.skin || localStorage.getItem('convivium.bugy.v2.skin') || 'classic'
        });
      });

      window.addEventListener('deb:state', event => {
        const detail = event.detail || {};
        persistUserPreferences({
          debActive: Boolean(detail.active),
          debDetailOpen: Boolean(detail.detailOpen)
        });
      });

      window.addEventListener('beforeunload', () => {
        persistUserPreferences();
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
      const offlineNode = readOfflineNode();
      if (offlineNode.solved) {
        state.offlineNode = true;
        state.opened = [...new Set([...(state.opened || []), 'hidden'])];
        award(Math.max(state.level, 3));
        if (!offlineNode.welcomed && navigator.onLine) {
          if (consoleLine) consoleLine.textContent = 'blackout packet delivered / type blackout';
          if (microOracle) microOracle.textContent = 'offline node returned';
          updateOsSnapshot(state.level, 'blackout.seed');
          writeOfflineNode({ welcomed: true, welcomedAt: new Date().toISOString() });
        }
      }
      renderProtocolSurfaces();
      persist();
      resizeCanvas();
      drawMap();
      window.addEventListener('resize', resizeCanvas);
      window.addEventListener('resize', () => {
        if (!screenSaverOverlay?.classList.contains('is-active')) return;
        resizeScreenSaverSystem();
        drawScreenSaverSystem(performance.now());
      });
      refreshAuthState();
})();
