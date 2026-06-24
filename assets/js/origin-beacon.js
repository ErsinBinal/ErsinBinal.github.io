/*
 * Convivium Origin Beacon
 * (c) 2026 Ersin Binal - https://ersinbinal.github.io
 *
 * Calistigi sayfanin host bilgisini Worker'a (pixel istegi olarak) bildirir.
 * Worker, host kendi allowlist'inde degilse "olasi klon" olarak loglar.
 * Tamamen pasif: hata olsa bile sayfayi asla bozmaz, oturumda bir kez calisir.
 */
(function () {
  'use strict';

  var ENDPOINT = 'https://convivium-oracle.convivium.workers.dev/beacon';
  var SESSION_KEY = 'cvm_origin_ping';

  try {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch (e) {
    // sessionStorage erisilemezse yine de tek seferlik devam et.
  }

  function ping() {
    try {
      var meta = document.querySelector('meta[name="x-convivium-origin"]');
      var id = meta ? meta.getAttribute('content') : '';
      var query =
        '?h=' + encodeURIComponent(location.hostname) +
        '&p=' + encodeURIComponent(location.protocol) +
        '&u=' + encodeURIComponent(String(location.href).slice(0, 300)) +
        '&id=' + encodeURIComponent(id || '') +
        '&r=' + encodeURIComponent(String(document.referrer || '').slice(0, 300));
      var img = new Image();
      img.src = ENDPOINT + query;
    } catch (e) {
      // Beacon hicbir kosulda sayfayi etkilemez.
    }
  }

  // Sayfa yukunu yavaslatmamak icin bos zamanda / yuk sonrasi calistir.
  if ('requestIdleCallback' in window) {
    requestIdleCallback(ping, { timeout: 4000 });
  } else {
    setTimeout(ping, 1500);
  }
})();
