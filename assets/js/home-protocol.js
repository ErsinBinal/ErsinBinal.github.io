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
      let commandBootTimer = null;
      let commandCloseTimer = null;
      let pendingOracleQuery = '';
      let lastFocusedElement = null;
      let powerOverlay = null;
      let powerSequenceTimers = [];
      let virtualCwd = '/';
      let transcript = '';
      // Terminal oyunlari + ekran koruyucu ayri modullerde yasar
      // (assets/js/home/pipe-90.js, outrun-86.js, screen-saver.js);
      // asagida bagimliliklariyla kurulup bu tutuculara atanir.
      let pipeMod = null;
      let outrunMod = null;
      let screenSaverMod = null;
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
          virtualCwd,
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
        setLastFocused: (el) => { lastFocusedElement = el; }
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

      // --- Kabuk cekirdegi (Dalga 9a): kalici sanal dosyalar (/home) + env ---
      // Guvenlik: tum icerik textContent ile basilir (HTML yorumlanmaz), eval yok,
      // localStorage ayni-origin'dir; ad/boyut/adet tavanlari asagida zorlanir.
      const VFS_KEY = 'convivium.shell.files';
      const VFS_MAX_FILES = 24;
      const VFS_MAX_NAME = 32;
      const VFS_MAX_CONTENT = 4000;
      const vfsLoad = () => {
        try {
          const raw = JSON.parse(localStorage.getItem(VFS_KEY) || '{}');
          return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
        } catch { return {}; }
      };
      const vfsSave = (files) => {
        try { localStorage.setItem(VFS_KEY, JSON.stringify(files)); } catch { /* dolu/kapali */ }
      };
      // Dosya adi: kucuk-harf slug (+ opsiyonel .txt/.md/.log uzantisi), yol ayraci yok.
      const vfsName = (input = '') => {
        const cleaned = String(input).toLowerCase().trim()
          .replace(/^\/?(home\/)?/, '')
          .replace(/[ıİ]/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
          .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
          .replace(/[^a-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
        if (!cleaned || cleaned.length > VFS_MAX_NAME) return null;
        return cleaned;
      };
      const vfsList = () => Object.keys(vfsLoad()).sort();
      const vfsRead = (name) => {
        const key = vfsName(name);
        if (!key) return null;
        const files = vfsLoad();
        return Object.prototype.hasOwnProperty.call(files, key) ? files[key] : null;
      };
      const vfsWrite = (name, content, append = false) => {
        const key = vfsName(name);
        if (!key) return `yaz: gecersiz dosya adi (kucuk harf, rakam, tire; en cok ${VFS_MAX_NAME} karakter).`;
        const files = vfsLoad();
        const exists = Object.prototype.hasOwnProperty.call(files, key);
        if (!exists && Object.keys(files).length >= VFS_MAX_FILES) {
          return `yaz: /home dolu (en cok ${VFS_MAX_FILES} dosya). "rm <ad>" ile yer ac.`;
        }
        const body = (append && exists ? files[key] + '\n' : '') + String(content ?? '');
        if (body.length > VFS_MAX_CONTENT) return `yaz: dosya cok buyuk (tavan ${VFS_MAX_CONTENT} karakter).`;
        files[key] = body;
        vfsSave(files);
        return `${append && exists ? 'eklendi' : 'yazildi'}: /home/${key} (${body.length} karakter)`;
      };
      const vfsRemove = (name) => {
        const key = vfsName(name);
        const files = vfsLoad();
        if (!key || !Object.prototype.hasOwnProperty.call(files, key)) return `rm: ${name || '?'}: /home altinda boyle bir dosya yok`;
        delete files[key];
        vfsSave(files);
        return `silindi: /home/${key}`;
      };

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
        if (name === 'CWD') return virtualCwd;
        if (name === 'USER') return 'ziyaretci';
        if (name === 'RANDOM') return String(Math.floor(Math.random() * 32768));
        if (name === 'DATE') return new Date().toLocaleDateString('tr-TR');
        if (name === 'CMDS') return String(state.commands || 0);
        const vars = envLoad();
        return Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : m;
      });

      const virtualFs = {
        '/': ['routes', 'lab', 'notes', 'system', 'vault', 'home'],
        '/routes': ['home', 'map', 'archive', 'notes', 'open dossier'],
        '/lab': ['run logic', 'run signal', 'run ash', 'run flow', 'pipe', 'outrun'],
        '/notes': ['quote', 'note', 'ritual', 'manifest', 'clues'],
        '/system': ['whoami', 'uptime', 'version', 'memory', 'ps', 'shutdown', 'restart', 'screen saver'],
        '/vault': ['satir'],
        '/core': ['cekirdek', 'gunluk'],
        '/atlas': ['harita', 'imza'],
        '/home': []
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
        if (path === '/home') {
          const files = vfsLoad();
          const names = Object.keys(files).sort();
          if (!names.length) return '/home: (bos) — "echo merhaba > not.txt" ile ilk dosyani yaz.';
          return [`/home: ${names.length}/${VFS_MAX_FILES} dosya`, ...names.map(n => `  ${n}  (${files[n].length}b)`)].join('\n');
        }
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
        // Once kullanicinin /home dosyalari (echo > ile yazilanlar), sonra public dokumanlar.
        const file = vfsRead(target);
        if (file !== null) return file === '' ? '(bos dosya)' : file;
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
          if (/giris/i.test(msg)) return 'mark: iz birakmak icin once giris yap (/account/auth.html).';
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
        `002  ${screenSaverMod?.isActive() ? 'RUN' : 'IDLE'}     screen.saver`,
        `003  ${powerOverlay?.classList.contains('is-active') || powerOverlay?.classList.contains('is-off') ? 'RUN' : 'IDLE'}     power.overlay`,
        `004  ${(window.DebCompanion || window.NovaCompanion)?.getState?.().active ? 'RUN' : 'IDLE'}     deb.companion`,
        `005  ${commandInFlight ? 'WAIT' : 'IDLE'}     oracle.channel`,
        `006  ${pipeMod?.isActive() ? 'RUN' : 'IDLE'}     pipe.game`
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
        if (commandVocab.includes(key)) return `${key}: yerlesik terminal komutu`;
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
          command: 'guide',
          description: 'terminal icinde kisa iki dilli rehber ozeti verir',
          aliases: ['site guide', 'terminal guide', 'rehberler', 'kullanim rehberi', 'kullanım rehberi'],
          action: () => guideBriefCommand('terminal')
        },
        {
          command: 'read guide',
          description: 'terminal rehberinin uzun makalesini acar',
          aliases: ['open guide', 'guide article', 'rehberi oku', 'terminal rehberini oku'],
          action: goTo(route('guide', '/pages/makaleler.html#convivium-terminal-rehberi-terminal-guide'))
        },
        {
          command: 'how to play',
          description: 'oyunlar icin terminal icinde kisa oynanis ozeti verir',
          aliases: ['howto', 'nasil oynanir', 'nasıl oynanır'],
          action: () => guideBriefCommand('games')
        },
        {
          command: 'game guide',
          description: 'oyunlar icin terminal icinde kisa rehber ozeti verir',
          aliases: ['games guide', 'oyun rehberi', 'oyun kilavuzu', 'oyun kılavuzu', 'how to play games', 'how to play ash', 'how to play serpent', 'how to play logic', 'how to play signal', 'ash guide', 'serpent guide', 'logic guide', 'signal guide', 'river guide'],
          action: () => guideBriefCommand('games')
        },
        {
          command: 'read game guide',
          description: 'Convivium oyunlari icin how-to-play makalesini acar',
          aliases: ['read games guide', 'open game guide', 'open games guide', 'oyun rehberini oku'],
          action: goTo(route('gamesGuide', '/pages/makaleler.html#oyunlar-how-to-play-games-guide'))
        },
        {
          command: 'app guide',
          description: 'Oracle ve ritual araclari icin terminal icinde kisa ozet verir',
          aliases: ['apps guide', 'tools guide', 'uygulama rehberi', 'arac rehberi', 'araç rehberi', 'oracle guide', 'barista guide', 'bartender guide', 'ekol guide'],
          action: () => guideBriefCommand('apps')
        },
        {
          command: 'read app guide',
          description: 'Oracle ve ritual araclari icin kullanim makalesini acar',
          aliases: ['read apps guide', 'open app guide', 'open apps guide', 'uygulama rehberini oku'],
          action: goTo(route('appsGuide', '/pages/makaleler.html#uygulamalar-apps-guide'))
        },
        {
          command: 'terminal games',
          description: 'terminal icindeki Pipe-90i ve Out Run 86 icin kisa ozet verir',
          aliases: ['shell games', 'pipe guide', 'outrun guide', 'pipe how to play', 'outrun how to play', 'terminal oyunlari', 'terminal oyunları'],
          action: () => guideBriefCommand('shellGames')
        },
        {
          command: 'read terminal games',
          description: 'terminal oyunlari makalesini acar',
          aliases: ['open terminal games', 'read shell games', 'open shell games', 'terminal oyunlarini oku', 'terminal oyunlarını oku'],
          action: goTo(route('terminalGamesGuide', '/pages/makaleler.html#terminal-oyunlari-pipe-outrun-guide'))
        },
        {
          command: 'score guide',
          description: 'skor, oturum, dashboard ve dart icin kisa ozet verir',
          aliases: ['dashboard guide', 'dart guide', 'skor rehberi', 'oturum rehberi', 'scoreboard guide'],
          action: () => guideBriefCommand('score')
        },
        {
          command: 'read score guide',
          description: 'skor, oturum, dashboard ve dart makalesini acar',
          aliases: ['open score guide', 'read dashboard guide', 'open dashboard guide', 'skor rehberini oku'],
          action: goTo(route('scoreGuide', '/pages/makaleler.html#skor-oturum-dashboard-guide'))
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
          action: goTo(route('dossier', '/pages/makaleler.html'))
        },
        {
          command: 'run logic',
          description: 'Cyberpunk Logic oyununu acar',
          aliases: ['logic', 'cyberpunk logic', 'logic game', 'mantik', 'mantık'],
          action: goTo(route('logic', '/games/cyberpunk-logic-game.html'))
        },
        {
          command: 'run signal',
          description: 'Uc Gunes Sinyali oyununu acar',
          aliases: ['signal game', 'three body', 'three body signal', 'uc gunes', 'üç güneş', 'uc cisim', 'üç cisim', 'relay'],
          action: goTo(route('signal', '/games/three-body-signal.html'))
        },
        {
          command: 'run ash',
          description: 'Ash Runner oyununu acar',
          aliases: ['ash', 'ash runner', 'scrap', 'brawler'],
          action: goTo(route('ash', '/games/ash-runner.html'))
        },
        {
          command: 'run ash2',
          description: 'Kul Hatti II: Yorunge oyununu acar',
          aliases: ['ash2', 'ash runner 2', 'kul hatti 2', 'kül hattı 2', 'yorunge', 'yörünge'],
          action: goTo(route('ash2', '/games/ash-runner-2.html'))
        },
        {
          command: 'run flow',
          description: 'Neon River deneyimini acar',
          aliases: ['flow', 'neon river', 'river'],
          action: goTo(route('flow', '/games/neon-river.html'))
        },
        {
          command: 'run serpent',
          description: 'Neon Serpent (yilan) oyununu acar',
          aliases: ['serpent', 'snake', 'yilan', 'yılan', 'neon serpent'],
          action: goTo(route('serpent', '/games/neon-serpent.html'))
        },
        {
          command: 'run crude',
          description: 'Crude Buster (online co-op beat em up) oyununu acar',
          aliases: ['crude', 'crude buster', 'buster', 'coop', 'co-op', 'beat em up'],
          action: goTo(route('crude', '/games/crude-buster.html'))
        },
        {
          command: 'dart',
          description: 'dart skorboard ekranini acar',
          aliases: ['skorbord', 'scoreboard', 'dart skorbord', 'dart skor', 'scores'],
          action: goTo(route('dart', '/tools/dart-skorbord.html'))
        },
        {
          command: 'bartender',
          description: 'kokteyl asistani',
          aliases: ['bar', 'cocktail', 'kokteyl'],
          action: goTo(route('bartender', '/tools/bartender.html'))
        },
        {
          command: 'barista',
          description: 'kahve asistani',
          aliases: ['coffee', 'kahve'],
          action: goTo(route('barista', '/tools/barista.html'))
        },
        {
          command: 'realists bar',
          description: 'The Realists Bar sayfasi',
          aliases: ['the realists bar', 'realists'],
          action: goTo(route('realistsBar', '/tools/the-realists-bar.html'))
        },
        {
          command: 'open oracle',
          description: 'The Oracle deneyimini acar',
          aliases: ['the oracle', 'oracle page'],
          action: goTo(route('oracle', '/oracle/'))
        },
        {
          command: 'paradox',
          description: 'Paradox Terminal sayfasi',
          aliases: ['paradox terminal', 'terminal'],
          action: goTo(route('paradox', '/tools/paradox-terminal.html'))
        },
        {
          command: 'ekol',
          description: 'Ekol Aynasi - dusunce ekolu testi',
          aliases: ['ayna', 'ekol aynasi', 'ekol aynası', 'mirror', 'schools'],
          action: goTo(route('ekolAynasi', '/tools/ekol-aynasi.html'))
        },
        {
          command: 'bugy studio',
          description: 'Bugy Studio deney aracini acar',
          aliases: ['bugy lab', 'studio bugy', 'pet studio'],
          action: goTo(route('bugyStudio', '/tools/bugy-studio.html'))
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
          action: goTo(route('profile', '/pages/ozgecmisim.html'))
        },
        {
          command: 'access',
          description: 'giris ekranini acar',
          aliases: ['login', 'auth', 'giris', 'giriş'],
          action: goTo(route('auth', '/account/auth.html'))
        },
        {
          command: 'dashboard',
          description: 'dashboard ekranini acar',
          aliases: ['dash', 'panel'],
          action: goTo(route('dashboard', '/account/dashboard.html'))
        },
        {
          command: 'admin',
          description: 'admin ekranini acar',
          aliases: ['manage', 'yonetim', 'yönetim'],
          action: goTo(route('admin', '/admin/'))
        },
        {
          command: 'universe',
          description: 'Universe-2 deneyimini acar',
          aliases: ['universe 2', 'u2', 'evren'],
          action: goTo(route('universe', '/games/universe-2.html'))
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

      const commandHelpText = () => [
        '] basla -> adim adim rehber',
        '] guide / how to play -> terminal icinde kisa rehber',
        '] read guide / read game guide -> makaleler alaninda uzun okuma',
        '',
        'world (kesif):',
        'look, examine <nesne>, take <nesne>, inventory, cd <oda>, unlock <oda>, use <x> on <y>',
        '',
        'routes:',
        'home, map, archive, notes, open dossier, guide, read guide, game guide, read game guide, app guide, open oracle, dashboard, run logic, run signal, run ash, run flow, run serpent',
        '',
        'lab:',
        'dart, bartender, barista, realists bar, open oracle, paradox, ekol, universe, bugy studio, pipe, outrun',
        '',
        'system:',
        'whoami, uptime, date, version, memory, ps, log, changelog, clear, random, shutdown, restart, screen saver',
        '',
        'terminal:',
        'ls, pwd, cd lab, cat about, tree, find oracle, theme green, volume on, scan, next, tour, badge, blackout',
        '',
        'kabuk (ayrinti: shell):',
        'echo, export, env, touch, rm, which, history, fortune, cowsay, sudo',
        'boru hatti: help | grep oyun · yonlendirme: fortune > soz.txt · zincir: cd lab && look · gecmis: !!, !3, Ctrl+R',
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
        'thread 3: use shard on coolant -> prism -> unlock atlas -> cd atlas (ARCHITECT)',
        '(soylenti: sinyal TAMAMEN koptugunda terminal baska bir yuz gosterirmis. kablonu cek, gor.)'
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
        if (!commandInput || pipeMod?.isActive()) return;
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
        reverseSearch = null;
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
        location.href = '/account/auth.html';
      });

      window.addEventListener('convivium:audio-state', event => {
        if (typeof event.detail?.enabled !== 'boolean') return;
        audioEnabled = event.detail.enabled;
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
