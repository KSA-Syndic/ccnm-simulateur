import { test, expect } from '@playwright/test';

/**
 * Parité « deux serveurs » : legacy (ex. `npm run legacy` → 5174) vs Vue (`vite` → 5173).
 * Activer explicitement : `set DUAL_PARITE_E2E=1` (Windows) / `export DUAL_PARITE_E2E=1` (Unix).
 */
const dual = process.env.DUAL_PARITE_E2E === '1';
const legacyBase = process.env.PW_LEGACY_BASE ?? 'http://localhost:5174';
const vueBase = process.env.PW_VUE_BASE ?? 'http://localhost:5173';

test.describe('Parité visuelle — endpoints', () => {
  test.skip(!dual, 'Exporter DUAL_PARITE_E2E=1 et lancer legacy (5174) + Vue (5173).');

  test('legacy app (legacy-archive/index.html) répond', async ({ request }) => {
    const res = await request.get(`${legacyBase}/legacy-archive/index.html`);
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('legacy index-legacy répond', async ({ request }) => {
    const res = await request.get(`${legacyBase}/index-legacy.html`);
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('Vue racine répond', async ({ request }) => {
    const res = await request.get(`${vueBase}/`);
    expect(res.ok(), await res.text()).toBeTruthy();
  });
});
