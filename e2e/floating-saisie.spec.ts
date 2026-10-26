import { test, expect, type Page } from '@playwright/test';
import { goToStep4 } from './wizard-helpers';

/** Bloc de saisie flottant (étape 4) : ouverture, focus clavier, enchaînement des mois, cordon. */
async function ouvrirSaisie(page: Page) {
  await goToStep4(page, 'C', '5');
  await page.locator('#date-embauche-arretees').fill('2024-01-01');
  await page.locator('#date-embauche-arretees').blur();
  const panel = page.locator('#floating-input-block');
  await expect(panel).toBeVisible({ timeout: 15_000 });
  return panel;
}

/** Le cordon part du bas du panneau et descend à l'aplomb du point du graphique. */
async function expectCordonAligne(page: Page) {
  await expect
    .poll(
      async () => {
        const cordon = await page.locator('.floating-cordon-vertical').boundingBox();
        const panel = await page.locator('#floating-input-block').boundingBox();
        const dot = await page.locator('.chart-point-dot').boundingBox();
        if (!cordon || !panel || !dot) return 'absent';
        const ecartHaut = Math.abs(cordon.y - (panel.y + panel.height));
        const ecartX = Math.abs(cordon.x + cordon.width / 2 - (dot.x + dot.width / 2));
        return ecartHaut <= 2 && ecartX <= 2 ? 'aligné' : `écarts ${ecartHaut} / ${ecartX}`;
      },
      { timeout: 3_000 },
    )
    .toBe('aligné');
}

for (const viewport of [
  { name: 'bureau', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`saisie flottante — ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const panel = await ouvrirSaisie(page);
    const input = panel.locator('input');

    await expect(panel).toHaveAttribute('aria-label', /janv\. 2024/);
    await expect(input).toBeFocused();
    await expect(page.locator('.floating-cordon-vertical')).toBeVisible();
    await expectCordonAligne(page);

    await input.fill('2000');
    await input.press('Enter');
    await expect(panel).toHaveAttribute('aria-label', /févr\. 2024/);
    await expect(input).toBeFocused();
    await expect(page.locator('#curve-progress-text')).toContainText(/^1 \//);
    await expect(page.locator('.floating-cordon-vertical')).toBeVisible();
    await expectCordonAligne(page);

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
  });
}
