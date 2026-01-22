/**
 * Convivium - Theme Manager
 * Tema yonetimi ve kullanici tercihleri
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'convivium-theme';
  const THEMES = {
    dark: {
      '--color-bg': '#000',
      '--color-bg-card': '#0b0b0b',
      '--color-primary': '#00ff00',
      '--color-primary-dim': '#007700',
      '--color-text': '#9fffb5'
    },
    green: {
      '--color-bg': '#001a00',
      '--color-bg-card': '#002200',
      '--color-primary': '#00ff00',
      '--color-primary-dim': '#007700',
      '--color-text': '#9fffb5'
    },
    blue: {
      '--color-bg': '#000a1a',
      '--color-bg-card': '#001122',
      '--color-primary': '#00f3ff',
      '--color-primary-dim': '#0077aa',
      '--color-text': '#9ff5ff'
    },
    amber: {
      '--color-bg': '#0a0800',
      '--color-bg-card': '#121008',
      '--color-primary': '#ffaa00',
      '--color-primary-dim': '#885500',
      '--color-text': '#ffe5b5'
    }
  };

  // Mevcut temayi al
  function getCurrentTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'dark';
    } catch (e) {
      return 'dark';
    }
  }

  // Temayi kaydet
  function saveTheme(themeName) {
    try {
      localStorage.setItem(STORAGE_KEY, themeName);
    } catch (e) {
      console.warn('Tema kaydedilemedi:', e);
    }
  }

  // Temayi uygula
  function applyTheme(themeName) {
    const theme = THEMES[themeName];
    if (!theme) {
      console.warn('Bilinmeyen tema:', themeName);
      return;
    }

    const root = document.documentElement;
    Object.entries(theme).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    document.body.dataset.theme = themeName;
    saveTheme(themeName);

    // Tema degisiklik eventi gonder
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: themeName } }));
  }

  // Temayi degistir
  function toggleTheme() {
    const themeNames = Object.keys(THEMES);
    const currentIndex = themeNames.indexOf(getCurrentTheme());
    const nextIndex = (currentIndex + 1) % themeNames.length;
    applyTheme(themeNames[nextIndex]);
  }

  // Reduced motion tercihini kontrol et
  function checkReducedMotion() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function handleChange(e) {
      if (e.matches) {
        document.body.classList.add('reduced-motion');
      } else {
        document.body.classList.remove('reduced-motion');
      }
    }

    handleChange(prefersReducedMotion);
    prefersReducedMotion.addEventListener('change', handleChange);
  }

  // Baslangicta temayi yükle
  function init() {
    const savedTheme = getCurrentTheme();
    applyTheme(savedTheme);
    checkReducedMotion();
  }

  // DOM hazir oldugunda baslat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Global API
  window.ConviviumTheme = {
    apply: applyTheme,
    toggle: toggleTheme,
    current: getCurrentTheme,
    themes: Object.keys(THEMES)
  };
})();
