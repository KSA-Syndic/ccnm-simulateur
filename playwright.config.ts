import { defineConfig } from '@playwright/test';

/** Deux serveurs manuels (CI « dual-parité », `npm run dual`) : pas de `webServer` Playwright sur 5173. */
const dualParite = process.env.DUAL_PARITE_E2E === '1';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  ...(dualParite
    ? {}
    : {
        webServer: {
          command: 'npx vite --port 5173 --strictPort',
          url: 'http://localhost:5173',
          reuseExistingServer: process.env.CI !== 'true',
          timeout: 120_000,
        },
      }),
});
