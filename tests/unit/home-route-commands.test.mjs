import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const moduleSource = await readFile(new URL('../../assets/js/home/route-commands.js', import.meta.url), 'utf8');

function loadModule() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(moduleSource, context, { filename: 'route-commands.js' });
  return context.window.ConviviumHome;
}

const expectedCommands = [
  'home',
  'open dossier',
  'run logic',
  'run signal',
  'run ash',
  'run ash2',
  'run flow',
  'run serpent',
  'run crude',
  'dart',
  'bartender',
  'barista',
  'realists bar',
  'open oracle',
  'paradox',
  'ekol',
  'bugy studio',
  'about',
  'access',
  'dashboard',
  'admin',
  'universe',
  'open manifest',
  'hologram',
  'esyalar'
];

test('route registry preserves command count and order', () => {
  const home = loadModule();

  assert.equal(typeof home.createRouteCommands, 'function');
  assert.equal(home.routeCommandRegistry.length, 25);
  assert.deepEqual(
    Array.from(home.routeCommandRegistry, (entry) => entry.command),
    expectedCommands
  );
});

test('route registry snapshot preserves every label, alias and target', () => {
  const home = loadModule();
  const snapshot = JSON.stringify(home.routeCommandRegistry);
  const digest = createHash('sha256').update(snapshot).digest('hex');

  assert.equal(home.routeCommandRegistry.reduce((total, entry) => total + entry.aliases.length, 0), 107);
  assert.equal(digest, '3f7212abbc466f69d211defd234757d7ecdcabce0c8deec8213d826088cf4c30');
});

test('factory preserves route targets, fallbacks and origin behavior', () => {
  const home = loadModule();
  const routeCalls = [];
  const mappedRoutes = {
    dossier: '/mapped/dossier',
    oracle: '/mapped/oracle'
  };
  const route = (key, fallback) => {
    routeCalls.push([key, fallback]);
    return mappedRoutes[key] || fallback;
  };
  const goTo = (href) => () => href;
  const scrollToOrigin = () => 'origin selected';
  const definitions = home.createRouteCommands({ route, goTo, scrollToOrigin });
  const byCommand = new Map(definitions.map((definition) => [definition.command, definition]));

  assert.equal(definitions.length, 25);
  assert.equal(byCommand.get('home').action(), 'origin selected');
  assert.equal(byCommand.get('open dossier').action(), '/mapped/dossier');
  assert.equal(byCommand.get('open oracle').action(), '/mapped/oracle');
  assert.equal(byCommand.get('run logic').action(), '/games/cyberpunk-logic-game.html');
  assert.equal(byCommand.get('open manifest').action(), 'manifest.json');
  assert.equal(byCommand.get('hologram').action(), '/holo/');
  assert.equal(byCommand.get('esyalar').action(), '/arsiv/');
  assert.equal(byCommand.get('open manifest').action(), 'manifest.json');
  assert.equal(routeCalls.length, 23);

  for (const definition of definitions) {
    assert.equal(typeof definition.command, 'string');
    assert.equal(typeof definition.description, 'string');
    assert.ok(Array.isArray(definition.aliases));
    assert.equal(typeof definition.action, 'function');
  }
});

test('important Turkish and shorthand aliases remain attached to the same commands', () => {
  const home = loadModule();
  const definitions = home.createRouteCommands({
    route: (_key, fallback) => fallback,
    goTo: (href) => () => href,
    scrollToOrigin: () => 'origin selected'
  });
  const aliasOwners = new Map();

  for (const definition of definitions) {
    aliasOwners.set(definition.command, definition.command);
    for (const alias of definition.aliases) aliasOwners.set(alias, definition.command);
  }

  assert.equal(aliasOwners.get('başlangıç'), 'home');
  assert.equal(aliasOwners.get('makaleler'), 'open dossier');
  assert.equal(aliasOwners.get('mantık'), 'run logic');
  assert.equal(aliasOwners.get('üç güneş'), 'run signal');
  assert.equal(aliasOwners.get('kül hattı 2'), 'run ash2');
  assert.equal(aliasOwners.get('yılan'), 'run serpent');
  assert.equal(aliasOwners.get('co-op'), 'run crude');
  assert.equal(aliasOwners.get('giriş'), 'access');
  assert.equal(aliasOwners.get('yönetim'), 'admin');
});

test('factory rejects incomplete orchestration dependencies', () => {
  const home = loadModule();

  assert.throws(() => home.createRouteCommands(), /zorunludur/);
});
