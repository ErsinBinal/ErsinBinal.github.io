(function() {
  'use strict';

  const backend = window.ConviviumBackend;
  const status = document.getElementById('authStatus');
  const sessionPanel = document.getElementById('sessionPanel');
  const sessionInfo = document.getElementById('sessionInfo');
  const signInForm = document.getElementById('signInForm');
  const signUpForm = document.getElementById('signUpForm');
  const signOutButton = document.getElementById('signOutButton');
  const signUpPassword = signUpForm.querySelector('input[name="password"]');
  const strengthMeter = signUpForm.querySelector('.auth-strength');
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get('returnTo');

  function safeReturnTo() {
    if (!returnTo || !returnTo.startsWith('/')) return '';
    if (returnTo.startsWith('//')) return '';
    return returnTo;
  }

  function setStatus(message, type) {
    status.textContent = message || '';
    status.dataset.type = type || 'info';
  }

  function formData(form) {
    const data = new FormData(form);
    return Object.fromEntries(data.entries());
  }

  function setFormBusy(form, busy) {
    form.classList.toggle('is-busy', busy);
    Array.from(form.elements).forEach((element) => {
      if (element.tagName === 'BUTTON') element.disabled = busy;
    });
  }

  function passwordStrength(value) {
    let score = 0;
    if (value.length >= 6) score += 25;
    if (value.length >= 10) score += 25;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 20;
    if (/\d/.test(value)) score += 15;
    if (/[^A-Za-z0-9]/.test(value)) score += 15;
    return Math.min(score, 100);
  }

  function updatePasswordStrength() {
    if (!strengthMeter || !signUpPassword) return;
    strengthMeter.style.setProperty('--strength', `${passwordStrength(signUpPassword.value)}%`);
  }

  async function refreshSession() {
    if (!backend || !backend.isConfigured()) {
      setStatus('Supabase baglantisi henuz yapilandirilmadi. Once assets/js/supabase-config.js dosyasini doldurun.', 'warn');
      sessionPanel.hidden = true;
      return;
    }

    try {
      const session = await backend.getSession();
      if (!session) {
        sessionPanel.hidden = true;
        setStatus('Oturum acabilir veya yeni uyelik olusturabilirsiniz.', 'info');
        return;
      }

      const profile = await backend.getProfile();
      sessionPanel.hidden = false;
      sessionInfo.textContent = `${session.user.email} / rol: ${profile ? profile.role : 'reader'}`;
      setStatus('Oturum aktif.', 'success');
    } catch (error) {
      sessionPanel.hidden = true;
      setStatus(error.message, 'error');
    }
  }

  signInForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = formData(signInForm);
    setStatus('Giris yapiliyor...', 'info');
    setFormBusy(signInForm, true);

    try {
      await backend.signIn(data.email, data.password);
      signInForm.reset();
      await refreshSession();
      const target = safeReturnTo();
      if (target) window.location.href = target;
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      setFormBusy(signInForm, false);
    }
  });

  signUpForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = formData(signUpForm);
    setStatus('Uyelik olusturuluyor...', 'info');
    setFormBusy(signUpForm, true);

    try {
      await backend.signUp(data.email, data.password, data.display_name);
      signUpForm.reset();
      updatePasswordStrength();
      await refreshSession();
      setStatus('Uyelik istegi alindi. E-posta dogrulamasi aciksa gelen kutunuzu kontrol edin.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      setFormBusy(signUpForm, false);
    }
  });

  signOutButton.addEventListener('click', async () => {
    setStatus('Oturum kapatiliyor...', 'info');
    try {
      await backend.signOut();
      await refreshSession();
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });

  if (signUpPassword) {
    signUpPassword.addEventListener('input', updatePasswordStrength);
  }
  document.addEventListener('DOMContentLoaded', refreshSession);
})();
