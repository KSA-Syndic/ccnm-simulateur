/**
 * Primes à versement unique (type montant) : montant annuel et montant versé un mois donné.
 * Générique : toute prime avec valueKind === 'montant' et optionnellement moisVersement (1-12)
 * est gérée (prime vacances, prime Noël, prime Pâques, prime de fin d'année, etc.).
 * Utilisé pour évolution salariale (inflation) et répartition mensuelle (courbe, arriérés).
 */

import { computePrime } from './PrimeCalculator.js';
import { getAccordPrimeDefsAsElements, getAccordInput } from '../agreements/AgreementInterface.js';

/**
 * Montant annuel total des primes à versement unique (valueKind === 'montant') actives pour l'accord.
 * Un accord n'a pas forcément de "prime vacances" ; toute prime montant (vacances, Noël, Pâques, etc.) est incluse.
 * @param {Object} state - État de l'application
 * @param {Object|null} agreement - Accord d'entreprise actif
 * @returns {number}
 */
export function getMontantPrimesFixesAnnuel(state, agreement) {
    if (!agreement) return 0;
    const defs = getAccordPrimeDefsAsElements(agreement).filter(d => d.valueKind === 'montant');
    let total = 0;
    for (const def of defs) {
        const actif = getAccordInput(state, def.config?.stateKeyActif);
        if (actif !== true && actif !== 'true') continue;
        const r = computePrime(def, { state, agreement });
        if (r.amount > 0) total += r.amount;
    }
    return total;
}

/**
 * Montant des primes à versement unique versées un mois donné (mois 1-12).
 * Filtre sur config.moisVersement === mois (ex. juillet = 7 pour vacances, décembre = 12 pour Noël).
 * @param {Object} state - État de l'application
 * @param {Object|null} agreement - Accord d'entreprise actif
 * @param {number} mois - Mois (1-12)
 * @returns {number}
 */
export function getMontantPrimesVerseesCeMois(state, agreement, mois) {
    if (!agreement || !mois || mois < 1 || mois > 12) return 0;
    const defs = getAccordPrimeDefsAsElements(agreement).filter(
        d => d.valueKind === 'montant' && (d.config?.moisVersement ?? 0) === mois
    );
    let total = 0;
    for (const def of defs) {
        const actif = getAccordInput(state, def.config?.stateKeyActif);
        if (actif !== true && actif !== 'true') continue;
        const r = computePrime(def, { state, agreement });
        if (r.amount > 0) total += r.amount;
    }
    return total;
}
