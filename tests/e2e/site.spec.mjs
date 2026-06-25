import { test, expect } from '@playwright/test';

test.describe('Sayfa yuklemeleri', () => {
  const pages = [
    ['/', 'Ana sayfa'],
    ['/account/auth.html', 'Uyelik'],
    ['/legal/kvkk-aydinlatma.html', 'KVKK Aydinlatma'],
    ['/legal/kullanim-kosullari.html', 'Kullanim Kosullari']
  ];
  for (const [path, label] of pages) {
    test(`${label} (${path}) yuklenir`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status(), `${path} HTTP durumu`).toBeLessThan(400);
      await expect(page.locator('h1')).toBeVisible();
    });
  }
});

test.describe('Uyelik onay akisi', () => {
  test('zorunlu onay isaretlenmeden form gecerli degil', async ({ page }) => {
    await page.goto('/account/auth.html');
    await page.fill('#signUpForm input[name="first_name"]', 'Test');
    await page.fill('#signUpForm input[name="last_name"]', 'Kullanici');
    await page.fill('#signUpForm input[name="email"]', `e2e-${Date.now()}@example.com`);
    await page.fill('#signUpForm input[name="password"]', 'Test123456');

    const terms = page.locator('#signUpForm input[name="terms_accepted"]');
    await expect(terms).toHaveAttribute('required', '');
    // Zorunlu kutu isaretsizken form gecerli olmamali (tarayici submit'i engeller).
    const valid = await terms.evaluate((el) => el.checkValidity());
    expect(valid, 'terms_accepted isaretsizken gecersiz olmali').toBe(false);

    await terms.check();
    const validAfter = await terms.evaluate((el) => el.checkValidity());
    expect(validAfter, 'isaretlendikten sonra gecerli olmali').toBe(true);
  });

  test('AI acik riza kutusu istege bagli (required degil)', async ({ page }) => {
    await page.goto('/account/auth.html');
    const ai = page.locator('#signUpForm input[name="ai_consent"]');
    await expect(ai).toBeVisible();
    expect(await ai.evaluate((el) => el.hasAttribute('required'))).toBe(false);
  });

  test('hukuki metin baglantilari dogru sayfalara gider', async ({ page }) => {
    await page.goto('/account/auth.html');
    const kvkk = page.locator('#signUpForm a[href="/legal/kvkk-aydinlatma.html"]');
    const terms = page.locator('#signUpForm a[href="/legal/kullanim-kosullari.html"]');
    await expect(kvkk).toBeVisible();
    await expect(terms).toBeVisible();
  });
});

// PROD'da gercek kullanici olusturmamak icin varsayilan KAPALI.
// Acmak icin: RUN_SIGNUP=1 TEST_EMAIL=... TEST_PASSWORD=... npm run test:e2e
test.describe('Tam kayit akisi (opsiyonel)', () => {
  test.skip(process.env.RUN_SIGNUP !== '1', 'RUN_SIGNUP=1 verilmeden atlanir (prod kirliligini onler)');

  test('kayit -> onay -> istek gonderilir', async ({ page }) => {
    const email = process.env.TEST_EMAIL;
    const password = process.env.TEST_PASSWORD || 'Test123456';
    expect(email, 'TEST_EMAIL gerekli').toBeTruthy();

    await page.goto('/account/auth.html');
    await page.fill('#signUpForm input[name="first_name"]', 'E2E');
    await page.fill('#signUpForm input[name="last_name"]', 'Test');
    await page.fill('#signUpForm input[name="email"]', email);
    await page.fill('#signUpForm input[name="password"]', password);
    await page.locator('#signUpForm input[name="terms_accepted"]').check();
    await page.locator('#signUpForm input[name="ai_consent"]').check();
    await page.click('#signUpForm button[type="submit"]');

    // Durum mesaji bir sonuc gostermeli (basari ya da bilinen hata).
    await expect(page.locator('#authStatus')).not.toHaveText('Yukleniyor...', { timeout: 15000 });
  });
});
