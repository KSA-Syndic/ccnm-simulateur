import { describe, expect, it } from 'vitest';
import '../../../accords/kuhn';
import { CONFIG } from '../../config';
import { getAgreement } from '../registry';
import {
  resolvePrimeDefaultHours,
  seedAgreementPrimeUiDefaults,
  shouldShowPrimeHoursField,
  shouldShowPrimeOfficialValueField,
} from '../primeUiDefaults';

describe('primeUiDefaults', () => {
  it('prime équipe Kuhn — pas de champ heures, taux accord prérempli', () => {
    const doc = getAgreement('kuhn');
    const pe = doc?.primes.find((p) => p.id === 'primeEquipe');
    expect(pe).toBeTruthy();
    expect(shouldShowPrimeHoursField(pe!)).toBe(false);
    expect(shouldShowPrimeOfficialValueField(pe!)).toBe(true);
    const seeded = seedAgreementPrimeUiDefaults(pe!, {
      agreementInputs: {},
      nationalPrimeOverrides: {},
    });
    expect(seeded.nationalPrimeOverrides.primeEquipe).toBe(0.86);
  });

  it('majoration nuit poste matin — heures par défaut + taux accord', () => {
    const doc = getAgreement('kuhn');
    const m = doc?.primes.find((p) => p.id === 'majorationNuitPosteMatin');
    expect(m).toBeTruthy();
    expect(shouldShowPrimeHoursField(m!)).toBe(true);
    expect(resolvePrimeDefaultHours(m!)).toBe(0);
    const seeded = seedAgreementPrimeUiDefaults(m!, {
      agreementInputs: {},
      nationalPrimeOverrides: {},
    });
    expect(seeded.agreementInputs.heuresMajorationNuitPosteMatin).toBe(0);
    expect(seeded.nationalPrimeOverrides['majorationNuitPosteMatin']).toBe(0.15);
  });

  it('autoHeures — heures légales par défaut si champ affiché', () => {
    const doc = getAgreement('kuhn');
    const pe = doc?.primes.find((p) => p.id === 'primeEquipe');
    expect(resolvePrimeDefaultHours({ ...pe!, autoHeures: true })).toBe(
      CONFIG.DUREE_LEGALE_HEURES_MOIS,
    );
  });
});
