(() => {
  'use strict';

  const root = window.ConviviumHome = window.ConviviumHome || {};

  const shopCatalog = Object.freeze([
    { key: 'theme-magenta', cost: 12, desc: 'terminal temasi: magenta  (sonra: theme magenta)' },
    { key: 'theme-ice', cost: 12, desc: 'terminal temasi: ice      (sonra: theme ice)' },
    { key: 'saver-drift', cost: 20, desc: 'ekran koruyucu varyanti: mor drift (screen saver)' },
    { key: 'bugy-flag', cost: 8, desc: 'bugy aksesuari: mini bayrak' }
  ].map((item) => Object.freeze(item)));

  function createShop({
    normalizeCommand,
    getBalance,
    ownsItem,
    spendShards,
    grantItem,
    persist,
    scheduleWorldSave,
    applyPurchase,
    playPickupAudio
  } = {}) {
    const functions = {
      normalizeCommand,
      getBalance,
      ownsItem,
      spendShards,
      grantItem,
      persist,
      scheduleWorldSave,
      applyPurchase,
      playPickupAudio
    };
    const missing = Object.entries(functions)
      .filter(([, value]) => typeof value !== 'function')
      .map(([name]) => name);
    if (missing.length) {
      throw new TypeError(`createShop: zorunlu fonksiyonlar eksik: ${missing.join(', ')}`);
    }

    const list = () => {
      const rows = shopCatalog.map((item) => {
        const mark = ownsItem(item.key) ? '[x]' : `[${String(item.cost).padStart(2)}]`;
        return `  ${mark} ${item.key.padEnd(14)} ${item.desc}`;
      });
      return [
        '] SHOP',
        '',
        `  bakiye: ${getBalance()} shard`,
        '',
        ...rows,
        '',
        '  satin al: shop buy <urun>   ([x] = sende var)',
        ']'
      ].join('\n');
    };

    const command = (arg = '') => {
      const norm = normalizeCommand(arg);
      if (!norm || norm === 'list') return list();

      const parts = norm.split(/\s+/);
      if (parts[0] !== 'buy' && parts[0] !== 'al') {
        return 'shop: usage shop | shop buy <urun>';
      }

      const key = parts.slice(1).join('-');
      const item = shopCatalog.find((entry) => entry.key === key);
      if (!item) return `shop: "${key || '?'}" diye bir urun yok. shop ile listele.`;
      if (ownsItem(item.key)) return `shop: ${item.key} zaten sende.`;
      if (!spendShards(item.cost)) {
        return `shop: yetersiz bakiye (${getBalance()}/${item.cost} shard).`;
      }

      grantItem(item.key);
      persist();
      scheduleWorldSave();
      applyPurchase(item.key);
      playPickupAudio();

      const hint = item.key.startsWith('theme-')
        ? ` dene: theme ${item.key.replace('theme-', '')}`
        : item.key === 'saver-drift'
          ? ' dene: screen saver'
          : '';
      return `shop: ${item.key} alindi (-${item.cost} shard, kalan ${getBalance()}).${hint}`;
    };

    return Object.freeze({ command });
  }

  root.shopCatalog = shopCatalog;
  root.createShop = createShop;
})();
