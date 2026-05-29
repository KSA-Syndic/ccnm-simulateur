import { describe, expect, it } from 'vitest';
import { annualFromMonthly, roundHourlyRate, roundToCents, roundToEuro } from './rounding';

/**
 * Cas d’arrondi attendus (Math + demi au supérieur).
 */
describe('rounding.ts', () => {
  it('roundToCents — demi centime au supérieur', () => {
    expect(roundToCents(1.005)).toBe(1.01);
    expect(roundToCents(1.004)).toBe(1.0);
  });

  it('roundHourlyRate — 2 décimales (taux SMH dérivé)', () => {
    expect(roundHourlyRate(15.620535812399728)).toBe(15.62);
  });

  it('roundToEuro', () => {
    expect(roundToEuro(35_499.6)).toBe(35_500);
    expect(roundToEuro('bad')).toBe(0);
  });

  it('annualFromMonthly — annuel en euros entiers (mensuel×12 puis arrondi)', () => {
    // 3000.4 * 12 = 36004.8 — arrondi demi au supérieur → 36005
    expect(annualFromMonthly(3000.4)).toBe(36_005);
    expect(annualFromMonthly(0)).toBe(0);
  });
});
