/**
 * ============================================
 * FORFAIT CALCULATOR - Calcul Forfaits Cadres
 * ============================================
 * 
 * Calcul des majorations forfaits pour cadres.
 */

import { CONFIG } from '../core/config.js';

/**
 * Calculer la majoration forfait pour un cadre
 * @param {number} baseSMH - SMH de base annuel
 * @param {string} forfait - Type de forfait ('35h', 'heures', 'jours')
 * @returns {Object} { montant, taux, label }
 */
export function calculateForfait(baseSMH, forfait) {
    const taux = CONFIG.FORFAITS[forfait] || 0;
    
    if (taux === 0) {
        return { montant: 0, taux: 0, label: 'Base 35h' };
    }
    
    const montant = Math.round(baseSMH * taux);
    const label = forfait === 'heures' ? 'Forfait Heures (+15%)' : 'Forfait Jours (+30%)';
    
    return { montant, taux, label };
}
