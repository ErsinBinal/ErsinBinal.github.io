import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      remoteBindings: false,
      wrangler: {
        configPath: './workers/oracle/wrangler.toml'
      }
    })
  ],
  test: {
    include: ['workers/oracle/test/**/*.test.js']
  }
});
