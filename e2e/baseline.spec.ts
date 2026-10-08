import { test, expect, type Page } from '@playwright/test';
import { goToStep1b, goToStep2, goToStep3, goToStep4, hashBase } from './wizard-helpers';

async function goToStep1c(page: Page) {
  await page.goto(hashBase);
  await page.getByRole('button', { name: /Non, je veux l'estimer/i }).click();
  await expect(page.locator('.roulette-item').first()).toBeVisible();
}

test.describe('Smoke — wizard Vue (mono-page)', () => {
  test('step 1a — affichage choix', async ({ page }) => {
    await page.goto(hashBase);
    await expect(page.getByRole('button', { name: /Oui, je la connais/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Non, je veux l'estimer/i })).toBeVisible();
  });

  test('step 1b — saisie groupe C', async ({ page }) => {
    await goToStep1b(page, 'C');
    await expect(page.locator('#select-groupe')).toHaveValue('C');
  });

  test('step 1c — estimation (roulettes critères)', async ({ page }) => {
    await goToStep1c(page);
    await page.locator('.roulette-item').first().locator('.roulette-value[data-value="5"]').click();
  });

  test('step 2 — situation groupe A', async ({ page }) => {
    await goToStep2(page, 'A');
    await expect(page.locator('#anciennete')).toBeVisible();
  });

  test('step 3 — résultat', async ({ page }) => {
    await goToStep3(page, 'A');
    await expect(
      page.getByText(/Salaire minimum hiérarchique|Rémunération annuelle/i).first(),
    ).toBeVisible();
  });

  test('step 4 — arriérés (navigation)', async ({ page }) => {
    await goToStep4(page, 'A');
    await expect(page.locator('#date-embauche-arretees')).toBeVisible();
  });
});

test.describe('Header', () => {
  test('en-tête présent', async ({ page }) => {
    await page.goto(hashBase);
    await expect(page.locator('.simulator-header')).toBeVisible();
  });
});
