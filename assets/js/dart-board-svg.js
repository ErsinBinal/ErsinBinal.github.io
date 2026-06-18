/**
 * Convivium Dart Board — interaktif SVG dart tahtası.
 *
 * Mevcut keypad/manuel girişi BOZMADAN sayfaya görsel bir giriş katmanı ekler.
 * Bir segmente tıklanınca onSelect callback'i { value, isDouble, segment, label }
 * ile çağrılır; skorbord bu veriyi normal addDart akışına besler.
 *
 * Geometri, convivium-darts/src/engine/cpu/geometry.ts referansından uyarlanmıştır.
 * Kanonik segment kodları: S1..S20, D1..D20, T1..T20, OUTER_BULL (25), BULL (50), MISS.
 *
 * Kullanım:
 *   ConviviumDartBoard.create(svgElement, (dart) => addDart(dart.value, dart));
 */
(function () {
  'use strict';

  // Saat yönünde 12'den (tepe) başlayan standart sektör dizilimi.
  var SECTOR_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

  // Yarıçaplar (viewBox -200..200). Standart tahta oranlarına yakın.
  var R = {
    innerBull: 11,   // double bull (50)
    outerBull: 27,   // single bull (25)
    trebleIn: 99,
    trebleOut: 107,
    doubleIn: 162,
    doubleOut: 170
  };

  var SVG_NS = 'http://www.w3.org/2000/svg';

  // Açı: tepeden saat yönünde derece. SVG'de y aşağı arttığı için dönüşüm:
  function polar(r, angleDeg) {
    var t = (angleDeg * Math.PI) / 180;
    return { x: r * Math.sin(t), y: -r * Math.cos(t) };
  }

  function wedgePath(r1, r2, a1, a2) {
    var p1 = polar(r2, a1);
    var p2 = polar(r2, a2);
    var p3 = polar(r1, a2);
    var p4 = polar(r1, a1);
    return [
      'M', p1.x.toFixed(2), p1.y.toFixed(2),
      'A', r2, r2, 0, 0, 1, p2.x.toFixed(2), p2.y.toFixed(2),
      'L', p3.x.toFixed(2), p3.y.toFixed(2),
      'A', r1, r1, 0, 0, 0, p4.x.toFixed(2), p4.y.toFixed(2),
      'Z'
    ].join(' ');
  }

  function el(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs).forEach(function (key) {
      node.setAttribute(key, String(attrs[key]));
    });
    return node;
  }

  function makePath(d, cls, data) {
    var node = el('path', { d: d, class: cls });
    node.setAttribute('data-segment', data.segment);
    node.setAttribute('data-value', String(data.value));
    node.setAttribute('data-double', data.isDouble ? '1' : '0');
    node.setAttribute('data-label', data.label);
    node.setAttribute('tabindex', '0');
    node.setAttribute('role', 'button');
    node.setAttribute('aria-label', data.label + ' (' + data.value + ' puan)');
    return node;
  }

  function buildBoard(svg) {
    svg.setAttribute('viewBox', '-200 -200 400 400');
    svg.setAttribute('class', 'dart-board-svg');
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'Dart tahtası, segmente tıklayarak skor girin');
    svg.replaceChildren();

    // Arka plan dış halka.
    svg.appendChild(el('circle', { cx: 0, cy: 0, r: 196, class: 'db-frame' }));

    SECTOR_ORDER.forEach(function (num, i) {
      var center = i * 18;          // sektör merkez açısı (tepeden saat yönü)
      var a1 = center - 9;
      var a2 = center + 9;
      var parity = i % 2 === 0 ? 'a' : 'b'; // tek/çift renklendirme

      // İç single (bull dışından treble içine)
      svg.appendChild(makePath(wedgePath(R.outerBull, R.trebleIn, a1, a2), 'db-single db-' + parity, {
        segment: 'S' + num, value: num, isDouble: false, label: num + ' (tek)'
      }));
      // Treble
      svg.appendChild(makePath(wedgePath(R.trebleIn, R.trebleOut, a1, a2), 'db-treble db-' + parity, {
        segment: 'T' + num, value: num * 3, isDouble: false, label: 'Triple ' + num
      }));
      // Dış single
      svg.appendChild(makePath(wedgePath(R.trebleOut, R.doubleIn, a1, a2), 'db-single db-' + parity, {
        segment: 'S' + num, value: num, isDouble: false, label: num + ' (tek)'
      }));
      // Double
      svg.appendChild(makePath(wedgePath(R.doubleIn, R.doubleOut, a1, a2), 'db-double db-' + parity, {
        segment: 'D' + num, value: num * 2, isDouble: true, label: 'Double ' + num
      }));

      // Sayı etiketi
      var labelPos = polar(184, center);
      var label = el('text', {
        x: labelPos.x.toFixed(1), y: labelPos.y.toFixed(1),
        class: 'db-num', 'text-anchor': 'middle', 'dominant-baseline': 'central'
      });
      label.textContent = String(num);
      svg.appendChild(label);
    });

    // Outer bull (25)
    var outerBull = el('circle', { cx: 0, cy: 0, r: R.outerBull, class: 'db-bull-outer' });
    outerBull.setAttribute('data-segment', 'OUTER_BULL');
    outerBull.setAttribute('data-value', '25');
    outerBull.setAttribute('data-double', '0');
    outerBull.setAttribute('data-label', 'Bull (25)');
    outerBull.setAttribute('tabindex', '0');
    outerBull.setAttribute('role', 'button');
    outerBull.setAttribute('aria-label', 'Bull, 25 puan');
    svg.appendChild(outerBull);

    // Inner bull (50, double)
    var innerBull = el('circle', { cx: 0, cy: 0, r: R.innerBull, class: 'db-bull-inner' });
    innerBull.setAttribute('data-segment', 'BULL');
    innerBull.setAttribute('data-value', '50');
    innerBull.setAttribute('data-double', '1');
    innerBull.setAttribute('data-label', 'Bullseye (50)');
    innerBull.setAttribute('tabindex', '0');
    innerBull.setAttribute('role', 'button');
    innerBull.setAttribute('aria-label', 'Bullseye, 50 puan');
    svg.appendChild(innerBull);
  }

  function create(svg, onSelect) {
    if (!svg) return null;
    buildBoard(svg);

    function emit(target) {
      if (!target || !target.dataset || !target.dataset.segment) return;
      if (typeof onSelect !== 'function') return;
      onSelect({
        value: Number(target.dataset.value),
        isDouble: target.dataset.double === '1',
        segment: target.dataset.segment,
        label: target.dataset.label
      });
    }

    function handle(event) {
      var target = event.target.closest('[data-segment]');
      emit(target);
    }

    svg.addEventListener('click', handle);
    svg.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      var target = event.target.closest('[data-segment]');
      if (target) {
        event.preventDefault();
        emit(target);
      }
    });

    return {
      setEnabled: function (enabled) {
        svg.classList.toggle('is-disabled', !enabled);
      }
    };
  }

  window.ConviviumDartBoard = { create: create, SECTOR_ORDER: SECTOR_ORDER };
})();
