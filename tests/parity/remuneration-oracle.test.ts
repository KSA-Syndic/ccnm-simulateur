import { describe, expect, it } from 'vitest';
import profils from '../fixtures/profils-remuneration.json';
import '../../src/accords/kuhn';
import { getAgreement } from '../../src/domain/agreements/registry';
import type { Agreement } from '../../src/domain/agreements/interface';
import { aggregateRemunerationDetails } from '../../src/domain/remuneration/aggregate';
import {
  computeAnnualRemunerationFromWizardStores,
  resolveWizardRemunerationElements,
  wizardStoresInputFromLegacyState,
} from '../../src/domain/remuneration/compute';
import { roundToEuro } from '../../src/domain/utils/rounding';
import { calculateAnnualRemuneration } from '../../src/infra/remuneration/legacyCompute';
import {
  assertSemanticMapsEqual,
  sumBySemanticLegacy,
  sumBySemanticTs,
} from './remunerationParityHelpers';

type ProfilFixture = { id: string; state: Record<string, unknown> };

function agreementForLegacyOracle(state: Record<string, unknown>): Agreement | null {
  if (state.accordActif !== true) return null;
  const id =
    typeof state.accordId === 'string' && state.accordId.length > 0 ? state.accordId : null;
  if (!id) return null;
  return getAgreement(id);
}

describe('Parité round-trip wizard → oracle legacy', () => {
  for (const p of profils as ProfilFixture[]) {
    it(`profil ${p.id} — total identique à l'oracle`, () => {
      const acc = agreementForLegacyOracle(p.state);
      const oracle = calculateAnnualRemuneration(p.state, acc, { mode: 'full' });
      const viaWizard = computeAnnualRemunerationFromWizardStores(
        wizardStoresInputFromLegacyState(p.state),
      );
      expect(viaWizard.total).toBe(oracle.total);
      expect(viaWizard.baseSMH).toBe(oracle.baseSMH);
    });

    it(`profil ${p.id} — montants par semanticId (legacy vs moteur TS)`, () => {
      const acc = agreementForLegacyOracle(p.state);
      const oracle = calculateAnnualRemuneration(p.state, acc, { mode: 'full' });
      const input = wizardStoresInputFromLegacyState(p.state);
      const { details } = resolveWizardRemunerationElements(input);
      const legacyMap = sumBySemanticLegacy(oracle.details as Array<Record<string, unknown>>);
      const tsMap = sumBySemanticTs(details);
      assertSemanticMapsEqual(p.id, legacyMap, tsMap);
    });

    it(`profil ${p.id} — lissage mensuel 12 vs 13 mois (total annuel inchangé)`, () => {
      const input = wizardStoresInputFromLegacyState(p.state);
      const { details, baseSMH } = resolveWizardRemunerationElements(input);
      const agg12 = aggregateRemunerationDetails(details, baseSMH, 12);
      const agg13 = aggregateRemunerationDetails(details, baseSMH, 13);
      expect(agg12.totalAnnual).toBe(agg13.totalAnnual);
      expect(agg12.totalMonthly).toBe(roundToEuro(agg12.totalAnnual / 12));
      expect(agg13.totalMonthly).toBe(roundToEuro(agg13.totalAnnual / 13));
      /** Restitution `n × mensuel` : écart ≤ n/2 € au pire (quotient arrondi à l’euro). */
      expect(Math.abs(agg12.totalMonthly * 12 - agg12.totalAnnual)).toBeLessThanOrEqual(6);
      expect(Math.abs(agg13.totalMonthly * 13 - agg13.totalAnnual)).toBeLessThanOrEqual(7);
    });
  }
});
