/**
 * ============================================
 * MAJORATION CALCULATOR - Calcul des Majorations
 * ============================================
 * 
 * Calcul des majorations pour conditions de travail (nuit, dimanche).
 */

import { CONFIG } from '../core/config.js';

/**
 * Calculer les majorations nuit (taux automatique selon accord)
 * @param {string} typeNuit - Type de nuit ('aucun', 'poste-nuit', 'poste-matin')
 * @param {number} heuresNuit - Heures de nuit mensuelles
 * @param {number} tauxHoraire - Taux horaire de base
 * @param {Object|null} agreement - Accord d'entreprise ou null pour CCN
 * @returns {Object} { montantMensuel, montantAnnuel, taux, source }
 */
export function calculateMajorationNuit(typeNuit, heuresNuit, tauxHoraire, agreement) {
    if (typeNuit === 'aucun' || heuresNuit === 0) {
        return { montantMensuel: 0, montantAnnuel: 0, taux: 0, source: '' };
    }
    
    let taux = 0;
    let source = '';
    
    if (agreement && agreement.majorations && agreement.majorations.nuit) {
        // Taux accord d'entreprise
        taux = typeNuit === 'poste-nuit' 
            ? agreement.majorations.nuit.posteNuit  // ex: 20%
            : agreement.majorations.nuit.posteMatin; // ex: 15%
        source = agreement.nomCourt || 'Accord';
    } else {
        // Taux CCN (toujours 15%)
        taux = CONFIG.MAJORATIONS_CCN.nuit;
        source = 'CCN';
    }
    
    const montantMensuel = Math.round(heuresNuit * tauxHoraire * taux * 100) / 100;
    const montantAnnuel = Math.round(montantMensuel * 12);
    
    return { montantMensuel, montantAnnuel, taux: Math.round(taux * 100), source };
}

/**
 * Calculer les majorations dimanche (taux automatique selon accord)
 * @param {number} heuresDimanche - Heures dimanche mensuelles
 * @param {number} tauxHoraire - Taux horaire de base
 * @param {Object|null} agreement - Accord d'entreprise ou null pour CCN
 * @returns {Object} { montantMensuel, montantAnnuel, taux, source }
 */
export function calculateMajorationDimanche(heuresDimanche, tauxHoraire, agreement) {
    if (heuresDimanche === 0) {
        return { montantMensuel: 0, montantAnnuel: 0, taux: 0, source: '' };
    }
    
    let taux = 0;
    let source = '';
    
    if (agreement && agreement.majorations) {
        taux = agreement.majorations.dimanche || CONFIG.MAJORATIONS_CCN.dimanche;
        source = agreement.nomCourt || 'Accord';
    } else {
        taux = CONFIG.MAJORATIONS_CCN.dimanche;
        source = 'CCN';
    }
    
    const montantMensuel = Math.round(heuresDimanche * tauxHoraire * taux * 100) / 100;
    const montantAnnuel = Math.round(montantMensuel * 12);
    
    return { montantMensuel, montantAnnuel, taux: Math.round(taux * 100), source };
}
