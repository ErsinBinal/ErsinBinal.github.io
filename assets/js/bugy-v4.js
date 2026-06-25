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

  // Ortak canavar (feral) "sistem arizasi" surati: kirmizi neon visor + ofkeli
  // kaslar + glitch agiz. Govde merkezine gore konumlanir.
  const feralFace = (cx, cy) => `
    <g class="cr-feral">
      <rect x="${cx - 21}" y="${cy - 8}" width="42" height="16" rx="5" fill="#16030a" stroke="#ff2e5e" stroke-width="2"/>
      <path d="M${cx - 17} ${cy - 4} l11 4 M${cx + 17} ${cy - 4} l-11 4"
        stroke="#ff2e5e" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <rect class="v4-pupil" x="${cx - 11}" y="${cy - 2}" width="7" height="7" rx="1.5" fill="#ff2e5e"/>
      <rect class="v4-pupil" x="${cx + 4}" y="${cy - 2}" width="7" height="7" rx="1.5" fill="#ff2e5e"/>
      <path d="M${cx - 11} ${cy + 13} l4 -4 l4 4 l4 -4 l4 4"
        fill="none" stroke="#ff2e5e" stroke-width="2.4" stroke-linejoin="round"/>
    </g>`;

  // --- Yaratik tanimlari ----------------------------------------------------
  // Her yaratik: label, accent (ana), accent2 (vurgu), spark (parcacik glyph),
  // abilities (asama -> guc adi), quips (kisilik replikleri), svg (katmanli).
  // SVG katmanlari: .cr-juv (genc+), .cr-adult (yetiskin), .cr-feral, .cr-eyes.
  const creatures = {
    spark: {
      label: 'Bitik', accent: '#00ff88', accent2: '#00f3ff', spark: '▚',
      abilities: { hatchling: 'Tarama', juvenile: 'Derleme', adult: 'Aşırı Yük' },
      quips: ['Önbelleğimi temizledim ama seni unutmadım.', 'Bugün 99 sekme açtın, biri de bendim.', 'Ben bulutta değilim, hep buradayım.', 'Çekirdeğim ısındı, biraz övgü iyi gelir.'],
      svg: `
        <g class="cr">
          <!-- Aperture/Portal tarzi temiz panel govde -->
          <rect class="cr-body" x="30" y="52" width="60" height="56" rx="14" fill="#e3eaf1" stroke="#16242f" stroke-width="3"/>
          <line x1="30" y1="74" x2="90" y2="74" stroke="#9fb2c4" stroke-width="2"/>
          <rect x="35" y="80" width="50" height="22" rx="6" fill="#cdd9e4" stroke="#16242f" stroke-width="1.5"/>
          <circle cx="41" cy="91" r="2.4" fill="var(--v4-accent,#00ff88)"/>
          <circle cx="49" cy="91" r="2.4" fill="var(--v4-accent2,#00f3ff)"/>
          <line class="cr-ant" x1="60" y1="52" x2="60" y2="38" stroke="#16242f" stroke-width="3" stroke-linecap="round"/>
          <circle class="cr-ant" cx="60" cy="34" r="4" fill="var(--v4-accent2,#00f3ff)" stroke="#16242f" stroke-width="2"/>
          <g class="cr-juv">
            <rect x="18" y="76" width="13" height="11" rx="3" fill="#cdd9e4" stroke="#16242f" stroke-width="2.5"/>
            <rect x="89" y="76" width="13" height="11" rx="3" fill="#cdd9e4" stroke="#16242f" stroke-width="2.5"/>
          </g>
          <g class="cr-adult">
            <ellipse cx="60" cy="30" rx="20" ry="6" fill="none" stroke="var(--v4-accent2,#00f3ff)" stroke-width="3" opacity="0.9"/>
            <circle cx="35" cy="58" r="2.4" fill="#16242f"/><circle cx="85" cy="58" r="2.4" fill="#16242f"/>
          </g>
          <g class="cr-eyes">
            <rect x="38" y="60" width="44" height="16" rx="8" fill="#0e1d27" stroke="#16242f" stroke-width="2"/>
            <rect class="v4-pupil" x="52" y="63" width="16" height="10" rx="5" fill="var(--v4-accent,#00ff88)"/>
            <circle cx="56" cy="66" r="1.6" fill="#fff"/>
          </g>
          ${feralFace(60, 68)}
        </g>`
    },
    volt: {
      label: 'Voltik', accent: '#ffd23f', accent2: '#ff4fd8', spark: '⚡',
      abilities: { hatchling: 'Kıvılcım', juvenile: 'Şok', adult: 'Yıldırım' },
      quips: ['Priz nerede? Şaka, sana bakınca şarj oluyorum.', 'Statikten saçların diken diken, kusura bakma.', 'Bugün enerjim 220 volt, sen?', 'Koşalım! Yoksa fazla mesai mi var?'],
      svg: `
        <g class="cr">
          <!-- Cyberpunk neon sasi + kablo kuyruk + tesla anten -->
          <path class="cr-juv cr-tail" d="M84 92 q24 0 24 -22 q-4 14 -16 12 q8 -8 4 -18 q-4 12 -16 14 z"
            fill="#2b2f3a" stroke="var(--v4-accent,#ffd23f)" stroke-width="2.4" stroke-linejoin="round"/>
          <rect class="cr-body" x="32" y="56" width="56" height="52" rx="14" fill="#2b2f3a" stroke="var(--v4-accent,#ffd23f)" stroke-width="3"/>
          <path d="M40 56 L34 30 L52 50 Z" fill="#2b2f3a" stroke="var(--v4-accent,#ffd23f)" stroke-width="2.6" stroke-linejoin="round"/>
          <path d="M80 56 L86 30 L68 50 Z" fill="#2b2f3a" stroke="var(--v4-accent,#ffd23f)" stroke-width="2.6" stroke-linejoin="round"/>
          <circle cx="34" cy="30" r="3" fill="var(--v4-accent2,#ff4fd8)"/><circle cx="86" cy="30" r="3" fill="var(--v4-accent2,#ff4fd8)"/>
          <rect x="40" y="84" width="40" height="16" rx="5" fill="#171a22" stroke="var(--v4-accent2,#ff4fd8)" stroke-width="1.6"/>
          <path d="M48 88 l6 8 l4 -10 l6 8" stroke="var(--v4-accent,#ffd23f)" stroke-width="2" fill="none" stroke-linejoin="round"/>
          <g class="cr-adult">
            <path d="M54 30 l8 -16 l-2 11 l6 -3 l-9 18 l2 -11 z" fill="var(--v4-accent2,#ff4fd8)" stroke="#3a0e2a" stroke-width="1.4" stroke-linejoin="round"/>
            <circle class="cr-cheek" cx="38" cy="86" r="4" fill="var(--v4-accent2,#ff4fd8)"/>
            <circle class="cr-cheek" cx="82" cy="86" r="4" fill="var(--v4-accent2,#ff4fd8)"/>
          </g>
          <g class="cr-eyes">
            <rect x="40" y="64" width="40" height="15" rx="7" fill="#12131a" stroke="var(--v4-accent,#ffd23f)" stroke-width="2"/>
            <rect class="v4-pupil" x="46" y="67" width="9" height="9" rx="2" fill="var(--v4-accent,#ffd23f)"/>
            <rect class="v4-pupil" x="65" y="67" width="9" height="9" rx="2" fill="var(--v4-accent,#ffd23f)"/>
          </g>
          ${feralFace(60, 71)}
        </g>`
    },
    aqua: {
      label: 'Glupi', accent: '#38e1ff', accent2: '#3a6bff', spark: '◌',
      abilities: { hatchling: 'Damla', juvenile: 'Kabarcık', adult: 'Dalga' },
      quips: ['Stresliysen akışına bırak, ben öyle yapıyorum.', 'Bugün biraz sulu espri yapsam?', 'Hidrasyon önemli; sen su içtin mi?', 'İçim su gibi, kafam berrak. Seninki?'],
      svg: `
        <g class="cr">
          <!-- Sogutucu/sivi muhafaza dronu: govde + sivi pencere + LED optik -->
          <rect class="cr-body" x="30" y="54" width="60" height="56" rx="20" fill="#16323f" stroke="var(--v4-accent,#38e1ff)" stroke-width="3"/>
          <rect x="38" y="62" width="44" height="42" rx="14" fill="#0b2530" stroke="#0a5b80" stroke-width="2"/>
          <rect x="40" y="90" width="40" height="12" rx="3" fill="var(--v4-accent,#38e1ff)" opacity="0.5"/>
          <path d="M40 90 q10 -6 20 0 q10 6 20 0" fill="none" stroke="var(--v4-accent,#38e1ff)" stroke-width="2"/>
          <path class="cr-juv" d="M60 110 q-9 12 -18 11 q7 -5 5 -12 M60 110 q9 12 18 11 q-7 -5 -5 -12"
            fill="var(--v4-accent2,#3a6bff)" stroke="#0a5b80" stroke-width="2.2" stroke-linejoin="round"/>
          <g class="cr-adult">
            <path d="M30 80 q-12 0 -14 12 q12 2 16 -4 z" fill="#16323f" stroke="var(--v4-accent,#38e1ff)" stroke-width="2.2" stroke-linejoin="round"/>
            <path d="M90 80 q12 0 14 12 q-12 2 -16 -4 z" fill="#16323f" stroke="var(--v4-accent,#38e1ff)" stroke-width="2.2" stroke-linejoin="round"/>
            <rect x="52" y="44" width="16" height="10" rx="3" fill="#16323f" stroke="var(--v4-accent,#38e1ff)" stroke-width="2"/>
            <line x1="60" y1="44" x2="60" y2="34" stroke="var(--v4-accent,#38e1ff)" stroke-width="2.4"/>
            <circle cx="60" cy="31" r="3.4" fill="var(--v4-accent2,#3a6bff)"/>
          </g>
          <g class="cr-eyes">
            <circle class="v4-pupil" cx="52" cy="78" r="5" fill="#eafcff"/>
            <circle cx="52" cy="78" r="2.2" fill="#0a3a4a"/>
            <circle class="v4-pupil" cx="70" cy="78" r="5" fill="#eafcff"/>
            <circle cx="70" cy="78" r="2.2" fill="#0a3a4a"/>
          </g>
          ${feralFace(61, 78)}
        </g>`
    },
    ember: {
      label: 'Korcuk', accent: '#ff7a2f', accent2: '#ffd23f', spark: '✸',
      abilities: { hatchling: 'Kor', juvenile: 'Alev', adult: 'Yangın' },
      quips: ['İçimde bir ateş var, umarım deadline değildir.', 'Üşüdüysen sarıl; faturası bedava.', 'Bugün biraz kıvılcımlıyım, dikkat.', 'Soğuk kahve içme, bana ver ısıtayım.'],
      svg: `
        <g class="cr">
          <!-- Half-Life tarzi reaktor bot: tehlike seridi + kor cekirdek vent -->
          <g class="cr-juv">
            <path d="M84 96 q22 4 26 -8 q-10 6 -16 -2 z" fill="#3a2418" stroke="var(--v4-accent,#ff7a2f)" stroke-width="2.4" stroke-linejoin="round"/>
            <path class="cr-flame" d="M110 90 q8 -10 2 -18 q0 8 -8 8 q6 4 6 10 z" fill="var(--v4-accent2,#ffd23f)" stroke="#ff7a2f" stroke-width="1.6"/>
          </g>
          <rect class="cr-body" x="30" y="56" width="58" height="52" rx="13" fill="#33271c" stroke="var(--v4-accent,#ff7a2f)" stroke-width="3"/>
          <path d="M34 101 l8 -8 M44 101 l8 -8 M54 101 l8 -8 M64 101 l8 -8 M74 101 l8 -8" stroke="var(--v4-accent2,#ffd23f)" stroke-width="3"/>
          <circle class="cr-flame" cx="59" cy="86" r="9" fill="var(--v4-accent2,#ffd23f)" opacity="0.85"/>
          <circle cx="59" cy="86" r="9" fill="none" stroke="var(--v4-accent,#ff7a2f)" stroke-width="2"/>
          <path class="cr-flame" d="M50 56 q-2 -20 9 -28 q-2 13 6 16 q4 -7 0 -14 q11 11 5 26 z"
            fill="var(--v4-accent2,#ffd23f)" stroke="#ff7a2f" stroke-width="2" stroke-linejoin="round"/>
          <g class="cr-adult">
            <rect x="25" y="62" width="6" height="16" rx="2" fill="#33271c" stroke="var(--v4-accent,#ff7a2f)" stroke-width="2"/>
            <rect x="87" y="62" width="6" height="16" rx="2" fill="#33271c" stroke="var(--v4-accent,#ff7a2f)" stroke-width="2"/>
          </g>
          <g class="cr-eyes">
            <rect x="40" y="62" width="38" height="14" rx="6" fill="#160c06" stroke="var(--v4-accent,#ff7a2f)" stroke-width="2"/>
            <circle class="v4-pupil" cx="50" cy="69" r="4.4" fill="var(--v4-accent2,#ffd23f)"/>
            <circle class="v4-pupil" cx="68" cy="69" r="4.4" fill="var(--v4-accent2,#ffd23f)"/>
          </g>
          ${feralFace(59, 69)}
        </g>`
    },
    leaf: {
      label: 'Filizo', accent: '#5dff8f', accent2: '#2fd0a0', spark: '✿',
      abilities: { hatchling: 'Tomurcuk', juvenile: 'Sürgün', adult: 'Çiçek' },
      quips: ['Acele etme, ben bile yavaş büyüyorum.', 'Bugün fotosentez yaptım, ya sen?', 'Beni sulamayı unutma, sevgi de su sayılır.', 'Köklerim derin, dostluğumuz da öyle.'],
      svg: `
        <g class="cr">
          <!-- Hidroponik terraryum dronu: cam kubbe filiz + panel + visor -->
          <rect class="cr-body" x="32" y="68" width="56" height="42" rx="14" fill="#15301f" stroke="var(--v4-accent,#5dff8f)" stroke-width="3"/>
          <path d="M40 68 a20 20 0 0 1 40 0 z" fill="#0e261a" stroke="var(--v4-accent,#5dff8f)" stroke-width="2"/>
          <path d="M40 68 a20 20 0 0 1 40 0" fill="none" stroke="#bff7d0" stroke-width="1.4" opacity="0.4"/>
          <path d="M60 66 v-12" stroke="var(--v4-accent,#5dff8f)" stroke-width="2.6" stroke-linecap="round"/>
          <path class="cr-leaf" d="M60 58 q-10 -1 -13 -10 q10 -1 13 6 z" fill="var(--v4-accent,#5dff8f)" stroke="#1c5a2e" stroke-width="1.8" stroke-linejoin="round"/>
          <path class="cr-leaf" d="M60 55 q10 -3 13 -11 q-10 0 -13 7 z" fill="var(--v4-accent,#5dff8f)" stroke="#1c5a2e" stroke-width="1.8" stroke-linejoin="round"/>
          <rect x="42" y="98" width="36" height="8" rx="3" fill="#0e261a" stroke="var(--v4-accent2,#2fd0a0)" stroke-width="1.4"/>
          <circle cx="48" cy="102" r="2" fill="var(--v4-accent,#5dff8f)"/>
          <g class="cr-juv">
            <rect x="20" y="84" width="13" height="9" rx="3" fill="#15301f" stroke="var(--v4-accent,#5dff8f)" stroke-width="2.2"/>
            <rect x="87" y="84" width="13" height="9" rx="3" fill="#15301f" stroke="var(--v4-accent,#5dff8f)" stroke-width="2.2"/>
          </g>
          <g class="cr-adult">
            <g fill="var(--v4-accent2,#2fd0a0)" stroke="#1c5a2e" stroke-width="1.4">
              <circle cx="60" cy="40" r="4.4"/><circle cx="53" cy="44" r="4.4"/><circle cx="67" cy="44" r="4.4"/>
            </g>
            <circle cx="60" cy="42" r="2.6" fill="var(--v4-accent,#5dff8f)"/>
          </g>
          <g class="cr-eyes">
            <rect x="40" y="76" width="40" height="14" rx="6" fill="#0c1f14" stroke="var(--v4-accent,#5dff8f)" stroke-width="2"/>
            <circle class="v4-pupil" cx="51" cy="83" r="4.4" fill="var(--v4-accent,#5dff8f)"/>
            <circle class="v4-pupil" cx="69" cy="83" r="4.4" fill="var(--v4-accent,#5dff8f)"/>
          </g>
          ${feralFace(60, 83)}
        </g>`
    },
    frost: {
      label: 'Buzcuk', accent: '#8fe9ff', accent2: '#c9b8ff', spark: '❄',
      abilities: { hatchling: 'Buz', juvenile: 'Kırağı', adult: 'Tipi' },
      quips: ['Soğukkanlı kal, benden öğren.', 'Buz gibiyim ama kalbim sıcak, klişe oldu.', 'Mola? Ben buzlu olanı tercih ederim.', 'Sessizlik güzeldir, ama seninle gürültü de iyi.'],
      svg: `
        <g class="cr">
          <!-- Kriyo unitesi: kristal sasi + sogutma finleri + LED optik -->
          <polygon class="cr-body" points="60,54 86,72 80,106 40,106 34,72" fill="#16384a" stroke="var(--v4-accent,#8fe9ff)" stroke-width="3" stroke-linejoin="round"/>
          <polygon points="60,54 80,106 60,98" fill="#bdf0ff" opacity="0.14"/>
          <line x1="44" y1="92" x2="76" y2="92" stroke="var(--v4-accent,#8fe9ff)" stroke-width="1.6" opacity="0.7"/>
          <line x1="46" y1="98" x2="74" y2="98" stroke="var(--v4-accent,#8fe9ff)" stroke-width="1.6" opacity="0.7"/>
          <g class="cr-juv">
            <path d="M44 58 l-6 -15 l11 11 z" fill="var(--v4-accent2,#c9b8ff)" stroke="#2a6a8a" stroke-width="2" stroke-linejoin="round"/>
            <path d="M76 58 l6 -15 l-11 11 z" fill="var(--v4-accent2,#c9b8ff)" stroke="#2a6a8a" stroke-width="2" stroke-linejoin="round"/>
          </g>
          <g class="cr-adult">
            <path d="M40 56 l-10 -22 l4 12 l-10 -6 l8 14 z" fill="var(--v4-accent2,#c9b8ff)" stroke="#2a6a8a" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="M80 56 l10 -22 l-4 12 l10 -6 l-8 14 z" fill="var(--v4-accent2,#c9b8ff)" stroke="#2a6a8a" stroke-width="1.8" stroke-linejoin="round"/>
            <circle cx="48" cy="100" r="2" fill="var(--v4-accent,#8fe9ff)"/><circle cx="72" cy="100" r="2" fill="var(--v4-accent2,#c9b8ff)"/>
          </g>
          <g class="cr-eyes">
            <rect x="42" y="74" width="36" height="14" rx="6" fill="#08222e" stroke="var(--v4-accent,#8fe9ff)" stroke-width="2"/>
            <circle class="v4-pupil" cx="52" cy="81" r="4.2" fill="var(--v4-accent,#8fe9ff)"/>
            <circle class="v4-pupil" cx="68" cy="81" r="4.2" fill="var(--v4-accent,#8fe9ff)"/>
          </g>
          ${feralFace(60, 81)}
        </g>`
    },
    luna: {
      label: 'Pufmis', accent: '#b98bff', accent2: '#ff8bd6', spark: '✦',
      abilities: { hatchling: 'Toz', juvenile: 'Pırıltı', adult: 'Ay Tozu' },
      quips: ['Gece kuşusun, ben de. İyi ekip olduk.', 'Ay ışığında daha komiğim, denesene.', 'Rüyanda beni gördün mü? Ben seni gördüm.', 'Kanatlarım var ama yine de yanında kalıyorum.'],
      svg: `
        <g class="cr">
          <!-- Kesif holo-dronu: neon hologram kanatlar + anten + buyuk optik -->
          <g class="cr-juv cr-wing">
            <path d="M46 84 q-28 -8 -30 12 q20 8 32 -4 z" fill="var(--v4-accent2,#ff8bd6)" stroke="#5a2a6a" stroke-width="2.2" stroke-linejoin="round" opacity="0.55"/>
            <path d="M74 84 q28 -8 30 12 q-20 8 -32 -4 z" fill="var(--v4-accent2,#ff8bd6)" stroke="#5a2a6a" stroke-width="2.2" stroke-linejoin="round" opacity="0.55"/>
          </g>
          <g class="cr-adult cr-wing">
            <path d="M44 80 q-36 -18 -36 8 q0 22 38 6 z" fill="var(--v4-accent2,#ff8bd6)" stroke="#5a2a6a" stroke-width="2.2" stroke-linejoin="round" opacity="0.45"/>
            <path d="M76 80 q36 -18 36 8 q0 22 -38 6 z" fill="var(--v4-accent2,#ff8bd6)" stroke="#5a2a6a" stroke-width="2.2" stroke-linejoin="round" opacity="0.45"/>
            <circle cx="20" cy="84" r="3" fill="#fff" opacity="0.8"/><circle cx="100" cy="84" r="3" fill="#fff" opacity="0.8"/>
          </g>
          <rect class="cr-body" x="36" y="64" width="48" height="44" rx="16" fill="#241a33" stroke="var(--v4-accent,#b98bff)" stroke-width="3"/>
          <path d="M50 64 q-6 -14 -14 -16" fill="none" stroke="var(--v4-accent,#b98bff)" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M70 64 q6 -14 14 -16" fill="none" stroke="var(--v4-accent,#b98bff)" stroke-width="2.2" stroke-linecap="round"/>
          <circle cx="35" cy="46" r="3" fill="var(--v4-accent2,#ff8bd6)"/><circle cx="85" cy="46" r="3" fill="var(--v4-accent2,#ff8bd6)"/>
          <circle cx="48" cy="102" r="2" fill="var(--v4-accent,#b98bff)"/><circle cx="72" cy="102" r="2" fill="var(--v4-accent2,#ff8bd6)"/>
          <g class="cr-eyes">
            <rect x="44" y="74" width="32" height="18" rx="9" fill="#120a1c" stroke="var(--v4-accent,#b98bff)" stroke-width="2"/>
            <circle class="v4-pupil" cx="60" cy="83" r="6" fill="var(--v4-accent2,#ff8bd6)"/>
            <circle cx="57" cy="80" r="1.8" fill="#fff"/>
          </g>
          ${feralFace(60, 83)}
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

    // Yaratigin SVG icindeki gercek tepe noktasi (viewBox birimi). Asama/feral
    // ile gorunen uzuvlar degistikce olculur; baloncuk buna gore hizalanir.
    let headY = 14;
    const VB_H = 140;
    const measureHead = () => {
      const svg = svgWrap.querySelector('svg');
      if (!svg || !svg.getBBox) return;
      try {
        const bb = svg.getBBox();           // gizliyken (display:none) 0 doner
        if (bb && bb.height > 0) headY = clamp(bb.y, 0, VB_H - 10);
      } catch { /* layer gizliyken olcum yapilamaz; onceki degeri koru */ }
    };

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
      measureHead();
    };

    const groundTop = () => window.innerHeight - CHAR_H - bottomGap;

    const place = (bob = 0) => {
      char.style.transform =
        `translate(${Math.round(state.x)}px, ${Math.round(bob)}px) scaleX(${state.dir < 0 ? -1 : 1})`;
      // Dikey: baloncugu yaratigin gercek tepe noktasinin hemen ustune koy
      // (buyume + tur + asama duyarli). Yatay: kuyrugu (left:26px) merkeze denk getir.
      const grow = GROW[state.stage] || 1;
      const headFromBottom = bottomGap + CHAR_H * (1 - headY / VB_H) * grow;
      balloon.style.bottom = `${Math.round(headFromBottom + 8)}px`;
      // Yatay: baloncugu yaratigin uzerinde ortala; ekran kenarinda govdeyi
      // iceride tut ama KUYRUGU yaratik merkezine sabitle (kopma olmasin).
      if (!balloon.hidden) {
        const centerX = state.x + CHAR_W / 2;
        const w = balloon.offsetWidth || 180;
        const left = clamp(centerX - w / 2, 8, window.innerWidth - w - 8);
        const tailX = clamp(centerX - left, 18, Math.max(18, w - 18));
        balloon.style.transform = `translate(${Math.round(left)}px, ${Math.round(bob)}px)`;
        balloon.style.setProperty('--v4-tail', `${Math.round(tailX)}px`);
      }
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
      // Pet (v4) aktifken Bugy Classic (v1) susturulur. Classic'i kullanmak
      // isteyen, motor secimiyle (Bugy Studio) v1'e gecer — secim kullanicinin.
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
        measureHead(); // gorunur olduktan sonra dogru olcum
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
        measureHead(); // gorunur uzuvlar degisti -> baloncuk hizasi guncellensin
        dispatch();
        return state.stage;
      },
      // Canavarlasma surati (feral) ac/kapat.
      setFeral(on) {
        state.feral = Boolean(on);
        char.dataset.feral = state.feral ? '1' : '0';
        char.classList.toggle('bugy-feral', state.feral);
        measureHead();
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
      // Yaratigin kendi kisilik replikinden birini soyle.
      quip() {
        const quips = def().quips;
        const line = quips[Math.floor(Math.random() * quips.length)];
        say(line);
        return line;
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
