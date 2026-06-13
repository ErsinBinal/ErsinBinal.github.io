/**
 * Convivium - Bugy v4 "Office Yardimcilari"
 * Kevan J. Atteberry estetiginde, Office 97-2003 asistanlarindan esinlenen
 * SVG tabanli yoldas motoru. Diger bugy motorlariyla ayni API sozlesmesi:
 *   window.BugyV4 = { version, actions, activate, deactivate, summon,
 *                     trigger, next, setRandom, setSkin, getState }
 * Skin'ler = asistanlar: clippy / merlin / rover / f1 / genie / scribble / dot
 */
(() => {
  'use strict';

  const engineKey = 'convivium.bugy.engine';
  const skinKey = 'convivium.bugy.v4.skin';

  const actions = ['tada', 'think', 'alert', 'wave', 'magic', 'search', 'morph'];

  // --- Asistan tanimlari (Atteberry estetigi: yumusak, dostane, yuvarlak) ---
  const assistants = {
    clippy: {
      label: 'Clippy',
      accent: '#d9e2ec',
      spark: '✶',
      quips: [
        'Bir mektup yaziyor gibisiniz. Yardim edeyim mi?',
        'Gorunuse gore kod yaziyorsunuz...',
        'Bir ipucu vereyim mi?',
        'Ataç gibi her seye tutunurum.'
      ],
      svg: `
        <path class="v4-paperclip" d="M44 116 V62 a16 16 0 0 1 32 0 V92 a9 9 0 0 1-18 0 V70"
          fill="none" stroke="#aebccd" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M44 116 V62 a16 16 0 0 1 32 0 V92 a9 9 0 0 1-18 0 V70"
          fill="none" stroke="#eef3f8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <g class="v4-face">
          <ellipse cx="50" cy="44" rx="11" ry="13" fill="#fff" stroke="#23303a" stroke-width="2.4"/>
          <ellipse cx="70" cy="44" rx="11" ry="13" fill="#fff" stroke="#23303a" stroke-width="2.4"/>
          <circle class="v4-pupil" cx="52" cy="47" r="4.2" fill="#1b242b"/>
          <circle class="v4-pupil" cx="72" cy="47" r="4.2" fill="#1b242b"/>
          <path d="M40 30 q9 -7 19 -2" stroke="#23303a" stroke-width="3.4" fill="none" stroke-linecap="round"/>
          <path d="M62 28 q10 -4 19 3" stroke="#23303a" stroke-width="3.4" fill="none" stroke-linecap="round"/>
        </g>`
    },
    merlin: {
      label: 'Merlin',
      accent: '#9b6bff',
      spark: '★',
      quips: [
        'Yildizlar bugun senden yana.',
        'Sihirli bir sey yapalim mi?',
        'Abrakadabra! Kod derlensin.',
        'Gizemi sevenler buraya.'
      ],
      svg: `
        <path d="M34 112 q26 14 52 0 l-6 -34 h-40 z" fill="#5a3aa6" stroke="#2c1b54" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="60" cy="64" r="20" fill="#f3d9b8" stroke="#2c1b54" stroke-width="2.5"/>
        <path d="M40 70 q20 28 40 0 q-6 22 -20 22 q-14 0 -20 -22 z" fill="#fbfbff" stroke="#d8d8e8" stroke-width="2"/>
        <path d="M30 52 L60 6 L90 52 q-30 14 -60 0 z" fill="#3a2380" stroke="#2c1b54" stroke-width="2.5" stroke-linejoin="round"/>
        <circle class="v4-pupil" cx="53" cy="62" r="3.4" fill="#1b242b"/>
        <circle class="v4-pupil" cx="67" cy="62" r="3.4" fill="#1b242b"/>
        <g class="v4-stars" fill="#ffe27a">
          <circle cx="50" cy="30" r="2.6"/><circle cx="70" cy="24" r="2"/><circle cx="60" cy="38" r="1.8"/>
        </g>`
    },
    rover: {
      label: 'Rover',
      accent: '#ffc83d',
      spark: '✦',
      quips: [
        'Bir sey mi ariyorsun? Hav!',
        'Koklayip buluyorum!',
        'Iste burada, buldum!',
        'Kuyrugumu sallayarak yardimcdayim.'
      ],
      svg: `
        <ellipse cx="60" cy="98" rx="30" ry="22" fill="#f2b32e" stroke="#8a5a12" stroke-width="2.5"/>
        <circle cx="60" cy="58" r="30" fill="#ffce4a" stroke="#8a5a12" stroke-width="2.5"/>
        <path d="M30 40 q-12 8 -8 30 q14 4 18 -10 z" fill="#e0962a" stroke="#8a5a12" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M90 40 q12 8 8 30 q-14 4 -18 -10 z" fill="#e0962a" stroke="#8a5a12" stroke-width="2.5" stroke-linejoin="round"/>
        <ellipse cx="60" cy="70" rx="15" ry="11" fill="#fff3d6" stroke="#8a5a12" stroke-width="2"/>
        <circle cx="60" cy="66" r="5" fill="#3a2a14"/>
        <path d="M55 78 q5 6 10 0" stroke="#8a5a12" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <path d="M60 78 v8 q4 4 8 1" stroke="#d8607a" stroke-width="4" fill="none" stroke-linecap="round"/>
        <circle class="v4-pupil" cx="49" cy="52" r="4.4" fill="#1b242b"/>
        <circle class="v4-pupil" cx="71" cy="52" r="4.4" fill="#1b242b"/>`
    },
    f1: {
      label: 'F1 / K-9',
      accent: '#46d6c2',
      spark: '▣',
      quips: [
        'SISTEM HAZIR. KOMUT BEKLENIYOR.',
        'BIP BOP. Yardim protokolu aktif.',
        'Hata bulundu: cok eglenceli.',
        'Hav modu: dijital.'
      ],
      svg: `
        <rect x="34" y="74" width="52" height="34" rx="6" fill="#b6c2cc" stroke="#3a4750" stroke-width="2.5"/>
        <rect x="40" y="40" width="40" height="34" rx="7" fill="#cfd9e1" stroke="#3a4750" stroke-width="2.5"/>
        <rect x="26" y="46" width="12" height="22" rx="4" fill="#9aa7b2" stroke="#3a4750" stroke-width="2.2"/>
        <rect x="82" y="46" width="12" height="22" rx="4" fill="#9aa7b2" stroke="#3a4750" stroke-width="2.2"/>
        <line x1="60" y1="40" x2="60" y2="24" stroke="#3a4750" stroke-width="2.5"/>
        <circle cx="60" cy="21" r="4" fill="#46d6c2" stroke="#3a4750" stroke-width="2"/>
        <rect class="v4-pupil" x="44" y="52" width="9" height="9" rx="2" fill="#46d6c2"/>
        <rect class="v4-pupil" x="67" y="52" width="9" height="9" rx="2" fill="#46d6c2"/>
        <rect x="48" y="66" width="24" height="4" rx="2" fill="#3a4750"/>
        <circle cx="44" cy="100" r="2.4" fill="#3a4750"/><circle cx="76" cy="100" r="2.4" fill="#3a4750"/>`
    },
    genie: {
      label: 'Genie',
      accent: '#3aa0ff',
      spark: '✺',
      quips: [
        'Dile benden ne dilersen!',
        'Uc dilegin... saka, sinirsiz.',
        'Lambayi ogusturdun, iste buradayim.',
        'Tozdan dogdum, isigi seviyorum.'
      ],
      svg: `
        <path d="M44 118 q-14 -2 -8 -16 q6 -10 24 -10 q18 0 24 10 q6 14 -8 16 z" fill="#f4b740" stroke="#9a6c12" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M40 92 q-10 -22 20 -28 q30 6 20 28 q-20 10 -40 0 z" fill="#3a90ef" stroke="#1c4f8a" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="60" cy="50" r="22" fill="#54a6ff" stroke="#1c4f8a" stroke-width="2.5"/>
        <path d="M52 30 q8 -12 16 0" fill="#2c2c4a" stroke="#1c1c33" stroke-width="2"/>
        <circle cx="60" cy="26" r="3.5" fill="#2c2c4a"/>
        <circle class="v4-pupil" cx="53" cy="50" r="3.6" fill="#10243a"/>
        <circle class="v4-pupil" cx="67" cy="50" r="3.6" fill="#10243a"/>
        <path d="M53 60 q7 6 14 0" stroke="#10243a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <rect x="40" y="84" width="40" height="6" rx="3" fill="#ffd86b" stroke="#9a6c12" stroke-width="1.6"/>`
    },
    scribble: {
      label: 'Scribble',
      accent: '#f2efe6',
      spark: '✜',
      quips: [
        'Mirnav. Kagittan ama gercegim.',
        'Beni burusturma, sekil veriyorum.',
        'Pit pit. Origami kedi.',
        'Bir kativ, bin sekil.'
      ],
      svg: `
        <polygon points="34,108 30,76 26,60 40,64 36,44 52,52 58,38 66,52 82,46 76,66 92,64 86,84 90,108"
          fill="#f6f3ea" stroke="#b9b29c" stroke-width="2.4" stroke-linejoin="round"/>
        <polygon points="40,52 36,32 54,46" fill="#efe9d8" stroke="#b9b29c" stroke-width="2.2" stroke-linejoin="round"/>
        <polygon points="80,52 84,32 66,46" fill="#efe9d8" stroke="#b9b29c" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M44 70 q6 -6 12 0 M64 70 q6 -6 12 0" stroke="#7d7660" stroke-width="2" fill="none" stroke-linecap="round"/>
        <circle class="v4-pupil" cx="52" cy="74" r="3.6" fill="#3a352a"/>
        <circle class="v4-pupil" cx="70" cy="74" r="3.6" fill="#3a352a"/>
        <path d="M58 82 l4 4 l4 -4" stroke="#b96b4a" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M50 88 q10 8 22 0" stroke="#7d7660" stroke-width="2" fill="none" stroke-linecap="round"/>`
    },
    dot: {
      label: 'The Dot',
      accent: '#ff5fa2',
      spark: '◆',
      quips: [
        'Renk degistiriyorum, bak!',
        'Geometri guzeldir.',
        'Yuvarlandim, iste geldim.',
        'Bir nokta, sonsuz olasilik.'
      ],
      svg: `
        <circle class="v4-dot-core" cx="60" cy="72" r="36" fill="#ff5fa2" stroke="#fff" stroke-width="2.5"/>
        <circle class="v4-dot-ring" cx="60" cy="72" r="26" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-dasharray="6 8"/>
        <circle cx="60" cy="72" r="14" fill="#ffffff" opacity="0.85"/>
        <circle class="v4-pupil" cx="54" cy="70" r="3.6" fill="#222"/>
        <circle class="v4-pupil" cx="66" cy="70" r="3.6" fill="#222"/>
        <path d="M54 80 q6 6 12 0" stroke="#222" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
    }
  };

  const skins = Object.keys(assistants);

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const readLS = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const writeLS = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

  const boot = () => {
    if (window.BugyV4) return;

    // --- DOM iskeleti ---
    const layer = document.createElement('div');
    layer.id = 'bugy-v4-layer';
    layer.className = 'bugy-v4-layer';
    layer.hidden = true;

    const fx = document.createElement('div');
    fx.className = 'bugy-v4-fx';

    const char = document.createElement('div');
    char.className = 'bugy-v4-char';
    char.setAttribute('role', 'img');

    const svgWrap = document.createElement('div');
    svgWrap.className = 'bugy-v4-svg-wrap';

    const balloon = document.createElement('div');
    balloon.className = 'bugy-v4-balloon';
    balloon.hidden = true;
    const balloonText = document.createElement('span');
    balloon.appendChild(balloonText);

    char.appendChild(svgWrap);
    layer.append(fx, balloon, char);
    document.body.appendChild(layer);

    // --- Durum ---
    const state = {
      active: false,
      skin: skins.includes(readLS(skinKey)) ? readLS(skinKey) : 'clippy',
      mood: 'idle',
      randomEnabled: true,
      x: window.innerWidth * 0.5,
      dir: 1,
      busy: false,
      nextAction: 0,
      raf: 0,
      blinkAt: 0,
      idleQuipAt: 0
    };

    const CHAR_W = 110;
    const CHAR_H = 132;
    const bottomGap = 18;

    const def = () => assistants[state.skin];

    const renderSvg = () => {
      svgWrap.innerHTML =
        `<svg viewBox="0 0 120 140" class="v4-svg" aria-hidden="true">${def().svg}</svg>`;
      char.dataset.skin = state.skin;
      char.setAttribute('aria-label', `${def().label} yardimcisi`);
      char.style.setProperty('--v4-accent', def().accent);
    };

    const groundTop = () => window.innerHeight - CHAR_H - bottomGap;

    const place = (bob = 0) => {
      char.style.transform =
        `translate(${Math.round(state.x)}px, ${Math.round(bob)}px) scaleX(${state.dir < 0 ? -1 : 1})`;
      balloon.style.transform = `translate(${Math.round(state.x + CHAR_W * 0.55)}px, ${Math.round(bob)}px)`;
    };

    // --- Konusma balonu (daktilo efekti) ---
    let typeTimer = 0;
    let hideTimer = 0;
    const say = (text) => {
      window.clearInterval(typeTimer);
      window.clearTimeout(hideTimer);
      balloon.hidden = false;
      balloon.classList.add('is-on');
      balloonText.textContent = '';
      let i = 0;
      typeTimer = window.setInterval(() => {
        balloonText.textContent = text.slice(0, i + 1);
        i += 1;
        if (i >= text.length) {
          window.clearInterval(typeTimer);
          hideTimer = window.setTimeout(() => {
            balloon.classList.remove('is-on');
            window.setTimeout(() => { balloon.hidden = true; }, 260);
          }, 2600);
        }
      }, 32);
    };

    // --- Parcacik patlamasi ---
    const burst = (count = 10) => {
      const glyph = def().spark;
      const color = def().accent;
      for (let n = 0; n < count; n += 1) {
        const p = document.createElement('span');
        p.className = 'v4-particle';
        p.textContent = glyph;
        p.style.color = color;
        const angle = (Math.PI * 2 * n) / count + Math.random() * 0.6;
        const dist = 34 + Math.random() * 46;
        p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
        p.style.setProperty('--dy', `${Math.sin(angle) * dist - 20}px`);
        p.style.left = `${state.x + CHAR_W / 2}px`;
        p.style.bottom = `${bottomGap + CHAR_H * 0.55}px`;
        p.style.fontSize = `${12 + Math.random() * 12}px`;
        p.addEventListener('animationend', () => p.remove(), { once: true });
        fx.appendChild(p);
      }
    };

    // --- Aksiyon calistirici ---
    const moodDuration = { tada: 1400, think: 1800, alert: 1200, wave: 1300, magic: 1700, search: 1600, morph: 1700 };
    let moodTimer = 0;
    const runMood = (mood) => {
      state.mood = mood;
      state.busy = true;
      char.classList.remove(...actions.map((a) => `is-${a}`));
      char.classList.add(`is-${mood}`);
      if (mood === 'tada' || mood === 'magic' || mood === 'morph' || mood === 'search') burst(mood === 'magic' ? 14 : 10);
      const quips = def().quips;
      say(quips[Math.floor(Math.random() * quips.length)]);
      dispatch();
      window.clearTimeout(moodTimer);
      moodTimer = window.setTimeout(() => {
        char.classList.remove(`is-${mood}`);
        state.mood = 'idle';
        state.busy = false;
        dispatch();
      }, moodDuration[mood] || 1400);
    };

    // --- Animasyon dongusu ---
    const loop = (ts) => {
      if (!state.active) return;
      const bob = Math.sin(ts / 420) * 5;
      if (!state.busy) {
        state.x += state.dir * 0.55;
        const min = 6;
        const max = window.innerWidth - CHAR_W - 6;
        if (state.x <= min) { state.x = min; state.dir = 1; }
        else if (state.x >= max) { state.x = max; state.dir = -1; }
      }
      place(bob);

      if (ts > state.blinkAt) {
        char.classList.add('is-blink');
        window.setTimeout(() => char.classList.remove('is-blink'), 160);
        state.blinkAt = ts + 2600 + Math.random() * 2600;
      }
      if (state.randomEnabled && !state.busy && ts > state.idleQuipAt) {
        const quips = def().quips;
        say(quips[Math.floor(Math.random() * quips.length)]);
        state.idleQuipAt = ts + 9000 + Math.random() * 8000;
      }
      state.raf = window.requestAnimationFrame(loop);
    };

    const syncVisibility = () => {
      layer.hidden = !state.active;
      document.body.classList.toggle('bugy-v4-active', state.active);
      document.body.classList.toggle('bugy-v1-muted', state.active);
    };

    const dispatch = () => {
      const detail = api.getState();
      window.dispatchEvent(new CustomEvent('bugy:state', { detail }));
      window.dispatchEvent(new CustomEvent('bugy-v4:state', { detail }));
    };

    const api = {
      version: '4.0.0',
      actions: [...actions],
      assistants: [...skins],
      assetSource: 'Convivium SVG — Office Assistant tribute (Atteberry estetigi)',
      activate() {
        state.active = true;
        writeLS(engineKey, 'v4');
        window.BugyV2 && window.BugyV2.deactivate && window.BugyV2.deactivate();
        window.BugyV3 && window.BugyV3.deactivate && window.BugyV3.deactivate();
        renderSvg();
        state.x = clamp(state.x, 6, window.innerWidth - CHAR_W - 6);
        syncVisibility();
        window.cancelAnimationFrame(state.raf);
        state.raf = window.requestAnimationFrame(loop);
        state.blinkAt = 0;
        state.idleQuipAt = performance.now() + 4000;
        dispatch();
        return true;
      },
      deactivate() {
        state.active = false;
        window.cancelAnimationFrame(state.raf);
        window.clearTimeout(moodTimer);
        char.classList.remove(...actions.map((a) => `is-${a}`));
        syncVisibility();
        dispatch();
        return true;
      },
      summon() {
        if (!state.active) this.activate();
        state.x = clamp(window.innerWidth / 2 - CHAR_W / 2, 6, window.innerWidth - CHAR_W - 6);
        runMood('wave');
        return true;
      },
      trigger(action) {
        if (!state.active) this.activate();
        if (!actions.includes(action)) return false;
        runMood(action);
        return true;
      },
      next() {
        if (!state.active) this.activate();
        const action = actions[state.nextAction % actions.length];
        state.nextAction += 1;
        return this.trigger(action);
      },
      setRandom(enabled) {
        state.randomEnabled = Boolean(enabled);
        state.idleQuipAt = performance.now() + 3000;
        dispatch();
        return state.randomEnabled;
      },
      setSkin(nextSkin) {
        state.skin = skins.includes(nextSkin) ? nextSkin : 'clippy';
        writeLS(skinKey, state.skin);
        renderSvg();
        if (state.active) { burst(8); say(def().quips[0]); }
        dispatch();
        return state.skin;
      },
      getState() {
        return {
          engine: 'v4',
          version: this.version,
          assetSource: this.assetSource,
          active: state.active,
          state: state.mood,
          skin: state.skin,
          skinLabel: def().label,
          skins: [...skins],
          randomEnabled: state.randomEnabled,
          x: Math.round(state.x),
          y: Math.round(groundTop())
        };
      }
    };

    char.addEventListener('click', () => api.next());
    char.tabIndex = 0;
    char.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      api.next();
    });

    window.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !state.active) return;
      writeLS(engineKey, 'v1');
      api.deactivate();
      window.Bugy && window.Bugy.summon && window.Bugy.summon();
    });

    window.addEventListener('resize', () => {
      state.x = clamp(state.x, 6, window.innerWidth - CHAR_W - 6);
      if (state.active) place(0);
    }, { passive: true });

    renderSvg();
    window.BugyV4 = api;
    if (readLS(engineKey) === 'v4') api.activate();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
