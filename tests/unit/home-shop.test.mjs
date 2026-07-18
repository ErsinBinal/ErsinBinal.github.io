import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const shopSource = await readFile(
  new URL('../../assets/js/home/shop.js', import.meta.url),
  'utf8'
);
const protocolSource = await readFile(
  new URL('../../assets/js/home-protocol.js', import.meta.url),
  'utf8'
);
const screenSaverSource = await readFile(
  new URL('../../assets/js/home/screen-saver.js', import.meta.url),
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

function loadShopModule() {
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(shopSource, context, { filename: 'shop.js' });
  return context.window.ConviviumHome;
}

function createFixture({ balance = 25, inventory = [], dependencies = {} } = {}) {
  const state = { balance, inventory: [...inventory] };
  const calls = [];
  const { createShop, shopCatalog } = loadShopModule();
  const shop = createShop({
    normalizeCommand,
    getBalance: () => state.balance,
    ownsItem: (key) => state.inventory.includes(`shop:${key}`),
    spendShards: (cost) => {
      calls.push(`spendShards:${cost}`);
      if (state.balance < cost) return false;
      state.balance -= cost;
      return true;
    },
    grantItem: (key) => {
      state.inventory = [...new Set([...state.inventory, `shop:${key}`])];
      calls.push(`grantItem:${key}`);
    },
    persist: () => calls.push('persist'),
    scheduleWorldSave: () => calls.push('scheduleWorldSave'),
    applyPurchase: (key) => calls.push(`applyPurchase:${key}`),
    playPickupAudio: () => calls.push('playPickupAudio'),
    ...dependencies
  });
  return { createShop, shop, shopCatalog, state, calls };
}

test('Shop catalog preserves exact order, prices, descriptions and immutability', () => {
  const { shopCatalog } = createFixture();
  const catalog = Array.from(shopCatalog, (item) => ({
    key: item.key,
    cost: item.cost,
    desc: item.desc
  }));

  assert.deepEqual(catalog, [
    { key: 'theme-magenta', cost: 12, desc: 'terminal temasi: magenta  (sonra: theme magenta)' },
    { key: 'theme-ice', cost: 12, desc: 'terminal temasi: ice      (sonra: theme ice)' },
    { key: 'saver-drift', cost: 20, desc: 'ekran koruyucu varyanti: mor drift (screen saver)' },
    { key: 'bugy-flag', cost: 8, desc: 'bugy aksesuari: mini bayrak' }
  ]);
  assert.equal(Object.isFrozen(shopCatalog), true);
  assert.equal(Array.from(shopCatalog).every(Object.isFrozen), true);
});

test('Shop list preserves balance, catalog formatting and ownership marks', () => {
  const { shop, calls } = createFixture({ inventory: ['shop:theme-ice'] });

  assert.equal(shop.command(), [
    '] SHOP',
    '',
    '  bakiye: 25 shard',
    '',
    '  [12] theme-magenta  terminal temasi: magenta  (sonra: theme magenta)',
    '  [x] theme-ice      terminal temasi: ice      (sonra: theme ice)',
    '  [20] saver-drift    ekran koruyucu varyanti: mor drift (screen saver)',
    '  [ 8] bugy-flag      bugy aksesuari: mini bayrak',
    '',
    '  satin al: shop buy <urun>   ([x] = sende var)',
    ']'
  ].join('\n'));
  assert.equal(shop.command('list'), shop.command());
  assert.deepEqual(calls, []);
});

test('Shop preserves usage, unknown product, ownership and insufficient balance guards', () => {
  const fixture = createFixture({ balance: 7, inventory: ['shop:theme-ice'] });
  const { shop, calls, state } = fixture;

  assert.equal(shop.command('show themes'), 'shop: usage shop | shop buy <urun>');
  assert.equal(shop.command('buy'), 'shop: "?" diye bir urun yok. shop ile listele.');
  assert.equal(shop.command('buy missing item'), 'shop: "missing-item" diye bir urun yok. shop ile listele.');
  assert.equal(shop.command('al theme ice'), 'shop: theme-ice zaten sende.');
  assert.deepEqual(calls, []);

  assert.equal(shop.command('buy saver drift'), 'shop: yetersiz bakiye (7/20 shard).');
  assert.deepEqual(calls, ['spendShards:20']);
  assert.deepEqual(state, { balance: 7, inventory: ['shop:theme-ice'] });
});

test('Shop preserves successful purchase mutation order, outputs and hints', () => {
  const cases = [
    ['theme-magenta', 12, 'shop: theme-magenta alindi (-12 shard, kalan 13). dene: theme magenta'],
    ['saver-drift', 20, 'shop: saver-drift alindi (-20 shard, kalan 5). dene: screen saver'],
    ['bugy-flag', 8, 'shop: bugy-flag alindi (-8 shard, kalan 17).']
  ];

  for (const [key, cost, output] of cases) {
    const { shop, calls, state } = createFixture();
    assert.equal(shop.command(`buy ${key}`), output);
    assert.deepEqual(calls, [
      `spendShards:${cost}`,
      `grantItem:${key}`,
      'persist',
      'scheduleWorldSave',
      `applyPurchase:${key}`,
      'playPickupAudio'
    ]);
    assert.equal(state.balance, 25 - cost);
    assert.deepEqual(state.inventory, [`shop:${key}`]);
  }
});

test('Shop factory rejects every missing orchestration dependency', () => {
  const { createShop } = createFixture();
  assert.throws(
    () => createShop({ normalizeCommand: () => '' }),
    /getBalance, ownsItem, spendShards, grantItem, persist, scheduleWorldSave, applyPurchase, playPickupAudio/
  );
});

test('Shop owns decisions while protocol retains state, storage, audio and consumer integration', () => {
  assert.doesNotMatch(shopSource, /localStorage|ConviviumBackend|document\.|audioCue|state\./);
  assert.match(protocolSource, /createShop/);
  assert.match(protocolSource, /shopMod\?\.command/);
  assert.doesNotMatch(protocolSource, /const\s+SHOP_ITEMS/);
  assert.match(protocolSource, /grantItem:[\s\S]*?state\.inventory\s*=/);
  assert.match(protocolSource, /applyPurchase:\s*applyShopPurchase/);
  assert.match(protocolSource, /convivium\.saver\.variant/);
  assert.match(protocolSource, /convivium\.bugy\.flag/);
  assert.match(protocolSource, /shop:\$\{premium\[theme\]\}/);
  assert.match(screenSaverSource, /localStorage\.getItem\('convivium\.saver\.variant'\)\s*===\s*'drift'/);
});
