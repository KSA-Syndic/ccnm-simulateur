/**
 * ============================================
 * CLASSIFICATION ENGINE - Moteur de Classification
 * ============================================
 * 
 * Calcul de la classification basée sur les 6 critères classants.
 */

import { CONFIG } from '../core/config.js';

/**
 * Calculer la classification basée sur les scores des 6 critères
 * @param {Array<number>} scores - Scores des 6 critères (1-10 chacun)
 * @returns {Object} { totalScore, groupe, classe }
 */
export function calculateClassification(scores) {
    if (!scores || scores.length !== 6) {
        console.warn('Scores invalides pour le calcul de classification');
        return { totalScore: 6, groupe: 'A', classe: 1 };
    }
    
    // Calcul du score total (somme des 6 critères)
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    
    // Recherche dans la grille de mapping
    for (const [min, max, groupe, classe] of CONFIG.MAPPING_POINTS) {
        if (totalScore >= min && totalScore <= max) {
            return { totalScore, groupe, classe };
        }
    }
    
    // Fallback (ne devrait jamais arriver)
    return { totalScore, groupe: 'A', classe: 1 };
}

/**
 * Obtenir la classification active (auto ou manuelle)
 * @param {Object} state - État de l'application
 * @returns {Object} { groupe, classe }
 */
export function getActiveClassification(state) {
    if (!state) {
        // Fallback si state non fourni (compatibilité)
        return { groupe: 'A', classe: 1 };
    }
    
    if (state.modeManuel) {
        return {
            groupe: state.groupeManuel,
            classe: state.classeManuel
        };
    } else {
        const calc = calculateClassification(state.scores);
        return {
            groupe: calc.groupe,
            classe: calc.classe
        };
    }
}

/**
 * Vérifier si une classe est cadre
 * @param {number} classe - Numéro de classe
 * @returns {boolean} true si cadre
 */
export function isCadre(classe) {
    return classe >= CONFIG.SEUIL_CADRE;
}

/**
 * Obtenir les classes possibles pour un groupe
 * @param {string} groupe - Groupe (A-I)
 * @returns {Array<number>} Liste des classes possibles
 */
export function getClassesForGroupe(groupe) {
    return CONFIG.GROUPE_CLASSES[groupe] || [];
}
