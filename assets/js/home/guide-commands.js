(() => {
  'use strict';

  const root = window.ConviviumHome = window.ConviviumHome || {};

  const freezeEntry = (entry) => Object.freeze({
    ...entry,
    aliases: Object.freeze([...entry.aliases])
  });

  const guideCommandRegistry = Object.freeze([
    {
      command: 'basla',
      description: 'yeni gelenler icin adim adim baslangic rehberi',
      aliases: ['başla', 'rehber'],
      handler: 'basla'
    },
    {
      command: 'help',
      description: 'tum kisayol komutlarini listeler',
      aliases: ['?', 'yardim', 'komutlar', 'commands', 'shortcuts'],
      handler: 'help'
    },
    {
      command: 'guide',
      description: 'terminal icinde kisa iki dilli rehber ozeti verir',
      aliases: ['site guide', 'terminal guide', 'rehberler', 'kullanim rehberi', 'kullanım rehberi'],
      brief: 'terminal'
    },
    {
      command: 'read guide',
      description: 'terminal rehberinin uzun makalesini acar',
      aliases: ['open guide', 'guide article', 'rehberi oku', 'terminal rehberini oku'],
      routeKey: 'guide',
      fallback: '/pages/makaleler.html#convivium-terminal-rehberi-terminal-guide'
    },
    {
      command: 'how to play',
      description: 'oyunlar icin terminal icinde kisa oynanis ozeti verir',
      aliases: ['howto', 'nasil oynanir', 'nasıl oynanır'],
      brief: 'games'
    },
    {
      command: 'game guide',
      description: 'oyunlar icin terminal icinde kisa rehber ozeti verir',
      aliases: ['games guide', 'oyun rehberi', 'oyun kilavuzu', 'oyun kılavuzu', 'how to play games', 'how to play ash', 'how to play serpent', 'how to play logic', 'how to play signal', 'ash guide', 'serpent guide', 'logic guide', 'signal guide', 'river guide'],
      brief: 'games'
    },
    {
      command: 'read game guide',
      description: 'Convivium oyunlari icin how-to-play makalesini acar',
      aliases: ['read games guide', 'open game guide', 'open games guide', 'oyun rehberini oku'],
      routeKey: 'gamesGuide',
      fallback: '/pages/makaleler.html#oyunlar-how-to-play-games-guide'
    },
    {
      command: 'app guide',
      description: 'Oracle ve ritual araclari icin terminal icinde kisa ozet verir',
      aliases: ['apps guide', 'tools guide', 'uygulama rehberi', 'arac rehberi', 'araç rehberi', 'oracle guide', 'barista guide', 'bartender guide', 'ekol guide'],
      brief: 'apps'
    },
    {
      command: 'read app guide',
      description: 'Oracle ve ritual araclari icin kullanim makalesini acar',
      aliases: ['read apps guide', 'open app guide', 'open apps guide', 'uygulama rehberini oku'],
      routeKey: 'appsGuide',
      fallback: '/pages/makaleler.html#uygulamalar-apps-guide'
    },
    {
      command: 'terminal games',
      description: 'terminal icindeki Pipe-90i ve Out Run 86 icin kisa ozet verir',
      aliases: ['shell games', 'pipe guide', 'outrun guide', 'pipe how to play', 'outrun how to play', 'terminal oyunlari', 'terminal oyunları'],
      brief: 'shellGames'
    },
    {
      command: 'read terminal games',
      description: 'terminal oyunlari makalesini acar',
      aliases: ['open terminal games', 'read shell games', 'open shell games', 'terminal oyunlarini oku', 'terminal oyunlarını oku'],
      routeKey: 'terminalGamesGuide',
      fallback: '/pages/makaleler.html#terminal-oyunlari-pipe-outrun-guide'
    },
    {
      command: 'score guide',
      description: 'skor, oturum, dashboard ve dart icin kisa ozet verir',
      aliases: ['dashboard guide', 'dart guide', 'skor rehberi', 'oturum rehberi', 'scoreboard guide'],
      brief: 'score'
    },
    {
      command: 'read score guide',
      description: 'skor, oturum, dashboard ve dart makalesini acar',
      aliases: ['open score guide', 'read dashboard guide', 'open dashboard guide', 'skor rehberini oku'],
      routeKey: 'scoreGuide',
      fallback: '/pages/makaleler.html#skor-oturum-dashboard-guide'
    },
    {
      command: 'keys',
      description: 'klavye kisayollarini gosterir',
      aliases: ['keyboard', 'hotkeys', 'kisayollar', 'kısayollar'],
      handler: 'keys'
    }
  ].map(freezeEntry));

  function createGuideCommands({
    route,
    goTo,
    baslaCommand,
    commandHelpText,
    guideBriefCommand,
    keyboardHelpText
  } = {}) {
    const dependencies = {
      route,
      goTo,
      baslaCommand,
      commandHelpText,
      guideBriefCommand,
      keyboardHelpText
    };
    const missing = Object.entries(dependencies)
      .filter(([, value]) => typeof value !== 'function')
      .map(([name]) => name);
    if (missing.length) {
      throw new TypeError(`createGuideCommands: zorunlu fonksiyonlar eksik: ${missing.join(', ')}`);
    }

    const handlers = {
      basla: baslaCommand,
      help: commandHelpText,
      keys: keyboardHelpText
    };

    return guideCommandRegistry.map((entry) => {
      let action;
      if (entry.handler) action = handlers[entry.handler];
      else if (entry.brief) action = () => guideBriefCommand(entry.brief);
      else action = goTo(route(entry.routeKey, entry.fallback));

      return {
        command: entry.command,
        description: entry.description,
        aliases: [...entry.aliases],
        action
      };
    });
  }

  root.guideCommandRegistry = guideCommandRegistry;
  root.createGuideCommands = createGuideCommands;
})();
