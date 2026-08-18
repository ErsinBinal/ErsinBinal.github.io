/**
 * Demir At Terazisi - arayuz
 *
 * Karar mantigi moto-metrics.js icinde; bu dosya yalnizca durum + DOM.
 * Durum URL hash'inde tutulur (#a=..&b=..&m=..): baglanti paylasilabilir,
 * geri/ileri tuslari calisir, sunucu gerekmez.
 */
(() => {
  const moto = window.ConviviumMoto;
  if (!moto || !moto.metrics) return;

  const { GARAGE, CLASSES, metrics, frameUrl, DATA_VERSION } = moto;
  const CLASS_LABEL = new Map(CLASSES.map((klass) => [klass.key, klass.label]));
  const BRANDS = [...new Set(GARAGE.map((bike) => bike.brand))].sort((a, b) => a.localeCompare(b, 'tr'));
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const state = {
    a: 'yamaha-mt-09',
    b: 'harley-davidson-fat-boy-114',
    mode: 'garaj',
    klass: 'hepsi',
    brand: 'hepsi',
    query: '',
    openPicker: null,
    pairCursor: 0
  };

  const $ = (id) => document.getElementById(id);
  const byId = (id) => GARAGE.find((bike) => bike.id === id) || GARAGE[0];
  const fmt = (value, decimals) => value.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (value !== null && value !== undefined) node.setAttribute(key, value);
    }
    for (const child of [].concat(children)) {
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
  }

  function svg(tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  }

  // --- durum <-> URL ---

  function readHash() {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));
    const a = params.get('a');
    const b = params.get('b');
    const mode = params.get('m');
    if (a && GARAGE.some((bike) => bike.id === a)) state.a = a;
    if (b && GARAGE.some((bike) => bike.id === b) && b !== state.a) state.b = b;
    if (mode === 'garaj' || mode === 'sinif') state.mode = mode;
  }

  function writeHash(replace = false) {
    const hash = `#a=${state.a}&b=${state.b}&m=${state.mode}`;
    if (location.hash === hash) return;
    if (replace) history.replaceState(null, '', hash);
    else history.pushState(null, '', hash);
  }

  // --- filtreleme ---

  function filtered() {
    const query = state.query.trim().toLocaleLowerCase('tr');
    return GARAGE.filter((bike) => {
      if (state.klass !== 'hepsi' && bike.class !== state.klass) return false;
      if (state.brand !== 'hepsi' && bike.brand !== state.brand) return false;
      if (!query) return true;
      return `${bike.brand} ${bike.model} ${CLASS_LABEL.get(bike.class)}`
        .toLocaleLowerCase('tr').includes(query);
    });
  }

  // --- filtre seridi ---

  function renderChips(container, options, active, onPick) {
    container.textContent = '';
    for (const option of options) {
      const chip = el('button', {
        type: 'button',
        class: 'chip',
        title: option.title || null,
        'aria-pressed': String(option.value === active),
        text: option.label
      });
      chip.addEventListener('click', () => onPick(option.value));
      container.appendChild(chip);
    }
  }

  function renderFilters() {
    renderChips(
      $('classChips'),
      [{ value: 'hepsi', label: 'hepsi' }, ...CLASSES.map((k) => ({ value: k.key, label: k.label.toLocaleLowerCase('tr'), title: k.blurb }))],
      state.klass,
      (value) => { state.klass = value; render(); }
    );
    renderChips(
      $('brandChips'),
      [{ value: 'hepsi', label: 'hepsi' }, ...BRANDS.map((brand) => ({ value: brand, label: brand.toLocaleLowerCase('tr') }))],
      state.brand,
      (value) => { state.brand = value; render(); }
    );
    renderChips(
      $('modeChips'),
      [{ value: 'garaj', label: 'garaj (10 motor)' }, { value: 'sinif', label: 'sınıf medyanı' }],
      state.mode,
      (value) => { state.mode = value; writeHash(); render(); }
    );
  }

  // --- slotlar ---

  function renderSlot(side) {
    const bike = byId(side === 'a' ? state.a : state.b);
    const image = $(`frame${side.toUpperCase()}`);
    const estimated = bike.power.estimated;

    image.src = frameUrl(bike.id);
    image.alt = `${bike.brand} ${bike.model} — fosfor taramalı kare`;

    $(`title${side.toUpperCase()}`).textContent = `${bike.brand} ${bike.model}`;

    const sub = $(`sub${side.toUpperCase()}`);
    sub.textContent = `${CLASS_LABEL.get(bike.class)} · ${bike.year} · ${bike.engine.cc}cc ${bike.engine.layout}`;
    if (estimated) {
      sub.appendChild(el('span', { class: 'badge-est', title: bike.note || 'Üretici beygir yayımlamıyor; değer tahminidir.', text: 'hp: tahmini' }));
    }
  }

  function renderPicker(side) {
    const picker = $(`picker${side.toUpperCase()}`);
    const other = side === 'a' ? state.b : state.a;
    const current = side === 'a' ? state.a : state.b;
    picker.textContent = '';

    const list = filtered();
    if (!list.length) {
      picker.appendChild(el('p', { class: 'picker-empty', text: 'Bu filtreye uyan motor yok.' }));
      return;
    }

    for (const bike of list) {
      const derived = metrics.derive(bike);
      const item = el('button', {
        type: 'button',
        class: 'picker-item',
        role: 'option',
        'aria-selected': String(bike.id === current),
        disabled: bike.id === other ? '' : null
      }, [
        el('span', { text: `${bike.brand} ${bike.model}` }),
        el('span', { class: 'picker-meta', text: `${CLASS_LABEL.get(bike.class)} · ${fmt(derived.kgPerHp, 2)} kg/hp` })
      ]);
      item.addEventListener('click', () => {
        if (side === 'a') state.a = bike.id; else state.b = bike.id;
        state.openPicker = null;
        writeHash();
        render();
      });
      picker.appendChild(item);
    }
  }

  // --- terazi barlari ---

  function renderBalance() {
    const rows = $('balanceRows');
    rows.textContent = '';
    const a = byId(state.a);
    const b = byId(state.b);
    const scale = metrics.buildScale(GARAGE, state.mode);

    let lastGroup = null;
    for (const metric of metrics.METRICS) {
      if (metric.group !== lastGroup) {
        lastGroup = metric.group;
        if (metric.group === 'derived') {
          rows.appendChild(el('p', { class: 'group-label', text: 'türetilmiş — asıl hikâye burada' }));
        }
      }

      const valueA = metrics.valueOf(a, metric.key);
      const valueB = metrics.valueOf(b, metric.key);
      const delta = valueB - valueA;
      // "Iyi/kotu" yonu metrigin dogasina baglidir (agirlik ve kg/hp'de az iyidir).
      const smallerWins = Boolean(metric.lowerIsBetter) || metric.key === 'weight';
      const bIsBetter = smallerWins ? delta < 0 : delta > 0;
      const deltaClass = Math.abs(delta) < 1e-9 ? '' : (bIsBetter ? ' better' : ' worse');
      const sign = delta > 0 ? '+' : (delta < 0 ? '−' : '±');

      const row = el('div', { class: 'bar-row' });
      row.appendChild(el('span', { class: 'metric-name' }, [
        document.createTextNode(metric.label),
        el('small', { text: metric.unit })
      ]));
      row.appendChild(el('span', { class: 'val', text: fmt(valueA, metric.decimals) }));

      const trackA = el('div', { class: 'bar-track mirror' });
      trackA.appendChild(el('span', { class: 'bar-fill', style: `width:${(scale(a, metric.key) * 100).toFixed(1)}%` }));
      row.appendChild(trackA);

      const trackB = el('div', { class: 'bar-track' });
      trackB.appendChild(el('span', { class: 'bar-fill', style: `width:${(scale(b, metric.key) * 100).toFixed(1)}%` }));
      row.appendChild(trackB);

      row.appendChild(el('span', { class: 'val right', text: fmt(valueB, metric.decimals) }));
      row.appendChild(el('span', {
        class: `delta${deltaClass}`,
        text: `${sign}${fmt(Math.abs(delta), metric.decimals)}`
      }));
      rows.appendChild(row);
    }

    $('balanceNote').textContent = state.mode === 'garaj'
      ? 'Barlar 10 motorluk garajın %5–%95 aralığına göre; tek bir uç değer ölçeği ezmesin diye kırpılmıştır.'
      : 'Barlar her motorun KENDİ sınıfının medyanına oranıdır (log2). Orta nokta = sınıf medyanı.';
  }

  // --- radar ---

  const RADAR_AXES = [
    { key: 'power', label: 'güç' },
    { key: 'torque', label: 'tork' },
    { key: 'nmPer100', label: 'Nm/kg' },
    { key: 'weight', label: 'hafiflik', invert: true },
    { key: 'hpPerTon', label: 'hp/kg' }
  ];

  function renderRadar() {
    const host = $('radar');
    host.textContent = '';
    const size = 300;
    const cx = size / 2;
    const cy = size / 2 + 6;
    const radius = 96;
    const scale = metrics.buildScale(GARAGE, state.mode);

    const root = svg('svg', { viewBox: `0 0 ${size} ${size}`, role: 'img' });
    const point = (index, ratio) => {
      const angle = (-Math.PI / 2) + ((index / RADAR_AXES.length) * Math.PI * 2);
      return [cx + (Math.cos(angle) * radius * ratio), cy + (Math.sin(angle) * radius * ratio)];
    };

    for (const ring of [0.25, 0.5, 0.75, 1]) {
      const points = RADAR_AXES.map((_, index) => point(index, ring).join(',')).join(' ');
      root.appendChild(svg('polygon', {
        points, fill: 'none', stroke: 'rgba(0,255,0,0.16)', 'stroke-width': ring === 1 ? 1.2 : 0.7
      }));
    }

    RADAR_AXES.forEach((axis, index) => {
      const [x, y] = point(index, 1);
      root.appendChild(svg('line', { x1: cx, y1: cy, x2: x, y2: y, stroke: 'rgba(0,255,0,0.16)', 'stroke-width': 0.7 }));
      const [lx, ly] = point(index, 1.19);
      const label = svg('text', {
        x: lx, y: ly, fill: '#00bb00', 'font-size': '10', 'text-anchor': 'middle', 'dominant-baseline': 'middle'
      });
      label.textContent = axis.label;
      root.appendChild(label);
    });

    for (const [bike, color, side] of [[byId(state.a), '#00ff00', 'a'], [byId(state.b), '#00f3ff', 'b']]) {
      const points = RADAR_AXES.map((axis, index) => {
        const raw = scale(bike, axis.key);
        return point(index, Math.max(0.04, axis.invert ? 1 - raw : raw)).join(',');
      }).join(' ');
      root.appendChild(svg('polygon', {
        points, fill: color, 'fill-opacity': side === 'a' ? 0.18 : 0.14, stroke: color, 'stroke-width': 1.6
      }));
    }

    const a = byId(state.a);
    const b = byId(state.b);
    root.appendChild(svg('title')).textContent =
      `Radar: ${a.brand} ${a.model} ile ${b.brand} ${b.model} beş eksende karşılaştırılır.`;
    root.setAttribute('aria-label',
      `Radar grafiği: ${a.model} ve ${b.model}; eksenler güç, tork, tork/ağırlık, hafiflik, güç/ağırlık. Sayısal değerler aşağıdaki tabloda.`);
    host.appendChild(root);
  }

  // --- sacilim ---

  function renderScatter() {
    const host = $('scatter');
    host.textContent = '';
    const width = 560;
    const height = 300;
    const pad = { left: 44, right: 14, top: 14, bottom: 34 };
    const weights = GARAGE.map((bike) => bike.weight.kg);
    const powers = GARAGE.map((bike) => bike.power.hp);
    const xMin = Math.floor((Math.min(...weights) - 15) / 10) * 10;
    const xMax = Math.ceil((Math.max(...weights) + 15) / 10) * 10;
    const yMin = 0;
    const yMax = Math.ceil((Math.max(...powers) + 20) / 10) * 10;

    const px = (kg) => pad.left + (((kg - xMin) / (xMax - xMin)) * (width - pad.left - pad.right));
    const py = (hp) => height - pad.bottom - (((hp - yMin) / (yMax - yMin)) * (height - pad.top - pad.bottom));

    const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img' });

    // Es guc/agirlik egrileri: hp = k * kg. Ayni egri uzerindeki motorlar
    // kilo basina ayni beygiri tasir.
    for (const k of [0.2, 0.35, 0.5, 0.65]) {
      const y1 = k * xMin;
      const y2 = k * xMax;
      if (y2 > yMax && y1 > yMax) continue;
      root.appendChild(svg('line', {
        x1: px(xMin), y1: py(Math.min(y1, yMax)), x2: px(xMax), y2: py(Math.min(y2, yMax)),
        stroke: 'rgba(0,255,0,0.13)', 'stroke-width': 1, 'stroke-dasharray': '4 5'
      }));
      const labelX = px(xMax) - 4;
      const labelY = py(Math.min(y2, yMax)) - 4;
      if (y2 <= yMax) {
        const tag = svg('text', { x: labelX, y: labelY, fill: 'rgba(0,187,0,0.65)', 'font-size': '9', 'text-anchor': 'end' });
        tag.textContent = `${k} hp/kg`;
        root.appendChild(tag);
      }
    }

    root.appendChild(svg('line', { x1: pad.left, y1: height - pad.bottom, x2: width - pad.right, y2: height - pad.bottom, stroke: 'rgba(0,255,0,0.3)' }));
    root.appendChild(svg('line', { x1: pad.left, y1: pad.top, x2: pad.left, y2: height - pad.bottom, stroke: 'rgba(0,255,0,0.3)' }));

    for (let kg = xMin; kg <= xMax; kg += 40) {
      const tick = svg('text', { x: px(kg), y: height - pad.bottom + 14, fill: '#00bb00', 'font-size': '9', 'text-anchor': 'middle' });
      tick.textContent = String(kg);
      root.appendChild(tick);
    }
    for (let hp = 0; hp <= yMax; hp += 40) {
      const tick = svg('text', { x: pad.left - 6, y: py(hp) + 3, fill: '#00bb00', 'font-size': '9', 'text-anchor': 'end' });
      tick.textContent = String(hp);
      root.appendChild(tick);
    }
    const xLabel = svg('text', { x: width - pad.right, y: height - 6, fill: '#00bb00', 'font-size': '9', 'text-anchor': 'end' });
    xLabel.textContent = 'ağırlık (kg)';
    root.appendChild(xLabel);
    const yLabel = svg('text', { x: pad.left - 34, y: pad.top + 6, fill: '#00bb00', 'font-size': '9' });
    yLabel.textContent = 'hp';
    root.appendChild(yLabel);

    const front = new Set(metrics.paretoFront(GARAGE));
    for (const bike of GARAGE) {
      const x = px(bike.weight.kg);
      const y = py(bike.power.hp);
      const isA = bike.id === state.a;
      const isB = bike.id === state.b;

      if (front.has(bike.id)) {
        root.appendChild(svg('circle', { cx: x, cy: y, r: 8, fill: 'none', stroke: '#ff0096', 'stroke-width': 1 }));
      }
      root.appendChild(svg('circle', {
        cx: x, cy: y, r: isA || isB ? 5 : 3,
        fill: isA ? '#00ff00' : (isB ? '#00f3ff' : 'rgba(0,187,0,0.5)')
      }));
      if (isA || isB) {
        const tag = svg('text', {
          x: x + 9, y: y + 3, fill: isA ? '#00ff00' : '#00f3ff', 'font-size': '10'
        });
        tag.textContent = bike.model;
        root.appendChild(tag);
      }
    }

    root.setAttribute('aria-label',
      'Saçılım grafiği: yatay eksen ağırlık, dikey eksen beygir. Kesikli çizgiler eş güç/ağırlık oranları; pembe halkalar Pareto sınırındaki motorlar. Sayısal değerler aşağıdaki tabloda.');
    host.appendChild(root);
  }

  // --- bilanco + tablo ---

  function renderVerdict() {
    const a = byId(state.a);
    const b = byId(state.b);
    const lines = [metrics.verdict(a, b, GARAGE)];

    for (const bike of [a, b]) {
      const light = metrics.rankInClass(GARAGE, bike, 'weight');
      const torque = metrics.rankInClass(GARAGE, bike, 'nmPer100');
      lines.push(
        `${bike.model}: ${CLASS_LABEL.get(bike.class)} sınıfında hafiflikte `
        + `${light.total - light.rank + 1}/${light.total}, tork/ağırlıkta ${torque.rank}/${torque.total}.`
      );
    }

    $('verdict').textContent = lines.join(' ');
  }

  function renderTable() {
    const body = $('tableBody');
    body.textContent = '';
    for (const bike of GARAGE) {
      const derived = metrics.derive(bike);
      const row = el('tr', {
        class: bike.id === state.a ? 'is-a' : (bike.id === state.b ? 'is-b' : '')
      });
      const cells = [
        `${bike.brand} ${bike.model}`,
        CLASS_LABEL.get(bike.class),
        fmt(bike.weight.kg, 0),
        `${fmt(bike.power.hp, 1)}${bike.power.estimated ? ' *' : ''}`,
        fmt(bike.torque.nm, 1),
        fmt(derived.hpPerTon, 0),
        fmt(derived.nmPer100, 1),
        fmt(derived.kgPerHp, 2)
      ];
      cells.forEach((value, index) => {
        row.appendChild(el(index === 0 ? 'th' : 'td', index === 0 ? { scope: 'row', text: value } : { text: value }));
      });
      body.appendChild(row);
    }
  }

  // --- eylemler ---

  function pairs() {
    const list = [];
    for (let i = 0; i < GARAGE.length; i += 1) {
      for (let j = i + 1; j < GARAGE.length; j += 1) list.push([GARAGE[i].id, GARAGE[j].id]);
    }
    return list;
  }

  function nextPair() {
    const all = pairs();
    state.pairCursor = (state.pairCursor + 1) % all.length;
    [state.a, state.b] = all[state.pairCursor];
    writeHash();
    render();
  }

  function swap() {
    [state.a, state.b] = [state.b, state.a];
    writeHash();
    render();
  }

  function csvText() {
    const header = ['marka', 'model', 'yil', 'sinif', 'kg_kerb', 'hp', 'nm', 'hp_ton', 'nm_100kg', 'kg_hp', 'kaynak'];
    const rows = GARAGE.map((bike) => {
      const derived = metrics.derive(bike);
      return [
        bike.brand, bike.model, bike.year, bike.class,
        bike.weight.kg, bike.power.hp, bike.torque.nm,
        derived.hpPerTon.toFixed(1), derived.nmPer100.toFixed(2), derived.kgPerHp.toFixed(3),
        bike.source
      ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',');
    });
    return [header.join(','), ...rows].join('\n');
  }

  function downloadCsv() {
    const blob = new Blob([`﻿${csvText()}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = el('a', { href: url, download: 'demir-at-terazisi.csv' });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyLink() {
    const url = `${location.origin}${location.pathname}#a=${state.a}&b=${state.b}&m=${state.mode}`;
    const button = $('copyLink');
    try {
      await navigator.clipboard.writeText(url);
      button.textContent = 'kopyalandı';
    } catch {
      button.textContent = 'kopyalanamadı';
    }
    setTimeout(() => { button.textContent = 'baglantiyi kopyala'; }, 1800);
  }

  // --- ana cizim ---

  function render() {
    renderFilters();
    renderSlot('a');
    renderSlot('b');
    renderPicker('a');
    renderPicker('b');
    renderBalance();
    renderRadar();
    renderScatter();
    renderVerdict();
    renderTable();

    for (const side of ['a', 'b']) {
      const picker = $(`picker${side.toUpperCase()}`);
      const button = $(`pick${side.toUpperCase()}`);
      const open = state.openPicker === side;
      picker.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
    }
  }

  function bind() {
    for (const side of ['a', 'b']) {
      $(`pick${side.toUpperCase()}`).addEventListener('click', () => {
        state.openPicker = state.openPicker === side ? null : side;
        render();
      });
    }

    $('search').addEventListener('input', (event) => {
      state.query = event.target.value;
      renderPicker('a');
      renderPicker('b');
    });

    $('swap').addEventListener('click', swap);
    $('nextPair').addEventListener('click', nextPair);
    $('copyLink').addEventListener('click', copyLink);
    $('csv').addEventListener('click', downloadCsv);

    $('toggleTable').addEventListener('click', () => {
      const wrap = $('tableWrap');
      const hidden = wrap.hasAttribute('hidden');
      if (hidden) wrap.removeAttribute('hidden'); else wrap.setAttribute('hidden', '');
      $('toggleTable').setAttribute('aria-expanded', String(hidden));
      $('toggleTable').textContent = hidden ? 'tabloyu gizle' : 'tabloyu göster';
    });

    document.addEventListener('keydown', (event) => {
      if (event.target.matches('input, textarea')) {
        if (event.key === 'Escape') { state.openPicker = null; render(); }
        return;
      }
      if (event.key === 'Escape' && state.openPicker) { state.openPicker = null; render(); return; }
      const key = event.key.toLocaleLowerCase('tr');
      if (key === 's') swap();
      if (key === 'r') nextPair();
    });

    window.addEventListener('hashchange', () => { readHash(); render(); });
  }

  readHash();
  $('dataVersion').textContent = DATA_VERSION;
  bind();
  render();
  writeHash(true);
})();
