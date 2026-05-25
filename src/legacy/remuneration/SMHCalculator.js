/**
 * ============================================
 * SMH CALCULATOR - Calcul Assiette SMH
 * ============================================
 * 
 * Calcul de l'assiette SMH (Salaire Minimum Hiérarchique).
 * Wrapper autour de RemunerationCalculator pour cohérence.
 */

import { getMontantAnnuelSMHSeul } from './RemunerationCalculator.js';

/**
 * Obtenir le montant annuel brut de l'assiette SMH (SMH seul)
 * @param {Object} state - État de l'application
 * @returns {number} Montant annuel de l'assiette SMH
 */
export function calculateSMH(state) {
    return getMontantAnnuelSMHSeul(state);
}
