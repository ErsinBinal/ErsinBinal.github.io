/**
 * Convivium - Utilities
 * Ortak yardimci fonksiyonlar
 */

(function() {
  'use strict';

  // Back to Top Button
  function initBackToTop() {
    const backToTop = document.getElementById('backToTop');
    if (!backToTop) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    }, { passive: true });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Reading Progress Bar
  function initReadingProgress() {
    const progressBar = document.getElementById('readProgressBar');
    const progress = document.getElementById('readProgress');
    if (!progressBar || !progress) return;

    let activeArticle = null;

    window.addEventListener('scroll', () => {
      if (!activeArticle) {
        // Sayfa geneli progress
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrolled = (window.scrollY / docHeight) * 100;
        progressBar.style.width = Math.min(scrolled, 100) + '%';
        return;
      }

      const rect = activeArticle.getBoundingClientRect();
      const articleTop = rect.top + window.scrollY;
      const articleHeight = rect.height;
      const windowHeight = window.innerHeight;
      const scrolled = window.scrollY - articleTop + windowHeight;
      const percentage = Math.min(Math.max((scrolled / articleHeight) * 100, 0), 100);
      progressBar.style.width = percentage + '%';
    }, { passive: true });

    // Global toggle fonksiyonu
    window.toggleProgress = (article) => {
      activeArticle = article;
      if (article) {
        progress.classList.add('active');
      } else {
        progress.classList.remove('active');
        progressBar.style.width = '0';
      }
    };
  }

  // Image Lightbox
  function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxClose = document.getElementById('lightboxClose');
    if (!lightbox || !lightboxImg) return;

    // Resme tiklandiginda ac
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('responsive') || e.target.dataset.lightbox) {
        lightboxImg.src = e.target.src;
        lightboxImg.alt = e.target.alt || '';
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });

    // Lightbox kapat
    const closeLightbox = () => {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    };

    if (lightboxClose) {
      lightboxClose.addEventListener('click', closeLightbox);
    }

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    // ESC ile kapat
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        closeLightbox();
      }
    });
  }

  // Smooth Scroll for Anchor Links
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (targetId === '#') return;

        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Focus for accessibility
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }
      });
    });
  }

  // Calculate Reading Time
  function calculateReadTime(text) {
    const words = text.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `~${minutes} dk okuma`;
  }

  // Debounce Function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle Function
  function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Safe JSON Parse
  function safeJSONParse(str, fallback = null) {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.warn('JSON parse hatasi:', e);
      return fallback;
    }
  }

  // Local Storage Helpers
  const storage = {
    get(key, fallback = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? safeJSONParse(item, fallback) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.warn('LocalStorage yazma hatasi:', e);
        return false;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  // Initialize all utilities
  function init() {
    initBackToTop();
    initReadingProgress();
    initLightbox();
    initSmoothScroll();
  }

  // DOM hazir oldugunda baslat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Global API
  window.ConviviumUtils = {
    calculateReadTime,
    debounce,
    throttle,
    safeJSONParse,
    storage
  };
})();
