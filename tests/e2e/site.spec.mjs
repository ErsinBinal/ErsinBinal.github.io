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

test.describe('Chat guvertesi kesif ve sembol akisi', () => {
  test('ozel mesaj ve engel gorunur; ASCII sembol imlece eklenir', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('#command-input').fill('chat');
    await page.locator('#command-input').press('Enter');

    const deck = page.getByRole('dialog', { name: 'Convivium chat guvertesi' });
    await expect(deck).toBeVisible();
    await expect(deck).toContainText('Ozel mesaj, kisi engelleme ve grup icin giris yap');
    await expect(deck).toContainText('OZEL MESAJ · KISI ENGELLEME · GRUP SOHBETI');

    await deck.getByRole('button', { name: 'SEMBOLLER' }).click();
    const shelf = deck.getByRole('dialog', { name: 'Tuslu telefon sembol rafi' });
    await expect(shelf).toBeVisible();
    expect(await deck.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await shelf.getByRole('button', { name: 'gulumseme: :)', exact: true }).click();
    await expect(deck.locator('.deck-input-row .deck-input')).toHaveValue(':)');

    await page.keyboard.press('Escape');
    await expect(shelf).toBeHidden();
    await expect(deck).toBeVisible();
    await deck.getByRole('button', { name: 'EXIT' }).click();
    await expect(deck).toBeHidden();
  });

  test('uye birebir kanalinda engel sonuclari onaylanir ve guvenlik listesine tasinir', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const self = { user_id: 'self', handle: 'ersin', display_name: 'Ersin', role: 'owner' };
      const friend = { user_id: 'friend', handle: 'ada', display_name: 'Ada', role: 'member' };
      const snapshot = () => ({
        profile: self,
        friends: window.__socialBlocked ? [] : [friend],
        incoming: [],
        outgoing: [],
        blocked: window.__socialBlocked ? [friend] : []
      });
      const thread = { id: 'dm-1', kind: 'direct', title: 'Ada', members: [self, friend], last_body: '', last_at: null };
      window.__socialBlocked = false;
      window.ConviviumBackend = {
        getSession: async () => ({ user: { id: 'self', user_metadata: { display_name: 'Ersin' } } }),
        getSocialSnapshot: async () => snapshot(),
        listChatThreads: async () => window.__socialBlocked ? [] : [thread],
        listChatMessages: async () => [],
        openDirectChat: async () => 'dm-1',
        blockMember: async (handle) => { window.__blockedHandle = handle; window.__socialBlocked = true; return true; },
        unblockMember: async () => { window.__socialBlocked = false; return true; },
        subscribeToChatMessages: () => () => {}
      };
    });

    await page.locator('#command-input').fill('chat');
    await page.locator('#command-input').press('Enter');
    const deck = page.getByRole('dialog', { name: 'Convivium chat guvertesi' });
    await expect(deck).toContainText('OZEL MESAJ MERKEZI');
    await deck.getByRole('button', { name: /OZEL · Ada/ }).click();
    await expect(deck).toContainText('Bu konusma sunucuda saklanir ve yalniz taraflara aciktir.');

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Arkadaslik ve birebir sohbet kanali kapanir');
      await dialog.accept();
    });
    await deck.getByRole('button', { name: 'KISIYI ENGELLE' }).click();

    await expect.poll(() => page.evaluate(() => window.__blockedHandle)).toBe('ada');
    await expect(deck).toContainText('GUVENLIK / ENGELLENENLER · 1');
    await expect(deck.getByRole('button', { name: 'ENGELI KALDIR' })).toBeVisible();
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
