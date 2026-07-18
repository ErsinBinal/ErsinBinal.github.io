(() => {
  'use strict';

  const root = window.ConviviumHome = window.ConviviumHome || {};

  const deepFreeze = (value) => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };

  const navigationIntentRegistry = deepFreeze([
    {
      id: 'kesfet',
      label: 'KESFET',
      aliases: ['kesif', 'explore'],
      brief: 'look · cd · map',
      description: 'Terminal odalarini ve gorunur izleri kesfet.',
      commands: [
        ['look', 'bulundugun yeri oku'],
        ['cd <oda>', 'terminal odasina gec'],
        ['examine <nesne>', 'gorunur bir izi incele'],
        ['map', 'genel sinyal haritasina bak']
      ]
    },
    {
      id: 'oku',
      label: 'OKU',
      aliases: ['read'],
      brief: 'open dossier · notes',
      description: 'Makalelere, notlara ve yayin izlerine ulas.',
      commands: [
        ['open dossier', 'makale ve uzun notlar'],
        ['notes', 'kisa saha notlari'],
        ['archive', 'arsiv katmani'],
        ['changelog', 'son degisiklik sinyalleri']
      ]
    },
    {
      id: 'oyna',
      label: 'OYNA',
      aliases: ['oyun', 'play'],
      brief: 'game guide · run logic',
      description: 'Oyun ve oynanabilir deneyimleri baslat.',
      commands: [
        ['game guide', 'kisa oyun secicisi'],
        ['run logic', 'dusunme bulmacasi'],
        ['run ash', 'hareket ve refleks'],
        ['pipe · outrun', 'terminal ici oyunlar']
      ]
    },
    {
      id: 'rituel',
      label: 'RITUEL',
      aliases: ['ritual'],
      brief: 'open oracle · daily · card',
      description: 'Gunluk sinyal, Oracle ve kisisel ritleri ac.',
      commands: [
        ['open oracle', 'karar ve isaret deneyimi'],
        ['daily', 'gunun ortak sinyali'],
        ['card · collect', 'gunun karti ve koleksiyon'],
        ['shop', 'signal shard kozmetikleri']
      ]
    },
    {
      id: 'baglan',
      label: 'BAGLAN',
      aliases: ['sosyal', 'connect'],
      brief: 'who · chat · wall',
      description: 'Diger gezginlerin canli ve gecikmeli izlerini hisset.',
      commands: [
        ['who', 'yakindaki anonim sinyaller'],
        ['chat', 'canli sohbet guvertesi'],
        ['wall · mark', 'oda izlerini oku veya birak'],
        ['bottle', 'sisedeki asenkron mesaj']
      ]
    },
    {
      id: 'sistem',
      label: 'SISTEM',
      aliases: ['system', 'shell'],
      brief: 'pwd · ls · man',
      description: 'Kabuk, dosya sistemi ve erisilebilirlik kontrolleri.',
      commands: [
        ['pwd · ls · cat', 'konum ve dosya okuma'],
        ['man <komut>', 'tek komut kilavuzu'],
        ['keys', 'klavye kisayollari'],
        ['shell', 'ileri kabuk ozeti']
      ]
    }
  ]);

  const CONTEXT_COMMANDS = Object.freeze({
    '/': Object.freeze(['look', 'help', 'map', 'open dossier', 'cd routes', 'cd notes', 'cd lab', 'cd ruins']),
    '/routes': Object.freeze(['look', 'open dossier', 'map', 'home']),
    '/lab': Object.freeze(['look', 'game guide', 'run logic', 'run signal', 'run ash', 'pipe', 'outrun']),
    '/notes': Object.freeze(['look', 'examine clues', 'take shard', 'open dossier']),
    '/system': Object.freeze(['look', 'whoami', 'memory', 'ps', 'help system']),
    '/vault': Object.freeze(['look', 'examine satir', 'wall', 'cd /']),
    '/core': Object.freeze(['look', 'examine gunluk', 'use shard on coolant', 'cd /']),
    '/atlas': Object.freeze(['look', 'examine harita', 'wall', 'cd /']),
    '/home': Object.freeze(['ls', 'cat about', 'pwd', 'cd /'])
  });

  const CORE_PRIORITY = Object.freeze([
    'help', 'look', 'map', 'home', 'open dossier', 'game guide', 'open oracle',
    'how to play', 'history', 'pwd', 'ls', 'man'
  ]);

  const editDistance = (left, right) => {
    if (Math.abs(left.length - right.length) > 2) return 99;
    const row = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let i = 1; i <= left.length; i += 1) {
      let diagonal = row[0];
      row[0] = i;
      for (let j = 1; j <= right.length; j += 1) {
        const previous = row[j];
        row[j] = Math.min(
          row[j] + 1,
          row[j - 1] + 1,
          diagonal + (left[i - 1] === right[j - 1] ? 0 : 1)
        );
        diagonal = previous;
      }
    }
    return row[right.length];
  };

  function createNavigator({
    normalizeCommand,
    getCwd,
    listRooms,
    getRoom,
    getObjective,
    getCommandDefinitions
  } = {}) {
    const dependencies = {
      normalizeCommand,
      getCwd,
      listRooms,
      getRoom,
      getObjective,
      getCommandDefinitions
    };
    const missing = Object.entries(dependencies)
      .filter(([, value]) => typeof value !== 'function')
      .map(([name]) => name);
    if (missing.length) {
      throw new TypeError(`createNavigator: zorunlu fonksiyonlar eksik: ${missing.join(', ')}`);
    }

    const normalized = (value) => normalizeCommand(String(value || ''));
    const commandDefinitions = () => {
      const value = getCommandDefinitions();
      return Array.isArray(value) ? value : [];
    };
    const currentPath = () => {
      const value = String(getCwd() || '/');
      return value.startsWith('/') ? value : `/${value}`;
    };
    const prodosPath = () => {
      const path = currentPath();
      return path === '/' ? '/CONVIVIUM' : `/CONVIVIUM${path.toUpperCase()}`;
    };

    const help = (topic = '') => {
      const key = normalized(topic);
      if (!key) {
        const objective = String(getObjective() || 'look ile bulundugun yeri oku').trim();
        return [
          '] SINYAL PUSULASI',
          '',
          ...navigationIntentRegistry.map((intent) => `  ${`${intent.label}        `.slice(0, 9)}${intent.brief}`),
          `  BURADAYIM ${prodosPath()}`,
          `  SIRADAKI ${objective}`,
          '  DERINLES help kesfet · TAM LISTE help all',
          ']'
        ].join('\n');
      }

      const intent = navigationIntentRegistry.find((entry) =>
        entry.id === key || entry.aliases.some((alias) => normalized(alias) === key)
      );
      if (!intent) {
        return `help: "${topic}" frekansi yok. sec: kesfet, oku, oyna, rituel, baglan, sistem, all`;
      }

      return [
        `] PUSULA / ${intent.label}`,
        '',
        `  ${intent.description}`,
        ...intent.commands.map(([command, description]) => `  ${`${command}                `.slice(0, 16)}${description}`),
        '',
        '  GERI help',
        ']'
      ].join('\n');
    };

    const liveContextCommands = () => {
      const path = currentPath();
      const room = getRoom(path);
      const roomNavigation = Array.isArray(room?.navigation) ? room.navigation : [];
      const objects = room?.objects && typeof room.objects === 'object'
        ? Object.keys(room.objects)
        : [];
      const orderedObjects = objects.includes('buluntu')
        ? ['buluntu', ...objects.filter((name) => name !== 'buluntu')]
        : objects;
      const objectCommands = orderedObjects.slice(0, 3).map((name) => `examine ${name}`);
      return [...new Set([
        ...roomNavigation,
        ...(CONTEXT_COMMANDS[path] || ['look', 'help', 'map']),
        ...objectCommands,
        'help'
      ].map(String))];
    };

    const addCandidate = (candidates, item) => {
      if (!item?.value || item.score < 0) return;
      const key = normalized(item.value);
      if (!key) return;
      const existing = candidates.get(key);
      if (!existing || item.score > existing.score) candidates.set(key, item);
    };

    const parameterCandidates = (query, candidates) => {
      const rooms = listRooms();
      const roomList = Array.isArray(rooms) ? rooms : [];
      if (query === 'cd' || query.startsWith('cd ')) {
        roomList.forEach((path, index) => {
          const clean = String(path || '').replace(/^\//, '');
          const value = path === '/' ? 'cd /' : `cd ${clean}`;
          if (normalized(value).startsWith(query)) {
            addCandidate(candidates, { value, description: 'terminal odasi', reason: 'tamamla', score: 1200 - index });
          }
        });
      }

      const room = getRoom(currentPath());
      const objects = room?.objects && typeof room.objects === 'object' ? Object.keys(room.objects) : [];
      if (query === 'examine' || query.startsWith('examine ')) {
        objects.forEach((name, index) => {
          const value = `examine ${name}`;
          if (normalized(value).startsWith(query)) {
            addCandidate(candidates, { value, description: 'buradaki iz', reason: 'baglam', score: 1200 - index });
          }
        });
      }

      if (query === 'help' || query.startsWith('help ')) {
        navigationIntentRegistry.forEach((intent, index) => {
          const value = `help ${intent.id}`;
          if (normalized(value).startsWith(query)) {
            addCandidate(candidates, { value, description: `${intent.label.toLowerCase()} pusulasi`, reason: 'tamamla', score: 1200 - index });
          }
        });
        if (normalized('help all').startsWith(query)) {
          addCandidate(candidates, { value: 'help all', description: 'tam komut dokumu', reason: 'tamamla', score: 1100 });
        }
      }

      if (query === 'man' || query.startsWith('man ')) {
        commandDefinitions().forEach((entry, index) => {
          const value = `man ${entry.command}`;
          if (normalized(value).startsWith(query)) {
            addCandidate(candidates, { value, description: 'komut kilavuzu', reason: 'tamamla', score: 1200 - index });
          }
        });
      }
    };

    const matchCommand = (entry, query, contextRank) => {
      const command = normalized(entry.command);
      const aliases = Array.isArray(entry.aliases) ? entry.aliases.map(normalized) : [];
      let score = -1;
      let reason = '';

      if (command === query) {
        score = 1000;
        reason = 'hazir';
      } else if (command.startsWith(query)) {
        score = 800;
        reason = 'tamamla';
      } else if (query.length >= 2 && command.split(' ').some((word) => word.startsWith(query))) {
        score = 690;
        reason = 'tamamla';
      } else if (aliases.some((alias) => alias === query)) {
        score = 760;
        reason = 'esanlamli';
      } else if (aliases.some((alias) => alias.startsWith(query))) {
        score = 700;
        reason = 'esanlamli';
      } else if (query.length >= 2 && aliases.some((alias) => alias.includes(query))) {
        score = 560;
        reason = 'esanlamli';
      } else if (query.length >= 3 && !query.includes(' ')) {
        const distance = editDistance(command, query);
        if (distance <= 2) {
          score = 430 - (distance * 10);
          reason = 'duzelt';
        }
      }

      if (score < 0) return null;
      if (contextRank.has(command)) score += 220 - Math.min(contextRank.get(command), 20);
      const coreIndex = CORE_PRIORITY.indexOf(command);
      if (coreIndex >= 0) score += 100 - coreIndex;
      return {
        value: entry.command,
        description: entry.description || 'terminal komutu',
        reason,
        score
      };
    };

    const suggest = (raw, { limit = 3 } = {}) => {
      const query = normalized(raw);
      if (!query) return Object.freeze([]);
      const safeLimit = Math.max(1, Math.min(3, Number(limit) || 3));
      const candidates = new Map();
      const contextCommands = liveContextCommands();
      const contextRank = new Map(contextCommands.map((command, index) => [normalized(command), index]));

      contextCommands.forEach((value, index) => {
        const command = normalized(value);
        if (command.startsWith(query)) {
          addCandidate(candidates, {
            value,
            description: 'buradaki akisa uygun',
            reason: 'baglam',
            score: 1300 - index
          });
        }
      });
      parameterCandidates(query, candidates);
      commandDefinitions().forEach((entry) => addCandidate(candidates, matchCommand(entry, query, contextRank)));

      const ranked = [...candidates.values()];
      const hasDirectMatch = ranked.some((item) => item.reason !== 'duzelt');
      const result = ranked
        .filter((item) => !hasDirectMatch || item.reason !== 'duzelt')
        .sort((left, right) => right.score - left.score || left.value.length - right.value.length || left.value.localeCompare(right.value))
        .slice(0, safeLimit)
        .map(({ score, ...item }) => Object.freeze(item));
      return Object.freeze(result);
    };

    return Object.freeze({ help, suggest });
  }

  root.navigationIntentRegistry = navigationIntentRegistry;
  root.createNavigator = createNavigator;
})();
