/**
 * SIZMIS SIFRE KONTROLU — k-anonimlik ile.
 *
 * Supabase'in "leaked password protection" ozelligi Pro plana kilitli. Ayni
 * korumayi HaveIBeenPwned'in ucretsiz Pwned Passwords API'siyle kuruyoruz.
 *
 * SIFRE TARAYICIYI TERK ETMEZ
 *   1. Sifrenin SHA-1 ozeti BURADA hesaplanir (WebCrypto).
 *   2. Ozetin yalnizca ILK 5 hex karakteri Worker'a gider.
 *   3. Worker ~800 ozet iceren kovayi doner.
 *   4. Eslestirme yine BURADA yapilir.
 *   Ne sifre, ne tam ozet disari cikar. 5 karakter 1.048.576 kovadan biridir.
 *
 * NEDEN SHA-1
 *   Zayif bir ozet oldugu icin degil — HIBP'nin veri kumesi SHA-1 ile
 *   indekslenmis durumda. Burada ozet bir SIR saklamiyor, bir ARAMA ANAHTARI.
 *   Sifrenin kendisi Supabase tarafinda bcrypt ile saklaniyor.
 *
 * ARIZADA ACIK KALIR (fail-open)
 *   Kontrol calismazsa (cevrimdisi, Worker kapali, zaman asimi) kayit
 *   ENGELLENMEZ. Bir erisilebilirlik arizasi insanlarin uye olmasini
 *   durdurmamali; kontrol bir ek katman, kapinin kendisi degil.
 */
(() => {
  'use strict';

  const UC = 'https://convivium-oracle.convivium.workers.dev/pwned';
  const ZAMAN_ASIMI = 4000;
  const onbellek = new Map();   // prefix -> kova metni (sekme omru boyunca)

  async function sha1Hex(metin) {
    const veri = new TextEncoder().encode(metin);
    const ozet = await crypto.subtle.digest('SHA-1', veri);
    return [...new Uint8Array(ozet)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  async function kovaGetir(prefix) {
    if (onbellek.has(prefix)) return onbellek.get(prefix);
    const iptal = new AbortController();
    const sayac = setTimeout(() => iptal.abort(), ZAMAN_ASIMI);
    try {
      const cevap = await fetch(`${UC}?prefix=${prefix}`, { signal: iptal.signal });
      if (!cevap.ok) throw new Error(`HTTP ${cevap.status}`);
      const metin = await cevap.text();
      onbellek.set(prefix, metin);
      return metin;
    } finally {
      clearTimeout(sayac);
    }
  }

  /**
   * Sifrenin bilinen sizintilarda kac kez gectigini doner.
   *   0        -> listede yok
   *   >0       -> kac ihlalde gorulmus
   *   null     -> kontrol yapilamadi (cevrimdisi / servis kapali)
   */
  async function kacKezSizmis(sifre) {
    if (!sifre || typeof sifre !== 'string') return 0;
    if (!window.crypto || !window.crypto.subtle) return null;  // guvensiz baglam
    try {
      const ozet = await sha1Hex(sifre);
      const prefix = ozet.slice(0, 5);
      const suffix = ozet.slice(5);
      const kova = await kovaGetir(prefix);
      for (const satir of kova.split('\n')) {
        const ayrac = satir.indexOf(':');
        if (ayrac === -1) continue;
        if (satir.slice(0, ayrac).trim().toUpperCase() !== suffix) continue;
        const sayi = parseInt(satir.slice(ayrac + 1).trim(), 10);
        return Number.isFinite(sayi) ? sayi : 1;
      }
      return 0;
    } catch {
      return null;   // arizada acik kal
    }
  }

  function sayiYaz(n) {
    return n.toLocaleString('tr-TR');
  }

  window.ConviviumSifreSizinti = { kacKezSizmis, sayiYaz };
})();
