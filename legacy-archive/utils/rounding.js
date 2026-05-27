/**
 * Règles d'arrondi monétaire unifiées.
 * - Montants intermédiaires mensuels : 2 décimales
 * - Montants finaux (annuels / affichage) : euro entier
 */

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

export function roundToCents(value) {
    const n = toNumber(value);
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function roundToEuro(value) {
    return Math.round(toNumber(value));
}

export function annualFromMonthly(monthlyAmount) {
    return roundToEuro(toNumber(monthlyAmount) * 12);
}
