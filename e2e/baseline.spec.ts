import { test, expect, type Page } from '@playwright/test';

// ── Helpers ──

async function goToStep1b(page: Page, groupe = 'A') {
  await page.goto('/');
  await page.waitForSelector('#btn-connais-classe');
  await page.click('#btn-connais-classe');
  await page.waitForSelector('#step-1b:not(.hidden)');
  await page.selectOption('#select-groupe', groupe);
}

async function goToStep2(page: Page, groupe = 'A') {
  await goToStep1b(page, groupe);
  await page.click('#btn-next-1b');
  await page.waitForSelector('#step-2:not(.hidden)');
}

async function goToStep3(page: Page, groupe = 'A') {
  await goToStep2(page, groupe);
  await page.click('#btn-next-2');
  await page.waitForSelector('#step-3:not(.hidden)');
}

async function goToStep4(page: Page) {
  await goToStep3(page);
  await page.click('#btn-check-arretees');
  await page.waitForSelector('#step-4:not(.hidden)');
}

// ── Tests ──

test.describe('Baseline — step 1 (Classification)', () => {
  test('step 1a — choix du mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#step-1');
    await expect(page.locator('#step-1')).toBeVisible();
    await expect(page).toHaveScreenshot('step1a-choice.png', { fullPage: true });
  });

  test('step 1b — saisie directe groupe C', async ({ page }) => {
    await goToStep1b(page, 'C');
    await expect(page.locator('#step-1b')).toBeVisible();
    await expect(page).toHaveScreenshot('step1b-direct-C.png', { fullPage: true });
  });

  test('step 1c — estimation par critères (initial)', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#btn-estimer-classe');
    await page.click('#btn-estimer-classe');
    await page.waitForSelector('#step-1c:not(.hidden)');
    await expect(page.locator('#step-1c')).toBeVisible();
    await expect(page).toHaveScreenshot('step1c-estimation.png', { fullPage: true });
  });

  test('step 1c — roulettes avec scores modifiés', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#btn-estimer-classe');
    await page.click('#btn-estimer-classe');
    await page.waitForSelector('#step-1c:not(.hidden)');

    // Increment first 3 roulettes several times via chevron-down clicks
    for (let i = 0; i < 3; i++) {
      const chevron = page.locator(`[data-critere="${i}"] .chevron-down`);
      for (let click = 0; click < 4; click++) {
        await chevron.click();
        await page.waitForTimeout(150);
      }
    }
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('step1c-roulettes-modified.png', { fullPage: true });
  });
});

test.describe('Baseline — step 2 (Situation)', () => {
  test('step 2 — page vierge non-cadre', async ({ page }) => {
    await goToStep2(page, 'A');
    await expect(page).toHaveScreenshot('step2-blank-A.png', { fullPage: true });
  });

  test('step 2 — non-cadre avec modalités', async ({ page }) => {
    await goToStep2(page, 'B');
    // Fill ancienneté
    await page.fill('#anciennete', '5');
    // Open conditions de travail
    await page.click('#conditions-travail summary');
    await page.waitForTimeout(300);
    // Check nuit + fill heures
    await page.check('#travail-nuit');
    await page.waitForSelector('#heures-nuit-field:not(.hidden)');
    await page.fill('#heures-nuit', '20');
    // Check heures sup + fill
    await page.check('#travail-heures-sup');
    await page.waitForSelector('#heures-sup-field:not(.hidden)');
    await page.fill('#heures-sup', '8');
    await expect(page).toHaveScreenshot('step2-B-modalites.png', { fullPage: true });
  });

  test('step 2 — cadre F avec forfait', async ({ page }) => {
    await goToStep2(page, 'F');
    await page.fill('#anciennete', '10');
    await page.waitForSelector('#modalites-cadre:not(.hidden)');
    await page.selectOption('#forfait', 'jours');
    await expect(page).toHaveScreenshot('step2-cadre-F-jours.png', { fullPage: true });
  });
});

test.describe('Baseline — step 3 (Résultat)', () => {
  test('step 3 — résultat non-cadre A', async ({ page }) => {
    await goToStep3(page, 'A');
    await expect(page.locator('#step-3')).toBeVisible();
    await expect(page).toHaveScreenshot('step3-result-A.png', { fullPage: true });
  });

  test('step 3 — résultat cadre F', async ({ page }) => {
    await goToStep2(page, 'F');
    await page.fill('#anciennete', '8');
    await page.click('#btn-next-2');
    await page.waitForSelector('#step-3:not(.hidden)');
    await expect(page).toHaveScreenshot('step3-result-cadre-F.png', { fullPage: true });
  });

  test('step 3 — toggle 13 mois', async ({ page }) => {
    await goToStep3(page, 'A');
    await page.click('button[data-months="13"]');
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot('step3-result-A-13mois.png', { fullPage: true });
  });
});

test.describe('Baseline — step 4 (Arriérés)', () => {
  test('step 4 — formulaire initial', async ({ page }) => {
    await goToStep4(page);
    await expect(page.locator('#step-4')).toBeVisible();
    await expect(page).toHaveScreenshot('step4-arretees-blank.png', { fullPage: true });
  });

  test('step 4 — courbe après saisie date', async ({ page }) => {
    await goToStep4(page);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    twoYearsAgo.setDate(1);
    await page.fill('#date-embauche-arretees', twoYearsAgo.toISOString().split('T')[0]!);
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('step4-arretees-curve.png', { fullPage: true });
  });

  test('step 4 — courbe avec salaires saisis', async ({ page }) => {
    await goToStep4(page);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 1);
    twoYearsAgo.setMonth(0);
    twoYearsAgo.setDate(1);
    await page.fill('#date-embauche-arretees', twoYearsAgo.toISOString().split('T')[0]!);
    await page.waitForTimeout(1000);

    // Fill a few months via the floating input
    const floatingInput = page.locator('#floating-salary-input');
    if (await floatingInput.isVisible()) {
      for (let i = 0; i < 3; i++) {
        await floatingInput.fill('1800');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(400);
      }
    }
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('step4-arretees-filled.png', { fullPage: true });
  });
});

test.describe('Baseline — header', () => {
  test('screenshot header', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.simulator-header');
    await expect(page.locator('.simulator-header')).toHaveScreenshot('header.png');
  });
});
