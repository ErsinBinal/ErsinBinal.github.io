import { test, expect } from '@playwright/test';

/**
 * Okuma odasi: dort tur tek omurgada.
 *
 * Canli veritabaninda henuz kitap/film/karalama yok, o yuzden Supabase
 * yanitini SAHTE veriyle karsiliyoruz. Test edilen sey veri degil RENDER YOLU:
 * menu doluyor mu, tur suzgeci calisiyor mu, kitap kunyesi cikiyor mu,
 * karalama akis gorunumune geciyor mu.
 */

const ORNEK = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'gelir-modelleri', title: 'Gelir Modelleri',
    summary: 'Uzun yazi ozeti.', content_html: '<p>Makale govdesi.</p>',
    kind: 'makale', tags: ['strateji'], meta: {},
    status: 'published', published_at: '2026-09-01T10:00:00Z',
    created_at: '2026-09-01T10:00:00Z', updated_at: '2026-09-01T10:00:00Z'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    slug: 'yalnizlik-paylasilmaz', title: 'Yalnizlik Paylasilmaz',
    summary: 'Kitap uzerine.', content_html: '<p>Kitap degerlendirmesi.</p>',
    kind: 'kitap', tags: ['siir'],
    meta: { yazar: 'Ozdemir Asaf', yil: 1978, puan: 9 },
    status: 'published', published_at: '2026-09-02T10:00:00Z',
    created_at: '2026-09-02T10:00:00Z', updated_at: '2026-09-02T10:00:00Z'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    slug: 'stalker', title: 'Stalker',
    summary: 'Film uzerine.', content_html: '<p>Film degerlendirmesi.</p>',
    kind: 'film', tags: ['bilimkurgu'],
    meta: { yonetmen: 'Tarkovski', yil: 1979, puan: 10 },
    status: 'published', published_at: '2026-09-03T10:00:00Z',
    created_at: '2026-09-03T10:00:00Z', updated_at: '2026-09-03T10:00:00Z'
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    slug: 'not-2026-09-04-1200', title: '',
    summary: '', content_html: '<p>Arayuz bir yuzey degil, bir dusunme bicimi.</p>',
    kind: 'not', tags: ['karalama'], meta: {},
    status: 'published', published_at: '2026-09-04T12:00:00Z',
    created_at: '2026-09-04T12:00:00Z', updated_at: '2026-09-04T12:00:00Z'
  }
];

test.describe('Okuma odasi — dort tur', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/rest/v1/articles*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ORNEK)
      }));
    await page.goto('/pages/makaleler.html');
    // Menu dolana kadar bekle: veri asenkron geliyor.
    await expect(page.locator('#kindMenu .kind-tab').first()).toBeVisible();
  });

  test('kategori menusu dolu turleri sayiyla listeler', async ({ page }) => {
    const sekmeler = page.locator('#kindMenu .kind-tab');
    await expect(sekmeler).toHaveCount(5);          // Tumu + 4 tur
    await expect(sekmeler.nth(0)).toContainText('Tumu');
    await expect(sekmeler.nth(2)).toContainText('Kitaplar');
    await expect(sekmeler.nth(2)).toContainText('1');
  });

  test('tur secimi listeyi suzer', async ({ page }) => {
    await page.getByRole('button', { name: /Kitaplar/ }).click();
    const satirlar = page.locator('#articles .article-row');
    await expect(satirlar).toHaveCount(1);
    await expect(satirlar.first()).toContainText('Yalnizlik Paylasilmaz');
  });

  test('kitap satirinda kunye okunur: yazar, yil, puan', async ({ page }) => {
    await page.getByRole('button', { name: /Kitaplar/ }).click();
    await expect(page.locator('#articles .article-row-meta').first())
      .toHaveText('Ozdemir Asaf / 1978 / 9/10');
  });

  test('film satirinda yonetmen gorunur', async ({ page }) => {
    await page.getByRole('button', { name: /Filmler/ }).click();
    await expect(page.locator('#articles .article-row-meta').first())
      .toContainText('Tarkovski');
  });

  test('karalama akis gorunumune gecer ve govde satir ici okunur', async ({ page }) => {
    await page.getByRole('button', { name: /Karalamalar/ }).click();
    await expect(page.locator('#articles')).toHaveAttribute('data-gorunum', 'akis');
    // Baslik listesi DEGIL: okunacak sey metnin kendisi.
    await expect(page.locator('#articles .article-row')).toHaveCount(0);
    await expect(page.locator('#articles .not-karti')).toHaveCount(1);
    await expect(page.locator('#articles .not-govde'))
      .toContainText('bir dusunme bicimi');
  });

  test('karalamanin kalici adresi var', async ({ page }) => {
    await page.getByRole('button', { name: /Karalamalar/ }).click();
    await expect(page.locator('#articles .not-bag')).toHaveAttribute(
      'href', '/y/not-2026-09-04-1200.html');
  });

  test('okuyucuda kitap kunyesi ve kalici adres baglantisi var', async ({ page }) => {
    await page.getByRole('button', { name: /Kitaplar/ }).click();
    await page.locator('#articles .article-row').first().click();
    await expect(page.locator('#reader .yazi-kunye')).toBeVisible();
    await expect(page.locator('#reader .yazi-puan-sayi')).toHaveText('9');
    await expect(page.locator('#reader a.btn', { hasText: 'Kalici adres' }))
      .toHaveAttribute('href', '/y/yalnizlik-paylasilmaz.html');
  });
});
