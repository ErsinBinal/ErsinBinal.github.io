import { defineConfig, devices } from '@playwright/test';

/**
 * E2E akis testleri. Varsayilan hedef canli site; SITE_BASE ile degistirilebilir.
 * Calistir:  npm run test:e2e
 * Tam kayit akisini da denemek icin (PROD'da gercek kullanici olusturur!):
 *   RUN_SIGNUP=1 TEST_EMAIL=... TEST_PASSWORD=... npm run test:e2e
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: (process.env.SITE_BASE || 'https://ersinbinal.github.io').replace(/\/$/, ''),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
});
