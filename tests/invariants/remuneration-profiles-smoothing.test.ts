import { describe, expect, it } from 'vitest';
import profils from '../fixtures/profils-remuneration.json';
import '../../src/accords';
import { aggregateRemunerationDetails } from '../../src/domain/remuneration/aggregate';
import {
  resolveWizardRemunerationElements,
  wizardStoresInputFromFixtureState,
} from '../../src/domain/remuneration/compute';
import { roundToCents } from '../../src/domain/utils/rounding';

type ProfilFixture = { id: string; state: Record<string, unknown> };

describe('Rémunération — lissage 12 / 13 mois (fixtures)', () => {
  for (const p of profils as ProfilFixture[]) {
    it(`profil ${p.id} — total annuel inchangé entre 12 et 13 mois`, () => {
      const input = wizardStoresInputFromFixtureState(p.state);
      const { details, baseSMH } = resolveWizardRemunerationElements(input);
      const agg12 = aggregateRemunerationDetails(details, baseSMH, 12);
      const agg13 = aggregateRemunerationDetails(details, baseSMH, 13);
      expect(agg12.totalAnnual).toBe(agg13.totalAnnual);
      expect(agg12.totalMonthly).toBe(roundToCents(agg12.totalAnnual / 12));
      expect(agg13.totalMonthly).toBe(roundToCents(agg13.totalAnnual / 13));
      expect(Math.abs(agg12.totalMonthly * 12 - agg12.totalAnnual)).toBeLessThanOrEqual(0.12);
      expect(Math.abs(agg13.totalMonthly * 13 - agg13.totalAnnual)).toBeLessThanOrEqual(0.13);
    });
  }
});
