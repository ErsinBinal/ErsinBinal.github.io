(function() {
  'use strict';

  const backend = window.ConviviumBackend;
  const status = document.getElementById('authStatus');
  const sessionPanel = document.getElementById('sessionPanel');
  const sessionInfo = document.getElementById('sessionInfo');
  const signInForm = document.getElementById('signInForm');
  const signUpForm = document.getElementById('signUpForm');
  const signOutButton = document.getElementById('signOutButton');
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

    try {
      await backend.signIn(data.email, data.password);
      signInForm.reset();
      await refreshSession();
      const target = safeReturnTo();
      if (target) window.location.href = target;
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });

  signUpForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = formData(signUpForm);
    setStatus('Uyelik olusturuluyor...', 'info');

    try {
      await backend.signUp(data.email, data.password, data.display_name);
      signUpForm.reset();
      await refreshSession();
      setStatus('Uyelik istegi alindi. E-posta dogrulamasi aciksa gelen kutunuzu kontrol edin.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
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

  document.addEventListener('DOMContentLoaded', refreshSession);
})();
