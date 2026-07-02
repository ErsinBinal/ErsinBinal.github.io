(() => {
  if (!('serviceWorker' in navigator)) return;

  // "Yeni surum hazir" cipi: SW artik kosulsuz skipWaiting yapmiyor;
  // kullanici cipe tiklayinca SKIP_WAITING gonderilir ve sayfa yenilenir.
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  function showUpdateChip(reg) {
    if (!reg.waiting || document.getElementById('sw-update-chip')) return;

    const style = document.createElement('style');
    style.textContent = [
      '#sw-update-chip{position:fixed;right:16px;bottom:16px;z-index:9500;',
      'display:flex;align-items:center;gap:10px;padding:10px 14px;',
      'background:rgba(10,14,26,.94);border:1px solid rgba(0,255,204,.45);',
      'border-radius:10px;box-shadow:0 0 18px rgba(0,255,204,.25);',
      "color:#e6fff8;font:13px/1.4 'Courier New',monospace;}",
      '#sw-update-chip button{cursor:pointer;border-radius:6px;padding:5px 10px;',
      "font:inherit;border:1px solid rgba(0,255,204,.6);}",
      '#sw-update-chip .sw-chip-go{background:rgba(0,255,204,.15);color:#7dffe0;}',
      '#sw-update-chip .sw-chip-x{background:none;border-color:transparent;color:#8899aa;}',
      '@media (prefers-reduced-motion:no-preference){#sw-update-chip{animation:swChipIn .3s ease;}',
      '@keyframes swChipIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}}'
    ].join('');
    document.head.appendChild(style);

    const chip = document.createElement('div');
    chip.id = 'sw-update-chip';
    chip.setAttribute('role', 'status');
    chip.innerHTML =
      '<span>yeni sürüm hazır</span>' +
      '<button type="button" class="sw-chip-go">yenile</button>' +
      '<button type="button" class="sw-chip-x" aria-label="kapat">×</button>';
    chip.querySelector('.sw-chip-go').addEventListener('click', () => {
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      chip.remove();
    });
    chip.querySelector('.sw-chip-x').addEventListener('click', () => chip.remove());
    document.body.appendChild(chip);
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => {
        // Sayfa acildiginda zaten bekleyen surum varsa hemen goster.
        if (reg.waiting && navigator.serviceWorker.controller) showUpdateChip(reg);
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            // controller yoksa ilk kurulumdur; cip gerekmez.
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateChip(reg);
            }
          });
        });
      })
      .catch(err => console.warn('[SW] Registration failed:', err));
  });
})();
