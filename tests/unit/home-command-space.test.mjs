import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const protocolSource = await readFile(
  new URL('../../assets/js/home-protocol.js', import.meta.url),
  'utf8'
);
const routeModuleSource = await readFile(
  new URL('../../assets/js/home/route-commands.js', import.meta.url),
  'utf8'
);
const guideModuleSource = await readFile(
  new URL('../../assets/js/home/guide-commands.js', import.meta.url),
  'utf8'
);

function normalizeCommand(value) {
  return value
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

function sourceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `baslangic isareti bulunamadi: ${startMarker}`);
  assert.notEqual(end, -1, `bitis isareti bulunamadi: ${endMarker}`);
  return source.slice(start + startMarker.length, end);
}

function topLevelObjects(source) {
  const objects = [];
  let depth = 0;
  let start = -1;
  let quote = '';
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }

    if (char === '{') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        objects.push({ index: start, source: source.slice(start, index + 1) });
        start = -1;
      }
    }
  }

  assert.equal(depth, 0, 'commandDefinitions nesne sinirlari dengeli olmali');
  return objects;
}

function metadataFromObject(objectSource) {
  const command = objectSource.match(/\bcommand:\s*'([^']+)'/);
  const aliases = objectSource.match(/\baliases:\s*(\[[\s\S]*?\])/);
  assert.ok(command, `command alani okunamadi: ${objectSource.slice(0, 80)}`);
  assert.ok(aliases, `aliases alani okunamadi: ${objectSource.slice(0, 80)}`);
  return {
    command: command[1],
    aliases: Array.from(vm.runInNewContext(aliases[1]))
  };
}

function loadRegistry(moduleSource, property, filename) {
  const context = vm.createContext({ window: {} });
  vm.runInContext(moduleSource, context, { filename });
  return Array.from(context.window.ConviviumHome[property], (entry) => ({
    command: entry.command,
    aliases: Array.from(entry.aliases)
  }));
}

function literalArrayAfter(source, marker) {
  const tail = source.slice(source.indexOf(marker) + marker.length);
  const match = tail.match(/(\[[^\]]*\])/);
  assert.ok(match, `literal dizi okunamadi: ${marker}`);
  return Array.from(vm.runInNewContext(match[1]));
}

function commandDefinitions() {
  const body = sourceBetween(
    protocolSource,
    'const commandDefinitions = [',
    '\n      ];\n\n      const keyboardHelpText'
  );
  const inline = topLevelObjects(body).map((entry) => ({
    index: entry.index,
    definitions: [metadataFromObject(entry.source)]
  }));
  const routeIndex = body.indexOf('...routeCommandDefinitions');
  const guideIndex = body.indexOf('...guideCommandDefinitions');
  assert.notEqual(routeIndex, -1, 'route command spread bulunmali');
  assert.notEqual(guideIndex, -1, 'guide command spread bulunmali');
  inline.push({
    index: guideIndex,
    definitions: loadRegistry(guideModuleSource, 'guideCommandRegistry', 'guide-commands.js')
  });
  inline.push({
    index: routeIndex,
    definitions: loadRegistry(routeModuleSource, 'routeCommandRegistry', 'route-commands.js')
  });

  return inline
    .sort((left, right) => left.index - right.index)
    .flatMap((entry) => entry.definitions);
}

function claimsFor(definitions) {
  const claims = new Map();
  for (const definition of definitions) {
    for (const label of [definition.command, ...definition.aliases]) {
      const key = normalizeCommand(label);
      if (!claims.has(key)) claims.set(key, []);
      claims.get(key).push({ owner: definition.command, label });
    }
  }
  return claims;
}

function prefixOverlaps(prefixes, claims) {
  const overlaps = [];
  for (const prefix of new Set(prefixes.map(normalizeCommand))) {
    for (const [key, owners] of claims) {
      if (!key.startsWith(`${prefix} `)) continue;
      overlaps.push(
        `${prefix}>${key}>${[...new Set(owners.map((claim) => claim.owner))].join(',')}`
      );
    }
  }
  return overlaps.sort();
}

test('global command/alias namespace preserves the complete normalized snapshot', () => {
  const definitions = commandDefinitions();
  const claims = claimsFor(definitions);
  const labels = definitions.reduce(
    (total, definition) => total + 1 + definition.aliases.length,
    0
  );
  const digest = createHash('sha256')
    .update(JSON.stringify(definitions))
    .digest('hex');

  assert.equal(definitions.length, 137);
  assert.equal(labels, 607);
  assert.equal(claims.size, 562);
  assert.equal(digest, '2efd91bbfcda9ca7a7b65c87cff48853a8e55353cc7f4c371ff5b777591711bc');

  const sameOwnerFolds = [...claims.values()].filter(
    (owners) => owners.length > 1 && new Set(owners.map((claim) => claim.owner)).size === 1
  );
  assert.equal(sameOwnerFolds.length, 43, 'TR katlamasi ayni owner icinde korunmali');

  const crossOwner = [...claims.entries()]
    .filter(([, owners]) => new Set(owners.map((claim) => claim.owner)).size > 1)
    .map(([key, owners]) => ({
      key,
      owners: [...new Set(owners.map((claim) => claim.owner))],
      winner: owners.at(-1).owner
    }));

  assert.deepEqual(crossOwner, [
    { key: 'pipes', owners: ['shell', 'pipe'], winner: 'pipe' },
    { key: 'unlock', owners: ['unlock', 'unlock hidden'], winner: 'unlock hidden' }
  ]);
});

