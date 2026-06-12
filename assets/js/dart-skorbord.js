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
    overlayResetButton: document.getElementById('overlayResetButton')
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
      persistedMatchId: null
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

  function addDart(value) {
    if (state.isResolving || state.isComplete || state.currentSetDarts.length >= 3) return;
    const numericValue = Math.max(0, Math.min(60, Number(value) || 0));
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

    if (nextScore < 0 || nextScore === 1) {
      state.scores[slot] = state.currentTurnStartScore;
      recordThrow(slot, numericValue, {
        turnTotal: 0,
        remainingScore: state.currentTurnStartScore,
        isBust: true,
        isWinningThrow: false
      });
      completeTurn(slot, 0, dartsInTurn, true);
      resolveTurn('Bust', 'Skor 1 veya altina dusmez. Sira rakibe geciyor.', true);
      return;
    }

    state.scores[slot] = nextScore;
    recordThrow(slot, numericValue, {
      turnTotal: rawTurnTotal,
      remainingScore: nextScore,
      isBust: false,
      isWinningThrow: nextScore === 0
    });

    if (nextScore === 0) {
      completeTurn(slot, rawTurnTotal, dartsInTurn, false);
      state.isComplete = true;
      render();
      showOverlay('Leg kazanildi', `${displayName(slot)} maci bitirdi.`, true);
      persistCompletedMatch(slot);
      return;
    }

    render();

    if (state.currentSetDarts.length === 3) {
      const scored = rawTurnTotal;
      completeTurn(slot, scored, 3, false);
      if (scored >= 100) {
        resolveTurn(scored === 180 ? 'Perfect 180' : 'Harika set', `Set toplami: ${scored}`, false);
      } else if (scored <= 40) {
        resolveTurn('Dusuk set', `Set toplami: ${scored}`, false);
      } else {
        advanceTurn();
      }
    }
  }

  function resolveTurn(title, text, isBust) {
    state.isResolving = true;
    render();
    showOverlay(title, text, false);
    window.setTimeout(() => {
      hideOverlay();
      advanceTurn();
      if (isBust) updateSyncStatus('Bust kaydedildi. Mac bitince senkron durumu tekrar kontrol edilir.');
    }, 1350);
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
    if (!state.history.length || state.isResolving || state.isComplete || state.persistedMatchId) return;
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

  function startNewMatch() {
    state = createInitialState();
    hideOverlay();
    render();
    updateSyncStatus();
    if (!cpuConfig.RED && !cpuConfig.BLUE) els.keyboardInput.focus();
    scheduleCpuTurn();
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
      players[slot] = {
        label: displayName(slot),
        average: Number(statAverage(slot)),
        totalDarts: state.stats[slot].totalDarts,
        totalScored: state.stats[slot].totalScored,
        turnsCount: state.stats[slot].turnsCount,
        highestTurn: state.stats[slot].highestTurn,
        oneEighties: state.stats[slot].oneEighties,
        busts: state.stats[slot].busts
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
    if (!backend || !backend.isConfigured()) {
      updateSyncStatus('Mac misafir modunda bitti. Supabase baglantisi olmadigi icin kayit yapilmadi.');
      return;
    }

    if (!hasTwoDistinctUsers()) {
      updateSyncStatus('Mac misafir modunda bitti. Kayit icin iki farkli kullanici girisi gerekli.');
      return;
    }

    try {
      updateSyncStatus('Dart maci ve detayli atislar kaydediliyor...');
      const redClient = slotAuth.RED.client;
      const blueClient = slotAuth.BLUE.client;
      const summary = buildMatchSummary(winnerSlot);
      const match = await backend.createDartMatchWithClient(redClient, {
        red_user_id: slotAuth.RED.user.id,
        blue_user_id: slotAuth.BLUE.user.id,
        winner_user_id: slotAuth[winnerSlot].user.id,
        winner_slot: winnerSlot,
        start_score: START_SCORE,
        duration_seconds: summary.duration,
        red_final_score: state.scores.RED,
        blue_final_score: state.scores.BLUE,
        status: 'completed',
        summary: summary.payload,
        completed_at: summary.payload.completedAt
      });

      const rows = state.throwRecords.map((record) => ({
        ...record,
        match_id: match.id,
        user_id: slotAuth[record.player_slot].user.id
      }));
      const redRows = rows.filter((row) => row.player_slot === 'RED');
      const blueRows = rows.filter((row) => row.player_slot === 'BLUE');

      await Promise.all([
        backend.saveDartThrowsWithClient(redClient, redRows),
        backend.saveDartThrowsWithClient(blueClient, blueRows)
      ]);

      state.persistedMatchId = match.id;
      updateSyncStatus('Mac kaydedildi. Dashboard istatistikleri guncellendi.');
      render();
    } catch (error) {
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

  function playCpuDarts(slot) {
    if (state.currentTurn !== slot || state.isComplete || state.isResolving) return;
    if (state.currentSetDarts.length >= 3) return;

    const cpu = cpuConfig[slot];
    if (!cpu) return;

    const oppSlot = slot === 'RED' ? 'BLUE' : 'RED';
    const isPressure = state.scores[oppSlot] <= 50;
    const remaining = state.scores[slot];

    addDart(cpuSimDart(cpu, remaining, isPressure));

    if (!state.isComplete && !state.isResolving && state.currentTurn === slot && state.currentSetDarts.length < 3) {
      window.setTimeout(() => playCpuDarts(slot), 680);
    }
  }

  function scheduleCpuTurn() {
    const slot = state.currentTurn;
    if (!cpuConfig[slot] || state.isComplete) return;
    window.setTimeout(() => playCpuDarts(slot), 900);
  }

  function selectCpu(slot, cpuId) {
    const cpu = CPU_PLAYERS.find((p) => p.id === cpuId);
    if (!cpu) return;

    if (cpuConfig[slot]?.id === cpuId) {
      clearCpu(slot);
      return;
    }

    cpuConfig[slot] = cpu;
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
  }

  function clearCpu(slot) {
    cpuConfig[slot] = null;
    const nameEl = slot === 'RED' ? els.redAuthName : els.blueAuthName;
    nameEl.textContent = slotAuth[slot].label || SLOT_NAMES[slot];
    const auth = slotAuth[slot];
    setSlotStatus(slot, auth.user ? `Aktif: ${auth.user.email || auth.user.id}` : 'Misafir.');
    const grid = document.getElementById(slot === 'RED' ? 'redCpuGrid' : 'blueCpuGrid');
    grid.querySelectorAll('.dart-cpu-btn').forEach((btn) => btn.classList.remove('is-active'));
    render();
    updateSyncStatus();
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
    const disabled = state.isResolving || state.isComplete || isCpuTurn;
    const anyCpu = Boolean(cpuConfig.RED || cpuConfig.BLUE);
    els.undoButton.disabled = disabled || !state.history.length || Boolean(state.persistedMatchId) || anyCpu;
    els.keyboardInput.disabled = disabled;
    els.manualForm.querySelector('button').disabled = disabled;
    document.querySelectorAll('.dart-keypad button').forEach((button) => {
      button.disabled = disabled;
    });
  }

  function render() {
    const isCpuTurn = Boolean(cpuConfig[state.currentTurn]);
    els.turnIndicator.textContent = isCpuTurn
      ? `${displayName(state.currentTurn)} düşünüyor...`
      : `Siradaki: ${displayName(state.currentTurn)}`;
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
  els.newMatchButton.addEventListener('click', startNewMatch);
  els.overlayResetButton.addEventListener('click', startNewMatch);
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

    addDart(Number(button.dataset.score));
  });

  document.querySelector('.dart-auth-grid').addEventListener('click', (event) => {
    const btn = event.target.closest('.dart-cpu-btn');
    if (!btn) return;
    selectCpu(btn.dataset.slot, btn.dataset.cpuId);
  });

  render();
  initAuth();
})();
