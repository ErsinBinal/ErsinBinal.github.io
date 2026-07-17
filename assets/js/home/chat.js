/**
 * Convivium - Canli sohbet (chat)
 * Presence katmaninin ustune kurulu ucucu terminal sohbeti. Supabase
 * Realtime broadcast kanali kullanir: tabloya YAZILMAZ, gecmis tutulmaz,
 * anon key yeterli. Kimlik yerine presence gezgin rumuzu (wanderer-xxxx)
 * konusur. Sohbet varsayilan KAPALI; "chat" ile acilir, "say <mesaj>" ile
 * yazilir. v2: dogrudan mesaj (DM/fisilti) + oyun davetleri (invite) ve
 * chat guvertesi icin onEvent akisi. Supabase yoksa sessizce devre disi.
 * createChat(deps) fabrikasi ile kurulur.
 * (c) 2026 Ersin Binal - https://ersinbinal.github.io
 */
(() => {
  window.ConviviumHome = window.ConviviumHome || {};

  window.ConviviumHome.createChat = (deps) => {
    const { getClient, getTag, getRoom, onMessage, onEvent } = deps;

    const MAX_BODY = 200;
    const MIN_SEND_GAP_MS = 1500;
    const HISTORY_LIMIT = 30;
    const OPTIN_KEY = 'convivium.chat.optin'; // bir kez katilan, sonraki ziyarette sessizce dinler
    const INVITE_GAMES = { crude: 'Crude Buster co-op', dart: 'Dart online' };

    let channel = null;
    let connected = false;
    let subscribing = false;
    let listening = false; // kullanici sohbeti acti mi (opt-in)
    let lastSentAt = 0;
    const history = []; // { tag, room, body, ts, kind, to, game, code, self }

    const cleanBody = (value) => String(value || '')
      .replace(/[\x00-\x1f\x7f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_BODY);

    const cleanTag = (value) => String(value || '').replace(/[^\w-]/g, '').slice(0, 24);

    const randomRoomCode = () => {
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let out = '';
      for (let i = 0; i < 5; i += 1) out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      return out;
    };

    const pushHistory = (entry) => {
      history.push(entry);
      if (history.length > HISTORY_LIMIT) history.shift();
    };

    const formatLine = (entry) => {
      if (entry.kind === 'invite') {
        return `${entry.tag} davet > ${INVITE_GAMES[entry.game] || entry.game} / oda ${entry.code}`;
      }
      if (entry.to) return `${entry.tag} (fisilti) > ${entry.body}`;
      return `${entry.tag} ${entry.room || '/'} > ${entry.body}`;
    };

    const emitEvent = (entry) => {
      try { onEvent?.(entry); } catch { /* guverte akisi deneyimi bozmasin */ }
    };

    const handleIncoming = (payload) => {
      const tag = typeof getTag === 'function' ? getTag() : '';
      if (!payload || payload.tag === tag) return;
      const to = cleanTag(payload.to);
      if (to && to !== tag) return; // baskasina fisilti; bize dusmez
      const entry = {
        tag: cleanTag(payload.tag) || 'wanderer-????',
        room: String(payload.room || '/').slice(0, 24),
        body: cleanBody(payload.body),
        kind: payload.kind === 'invite' ? 'invite' : (to ? 'dm' : 'msg'),
        to: to || '',
        game: payload.kind === 'invite' && INVITE_GAMES[payload.game] ? payload.game : '',
        code: payload.kind === 'invite' ? String(payload.code || '').replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase() : '',
        self: false,
        ts: Date.now()
      };
      if (entry.kind === 'invite' && (!entry.game || !entry.code)) return;
      if (entry.kind !== 'invite' && !entry.body) return;
      pushHistory(entry);
      emitEvent(entry);
      if (!listening) return; // sohbet kapaliyken terminale dusmez
      try { onMessage?.(formatLine(entry), entry); } catch { /* sessiz */ }
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

    const rememberOptin = () => {
      try { localStorage.setItem(OPTIN_KEY, '1'); } catch { /* sessiz */ }
    };

    const forgetOptin = () => {
      try { localStorage.removeItem(OPTIN_KEY); } catch { /* sessiz */ }
    };

    // Onceki ziyaretinde kanala katilmis kullanici: sayfa acilisinda
    // sessizce dinlemeye baslar (cip/terminal bildirimleri calisir).
    const resume = () => {
      try {
        if (localStorage.getItem(OPTIN_KEY) !== '1') return false;
      } catch { return false; }
      ensureChannel();
      if (!channel) return false;
      listening = true;
      return true;
    };

    // Ortak gonderim cekirdegi: say / fisilti / davet ayni yoldan gecer.
    const transmit = (fields) => {
      ensureChannel();
      if (!channel) return { error: 'sinyal agi cevrimdisi.' };
      listening = true; // konusan duymaya da baslar
      rememberOptin();
      if (!connected) return { error: 'kanal isiniyor; bir saniye sonra tekrar dene.' };
      const now = Date.now();
      if (now - lastSentAt < MIN_SEND_GAP_MS) return { error: 'yavas. frekans flood sevmez.' };
      lastSentAt = now;
      const entry = {
        tag: typeof getTag === 'function' ? getTag() : 'wanderer-????',
        room: typeof getRoom === 'function' ? getRoom() : '/',
        ts: now,
        self: true,
        kind: fields.kind || (fields.to ? 'dm' : 'msg'),
        to: fields.to || '',
        body: fields.body || '',
        game: fields.game || '',
        code: fields.code || ''
      };
      try {
        channel.send({
          type: 'broadcast',
          event: 'msg',
          payload: {
            tag: entry.tag, room: entry.room, body: entry.body,
            to: entry.to, kind: entry.kind === 'invite' ? 'invite' : undefined,
            game: entry.game || undefined, code: entry.code || undefined, ts: now
          }
        });
      } catch {
        return { error: 'mesaj gonderilemedi.' };
      }
      pushHistory(entry);
      emitEvent(entry);
      return { entry };
    };

    const open = () => {
      ensureChannel();
      if (!channel) return 'chat: sinyal agi cevrimdisi. sohbet acilamadi.';
      listening = true;
      rememberOptin();
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
      forgetOptin(); // "chat off" diyen sonraki ziyaretlerde de rahatsiz edilmez
      return 'chat: kapandi. (say yazarsan tekrar acilir)';
    };

    const say = (rawBody) => {
      const body = cleanBody(rawBody);
      if (!body) return 'say: usage say <mesaj>';
      const wasListening = listening;
      const result = transmit({ body });
      if (result.error) return `say: ${result.error}`;
      const prefix = wasListening ? '' : '(chat acildi) ';
      return `${prefix}sen ${result.entry.room} > ${body}`;
    };

    const sendDirect = (toTag, rawBody) => {
      const to = cleanTag(toTag);
      const body = cleanBody(rawBody);
      if (!to) return { error: 'hedef rumuz gecersiz.' };
      if (!body) return { error: 'bos fisilti olmaz.' };
      const result = transmit({ to, body, kind: 'dm' });
      return result.error ? result : { entry: result.entry };
    };

    const sendInvite = (toTag, game) => {
      const to = cleanTag(toTag);
      if (!to) return { error: 'hedef rumuz gecersiz.' };
      if (!INVITE_GAMES[game]) return { error: 'bilinmeyen oyun.' };
      const code = randomRoomCode();
      const result = transmit({
        to, kind: 'invite', game, code,
        body: `${INVITE_GAMES[game]} daveti / oda ${code}`
      });
      return result.error ? result : { entry: result.entry, code };
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
          ...history.slice(-12).map((entry) => `  ${entry.self ? 'sen' : entry.tag} > ${entry.kind === 'invite' ? formatLine(entry) : entry.body}`),
          ']'
        ].join('\n');
      }
      return 'chat: usage chat | chat off | chat status | chat log · yazmak icin: say <mesaj>';
    };

    return {
      command,
      say,
      open,
      resume,
      sendDirect,
      sendInvite,
      historyList: () => history.map((entry) => ({ ...entry })),
      isListening: () => listening,
      isActive: () => connected
    };
  };
})();
