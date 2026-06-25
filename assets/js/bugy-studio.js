/**
 * Convivium - Bugy Studio
 * v1 (klasik) / v2 (arcade) / v3 (native) bugy motorlarini ve DEB yoldasini
 * tek bir gelismis kontrol merkezinden yonetir. Motor API'leri:
 *   window.Bugy      -> v1 (neon-sheep.js, taban katman, her zaman acik)
 *   window.BugyV2    -> v2 (bugy-v2.js, ConviviumArcadeKit gerektirir)
 *   window.BugyV3    -> v3 (bugy-v3-loader.js)
 *   window.DebCompanion / window.NovaCompanion -> DEB yoldasi
 */
(function () {
  'use strict';

  const ENGINE_KEY = 'convivium.bugy.engine';
  const SKIN_KEYS = {
    v1: 'convivium.bugy.skin',
    v2: 'convivium.bugy.v2.skin',
    v3: 'convivium.bugy.v3.skin',
    v4: 'convivium.bugy.v4.skin'
  };

  // v1'i sondurmek icin v1 disindaki tum kaplama (overlay) motorlari.
  const OVERLAYS = ['v2', 'v3', 'v4'];

  const ENGINES = [
    {
      key: 'v1',
      name: 'Bugy Classic',
      tag: 'v1 / neon-sheep',
      note: 'Taban katman. DOM tabanli neon kuzu; her zaman hazir.',
      api: () => window.Bugy
    },
    {
      key: 'v2',
      name: 'Bugy Arcade',
      tag: 'v2 / arcade-kit',
      note: 'ConviviumArcadeKit sahnesi. Retro paletli mascot.',
      api: () => window.BugyV2
    },
    {
      key: 'v3',
      name: 'Bugy Native',
      tag: 'v3 / canvas core',
      note: 'Kenney atlas + canvas cekirdek. En gelismis efektler.',
      api: () => window.BugyV3
    },
    {
      key: 'v4',
      name: 'Bugy Yaratiklar',
      tag: 'v4 / retro creatures',
      note: 'Bitik, Voltik, Glupi, Korcuk, Filizo, Buzcuk, Pufmis. Evrim geciren synthwave yaratiklar.',
      api: () => window.BugyV4
    }
  ];

  const SKIN_LABELS = {
    classic: 'Klasik',
    matrix: 'Matrix',
    ember: 'Ember',
    ghost: 'Ghost',
    royal: 'Royal',
    // v4 retro yaratiklari
    spark: 'Bitik',
    volt: 'Voltik',
    aqua: 'Glupi',
    ember: 'Korcuk',
    leaf: 'Filizo',
    frost: 'Buzcuk',
    luna: 'Pufmis'
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    globalStatus: $('globalStatus'),
    engineGrid: $('engineGrid'),
    telemetryGrid: $('telemetryGrid'),
    telemetryEngine: $('telemetryEngine'),
    skinGrid: $('skinGrid'),
    skinCurrent: $('skinCurrent'),
    actionGrid: $('actionGrid'),
    randomToggle: $('randomToggle'),
    summonBtn: $('summonBtn'),
    nextBtn: $('nextBtn'),
    resetEngineBtn: $('resetEngineBtn'),
    debStatus: $('debStatus'),
    debActivate: $('debActivate'),
    debDetail: $('debDetail'),
    debDeactivate: $('debDeactivate'),
    debActionGrid: $('debActionGrid'),
    storageGrid: $('storageGrid'),
    copyStateBtn: $('copyStateBtn'),
    resetPrefsBtn: $('resetPrefsBtn'),
    eventLog: $('eventLog'),
    clearLogBtn: $('clearLogBtn'),
    soundToggle: $('soundToggle'),
    chaosToggle: $('chaosToggle'),
    statActions: $('statActions'),
    statUptime: $('statUptime'),
    statHeartbeat: $('statHeartbeat'),
    radar: $('radar')
  };

  const getDeb = () => window.DebCompanion || window.NovaCompanion;

  // ---- SFX yardimcisi (sfx.js varsa) ----
  const sfx = (name) => {
    const engine = window.ConviviumSFX;
    if (engine && engine.play) { try { engine.play(name); } catch { /* ignore */ } }
  };

  // ---- Oturum istatistikleri ----
  const session = { actions: 0, startedAt: Date.now() };
  const prevTelemetry = {};
  const readLS = (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  const writeLS = (key, value) => {
    try { localStorage.setItem(key, value); } catch { /* best effort */ }
  };

  // Hangi motor su an aktif? v4 > v3 > v2 > v1 oncelik sirasi.
  function resolveActive() {
    const v4 = window.BugyV4;
    if (v4 && v4.getState && v4.getState().active) return { key: 'v4', api: v4 };
    const v3 = window.BugyV3;
    if (v3 && v3.getState && v3.getState().active) return { key: 'v3', api: v3 };
    const v2 = window.BugyV2;
    if (v2 && v2.getState && v2.getState().active) return { key: 'v2', api: v2 };
    return { key: 'v1', api: window.Bugy || null };
  }

  const overlayApi = (key) => {
    if (key === 'v2') return window.BugyV2;
    if (key === 'v3') return window.BugyV3;
    if (key === 'v4') return window.BugyV4;
    return null;
  };

  function engineState(key) {
    const def = ENGINES.find((e) => e.key === key);
    const api = def && def.api();
    if (!api || !api.getState) return null;
    try { return api.getState(); } catch { return null; }
  }

  // ---- Motor degistirme (tum kaplama motorlari karsilikli dislar) ----
  function setEngine(key) {
    writeLS(ENGINE_KEY, key);
    // Hedef disindaki tum overlay motorlarini kapat.
    OVERLAYS.filter((k) => k !== key).forEach((k) => {
      const api = overlayApi(k);
      if (api && api.deactivate) api.deactivate();
    });
    if (key === 'v1') {
      window.Bugy && window.Bugy.summon && window.Bugy.summon();
    } else {
      const api = overlayApi(key);
      if (api && api.activate) api.activate();
    }
    sfx('system.boot');
    log(`motor -> ${key}`);
    refresh();
  }

  // ---- Render: motor kartlari ----
  function renderEngines() {
    const active = resolveActive().key;
    els.engineGrid.innerHTML = '';
    ENGINES.forEach((def) => {
      const api = def.api();
      const loaded = Boolean(api);
      const isActive = def.key === active;
      const card = document.createElement('article');
      card.className = 'engine-card' + (isActive ? ' is-active' : '') + (loaded ? '' : ' is-offline');

      const head = document.createElement('div');
      head.className = 'engine-card-head';
      const name = document.createElement('strong');
      name.textContent = def.name;
      const ver = document.createElement('span');
      ver.className = 'engine-ver';
      const st = loaded && api.getState ? api.getState() : null;
      ver.textContent = st && st.version ? `v${st.version}` : def.tag;
      head.append(name, ver);

      const note = document.createElement('p');
      note.className = 'engine-note';
      note.textContent = def.note;

      const status = document.createElement('span');
      status.className = 'engine-flag';
      status.textContent = !loaded ? 'YUKLENMEDI' : isActive ? 'AKTIF' : 'BEKLEMEDE';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn' + (isActive ? '' : ' btn-primary');
      btn.textContent = isActive ? 'Aktif' : 'Etkinlestir';
      btn.disabled = !loaded || isActive;
      btn.addEventListener('click', () => setEngine(def.key));

      card.append(head, note, status, btn);
      els.engineGrid.appendChild(card);
    });
  }

  // ---- Render: telemetri ----
  function row(dl, label, value) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value == null || value === '' ? '—' : String(value);
    dl.append(dt, dd);
  }

  // Degeri degisen telemetri satirini kisa sure parlatir.
  function flashRow(dl, label, value) {
    const text = value == null || value === '' ? '—' : String(value);
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = text;
    if (prevTelemetry[label] !== undefined && prevTelemetry[label] !== text) {
      dd.classList.add('flash');
    }
    prevTelemetry[label] = text;
    dl.append(dt, dd);
  }

  function renderTelemetry() {
    const { key } = resolveActive();
    const st = engineState(key) || (key === 'v1' && window.Bugy ? window.Bugy.getState() : null);
    els.telemetryEngine.textContent = key;
    const dl = els.telemetryGrid;
    dl.innerHTML = '';
    if (!st) {
      row(dl, 'Durum', 'motor okunamadi');
      return;
    }
    flashRow(dl, 'Motor', key);
    flashRow(dl, 'Hal', st.state);
    flashRow(dl, 'Skin', st.skinLabel ? `${st.skin} (${st.skinLabel})` : st.skin);
    flashRow(dl, 'Rastgele', st.randomEnabled ? 'acik' : 'kapali');
    flashRow(dl, 'Konum', `x:${st.x ?? '?'}  y:${st.y ?? '?'}`);
    if (st.mode) flashRow(dl, 'Mod', st.mode);
    if (st.assetSource) flashRow(dl, 'Varlik', st.assetSource);
    updateStats();
  }

  // ---- Oturum istatistikleri + nabiz ----
  function updateStats() {
    if (els.statActions) els.statActions.textContent = String(session.actions);
    if (els.statUptime) {
      const s = Math.floor((Date.now() - session.startedAt) / 1000);
      const m = Math.floor(s / 60);
      els.statUptime.textContent = `${m}:${String(s % 60).padStart(2, '0')}`;
    }
  }

  // ---- Render: skin lab ----
  function renderSkins() {
    const { key, api } = resolveActive();
    const st = engineState(key);
    const skins = (st && st.skins) || (api && api.skins) || ['classic', 'matrix', 'ember', 'ghost', 'royal'];
    const current = st && st.skin ? st.skin : 'classic';
    els.skinCurrent.textContent = st && st.skinLabel ? `${current} · ${st.skinLabel}` : current;
    els.skinGrid.innerHTML = '';
    skins.forEach((skin) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip' + (skin === current ? ' is-on' : '');
      btn.textContent = SKIN_LABELS[skin] || skin;
      btn.dataset.skin = skin;
      btn.addEventListener('click', () => applySkin(skin));
      els.skinGrid.appendChild(btn);
    });
  }

  function applySkin(skin) {
    const { key, api } = resolveActive();
    if (!api || !api.setSkin) { log(`skin uygulanamadi: ${key} motoru hazir degil`); sfx('ui.error'); return; }
    api.setSkin(skin);
    if (SKIN_KEYS[key]) writeLS(SKIN_KEYS[key], skin);
    sfx('ui.select');
    log(`${key} skin -> ${skin}`);
    refresh();
  }

  // ---- Render: aksiyon konsolu ----
  function renderActions() {
    const { key, api } = resolveActive();
    const st = engineState(key);
    const actions = (st && st.actions) || (api && api.actions) ||
      ['storm', 'tornado', 'portal', 'clone', 'gravity', 'abduct'];
    els.actionGrid.innerHTML = '';
    actions.forEach((action) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip chip-action';
      btn.textContent = action;
      btn.addEventListener('click', () => runAction(action));
      els.actionGrid.appendChild(btn);
    });
    if (els.randomToggle) els.randomToggle.checked = Boolean(st && st.randomEnabled);
  }

  function runAction(action) {
    const { key, api } = resolveActive();
    if (!api || !api.trigger) { log(`aksiyon basarisiz: ${key} hazir degil`); sfx('ui.error'); return; }
    if (api.summon) api.summon();
    const ok = api.trigger(action);
    if (ok) { session.actions += 1; sfx('ui.confirm'); } else { sfx('ui.error'); }
    log(`${key} aksiyon "${action}" -> ${ok ? 'ok' : 'reddedildi'}`);
    pulseRadar();
    window.setTimeout(refresh, 700);
  }

  // ---- DEB yoldasi ----
  function renderDeb() {
    const deb = getDeb();
    const st = deb && deb.getState ? deb.getState() : null;
    const online = Boolean(st && st.active);
    els.debStatus.textContent = !deb ? 'yuklenmedi' : online ? `cevrimici · ${st.state}` : 'cevrimdisi';
    els.debStatus.className = 'badge' + (online ? '' : ' badge-dim');
    els.debActivate.disabled = !deb || online;
    els.debDeactivate.disabled = !deb || !online;
    els.debDetail.disabled = !deb;

    const actions = (st && st.actions) || (deb && deb.actions) ||
      ['scan', 'rift', 'bloom', 'mirror', 'perch', 'sleep', 'meteor', 'blackhole', 'deathstar'];
    els.debActionGrid.innerHTML = '';
    actions.forEach((action) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip chip-action';
      btn.textContent = action;
      btn.disabled = !deb;
      btn.addEventListener('click', () => {
        const d = getDeb();
        if (!d || !d.trigger) return;
        d.trigger(action);
        session.actions += 1;
        sfx('ui.transmit');
        log(`deb aksiyon "${action}"`);
        window.setTimeout(refresh, 700);
      });
      els.debActionGrid.appendChild(btn);
    });
  }

  // ---- Kalicilik / tercihler ----
  function renderStorage() {
    const dl = els.storageGrid;
    dl.innerHTML = '';
    row(dl, ENGINE_KEY, readLS(ENGINE_KEY) || 'v1 (varsayilan)');
    row(dl, SKIN_KEYS.v2, readLS(SKIN_KEYS.v2));
    row(dl, SKIN_KEYS.v3, readLS(SKIN_KEYS.v3));
  }

  function snapshot() {
    return {
      engine: readLS(ENGINE_KEY) || 'v1',
      active: resolveActive().key,
      v1: engineState('v1'),
      v2: engineState('v2'),
      v3: engineState('v3'),
      deb: getDeb() && getDeb().getState ? getDeb().getState() : null,
      capturedAt: new Date().toISOString()
    };
  }

  // ---- Olay gunlugu ----
  function log(message) {
    if (!els.eventLog) return;
    const li = document.createElement('li');
    const time = document.createElement('time');
    time.textContent = new Date().toLocaleTimeString('tr-TR', { hour12: false });
    const text = document.createElement('span');
    text.textContent = message;
    li.append(time, text);
    els.eventLog.prepend(li);
    while (els.eventLog.children.length > 60) els.eventLog.lastChild.remove();
  }

  // ---- Konum radari ----
  const radar = { ctx: null, w: 320, h: 200, trail: [], debTrail: [], pulses: [], raf: 0 };

  function initRadar() {
    if (!els.radar || !els.radar.getContext) return;
    radar.ctx = els.radar.getContext('2d');
    radar.w = els.radar.width;
    radar.h = els.radar.height;
    drawRadar();
  }

  function pulseRadar() {
    if (!radar.ctx) return;
    const st = engineState(resolveActive().key);
    if (!st) return;
    radar.pulses.push({ x: norm(st.x, window.innerWidth), y: norm(st.y, window.innerHeight), r: 0 });
  }

  const norm = (v, span) => Math.max(0, Math.min(1, (Number(v) || 0) / Math.max(1, span)));

  function drawRadar() {
    const ctx = radar.ctx;
    if (!ctx) return;
    const { w, h } = radar;
    ctx.clearRect(0, 0, w, h);

    // izgara
    ctx.strokeStyle = 'rgba(0, 119, 0, 0.25)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= w; gx += w / 8) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    }
    for (let gy = 0; gy <= h; gy += h / 5) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    }

    const plotTrail = (trail, color) => {
      for (let i = 0; i < trail.length; i += 1) {
        const p = trail[i];
        const alpha = (i + 1) / trail.length;
        ctx.fillStyle = color.replace('ALPHA', (alpha * 0.6).toFixed(2));
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 1.5 + alpha * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    plotTrail(radar.trail, 'rgba(0, 243, 255, ALPHA)');
    plotTrail(radar.debTrail, 'rgba(255, 0, 150, ALPHA)');

    // aktif nokta
    const head = radar.trail[radar.trail.length - 1];
    if (head) {
      ctx.fillStyle = 'rgba(0, 255, 0, 0.95)';
      ctx.beginPath();
      ctx.arc(head.x * w, head.y * h, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(head.x * w, head.y * h, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // patlama halkalari
    radar.pulses = radar.pulses.filter((pulse) => {
      pulse.r += 2.4;
      const a = Math.max(0, 1 - pulse.r / 46);
      if (a <= 0) return false;
      ctx.strokeStyle = `rgba(0, 255, 0, ${a.toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pulse.x * w, pulse.y * h, pulse.r, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    });
  }

  function radarLoop() {
    if (!radar.ctx) return;
    const st = engineState(resolveActive().key);
    if (st && st.x != null) {
      radar.trail.push({ x: norm(st.x, window.innerWidth), y: norm(st.y, window.innerHeight) });
      while (radar.trail.length > 48) radar.trail.shift();
    }
    const deb = getDeb();
    const ds = deb && deb.getState ? deb.getState() : null;
    if (ds && ds.active && ds.x != null) {
      radar.debTrail.push({ x: norm(ds.x, window.innerWidth), y: norm(ds.y, window.innerHeight) });
      while (radar.debTrail.length > 48) radar.debTrail.shift();
    } else if (radar.debTrail.length) {
      radar.debTrail.shift();
    }
    drawRadar();
    radar.raf = window.requestAnimationFrame(radarLoop);
  }

  // ---- Kaos modu (oto-demo) ----
  let chaosTimer = 0;
  function setChaos(on) {
    window.clearInterval(chaosTimer);
    document.body.classList.toggle('chaos-on', on);
    if (!on) { log('kaos modu kapandi'); return; }
    log('kaos modu basladi');
    sfx('system.unlock');
    chaosTimer = window.setInterval(() => {
      const { key, api } = resolveActive();
      const st = engineState(key);
      const actions = (st && st.actions) || (api && api.actions) || [];
      if (actions.length) runAction(actions[Math.floor(Math.random() * actions.length)]);
    }, 2600);
  }

  // ---- Klavye kisayollari ----
  function handleKey(event) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    switch (event.key.toLowerCase()) {
      case '1': setEngine('v1'); break;
      case '2': setEngine('v2'); break;
      case '3': setEngine('v3'); break;
      case '4': setEngine('v4'); break;
      case 's': { const a = resolveActive(); a.api && a.api.summon && a.api.summon(); sfx('ui.click'); refresh(); break; }
      case 'n': { const a = resolveActive(); a.api && a.api.next && a.api.next(); session.actions += 1; window.setTimeout(refresh, 600); break; }
      case 'r': els.randomToggle.checked = !els.randomToggle.checked; els.randomToggle.dispatchEvent(new Event('change')); break;
      case 'c': els.chaosToggle.checked = !els.chaosToggle.checked; setChaos(els.chaosToggle.checked); break;
      case 'b': { const d = getDeb(); if (d) { const on = d.getState && d.getState().active; on ? d.deactivate() : d.activate(); window.setTimeout(refresh, 300); } break; }
      default: return;
    }
  }

  // ---- Ses ac/kapat ----
  function syncSoundToggle() {
    const engine = window.ConviviumSFX;
    const on = Boolean(engine && engine.enabled);
    els.soundToggle.textContent = `Ses: ${on ? 'acik' : 'kapali'}`;
    els.soundToggle.setAttribute('aria-pressed', String(on));
    els.soundToggle.classList.toggle('is-on', on);
  }

  // ---- Toplu yenileme ----
  function refresh() {
    renderEngines();
    renderTelemetry();
    renderSkins();
    renderActions();
    renderDeb();
    renderStorage();
    const loaded = ENGINES.filter((e) => e.api()).map((e) => e.key);
    els.globalStatus.textContent = loaded.length
      ? `Yuklu motorlar: ${loaded.join(', ')} · aktif: ${resolveActive().key}`
      : 'Motor bulunamadi.';
  }

  // ---- Olay baglantilari ----
  function wire() {
    els.randomToggle.addEventListener('change', () => {
      const { key, api } = resolveActive();
      if (api && api.setRandom) {
        api.setRandom(els.randomToggle.checked);
        log(`${key} rastgele -> ${els.randomToggle.checked ? 'acik' : 'kapali'}`);
      }
      refresh();
    });
    els.summonBtn.addEventListener('click', () => {
      const { key, api } = resolveActive();
      if (api && api.summon) api.summon();
      log(`${key} cagrildi`);
      refresh();
    });
    els.nextBtn.addEventListener('click', () => {
      const { key, api } = resolveActive();
      if (api && api.next) api.next();
      log(`${key} siradaki aksiyon`);
      window.setTimeout(refresh, 700);
    });
    els.resetEngineBtn.addEventListener('click', () => setEngine('v1'));

    els.debActivate.addEventListener('click', () => {
      const d = getDeb();
      if (d && d.activate) { d.activate(); log('deb etkinlestirildi'); }
      window.setTimeout(refresh, 300);
    });
    els.debDeactivate.addEventListener('click', () => {
      const d = getDeb();
      if (d && d.deactivate) { d.deactivate(); log('deb kapatildi'); }
      window.setTimeout(refresh, 300);
    });
    els.debDetail.addEventListener('click', () => {
      const d = getDeb();
      if (d && d.toggleDetail) { d.toggleDetail(); log('deb detay panel'); }
      window.setTimeout(refresh, 200);
    });

    els.copyStateBtn.addEventListener('click', async () => {
      const json = JSON.stringify(snapshot(), null, 2);
      try {
        await navigator.clipboard.writeText(json);
        log('durum panoya kopyalandi');
      } catch {
        log('pano erisimi yok — konsola yazildi');
        // eslint-disable-next-line no-console
        console.log(json);
      }
    });
    els.resetPrefsBtn.addEventListener('click', () => {
      if (!window.confirm('Bugy tercihleri (motor + skin) sifirlansin mi?')) return;
      [ENGINE_KEY, SKIN_KEYS.v1, SKIN_KEYS.v2, SKIN_KEYS.v3].forEach((k) => {
        try { localStorage.removeItem(k); } catch { /* ignore */ }
      });
      setEngine('v1');
      log('tercihler sifirlandi');
    });
    els.clearLogBtn.addEventListener('click', () => { els.eventLog.innerHTML = ''; });

    els.soundToggle.addEventListener('click', () => {
      const engine = window.ConviviumSFX;
      if (engine && engine.setEnabled) engine.setEnabled(!engine.enabled, true);
      syncSoundToggle();
      log(`ses -> ${window.ConviviumSFX && window.ConviviumSFX.enabled ? 'acik' : 'kapali'}`);
    });
    els.chaosToggle.addEventListener('change', () => setChaos(els.chaosToggle.checked));
    window.addEventListener('keydown', handleKey);

    // Motorlarin yayinladigi durum olaylari
    ['bugy:state', 'bugy-v2:state', 'bugy-v3:state', 'bugy-v4:state', 'deb:state', 'nova:state'].forEach((evt) => {
      window.addEventListener(evt, () => {
        renderTelemetry();
        renderDeb();
      });
    });
  }

  // Motorlar defer ile yuklendigi icin DOMContentLoaded sonrasi boot ediyoruz;
  // bir kac kez tekrar deneyerek gec gelen motorlari da yakaliyoruz.
  function boot() {
    wire();
    initRadar();
    syncSoundToggle();
    radarLoop();
    refresh();
    let tries = 0;
    const poll = window.setInterval(() => {
      tries += 1;
      refresh();
      if (tries >= 12) window.clearInterval(poll);
    }, 400);
    // Saved engine'i bir kez uygula (motorlar kendileri de localStorage'i okur,
    // ama v1'e donmus durumda telemetriyi hizalamak icin tetikliyoruz).
    window.setTimeout(refresh, 1500);
    window.setInterval(refresh, 2500);
    window.setInterval(updateStats, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
