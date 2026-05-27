import { test, expect } from '@playwright/test';
import { goToStep2 } from './wizard-helpers';

test.describe('SMH débutants F11', () => {
  test('affiche le montant SMH indicatif dans #cadre-debutant', async ({ page }) => {
    await goToStep2(page, 'F', '11');
    await expect(page.locator('#cadre-debutant')).toBeVisible();
    await page.locator('#experience-pro').fill('1');
    await expect(page.locator('.cadre-debutant-smh')).toContainText('SMH indicatif');
    await expect(page.locator('.cadre-debutant-smh')).toContainText('tranche 0');
  });
});
