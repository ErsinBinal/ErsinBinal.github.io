/**
 * Convivium - Co-op kapi ALTYAPISI (coop-gate)
 * Iki ziyaretci 8 saniye icinde ayni kelimeyi "resonate <kelime>" ile
 * soylerse rezonans olusur. Supabase Realtime broadcast kanali kullanir;
 * tabloya yazilmaz, anon key yeterli. Bu faz yalniz altyapi: rezonans
 * yakalaninca onSync(code) tetiklenir, uygulanacak kapi sonraki fazda.
 * createCoopGate(deps) fabrikasi ile kurulur.
 * (c) 2026 Ersin Binal - https://ersinbinal.github.io
 */
(() => {
  window.ConviviumHome = window.ConviviumHome || {};

  window.ConviviumHome.createCoopGate = (deps) => {
    const { getClient, getTag, onSync } = deps;

    const WINDOW_MS = 8000;
    let channel = null;
    let connected = false;
    let subscribing = false;
    // kod -> { tag, ts }: hem kendi hem uzak denemeler kisa sure tutulur.
    const ownAttempts = new Map();
    const remoteAttempts = new Map();
    const syncedCodes = new Set(); // ayni rezonansi iki kez tetikleme

    const normalizeCode = (value) => String(value || '')
      .toLocaleLowerCase('tr-TR')
      .replace(/[ığüşöç]/g, (ch) => ({ 'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c' }[ch] || ch))
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 24);

    const prune = (map) => {
      const now = Date.now();
      map.forEach((entry, code) => {
        if (now - entry.ts > WINDOW_MS) map.delete(code);
      });
    };

    const fireSync = (code) => {
      const key = `${code}:${Math.floor(Date.now() / WINDOW_MS)}`;
      if (syncedCodes.has(key)) return;
      syncedCodes.add(key);
      if (syncedCodes.size > 32) syncedCodes.clear();
      try { onSync?.(code); } catch { /* rezonans geri cagrisi deneyimi bozmasin */ }
    };

    const handleAttempt = (payload) => {
      const tag = typeof getTag === 'function' ? getTag() : '';
      if (!payload || !payload.code || payload.tag === tag) return;
      prune(ownAttempts);
      remoteAttempts.set(payload.code, { tag: payload.tag, ts: Date.now() });
      const own = ownAttempts.get(payload.code);
      if (own && Date.now() - own.ts <= WINDOW_MS) fireSync(payload.code);
    };

    const ensureChannel = () => {
      if (channel || subscribing) return;
      const client = typeof getClient === 'function' ? getClient() : null;
      if (!client || typeof client.channel !== 'function') return;
      subscribing = true;
      channel = client.channel('coop:gate', {
        config: { broadcast: { self: false, ack: false } }
      });
      channel.on('broadcast', { event: 'attempt' }, (msg) => handleAttempt(msg.payload));
      channel.subscribe((status) => {
        subscribing = false;
        if (status === 'SUBSCRIBED') connected = true;
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          connected = false;
        }
      });
    };

    const attempt = (rawCode) => {
      const code = normalizeCode(rawCode);
      if (!code) return 'resonate: usage resonate <kelime>';
      ensureChannel();
      if (!channel) return 'resonate: kanal kapali. sinyal agi cevrimdisi.';
      const tag = typeof getTag === 'function' ? getTag() : 'wanderer-????';
      prune(remoteAttempts);
      ownAttempts.set(code, { tag, ts: Date.now() });
      const remote = remoteAttempts.get(code);
      if (remote && Date.now() - remote.ts <= WINDOW_MS) {
        fireSync(code);
      } else if (connected) {
        try {
          channel.send({ type: 'broadcast', event: 'attempt', payload: { tag, code, ts: Date.now() } });
        } catch { /* yayin best-effort */ }
      } else {
        // Kanal daha baglaniyor; deneme pencere icinde tutulur, yayin ilk
        // firsatta bir sonraki attempt'te gider.
        return `resonate: "${code}" kaydedildi; kanal isiniyor, tekrar dene.`;
      }
      return [
        `resonate: "${code}" frekansa birakildi.`,
        '8 saniye icinde bir baska gezgin ayni kelimeyi soylerse... hissedersin.'
      ].join('\n');
    };

    return {
      attempt,
      isActive: () => connected
    };
  };
})();
