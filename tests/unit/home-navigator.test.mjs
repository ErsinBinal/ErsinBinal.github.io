import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const navigatorSource = await readFile(
  new URL('../../assets/js/home/navigator.js', import.meta.url),
  'utf8'
);
const protocolSource = await readFile(
  new URL('../../assets/js/home-protocol.js', import.meta.url),
  'utf8'
);

function normalizeCommand(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .trim()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/^[>/\\]+/, '')
    .replace(/[._-]+/g, ' ')
    .replace(/[^\w\s?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const definitions = [
  { command: 'help', description: 'kisa yon pusulasi', aliases: ['?', 'yardim'] },
  { command: 'home', description: 'ana sayfa baslangici', aliases: ['origin'] },
  { command: 'history', description: 'komut gecmisi', aliases: ['gecmis'] },
  { command: 'how to play', description: 'oyun ozeti', aliases: ['nasil oynanir'] },
  { command: 'look', description: 'bulundugun yeri oku', aliases: ['bak'] },
  { command: 'map', description: 'sinyal haritasi', aliases: ['harita'] },
  { command: 'examine', description: 'bir nesneyi incele', aliases: ['incele'] },
  { command: 'cat', description: 'dosya oku', aliases: ['type'] },
  { command: 'open dossier', description: 'makaleleri ac', aliases: ['dossier'] },
  { command: 'run logic', description: 'Logic oyununu ac', aliases: ['logic'] },
  { command: 'run signal', description: 'Signal oyununu ac', aliases: ['signal game'] },
  { command: 'card', description: 'gunun karti', aliases: ['kart'] },
  { command: 'man', description: 'komut kilavuzu', aliases: ['kilavuz'] }
];

function loadFactory() {
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(navigatorSource, context, { filename: 'navigator.js' });
  return context.window.ConviviumHome.createNavigator;
}

function createFixture(overrides = {}) {
  const createNavigator = loadFactory();
  const room = {
    objects: {
      terminal: 'BBS',
      todo: 'TODO',
      ekran: 'arcade',
      buluntu: 'gunluk ortak iz'
    },
    navigation: ['examine buluntu', 'cat arcade-recovery.scr', 'cd /']
  };
  const navigator = createNavigator({
    normalizeCommand,
    getCwd: () => '/ruins',
    listRooms: () => ['/', '/routes', '/ruins'],
    getRoom: (path) => path === '/ruins' ? room : {},
    getObjective: () => 'examine buluntu',
    getCommandDefinitions: () => definitions,
    ...overrides
  });
  return { createNavigator, navigator };
}

const values = (suggestions) => Array.from(suggestions, (item) => item.value);

test('Sinyal Pusulasi renders a compact contextual main help', () => {
  const { navigator } = createFixture();

  assert.equal(navigator.help(), [
    '] SINYAL PUSULASI',
    '',
    '  KESFET   look · cd · map',
    '  OKU      open dossier · notes',
    '  OYNA     game guide · run logic',
    '  RITUEL   open oracle · daily · card',
    '  BAGLAN   who · chat · wall',
    '  SISTEM   pwd · ls · man',
    '  BURADAYIM /CONVIVIUM/RUINS',
    '  SIRADAKI examine buluntu',
    '  DERINLES help kesfet · TAM LISTE help all',
    ']'
  ].join('\n'));
});

test('Pusula intent help stays short and rejects unknown frequencies clearly', () => {
  const { navigator } = createFixture();

  assert.equal(navigator.help('oyna'), [
    '] PUSULA / OYNA',
    '',
    '  Oyun ve oynanabilir deneyimleri baslat.',
    '  game guide      kisa oyun secicisi',
    '  run logic       dusunme bulmacasi',
    '  run ash         hareket ve refleks',
    '  pipe · outrun   terminal ici oyunlar',
    '',
    '  GERI help',
    ']'
  ].join('\n'));
  assert.equal(
    navigator.help('bilinmeyen'),
    'help: "bilinmeyen" frekansi yok. sec: kesfet, oku, oyna, rituel, baglan, sistem, all'
  );
});

test('Full command index is generated from canonical live definitions', () => {
  const { navigator } = createFixture();
  const index = navigator.helpAll();

  assert.match(index, /^] TAM KOMUT INDEKSI\n/);
  assert.match(index, /13 KANONIK · 27 ETIKET/);
  definitions.forEach(({ command }) => assert.match(index, new RegExp(`(^| · |  )${command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($| · |\n)`)));
  assert.doesNotMatch(index, /yardim|origin|rezonans/);
  assert.match(index, /AYRINTI man <komut> · PUSULA help/);
});

test('Canonical completion ranks help first and collapses aliases into their owner', () => {
  const { navigator } = createFixture();

  assert.deepEqual(values(navigator.suggest('h')), ['help', 'map', 'home']);
  assert.deepEqual(values(navigator.suggest('yard')), ['help']);
  assert.equal(navigator.suggest('yard')[0].reason, 'esanlamli');
  assert.deepEqual(values(navigator.suggest('hepl')), ['help']);
  assert.equal(navigator.suggest('hepl')[0].reason, 'duzelt');
  assert.deepEqual(values(navigator.suggest('run s')), ['run signal']);
});

test('Navigator is the single canonical typo resolver for direct and parameter flows', () => {
  const { navigator } = createFixture();

  assert.equal(navigator.correct('hepl'), 'help');
  assert.equal(navigator.correct('yrdim'), 'help');
  assert.equal(navigator.correct('opne dossier'), 'open dossier');
  assert.equal(navigator.correct('hepl oyna'), 'help oyna');
  assert.equal(navigator.correct('help'), null);
  assert.equal(navigator.correct('serbest bir soru'), null);
});

test('Parameter completion uses live rooms, current objects, intents and commands', () => {
  const { navigator } = createFixture();

  assert.deepEqual(values(navigator.suggest('cd r')), ['cd routes', 'cd ruins']);
  assert.deepEqual(values(navigator.suggest('examine b')), ['examine buluntu']);
  assert.deepEqual(values(navigator.suggest('help o')), ['help oku', 'help oyna']);
  assert.deepEqual(values(navigator.suggest('help a')), ['help all']);
  assert.deepEqual(values(navigator.suggest('man car')), ['man card']);
});

test('Current room navigation wins matching flow without leaking more than three choices', () => {
  const { navigator } = createFixture();
  const suggestions = navigator.suggest('e');

  assert.equal(suggestions[0].value, 'examine buluntu');
  assert.ok(suggestions.length <= 3);
  assert.equal(Object.isFrozen(suggestions), true);
  assert.equal(suggestions.every(Object.isFrozen), true);
  assert.deepEqual(values(navigator.suggest('')), []);
});

test('Navigator remains a pure read model and protocol owns execution/UI', () => {
  assert.doesNotMatch(navigatorSource, /document\.|localStorage|sessionStorage|fetch\(|innerHTML|runCommand/);
  assert.match(protocolSource, /createNavigator/);
  assert.match(protocolSource, /renderCommandSuggestions/);
  assert.match(protocolSource, /if \(isPersonalAliasCommand\(commandInput\.value\)\) \{\s+runCommand\(commandInput\.value\)/);
  assert.doesNotMatch(protocolSource, /legacyCommandHelpText|const editDistance|suggestNearestCommand|commandVocab/);
});

test('Navigator factory rejects every missing read dependency', () => {
  const { createNavigator } = createFixture();
  assert.throws(
    () => createNavigator({ normalizeCommand }),
    /getCwd, listRooms, getRoom, getObjective, getCommandDefinitions/
  );
});
