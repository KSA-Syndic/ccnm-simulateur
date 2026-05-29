/**
 * Arrondis monétaires (decimal.js) — demi au supérieur, stable pour la paie.
 */
import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function roundToCents(value: unknown): number {
  const n = toNumber(value);
  return new Decimal(n).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

export function roundToEuro(value: unknown): number {
  return new Decimal(toNumber(value)).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

/** Taux horaire (€/h) — 2 décimales pour affichage et saisie. */
export function roundHourlyRate(value: unknown): number {
  return roundToCents(value);
}

export function annualFromMonthly(monthlyAmount: unknown): number {
  return new Decimal(toNumber(monthlyAmount))
    .times(12)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
}
