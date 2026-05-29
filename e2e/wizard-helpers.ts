import { expect, type Page } from '@playwright/test';
import { CONFIG } from '../src/domain/config/index';

/** Base URL sans routeur : l’app est mono-page sur `/`. */
export const hashBase = '/';

export async function goToStep2ViaEstimation(
  page: Page,
  scoresSix: number[],
  startUrl: string = hashBase,
) {
  await page.goto(startUrl);
  await page.getByRole('button', { name: /Non, je veux l'estimer/i }).click();
  await page.waitForSelector('.roulette-item');
  for (let i = 0; i < CONFIG.CRITERES.length; i++) {
    const critere = CONFIG.CRITERES[i]!;
    const v = scoresSix[i] ?? 1;
    await page
      .locator('.roulette-item')
      .nth(i)
      .locator(`.roulette-value[data-value="${v}"]`)
      .click();
  }
  await page.getByRole('button', { name: /^Valider/i }).click();
  await page.locator('section[aria-label="Étape 2 — Situation"]').waitFor({ state: 'visible' });
}

export async function goToStep1b(
  page: Page,
  groupe: string,
  classe?: string,
  startUrl: string = hashBase,
) {
  await page.goto(startUrl);
  await page.getByRole('button', { name: /Oui, je la connais/i }).click();
  await page.waitForSelector('#select-groupe');
  await page.selectOption('#select-groupe', groupe);
  if (classe != null) {
    await page.selectOption('#select-classe', classe);
  } else {
    const firstClasse = await page.locator('#select-classe option').nth(1).getAttribute('value');
    if (firstClasse) await page.selectOption('#select-classe', firstClasse);
  }
}

export async function goToStep2(
  page: Page,
  groupe: string,
  classe?: string,
  startUrl: string = hashBase,
) {
  await goToStep1b(page, groupe, classe, startUrl);
  await page.getByRole('button', { name: /^Suivant/i }).click();
  await page.locator('section[aria-label="Étape 2 — Situation"]').waitFor({ state: 'visible' });
}

export async function goToStep3(
  page: Page,
  groupe: string,
  classe?: string,
  startUrl: string = hashBase,
) {
  await goToStep2(page, groupe, classe, startUrl);
  await page.getByRole('button', { name: /^Calculer/i }).click();
  await page.locator('section[aria-label="Étape 3 — Résultat"]').waitFor({ state: 'visible' });
}

export async function goToStep4(
  page: Page,
  groupe: string,
  classe?: string,
  startUrl: string = hashBase,
) {
  await goToStep3(page, groupe, classe, startUrl);
  await page.getByRole('button', { name: /Calculer mes arriérés/i }).click();
  await page.locator('section[aria-label="Étape 4 — Arriérés"]').waitFor({ state: 'visible' });
}

/** Parse montant affiché style « 42 069 € » ou « 42 069 € ». */
export function parseEuroFr(text: string): number {
  const digits = (text ?? '').replace(/\u202f/g, '').replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : NaN;
}

export async function expectResultValueNear(page: Page, expected: number, tol = 1) {
  const raw = await page.locator('.result-value').first().textContent();
  expect(raw).toBeTruthy();
  const n = parseEuroFr(raw!);
  expect(Number.isFinite(n)).toBe(true);
  expect(Math.abs(n - expected)).toBeLessThanOrEqual(tol);
}

/** Remplit au moins un salaire versé (saisie groupée) pour afficher l’export PDF / Word à l’étape 4. */
export async function fillOneSalaireViaBulkModal(page: Page) {
  await page.locator('#date-embauche-arretees').fill('2019-03-01');
  await page
    .locator('#salary-curve-container canvas')
    .waitFor({ state: 'visible', timeout: 15_000 });
  await page.getByRole('button', { name: /Saisie groupée des salaires/i }).click();
  const dialog = page.getByRole('dialog', { name: /Saisir les salaires versés/i });
  await dialog.locator('.salary-modal-row').first().locator('input.book-input').fill('3000');
  await dialog.getByRole('button', { name: /^Enregistrer$/ }).click();
}
