/**
 * Convivium - Chat Guvertesi (chat deck)
 * "chat" komutu ekran koruyucu benzeri tam ekran bir guverte acar:
 * solda canli akis + mesaj yazma satiri, sagda aktif gezginler listesi.
 * Bir gezginin rumuzuna tiklaninca fisilti (DM) paneli acilir; oradan
 * Crude Buster co-op ve Dart online davetleri gonderilebilir. Davetler
 * URL parametreli linkler tasir: davet eden "odayi kur" ile, kabul eden
 * "kabul et" ile dogrudan ayni odaya duser. Guverte yalniz EXIT butonu
 * (veya Escape) ile kapanir; ekrana tiklamak kapatmaz.
 * createChatDeck(deps) fabrikasi ile kurulur.
 * (c) 2026 Ersin Binal - https://ersinbinal.github.io
 */
(() => {
  window.ConviviumHome = window.ConviviumHome || {};

  window.ConviviumHome.createChatDeck = (deps) => {
    const { getChat, getWanderers, getSelfTag, getRoom, pulse } = deps;

    const GAME_LINKS = {
      crude: {
        label: 'Crude Buster co-op',
        host: (code) => `/games/crude-buster.html?coop-host=${code}`,
        join: (code) => `/games/crude-buster.html?coop-join=${code}`
      },
      dart: {
        label: 'Dart online',
        host: (code) => `/tools/dart-skorbord.html?online-host=${code}`,
        join: (code) => `/tools/dart-skorbord.html?online-join=${code}`
      }
    };

    let overlay = null;
    let chipEl = null;
    let chipTimer = null;
    let unreadCount = 0;
    let feedEl = null;
    let inputEl = null;
    let wandererListEl = null;
    let dmPanelEl = null;
    let dmTargetEl = null;
    let dmInputEl = null;
    let statusEl = null;
    let refreshTimer = null;
    let dmTarget = '';

    const chat = () => (typeof getChat === 'function' ? getChat() : null);

    const el = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };

    const setStatus = (text) => {
      if (statusEl) statusEl.textContent = text || '';
    };

    const stamp = (ts) => new Date(ts || Date.now()).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    // Sinyal cipi (sol-alt): guverte kapaliyken gelen mesaji haber verir.
    // Diger sabit butonlarla cakismaz (sag-alt ses/CMD, sol-ust access,
    // sag-ust HUD). Tiklaninca guverte acilir; acilinca sayac sifirlanir.
    const ensureChip = () => {
      if (chipEl) return chipEl;
      chipEl = el('button', 'chat-signal-chip');
      chipEl.type = 'button';
      chipEl.setAttribute('aria-label', 'Yeni sohbet mesaji: chat guvertesini ac');
      chipEl.addEventListener('click', () => open());
      document.body.appendChild(chipEl);
      return chipEl;
    };

    const hideChip = () => {
      unreadCount = 0;
      chipEl?.classList.remove('is-visible', 'is-alert');
    };

    // Cipe kisa omurlu kivilcimlar firlatir: Bugy'nin mesaji "akim gibi"
    // butona gonderdigi hissini verir, dikkati koseye ceker.
    const spawnChipSparks = () => {
      if (!chipEl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const rect = chipEl.getBoundingClientRect();
      const originX = rect.left + Math.min(26, rect.width * 0.18);
      const originY = rect.top + rect.height / 2;
      const count = 6;
      for (let i = 0; i < count; i += 1) {
        const spark = el('span', 'chat-chip-spark');
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.4; // cogunlukla yukari-disari
        const dist = 16 + Math.random() * 26;
        spark.style.left = `${Math.round(originX)}px`;
        spark.style.top = `${Math.round(originY)}px`;
        spark.style.setProperty('--dx', `${Math.round(Math.cos(angle) * dist)}px`);
        spark.style.setProperty('--dy', `${Math.round(Math.sin(angle) * dist)}px`);
        spark.style.animationDelay = `${Math.random() * 90}ms`;
        document.body.appendChild(spark);
        spark.addEventListener('animationend', () => spark.remove(), { once: true });
      }
    };

    const notifyChip = (entry) => {
      const chip = ensureChip();
      unreadCount += 1;
      const kindMark = entry.kind === 'invite' ? 'davet' : entry.kind === 'dm' ? 'fisilti' : 'sinyal';
      chip.textContent = `⚡ ${unreadCount} · ${entry.tag} (${kindMark})`;
      chip.classList.add('is-visible');
      chip.classList.remove('is-alert');
      // Yeni mesajda elektrik-benzeri nabiz + kivilcim (class yeniden tetiklenir).
      window.requestAnimationFrame(() => chip.classList.add('is-alert'));
      spawnChipSparks();
      if (chipTimer) window.clearTimeout(chipTimer);
      chipTimer = window.setTimeout(() => chipEl?.classList.remove('is-alert'), 4000);
      pulse?.(500, 0.04);
    };

    // Akis satiri: mesaj/fisilti metin, davetler kabul linkli kart olur.
    const appendEntry = (entry) => {
      if (!feedEl || !entry) return;
      const line = el('div', `deck-line${entry.self ? ' is-self' : ''}${entry.kind === 'dm' ? ' is-dm' : ''}${entry.kind === 'invite' ? ' is-invite' : ''}`);
      line.appendChild(el('span', 'deck-time', stamp(entry.ts)));
      const who = entry.self ? 'sen' : entry.tag;
      if (entry.kind === 'invite') {
        const game = GAME_LINKS[entry.game];
        line.appendChild(el('span', 'deck-tag', `${who} davet >`));
        line.appendChild(el('span', 'deck-body', ` ${game ? game.label : entry.game} / oda ${entry.code} `));
        if (game && entry.code) {
          const link = el('a', 'deck-accept', entry.self ? '[ODAYI KUR]' : '[KABUL ET]');
          link.href = entry.self ? game.host(entry.code) : game.join(entry.code);
          link.target = '_blank';
          link.rel = 'noopener';
          line.appendChild(link);
        }
      } else {
        const scope = entry.kind === 'dm' ? '(fisilti)' : (entry.room || '/');
        line.appendChild(el('span', 'deck-tag', `${who} ${scope} >`));
        line.appendChild(el('span', 'deck-body', ` ${entry.body}`));
      }
      feedEl.appendChild(line);
      while (feedEl.children.length > 80) feedEl.removeChild(feedEl.firstChild);
      feedEl.scrollTop = feedEl.scrollHeight;
    };

    const renderWanderers = () => {
      if (!wandererListEl) return;
      const selfTag = typeof getSelfTag === 'function' ? getSelfTag() : '?';
      const selfRoom = typeof getRoom === 'function' ? getRoom() : '/';
      const others = (typeof getWanderers === 'function' ? getWanderers() : []) || [];
      wandererListEl.textContent = '';
      const selfRow = el('div', 'deck-wanderer is-self');
      selfRow.appendChild(el('strong', '', selfTag));
      selfRow.appendChild(el('span', '', `${selfRoom} (sen)`));
      wandererListEl.appendChild(selfRow);
      if (!others.length) {
        wandererListEl.appendChild(el('div', 'deck-empty', 'cevre sessiz. su an baska gezgin yok.'));
        if (dmTarget) closeDmPanel();
        return;
      }
      others.slice(0, 16).forEach((wanderer) => {
        const row = el('button', 'deck-wanderer');
        row.type = 'button';
        row.appendChild(el('strong', '', wanderer.tag));
        row.appendChild(el('span', '', wanderer.room || '/'));
        row.addEventListener('click', () => openDmPanel(wanderer.tag));
        wandererListEl.appendChild(row);
      });
      // Hedef gezgin ayrildiysa paneli kapat.
      if (dmTarget && !others.some((w) => w.tag === dmTarget)) {
        setStatus(`${dmTarget} frekanstan ayrildi.`);
        closeDmPanel();
      }
    };

    const openDmPanel = (tag) => {
      dmTarget = tag;
      if (dmTargetEl) dmTargetEl.textContent = tag;
      dmPanelEl?.classList.add('is-open');
      dmInputEl?.focus();
      pulse?.(420, 0.05);
    };

    const closeDmPanel = () => {
      dmTarget = '';
      dmPanelEl?.classList.remove('is-open');
    };

    const sendBroadcast = () => {
      const body = (inputEl?.value || '').trim();
      if (!body) return;
      const api = chat();
      if (!api) { setStatus('sohbet modulu hazir degil.'); return; }
      const result = api.say(body);
      if (/^say: /.test(result)) setStatus(result.replace(/^say: /, ''));
      else { setStatus(''); if (inputEl) inputEl.value = ''; }
    };

    const sendWhisper = () => {
      const body = (dmInputEl?.value || '').trim();
      if (!body || !dmTarget) return;
      const api = chat();
      if (!api?.sendDirect) { setStatus('fisilti modulu hazir degil.'); return; }
      const result = api.sendDirect(dmTarget, body);
      if (result.error) { setStatus(result.error); return; }
      setStatus(`fisilti ${dmTarget} rumuzuna gitti.`);
      if (dmInputEl) dmInputEl.value = '';
    };

    const sendInvite = (game) => {
      if (!dmTarget) return;
      const api = chat();
      if (!api?.sendInvite) { setStatus('davet modulu hazir degil.'); return; }
      const result = api.sendInvite(dmTarget, game);
      if (result.error) { setStatus(result.error); return; }
      setStatus(`${GAME_LINKS[game].label} daveti gitti (oda ${result.code}). Akistaki [ODAYI KUR] ile odani ac.`);
      pulse?.(520, 0.07);
    };

    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (dmPanelEl?.classList.contains('is-open')) closeDmPanel();
        else close();
      }
    };

    const ensureOverlay = () => {
      if (overlay) return overlay;
      overlay = el('div', 'chat-deck');
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-label', 'Convivium chat guvertesi');
      overlay.setAttribute('aria-hidden', 'true');

      const frame = el('div', 'deck-frame');

      const header = el('header', 'deck-header');
      header.appendChild(el('span', 'deck-title', 'CONVIVIUM CHAT DECK'));
      const selfLabel = el('span', 'deck-self-tag', '');
      header.appendChild(selfLabel);
      const exitBtn = el('button', 'deck-exit', 'EXIT');
      exitBtn.type = 'button';
      exitBtn.addEventListener('click', close);
      header.appendChild(exitBtn);
      frame.appendChild(header);

      const main = el('div', 'deck-main');

      const feedWrap = el('section', 'deck-feed-wrap');
      feedEl = el('div', 'deck-feed');
      feedEl.setAttribute('aria-live', 'polite');
      feedWrap.appendChild(feedEl);
      const inputRow = el('div', 'deck-input-row');
      inputEl = document.createElement('input');
      inputEl.type = 'text';
      inputEl.maxLength = 200;
      inputEl.placeholder = 'herkese yaz... (Enter)';
      inputEl.className = 'deck-input';
      inputEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { event.preventDefault(); sendBroadcast(); }
        event.stopPropagation(); // terminal kisayollari karismasinlar
      });
      const sendBtn = el('button', 'deck-send', 'GONDER');
      sendBtn.type = 'button';
      sendBtn.addEventListener('click', sendBroadcast);
      inputRow.append(inputEl, sendBtn);
      feedWrap.appendChild(inputRow);
      statusEl = el('div', 'deck-status', '');
      feedWrap.appendChild(statusEl);
      main.appendChild(feedWrap);

      const side = el('aside', 'deck-side');
      side.appendChild(el('h3', 'deck-side-title', 'AKTIF GEZGINLER'));
      side.appendChild(el('p', 'deck-side-hint', 'rumuza tikla: fisilti + oyun daveti'));
      wandererListEl = el('div', 'deck-wanderers');
      side.appendChild(wandererListEl);

      dmPanelEl = el('div', 'deck-dm');
      const dmHead = el('div', 'deck-dm-head');
      dmHead.appendChild(el('span', '', 'fisilti -> '));
      dmTargetEl = el('strong', '', '');
      dmHead.appendChild(dmTargetEl);
      const dmClose = el('button', 'deck-dm-close', 'x');
      dmClose.type = 'button';
      dmClose.addEventListener('click', closeDmPanel);
      dmHead.appendChild(dmClose);
      dmPanelEl.appendChild(dmHead);
      dmInputEl = document.createElement('input');
      dmInputEl.type = 'text';
      dmInputEl.maxLength = 200;
      dmInputEl.placeholder = 'ozel mesaj... (Enter)';
      dmInputEl.className = 'deck-input';
      dmInputEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { event.preventDefault(); sendWhisper(); }
        event.stopPropagation();
      });
      dmPanelEl.appendChild(dmInputEl);
      const dmActions = el('div', 'deck-dm-actions');
      const whisperBtn = el('button', 'deck-dm-btn', 'FISILTI GONDER');
      whisperBtn.type = 'button';
      whisperBtn.addEventListener('click', sendWhisper);
      const crudeBtn = el('button', 'deck-dm-btn', 'CRUDE BUSTER DAVETI');
      crudeBtn.type = 'button';
      crudeBtn.addEventListener('click', () => sendInvite('crude'));
      const dartBtn = el('button', 'deck-dm-btn', 'DART DAVETI');
      dartBtn.type = 'button';
      dartBtn.addEventListener('click', () => sendInvite('dart'));
      dmActions.append(whisperBtn, crudeBtn, dartBtn);
      dmPanelEl.appendChild(dmActions);
      side.appendChild(dmPanelEl);

      main.appendChild(side);
      frame.appendChild(main);
      frame.appendChild(el('footer', 'deck-footer', 'ucucu kanal: mesajlar kaydedilmez / davetler oda koduyla gider / EXIT ile kapanir'));
      overlay.appendChild(frame);
      document.body.appendChild(overlay);

      overlay.__selfLabel = selfLabel;
      return overlay;
    };

    const open = () => {
      const node = ensureOverlay();
      hideChip(); // okunmamis sayaci sifirla
      const api = chat();
      api?.command?.('on'); // guverte acikken kanal da dinlemede
      node.classList.add('is-active');
      node.setAttribute('aria-hidden', 'false');
      document.body.classList.add('chat-deck-active');
      if (node.__selfLabel) node.__selfLabel.textContent = `rumuzun: ${typeof getSelfTag === 'function' ? getSelfTag() : '?'}`;
      if (feedEl && !feedEl.children.length && api?.historyList) {
        api.historyList().slice(-20).forEach(appendEntry);
      }
      renderWanderers();
      if (refreshTimer) window.clearInterval(refreshTimer);
      refreshTimer = window.setInterval(renderWanderers, 3000);
      document.addEventListener('keydown', handleKeydown, { capture: true });
      inputEl?.focus();
      pulse?.(480, 0.06);
      return 'chat deck acik. (kapat: EXIT)';
    };

    function close() {
      if (!overlay) return;
      overlay.classList.remove('is-active');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('chat-deck-active');
      if (refreshTimer) window.clearInterval(refreshTimer);
      refreshTimer = null;
      document.removeEventListener('keydown', handleKeydown, { capture: true });
      closeDmPanel();
      // Kanal dinlemede kalir: terminal say/chat akisi devam eder.
    }

    const receive = (entry) => {
      appendEntry(entry);
      if (!entry?.self && !overlay?.classList.contains('is-active')) notifyChip(entry);
    };

    return {
      open,
      close,
      receive,
      isActive: () => Boolean(overlay?.classList.contains('is-active'))
    };
  };
})();