test('hidden commands and parameter prefixes preserve known precedence overlaps', () => {
  const definitions = commandDefinitions();
  const claims = claimsFor(definitions);
  const hiddenKeys = [...protocolSource.matchAll(/commandMap\[['"]([^'"]+)['"]\]\s*=/g)]
    .map((match) => normalizeCommand(match[1]));
  assert.deepEqual(hiddenKeys, ['resonate', 'rezonans']);
  assert.deepEqual(hiddenKeys.filter((key) => claims.has(key)), []);

  const parameterBody = sourceBetween(
    protocolSource,
    'const parameterActions = [',
    '\n      ];\n\n      // Ham'
  );
  const parameterPrefixes = [...parameterBody.matchAll(/\[\s*'([^']+)'\s*,/g)]
    .map((match) => match[1]);
  const prefixDigest = createHash('sha256')
    .update(JSON.stringify(parameterPrefixes))
    .digest('hex');

  assert.equal(parameterPrefixes.length, 37);
  assert.equal(prefixDigest, '526242f4a0d4580e9d3b674d998aea24ddef357b2caa68f1c5c192447d8876bf');
  assert.deepEqual(prefixOverlaps(parameterPrefixes, claims), [
    'chat>chat deck>chat',
    'incele>incele etraf>look',
    'kilavuz>kilavuz kabuk>shell',
    'outrun>outrun guide>terminal games',
    'outrun>outrun how to play>terminal games',
    'pipe>pipe game>pipe',
    'pipe>pipe guide>terminal games',
    'pipe>pipe how to play>terminal games',
    'unlock>unlock hidden>unlock hidden'
  ]);
});

test('raw-prefix routes stay ahead of shell, parameter and commandMap dispatch', () => {
  const definitions = commandDefinitions();
  const claims = claimsFor(definitions);
  const confirmationMatch = protocolSource.match(
    /if \((\['oracle yes'[^\]]+\])\.includes\(command\)\)/
  );
  assert.ok(confirmationMatch, 'oracle onay komutlari okunmali');
  const confirmations = Array.from(vm.runInNewContext(confirmationMatch[1]));
  const askPrefixes = literalArrayAfter(protocolSource, 'const askPrefix =');
  const markPrefixes = literalArrayAfter(protocolSource, 'const markPrefix =');
  const rawShellCommands = literalArrayAfter(protocolSource, 'const RAW_SHELL_COMMANDS = new Set(');

  assert.deepEqual(confirmations, ['oracle yes', 'ask oracle', 'confirm oracle']);
  assert.ok(protocolSource.includes('/^\\s*(say|soyle|söyle)\\s+\\S/i.test(query)'));
  assert.ok(protocolSource.includes('/^\\s*(bottle|sise|şişe)(\\s|$)/i.test(query)'));

  const rawPrefixOverlaps = prefixOverlaps([
    ...askPrefixes,
    ...markPrefixes,
    'say ',
    'soyle ',
    'söyle ',
    'bottle ',
    'sise ',
    'şişe '
  ], claims);
  assert.deepEqual(rawPrefixOverlaps, ['ask>ask oracle>oracle yes']);
  assert.ok(confirmations.map(normalizeCommand).includes('ask oracle'));
  assert.equal(claims.get('bottle').at(-1).owner, 'bottle');

  assert.deepEqual(
    rawShellCommands
      .map((key) => `${normalizeCommand(key)}:${claims.get(normalizeCommand(key))?.at(-1)?.owner}`)
      .sort(),
    [
      'bugysay:cowsay',
      'cowsay:cowsay',
      'del:rm',
      'echo:echo',
      'export:export',
      'rm:rm',
      'set:export',
      'sudo:sudo',
      'touch:touch',
      'unset:unset',
      'which:which'
    ]
  );

  const runCommandStart = protocolSource.indexOf('const runCommand = async (raw) =>');
  const dispatchSource = protocolSource.slice(runCommandStart);
  const orderedMarkers = [
    "if (['oracle yes'",
    'const askPrefix =',
    'const markPrefix =',
    '/^\\s*(say|soyle|söyle)',
    '/^\\s*(bottle|sise|şişe)',
    'if (isShellLine(query))',
    'const action = commandMap[command]',
    'if (parameterMatch)',
    'if (action)'
  ];
  const positions = orderedMarkers.map((marker) => dispatchSource.indexOf(marker));
  assert.ok(positions.every((position) => position >= 0), 'dispatch katmani isaretleri bulunmali');
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
});
