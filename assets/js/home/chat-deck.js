/**
 * Convivium Chat Deck v7
 * Ortak ucucu kanal + RLS korumali arkadas/DM/grup merkezi.
 */
(() => {
  window.ConviviumHome = window.ConviviumHome || {};

  window.ConviviumHome.createChatDeck = (deps) => {
    const { getChat, getWanderers, getSelfTag, getRoom, pulse } = deps;
    const symbols = window.ConviviumHome.chatSymbols;
    const GAME_LINKS = {
      crude: { label: 'Crude Buster co-op', host: (c) => `/games/crude-buster.html?coop-host=${c}`, join: (c) => `/games/crude-buster.html?coop-join=${c}` },
      dart: { label: 'Dart online', host: (c) => `/tools/dart-skorbord.html?online-host=${c}`, join: (c) => `/tools/dart-skorbord.html?online-join=${c}` }
    };

    let overlay;
    let chipEl;
    let chipTimer;
    let unreadCount = 0;
    let feedEl;
    let inputEl;
    let statusEl;
    let sideEl;
    let channelEl;
    let social = null;
    let authSession = null;
    let authChecked = false;
    let socialError = '';
    let threads = [];
    let activeThread = null;
    let presenceTarget = '';
    let refreshTimer;
    let unsubscribeMessages;
    let loadingThread = false;
    let symbolShelfEl;
    let symbolTriggerEl;
    let lastFocusEl;

    const api = () => (typeof getChat === 'function' ? getChat() : null);
    const backend = () => window.ConviviumBackend || null;
    const el = (tag, className, value) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (value !== undefined) node.textContent = value;
      return node;
    };
    const button = (label, className, action) => {
      const node = el('button', className, label);
      node.type = 'button';
      node.addEventListener('click', action);
      return node;
    };
    const setStatus = (value, error = false) => {
      if (!statusEl) return;
      statusEl.textContent = value || '';
      statusEl.classList.toggle('is-error', error);
    };
    const stamp = (ts) => new Date(ts || Date.now()).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const cleanHandle = (value) => String(value || '').replace(/^@/, '').trim().toLowerCase();
    const isSchemaMissing = (error) => /PGRST202|schema cache|Could not find the function/i.test(String(error?.message || error || ''));

    const closeSymbolShelf = (restoreFocus = true) => {
      if (!symbolShelfEl) return false;
      const wasOpen = symbolShelfEl.classList.contains('is-open');
      symbolShelfEl.classList.remove('is-open');
      symbolShelfEl.setAttribute('aria-hidden', 'true');
      symbolTriggerEl?.setAttribute('aria-expanded', 'false');
      const trigger = symbolTriggerEl;
      symbolTriggerEl = null;
      if (wasOpen && restoreFocus) trigger?.focus();
      return wasOpen;
    };

    const insertSymbol = (symbol) => {
      if (!inputEl || !symbols?.insertAtCursor) return;
      const result = symbols.insertAtCursor(
        inputEl.value,
        symbol,
        inputEl.selectionStart,
        inputEl.selectionEnd,
        Number(inputEl.maxLength) || 1000
      );
      inputEl.value = result.value;
      inputEl.focus();
      inputEl.setSelectionRange?.(result.caret, result.caret);
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const ensureSymbolShelf = (feedWrap) => {
      if (symbolShelfEl || !symbols?.categories) return symbolShelfEl;
      symbolShelfEl = el('section', 'deck-symbol-shelf');
      symbolShelfEl.setAttribute('role', 'dialog');
      symbolShelfEl.setAttribute('aria-label', 'Tuslu telefon sembol rafi');
      symbolShelfEl.setAttribute('aria-hidden', 'true');
      const head = el('div', 'deck-symbol-head');
      head.append(el('strong', '', 'SMS DONEMI SEMBOL RAFI'), el('span', '', 'emoji degil; metne eklenir'));
      head.appendChild(button('KAPAT', 'deck-symbol-close', () => closeSymbolShelf()));
      symbolShelfEl.appendChild(head);
      symbols.categories.forEach((category) => {
        const group = el('div', 'deck-symbol-group');
        group.appendChild(el('h4', '', category.label));
        const grid = el('div', 'deck-symbol-grid');
        category.items.forEach((item) => {
          const choice = button(item.symbol, 'deck-symbol', () => insertSymbol(item.symbol));
          choice.title = item.name;
          choice.setAttribute('aria-label', `${item.name}: ${item.symbol}`);
          grid.appendChild(choice);
        });
        group.appendChild(grid);
        symbolShelfEl.appendChild(group);
      });
      feedWrap.appendChild(symbolShelfEl);
      return symbolShelfEl;
    };

    const toggleSymbolShelf = (trigger) => {
      if (!symbolShelfEl) { setStatus('Sembol rafi hazir degil.', true); return; }
      if (symbolShelfEl.classList.contains('is-open')) { closeSymbolShelf(); return; }
      symbolTriggerEl = trigger;
      trigger.setAttribute('aria-expanded', 'true');
      symbolShelfEl.classList.add('is-open');
      symbolShelfEl.setAttribute('aria-hidden', 'false');
      symbolShelfEl.querySelector('.deck-symbol')?.focus();
    };

    const ensureChip = () => {
      if (chipEl) return chipEl;
      chipEl = button('', 'chat-signal-chip', () => open());
      chipEl.setAttribute('aria-label', 'Yeni sohbet mesaji: chat guvertesini ac');
      document.body.appendChild(chipEl);
      return chipEl;
    };
    const hideChip = () => {
      unreadCount = 0;
      chipEl?.classList.remove('is-visible', 'is-alert');
    };
    const notifyChip = (entry) => {
      const chip = ensureChip();
      unreadCount += 1;
      chip.textContent = `⚡ ${unreadCount} · ${entry.sender_handle || entry.tag || 'yeni sinyal'}`;
      chip.classList.add('is-visible');
      chip.classList.remove('is-alert');
      requestAnimationFrame(() => chip.classList.add('is-alert'));
      clearTimeout(chipTimer);
      chipTimer = setTimeout(() => chip.classList.remove('is-alert'), 4000);
      pulse?.(500, 0.04);
    };

    const appendEntry = (entry) => {
      if (!feedEl || !entry) return;
      const isInvite = entry.kind === 'invite' || entry.message_type === 'game_invite';
      const isPrivate = Boolean(entry.thread_id || entry.kind === 'dm');
      const selfId = social?.profile?.user_id;
      const isSelf = entry.self || (selfId && entry.sender_id === selfId);
      const line = el('div', `deck-line${isSelf ? ' is-self' : ''}${isPrivate ? ' is-dm' : ''}${isInvite ? ' is-invite' : ''}`);
      line.dataset.messageId = entry.id || '';
      line.appendChild(el('span', 'deck-time', stamp(entry.created_at || entry.ts)));
      const who = isSelf ? 'sen' : (entry.sender_handle || entry.tag || '?');
      line.appendChild(el('span', 'deck-tag', `${who} ${isPrivate ? '(ozel)' : (entry.room || '/')} >`));
      line.appendChild(el('span', 'deck-body', ` ${entry.body || ''}`));
      const gameKey = entry.metadata?.game || entry.game;
      const code = entry.metadata?.code || entry.code;
      const game = GAME_LINKS[gameKey];
      if (isInvite && game && code) {
        const link = el('a', 'deck-accept', isSelf ? '[ODAYI KUR]' : '[KABUL ET]');
        link.href = isSelf ? game.host(code) : game.join(code);
        link.target = '_blank';
        link.rel = 'noopener';
        line.appendChild(link);
      }
      feedEl.appendChild(line);
      while (feedEl.children.length > 100) feedEl.firstChild.remove();
      feedEl.scrollTop = feedEl.scrollHeight;
    };

    const showGlobal = () => {
      activeThread = null;
      if (channelEl) channelEl.textContent = 'ORTAK KANAL · UCUCU';
      if (inputEl) inputEl.placeholder = 'herkese yaz... (Enter)';
      if (feedEl) {
        feedEl.textContent = '';
        api()?.historyList?.().slice(-40).forEach(appendEntry);
      }
      renderSide();
    };

    const openThread = async (thread) => {
      if (!thread?.id || loadingThread) return;
      loadingThread = true;
      activeThread = thread;
      if (channelEl) channelEl.textContent = `${thread.kind === 'group' ? 'GRUP' : 'OZEL MESAJ'} · ${thread.title || 'SOHBET'}`;
      if (inputEl) inputEl.placeholder = 'ozel mesaj... (Enter)';
      setStatus('mesajlar aliniyor...');
      try {
        const rows = await backend().listChatMessages(thread.id, 80);
        if (activeThread?.id !== thread.id) return;
        feedEl.textContent = '';
        rows.forEach(appendEntry);
        setStatus('');
      } catch (error) {
        setStatus(error.message, true);
      } finally {
        loadingThread = false;
        renderSide();
      }
    };

    const refreshSocial = async () => {
      const b = backend();
      if (!b?.getSession) return null;
      try {
        authSession = await b.getSession();
      } catch {
        authSession = null;
      }
      authChecked = true;
      if (!authSession) {
        social = null;
        socialError = '';
        threads = [];
        renderSide();
        return null;
      }
      if (!b?.getSocialSnapshot) {
        social = null;
        socialError = 'Sosyal sohbet servisi henuz hazir degil.';
        renderSide();
        return null;
      }
      try {
        [social, threads] = await Promise.all([b.getSocialSnapshot(), b.listChatThreads()]);
        socialError = '';
        threads = threads || [];
        if (activeThread) activeThread = threads.find((item) => item.id === activeThread.id) || null;
        renderSide();
        return social;
      } catch (error) {
        social = null;
        socialError = isSchemaMissing(error)
          ? 'Ozel mesaj ve engel sunucusu henuz etkin degil. Guvensiz bir istemci taklidine geri dusulmez.'
          : (error?.message || 'Sosyal sohbet servisine ulasilamadi.');
        threads = [];
        renderSide();
        return null;
      }
    };

    const runSocial = async (work, success) => {
      try {
        setStatus('isleniyor...');
        await work();
        await api()?.refreshSocial?.();
        await refreshSocial();
        setStatus(success || 'tamam.');
      } catch (error) {
        setStatus(error.message || 'islem tamamlanamadi.', true);
      }
    };

    const requestBlock = (member, leaveThread = false) => {
      const handle = cleanHandle(member?.handle);
      if (!handle) { setStatus('Engellenecek uye bulunamadi.', true); return; }
      const accepted = window.confirm(
        `@${handle} engellensin mi? Arkadaslik ve birebir sohbet kanali kapanir; eski birebir mesajlar silinebilir.`
      );
      if (!accepted) return;
      runSocial(async () => {
        await backend().blockMember(handle);
        if (leaveThread) showGlobal();
      }, `@${handle} engellendi. Mesaj ve arkadaslik baglantisi kapatildi.`);
    };

    const startFriendChat = async (friend) => {
      try {
        setStatus(`@${friend.handle} kanali aciliyor...`);
        const id = await backend().openDirectChat(friend.handle);
        await refreshSocial();
        const thread = threads.find((item) => item.id === id);
        if (thread) await openThread(thread);
      } catch (error) {
        setStatus(error.message, true);
      }
    };

    const renderMemberRow = (member, actions = []) => {
      const row = el('div', 'deck-social-row');
      const identity = el('button', 'deck-social-identity');
      identity.type = 'button';
      identity.append(el('strong', '', `@${member.handle}`), el('span', '', member.display_name || member.handle));
      if (member.is_friend || social?.friends?.some((f) => f.handle === member.handle)) {
        identity.addEventListener('click', () => startFriendChat(member));
      } else {
        identity.disabled = true;
      }
      const actionWrap = el('div', 'deck-social-actions');
      actions.forEach((item) => actionWrap.appendChild(button(
        item.label,
        `deck-mini-btn${item.danger ? ' is-danger' : ''}`,
        item.action
      )));
      row.append(identity, actionWrap);
      return row;
    };

    const renderSide = () => {
      if (!sideEl) return;
      sideEl.textContent = '';
      sideEl.dataset.socialState = social?.profile ? 'ready' : authChecked ? (authSession?.user ? 'unavailable' : 'guest') : 'checking';
      sideEl.appendChild(el('h3', 'deck-side-title', 'UYE AGI'));
      if (!social?.profile) {
        if (!authChecked) {
          sideEl.appendChild(el('p', 'deck-side-hint', 'oturum kontrol ediliyor...'));
        } else if (authSession?.user) {
          const fallbackName = authSession.user.user_metadata?.display_name || authSession.user.email || 'uye';
          const profile = el('div', 'deck-profile');
          profile.append(el('strong', '', fallbackName), el('span', '', 'oturum acik'));
          sideEl.append(profile, el('p', 'deck-side-hint is-warning', socialError || 'Uye agi hazirlaniyor. Ortak kanal ve oyun davetleri kullanilabilir.'));
          const unavailable = el('div', 'deck-capability-preview');
          unavailable.append(
            el('strong', '', 'OZEL MESAJLAR + KISI ENGELLEME'),
            el('span', '', 'Sunucu yetki katmani hazir oldugunda burada acilir; ortak kanal acik kalir.')
          );
          const disabledPrivate = button('OZEL MESAJ', 'deck-mini-btn', () => {});
          const disabledBlock = button('ENGELLE', 'deck-mini-btn is-danger', () => {});
          disabledPrivate.disabled = true;
          disabledBlock.disabled = true;
          unavailable.append(disabledPrivate, disabledBlock);
          sideEl.appendChild(unavailable);
        } else {
          sideEl.appendChild(el('p', 'deck-side-hint', 'Ozel mesaj, kisi engelleme ve grup icin giris yap. Ortak kanal ve oyun davetleri acik kalir.'));
          const login = el('a', 'deck-login-link', 'UYELIK / GIRIS');
          login.href = '/account/auth.html';
          sideEl.appendChild(login);
          const guestPreview = el('div', 'deck-capability-preview');
          guestPreview.append(
            el('strong', '', 'UYE FREKANSLARI'),
            el('span', '', 'OZEL MESAJ · KISI ENGELLEME · GRUP SOHBETI')
          );
          sideEl.appendChild(guestPreview);
        }
        renderPresence(sideEl);
        return;
      }

      const profile = el('div', 'deck-profile');
      profile.append(el('strong', '', `@${social.profile.handle}`), el('span', '', social.profile.display_name || ''));
      sideEl.appendChild(profile);
      const socialGuide = el('div', 'deck-social-guide');
      socialGuide.append(
        el('strong', '', 'OZEL MESAJ MERKEZI'),
        el('span', '', 'Arkadas satirinda OZEL MESAJ; konusma icinde ENGELLE. Engeller sunucuda uygulanir.')
      );
      sideEl.appendChild(socialGuide);

      const handleBox = el('details', 'deck-handle-box');
      handleBox.appendChild(el('summary', '', 'benzersiz kullanici adini degistir'));
      const handleRow = el('div', 'deck-search-row');
      const handleInput = document.createElement('input');
      handleInput.className = 'deck-input';
      handleInput.placeholder = '3-24: harf, rakam, _ veya -';
      handleInput.maxLength = 24;
      handleInput.addEventListener('keydown', (event) => event.stopPropagation());
      handleRow.append(handleInput, button('AYIR', 'deck-mini-btn', () => runSocial(
        () => backend().claimHandle(cleanHandle(handleInput.value)),
        'Kullanici adi ayrildi. Presence yeni kimligi sonraki acilista kullanacak.'
      )));
      handleBox.appendChild(handleRow);
      sideEl.appendChild(handleBox);

      const searchRow = el('div', 'deck-search-row');
      const search = document.createElement('input');
      search.className = 'deck-input';
      search.placeholder = '@kullanici veya ad ara';
      search.maxLength = 40;
      const results = el('div', 'deck-search-results');
      const doSearch = async () => {
        const query = search.value.trim();
        if (query.length < 2) { setStatus('Arama icin en az 2 karakter yaz.', true); return; }
        try {
          const rows = await backend().searchMembers(query, 12);
          results.textContent = '';
          if (!rows.length) results.appendChild(el('div', 'deck-empty', 'uye bulunamadi.'));
          rows.forEach((member) => {
            const actions = [];
            if (member.is_friend) actions.push({ label: 'OZEL MESAJ', action: () => startFriendChat(member) });
            else if (!member.request_status) actions.push({ label: 'EKLE', action: () => runSocial(() => backend().sendFriendRequest(member.handle), 'Arkadaslik daveti gitti.') });
            else actions.push({ label: member.request_status === 'pending' ? 'BEKLIYOR' : 'YENILE', action: () => {} });
            actions.push({ label: 'ENGELLE', danger: true, action: () => requestBlock(member) });
            results.appendChild(renderMemberRow(member, actions));
          });
        } catch (error) { setStatus(error.message, true); }
      };
      search.addEventListener('keydown', (event) => {
        event.stopPropagation();
        if (event.key === 'Enter') { event.preventDefault(); doSearch(); }
      });
      searchRow.append(search, button('ARA', 'deck-mini-btn', doSearch));
      sideEl.append(searchRow, results);

      if (social.incoming?.length) {
        sideEl.appendChild(el('h4', 'deck-section-title', `DAVETLER · ${social.incoming.length}`));
        social.incoming.forEach((member) => sideEl.appendChild(renderMemberRow(member, [
          { label: 'KABUL', action: () => runSocial(() => backend().respondFriendRequest(member.friendship_id, true), `@${member.handle} arkadaslarina eklendi.`) },
          { label: 'REDDET', action: () => runSocial(() => backend().respondFriendRequest(member.friendship_id, false), 'Davet reddedildi.') },
          { label: 'ENGELLE', danger: true, action: () => requestBlock(member) }
        ])));
      }

      if (social.outgoing?.length) {
        sideEl.appendChild(el('h4', 'deck-section-title', `GIDEN DAVETLER · ${social.outgoing.length}`));
        social.outgoing.forEach((member) => sideEl.appendChild(renderMemberRow(member, [
          { label: 'IPTAL', action: () => runSocial(() => backend().cancelFriendRequest(member.friendship_id), 'Davet iptal edildi.') }
        ])));
      }

      sideEl.appendChild(el('h4', 'deck-section-title', `ARKADASLAR / OZEL MESAJ · ${social.friends?.length || 0}`));
      if (!social.friends?.length) sideEl.appendChild(el('div', 'deck-empty', 'Arama ile ilk baglantini kur.'));
      social.friends?.forEach((friend) => sideEl.appendChild(renderMemberRow(friend, [
        { label: 'OZEL MESAJ', action: () => startFriendChat(friend) },
        { label: 'CIKAR', action: () => runSocial(() => backend().removeFriend(friend.handle), 'Arkadaslik kaldirildi.') },
        { label: 'ENGELLE', danger: true, action: () => requestBlock(friend) }
      ])));

      if (social.blocked?.length) {
        sideEl.appendChild(el('h4', 'deck-section-title is-security', `GUVENLIK / ENGELLENENLER · ${social.blocked.length}`));
        social.blocked.forEach((member) => sideEl.appendChild(renderMemberRow(member, [
          { label: 'ENGELI KALDIR', action: () => runSocial(() => backend().unblockMember(member.handle), 'Engel kaldirildi; arkadaslik ve eski sohbet kendiliginden geri gelmez.') }
        ])));
      }

      sideEl.appendChild(el('h4', 'deck-section-title', `OZEL MESAJLAR VE GRUPLAR · ${threads.length}`));
      const globalBtn = button('⌁ ORTAK KANAL', `deck-thread${activeThread ? '' : ' is-active'}`, showGlobal);
      sideEl.appendChild(globalBtn);
      threads.forEach((thread) => {
        const label = `${thread.kind === 'group' ? '◈ GRUP' : '→ OZEL'} · ${thread.title || 'sohbet'}${thread.last_body ? ` · ${thread.last_body.slice(0, 24)}` : ''}`;
        sideEl.appendChild(button(label, `deck-thread${activeThread?.id === thread.id ? ' is-active' : ''}`, () => openThread(thread)));
      });

      if (activeThread?.kind === 'direct') {
        const other = (activeThread.members || []).find((member) => member.user_id !== social.profile.user_id);
        if (other) {
          const directTools = el('div', 'deck-direct-tools');
          directTools.append(
            el('strong', '', `OZEL MESAJ · @${other.handle}`),
            el('span', '', 'Bu konusma sunucuda saklanir ve yalniz taraflara aciktir.'),
            button('KISIYI ENGELLE', 'deck-danger-btn', () => requestBlock(other, true))
          );
          sideEl.appendChild(directTools);
        }
      }

      if (activeThread?.kind === 'group') {
        const selfMember = (activeThread.members || []).find((member) => member.user_id === social.profile.user_id);
        const canManage = selfMember?.role === 'owner' || selfMember?.role === 'admin';
        const groupAdmin = el('details', 'deck-group-admin');
        groupAdmin.appendChild(el('summary', '', 'grup yonetimi'));
        (activeThread.members || []).forEach((member) => {
          const actions = [];
          if (canManage && member.user_id !== social.profile.user_id && member.role !== 'owner') {
            actions.push({ label: 'CIKAR', action: () => runSocial(() => backend().manageGroupMember(activeThread.id, member.handle, 'remove'), 'Uye gruptan cikarildi.') });
          }
          groupAdmin.appendChild(renderMemberRow(member, actions));
        });
        if (canManage) {
          const addRow = el('div', 'deck-search-row');
          const addInput = document.createElement('input');
          addInput.className = 'deck-input';
          addInput.placeholder = 'arkadas handle ekle';
          addInput.addEventListener('keydown', (event) => event.stopPropagation());
          addRow.append(addInput, button('EKLE', 'deck-mini-btn', () => runSocial(
            () => backend().manageGroupMember(activeThread.id, cleanHandle(addInput.value), 'add'),
            'Uye gruba eklendi.'
          )));
          groupAdmin.appendChild(addRow);
        }
        if (selfMember?.role === 'owner') {
          const transferRow = el('div', 'deck-search-row');
          const transferInput = document.createElement('input');
          transferInput.className = 'deck-input';
          transferInput.placeholder = 'sahipligi devret: handle';
          transferInput.addEventListener('keydown', (event) => event.stopPropagation());
          transferRow.append(transferInput, button('DEVRET', 'deck-mini-btn', () => runSocial(
            () => backend().transferGroupOwner(activeThread.id, cleanHandle(transferInput.value)),
            'Grup sahipligi devredildi.'
          )));
          groupAdmin.append(transferRow, button('GRUBU SIL', 'deck-danger-btn', () => {
            if (!window.confirm('Bu grup ve tum mesajlari kalici olarak silinsin mi?')) return;
            runSocial(async () => { await backend().deleteGroupChat(activeThread.id); showGlobal(); }, 'Grup silindi.');
          }));
        } else {
          groupAdmin.appendChild(button('GRUPTAN AYRIL', 'deck-danger-btn', () => runSocial(async () => {
            await backend().leaveGroupChat(activeThread.id);
            showGlobal();
          }, 'Gruptan ayrildin.')));
        }
        sideEl.appendChild(groupAdmin);
      }

      const groupBox = el('div', 'deck-group-create');
      const title = document.createElement('input');
      title.className = 'deck-input';
      title.placeholder = 'grup adi';
      title.maxLength = 60;
      const members = document.createElement('input');
      members.className = 'deck-input';
      members.placeholder = 'arkadas handle: ada, deniz';
      members.maxLength = 240;
      [title, members].forEach((node) => node.addEventListener('keydown', (event) => event.stopPropagation()));
      groupBox.append(title, members, button('GRUP KUR', 'deck-mini-btn', () => {
        const handles = members.value.split(',').map(cleanHandle).filter(Boolean);
        runSocial(async () => {
          const id = await backend().createGroupChat(title.value, handles);
          await refreshSocial();
          const thread = threads.find((item) => item.id === id);
          if (thread) await openThread(thread);
        }, 'Grup kuruldu.');
      }));
      sideEl.appendChild(groupBox);

      renderPresence(sideEl);
    };

    const renderPresence = (root) => {
      root.appendChild(el('h4', 'deck-section-title', 'AKTIF SINYALLER'));
      const others = (typeof getWanderers === 'function' ? getWanderers() : []) || [];
      if (presenceTarget && !others.some((wanderer) => wanderer.tag === presenceTarget)) presenceTarget = '';
      if (!others.length) root.appendChild(el('div', 'deck-empty', 'cevre sessiz.'));
      others.slice(0, 12).forEach((wanderer) => {
        const identity = button('', `deck-wanderer${presenceTarget === wanderer.tag ? ' is-selected' : ''}`, () => {
          presenceTarget = presenceTarget === wanderer.tag ? '' : wanderer.tag;
          renderSide();
        });
        identity.append(el('strong', '', wanderer.tag), el('span', '', wanderer.room || '/'));
        root.appendChild(identity);
      });
      if (!presenceTarget) return;
      const invitePanel = el('div', 'deck-invite-panel');
      invitePanel.appendChild(el('div', 'deck-dm-head', `davet -> ${presenceTarget}`));
      const actions = el('div', 'deck-dm-actions');
      actions.append(
        button('CRUDE BUSTER DAVETI', 'deck-dm-btn', () => sendGameInvite('crude', presenceTarget)),
        button('DART DAVETI', 'deck-dm-btn', () => sendGameInvite('dart', presenceTarget)),
        button('KAPAT', 'deck-dm-btn', () => { presenceTarget = ''; renderSide(); })
      );
      invitePanel.appendChild(actions);
      root.appendChild(invitePanel);
    };

    const sendCurrent = async () => {
      const body = inputEl?.value.trim();
      if (!body) return;
      if (!activeThread) {
        const result = api()?.say(body) || 'say: sohbet modulu hazir degil.';
        if (/^say: /.test(result)) setStatus(result.replace(/^say: /, ''), true);
        else { inputEl.value = ''; setStatus(''); closeSymbolShelf(false); }
        return;
      }
      try {
        await backend().sendChatMessage(activeThread.id, body);
        inputEl.value = '';
        closeSymbolShelf(false);
        await openThread({ ...activeThread });
        await refreshSocial();
      } catch (error) { setStatus(error.message, true); }
    };

    const sendGameInvite = async (game, targetTag = '') => {
      let target = cleanHandle(targetTag || presenceTarget);
      if (!target && activeThread?.kind === 'direct') {
        target = cleanHandle((activeThread.members || []).find((member) => member.user_id !== social?.profile?.user_id)?.handle);
      }
      if (!target) { setStatus('Oyun daveti icin AKTIF SINYALLER listesinden bir gezgin sec.', true); return; }
      try {
        const result = await Promise.resolve(api()?.sendInvite?.(target, game));
        if (!result || result.error) { setStatus(result?.error || 'Davet gonderilemedi.', true); return; }
        setStatus(`${GAME_LINKS[game].label} daveti ${target} sinyaline gitti (oda ${result.code}).`);
      } catch (error) { setStatus(error.message || 'Davet gonderilemedi.', true); }
    };

    const ensureOverlay = () => {
      if (overlay) return overlay;
      overlay = el('div', 'chat-deck');
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-label', 'Convivium chat guvertesi');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-hidden', 'true');
      const frame = el('div', 'deck-frame');
      const header = el('header', 'deck-header');
      header.append(el('span', 'deck-title', 'CONVIVIUM CHAT DECK'));
      channelEl = el('button', 'deck-channel-title', 'ORTAK KANAL · UCUCU');
      channelEl.type = 'button';
      channelEl.addEventListener('click', showGlobal);
      header.append(channelEl, el('span', 'deck-self-tag', `@${typeof getSelfTag === 'function' ? getSelfTag() : '?'}`), button('EXIT', 'deck-exit', close));
      const main = el('div', 'deck-main');
      const feedWrap = el('section', 'deck-feed-wrap');
      feedEl = el('div', 'deck-feed');
      feedEl.setAttribute('aria-live', 'polite');
      const inputRow = el('div', 'deck-input-row');
      inputEl = document.createElement('input');
      inputEl.className = 'deck-input';
      inputEl.maxLength = 1000;
      inputEl.placeholder = 'herkese yaz... (Enter)';
      inputEl.addEventListener('keydown', (event) => {
        event.stopPropagation();
        if (event.key === 'Enter') { event.preventDefault(); sendCurrent(); }
      });
      const symbolButton = button('SEMBOLLER', 'deck-symbol-toggle', () => toggleSymbolShelf(symbolButton));
      symbolButton.setAttribute('aria-haspopup', 'dialog');
      symbolButton.setAttribute('aria-expanded', 'false');
      inputRow.append(inputEl, symbolButton, button('GONDER', 'deck-send', sendCurrent));
      statusEl = el('div', 'deck-status', '');
      statusEl.setAttribute('role', 'status');
      feedWrap.append(feedEl, inputRow, statusEl);
      ensureSymbolShelf(feedWrap);
      sideEl = el('aside', 'deck-side');
      main.append(feedWrap, sideEl);
      frame.append(header, main, el('footer', 'deck-footer', 'ortak kanal ucucu · ozel sohbetler yalniz arkadaslar arasinda · engeller sunucuda uygulanir'));
      overlay.appendChild(frame);
      document.body.appendChild(overlay);
      return overlay;
    };

    const handleKeydown = (event) => {
      if (event.key === 'Tab' && overlay?.classList.contains('is-active')) {
        const focusable = [...overlay.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href], summary')]
          .filter((node) => node.getClientRects().length > 0);
        if (focusable.length) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
        return;
      }
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (!closeSymbolShelf()) close();
      }
    };
    const open = () => {
      ensureOverlay();
      lastFocusEl = document.activeElement;
      hideChip();
      api()?.command?.('on');
      overlay.classList.add('is-active');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('chat-deck-active');
      showGlobal();
      refreshSocial();
      clearInterval(refreshTimer);
      refreshTimer = setInterval(refreshSocial, 15000);
      if (!unsubscribeMessages) {
        unsubscribeMessages = backend()?.subscribeToChatMessages?.((message) => {
          if (overlay?.classList.contains('is-active') && activeThread?.id === message.thread_id) {
            openThread({ ...activeThread });
          } else {
            notifyChip(message);
          }
          refreshSocial();
        });
      }
      document.addEventListener('keydown', handleKeydown, { capture: true });
      inputEl.focus();
      return 'chat deck acik. (kapat: EXIT)';
    };
    function close() {
      if (!overlay) return;
      closeSymbolShelf(false);
      overlay.classList.remove('is-active');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('chat-deck-active');
      clearInterval(refreshTimer);
      refreshTimer = null;
      document.removeEventListener('keydown', handleKeydown, { capture: true });
      if (lastFocusEl?.isConnected) lastFocusEl.focus();
      lastFocusEl = null;
    }
    const receive = (entry) => {
      if (overlay?.classList.contains('is-active') && (!activeThread || entry?.kind === 'invite')) appendEntry(entry);
      if (!entry?.self && !overlay?.classList.contains('is-active')) notifyChip(entry);
    };

    return { open, close, receive, refreshSocial, isActive: () => Boolean(overlay?.classList.contains('is-active')) };
  };
})();
