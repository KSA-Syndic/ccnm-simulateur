import { test, expect } from '@playwright/test';
import { goToStep3, hashBase } from './wizard-helpers';

test.describe('DOM critique — résultat & classification', () => {
  test('résultat : détail, toggle mois, libellés groupe', async ({ page }) => {
    await goToStep3(page, 'A', '1');
    await expect(page.locator('.remuneration-result .result-details')).toBeVisible();
    await expect(page.locator('.remuneration-result .detail-line').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '12 mois' })).toBeVisible();
    await expect(page.getByRole('button', { name: '13 mois' })).toBeVisible();
    await page.getByRole('button', { name: '13 mois' }).click();
    await expect(page.getByRole('button', { name: '13 mois' })).toHaveClass(/active/);

    await page.goto(hashBase);
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.getByRole('button', { name: /Je connais ma classification/i }).click();
    await page.waitForSelector('#select-groupe');
    const opts = await page.locator('#select-groupe option').allTextContents();
    expect(opts.some((t) => /A/.test(t))).toBe(true);
    expect(opts.some((t) => /B/.test(t))).toBe(true);
  });
});
