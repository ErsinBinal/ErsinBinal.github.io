(() => {
  'use strict';

  window.ConviviumHome = window.ConviviumHome || {};

  window.ConviviumHome.createUx = ({
    commandShell,
    commandLaunch,
    mobileCommandButton,
    commandStatus,
    isUnlocked,
    onGateToggle,
    onSealedGate
  } = {}) => {
    const syncGate = (gate) => {
      if (!gate) return;
      const button = gate.querySelector('.gate-toggle');
      if (!button) return;
      const unlocked = gate.classList.contains('is-unlocked');
      const open = gate.classList.contains('is-open');
      const sealed = gate.dataset.access === 'ritual' && !unlocked;
      button.textContent = sealed ? 'Mührü dene' : open ? 'Yan rotaları kapat' : 'Yan rotaları aç';
      button.setAttribute('aria-expanded', String(open));
      if (unlocked) {
        gate.querySelectorAll('.sealed-content').forEach((content) => {
          content.hidden = false;
          content.removeAttribute('inert');
        });
        document.querySelectorAll(`a[href="#${gate.id}"][aria-disabled="true"]`)
          .forEach((link) => link.removeAttribute('aria-disabled'));
      }
      const menu = document.getElementById(button.getAttribute('aria-controls'));
      if (menu) {
        menu.toggleAttribute('inert', !open);
        menu.setAttribute('aria-hidden', String(!open));
      }
    };

    const bindGates = () => {
      document.querySelectorAll('.gate-toggle').forEach((button) => {
        const gate = button.closest('.journey-gate');
        syncGate(gate);
        button.addEventListener('click', () => {
          if (gate?.dataset.access === 'ritual' && !isUnlocked?.(gate)) onSealedGate?.(gate);
          else onGateToggle?.(gate);
        });
      });
      document.querySelectorAll('a[href="#hidden"][aria-disabled="true"]').forEach((link) => {
        link.addEventListener('click', (event) => {
          if (isUnlocked?.(document.getElementById('hidden'))) return;
          event.preventDefault();
          document.getElementById('hidden')?.scrollIntoView({
            behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            block: 'start'
          });
        });
      });
    };

    const syncCommandShell = (open) => {
      if (!commandShell) return;
      commandShell.setAttribute('aria-hidden', String(!open));
      commandShell.toggleAttribute('inert', !open);
      document.body.classList.toggle('command-shell-open', open);
      commandLaunch?.setAttribute('aria-expanded', String(open));
      mobileCommandButton?.setAttribute('aria-expanded', String(open));
      if (commandStatus) commandStatus.textContent = open
        ? 'Terminal açık ve komut almaya hazır.'
        : 'Terminal kapalı.';
    };

    return { bindGates, syncGate, syncCommandShell };
  };
})();
