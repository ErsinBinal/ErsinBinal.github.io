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
    v3: 'convivium.bugy.v3.skin'
  };

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
    }
  ];

  const SKIN_LABELS = {
    classic: 'Klasik',
    matrix: 'Matrix',
    ember: 'Ember',
    ghost: 'Ghost',
    royal: 'Royal'
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
    clearLogBtn: $('clearLogBtn')
  };

  const getDeb = () => window.DebCompanion || window.NovaCompanion;
  const readLS = (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  const writeLS = (key, value) => {
    try { localStorage.setItem(key, value); } catch { /* best effort */ }
  };

  // Hangi motor su an aktif? v3 > v2 > v1 oncelik sirasi.
  function resolveActive() {
    const v3 = window.BugyV3;
    if (v3 && v3.getState && v3.getState().active) return { key: 'v3', api: v3 };
    const v2 = window.BugyV2;
    if (v2 && v2.getState && v2.getState().active) return { key: 'v2', api: v2 };
    return { key: 'v1', api: window.Bugy || null };
  }

  function engineState(key) {
    const def = ENGINES.find((e) => e.key === key);
    const api = def && def.api();
    if (!api || !api.getState) return null;
    try { return api.getState(); } catch { return null; }
  }

  // ---- Motor degistirme (home-protocol mantigi ile birebir) ----
  function setEngine(key) {
    writeLS(ENGINE_KEY, key);
    if (key === 'v3') {
      window.BugyV2 && window.BugyV2.deactivate && window.BugyV2.deactivate();
      window.BugyV3 && window.BugyV3.activate && window.BugyV3.activate();
    } else if (key === 'v2') {
      window.BugyV3 && window.BugyV3.deactivate && window.BugyV3.deactivate();
      window.BugyV2 && window.BugyV2.activate && window.BugyV2.activate();
    } else {
      window.BugyV3 && window.BugyV3.deactivate && window.BugyV3.deactivate();
      window.BugyV2 && window.BugyV2.deactivate && window.BugyV2.deactivate();
      window.Bugy && window.Bugy.summon && window.Bugy.summon();
    }
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
    row(dl, 'Motor', key);
    row(dl, 'Hal', st.state);
    row(dl, 'Skin', st.skinLabel ? `${st.skin} (${st.skinLabel})` : st.skin);
    row(dl, 'Rastgele', st.randomEnabled ? 'acik' : 'kapali');
    row(dl, 'Konum', `x:${st.x ?? '?'}  y:${st.y ?? '?'}`);
    if (st.mode) row(dl, 'Mod', st.mode);
    if (st.assetSource) row(dl, 'Varlik', st.assetSource);
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
    if (!api || !api.setSkin) { log(`skin uygulanamadi: ${key} motoru hazir degil`); return; }
    api.setSkin(skin);
    if (SKIN_KEYS[key]) writeLS(SKIN_KEYS[key], skin);
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
    if (!api || !api.trigger) { log(`aksiyon basarisiz: ${key} hazir degil`); return; }
    if (api.summon) api.summon();
    const ok = api.trigger(action);
    log(`${key} aksiyon "${action}" -> ${ok ? 'ok' : 'reddedildi'}`);
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

    // Motorlarin yayinladigi durum olaylari
    ['bugy:state', 'bugy-v2:state', 'bugy-v3:state', 'deb:state', 'nova:state'].forEach((evt) => {
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
