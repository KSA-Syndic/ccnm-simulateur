import { test, expect } from '@playwright/test';
import { goToStep4 } from './wizard-helpers';

test.describe('Arriérés — courbe', () => {
  test('date embauche affiche le canvas avec données', async ({ page }) => {
    await goToStep4(page, 'A', '1');
    await page.locator('#date-embauche-arretees').fill('2020-06-01');
    const canvas = page.locator('#salary-curve-container canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    const box = await canvas.boundingBox();
    expect(box?.width).toBeGreaterThan(100);
    expect(box?.height).toBeGreaterThan(100);
  });
});
