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
        easterTrail: [],
        inventory: [],
        discovered: [],
        aliases: {},
        debBond: 0
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
      state.inventory = Array.isArray(state.inventory) ? [...new Set(state.inventory)] : [];
      state.discovered = Array.isArray(state.discovered) ? [...new Set(state.discovered)] : [];
      state.aliases = (state.aliases && typeof state.aliases === 'object' && !Array.isArray(state.aliases)) ? state.aliases : {};
      state.debBond = Number.isFinite(state.debBond) ? state.debBond : 0;
      state.visits += 1;
      if (state.visits > 1) document.body.classList.add('returning-visitor');
      let signalIndex = 0;
      let audioEnabled = window.ConviviumSFX?.enabled ?? false;
      let audioContext = null; // artık ConviviumSFX yönetiyor; eski kod uyumluluğu için bırakıldı
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
      let transcript = '';
      let pipeGame = null;
      let pipeAnimationTimers = [];
      let pipeIntroActive = false;
      let outrun = null;
      let outrunRaf = null;
      let outrunLastTs = 0;
      let outrunIntroTimers = [];
      let outrunIntroActive = false;
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
        const bugyV4 = window.BugyV4?.getState?.();
        const bugyV3 = window.BugyV3?.getState?.();
        const bugyV2 = window.BugyV2?.getState?.();
        const deb = (window.DebCompanion || window.NovaCompanion)?.getState?.();
        return {
          audioEnabled,
          theme: selectedTheme,
          virtualCwd,
          screenSaverActive: Boolean(screenSaverOverlay?.classList.contains('is-active')),
          powerState: powerOverlay?.classList.contains('is-off') ? 'off' : 'ready',
          bugyEngine: bugyV4?.active ? 'v4' : bugyV3?.active ? 'v3' : bugyV2?.active ? 'v2' : localStorage.getItem('convivium.bugy.engine') || 'v1',
          bugyV4Skin: bugyV4?.skin || localStorage.getItem('convivium.bugy.v4.skin') || 'clippy',
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
          if (prefs.crt) setCrt(true);
          if (prefs.virtualCwd && virtualFs[prefs.virtualCwd]) virtualCwd = prefs.virtualCwd;

          if (prefs.bugyV4Skin) {
            localStorage.setItem('convivium.bugy.v4.skin', prefs.bugyV4Skin);
            window.BugyV4?.setSkin?.(prefs.bugyV4Skin);
          }
          if (prefs.bugyV3Skin) {
            localStorage.setItem('convivium.bugy.v3.skin', prefs.bugyV3Skin);
            window.BugyV3?.setSkin?.(prefs.bugyV3Skin);
          }
          if (prefs.bugyV2Skin) {
            localStorage.setItem('convivium.bugy.v2.skin', prefs.bugyV2Skin);
            window.BugyV2?.setSkin?.(prefs.bugyV2Skin);
          }
          // Canli secim (studio/terminal en son ne yazdiysa) snapshot'tan onceliklidir;
          // boylece admin panelinde secilen bugy ana sayfada geri ezilmez.
          const engine = localStorage.getItem('convivium.bugy.engine') || prefs.bugyEngine;
          if (engine) {
            localStorage.setItem('convivium.bugy.engine', engine);
            if (engine === 'v4') {
              window.BugyV2?.deactivate?.();
              window.BugyV3?.deactivate?.();
              window.BugyV4?.activate?.();
            } else if (engine === 'v3') {
              window.BugyV4?.deactivate?.();
              window.BugyV2?.deactivate?.();
              window.BugyV3?.activate?.();
            } else if (engine === 'v2') {
              window.BugyV4?.deactivate?.();
              window.BugyV3?.deactivate?.();
              window.BugyV2?.activate?.();
            } else if (engine === 'v1') {
              window.BugyV4?.deactivate?.();
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
        window.ConviviumSFX?.setEnabled?.(audioEnabled, shouldPulse);
        if (soundToggle) {
          soundToggle.textContent = audioEnabled ? 'audio on' : 'audio off';
          soundToggle.setAttribute('aria-pressed', String(audioEnabled));
        }
        persistUserPreferences({ audioEnabled });
      };

      const pulse = (frequency = 220, duration = 0.045) => {
        window.ConviviumSFX?.pulse?.(frequency, duration);
      };

      const audioCue = (name, options) => {
        window.ConviviumAudio?.play?.(name, options);
      };

      const playPowerSound = (mode) => {
        if (!audioEnabled) return;
        window.ConviviumSFX?.[mode]?.();
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
            syncWorldStateFromCloud();
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
        const previousLevel = state.level;
        state.level = Math.min(levels.length - 1, Math.max(state.level, amount));
        persist();
        updateAccess();
        if (state.level > previousLevel) audioCue('system.unlock');
      };

      // --- Faz 3: kalici world state senkronu (Supabase). Tamamen defansif:
      // backend yoksa / oturum yoksa / hata olursa localStorage davranisi aynen korunur.
      let worldSyncReady = false;
      let worldSaveTimer = null;

      const scheduleWorldSave = (immediate = false) => {
        const backend = window.ConviviumBackend;
        if (!worldSyncReady || !backend?.saveWorldState) return;
        if (worldSaveTimer) window.clearTimeout(worldSaveTimer);
        const run = () => {
          worldSaveTimer = null;
          backend.saveWorldState({
            unlocked: state.unlocked,
            inventory: state.inventory,
            discovered: state.discovered,
            level: state.level
          }).catch(() => { /* sessiz: bulut yazimi basarisizsa local state gecerli kalir */ });
        };
        if (immediate) run();
        else worldSaveTimer = window.setTimeout(run, 1500);
      };

      const syncWorldStateFromCloud = async () => {
        const backend = window.ConviviumBackend;
        if (!backend?.fetchWorldState) return;
        try {
          const remote = await backend.fetchWorldState();
          if (remote) {
            // Union merge: hicbir ilerleme kaybolmaz (local + bulut birlesir).
            state.unlocked = [...new Set([...(state.unlocked || []), ...(remote.unlocked || [])])];
            state.inventory = [...new Set([...(state.inventory || []), ...(remote.inventory || [])])];
            state.discovered = [...new Set([...(state.discovered || []), ...(remote.discovered || [])])];
            state.level = Math.max(Number(state.level) || 0, Number(remote.level) || 0);
            persist();
            updateAccess();
            renderProtocolSurfaces();
          }
          worldSyncReady = true;
          scheduleWorldSave(true); // birlesik durumu buluta geri yaz.
        } catch {
          worldSyncReady = false; // sessiz fallback.
        }
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
        'CONVIVIUM // READY',
        `${levels[state.level] || levels[0]} · nodes ${state.opened.length}`,
        '] look    ] basla    ] help'
      ].join('\n');

      const renderCommandBoot = () => {
        if (!commandShell || !commandOutput || commandInFlight) return;
        if (terminalTypeTimer !== null) { window.clearInterval(terminalTypeTimer); terminalTypeTimer = null; }
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
              transcriptReset(commandReadyText());
              commandShell.classList.remove('is-booting');
            }, 420);
          }
        };

        if (reduceMotion) {
          transcriptReset(commandReadyText());
          commandShell.classList.remove('is-booting');
          return;
        }

        writeLine();
        commandBootTimer = window.setInterval(writeLine, 135);
      };

      const closeCommandWithMatrix = () => {
        if (!commandShell || !commandShell.classList.contains('is-open')) return;
        if (terminalTypeTimer !== null) { window.clearInterval(terminalTypeTimer); terminalTypeTimer = null; }
        window.clearInterval(commandBootTimer);
        window.clearTimeout(commandCloseTimer);
        if (outrun) { clearOutrun(); outrun = null; setOutrunMode(false); }
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
        audioCue('terminal.open');
        lastFocusedElement = document.activeElement;
        window.clearTimeout(commandCloseTimer);
        commandShell.classList.add('is-open');
        commandShell.classList.remove('is-closing');
        commandShell.setAttribute('aria-hidden', 'false');
        renderCommandSuggestions(commandInput.value);
        commandInput.focus();
        if (outrun?.active) {
          // Surus oyununa geri don: modu ac, donguyu yeniden baslat (kapaliyken durmustu).
          setOutrunMode(true);
          outrun.input = {};
          outrunBuildScreen();
          outrunPaint(outrunBuffer());
          startOutrunLoop();
          pulse(260);
          return;
        }
        if (outrun?.over) {
          setOutrunMode(true);
          if (commandOutput) commandOutput.textContent = outrunFinale(Boolean(outrun.finished));
          pulse(260);
          return;
        }
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
        audioCue('terminal.close');
        if (terminalTypeTimer !== null) { window.clearInterval(terminalTypeTimer); terminalTypeTimer = null; }
        window.clearInterval(commandBootTimer);
        window.clearTimeout(commandCloseTimer);
        clearOutrun(); // surus dongusunu durdur (durum korunur, acilinca devam eder)
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
        const unlocked = new Set(state.unlocked || []);
        const threads = (unlocked.has('/vault') ? 1 : 0) + (unlocked.has('/core') ? 1 : 0);
        const inv = state.inventory || [];
        return [
          '] WHOAMI',
          '',
          `  kimlik  : ${auth}`,
          `  unvan   : ${rankTitle()}   (access: ${level})`,
          `  izler   : ${threads}/2 tamam`,
          `  canta   : ${inv.length ? inv.join(', ') : 'bos'}`,
          `  ziyaret : ${state.visits}   komut: ${state.commands}   node: ${(state.opened || []).length}`,
          ']'
        ].join('\n');
      };

      const logCommand = () => {
        const commands = (state.commandLog || []).slice(-6).map(item => `cmd/${item}`).join('\n') || 'cmd/empty';
        const opened = (state.opened || []).slice(-6).map(item => `node/${item}`).join('\n') || 'node/origin';
        return `recent commands:\n${commands}\n\nrecent nodes:\n${opened}`;
      };

      const clearCommand = () => {
        transcriptReset();
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
        '/': ['routes', 'lab', 'notes', 'system', 'vault'],
        '/routes': ['home', 'map', 'archive', 'notes', 'open dossier'],
        '/lab': ['run logic', 'run signal', 'run ash', 'run flow', 'pipe', 'outrun'],
        '/notes': ['quote', 'note', 'ritual', 'manifest', 'clues'],
        '/system': ['whoami', 'uptime', 'version', 'memory', 'ps', 'shutdown', 'restart', 'screen saver'],
        '/vault': ['satir'],
        '/core': ['cekirdek', 'gunluk'],
        '/atlas': ['harita', 'imza']
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
        const path = (normalized.startsWith('/') ? normalized : `${virtualCwd === '/' ? '' : virtualCwd}/${normalized}`).replace(/\/+/g, '/');
        // Goreli yol yoksa ama ust seviye bir esikse oraya cevir (cd vault her yerden calissin).
        if (!virtualFs[path] && virtualFs[`/${normalized}`]) return `/${normalized}`;
        return path;
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
        const room = worldRooms[path];
        if (room?.locked && !(state.unlocked || []).includes(path)) {
          return `cd: ${path}: muhurlu. "unlock ${path.replace(/^\//, '')}" ile ya da dogru anahtarla ac.`;
        }
        virtualCwd = path;
        persistUserPreferences({ virtualCwd });
        if (worldRooms[path]) {
          if (!state.discovered.includes(path)) {
            state.discovered = [...new Set([...state.discovered, path])];
            persist();
          }
          return roomPanel(path);
        }
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
        '|   |-- pipe',
        '|   `-- outrun',
        '|-- notes',
        '|   |-- note',
        '|   |-- quote',
        '|   `-- ritual',
        '|-- system',
        '|   |-- whoami',
        '|   |-- memory',
        '|   |-- ps',
        '|   `-- power',
        '`-- vault  [muhurlu]'
      ].join('\n');

      const findCommand = (target = '') => {
        const query = normalizeCommand(target);
        if (!query) return 'find: usage find <term>';
        const matches = commandChoices
          .filter(choice => normalizeCommand(choice).includes(query))
          .slice(0, 12);
        return matches.length ? `find ${target}:\n${matches.map(item => `  ${item}`).join('\n')}` : `find: no command matching "${target}"`;
      };

      // --- World layer (Faz 1): odalar, inceleme, envanter, muhur ---
      const worldRooms = {
        '/': {
          look: 'Convivium ana hattindasin. Dort esik soluk soluk yaniyor: routes, lab, notes, system. Zeminde tek bir cizik isaret var.',
          objects: {
            'isaret': 'Zemindeki cizik bir glyph. Dikkatle bakinca dort esigin ortak bir merkeze baktigini gosteriyor. Merkez muhurlu: /vault.',
            'glyph': 'Ayni cizik. /vault adli muhurlu bir duguma isaret ediyor. Onu acan sey notlarin arasinda saklı.'
          }
        },
        '/routes': {
          look: 'Rotalar esigi. Public sayfalara acilan kapilar burada dizili: home, map, archive, dossier.',
          objects: {
            'dossier': 'Yarisi acik bir dosya. Erisim seviyen yukseldikce daha fazla satir okunuyor.'
          }
        },
        '/lab': {
          look: 'Lab esigi. Oynanabilir deneyler ve companion ritleri burada calisir. Bir kosede pipe reaktoru, yaninda tozlu bir arcade kabini bekliyor.',
          objects: {
            'reactor': 'Pipe reaktoru bekleme modunda. "pipe" yazip coolant hattini cekirdege ulastiran birine /core mühru acilir.',
            'pipe': 'Reaktorun kontrol paneli. pipe komutu ile coolant bulmacasini baslat; cozersen cekirdek (/core) erisilir olur.',
            'cabinet': "1986 yapimi bir OUT RUN kabini. Anahtar uzerinde. \"outrun\" yaz, kontagi cevir, sahili tuttur.",
            'arcade': "Tozlu arcade kabini: OUT RUN '86. \"outrun\" komutu motoru calistirir."
          }
        },
        '/notes': {
          look: 'Saha notlari esigi. Alintilar, ritueller ve yarim birakilmis izler. Bir kosede sicacik parlayan bir clue var.',
          objects: {
            'clues': 'Notlarin arasinda kucuk, sicak bir parca: bir shard. Almak icin: take shard.',
            'ritual': 'Tekrarlanan kucuk bir jest. Her tekrar bir ritmi pekistirir.'
          },
          grants: { item: 'shard' }
        },
        '/system': {
          look: 'Sistem esigi. whoami, uptime, memory, power. Soguk ve duzenli.',
          objects: {
            'memory': 'Bellek haritasi. 0400: companion bus satiri yeni acilmis gibi titreseyor.'
          }
        },
        '/vault': {
          look: 'Kasa. Muhur cozuldu. Iceride tek satir var: "Arayuz, dusunme bicimini degistiren kucuk bir sistemdir." Convivium burada baslar.',
          locked: true,
          key: 'shard',
          objects: {
            'satir': 'Kurucu cumle. Ilk iz tamamlandi; terminal bunu hatirlayacak.'
          }
        },
        '/core': {
          look: 'Cekirdek. Coolant hatti kilitlendi, sicaklik dustu. Burasi sitenin nabzi: her deney, her route buradan beslenir. Duvarda bir gunluk asili.',
          locked: true,
          key: 'coolant',
          objects: {
            'cekirdek': 'Soguyan cekirdek. Reaktoru sen soguttun; ikinci iz tamamlandi.',
            'gunluk': 'Gunluk: "Bir sistemi anlamak, onu soguk tutabilmektir." Notun altinda: "shard ile coolant bir araya gelince yol acilir."'
          }
        },
        '/atlas': {
          look: 'Atlas. Convivium\'un gizli haritasi: tum esikler, tum izler tek bir desende. Burayi yalnizca iki izi de tamamlayip prizmayi doku biri gorur.',
          locked: true,
          key: 'prism',
          objects: {
            'harita': 'Butun rotalarin ortak deseni. Artik kabugu sen de okuyabiliyorsun.',
            'imza': 'Kosede tek satir: "Burayi gormus biri artik bir ARCHITECT\'tir. Convivium senin de evindir."'
          }
        }
      };

      const roomTitles = {
        '/': 'Ana Hat',
        '/routes': 'Rotalar',
        '/lab': 'Laboratuvar',
        '/notes': 'Saha Notlari',
        '/system': 'Sistem',
        '/vault': 'Kasa',
        '/core': 'Cekirdek',
        '/atlas': 'Atlas'
      };

      // Bulundugun odadan gidebilecegin esikler (ProDOS CATALOG tarzi, BUYUK harf).
      // Kilitliler '*' ile isaretlenir (ProDOS kilit konvansiyonu); gizli /core acilinca gorunur.
      const roomExits = (path) => {
        const unlocked = new Set(state.unlocked || []);
        const bothThreads = unlocked.has('/vault') && unlocked.has('/core');
        const order = ['/', '/routes', '/lab', '/notes', '/system', '/vault', '/core', '/atlas'];
        const parts = [];
        order.forEach((p) => {
          if (p === path) return;
          if (p === '/core' && !unlocked.has('/core')) return; // gizli kalir
          if (p === '/atlas' && !bothThreads && !unlocked.has('/atlas')) return; // iki iz bitmeden gizli
          const name = (p === '/' ? '/' : p.replace(/^\//, '')).toUpperCase();
          const locked = worldRooms[p]?.locked && !unlocked.has(p);
          parts.push(locked ? `${name}*` : name);
        });
        return parts.join('  ');
      };

      // "Simdi ne yapmaliyim" satiri: ilerlemeye gore guncellenir.
      const currentObjective = () => {
        const inv = new Set(state.inventory || []);
        const unlocked = new Set(state.unlocked || []);
        if (!unlocked.has('/vault')) {
          if (!inv.has('shard')) return "notes esigine git, 'clue' incele, shard'i al";
          return 'unlock vault ile kasayi ac, sonra cd vault';
        }
        if (!unlocked.has('/core')) return "lab esigine git, pipe bulmacasini coz (-> /core acilir)";
        if (!unlocked.has('/atlas')) {
          if (!inv.has('prism')) return "shard'i coolant ile birlestir: use shard on coolant";
          return 'unlock atlas ile son odayi ac, sonra cd atlas';
        }
        return 'her sey tamam, ARCHITECT · wall ile iz birak, daily ile gunun sinyali';
      };

      // Ilerlemeye gore kazanilan unvan (gorunur odul).
      const rankTitle = () => {
        const unlocked = new Set(state.unlocked || []);
        if (unlocked.has('/atlas')) return 'ARCHITECT';
        const done = (unlocked.has('/vault') ? 1 : 0) + (unlocked.has('/core') ? 1 : 0);
        return done >= 2 ? 'KEEPER' : done === 1 ? 'INITIATE' : 'GEZGIN';
      };

      // ProDOS volumu tarzi yol: '/' -> /CONVIVIUM, '/notes' -> /CONVIVIUM/NOTES
      const prodosPath = (path) => path === '/' ? '/CONVIVIUM' : `/CONVIVIUM${path.toUpperCase()}`;
      const padField = (label) => (`${label}        `).slice(0, 8);

      // Oda "kokpiti" - Apple ProDOS CATALOG estetigi, modern bosluklu. Cerceve/ok yok;
      // sade durum gosterimi. Komutlari 'basla' ogretir.
      const roomPanel = (path) => {
        const room = worldRooms[path];
        if (!room) return `?NO SUCH VOLUME: ${path}`;
        const title = (roomTitles[path] || path).toUpperCase();
        const objs = Object.keys(room.objects || {});
        const inv = state.inventory || [];
        const exits = roomExits(path);
        const lockHint = exits.includes('*') ? '    (* kilitli)' : '';
        const lines = [];
        lines.push(`] ${prodosPath(path)}`);
        lines.push('');
        lines.push(`  ${title}  ::  ${rankTitle()}`);
        lines.push(`  ${room.look}`);
        lines.push('');
        if (objs.length) lines.push(`  ${padField('INCELE')}${objs.join('  ')}`);
        lines.push(`  ${padField('GIT')}${exits}${lockHint}`);
        lines.push(`  ${padField('CANTA')}${inv.length ? inv.join('  ') : '(bos)'}`);
        lines.push(`  ${padField('GOREV')}${currentObjective()}`);
        lines.push(']');
        return lines.join('\n');
      };

      const currentRoom = () => worldRooms[virtualCwd] || null;

      const roomObjectKey = (room, target) => {
        const query = normalizeCommand(target);
        if (!room || !room.objects || !query) return null;
        return Object.keys(room.objects).find(key => {
          const norm = normalizeCommand(key);
          return norm === query || norm.includes(query) || query.includes(norm);
        }) || null;
      };

      const lookCommand = (target = '') => {
        const room = currentRoom();
        if (!room) return `look: ${virtualCwd}: bu esikte gorulecek bir sey yok.`;
        if (target.trim()) return examineCommand(target);
        if (!state.discovered.includes(virtualCwd)) {
          state.discovered = [...new Set([...state.discovered, virtualCwd])];
          persist();
        }
        return roomPanel(virtualCwd);
      };

      const examineCommand = (target = '') => {
        const room = currentRoom();
        if (!room) return 'examine: burada inceleyecek bir sey yok.';
        if (!target.trim()) return 'examine: usage examine <nesne> (once look yaz).';
        const key = roomObjectKey(room, target);
        if (!key) return `examine: "${target}" burada yok. look ile etrafa bak.`;
        return room.objects[key];
      };

      const takeCommand = (target = '') => {
        const room = currentRoom();
        if (!target.trim()) return 'take: usage take <nesne>';
        const grant = room?.grants;
        const want = normalizeCommand(target);
        if (grant && normalizeCommand(grant.item) === want) {
          if ((state.inventory || []).includes(grant.item)) return `take: ${grant.item} zaten cantanda.`;
          state.inventory = [...new Set([...(state.inventory || []), grant.item])];
          state.easterTrail = [...(state.easterTrail || []), `take:${grant.item}`].slice(-4);
          persist();
          scheduleWorldSave();
          audioCue('system.unlock');
          return `aldin: ${grant.item}. (inventory ile bak, sonra muhuru ac)`;
        }
        return `take: "${target}" burada alinabilir degil.`;
      };

      const inventoryCommand = () => {
        const items = state.inventory || [];
        if (!items.length) return 'inventory: canta bos. Esikleri look + examine ile tara.';
        return ['inventory:', ...items.map(item => `  ${item}`)].join('\n');
      };

      const unlockRoomCommand = (arg = '') => {
        const parts = normalizeCommand(arg)
          .replace(/\b(with|ile|kullan|kullanarak)\b/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .split(' ')
          .filter(Boolean);
        const roomName = parts[0];
        if (!roomName) return 'unlock: usage unlock <oda> [with <anahtar>]';
        const path = resolveVirtualPath(roomName);
        const room = worldRooms[path];
        if (!room) return `unlock: ${roomName}: boyle bir esik yok.`;
        if (!room.locked) return `unlock: ${path} zaten acik.`;
        if ((state.unlocked || []).includes(path)) return `unlock: ${path} zaten cozuldu.`;
        const needed = room.key;
        const hasKey = (state.inventory || []).includes(needed);
        if (!hasKey) return `unlock: ${path} icin "${needed}" gerekiyor. Once onu bul ve take et.`;
        const providedKey = parts[1];
        if (providedKey && normalizeCommand(providedKey) !== normalizeCommand(needed)) {
          return `unlock: "${providedKey}" bu muhru acmiyor.`;
        }
        state.unlocked = [...new Set([...(state.unlocked || []), path])];
        state.easterTrail = [...(state.easterTrail || []), `unlock:${path}`].slice(-4);
        persist();
        scheduleWorldSave();
        award(3);
        updateAccess();
        audioCue('system.unlock');
        return unlockCeremony(path, roomName);
      };

      // Muhur cozulunce gosterilen torensel mesaj + kazanilan unvan (ProDOS prompt tarzi).
      const unlockCeremony = (path, roomName) => {
        const unlocked = new Set(state.unlocked || []);
        const both = unlocked.has('/vault') && unlocked.has('/core');
        const lines = [
          '] MUHUR COZULDU',
          '',
          `  ${prodosPath(path)} acildi.`,
          `  unvan: ${rankTitle()}`,
          ''
        ];
        if (path === '/atlas') {
          lines.push('  Tum izler tamam. Artik bir ARCHITECT\'sin.');
          lines.push('  cd atlas ile son odayi gor.');
        } else if (both) {
          lines.push('  Iki iz de tamamlandi (KEEPER).');
          lines.push(`  son iz: ${currentObjective()}`);
        } else {
          lines.push(`  simdi: cd ${roomName}`);
          lines.push(`  sonraki: ${currentObjective()}`);
        }
        lines.push(']');
        return lines.join('\n');
      };

      // use <nesne> on <hedef>: cantadaki nesneyi dunyada kullan (genisletilebilir).
      const useCommand = (arg = '') => {
        const norm = normalizeCommand(arg);
        if (!norm) return 'use: usage use <nesne> on <hedef>';
        const parts = norm.split(/\s+(?:on|uzerine|ustune|ile|to)\s+/);
        const item = (parts[0] || '').trim();
        const target = (parts[1] || '').trim();
        if (!item) return 'use: usage use <nesne> on <hedef>';
        if (!(state.inventory || []).includes(item)) return `use: "${item}" cantanda yok. inventory ile bak.`;
        if (!target) return `use: ${item} neyin uzerinde? (use ${item} on <hedef>)`;
        if (item === 'shard' && /vault|kasa/.test(target)) {
          return unlockRoomCommand(`vault with ${item}`);
        }
        // Final kombinasyon: shard + coolant -> prism (iki iz de tamamsa).
        if ((item === 'shard' && /coolant/.test(target)) || (item === 'coolant' && /shard/.test(target))) {
          const inv = state.inventory || [];
          if (!inv.includes('shard') || !inv.includes('coolant')) {
            return 'use: prizma icin hem shard hem coolant gerekiyor (iki izi de bitir).';
          }
          if (inv.includes('prism')) return 'use: prizmayi zaten doktun. (unlock atlas)';
          state.inventory = [...new Set([...inv, 'prism'])];
          state.easterTrail = [...(state.easterTrail || []), 'forge:prism'].slice(-4);
          persist();
          scheduleWorldSave();
          audioCue('system.unlock');
          return 'shard ve coolant birlesti -> prism doktun. simdi: unlock atlas';
        }
        return `use: ${item}, ${target} uzerinde bir ise yaramiyor.`;
      };

      // Oracle'a sorulan soruya dunya durumunu (konum + canta + seviye) baglam olarak ekler.
      const buildWorldContext = () => {
        const items = (state.inventory || []).join(', ') || 'bos';
        const levelName = levels[Math.min(state.level, levels.length - 1)];
        return `[Convivium terminali. Konum: ${virtualCwd}. Canta: ${items}. Seviye: ${levelName}.]`;
      };

      // ask/sor girdisinden saf konuyu cikarir (oracle about / hakkinda gibi sarmalari atar).
      const extractAskTopic = (raw = '') => raw
        .replace(/^\s*(oracle|deb|nova)\b/i, '')
        .replace(/^\s*(about|hakkinda|hakkında|dair|uzerine)\b/i, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Gunluk sinyal (Faz 3): bulut tablosundan; yoksa deterministik lokal havuzdan.
      const dailySignalFallback = () => {
        const pool = [
          'sinyal: Bir esik sec, examine et, gerisi acilir.',
          'sinyal: Cantanda ne tasidigin, hangi muhru acacagini soyler.',
          'sinyal: Bugun hic girmedigin bir dizine cd et.',
          'sinyal: Soguk tutulan sistem uzun yasar. pipe hattini tamamla.'
        ];
        const day = Math.floor(Date.now() / 86400000);
        return pool[day % pool.length];
      };

      const dailySignalCommand = async () => {
        const backend = window.ConviviumBackend;
        if (backend?.fetchDailySignal && backend.isConfigured?.()) {
          try {
            const row = await backend.fetchDailySignal();
            if (row?.body) return `daily ${row.signal_date}\n${row.body}`;
          } catch {
            // sessiz: lokal havuza dus.
          }
        }
        return dailySignalFallback();
      };

      // --- Faz 4: asenkron duvar (graffiti). Okuma public; yazma sadece giris yapmis
      // kullaniciya acik. Gosterim textContent ile yapilir => XSS yapisal olarak imkansiz.
      const formatWallStamp = (iso) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
      };

      // "X once" sosyal sinyal (Dalga 9): birinin yakinda burada oldugu hissi.
      const relativeTime = (iso) => {
        const t = new Date(iso).getTime();
        if (Number.isNaN(t)) return '';
        const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
        if (s < 60) return 'az once';
        const m = Math.floor(s / 60);
        if (m < 60) return `${m} dk once`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h} saat once`;
        return `${Math.floor(h / 24)} gun once`;
      };

      const readWallCommand = async () => {
        const backend = window.ConviviumBackend;
        if (!backend?.fetchWallMarks || !backend.isConfigured?.()) {
          return 'wall: duvar cevrimdisi.';
        }
        try {
          const marks = await backend.fetchWallMarks(virtualCwd, 50); // presence icin genis cek
          if (!marks.length) return `wall ${virtualCwd}: henuz iz yok. ilk izi sen birak: "mark <mesaj>"`;
          const newest = relativeTime(marks[0].created_at);
          const shown = marks.slice(0, 8);
          const lines = shown.map((m) => `  ${formatWallStamp(m.created_at)} | ${m.body}`);
          return [
            `] DUVAR ${prodosPath(virtualCwd)}`,
            `  ${marks.length} iz · en yeni: ${newest}`,
            '',
            ...lines,
            ']'
          ].join('\n');
        } catch {
          return 'wall: duvar simdilik okunamiyor.';
        }
      };

      const leaveMarkCommand = async (text) => {
        const backend = window.ConviviumBackend;
        const body = (text || '').trim();
        if (!body) return 'mark: usage mark <mesaj>';
        if (!backend?.leaveWallMark || !backend.isConfigured?.()) {
          return 'mark: duvar cevrimdisi.';
        }
        try {
          await backend.leaveWallMark({ room: virtualCwd, body });
          audioCue('system.unlock');
          return `iz birakildi: ${virtualCwd}. (wall ile oku)`;
        } catch (error) {
          const msg = String(error?.message || '');
          if (/giris/i.test(msg)) return 'mark: iz birakmak icin once giris yap (auth.html).';
          return 'mark: iz birakilamadi.';
        }
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

      // CRT tarama-cizgisi gorunumu (Dalga 7): salt gorsel overlay, etkilesimi engellemez.
      const setCrt = (on) => { commandShell?.classList.toggle('is-crt', Boolean(on)); };
      const crtCommand = (target = '') => {
        const t = normalizeCommand(target);
        const on = t === 'on' || t === 'ac' ? true : t === 'off' || t === 'kapat' ? false : !commandShell?.classList.contains('is-crt');
        setCrt(on);
        persistUserPreferences({ crt: on });
        return `crt: ${on ? 'on' : 'off'}`;
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

      // ============================================================
      // OUT RUN '86 // CONVIVIUM COAST
      // Sozde-3B ASCII yol surusu. Gercek-zamanli dongu; is-game-mode'u
      // pipe ile paylasir. Donem dokunuslari: radyo istasyonu secimi,
      // checkpoint catallanmasi, palmiyeler, 293 km/s tavan hiz.
      // ============================================================
      const OUTRUN_W = 61;
      const OUTRUN_H = 20;
      const OUTRUN_HORIZON = 6;
      const OUTRUN_TICK = 45; // ms (~22 fps)
      const OUTRUN_DEPTH = 6;  // her satir = 6 yol birimi
      const OUTRUN_VMAX = 305; // km/s tavan (donem havasi)

      // Zorluk rampasi: ileri etaplar daha keskin viraj, daha yogun trafik, daha kit zaman.
      // time = o etabin checkpoint'inde EKLENEN saniye (etap 0 = baslangic suresi).
      const outrunStages = [
        { name: 'CONVIVIUM COAST', curve: 1.00, traffic: 0.75, len: 1500, time: 23, sky: 'dawn',   scen: 'palm'  },
        { name: 'NEON DELTA',      curve: 1.70, traffic: 1.10, len: 1650, time: 19, sky: 'dusk',   scen: 'neon'  },
        { name: 'CORE TUNNELS',    curve: 2.40, traffic: 1.40, len: 1700, time: 18, sky: 'tunnel', scen: 'pylon' },
        { name: 'VAULT RIDGE',     curve: 2.10, traffic: 1.30, len: 1750, time: 18, sky: 'storm',  scen: 'rock'  },
        { name: 'ATLAS SUMMIT',    curve: 2.80, traffic: 1.60, len: 1850, time: 18, sky: 'aurora', scen: 'palm'  }
      ];

      const outrunBestKey = 'convivium.outrun.best';
      const readOutrunBest = () => { try { return parseInt(window.localStorage.getItem(outrunBestKey) || '0', 10) || 0; } catch { return 0; } };
      const writeOutrunBest = (v) => { try { window.localStorage.setItem(outrunBestKey, String(v)); } catch {} };

      const outrunRadio = [
        { id: 'magical', label: 'MAGICAL SOUND SHOWER', tone: 392 },
        { id: 'breeze',  label: 'PASSING BREEZE',       tone: 440 },
        { id: 'splash',  label: 'SPLASH WAVE',          tone: 523 }
      ];

      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

      const clearOutrun = () => {
        if (outrunRaf !== null) { window.cancelAnimationFrame(outrunRaf); outrunRaf = null; }
        outrunLastTs = 0;
        outrunIntroTimers.forEach(t => window.clearTimeout(t));
        outrunIntroTimers = [];
      };

      const setOutrunMode = (active) => {
        commandShell?.classList.toggle('is-game-mode', Boolean(active));
        // Gercek-zamanli oyun saniyede ~18 kez ciktiyi tazeler; ekran okuyucuyu bogmamak icin sus.
        if (commandOutput) commandOutput.setAttribute('aria-live', active ? 'off' : 'polite');
      };

      const outrunCurveAt = (d, mult) => (
        Math.sin(d * 0.0180) * 0.9 +
        Math.sin(d * 0.0067 + 1.3) * 0.55 +
        Math.sin(d * 0.0310 + 0.7) * 0.22
      ) * mult;

      const outrunCarColors = ['#3b6bd8', '#e0c93b', '#d8d8e0', '#37b0c0', '#e07b3b', '#9a55d0'];
      const outrunSpawnCar = () => {
        const depthSpan = (OUTRUN_H - 1) - OUTRUN_HORIZON;
        const truck = Math.random() < 0.22;
        // Daha UZAKTAN spawn -> tepki suresi. Yakindaki araclarla daima gecilebilir
        // bir bosluk birak (tum yolu kapatma): bos serit bul.
        const dist = outrun.pos + (depthSpan + 6) * OUTRUN_DEPTH + Math.random() * 90;
        const nearbyLanes = outrun.cars
          .filter(c => Math.abs(c.dist - dist) < OUTRUN_DEPTH * 4)
          .map(c => c.lane);
        let lane = (Math.random() * 2 - 1) * 0.85;
        for (let tries = 0; tries < 8; tries++) {
          if (nearbyLanes.every(l => Math.abs(l - lane) > 0.62)) break;
          lane = (Math.random() * 2 - 1) * 0.85;
        }
        outrun.cars.push({
          dist,
          lane: clamp(lane, -0.9, 0.9),
          speed: truck ? 2.0 + Math.random() * 1.2 : 4.0 + Math.random() * 4.0,
          truck,
          color: truck ? '#5e5e68' : outrunCarColors[Math.floor(Math.random() * outrunCarColors.length)],
          scored: false
        });
      };

      // --- Renk paleti / yardimcilar (donem arcade hissi) ---
      const OR_PAL = {
        road1: '#36363f', road2: '#3b3b45',
        rumA: '#d23a3a', rumB: '#eef0f4',
        grass1: '#1e7a35', grass2: '#1a6e2f',
        grassFast: '#9fe6b4', lane: '#f2f3f7',
        carB: '#e6362f', carDk: '#7c1410', carTail: '#ff8a3c', carWin: '#1a1a26', carLight: '#fff1b0',
        frame: '#00ff66', hud: '#c4f8cf', hudDim: '#5fae74', hudBg: '#04140a', warn: '#ff5a4d', amber: '#ffd166'
      };
      const OR_SKY = {
        dawn:   { top: '#241e4d', bot: '#ff9d63', sun: '#ffd07a', mtn: '#3a2b58', star: true },
        dusk:   { top: '#190f3a', bot: '#d44e6b', sun: '#ff885a', mtn: '#281640', star: true },
        tunnel: { top: '#04050a', bot: '#181b29', sun: '#3b4258', mtn: '#0a0c14', star: false },
        storm:  { top: '#23252e', bot: '#565b6a', sun: '#8a8f9e', mtn: '#181a22', star: false },
        aurora: { top: '#06112a', bot: '#0c5a4a', sun: '#7affd0', mtn: '#04203a', star: true }
      };
      const OR_SCEN = {
        palm:  { a: 'Y', b: '♣', f: '#2fbf57' },
        neon:  { a: '╪', b: '◊', f: '#ff5ad0' },
        pylon: { a: 'I', b: 'I', f: '#d8d8e0' },
        rock:  { a: '▲', b: 'Δ', f: '#9a8a6a' }
      };
      const _hx = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
      const orMix = (a, b, t) => {
        const A = _hx(a), B = _hx(b);
        const m = (i) => Math.round(A[i] + (B[i] - A[i]) * clamp(t, 0, 1)).toString(16).padStart(2, '0');
        return '#' + m(0) + m(1) + m(2);
      };
      const orMtnH = (x, pos) => {
        const s = Math.sin(x * 0.42 + pos * 0.006) * 1.1 + Math.sin(x * 0.17 + pos * 0.0021) * 1.7 + 1.7;
        return clamp(Math.round(s), 0, 3);
      };

      const OUTRUN_W2 = OUTRUN_W + 2;
      const OUTRUN_LINES = 6 + OUTRUN_H + 3; // head(6) + body(H) + foot(3)
      const K = (c, f, b) => ({ c, f, b });

      // SAF tampon: OUTRUN_LINES x OUTRUN_W2 hucre dizisi dondurur (DOM'a dokunmaz; test edilebilir).
      const outrunBuffer = () => {
        const W = OUTRUN_W, H = OUTRUN_H, horizon = OUTRUN_HORIZON;
        const stage = outrunStages[Math.min(outrun.stageIndex, outrunStages.length - 1)];
        const spd = outrun.speed;
        const pos = outrun.pos;
        const depthSpan = (H - 1) - horizon;
        const sky = OR_SKY[stage.sky] || OR_SKY.dawn;
        const scen = OR_SCEN[stage.scen] || OR_SCEN.palm;
        const shakeAmt = outrun.shake > 0 ? (Math.floor(pos) % 2 === 0 ? 1 : -1) * Math.min(2, outrun.shake) : 0;
        const scroll = Math.floor(pos / OUTRUN_DEPTH); // satir-tutarli kayma fazi
        const grid = Array.from({ length: H }, () => Array.from({ length: W }, () => K(' ', '#000', '#000')));
        const put = (x, y, c, f, b) => { if (x >= 0 && x < W && y >= 0 && y < H) { const cell = grid[y][x]; cell.c = c; cell.f = f; cell.b = b; } };

        // GOKYUZU: dikey gradyan
        for (let y = 0; y < horizon; y++) {
          const t = horizon <= 1 ? 0 : y / (horizon - 1);
          const bg = orMix(sky.top, sky.bot, t * t);
          for (let x = 0; x < W; x++) { grid[y][x].f = bg; grid[y][x].b = bg; }
        }
        if (sky.star) {
          for (let y = 0; y < Math.max(1, horizon - 2); y++) for (let x = 0; x < W; x++) {
            if ((x * 7 + y * 29 + Math.floor(pos * 0.015)) % 47 === 0) { grid[y][x].c = '·'; grid[y][x].f = OR_PAL.lane; }
          }
        }
        // GUNES (kavise gore yatay parallax + hafif dikey salinim)
        const sunBob = Math.round(Math.sin(pos * 0.004) * 1.2);
        const sunCx = clamp(Math.round(W * 0.30 - outrunCurveAt(pos + depthSpan * OUTRUN_DEPTH, stage.curve) * 3), 6, W - 6);
        const sunCy = clamp(horizon - 4 + sunBob, 1, horizon - 1);
        for (let dy = -3; dy <= 3; dy++) for (let dx = -5; dx <= 5; dx++) {
          const d = (dx * dx) / 25 + (dy * dy) / 9;
          const yy = sunCy + dy, xx = sunCx + dx;
          if (d <= 1 && yy >= 0 && yy < horizon && xx >= 0 && xx < W) {
            const col = d < 0.45 ? sky.sun : orMix(sky.sun, sky.bot, 0.55);
            grid[yy][xx].c = ' '; grid[yy][xx].f = col; grid[yy][xx].b = col;
          }
        }
        // DAGLAR (parallax silüet)
        for (let x = 0; x < W; x++) {
          const mh = orMtnH(x, pos);
          for (let k = 0; k < mh; k++) { const yy = horizon - 1 - k; if (yy >= 0) { grid[yy][x].c = ' '; grid[yy][x].f = sky.mtn; grid[yy][x].b = sky.mtn; } }
        }

        // YOL
        const rows = [];
        let curve = 0;
        let center = (W / 2) + shakeAmt;
        for (let y = H - 1; y >= horizon; y--) {
          const depth = (H - 1) - y;
          const t = depthSpan > 0 ? depth / depthSpan : 0;
          const segDist = pos + depth * OUTRUN_DEPTH;
          curve += outrunCurveAt(segDist, stage.curve) * 0.085;
          center += curve;
          const halfW = Math.max(2, Math.round((W * 0.46) * (1 - t * 0.85)));
          const cInt = Math.round(center);
          const left = cInt - halfW;
          const right = cInt + halfW;
          // Satir-tutarli kayan serit: komsu satirlar degisir, butun olarak akar (strobe yok).
          const stripe = (depth + scroll) % 2;
          const grassCol = stripe ? OR_PAL.grass1 : OR_PAL.grass2;
          const roadCol = stripe ? OR_PAL.road1 : OR_PAL.road2;
          const rumCol = stripe ? OR_PAL.rumA : OR_PAL.rumB;
          for (let x = 0; x < W; x++) { grid[y][x].c = ' '; grid[y][x].f = grassCol; grid[y][x].b = grassCol; }
          if (spd > 0.5 && depth < depthSpan * 0.7) {
            for (let x = 0; x < W; x++) {
              if ((x < left - 1 || x > right + 1) && ((x + depth + scroll * 2) % 5 === 0)) { grid[y][x].c = '⋅'; grid[y][x].f = OR_PAL.grassFast; }
            }
          }
          for (let x = Math.max(0, left + 1); x <= Math.min(W - 1, right - 1); x++) { grid[y][x].c = ' '; grid[y][x].f = roadCol; grid[y][x].b = roadCol; }
          put(left, y, ' ', rumCol, rumCol);
          put(right, y, ' ', rumCol, rumCol);
          if (halfW > 6) { put(left - 1, y, ' ', rumCol, rumCol); put(right + 1, y, ' ', rumCol, rumCol); }
          const dash = (depth + scroll) % 2;
          if (dash && halfW > 3) put(cInt, y, ' ', OR_PAL.lane, OR_PAL.lane);
          if (depth > 1 && (depth + scroll) % 4 === 0) {
            const g = (depth % 2) ? scen.a : scen.b;
            put(left - 2, y, g, scen.f, grassCol);
            put(right + 2, y, g, scen.f, grassCol);
          }
          rows.push({ y, depth, center: cInt, halfW });
        }

        // TRAFIK (renkli, yakinda buyur)
        outrun.cars.forEach(car => {
          const rel = (car.dist - pos) / OUTRUN_DEPTH;
          if (rel < 0 || rel > depthSpan) return;
          const y = (H - 1) - Math.round(rel);
          const row = rows.find(r => r.y === y);
          if (!row) return;
          const x = Math.round(row.center + car.lane * (row.halfW - 1));
          const near = rel < depthSpan * 0.6;
          const mid = rel < depthSpan * 0.85;
          const sprite = car.truck
            ? (near ? '▐███▌' : (mid ? '▟█▙' : '▄▄'))
            : (near ? '╓███╖' : (mid ? '╓█╖' : '▴'));
          const body = car.color || (car.truck ? '#5e5e68' : '#3b6bd8');
          const start = x - Math.floor(sprite.length / 2);
          for (let i = 0; i < sprite.length; i++) put(start + i, y, sprite[i], '#0e0f16', body);
          // stop lambalari (yakinken)
          if (near) { put(start, y, '▐', OR_PAL.carTail, body); put(start + sprite.length - 1, y, '▌', OR_PAL.carTail, body); }
        });

        // OYUNCU ARABASI (renkli, fren/spin'de degisir)
        const near0 = rows[0];
        const px = Math.round(near0.center + outrun.playerX * near0.halfW) + shakeAmt;
        const braking = Boolean(outrun.input?.brake);
        const spinning = outrun.spin > 0;
        const lean = !spinning ? ((outrun.input?.right ? 1 : 0) - (outrun.input?.left ? 1 : 0)) : 0;
        const carArt = spinning
          ? ((Math.floor(pos) % 2 === 0) ? [' ╲╳╱ ', '◂ ✸ ▸', ' ╱╳╲ '] : [' ╱╳╲ ', '▸ ✸ ◂', ' ╲╳╱ '])
          : [lean < 0 ? '▟█▙  ' : lean > 0 ? '  ▟█▙' : ' ▟█▙ ', '▐███▌', braking ? '▝◉─◉▘' : '▘╨─╨▝'];
        for (let gx = -2; gx <= 2; gx++) put(px + gx, H - 1, ' ', '#0a0a0a', '#0a0a0a'); // golge
        carArt.forEach((str, i) => {
          const row = H - carArt.length + i;
          const s = px - Math.floor(str.length / 2);
          for (let kx = 0; kx < str.length; kx++) {
            const ch = str[kx];
            if (ch === ' ') continue;
            let f = OR_PAL.carDk, b = OR_PAL.carB;
            if (spinning) { f = OR_PAL.amber; b = '#2a2a30'; }
            else if (ch === '◉') { f = braking ? '#fff04a' : OR_PAL.carTail; b = OR_PAL.carB; }
            else if (i === 0) { f = OR_PAL.carLight; b = OR_PAL.carB; }
            put(s + kx, row, ch, f, b);
          }
        });

        // --- HUD hucreleri ---
        const frame = OR_PAL.frame, hb = OR_PAL.hudBg, hud = OR_PAL.hud;
        const kmh = Math.round(spd * OUTRUN_VMAX);
        const lowTime = outrun.time <= 5;
        const timeStr = Math.max(0, outrun.time).toFixed(1).padStart(5, ' ');
        const stageNo = outrun.stageIndex + 1;
        const toGo = Math.max(0, Math.round(stage.len - outrun.stageDist));
        const meter = (val, max, w, full = '█', empty = '·') => {
          const n = Math.round(clamp(val / max, 0, 1) * w);
          return full.repeat(n) + empty.repeat(Math.max(0, w - n));
        };
        const aheadCurve = outrunCurveAt(pos + depthSpan * OUTRUN_DEPTH * 0.6, stage.curve);
        const cm = Math.min(3, Math.round(Math.abs(aheadCurve) * 1.3));
        const curveSig = cm === 0 ? '  STRAIGHT  ' : (aheadCurve < 0 ? ('«'.repeat(cm) + ' LEFT ').padStart(12, ' ') : (' RIGHT ' + '»'.repeat(cm)).padEnd(12, ' '));
        const combo = outrun.combo > 1 ? `  x${outrun.combo}` : '';
        const strCells = (str, f, b) => { const s = str.length >= W + 2 ? str.slice(0, W + 2) : str.padEnd(W + 2, ' '); const a = []; for (let i = 0; i < W + 2; i++) a.push(K(s[i], f, b)); return a; };
        const hudRow = (interior, f = hud) => { const s = interior.slice(0, W).padEnd(W, ' '); const a = [K('║', frame, hb)]; for (let i = 0; i < W; i++) a.push(K(s[i], f, hb)); a.push(K('║', frame, hb)); return a; };
        const borderRow = (l, m, r) => { const a = [K(l, frame, hb)]; for (let i = 0; i < W; i++) a.push(K(m, frame, hb)); a.push(K(r, frame, hb)); return a; };
        const playRow = (pc) => { const a = [K('║', frame, hb)]; for (let i = 0; i < W; i++) a.push(pc[i]); a.push(K('║', frame, hb)); return a; };

        return [
          borderRow('╔', '═', '╗'),
          hudRow(` OUTRUN'86  S${stageNo}/5 ${stage.name.padEnd(15, ' ')} ♪${outrun.radio.slice(0, 14)}`),
          hudRow(` TIME ${timeStr}s${lowTime ? ' ⚠' : '  '} TACHO[${meter(spd, 1, 16, '▮')}] ${String(kmh).padStart(3, ' ')}km/h`, lowTime ? OR_PAL.warn : hud),
          hudRow(` SCORE ${String(outrun.score).padStart(7, '0')}${combo}   BEST ${String(outrun.best || 0).padStart(7, '0')}   NEXT ${String(toGo).padStart(4, ' ')}m`),
          hudRow(` CURVE ${curveSig}`),
          borderRow('╠', '═', '╣'),
          ...grid.map(playRow),
          borderRow('╚', '═', '╝'),
          strCells((outrun.msg || '').slice(0, W + 2), combo ? OR_PAL.amber : hud, '#000'),
          strCells('DRIVE  ← → steer · ↑/SPACE gas · ↓ brake · outrun quit', OR_PAL.hudDim, '#000')
        ];
      };

      // DOM izgarayi BIR KEZ kur (kalici span'ler). Sonra sadece degisen hucre guncellenir.
      const outrunBuildScreen = () => {
        if (!commandOutput || typeof document === 'undefined' || !outrun) return;
        commandOutput.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.style.cssText = 'font:13px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,"Courier New",monospace;white-space:nowrap;text-shadow:none;display:inline-block;';
        const cells = [];
        for (let r = 0; r < OUTRUN_LINES; r++) {
          const rowEl = document.createElement('div');
          rowEl.style.cssText = 'height:13px;white-space:nowrap;';
          const rowCells = [];
          for (let c = 0; c < OUTRUN_W2; c++) {
            const sp = document.createElement('span');
            sp.style.cssText = 'display:inline-block;width:1ch;height:13px;line-height:13px;text-align:center;';
            sp.textContent = ' ';
            rowEl.appendChild(sp);
            rowCells.push({ el: sp, c: '', f: '', b: '' });
          }
          wrap.appendChild(rowEl);
          cells.push(rowCells);
        }
        commandOutput.appendChild(wrap);
        outrun.screen = cells;
      };

      // Tamponu kalici izgaraya uygula (yalniz degisen hucreyi guncelle -> flicker yok).
      const outrunPaint = (buf) => {
        if (!outrun?.screen) return;
        const cells = outrun.screen;
        for (let r = 0; r < OUTRUN_LINES; r++) {
          const row = cells[r], brow = buf[r];
          if (!row || !brow) continue;
          for (let c = 0; c < OUTRUN_W2; c++) {
            const cell = row[c], bc = brow[c];
            if (!bc) continue;
            if (cell.c !== bc.c) { cell.el.textContent = bc.c; cell.c = bc.c; }
            if (cell.f !== bc.f) { cell.el.style.color = bc.f; cell.f = bc.f; }
            if (cell.b !== bc.b) { cell.el.style.backgroundColor = bc.b; cell.b = bc.b; }
          }
        }
      };

      const outrunFinale = (success) => {
        const stage = outrunStages[Math.min(outrun.stageIndex, outrunStages.length - 1)];
        const flag = success
          ? ['   ▟▙▟▙▟▙▟▙▟▙', '   ▜▛▜▛▜▛▜▛▜▛', '    ★  G O A L  ★']
          : ['     .  ✸  .', '    OUT OF TIME', '     `  .  `'];
        const record = outrun.newRecord ? '   ✦✦✦ NEW RECORD ✦✦✦' : '';
        return [
          `OUT RUN '86 — ${success ? 'ALL STAGES CLEARED!' : 'GAME OVER'}`,
          ...flag,
          record,
          `STAGE    : ${stage.name} (${outrun.checkpoints}/5 checkpoint)`,
          `DISTANCE : ${Math.round(outrun.dist)} m`,
          success ? `TIME BONUS: +${outrun.timeBonus}` : `TIME OUT at ${Math.round(outrun.dist)} m`,
          `SCORE    : ${String(outrun.score).padStart(7, '0')}`,
          `BEST     : ${String(outrun.best || 0).padStart(7, '0')}`,
          '',
          'tekrar: outrun new   ·   cikis: outrun quit'
        ].filter(l => l !== '').join('\n');
      };

      const endOutrun = (success) => {
        clearOutrun();
        if (!outrun) return;
        outrun.timeBonus = 0;
        if (success) {
          outrun.timeBonus = Math.round(Math.max(0, outrun.time) * 60);
          outrun.score += outrun.timeBonus;
        }
        const prevBest = readOutrunBest();
        outrun.newRecord = outrun.score > prevBest;
        outrun.best = Math.max(prevBest, outrun.score);
        if (outrun.newRecord) writeOutrunBest(outrun.best);
        outrun.active = false;
        outrun.over = true;
        outrun.input = {};
        outrun.screen = null;
        audioCue(success ? 'terminal.complete' : 'terminal.error');
        pulse(success ? 320 : 90, 0.12);
        if (commandOutput && commandShell?.classList.contains('is-open')) {
          commandOutput.textContent = outrunFinale(success);
        }
      };

      // Framerate-bagimsiz adim: tum artislar k = dt/baz ile olceklenir; boylece
      // 30fps veya 60fps fark etmez, denge ayni kalir (baz = 45ms = eski tick).
      const outrunStep = (dt) => {
        if (!outrun?.active) return;
        const k = dt / (OUTRUN_TICK / 1000);
        const stage = outrunStages[outrun.stageIndex];
        const inp = outrun.input || {};
        const spinning = outrun.spin > 0;
        if (outrun.shake > 0) outrun.shake -= 1;

        // --- Hiz: ease-out hizlanma (dusuk devirde tork, tavanda yumusama) ---
        if (spinning) {
          outrun.spin -= dt;
          outrun.speed -= 0.034 * k;
        } else {
          if (inp.accel) outrun.speed += (0.030 * (1 - outrun.speed) + 0.006) * k; // egri: hizli kalkis, yumusak tavan
          else outrun.speed -= 0.012 * k;                                          // motor freni
          if (inp.brake) outrun.speed -= 0.072 * k;                                // fren guclu
        }

        // --- Direksiyon (cevik) + merkezkaç (hiz² ile, biraz daha hafif) ---
        const nearCurve = outrunCurveAt(outrun.pos, stage.curve);
        const steer = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
        if (!spinning) outrun.playerX += steer * 0.062 * (0.55 + outrun.speed * 0.7) * k;
        outrun.playerX -= nearCurve * 0.034 * (outrun.speed * outrun.speed) * k;

        // --- Yol disi (cim/cakil): agir ceza ---
        const offRoad = Math.abs(outrun.playerX) > 1.0;
        if (offRoad) {
          outrun.speed = Math.min(outrun.speed, 0.36);
          outrun.speed -= 0.022 * k;
          outrun.playerX += Math.sign(outrun.playerX) * 0.018 * k;
          outrun.shake = 2;
          outrun.combo = 0;
          if (!outrun.offMsgAt || outrun.dist - outrun.offMsgAt > 40) { outrun.msg = '⚠ CIMDE — yola don!'; outrun.offMsgAt = outrun.dist; }
        }
        outrun.playerX = clamp(outrun.playerX, -2.3, 2.3);
        outrun.speed = clamp(outrun.speed, 0, 1);

        // --- Ilerle (v = bu karedeki mesafe) ---
        const v = outrun.speed * 18 * k;
        outrun.pos += v;
        outrun.dist += v;
        outrun.stageDist += v;
        if (!offRoad && !spinning) outrun.score += Math.round(v * (1 + outrun.stageIndex * 0.3));

        // --- Trafik: ilerlet, temizle, spawn ---
        outrun.cars.forEach(c => { c.dist += c.speed * k; });
        outrun.cars = outrun.cars.filter(c => c.dist > outrun.pos - 24);
        const wantCars = Math.round(2 + stage.traffic * 1.7);
        if (outrun.cars.length < wantCars && Math.random() < (0.040 + stage.traffic * 0.032) * k) {
          outrunSpawnCar();
        }

        // --- Carpisma + near-miss (kalkista kisa dokunulmazlik) ---
        if (!spinning && outrun.dist > 120) {
          for (const c of outrun.cars) {
            const rel = (c.dist - outrun.pos) / OUTRUN_DEPTH;
            const dx = Math.abs(outrun.playerX - c.lane);
            const hitW = c.truck ? 0.58 : 0.42;
            if (rel >= -0.4 && rel <= 1.5 && dx < hitW) {
              outrun.spin = 1.2;
              outrun.speed *= 0.16;
              outrun.time -= 2.0;
              outrun.combo = 0;
              outrun.shake = 3;
              outrun.msg = c.truck ? '✸ KAMYON! spin-out -2s' : '✸ CARPISMA! spin-out -2s';
              audioCue('terminal.error');
              pulse(70, 0.12);
              c.dist = outrun.pos - 26;
              c.scored = true;
              break;
            }
            if (!c.scored && rel < 0 && rel > -1.1 && dx < hitW + 0.45 && outrun.speed > 0.62) {
              c.scored = true;
              outrun.combo = Math.min((outrun.combo || 0) + 1, 9);
              const bonus = 120 * outrun.combo;
              outrun.score += bonus;
              outrun.msg = `≈ NEAR MISS x${outrun.combo}  +${bonus}`;
              audioCue('terminal.suggest');
              pulse(700 + outrun.combo * 30, 0.05);
            }
          }
        }

        // --- Checkpoint / etap gecisi ---
        if (outrun.stageDist >= stage.len) {
          outrun.stageIndex += 1;
          outrun.checkpoints += 1;
          if (outrun.stageIndex >= outrunStages.length) { outrun.finished = true; return endOutrun(true); }
          const next = outrunStages[outrun.stageIndex];
          outrun.time += next.time;
          outrun.stageDist = 0;
          outrun.cars = [];
          outrun.score += 1500;
          const fork = outrun.playerX <= 0 ? '◀ COAST' : 'INLAND ▶';
          outrun.msg = `✔ CHECKPOINT ${outrun.checkpoints} +${next.time}s · ${fork} → ${next.name}`;
          audioCue('terminal.complete');
          pulse(523, 0.1);
        }

        // --- Zaman ---
        outrun.time -= dt;
        if (outrun.time <= 0) { outrun.time = 0; return endOutrun(false); }
      };

      // rAF tabanli ~30fps dongu (akici, gercek dt ile).
      const outrunLoop = (ts) => {
        if (!outrun?.active) { outrunRaf = null; return; }
        if (!outrunLastTs) outrunLastTs = ts;
        const dt = (ts - outrunLastTs) / 1000;
        if (dt >= 0.028) {
          outrunLastTs = ts;
          outrunStep(Math.min(dt, 0.06));
          if (outrun?.active && commandOutput && commandShell?.classList.contains('is-open')) {
            outrunPaint(outrunBuffer());
          }
        }
        outrunRaf = window.requestAnimationFrame(outrunLoop);
      };

      const startOutrunLoop = () => {
        if (outrunRaf !== null) return;
        outrunLastTs = 0;
        outrunRaf = window.requestAnimationFrame(outrunLoop);
      };

      const launchOutrun = (radioLabel) => {
        clearOutrun();
        clearPipeAnimation();
        pipeGame = null;
        outrunIntroActive = false;
        setOutrunMode(true);
        outrun = {
          active: true, over: false, finished: false,
          pos: 0, dist: 0, stageDist: 0, speed: 0, playerX: 0,
          time: outrunStages[0].time, score: 0, spin: 0, shake: 0, combo: 0,
          stageIndex: 0, checkpoints: 0,
          cars: [], input: {},
          best: readOutrunBest(),
          radio: radioLabel || outrunRadio[0].label,
          msg: 'GREEN LIGHT — GO!'
        };
        for (let i = 0; i < 2; i++) outrunSpawnCar();
        outrunBuildScreen();
        outrunPaint(outrunBuffer());
        startOutrunLoop();
        pulse(523, 0.12);
      };

      const startOutrun = () => {
        clearOutrun();
        clearPipeAnimation();
        pipeGame = null;
        outrun = null;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion || !commandOutput) {
          outrunIntroActive = false;
          launchOutrun(outrunRadio[0].label);
          return outrun ? 'OUT RUN: kontak aci4ldi (oklarla sur, outrun quit ile cik)' : '';
        }
        // Donem dokunusu: motor kontagi + radyo istasyonu secim sekansi (normal kutuda, kompakt).
        outrunIntroActive = true;
        const car = ['        ___', '   __/  |_ \\__', '  |_o____o___|'];
        const baseLines = (radioIndex, sub) => [
          "OUT RUN '86  //  CONVIVIUM COAST",
          ...car,
          '',
          'IGNITION... ' + sub,
          'SELECT RADIO:',
          ...outrunRadio.map((r, i) => `  ${i === radioIndex ? '▶' : ' '} ♪ ${r.label}`)
        ].join('\n');
        const frames = [
          baseLines(0, 'priming engine'),
          baseLines(1, 'engine warm'),
          baseLines(2, 'tires gripping'),
          baseLines(0, 'READY')
        ];
        const step = 560;
        frames.forEach((frame, index) => {
          const timer = window.setTimeout(() => {
            if (outrun || !commandShell?.classList.contains('is-open')) return;
            commandOutput.textContent = frame;
            pulse(outrunRadio[index % outrunRadio.length].tone, 0.06);
          }, index * step);
          outrunIntroTimers.push(timer);
        });
        const finishTimer = window.setTimeout(() => {
          outrunIntroActive = false;
          if (!commandShell?.classList.contains('is-open')) { setOutrunMode(false); return; }
          launchOutrun(outrunRadio[0].label);
        }, frames.length * step + 220);
        outrunIntroTimers.push(finishTimer);
        return frames[0];
      };

      const outrunHelpText = () => [
        "OUT RUN '86 — kontroller:",
        '  ← →  : direksiyon   ↑/SPACE : gaz   ↓ : fren',
        '  (oklar her zaman; giris alanina yazi da yazabilirsin)',
        '',
        'puf noktasi:',
        '  • Viraja YUKSEK hizda girersen merkezkac seni cime atar.',
        '    CURVE gostergesine bak, gerekirse FRENLE + viraja kir.',
        '  • Cim = agir yavaslama. Trafige carpma = spin-out + -2s.',
        '  • Trafigi yuksek hizda siyirip gec -> NEAR MISS combo skoru.',
        '  • Her checkpoint sure ekler; ileri etaplar daha sert.',
        'komutlar: outrun new | outrun quit | outrun help'
      ].join('\n');

      const outrunCommand = (action = '') => {
        const command = normalizeCommand(action || 'new');
        if (outrunIntroActive) return 'outrun: motor isiniyor...';
        if (['quit', 'exit', 'q', 'stop', 'kapat'].includes(command)) {
          clearOutrun();
          setOutrunMode(false);
          outrun = null;
          return 'OUT RUN: kontak kapatildi';
        }
        if (['help', '?', 'yardim', 'yardım'].includes(command)) return outrunHelpText();
        if (!outrun?.active || ['new', 'start', 'play', 'restart', 'yeni'].includes(command)) return startOutrun();
        return 'OUT RUN: surus devam ediyor (oklarla sur, outrun quit ile cik)';
      };

      // deb diyalogu (Dalga 6): konustukca bond artar, satirlar derinlesir.
      const debTalk = () => {
        const deb = window.DebCompanion || window.NovaCompanion;
        if (deb && !deb.getState?.().active) deb.summon?.();
        const lines = [
          'deb: ...ilk kez konusuyoruz. ben kabugun icinde dolasan kucuk bir sinyalim.',
          'deb: geri geldin. esikleri benden once sen aciyorsun; hosuma gidiyor.',
          'deb: artik tanidik geliyorsun. istersen rotalari fisildayabilirim.',
          'deb: dostuz sayilir artik. (deb whisper dene)'
        ];
        state.debBond = (state.debBond || 0) + 1;
        persist();
        deb?.trigger?.('bloom');
        return lines[Math.min(state.debBond - 1, lines.length - 1)];
      };

      const debCommand = (action = 'summon') => {
        const deb = window.DebCompanion || window.NovaCompanion;
        if (!deb) return 'deb: module not ready';
        if (action === 'talk') return debTalk();
        if (action === 'whisper') {
          if ((state.debBond || 0) < 4) return 'deb: (henuz o kadar yakin degiliz; biraz daha "deb talk")';
          deb.trigger?.('mirror');
          return `deb (fisilti): ${currentObjective()}`;
        }
        if (action === 'summon') {
          deb.summon();
          return 'deb: companion online. try deb talk / deb scan / deb meteor / deb blackhole.';
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
        window.BugyV4?.deactivate?.();
        window.BugyV3?.deactivate?.();
        window.BugyV2?.deactivate?.();
        window.Bugy?.summon?.();
        return (window.DebCompanion || window.NovaCompanion)?.getState?.().active
          ? 'bugy: classic companion restored / deb still online'
          : 'bugy: classic companion restored';
      };

      // Gorev kutugu (Dalga 4): ilerlemeyi tek ekranda gosterir.
      const journalCommand = () => {
        const unlocked = new Set(state.unlocked || []);
        const inv = state.inventory || [];
        const mark = (cond) => (cond ? '[x]' : '[ ]');
        return [
          '] GOREV KUTUGU',
          '',
          `  unvan: ${rankTitle()}`,
          '',
          `  ${mark(unlocked.has('/vault'))} iz-1  kasa (/vault)    -- notes: clue -> shard -> unlock vault`,
          `  ${mark(unlocked.has('/core'))} iz-2  cekirdek (/core)  -- lab: pipe bulmacasini coz`,
          '',
          `  canta: ${inv.length ? inv.join(', ') : 'bos'}`,
          `  > siradaki: ${currentObjective()}`,
          ']'
        ].join('\n');
      };

      // Kisisel alias/makro (Dalga 8): alias <ad> <komut> / unalias <ad> / alias (liste).
      const aliasCommand = (arg = '') => {
        const norm = normalizeCommand(arg).trim();
        if (!norm) {
          const entries = Object.entries(state.aliases || {});
          if (!entries.length) return 'alias: tanimli alias yok. ornek: alias l look';
          return ['] ALIAS', '', ...entries.map(([k, v]) => `  ${k} -> ${v}`), ']'].join('\n');
        }
        const sp = norm.indexOf(' ');
        if (sp === -1) return 'alias: usage alias <ad> <komut> (ornek: alias l look)';
        const name = norm.slice(0, sp).trim();
        const target = norm.slice(sp + 1).trim();
        if (!name || !target) return 'alias: usage alias <ad> <komut>';
        if (COMMAND_SYNONYMS[name]) return `alias: "${name}" yerlesik bir esanlamli, kullanilamaz.`;
        if (name === target.split(' ')[0]) return 'alias: kendine isaret eden alias olmaz.';
        state.aliases = { ...(state.aliases || {}), [name]: target };
        persist();
        return `alias eklendi: ${name} -> ${target}`;
      };
      const unaliasCommand = (arg = '') => {
        const name = normalizeCommand(arg).split(' ')[0];
        if (!name) return 'unalias: usage unalias <ad>';
        if (!(state.aliases || {})[name]) return `unalias: "${name}" diye bir alias yok.`;
        const next = { ...state.aliases };
        delete next[name];
        state.aliases = next;
        persist();
        return `alias silindi: ${name}`;
      };

      // man <komut> (Dalga 5): bir komutun aciklamasi + esanlamlilari.
      const manCommand = (target = '') => {
        const key = normalizeCommand(target);
        if (!key) return 'man: usage man <komut> (ornek: man examine)';
        const entry = commandDefinitions.find((item) =>
          normalizeCommand(item.command) === key ||
          (item.aliases || []).some((alias) => normalizeCommand(alias) === key)
        );
        if (!entry) {
          const near = suggestNearestCommand(key);
          return near ? `man: "${target}" yok. bunu mu? -> ${near}` : `man: "${target}" diye bir komut yok.`;
        }
        const aliases = (entry.aliases || []).slice(0, 6).join(', ');
        return [
          `] MAN ${entry.command.toUpperCase()}`,
          '',
          `  ${entry.description || '(aciklama yok)'}`,
          aliases ? `  esanlamli: ${aliases}` : '',
          ']'
        ].filter(Boolean).join('\n');
      };

      const commandDefinitions = [
        {
          command: 'basla',
          description: 'yeni gelenler icin adim adim baslangic rehberi',
          aliases: ['başla', 'rehber'],
          action: () => baslaCommand()
        },
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
          command: 'look',
          description: 'bulundugun esigi tasvir eder, incelenebilirleri listeler',
          aliases: ['bak', 'l', 'incele etraf'],
          action: () => lookCommand()
        },
        {
          command: 'examine',
          description: 'bir nesneyi yakindan inceler',
          aliases: ['ex', 'incele', 'x'],
          action: () => 'examine: usage examine <nesne>'
        },
        {
          command: 'take',
          description: 'odadaki bir nesneyi cantaya alir',
          aliases: ['al', 'pick', 'pick up'],
          action: () => 'take: usage take <nesne>'
        },
        {
          command: 'inventory',
          description: 'cantandaki nesneleri listeler',
          aliases: ['inv', 'i', 'canta', 'bag'],
          action: inventoryCommand
        },
        {
          command: 'unlock',
          description: 'muhurlu bir esigi dogru anahtarla acar',
          aliases: ['ac', 'muhur ac', 'open seal'],
          action: () => 'unlock: usage unlock <oda> [with <anahtar>]'
        },
        {
          command: 'use',
          description: 'cantadaki bir nesneyi bir hedef uzerinde kullanir',
          aliases: ['kullan'],
          action: () => 'use: usage use <nesne> on <hedef>'
        },
        {
          command: 'ask',
          description: 'oracle\'a dunya baglamiyla soru sorar (deb aciksa onun sesiyle)',
          aliases: ['sor', 'deb ask', 'nova ask'],
          action: () => 'ask: usage ask <konu> (ornek: ask vault)'
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
          command: 'outrun',
          description: "sozde-3B arcade surus oyunu Out Run '86i acar",
          aliases: ['out run', 'outrun86', 'ferrari', 'drive', 'surus', 'sürüş', 'sur', 'sür', 'race', 'yaris', 'yarış', 'arcade'],
          action: () => outrunCommand('new')
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
          command: 'deb talk',
          description: 'DEB ile konus (konustukca yakinlasir)',
          aliases: ['deb konus', 'talk deb', 'nova talk', 'nova konus'],
          action: () => debCommand('talk')
        },
        {
          command: 'deb whisper',
          description: 'DEB yeterince yakinsa sana siradaki izi fisildar',
          aliases: ['deb fisilti', 'nova whisper'],
          action: () => debCommand('whisper')
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
          command: 'crt',
          description: 'tarama-cizgisi (CRT) gorunumunu acar/kapatir',
          aliases: ['scanlines', 'retro'],
          action: () => crtCommand('')
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
          command: 'daily',
          description: 'gunun sinyalini gosterir (bulut; yoksa lokal)',
          aliases: ['gunluk', 'gunluk sinyal', 'today', 'gunun sinyali'],
          action: dailySignalCommand
        },
        {
          command: 'wall',
          description: 'bulundugun esikteki asenkron izleri okur',
          aliases: ['read wall', 'duvar', 'duvari oku'],
          action: readWallCommand
        },
        {
          command: 'mark',
          description: 'bulundugun esige iz birakir (giris gerekir)',
          aliases: ['leave mark', 'iz birak', 'duvara yaz'],
          action: () => 'mark: usage mark <mesaj>'
        },
        {
          command: 'journal',
          description: 'gorev kutugu: ilerleme, izler ve siradaki hedef',
          aliases: ['gorevler', 'görevler', 'quests', 'ilerleme'],
          action: journalCommand
        },
        {
          command: 'man',
          description: 'bir komutun kilavuzunu gosterir (man <komut>)',
          aliases: ['kilavuz', 'manual'],
          action: () => 'man: usage man <komut> (ornek: man examine)'
        },
        {
          command: 'alias',
          description: 'kisisel kisayol tanimlar/listeler (alias <ad> <komut>)',
          aliases: ['aliaslar'],
          action: () => aliasCommand()
        },
        {
          command: 'unalias',
          description: 'bir alias siler (unalias <ad>)',
          aliases: [],
          action: () => 'unalias: usage unalias <ad>'
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

      // Yeni gelene yonelik kisa, adim adim baslangic rehberi (ProDOS prompt tarzi).
      const baslaCommand = () => [
        '] BASLANGIC',
        '',
        '  Convivium kelimelerle gezilen bir terminal-dunyasi.',
        '',
        '  look          neredesin, etrafinda ne var',
        '  examine <x>   bir seye yakindan bak (ipucu/esya)',
        '  take <x>      esyayi cebine al',
        '  cd <oda>      baska esige gec',
        '  unlock <oda>  dogru esyayla kilidi ac',
        '',
        `  GOREV   ${currentObjective()}`,
        '  ipucu: simdi "look" yaz.',
        ']'
      ].join('\n');

      const commandHelpText = () => [
        '] basla -> adim adim rehber',
        '',
        'world (kesif):',
        'look, examine <nesne>, take <nesne>, inventory, cd <oda>, unlock <oda>, use <x> on <y>',
        '',
        'routes:',
        'home, map, archive, notes, open dossier, run logic, run signal, run ash, run flow',
        '',
        'lab:',
        'dart, bartender, barista, barista v2, realists bar, open oracle, paradox, universe, pipe, outrun',
        '',
        'system:',
        'whoami, uptime, date, version, memory, ps, log, clear, random, shutdown, restart, screen saver',
        '',
        'terminal:',
        'ls, pwd, cd lab, cat about, tree, find oracle, theme green, volume on, scan, next, tour, badge, blackout',
        '',
        'world:',
        'look, examine <nesne>, take <nesne>, inventory, use <x> on <y>, unlock <oda> -- esikleri kesfet, shard\'i bul, /vault muhrunu coz',
        'ask <konu> / sor <konu> -- oracle\'a dunya baglamiyla sor (deb aciksa onun sesiyle)',
        'daily -- gunun sinyali (giris yaptiysan ilerlemen cihazlar arasi tasinir)',
        'wall / mark <mesaj> -- bulundugun esikteki asenkron izleri oku / iz birak (yazmak icin giris)',
        'journal -- gorev kutugu (ilerleme + siradaki hedef) · man <komut> -- komut kilavuzu',
        'alias <ad> <komut> -- kisisel kisayol · crt -- tarama-cizgisi gorunumu ac/kapat',
        '',
        'deb ops:',
        'deb talk (konus), deb whisper, deb scan, deb meteor, deb blackhole, deb deathstar, deb off',
                '',
        'hidden:',
        'signal -> oracle -> manifest -> unlock hidden, clues, offline node',
        'thread 1: notes -> examine clues -> take shard -> unlock vault -> cd vault',
        'thread 2: lab -> pipe (coolant\'i cekirdege ulastir) -> cd core',
        'thread 3: use shard on coolant -> prism -> unlock atlas -> cd atlas (ARCHITECT)'
      ].join('\n');

      const commandMap = commandDefinitions.reduce((map, item) => {
        [item.command, ...(item.aliases || [])].forEach(alias => {
          map[normalizeCommand(alias)] = item.action;
        });
        return map;
      }, Object.create(null));

      const commandChoices = commandDefinitions.flatMap(item => [item.command, ...(item.aliases || [])]);

      // --- Akilli parser (Dalga 2): esanlamli verb haritasi + yazim toleransi ---
      // Niyet-esanlamlilari (cogu zaten alias; burasi alias olmayan dogal fiiller icin).
      // Belirsiz Turkce kelimeler (git/gel...) bilinerek disarida; dogal sorulari kacirmasin.
      const COMMAND_SYNONYMS = {
        go: 'cd', goto: 'cd', enter: 'cd', move: 'cd',
        inspect: 'examine',
        grab: 'take', get: 'take', pickup: 'take',
        items: 'inventory',
        guide: 'basla'
      };
      const applySynonyms = (cmd) => {
        const sp = cmd.indexOf(' ');
        const first = sp === -1 ? cmd : cmd.slice(0, sp);
        const canon = COMMAND_SYNONYMS[first];
        return canon ? canon + (sp === -1 ? '' : cmd.slice(sp)) : cmd;
      };
      // Kullanici alias'i (Dalga 8): tek seviye genisletme (dongu yok).
      const expandAlias = (cmd) => {
        const sp = cmd.indexOf(' ');
        const first = sp === -1 ? cmd : cmd.slice(0, sp);
        const exp = (state.aliases || {})[first];
        return exp ? exp + (sp === -1 ? '' : cmd.slice(sp)) : cmd;
      };
      // Komut sozlugu: tum komut/alias'larin ilk kelimesi (tekil).
      const commandVocab = [...new Set(
        commandChoices.map(choice => normalizeCommand(choice).split(' ')[0]).filter(word => word.length >= 2)
      )];
      // Kucuk Levenshtein (uzunluk farki 2'den fazlaysa erken cik).
      const editDistance = (a, b) => {
        if (Math.abs(a.length - b.length) > 2) return 99;
        const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
        for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
        for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;
        for (let i = 1; i <= a.length; i += 1) {
          for (let j = 1; j <= b.length; j += 1) {
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
          }
        }
        return dp[a.length][b.length];
      };
      // Komut-benzeri ama eslesmeyen girdiye en yakin komutu onerir (yoksa null).
      const suggestNearestCommand = (cmd) => {
        const words = cmd.split(' ').filter(Boolean);
        const first = words[0] || '';
        if (first.length < 3 || words.length > 3) return null;
        let best = null;
        let bestD = 3;
        commandVocab.forEach((word) => {
          const d = editDistance(first, word);
          if (d < bestD) { bestD = d; best = word; }
        });
        if (!best || bestD === 0 || bestD > 2) return null;
        const rest = words.slice(1).join(' ');
        return rest ? `${best} ${rest}` : best;
      };

      // Inline tab-completion (Dalga 3): yazarken benzersiz komut tamamlamasini input'a
      // yazip eklenen eki SECILI birakir (tarayici autocomplete tarzi). Overlay/CSS yok.
      // -> ya da End/Enter ile kabul; yazmaya devam edince secili ek degisir; backspace siler.
      const completeInput = (event) => {
        if (!commandInput || pipeGame?.active) return;
        if (event && event.inputType && event.inputType !== 'insertText') return; // silerken tamamlama yok
        const val = commandInput.value;
        if (!val || /\s/.test(val)) return; // sadece ilk kelime (bosluk yoksa)
        const typed = normalizeCommand(val);
        if (typed.length < 2) return;
        const uniq = [...new Set(commandVocab.filter(word => word.startsWith(typed)))];
        if (uniq.length !== 1 || uniq[0] === typed) return;
        const full = uniq[0];
        commandInput.value = full;
        try { commandInput.setSelectionRange(typed.length, full.length); } catch { /* ignore */ }
      };

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
        audioCue(run ? 'terminal.run' : 'terminal.suggest');
        commandInput.value = value;
        commandInput.focus();
        renderCommandSuggestions(value);
        if (run) runCommand(value);
      };

      // Oneri cipleri kaldirildi (kullanici istegi): kabuk daha sade dursun.
      // Tab ile tamamlama gorunmez sekilde calismaya devam eder (matchingCommands).
      const renderCommandSuggestions = () => {
        clearCommandSuggestions();
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

      // --- Scrollback / transcript modeli ---
      // commandOutput artik silinmiyor; akan bir gunluk. Komut ekosu (] girdi) + ciktilar
      // eklenir, en alta kaydirilir. "pending" parametresi henuz commit edilmemis (teletype
      // suren ya da gecici "oracle bekliyor") metni gosterir.
      const TRANSCRIPT_MAX = 16000;
      const scrollTranscriptToEnd = () => { if (commandOutput) commandOutput.scrollTop = commandOutput.scrollHeight; };
      const renderTranscript = (pending = '') => {
        if (!commandOutput) return;
        commandOutput.textContent = transcript + pending;
        scrollTranscriptToEnd();
      };
      const commitTranscript = (text) => {
        transcript += text;
        if (transcript.length > TRANSCRIPT_MAX) transcript = transcript.slice(-TRANSCRIPT_MAX);
      };
      const transcriptReset = (seed = '') => {
        transcript = seed ? `${seed}\n` : '';
        renderTranscript();
      };
      const transcriptEcho = (input) => {
        commitTranscript(`] ${input}\n`);
        renderTranscript();
      };

      // Oracle cevabi transcript'e daktilo ile eklenir (yavas, "dusunuyor" cadence).
      const typeOracleOutput = (text) => new Promise((resolve) => {
        const output = String(text || '');
        if (!commandOutput) { resolve(); return; }
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const finish = () => { commitTranscript(`${output}\n`); renderTranscript(); resolve(); };
        if (reduceMotion || output.length < 12) { finish(); return; }
        let index = 0;
        const writeNext = () => {
          if (!commandInFlight) { finish(); return; }
          index += 1;
          renderTranscript(output.slice(0, index));
          if (index >= output.length) { finish(); return; }
          const char = output[index - 1];
          const delay = /[.!?]/.test(char) ? 90 : /[,;:]/.test(char) ? 45 : char === '\n' ? 70 : 14;
          window.setTimeout(writeNext, delay);
        };
        writeNext();
      });

      // Komut ciktilari icin hizli, atlanabilir teletype; transcript'e eklenir.
      // Uzunluk ne olursa olsun toplam sure sabit (~0.5sn); reduce-motion'da aninda.
      let terminalTypeTimer = null;
      let terminalTypeFull = '';
      const flushTerminalType = () => {
        if (terminalTypeTimer === null) return false;
        window.clearInterval(terminalTypeTimer);
        terminalTypeTimer = null;
        commitTranscript(`${terminalTypeFull}\n`);
        renderTranscript();
        return true;
      };
      const printTerminal = (text) => {
        if (!commandOutput) return;
        flushTerminalType();
        const body = String(text ?? '');
        if (body === '') { renderTranscript(); return; } // bos cikti: sadece yenile (clear sonrasi)
        terminalTypeFull = body;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion || body.length < 24) {
          commitTranscript(`${body}\n`);
          renderTranscript();
          return;
        }
        let index = 0;
        const step = Math.max(1, Math.ceil(body.length / 48)); // ~48 kare -> sabit kisa sure
        terminalTypeTimer = window.setInterval(() => {
          index += step;
          if (index >= body.length) {
            window.clearInterval(terminalTypeTimer);
            terminalTypeTimer = null;
            commitTranscript(`${body}\n`);
            renderTranscript();
            return;
          }
          renderTranscript(body.slice(0, index));
        }, 12);
      };

      // Pipe oyunu ekrani sahiplenir (her kare tam tahta); transcript'e spam etmez.
      // Oyun aktifse dogrudan yaz, degilse transcript'e ekle.
      const emitResult = (result, query) => {
        const text = result !== undefined ? result : `executing: ${query}`;
        if (pipeGame?.active) {
          if (commandOutput) commandOutput.textContent = text;
        } else {
          printTerminal(text);
        }
      };

      const sendOracleQuery = async (query) => {
        renderTranscript(oracleWaitLines[0]); // gecici "bekliyor" gostergesi (commit edilmez)
        if (microOracle) microOracle.textContent = 'external oracle channel';
        setCommandBusy(true);
        let waitLineIndex = 0;
        let waitSignal = window.setInterval(() => {
          if (!commandInFlight || !commandOutput) return;
          waitLineIndex = (waitLineIndex + 1) % oracleWaitLines.length;
          renderTranscript(oracleWaitLines[waitLineIndex]);
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
          printTerminal(status === 429
            ? 'oracle mesgul. dis servis limitine takildi; biraz sonra tekrar dene.'
            : 'oracle channel noisy. dis servis su an yanit vermiyor; biraz sonra tekrar dene.');
          if (microOracle) microOracle.textContent = 'oracle unavailable';
          pulse(150, 0.08);
        } finally {
          if (waitSignal) window.clearInterval(waitSignal);
          setCommandBusy(false);
          commandInput?.focus();
        }
      };

      // Dunya baglami enjekte edilmis Oracle sorgusu. deb companion aciksa cevabi onun
      // sesi/gorseli olarak sunar (NPC baglama).
      const askOracleAbout = async (topic) => {
        const clean = extractAskTopic(topic);
        if (!clean) {
          printTerminal('ask: usage ask <konu> (ornek: ask vault, sor convivium nedir).');
          return;
        }
        const deb = window.DebCompanion || window.NovaCompanion;
        const debActive = deb?.getState?.().active;
        if (debActive) {
          deb.trigger?.('bloom');
          if (microOracle) microOracle.textContent = 'deb relaying oracle';
        }
        await sendOracleQuery(`${buildWorldContext()} Soru: ${clean}`);
      };

      const runCommand = async (raw) => {
        const query = raw.trim().slice(0, 520);
        const command = expandAlias(applySynonyms(normalizeCommand(query)));
        if (!query || commandInFlight) return;
        state.commands += 1;
        state.commandLog = [...(state.commandLog || []), query].slice(-8);
        if (state.commands >= 3) award(2);
        persist();
        audioCue('terminal.run');
        pulse(390, 0.055);
        // Komut ekosu transcript'e (pipe/outrun oyunu ekrani sahiplenirken atla).
        if (!pipeGame?.active && !outrun?.active) transcriptEcho(query);
        if (['oracle yes', 'ask oracle', 'confirm oracle'].includes(command)) {
          if (!pendingOracleQuery) {
            printTerminal('oracle: bekleyen sorgu yok. Once serbest bir soru yaz.');
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
        const askPrefix = ['ask ', 'sor ', 'deb ask ', 'nova ask '].find(prefix => command.startsWith(prefix));
        if (askPrefix) {
          commandInput.value = '';
          clearCommandSuggestions();
          await askOracleAbout(command.slice(askPrefix.length));
          return;
        }
        const markPrefix = ['leave mark ', 'iz birak ', 'duvara yaz ', 'mark '].find(prefix => command.startsWith(prefix));
        if (markPrefix) {
          // Ham metni kullan (normalize edilmemis) ki kullanici mesaji oldugu gibi kalsin.
          const rawBody = query.replace(/^\s*(leave mark|iz birak|duvara yaz|mark)\s+/i, '');
          const result = await leaveMarkCommand(rawBody);
          printTerminal(result);
          audioCue('terminal.complete');
          commandInput.value = '';
          clearCommandSuggestions();
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
          ['look ', value => lookCommand(value)],
          ['bak ', value => lookCommand(value)],
          ['examine ', value => examineCommand(value)],
          ['incele ', value => examineCommand(value)],
          ['take ', value => takeCommand(value)],
          ['al ', value => takeCommand(value)],
          ['unlock ', value => unlockRoomCommand(value)],
          ['ac ', value => unlockRoomCommand(value)],
          ['use ', value => useCommand(value)],
          ['kullan ', value => useCommand(value)],
          ['man ', value => manCommand(value)],
          ['kilavuz ', value => manCommand(value)],
          ['alias ', value => aliasCommand(value)],
          ['unalias ', value => unaliasCommand(value)],
          ['theme ', value => themeCommand(value)],
          ['color ', value => themeCommand(value)],
          ['crt ', value => crtCommand(value)],
          ['volume ', value => volumeCommand(value)],
          ['audio ', value => volumeCommand(value)],
          ['sound ', value => volumeCommand(value)],
          ['pipe ', value => pipeCommand(value)],
          ['outrun ', value => outrunCommand(value)]
        ];
        const parameterMatch = parameterActions.find(([prefix]) => command.startsWith(prefix));
        if (parameterMatch) {
          const result = parameterMatch[1](command.slice(parameterMatch[0].length));
          emitResult(result, query);
          audioCue('terminal.complete');
          commandInput.value = '';
          clearCommandSuggestions();
          return;
        }
        if (action) {
          const result = await action();
          emitResult(result, query);
          audioCue('terminal.complete');
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

        // Oracle'a dusmeden once: komut-benzeri bir yazim hatasi mi? "bunu mu demek istedin?"
        const suggestion = suggestNearestCommand(command);
        if (suggestion) {
          printTerminal(`bilinmeyen komut: ${command}\nbunu mu demek istedin? -> ${suggestion}`);
          commandInput.value = '';
          clearCommandSuggestions();
          return;
        }

        await sendOracleQuery(query);
        commandInput.value = '';
        clearCommandSuggestions();
      };

      commandInput?.addEventListener('keydown', event => {
        // Teletype suruyorsa herhangi bir tusa basinca aninda tamamlansin (atlanabilir).
        if (terminalTypeTimer !== null) flushTerminalType();
        // Hafif tus-tik sesi (yalniz tek karakter; audio kapaliysa zaten sessiz).
        if (event.key && event.key.length === 1) audioCue('terminal.suggest');
        const matches = matchingCommands(commandInput.value);
        // OUT RUN: gercek-zamanli surus. Oklar HER ZAMAN direksiyon/gaz/fren olur,
        // boylece giris alaninda stray karakter olsa bile direksiyon kilitlenmez.
        // Space (gaz) ve form-gonderme yalniz giris bos iken yakalanir; "outrun quit"
        // 'o' ile basladigi icin yazimla cakismaz.
        if (outrun?.active) {
          if (event.key === 'ArrowLeft') { event.preventDefault(); outrun.input.left = true; return; }
          if (event.key === 'ArrowRight') { event.preventDefault(); outrun.input.right = true; return; }
          if (event.key === 'ArrowUp') { event.preventDefault(); outrun.input.accel = true; return; }
          if (event.key === 'ArrowDown') { event.preventDefault(); outrun.input.brake = true; return; }
          if (!commandInput.value.trim()) {
            if (event.key === ' ') { event.preventDefault(); outrun.input.accel = true; return; }
            if (event.key === 'Enter') { event.preventDefault(); return; } // form gondermeyi engelle
          }
        }
        // PIPE: oklar HER ZAMAN imleci tasir (giris alaninda stray karakter olsa bile
        // kontroller kilitlenmesin). Eylem kisayollari (R/SPACE cevir, F akit, X dump,
        // Q cik, ENTER kaynak) yalniz giris bos iken calisir. "pipe ..." komutlari 'p'
        // ile basladigi icin bu harf kisayollariyla cakismaz; yazi yazmak serbest kalir.
        if (pipeGame?.active) {
          if (event.key === 'ArrowUp') { event.preventDefault(); movePipeCursor(-1, 0); return; }
          if (event.key === 'ArrowDown') { event.preventDefault(); movePipeCursor(1, 0); return; }
          if (event.key === 'ArrowLeft') { event.preventDefault(); movePipeCursor(0, -1); return; }
          if (event.key === 'ArrowRight') { event.preventDefault(); movePipeCursor(0, 1); return; }
          if (!commandInput.value.trim()) {
            const key = event.key.toLowerCase();
            if (key === ' ' || key === 'r') { event.preventDefault(); if (commandOutput) commandOutput.textContent = rotatePipe(); return; }
            if (key === 'f') { event.preventDefault(); if (commandOutput) commandOutput.textContent = flowPipe(); return; }
            if (key === 'x') { event.preventDefault(); if (commandOutput) commandOutput.textContent = dumpPipe(); return; }
            if (key === 'q') { event.preventDefault(); printTerminal(pipeCommand('quit')); return; }
            if (event.key === 'Enter') { event.preventDefault(); if (commandOutput) commandOutput.textContent = placePipe(); return; }
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

      // OUT RUN: tus birakildiginda kontrol bayragini sifirla.
      commandInput?.addEventListener('keyup', event => {
        if (!outrun?.active) return;
        if (event.key === 'ArrowLeft') outrun.input.left = false;
        else if (event.key === 'ArrowRight') outrun.input.right = false;
        else if (event.key === 'ArrowUp' || event.key === ' ') outrun.input.accel = false;
        else if (event.key === 'ArrowDown') outrun.input.brake = false;
      });
      // Odak/sekme kaybinda yapisik tus kalmasin.
      commandInput?.addEventListener('blur', () => { if (outrun) outrun.input = {}; });

      commandInput?.addEventListener('input', (event) => {
        commandHistoryIndex = -1;
        activeSuggestionIndex = 0;
        completeInput(event);
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

      window.addEventListener('convivium:audio-state', event => {
        if (typeof event.detail?.enabled !== 'boolean') return;
        audioEnabled = event.detail.enabled;
        if (soundToggle) {
          soundToggle.textContent = audioEnabled ? 'audio on' : 'audio off';
          soundToggle.setAttribute('aria-pressed', String(audioEnabled));
        }
      });

      window.addEventListener('bugy-v4:state', event => {
        const detail = event.detail || {};
        persistUserPreferences({
          bugyEngine: detail.active ? 'v4' : currentPreferenceSnapshot().bugyEngine,
          bugyV4Skin: detail.skin || localStorage.getItem('convivium.bugy.v4.skin') || 'clippy'
        });
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
