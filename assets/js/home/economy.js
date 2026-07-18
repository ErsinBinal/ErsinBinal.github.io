(() => {
  'use strict';

  const root = window.ConviviumHome = window.ConviviumHome || {};

  function createEconomy({
    getBalance,
    setBalance,
    persist,
    scheduleWorldSave,
    playCoinAudio,
    setStatus
  } = {}) {
    const functions = {
      getBalance,
      setBalance,
      persist,
      scheduleWorldSave,
      playCoinAudio,
      setStatus
    };
    const missing = Object.entries(functions)
      .filter(([, value]) => typeof value !== 'function')
      .map(([name]) => name);
    if (missing.length) {
      throw new TypeError(`createEconomy: zorunlu fonksiyonlar eksik: ${missing.join(', ')}`);
    }

    const award = (amount = 1, reason = '') => {
      const gain = Math.max(0, Math.round(Number(amount) || 0));
      if (!gain) return;
      const balance = Math.max(0, (Number(getBalance()) || 0) + gain);
      setBalance(balance);
      persist();
      scheduleWorldSave();
      playCoinAudio();
      if (reason) setStatus(`+${gain} shard / ${reason}`);
    };

    const spend = (amount) => {
      const cost = Math.max(0, Math.round(Number(amount) || 0));
      const balance = Number(getBalance()) || 0;
      if (balance < cost) return false;
      setBalance(balance - cost);
      persist();
      scheduleWorldSave();
      return true;
    };

    const mergeRemoteBalance = (remoteBalance) => {
      const balance = Math.max(
        Number(getBalance()) || 0,
        Number(remoteBalance) || 0
      );
      setBalance(balance);
      return balance;
    };

    const summary = () => [
      '] SIGNAL SHARDS',
      '',
      `  bakiye: ${getBalance()} shard`,
      '',
      '  kazanim: gunluk ilk ziyaret +2, yeni esik kesfi +2, take +3,',
      '           unlock +5, ritual +1, rezonans +3',
      '  harcama: shop (kozmetik dukkan)',
      ']'
    ].join('\n');

    return Object.freeze({ award, spend, mergeRemoteBalance, summary });
  }

  root.createEconomy = createEconomy;
})();
