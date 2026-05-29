import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { goToStep2, goToStep3, goToStep4 } from './wizard-helpers';

/**
 * P5.5 — Audit axe sur les 4 étapes (hors contraste couleur : règle désactivée pour la feuille `main.css`).
 * Les violations `critical` / `serious` restantes bloquent le test.
 */
async function assertNoCriticalOrSerious(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
  const bad = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(bad, `${label} — ${bad.map((v) => `${v.id}(${v.impact})`).join('; ')}`).toEqual([]);
}

test.describe('Accessibilité (axe) — 4 étapes wizard', () => {
  test('étape 1 — choix initial', async ({ page }) => {
    await page.goto('/');
    await assertNoCriticalOrSerious(page, 'étape 1');
  });

  test('étape 2 — situation', async ({ page }) => {
    await goToStep2(page, 'A', '1');
    await assertNoCriticalOrSerious(page, 'étape 2');
  });

  test('étape 3 — résultat', async ({ page }) => {
    await goToStep3(page, 'A', '1');
    await assertNoCriticalOrSerious(page, 'étape 3');
  });

  test('étape 4 — arriérés', async ({ page }) => {
    await goToStep4(page, 'A', '1');
    await assertNoCriticalOrSerious(page, 'étape 4');
  });
});
