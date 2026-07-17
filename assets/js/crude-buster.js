/**
 * Crude Buster — Data East (1990) beat 'em up remake motoru.
 * (c) 2026 Ersin Binal — Convivium. Bağımsız, sıfırdan yazılmış vanilla motor.
 *
 * Modlar: solo / yerel co-op / online co-op (Supabase Realtime, host-otoriter).
 * Kahramanlar: E.Binal (RED / host / P1), De.Binal (BLUE / guest / P2).
 *
 * Handoff: docs/crude-buster-remake-handoff.md
 */
window.CrudeBuster = (function () {
  'use strict';

  // =====================================================================
  //  SABİTLER
  // =====================================================================
  var VW = 480, VH = 270;
  var GROUND_TOP = 172;                 // depthY=0'ın ekran y'si (zeminin arka kenarı)
  var DEPTH_MIN = 0, DEPTH_MAX = 74;    // yürünebilir derinlik bandı
  var GRAV = 900;
  var STEP = 1 / 60;
  var SNAP_MS = 66;                     // host -> guest snapshot aralığı (~15 Hz)
  var INPUT_MS = 33;                    // guest -> host input aralığı (~30 Hz)
  var RENDER_DELAY = 110;               // guest interpolasyon gecikmesi (ms)

  var WALK_VX = 104, WALK_VD = 76, RUN_MULT = 1;
  var JUMP_V = 340;
  var THROW_VX = 300, THROW_VZ = 150;
  var SPECIAL_COST = 8, SPECIAL_CD = 1.4;
  var GRAB_RANGE = 26, PICK_RANGE = 30, TEAM_RANGE = 30;
  var CONTINUE_SECONDS = 12;

  var GAME_KEY = 'crude-buster';

  // Paletler (kod-çizimli piksel figürler)
  var PAL = {
    ebinal:  { skin: '#e8a877', hair: '#2a1a0e', shirt: '#ff5a3c', shirt2: '#b3311c', pants: '#3a2e6b', accent: '#ffce4a', boot: '#20140a' },
    debinal: { skin: '#d98f63', hair: '#101820', shirt: '#35b7ff', shirt2: '#1c6ab3', pants: '#20403a', accent: '#eafcff', boot: '#0a1014' },
    punk:    { skin: '#9fbf6a', hair: '#402a18', shirt: '#6b8f3a', shirt2: '#3f5a20', pants: '#2a2016', accent: '#c0d878', boot: '#181008' },
    knife:   { skin: '#c8b89a', hair: '#20242c', shirt: '#8a929c', shirt2: '#565d66', pants: '#30343c', accent: '#d0d6dc', boot: '#14161a' },
    brute:   { skin: '#c88a5a', hair: '#3a1e10', shirt: '#7a4a2a', shirt2: '#4f2f18', pants: '#3a2414', accent: '#ffae5a', boot: '#180e06' },
    thrower: { skin: '#d0a070', hair: '#5a3a12', shirt: '#c8a13a', shirt2: '#8a6c1e', pants: '#3c3020', accent: '#ffe07a', boot: '#1a1208' },
    bruteBoss:  { skin: '#c07048', hair: '#2a1408', shirt: '#8a2f2f', shirt2: '#571818', pants: '#3a1a14', accent: '#ff5a3c', boot: '#160a06' },
    cyborgBoss: { skin: '#a9b4c0', hair: '#101418', shirt: '#4a5560', shirt2: '#2a323c', pants: '#20262e', accent: '#00e6ff', boot: '#0a0e12' }
  };

  var ENEMY_DEF = {
    punk:    { pal: 'punk',    hp: 26,  speed: 0.72, atkRange: 24, atkDelay: 0.55, dmg: 6,  scale: 1.0, knockRes: 0.4 },
    knife:   { pal: 'knife',   hp: 20,  speed: 0.95, atkRange: 26, atkDelay: 0.4,  dmg: 8,  scale: 1.0, knockRes: 0.25 },
    brute:   { pal: 'brute',   hp: 60,  speed: 0.5,  atkRange: 26, atkDelay: 0.8,  dmg: 12, scale: 1.22, knockRes: 0.8 },
    thrower: { pal: 'thrower', hp: 22,  speed: 0.6,  atkRange: 150, atkDelay: 1.1, dmg: 7,  scale: 1.0, knockRes: 0.35, ranged: true }
  };
  var BOSS_DEF = {
    'brute-boss':  { pal: 'bruteBoss',  name: 'DEV KABADAYI',   hp: 300, speed: 0.55, dmg: 16, scale: 1.7, knockRes: 0.94 },
    'cyborg-boss': { pal: 'cyborgBoss', name: 'BÜYÜK VADİ SİBORG', hp: 380, speed: 0.7, dmg: 18, scale: 1.7, knockRes: 0.96 }
  };

  var OBJECT_DEF = {
    bottle: { w: 8,  h: 12, mass: 'small', dmg: 8,  color: '#7fd6a0' },
    rock:   { w: 14, h: 12, mass: 'small', dmg: 10, color: '#9a8f7a' },
    tire:   { w: 18, h: 18, mass: 'small', dmg: 10, color: '#2a2a2e' },
    barrel: { w: 18, h: 26, mass: 'med',   dmg: 16, color: '#b5642a' },
    sign:   { w: 10, h: 34, mass: 'med',   dmg: 15, color: '#c0c4c8' },
    girder: { w: 40, h: 10, mass: 'large', dmg: 24, color: '#8a8f96' },
    car:    { w: 66, h: 30, mass: 'large', dmg: 34, color: '#c23a3a' }
  };

  // Sahne betikleri (veri-güdümlü). cam = segmentin kilitlendiği camX.
  var STAGES = [
    {
      key: 'ruined-streets', name: 'BÖLÜM 1 — HARABE SOKAKLAR', bg: 'ruins',
      segments: [
        { cam: 0,    spawns: [{ kind: 'punk', n: 2 }], props: [{ t: 'barrel', x: 300 }, { t: 'rock', x: 210 }] },
        { cam: 360,  spawns: [{ kind: 'punk', n: 2 }, { kind: 'knife', n: 1 }], props: [{ t: 'sign', x: 620 }, { t: 'tire', x: 700 }] },
        { cam: 720,  spawns: [{ kind: 'knife', n: 1 }, { kind: 'thrower', n: 1 }, { kind: 'punk', n: 1 }], props: [{ t: 'car', x: 980 }, { t: 'barrel', x: 900 }] },
        { cam: 1080, boss: 'brute-boss', props: [{ t: 'girder', x: 1240 }] }
      ],
      end: 1080
    },
    {
      key: 'subway', name: 'BÖLÜM 2 — METRO KANALLARI', bg: 'subway',
      segments: [
        { cam: 0,    spawns: [{ kind: 'knife', n: 2 }], props: [{ t: 'barrel', x: 260 }] },
        { cam: 360,  spawns: [{ kind: 'punk', n: 1 }, { kind: 'brute', n: 1 }], props: [{ t: 'rock', x: 560 }, { t: 'rock', x: 640 }] },
        { cam: 720,  spawns: [{ kind: 'knife', n: 1 }, { kind: 'thrower', n: 1 }, { kind: 'punk', n: 1 }], props: [{ t: 'sign', x: 940 }, { t: 'tire', x: 1000 }] },
        { cam: 1080, boss: 'cyborg-boss', props: [{ t: 'girder', x: 1250 }] }
      ],
      end: 1080
    }
  ];

  // =====================================================================
  //  YARDIMCILAR
  // =====================================================================
  var _id = 1;
  function uid() { return _id++; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function chance(p) { return Math.random() < p; }
  function sign(v) { return v < 0 ? -1 : v > 0 ? 1 : 0; }

  // =====================================================================
  //  SES (WebAudio, harici dosya yok)
  // =====================================================================
  var audio = {
    ctx: null, enabled: true, musicOn: false, musicNodes: null,
    init: function () {
      if (this.ctx) return;
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { this.enabled = false; }
    },
    tone: function (freq, dur, type, gain, slideTo) {
      if (!this.enabled || !this.ctx) return;
      var t = this.ctx.currentTime;
      var o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      g.gain.setValueAtTime(gain || 0.05, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + dur);
    },
    noise: function (dur, gain) {
      if (!this.enabled || !this.ctx) return;
      var t = this.ctx.currentTime;
      var n = Math.floor(this.ctx.sampleRate * dur);
      var buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var src = this.ctx.createBufferSource(), g = this.ctx.createGain();
      src.buffer = buf; g.gain.value = gain || 0.06;
      src.connect(g); g.connect(this.ctx.destination); src.start(t);
    },
    punch: function () { this.tone(180, 0.05, 'square', 0.05, 90); },
    hit: function () { this.noise(0.08, 0.08); this.tone(120, 0.08, 'sawtooth', 0.05, 60); },
    whoosh: function () { this.tone(300, 0.12, 'sine', 0.03, 120); },
    jump: function () { this.tone(320, 0.12, 'square', 0.03, 640); },
    land: function () { this.tone(120, 0.06, 'sine', 0.04, 70); },
    pickup: function () { this.tone(520, 0.06, 'square', 0.03, 760); },
    grab: function () { this.tone(240, 0.05, 'square', 0.04, 300); },
    breakit: function () { this.noise(0.16, 0.09); this.tone(90, 0.16, 'sawtooth', 0.05, 50); },
    enemyDie: function () { this.tone(200, 0.18, 'sawtooth', 0.05, 60); setTimeout(function () { audio.tone(120, 0.16, 'square', 0.04, 50); }, 60); },
    food: function () { this.tone(680, 0.06, 'sine', 0.05); setTimeout(function () { audio.tone(920, 0.08, 'sine', 0.05); }, 55); },
    special: function () { this.noise(0.24, 0.1); this.tone(90, 0.3, 'sawtooth', 0.06, 300); },
    team: function () { this.tone(440, 0.08, 'square', 0.05, 220); setTimeout(function () { audio.tone(880, 0.12, 'square', 0.05, 300); }, 70); this.whoosh(); },
    boss: function () { this.tone(70, 0.5, 'sawtooth', 0.08, 40); },
    ui: function () { this.tone(600, 0.04, 'square', 0.03); },
    startMusic: function (stage) {
      if (!this.enabled || !this.ctx || this.musicOn) return;
      this.musicOn = true;
      var self = this;
      var seq = stage === 1 ? [110, 0, 146, 0, 110, 130, 98, 0] : [98, 0, 130, 0, 116, 0, 87, 98];
      var i = 0;
      this.musicTimer = setInterval(function () {
        if (!self.musicOn || !self.enabled) return;
        var f = seq[i % seq.length]; i++;
        if (f) self.tone(f, 0.22, 'triangle', 0.022, f * 1.5);
        if (i % 2 === 0) self.tone((seq[(i) % seq.length] || 110) * 2, 0.1, 'square', 0.01);
      }, 260);
    },
    stopMusic: function () { this.musicOn = false; if (this.musicTimer) clearInterval(this.musicTimer); }
  };

  // =====================================================================
  //  DURUM (world)
  // =====================================================================
  var world = null;
  var G = {                 // motor genel durumu
    mode: 'solo',           // 'solo' | 'local' | 'host' | 'guest'
    running: false,
    paused: false,
    over: false,
    net: null,
    dom: {},
    selfName: 'Oyuncu',
    saveScore: null,
    fetchLeaderboard: null,
    remoteInput: null,      // host: guest'ten gelen input
    snapBuf: [],            // guest: interpolasyon buffer'ı
    lastSnapAt: 0,
    lastInputAt: 0,
    scored: false
  };

  function freshWorld() {
    return {
      clock: 0,
      camX: 0,
      players: [],
      ents: [],
      spawnQueue: [],
      hitStop: 0,
      shake: 0,
      score: [0, 0],
      stageIndex: 0,
      seg: 0,
      segState: 'approach',   // approach | fight | boss | cleared | complete
      goArrow: 0,
      boss: null,
      stageLabel: '',
      popups: []
    };
  }

  function makePlayer(index, slot, name, palName) {
    return {
      kind: 'hero', index: index, slot: slot, name: name, pal: palName,
      x: 120 + index * 40, depthY: 48 + index * 6, z: 0,
      vx: 0, vDepth: 0, vz: 0, facing: 1,
      hp: 100, hpMax: 100, lives: 3,
      state: 'idle', stateT: 0, animT: 0,
      halfW: 12, scale: 1,
      comboStep: 0, comboT: 0, hitSet: null,
      held: null, grabbedBy: null,
      invulnT: 1.2, specialCD: 0,
      outOfPlay: false, continueT: 0, dead: false, respawnT: 0,
      input: emptyInput(), inputPrev: emptyInput()
    };
  }

  function emptyInput() {
    return { ax: 0, ay: 0, attack: false, jump: false, action: false, special: false, team: false };
  }

  function makeEnemy(kind, x, depthY, segTag, isBoss, bossKey) {
    var def = isBoss ? BOSS_DEF[bossKey] : ENEMY_DEF[kind];
    return {
      kind: 'enemy', etype: kind, isBoss: !!isBoss, bossKey: bossKey || null,
      pal: def.pal, x: x, depthY: depthY, z: 0,
      vx: 0, vDepth: 0, vz: 0, facing: -1,
      hp: def.hp, hpMax: def.hp, dmg: def.dmg, speed: def.speed,
      atkRange: def.atkRange || 24, atkDelay: def.atkDelay || 0.6,
      ranged: !!def.ranged, knockRes: def.knockRes, scale: def.scale,
      halfW: Math.round(11 * def.scale),
      state: 'spawn', stateT: 0, animT: 0,
      hitSet: null, hasToken: false, thinkT: rand(0.2, 0.9),
      grabbedBy: null, segTag: segTag, phase: 0,
      id: uid()
    };
  }

  function makeObject(type, x, depthY) {
    var d = OBJECT_DEF[type] || OBJECT_DEF.rock;
    return {
      kind: 'object', otype: type, x: x, depthY: depthY, z: 0,
      vx: 0, vz: 0, facing: 1, held: false, thrown: false, owner: null,
      w: d.w, h: d.h, mass: d.mass, dmg: d.dmg, color: d.color,
      hitSet: null, life: 1, id: uid()
    };
  }

  function makeItem(type, x, depthY) {
    return { kind: 'item', itype: type, x: x, depthY: depthY, z: 20, vz: 60, id: uid() };
  }

  function makeFx(type, x, depthY, z, extra) {
    var f = { kind: 'fx', ftype: type, x: x, depthY: depthY, z: z || 0, t: 0, life: 0.4, id: uid() };
    if (extra) for (var k in extra) f[k] = extra[k];
    return f;
  }

  function makeProjectile(type, x, depthY, z, vx, vz, owner, dmg) {
    return { kind: 'proj', ptype: type, x: x, depthY: depthY, z: z, vx: vx, vz: vz, owner: owner, dmg: dmg, hitSet: {}, life: 3, id: uid() };
  }

  function popup(text, x, depthY, color) {
    world.popups.push({ text: text, x: x, depthY: depthY, t: 0, color: color || '#ffce4a' });
  }

  // =====================================================================
  //  GİRDİ
  // =====================================================================
  var keyDown = {};
  var touch = { ax: 0, ay: 0, attack: false, jump: false, action: false, special: false, team: false };
  var P1MAP, P2MAP;

  function buildMaps(mode) {
    var arrows = (mode === 'local');   // yerel co-op'ta oklar P2'nin
    P1MAP = {
      up: arrows ? ['KeyW'] : ['KeyW', 'ArrowUp'],
      down: arrows ? ['KeyS'] : ['KeyS', 'ArrowDown'],
      left: arrows ? ['KeyA'] : ['KeyA', 'ArrowLeft'],
      right: arrows ? ['KeyD'] : ['KeyD', 'ArrowRight'],
      attack: ['KeyJ'], jump: ['KeyK', 'Space'], action: ['KeyL'], special: ['KeyU'], team: ['KeyI']
    };
    P2MAP = {
      up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
      attack: ['Numpad1', 'Period'], jump: ['Numpad2', 'Slash'], action: ['Numpad3', 'Comma'],
      special: ['Numpad0'], team: ['NumpadDecimal']
    };
  }

  function anyDown(codes) {
    for (var i = 0; i < codes.length; i++) if (keyDown[codes[i]]) return true;
    return false;
  }

  function readMap(map, withTouch) {
    var ax = (anyDown(map.right) ? 1 : 0) - (anyDown(map.left) ? 1 : 0);
    var ay = (anyDown(map.down) ? 1 : 0) - (anyDown(map.up) ? 1 : 0);
    var inp = {
      ax: ax, ay: ay,
      attack: anyDown(map.attack), jump: anyDown(map.jump),
      action: anyDown(map.action), special: anyDown(map.special), team: anyDown(map.team)
    };
    if (withTouch) {
      inp.ax = clamp(inp.ax + touch.ax, -1, 1);
      inp.ay = clamp(inp.ay + touch.ay, -1, 1);
      inp.attack = inp.attack || touch.attack;
      inp.jump = inp.jump || touch.jump;
      inp.action = inp.action || touch.action;
      inp.special = inp.special || touch.special;
      inp.team = inp.team || touch.team;
    }
    return inp;
  }

  function pressed(p, btn) { return p.input[btn] && !p.inputPrev[btn]; }

  // =====================================================================
  //  FİZİK
  // =====================================================================
  function integrate(e, dt, isPlayer) {
    e.x += e.vx * dt;
    if (typeof e.vDepth === 'number') {
      e.depthY = clamp(e.depthY + e.vDepth * dt, DEPTH_MIN, DEPTH_MAX);
    }
    if (e.z > 0 || e.vz !== 0) {
      e.vz -= GRAV * dt;
      e.z += e.vz * dt;
      if (e.z <= 0) { e.z = 0; e.vz = 0; e._landed = true; }
    }
  }

  function nearestPlayer(x, depthY) {
    var best = null, bd = 1e9;
    for (var i = 0; i < world.players.length; i++) {
      var p = world.players[i];
      if (!p || p.outOfPlay || p.dead) continue;
      var d = Math.abs(p.x - x) + Math.abs(p.depthY - depthY) * 0.5;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  function inFront(a, t, reach, depthTol) {
    if (Math.abs(t.depthY - a.depthY) > (depthTol || 16)) return false;
    if (Math.abs((t.z || 0) - (a.z || 0)) > 42) return false;
    var dx = t.x - a.x;
    if (a.facing > 0) return dx > -4 && dx < reach;
    return dx < 4 && dx > -reach;
  }

  // =====================================================================
  //  DÖVÜŞ / HASAR
  // =====================================================================
  function damageEnemy(e, dmg, dir, knock, causeDown, attacker) {
    if (e.state === 'dead' || e.state === 'grabbed') return;
    e.hp -= dmg;
    world.hitStop = Math.max(world.hitStop, 0.045);
    world.shake = Math.max(world.shake, causeDown ? 5 : 3);
    audio.hit();
    world.ents.push(makeFx('spark', e.x, e.depthY, e.z + 20));
    if (attacker && attacker.kind === 'hero') awardHitScore(attacker, causeDown ? 60 : 20);
    if (e.hp <= 0) { killEnemy(e, dir); return; }
    var kb = knock * (1 - (e.knockRes || 0) * 0.6);
    if (causeDown || kb > 130) {
      e.state = 'knockdown'; e.stateT = 0; e.vx = dir * Math.max(120, kb); e.vz = 150; e.hasToken = false;
    } else {
      e.state = 'hurt'; e.stateT = 0; e.vx = dir * kb * 0.5;
    }
  }

  function killEnemy(e, dir) {
    e.state = 'dead'; e.stateT = 0; e.vx = dir * 120; e.vz = 120; e.hasToken = false;
    audio.enemyDie();
    world.ents.push(makeFx('ko', e.x, e.depthY, e.z + 24));
    if (chance(e.isBoss ? 1 : 0.22)) world.ents.push(makeItem('food', e.x, e.depthY));
    if (e.isBoss) { world.boss = null; audio.boss(); world.shake = 10; }
  }

  function damagePlayer(p, dmg, dir, knock) {
    if (p.invulnT > 0 || p.dead || p.outOfPlay || p.held) return;
    if (p.state === 'special') return;
    p.hp -= dmg;
    p.invulnT = 0.5;
    world.hitStop = Math.max(world.hitStop, 0.04);
    world.shake = Math.max(world.shake, 4);
    audio.hit();
    releaseHeld(p, false);
    if (p.hp <= 0) { p.hp = 0; playerDown(p); return; }
    if (knock > 120) { p.state = 'knockdown'; p.stateT = 0; p.vx = dir * knock; p.vz = 160; }
    else { p.state = 'hurt'; p.stateT = 0; p.vx = dir * knock * 0.5; }
  }

  function playerDown(p) {
    p.dead = true; p.state = 'knockdown'; p.stateT = 0; p.vx = -p.facing * 120; p.vz = 170;
    p.lives -= 1;
    audio.enemyDie();
  }

  function awardHitScore(p, pts) { world.score[p.index] += pts; }

  function heroAttackHitbox(p, reach, depthTol, dmg, knock, causeDown) {
    for (var i = 0; i < world.ents.length; i++) {
      var e = world.ents[i];
      if (e.kind !== 'enemy' || e.state === 'dead' || e.state === 'grabbed') continue;
      if (p.hitSet && p.hitSet[e.id]) continue;
      if (inFront(p, e, reach, depthTol)) {
        if (!p.hitSet) p.hitSet = {};
        p.hitSet[e.id] = 1;
        damageEnemy(e, dmg, p.facing, knock, causeDown, p);
      }
    }
  }

  // =====================================================================
  //  TUTMA / FIRLATMA
  // =====================================================================
  function tryGrabOrPick(p) {
    // Önce yakın sersem/ayakta düşman (grab), sonra nesne (pick).
    var target = null, td = GRAB_RANGE + 1;
    for (var i = 0; i < world.ents.length; i++) {
      var e = world.ents[i];
      if (e.kind === 'enemy' && e.state !== 'dead' && e.state !== 'grabbed' && e.state !== 'thrown' && e.state !== 'spawn') {
        if (Math.abs(e.depthY - p.depthY) > 16) continue;
        var dx = Math.abs(e.x - p.x);
        if (dx < td) { td = dx; target = e; }
      }
    }
    if (target) {
      p.held = { type: 'enemy', ref: target };
      target.state = 'grabbed'; target.grabbedBy = p; target.vx = 0; target.vz = 0; target.z = 0;
      p.state = 'grabbing'; p.stateT = 0;
      audio.grab();
      return true;
    }
    // Nesne
    var obj = null, od = PICK_RANGE + 1;
    for (var j = 0; j < world.ents.length; j++) {
      var o = world.ents[j];
      if (o.kind === 'object' && !o.held && !o.thrown && o.z <= 2) {
        if (Math.abs(o.depthY - p.depthY) > 18) continue;
        var ox = Math.abs(o.x - p.x);
        if (ox < od) { od = ox; obj = o; }
      }
    }
    if (obj) {
      p.held = { type: 'object', ref: obj };
      obj.held = true; obj.owner = p;
      p.state = 'holding'; p.stateT = 0;
      audio.pickup();
      return true;
    }
    return false;
  }

  function tryTeamGrab(p) {
    var mate = partnerOf(p);
    if (!mate || mate.dead || mate.outOfPlay || mate.held || mate.grabbedBy) return false;
    if (Math.abs(mate.x - p.x) > TEAM_RANGE || Math.abs(mate.depthY - p.depthY) > 18) return false;
    p.held = { type: 'partner', ref: mate };
    mate.grabbedBy = p; mate.state = 'held'; mate.vx = 0; mate.vz = 0; mate.z = 0; mate.invulnT = 3;
    p.state = 'grabbing'; p.stateT = 0;
    audio.grab();
    return true;
  }

  function partnerOf(p) {
    for (var i = 0; i < world.players.length; i++) {
      if (world.players[i] && world.players[i] !== p) return world.players[i];
    }
    return null;
  }

  function positionHeld(p) {
    if (!p.held) return;
    var ref = p.held.ref;
    if (p.held.type === 'object') {
      ref.x = p.x + p.facing * 8; ref.depthY = p.depthY; ref.z = 26; ref.facing = p.facing;
    } else {
      ref.x = p.x + p.facing * 15; ref.depthY = p.depthY; ref.z = p.z + 4; ref.facing = -p.facing;
    }
  }

  function throwHeld(p) {
    if (!p.held) return;
    var ref = p.held.ref, type = p.held.type;
    if (type === 'object') {
      ref.held = false; ref.thrown = true; ref.owner = p;
      ref.vx = p.facing * THROW_VX * (ref.mass === 'large' ? 0.55 : ref.mass === 'med' ? 0.8 : 1.1);
      ref.z = 24; ref.vz = ref.mass === 'large' ? 60 : 120; ref.hitSet = {};
      p.state = 'throwing'; p.stateT = 0; audio.whoosh();
    } else if (type === 'enemy') {
      ref.state = 'thrown'; ref.grabbedBy = null; ref.owner = p; ref.hitSet = {};
      ref.vx = p.facing * THROW_VX; ref.z = 20; ref.vz = THROW_VZ; ref.facing = p.facing;
      p.state = 'throwing'; p.stateT = 0; audio.whoosh();
      awardHitScore(p, 40);
    } else if (type === 'partner') {
      ref.grabbedBy = null; ref.state = 'tossed'; ref.tossOwner = p; ref.hitSet = {}; ref.invulnT = 2.5;
      ref.vx = p.facing * (THROW_VX + 60); ref.z = 24; ref.vz = 190; ref.facing = p.facing;
      p.state = 'throwing'; p.stateT = 0;
      audio.team(); popup('TAKIM ATIŞI!', p.x, p.depthY - 30, '#ffce4a'); world.shake = 6;
      awardHitScore(p, 120);
    }
    p.held = null;
  }

  function releaseHeld(p, thrownAway) {
    if (!p.held) return;
    var ref = p.held.ref, type = p.held.type;
    if (type === 'object') { ref.held = false; ref.owner = null; }
    else if (type === 'enemy') { ref.state = 'hurt'; ref.stateT = 0; ref.grabbedBy = null; }
    else if (type === 'partner') { ref.grabbedBy = null; ref.state = 'idle'; }
    p.held = null;
  }

  function doSpecial(p) {
    p.state = 'special'; p.stateT = 0; p.specialCD = SPECIAL_CD; p.invulnT = 0.5;
    p.hp = Math.max(1, p.hp - SPECIAL_COST);
    audio.special(); world.shake = 8;
    world.ents.push(makeFx('shock', p.x, p.depthY, 10, { life: 0.4 }));
    for (var i = 0; i < world.ents.length; i++) {
      var e = world.ents[i];
      if (e.kind !== 'enemy' || e.state === 'dead' || e.state === 'grabbed') continue;
      if (Math.abs(e.x - p.x) < 74 && Math.abs(e.depthY - p.depthY) < 40) {
        damageEnemy(e, 24, sign(e.x - p.x) || p.facing, 200, true, p);
      }
    }
  }

  // =====================================================================
  //  OYUNCU GÜNCELLEME
  // =====================================================================
  function updatePlayer(p, dt) {
    p.stateT += dt; p.animT += dt;
    if (p.invulnT > 0) p.invulnT -= dt;
    if (p.specialCD > 0) p.specialCD -= dt;

    // Devam / ölüm kuyruğu
    if (p.outOfPlay) {
      p.continueT -= dt;
      if (pressed(p, 'attack') || pressed(p, 'jump')) { continuePlayer(p); }
      p.inputPrev = copyInput(p.input);
      return;
    }
    if (p.dead) {
      integrate(p, dt, true);
      if (p._landed) { p._landed = false; }
      if (p.stateT > 1.1) {
        if (p.lives > 0) respawnPlayer(p);
        else { p.outOfPlay = true; p.continueT = CONTINUE_SECONDS; p.state = 'out'; }
      }
      p.inputPrev = copyInput(p.input);
      return;
    }

    // Tutulan (partner) — kontrol yok
    if (p.grabbedBy) { p.inputPrev = copyInput(p.input); return; }
    if (p.state === 'tossed') {
      integrate(p, dt, true);
      projectileHitsEnemies(p, p.tossOwner, 26);
      if (p._landed) { p._landed = false; p.state = 'knockdown'; p.stateT = 0; }
      p.inputPrev = copyInput(p.input);
      return;
    }

    var inp = p.input;
    var busy = ['attack', 'jumpkick', 'throwing', 'grabbing', 'special', 'hurt', 'knockdown'].indexOf(p.state) >= 0;

    // Hasar sonrası durumlar
    if (p.state === 'hurt') { integrate(p, dt, true); p.vx *= 0.86; if (p.stateT > 0.28) p.state = 'idle'; p.inputPrev = copyInput(p.input); return; }
    if (p.state === 'knockdown') {
      integrate(p, dt, true); p.vx *= 0.9;
      if (p._landed) { p._landed = false; p.state = 'downed'; p.stateT = 0; p.invulnT = Math.max(p.invulnT, 0.9); }
      p.inputPrev = copyInput(p.input); return;
    }
    if (p.state === 'downed') { if (p.stateT > 0.7) { p.state = 'idle'; p.invulnT = Math.max(p.invulnT, 0.4); } p.inputPrev = copyInput(p.input); return; }

    // Havada
    if (p.z > 0 && p.state !== 'holding' && p.state !== 'grabbing') {
      integrate(p, dt, true);
      // hava kontrolü (hafif)
      p.vx = clamp(p.vx + inp.ax * 200 * dt, -WALK_VX, WALK_VX);
      if (inp.ax) p.facing = inp.ax > 0 ? 1 : -1;
      if (p.state === 'jump' && pressed(p, 'attack')) { p.state = 'jumpkick'; p.stateT = 0; p.hitSet = {}; audio.whoosh(); }
      if (p.state === 'jumpkick') heroAttackHitbox(p, 30, 20, 12, 120, false);
      if (p._landed) { p._landed = false; p.state = 'idle'; p.hitSet = null; audio.land(); }
      p.inputPrev = copyInput(p.input);
      return;
    }

    // Saldırı kombosu
    if (p.state === 'attack') {
      integrate(p, dt, true); p.vx *= 0.8;
      var step = p.comboStep;
      var active = (p.stateT > 0.05 && p.stateT < 0.16);
      if (active) heroAttackHitbox(p, 30, 15, step >= 2 ? 16 : 9, step >= 2 ? 170 : 40, step >= 2);
      // zincir penceresi
      if (p.stateT > 0.13 && p.stateT < 0.34 && pressed(p, 'attack') && step < 2) {
        p.comboStep = step + 1; p.stateT = 0; p.hitSet = {}; audio.punch();
      } else if (p.stateT > 0.32) { p.state = 'idle'; p.comboStep = 0; p.hitSet = null; }
      p.inputPrev = copyInput(p.input); return;
    }
    if (p.state === 'jumpkick') { // yere indi ama hâlâ bu state ise
      if (p.z <= 0) { p.state = 'idle'; p.hitSet = null; }
      p.inputPrev = copyInput(p.input); return;
    }
    if (p.state === 'special') { if (p.stateT > 0.4) p.state = 'idle'; p.inputPrev = copyInput(p.input); return; }
    if (p.state === 'throwing') { p.vx *= 0.8; integrate(p, dt, true); if (p.stateT > 0.22) p.state = 'idle'; p.inputPrev = copyInput(p.input); return; }

    // Tutuyor (nesne / düşman / partner)
    if (p.held) {
      positionHeld(p);
      // yavaş hareket
      var hs = p.held.type === 'object' && p.held.ref.mass === 'large' ? 0.4 : 0.7;
      p.vx = inp.ax * WALK_VX * hs; p.vDepth = inp.ay * WALK_VD * hs;
      if (inp.ax) p.facing = inp.ax > 0 ? 1 : -1;
      integrate(p, dt, true);
      positionHeld(p);
      p.state = (inp.ax || inp.ay) ? 'holdwalk' : 'holding';
      if (pressed(p, 'action')) { throwHeld(p); }
      else if (pressed(p, 'attack')) {
        if (p.held.type === 'object') {
          p.hitSet = {}; heroAttackHitbox(p, 34, 18, p.held.ref.dmg, 120, false); audio.whoosh();
          p.held.ref.life -= 1; if (p.held.ref.life <= 0) { breakObject(p.held.ref); p.held = null; p.state = 'idle'; }
        } else if (p.held.type === 'enemy') {
          damageEnemy(p.held.ref, 8, p.facing, 0, false, p);
          if (!p.held || p.held.ref.state === 'dead') { p.held = null; p.state = 'idle'; }
        }
      }
      p.inputPrev = copyInput(p.input); return;
    }

    // ---- serbest hareket (idle/walk) ----
    p.vx = inp.ax * WALK_VX; p.vDepth = inp.ay * WALK_VD;
    if (inp.ax) p.facing = inp.ax > 0 ? 1 : -1;
    integrate(p, dt, true);
    p.state = (inp.ax || inp.ay) ? 'walk' : 'idle';

    if (pressed(p, 'jump')) { p.state = 'jump'; p.vz = JUMP_V; p.z = 0.01; p.vDepth = 0; audio.jump(); }
    else if (pressed(p, 'attack')) { p.state = 'attack'; p.stateT = 0; p.comboStep = 0; p.hitSet = {}; audio.punch(); }
    else if (pressed(p, 'action')) { tryGrabOrPick(p); }
    else if (pressed(p, 'special') && p.specialCD <= 0) { doSpecial(p); }
    else if (pressed(p, 'team')) { tryTeamGrab(p); }

    p.inputPrev = copyInput(p.input);
  }

  function copyInput(i) { return { ax: i.ax, ay: i.ay, attack: i.attack, jump: i.jump, action: i.action, special: i.special, team: i.team }; }

  function continuePlayer(p) {
    p.outOfPlay = false; p.dead = false; p.lives = 2; p.hp = p.hpMax;
    p.state = 'idle'; p.invulnT = 1.6; p.x = world.camX + VW / 2; p.depthY = 40; p.z = 0;
    audio.ui();
  }

  function respawnPlayer(p) {
    p.dead = false; p.hp = p.hpMax; p.state = 'idle'; p.invulnT = 1.6;
    var mate = partnerOf(p);
    p.x = mate && !mate.outOfPlay ? mate.x : world.camX + VW / 2;
    p.depthY = 40; p.z = 40; p.vz = 0;
  }

  function breakObject(o) {
    o.state = 'gone'; o._remove = true; audio.breakit();
    world.ents.push(makeFx('debris', o.x, o.depthY, o.z));
  }

  // =====================================================================
  //  DÜŞMAN AI
  // =====================================================================
  var ATTACK_TOKEN_CAP = 2;
  function activeAttackers() {
    var n = 0;
    for (var i = 0; i < world.ents.length; i++) if (world.ents[i].kind === 'enemy' && world.ents[i].hasToken) n++;
    return n;
  }

  function updateEnemy(e, dt) {
    e.stateT += dt; e.animT += dt;

    if (e.state === 'dead') {
      integrate(e, dt); e.vx *= 0.9;
      if (e.stateT > 0.9) e._remove = true;
      return;
    }
    if (e.state === 'grabbed') { return; } // konumu tutan oyuncu ayarlar
    if (e.state === 'thrown') {
      integrate(e, dt);
      projectileHitsEnemies(e, e.owner, 22);
      if (e._landed) {
        e._landed = false; e.vx = 0;
        if (e.hp <= 0) killEnemy(e, e.facing); else { e.state = 'knockdown'; e.stateT = 0; }
      }
      return;
    }
    if (e.state === 'hurt') { integrate(e, dt); e.vx *= 0.8; if (e.stateT > 0.3) e.state = 'approach'; return; }
    if (e.state === 'knockdown') {
      integrate(e, dt); e.vx *= 0.9;
      if (e._landed) { e._landed = false; e.state = 'down'; e.stateT = 0; }
      return;
    }
    if (e.state === 'down') { if (e.stateT > (e.isBoss ? 0.5 : 0.8)) e.state = 'approach'; return; }
    if (e.state === 'spawn') { integrate(e, dt); if (e.stateT > 0.3) e.state = 'approach'; return; }

    var target = nearestPlayer(e.x, e.depthY);
    if (!target) { e.vx = 0; e.vDepth = 0; e.state = 'idle'; integrate(e, dt); return; }
    e.facing = target.x < e.x ? -1 : 1;

    if (e.state === 'attack') {
      integrate(e, dt); e.vx *= 0.7;
      if (e.ranged) {
        if (e.stateT > 0.4 && !e._fired) {
          e._fired = true;
          world.ents.push(makeProjectile('bottle', e.x + e.facing * 10, e.depthY, 22, e.facing * 230, 40, e, e.dmg));
          audio.whoosh();
        }
        if (e.stateT > 0.8) { e.state = 'approach'; e.hasToken = false; e._fired = false; e.thinkT = rand(0.8, 1.6); }
      } else {
        var hitAt = e.isBoss ? 0.45 : 0.32;
        if (e.stateT > hitAt && e.stateT < hitAt + 0.12 && !e._hit) {
          e._hit = true;
          if (inFront(e, target, e.atkRange, 18)) damagePlayer(target, e.dmg, e.facing, e.isBoss ? 180 : 90);
        }
        if (e.stateT > hitAt + 0.35) { e.state = 'approach'; e.hasToken = false; e._hit = false; e.thinkT = rand(0.4, 1.1); }
      }
      return;
    }

    if (e.state === 'charge') { // boss atağı
      integrate(e, dt);
      if (inFront(e, target, 30, 22) && !e._hit) { e._hit = true; damagePlayer(target, e.dmg + 4, e.facing, 220); }
      if (e.stateT > 0.7) { e.state = 'approach'; e.hasToken = false; e._hit = false; e.thinkT = rand(0.6, 1.2); }
      return;
    }

    // approach / idle
    e.thinkT -= dt;
    var dx = target.x - e.x, dd = target.depthY - e.depthY;
    var range = e.atkRange;
    var wantAttack = Math.abs(dx) < range && Math.abs(dd) < 18;
    if (e.ranged) wantAttack = Math.abs(dx) < range && Math.abs(dx) > 60 && Math.abs(dd) < 24;

    if (wantAttack && e.thinkT <= 0 && (e.hasToken || activeAttackers() < ATTACK_TOKEN_CAP)) {
      e.hasToken = true; e.state = 'attack'; e.stateT = 0; e._hit = false; e._fired = false;
      e.vx = 0; e.vDepth = 0;
      return;
    }
    if (e.isBoss && e.thinkT <= 0 && Math.abs(dx) > 80 && Math.abs(dx) < 260 && chance(0.5)) {
      e.state = 'charge'; e.stateT = 0; e._hit = false; e.hasToken = true;
      e.vx = e.facing * 260; e.vDepth = sign(dd) * 40;
      audio.boss();
      return;
    }

    // yaklaş — hedefe doğru, hafif ofsetle
    var sp = e.speed * (e.isBoss ? 90 : 70);
    var offset = e.ranged ? 110 : 20;
    var desiredX = target.x - e.facing * offset;
    e.vx = clamp((desiredX - e.x), -sp, sp);
    e.vDepth = clamp(dd, -sp * 0.7, sp * 0.7);
    if (Math.abs(e.vx) < 6 && Math.abs(e.vDepth) < 6) e.state = 'idle'; else e.state = 'approach';
    integrate(e, dt);
  }

  function projectileHitsEnemies(proj, owner, radius) {
    for (var i = 0; i < world.ents.length; i++) {
      var e = world.ents[i];
      if (e === proj) continue;
      if (e.kind !== 'enemy' || e.state === 'dead' || e.state === 'grabbed') continue;
      if (proj.hitSet && proj.hitSet[e.id]) continue;
      if (Math.abs(e.x - proj.x) < radius && Math.abs(e.depthY - proj.depthY) < 16 && Math.abs((e.z || 0) - proj.z) < 34) {
        if (proj.hitSet) proj.hitSet[e.id] = 1;
        var dmg = proj.kind === 'object' ? proj.dmg : proj.dmg || 18;
        damageEnemy(e, dmg, sign(proj.vx) || 1, 170, true, owner && owner.kind === 'hero' ? owner : null);
        popup('+', e.x, e.depthY - 24, '#ff5a3c');
      }
    }
  }

  // =====================================================================
  //  NESNE / ITEM / PROJEKTİL / FX GÜNCELLEME
  // =====================================================================
  function updateObject(o, dt) {
    if (o.held) return;
    if (o.thrown) {
      integrate(o, dt);
      projectileHitsEnemies(o, o.owner, 20);
      if (o._landed) {
        o._landed = false; o.thrown = false; o.vx = 0;
        if (o.mass === 'small' || o.mass === 'med') breakObject(o);
      }
    } else if (o.z > 0) { integrate(o, dt); }
  }

  function updateItem(it, dt) {
    if (it.z > 0 || it.vz !== 0) { it.vz -= GRAV * dt; it.z += it.vz * dt; if (it.z <= 0) { it.z = 0; it.vz = 0; } }
    for (var i = 0; i < world.players.length; i++) {
      var p = world.players[i];
      if (!p || p.dead || p.outOfPlay) continue;
      if (Math.abs(p.x - it.x) < 20 && Math.abs(p.depthY - it.depthY) < 18) {
        if (it.itype === 'food') { p.hp = Math.min(p.hpMax, p.hp + 34); audio.food(); popup('+CAN', it.x, it.depthY - 20, '#7dff9a'); }
        it._remove = true; return;
      }
    }
  }

  function updateProjectile(pr, dt) {
    pr.life -= dt;
    pr.x += pr.vx * dt; pr.vz -= GRAV * dt * 0.5; pr.z += pr.vz * dt;
    // oyunculara hasar (düşman mermisi)
    for (var i = 0; i < world.players.length; i++) {
      var p = world.players[i];
      if (!p || p.dead || p.outOfPlay || p.invulnT > 0) continue;
      if (Math.abs(p.x - pr.x) < 16 && Math.abs(p.depthY - pr.depthY) < 16 && Math.abs(p.z - pr.z) < 30) {
        damagePlayer(p, pr.dmg, sign(pr.vx) || 1, 80); pr._remove = true; return;
      }
    }
    if (pr.z <= 0 || pr.life <= 0) { pr._remove = true; world.ents.push(makeFx('debris', pr.x, pr.depthY, 0)); }
  }

  function updateFx(f, dt) { f.t += dt; if (f.t >= f.life) f._remove = true; }

  // =====================================================================
  //  SAHNE / SPAWN / KAMERA
  // =====================================================================
  function startStage(index) {
    world.stageIndex = index;
    world.seg = 0; world.segState = 'approach'; world.goArrow = 0; world.boss = null;
    world.camX = 0; world.spawnQueue = [];
    world.stageLabel = STAGES[index].name;
    // temizle non-oyuncu entity
    world.ents = [];
    // oyuncuları başlangıca al
    for (var i = 0; i < world.players.length; i++) {
      var p = world.players[i]; if (!p) continue;
      p.x = 90 + i * 40; p.depthY = 46 + i * 6; p.z = 0; p.invulnT = 1.2; p.held = null;
      if (!p.outOfPlay) { p.dead = false; p.state = 'idle'; }
    }
    activateSegment();
    audio.stopMusic(); audio.startMusic(index + 1);
  }

  function activateSegment() {
    var stage = STAGES[world.stageIndex];
    var seg = stage.segments[world.seg];
    if (!seg) { world.segState = 'complete'; return; }
    // props
    if (seg.props) {
      for (var i = 0; i < seg.props.length; i++) {
        world.ents.push(makeObject(seg.props[i].t, seg.props[i].x, rand(DEPTH_MIN + 8, DEPTH_MAX - 8)));
      }
    }
    if (seg.boss) {
      world.segState = 'boss';
      var bx = seg.cam + VW * 0.72;
      var boss = makeEnemy(null, bx, 40, world.seg, true, seg.boss);
      world.ents.push(boss);
      world.boss = boss;
      audio.boss();
    } else {
      world.segState = 'fight';
      var t = 0.2;
      for (var g = 0; g < seg.spawns.length; g++) {
        var grp = seg.spawns[g];
        for (var n = 0; n < grp.n; n++) {
          var side = chance(0.7) ? 1 : -1;
          var sx = side > 0 ? seg.cam + VW + 24 + n * 22 : seg.cam - 24 - n * 22;
          world.spawnQueue.push({ at: world.clock + t, kind: grp.kind, x: sx, depthY: rand(DEPTH_MIN + 10, DEPTH_MAX - 6), seg: world.seg });
          t += rand(0.4, 0.9);
        }
      }
    }
  }

  function pendingSpawns(seg) {
    var n = 0;
    for (var i = 0; i < world.spawnQueue.length; i++) if (world.spawnQueue[i].seg === seg) n++;
    return n;
  }
  function aliveInSeg(seg) {
    var n = 0;
    for (var i = 0; i < world.ents.length; i++) {
      var e = world.ents[i];
      if (e.kind === 'enemy' && e.segTag === seg && e.state !== 'dead') n++;
    }
    return n;
  }

  function updateStage(dt) {
    // spawn kuyruğu
    for (var i = world.spawnQueue.length - 1; i >= 0; i--) {
      if (world.clock >= world.spawnQueue[i].at) {
        var s = world.spawnQueue[i];
        world.ents.push(makeEnemy(s.kind, s.x, s.depthY, s.seg, false, null));
        world.spawnQueue.splice(i, 1);
      }
    }

    var stage = STAGES[world.stageIndex];
    if (world.segState === 'fight' || world.segState === 'boss') {
      if (pendingSpawns(world.seg) === 0 && aliveInSeg(world.seg) === 0) {
        world.segState = 'cleared';
        if (world.seg + 1 >= stage.segments.length) {
          // sahne bitti
          stageComplete();
        } else {
          world.goArrow = 1;
        }
      }
    } else if (world.segState === 'cleared') {
      // sonraki segmente doğru ilerleme; camX yeni cam'a ulaşınca aktive et
      var next = stage.segments[world.seg + 1];
      if (next && world.camX >= next.cam - 2) {
        world.seg += 1; world.goArrow = 0; world.segState = 'approach';
        activateSegment();
      }
    }
  }

  function stageComplete() {
    world.segState = 'complete';
    if (world.stageIndex + 1 < STAGES.length) {
      showOverlay('stageclear');
      if (G.mode === 'host') G.net.sendSys('stageclear', { stage: world.stageIndex });
    } else {
      finishGame(true);
    }
  }

  function camWalls() {
    var stage = STAGES[world.stageIndex];
    var seg = stage.segments[world.seg];
    var right;
    if (world.segState === 'cleared') {
      var next = stage.segments[world.seg + 1];
      right = next ? next.cam : stage.end + VW;
    } else if (world.segState === 'complete') {
      right = stage.end + VW;
    } else {
      right = seg ? seg.cam : 0;   // dövüş sırasında kilit
    }
    return { left: Math.max(0, (seg ? seg.cam : 0) - 40), right: right };
  }

  function updateCamera(dt) {
    var walls = camWalls();
    var alive = [];
    for (var i = 0; i < world.players.length; i++) { var p = world.players[i]; if (p && !p.outOfPlay) alive.push(p); }
    var focus = 0;
    if (alive.length) { for (var j = 0; j < alive.length; j++) focus += alive[j].x; focus /= alive.length; }
    else focus = world.camX + VW / 2;
    var target = clamp(focus - VW / 2, walls.left, walls.right);
    world.camX += (target - world.camX) * Math.min(1, dt * 6);
    world.camX = clamp(world.camX, walls.left, walls.right);

    // oyuncuları ekranda tut
    var margin = 16;
    for (var k = 0; k < world.players.length; k++) {
      var pl = world.players[k]; if (!pl) continue;
      var loX = world.camX + margin, hiX = world.camX + VW - margin;
      // dövüş kilidinde sağ duvar
      if (world.segState === 'fight' || world.segState === 'boss') hiX = Math.min(hiX, world.camX + VW - margin);
      pl.x = clamp(pl.x, loX, hiX);
    }
  }

  // =====================================================================
  //  ANA SİMÜLASYON (host / offline)
  // =====================================================================
  function gatherInputs() {
    var p1 = world.players[0];
    if (p1) p1.input = readMap(P1MAP, true);
    var p2 = world.players[1];
    if (p2) {
      if (G.mode === 'local') p2.input = readMap(P2MAP, false);
      else if (G.mode === 'host') p2.input = G.remoteInput ? G.remoteInput : emptyInput();
    }
  }

  function simulate(dt) {
    world.clock += dt;
    if (world.hitStop > 0) { world.hitStop -= dt; return; }

    gatherInputs();
    for (var i = 0; i < world.players.length; i++) if (world.players[i]) updatePlayer(world.players[i], dt);

    for (var j = 0; j < world.ents.length; j++) {
      var e = world.ents[j];
      if (e.kind === 'enemy') updateEnemy(e, dt);
      else if (e.kind === 'object') updateObject(e, dt);
      else if (e.kind === 'item') updateItem(e, dt);
      else if (e.kind === 'proj') updateProjectile(e, dt);
      else if (e.kind === 'fx') updateFx(e, dt);
    }
    // held pozisyonlarını sabitle
    for (var h = 0; h < world.players.length; h++) if (world.players[h] && world.players[h].held) positionHeld(world.players[h]);

    // temizle
    for (var r = world.ents.length - 1; r >= 0; r--) if (world.ents[r]._remove) world.ents.splice(r, 1);

    // popup ömrü
    for (var pu = world.popups.length - 1; pu >= 0; pu--) { world.popups[pu].t += dt; if (world.popups[pu].t > 0.9) world.popups.splice(pu, 1); }

    if (world.shake > 0) world.shake -= dt * 24;

    updateStage(dt);
    updateCamera(dt);

    // game over kontrol
    if (allOut()) finishGame(false);
  }

  function allOut() {
    var any = false;
    for (var i = 0; i < world.players.length; i++) {
      var p = world.players[i]; if (!p) continue;
      if (!p.outOfPlay) any = true;
    }
    return !any && world.players.length > 0;
  }

  // =====================================================================
  //  RENDER
  // =====================================================================
  var ctx = null, canvas = null;

  function render() {
    if (!ctx) return;
    var sk = (world && world.shake > 0.4) ? world.shake : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (sk) ctx.translate((Math.random() - 0.5) * sk, (Math.random() - 0.5) * sk);
    drawBackground();
    drawFloor();

    // çizilecekleri derinliğe göre sırala
    var draws = [];
    for (var i = 0; i < world.ents.length; i++) draws.push(world.ents[i]);
    for (var p = 0; p < world.players.length; p++) if (world.players[p]) draws.push(world.players[p]);
    draws.sort(function (a, b) { return (a.depthY + (a.z ? 0.01 : 0)) - (b.depthY); });

    for (var d = 0; d < draws.length; d++) {
      var e = draws[d];
      if (e.kind === 'hero') drawFighter(e, PAL[e.pal]);
      else if (e.kind === 'enemy') drawFighter(e, PAL[e.pal]);
      else if (e.kind === 'object') drawObject(e);
      else if (e.kind === 'item') drawItem(e);
      else if (e.kind === 'proj') drawProj(e);
      else if (e.kind === 'fx') drawFx(e);
    }

    drawPopups();
    if (world.goArrow) drawGoArrow();
  }

  function drawBackground() {
    var bg = STAGES[world.stageIndex] ? STAGES[world.stageIndex].bg : 'ruins';
    if (bg === 'subway') {
      var g1 = ctx.createLinearGradient(0, 0, 0, VH);
      g1.addColorStop(0, '#0a0f14'); g1.addColorStop(1, '#141a20');
      ctx.fillStyle = g1; ctx.fillRect(0, 0, VW, VH);
      // tünel halkaları
      ctx.strokeStyle = 'rgba(0,180,200,0.12)'; ctx.lineWidth = 2;
      for (var r = 0; r < 6; r++) {
        var rx = ((r * 120 - (world.camX * 0.4) % 120) + 120) % (VW + 120) - 60;
        ctx.beginPath(); ctx.ellipse(rx, GROUND_TOP - 40, 70, 90, 0, 0, Math.PI * 2); ctx.stroke();
      }
    } else {
      var g = ctx.createLinearGradient(0, 0, 0, VH);
      g.addColorStop(0, '#3a2418'); g.addColorStop(0.5, '#6b3a22'); g.addColorStop(1, '#20140c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      // uzak yıkık silüet (parallax 0.25)
      ctx.fillStyle = '#241a12';
      var off = (world.camX * 0.25) % 160;
      for (var b = -1; b < 6; b++) {
        var bx = b * 160 - off;
        var bh = 60 + ((b * 37) % 40);
        ctx.fillRect(bx, GROUND_TOP - 60 - bh, 90, bh + 60);
        // kırık üst
        ctx.fillRect(bx + 20, GROUND_TOP - 66 - bh, 14, 8);
        ctx.fillRect(bx + 60, GROUND_TOP - 70 - bh, 10, 12);
      }
      // orta moloz (parallax 0.5)
      ctx.fillStyle = '#33241a';
      var off2 = (world.camX * 0.5) % 120;
      for (var m = -1; m < 6; m++) {
        var mx = m * 120 - off2;
        ctx.fillRect(mx, GROUND_TOP - 30, 40, 30);
        ctx.fillRect(mx + 60, GROUND_TOP - 18, 24, 18);
      }
    }
  }

  function drawFloor() {
    var y0 = GROUND_TOP, y1 = GROUND_TOP + DEPTH_MAX + 30;
    var subway = STAGES[world.stageIndex] && STAGES[world.stageIndex].bg === 'subway';
    ctx.fillStyle = subway ? '#1c1410' : '#2a1c12';
    ctx.fillRect(0, y0, VW, y1 - y0);
    ctx.fillStyle = subway ? '#241a14' : '#38271a';
    ctx.fillRect(0, y0, VW, 4);
    // perspektif çizgiler
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
    var off = (world.camX) % 48;
    for (var i = -1; i < VW / 24 + 2; i++) {
      var x = i * 48 - off;
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x - 14, y1); ctx.stroke();
    }
  }

  function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

  function drawFighter(e, pal) {
    if (!pal) pal = PAL.punk;
    var sx = e.x - world.camX;
    var groundY = GROUND_TOP + e.depthY;
    var feetY = groundY - e.z;
    var s = e.scale || 1;
    // gölge
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(sx, groundY + 1, 12 * s * (1 - Math.min(0.4, e.z / 160)), 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // yanıp sönme (invuln)
    if (e.invulnT > 0 && Math.floor(e.animT * 20) % 2 === 0) return;

    var f = e.facing >= 0 ? 1 : -1;
    var st = e.state;
    var bob = 0, lean = 0;
    if (st === 'walk' || st === 'approach' || st === 'holdwalk') bob = Math.sin(e.animT * 12) * 1.4;
    if (st === 'idle' || st === 'holding') bob = Math.sin(e.animT * 3) * 0.8;
    if (st === 'hurt') lean = -f * 3;

    var down = (st === 'knockdown' || st === 'down' || st === 'dead' || st === 'thrown' || st === 'tossed');

    ctx.save();
    ctx.translate(sx, feetY);
    ctx.scale(f, 1);

    if (down) {
      // yerde yatan gövde
      px(-14 * s, -10 * s, 26 * s, 8 * s, pal.shirt);
      px(-16 * s, -6 * s, 8 * s, 6 * s, pal.skin);   // baş
      px(6 * s, -6 * s, 10 * s, 5 * s, pal.pants);
      ctx.restore();
      return;
    }

    var W = 14 * s, legY = -10 * s;
    // bacaklar
    var legSwing = (st === 'walk' || st === 'approach' || st === 'holdwalk') ? Math.sin(e.animT * 12) * 4 : 0;
    if (st === 'jump' || st === 'jumpkick') {
      px(-6 * s, legY, 6 * s, 8 * s, pal.pants);
      px(2 * s, legY - 2 * s, 6 * s, 8 * s, pal.pants);
    } else {
      px(-7 * s + legSwing, legY, 6 * s, 10 * s, pal.pants);
      px(2 * s - legSwing, legY, 6 * s, 10 * s, pal.pants);
      px(-7 * s + legSwing, legY + 9 * s, 6 * s, 3 * s, pal.boot);
      px(2 * s - legSwing, legY + 9 * s, 6 * s, 3 * s, pal.boot);
    }
    // gövde (kaslı, geniş)
    var torsoY = -26 * s + bob;
    px(-9 * s + lean, torsoY, 18 * s, 16 * s, pal.shirt);
    px(-9 * s + lean, torsoY, 18 * s, 4 * s, pal.shirt2);
    px(-9 * s + lean, torsoY + 12 * s, 18 * s, 4 * s, pal.accent);
    // baş
    var headY = -37 * s + bob;
    px(-5 * s + lean, headY, 10 * s, 11 * s, pal.skin);
    px(-6 * s + lean, headY - 2 * s, 12 * s, 4 * s, pal.hair);
    px(1 * s + lean, headY + 4 * s, 3 * s, 2 * s, '#101010'); // göz

    // kollar
    var armY = torsoY + 2 * s;
    var atkExtend = 0;
    if (st === 'attack') atkExtend = (e.stateT > 0.03 && e.stateT < 0.2) ? 14 * s : 6 * s;
    if (st === 'jumpkick') { // ön tekme
      px(6 * s, torsoY + 6 * s, 16 * s, 5 * s, pal.pants);
      px(20 * s, torsoY + 6 * s, 5 * s, 5 * s, pal.boot);
    }
    if (st === 'special') {
      px(-16 * s, armY - 4 * s, 10 * s, 6 * s, pal.skin);
      px(10 * s, armY - 4 * s, 10 * s, 6 * s, pal.skin);
    } else if (st === 'holding' || st === 'holdwalk' || st === 'grabbing') {
      px(4 * s, armY - 8 * s, 6 * s, 12 * s, pal.skin);   // yukarı kalkık kollar
      px(-10 * s, armY - 8 * s, 6 * s, 12 * s, pal.skin);
    } else {
      // arka kol
      px(-11 * s, armY, 5 * s, 11 * s, pal.skin);
      // ön kol (saldırıda uzar)
      px(6 * s, armY, 6 * s + atkExtend, 6 * s, pal.skin);
      if (atkExtend > 10) px(6 * s + atkExtend, armY - 1 * s, 5 * s, 8 * s, pal.shirt2); // yumruk
    }
    ctx.restore();

    // boss adı üstte (küçük)
    if (e.isBoss && e.state !== 'dead') { /* HUD barı ayrı */ }
  }

  function drawObject(o) {
    var sx = o.x - world.camX;
    var groundY = GROUND_TOP + o.depthY;
    var topY = groundY - o.z;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(sx, groundY + 1, o.w * 0.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    var t = o.otype;
    if (t === 'car') {
      px(sx - 33, topY - 20, 66, 20, o.color);
      px(sx - 22, topY - 30, 40, 12, '#7a2222');
      px(sx - 16, topY - 28, 12, 8, '#bfe0ff'); px(sx + 2, topY - 28, 12, 8, '#bfe0ff');
      px(sx - 26, topY - 6, 8, 8, '#111'); px(sx + 18, topY - 6, 8, 8, '#111');
    } else if (t === 'barrel') {
      px(sx - 9, topY - 26, 18, 26, o.color); px(sx - 9, topY - 22, 18, 3, '#7a3f18'); px(sx - 9, topY - 8, 18, 3, '#7a3f18');
    } else if (t === 'sign') {
      px(sx - 1, topY - 34, 3, 34, '#555'); px(sx - 5, topY - 34, 12, 9, o.color);
    } else if (t === 'girder') {
      px(sx - 20, topY - 10, 40, 10, o.color); px(sx - 20, topY - 8, 40, 2, '#5a5f66');
    } else if (t === 'tire') {
      ctx.fillStyle = o.color; ctx.beginPath(); ctx.arc(sx, topY - 9, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(sx, topY - 9, 4, 0, Math.PI * 2); ctx.fill();
    } else if (t === 'bottle') {
      px(sx - 3, topY - 12, 6, 12, o.color); px(sx - 1, topY - 15, 2, 4, o.color);
    } else {
      px(sx - 7, topY - 11, 14, 11, o.color);
    }
  }

  function drawItem(it) {
    var sx = it.x - world.camX; var y = GROUND_TOP + it.depthY - it.z;
    if (it.itype === 'food') {
      px(sx - 4, y - 8, 8, 6, '#c8823a'); px(sx - 5, y - 4, 3, 4, '#f0e8d0'); px(sx + 2, y - 4, 3, 4, '#f0e8d0');
    } else { px(sx - 4, y - 8, 8, 8, '#ffd84a'); }
  }

  function drawProj(pr) {
    var sx = pr.x - world.camX; var y = GROUND_TOP + pr.depthY - pr.z;
    px(sx - 3, y - 3, 6, 6, pr.ptype === 'bottle' ? '#7fd6a0' : '#c9b089');
  }

  function drawFx(f) {
    var sx = f.x - world.camX; var y = GROUND_TOP + f.depthY - f.z;
    var k = f.t / f.life;
    if (f.ftype === 'spark') {
      ctx.strokeStyle = 'rgba(255,240,160,' + (1 - k) + ')'; ctx.lineWidth = 2;
      for (var a = 0; a < 6; a++) { var an = a * 1.05; var r = 6 + k * 12; ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + Math.cos(an) * r, y + Math.sin(an) * r); ctx.stroke(); }
    } else if (f.ftype === 'ko') {
      ctx.fillStyle = 'rgba(255,90,60,' + (1 - k) + ')'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
      ctx.fillText('POW!', sx, y - k * 14);
    } else if (f.ftype === 'shock') {
      ctx.strokeStyle = 'rgba(180,120,255,' + (1 - k) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sx, GROUND_TOP + f.depthY, 20 + k * 60, 0, Math.PI * 2); ctx.stroke();
    } else if (f.ftype === 'debris') {
      ctx.fillStyle = 'rgba(150,130,100,' + (1 - k) + ')';
      for (var d = 0; d < 5; d++) { var dx = Math.cos(d) * k * 20; var dy = Math.sin(d * 2) * k * 14; px(sx + dx, y - dy, 3, 3, ctx.fillStyle); }
    }
  }

  function drawPopups() {
    ctx.textAlign = 'center';
    for (var i = 0; i < world.popups.length; i++) {
      var p = world.popups[i]; var sx = p.x - world.camX; var y = GROUND_TOP + p.depthY - p.t * 26;
      ctx.font = 'bold 10px monospace'; ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - p.t / 0.9); ctx.fillText(p.text, sx, y); ctx.globalAlpha = 1;
    }
  }

  function drawGoArrow() {
    var t = world.clock * 4; var x = VW - 40 + Math.sin(t) * 6;
    ctx.fillStyle = '#ffce4a'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
    ctx.fillText('GO ▶', x, 60);
  }

  // =====================================================================
  //  HUD (DOM)
  // =====================================================================
  function updateHud() {
    var d = G.dom;
    var p1 = world.players[0], p2 = world.players[1];
    if (p1 && d.hp1) { d.hp1.style.width = clamp(p1.hp / p1.hpMax * 100, 0, 100) + '%'; }
    if (d.lives1) d.lives1.textContent = p1 ? ('♥×' + Math.max(0, p1.lives)) : '';
    if (p2 && d.hp2) { d.hp2.style.width = clamp(p2.hp / p2.hpMax * 100, 0, 100) + '%'; d.hud2.style.visibility = 'visible'; }
    else if (d.hud2) d.hud2.style.visibility = 'hidden';
    if (d.lives2) d.lives2.textContent = p2 ? ('♥×' + Math.max(0, p2.lives)) : '';
    if (d.score) d.score.textContent = 'SKOR ' + (world.score[0] + world.score[1]);
    if (d.stagelabel) d.stagelabel.textContent = world.stageLabel || '';
    if (world.boss && world.boss.state !== 'dead') {
      d.bossHud.classList.remove('hidden');
      d.bossName.textContent = BOSS_DEF[world.boss.bossKey].name;
      d.bossHp.style.width = clamp(world.boss.hp / world.boss.hpMax * 100, 0, 100) + '%';
    } else { d.bossHud.classList.add('hidden'); }

    // devam sayacı
    if (d.continueMsg) {
      var msg = '';
      for (var i = 0; i < world.players.length; i++) {
        var p = world.players[i];
        if (p && p.outOfPlay && p.continueT > 0) msg += p.name + ': DEVAM için SALDIR (' + Math.ceil(p.continueT) + ') ';
      }
      d.continueMsg.textContent = msg;
    }
  }

  // =====================================================================
  //  NETCODE KÖPRÜSÜ
  // =====================================================================
  function buildSnapshot() {
    var ps = [];
    for (var i = 0; i < world.players.length; i++) {
      var p = world.players[i]; if (!p) { ps.push(null); continue; }
      ps.push({ x: r1(p.x), y: r1(p.depthY), z: r1(p.z), f: p.facing, s: p.state, hp: Math.round(p.hp), hpm: p.hpMax, lv: p.lives, oop: p.outOfPlay ? 1 : 0, ct: Math.ceil(p.continueT), iv: p.invulnT > 0 ? 1 : 0, sc: p.scale, pal: p.pal, nm: p.name });
    }
    var es = [], os = [], its = [], prs = [];
    for (var j = 0; j < world.ents.length; j++) {
      var e = world.ents[j];
      if (e.kind === 'enemy') es.push({ id: e.id, t: e.etype, b: e.isBoss ? 1 : 0, bk: e.bossKey, x: r1(e.x), y: r1(e.depthY), z: r1(e.z), f: e.facing, s: e.state, hp: Math.round(e.hp), hpm: e.hpMax, sc: e.scale, iv: 0, pal: e.pal });
      else if (e.kind === 'object') os.push({ id: e.id, t: e.otype, x: r1(e.x), y: r1(e.depthY), z: r1(e.z), h: e.held ? 1 : 0 });
      else if (e.kind === 'item') its.push({ id: e.id, t: e.itype, x: r1(e.x), y: r1(e.depthY), z: r1(e.z) });
      else if (e.kind === 'proj') prs.push({ id: e.id, t: e.ptype, x: r1(e.x), y: r1(e.depthY), z: r1(e.z) });
    }
    return {
      f: Math.round(world.clock * 60), cam: r1(world.camX), sc: [world.score[0], world.score[1]],
      lbl: world.stageLabel, go: world.goArrow, seg: world.segState, si: world.stageIndex,
      boss: world.boss && world.boss.state !== 'dead' ? { nm: BOSS_DEF[world.boss.bossKey].name, hp: Math.round(world.boss.hp), hpm: world.boss.hpMax } : null,
      p: ps, e: es, o: os, it: its, pr: prs,
      pop: world.popups.map(function (q) { return { x: r1(q.x), y: r1(q.depthY), tx: q.text, t: q.t, c: q.color }; })
    };
  }
  function r1(v) { return Math.round(v * 10) / 10; }

  function hostMaybeSend(nowMs) {
    if (G.mode !== 'host' || !G.net) return;
    if (nowMs - G.lastSnapAt < SNAP_MS) return;
    G.lastSnapAt = nowMs;
    G.net.sendSnap(buildSnapshot());
  }

  // ---- guest tarafı ----
  function guestOnSnap(snap) {
    snap._recv = performance.now();
    G.snapBuf.push(snap);
    while (G.snapBuf.length > 6) G.snapBuf.shift();
    if (!G.running && G.over === false && snap.p) { /* ilk snap gelince oyun görünür */ }
  }

  function guestTick(dt, nowMs) {
    // input gönder
    var p1inp = readMap(P1MAP, true);
    if (nowMs - G.lastInputAt > INPUT_MS) {
      G.lastInputAt = nowMs;
      if (G.net) G.net.sendInput(p1inp);
    }
    world.clock += dt;
    if (world.shake > 0) world.shake -= dt * 24;
    rebuildFromSnap(nowMs);
  }

  function rebuildFromSnap(nowMs) {
    if (G.snapBuf.length === 0) return;
    var renderTime = nowMs - RENDER_DELAY;
    var a = null, b = null;
    for (var i = G.snapBuf.length - 1; i >= 0; i--) {
      if (G.snapBuf[i]._recv <= renderTime) { a = G.snapBuf[i]; b = G.snapBuf[i + 1] || G.snapBuf[i]; break; }
    }
    if (!a) { a = G.snapBuf[0]; b = G.snapBuf[Math.min(1, G.snapBuf.length - 1)]; }
    var span = Math.max(1, b._recv - a._recv);
    var tt = clamp((renderTime - a._recv) / span, 0, 1);

    world.camX = lerp(a.cam, b.cam, tt);
    world.score = a.sc || [0, 0];
    world.stageIndex = a.si || 0;
    world.stageLabel = a.lbl || '';
    world.goArrow = a.go || 0;
    world.segState = a.seg || 'fight';

    // players
    world.players = [];
    for (var pi = 0; pi < (a.p ? a.p.length : 0); pi++) {
      var pa = a.p[pi]; if (!pa) { world.players.push(null); continue; }
      var pb = (b.p && b.p[pi]) ? b.p[pi] : pa;
      world.players.push({
        kind: 'hero', pal: pa.pal, name: pa.nm, index: pi,
        x: lerp(pa.x, pb.x, tt), depthY: lerp(pa.y, pb.y, tt), z: lerp(pa.z, pb.z, tt),
        facing: pa.f, state: pa.s, hp: pa.hp, hpMax: pa.hpm, lives: pa.lv,
        outOfPlay: !!pa.oop, continueT: pa.ct, invulnT: pa.iv ? 0.05 : 0, scale: pa.sc || 1,
        animT: world.clock, held: null
      });
    }
    // enemies (id eşleşmesiyle interpolasyon)
    var bMap = indexById(b.e);
    world.ents = [];
    for (var ei = 0; a.e && ei < a.e.length; ei++) {
      var ea = a.e[ei]; var eb = bMap[ea.id] || ea;
      world.ents.push({ kind: 'enemy', id: ea.id, etype: ea.t, isBoss: !!ea.b, bossKey: ea.bk, pal: ea.pal, scale: ea.sc || 1, facing: ea.f, state: ea.s, hp: ea.hp, hpMax: ea.hpm, invulnT: 0, animT: world.clock, x: lerp(ea.x, eb.x, tt), depthY: lerp(ea.y, eb.y, tt), z: lerp(ea.z, eb.z, tt) });
    }
    var oMap = indexById(b.o);
    for (var oi = 0; a.o && oi < a.o.length; oi++) {
      var oa = a.o[oi]; var ob = oMap[oa.id] || oa; var od = OBJECT_DEF[oa.t] || OBJECT_DEF.rock;
      world.ents.push({ kind: 'object', id: oa.id, otype: oa.t, color: od.color, w: od.w, h: od.h, held: !!oa.h, x: lerp(oa.x, ob.x, tt), depthY: lerp(oa.y, ob.y, tt), z: lerp(oa.z, ob.z, tt) });
    }
    for (var ii = 0; a.it && ii < a.it.length; ii++) { var ia = a.it[ii]; world.ents.push({ kind: 'item', id: ia.id, itype: ia.t, x: ia.x, depthY: ia.y, z: ia.z }); }
    for (var ri = 0; a.pr && ri < a.pr.length; ri++) { var ra = a.pr[ri]; world.ents.push({ kind: 'proj', id: ra.id, ptype: ra.t, x: ra.x, depthY: ra.y, z: ra.z }); }

    // boss
    if (a.boss) { world.boss = { state: 'alive', bossKey: findBossKey(a.boss.nm), hp: a.boss.hp, hpMax: a.boss.hpm }; }
    else world.boss = null;

    // popups
    world.popups = (a.pop || []).map(function (q) { return { x: q.x, depthY: q.y, text: q.tx, t: q.t, color: q.c }; });
  }
  function indexById(arr) { var m = {}; if (arr) for (var i = 0; i < arr.length; i++) m[arr[i].id] = arr[i]; return m; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function findBossKey(name) { for (var k in BOSS_DEF) if (BOSS_DEF[k].name === name) return k; return 'brute-boss'; }

  // =====================================================================
  //  OYUN AKIŞI / OVERLAY / LOBİ
  // =====================================================================
  var raf = 0, lastT = 0, acc = 0;

  function loop(now) {
    if (!lastT) lastT = now;
    var dt = clamp((now - lastT) / 1000, 0, 0.05); lastT = now;
    if (!G.paused && G.running) {
      if (G.mode === 'guest') {
        guestTick(dt, now);
      } else {
        acc += dt;
        var guard = 0;
        while (acc >= STEP && guard < 5) { simulate(STEP); acc -= STEP; guard++; }
        hostMaybeSend(now);
      }
    }
    render();
    updateHud();
    raf = requestAnimationFrame(loop);
  }

  function startLoop() { if (!raf) { lastT = 0; acc = 0; raf = requestAnimationFrame(loop); } }

  function showOverlay(which) {
    var d = G.dom;
    [d.ovLobby, d.ovPause, d.ovOver, d.ovStage].forEach(function (o) { if (o) o.classList.add('hidden'); });
    if (which === 'lobby' && d.ovLobby) d.ovLobby.classList.remove('hidden');
    if (which === 'pause' && d.ovPause) d.ovPause.classList.remove('hidden');
    if (which === 'over' && d.ovOver) d.ovOver.classList.remove('hidden');
    if (which === 'stageclear' && d.ovStage) d.ovStage.classList.remove('hidden');
  }
  function hideOverlays() { showOverlay('none'); }

  function beginGame(mode) {
    G.mode = mode;
    buildMaps(mode);
    world = freshWorld();
    G.over = false; G.scored = false;
    var name1 = 'E.Binal', name2 = 'De.Binal';
    if (mode === 'solo') {
      world.players = [makePlayer(0, 'RED', name1, 'ebinal')];
    } else if (mode === 'local') {
      world.players = [makePlayer(0, 'RED', name1, 'ebinal'), makePlayer(1, 'BLUE', name2, 'debinal')];
    } else if (mode === 'host') {
      world.players = [makePlayer(0, 'RED', name1, 'ebinal'), makePlayer(1, 'BLUE', name2, 'debinal')];
    } else if (mode === 'guest') {
      world.players = []; // snapshot'tan gelecek
    }
    audio.init();
    if (mode !== 'guest') startStage(0);
    G.running = true; G.paused = false;
    hideOverlays();
    if (G.dom.touch) G.dom.touch.classList.toggle('hidden', !isTouch());
    startLoop();
    if (mode === 'host') G.net.sendSys('start', {});
  }

  function finishGame(win) {
    if (G.over) return;
    G.over = true; G.running = false; audio.stopMusic();
    if (G.mode === 'host' && G.net) G.net.sendSys(win ? 'win' : 'gameover', {});
    var total = world.score[0] + world.score[1];
    var stageReached = world.stageIndex + 1;
    // skor kaydı (yalnız host/solo/local kendi oturumuyla; guest kendi tarafında kaydeder)
    saveRun(total, stageReached);
    var d = G.dom;
    if (d.overTitle) d.overTitle.textContent = win ? 'BIG VALLEY DÜŞTÜ!' : 'OYUN BİTTİ';
    if (d.overCopy) d.overCopy.textContent = (win ? 'Big Apple temizlendi. ' : '') + 'Toplam skor ' + total + ' · Bölüm ' + stageReached;
    showOverlay('over');
    renderLeaderboard();
  }

  function saveRun(total, stageReached) {
    if (G.scored) return; G.scored = true;
    try {
      if (G.saveScore) {
        G.saveScore({ game_key: GAME_KEY, score: total, duration_seconds: (window.ConviviumActivity && window.ConviviumActivity.getElapsedSeconds) ? window.ConviviumActivity.getElapsedSeconds() : Math.round(world.clock), best_streak: stageReached });
      }
    } catch (e) { /* sessiz */ }
  }

  var lbCache = null, lbAt = 0;
  function renderLeaderboard() {
    var box = G.dom.lb; if (!box) return; box.textContent = '';
    var myScore = world.score[0] + world.score[1];
    function draw(rows) {
      box.textContent = '';
      if (!rows || !rows.length) { var e = document.createElement('div'); e.textContent = 'Henüz skor yok.'; box.appendChild(e); return; }
      rows.forEach(function (r, i) {
        var row = document.createElement('div');
        var who = document.createElement('span'); who.textContent = (i + 1) + '. ' + String(r.initials || '???').toUpperCase().slice(0, 6);
        var val = document.createElement('strong'); val.textContent = String(r.score || 0);
        row.appendChild(who); row.appendChild(val); box.appendChild(row);
      });
    }
    if (lbCache && Date.now() - lbAt < 60000) { draw(lbCache); return; }
    if (!G.fetchLeaderboard) { draw(null); return; }
    G.fetchLeaderboard(8).then(function (rows) { if (rows) { lbCache = rows; lbAt = Date.now(); } draw(rows); }).catch(function () { draw(lbCache); });
  }

  function togglePause(forced) {
    if (!G.running || G.over) return;
    G.paused = (typeof forced === 'boolean') ? forced : !G.paused;
    showOverlay(G.paused ? 'pause' : 'none');
    if (G.mode === 'host' && G.net) G.net.sendSys(G.paused ? 'pause' : 'resume', {});
    if (G.paused) audio.stopMusic(); else if (G.running) audio.startMusic(world.stageIndex + 1);
  }

  function nextStage() {
    hideOverlays();
    startStage(world.stageIndex + 1);
    G.running = true;
  }

  function backToLobby() {
    G.running = false; G.over = false; audio.stopMusic();
    if (G.net) { G.net.leave(); }
    showOverlay('lobby');
    resetLobbyUI();
  }

  // =====================================================================
  //  DOKUNMATİK
  // =====================================================================
  function isTouch() { return ('ontouchstart' in window) || navigator.maxTouchPoints > 0; }

  function wireTouch() {
    var pad = G.dom.pad, nub = G.dom.nub;
    if (pad) {
      var padId = null, cx = 0, cy = 0;
      pad.addEventListener('touchstart', function (ev) { ev.preventDefault(); var t = ev.changedTouches[0]; padId = t.identifier; var r = pad.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; moveNub(t); }, { passive: false });
      pad.addEventListener('touchmove', function (ev) { ev.preventDefault(); for (var i = 0; i < ev.changedTouches.length; i++) { if (ev.changedTouches[i].identifier === padId) moveNub(ev.changedTouches[i]); } }, { passive: false });
      var end = function (ev) { for (var i = 0; i < ev.changedTouches.length; i++) { if (ev.changedTouches[i].identifier === padId) { padId = null; touch.ax = 0; touch.ay = 0; if (nub) { nub.style.left = '50%'; nub.style.top = '50%'; } } } };
      pad.addEventListener('touchend', end); pad.addEventListener('touchcancel', end);
      function moveNub(t) {
        var dx = t.clientX - cx, dy = t.clientY - cy; var mag = Math.max(1, Math.hypot(dx, dy)); var lim = Math.min(mag, 46);
        touch.ax = Math.abs(dx) > 10 ? clamp(dx / 40, -1, 1) : 0;
        touch.ay = Math.abs(dy) > 10 ? clamp(dy / 40, -1, 1) : 0;
        if (nub) { nub.style.left = (50 + (dx / mag * lim) / pad.offsetWidth * 100) + '%'; nub.style.top = (50 + (dy / mag * lim) / pad.offsetHeight * 100) + '%'; }
      }
    }
    (G.dom.abtns || []).forEach(function (btn) {
      var name = btn.getAttribute('data-btn');
      btn.addEventListener('touchstart', function (ev) { ev.preventDefault(); touch[name] = true; audio.init(); }, { passive: false });
      var off = function (ev) { ev.preventDefault(); touch[name] = false; };
      btn.addEventListener('touchend', off); btn.addEventListener('touchcancel', off);
    });
  }

  // =====================================================================
  //  NETCODE OLAY BAĞLAMA (guest sys olayları)
  // =====================================================================
  function onNetSys(msg) {
    if (!msg) return;
    var t = msg.type;
    if (G.mode === 'guest') {
      if (t === 'start') { if (!G.running) { G.running = true; G.over = false; hideOverlays(); startLoop(); } }
      else if (t === 'pause') { G.paused = true; showOverlay('pause'); }
      else if (t === 'resume') { G.paused = false; showOverlay('none'); }
      else if (t === 'gameover' || t === 'win') { G.running = false; G.over = true; var d = G.dom; if (d.overTitle) d.overTitle.textContent = t === 'win' ? 'BIG VALLEY DÜŞTÜ!' : 'OYUN BİTTİ'; if (d.overCopy) d.overCopy.textContent = 'Skor ' + (world.score[0] + world.score[1]); saveRun(world.score[0] + world.score[1], world.stageIndex + 1); showOverlay('over'); renderLeaderboard(); }
      else if (t === 'stageclear') { showOverlay('stageclear'); }
    }
    if (t === 'sync-request' && G.mode === 'host' && G.net && G.running && world && world.players.length) {
      G.net.sendSys('start', {});
      G.net.sendSnap(buildSnapshot());
    }
  }

  function onNetInput(payload) { if (G.mode === 'host') G.remoteInput = payload; }
  function onNetState(st) {
    var d = G.dom;
    if (!st) return;
    if (st.status === 'waiting') { setNetStatus('Oda kuruldu. Partner bekleniyor…', ''); }
    else if (st.status === 'joined') { setNetStatus('Odaya katıldın. Ev sahibi başlatınca oyun açılır…', 'ok'); }
    else if (st.status === 'ready') { setNetStatus('Partner hazır ✓', 'ok'); if (d.hostStartBtn && G.net && G.net.isHost()) d.hostStartBtn.disabled = false; if (d.netDot) d.netDot.classList.add('on'); }
    else if (st.status === 'opponent-left') { setNetStatus('Partner ayrıldı. Bekleniyor…', 'err'); if (d.netDot) d.netDot.classList.remove('on'); if (G.running && !G.over) togglePause(true); }
    else if (st.status === 'error') { setNetStatus(st.message || 'Bağlantı hatası.', 'err'); }
    else if (st.status === 'closed') { setNetStatus('Bağlantı kapandı.', ''); }
  }
  function onNetPresence(info) {
    if (info && info.opponentName && G.dom.netStatus) {
      setNetStatus((info.connected ? 'Bağlı: ' : 'Bekleniyor: ') + info.opponentName, info.connected ? 'ok' : '');
    }
  }
  function setNetStatus(text, cls) { var s = G.dom.netStatus; if (!s) return; s.textContent = text; s.className = 'cb-status' + (cls ? ' ' + cls : ''); }

  function makeNet() {
    if (!window.CrudeNet) return null;
    return window.CrudeNet.create({
      getClient: function () { return (window.ConviviumBackend && window.ConviviumBackend.getClient) ? window.ConviviumBackend.getClient() : null; },
      onSnap: guestOnSnap,
      onInput: onNetInput,
      onEvent: function () {},
      onSys: onNetSys,
      onState: onNetState,
      onPresence: onNetPresence
    });
  }

  // =====================================================================
  //  LOBİ UI
  // =====================================================================
  function resetLobbyUI() {
    var d = G.dom;
    if (d.onlineBox) d.onlineBox.classList.add('hidden');
    if (d.codeShow) d.codeShow.textContent = '-----';
    if (d.codeInput) d.codeInput.value = '';
    if (d.hostStartBtn) d.hostStartBtn.disabled = true;
    if (d.netDot) d.netDot.classList.remove('on');
    setNetStatus('', '');
  }

  function wireLobby() {
    var d = G.dom;
    if (d.modeSolo) d.modeSolo.addEventListener('click', function () { audio.init(); beginGame('solo'); });
    if (d.modeLocal) d.modeLocal.addEventListener('click', function () { audio.init(); beginGame('local'); });
    if (d.modeOnline) d.modeOnline.addEventListener('click', function () { audio.init(); if (d.onlineBox) d.onlineBox.classList.remove('hidden'); });

    if (d.hostBtn) d.hostBtn.addEventListener('click', function () {
      if (!window.ConviviumBackend || !window.ConviviumBackend.isConfigured()) { setNetStatus('Supabase yapılandırılmadı.', 'err'); return; }
      G.net = makeNet(); if (!G.net) { setNetStatus('Realtime kullanılamıyor.', 'err'); return; }
      var code = G.net.host(G.selfName, G.presetHostCode || null);
      G.presetHostCode = null;
      if (code) { if (d.codeShow) d.codeShow.textContent = code; G.mode = 'host'; setNetStatus('Oda kuruldu. Kodu partnerine ilet.', ''); }
    });
    if (d.joinBtn) d.joinBtn.addEventListener('click', function () {
      var code = (d.codeInput ? d.codeInput.value : '').trim().toUpperCase();
      if (code.length < 4) { setNetStatus('Geçerli bir kod gir.', 'err'); return; }
      if (!window.ConviviumBackend || !window.ConviviumBackend.isConfigured()) { setNetStatus('Supabase yapılandırılmadı.', 'err'); return; }
      G.net = makeNet(); if (!G.net) { setNetStatus('Realtime kullanılamıyor.', 'err'); return; }
      G.net.join(code, G.selfName);
      G.mode = 'guest';
      // guest world hazırla, snap bekle
      buildMaps('guest'); world = freshWorld(); world.players = [];
      G.running = false; G.over = false;
      startLoop();
    });
    if (d.hostStartBtn) d.hostStartBtn.addEventListener('click', function () { beginGame('host'); });

    if (d.resumeBtn) d.resumeBtn.addEventListener('click', function () { togglePause(false); });
    if (d.pauseLobbyBtn) d.pauseLobbyBtn.addEventListener('click', backToLobby);
    if (d.againBtn) d.againBtn.addEventListener('click', function () { if (G.mode === 'guest') return; hideOverlays(); beginGame(G.mode === 'host' ? 'host' : G.mode); });
    if (d.overLobbyBtn) d.overLobbyBtn.addEventListener('click', backToLobby);
    if (d.stageNextBtn) d.stageNextBtn.addEventListener('click', function () { if (G.mode === 'guest') return; nextStage(); if (G.mode === 'host' && G.net) G.net.sendSys('start', {}); });

    // Chat guvertesi davetleri: ?coop-host=KOD odayi otomatik kurar,
    // ?coop-join=KOD odaya otomatik katilir.
    try {
      var inviteParams = new URLSearchParams(location.search);
      var inviteHost = (inviteParams.get('coop-host') || '').trim();
      var inviteJoin = (inviteParams.get('coop-join') || '').trim();
      if (inviteHost && d.hostBtn) {
        if (d.onlineBox) d.onlineBox.classList.remove('hidden');
        G.presetHostCode = inviteHost;
        d.hostBtn.click();
      } else if (inviteJoin && d.joinBtn) {
        if (d.onlineBox) d.onlineBox.classList.remove('hidden');
        if (d.codeInput) d.codeInput.value = inviteJoin;
        d.joinBtn.click();
      }
    } catch (e) { /* davet parametresi bozuksa lobide kal */ }

    if (d.pauseBtn) d.pauseBtn.addEventListener('click', function () { togglePause(); });
    if (d.muteBtn) d.muteBtn.addEventListener('click', function () {
      audio.enabled = !audio.enabled;
      d.muteBtn.textContent = audio.enabled ? '🔊' : '🔇';
      if (!audio.enabled) audio.stopMusic(); else if (G.running && !G.paused) audio.startMusic(world.stageIndex + 1);
    });
  }

  // =====================================================================
  //  BOOT
  // =====================================================================
  function q(id) { return document.getElementById(id); }

  function boot(opts) {
    opts = opts || {};
    G.selfName = opts.selfName || 'Oyuncu';
    G.saveScore = opts.saveScore || null;
    G.fetchLeaderboard = opts.fetchLeaderboard || null;

    canvas = q('cb-canvas');
    if (canvas) { canvas.width = VW; canvas.height = VH; ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false; }

    G.dom = {
      canvas: canvas,
      hp1: q('cb-hp1'), hp2: q('cb-hp2'), hud2: q('cb-hud2'),
      lives1: q('cb-lives1'), lives2: q('cb-lives2'),
      score: q('cb-score'), stagelabel: q('cb-stagelabel'),
      bossHud: q('cb-boss-hud'), bossName: q('cb-boss-name'), bossHp: q('cb-boss-hp'),
      continueMsg: q('cb-continue'),
      ovLobby: q('cb-ov-lobby'), ovPause: q('cb-ov-pause'), ovOver: q('cb-ov-over'), ovStage: q('cb-ov-stage'),
      modeSolo: q('cb-mode-solo'), modeLocal: q('cb-mode-local'), modeOnline: q('cb-mode-online'),
      onlineBox: q('cb-online-box'), hostBtn: q('cb-host-btn'), joinBtn: q('cb-join-btn'),
      codeShow: q('cb-code-show'), codeInput: q('cb-code-input'), hostStartBtn: q('cb-host-start'),
      netStatus: q('cb-net-status'), netDot: q('cb-net-dot'),
      resumeBtn: q('cb-resume'), pauseLobbyBtn: q('cb-pause-lobby'),
      overTitle: q('cb-over-title'), overCopy: q('cb-over-copy'), lb: q('cb-lb'),
      againBtn: q('cb-again'), overLobbyBtn: q('cb-over-lobby'), stageNextBtn: q('cb-stage-next'),
      pauseBtn: q('cb-pause-btn'), muteBtn: q('cb-mute-btn'),
      touch: q('cb-touch'), pad: q('cb-pad'), nub: q('cb-nub'),
      abtns: Array.prototype.slice.call(document.querySelectorAll('.cb-abtn'))
    };

    // klavye
    window.addEventListener('keydown', function (e) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
      keyDown[e.code] = true;
      if (e.code === 'KeyP' || e.code === 'Escape') { if (G.running && G.mode !== 'guest') togglePause(); }
    });
    window.addEventListener('keyup', function (e) { keyDown[e.code] = false; });
    window.addEventListener('blur', function () { keyDown = {}; });

    wireLobby();
    wireTouch();
    resetLobbyUI();
    showOverlay('lobby');

    // arka planı ilk kez çiz (world yok)
    world = freshWorld(); world.players = [];
    startLoop();

    // partner ayrılırsa host duraklat için pagehide
    window.addEventListener('pagehide', function () { if (G.mode === 'host' && G.net) G.net.sendSys('pause', {}); });
  }

  return { boot: boot };
})();
