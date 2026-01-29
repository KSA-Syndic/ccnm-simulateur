/**
 * ============================================
 * LEGACY ADAPTER - Adaptateur de Compatibilité
 * ============================================
 * 
 * Adaptateur pour permettre à l'ancien code app.js d'utiliser les nouveaux modules
 * de manière transparente. Permet une migration progressive.
 */

import { calculateAnnualRemuneration, getMontantAnnuelSMHSeul } from '../remuneration/RemunerationCalculator.js';
import { calculateClassification, getActiveClassification } from '../classification/ClassificationEngine.js';
import { getActiveAgreement } from '../agreements/AgreementLoader.js';
import { state } from '../core/state.js';

/**
 * Adapter calculateRemuneration() pour utiliser le nouveau calculateur
 * @returns {Object} Résultat de rémunération au format ancien
 */
export function calculateRemunerationAdapter() {
    const agreement = getActiveAgreement();
    const activeAgreement = (state.accordActif && agreement) ? agreement : null;
    
    return calculateAnnualRemuneration(state, activeAgreement, { mode: 'full' });
}

/**
 * Adapter getMontantAnnuelSMHSeul() pour utiliser le nouveau calculateur
 * @returns {number} Montant annuel SMH seul
 */
export function getMontantAnnuelSMHSeulAdapter() {
    return getMontantAnnuelSMHSeul(state);
}

/**
 * Adapter getActiveClassification() pour utiliser le nouveau moteur
 * @returns {Object} { groupe, classe }
 */
export function getActiveClassificationAdapter() {
    return getActiveClassification(state);
}

/**
 * Adapter calculateClassification() pour utiliser le nouveau moteur
 * @returns {Object} { totalScore, groupe, classe }
 */
export function calculateClassificationAdapter() {
    return calculateClassification(state.scores);
}

// Exposer les fonctions globalement pour compatibilité avec app.js
if (typeof window !== 'undefined') {
    window.LegacyAdapter = {
        calculateRemuneration: calculateRemunerationAdapter,
        getMontantAnnuelSMHSeul: getMontantAnnuelSMHSeulAdapter,
        getActiveClassification: getActiveClassificationAdapter,
        calculateClassification: calculateClassificationAdapter
    };
}
