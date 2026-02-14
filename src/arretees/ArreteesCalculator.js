/**
 * ============================================
 * ARRETEES CALCULATOR - Calcul des Arriérés
 * ============================================
 * 
 * Calcul des arriérés de salaire mois par mois.
 * Utilise le calculateur de rémunération unifié pour cohérence.
 */

import { calculateAnnualRemuneration, getMontantAnnuelSMHSeul } from '../remuneration/RemunerationCalculator.js';
import { getMontantPrimesFixesAnnuel, getMontantPrimesVerseesCeMois } from '../remuneration/PrimesFixesHelper.js';
import { computeSalaireProrataEntree } from '../utils/dateUtils.js';

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
    // Option « SMH seul » : salaire dû = assiette SMH (base + forfait).
    // Les primes marquées inclusDansSMH (Art. 140 CCNM, ex. prime de vacances)
    // ne changent pas le total annuel dû mais sont gérées dans la distribution mensuelle.
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
            // Mois de versement du 13e mois : défini par l'accord (ex. novembre = 11), pas hardcodé
            const moisVersement13e = agreement?.repartition13Mois?.moisVersement ?? 11;
            const estMois13eMois = month === moisVersement13e;
            
            if (smhSeul) {
                // SMH seul : répartition tenant compte des primes incluses dans le SMH (Art. 140 CCNM)
                const primesFixesSMH = agreement ? getMontantPrimesFixesAnnuel(stateMois, agreement, { smhOnly: true }) : 0;
                const baseAnnuellePourRepartition = salaireAnnuelDuMois - primesFixesSMH;
                if (agreement && agreement.repartition13Mois && agreement.repartition13Mois.actif && nbMois === 13) {
                    if (estMois13eMois) {
                        salaireMensuelDu = (baseAnnuellePourRepartition / 13) * 2;
                    } else {
                        salaireMensuelDu = baseAnnuellePourRepartition / 13;
                    }
                } else {
                    salaireMensuelDu = baseAnnuellePourRepartition / 12;
                }
                // Ajouter les primes SMH versées ce mois-là (dynamique via moisVersement de chaque prime)
                const primesCeMoisSMH = agreement ? getMontantPrimesVerseesCeMois(stateMois, agreement, month, { smhOnly: true }) : 0;
                if (primesCeMoisSMH > 0) salaireMensuelDu += primesCeMoisSMH;
            } else {
                // Rémunération complète : primes à versement unique selon moisVersement de chaque prime
                const primesFixesAnnuel = agreement ? getMontantPrimesFixesAnnuel(stateMois, agreement) : 0;
                const baseAnnuellePourRepartition = salaireAnnuelDuMois - primesFixesAnnuel;
                if (agreement && agreement.repartition13Mois && agreement.repartition13Mois.actif && nbMois === 13) {
                    if (estMois13eMois) {
                        salaireMensuelDu = (baseAnnuellePourRepartition / 13) * 2;
                    } else {
                        salaireMensuelDu = baseAnnuellePourRepartition / 13;
                    }
                } else {
                    salaireMensuelDu = baseAnnuellePourRepartition / 12;
                }
                const primesCeMois = agreement ? getMontantPrimesVerseesCeMois(stateMois, agreement, month) : 0;
                if (primesCeMois > 0) salaireMensuelDu += primesCeMois;
            }

            // Proratisation premier mois (CCNM Art. 139, 103.5.1, 103.5.2) : salaire au prorata des jours ouvrés (config CCN)
            const estPremierMois = currentDate.getFullYear() === dateEmbauche.getFullYear() &&
                currentDate.getMonth() === dateEmbauche.getMonth();
            if (estPremierMois) {
                const dernierJourMois = new Date(year, month, 0);
                salaireMensuelDu = computeSalaireProrataEntree(salaireMensuelDu, dateEmbauche, dernierJourMois);
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
