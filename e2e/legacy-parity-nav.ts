import type { Page } from '@playwright/test';

export function legacyAppUrl(legacyBase: string): string {
  const base = legacyBase.replace(/\/$/, '');
  return `${base}/legacy-archive/index.html`;
}

export async function legacyStep1a(page: Page, legacyBase: string): Promise<void> {
  await page.goto(legacyAppUrl(legacyBase));
  await page.waitForLoadState('networkidle');
}

/** Saisie directe groupe + classe puis passage à l’étape 2 (situation). */
export async function legacyGoToStep2(
  page: Page,
  legacyBase: string,
  groupe: string,
  classe: string,
): Promise<void> {
  await legacyStep1a(page, legacyBase);
  await page.locator('#btn-connais-classe').click();
  await page.waitForSelector('#select-groupe');
  await page.selectOption('#select-groupe', groupe);
  await page.selectOption('#select-classe', classe);
  await page.locator('#btn-next-1b').click();
  await page.locator('#anciennete').waitFor({ state: 'visible', timeout: 30_000 });
}

export async function legacyGoToStep3(
  page: Page,
  legacyBase: string,
  groupe: string,
  classe: string,
): Promise<void> {
  await legacyGoToStep2(page, legacyBase, groupe, classe);
  await page.locator('#btn-next-2').click();
  await page.locator('#result-smh').waitFor({ state: 'visible', timeout: 30_000 });
}

export async function legacyGoToStep4(
  page: Page,
  legacyBase: string,
  groupe: string,
  classe: string,
): Promise<void> {
  await legacyGoToStep3(page, legacyBase, groupe, classe);
  await page.locator('#btn-check-arretees').click();
  await page.locator('#date-embauche-arretees').waitFor({ state: 'visible', timeout: 30_000 });
}

export async function legacyStep1cVisible(page: Page, legacyBase: string): Promise<void> {
  await legacyStep1a(page, legacyBase);
  await page.locator('#btn-estimer-classe').click();
  await page.locator('.roulette-item').first().waitFor({ state: 'visible', timeout: 30_000 });
}
