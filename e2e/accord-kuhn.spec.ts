import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { computeAnnualTotal } from '../src/domain/remuneration/compute';
import { wizardStoresInputFromFixtureState } from '../tests/fixtures/fixtureState';
import { expectResultValueNear, goToStep2ViaEstimation } from './wizard-helpers';
import '../src/accords';

const __dirname = dirname(fileURLToPath(import.meta.url));
const profils: { id: string; state: Record<string, unknown> }[] = JSON.parse(
  readFileSync(join(__dirname, '../tests/fixtures/profils-remuneration.json'), 'utf8'),
);

test.describe('Accord Kuhn — URL ?accord=kuhn', () => {
  test('total aligné sur le moteur avec accord (profil C5 estimation)', async ({ page }) => {
    const st = profils.find((p) => p.id === 'C5-10ans-prime')?.state;
    expect(st).toBeTruthy();
    const baseInput = wizardStoresInputFromFixtureState(st!);
    const sans = computeAnnualTotal(baseInput);
    const avec = computeAnnualTotal({
      ...baseInput,
      agreement: {
        accordActif: true,
        activeAccordId: 'kuhn',
        inputs: baseInput.agreement.inputs,
      },
    });
    expect(avec).not.toBe(sans);

    const scores = (st!.scores as number[]) ?? [3, 3, 3, 3, 3, 3];
    await goToStep2ViaEstimation(page, scores, '/?accord=kuhn');
    await page.locator('#anciennete').fill('10');
    await page.getByRole('button', { name: /^Calculer/i }).click();
    await page.locator('section[aria-label="Étape 3 — Résultat"]').waitFor({ state: 'visible' });
    await expectResultValueNear(page, avec);
  });
});
