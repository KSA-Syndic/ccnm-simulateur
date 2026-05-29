/**
 * Arrondis monétaires (decimal.js) — demi au supérieur, stable pour la paie.
 *
 * Moteur : éviter les arrondis intermédiaires sur les montants dérivés (ex. mensuel avant ×12) ;
 * `annualFromMonthly` multiplie d’abord par 12 puis arrondit une fois au centime. L’affichage
 * des totaux (`formatMoney`, euros entiers) et le détail des infobulles (`formatMoneyTooltipDetail`, centimes)
 * appliquent chacun l’arrondi réservé à la présentation.
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

/**
 * Passe d’un montant **mensuel** à un total **annuel** : `× 12` en précision maximale,
 * puis **un seul** arrondi à 2 décimales (centime). Ne pas arrondir le mensuel avant la multiplication.
 */
export function annualFromMonthly(monthlyAmount: unknown): number {
  return roundToCents(new Decimal(toNumber(monthlyAmount)).times(12));
}
