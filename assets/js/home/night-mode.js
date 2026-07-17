/**
 * Convivium - Gece frekansi (00:00-05:59 yerel saat)
 * Gece saatlerinde body'ye is-night-frequency sinifi ekler: soluk/alcak
 * kontrast palet, HUD'a "low frequency" satiri ve yalnizca gece gorunen
 * kucuk bir kapi (drawer-link). Dakikada bir kontrol eder.
 * createNightMode(deps) fabrikasi ile kurulur.
 * (c) 2026 Ersin Binal - https://ersinbinal.github.io
 */
(() => {
  window.ConviviumHome = window.ConviviumHome || {};

  window.ConviviumHome.createNightMode = (deps = {}) => {
    const { onChange } = deps;

    let timer = null;
    let lastState = null;

    const isNightHour = () => {
      const hour = new Date().getHours();
      return hour >= 0 && hour < 6;
    };

    const updateHud = (night) => {
      const hud = document.querySelector('.system-hud');
      const existing = document.getElementById('hud-night');
      if (night && hud && !existing) {
        const line = document.createElement('div');
        line.className = 'hud-line night-pulse';
        line.id = 'hud-night';
        const label = document.createElement('span');
        label.textContent = 'Freq';
        const value = document.createElement('strong');
        value.className = 'hud-value';
        value.textContent = 'low frequency';
        line.append(label, value);
        hud.appendChild(line);
      } else if (!night && existing) {
        existing.remove();
      }
    };

    const apply = () => {
      const night = isNightHour();
      if (night === lastState) return;
      lastState = night;
      document.body.classList.toggle('is-night-frequency', night);
      updateHud(night);
      try { onChange?.(night); } catch { /* gece gecisi deneyimi bozmasin */ }
    };

    const start = () => {
      apply();
      if (timer) window.clearInterval(timer);
      timer = window.setInterval(apply, 60000);
    };

    return {
      start,
      isNight: isNightHour
    };
  };
})();
