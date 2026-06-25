/**
 * Convivium - Bugy v4 "Retro Yaratiklar"
 * 80-90'lar synthwave/CRT estetiginde, Pokemon benzeri evrim geciren SVG
 * yaratik motoru. Her tur 3 evrim asamasinda fiziksel olarak gelisir
 * (yeni uzuvlar + buyume) ve her asamada yeni bir "guc" kazanir; bakimsiz
 * birakilinca canavarlasir (feral surat). Diger bugy motorlariyla ayni API:
 *   window.BugyV4 = { version, actions, activate, deactivate, summon,
 *                     trigger, next, setRandom, setSkin, getState, ... }
 * Yeni eklemeler: setStage, setFeral, setMood, evolve, say.
 * Turler = yaratiklar: spark / volt / aqua / ember / leaf / frost / luna
 */
(() => {
  'use strict';

  const engineKey = 'convivium.bugy.engine';
  const skinKey = 'convivium.bugy.v4.skin';

  // Evrensel jestler (geriye donuk uyumluluk: bakim/studio bunlari cagirir).
  const actions = ['tada', 'think', 'alert', 'wave', 'magic', 'search', 'morph'];

  const STAGES = ['hatchling', 'juvenile', 'adult'];
  const GROW = { egg: 0.62, hatchling: 0.78, juvenile: 0.92, adult: 1.06 };

  // Ortak canavar (feral) suratlari govde merkezine gore konumlanir.
  const feralFace = (cx, cy) => `
    <g class="cr-feral">
      <path d="M${cx - 16} ${cy - 8} l11 5 M${cx + 16} ${cy - 8} l-11 5"
        stroke="#3a0010" stroke-width="3" stroke-linecap="round"/>
      <circle cx="${cx - 9}" cy="${cy}" r="4.5" fill="#ff2e5e"/>
      <circle cx="${cx + 9}" cy="${cy}" r="4.5" fill="#ff2e5e"/>
      <circle cx="${cx - 9}" cy="${cy}" r="1.6" fill="#3a0010"/>
      <circle cx="${cx + 9}" cy="${cy}" r="1.6" fill="#3a0010"/>
      <path d="M${cx - 9} ${cy + 12} l5 -6 l5 6 l5 -6 l5 6"
        fill="none" stroke="#3a0010" stroke-width="3" stroke-linejoin="round"/>
    </g>`;

  // --- Yaratik tanimlari ----------------------------------------------------
  // Her yaratik: label, accent (ana), accent2 (vurgu), spark (parcacik glyph),
  // abilities (asama -> guc adi), quips (kisilik replikleri), svg (katmanli).
  // SVG katmanlari: .cr-juv (genc+), .cr-adult (yetiskin), .cr-feral, .cr-eyes.
  const creatures = {
    spark: {
      label: 'Bitik', accent: '#00ff88', accent2: '#00f3ff', spark: '▚',
      abilities: { hatchling: 'Tarama', juvenile: 'Derleme', adult: 'Aşırı Yük' },
      quips: ['01001000 selam!', 'Belleğim seni hatırlıyor.', 'Pikselden büyüyorum.', 'Bir komut ver, koşayım.'],
      svg: `
        <g class="cr">
          <rect class="cr-body" x="30" y="54" width="60" height="54" rx="15" fill="var(--v4-accent,#00ff88)" stroke="#063b27" stroke-width="3"/>
          <rect x="37" y="61" width="22" height="13" rx="5" fill="#ffffff" opacity="0.18"/>
          <line class="cr-ant" x1="60" y1="54" x2="60" y2="38" stroke="#063b27" stroke-width="3" stroke-linecap="round"/>
          <circle class="cr-ant" cx="60" cy="34" r="4" fill="var(--v4-accent2,#00f3ff)" stroke="#063b27" stroke-width="2"/>
          <g class="cr-juv">
            <rect x="19" y="76" width="13" height="9" rx="4" fill="var(--v4-accent,#00ff88)" stroke="#063b27" stroke-width="2.5"/>
            <rect x="88" y="76" width="13" height="9" rx="4" fill="var(--v4-accent,#00ff88)" stroke="#063b27" stroke-width="2.5"/>
          </g>
          <g class="cr-adult">
            <ellipse cx="60" cy="30" rx="20" ry="6" fill="none" stroke="var(--v4-accent2,#00f3ff)" stroke-width="3" opacity="0.85"/>
            <rect class="cr-cheek" x="36" y="86" width="9" height="7" rx="3" fill="var(--v4-accent2,#00f3ff)" opacity="0.7"/>
            <rect class="cr-cheek" x="75" y="86" width="9" height="7" rx="3" fill="var(--v4-accent2,#00f3ff)" opacity="0.7"/>
          </g>
          <g class="cr-eyes">
            <rect class="v4-pupil" x="44" y="70" width="9" height="11" rx="2" fill="#06241a"/>
            <rect class="v4-pupil" x="67" y="70" width="9" height="11" rx="2" fill="#06241a"/>
            <path d="M50 90 q10 7 20 0" fill="none" stroke="#06241a" stroke-width="3" stroke-linecap="round"/>
          </g>
          ${feralFace(60, 75)}
        </g>`
    },
    volt: {
      label: 'Voltik', accent: '#ffd23f', accent2: '#ff4fd8', spark: '⚡',
      abilities: { hatchling: 'Kıvılcım', juvenile: 'Şok', adult: 'Yıldırım' },
      quips: ['Bzzt! Enerjim taştı.', 'Statik saçlarını dikecek!', 'Koşalım mı? Ben hızlıyım.', 'Şarjım tam, hadi!'],
      svg: `
        <g class="cr">
          <path class="cr-juv cr-tail" d="M86 96 q26 -4 22 -28 q-2 16 -18 14 q10 -10 6 -20 q-6 14 -16 18 z"
            fill="var(--v4-accent,#ffd23f)" stroke="#7a4a00" stroke-width="2.5" stroke-linejoin="round"/>
          <ellipse class="cr-body" cx="60" cy="82" rx="30" ry="28" fill="var(--v4-accent,#ffd23f)" stroke="#7a4a00" stroke-width="3"/>
          <path d="M38 58 L30 26 L54 50 Z" fill="var(--v4-accent,#ffd23f)" stroke="#7a4a00" stroke-width="3" stroke-linejoin="round"/>
          <path d="M82 58 L90 26 L66 50 Z" fill="var(--v4-accent,#ffd23f)" stroke="#7a4a00" stroke-width="3" stroke-linejoin="round"/>
          <g class="cr-adult">
            <path d="M33 38 L30 26 L41 37 Z" fill="#2a1a00"/>
            <path d="M87 38 L90 26 L79 37 Z" fill="#2a1a00"/>
            <path d="M56 30 l8 -14 l-3 10 l6 -2 l-9 16 l3 -10 z" fill="var(--v4-accent2,#ff4fd8)" stroke="#7a1a55" stroke-width="1.6" stroke-linejoin="round"/>
          </g>
          <circle class="cr-cheek" cx="38" cy="86" r="6" fill="var(--v4-accent2,#ff4fd8)" opacity="0.7"/>
          <circle class="cr-cheek" cx="82" cy="86" r="6" fill="var(--v4-accent2,#ff4fd8)" opacity="0.7"/>
          <g class="cr-eyes">
            <circle class="v4-pupil" cx="50" cy="78" r="5" fill="#2a1a00"/>
            <circle class="v4-pupil" cx="70" cy="78" r="5" fill="#2a1a00"/>
            <circle cx="48" cy="76" r="1.6" fill="#fff"/><circle cx="68" cy="76" r="1.6" fill="#fff"/>
            <path d="M55 90 q5 5 10 0" fill="none" stroke="#2a1a00" stroke-width="2.6" stroke-linecap="round"/>
          </g>
          ${feralFace(60, 80)}
        </g>`
    },
    aqua: {
      label: 'Glupi', accent: '#38e1ff', accent2: '#3a6bff', spark: '◌',
      abilities: { hatchling: 'Damla', juvenile: 'Kabarcık', adult: 'Dalga' },
      quips: ['Blop... merhaba.', 'Serin bir gün, değil mi?', 'Akışına bırak.', 'Islanmaya hazır mısın?'],
      svg: `
        <g class="cr">
          <path class="cr-body" d="M60 50 C82 50 92 72 92 86 C92 104 78 112 60 112 C42 112 28 104 28 86 C28 72 38 50 60 50 Z"
            fill="var(--v4-accent,#38e1ff)" stroke="#0a5b80" stroke-width="3"/>
          <ellipse cx="48" cy="70" rx="9" ry="6" fill="#ffffff" opacity="0.4"/>
          <path class="cr-juv" d="M60 108 q-10 14 -20 12 q8 -6 6 -14 M60 108 q10 14 20 12 q-8 -6 -6 -14"
            fill="var(--v4-accent2,#3a6bff)" stroke="#0a5b80" stroke-width="2.2" stroke-linejoin="round"/>
          <g class="cr-adult">
            <path d="M28 84 q-12 2 -14 14 q12 -2 16 -8 z" fill="var(--v4-accent2,#3a6bff)" stroke="#0a5b80" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M92 84 q12 2 14 14 q-12 -2 -16 -8 z" fill="var(--v4-accent2,#3a6bff)" stroke="#0a5b80" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M48 50 q4 -12 12 -12 q8 0 12 12" fill="none" stroke="var(--v4-accent2,#3a6bff)" stroke-width="3" stroke-linecap="round"/>
            <circle cx="60" cy="34" r="3.5" fill="var(--v4-accent2,#3a6bff)"/>
          </g>
          <g class="cr-eyes">
            <circle class="v4-pupil" cx="51" cy="80" r="5" fill="#06303f"/>
            <circle class="v4-pupil" cx="71" cy="80" r="5" fill="#06303f"/>
            <circle cx="49" cy="78" r="1.6" fill="#fff"/><circle cx="69" cy="78" r="1.6" fill="#fff"/>
            <path d="M54 92 q6 5 12 0" fill="none" stroke="#06303f" stroke-width="2.6" stroke-linecap="round"/>
          </g>
          ${feralFace(61, 82)}
        </g>`
    },
    ember: {
      label: 'Korcuk', accent: '#ff7a2f', accent2: '#ffd23f', spark: '✸',
      abilities: { hatchling: 'Kor', juvenile: 'Alev', adult: 'Yangın' },
      quips: ['Sıcacığım, yaklaş.', 'İçimde bir ateş var!', 'Üşürsen bana sarıl.', 'Cızz! Dikkat, yakarım.'],
      svg: `
        <g class="cr">
          <g class="cr-juv">
            <path d="M86 98 q22 6 26 -6 q-10 6 -16 -2 z" fill="var(--v4-accent,#ff7a2f)" stroke="#7a2a00" stroke-width="2.5" stroke-linejoin="round"/>
            <path class="cr-flame" d="M110 92 q8 -10 2 -18 q0 8 -8 8 q6 4 6 10 z" fill="var(--v4-accent2,#ffd23f)" stroke="#ff7a2f" stroke-width="1.6"/>
          </g>
          <ellipse class="cr-body" cx="58" cy="84" rx="30" ry="27" fill="var(--v4-accent,#ff7a2f)" stroke="#7a2a00" stroke-width="3"/>
          <ellipse cx="58" cy="90" rx="15" ry="15" fill="#ffd9b0" opacity="0.7"/>
          <path class="cr-flame" d="M50 58 q-2 -22 8 -30 q-2 14 6 18 q4 -8 0 -16 q12 12 6 28 z"
            fill="var(--v4-accent2,#ffd23f)" stroke="#ff7a2f" stroke-width="2" stroke-linejoin="round"/>
          <g class="cr-adult">
            <path d="M34 70 l-8 -10 l12 4 z M30 84 l-12 -4 l12 -4 z" fill="var(--v4-accent2,#ffd23f)" stroke="#7a2a00" stroke-width="2" stroke-linejoin="round"/>
            <path d="M82 70 l8 -10 l-12 4 z" fill="var(--v4-accent2,#ffd23f)" stroke="#7a2a00" stroke-width="2" stroke-linejoin="round"/>
          </g>
          <g class="cr-eyes">
            <circle class="v4-pupil" cx="49" cy="80" r="5" fill="#3a1500"/>
            <circle class="v4-pupil" cx="69" cy="80" r="5" fill="#3a1500"/>
            <circle cx="47" cy="78" r="1.6" fill="#fff"/><circle cx="67" cy="78" r="1.6" fill="#fff"/>
            <path d="M53 92 q6 5 12 0" fill="none" stroke="#3a1500" stroke-width="2.6" stroke-linecap="round"/>
          </g>
          ${feralFace(59, 82)}
        </g>`
    },
    leaf: {
      label: 'Filizo', accent: '#5dff8f', accent2: '#2fd0a0', spark: '✿',
      abilities: { hatchling: 'Tomurcuk', juvenile: 'Sürgün', adult: 'Çiçek' },
      quips: ['Güneşi seviyorum.', 'Yavaş büyü, derin kök sal.', 'Bir yaprak, bin nefes.', 'Sula beni, çiçek açayım.'],
      svg: `
        <g class="cr">
          <ellipse class="cr-body" cx="60" cy="86" rx="28" ry="26" fill="var(--v4-accent,#5dff8f)" stroke="#1c5a2e" stroke-width="3"/>
          <ellipse cx="60" cy="90" rx="15" ry="14" fill="#e7ffe0" opacity="0.5"/>
          <path d="M60 60 v-18" stroke="#1c5a2e" stroke-width="3" stroke-linecap="round"/>
          <path class="cr-leaf" d="M60 50 q-14 -2 -18 -14 q14 -2 18 8 z" fill="var(--v4-accent,#5dff8f)" stroke="#1c5a2e" stroke-width="2.4" stroke-linejoin="round"/>
          <path class="cr-leaf" d="M60 46 q14 -4 18 -16 q-14 0 -18 10 z" fill="var(--v4-accent,#5dff8f)" stroke="#1c5a2e" stroke-width="2.4" stroke-linejoin="round"/>
          <g class="cr-juv">
            <path d="M32 84 q-14 -2 -18 8 q14 4 20 -2 z" fill="var(--v4-accent,#5dff8f)" stroke="#1c5a2e" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M88 84 q14 -2 18 8 q-14 4 -20 -2 z" fill="var(--v4-accent,#5dff8f)" stroke="#1c5a2e" stroke-width="2.2" stroke-linejoin="round"/>
          </g>
          <g class="cr-adult">
            <g fill="var(--v4-accent2,#2fd0a0)" stroke="#1c5a2e" stroke-width="1.6">
              <circle cx="60" cy="26" r="5"/><circle cx="52" cy="30" r="5"/><circle cx="68" cy="30" r="5"/>
              <circle cx="55" cy="22" r="5"/><circle cx="65" cy="22" r="5"/>
            </g>
            <circle cx="60" cy="26" r="3.4" fill="#ffd23f"/>
          </g>
          <g class="cr-eyes">
            <circle class="v4-pupil" cx="51" cy="84" r="5" fill="#103a1c"/>
            <circle class="v4-pupil" cx="71" cy="84" r="5" fill="#103a1c"/>
            <circle cx="49" cy="82" r="1.6" fill="#fff"/><circle cx="69" cy="82" r="1.6" fill="#fff"/>
            <path d="M54 95 q6 5 12 0" fill="none" stroke="#103a1c" stroke-width="2.6" stroke-linecap="round"/>
          </g>
          ${feralFace(61, 86)}
        </g>`
    },
    frost: {
      label: 'Buzcuk', accent: '#8fe9ff', accent2: '#c9b8ff', spark: '❄',
      abilities: { hatchling: 'Buz', juvenile: 'Kırağı', adult: 'Tipi' },
      quips: ['Brr... ama mutluyum.', 'Kristalim ışıkta parlar.', 'Sessizliği severim.', 'Dokun, soğuk değilim—pek.'],
      svg: `
        <g class="cr">
          <polygon class="cr-body" points="60,54 86,74 78,108 42,108 34,74" fill="var(--v4-accent,#8fe9ff)" stroke="#2a6a8a" stroke-width="3" stroke-linejoin="round"/>
          <polygon points="60,54 78,108 60,100" fill="#ffffff" opacity="0.22"/>
          <g class="cr-juv">
            <path d="M44 58 l-6 -16 l10 12 z" fill="var(--v4-accent2,#c9b8ff)" stroke="#2a6a8a" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M76 58 l6 -16 l-10 12 z" fill="var(--v4-accent2,#c9b8ff)" stroke="#2a6a8a" stroke-width="2.2" stroke-linejoin="round"/>
          </g>
          <g class="cr-adult">
            <path d="M40 56 l-10 -22 l4 12 l-10 -6 l8 14 z" fill="var(--v4-accent2,#c9b8ff)" stroke="#2a6a8a" stroke-width="2" stroke-linejoin="round"/>
            <path d="M80 56 l10 -22 l-4 12 l10 -6 l-8 14 z" fill="var(--v4-accent2,#c9b8ff)" stroke="#2a6a8a" stroke-width="2" stroke-linejoin="round"/>
          </g>
          <g class="cr-eyes">
            <circle class="v4-pupil" cx="51" cy="82" r="4.6" fill="#0a3245"/>
            <circle class="v4-pupil" cx="69" cy="82" r="4.6" fill="#0a3245"/>
            <circle cx="49" cy="80" r="1.5" fill="#fff"/><circle cx="67" cy="80" r="1.5" fill="#fff"/>
            <path d="M54 92 q6 4 12 0" fill="none" stroke="#0a3245" stroke-width="2.4" stroke-linecap="round"/>
          </g>
          ${feralFace(60, 84)}
        </g>`
    },
    luna: {
      label: 'Pufmis', accent: '#b98bff', accent2: '#ff8bd6', spark: '✦',
      abilities: { hatchling: 'Toz', juvenile: 'Pırıltı', adult: 'Ay Tozu' },
      quips: ['Ay beni çağırıyor.', 'Kanatlarım yumuşacık.', 'Geceyi fısıldarım.', 'Işığa doğru süzülelim.'],
      svg: `
        <g class="cr">
          <g class="cr-juv cr-wing">
            <path d="M44 84 q-26 -6 -28 12 q18 8 30 -4 z" fill="var(--v4-accent2,#ff8bd6)" stroke="#5a2a6a" stroke-width="2.4" stroke-linejoin="round" opacity="0.92"/>
            <path d="M76 84 q26 -6 28 12 q-18 8 -30 -4 z" fill="var(--v4-accent2,#ff8bd6)" stroke="#5a2a6a" stroke-width="2.4" stroke-linejoin="round" opacity="0.92"/>
          </g>
          <g class="cr-adult cr-wing">
            <path d="M42 78 q-34 -18 -34 6 q0 22 36 8 z" fill="var(--v4-accent2,#ff8bd6)" stroke="#5a2a6a" stroke-width="2.4" stroke-linejoin="round" opacity="0.85"/>
            <path d="M78 78 q34 -18 34 6 q0 22 -36 8 z" fill="var(--v4-accent2,#ff8bd6)" stroke="#5a2a6a" stroke-width="2.4" stroke-linejoin="round" opacity="0.85"/>
            <circle cx="22" cy="84" r="3" fill="#fff" opacity="0.8"/><circle cx="98" cy="84" r="3" fill="#fff" opacity="0.8"/>
          </g>
          <circle class="cr-body" cx="60" cy="84" r="26" fill="var(--v4-accent,#b98bff)" stroke="#3a1f55" stroke-width="3"/>
          <path d="M50 60 q-6 -14 -14 -16" fill="none" stroke="#3a1f55" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M70 60 q6 -14 14 -16" fill="none" stroke="#3a1f55" stroke-width="2.4" stroke-linecap="round"/>
          <circle cx="35" cy="43" r="3" fill="var(--v4-accent2,#ff8bd6)"/><circle cx="85" cy="43" r="3" fill="var(--v4-accent2,#ff8bd6)"/>
          <g class="cr-eyes">
            <circle class="v4-pupil" cx="51" cy="84" r="5" fill="#241033"/>
            <circle class="v4-pupil" cx="71" cy="84" r="5" fill="#241033"/>
            <circle cx="49" cy="82" r="1.6" fill="#fff"/><circle cx="69" cy="82" r="1.6" fill="#fff"/>
            <path d="M55 94 q5 4 10 0" fill="none" stroke="#241033" stroke-width="2.6" stroke-linecap="round"/>
          </g>
          ${feralFace(61, 86)}
        </g>`
    }
  };

  const skins = Object.keys(creatures);
  const DEFAULT_SKIN = 'spark';

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
      skin: skins.includes(readLS(skinKey)) ? readLS(skinKey) : DEFAULT_SKIN,
      mood: 'idle',
      stage: 'adult',   // pet bagli degilken tam formda gorunsun
      feral: false,
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

    const def = () => creatures[state.skin];

    const renderSvg = () => {
      svgWrap.innerHTML =
        `<svg viewBox="0 0 120 140" class="v4-svg" aria-hidden="true">${def().svg}</svg>`;
      char.dataset.skin = state.skin;
      char.dataset.stage = state.stage;
      char.dataset.feral = state.feral ? '1' : '0';
      char.setAttribute('aria-label', `${def().label} yaratığı`);
      char.style.setProperty('--v4-accent', def().accent);
      char.style.setProperty('--v4-accent2', def().accent2);
      char.style.setProperty('--v4-grow', GROW[state.stage] || 1);
    };

    const groundTop = () => window.innerHeight - CHAR_H - bottomGap;

    const place = (bob = 0) => {
      char.style.transform =
        `translate(${Math.round(state.x)}px, ${Math.round(bob)}px) scaleX(${state.dir < 0 ? -1 : 1})`;
      const bx = clamp(state.x + CHAR_W * 0.55, 8, window.innerWidth - 260);
      balloon.style.transform = `translate(${Math.round(bx)}px, ${Math.round(bob)}px)`;
    };

    // --- Konusma balonu (daktilo efekti) ---
    let typeTimer = 0;
    let hideTimer = 0;
    const say = (text) => {
      if (!text) return;
      window.clearInterval(typeTimer);
      window.clearTimeout(hideTimer);
      balloon.hidden = false;
      balloon.classList.add('is-on');
      balloon.classList.toggle('is-feral', state.feral);
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
          }, 2800);
        }
      }, 32);
    };

    // --- Parcacik patlamasi ---
    const burst = (count = 10) => {
      const glyph = def().spark;
      const color = state.feral ? '#ff2e5e' : def().accent2;
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
    const runMood = (mood, quiet) => {
      state.mood = mood;
      state.busy = true;
      char.classList.remove(...actions.map((a) => `is-${a}`));
      char.classList.add(`is-${mood}`);
      if (mood === 'tada' || mood === 'magic' || mood === 'morph' || mood === 'search') burst(mood === 'magic' ? 14 : 10);
      if (!quiet) {
        const quips = def().quips;
        say(quips[Math.floor(Math.random() * quips.length)]);
      }
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
      if (state.randomEnabled && !state.busy && !state.feral && ts > state.idleQuipAt) {
        const quips = def().quips;
        say(quips[Math.floor(Math.random() * quips.length)]);
        state.idleQuipAt = ts + 11000 + Math.random() * 9000;
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

    const abilityFor = (stage) => def().abilities[stage] || def().abilities.adult;

    const api = {
      version: '4.1.0',
      actions: [...actions],
      assistants: [...skins],
      assetSource: 'Convivium SVG — retro yaratiklar (synthwave/CRT)',
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
        state.skin = skins.includes(nextSkin) ? nextSkin : DEFAULT_SKIN;
        writeLS(skinKey, state.skin);
        renderSvg();
        if (state.active) { burst(8); say(def().quips[0]); }
        dispatch();
        return state.skin;
      },
      // Evrim asamasini ayarla (fiziksel form + buyume). Aninda, animasyonsuz.
      setStage(stage) {
        state.stage = STAGES.includes(stage) ? stage : 'hatchling';
        char.dataset.stage = state.stage;
        char.style.setProperty('--v4-grow', GROW[state.stage] || 1);
        dispatch();
        return state.stage;
      },
      // Canavarlasma surati (feral) ac/kapat.
      setFeral(on) {
        state.feral = Boolean(on);
        char.dataset.feral = state.feral ? '1' : '0';
        char.classList.toggle('bugy-feral', state.feral);
        dispatch();
        return state.feral;
      },
      setMood(mood) {
        // Bilgilendirici: konusmayi/davranisi pet tarafindan suruluyor.
        char.dataset.mood = mood || 'neutral';
        return mood;
      },
      // Dramatik evrim: flas + form degisimi + yeni guc replikasi.
      evolve(stage) {
        if (!state.active) this.activate();
        char.classList.add('is-evolving');
        burst(12);
        window.setTimeout(() => {
          this.setStage(stage);
        }, 680);
        window.setTimeout(() => {
          char.classList.remove('is-evolving');
          burst(14);
          say(`Yeni güç: ${abilityFor(stage)}!`);
        }, 1400);
        return state.stage;
      },
      // Disaridan (pet) baglama konusma: ihtiyac/duygu ifadesi.
      say(text) { say(text); return true; },
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
          stage: state.stage,
          feral: state.feral,
          ability: abilityFor(state.stage),
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
