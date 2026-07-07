(function() {
  'use strict';

  const backend = window.ConviviumBackend;
  const status = document.getElementById('authStatus');
  const sessionPanel = document.getElementById('sessionPanel');
  const sessionInfo = document.getElementById('sessionInfo');
  const signInForm = document.getElementById('signInForm');
  const signUpForm = document.getElementById('signUpForm');
  const recoveryForm = document.getElementById('recoveryForm');
  const recoveryOverlay = document.getElementById('recoveryOverlay');
  const forgotButton = document.getElementById('forgotPassword');
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

  // Supabase sifre politikasi: en az 10 karakter + kucuk/buyuk harf + rakam + ozel karakter.
  const PASSWORD_RULES = {
    length: { test: (v) => v.length >= 10, label: 'en az 10 karakter' },
    lower: { test: (v) => /[a-z]/.test(v), label: 'kucuk harf' },
    upper: { test: (v) => /[A-Z]/.test(v), label: 'buyuk harf' },
    digit: { test: (v) => /\d/.test(v), label: 'rakam' },
    symbol: { test: (v) => /[^A-Za-z0-9]/.test(v), label: 'ozel karakter (!, ?, - gibi)' }
  };

  function passwordPolicyError(value) {
    const missing = Object.values(PASSWORD_RULES)
      .filter((rule) => !rule.test(value))
      .map((rule) => rule.label);
    if (!missing.length) return '';
    return `Sifre su kosullari da saglamali: ${missing.join(', ')}.`;
  }

  function updateRuleList(form, value) {
    Object.entries(PASSWORD_RULES).forEach(([key, rule]) => {
      const item = form.querySelector(`.auth-rules [data-rule="${key}"]`);
      if (item) item.classList.toggle('ok', rule.test(value));
    });
  }

  function updatePasswordRules(value) {
    updateRuleList(signUpForm, value);
  }

  function passwordStrength(value) {
    let score = 0;
    if (value.length >= 10) score += 40;
    else if (value.length >= 6) score += 15;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 20;
    if (/\d/.test(value)) score += 20;
    if (/[^A-Za-z0-9]/.test(value)) score += 20;
    return Math.min(score, 100);
  }

  function updatePasswordStrength() {
    if (!signUpPassword) return;
    if (strengthMeter) strengthMeter.style.setProperty('--strength', `${passwordStrength(signUpPassword.value)}%`);
    updatePasswordRules(signUpPassword.value);
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

    if (data.terms_accepted !== 'on') {
      setStatus('Devam etmek icin Kullanim Kosullari ve KVKK Aydinlatma Metni onayi gereklidir.', 'error');
      return;
    }

    const policyError = passwordPolicyError(data.password || '');
    if (policyError) {
      setStatus(policyError, 'error');
      return;
    }

    setStatus('Uyelik olusturuluyor...', 'info');
    setFormBusy(signUpForm, true);

    try {
      await backend.signUp(data.email, data.password, data.first_name, data.last_name, {
        termsAccepted: true,
        aiConsent: data.ai_consent === 'on'
      });
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

  /* --- Sifremi unuttum akisi --- */
  forgotButton.addEventListener('click', async () => {
    const email = (signInForm.elements.email.value || '').trim();
    if (!email) {
      setStatus('Sifre sifirlama icin once Giris bolumune e-posta adresinizi yazin.', 'error');
      signInForm.elements.email.focus();
      return;
    }
    setStatus('Sifirlama baglantisi gonderiliyor...', 'info');
    try {
      await backend.requestPasswordReset(email);
      setStatus('Sifre sifirlama baglantisi gonderildi. Gelen kutunuzu ve istenmeyen (spam) klasorunu kontrol edin.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });

  function showRecoveryPanel() {
    if (!recoveryOverlay || !recoveryForm) return;
    recoveryOverlay.hidden = false;
    setStatus('Kimliğin doğrulandı. Yeni şifreni belirle.', 'info');
    recoveryForm.elements.password.focus();
  }

  recoveryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = recoveryForm.elements.password.value;
    const policyError = passwordPolicyError(password);
    if (policyError) {
      setStatus(policyError, 'error');
      return;
    }
    setStatus('Sifre guncelleniyor...', 'info');
    setFormBusy(recoveryForm, true);
    try {
      await backend.updatePassword(password);
      recoveryForm.reset();
      if (recoveryOverlay) recoveryOverlay.hidden = true;
      await refreshSession();
      setStatus('Şifren güncellendi; oturumun açık. Bir sonraki girişte yeni şifreni kullan.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      setFormBusy(recoveryForm, false);
    }
  });

  recoveryForm.elements.password.addEventListener('input', () => {
    updateRuleList(recoveryForm, recoveryForm.elements.password.value);
  });

  // Sifirlama baglantisiyla donuste Supabase PASSWORD_RECOVERY olayini yayar.
  if (backend && backend.onAuthChange) {
    backend.onAuthChange((event) => {
      if (event === 'PASSWORD_RECOVERY') showRecoveryPanel();
    });
  }

  // Suresi dolmus / gecersiz baglantiyla donus: hash'teki hatayi Turkce goster.
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (hashParams.get('error_code') === 'otp_expired') {
    setStatus('Baglantinin suresi dolmus. "Sifremi unuttum" ile yeni bir baglanti isteyin.', 'error');
  } else if (hashParams.get('error_description')) {
    setStatus(decodeURIComponent(hashParams.get('error_description').replace(/\+/g, ' ')), 'error');
  }

  if (signUpPassword) {
    signUpPassword.addEventListener('input', updatePasswordStrength);
  }
  document.addEventListener('DOMContentLoaded', refreshSession);
})();
