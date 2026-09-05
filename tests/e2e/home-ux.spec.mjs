import { test, expect } from '@playwright/test';

test.describe('Ana sayfa UX sozlesmesi', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('kapali terminal odak almaz; rehberli acilis ilk komutu ezmez', async ({ page }) => {
    const shell = page.locator('#command-shell');
    await expect(shell).toHaveAttribute('aria-hidden', 'true');
    expect(await shell.evaluate((node) => node.inert)).toBe(true);
    expect(await page.evaluate(() => performance.getEntriesByType('resource')
      .every(({ name }) => !/smoke-particles|explosion-sheet|character-sheet/i.test(name)))).toBe(true);

    await page.locator('#command-launch').click();
    await expect(shell).toHaveAttribute('aria-hidden', 'false');
    expect(await shell.evaluate((node) => node.inert)).toBe(false);
    await expect(page.locator('#command-output')).toContainText('BAŞLANGIÇ / TERMINAL READY');
    await page.waitForTimeout(900);
    await expect(page.locator('#command-output')).toContainText('hizli rota');

    await page.locator('#command-input').press('Escape');
    await expect(shell).toHaveAttribute('aria-hidden', 'true');
    expect(await shell.evaluate((node) => node.inert)).toBe(true);
  });

  test('kamusal yan rotalar giris istemeden klavye erisimine acilir', async ({ page }) => {
    const gate = page.locator('#index');
    const toggle = gate.locator('.gate-toggle');
    const drawer = page.locator('#index-drawer');
    await toggle.click();
    await expect(gate).toHaveClass(/is-open/);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(drawer).toHaveAttribute('aria-hidden', 'false');
    expect(await drawer.evaluate((node) => node.inert)).toBe(false);
    expect(page.url()).not.toContain('/account/auth.html');
  });

  test('serbest metin onaysiz Oracle agina gonderilmez', async ({ page }) => {
    let oracleRequests = 0;
    page.on('request', (request) => {
      if (request.url().includes('convivium-oracle')) oracleRequests += 1;
    });
    await page.locator('#command-launch').click();
    await page.locator('#command-input').fill('Bugün hangi varsayımı test etmeliyim?');
    await page.locator('#command-input').press('Enter');
    await expect(page.locator('#command-output')).toContainText('Oracle kanalına göndereyim mi?');
    expect(oracleRequests).toBe(0);
    await page.locator('#command-input').fill('oracle no');
    await page.locator('#command-input').press('Enter');
    await expect(page.locator('#command-output')).toContainText('bekleyen sorgu iptal edildi');
  });

  test('gizli oda hesapla degil rituel sirasi ile acilir', async ({ page }) => {
    await page.locator('#command-launch').click();
    const input = page.locator('#command-input');
    for (const command of ['signal', 'oracle', 'manifest', 'unlock hidden']) {
      await input.fill(command);
      await input.press('Enter');
    }
    await expect(page.locator('#hidden')).toHaveClass(/is-unlocked/);
    await expect(page.locator('#hidden .sealed-content')).toBeVisible();
    await expect(page.locator('#hidden .sealed-feedback')).toContainText('oda açık');
  });

  test('320px mobilde ray sabit, giris okunur ve yatay tasma yoktur', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.reload();
    const railPosition = await page.locator('.journey-rail').evaluate((node) => getComputedStyle(node).position);
    expect(railPosition).toBe('sticky');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.locator('#mobile-command-button').click();
    const inputSize = await page.locator('#command-input').evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
    const closeBox = await page.locator('#command-close').boundingBox();
    expect(inputSize).toBeGreaterThanOrEqual(16);
    expect(closeBox?.width).toBeGreaterThanOrEqual(44);
    expect(closeBox?.height).toBeGreaterThanOrEqual(44);
  });
});
