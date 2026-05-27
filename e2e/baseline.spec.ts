import { test, expect, type Page } from '@playwright/test';
import { goToStep1b, goToStep2, goToStep3, goToStep4, hashBase } from './wizard-helpers';

async function goToStep1c(page: Page) {
  await page.goto(hashBase);
  await page.getByRole('button', { name: /Je souhaite l'estimer/i }).click();
  await expect(page.locator('.roulette-item').first()).toBeVisible();
}

test.describe('Smoke — wizard Vue (mono-page)', () => {
  test('step 1a — affichage choix', async ({ page }) => {
    await page.goto(hashBase);
    await expect(page.getByRole('button', { name: /Je connais ma classification/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Je souhaite l'estimer/i })).toBeVisible();
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

test.describe('Baseline visuel (PNG)', () => {
  test('step1a-choice', async ({ page }) => {
    await page.goto(hashBase);
    await expect(page).toHaveScreenshot('step1a-choice.png', { fullPage: true });
  });

  test('step1b-direct-C', async ({ page }) => {
    await goToStep1b(page, 'C');
    await expect(page).toHaveScreenshot('step1b-direct-C.png', { fullPage: true });
  });

  test('step1c-estimation', async ({ page }) => {
    await goToStep1c(page);
    await expect(page).toHaveScreenshot('step1c-estimation.png', { fullPage: true });
  });

  test('step1c-roulettes-modified', async ({ page }) => {
    await goToStep1c(page);
    const items = page.locator('.roulette-item');
    const n = await items.count();
    for (let i = 0; i < Math.min(n, 3); i++) {
      await items.nth(i).locator('.roulette-value[data-value="4"]').click();
    }
    await expect(page).toHaveScreenshot('step1c-roulettes-modified.png', { fullPage: true });
  });

  test('step2-blank-A', async ({ page }) => {
    await goToStep2(page, 'A');
    await expect(page).toHaveScreenshot('step2-blank-A.png', { fullPage: true });
  });

  test('step2-B-modalites', async ({ page }) => {
    await goToStep2(page, 'B');
    await expect(page).toHaveScreenshot('step2-B-modalites.png', { fullPage: true });
  });

  test('step2-cadre-F-jours', async ({ page }) => {
    await goToStep2(page, 'F', '11');
    await page.selectOption('#forfait', 'jours');
    await page.locator('#experience-pro').fill('6');
    await expect(page).toHaveScreenshot('step2-cadre-F-jours.png', { fullPage: true });
  });

  test('step3-result-A', async ({ page }) => {
    await goToStep3(page, 'A');
    await expect(page).toHaveScreenshot('step3-result-A.png', { fullPage: true });
  });

  test('step3-result-A-13mois', async ({ page }) => {
    await goToStep3(page, 'A');
    await page.getByRole('button', { name: '13 mois' }).click();
    await expect(page).toHaveScreenshot('step3-result-A-13mois.png', { fullPage: true });
  });

  test('step3-result-cadre-F', async ({ page }) => {
    await goToStep2(page, 'F', '11');
    await page.locator('#experience-pro').fill('6');
    await page.selectOption('#forfait', 'jours');
    await page.getByRole('button', { name: /^Calculer/i }).click();
    await page.locator('section[aria-label="Étape 3 — Résultat"]').waitFor({ state: 'visible' });
    await expect(page).toHaveScreenshot('step3-result-cadre-F.png', { fullPage: true });
  });

  test('step4-arretees-blank', async ({ page }) => {
    await goToStep4(page, 'A');
    await expect(page).toHaveScreenshot('step4-arretees-blank.png', { fullPage: true });
  });

  test('step4-arretees-filled', async ({ page }) => {
    await goToStep4(page, 'A');
    await page.locator('#date-embauche-arretees').fill('2019-03-01');
    await expect(page).toHaveScreenshot('step4-arretees-filled.png', { fullPage: true });
  });

  test('step4-arretees-curve', async ({ page }) => {
    await goToStep4(page, 'A');
    await page.locator('#date-embauche-arretees').fill('2019-03-01');
    await expect(page.locator('#salary-curve-container canvas')).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot('step4-arretees-curve.png', { fullPage: true });
  });

  test('header', async ({ page }) => {
    await page.goto(hashBase);
    await expect(page.locator('.simulator-header')).toHaveScreenshot('header.png');
  });
});
