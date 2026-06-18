/**
 * Convivium Dart — Cricket modu.
 *
 * Hedefler: 15, 16, 17, 18, 19, 20 ve Bull (25). Her oyuncu bir sayiyi 3 "isaret"
 * (mark) ile kapatir: single=1, double=2, treble=3; outer bull=1, inner bull=2.
 * Bir sayiyi kapatip rakip henuz kapatmadiysa, o sayiya ek isabetler sayinin
 * degeri kadar puan yazar (bull=25). Tum sayilarini kapatan VE puani rakibe esit
 * ya da fazla olan oyuncu kazanir.
 *
 * Host (dart-skorbord.js) ile ATC modulu ile ayni callback sozlesmesini kullanir.
 */
(function () {
  'use strict';

  // Goruntuleme sirasi: yuksekten dusuge, en sonda bull.
  var NUMBERS = [20, 19, 18, 17, 16, 15, 25];
  var MARK_SYMBOLS = ['', '/', '✕', '⊗'];

  function labelOf(num) { return num === 25 ? 'Bull' : String(num); }
  function valueOf(num) { return num === 25 ? 25 : num; }

  function parseSegment(segment) {
    if (!segment || segment === 'MISS') return null;
    if (segment === 'BULL') return { number: 25, marks: 2 };
    if (segment === 'OUTER_BULL' || segment === '25') return { number: 25, marks: 1 };
    var m = /^([SDT])(\d{1,2})$/.exec(segment);
    if (!m) return null;
    var num = Number(m[2]);
    if (num < 15 || num > 20) return null; // cricket sayisi degil
    var marks = m[1] === 'T' ? 3 : m[1] === 'D' ? 2 : 1;
    return { number: num, marks: marks };
  }

  function create(host) {
    var state = initState();
    var active = false;
    var cpuToken = 0;
    var cells = null; // { RED: {num:el}, BLUE: {num:el} }

    function initState() {
      var marks = { RED: {}, BLUE: {} };
      NUMBERS.forEach(function (n) { marks.RED[n] = 0; marks.BLUE[n] = 0; });
      return {
        marks: marks,
        scores: { RED: 0, BLUE: 0 },
        darts: { RED: 0, BLUE: 0 },
        segments: { RED: {}, BLUE: {} },
        currentTurn: 'RED',
        dartsThisTurn: 0,
        turnLog: [],
        isComplete: false,
        winner: null
      };
    }

    function other(slot) { return slot === 'RED' ? 'BLUE' : 'RED'; }
    function names() { return host.names ? host.names() : { RED: 'Kirmizi Oyuncu', BLUE: 'Mavi Oyuncu' }; }
    function display(slot) { var n = names(); return n[slot] || (slot === 'RED' ? 'Kirmizi Oyuncu' : 'Mavi Oyuncu'); }
    function isOnline() { return Boolean(host.isOnline && host.isOnline()); }
    function cpuFor(slot) { var c = host.cpuConfig ? host.cpuConfig() : {}; return c[slot] || null; }

    function allClosed(slot) { return NUMBERS.every(function (n) { return state.marks[slot][n] >= 3; }); }
    function allDead() {
      return NUMBERS.every(function (n) { return state.marks.RED[n] >= 3 && state.marks.BLUE[n] >= 3; });
    }

    function applyMarks(slot, number, addMarks) {
      var opp = other(slot);
      var remaining = addMarks;
      while (remaining > 0) {
        if (state.marks[slot][number] < 3) {
          state.marks[slot][number] += 1;
        } else if (state.marks[opp][number] < 3) {
          state.scores[slot] += valueOf(number); // rakip kapatmadiysa puan
        }
        remaining -= 1;
      }
    }

    function finish(winnerSlot) {
      state.isComplete = true;
      state.winner = winnerSlot;
      render();
      host.audioCue('game.win');
      var msg = winnerSlot
        ? display(winnerSlot) + ' kazandi (' + state.scores[winnerSlot] + ' puan).'
        : 'Berabere.';
      host.showOverlay('Cricket bitti', msg, true);
      if (host.onComplete) host.onComplete(winnerSlot);
    }

    function checkEnd(slot) {
      var opp = other(slot);
      if (allClosed(slot) && state.scores[slot] >= state.scores[opp]) { finish(slot); return true; }
      if (allDead()) {
        if (state.scores.RED === state.scores.BLUE) finish(null);
        else finish(state.scores.RED > state.scores.BLUE ? 'RED' : 'BLUE');
        return true;
      }
      return false;
    }

    function applyDart(payload, opts) {
      opts = opts || {};
      if (state.isComplete) return;
      if (active && isOnline() && !opts.remote && state.currentTurn !== host.localSlot()) return;
      if (!opts.fromCpu && !opts.remote && cpuFor(state.currentTurn)) return;

      if (isOnline() && !opts.remote && !opts.fromCpu && host.sendDart) {
        host.sendDart({ mode: 'cricket', segment: payload.segment });
      }

      var slot = state.currentTurn;
      state.dartsThisTurn += 1;
      state.darts[slot] += 1;
      if (payload.segment) state.segments[slot][payload.segment] = (state.segments[slot][payload.segment] || 0) + 1;
      var parsed = parseSegment(payload.segment);
      if (parsed) {
        applyMarks(slot, parsed.number, parsed.marks);
        state.turnLog.push(payload.segment === 'BULL' ? 'BULL'
          : payload.segment === 'OUTER_BULL' ? '25' : payload.segment);
        host.audioCue('app.score');
      } else {
        state.turnLog.push('✕');
        host.audioCue('app.denied');
      }

      if (checkEnd(slot)) return;

      render();
      if (state.dartsThisTurn >= 3) {
        window.setTimeout(endTurn, 650);
      } else {
        scheduleCpu();
      }
    }

    function endTurn() {
      if (state.isComplete) return;
      state.currentTurn = other(state.currentTurn);
      state.dartsThisTurn = 0;
      state.turnLog = [];
      render();
      scheduleCpu();
    }

    // --- CPU ---
    function cpuTarget(slot) {
      var opp = other(slot);
      var i;
      for (i = 0; i < NUMBERS.length; i += 1) {
        if (state.marks[slot][NUMBERS[i]] < 3) return NUMBERS[i];
      }
      for (i = 0; i < NUMBERS.length; i += 1) {
        if (state.marks[opp][NUMBERS[i]] < 3) return NUMBERS[i];
      }
      return null;
    }

    function cpuPick(slot) {
      var avatar = cpuFor(slot);
      if (!avatar) return null;
      var target = cpuTarget(slot);
      if (target === null) return 'MISS';
      var tr = avatar.trebleRate || 0.45;
      var chance = Math.min(0.85, tr + 0.3);
      if (target === 25) chance *= 0.6;
      if (Math.random() >= chance) return 'MISS';
      if (target === 25) return Math.random() < 0.4 ? 'BULL' : 'OUTER_BULL';
      var r = Math.random();
      if (r < tr * 0.6) return 'T' + target;
      if (r < tr * 0.6 + 0.18) return 'D' + target;
      return 'S' + target;
    }

    function scheduleCpu() {
      if (state.isComplete) return;
      if (!cpuFor(state.currentTurn)) return;
      var slot = state.currentTurn;
      var token = ++cpuToken;
      window.setTimeout(function () { playCpu(slot, token); }, 820);
    }

    function playCpu(slot, token) {
      if (token !== cpuToken) return;
      if (state.currentTurn !== slot || state.isComplete || state.dartsThisTurn >= 3) return;
      var segment = cpuPick(slot);
      if (segment === null) return;
      applyDart({ segment: segment }, { fromCpu: true });
      if (!state.isComplete && state.currentTurn === slot && state.dartsThisTurn < 3) {
        window.setTimeout(function () { playCpu(slot, token); }, 640);
      }
    }

    // --- Render ---
    function buildGrid() {
      var grid = host.els.cricketGrid;
      if (!grid) return;
      grid.replaceChildren();
      cells = { RED: {}, BLUE: {} };
      NUMBERS.forEach(function (num) {
        var row = document.createElement('div');
        row.className = 'cricket-row';

        var redCell = document.createElement('span');
        redCell.className = 'cricket-mark cricket-mark-red';
        cells.RED[num] = redCell;

        var label = document.createElement('span');
        label.className = 'cricket-label';
        label.textContent = labelOf(num);

        var blueCell = document.createElement('span');
        blueCell.className = 'cricket-mark cricket-mark-blue';
        cells.BLUE[num] = blueCell;

        row.appendChild(redCell);
        row.appendChild(label);
        row.appendChild(blueCell);
        grid.appendChild(row);
      });
    }

    function renderBadges() {
      var el = host.els.cricketBadges;
      if (!el) return;
      el.replaceChildren();
      for (var i = 0; i < 3; i += 1) {
        var entry = state.turnLog[i];
        var b = document.createElement('span');
        var miss = entry === '✕';
        b.className = 'atc-pip' + (entry === undefined ? '' : miss ? ' is-miss' : ' is-hit');
        b.textContent = entry === undefined ? '·' : entry;
        el.appendChild(b);
      }
    }

    function turnText() {
      if (state.isComplete) return state.winner ? (display(state.winner) + ' kazandi') : 'Berabere';
      var slot = state.currentTurn;
      if (isOnline()) return slot === host.localSlot() ? 'Sira sende' : ('Rakip oynuyor: ' + display(slot));
      if (cpuFor(slot)) return display(slot) + ' dusunuyor...';
      return 'Siradaki: ' + display(slot);
    }

    function render() {
      var els = host.els;
      if (!cells) buildGrid();

      if (els.cricketNameRED) els.cricketNameRED.textContent = display('RED');
      if (els.cricketNameBLUE) els.cricketNameBLUE.textContent = display('BLUE');
      if (els.cricketScoreRED) els.cricketScoreRED.textContent = state.scores.RED;
      if (els.cricketScoreBLUE) els.cricketScoreBLUE.textContent = state.scores.BLUE;
      if (els.cricketHeadRED) els.cricketHeadRED.classList.toggle('is-active', state.currentTurn === 'RED' && !state.isComplete);
      if (els.cricketHeadBLUE) els.cricketHeadBLUE.classList.toggle('is-active', state.currentTurn === 'BLUE' && !state.isComplete);

      if (cells) {
        ['RED', 'BLUE'].forEach(function (slot) {
          NUMBERS.forEach(function (num) {
            var c = cells[slot][num];
            if (!c) return;
            var count = Math.min(3, state.marks[slot][num]);
            c.textContent = MARK_SYMBOLS[count];
            c.classList.toggle('is-closed', state.marks[slot][num] >= 3);
          });
        });
      }

      renderBadges();
      if (host.setTurnText) host.setTurnText(turnText());

      var myTurn = !isOnline() || state.currentTurn === host.localSlot();
      var enabled = active && !state.isComplete && myTurn && !cpuFor(state.currentTurn);
      if (host.setBoardEnabled) host.setBoardEnabled(enabled);
    }

    function newMatch(opts) {
      opts = opts || {};
      cpuToken += 1;
      state = initState();
      host.hideOverlay();
      host.audioCue('app.reset');
      render();
      scheduleCpu();
      if (active && isOnline() && !opts.remote && host.sendAction) host.sendAction('mode-new', {});
    }

    return {
      newMatch: newMatch,
      applyDart: function (dart) { applyDart(dart, {}); },
      applyRemoteDart: function (payload) { applyDart(payload, { remote: true }); },
      serialize: function () { return JSON.parse(JSON.stringify(state)); },
      applyState: function (snap) {
        if (!snap) return;
        cpuToken += 1;
        state = snap;
        host.hideOverlay();
        render();
        scheduleCpu();
      },
      refresh: function () { render(); scheduleCpu(); },
      setActive: function (on) {
        active = on;
        cpuToken += 1;
        if (on) { render(); scheduleCpu(); }
      },
      isComplete: function () { return state.isComplete; },
      currentTurn: function () { return state.currentTurn; }
    };
  }

  window.ConviviumDartCricket = { create: create, NUMBERS: NUMBERS };
})();
