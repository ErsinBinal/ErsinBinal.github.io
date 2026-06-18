/**
 * Convivium Dart — Around the Clock modu.
 *
 * 1 → 20 → Bull sirasiyla hedef vurma yarisi. Siradaki hedefi vuran oyuncu
 * ilerler; bull'u gecen ilk oyuncu kazanir. Tur basina 3 ok, bir turda birden
 * fazla hedef ilerleyebilir. Varyant: "singles" (numaranin herhangi bir halkasi
 * ilerletir; bull icin bull gerekir).
 *
 * Bu modul kendi durumunu ve render'ini yonetir; girdi (gorsel tahta), online
 * iletim ve CPU ayarlari host (dart-skorbord.js) tarafindan callback'lerle saglanir.
 * Mantik convivium-darts/src/engine/around-the-clock.ts referansindan uyarlanmistir.
 */
(function () {
  'use strict';

  // 1..20, ardindan 25 (bull).
  var TARGETS = [];
  for (var n = 1; n <= 20; n += 1) TARGETS.push(n);
  TARGETS.push(25);

  function labelOf(target) {
    return target === 25 ? 'Bull' : String(target);
  }

  function sectorOf(segment) {
    if (!segment || segment === 'MISS') return null;
    if (segment === 'BULL' || segment === 'OUTER_BULL') return 25;
    var m = /^[SDT](\d{1,2})$/.exec(segment);
    return m ? Number(m[1]) : null;
  }

  function create(host) {
    var state = initState();
    var active = false;
    var cpuToken = 0;

    function initState() {
      return {
        pointers: { RED: 0, BLUE: 0 },
        hits: { RED: 0, BLUE: 0 },
        currentTurn: 'RED',
        dartsThisTurn: 0,
        turnMarks: [],
        isComplete: false,
        winner: null
      };
    }

    function names() {
      return host.names ? host.names() : { RED: 'Kirmizi Oyuncu', BLUE: 'Mavi Oyuncu' };
    }
    function display(slot) {
      var n = names();
      return n[slot] || (slot === 'RED' ? 'Kirmizi Oyuncu' : 'Mavi Oyuncu');
    }
    function currentTarget(slot) {
      return TARGETS[state.pointers[slot]];
    }
    function isOnline() {
      return Boolean(host.isOnline && host.isOnline());
    }
    function cpuFor(slot) {
      var cfg = host.cpuConfig ? host.cpuConfig() : { RED: null, BLUE: null };
      return cfg[slot] || null;
    }

    function applyDart(payload, opts) {
      opts = opts || {};
      if (state.isComplete) return;
      // Online: yalniz siradaki yerel oyuncu giris yapabilir.
      if (active && isOnline() && !opts.remote && state.currentTurn !== host.localSlot()) return;
      // CPU sirasinda insan girisi engellenir (uzak/CPU haric).
      if (!opts.fromCpu && !opts.remote && cpuFor(state.currentTurn)) return;

      // Online: yerel atisi rakibe yayinla.
      if (isOnline() && !opts.remote && !opts.fromCpu && host.sendDart) {
        host.sendDart({ mode: 'atc', segment: payload.segment });
      }

      var slot = state.currentTurn;
      var target = currentTarget(slot);
      var sec = sectorOf(payload.segment);
      var hit = sec !== null && sec === target;

      state.dartsThisTurn += 1;

      if (hit) {
        state.turnMarks.push('hit');
        state.hits[slot] += 1;
        state.pointers[slot] += 1;
        host.audioCue(target === 25 ? 'app.highScore' : 'app.score');
        if (state.pointers[slot] >= TARGETS.length) {
          state.isComplete = true;
          state.winner = slot;
          render();
          host.audioCue('game.win');
          host.showOverlay('Tamamlandi', display(slot) + ' tum hedefleri bitirdi.', true);
          if (host.onComplete) host.onComplete(slot);
          return;
        }
      } else {
        state.turnMarks.push('miss');
        host.audioCue('app.denied');
      }

      render();
      if (state.dartsThisTurn >= 3) {
        window.setTimeout(endTurn, 650);
      } else {
        scheduleCpu();
      }
    }

    function endTurn() {
      if (state.isComplete) return;
      state.currentTurn = state.currentTurn === 'RED' ? 'BLUE' : 'RED';
      state.dartsThisTurn = 0;
      state.turnMarks = [];
      render();
      scheduleCpu();
    }

    // --- CPU ---
    function cpuHitChance(slot) {
      var avatar = cpuFor(slot);
      if (!avatar) return null;
      var base = Math.min(0.82, (avatar.trebleRate || 0.45) + 0.25);
      if (currentTarget(slot) === 25) base *= 0.55; // bull daha zor
      return base;
    }

    function scheduleCpu() {
      if (state.isComplete) return;
      var slot = state.currentTurn;
      if (cpuHitChance(slot) === null) return;
      var token = ++cpuToken;
      window.setTimeout(function () { playCpu(slot, token); }, 820);
    }

    function playCpu(slot, token) {
      if (token !== cpuToken) return;
      if (state.currentTurn !== slot || state.isComplete || state.dartsThisTurn >= 3) return;
      var chance = cpuHitChance(slot);
      if (chance === null) return;
      var target = currentTarget(slot);
      var segment;
      if (Math.random() < chance) {
        segment = target === 25 ? 'BULL' : ('S' + target);
      } else {
        segment = Math.random() < 0.5 ? 'MISS' : ('S' + (((target % 20)) + 1));
      }
      applyDart({ segment: segment }, { fromCpu: true });
      if (!state.isComplete && state.currentTurn === slot && state.dartsThisTurn < 3) {
        window.setTimeout(function () { playCpu(slot, token); }, 640);
      }
    }

    // --- Render ---
    function renderBadges() {
      var el = host.els.atcBadges;
      if (!el) return;
      el.replaceChildren();
      for (var i = 0; i < 3; i += 1) {
        var mark = state.turnMarks[i];
        var b = document.createElement('span');
        b.className = 'atc-pip' + (mark === 'hit' ? ' is-hit' : mark === 'miss' ? ' is-miss' : '');
        b.textContent = mark === 'hit' ? '✓' : mark === 'miss' ? '✕' : '·';
        el.appendChild(b);
      }
    }

    function turnText() {
      if (state.isComplete) return display(state.winner) + ' kazandi';
      var slot = state.currentTurn;
      var tgt = 'Hedef ' + labelOf(currentTarget(slot));
      if (isOnline()) {
        return slot === host.localSlot() ? ('Sira sende — ' + tgt) : ('Rakip oynuyor — ' + tgt);
      }
      if (cpuFor(slot)) return display(slot) + ' dusunuyor... (' + tgt + ')';
      return 'Siradaki: ' + display(slot) + ' — ' + tgt;
    }

    function render() {
      var els = host.els;
      if (els.atcNameRED) els.atcNameRED.textContent = display('RED');
      if (els.atcNameBLUE) els.atcNameBLUE.textContent = display('BLUE');

      ['RED', 'BLUE'].forEach(function (slot) {
        var done = state.pointers[slot] >= TARGETS.length;
        var targetEl = slot === 'RED' ? els.atcTargetRED : els.atcTargetBLUE;
        var progEl = slot === 'RED' ? els.atcProgRED : els.atcProgBLUE;
        var card = slot === 'RED' ? els.atcRED : els.atcBLUE;
        if (targetEl) targetEl.textContent = done ? 'Bitti' : labelOf(currentTarget(slot));
        if (progEl) progEl.textContent = Math.min(state.pointers[slot], TARGETS.length) + ' / ' + TARGETS.length;
        if (card) card.classList.toggle('is-active', state.currentTurn === slot && !state.isComplete);
      });

      renderBadges();
      if (host.setTurnText) host.setTurnText(turnText());

      var myTurn = !isOnline() || state.currentTurn === host.localSlot();
      var cpuTurn = Boolean(cpuFor(state.currentTurn));
      var enabled = active && !state.isComplete && myTurn && !cpuTurn;
      if (host.setBoardEnabled) host.setBoardEnabled(enabled);
    }

    function newMatch(opts) {
      opts = opts || {};
      cpuToken += 1; // bekleyen CPU zamanlayicilarini iptal et
      state = initState();
      host.hideOverlay();
      host.audioCue('app.reset');
      render();
      scheduleCpu();
      if (active && isOnline() && !opts.remote && host.sendAction) {
        host.sendAction('atc-new', {});
      }
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

  window.ConviviumDartATC = { create: create, TARGETS: TARGETS };
})();
