/**
 * Convivium - Lazy Load
 * Gorsel ve iframe icin lazy loading destegi
 */

(function() {
  'use strict';

  // Native lazy loading destegi varsa kullan
  if ('loading' in HTMLImageElement.prototype) {
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
      }
    });
    return;
  }

  // IntersectionObserver destegi yoksa cik
  if (!('IntersectionObserver' in window)) {
    console.warn('IntersectionObserver desteklenmiyor, lazy loading devre disi.');
    return;
  }

  // Lazy load observer
  const lazyObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;

        // Resimler icin
        if (element.tagName === 'IMG') {
          if (element.dataset.src) {
            element.src = element.dataset.src;
            element.removeAttribute('data-src');
          }
          if (element.dataset.srcset) {
            element.srcset = element.dataset.srcset;
            element.removeAttribute('data-srcset');
          }
        }

        // Iframe'ler icin
        if (element.tagName === 'IFRAME') {
          if (element.dataset.src) {
            element.src = element.dataset.src;
            element.removeAttribute('data-src');
          }
        }

        // Background image icin
        if (element.dataset.bg) {
          element.style.backgroundImage = `url(${element.dataset.bg})`;
          element.removeAttribute('data-bg');
        }

        element.classList.add('loaded');
        observer.unobserve(element);
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01
  });

  // Sayfa yuklendikten sonra calistir
  function initLazyLoad() {
    // Tum lazy elementleri bul
    const lazyElements = document.querySelectorAll(
      'img[data-src], img[loading="lazy"], iframe[data-src], [data-bg]'
    );

    lazyElements.forEach(element => {
      // Native lazy loading icin loading attribute ekle
      if (element.tagName === 'IMG' && !element.hasAttribute('loading')) {
        element.setAttribute('loading', 'lazy');
      }
      lazyObserver.observe(element);
    });
  }

  // DOM hazir oldugunda baslat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLazyLoad);
  } else {
    initLazyLoad();
  }

  // Dinamik eklenen elementler icin mutation observer
  const mutationObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Element node
          if (node.matches && node.matches('img[data-src], iframe[data-src], [data-bg]')) {
            lazyObserver.observe(node);
          }
          // Alt elementleri de kontrol et
          const lazyChildren = node.querySelectorAll &&
            node.querySelectorAll('img[data-src], iframe[data-src], [data-bg]');
          if (lazyChildren) {
            lazyChildren.forEach(child => lazyObserver.observe(child));
          }
        }
      });
    });
  });

  // Body'yi izle
  if (document.body) {
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  }
})();
