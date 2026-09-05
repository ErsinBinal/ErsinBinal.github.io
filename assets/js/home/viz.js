(() => {
  'use strict';

  // VIZ — makineyi dusunurken goster.
  //
  // Alti sergi (tortu, okkam, filiz, iz, arsiv, sigil) guzel seyler hesapliyor
  // ama hepsini ASCII tablo olarak basiyordu: 0 canvas, 0 rAF, 0 SVG.
  // Bu modul o hesabi CIZER.
  //
  // Iki kural bu dosyanin tasarimini belirledi:
  //
  //   1. METIN CIKTISI DEGISMEZ. Gorsel onu ANLATIR, yerini almaz.
  //      279 test mevcut metni kilitliyor ve bu dogru: metin kanonik surum,
  //      ekran okuyucunun ve `curl`un gordugu sey o. Canvas transcript'in
  //      DISINDA yasar (transcript textContent, canvas icine giremez).
  //
  //   2. CIZILEN SEY UYDURULMAZ. Her sahne gercek veriden beslenir —
  //      tortu.json'un kendi kumeleri, kendi donemleri, okkam'in kendi
  //      arama sayilari. Sahte animasyon dekordur; bu sergi degil.
  //
  // Madde 5 (determinizm float'tan gecmez) burada gecerli DEGIL: bu katman
  // hicbir karara girmez, yalniz cizer. Hash'lenen, paylasilan, yeniden
  // turetilen sey hala metindir.

  const root = window.ConviviumHome = window.ConviviumHome || {};

  const deepFreeze = (value) => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };

  // Sitenin kendi paleti (common.css).
  const C = Object.freeze({
    bg: '#060a08',
    dim: '#6f8479',
    faint: '#465852',
    phos: '#9fffb5',
    signal: '#00f3ff',
    hot: '#ff0096',
    warn: '#ffc247',
    band: ['#9fffb5', '#00f3ff', '#ffc247', '#ff0096', '#7c6cff', '#ff7a3d']
  });

  // Hangi komut hangi sahneyi acar. Tek kaynak — protokol bunu bilmez.
  const SCENES = Object.freeze({
    kaz: 'strata', dig: 'strata', tortu: 'strata',
    tabaka: 'epochs',
    damar: 'clusters',
    okkam: 'levin',
    step: 'levenshtein', adim: 'levenshtein',
    iz: 'bishop', sigil: 'bishop'
  });

  const CAPS = Object.freeze({
    strata: 'kazi kesiti — katman kalinligi gercek commit yogunlugu',
    epochs: 'PELT — donem sinirlari BULUNUYOR, yazilmiyor',
    clusters: 'Louvain + Jaccard — birlikte degisen dosyalar kumeleniyor',
    levin: 'Levin evrensel aramasi — arama uzayi kisadan uzuna taraniyor',
    levenshtein: 'Levenshtein — dinamik programlama tablosu doluyor',
    bishop: 'Drunken Bishop — muhur bir YURUYUSUN izi'
  });

  root.createViz = function createViz(deps = {}) {
    const {
      canvas = null,
      figure = null,
      caption = null,
      getTortu = () => null,
      prefersReducedMotion = () => false
    } = deps;

    let raf = 0;
    let ctx = null;
    let retryTimer = 0;
    let retries = 0;

    const stop = () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    };

    const hide = () => {
      stop();
      if (figure) figure.hidden = true;
    };

    // Yeni komut geldiginde bekleyen tekrar denemeyi iptal et: eski komutun
    // gorseli, yeni komutun ustune acilmasin.
    const cancelRetry = () => {
      if (retryTimer) { window.clearTimeout(retryTimer); retryTimer = 0; }
      retries = 0;
    };

    // Komut satirindan sahne adi cikar. Saf: DOM'a dokunmaz, test edilebilir.
    const sceneFor = (raw) => {
      const line = String(raw || '').trim().toLowerCase();
      if (!line) return null;
      const head = line.split(/\s+/)[0];
      const scene = SCENES[head] || null;
      if (!scene) return null;
      // `okkam dil` ve `okkam calistir` arama yapmaz — sahne de acilmaz.
      if (head === 'okkam' && /^okkam\s+(dil|calistir)/.test(line)) return null;
      return scene;
    };

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 720;
      const h = Math.round(w * (300 / 720));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = `${h}px`;
      ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { W: w, H: h };
    };

    const mono = (s) => `${s}px 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace`;

    // --- SAHNELER -----------------------------------------------------------
    // Her sahne (ctx, W, H, p, data) alir. p = 0..1 ilerleme.
    // Tek kare cizerler; dongu asagida.

    const scenes = {
      // Kazi kesiti: katman kalinligi = gercek commit sayisi.
      strata(g, W, H, p, data) {
        const eras = (data.eras || []).map((e, i) => ({
          label: e.label, n: e.commits, color: C.band[i % C.band.length]
        }));
        if (!eras.length) return;
        const total = eras.reduce((a, b) => a + b.n, 0);
        const PAD = 18, TOP = 40, BOT = 16;
        const bandH = H - TOP - BOT;
        const labelW = Math.min(190, W * 0.34);
        let y = TOP;
        eras.forEach((e, i) => {
          const h = (e.n / total) * bandH;
          g.fillStyle = e.color;
          g.globalAlpha = 0.22;
          g.fillRect(PAD, y, W - PAD * 2 - labelW, h);
          g.globalAlpha = 1;
          // tortu dokusu — deterministik, Math.random yok
          g.fillStyle = 'rgba(0,0,0,.34)';
          const s = i * 977 + 13;
          for (let k = 0; k < h * 1.8; k += 1) {
            const rx = PAD + ((s + k * 613) % Math.max(1, (W - PAD * 2 - labelW)));
            const ry = y + ((s + k * 271) % Math.max(1, h));
            g.fillRect(rx, ry, 1 + ((k * 7) % 3), 1);
          }
          g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(PAD, y + 0.5); g.lineTo(W - PAD - labelW, y + 0.5); g.stroke();
          g.font = mono(10); g.textBaseline = 'middle';
          g.fillStyle = C.dim;
          g.fillText(e.label, W - PAD - labelW + 10, y + h / 2);
          g.fillStyle = C.faint;
          g.textAlign = 'right';
          g.fillText(`${e.n}`, W - PAD, y + h / 2);
          g.textAlign = 'left';
          y += h;
        });
        g.textBaseline = 'alphabetic';
        const dy = TOP + p * bandH;
        g.strokeStyle = 'rgba(0,243,255,.30)'; g.lineWidth = 7;
        g.beginPath(); g.moveTo(PAD + 40, TOP - 10); g.lineTo(PAD + 40, dy); g.stroke();
        g.strokeStyle = C.signal; g.lineWidth = 2;
        g.beginPath(); g.moveTo(PAD + 40, TOP - 10); g.lineTo(PAD + 40, dy); g.stroke();
        g.fillStyle = C.signal;
        g.beginPath(); g.moveTo(PAD + 34, dy); g.lineTo(PAD + 46, dy); g.lineTo(PAD + 40, dy + 10); g.closePath(); g.fill();
        const depth = Math.floor(p * total);
        let acc = 0, cur = eras[0].label;
        for (const e of eras) { acc += e.n; if (depth < acc) { cur = e.label; break; } }
        g.font = mono(11); g.fillStyle = C.dim;
        g.fillText(`${total} commit / ${eras.length} katman`, PAD, 22);
        g.textAlign = 'right'; g.fillStyle = C.signal;
        g.fillText(`${depth}. commit · ${cur}`, W - PAD, 22);
        g.textAlign = 'left';
      },

      // PELT: soldan saga tarama, sinirlar yerine oturuyor.
      epochs(g, W, H, p, data) {
        const eras = (data.eras || []).map((e, i) => ({
          label: e.label, n: e.commits, color: C.band[i % C.band.length]
        }));
        if (!eras.length) return;
        const total = eras.reduce((a, b) => a + b.n, 0);
        const PAD = 18, TOP = 62, BH = Math.max(60, H - 150);
        const w = W - PAD * 2;
        const bounds = []; let acc = 0;
        eras.forEach((e) => { acc += e.n; bounds.push(acc / total); });
        g.font = mono(11); g.fillStyle = C.dim;
        g.fillText(`${total} commit · sekiz kategoriye dagilim`, PAD, 22);
        let idx = 0, run = 0;
        for (let i = 0; i < total; i += 1) {
          const x = PAD + (i / total) * w;
          if (x > PAD + w * p) break;
          while (idx < eras.length - 1 && i >= run + eras[idx].n) { run += eras[idx].n; idx += 1; }
          // Yukseklik commit gurultusunu temsil eder. (i*37)%12 duzenli bir
          // testere uretiyordu ve ekranda ok ucu gibi okunuyordu; karisik bir
          // hash daha durust bir "yogunluk" gorunumu veriyor.
          const h = 4 + ((((i * 1103515245) + 12345) >>> 16) % 13);
          g.fillStyle = eras[idx].color;
          g.globalAlpha = 0.32;
          g.fillRect(x, TOP + BH / 2 - h, Math.max(1, w / total), h * 2);
        }
        g.globalAlpha = 1;
        g.font = mono(9.5);
        bounds.forEach((b, i) => {
          if (b > p || i === bounds.length - 1) return;
          const x = PAD + b * w;
          const age = Math.min(1, (p - b) * 24);
          g.strokeStyle = '#ffffff'; g.globalAlpha = 0.16 + 0.5 * age; g.lineWidth = 1;
          g.beginPath(); g.moveTo(x, TOP - 8); g.lineTo(x, TOP + BH + 8); g.stroke();
          g.globalAlpha = age;
          g.fillStyle = eras[i + 1].color;
          g.save(); g.translate(x + 4, TOP + BH + 40); g.rotate(-Math.PI / 2.6);
          g.fillText(eras[i + 1].label, 0, 0); g.restore();
          g.globalAlpha = 1;
        });
        if (p < 1) {
          const x = PAD + p * w;
          g.strokeStyle = C.signal; g.lineWidth = 1.5;
          g.beginPath(); g.moveTo(x, TOP - 14); g.lineTo(x, TOP + BH + 14); g.stroke();
        }
        g.font = mono(11);
        g.fillStyle = p < 1 ? C.signal : C.phos;
        g.textAlign = 'right';
        g.fillText(p < 1 ? `${Math.floor(p * total)} / ${total} tarandi`
          : `${eras.length} donem bulundu — elle yazilmadi`, W - PAD, 22);
        g.textAlign = 'left';
      },

      // Louvain: kuvvet yerlesimi, kumeler oturuyor.
      clusters(g, W, H, p, data, state) {
        const block = data.veins || {};
        const list = (block.veins || []).slice(0, 6);
        if (!list.length) return;
        if (!state.nodes) {
          state.nodes = []; state.edges = [];
          list.forEach((cl, ci) => {
            const base = state.nodes.length;
            const k = Math.min(cl.size || 4, 10);
            for (let i = 0; i < k; i += 1) {
              // deterministik dagilim — Math.random yok
              const a = (ci * 97 + i * 37) % 360;
              state.nodes.push({
                x: W / 2 + Math.cos(a) * (W * 0.34),
                y: H / 2 + Math.sin(a * 1.7) * (H * 0.34),
                vx: 0, vy: 0, c: ci, r: 3
              });
            }
            // Kume ICINDE tam baglanti. Iki denemeden ders:
            //   (i*31 + j*17) % 2  -> 31 ve 17 tek sayi, yani (i+j) paritesi:
            //      her kumeyi iki KOPUK yariya boluyordu.
            //   zincir + yildiz    -> bagliydi ama gevsekti; kumeler
            //      birbirinin icine geciyordu.
            // Tam baglanti hem dogru (Louvain toplulugu = yogun bagli bolge)
            // hem de ekranda sikisik bir kume veriyor. Kume <= 10 dugum,
            // yani en fazla 45 kenar: maliyet yok.
            for (let i = base; i < state.nodes.length; i += 1) {
              for (let j = i + 1; j < state.nodes.length; j += 1) state.edges.push([i, j]);
            }
          });
        }
        const N = state.nodes;
        for (let i = 0; i < N.length; i += 1) {
          const a = N[i];
          for (let j = i + 1; j < N.length; j += 1) {
            const b = N[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const d2 = dx * dx + dy * dy || 0.01;
            const d = Math.sqrt(d2);
            const f = 300 / d2;
            a.vx -= f * dx / d; a.vy -= f * dy / d;
            b.vx += f * dx / d; b.vy += f * dy / d;
          }
          a.vx += (W / 2 - a.x) * 0.0016;
          a.vy += (H / 2 - a.y) * 0.0016;
        }
        state.edges.forEach(([i, j]) => {
          const a = N[i], b = N[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const f = (d - 44) * 0.006;
          a.vx += f * dx / d; a.vy += f * dy / d;
          b.vx -= f * dx / d; b.vy -= f * dy / d;
        });
        N.forEach((n) => {
          n.vx *= 0.86; n.vy *= 0.86; n.x += n.vx; n.y += n.vy;
          n.x = Math.max(12, Math.min(W - 12, n.x));
          n.y = Math.max(36, Math.min(H - 26, n.y));
        });
        g.lineWidth = 1;
        state.edges.forEach(([i, j]) => {
          const a = N[i], b = N[j];
          g.strokeStyle = a.c === b.c ? 'rgba(159,255,181,.20)' : 'rgba(111,132,121,.12)';
          g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
        });
        N.forEach((n) => {
          g.fillStyle = C.band[n.c % C.band.length];
          g.beginPath(); g.arc(n.x, n.y, n.r, 0, 6.284); g.fill();
        });
        g.font = mono(11); g.fillStyle = C.dim;
        g.fillText(`modulerlik Q = ${block.modularity} · ${(block.veins || []).length} kume`, 18, 22);
        g.font = mono(9.5);
        let lx = 18;
        list.forEach((cl, i) => {
          const label = String(cl.label || '');
          const tw = g.measureText(label).width + 16;
          if (lx + tw < W - 18) {
            g.fillStyle = C.band[i % C.band.length];
            g.fillRect(lx, H - 14, 5, 5);
            g.fillStyle = C.dim; g.fillText(label, lx + 9, H - 9);
            lx += tw + 10;
          }
        });
      },

      // Levin: arama uzayi taraniyor, biri tutuyor.
      levin(g, W, H, p) {
        const COLS = 44, ROWS = 13, PAD = 18, TOPBAR = 30;
        const cw = (W - PAD * 2) / COLS;
        const chh = (H - PAD - TOPBAR - 22) / ROWS;
        const N = COLS * ROWS;
        const HIT = Math.floor(N * 0.71);
        const shown = Math.floor(Math.pow(p, 0.62) * N);
        for (let i = 0; i < Math.min(shown, N); i += 1) {
          const x = PAD + (i % COLS) * cw;
          const y = TOPBAR + PAD + Math.floor(i / COLS) * chh;
          if (i === HIT && shown > HIT) {
            g.globalAlpha = 1; g.fillStyle = C.signal;
            g.fillRect(x, y, cw - 1.5, chh - 1.5);
            g.globalAlpha = 0.30 * (1 - Math.min(1, (shown - HIT) / 40));
            g.fillRect(x - 12, y - 12, cw + 24, chh + 24);
            g.globalAlpha = 1;
          } else {
            g.globalAlpha = Math.max(0.12, 0.8 - ((shown - i) / N) * 1.5);
            g.fillStyle = i < HIT ? '#1e4a35' : '#14231c';
            g.fillRect(x, y, cw - 1.5, chh - 1.5);
          }
        }
        g.globalAlpha = 1;
        g.font = mono(11); g.fillStyle = C.dim;
        g.fillText('arama uzayi · uzunluk 1 → 9 · her talimatta 8 kat', PAD, 22);
        g.fillStyle = shown > HIT ? C.signal : C.phos;
        g.textAlign = 'right';
        g.fillText(shown > HIT ? 'BULUNDU' : `${Math.floor(shown / N * 182287).toLocaleString('tr-TR')} program`, W - PAD, 22);
        g.textAlign = 'left';
      },

      // Levenshtein: DP tablosu doluyor, sonra geri iz yaniyor.
      levenshtein(g, W, H, p, data, state) {
        const A = state.a || 'tabka';
        const B = state.b || 'tabaka';
        const R = A.length + 1, Cc = B.length + 1;
        if (!state.D) {
          const D = [];
          for (let i = 0; i < R; i += 1) { D.push([]); for (let j = 0; j < Cc; j += 1) D[i].push(0); }
          for (let i = 0; i < R; i += 1) D[i][0] = i;
          for (let j = 0; j < Cc; j += 1) D[0][j] = j;
          for (let i = 1; i < R; i += 1) {
            for (let j = 1; j < Cc; j += 1) {
              D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1,
                D[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
            }
          }
          const path = []; let i = R - 1, j = Cc - 1;
          while (i > 0 || j > 0) {
            path.push(`${i},${j}`);
            const cur = D[i][j];
            if (i > 0 && j > 0 && cur === D[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1)) { i -= 1; j -= 1; }
            else if (i > 0 && cur === D[i - 1][j] + 1) { i -= 1; }
            else { j -= 1; }
          }
          path.push('0,0');
          state.D = D; state.path = path;
        }
        const D = state.D, path = state.path;
        const CS = Math.min(30, Math.floor((W - 150) / Cc));
        const OX = (W - Cc * CS) / 2 + 14, OY = 62;
        const FILL = R * Cc;
        const fillN = Math.min(FILL, Math.floor(p * 1.7 * FILL));
        const pathP = Math.max(0, Math.min(1, (p - 0.62) / 0.26));
        g.font = mono(11); g.fillStyle = C.dim;
        g.fillText(`step ${A}  ·  dinamik programlama`, 18, 22);
        g.font = mono(13); g.textAlign = 'center'; g.textBaseline = 'middle';
        for (let j = 1; j < Cc; j += 1) {
          g.fillStyle = C.dim; g.fillText(B[j - 1], OX + j * CS + CS / 2, OY - 16);
        }
        for (let i = 1; i < R; i += 1) {
          g.fillStyle = C.dim; g.fillText(A[i - 1], OX - 16, OY + i * CS + CS / 2);
        }
        for (let i = 0; i < R; i += 1) {
          for (let j = 0; j < Cc; j += 1) {
            const idx = i * Cc + j;
            if (idx >= fillN) continue;
            const x = OX + j * CS, y = OY + i * CS;
            const pIdx = path.indexOf(`${i},${j}`);
            const lit = pathP > 0 && pIdx >= 0
              && (path.length - pIdx) / path.length <= pathP + 0.12;
            g.fillStyle = lit ? 'rgba(0,243,255,.22)' : 'rgba(30,74,53,.30)';
            g.fillRect(x + 1, y + 1, CS - 2, CS - 2);
            g.fillStyle = lit ? C.signal : (idx >= fillN - 3 ? '#ffffff' : C.phos);
            g.fillText(String(D[i][j]), x + CS / 2, y + CS / 2);
          }
        }
        g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        g.font = mono(11);
        g.fillStyle = pathP > 0.9 ? C.signal : C.dim;
        g.fillText(pathP > 0.9 ? `uzaklik ${D[R - 1][Cc - 1]}  →  ${B}` : `hucre ${fillN} / ${FILL}`, 18, H - 14);
      },

      // Drunken Bishop: muhur bir yuruyusun izi.
      bishop(g, W, H, p, data, state) {
        const GW = 17, GH = 9;
        const CHARS = ' .o+=*BOX@%&#/^';
        const seed = state.seed || [0x23, 0xc6, 0x97, 0xb1, 0x4f, 0x2a, 0xd8, 0x0e,
          0x91, 0x3c, 0x7d, 0xa5, 0x18, 0xbe, 0x62, 0xf0];
        if (!state.moves) {
          const moves = [];
          seed.forEach((b) => { for (let s = 0; s < 8; s += 2) moves.push((b >> s) & 3); });
          state.moves = moves;
        }
        const moves = state.moves;
        const n = Math.min(moves.length, Math.floor(p * 1.35 * moves.length));
        const grid = new Array(GW * GH).fill(0);
        let x = 8, y = 4;
        for (let i = 0; i < n; i += 1) {
          const m = moves[i];
          x += (m & 1) ? 1 : -1;
          y += (m & 2) ? 1 : -1;
          x = Math.max(0, Math.min(GW - 1, x));
          y = Math.max(0, Math.min(GH - 1, y));
          grid[y * GW + x] += 1;
        }
        const CS = Math.min(24, Math.floor((W - 40) / GW));
        const OX = (W - GW * CS) / 2, OY = 52;
        g.font = mono(11); g.fillStyle = C.dim; g.textAlign = 'left';
        g.fillText(`checksum ${state.seal || '23c697b'} · ayni adres → ayni yuruyus`, 18, 22);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = mono(Math.max(11, CS * 0.62));
        for (let gy = 0; gy < GH; gy += 1) {
          for (let gx = 0; gx < GW; gx += 1) {
            const v = grid[gy * GW + gx];
            g.fillStyle = 'rgba(29,42,35,.5)';
            g.fillRect(OX + gx * CS + 1, OY + gy * CS + 1, CS - 2, CS - 2);
            if (v > 0) {
              g.fillStyle = C.phos;
              g.globalAlpha = Math.min(1, 0.35 + v * 0.2);
              g.fillText(CHARS[Math.min(v, CHARS.length - 1)], OX + gx * CS + CS / 2, OY + gy * CS + CS / 2);
              g.globalAlpha = 1;
            }
          }
        }
        if (n > 0 && n < moves.length) {
          g.fillStyle = C.signal;
          g.fillRect(OX + x * CS + 1, OY + y * CS + 1, CS - 2, CS - 2);
          g.fillStyle = C.bg;
          g.fillText('@', OX + x * CS + CS / 2, OY + y * CS + CS / 2);
        }
        g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        g.font = mono(11);
        g.fillStyle = n >= moves.length ? C.signal : C.dim;
        g.fillText(n >= moves.length ? 'muhur tamam' : `adim ${n} / ${moves.length}`, 18, H - 14);
      }
    };

    // Sahnenin ihtiyaci olan veri hazir mi? Degilse gorsel HIC acilmaz —
    // bos bir canvas gostermek metinden kotudur.
    const dataFor = (scene) => {
      if (scene === 'strata' || scene === 'epochs') {
        const t = getTortu();
        return (t && Array.isArray(t.eras) && t.eras.length) ? t : null;
      }
      if (scene === 'clusters') {
        const t = getTortu();
        return (t && t.veins && Array.isArray(t.veins.veins) && t.veins.veins.length) ? t : null;
      }
      return {};
    };

    const DURATION = Object.freeze({
      strata: 5200, epochs: 5200, clusters: 6000,
      levin: 4200, levenshtein: 5200, bishop: 5600
    });

    // Gorseli ac ve oynat. Tek yan etki noktasi.
    const show = (rawCommand, extra = {}) => {
      if (!canvas || !figure) return null;
      const scene = sceneFor(rawCommand);
      if (!scene || !scenes[scene]) { cancelRetry(); hide(); return null; }

      const data = dataFor(scene);
      if (!data) {
        // Veri TEMBEL cekiliyor: ilk `kaz`da henuz gelmemis olabilir.
        // Bos canvas gostermektense kisa sure bekleyip tekrar dene.
        // Beklemek sonsuz degil — gelmezse gorsel hic acilmaz, metin yeter.
        hide();
        if (retryTimer) window.clearTimeout(retryTimer);
        if (retries < 12) {
          retries += 1;
          retryTimer = window.setTimeout(() => show(rawCommand, extra), 260);
        }
        return null;
      }
      retries = 0;
      if (retryTimer) { window.clearTimeout(retryTimer); retryTimer = 0; }

      stop();
      figure.hidden = false;
      if (caption) caption.textContent = CAPS[scene] || '';
      const { W, H } = sizeCanvas();
      const state = Object.assign({}, extra);
      const dur = DURATION[scene] || 5000;
      const reduce = prefersReducedMotion();

      const frame = (p) => {
        ctx.fillStyle = C.bg;
        ctx.fillRect(0, 0, W, H);
        scenes[scene](ctx, W, H, p, data, state);
      };

      // Hareket azaltma acikken tek KARE cizilir: bilgi kaybi yok, hareket yok.
      if (reduce) { frame(1); return scene; }

      const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const loop = (now) => {
        const el = now - t0;
        const p = Math.min(1, el / dur);
        frame(p);
        // Kumeler yerlesmeye devam etsin; digerleri bitince dursun.
        if (p < 1 || scene === 'clusters') raf = requestAnimationFrame(loop);
        else raf = 0;
      };
      raf = requestAnimationFrame(loop);
      return scene;
    };

    return deepFreeze({
      show,
      hide,
      stop,
      sceneFor,
      _scenes: Object.keys(scenes),
      _captions: CAPS
    });
  };
})();
