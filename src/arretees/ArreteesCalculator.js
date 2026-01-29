/**
 * ============================================
 * ARRETEES CALCULATOR - Calcul des Arriérés
 * ============================================
 * 
 * Calcul des arriérés de salaire mois par mois.
 * Utilise le calculateur de rémunération unifié pour cohérence.
 */

import { calculateAnnualRemuneration, getMontantAnnuelSMHSeul } from '../remuneration/RemunerationCalculator.js';
import { getActiveAgreement } from '../agreements/AgreementLoader.js';
import { state } from '../core/state.js';
import { CONSTANTS } from '../core/constants.js';

/**
 * Calculer le salaire dû pour un mois donné avec tous les paramètres
 * @param {Date} dateMois - Date du mois
 * @param {Date} dateEmbauche - Date d'embauche
 * @param {Object} stateSnapshot - État de l'application pour ce mois
 * @param {Object|null} agreement - Accord d'entreprise actif ou null
 * @param {boolean} smhSeul - Mode SMH seul
 * @returns {number} Salaire annuel dû pour ce mois
 */
export function calculateSalaireDuPourMois(dateMois, dateEmbauche, stateSnapshot, agreement, smhSeul) {
    // Option « SMH seul » : salaire dû = assiette SMH (base + forfait ; exclut primes, pénibilité, nuit/dim/équipe)
    if (smhSeul) {
        return getMontantAnnuelSMHSeul(stateSnapshot);
    }
    
    // Mode rémunération complète : utiliser le calculateur unifié avec l'état ajusté pour ce mois
    return calculateAnnualRemuneration(stateSnapshot, agreement, { mode: 'full', date: dateMois }).total;
}

/**
 * Calculer les arriérés mois par mois
 * @param {Object} params - Paramètres de calcul
 * @param {Date} params.dateDebut - Date de début de la période
 * @param {Date} params.dateFin - Date de fin de la période
 * @param {Date} params.dateEmbauche - Date d'embauche
 * @param {Date|null} params.dateChangementClassification - Date de changement de classification (optionnel)
 * @param {Object} params.salairesParMois - Objet { '2024-01': 24000, ... }
 * @param {Object} params.stateSnapshot - État de l'application
 * @param {Object|null} params.agreement - Accord d'entreprise actif ou null
 * @param {boolean} params.smhSeul - Mode SMH seul
 * @param {number} params.nbMois - Nombre de mois (12 ou 13)
 * @returns {Object} { totalArretees, detailsArretees, detailsTousMois }
 */
export function calculerArreteesMoisParMois(params) {
    const {
        dateDebut,
        dateFin,
        dateEmbauche,
        dateChangementClassification,
        salairesParMois,
        stateSnapshot,
        agreement,
        smhSeul,
        nbMois
    } = params;
    
    let totalArretees = 0;
    const detailsArretees = []; // Uniquement les mois avec arriérés
    const detailsTousMois = []; // Tous les mois saisis
    
    let currentDate = new Date(dateDebut);
    
    while (currentDate <= dateFin) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const periodKey = `${year}-${String(month).padStart(2, '0')}`;
        const salaireReel = salairesParMois[periodKey];
        
        if (salaireReel !== undefined && salaireReel !== null) {
            // Calculer l'ancienneté pour ce mois
            const moisDepuisEmbauche = (currentDate - dateEmbauche) / (365.25 * 24 * 60 * 60 * 1000 / 12);
            const ancienneteMois = Math.floor(moisDepuisEmbauche / 12);
            
            // Créer un snapshot de l'état pour ce mois
            const stateMois = {
                ...stateSnapshot,
                anciennete: ancienneteMois
            };
            
            // Calculer le salaire annuel dû pour ce mois
            const salaireAnnuelDuMois = calculateSalaireDuPourMois(
                currentDate,
                dateEmbauche,
                stateMois,
                agreement,
                smhSeul
            );
            
            // Calculer le salaire mensuel dû avec répartition 12/13 mois
            let salaireMensuelDu;
            const estJuillet = month === 7;
            const estNovembre = month === 11;
            
            if (smhSeul) {
                // SMH seul : répartition simple
                if (agreement && agreement.repartition13Mois && agreement.repartition13Mois.actif && nbMois === 13) {
                    if (estNovembre) {
                        salaireMensuelDu = (salaireAnnuelDuMois / 13) * 2;
                    } else {
                        salaireMensuelDu = salaireAnnuelDuMois / 13;
                    }
                } else {
                    salaireMensuelDu = salaireAnnuelDuMois / 12;
                }
            } else {
                // Rémunération complète : gérer prime de vacances et 13e mois
                const primeVacancesMontant = (agreement && agreement.primes?.vacances && stateSnapshot.primeVacances)
                    ? agreement.primes.vacances.montant
                    : 0;
                
                const baseAnnuellePourRepartition = (estJuillet && primeVacancesMontant > 0)
                    ? salaireAnnuelDuMois - primeVacancesMontant
                    : salaireAnnuelDuMois;
                
                if (agreement && agreement.repartition13Mois && agreement.repartition13Mois.actif && nbMois === 13) {
                    if (estNovembre) {
                        salaireMensuelDu = (baseAnnuellePourRepartition / 13) * 2;
                    } else {
                        salaireMensuelDu = baseAnnuellePourRepartition / 13;
                    }
                } else {
                    salaireMensuelDu = baseAnnuellePourRepartition / 12;
                }
                
                if (estJuillet && primeVacancesMontant > 0) {
                    salaireMensuelDu += primeVacancesMontant;
                }
            }
            
            // Le salaire réel saisi est en mensuel brut
            const salaireMensuelReel = salaireReel;
            const difference = salaireMensuelDu - salaireMensuelReel;
            
            const row = {
                periode: currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                periodeKey: periodKey,
                dateMois: new Date(currentDate),
                salaireReel: salaireReel,
                salaireMensuelReel: salaireMensuelReel,
                salaireDu: salaireAnnuelDuMois,
                salaireMensuelDu: salaireMensuelDu,
                difference: difference
            };
            
            detailsTousMois.push(row);
            
            if (difference > 0) {
                totalArretees += difference;
                detailsArretees.push(row);
            }
        }
        
        // Passer au mois suivant
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return {
        totalArretees: Math.round(totalArretees),
        detailsArretees,
        detailsTousMois
    };
}
