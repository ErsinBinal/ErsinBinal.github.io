import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const moduleSource = await readFile(
  new URL('../../assets/js/home/guide-commands.js', import.meta.url),
  'utf8'
);

function loadModule() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(moduleSource, context, { filename: 'guide-commands.js' });
  return context.window.ConviviumHome;
}

const expectedCommands = [
  'basla',
  'help',
  'guide',
  'read guide',
  'how to play',
  'game guide',
  'read game guide',
  'app guide',
  'read app guide',
  'terminal games',
  'read terminal games',
  'score guide',
  'read score guide',
  'keys'
];

test('guide registry preserves command order, labels and aliases', () => {
  const home = loadModule();
  const snapshot = JSON.stringify(home.guideCommandRegistry);
  const digest = createHash('sha256').update(snapshot).digest('hex');

  assert.equal(typeof home.createGuideCommands, 'function');
  assert.equal(home.guideCommandRegistry.length, 14);
  assert.equal(
    home.guideCommandRegistry.reduce((total, entry) => total + entry.aliases.length, 0),
    75
  );
  assert.deepEqual(
    Array.from(home.guideCommandRegistry, (entry) => entry.command),
    expectedCommands
  );
  assert.equal(digest, 'd1190a9825c3de23e5c07bd9929059d7aa18a5b5d23433c11cff9b1218055701');
});

test('guide factory preserves help callbacks, brief kinds and article routes', () => {
  const home = loadModule();
  const routeCalls = [];
  const briefCalls = [];
  const definitions = home.createGuideCommands({
    route: (key, fallback) => {
      routeCalls.push([key, fallback]);
      return `/mapped/${key}`;
    },
    goTo: (href) => () => href,
    baslaCommand: () => 'basla output',
    commandHelpText: () => 'help output',
    guideBriefCommand: (kind) => {
      briefCalls.push(kind);
      return `brief:${kind}`;
    },
    keyboardHelpText: () => 'keys output'
  });
  const byCommand = new Map(definitions.map((definition) => [definition.command, definition]));

  assert.equal(definitions.length, 14);
  assert.equal(byCommand.get('basla').action(), 'basla output');
  assert.equal(byCommand.get('help').action(), 'help output');
  assert.equal(byCommand.get('keys').action(), 'keys output');
  assert.equal(byCommand.get('guide').action(), 'brief:terminal');
  assert.equal(byCommand.get('game guide').action(), 'brief:games');
  assert.equal(byCommand.get('app guide').action(), 'brief:apps');
  assert.equal(byCommand.get('terminal games').action(), 'brief:shellGames');
  assert.equal(byCommand.get('score guide').action(), 'brief:score');
  assert.equal(byCommand.get('read guide').action(), '/mapped/guide');
  assert.equal(byCommand.get('read game guide').action(), '/mapped/gamesGuide');
  assert.equal(byCommand.get('read app guide').action(), '/mapped/appsGuide');
  assert.equal(byCommand.get('read terminal games').action(), '/mapped/terminalGamesGuide');
  assert.equal(byCommand.get('read score guide').action(), '/mapped/scoreGuide');
  assert.deepEqual(briefCalls, ['terminal', 'games', 'apps', 'shellGames', 'score']);
  assert.equal(routeCalls.length, 5);

  for (const definition of definitions) {
    assert.equal(typeof definition.command, 'string');
    assert.equal(typeof definition.description, 'string');
    assert.ok(Array.isArray(definition.aliases));
    assert.equal(typeof definition.action, 'function');
  }
});

test('guide factory reports every missing orchestration dependency', () => {
  const home = loadModule();
  assert.throws(
    () => home.createGuideCommands({ route: () => '/' }),
    /goTo, baslaCommand, commandHelpText, guideBriefCommand, keyboardHelpText/
  );
});
