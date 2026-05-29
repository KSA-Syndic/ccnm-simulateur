import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from '@playwright/test';
import '../src/accords';
import {
  computeAnnualRemunerationFromWizardStores,
  wizardStoresInputFromFixtureState,
} from '../src/domain/remuneration/compute';
import { goToStep2ViaEstimation, expectResultValueNear } from './wizard-helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const profils: { id: string; state: Record<string, unknown> }[] = JSON.parse(
  readFileSync(join(__dirname, '../tests/fixtures/profils-remuneration.json'), 'utf8'),
);

function expectedAnnualTotalFromFixture(id: string): number {
  const p = profils.find((x) => x.id === id);
  if (!p) throw new Error(`profil inconnu: ${id}`);
  return computeAnnualRemunerationFromWizardStores(wizardStoresInputFromFixtureState(p.state))
    .total;
}

async function fillSituationFromFixture(page: import('@playwright/test').Page, id: string) {
  const st = profils.find((x) => x.id === id)?.state;
  if (!st) throw new Error(id);
  await page.locator('#anciennete').fill(String(st.anciennete ?? 0));
  const exp = Number(st.experiencePro ?? 0);
  if (exp > 0 && (await page.locator('#experience-pro').count()) > 0) {
    await page.locator('#experience-pro').fill(String(exp));
  }
  if (st.forfait === 'jours' && (await page.locator('#forfait').count()) > 0) {
    await page.selectOption('#forfait', 'jours');
  }
  await page.locator('#point-territorial').fill(String(st.pointTerritorial ?? 5.9));
}

test.describe('Rémunération — valeurs alignées sur les fixtures', () => {
  test('A1-smh', async ({ page }) => {
    const scores = (profils.find((p) => p.id === 'A1-smh')?.state.scores as number[]) ?? [
      2, 1, 1, 1, 1, 1,
    ];
    await goToStep2ViaEstimation(page, scores);
    await fillSituationFromFixture(page, 'A1-smh');
    await page.getByRole('button', { name: /^Calculer/i }).click();
    await page.locator('section[aria-label="Étape 3 — Résultat"]').waitFor({ state: 'visible' });
    await expectResultValueNear(page, expectedAnnualTotalFromFixture('A1-smh'));
  });

  test('C5-10ans-prime', async ({ page }) => {
    const scores = (profils.find((p) => p.id === 'C5-10ans-prime')?.state.scores as number[]) ?? [
      3, 3, 3, 3, 3, 3,
    ];
    await goToStep2ViaEstimation(page, scores);
    await fillSituationFromFixture(page, 'C5-10ans-prime');
    await page.getByRole('button', { name: /^Calculer/i }).click();
    await page.locator('section[aria-label="Étape 3 — Résultat"]').waitFor({ state: 'visible' });
    await expectResultValueNear(page, expectedAnnualTotalFromFixture('C5-10ans-prime'));
  });

  test('F11-cadre-forfait-jours', async ({ page }) => {
    const scores = (profils.find((p) => p.id === 'F11-cadre-forfait-jours')?.state
      .scores as number[]) ?? [7, 7, 6, 6, 6, 6];
    await goToStep2ViaEstimation(page, scores);
    await fillSituationFromFixture(page, 'F11-cadre-forfait-jours');
    await page.getByRole('button', { name: /^Calculer/i }).click();
    await page.locator('section[aria-label="Étape 3 — Résultat"]').waitFor({ state: 'visible' });
    await expectResultValueNear(page, expectedAnnualTotalFromFixture('F11-cadre-forfait-jours'));
  });

  test('I18-cadre', async ({ page }) => {
    const scores = (profils.find((p) => p.id === 'I18-cadre')?.state.scores as number[]) ?? [
      10, 10, 10, 10, 10, 10,
    ];
    await goToStep2ViaEstimation(page, scores);
    await fillSituationFromFixture(page, 'I18-cadre');
    await page.getByRole('button', { name: /^Calculer/i }).click();
    await page.locator('section[aria-label="Étape 3 — Résultat"]').waitFor({ state: 'visible' });
    await expectResultValueNear(page, expectedAnnualTotalFromFixture('I18-cadre'));
  });
});
