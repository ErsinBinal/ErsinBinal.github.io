/**
 * Convivium - Canli varlik katmani (presence)
 * Supabase Realtime Presence ile anonim es-zamanli ziyaretci izi.
 * Auth gerekmez (anon key yeterli); tabloya yazilmaz. Supabase yoksa ya da
 * baglanti kurulamazsa sessizce devre disi kalir.
 * createPresence(deps) fabrikasi ile kurulur (bkz. crude-buster-net.js deseni).
 * (c) 2026 Ersin Binal - https://ersinbinal.github.io
 */
(() => {
  window.ConviviumHome = window.ConviviumHome || {};

  window.ConviviumHome.createPresence = (deps) => {
    const { getClient, getRoom } = deps;

    const TAG_KEY = 'convivium.presence.tag';
    // Terminal odalari -> sinyal haritasi dugumleri (data-signal-node).
    const ROOM_TO_NODE = {
      '/': 'origin',
      '/routes': 'index',
      '/lab': 'lab',
      '/system': 'trace',
      '/home': 'archive',
      '/notes': 'notes',
      '/vault': 'hidden',
      '/core': 'hidden',
      '/atlas': 'hidden'
    };

    let channel = null;
    let connected = false;
    let entries = []; // digerleri: { tag, room, page }

    const tag = (() => {
      try {
        const existing = sessionStorage.getItem(TAG_KEY);
        if (existing) return existing;
        const fresh = `wanderer-${Math.random().toString(36).slice(2, 6)}`;
        sessionStorage.setItem(TAG_KEY, fresh);
        return fresh;
      } catch {
        return `wanderer-${Math.random().toString(36).slice(2, 6)}`;
      }
    })();

    const hudValue = () => document.getElementById('hud-presence');

    const renderHud = () => {
      const el = hudValue();
      if (!el) return;
      if (!connected) {
        el.textContent = 'offline';
        return;
      }
      el.textContent = entries.length
        ? `${entries.length} nearby`
        : 'solo drift';
    };

    const renderAtlas = () => {
      const glowing = new Set(
        entries.map((entry) => ROOM_TO_NODE[entry.room]).filter(Boolean)
      );
      document.querySelectorAll('[data-signal-node]').forEach((node) => {
        node.classList.toggle('has-signal', glowing.has(node.dataset.signalNode));
      });
    };

    const handleSync = () => {
      if (!channel) return;
      const state = channel.presenceState();
      const others = [];
      Object.keys(state).forEach((key) => {
        (state[key] || []).forEach((entry) => {
          if (entry && entry.tag && entry.tag !== tag) {
            others.push({ tag: entry.tag, room: entry.room || '/', page: entry.page || '/' });
          }
        });
      });
      entries = others;
      renderHud();
      renderAtlas();
    };

    const trackSelf = () => {
      if (!channel || !connected) return;
      try {
        channel.track({
          tag,
          page: location.pathname,
          room: typeof getRoom === 'function' ? getRoom() : '/'
        });
      } catch {
        // Presence izi best-effort; deneyimi asla bozmaz.
      }
    };

    const start = () => {
      const client = typeof getClient === 'function' ? getClient() : null;
      if (!client || typeof client.channel !== 'function') {
        renderHud();
        return false;
      }
      channel = client.channel('presence:site', {
        config: { presence: { key: tag } }
      });
      channel.on('presence', { event: 'sync' }, handleSync);
      channel.on('presence', { event: 'join' }, handleSync);
      channel.on('presence', { event: 'leave' }, handleSync);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          connected = true;
          trackSelf();
          renderHud();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          connected = false;
          entries = [];
          renderHud();
          renderAtlas();
        }
      });
      return true;
    };

    const whoCommand = () => {
      if (!connected) {
        return 'who: sinyal yok. (baglanti disi ya da presence agi kapali)';
      }
      const lines = [
        '] WHO',
        '',
        `  sen        : ${tag} ${typeof getRoom === 'function' ? getRoom() : '/'}`
      ];
      if (!entries.length) {
        lines.push('  cevre      : sessiz. su an baska gezgin yok.');
      } else {
        lines.push(`  yakinlarda : ${entries.length} sinyal`);
        entries.slice(0, 12).forEach((entry) => {
          lines.push(`    ${entry.tag}  ${entry.room}`);
        });
      }
      lines.push(']');
      return lines.join('\n');
    };

    return {
      start,
      sync: trackSelf,
      whoCommand,
      count: () => entries.length,
      isActive: () => connected,
      tag: () => tag
    };
  };
})();
