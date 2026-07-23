(() => {
  'use strict';

  const root = window.ConviviumHome = window.ConviviumHome || {};

  const freezeEntry = (entry) => Object.freeze({
    ...entry,
    aliases: Object.freeze([...entry.aliases])
  });

  const routeCommandRegistry = Object.freeze([
    {
      command: 'home',
      description: 'anasayfa baslangicina doner',
      aliases: ['origin', 'start', 'baslangic', 'başlangıç'],
      kind: 'origin'
    },
    {
      command: 'open dossier',
      description: 'makaleler ve notlar',
      aliases: ['dossier', 'makaleler', 'makale', 'articles'],
      routeKey: 'dossier',
      fallback: '/pages/makaleler.html'
    },
    {
      command: 'run logic',
      description: 'Cyberpunk Logic oyununu acar',
      aliases: ['logic', 'cyberpunk logic', 'logic game', 'mantik', 'mantık'],
      routeKey: 'logic',
      fallback: '/games/cyberpunk-logic-game.html'
    },
    {
      command: 'run signal',
      description: 'Uc Gunes Sinyali oyununu acar',
      aliases: ['signal game', 'three body', 'three body signal', 'uc gunes', 'üç güneş', 'uc cisim', 'üç cisim', 'relay'],
      routeKey: 'signal',
      fallback: '/games/three-body-signal.html'
    },
    {
      command: 'run ash',
      description: 'Ash Runner oyununu acar',
      aliases: ['ash', 'ash runner', 'scrap', 'brawler'],
      routeKey: 'ash',
      fallback: '/games/ash-runner.html'
    },
    {
      command: 'run ash2',
      description: 'Kul Hatti II: Yorunge oyununu acar',
      aliases: ['ash2', 'ash runner 2', 'kul hatti 2', 'kül hattı 2', 'yorunge', 'yörünge'],
      routeKey: 'ash2',
      fallback: '/games/ash-runner-2.html'
    },
    {
      command: 'run flow',
      description: 'Neon River deneyimini acar',
      aliases: ['flow', 'neon river', 'river'],
      routeKey: 'flow',
      fallback: '/games/neon-river.html'
    },
    {
      command: 'run serpent',
      description: 'Neon Serpent (yilan) oyununu acar',
      aliases: ['serpent', 'snake', 'yilan', 'yılan', 'neon serpent'],
      routeKey: 'serpent',
      fallback: '/games/neon-serpent.html'
    },
    {
      command: 'run crude',
      description: 'Crude Buster (online co-op beat em up) oyununu acar',
      aliases: ['crude', 'crude buster', 'buster', 'coop', 'co-op', 'beat em up'],
      routeKey: 'crude',
      fallback: '/games/crude-buster.html'
    },
    {
      command: 'dart',
      description: 'dart skorboard ekranini acar',
      aliases: ['skorbord', 'scoreboard', 'dart skorbord', 'dart skor', 'scores'],
      routeKey: 'dart',
      fallback: '/tools/dart-skorbord.html'
    },
    {
      command: 'bartender',
      description: 'kokteyl asistani',
      aliases: ['bar', 'cocktail', 'kokteyl'],
      routeKey: 'bartender',
      fallback: '/tools/bartender.html'
    },
    {
      command: 'barista',
      description: 'kahve asistani',
      aliases: ['coffee', 'kahve'],
      routeKey: 'barista',
      fallback: '/tools/barista.html'
    },
    {
      command: 'realists bar',
      description: 'The Realists Bar sayfasi',
      aliases: ['the realists bar', 'realists'],
      routeKey: 'realistsBar',
      fallback: '/tools/the-realists-bar.html'
    },
    {
      command: 'open oracle',
      description: 'The Oracle deneyimini acar',
      aliases: ['the oracle', 'oracle page'],
      routeKey: 'oracle',
      fallback: '/oracle/'
    },
    {
      command: 'paradox',
      description: 'Paradox Terminal sayfasi',
      aliases: ['paradox terminal', 'terminal'],
      routeKey: 'paradox',
      fallback: '/tools/paradox-terminal.html'
    },
    {
      command: 'ekol',
      description: 'Ekol Aynasi - dusunce ekolu testi',
      aliases: ['ayna', 'ekol aynasi', 'ekol aynası', 'mirror', 'schools'],
      routeKey: 'ekolAynasi',
      fallback: '/tools/ekol-aynasi.html'
    },
    {
      command: 'bugy studio',
      description: 'Bugy Studio deney aracini acar',
      aliases: ['bugy lab', 'studio bugy', 'pet studio'],
      routeKey: 'bugyStudio',
      fallback: '/tools/bugy-studio.html'
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
      routeKey: 'profile',
      fallback: '/pages/ozgecmisim.html'
    },
    {
      command: 'access',
      description: 'giris ekranini acar',
      aliases: ['login', 'auth', 'giris', 'giriş'],
      routeKey: 'auth',
      fallback: '/account/auth.html'
    },
    {
      command: 'dashboard',
      description: 'dashboard ekranini acar',
      aliases: ['dash', 'panel'],
      routeKey: 'dashboard',
      fallback: '/account/dashboard.html'
    },
    {
      command: 'admin',
      description: 'admin ekranini acar',
      aliases: ['manage', 'yonetim', 'yönetim'],
      routeKey: 'admin',
      fallback: '/admin/'
    },
    {
      command: 'universe',
      description: 'Universe-2 deneyimini acar',
      aliases: ['universe 2', 'u2', 'evren'],
      routeKey: 'universe',
      fallback: '/games/universe-2.html'
    },
    {
      command: 'open manifest',
      description: 'site manifest dosyasini acar',
      aliases: ['manifest file'],
      href: 'manifest.json'
    },
    {
      command: 'hologram',
      description: 'kurtarilmis 3D kalintilarin hologram kasasini acar',
      aliases: ['holo', 'holo scan', 'hologram kasasi', 'kasada tara'],
      routeKey: 'holo',
      fallback: '/holo/'
    },
    {
      command: 'esyalar',
      description: 'kurtarilmis esyalarin piksel envanterini acar',
      aliases: ['envanter', 'buluntular', 'sinyal envanteri', 'kurtarilmis esyalar'],
      routeKey: 'arsiv',
      fallback: '/arsiv/'
    }
  ].map(freezeEntry));

  function createRouteCommands({ route, goTo, scrollToOrigin } = {}) {
    if (typeof route !== 'function' || typeof goTo !== 'function' || typeof scrollToOrigin !== 'function') {
      throw new TypeError('createRouteCommands: route, goTo ve scrollToOrigin fonksiyonlari zorunludur');
    }

    return routeCommandRegistry.map((entry) => {
      let action = scrollToOrigin;

      if (entry.kind !== 'origin') {
        const href = entry.href || route(entry.routeKey, entry.fallback);
        action = goTo(href);
      }

      return {
        command: entry.command,
        description: entry.description,
        aliases: [...entry.aliases],
        action
      };
    });
  }

  root.routeCommandRegistry = routeCommandRegistry;
  root.createRouteCommands = createRouteCommands;
})();
