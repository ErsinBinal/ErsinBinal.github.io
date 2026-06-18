(function() {
  'use strict';

  const START_SCORE = 501;
  const STORAGE_KEYS = {
    RED: 'dart-red-session',
    BLUE: 'dart-blue-session'
  };
  const SLOT_NAMES = {
    RED: 'Kirmizi Oyuncu',
    BLUE: 'Mavi Oyuncu'
  };

  const CPU_PLAYERS = [
    { id: 'littler',   name: 'Luke Littler',   nick: 'The Nuke',       year: 2025, trebleRate: 0.52, doubleRate: 0.43, pressureBoost: 0.18 },
    { id: 'humphries', name: 'Luke Humphries',  nick: 'Cool Hand Luke', year: 2024, trebleRate: 0.49, doubleRate: 0.41, pressureBoost: 0.15 },
    { id: 'msmith',    name: 'Michael Smith',   nick: 'Bully Boy',      year: 2023, trebleRate: 0.47, doubleRate: 0.38, pressureBoost: 0.12 },
    { id: 'wright',    name: 'Peter Wright',    nick: 'Snakebite',      year: 2022, trebleRate: 0.46, doubleRate: 0.37, pressureBoost: 0.10 },
    { id: 'price',     name: 'Gerwyn Price',    nick: 'The Iceman',     year: 2021, trebleRate: 0.48, doubleRate: 0.39, pressureBoost: 0.13 }
  ];

  const cpuConfig = { RED: null, BLUE: null };
  let cpuTurnToken = 0;

  // Kural durumu (createInitialState bunu okur, böylece yeni maçta korunur).
  let ruleDoubleOut = true;

  // Online (Supabase Realtime) durumu.
  let online = null;
  let onlineMode = false;
  let localSlot = null;
  let onlineNames = { RED: null, BLUE: null };
  let boardController = null;

  // Oyun modu: 'x01' (501) | 'atc' (Around the Clock) | 'cricket'.
  let gameMode = 'x01';
  let atc = null;
  let cricket = null;

  // Aktif "ozel" mod modulu (x01 disindaki modlar ortak arayuzu paylasir).
  function customMode() {
    if (gameMode === 'atc') return atc;
    if (gameMode === 'cricket') return cricket;
    return null;
  }
  const audioCue = (name) => {
    window.ConviviumAudio?.play?.(name);
  };
  const checkoutRoutes = {
    170: 'T20 - T20 - BULL',
    167: 'T20 - T19 - BULL',
    164: 'T20 - T18 - BULL',
    161: 'T20 - T17 - BULL',
    160: 'T20 - T20 - D20',
    150: 'T20 - T20 - D15',
    140: 'T20 - T20 - D10',
    130: 'T20 - T20 - D5',
    120: 'T20 - S20 - D20',
    100: 'T20 - D20',
    90: 'T20 - D15',
    80: 'T20 - D10',
    70: 'T10 - D20',
    60: 'S20 - D20',
    50: 'BULLSEYE',
    40: 'D20',
    38: 'D19',
    36: 'D18',
    34: 'D17',
    32: 'D16',
    30: 'D15',
    28: 'D14',
    26: 'D13',
    24: 'D12',
    22: 'D11',
    20: 'D10',
    18: 'D9',
    16: 'D8',
    14: 'D7',
    12: 'D6',
    10: 'D5',
    8: 'D4',
    6: 'D3',
    4: 'D2',
    2: 'D1'
  };

  const backend = window.ConviviumBackend;
  const slotAuth = {
    RED: { client: null, user: null, label: SLOT_NAMES.RED },
    BLUE: { client: null, user: null, label: SLOT_NAMES.BLUE }
  };

  const els = {
    turnIndicator: document.getElementById('turnIndicator'),
    syncStatus: document.getElementById('syncStatus'),
    newMatchButton: document.getElementById('newMatchButton'),
    redForm: document.getElementById('redAuthForm'),
    blueForm: document.getElementById('blueAuthForm'),
    redSignOut: document.getElementById('redSignOut'),
    blueSignOut: document.getElementById('blueSignOut'),
    redAuthName: document.getElementById('redAuthName'),
    blueAuthName: document.getElementById('blueAuthName'),
    redAuthStatus: document.getElementById('redAuthStatus'),
    blueAuthStatus: document.getElementById('blueAuthStatus'),
    labelRED: document.getElementById('labelRED'),
    labelBLUE: document.getElementById('labelBLUE'),
    cardRED: document.getElementById('cardRED'),
    cardBLUE: document.getElementById('cardBLUE'),
    scoreRED: document.getElementById('scoreRED'),
    scoreBLUE: document.getElementById('scoreBLUE'),
    avgRED: document.getElementById('avgRED'),
    avgBLUE: document.getElementById('avgBLUE'),
    turnsRED: document.getElementById('turnsRED'),
    turnsBLUE: document.getElementById('turnsBLUE'),
    highRED: document.getElementById('highRED'),
    highBLUE: document.getElementById('highBLUE'),
    checkoutRED: document.getElementById('checkoutRED'),
    checkoutBLUE: document.getElementById('checkoutBLUE'),
    dartBadges: document.getElementById('dartBadges'),
    turnTotal: document.getElementById('turnTotal'),
    undoButton: document.getElementById('undoButton'),
    manualForm: document.getElementById('manualScoreForm'),
    keyboardInput: document.getElementById('keyboardInput'),
    keypad: document.querySelector('.dart-keypad'),
    overlay: document.getElementById('dartOverlay'),
    overlayTitle: document.getElementById('overlayTitle'),
    overlayText: document.getElementById('overlayText'),
    overlayResetButton: document.getElementById('overlayResetButton'),
    boardSvg: document.getElementById('dartBoardSvg'),
    doubleOutToggle: document.getElementById('doubleOutToggle'),
    onlineName: document.getElementById('onlineName'),
    onlineCreate: document.getElementById('onlineCreate'),
    onlineJoin: document.getElementById('onlineJoin'),
    onlineCodeInput: document.getElementById('onlineCodeInput'),
    onlineLeave: document.getElementById('onlineLeave'),
    onlineStatus: document.getElementById('onlineStatus'),
    onlineCode: document.getElementById('onlineCode'),
    doubleOutWrap: document.getElementById('doubleOutWrap'),
    modeSelect: document.querySelector('.dart-mode-select'),
    atcSection: document.getElementById('atcSection'),
    boardSection: document.querySelector('.dart-board'),
    turnPanel: document.querySelector('.dart-turn-panel'),
    controlsSection: document.querySelector('.dart-controls'),
    atcRED: document.getElementById('atcRED'),
    atcBLUE: document.getElementById('atcBLUE'),
    atcNameRED: document.getElementById('atcNameRED'),
    atcNameBLUE: document.getElementById('atcNameBLUE'),
    atcTargetRED: document.getElementById('atcTargetRED'),
    atcTargetBLUE: document.getElementById('atcTargetBLUE'),
    atcProgRED: document.getElementById('atcProgRED'),
    atcProgBLUE: document.getElementById('atcProgBLUE'),
    atcBadges: document.getElementById('atcBadges'),
    cricketSection: document.getElementById('cricketSection'),
    cricketGrid: document.getElementById('cricketGrid'),
    cricketHeadRED: document.getElementById('cricketHeadRED'),
    cricketHeadBLUE: document.getElementById('cricketHeadBLUE'),
    cricketNameRED: document.getElementById('cricketNameRED'),
    cricketNameBLUE: document.getElementById('cricketNameBLUE'),
    cricketScoreRED: document.getElementById('cricketScoreRED'),
    cricketScoreBLUE: document.getElementById('cricketScoreBLUE'),
    cricketBadges: document.getElementById('cricketBadges')
  };

  let state = createInitialState();

  function createStats() {
    return {
      totalScored: 0,
      totalDarts: 0,
      turnsCount: 0,
      highestTurn: 0,
      oneEighties: 0,
      busts: 0
    };
  }

  function createInitialState() {
    return {
      scores: { RED: START_SCORE, BLUE: START_SCORE },
      currentTurn: 'RED',
      currentSetDarts: [],
      currentTurnNumber: 1,
      currentTurnStartScore: START_SCORE,
      history: [],
      throwRecords: [],
      stats: { RED: createStats(), BLUE: createStats() },
      startedAt: Date.now(),
      isResolving: false,
      isComplete: false,
      persistedMatchId: null,
      rules: { doubleOut: ruleDoubleOut }
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function snapshot() {
    state.history.push(clone({
      scores: state.scores,
      currentTurn: state.currentTurn,
      currentSetDarts: state.currentSetDarts,
      currentTurnNumber: state.currentTurnNumber,
      currentTurnStartScore: state.currentTurnStartScore,
      throwRecords: state.throwRecords,
      stats: state.stats,
      isResolving: state.isResolving,
      isComplete: state.isComplete,
      persistedMatchId: state.persistedMatchId
    }));
  }

  function displayName(slot) {
    if (onlineMode && onlineNames[slot]) return onlineNames[slot];
    if (cpuConfig[slot]) return cpuConfig[slot].name;
    return slotAuth[slot].label || SLOT_NAMES[slot];
  }

  function userLabel(user, fallback) {
    return user?.user_metadata?.display_name || user?.email || fallback;
  }

  function hasTwoDistinctUsers() {
    return Boolean(
      slotAuth.RED.user &&
      slotAuth.BLUE.user &&
      slotAuth.RED.user.id !== slotAuth.BLUE.user.id
    );
  }

  function setSlotStatus(slot, message) {
    const target = slot === 'RED' ? els.redAuthStatus : els.blueAuthStatus;
    target.textContent = message;
  }

  function updateSyncStatus(message) {
    if (message) {
      els.syncStatus.textContent = message;
      return;
    }

    if (!backend || !backend.isConfigured()) {
      els.syncStatus.textContent = 'Supabase baglantisi yok. Skorbord misafir modunda calisir.';
      return;
    }

    if (slotAuth.RED.user && slotAuth.BLUE.user && slotAuth.RED.user.id === slotAuth.BLUE.user.id) {
      els.syncStatus.textContent = 'Iki farkli hesap gerekli. Ayni hesapla oynanan mac kaydedilmez.';
      return;
    }

    if (hasTwoDistinctUsers()) {
      els.syncStatus.textContent = 'Veritabani modu aktif. Mac bitince detayli atislar iki panele yazilir.';
      return;
    }

    els.syncStatus.textContent = 'Misafir modu aktif. Iki oyuncu giris yaparsa mac istatistikleri kaydedilir.';
  }

  async function refreshSlotSession(slot) {
    const auth = slotAuth[slot];
    if (!auth.client) return;

    try {
      const { data, error } = await auth.client.auth.getSession();
      if (error) throw error;
      auth.user = data.session?.user || null;
      auth.label = userLabel(auth.user, SLOT_NAMES[slot]);
      const signedIn = Boolean(auth.user);
      const nameEl = slot === 'RED' ? els.redAuthName : els.blueAuthName;
      const signOutButton = slot === 'RED' ? els.redSignOut : els.blueSignOut;
      nameEl.textContent = auth.label;
      signOutButton.disabled = !signedIn;
      setSlotStatus(slot, signedIn ? `Aktif: ${auth.user.email || auth.user.id}` : 'Misafir.');
    } catch (error) {
      auth.user = null;
      auth.label = SLOT_NAMES[slot];
      setSlotStatus(slot, error.message || 'Oturum okunamadi.');
    }

    render();
    updateSyncStatus();
  }

  async function handleSignIn(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const slot = form.dataset.slot;
    const auth = slotAuth[slot];
    if (!auth.client) return;

    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.email || !data.password) {
      setSlotStatus(slot, 'E-posta ve sifre gerekli.');
      return;
    }

    setFormBusy(form, true);
    setSlotStatus(slot, 'Giris yapiliyor...');

    try {
      const { error } = await auth.client.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });
      if (error) throw error;
      form.reset();
      await refreshSlotSession(slot);
    } catch (error) {
      setSlotStatus(slot, error.message || 'Giris yapilamadi.');
    } finally {
      setFormBusy(form, false);
    }
  }

  async function handleSignOut(slot) {
    const auth = slotAuth[slot];
    if (!auth.client) return;
    setSlotStatus(slot, 'Cikis yapiliyor...');

    try {
      const { error } = await auth.client.auth.signOut();
      if (error) throw error;
      await refreshSlotSession(slot);
    } catch (error) {
      setSlotStatus(slot, error.message || 'Cikis yapilamadi.');
    }
  }

  function setFormBusy(form, busy) {
    Array.from(form.elements).forEach((element) => {
      element.disabled = busy;
    });
  }

  function turnTotal() {
    return state.currentSetDarts.reduce((total, value) => total + value, 0);
  }

  function statAverage(slot) {
    const stats = state.stats[slot];
    if (!stats.totalDarts) return '0.0';
    return ((stats.totalScored / stats.totalDarts) * 3).toFixed(1);
  }

  function recordThrow(slot, value, options) {
    state.throwRecords.push({
      player_slot: slot,
      turn_number: state.currentTurnNumber,
      dart_number: state.currentSetDarts.length,
      dart_value: value,
      segment: options.segment || null,
      turn_total: options.turnTotal,
      remaining_score: options.remainingScore,
      is_bust: Boolean(options.isBust),
      is_winning_throw: Boolean(options.isWinningThrow),
      thrown_at: new Date().toISOString()
    });
  }

  function completeTurn(slot, scored, dartCount, isBust) {
    const stats = state.stats[slot];
    stats.turnsCount += 1;
    stats.totalDarts += dartCount;
    stats.totalScored += Math.max(0, Number(scored) || 0);
    if (isBust) stats.busts += 1;
    if (!isBust) {
      stats.highestTurn = Math.max(stats.highestTurn, scored);
      if (scored === 180) stats.oneEighties += 1;
    }
  }

  function addDart(value, meta) {
    meta = meta || {};
    if (state.isResolving || state.isComplete || state.currentSetDarts.length >= 3) return;

    // Online: yalniz siradaki yerel oyuncu giris yapabilir (uzak atislar meta.remote ile gelir).
    if (onlineMode && !meta.remote && state.currentTurn !== localSlot) return;

    const numericValue = Math.max(0, Math.min(60, Number(value) || 0));
    const isDouble = Boolean(meta.isDouble);
    const segment = meta.segment || null;

    // Online: yerel atisi rakibe yayinla (uzak atislar yeniden yayinlanmaz).
    if (onlineMode && !meta.remote && online) {
      online.sendDart({ value: numericValue, isDouble: isDouble, segment: segment });
    }

    audioCue(numericValue >= 50 ? 'app.highScore' : 'app.score');
    const slot = state.currentTurn;
    const currentScore = state.scores[slot];

    if (state.currentSetDarts.length === 0) {
      state.currentTurnStartScore = currentScore;
    }

    snapshot();

    const nextScore = currentScore - numericValue;
    state.currentSetDarts.push(numericValue);
    const dartsInTurn = state.currentSetDarts.length;
    const rawTurnTotal = turnTotal();

    const doubleOut = state.rules.doubleOut;
    let isBust = nextScore < 0;
    if (!isBust) {
      if (doubleOut) {
        if (nextScore === 1 || (nextScore === 0 && !isDouble)) isBust = true;
      } else if (nextScore === 1) {
        isBust = true;
      }
    }

    if (isBust) {
      state.scores[slot] = state.currentTurnStartScore;
      recordThrow(slot, numericValue, {
        turnTotal: 0,
        remainingScore: state.currentTurnStartScore,
        isBust: true,
        isWinningThrow: false,
        segment: segment
      });
      completeTurn(slot, 0, dartsInTurn, true);
      audioCue('game.bust');
      const bustMsg = (doubleOut && nextScore === 0 && !isDouble)
        ? 'Double ile bitirmelisiniz. Sira rakibe geciyor.'
        : 'Skor gecersiz oldu. Sira rakibe geciyor.';
      resolveTurn('Bust', bustMsg, true);
      return;
    }

    state.scores[slot] = nextScore;
    recordThrow(slot, numericValue, {
      turnTotal: rawTurnTotal,
      remainingScore: nextScore,
      isBust: false,
      isWinningThrow: nextScore === 0,
      segment: segment
    });

    if (nextScore === 0) {
      completeTurn(slot, rawTurnTotal, dartsInTurn, false);
      state.isComplete = true;
      render();
      audioCue('game.win');
      showOverlay('Leg kazanildi', `${displayName(slot)} maci bitirdi.`, true);
      persistCompletedMatch(slot);
      return;
    }

    render();

    if (state.currentSetDarts.length === 3) {
      const scored = rawTurnTotal;
      completeTurn(slot, scored, 3, false);
      if (scored >= 100) {
        audioCue(scored === 180 ? 'app.highScore' : 'game.power');
        resolveTurn(scored === 180 ? 'Perfect 180' : 'Harika set', `Set toplami: ${scored}`, false);
      } else if (scored <= 40) {
        resolveTurn('Dusuk set', `Set toplami: ${scored}`, false);
      } else if (!cpuConfig[slot] && (cpuConfig.RED || cpuConfig.BLUE)) {
        resolveTurn('Set', `${scored} puan`, false, 900);
      } else {
        advanceTurn();
      }
    }
  }

  function resolveTurn(title, text, isBust, delay = 1350) {
    state.isResolving = true;
    render();
    showOverlay(title, text, false);
    window.setTimeout(() => {
      hideOverlay();
      advanceTurn();
      if (isBust) updateSyncStatus('Bust kaydedildi. Mac bitince senkron durumu tekrar kontrol edilir.');
    }, delay);
  }

  function advanceTurn() {
    state.currentSetDarts = [];
    state.currentTurn = state.currentTurn === 'RED' ? 'BLUE' : 'RED';
    state.currentTurnNumber += 1;
    state.currentTurnStartScore = state.scores[state.currentTurn];
    state.isResolving = false;
    render();
    scheduleCpuTurn();
  }

  function undoLastAction() {
    if (onlineMode) return;
    if (!state.history.length || state.isResolving || state.isComplete || state.persistedMatchId) return;
    audioCue('app.undo');
    const previous = state.history.pop();
    state = {
      ...state,
      scores: previous.scores,
      currentTurn: previous.currentTurn,
      currentSetDarts: previous.currentSetDarts,
      currentTurnNumber: previous.currentTurnNumber,
      currentTurnStartScore: previous.currentTurnStartScore,
      throwRecords: previous.throwRecords,
      stats: previous.stats,
      isResolving: previous.isResolving,
      isComplete: previous.isComplete,
      persistedMatchId: previous.persistedMatchId
    };
    hideOverlay();
    render();
    updateSyncStatus();
  }

  function startNewMatch(opts) {
    opts = opts || {};
    audioCue('app.reset');
    if (!onlineMode) {
      ['RED', 'BLUE'].forEach((slot) => { if (cpuConfig[slot]) clearCpu(slot); });
    }
    state = createInitialState();
    hideOverlay();
    render();
    updateSyncStatus();
    els.keyboardInput.focus();
    // Online: yeni maci rakibe bildir (uzak istek tekrar yayinlanmaz).
    if (onlineMode && !opts.remote && online) {
      online.sendAction('new-match', {});
    }
  }

  function showOverlay(title, text, showReset) {
    els.overlayTitle.textContent = title;
    els.overlayText.textContent = text;
    els.overlayResetButton.hidden = !showReset;
    els.overlay.hidden = false;
  }

  function hideOverlay() {
    els.overlay.hidden = true;
    els.overlayResetButton.hidden = true;
  }

  function buildMatchSummary(winnerSlot) {
    const duration = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
    const players = {};

    ['RED', 'BLUE'].forEach((slot) => {
      const segments = {};
      state.throwRecords.forEach((r) => {
        if (r.player_slot === slot && r.segment) {
          segments[r.segment] = (segments[r.segment] || 0) + 1;
        }
      });
      players[slot] = {
        label: displayName(slot),
        average: Number(statAverage(slot)),
        totalDarts: state.stats[slot].totalDarts,
        totalScored: state.stats[slot].totalScored,
        turnsCount: state.stats[slot].turnsCount,
        highestTurn: state.stats[slot].highestTurn,
        oneEighties: state.stats[slot].oneEighties,
        busts: state.stats[slot].busts,
        segments: segments
      };
    });

    return {
      duration,
      payload: {
        winnerSlot,
        players,
        totalThrows: state.throwRecords.length,
        completedAt: new Date().toISOString()
      }
    };
  }

  async function persistCompletedMatch(winnerSlot) {
    if (onlineMode) {
      updateSyncStatus('Online mac tamamlandi. (Online maclar su an kaydedilmiyor.)');
      return;
    }
    if (!backend || !backend.isConfigured()) {
      updateSyncStatus('Mac misafir modunda bitti. Supabase baglantisi olmadigi icin kayit yapilmadi.');
      return;
    }

    const redUser = slotAuth.RED.user;
    const blueUser = slotAuth.BLUE.user;

    if (!redUser && !blueUser) {
      updateSyncStatus('Mac misafir modunda bitti. Kayit icin en az bir hesapla giris gerekli.');
      return;
    }

    try {
      updateSyncStatus('Dart maci kaydediliyor...');

      const bothDistinct = Boolean(redUser && blueUser && redUser.id !== blueUser.id);

      let opponentLabel = null;
      let opponentType = 'human';
      if (!bothDistinct) {
        const humanSlot = redUser ? 'RED' : 'BLUE';
        const oppSlot = humanSlot === 'RED' ? 'BLUE' : 'RED';
        const oppCpu = cpuConfig[oppSlot];
        if (oppCpu) {
          opponentType = 'cpu';
          opponentLabel = oppCpu.name;
        } else {
          opponentType = 'guest';
          opponentLabel = displayName(oppSlot);
        }
      }

      const primaryClient = redUser ? slotAuth.RED.client : slotAuth.BLUE.client;
      const winnerUser = slotAuth[winnerSlot].user;
      const summary = buildMatchSummary(winnerSlot);

      const match = await backend.createDartMatchWithClient(primaryClient, {
        mode: 'x01',
        red_user_id: redUser ? redUser.id : null,
        blue_user_id: bothDistinct ? blueUser.id : null,
        winner_user_id: winnerUser ? winnerUser.id : null,
        winner_slot: winnerSlot,
        start_score: START_SCORE,
        duration_seconds: summary.duration,
        red_final_score: state.scores.RED,
        blue_final_score: state.scores.BLUE,
        status: 'completed',
        summary: summary.payload,
        completed_at: summary.payload.completedAt,
        opponent_label: opponentLabel,
        opponent_type: opponentType
      });

      const throwPromises = [];
      if (redUser) {
        const rows = state.throwRecords
          .filter((r) => r.player_slot === 'RED')
          .map((r) => ({ ...r, match_id: match.id, user_id: redUser.id }));
        if (rows.length) throwPromises.push(backend.saveDartThrowsWithClient(slotAuth.RED.client, rows));
      }
      if (bothDistinct && blueUser) {
        const rows = state.throwRecords
          .filter((r) => r.player_slot === 'BLUE')
          .map((r) => ({ ...r, match_id: match.id, user_id: blueUser.id }));
        if (rows.length) throwPromises.push(backend.saveDartThrowsWithClient(slotAuth.BLUE.client, rows));
      }
      await Promise.all(throwPromises);

      state.persistedMatchId = match.id;
      updateSyncStatus('Mac kaydedildi.');
      render();
    } catch (error) {
      updateSyncStatus(`Dart kaydi tamamlanamadi: ${error.message || error}`);
    }
  }

  // --- Ozel mod (ATC / Cricket) mac kaydi ---
  let customPersistDone = false;

  function buildCustomSummary(mode, snap, winnerSlot, durationSeconds) {
    const players = {};
    if (mode === 'atc') {
      const total = (window.ConviviumDartATC && window.ConviviumDartATC.TARGETS.length) || 21;
      ['RED', 'BLUE'].forEach((slot) => {
        const pointer = snap.pointers ? (snap.pointers[slot] || 0) : 0;
        players[slot] = {
          label: displayName(slot),
          darts: snap.darts ? (snap.darts[slot] || 0) : 0,
          hits: snap.hits ? (snap.hits[slot] || 0) : 0,
          completed: pointer >= total,
          targetsLeft: Math.max(0, total - pointer),
          segments: snap.segments ? (snap.segments[slot] || {}) : {}
        };
      });
    } else {
      const numbers = (window.ConviviumDartCricket && window.ConviviumDartCricket.NUMBERS) || [];
      ['RED', 'BLUE'].forEach((slot) => {
        const marks = snap.marks ? (snap.marks[slot] || {}) : {};
        const closed = numbers.filter((n) => (marks[n] || 0) >= 3).length;
        players[slot] = {
          label: displayName(slot),
          points: snap.scores ? (snap.scores[slot] || 0) : 0,
          closed: closed,
          darts: snap.darts ? (snap.darts[slot] || 0) : 0,
          segments: snap.segments ? (snap.segments[slot] || {}) : {}
        };
      });
    }
    return { mode, winnerSlot: winnerSlot || null, players, completedAt: new Date().toISOString(), duration: durationSeconds };
  }

  async function persistCustomMatch(winnerSlot) {
    if (customPersistDone) return;
    if (onlineMode) {
      updateSyncStatus('Online mac tamamlandi. (Online maclar su an kaydedilmiyor.)');
      return;
    }
    if (!backend || !backend.isConfigured()) return;

    const cm = customMode();
    if (!cm) return;
    const redUser = slotAuth.RED.user;
    const blueUser = slotAuth.BLUE.user;
    if (!redUser && !blueUser) {
      updateSyncStatus('Mac bitti. Kayit icin en az bir hesapla giris gerekli.');
      return;
    }

    const snap = cm.serialize();
    const mode = gameMode;

    try {
      customPersistDone = true;
      updateSyncStatus('Mac kaydediliyor...');

      const bothDistinct = Boolean(redUser && blueUser && redUser.id !== blueUser.id);
      let opponentLabel = null;
      let opponentType = 'human';
      if (!bothDistinct) {
        const humanSlot = redUser ? 'RED' : 'BLUE';
        const oppSlot = humanSlot === 'RED' ? 'BLUE' : 'RED';
        const oppCpu = cpuConfig[oppSlot];
        if (oppCpu) { opponentType = 'cpu'; opponentLabel = oppCpu.name; }
        else { opponentType = 'guest'; opponentLabel = displayName(oppSlot); }
      }

      const primaryClient = redUser ? slotAuth.RED.client : slotAuth.BLUE.client;
      const winnerUser = winnerSlot ? slotAuth[winnerSlot].user : null;
      const duration = 0;
      const summary = buildCustomSummary(mode, snap, winnerSlot, duration);
      const finals = mode === 'cricket'
        ? { red: summary.players.RED.points, blue: summary.players.BLUE.points }
        : { red: snap.pointers ? snap.pointers.RED : 0, blue: snap.pointers ? snap.pointers.BLUE : 0 };

      await backend.createDartMatchWithClient(primaryClient, {
        mode: mode,
        red_user_id: redUser ? redUser.id : null,
        blue_user_id: bothDistinct ? blueUser.id : null,
        winner_user_id: winnerUser ? winnerUser.id : null,
        winner_slot: winnerSlot || null,
        duration_seconds: duration,
        red_final_score: finals.red,
        blue_final_score: finals.blue,
        status: 'completed',
        summary: summary,
        completed_at: summary.completedAt,
        opponent_label: opponentLabel,
        opponent_type: opponentType
      });

      updateSyncStatus('Mac kaydedildi.');
    } catch (error) {
      customPersistDone = false;
      updateSyncStatus(`Dart kaydi tamamlanamadi: ${error.message || error}`);
    }
  }

  function cpuSimDart(cpu, remaining, isPressure) {
    const boost = isPressure ? cpu.pressureBoost : 0;
    const r = Math.random();

    if (remaining === 50) {
      const h = Math.min(0.60, cpu.doubleRate + boost);
      if (r < h) return 50;
      if (r < h + 0.20) return 25;
      return Math.floor(Math.random() * 8) + 1;
    }

    if (remaining >= 2 && remaining <= 40 && remaining % 2 === 0) {
      const h = Math.min(0.62, cpu.doubleRate + boost);
      if (r < h) return remaining;
      if (r < h + 0.20) return remaining / 2;
      return 0;
    }

    const treble = Math.min(0.62, cpu.trebleRate + boost);

    if (!isPressure) {
      if (r < treble * 0.50) return 60;
      if (r < treble * 0.50 + 0.07) return 57;
      if (r < treble * 0.50 + 0.14) return 40;
      if (r < treble * 0.50 + 0.24) return 20;
      if (r < treble * 0.50 + 0.38) return Math.floor(Math.random() * 15) + 5;
      return Math.floor(Math.random() * 20) + 1;
    }

    if (r < treble) return 60;
    if (r < treble + 0.08) return 57;
    if (r < treble + 0.16) return 40;
    if (r < treble + 0.26) return 20;
    if (r < treble + 0.40) return Math.floor(Math.random() * 10) + 10;
    return Math.floor(Math.random() * 10) + 1;
  }

  function playCpuDarts(slot, token) {
    if (gameMode !== 'x01') return;
    if (token !== cpuTurnToken) return;
    if (state.currentTurn !== slot || state.isComplete || state.isResolving) return;
    if (state.currentSetDarts.length >= 3) return;

    const cpu = cpuConfig[slot];
    if (!cpu) return;

    const oppSlot = slot === 'RED' ? 'BLUE' : 'RED';
    const isPressure = state.scores[oppSlot] <= 50;
    const remaining = state.scores[slot];

    addDart(cpuSimDart(cpu, remaining, isPressure));

    if (!state.isComplete && !state.isResolving && state.currentTurn === slot && state.currentSetDarts.length < 3) {
      window.setTimeout(() => playCpuDarts(slot, token), 680);
    }
  }

  function scheduleCpuTurn() {
    if (gameMode !== 'x01') return; // ATC kendi CPU'sunu yonetir
    const slot = state.currentTurn;
    if (!cpuConfig[slot] || state.isComplete) return;
    const token = ++cpuTurnToken;
    window.setTimeout(() => playCpuDarts(slot, token), 900);
  }

  function selectCpu(slot, cpuId) {
    const cpu = CPU_PLAYERS.find((p) => p.id === cpuId);
    if (!cpu) return;

    if (cpuConfig[slot]?.id === cpuId) {
      clearCpu(slot);
      return;
    }

    cpuConfig[slot] = cpu;
    audioCue('app.notify');
    const nameEl = slot === 'RED' ? els.redAuthName : els.blueAuthName;
    nameEl.textContent = cpu.name;
    setSlotStatus(slot, `CPU · ${cpu.year} · ${cpu.nick}`);

    const grid = document.getElementById(slot === 'RED' ? 'redCpuGrid' : 'blueCpuGrid');
    grid.querySelectorAll('.dart-cpu-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.cpuId === cpuId);
    });

    render();
    updateSyncStatus();
    scheduleCpuTurn();
    const cmRefresh = customMode();
    if (cmRefresh) cmRefresh.refresh();
  }

  function clearCpu(slot) {
    cpuConfig[slot] = null;
    audioCue('app.undo');
    const nameEl = slot === 'RED' ? els.redAuthName : els.blueAuthName;
    nameEl.textContent = slotAuth[slot].label || SLOT_NAMES[slot];
    const auth = slotAuth[slot];
    setSlotStatus(slot, auth.user ? `Aktif: ${auth.user.email || auth.user.id}` : 'Misafir.');
    const grid = document.getElementById(slot === 'RED' ? 'redCpuGrid' : 'blueCpuGrid');
    grid.querySelectorAll('.dart-cpu-btn').forEach((btn) => btn.classList.remove('is-active'));
    render();
    updateSyncStatus();
    const cmRefresh = customMode();
    if (cmRefresh) cmRefresh.refresh();
  }

  function renderBadges() {
    els.dartBadges.replaceChildren();
    for (let index = 0; index < 3; index += 1) {
      const badge = document.createElement('span');
      const value = state.currentSetDarts[index];
      badge.className = `dart-badge${value === undefined ? '' : ' is-filled'}`;
      badge.textContent = value === undefined ? '-' : String(value);
      els.dartBadges.appendChild(badge);
    }
  }

  function renderCheckout(slot) {
    const score = state.scores[slot];
    const target = slot === 'RED' ? els.checkoutRED : els.checkoutBLUE;
    if (checkoutRoutes[score]) {
      target.textContent = checkoutRoutes[score];
    } else if (score <= 170 && score > 1) {
      target.textContent = 'Setup shot dusunun';
    } else {
      target.textContent = '';
    }
  }

  function renderControls() {
    const isCpuTurn = Boolean(cpuConfig[state.currentTurn]);
    const onlineNotMyTurn = onlineMode && state.currentTurn !== localSlot;
    const disabled = state.isResolving || state.isComplete || isCpuTurn || onlineNotMyTurn;
    const anyCpu = Boolean(cpuConfig.RED || cpuConfig.BLUE);
    els.undoButton.disabled = disabled || !state.history.length || Boolean(state.persistedMatchId) || anyCpu || onlineMode;
    els.keyboardInput.disabled = disabled;
    els.manualForm.querySelector('button').disabled = disabled;
    document.querySelectorAll('.dart-keypad button').forEach((button) => {
      button.disabled = disabled;
    });
    if (boardController) boardController.setEnabled(!disabled);
  }

  function render() {
    const cm = customMode();
    if (cm) { cm.render(); return; }
    const isCpuTurn = Boolean(cpuConfig[state.currentTurn]);
    if (onlineMode) {
      els.turnIndicator.textContent = state.isComplete
        ? `${displayName(state.currentTurn)} kazandi`
        : (state.currentTurn === localSlot
            ? 'Sira sende'
            : `Rakip oynuyor: ${displayName(state.currentTurn)}`);
    } else {
      els.turnIndicator.textContent = isCpuTurn
        ? `${displayName(state.currentTurn)} düşünüyor...`
        : `Siradaki: ${displayName(state.currentTurn)}`;
    }
    els.scoreRED.textContent = state.scores.RED;
    els.scoreBLUE.textContent = state.scores.BLUE;
    els.labelRED.textContent = displayName('RED');
    els.labelBLUE.textContent = displayName('BLUE');
    els.cardRED.classList.toggle('is-active', state.currentTurn === 'RED' && !state.isComplete);
    els.cardBLUE.classList.toggle('is-active', state.currentTurn === 'BLUE' && !state.isComplete);
    els.avgRED.textContent = statAverage('RED');
    els.avgBLUE.textContent = statAverage('BLUE');
    els.turnsRED.textContent = state.stats.RED.turnsCount;
    els.turnsBLUE.textContent = state.stats.BLUE.turnsCount;
    els.highRED.textContent = state.stats.RED.highestTurn;
    els.highBLUE.textContent = state.stats.BLUE.highestTurn;
    els.turnTotal.textContent = turnTotal();
    renderBadges();
    renderCheckout('RED');
    renderCheckout('BLUE');
    renderControls();
  }

  function handleManualScore(event) {
    event.preventDefault();
    const value = Number(els.keyboardInput.value);
    if (Number.isNaN(value) || value < 0 || value > 60) {
      audioCue('app.denied');
      showOverlay('Gecersiz skor', 'Tek ok icin 0 ile 60 arasinda bir deger girin.', false);
      window.setTimeout(hideOverlay, 1200);
      return;
    }
    els.keyboardInput.value = '';
    addDart(value);
    els.keyboardInput.focus();
  }

  function initAuth() {
    if (!backend || !backend.isConfigured() || typeof backend.createScopedClient !== 'function') {
      [els.redForm, els.blueForm].forEach((form) => {
        Array.from(form.elements).forEach((element) => {
          element.disabled = true;
        });
      });
      els.redSignOut.disabled = true;
      els.blueSignOut.disabled = true;
      updateSyncStatus();
      return;
    }

    ['RED', 'BLUE'].forEach((slot) => {
      slotAuth[slot].client = backend.createScopedClient(STORAGE_KEYS[slot]);
      if (!slotAuth[slot].client) {
        const form = slot === 'RED' ? els.redForm : els.blueForm;
        Array.from(form.elements).forEach((element) => {
          element.disabled = true;
        });
        setSlotStatus(slot, 'Supabase SDK yuklenemedi.');
        return;
      }
      refreshSlotSession(slot);
    });
  }

  els.redForm.addEventListener('submit', handleSignIn);
  els.blueForm.addEventListener('submit', handleSignIn);
  els.redSignOut.addEventListener('click', () => handleSignOut('RED'));
  els.blueSignOut.addEventListener('click', () => handleSignOut('BLUE'));
  function newMatchForMode() {
    customPersistDone = false;
    const cm = customMode();
    if (cm) cm.newMatch();
    else startNewMatch();
  }
  els.newMatchButton.addEventListener('click', newMatchForMode);
  els.overlayResetButton.addEventListener('click', newMatchForMode);
  els.undoButton.addEventListener('click', undoLastAction);
  els.manualForm.addEventListener('submit', handleManualScore);
  els.keypad.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-score], button[data-multiplier]');
    if (!button) return;

    if (button.dataset.multiplier) {
      const multiplier = Number(button.dataset.multiplier);
      const inputValue = Number(els.keyboardInput.value);
      if (!els.keyboardInput.value || Number.isNaN(inputValue) || inputValue < 0) {
        els.keyboardInput.focus();
        return;
      }
      const result = inputValue * multiplier;
      els.keyboardInput.value = String(result);
      els.keyboardInput.focus();
      return;
    }

    addDart(Number(button.dataset.score), {
      isDouble: button.dataset.double === '1',
      segment: button.dataset.segment || null
    });
  });

  document.querySelector('.dart-auth-grid').addEventListener('click', (event) => {
    const btn = event.target.closest('.dart-cpu-btn');
    if (!btn) return;
    if (onlineMode) return; // online sirasinda CPU secilemez
    selectCpu(btn.dataset.slot, btn.dataset.cpuId);
  });

  // --- Gorsel dart tahtasi (girdi aktif moda yonlendirilir) ---
  function routeBoardInput(dart) {
    const cm = customMode();
    if (cm) {
      cm.applyDart(dart);
    } else {
      addDart(dart.value, { isDouble: dart.isDouble, segment: dart.segment });
    }
  }

  function initBoard() {
    if (els.boardSvg && window.ConviviumDartBoard) {
      boardController = window.ConviviumDartBoard.create(els.boardSvg, routeBoardInput);
    }
  }

  // --- Mod yonetimi ---
  function applyModeVisibility() {
    const isX01 = gameMode === 'x01';
    if (els.boardSection) els.boardSection.hidden = !isX01;
    if (els.turnPanel) els.turnPanel.hidden = !isX01;
    if (els.controlsSection) els.controlsSection.hidden = !isX01;
    if (els.atcSection) els.atcSection.hidden = gameMode !== 'atc';
    if (els.cricketSection) els.cricketSection.hidden = gameMode !== 'cricket';
    if (els.doubleOutWrap) els.doubleOutWrap.style.display = isX01 ? '' : 'none';
  }

  function syncModeSelectorUI() {
    if (!els.modeSelect) return;
    els.modeSelect.querySelectorAll('.dart-mode-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.mode === gameMode);
      btn.disabled = onlineMode; // online sirasinda mod degistirilemez
    });
  }

  function setGameMode(mode, opts) {
    opts = opts || {};
    if (mode !== 'x01' && mode !== 'atc' && mode !== 'cricket') return;
    if (onlineMode && !opts.remote) { syncModeSelectorUI(); return; }
    customPersistDone = false;
    gameMode = mode;
    applyModeVisibility();
    // Diger ozel modlari pasiflestir.
    if (atc) atc.setActive(gameMode === 'atc');
    if (cricket) cricket.setActive(gameMode === 'cricket');
    const cm = customMode();
    if (cm) {
      if (!opts.remote) cm.newMatch({ remote: true });
    } else {
      if (!opts.remote) startNewMatch();
      else { state = createInitialState(); render(); }
    }
    syncModeSelectorUI();
    render();
  }

  function initModes() {
    const modeHost = {
      els: els,
      audioCue: audioCue,
      showOverlay: showOverlay,
      hideOverlay: hideOverlay,
      setBoardEnabled: (en) => { if (boardController) boardController.setEnabled(en); },
      setTurnText: (text) => { els.turnIndicator.textContent = text; },
      isOnline: () => onlineMode,
      localSlot: () => localSlot,
      sendDart: (payload) => { if (online) online.sendDart(payload); },
      sendAction: (type, payload) => { if (online) online.sendAction(type, payload); },
      cpuConfig: () => cpuConfig,
      names: () => ({ RED: displayName('RED'), BLUE: displayName('BLUE') }),
      onComplete: (winnerSlot) => { persistCustomMatch(winnerSlot); }
    };

    if (window.ConviviumDartATC) atc = window.ConviviumDartATC.create(modeHost);
    if (window.ConviviumDartCricket) cricket = window.ConviviumDartCricket.create(modeHost);

    if (els.modeSelect) {
      els.modeSelect.addEventListener('click', (event) => {
        const btn = event.target.closest('.dart-mode-btn');
        if (!btn) return;
        setGameMode(btn.dataset.mode);
      });
    }
  }

  // --- Double-out kural toggle ---
  if (els.doubleOutToggle) {
    els.doubleOutToggle.checked = ruleDoubleOut;
    els.doubleOutToggle.addEventListener('change', () => {
      if (onlineMode) { els.doubleOutToggle.checked = ruleDoubleOut; return; }
      ruleDoubleOut = els.doubleOutToggle.checked;
      startNewMatch(); // kural degisikligi yeni mac gerektirir
    });
  }

  // --- Online (Supabase Realtime) ---
  function localDisplayName(fallback) {
    if (els.onlineName && els.onlineName.value.trim()) return els.onlineName.value.trim();
    const user = slotAuth.RED.user || slotAuth.BLUE.user;
    if (user) return userLabel(user, fallback);
    return fallback;
  }

  function onlineSnapshot() {
    const snap = clone(state);
    snap.history = [];
    const cm = customMode();
    return {
      state: snap,
      doubleOut: ruleDoubleOut,
      names: onlineNames,
      mode: gameMode,
      modeState: cm ? cm.serialize() : null
    };
  }

  function applyRemoteState(payload) {
    if (!payload) return;
    if (typeof payload.doubleOut === 'boolean') ruleDoubleOut = payload.doubleOut;
    if (payload.names) {
      onlineNames[localSlot] = onlineNames[localSlot] || payload.names[localSlot];
      const opp = localSlot === 'RED' ? 'BLUE' : 'RED';
      onlineNames[opp] = payload.names[opp] || onlineNames[opp];
    }
    if (els.doubleOutToggle) els.doubleOutToggle.checked = ruleDoubleOut;

    // Mod senkronu (host belirler).
    if (payload.mode && payload.mode !== gameMode) {
      gameMode = payload.mode;
      applyModeVisibility();
      if (atc) atc.setActive(gameMode === 'atc');
      if (cricket) cricket.setActive(gameMode === 'cricket');
      syncModeSelectorUI();
    }

    const cm = customMode();
    if (cm) {
      if (payload.modeState) cm.applyState(payload.modeState);
    } else if (payload.state) {
      state = payload.state;
      state.history = [];
      hideOverlay();
      render();
    }
  }

  function enterOnlineFresh(mySlot) {
    ['RED', 'BLUE'].forEach((slot) => { if (cpuConfig[slot]) clearCpu(slot); });
    onlineMode = true;
    localSlot = mySlot;
    onlineNames[mySlot] = localDisplayName(mySlot === 'RED' ? 'Ev sahibi' : 'Misafir');
    ruleDoubleOut = els.doubleOutToggle ? els.doubleOutToggle.checked : ruleDoubleOut;
    state = createInitialState();
    const cmEnter = customMode();
    if (cmEnter) cmEnter.newMatch({ remote: true });
    hideOverlay();
    syncModeSelectorUI();
  }

  function exitOnline() {
    onlineMode = false;
    localSlot = null;
    onlineNames = { RED: null, BLUE: null };
    state = createInitialState();
    const cmExit = customMode();
    if (cmExit) cmExit.newMatch({ remote: true });
    hideOverlay();
    updateOnlineUi();
    syncModeSelectorUI();
    render();
    updateSyncStatus();
  }

  function updateOnlineUi() {
    const supported = Boolean(backend && backend.isConfigured() && window.ConviviumDartOnline);
    if (els.onlineCreate) els.onlineCreate.disabled = !supported || onlineMode;
    if (els.onlineJoin) els.onlineJoin.disabled = !supported || onlineMode;
    if (els.onlineCodeInput) els.onlineCodeInput.disabled = !supported || onlineMode;
    if (els.onlineName) els.onlineName.disabled = onlineMode;
    if (els.onlineLeave) els.onlineLeave.hidden = !onlineMode;
    if (els.onlineCode) els.onlineCode.hidden = !(onlineMode && online && online.isHost());
  }

  function handleOnlineState(info) {
    if (!els.onlineStatus) return;
    switch (info.status) {
      case 'connecting':
        els.onlineStatus.textContent = 'Baglaniyor...';
        break;
      case 'waiting':
        enterOnlineFresh('RED');
        els.onlineStatus.textContent = 'Oda kodu: ' + info.code + ' — rakip bekleniyor.';
        if (els.onlineCode) els.onlineCode.textContent = info.code;
        break;
      case 'joined':
        enterOnlineFresh('BLUE');
        els.onlineStatus.textContent = 'Odaya katildiniz. Rakip senkronu bekleniyor...';
        break;
      case 'ready':
        els.onlineStatus.textContent = 'Rakip baglandi. Iyi oyunlar!';
        if (online && online.isHost()) {
          const cmReady = customMode();
          if (cmReady) cmReady.newMatch({ remote: true });
          else state = createInitialState();
          online.sendAction('sync', onlineSnapshot());
        }
        break;
      case 'opponent-left':
        els.onlineStatus.textContent = 'Rakip ayrildi. Yeniden baglanmasini bekleyin.';
        break;
      case 'closed':
        exitOnline();
        els.onlineStatus.textContent = 'Online oturum kapatildi.';
        return;
      case 'error':
        els.onlineStatus.textContent = info.message || 'Online baglanti hatasi.';
        break;
    }
    updateOnlineUi();
    render();
  }

  function handleOnlinePresence(info) {
    if (!onlineMode) return;
    if (info.opponentName && info.opponentSlot) {
      onlineNames[info.opponentSlot] = info.opponentName;
    }
    render();
  }

  function handleOnlineAction(action) {
    if (!action || !action.type) return;
    if (action.type === 'request-sync-source') {
      if (online && online.isHost()) online.sendAction('sync', onlineSnapshot());
    } else if (action.type === 'sync') {
      applyRemoteState(action.payload);
    } else if (action.type === 'new-match') {
      startNewMatch({ remote: true });
    } else if (action.type === 'mode-new') {
      const cm = customMode();
      if (cm) cm.newMatch({ remote: true });
    }
  }

  function setupOnline() {
    if (!backend || !backend.isConfigured() || !window.ConviviumDartOnline) {
      if (els.onlineStatus) els.onlineStatus.textContent = 'Online icin Supabase yapilandirmasi gerekli.';
      updateOnlineUi();
      return;
    }
    online = window.ConviviumDartOnline.create({
      getClient: () => backend.getClient(),
      onState: handleOnlineState,
      onRemoteDart: (payload) => {
        if (payload && payload.mode && payload.mode !== 'x01') {
          const cm = customMode();
          if (cm) cm.applyRemoteDart(payload);
        } else {
          addDart(payload.value, { isDouble: payload.isDouble, segment: payload.segment, remote: true });
        }
      },
      onRemoteAction: handleOnlineAction,
      onPresence: handleOnlinePresence
    });
    updateOnlineUi();
  }

  if (els.onlineCreate) {
    els.onlineCreate.addEventListener('click', () => {
      if (online) online.host(localDisplayName('Ev sahibi'));
    });
  }
  if (els.onlineJoin) {
    els.onlineJoin.addEventListener('click', () => {
      if (!online) return;
      const code = ((els.onlineCodeInput && els.onlineCodeInput.value) || '').trim().toUpperCase();
      if (!code) {
        if (els.onlineStatus) els.onlineStatus.textContent = 'Oda kodu girin.';
        return;
      }
      online.join(code, localDisplayName('Misafir'));
    });
  }
  if (els.onlineLeave) {
    els.onlineLeave.addEventListener('click', () => { if (online) online.leave(); });
  }

  initBoard();
  initModes();
  setupOnline();
  applyModeVisibility();
  render();
  initAuth();
})();
