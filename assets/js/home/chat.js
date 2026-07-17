/**
 * Convivium - Canli sohbet (chat)
 * Presence katmaninin ustune kurulu ucucu terminal sohbeti. Supabase
 * Realtime broadcast kanali kullanir: tabloya YAZILMAZ, gecmis tutulmaz,
 * anon key yeterli. Kimlik yerine presence gezgin rumuzu (wanderer-xxxx)
 * konusur. Sohbet varsayilan KAPALI; "chat" ile acilir, "say <mesaj>" ile
 * yazilir. Supabase yoksa sessizce devre disi.
 * createChat(deps) fabrikasi ile kurulur.
 * (c) 2026 Ersin Binal - https://ersinbinal.github.io
 */
(() => {
  window.ConviviumHome = window.ConviviumHome || {};

  window.ConviviumHome.createChat = (deps) => {
    const { getClient, getTag, getRoom, onMessage } = deps;

    const MAX_BODY = 200;
    const MIN_SEND_GAP_MS = 1500;
    const HISTORY_LIMIT = 20;

    let channel = null;
    let connected = false;
    let subscribing = false;
    let listening = false; // kullanici sohbeti acti mi (opt-in)
    let lastSentAt = 0;
    const history = []; // { tag, room, body, ts }

    const cleanBody = (value) => String(value || '')
      .replace(/[\x00-\x1f\x7f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_BODY);

    const pushHistory = (entry) => {
      history.push(entry);
      if (history.length > HISTORY_LIMIT) history.shift();
    };

    const formatLine = (entry) => `${entry.tag} ${entry.room || '/'} > ${entry.body}`;

    const handleIncoming = (payload) => {
      const tag = typeof getTag === 'function' ? getTag() : '';
      if (!payload || !payload.body || payload.tag === tag) return;
      const entry = {
        tag: String(payload.tag || 'wanderer-????').slice(0, 24),
        room: String(payload.room || '/').slice(0, 24),
        body: cleanBody(payload.body),
        ts: Date.now()
      };
      if (!entry.body) return;
      pushHistory(entry);
      if (!listening) return; // sohbet kapaliyken sessiz birikir
      try { onMessage?.(formatLine(entry)); } catch { /* sohbet deneyimi bozmasin */ }
    };

    const ensureChannel = () => {
      if (channel || subscribing) return;
      const client = typeof getClient === 'function' ? getClient() : null;
      if (!client || typeof client.channel !== 'function') return;
      subscribing = true;
      channel = client.channel('chat:site', {
        config: { broadcast: { self: false, ack: false } }
      });
      channel.on('broadcast', { event: 'msg' }, (msg) => handleIncoming(msg.payload));
      channel.subscribe((status) => {
        subscribing = false;
        if (status === 'SUBSCRIBED') connected = true;
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          connected = false;
        }
      });
    };

    const open = () => {
      ensureChannel();
      if (!channel) return 'chat: sinyal agi cevrimdisi. sohbet acilamadi.';
      listening = true;
      const recent = history.slice(-6);
      const lines = [
        '] CHAT ACIK',
        '',
        `  rumuzun: ${typeof getTag === 'function' ? getTag() : '?'}`,
        '  yaz: say <mesaj>   kapat: chat off',
        '  (ucucu kanal: mesajlar kaydedilmez, yalniz o an acik olanlar duyar)'
      ];
      if (recent.length) {
        lines.push('', '  son duyulanlar:');
        recent.forEach((entry) => lines.push(`    ${formatLine(entry)}`));
      }
      lines.push(']');
      return lines.join('\n');
    };

    const close = () => {
      if (!listening) return 'chat: zaten kapali.';
      listening = false;
      return 'chat: kapandi. (say yazarsan tekrar acilir)';
    };

    const say = (rawBody) => {
      const body = cleanBody(rawBody);
      if (!body) return 'say: usage say <mesaj>';
      ensureChannel();
      if (!channel) return 'say: sinyal agi cevrimdisi.';
      const wasListening = listening;
      listening = true; // konusan duymaya da baslar
      if (!connected) return 'say: kanal isiniyor; bir saniye sonra tekrar dene.';
      const now = Date.now();
      if (now - lastSentAt < MIN_SEND_GAP_MS) return 'say: yavas. frekans flood sevmez.';
      lastSentAt = now;
      const entry = {
        tag: typeof getTag === 'function' ? getTag() : 'wanderer-????',
        room: typeof getRoom === 'function' ? getRoom() : '/',
        body,
        ts: now
      };
      try {
        channel.send({ type: 'broadcast', event: 'msg', payload: entry });
      } catch {
        return 'say: mesaj gonderilemedi.';
      }
      pushHistory(entry);
      const prefix = wasListening ? '' : '(chat acildi) ';
      return `${prefix}sen ${entry.room} > ${body}`;
    };

    const command = (rawArg = '') => {
      const arg = String(rawArg || '').trim().toLowerCase();
      if (!arg || arg === 'toggle') return listening ? close() : open();
      if (arg === 'on' || arg === 'ac') return listening ? 'chat: zaten acik.' : open();
      if (arg === 'off' || arg === 'kapat') return close();
      if (arg === 'status' || arg === 'durum') {
        return `chat: ${listening ? 'acik' : 'kapali'} / kanal: ${connected ? 'bagli' : 'kapali'} / duyulan: ${history.length} mesaj`;
      }
      if (arg === 'log' || arg === 'gecmis') {
        if (!history.length) return 'chat: henuz mesaj duyulmadi. (kanal actiginda duymaya baslarsin)';
        return [
          '] CHAT LOG (ucucu, son ' + history.length + ')',
          '',
          ...history.slice(-12).map((entry) => `  ${formatLine(entry)}`),
          ']'
        ].join('\n');
      }
      return 'chat: usage chat | chat off | chat status | chat log · yazmak icin: say <mesaj>';
    };

    return {
      command,
      say,
      isListening: () => listening,
      isActive: () => connected
    };
  };
})();
