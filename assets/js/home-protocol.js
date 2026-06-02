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
      const oracleEndpoint = 'https://text.pollinations.ai/';
      const oraclePrompt = [
        'Kisa, net, Turkce cevap ver.',
        'Convivium terminali tonunda ol.',
        'Dis servis, model veya API kullandigindan bahsetme.',
        'Bilmedigin konuda belirsizligi kisaca soyle.',
        'En fazla 4 cumle.',
        'Soru:'
      ].join(' ');
      const oracleWaitLines = [
        'oracle channel opening...',
        'signal queued. cevap bekleniyor...',
        'oracle hala dusunuyor. baglanti aktif...',
        'yanit paketleri toplanıyor...',
        'biraz gecikti ama islem devam ediyor...',
        'terminal hatta. cevabi bekliyorum...'
      ];
      const state = JSON.parse(localStorage.getItem(stateKey) || '{"visits":0,"level":0,"opened":[],"unlocked":[],"commands":0}');
      state.opened = Array.isArray(state.opened) ? state.opened : [];
      state.unlocked = Array.isArray(state.unlocked) ? state.unlocked : [];
      state.commandLog = Array.isArray(state.commandLog) ? state.commandLog.slice(-8) : [];
      state.rituals = Number.isFinite(state.rituals) ? state.rituals : 0;
      state.easterTrail = Array.isArray(state.easterTrail) ? state.easterTrail.slice(-4) : [];
      state.visits += 1;
      if (state.visits > 1) document.body.classList.add('returning-visitor');
      let signalIndex = 0;
      let audioEnabled = false;
      let audioContext = null;
      let commandInFlight = false;
      let commandHistoryIndex = -1;
      let activeSuggestionIndex = 0;
      let pendingOracleQuery = '';
      let lastFocusedElement = null;
      let pointer = { x: window.innerWidth * 0.72, y: window.innerHeight * 0.22 };
      let nodes = [];
      const authState = {
        checked: false,
        granted: false,
        label: 'INITIATE',
        user: null
      };

      const persist = () => localStorage.setItem(stateKey, JSON.stringify(state));

      const pulse = (frequency = 220, duration = 0.045) => {
        if (!audioEnabled) return;
        audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.045, audioContext.currentTime + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration + 0.02);
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

      const openCommand = () => {
        lastFocusedElement = document.activeElement;
        commandShell.classList.add('is-open');
        commandShell.setAttribute('aria-hidden', 'false');
        renderCommandSuggestions(commandInput.value);
        commandInput.focus();
        pulse(260);
      };

      const closeCommand = () => {
        commandShell.classList.remove('is-open');
        commandShell.setAttribute('aria-hidden', 'true');
        clearCommandSuggestions();
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
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

      const novaCommand = (action = 'summon') => {
        const nova = window.NovaCompanion;
        if (!nova) return 'nova: module not ready';
        if (action === 'summon') {
          nova.summon();
          return 'nova: companion online. try nova scan / nova meteor / nova blackhole / nova deathstar.';
        }
        if (action === 'off') {
          nova.deactivate();
          return 'nova: offline. bugy channel restored.';
        }
        nova.trigger(action);
        return `nova: ${action} protocol started`;
      };

      const bugyCommand = () => {
        window.BugyV3?.deactivate?.();
        window.BugyV2?.deactivate?.();
        window.Bugy?.summon?.();
        return window.NovaCompanion?.getState?.().active
          ? 'bugy: classic companion restored / nova still online'
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
          command: 'random',
          description: 'rastgele bir deneyim acar',
          aliases: ['shuffle', 'surprise', 'rastgele'],
          action: randomCommand
        },
        {
          command: 'nova',
          description: 'NOVA alternatif companion katmanini acar',
          aliases: ['summon nova', 'nova summon', 'nova companion'],
          action: () => novaCommand('summon')
        },
        {
          command: 'nova scan',
          description: 'NOVA aktif panelleri tarar',
          aliases: ['scan nova'],
          action: () => novaCommand('scan')
        },
        {
          command: 'nova rift',
          description: 'NOVA rota hafizasini katlar',
          aliases: ['rift nova'],
          action: () => novaCommand('rift')
        },
        {
          command: 'nova bloom',
          description: 'NOVA saha notlarini yukler',
          aliases: ['bloom nova'],
          action: () => novaCommand('bloom')
        },
        {
          command: 'nova mirror',
          description: 'NOVA imlec golgesini kopyalar',
          aliases: ['mirror nova'],
          action: () => novaCommand('mirror')
        },
        {
          command: 'nova sleep',
          description: 'NOVA sinyalini dusuk guce alir',
          aliases: ['nova dim'],
          action: () => novaCommand('sleep')
        },
        {
          command: 'nova meteor',
          description: 'NOVA meteor formuyla Bugy etkilesimi baslatir',
          aliases: ['meteor nova', 'nova meteorit', 'nova asteroid', 'nova impact', 'nova carpis', 'nova çarpış'],
          action: () => novaCommand('meteor')
        },
        {
          command: 'nova blackhole',
          description: 'NOVA karadelik formuyla Bugy etkilesimi baslatir',
          aliases: ['nova black hole', 'blackhole nova', 'nova karadelik', 'nova kara delik', 'kara delik nova'],
          action: () => novaCommand('blackhole')
        },
        {
          command: 'nova deathstar',
          description: 'NOVA orbital lazer sekansini baslatir',
          aliases: ['nova death star', 'nova deatstar', 'deatstar nova', 'deathstar nova', 'nova laser', 'nova lazer', 'nova beam'],
          action: () => novaCommand('deathstar')
        },
        {
          command: 'nova off',
          description: 'NOVA katmanini kapatir',
          aliases: ['dismiss nova'],
          action: () => novaCommand('off')
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

      const keyboardHelpText = () => 'keyboard: D dossier, L logic, B ash, F flow, M map, N notes, A access, ? command shell, Ctrl+K command shell, Tab complete, Up/Down history, ESC close';

      const commandHelpText = () => [
        'routes:',
        'home, map, archive, notes, open dossier, run logic, run ash, run flow',
        '',
        'lab:',
        'dart, bartender, barista, barista v2, realists bar, open oracle, paradox, universe',
        '',
        'system:',
        'whoami, log, clear, random, level, access, dashboard, nova, bugy',
        '',
        'nova ops:',
        'nova scan, nova meteor, nova blackhole, nova deathstar, nova off',
        '',
        'hidden:',
        'signal -> oracle -> manifest -> unlock hidden, clues',
        '',
        'Bilinmeyen metinler oracle kanalina onaydan sonra gonderilir: oracle yes'
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

      const askOracleFallback = async (command) => {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 90000);
        const prompt = `${oraclePrompt} ${command}`;

        try {
          const response = await fetch(`${oracleEndpoint}${encodeURIComponent(prompt)}`, {
            signal: controller.signal
          });

          if (!response.ok) {
            throw new Error(`oracle status ${response.status}`);
          }

          const answer = normalizeOracleAnswer(await response.text());
          if (!answer) {
            throw new Error('empty oracle response');
          }

          return answer;
        } finally {
          window.clearTimeout(timeout);
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
          if (commandOutput) commandOutput.textContent = 'oracle channel noisy. tekrar dene ya da hazir komutlardan birini kullan.';
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

        pendingOracleQuery = query;
        if (commandOutput) commandOutput.textContent = `oracle confirmation required:\n"${query}"\n\nBu soru dis oracle kanalina gonderilecek. Devam etmek icin "oracle yes" yaz.`;
        if (microOracle) microOracle.textContent = 'oracle awaiting confirmation';
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

      soundToggle?.addEventListener('click', () => {
        audioEnabled = !audioEnabled;
        soundToggle.textContent = audioEnabled ? 'audio on' : 'audio off';
        soundToggle.setAttribute('aria-pressed', String(audioEnabled));
        pulse(440, 0.06);
      });

      window.addEventListener('pointermove', event => {
        const x = Math.round((event.clientX / window.innerWidth) * 100);
        const y = Math.round((event.clientY / window.innerHeight) * 100);
        pointer = { x: event.clientX, y: event.clientY };
        document.body.style.setProperty('--mx', `${x}%`);
        document.body.style.setProperty('--my', `${y}%`);
      }, { passive: true });

      document.addEventListener('keydown', event => {
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

