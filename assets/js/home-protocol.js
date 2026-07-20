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
        debBond: 0,
        shards: 0,
        lastShardDay: ''
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
      const routes = window.ConviviumRoutes || {};
      const route = (key, fallback = '/') => routes[key] || fallback;
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
      state.commandLog = Array.isArray(state.commandLog) ? state.commandLog.slice(-30) : [];
      state.rituals = Number.isFinite(state.rituals) ? state.rituals : 0;
      state.offlineNode = Boolean(state.offlineNode);
      state.easterTrail = Array.isArray(state.easterTrail) ? state.easterTrail.slice(-4) : [];
      state.inventory = Array.isArray(state.inventory) ? [...new Set(state.inventory)] : [];
      state.discovered = Array.isArray(state.discovered) ? [...new Set(state.discovered)] : [];
      state.aliases = (state.aliases && typeof state.aliases === 'object' && !Array.isArray(state.aliases)) ? state.aliases : {};
      state.debBond = Number.isFinite(state.debBond) ? state.debBond : 0;
      state.shards = Number.isFinite(state.shards) ? Math.max(0, state.shards) : 0;
      state.lastShardDay = typeof state.lastShardDay === 'string' ? state.lastShardDay : '';
      state.visits += 1;
      if (state.visits > 1) document.body.classList.add('returning-visitor');
      // Gizlilik-dostu sayac: kimliksiz sayfa gorunumu (oturumda 1; tablo yoksa no-op).
      window.ConviviumBackend?.recordSiteEvent?.('home.view', '/');
      let signalIndex = 0;
      let audioEnabled = window.ConviviumSFX?.enabled ?? false;
      let audioContext = null; // artık ConviviumSFX yönetiyor; eski kod uyumluluğu için bırakıldı
      let commandInFlight = false;
      let commandHistoryIndex = -1;
      let activeSuggestionIndex = 0;
      let currentSuggestions = [];
      let suggestionSelectionExplicit = false;
      let commandBootTimer = null;
      let commandCloseTimer = null;
      let pendingOracleQuery = '';
      let lastFocusedElement = null;
      let powerOverlay = null;
      let powerSequenceTimers = [];
      let vfsMod = null;
      let worldMod = null;
      let worldActionsMod = null;
      let economyMod = null;
      let shopMod = null;
      let ruinsMod = null;
      let navigatorMod = null;
      let transcript = '';
      // Terminal oyunlari + ekran koruyucu ayri modullerde yasar
      // (assets/js/home/pipe-90.js, outrun-86.js, screen-saver.js);
      // asagida bagimliliklariyla kurulup bu tutuculara atanir.
      let pipeMod = null;
      let outrunMod = null;
      let screenSaverMod = null;
      let presenceMod = null;
      let coopGateMod = null;
      let nightModeMod = null;
      let radioMod = null;
      let chatMod = null;
      let chatDeckMod = null;
      let selectedTheme = 'green';
      let restoringUserPreferences = false;
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
          virtualCwd: vfsMod?.getCwd?.() || '/',
          screenSaverActive: Boolean(screenSaverMod?.isActive()),
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

      const localAudioPreference = () => {
        try {
          const raw = localStorage.getItem('convivium.audio.enabled');
          if (raw !== 'true' && raw !== 'false') return null;
          const updatedAt = Number(localStorage.getItem('convivium.audio.updatedAt') || '0') || 0;
          return { enabled: raw === 'true', updatedAt };
        } catch {
          return null;
        }
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
          const localAudio = localAudioPreference();
          if (localAudio) {
            setAudioEnabled(localAudio.enabled);
          } else if (typeof prefs.audioEnabled === 'boolean') {
            setAudioEnabled(prefs.audioEnabled);
          }
          if (prefs.theme) themeCommand(prefs.theme);
          if (prefs.crt) setCrt(true);
          if (prefs.virtualCwd) vfsMod?.restoreCwd?.(prefs.virtualCwd);

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
            window.setTimeout(() => screenSaverMod?.command(), 120);
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

      const loginHref = () => `${route('auth', '/account/auth.html')}?returnTo=${encodeURIComponent(`${location.pathname}${location.hash}`)}`;

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

      // Signal Shards ekonomisi: tek para birimi. Kazanim kucuk ve seyrek;
      // bakiye localStorage'da yasar, girisliyse world_state ile buluta tasinir.
      const awardShards = (amount = 1, reason = '') => economyMod?.award?.(amount, reason);
      const spendShards = (amount) => economyMod?.spend?.(amount) ?? false;

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
            level: state.level,
            shards: state.shards
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
            economyMod?.mergeRemoteBalance?.(remote.shards);
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

      economyMod = (() => {
        const createEconomy = window.ConviviumHome?.createEconomy;
        if (typeof createEconomy !== 'function') {
          console.error('[home-protocol] Economy module unavailable');
          return null;
        }
        try {
          return createEconomy({
            getBalance: () => state.shards,
            setBalance: (balance) => { state.shards = balance; },
            persist,
            scheduleWorldSave,
            playCoinAudio: () => audioCue('game.coin'),
            setStatus: (message) => {
              if (consoleLine) consoleLine.textContent = message;
            }
          });
        } catch (error) {
          console.error('[home-protocol] Economy module failed', error);
          return null;
        }
      })();

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
        outrunMod?.shutdown();
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
        if (outrunMod?.isActive()) {
          // Surus oyununa geri don: modu ac, donguyu yeniden baslat (kapaliyken durmustu).
          outrunMod.resume();
          pulse(260);
          return;
        }
        if (outrunMod?.isOver()) {
          outrunMod.showFinale();
          pulse(260);
          return;
        }
        if (pipeMod?.isActive()) {
          pipeMod.restore();
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
        outrunMod?.stopLoop(); // surus dongusunu durdur (durum korunur, acilinca devam eder)
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

      // Ekran koruyucu modulu (assets/js/home/screen-saver.js)
      screenSaverMod = window.ConviviumHome?.createScreenSaver?.({
        pulse,
        persistUserPreferences,
        closeCommand,
        mobileCommandButton,
        getLastFocused: () => lastFocusedElement,
        setLastFocused: (el) => { lastFocusedElement = el; },
        // Ortak ekran koruyucu: presence gezginleri galakside uydu olur.
        getWanderers: () => presenceMod?.list?.() || []
      }) || null;

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
        [route('dossier', '/pages/makaleler.html'), 'dossier'],
        [route('logic', '/games/cyberpunk-logic-game.html'), 'logic'],
        [route('signal', '/games/three-body-signal.html'), 'three body signal'],
        [route('ash', '/games/ash-runner.html'), 'ash runner'],
        [route('flow', '/games/neon-river.html'), 'neon river'],
        ['/tools/bartender.html', 'bartender'],
        ['/tools/barista.html', 'barista'],
        ['/oracle/', 'oracle room'],
        ['/tools/paradox-terminal.html', 'paradox terminal'],
        ['/tools/ekol-aynasi.html', 'ekol aynasi'],
        [route('dart', '/tools/dart-skorbord.html'), 'dart skorbord']
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
        if (microOracle) microOracle.textContent = 'incubator custody granted';
        writeOfflineNode({ claimed: true, claimedAt: node.claimedAt || new Date().toISOString() });
        // GIZLI ODUL: Offline Node'u cozen kullaniciya Bugy yaratik HAKKI verilir.
        let firstClaim = false;
        try { firstClaim = localStorage.getItem('convivium.bugy.unlocked') !== '1'; } catch { /* yok say */ }
        try { localStorage.setItem('convivium.bugy.unlocked', '1'); } catch { /* yok say */ }
        if (firstClaim) window.ConviviumBackend?.recordSiteEvent?.('offline.node.solved', '/');
        return [
          'blackout packet / recovered',
          'code: blackout.seed',
          'internet kesilince site kaybolmadi; kendi hafizasina dustu.',
          '',
          '>> KULUCKA HAKKI VERILDI.',
          firstClaim ? '   Artik bir Bugy yaratigi buyutebilirsin (gizli odul acildi).'
                     : '   Kulucka hakkin zaten aktifti.',
          '   Bir icerik sayfasina gec (orn. /pages/makaleler.html) — yumurtan seni bekliyor.'
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

      // Gece frekansinda oracle daha alcak sesle konusur.
      const nightOracleLines = [
        'Bu saatte sorular cevaplardan agirdir.',
        'Frekans dusuk; iyi duyulmak istiyorsan fisilda.',
        'Gece acilan kapi, gunduz yerinde olmayabilir.',
        'Uyku da bir protokoldur; atlama.',
        'Simdi yazdigin sey, sabah baska anlama gelecek.'
      ];

      const oracleCommand = () => {
        registerProtocolStep('oracle');
        const night = Boolean(nightModeMod?.isNight?.());
        const line = sample(night ? nightOracleLines : oracleLines);
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
          `  shards  : ${state.shards}`,
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
        if (!economyMod) return `${sample(ritualLines)}\n(shard ekonomisi unavailable)`;
        awardShards(1, 'ritual');
        return `${sample(ritualLines)}\n(+1 shard)`;
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

      // --- Kabuk cekirdegi (Dalga 9a): kalici /home VFS modulu + env ---
      // Icerik textContent ile basilir; storage/ad/boyut sinirlari vfs.js'dedir.
      const ENV_KEY = 'convivium.shell.env';
      const ENV_MAX_VARS = 16;
      const envLoad = () => {
        try {
          const raw = JSON.parse(localStorage.getItem(ENV_KEY) || '{}');
          return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
        } catch { return {}; }
      };
      const envSave = (vars) => {
        try { localStorage.setItem(ENV_KEY, JSON.stringify(vars)); } catch { /* sessiz */ }
      };
      const envSet = (name, value) => {
        if (!/^[A-Za-z_]\w{0,15}$/.test(name)) return 'export: gecersiz ad (harf/alt cizgi ile baslar, en cok 16 karakter).';
        const vars = envLoad();
        if (!Object.prototype.hasOwnProperty.call(vars, name) && Object.keys(vars).length >= ENV_MAX_VARS) {
          return `export: degisken tavani (${ENV_MAX_VARS}). "unset <AD>" ile yer ac.`;
        }
        vars[name] = String(value ?? '').slice(0, 120);
        envSave(vars);
        return `export ${name}="${vars[name]}"`;
      };
      // Tek gecisli genisletme (ic ice/tekrarli cozum yok -> dongu kurulamaz).
      const envExpand = (text) => String(text).replace(/\$\{?([A-Za-z_]\w{0,15})\}?/g, (m, name) => {
        if (name === 'CWD') return vfsMod?.getCwd?.() || '/';
        if (name === 'USER') return 'ziyaretci';
        if (name === 'RANDOM') return String(Math.floor(Math.random() * 32768));
        if (name === 'DATE') return new Date().toLocaleDateString('tr-TR');
        if (name === 'CMDS') return String(state.commands || 0);
        const vars = envLoad();
        return Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : m;
      });

      const getVirtualCwd = () => vfsMod?.getCwd?.() || '/';
      const resolveVirtualPath = (target = '') => vfsMod?.resolvePath?.(target) || '/';
      const lsCommand = (target = '') => vfsMod?.ls?.(target) || 'ls: virtual filesystem unavailable';
      const cdCommand = (target = '/') => vfsMod?.cd?.(target) || 'cd: virtual filesystem unavailable';
      const catCommand = (target = '') => vfsMod?.cat?.(target) || 'cat: virtual filesystem unavailable';
      const pwdCommand = () => vfsMod?.getCwd?.() || 'pwd: virtual filesystem unavailable';
      const getWorldRoom = (path) => worldMod?.getRoom?.(path) || null;
      const currentRoom = () => worldMod?.getCurrentRoom?.() || null;
      const roomPanel = (path) => worldMod?.roomPanel?.(path) || 'world: room model unavailable';
      const lookCommand = (target = '') => worldMod?.look?.(target) || 'look: world model unavailable';
      const examineCommand = (target = '') => worldMod?.examine?.(target) || 'examine: world model unavailable';
      const currentObjective = () => worldMod?.currentObjective?.() || 'world model unavailable';
      const rankTitle = () => worldMod?.rankTitle?.() || 'GEZGIN';
      const prodosPath = (path) => worldMod?.prodosPath?.(path) || '/CONVIVIUM';
      const vfsName = (input = '') => vfsMod?.normalizeFileName?.(input) ?? null;
      const vfsRead = (name) => vfsMod?.readFile?.(name) ?? null;
      const vfsWrite = (name, content, append = false) => (
        vfsMod?.writeFile?.(name, content, append) || 'yaz: virtual filesystem unavailable'
      );
      const vfsRemove = (name) => (
        vfsMod?.removeFile?.(name) || `rm: ${name || '?'}: virtual filesystem unavailable`
      );

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
        '|-- home  [kisisel: echo/touch/rm]',
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

      // --- World read model: oda registry, gorunum ve inceleme ---
      ruinsMod = (() => {
        const createRuins = window.ConviviumHome?.createRuins;
        if (typeof createRuins !== 'function') {
          console.error('[home-protocol] Ruins module unavailable');
          return null;
        }
        try {
          return createRuins({
            getDayKey: () => new Date().toISOString().slice(0, 10)
          });
        } catch (error) {
          console.error('[home-protocol] Ruins module failed', error);
          return null;
        }
      })();

      worldMod = (() => {
        const createWorld = window.ConviviumHome?.createWorld;
        if (typeof createWorld !== 'function') {
          console.error('[home-protocol] World module unavailable');
          return null;
        }
        try {
          return createWorld({
            normalizeCommand,
            getCwd: getVirtualCwd,
            getInventory: () => state.inventory || [],
            getUnlocked: () => state.unlocked || [],
            getDiscovered: () => state.discovered || [],
            onDiscoverRoom: (path) => {
              if (state.discovered.includes(path)) return;
              state.discovered = [...new Set([...state.discovered, path])];
              persist();
            },
            roomExtensions: ruinsMod ? [ruinsMod.roomExtension] : []
          });
        } catch (error) {
          console.error('[home-protocol] World module failed', error);
          return null;
        }
      })();

      vfsMod = (() => {
        if (!worldMod) {
          console.error('[home-protocol] VFS module disabled: world module unavailable');
          return null;
        }
        const createVfs = window.ConviviumHome?.createVfs;
        if (typeof createVfs !== 'function') {
          console.error('[home-protocol] VFS module unavailable');
          return null;
        }
        try {
          return createVfs({
            normalizeCommand,
            storage: {
              getItem: (key) => localStorage.getItem(key),
              setItem: (key, value) => localStorage.setItem(key, value)
            },
            getAudioEnabled: () => audioEnabled,
            getRoom: getWorldRoom,
            isRoomUnlocked: (path) => (state.unlocked || []).includes(path),
            onCwdChange: (path) => {
              persistUserPreferences({ virtualCwd: path });
              presenceMod?.sync();
            },
            onDiscoverRoom: (path) => {
              if (state.discovered.includes(path)) return;
              state.discovered = [...new Set([...state.discovered, path])];
              persist();
              awardShards(2, `kesif ${path}`);
            },
            renderRoom: roomPanel,
            mounts: ruinsMod ? [ruinsMod.vfsMount] : []
          });
        } catch (error) {
          console.error('[home-protocol] VFS module failed', error);
          return null;
        }
      })();

      worldActionsMod = (() => {
        if (!worldMod || !vfsMod || !economyMod) {
          console.error('[home-protocol] World actions disabled: world/VFS/economy unavailable');
          return null;
        }
        const createWorldActions = window.ConviviumHome?.createWorldActions;
        if (typeof createWorldActions !== 'function') {
          console.error('[home-protocol] World actions module unavailable');
          return null;
        }
        try {
          return createWorldActions({
            normalizeCommand,
            resolvePath: resolveVirtualPath,
            getCurrentRoom: currentRoom,
            getRoom: getWorldRoom,
            getInventory: () => state.inventory || [],
            getUnlocked: () => state.unlocked || [],
            setInventory: (items) => { state.inventory = [...items]; },
            setUnlocked: (paths) => { state.unlocked = [...paths]; },
            appendTrail: (entry) => {
              state.easterTrail = [...(state.easterTrail || []), entry].slice(-4);
            },
            persist,
            scheduleWorldSave,
            awardAccess: award,
            refreshAccess: updateAccess,
            playUnlockAudio: () => audioCue('system.unlock'),
            awardShards,
            prodosPath,
            rankTitle,
            currentObjective
          });
        } catch (error) {
          console.error('[home-protocol] World actions module failed', error);
          return null;
        }
      })();

      const takeCommand = (target = '') => (
        worldActionsMod?.take?.(target) || 'take: world actions unavailable'
      );
      const unlockRoomCommand = (arg = '') => (
        worldActionsMod?.unlock?.(arg) || 'unlock: world actions unavailable'
      );
      const useCommand = (arg = '') => (
        worldActionsMod?.use?.(arg) || 'use: world actions unavailable'
      );

      const inventoryCommand = () => {
        const items = state.inventory || [];
        if (!items.length) return 'inventory: canta bos. Esikleri look + examine ile tara.';
        return ['inventory:', ...items.map(item => `  ${item}`)].join('\n');
      };

      // Oracle'a sorulan soruya dunya durumunu (konum + canta + seviye) baglam olarak ekler.
      const buildWorldContext = () => {
        const items = (state.inventory || []).join(', ') || 'bos';
        const levelName = levels[Math.min(state.level, levels.length - 1)];
        return `[Convivium terminali. Konum: ${getVirtualCwd()}. Canta: ${items}. Seviye: ${levelName}.]`;
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

      // --- Gunun sinyal karti: seed=YYYY-MM-DD ile deterministik prosedurel
      // kart. Herkes ayni gun ayni karti gorur; "collect" gunde bir kez
      // koleksiyona ekler (kacan gun kacar).
      const mulberry32 = (seed) => {
        let a = seed >>> 0;
        return () => {
          a |= 0;
          a = (a + 0x6D2B79F5) | 0;
          let t = Math.imul(a ^ (a >>> 15), 1 | a);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      };

      const CARD_GLYPHS = ['∴', '∑', 'λ', '◇', '∞', 'Ψ', 'Ω', '∆', '⌁', '✶', '☍', '⌘'];
      const CARD_TONES = ['JADE', 'CYAN', 'AMBER', 'MAGENTA', 'ICE', 'VIOLET'];
      const CARD_NOUNS = ['sabir', 'frekans', 'esik', 'yanki', 'kivilcim', 'harita', 'golge', 'isik', 'dalga', 'muhur', 'pusula', 'tohum'];
      const CARD_VERBS = ['cagirir', 'buyutur', 'sakinlestirir', 'keskinlestirir', 'acar', 'tasir', 'yankilar', 'toplar'];

      const cardDateKey = () => new Date().toISOString().slice(0, 10);

      const buildDailyCard = (dateKey) => {
        const seed = [...dateKey].reduce((hash, ch) => (Math.imul(hash, 31) + ch.charCodeAt(0)) | 0, 7);
        const rng = mulberry32(seed);
        const pick = (list) => list[Math.floor(rng() * list.length)];
        const glyphs = [pick(CARD_GLYPHS), pick(CARD_GLYPHS), pick(CARD_GLYPHS)];
        const tone = pick(CARD_TONES);
        const grade = 1 + Math.floor(rng() * 9);
        const nounA = pick(CARD_NOUNS);
        let nounB = pick(CARD_NOUNS);
        if (nounB === nounA) nounB = CARD_NOUNS[(CARD_NOUNS.indexOf(nounA) + 3) % CARD_NOUNS.length];
        const verb = pick(CARD_VERBS);
        return {
          glyphs,
          code: `${tone}-${grade}`,
          text: `${nounA}, ${nounB}${/[aiou]$/.test(nounB) ? 'yu' : 'u'} ${verb}`
        };
      };

      const cardCommand = () => {
        const dateKey = cardDateKey();
        const card = buildDailyCard(dateKey);
        const owned = (state.inventory || []).includes(`card:${dateKey}`);
        const inner = 22;
        const line = (text = '') => `  | ${text.padEnd(inner)} |`;
        return [
          `] SINYAL KARTI ${dateKey}`,
          `  +${'-'.repeat(inner + 2)}+`,
          line(`${card.glyphs.join('   ')}`),
          line(),
          line(card.code),
          line(`"${card.text}"`),
          `  +${'-'.repeat(inner + 2)}+`,
          owned ? '  koleksiyonda [x] (cards ile bak)' : '  topla: collect (gunde 1; kacan gun kacar)',
          ']'
        ].join('\n');
      };

      const collectCommand = () => {
        if (!economyMod) return 'collect: economy unavailable';
        const dateKey = cardDateKey();
        const key = `card:${dateKey}`;
        if ((state.inventory || []).includes(key)) {
          return 'collect: bugunun karti zaten koleksiyonda. yarin yeni kart dogar.';
        }
        state.inventory = [...new Set([...(state.inventory || []), key])];
        persist();
        scheduleWorldSave();
        awardShards(1, 'sinyal karti');
        audioCue('game.pickup');
        const card = buildDailyCard(dateKey);
        return `collect: ${card.code} karti koleksiyona eklendi (+1 shard). cards ile bak.`;
      };

      const cardsCommand = () => {
        const collected = (state.inventory || [])
          .filter((item) => item.startsWith('card:'))
          .map((item) => item.slice(5))
          .sort()
          .reverse();
        if (!collected.length) return 'cards: koleksiyon bos. bugunun kartini "card" ile gor, "collect" ile topla.';
        const rows = collected.slice(0, 14).map((dateKey) => {
          const card = buildDailyCard(dateKey);
          return `  ${dateKey}  ${card.glyphs.join(' ')}  ${card.code.padEnd(10)} "${card.text}"`;
        });
        return [
          `] KART KOLEKSIYONU (${collected.length})`,
          '',
          ...rows,
          collected.length > 14 ? `  ... ve ${collected.length - 14} kart daha` : '',
          ']'
        ].filter(Boolean).join('\n');
      };

      // --- Convivium Wrapped: mevcut izlerden kisisel ozet (giris gerekir).
      // Yeni tablo yok; her kaynak ayri ayri, hatada sessizce atlanir.
      const wrappedCommand = async () => {
        const backend = window.ConviviumBackend;
        if (!backend?.isConfigured?.()) return 'wrapped: bulut cevrimdisi.';
        if (!authState.granted) return 'wrapped: iz raporu icin once giris yap (/account/auth.html).';
        const safe = (promise) => (promise || Promise.resolve(null)).catch(() => null);
        const [scores, sessions, oracleProfile, dartStats] = await Promise.all([
          safe(backend.fetchUserGameScores?.(30)),
          safe(backend.fetchUserAppSessions?.(40)),
          safe(backend.fetchOracleProfile?.()),
          safe(backend.fetchUserDartStats?.(12))
        ]);
        const gameRows = scores || [];
        const sessionRows = sessions || [];
        const totalMinutes = Math.round(sessionRows.reduce((sum, row) => sum + (Number(row.duration_seconds) || 0), 0) / 60);
        const best = gameRows.reduce((top, row) => (Number(row.score) || 0) > (Number(top?.score) || -1) ? row : top, null);
        const appCounts = {};
        sessionRows.forEach((row) => { appCounts[row.item_title] = (appCounts[row.item_title] || 0) + 1; });
        const topApp = Object.entries(appCounts).sort((a, b) => b[1] - a[1])[0];
        const dartWins = dartStats
          ? ['x01', 'atc', 'cricket'].reduce((sum, mode) => sum + (dartStats.byMode?.[mode]?.wins || 0), 0)
          : 0;
        if (!gameRows.length && !sessionRows.length && !dartStats?.totalMatches && !oracleProfile) {
          return 'wrapped: henuz yeterli iz yok. oyun oyna, oracle\'a sor, dart at — rapor kendini yazar.';
        }
        const lines = [
          '] IZ RAPORU (WRAPPED)',
          '',
          `  oyun skoru      : ${gameRows.length} kayit`
        ];
        if (best) lines.push(`  en iyi skor     : ${Number(best.score || 0).toLocaleString('tr-TR')} (${best.game_key})`);
        lines.push(`  protokol suresi : ${totalMinutes} dk`);
        if (topApp) lines.push(`  favori protokol : ${topApp[0]} (${topApp[1]}x)`);
        if (dartStats?.totalMatches) lines.push(`  dart            : ${dartStats.totalMatches} mac / ${dartWins} galibiyet`);
        if (oracleProfile?.reading_count) {
          lines.push(`  oracle          : ${oracleProfile.reading_count} okuma${oracleProfile.dominant_axis ? ` (baskin eksen: ${oracleProfile.dominant_axis})` : ''}`);
        }
        lines.push('', '  gorsel kart: dashboard -> Iz Raporu (PNG indirilebilir)', ']');
        return lines.join('\n');
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
          const marks = await backend.fetchWallMarks(getVirtualCwd(), 50); // presence icin genis cek
          if (!marks.length) return `wall ${getVirtualCwd()}: henuz iz yok. ilk izi sen birak: "mark <mesaj>"`;
          const newest = relativeTime(marks[0].created_at);
          const shown = marks.slice(0, 8);
          const lines = shown.map((m) => `  ${formatWallStamp(m.created_at)} | ${m.body}`);
          return [
            `] DUVAR ${prodosPath(getVirtualCwd())}`,
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
          await backend.leaveWallMark({ room: getVirtualCwd(), body });
          audioCue('system.unlock');
          return `iz birakildi: ${getVirtualCwd()}. (wall ile oku)`;
        } catch (error) {
          const msg = String(error?.message || '');
          if (/giris/i.test(msg)) return 'mark: iz birakmak icin once giris yap (/account/auth.html).';
          return 'mark: iz birakilamadi.';
        }
      };

      // --- Sisedeki mesaj (bottle): asenkron rastlantisal mesajlasma.
      // Yazma islemleri Supabase RPC ile (gunluk limit sunucuda); tablo yoksa
      // ya da giris yoksa zarif metinlerle geri cekilir.
      const bottleUsage = () => [
        '] BOTTLE',
        '',
        '  bottle throw <mesaj>  bir sise birak (gunde 3; giris gerekir)',
        '  bottle catch          okyanustan rastgele bir sise yakala',
        '  bottle list           attigin ve yakaladigin siseler',
        '',
        '  kural: kimin eline gececegini secemezsin. okyanus karar verir.',
        ']'
      ].join('\n');

      const bottleErrorText = (error) => {
        const msg = String(error?.message || '');
        if (/login_required|giris|jwt|auth/i.test(msg)) return 'bottle: sise birakmak icin once giris yap (/account/auth.html).';
        if (/daily_limit/i.test(msg)) return 'bottle: gunluk sise hakkin doldu (24 saatte 3). okyanus sabir ister.';
        if (/body_invalid/i.test(msg)) return 'bottle: mesaj 1-280 karakter olmali.';
        if (/does not exist|could not find|schema cache|function/i.test(msg)) return 'bottle: sise agi henuz kurulmamis. deniz sakin.';
        return 'bottle: dalga ters vurdu; islem tamamlanamadi.';
      };

      const bottleCommand = async (rawArg = '') => {
        const backend = window.ConviviumBackend;
        if (!backend?.throwBottle || !backend.isConfigured?.()) {
          return 'bottle: sise agi cevrimdisi.';
        }
        const arg = String(rawArg || '').trim();
        const sub = (arg.split(/\s+/)[0] || '').toLowerCase();
        if (!sub || sub === 'help') return bottleUsage();
        if (sub === 'throw' || sub === 'at' || sub === 'birak') {
          const body = arg.replace(/^\S+\s*/, '').trim();
          if (!body) return 'bottle: usage bottle throw <mesaj>';
          try {
            await backend.throwBottle(body);
            audioCue('system.unlock');
            return 'sise suya birakildi. kim bulur, ne zaman bulur — bilinmez.';
          } catch (error) {
            return bottleErrorText(error);
          }
        }
        if (sub === 'catch' || sub === 'yakala') {
          try {
            const row = await backend.catchBottle();
            if (!row) return 'bottle: okyanus su an bos. sonra tekrar bak — ya da ilk siseyi sen birak.';
            audioCue('system.unlock');
            return [
              '] SISE YAKALANDI',
              '',
              `  ${row.body}`,
              '',
              `  birakilma: ${relativeTime(row.created_at)}`,
              '  (gonderen anonim. istersen sen de bir sise birak: bottle throw <mesaj>)',
              ']'
            ].join('\n');
          } catch (error) {
            return bottleErrorText(error);
          }
        }
        if (sub === 'list' || sub === 'liste') {
          try {
            const { userId, rows } = await backend.listBottles(10);
            if (!rows.length) return 'bottle: kaydin yok. ilk siseni birak: bottle throw <mesaj>';
            const lines = rows.map((row) => {
              const mine = row.sender_id === userId;
              const dir = mine ? '>>' : '<<';
              const stateTag = mine
                ? (row.status === 'caught' ? 'yakalandi' : 'suda')
                : 'yakaladin';
              return `  ${dir} [${stateTag}] ${row.body.slice(0, 60)}${row.body.length > 60 ? '...' : ''}`;
            });
            return ['] SISELERIN', '', ...lines, ']'].join('\n');
          } catch (error) {
            return bottleErrorText(error);
          }
        }
        return bottleUsage();
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
        `002  ${screenSaverMod?.isActive() ? 'RUN' : 'IDLE'}     screen.saver`,
        `003  ${powerOverlay?.classList.contains('is-active') || powerOverlay?.classList.contains('is-off') ? 'RUN' : 'IDLE'}     power.overlay`,
        `004  ${(window.DebCompanion || window.NovaCompanion)?.getState?.().active ? 'RUN' : 'IDLE'}     deb.companion`,
        `005  ${commandInFlight ? 'WAIT' : 'IDLE'}     oracle.channel`,
        `006  ${pipeMod?.isActive() ? 'RUN' : 'IDLE'}     pipe.game`,
        `007  ${presenceMod?.isActive() ? 'RUN' : 'IDLE'}     presence.net`,
        `008  ${chatMod?.isListening() ? 'RUN' : 'IDLE'}     chat.channel`
      ].join('\n');

      const themeCommand = (target = '') => {
        const theme = normalizeCommand(target);
        const colors = {
          green: ['#00ff66', '#caffd8'],
          cyan: ['#00eaff', '#d8fbff'],
          amber: ['#f5ff6b', '#fff7b0'],
          // Shop'tan acilan temalar (shop:theme-*):
          magenta: ['#ff2ea6', '#ffd8ef'],
          ice: ['#8ef4ff', '#eaffff']
        };
        const premium = { magenta: 'theme-magenta', ice: 'theme-ice' };
        const themeList = () => {
          const owned = new Set(state.inventory || []);
          const open = ['green', 'cyan', 'amber']
            .concat(Object.keys(premium).filter((key) => owned.has(`shop:${premium[key]}`)));
          return open.join('|');
        };
        if (!colors[theme]) return `theme: usage theme ${themeList()} (yenileri shop'ta)`;
        if (premium[theme] && !(state.inventory || []).includes(`shop:${premium[theme]}`)) {
          return `theme: ${theme} kilitli. shop'tan ac: shop buy ${premium[theme]}`;
        }
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

      // --- Signal Shards: bakiye + dukkan (kozmetik) ---
      const shardsCommand = () => economyMod?.summary?.() || 'shards: economy unavailable';

      const applyShopPurchase = (key) => {
        try {
          if (key === 'saver-drift') localStorage.setItem('convivium.saver.variant', 'drift');
          if (key === 'bugy-flag') localStorage.setItem('convivium.bugy.flag', '1');
        } catch { /* kozmetik bayrak best-effort */ }
      };

      shopMod = (() => {
        if (!economyMod) return null;
        const createShop = window.ConviviumHome?.createShop;
        if (typeof createShop !== 'function') {
          console.error('[home-protocol] Shop module unavailable');
          return null;
        }
        try {
          return createShop({
            normalizeCommand,
            getBalance: () => state.shards,
            ownsItem: (key) => (state.inventory || []).includes(`shop:${key}`),
            spendShards,
            grantItem: (key) => {
              state.inventory = [...new Set([...(state.inventory || []), `shop:${key}`])];
            },
            persist,
            scheduleWorldSave,
            applyPurchase: applyShopPurchase,
            playPickupAudio: () => audioCue('game.pickup')
          });
        } catch (error) {
          console.error('[home-protocol] Shop module failed', error);
          return null;
        }
      })();

      const shopCommand = (arg = '') => {
        if (!economyMod) return 'shop: economy unavailable';
        return shopMod?.command?.(arg) || 'shop: unavailable';
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

      // Terminal oyun modulleri (assets/js/home/pipe-90.js, outrun-86.js).
      // Karsilikli dislama: outrun baslarken pipe'i sifirlar (ayni is-game-mode
      // sinifini paylasirlar).
      pipeMod = window.ConviviumHome?.createPipe90?.({
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
      }) || null;
      outrunMod = window.ConviviumHome?.createOutrun86?.({
        commandShell,
        commandOutput,
        pulse,
        audioCue,
        normalizeCommand,
        resetPipe: () => pipeMod?.reset()
      }) || null;

      // Canli varlik katmani (assets/js/home/presence.js): anonim es-zamanli
      // ziyaretci izi. Supabase yoksa modul sessizce devre disi kalir.
      presenceMod = window.ConviviumHome?.createPresence?.({
        getClient: () => window.ConviviumBackend?.getClient?.() || null,
        getRoom: getVirtualCwd
      }) || null;
      presenceMod?.start();

      // Gece frekansi (assets/js/home/night-mode.js): 00:00-05:59 arasi
      // alcak kontrast palet + HUD ibaresi + gece kapisi.
      nightModeMod = window.ConviviumHome?.createNightMode?.({
        onChange: (night) => {
          if (night && consoleLine) consoleLine.textContent = 'low frequency band active';
        }
      }) || null;
      nightModeMod?.start();

      // Convivium Radio (assets/js/home/radio.js): prosedurel WebAudio ambient.
      radioMod = window.ConviviumHome?.createRadio?.({
        isAudioEnabled: () => audioEnabled
      }) || null;

      // Gelen sohbet mesajini Bugy V4 balonunda soyler (o an aktifse).
      // Diger companion motorlarinin (V2/V3/klasik/Deb) konusma balonu yok;
      // bu yuzden yalniz BugyV4.say varsa calisir, aksi halde sessizce gecer.
      const CHAT_INVITE_LABELS = { crude: 'Crude Buster', dart: 'Dart' };
      const speakChatEntry = (entry) => {
        const bugy = window.BugyV4;
        if (!bugy?.say || !bugy.getState?.().active) return;
        const state = bugy.getState();
        let text = '';
        if (state.feral) {
          // Canavar modu icerikle ilgilenmez; yalniz kim yazdigini alaycı bildirir.
          text = `Hey! ilgisiz ${entry?.tag || 'birisi'} sana bir mesaj attı.`;
        } else if (entry?.kind === 'invite') {
          text = `Sana ${entry.tag} "${CHAT_INVITE_LABELS[entry.game] || entry.game}" daveti gönderdi!`;
        } else if (entry?.body) {
          text = `Sana ${entry.tag} ${entry.body} yazdı.`;
        }
        if (!text) return;
        bugy.say(text.length > 90 ? `${text.slice(0, 89)}…` : text);
      };

      // Canli sohbet (assets/js/home/chat.js): presence rumuzlariyla ucucu
      // terminal sohbeti. Gelen mesaj terminale duser; oyun ekrani aktifken
      // (pipe/outrun) transcript'e karismaz, konsol satirina kisa iz duser.
      chatMod = window.ConviviumHome?.createChat?.({
        getClient: () => window.ConviviumBackend?.getClient?.() || null,
        getTag: () => presenceMod?.tag?.() || 'wanderer-????',
        getRoom: getVirtualCwd,
        onMessage: (line, entry) => {
          if (consoleLine) consoleLine.textContent = line.slice(0, 48);
          screenSaverMod?.pushSignal?.(line); // koruyucuda kayan yildiz olur
          speakChatEntry(entry); // Bugy V4 aktifse mesaji balonunda soyler
          if (pipeMod?.isActive() || outrunMod?.isActive()) return;
          if (chatDeckMod?.isActive()) return; // guverte acikken akis orada
          printTerminal(line);
          audioCue('terminal.suggest');
        },
        onEvent: (entry) => { chatDeckMod?.receive?.(entry); }
      }) || null;

      // Chat guvertesi (assets/js/home/chat-deck.js): tam ekran sohbet +
      // aktif gezginler + fisilti + oyun davetleri. Yalniz EXIT ile kapanir.
      chatDeckMod = window.ConviviumHome?.createChatDeck?.({
        getChat: () => chatMod,
        getWanderers: () => presenceMod?.list?.() || [],
        getSelfTag: () => presenceMod?.tag?.() || 'wanderer-????',
        getRoom: getVirtualCwd,
        pulse
      }) || null;
      // Oturum varsa rastgele presence rumuzunu benzersiz profil handle'iyle
      // degistir. Kimlik dogrulama tamamlanana kadar ortak kanal anonim kalir.
      chatMod?.initializeSocial?.().then((profile) => {
        if (profile) presenceMod?.setIdentity?.(profile);
        chatDeckMod?.refreshSocial?.();
      }).catch(() => {});
      // Daha once kanala katilmis kullanici sayfa acilisinda sessizce
      // dinlemeye doner; sinyal cipi boylece yeni ziyarette de calisir.
      chatMod?.resume?.();

      // Co-op kapi altyapisi (assets/js/home/coop-gate.js): gizli "resonate"
      // komutu. Iki gezgin 8 sn icinde ayni kelimeyi soylerse rezonans olusur;
      // simdilik yalnizca iz birakir (kapinin kendisi sonraki fazda).
      coopGateMod = window.ConviviumHome?.createCoopGate?.({
        getClient: () => window.ConviviumBackend?.getClient?.() || null,
        getTag: () => presenceMod?.tag?.() || 'wanderer-????',
        onSync: (code) => {
          state.easterTrail = [...(state.easterTrail || []), `resonate:${code}`].slice(-4);
          persist();
          awardShards(3, 'rezonans');
          audioCue('system.unlock');
          pulse(640, 0.09);
          printTerminal([
            '',
            `>> REZONANS: "${code}" — iki sinyal ayni anda titredi.`,
            '>> rezonans kaydedildi. bir yerlerde bir kapi bunu duydu.',
            ''
          ].join('\n'));
          if (consoleLine) consoleLine.textContent = `resonance captured: ${code}`;
        }
      }) || null;

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

      // --- Kabuk cekirdegi (Dalga 9b): terminal komutlari ---
      const FORTUNES = [
        'Sinyal, onu dinleyecek kadar yavaslayan icin tasir.',
        'Kirik baglanti bazen bir kapidir. (bkz: sinyal kaybi)',
        'En hizli kod, yazilmayan koddur; en iyi arayuz, fark edilmeyendir.',
        'Cache her seyi hatirlar; sen CACHE_NAME bumplamayi unutursun.',
        'Bir terminalin isigi, soru soranin yuzune vurur.',
        'Neon soner, log kalir.',
        'Butun buyuk sistemler kucuk bir "merhaba dunya" ile basladi.',
        'Once calisir hale getir, sonra dogru hale getir, sonra neon ekle.',
        'Gercek hata mesaji, kendine durustluktur.',
        'Bir rota kaybolduysa haritayi buyut: tree.',
        'Ritual, dikkati sifirlayan kucuk bir protokoldur.',
        'Yedegi alinmayan veri, cesur bir soylentidir.',
        'Kabugun derinligi, sordugun sorunun derinligi kadardir.',
        'Pipe her ciktiyi tasir; anlami sen suzersin. | grep anlam'
      ];
      const fortuneCommand = () => `fortune: ${FORTUNES[Math.floor(Math.random() * FORTUNES.length)]}`;

      // cowsay: bugy'nin ASCII hali konusur. Metin textContent ile basildigi icin guvenli.
      const cowsayCommand = (text = '') => {
        const msg = (String(text).trim() || 'pipe beni: fortune | cowsay').slice(0, 120);
        const lines = [];
        for (let i = 0; i < msg.length; i += 38) lines.push(msg.slice(i, i + 38));
        const width = Math.max(...lines.map(l => l.length));
        const top = ' ' + '_'.repeat(width + 2);
        const bottom = ' ' + '-'.repeat(width + 2);
        const body = lines.map((l, i) => {
          const pad = l.padEnd(width);
          if (lines.length === 1) return `< ${pad} >`;
          if (i === 0) return `/ ${pad} \\`;
          if (i === lines.length - 1) return `\\ ${pad} /`;
          return `| ${pad} |`;
        });
        return [top, ...body, bottom,
          '     \\   [o_o]',
          '      \\  /|_|\\   *bzzt*',
          '         d   b'
        ].join('\n');
      };

      const envCommand = () => {
        const vars = envLoad();
        const entries = Object.entries(vars);
        const builtins = '  (yerlesik: $USER $CWD $RANDOM $DATE $CMDS)';
        if (!entries.length) return ['env: tanimli degisken yok. ornek: export AD=neo', builtins].join('\n');
        return ['] ENV', '', ...entries.map(([k, v]) => `  ${k}=${v}`), '', builtins, ']'].join('\n');
      };
      const unsetCommand = (name = '') => {
        const key = String(name).trim();
        const vars = envLoad();
        if (!key || !Object.prototype.hasOwnProperty.call(vars, key)) return `unset: "${key || '?'}" tanimli degil.`;
        delete vars[key];
        envSave(vars);
        return `unset ${key}`;
      };

      const historyCommand = () => {
        const log = state.commandLog || [];
        if (!log.length) return 'history: gecmis bos.';
        return log.map((cmd, i) => `  ${String(i + 1).padStart(3)}  ${cmd}`).join('\n')
          + '\n  ("!N" ile tekrar calistir, "!!" son komut)';
      };

      const whichCommand = (target = '') => {
        const key = normalizeCommand(target).split(' ')[0];
        if (!key) return 'which: usage which <komut>';
        if ((state.aliases || {})[key]) return `${key}: alias -> ${state.aliases[key]}`;
        if (COMMAND_SYNONYMS[key]) return `${key}: yerlesik esanlamli -> ${COMMAND_SYNONYMS[key]}`;
        if (commandFirstWords.has(key)) return `${key}: yerlesik terminal komutu`;
        return `which: ${key}: bulunamadi (oracle'a duser)`;
      };

      const sudoCommand = (arg = '') => {
        const what = normalizeCommand(arg);
        if (/sandvic|sandwich/.test(what)) return 'sudo: peki. (bir sandvic yapildi) 🥪';
        if (!what) return 'sudo: usage sudo <komut>';
        return [
          'sudo: yetki reddedildi.',
          'bu terminalde root yok; herkes ziyaretci, herkes esit.',
          `(istersen dogrudan dene: ${what})`
        ].join('\n');
      };

      const shellGuideCommand = () => [
        '] KABUK KILAVUZU',
        '',
        '  boru hatti : komut | filtre | filtre',
        '     ornek   : help | grep oyun',
        '     filtreler: grep [-iv] <desen>, head [n], tail [n], wc [-l],',
        '                sort [-r], uniq, rev, nl, cowsay, tee <dosya>',
        '  yonlendirme: komut > dosya   (yaz)   komut >> dosya (ekle)',
        '     ornek   : fortune > gunun-sozu.txt   /  cat gunun-sozu.txt',
        '  zincir     : komut1 && komut2   (basarili olursa devam)',
        '               komut1 ;  komut2   (her durumda devam)',
        '  degiskenler: export AD=neo  /  echo selam $AD  /  env  /  unset AD',
        '               yerlesik: $USER $CWD $RANDOM $DATE $CMDS',
        '  gecmis     : history, !! (son komut), !N (N. komut), Ctrl+R (ara)',
        '  dosyalar   : /home altinda kalici: echo, touch, rm, cat, ls home',
        '  kisayollar : Ctrl+L temizle, Ctrl+U satiri sil, Ctrl+C iptal',
        ']'
      ].join('\n');

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
          const near = navigatorMod?.correct?.(key) || null;
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

      const guideBriefCommand = (kind = 'terminal') => {
        const guides = {
          terminal: {
            title: 'TERMINAL GUIDE',
            read: 'read guide',
            lines: [
              'Terminal once kisa not verir; uzun okuma icin read komutunu kullan.',
              'Baslangic: help, guide, how to play, app guide, score guide',
              'Rota: open dossier, open oracle, run logic, dart, dashboard',
              'Kesif: look, map, archive, notes, terminal games'
            ]
          },
          games: {
            title: 'HOW TO PLAY',
            read: 'read game guide',
            lines: [
              'Dusunme: run logic / run signal',
              'Refleks: run ash / run ash2 / run serpent / run flow',
              'Kurgu: universe',
              'Terminal ici: pipe / outrun',
              'Ilk secim: hizli bulmaca icin run logic, hareket icin run ash.'
            ]
          },
          apps: {
            title: 'APP GUIDE',
            read: 'read app guide',
            lines: [
              'Karar aynasi: open oracle',
              'Rituel icecek: barista / bartender / realists bar',
              'Dusunce egzersizi: paradox / ekol',
              'Gorsel deney: bugy studio'
            ]
          },
          shellGames: {
            title: 'TERMINAL GAMES',
            read: 'read terminal games',
            lines: [
              'pipe: boru parcasi dondur, yerlestir, akisi baslat.',
              'outrun: ASCII yolu oku, hiz ve serit ritmini koru.',
              'Yardim: pipe help / outrun help',
              'Cikis: pipe quit / outrun quit'
            ]
          },
          score: {
            title: 'SCORE GUIDE',
            read: 'read score guide',
            lines: [
              'dart: 501, Around the Clock ve Cricket skor akisi.',
              'dashboard: kayitli skorlar, oturum izleri ve kullanici yuzeyi.',
              'access: hesap gerektiren kayitlar icin giris.',
              'history: sadece terminal komut gecmisi.'
            ]
          }
        };
        const item = guides[kind] || guides.terminal;
        return [
          `] ${item.title}`,
          '',
          ...item.lines.map(line => `  ${line}`),
          '',
          `  uzun okuma: ${item.read}`,
          `  English read: ${item.read}`,
          ']'
        ].join('\n');
      };

      const routeCommandDefinitions = (() => {
        const createRouteCommands = window.ConviviumHome?.createRouteCommands;
        if (typeof createRouteCommands !== 'function') {
          console.error('[home-protocol] route command module unavailable');
          return [];
        }

        try {
          return createRouteCommands({ route, goTo, scrollToOrigin });
        } catch (error) {
          console.error('[home-protocol] route command module failed', error);
          return [];
        }
      })();

      const guideCommandDefinitions = (() => {
        const createGuideCommands = window.ConviviumHome?.createGuideCommands;
        if (typeof createGuideCommands !== 'function') {
          console.error('[home-protocol] guide command module unavailable');
          return [];
        }

        try {
          return createGuideCommands({
            route,
            goTo,
            baslaCommand: (...args) => baslaCommand(...args),
            commandHelpText: (...args) => commandHelpText(...args),
            guideBriefCommand,
            keyboardHelpText: (...args) => keyboardHelpText(...args)
          });
        } catch (error) {
          console.error('[home-protocol] guide command module failed', error);
          return [];
        }
      })();

      const commandDefinitions = [
        ...guideCommandDefinitions,
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
          aliases: ['trace log'],
          action: logCommand
        },
        {
          command: 'history',
          description: 'numarali komut gecmisi (!N ile tekrar calistir)',
          aliases: ['gecmis', 'geçmiş'],
          action: historyCommand
        },
        {
          command: 'changelog',
          description: 'siteye dusen son sinyalleri (yeni ozellikleri) acar',
          aliases: ['sinyaller', 'son sinyaller', 'news', 'updates', 'yenilikler'],
          action: goTo(route('changelog', '/pages/changelog.html'))
        },
        {
          command: 'shell',
          description: 'kabuk kilavuzu: pipe, yonlendirme, degisken, gecmis genisletme',
          aliases: ['kabuk', 'pipes', 'kilavuz kabuk'],
          action: shellGuideCommand
        },
        {
          command: 'echo',
          description: 'metni yazar; $DEGISKEN genisletir; "> dosya" ile /home\'a yazar',
          aliases: ['yazdir', 'yazdır'],
          action: () => 'echo: usage echo <metin>  (echo selam $USER > not.txt)'
        },
        {
          command: 'env',
          description: 'tanimli kabuk degiskenlerini listeler',
          aliases: ['printenv', 'degiskenler'],
          action: envCommand
        },
        {
          command: 'export',
          description: 'kabuk degiskeni tanimlar (export AD=deger)',
          aliases: ['set'],
          action: () => 'export: usage export AD=deger (sonra: echo $AD)'
        },
        {
          command: 'unset',
          description: 'kabuk degiskenini siler',
          aliases: [],
          action: () => 'unset: usage unset <AD>'
        },
        {
          command: 'touch',
          description: '/home altinda bos dosya olusturur',
          aliases: [],
          action: () => 'touch: usage touch <dosya-adi>'
        },
        {
          command: 'rm',
          description: '/home altindaki bir dosyayi siler',
          aliases: ['del'],
          action: () => 'rm: usage rm <dosya-adi> (ls home ile listele)'
        },
        {
          command: 'which',
          description: 'bir komutun yerlesik mi, alias mi oldugunu soyler',
          aliases: [],
          action: () => 'which: usage which <komut>'
        },
        {
          command: 'grep',
          description: 'pipe filtresi: satirlari desene gore suzer (komut | grep desen)',
          aliases: [],
          action: () => 'grep: pipe icinde kullanilir. ornek: help | grep oyun  (bkz: shell)'
        },
        {
          command: 'fortune',
          description: 'gunun terminal kehaneti',
          aliases: ['kehanet', 'soz'],
          action: fortuneCommand
        },
        {
          command: 'cowsay',
          description: 'ASCII bugy soyler (cowsay <metin> ya da fortune | cowsay)',
          aliases: ['bugysay'],
          action: () => cowsayCommand('')
        },
        {
          command: 'sudo',
          description: 'yetki dener (bu terminalde root yok)',
          aliases: [],
          action: () => sudoCommand('')
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
          action: pwdCommand
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
          action: () => screenSaverMod ? screenSaverMod.command() : 'screen saver: unavailable'
        },
        {
          command: 'pipe',
          description: 'fuzyon reaktoru sogutma oyunu Pipe-90i acar',
          aliases: ['pipes', 'pipe game', 'pipe86', 'pipe90', 'boru oyunu', 'reactor', 'reaktor', 'coolant'],
          action: () => pipeMod ? pipeMod.command('new') : 'pipe: unavailable'
        },
        {
          command: 'outrun',
          description: "sozde-3B arcade surus oyunu Out Run '86i acar",
          aliases: ['out run', 'outrun86', 'ferrari', 'drive', 'surus', 'sürüş', 'sur', 'sür', 'race', 'yaris', 'yarış', 'arcade'],
          action: () => outrunMod ? outrunMod.command('new') : 'outrun: unavailable'
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
          aliases: ['walkthrough', 'site tour', 'rota turu'],
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
          command: 'radio',
          description: 'prosedurel ambient radyoyu acar/kapatir (radio next: istasyon)',
          aliases: ['radyo', 'fm'],
          action: () => radioMod ? radioMod.command('') : 'radio: modul hazir degil.'
        },
        {
          command: 'wrapped',
          description: 'kisisel iz raporu: skorlar, sureler, oracle, dart (giris gerekir)',
          aliases: ['iz raporu', 'rapor', 'yearbook'],
          action: wrappedCommand
        },
        {
          command: 'card',
          description: 'gunun sinyal kartini gosterir (herkese ayni kart dogar)',
          aliases: ['kart', 'signal card', 'gunun karti', 'daily card'],
          action: cardCommand
        },
        {
          command: 'collect',
          description: 'gunun kartini koleksiyona ekler (gunde 1)',
          aliases: ['topla', 'collect card', 'karti topla'],
          action: collectCommand
        },
        {
          command: 'cards',
          description: 'toplanan sinyal karti koleksiyonunu listeler',
          aliases: ['kartlar', 'koleksiyon', 'collection'],
          action: cardsCommand
        },
        {
          command: 'shards',
          description: 'signal shard bakiyesi ve kazanim yollari',
          aliases: ['shard', 'bakiye', 'balance'],
          action: shardsCommand
        },
        {
          command: 'shop',
          description: 'shard dukkani: kozmetik temalar ve varyantlar',
          aliases: ['magaza', 'mağaza', 'store', 'dukkan'],
          action: () => shopCommand('')
        },
        {
          command: 'bottle',
          description: 'sisedeki mesaj: bottle throw <mesaj> / catch / list',
          aliases: ['sise', 'şişe', 'message in a bottle'],
          action: () => bottleCommand('')
        },
        {
          command: 'who',
          description: 'su an sitede gezen anonim sinyalleri listeler',
          aliases: ['kimler', 'nearby', 'presence'],
          action: () => presenceMod ? presenceMod.whoCommand() : 'who: sinyal yok. (presence agi kapali)'
        },
        {
          command: 'chat',
          description: 'chat guvertesini acar: canli akis, gezginler, fisilti, oyun davetleri',
          aliases: ['sohbet', 'chat deck', 'guverte'],
          action: () => {
            if (chatDeckMod) { closeCommand(); return chatDeckMod.open(); }
            return chatMod ? chatMod.command('') : 'chat: modul hazir degil.';
          }
        },
        {
          command: 'say',
          description: 'acik sohbet kanalina mesaj yazar (say <mesaj>)',
          aliases: ['soyle', 'söyle'],
          action: () => 'say: usage say <mesaj> (once chat ile kanali ac; say yazinca da acilir)'
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
        ...routeCommandDefinitions,
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
        '  Convivium bir portfolyo degil; gezilen bir terminal-dunyasi.',
        '  Makaleler, oyunlar, oracle, rituel araclari ve kiside kalan izler ayni agda durur.',
        '',
        '  hizli rota:',
        '    open dossier   makaleler ve notlar',
        '    run logic      kisa bulmaca oyunu',
        '    open oracle    isaret ve karar deneyimi',
        '    dashboard      kaydedilen skorlar ve izler',
        '',
        '  kesif komutlari:',
        '  look          neredesin, etrafinda ne var',
        '  examine <x>   bir seye yakindan bak (ipucu/esya)',
        '  take <x>      esyayi cebine al',
        '  cd <oda>      baska esige gec',
        '  unlock <oda>  dogru esyayla kilidi ac',
        '',
        `  GOREV   ${currentObjective()}`,
        '  ipucu: once "look", sonra "open dossier" ya da "open oracle" dene.',
        ']'
      ].join('\n');

      const emergencyCommandHelpText = () => [
        '] SINYAL PUSULASI / SINIRLI MOD',
        '',
        '  look             bulundugun yeri oku',
        '  cd <oda>         terminal odasini degistir',
        '  open dossier     makaleleri ac',
        '  man <komut>      komut ayrintisini oku',
        '',
        '  tamamlama katmani su an kullanilamiyor; normal komutlar calismaya devam eder.',
        ']'
      ].join('\n');

      const commandHelpText = (topic = '') => {
        const key = normalizeCommand(topic);
        if (!navigatorMod) return emergencyCommandHelpText();
        if (key === 'all') return navigatorMod.helpAll();
        return navigatorMod.help(topic);
      };

      const commandMap = commandDefinitions.reduce((map, item) => {
        [item.command, ...(item.aliases || [])].forEach(alias => {
          map[normalizeCommand(alias)] = item.action;
        });
        return map;
      }, Object.create(null));

      // Gizli komut: resonate oneri/yardim listelerine girmez; yalin yazana ipucu verir.
      commandMap['resonate'] = () => 'resonate: usage resonate <kelime>. (yankinin karsilik bulmasi icin iki gezgin gerekir)';
      commandMap['rezonans'] = commandMap['resonate'];

      const commandChoices = commandDefinitions.flatMap(item => [item.command, ...(item.aliases || [])]);
      const commandFirstWords = new Set(
        commandChoices.map(choice => normalizeCommand(choice).split(' ')[0]).filter(word => word.length >= 2)
      );

      navigatorMod = (() => {
        const createNavigator = window.ConviviumHome?.createNavigator;
        if (typeof createNavigator !== 'function') {
          console.error('[home-protocol] Navigator module unavailable');
          return null;
        }
        try {
          return createNavigator({
            normalizeCommand,
            getCwd: getVirtualCwd,
            listRooms: () => worldMod?.listRooms?.() || [],
            getRoom: getWorldRoom,
            getObjective: currentObjective,
            getCommandDefinitions: () => commandDefinitions
          });
        } catch (error) {
          console.error('[home-protocol] Navigator module failed', error);
          return null;
        }
      })();

      // --- Akilli parser (Dalga 2): esanlamli verb haritasi + yazim toleransi ---
      // Niyet-esanlamlilari (cogu zaten alias; burasi alias olmayan dogal fiiller icin).
      // Belirsiz Turkce kelimeler (git/gel...) bilinerek disarida; dogal sorulari kacirmasin.
      const COMMAND_SYNONYMS = {
        go: 'cd', goto: 'cd', enter: 'cd', move: 'cd',
        inspect: 'examine',
        grab: 'take', get: 'take', pickup: 'take',
        items: 'inventory'
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
      const isPersonalAliasCommand = (cmd) => {
        const first = normalizeCommand(cmd).split(' ')[0];
        return Boolean(first) && Object.prototype.hasOwnProperty.call(state.aliases || {}, first);
      };
      const matchingCommands = (raw) => {
        const query = normalizeCommand(raw);
        if (!query) return [];
        if (navigatorMod) return navigatorMod.suggest(raw, { limit: 3 });
        return commandDefinitions
          .filter(entry => normalizeCommand(entry.command).startsWith(query))
          .slice(0, 3)
          .map(entry => ({
            value: entry.command,
            description: entry.description || 'terminal komutu',
            reason: 'tamamla'
          }));
      };

      const clearCommandSuggestions = () => {
        commandShell?.classList.remove('has-suggestions');
        currentSuggestions = [];
        activeSuggestionIndex = 0;
        suggestionSelectionExplicit = false;
        if (commandSuggestions) commandSuggestions.replaceChildren();
        commandInput?.setAttribute('aria-expanded', 'false');
        commandInput?.removeAttribute('aria-activedescendant');
      };

      const syncActiveSuggestion = () => {
        if (!commandSuggestions || !currentSuggestions.length) return;
        const buttons = [...commandSuggestions.querySelectorAll('.command-suggestion')];
        buttons.forEach((button, index) => {
          const active = index === activeSuggestionIndex;
          button.classList.toggle('is-active', active);
          button.setAttribute('aria-selected', String(active));
        });
        const active = buttons[activeSuggestionIndex];
        if (active?.id) commandInput?.setAttribute('aria-activedescendant', active.id);
      };

      const applySuggestion = (value, run = false) => {
        const command = typeof value === 'string' ? value : value?.value;
        if (!commandInput || !command) return;
        audioCue(run ? 'terminal.run' : 'terminal.suggest');
        commandInput.value = command;
        try { commandInput.setSelectionRange(command.length, command.length); } catch { /* ignore */ }
        commandInput.focus();
        if (run) {
          clearCommandSuggestions();
          runCommand(command);
        } else {
          suggestionSelectionExplicit = false;
          renderCommandSuggestions(command);
        }
      };

      const renderCommandSuggestions = (raw = '') => {
        clearCommandSuggestions();
        if (!commandSuggestions || !commandInput || !String(raw).trim()) return;
        if (pipeMod?.isActive() || outrunMod?.isActive()) return;
        currentSuggestions = [...matchingCommands(raw)];
        if (!currentSuggestions.length) return;

        const fragment = document.createDocumentFragment();
        currentSuggestions.forEach((suggestion, index) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.id = `command-suggestion-${index}`;
          button.className = 'command-suggestion';
          button.setAttribute('role', 'option');
          button.setAttribute('aria-selected', String(index === 0));

          const value = document.createElement('span');
          value.className = 'command-suggestion-value';
          value.textContent = suggestion.value;
          const detail = document.createElement('small');
          detail.className = 'command-suggestion-detail';
          detail.textContent = `${suggestion.reason} · ${suggestion.description}`;
          button.append(value, detail);
          button.addEventListener('pointerdown', event => event.preventDefault());
          button.addEventListener('click', () => applySuggestion(suggestion.value));
          fragment.append(button);
        });

        commandSuggestions.append(fragment);
        commandShell?.classList.add('has-suggestions');
        commandInput.setAttribute('aria-expanded', 'true');
        syncActiveSuggestion();
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
        if (pipeMod?.isActive()) {
          if (commandOutput) commandOutput.textContent = text;
        } else {
          printTerminal(text);
        }
      };

      const sendOracleQuery = async (query) => {
        window.ConviviumBackend?.recordSiteEvent?.('oracle.ask', '/');
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

      // --- Kabuk cekirdegi (Dalga 9c): parcali yurutme + boru hatti motoru ---
      // parameterActions runCommand ve boru hatti motoru tarafindan paylasilir.
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
        ['help ', value => commandHelpText(value)],
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
        ['shop ', value => shopCommand(value)],
        ['radio ', value => radioMod ? radioMod.command(value) : 'radio: modul hazir degil.'],
        ['chat ', value => chatMod ? chatMod.command(value) : 'chat: modul hazir degil.'],
        ['resonate ', value => coopGateMod ? coopGateMod.attempt(value) : 'resonate: kanal kapali.'],
        ['rezonans ', value => coopGateMod ? coopGateMod.attempt(value) : 'resonate: kanal kapali.'],
        ['pipe ', value => pipeMod ? pipeMod.command(value) : 'pipe: unavailable'],
        ['outrun ', value => outrunMod ? outrunMod.command(value) : 'outrun: unavailable'],
        ['grep ', value => `grep: tek basina degil, boru hattinda kullanilir. ornek: help | grep ${value || 'oyun'}`]
      ];

      // Ham (buyuk/kucuk harf ve ozel karakter koruyan) argumanli komutlar.
      // Kabuk motoru bunlari normalizasyondan ONCE ele alir; echo icerigi bozulmaz.
      const RAW_SHELL_COMMANDS = new Set(['echo', 'export', 'set', 'unset', 'touch', 'rm', 'del', 'which', 'cowsay', 'bugysay', 'sudo']);

      // Tek kabuk asamasi: cikti dizesi dondurur; YAZDIRMAZ, input'a dokunmaz.
      const execStage = async (rawStage) => {
        const stage = envExpand(String(rawStage).trim().slice(0, 520));
        if (!stage) return { ok: false, out: '' };
        const firstRaw = (stage.split(/\s+/)[0] || '').toLowerCase();
        const argRaw = stage.includes(' ') ? stage.slice(stage.indexOf(' ') + 1).trim() : '';
        if (RAW_SHELL_COMMANDS.has(firstRaw)) {
          switch (firstRaw) {
            case 'echo': return { ok: true, out: argRaw };
            case 'export': case 'set': {
              const m = argRaw.match(/^([A-Za-z_]\w*)\s*=\s*(.*)$/) || argRaw.match(/^([A-Za-z_]\w*)\s+(.+)$/);
              if (!m) return { ok: false, out: 'export: usage export AD=deger' };
              const res = envSet(m[1], m[2]);
              return { ok: !res.startsWith('export:'), out: res };
            }
            case 'unset': return { ok: true, out: unsetCommand(argRaw) };
            case 'touch': {
              const key = vfsName(argRaw);
              if (!key) return { ok: false, out: 'touch: gecersiz dosya adi.' };
              if (vfsRead(key) !== null) return { ok: true, out: `touch: /home/${key} zaten var (${vfsRead(key).length}b)` };
              return { ok: true, out: vfsWrite(key, '') };
            }
            case 'rm': case 'del': {
              if (/^-rf?\b/.test(argRaw)) return { ok: false, out: 'rm: guzel deneme. bu evren korumali; /home disinda silinecek bir sey yok.' };
              if (!argRaw) return { ok: false, out: 'rm: usage rm <dosya-adi>' };
              const res = vfsRemove(argRaw);
              return { ok: !res.startsWith('rm:'), out: res };
            }
            case 'which': return { ok: true, out: whichCommand(argRaw) };
            case 'cowsay': case 'bugysay': return { ok: true, out: cowsayCommand(argRaw) };
            case 'sudo': return { ok: true, out: sudoCommand(argRaw) };
          }
        }
        const command = expandAlias(applySynonyms(normalizeCommand(stage)));
        const parameterMatch = parameterActions.find(([prefix]) => command.startsWith(prefix));
        if (parameterMatch) {
          const result = parameterMatch[1](command.slice(parameterMatch[0].length));
          return { ok: true, out: result !== undefined ? String(result) : '' };
        }
        const action = commandMap[command];
        if (action) {
          const result = await action();
          return { ok: true, out: result !== undefined ? String(result) : '' };
        }
        return { ok: false, out: `bilinmeyen komut: ${command || stage}` };
      };

      // Boru hatti filtreleri (grep/head/tail/wc/sort/uniq/rev/nl/cowsay/tee).
      // Not: filtre argumanlarina normalizeCommand uygulanmaz (-i, -v, desen korunur).
      const applyFilter = (spec, input) => {
        const parts = envExpand(String(spec).trim()).split(/\s+/).filter(Boolean);
        const name = (parts.shift() || '').toLowerCase();
        const lines = String(input).split('\n');
        if (name === 'grep') {
          const flags = { i: false, v: false };
          while (parts[0] && /^-[iv]+$/.test(parts[0])) {
            const f = parts.shift();
            flags.i = flags.i || f.includes('i');
            flags.v = flags.v || f.includes('v');
          }
          const pattern = parts.join(' ').slice(0, 64);
          if (!pattern) return { ok: false, out: 'grep: desen gerekli (grep [-iv] <desen>)' };
          const needle = flags.i ? pattern.toLowerCase() : pattern;
          const hit = (l) => (flags.i ? l.toLowerCase() : l).includes(needle);
          const outLines = lines.filter(l => (flags.v ? !hit(l) : hit(l)));
          return { ok: true, out: outLines.length ? outLines.join('\n') : '(eslesme yok)' };
        }
        if (name === 'head' || name === 'tail') {
          let n = 10;
          const flagIdx = parts.indexOf('-n');
          if (flagIdx !== -1 && /^\d+$/.test(parts[flagIdx + 1] || '')) n = parseInt(parts[flagIdx + 1], 10);
          else if (/^\d+$/.test(parts[0] || '')) n = parseInt(parts[0], 10);
          n = Math.max(1, Math.min(n, 200));
          return { ok: true, out: (name === 'head' ? lines.slice(0, n) : lines.slice(-n)).join('\n') };
        }
        if (name === 'wc') {
          const text = String(input);
          if (parts.includes('-l')) return { ok: true, out: String(lines.length) };
          if (parts.includes('-w')) return { ok: true, out: String(text.split(/\s+/).filter(Boolean).length) };
          if (parts.includes('-c')) return { ok: true, out: String(text.length) };
          return { ok: true, out: `${lines.length} satir  ${text.split(/\s+/).filter(Boolean).length} kelime  ${text.length} karakter` };
        }
        if (name === 'sort') {
          const numeric = parts.includes('-n');
          const sorted = [...lines].sort(numeric ? (a, b) => parseFloat(a) - parseFloat(b) : (a, b) => a.localeCompare(b, 'tr'));
          if (parts.includes('-r')) sorted.reverse();
          return { ok: true, out: sorted.join('\n') };
        }
        if (name === 'uniq') {
          const withCount = parts.includes('-c');
          const outLines = [];
          let prev = null, count = 0;
          const flush = () => { if (prev !== null) outLines.push(withCount ? `${String(count).padStart(4)} ${prev}` : prev); };
          for (const l of lines) {
            if (l === prev) { count += 1; continue; }
            flush(); prev = l; count = 1;
          }
          flush();
          return { ok: true, out: outLines.join('\n') };
        }
        if (name === 'rev') return { ok: true, out: lines.map(l => [...l].reverse().join('')).join('\n') };
        if (name === 'nl') return { ok: true, out: lines.map((l, i) => `${String(i + 1).padStart(4)}  ${l}`).join('\n') };
        if (name === 'cowsay' || name === 'bugysay') {
          return { ok: true, out: cowsayCommand(lines.join(' / ').slice(0, 120)) };
        }
        if (name === 'tee') {
          if (!parts[0]) return { ok: false, out: 'tee: dosya adi gerekli (tee <dosya>)' };
          const res = vfsWrite(parts[0], input);
          return { ok: true, out: `${String(input)}\n[${res}]` };
        }
        return { ok: false, out: `${name || '?'}: boru hatti filtresi degil (grep/head/tail/wc/sort/uniq/rev/nl/cowsay/tee — bkz: shell)` };
      };

      // Kabuk satiri operator iceriyor mu? (pipe, zincir, yonlendirme, gecmis, ham komut)
      const isShellLine = (query) => {
        if (/^!/.test(query)) return true;
        if (query.includes('|') || query.includes('&&') || query.includes(';')) return true;
        if (/\s>>?\s*[\w.$-]+\s*$/.test(query)) return true;
        const first = (query.split(/\s+/)[0] || '').toLowerCase();
        return RAW_SHELL_COMMANDS.has(first);
      };

      // Kabuk satirini calistir: zincir (&& ;) -> her parcada boru hatti (|) ->
      // sonda yonlendirme (> >>). Tek birlesik cikti dondurur.
      const runShellLine = async (rawLine) => {
        const chainParts = String(rawLine).split(/(&&|;)/);
        const outputs = [];
        let lastOk = true;
        for (let i = 0; i < chainParts.length; i += 2) {
          const segment = (chainParts[i] || '').trim();
          const joiner = chainParts[i - 1]; // segmentten onceki operator
          if (joiner === '&&' && !lastOk) { outputs.push('(onceki komut basarisiz; && zinciri durdu)'); break; }
          if (!segment) continue;
          // Yonlendirme: sondaki "> dosya" / ">> dosya"
          let body = segment;
          let redirect = null;
          const rd = segment.match(/^(.*?)\s*(>>|>)\s*([\w.$-]+)\s*$/);
          if (rd && rd[1].trim()) { body = rd[1].trim(); redirect = { file: rd[3], append: rd[2] === '>>' }; }
          // Boru hatti
          const stages = body.split('|').map(s => s.trim()).filter(Boolean);
          if (!stages.length) { lastOk = false; outputs.push('kabuk: bos komut'); continue; }
          let result = await execStage(stages[0]);
          for (let s = 1; s < stages.length && result.ok; s += 1) {
            result = applyFilter(stages[s], result.out);
          }
          lastOk = result.ok;
          if (redirect && result.ok) {
            const written = vfsWrite(envExpand(redirect.file), result.out, redirect.append);
            outputs.push(written);
            lastOk = !written.startsWith('yaz:');
          } else if (result.out !== '') {
            outputs.push(result.out);
          }
        }
        return outputs.join('\n');
      };

      // Gecmis genisletme: !! (son), !N (N. komut), !metin (o metinle baslayan son).
      const expandHistory = (query) => {
        if (!/^!/.test(query)) return { query, expanded: false };
        const log = state.commandLog || [];
        const rest = query.slice(1).trim();
        let resolved = null;
        if (query.startsWith('!!')) resolved = (log[log.length - 1] || null) && log[log.length - 1] + query.slice(2);
        else if (/^\d+$/.test(rest)) resolved = log[parseInt(rest, 10) - 1] || null;
        else if (rest) resolved = [...log].reverse().find(c => c.startsWith(rest)) || null;
        return resolved
          ? { query: resolved, expanded: true }
          : { query, expanded: false, error: `kabuk: ${query}: gecmiste bulunamadi (history ile listele)` };
      };

      const runCommand = async (raw) => {
        let query = raw.trim().slice(0, 520);
        if (!query || commandInFlight) return;
        // Gizlilik-dostu sayac: oturumun ILK komutu (kimliksiz, oturumda 1 kez).
        window.ConviviumBackend?.recordSiteEvent?.('command.first', '/');
        // Gecmis genisletme (bash "!"): komut kaydindan ONCE cozulur.
        if (/^!/.test(query)) {
          const hist = expandHistory(query);
          if (hist.error) {
            transcriptEcho(query);
            printTerminal(hist.error);
            commandInput.value = '';
            clearCommandSuggestions();
            return;
          }
          if (hist.expanded) query = hist.query.trim().slice(0, 520);
        }
        const command = expandAlias(applySynonyms(normalizeCommand(query)));
        state.commands += 1;
        const prevLog = state.commandLog || [];
        // Ardisik tekrari yazma (bash ignoredups); gecmis son 30 komutu tutar.
        state.commandLog = prevLog[prevLog.length - 1] === query
          ? prevLog.slice(-30)
          : [...prevLog, query].slice(-30);
        if (state.commands >= 3) award(2);
        persist();
        audioCue('terminal.run');
        pulse(390, 0.055);
        // Komut ekosu transcript'e (pipe/outrun oyunu ekrani sahiplenirken atla).
        if (!pipeMod?.isActive() && !outrunMod?.isActive()) transcriptEcho(query);
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
        // Canli sohbet: mesaj govdesi ham metin kalsin diye normalize oncesi ele alinir.
        if (/^\s*(say|soyle|söyle)\s+\S/i.test(query)) {
          const rawBody = query.replace(/^\s*(say|soyle|söyle)\s+/i, '');
          const result = chatMod ? chatMod.say(rawBody) : 'say: sohbet modulu hazir degil.';
          // Basarili gonderim koruyucuda da kayar (hata metinleri "say:" ile baslar).
          if (!result.startsWith('say:')) screenSaverMod?.pushSignal?.(result);
          printTerminal(result);
          audioCue('terminal.complete');
          commandInput.value = '';
          clearCommandSuggestions();
          return;
        }
        // Sisedeki mesaj: throw govdesi ham metin kalsin diye normalize oncesi ele alinir.
        if (/^\s*(bottle|sise|şişe)(\s|$)/i.test(query)) {
          const rawArg = query.replace(/^\s*(bottle|sise|şişe)\s*/i, '');
          const result = await bottleCommand(rawArg);
          printTerminal(result);
          audioCue('terminal.complete');
          commandInput.value = '';
          clearCommandSuggestions();
          return;
        }
        // Kabuk satiri (pipe / && / ; / yonlendirme / ham komutlar): motor calisir.
        // Oracle'a DUSMEZ; bilinmeyen komut kabuk hatasi olarak doner.
        if (isShellLine(query)) {
          const shellOut = await runShellLine(query);
          emitResult(shellOut, query);
          audioCue('terminal.complete');
          commandInput.value = '';
          clearCommandSuggestions();
          return;
        }
        const action = commandMap[command];
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
          location.href = '/pages/ozgecmisim.html';
          commandInput.value = '';
          clearCommandSuggestions();
          return;
        }

        // Oracle'a dusmeden once: komut-benzeri bir yazim hatasi mi? "bunu mu demek istedin?"
        const suggestion = navigatorMod?.correct?.(command) || null;
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

      // Ctrl+R ters gecmis aramasi durumu (yazinca sifirlanir).
      let reverseSearch = null; // { needle, index }

      commandInput?.addEventListener('keydown', event => {
        // Teletype suruyorsa herhangi bir tusa basinca aninda tamamlansin (atlanabilir).
        if (terminalTypeTimer !== null) flushTerminalType();
        // Gercek terminal kisayollari (Ctrl+L/U/C/R). Kopyalama (Ctrl+C secimliyken)
        // bozulmasin diye ^C yalniz secim yokken komut iptali sayilir.
        if (event.ctrlKey && !event.altKey && !event.metaKey) {
          const ck = event.key.toLowerCase();
          if (ck === 'l') {
            event.preventDefault();
            emitResult(clearCommand(), 'clear');
            return;
          }
          if (ck === 'u') {
            event.preventDefault();
            commandInput.value = '';
            reverseSearch = null;
            renderCommandSuggestions('');
            return;
          }
          if (ck === 'c' && commandInput.selectionStart === commandInput.selectionEnd) {
            event.preventDefault();
            if (commandInput.value) transcriptEcho(`${commandInput.value}^C`);
            commandInput.value = '';
            reverseSearch = null;
            clearCommandSuggestions();
            return;
          }
          if (ck === 'r') {
            event.preventDefault();
            const log = state.commandLog || [];
            if (!log.length) return;
            if (!reverseSearch) reverseSearch = { needle: commandInput.value.trim(), index: log.length };
            for (let i = reverseSearch.index - 1; i >= 0; i -= 1) {
              if (!reverseSearch.needle || log[i].includes(reverseSearch.needle)) {
                reverseSearch.index = i;
                commandInput.value = log[i];
                renderCommandSuggestions(commandInput.value);
                return;
              }
            }
            reverseSearch.index = log.length; // basa sar (tekrar Ctrl+R en yeniden baslar)
            return;
          }
        }
        // Hafif tus-tik sesi (yalniz tek karakter; audio kapaliysa zaten sessiz).
        if (event.key && event.key.length === 1) audioCue('terminal.suggest');
        const matches = matchingCommands(commandInput.value);
        // OUT RUN: gercek-zamanli surus. Oklar HER ZAMAN direksiyon/gaz/fren olur,
        // boylece giris alaninda stray karakter olsa bile direksiyon kilitlenmez.
        // Space (gaz) ve form-gonderme yalniz giris bos iken yakalanir; "outrun quit"
        // 'o' ile basladigi icin yazimla cakismaz.
        if (outrunMod?.isActive()) {
          if (event.key === 'ArrowLeft') { event.preventDefault(); outrunMod.setKey('left', true); return; }
          if (event.key === 'ArrowRight') { event.preventDefault(); outrunMod.setKey('right', true); return; }
          if (event.key === 'ArrowUp') { event.preventDefault(); outrunMod.setKey('accel', true); return; }
          if (event.key === 'ArrowDown') { event.preventDefault(); outrunMod.setKey('brake', true); return; }
          if (!commandInput.value.trim()) {
            if (event.key === ' ') { event.preventDefault(); outrunMod.setKey('accel', true); return; }
            if (event.key === 'Enter') { event.preventDefault(); return; } // form gondermeyi engelle
          }
        }
        // PIPE: oklar HER ZAMAN imleci tasir (giris alaninda stray karakter olsa bile
        // kontroller kilitlenmesin). Eylem kisayollari (R/SPACE cevir, F akit, X dump,
        // Q cik, ENTER kaynak) yalniz giris bos iken calisir. "pipe ..." komutlari 'p'
        // ile basladigi icin bu harf kisayollariyla cakismaz; yazi yazmak serbest kalir.
        if (pipeMod?.isActive()) {
          if (event.key === 'ArrowUp') { event.preventDefault(); pipeMod.moveCursor(-1, 0); return; }
          if (event.key === 'ArrowDown') { event.preventDefault(); pipeMod.moveCursor(1, 0); return; }
          if (event.key === 'ArrowLeft') { event.preventDefault(); pipeMod.moveCursor(0, -1); return; }
          if (event.key === 'ArrowRight') { event.preventDefault(); pipeMod.moveCursor(0, 1); return; }
          if (!commandInput.value.trim()) {
            const key = event.key.toLowerCase();
            if (key === ' ' || key === 'r') { event.preventDefault(); if (commandOutput) commandOutput.textContent = pipeMod.rotate(); return; }
            if (key === 'f') { event.preventDefault(); if (commandOutput) commandOutput.textContent = pipeMod.flow(); return; }
            if (key === 'x') { event.preventDefault(); if (commandOutput) commandOutput.textContent = pipeMod.dump(); return; }
            if (key === 'q') { event.preventDefault(); printTerminal(pipeMod.command('quit')); return; }
            if (event.key === 'Enter') { event.preventDefault(); if (commandOutput) commandOutput.textContent = pipeMod.place(); return; }
          }
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          const selected = currentSuggestions[activeSuggestionIndex];
          if (isPersonalAliasCommand(commandInput.value)) {
            runCommand(commandInput.value);
          } else if (suggestionSelectionExplicit && selected) {
            applySuggestion(selected, true);
          } else if (selected && normalizeCommand(commandInput.value) !== normalizeCommand(selected.value)) {
            applySuggestion(selected);
          } else {
            runCommand(commandInput.value);
          }
        } else if (event.key === 'Tab' && !event.shiftKey) {
          event.preventDefault();
          applySuggestion(matches[activeSuggestionIndex] || matches[0] || commandInput.value);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          if (currentSuggestions.length && commandInput.value.trim()) {
            activeSuggestionIndex = (activeSuggestionIndex - 1 + currentSuggestions.length) % currentSuggestions.length;
            suggestionSelectionExplicit = true;
            syncActiveSuggestion();
            return;
          }
          const history = state.commandLog || [];
          if (!history.length) return;
          commandHistoryIndex = commandHistoryIndex < 0 ? history.length - 1 : Math.max(0, commandHistoryIndex - 1);
          commandInput.value = history[commandHistoryIndex] || '';
          renderCommandSuggestions(commandInput.value);
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          if (currentSuggestions.length && commandInput.value.trim()) {
            activeSuggestionIndex = (activeSuggestionIndex + 1) % currentSuggestions.length;
            suggestionSelectionExplicit = true;
            syncActiveSuggestion();
            return;
          }
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
        if (!outrunMod?.isActive()) return;
        if (event.key === 'ArrowLeft') outrunMod.setKey('left', false);
        else if (event.key === 'ArrowRight') outrunMod.setKey('right', false);
        else if (event.key === 'ArrowUp' || event.key === ' ') outrunMod.setKey('accel', false);
        else if (event.key === 'ArrowDown') outrunMod.setKey('brake', false);
      });
      // Odak/sekme kaybinda yapisik tus kalmasin.
      commandInput?.addEventListener('blur', () => { outrunMod?.clearInput(); });

      commandInput?.addEventListener('input', (event) => {
        commandHistoryIndex = -1;
        activeSuggestionIndex = 0;
        suggestionSelectionExplicit = false;
        reverseSearch = null;
        renderCommandSuggestions(event.currentTarget.value);
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
        location.href = '/account/auth.html';
      });

      window.addEventListener('convivium:audio-state', event => {
        if (typeof event.detail?.enabled !== 'boolean') return;
        audioEnabled = event.detail.enabled;
        if (!audioEnabled) radioMod?.stop();
        if (soundToggle) {
          soundToggle.textContent = audioEnabled ? 'audio on' : 'audio off';
          soundToggle.setAttribute('aria-pressed', String(audioEnabled));
        }
        persistUserPreferences({ audioEnabled });
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
        if (screenSaverMod?.isActive()) {
          // Koruyucuyu baslatan Enter komut girisinden kabarciklanip buraya
          // ayni anda ulasir; acan tusun koruyucuyu kapatmasina izin verme.
          if (event.target === commandInput) return;
          event.preventDefault();
          screenSaverMod.close();
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
        } else if (key === 'd') location.href = '/pages/makaleler.html';
        else if (key === 'l') location.href = '/games/cyberpunk-logic-game.html';
        else if (key === 't') location.href = '/games/three-body-signal.html';
        else if (key === 'b') location.href = '/games/ash-runner.html';
        else if (key === 'f') location.href = '/games/neon-river.html';
        else if (key === 'm') scrollToSection('map', 'signal map');
        else if (key === 'n') scrollToSection('notes', 'field notes');
        else if (key === 'a') location.href = '/account/auth.html';
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
      // Gunluk ilk ziyaret shard'i (lokal gun; sessiz ve kucuk).
      const shardDay = new Date().toISOString().slice(0, 10);
      if (state.lastShardDay !== shardDay) {
        state.lastShardDay = shardDay;
        awardShards(2, 'gunluk ilk ziyaret');
      }
      renderProtocolSurfaces();
      persist();
      resizeCanvas();
      drawMap();
      window.addEventListener('resize', resizeCanvas);
      window.addEventListener('resize', () => {
        if (!screenSaverMod?.isActive()) return;
        screenSaverMod.handleResize();
      });
      refreshAuthState();
})();
