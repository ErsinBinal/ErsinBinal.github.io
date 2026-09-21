import { test, expect } from '@playwright/test';

/**
 * Yorum adasi: kalici adres sayfasindaki ziyaretci yorumlari.
 *
 * RPC yanitlari sahte — test edilen sey veri degil DAVRANIS: oturumsuz kisi
 * okuyup yazamiyor mu, oturumlu kisi form goruyor mu, hata kodlari Turkceye
 * ceviriliyor mu, yazi JS olmadan da render oluyor mu.
 */

// Hedef permalink: omurganin kendi ciktisindan okunur. Elle env vermek
// gerekmez — `npm run test:e2e` tek basina calisir.
import { readFileSync } from 'node:fs';

const YOL = process.env.YORUM_YOLU || (() => {
  const omurga = JSON.parse(readFileSync('assets/data/icerik.json', 'utf8'));
  const ilk = omurga.kayitlar && omurga.kayitlar[0];
  return ilk ? ilk.yol : null;
})();

const YORUMLAR = [
  {
    id: 'c1', body: 'Bu yazidaki olcu fikri cok isine yariyor.',
    created_at: '2026-09-10T09:00:00Z',
    author_name: 'Deniz', author_handle: 'deniz', is_mine: false
  }
];

async function rpcKarsila(page, { liste = YORUMLAR, gonderHatasi = null } = {}) {
  await page.route('**/rest/v1/rpc/list_comments', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(liste) }));
  await page.route('**/rest/v1/rpc/post_comment', (route) =>
    gonderHatasi
      ? route.fulfill({ status: 400, contentType: 'application/json',
          body: JSON.stringify({ message: gonderHatasi }) })
      : route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ id: 'c2' }) }));
}

function oturumKur(page) {
  return page.addInitScript(() => {
    window.sessionStorage.setItem('convivium-auth-session', JSON.stringify({
      access_token: 'sahte-belirtec',
      expires_at: Math.floor(Date.now() / 1000) + 3600
    }));
  });
}

test.describe('Yorum adasi', () => {
  // Omurgada hic yayin yoksa test edecek sayfa da yok.
  test.skip(!YOL, 'icerik.json bos: test edilecek kalici adres yok');

  test('oturumsuz ziyaretci okur ama yazamaz', async ({ page }) => {
    await rpcKarsila(page);
    await page.goto(YOL);
    await expect(page.locator('#yorumlarDurum')).toHaveText('1 yorum');
    await expect(page.locator('.yorum-govde')).toContainText('olcu fikri');
    await expect(page.locator('.yorum-form')).toHaveCount(0);
    await expect(page.locator('.yorumlar-giris .btn')).toHaveAttribute(
      'href', '/account/auth.html');
  });

  test('bos liste ilk sozu davet eder', async ({ page }) => {
    await rpcKarsila(page, { liste: [] });
    await page.goto(YOL);
    await expect(page.locator('#yorumlarDurum')).toContainText('Ilk sozu sen soyle');
  });

  test('oturumlu kisi form gorur ve sayac calisir', async ({ page }) => {
    await oturumKur(page);
    await rpcKarsila(page);
    await page.goto(YOL);
    await expect(page.locator('.yorum-form')).toBeVisible();
    await page.locator('.yorum-alan').fill('merhaba');
    await expect(page.locator('.yorum-sayac')).toHaveText('7 / 800');
  });

  test('hiz siniri hatasi Turkce gosterilir', async ({ page }) => {
    await oturumKur(page);
    await rpcKarsila(page, { gonderHatasi: 'rate_limit' });
    await page.goto(YOL);
    await page.locator('.yorum-alan').fill('cok hizli yaziyorum');
    await page.locator('.yorum-form button[type="submit"]').click();
    await expect(page.locator('.yorum-uyari')).toContainText('birkac dakika bekle');
  });

  test('yorum ziyaretci metnidir: HTML olarak yorumlanmaz', async ({ page }) => {
    await rpcKarsila(page, { liste: [{
      id: 'c9', body: '<img src=x onerror=alert(1)> kotu niyetli',
      created_at: '2026-09-10T09:00:00Z',
      author_name: 'X', author_handle: 'x', is_mine: false
    }] });
    await page.goto(YOL);
    await expect(page.locator('.yorum-govde')).toContainText('<img src=x');
    await expect(page.locator('.yorum-govde img')).toHaveCount(0);
  });

  test('JS olmadan yazi yine de tam render olur', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const p = await ctx.newPage();
    await p.goto(YOL);
    await expect(p.locator('.yazi-govde')).not.toBeEmpty();
    await expect(p.locator('h1')).toBeVisible();
    await ctx.close();
  });
});
