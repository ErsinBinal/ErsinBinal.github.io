import { test, expect } from '@playwright/test';

/**
 * Sizmis sifre kontrolu — k-anonimlik.
 *
 * Worker yaniti sahte: test edilen sey HIBP'nin verisi degil, BIZIM
 * davranisimiz — sifre disari cikiyor mu, uyari dogru mu, ariza durumunda
 * kayit engelleniyor mu.
 */

// SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
const SIZMIS = 'Password1!x';            // politikayi gecer, asagida sizmis sayilir
const TEMIZ = 'K9!mz-Qv7#tLpW2x';        // politikayi gecer, temiz sayilir

async function workerKarsila(page, { kova = null, durum = 200 } = {}) {
  await page.route('**/pwned*', async (route) => {
    if (durum !== 200) return route.fulfill({ status: durum, body: 'hata' });
    const url = new URL(route.request().url());
    const prefix = url.searchParams.get('prefix');
    // Istenen onekin SHA-1'ini bilmiyoruz; testte "sizmis" sifrenin son ekini
    // kovaya koymak icin sayfadan hesaplatmak gerekirdi. Bunun yerine:
    // kova parametresi verilmisse onu don, yoksa bos kova.
    return route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: kova !== null ? kova : `0000000000000000000000000000000000A:3\n`
    });
  });
}

// Sayfadaki modulle ayni SHA-1'i hesaplayip kovayi ona gore kurar.
async function sizmisKovaKur(page, sifre, sayi) {
  const ozet = await page.evaluate(async (s) => {
    const veri = new TextEncoder().encode(s);
    const o = await crypto.subtle.digest('SHA-1', veri);
    return [...new Uint8Array(o)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }, sifre);
  const suffix = ozet.slice(5);
  await page.unroute('**/pwned*');
  await page.route('**/pwned*', (route) => route.fulfill({
    status: 200, contentType: 'text/plain',
    body: `AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1\n${suffix}:${sayi}\n`
  }));
}

test.describe('Sizmis sifre kontrolu', () => {
  test('sifre ve tam ozet tarayiciyi TERK ETMEZ', async ({ page }) => {
    const istekler = [];
    await page.route('**/pwned*', (route) => {
      istekler.push(route.request().url());
      return route.fulfill({ status: 200, contentType: 'text/plain', body: '' });
    });
    await page.goto('/account/auth.html');
    await page.locator('#signUpForm input[name="password"]').fill(TEMIZ);
    await page.waitForTimeout(1200);

    expect(istekler.length).toBeGreaterThan(0);
    for (const u of istekler) {
      const onek = new URL(u).searchParams.get('prefix');
      expect(onek).toMatch(/^[0-9A-F]{5}$/);      // yalniz 5 hex karakter
      expect(u).not.toContain(TEMIZ);              // sifre YOK
      expect(u.length).toBeLessThan(120);          // tam ozet YOK
    }
  });

  test('temiz sifre onaylanir', async ({ page }) => {
    await workerKarsila(page);
    await page.goto('/account/auth.html');
    await page.locator('#signUpForm input[name="password"]').fill(TEMIZ);
    await expect(page.locator('#signUpSizinti')).toContainText('gorunmuyor', { timeout: 5000 });
  });

  test('sizmis sifre sayisiyla uyarir', async ({ page }) => {
    await page.goto('/account/auth.html');
    await sizmisKovaKur(page, SIZMIS, 52372427);
    await page.locator('#signUpForm input[name="password"]').fill(SIZMIS);
    await expect(page.locator('#signUpSizinti')).toContainText('52.372.427 kez', { timeout: 5000 });
    await expect(page.locator('#signUpSizinti')).toHaveAttribute('data-durum', 'kotu');
  });

  test('politika saglanmadan ag istegi ATILMAZ', async ({ page }) => {
    const istekler = [];
    await page.route('**/pwned*', (route) => {
      istekler.push(route.request().url());
      return route.fulfill({ status: 200, contentType: 'text/plain', body: '' });
    });
    await page.goto('/account/auth.html');
    await page.locator('#signUpForm input[name="password"]').fill('kisa');  // politikayi gecmez
    await page.waitForTimeout(1200);
    expect(istekler).toHaveLength(0);
  });

  test('servis kapaliyken kayit ENGELLENMEZ (arizada acik)', async ({ page }) => {
    await workerKarsila(page, { durum: 503 });
    await page.goto('/account/auth.html');
    await page.locator('#signUpForm input[name="password"]').fill(TEMIZ);
    await page.waitForTimeout(1200);
    // Uyari kutusu sessiz kalir: kullanicinin yapabilecegi bir sey yok.
    await expect(page.locator('#signUpSizinti')).toBeHidden();
  });
});
