/**
 * ============================================
 * PRIME CALCULATOR - Calcul des Primes
 * ============================================
 * 
 * Calcul des primes d'ancienneté, prime d'équipe, prime de vacances.
 * 
 * Conformité Juridique :
 * - Prime d'ancienneté CCN : CCNM Art. 142, Annexe 7 (formule Point × Taux × Années)
 * - Prime d'ancienneté Accord : Selon barème accord d'entreprise
 * - Principe de Faveur : Le système compare CCN et Accord, applique la plus avantageuse
 * - Prime de vacances : Vérifie les conditions d'éligibilité (ex: ancienneté ≥ 1 an au 1er juin)
 */

import { CONFIG } from '../core/config.js';

/**
 * Calculer la prime d'ancienneté selon l'accord d'entreprise (base salaire)
 * @param {Object} agreement - Accord d'entreprise
 * @param {number} salaireBase - Salaire de base annuel
 * @param {number} anciennete - Années d'ancienneté
 * @returns {Object} { montant, taux, annees }
 */
export function calculatePrimeAncienneteAccord(agreement, salaireBase, anciennete) {
    if (!agreement || !agreement.anciennete) {
        return { montant: 0, taux: 0, annees: 0 };
    }
    
    const { seuil, plafond, barème } = agreement.anciennete;
    
    if (anciennete < seuil) {
        return { montant: 0, taux: 0, annees: 0 };
    }
    
    const anneesPrime = Math.min(anciennete, plafond);
    
    // Trouver le taux dans le barème
    let taux = 0;
    if (typeof barème === 'function') {
        taux = barème(anneesPrime);
    } else if (typeof barème === 'object') {
        // Chercher le taux pour cette ancienneté
        // Si exact, utiliser ce taux, sinon prendre le taux le plus proche inférieur
        if (barème[anneesPrime] !== undefined) {
            taux = barème[anneesPrime];
        } else {
            // Trouver le taux le plus proche inférieur
            const annees = Object.keys(barème).map(Number).sort((a, b) => b - a);
            for (const annee of annees) {
                if (annee <= anneesPrime) {
                    taux = barème[annee];
                    break;
                }
            }
        }
    }
    
    const montant = Math.round(salaireBase * taux);
    
    return {
        montant,
        taux: Math.round(taux * 10000) / 100, // Pourcentage avec 2 décimales
        annees: anneesPrime
    };
}

/**
 * Calculer la prime d'ancienneté selon la CCN (base point territorial)
 * @param {number} pointTerritorial - Valeur du point territorial
 * @param {number} classe - Numéro de classe (1-10)
 * @param {number} anciennete - Années d'ancienneté
 * @returns {Object} { montant, taux, annees }
 */
export function calculatePrimeAncienneteCCN(pointTerritorial, classe, anciennete) {
    if (anciennete < CONFIG.ANCIENNETE.seuil) {
        return { montant: 0, taux: 0, annees: 0 };
    }
    
    const anneesPrime = Math.min(anciennete, CONFIG.ANCIENNETE.plafond);
    const tauxClasse = CONFIG.TAUX_ANCIENNETE[classe] || 0;
    
    // Formule : Point × Taux × Années (mensuel), puis × 12 pour annuel
    const montantMensuel = pointTerritorial * tauxClasse * anneesPrime;
    const montant = Math.round(montantMensuel * 12);
    
    return {
        montant,
        taux: tauxClasse,
        annees: anneesPrime
    };
}

/**
 * Calculer la prime d'équipe
 * @param {Object} agreement - Accord d'entreprise
 * @param {number} heuresEquipe - Heures mensuelles en équipe
 * @returns {Object} { montantAnnuel, montantMensuel, tauxHoraire }
 */
export function calculatePrimeEquipe(agreement, heuresEquipe) {
    if (!agreement || !agreement.primes || !agreement.primes.equipe) {
        return { montantAnnuel: 0, montantMensuel: 0, tauxHoraire: 0 };
    }
    
    const { montantHoraire, calculMensuel } = agreement.primes.equipe;
    
    if (calculMensuel) {
        const montantMensuel = Math.round(heuresEquipe * montantHoraire * 100) / 100;
        const montantAnnuel = Math.round(montantMensuel * 12);
        return { montantAnnuel, montantMensuel, tauxHoraire: montantHoraire };
    } else {
        const montantAnnuel = Math.round(heuresEquipe * montantHoraire * 12 * 100) / 100;
        const montantMensuel = Math.round(montantAnnuel / 12);
        return { montantAnnuel, montantMensuel, tauxHoraire: montantHoraire };
    }
}

/**
 * Obtenir le montant de la prime de vacances si applicable
 * @param {Object} agreement - Accord d'entreprise
 * @param {boolean} active - Prime de vacances activée
 * @param {number} anciennete - Ancienneté en années (pour vérifier les conditions)
 * @param {Date} dateReference - Date de référence pour vérifier l'ancienneté au 1er juin (optionnel)
 * @returns {number} Montant de la prime (0 si non applicable)
 */
export function getPrimeVacances(agreement, active, anciennete = 0, dateReference = null) {
    if (!agreement || !agreement.primes || !agreement.primes.vacances || !active) {
        return 0;
    }
    
    // Vérifier les conditions d'éligibilité si spécifiées dans l'accord
    const conditions = agreement.primes.vacances.conditions;
    if (conditions && conditions.length > 0) {
        // Condition : Ancienneté ≥ 1 an au 1er juin (pour accord Kuhn)
        const conditionAnciennete = conditions.find(c => c.includes('Ancienneté') && c.includes('1 an'));
        if (conditionAnciennete && anciennete < 1) {
            return 0; // Pas éligible si ancienneté < 1 an
        }
    }
    
    return agreement.primes.vacances.montant || 0;
}
