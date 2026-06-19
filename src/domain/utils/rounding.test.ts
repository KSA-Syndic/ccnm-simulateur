import { describe, expect, it } from 'vitest';
import { annualFromMonthly, roundHourlyRate, roundToCents, roundToEuro } from './rounding';

/**
 * Cas d’arrondi attendus — plafond systématique (faveur salarié).
 */
describe('rounding.ts', () => {
  it('roundToCents — plafond au centime supérieur', () => {
    expect(roundToCents(1.001)).toBe(1.01);
    expect(roundToCents(1.004)).toBe(1.01);
    expect(roundToCents(1.0)).toBe(1.0);
  });

  it('roundHourlyRate — 4 décimales plafond', () => {
    expect(roundHourlyRate(15.620535812399728)).toBe(15.6206);
    expect(roundHourlyRate(15.62001)).toBe(15.6201);
  });

  it('roundToEuro — plafond entier', () => {
    expect(roundToEuro(35_499.1)).toBe(35_500);
    expect(roundToEuro(35_499.6)).toBe(35_500);
    expect(roundToEuro('bad')).toBe(0);
  });

  it('annualFromMonthly — ×12 puis un seul arrondi plafond au centime', () => {
    expect(annualFromMonthly(3000.001)).toBe(36_000.02);
    expect(annualFromMonthly(0)).toBe(0);
  });
});
