/**
 * ============================================
 * REMUNERATION CALCULATOR - Calculateur Principal
 * ============================================
 * 
 * Source unique de vérité pour tous les calculs de rémunération.
 * Remplace calculateRemuneration() et getMontantAnnuelSMHSeul().
 * 
 * Conformité Juridique :
 * - CCNM 2024 (IDCC 3248) - Entrée en vigueur 01/01/2024
 * - Principe de Faveur (Art. L2254-2 Code du Travail) : Compare CCN et Accord,
 *   applique la règle la plus avantageuse pour le salarié
 * - Assiette SMH : Base + Forfaits (inclus) ; Primes d'ancienneté, primes de vacances,
 *   majorations nuit/dimanche/équipe (exclus) - CCNM Art. 140
 */

import { CONFIG } from '../core/config.js';
import { getActiveClassification, isCadre } from '../classification/ClassificationEngine.js';
import { calculatePrimeAncienneteAccord, calculatePrimeAncienneteCCN, calculatePrimeEquipe, getPrimeVacances } from './PrimeCalculator.js';
import { calculateMajorationNuit, calculateMajorationDimanche } from './MajorationCalculator.js';
import { formatMoney } from '../utils/formatters.js';

/**
 * Calculer la rémunération annuelle complète
 * @param {Object} state - État de l'application
 * @param {Object|null} agreement - Accord d'entreprise actif ou null pour CCN seule
 * @param {Object} options - Options de calcul
 * @param {string} [options.mode='full'] - Mode de calcul : 'full' (rémunération complète) ou 'smh-only' (assiette SMH uniquement)
 * @param {Date} [options.date] - Date pour calcul rétrospectif (optionnel)
 * @returns {Object} { scenario, baseSMH, total, details, isCadre, groupe, classe }
 */
export function calculateAnnualRemuneration(state, agreement, options = {}) {
    const { mode = 'full', date } = options;
    
    if (!state) {
        throw new Error('State is required for calculateAnnualRemuneration');
    }
    
    const { groupe, classe } = getActiveClassification(state);
    
    // Protection contre classe invalide
    if (!classe || classe < 1 || classe > 12) {
        console.error('Classe invalide dans calculateAnnualRemuneration:', classe);
        return {
            scenario: 'error',
            baseSMH: 0,
            total: 0,
            details: [],
            isCadre: false,
            groupe: groupe || 'A',
            classe: classe || 1
        };
    }
    
    const isCadreValue = isCadre(classe);
    const isGroupeF = classe === 11 || classe === 12;
    
    // Déterminer la base SMH
    let baseSMH = CONFIG.SMH[classe];
    
    // Protection contre SMH invalide
    if (!baseSMH || isNaN(baseSMH)) {
        console.error('SMH invalide pour classe', classe, ':', baseSMH);
        baseSMH = 0;
    }
    
    let scenario = '';
    let details = [];
    let total = baseSMH;
    
    // Gestion barème débutants pour F11/F12
    if ((classe === 11 || classe === 12) && state.experiencePro < 6) {
        let tranche = 0;
        if (state.experiencePro >= 4) tranche = 4;
        else if (state.experiencePro >= 2) tranche = 2;
        const bareme = CONFIG.BAREME_DEBUTANTS[classe];
        baseSMH = bareme[tranche];
    }
    
    // En mode SMH seul, on retourne uniquement la base + forfait
    if (mode === 'smh-only') {
        const tauxForfait = isCadreValue && state.forfait && CONFIG.FORFAITS[state.forfait];
        const forfaitMontant = (tauxForfait && tauxForfait > 0) ? Math.round(baseSMH * tauxForfait) : 0;
        return {
            scenario: 'smh-only',
            baseSMH,
            total: baseSMH + forfaitMontant,
            details: [{
                label: `SMH Base (${groupe}${classe})`,
                value: baseSMH,
                isBase: true
            }],
            isCadre: isCadreValue,
            groupe,
            classe
        };
    }
    
    // Mode full : calcul complet
    if (!isCadreValue) {
        // SCÉNARIO 1 : Non-Cadres (Classes 1 à 10)
        scenario = 'non-cadre';
        details.push({
            label: `SMH Base (${groupe}${classe})`,
            value: baseSMH,
            isBase: true
        });
        
        // Prime d'ancienneté - PRINCIPE DE FAVEUR (Art. L2254-2 Code du Travail)
        // Comparer CCN et Accord, appliquer la règle la plus avantageuse
        let primeAncienneteCCN = { montant: 0 };
        let primeAncienneteAccord = { montant: 0 };
        
        // Calculer les deux primes
        if (state.anciennete >= CONFIG.ANCIENNETE.seuil) {
            primeAncienneteCCN = calculatePrimeAncienneteCCN(state.pointTerritorial, classe, state.anciennete);
        }
        
        if (agreement && agreement.anciennete && agreement.anciennete.tousStatuts && state.anciennete >= agreement.anciennete.seuil) {
            primeAncienneteAccord = calculatePrimeAncienneteAccord(agreement, baseSMH, state.anciennete);
        }
        
        // Appliquer le principe de faveur : choisir la prime la plus avantageuse
        if (primeAncienneteCCN.montant > 0 || primeAncienneteAccord.montant > 0) {
            if (primeAncienneteAccord.montant > primeAncienneteCCN.montant) {
                // Accord plus avantageux
                details.push({
                    label: `Prime ancienneté ${agreement.nomCourt} (${formatMoney(baseSMH)} × ${primeAncienneteAccord.taux}%)`,
                    value: primeAncienneteAccord.montant,
                    isPositive: true,
                    isAgreement: true,
                    agreementId: agreement.id,
                    note: primeAncienneteCCN.montant > 0 ? 'Plus avantageux que CCN' : ''
                });
                total += primeAncienneteAccord.montant;
            } else if (primeAncienneteCCN.montant > 0) {
                // CCN plus avantageux ou seul disponible
                details.push({
                    label: `Prime ancienneté CCN (${state.pointTerritorial}€ × ${primeAncienneteCCN.taux}% × ${primeAncienneteCCN.annees} ans × 12)`,
                    value: primeAncienneteCCN.montant,
                    isPositive: true,
                    note: primeAncienneteAccord.montant > 0 ? 'Plus avantageux que l\'accord' : ''
                });
                total += primeAncienneteCCN.montant;
            }
        }
        
    } else if ((classe === 11 || classe === 12) && state.experiencePro < 6) {
        // SCÉNARIO 3 : Cadres Débutants (F11/F12 avec expérience < 6 ans)
        scenario = 'cadre-debutant';
        
        let labelTranche = '< 2 ans';
        if (state.experiencePro >= 4) labelTranche = '4 à 6 ans';
        else if (state.experiencePro >= 2) labelTranche = '2 à 4 ans';
        
        details.push({
            label: `Barème débutants ${groupe}${classe} (${labelTranche})`,
            value: baseSMH,
            isBase: true
        });
        
        // Majoration forfait
        const tauxForfait = CONFIG.FORFAITS[state.forfait];
        if (tauxForfait > 0) {
            const montantForfait = Math.round(baseSMH * tauxForfait);
            const labelForfait = state.forfait === 'heures' ? 'Forfait Heures (+15%)' : 'Forfait Jours (+30%)';
            details.push({
                label: labelForfait,
                value: montantForfait,
                isPositive: true
            });
            total = baseSMH + montantForfait;
        } else {
            total = baseSMH;
        }
        
        // Prime ancienneté accord (si applicable aux cadres)
        if (agreement && agreement.anciennete && agreement.anciennete.tousStatuts) {
            const primeAccord = calculatePrimeAncienneteAccord(agreement, baseSMH, state.anciennete);
            if (primeAccord.montant > 0) {
                details.push({
                    label: `Prime ancienneté ${agreement.nomCourt} (${formatMoney(baseSMH)} × ${primeAccord.taux}%)`,
                    value: primeAccord.montant,
                    isPositive: true,
                    isAgreement: true,
                    agreementId: agreement.id
                });
                total += primeAccord.montant;
            }
        }
        
    } else {
        // SCÉNARIO 2 : Cadres Confirmés (Classes 11 à 18)
        scenario = 'cadre';
        details.push({
            label: `SMH Base (${groupe}${classe})`,
            value: baseSMH,
            isBase: true
        });
        
        // Majoration forfait
        const tauxForfait = CONFIG.FORFAITS[state.forfait];
        if (tauxForfait > 0) {
            const montantForfait = Math.round(baseSMH * tauxForfait);
            const labelForfait = state.forfait === 'heures' ? 'Forfait Heures (+15%)' : 'Forfait Jours (+30%)';
            details.push({
                label: labelForfait,
                value: montantForfait,
                isPositive: true
            });
            total += montantForfait;
        }
        
        // Prime ancienneté accord (si applicable aux cadres)
        if (agreement && agreement.anciennete && agreement.anciennete.tousStatuts) {
            const primeAccord = calculatePrimeAncienneteAccord(agreement, baseSMH, state.anciennete);
            if (primeAccord.montant > 0) {
                details.push({
                    label: `Prime ancienneté ${agreement.nomCourt} (${formatMoney(baseSMH)} × ${primeAccord.taux}%)`,
                    value: primeAccord.montant,
                    isPositive: true,
                    isAgreement: true,
                    agreementId: agreement.id
                });
                total += primeAccord.montant;
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // MAJORATIONS CONDITIONS DE TRAVAIL
    // Non-Cadres : toujours | Cadres : sauf forfait jours (repos)
    // ═══════════════════════════════════════════════════════════════
    
    const isForfaitJours = isCadreValue && state.forfait === 'jours';
    
    if (!isForfaitJours) {
        // Calculer le taux horaire de base (pour les majorations)
        const tauxHoraire = baseSMH / 12 / 151.67;
        
        // Majoration nuit
        if (state.typeNuit !== 'aucun' && state.heuresNuit > 0) {
            const majNuit = calculateMajorationNuit(state.typeNuit, state.heuresNuit, tauxHoraire, agreement);
            const typePoste = state.typeNuit === 'poste-nuit' ? 'poste nuit' : 'poste matin/AM';
            const labelNuit = agreement 
                ? `Majoration nuit ${typePoste} (+${majNuit.taux}% ${agreement.nomCourt})`
                : `Majoration nuit (+${majNuit.taux}% CCN)`;
            details.push({
                label: `${labelNuit} (${state.heuresNuit}h/mois)`,
                value: majNuit.montantAnnuel,
                isPositive: true,
                isAgreement: majNuit.source !== 'CCN',
                agreementId: agreement?.id
            });
            total += majNuit.montantAnnuel;
        }
        
        // Majoration dimanche
        if (state.travailDimanche && state.heuresDimanche > 0) {
            const majDim = calculateMajorationDimanche(state.heuresDimanche, tauxHoraire, agreement);
            const labelDim = agreement 
                ? `Majoration dimanche (+${majDim.taux}% ${agreement.nomCourt})` 
                : `Majoration dimanche (+${majDim.taux}% CCN)`;
            details.push({
                label: `${labelDim} (${state.heuresDimanche}h/mois)`,
                value: majDim.montantAnnuel,
                isPositive: true,
                isAgreement: majDim.source !== 'CCN',
                agreementId: agreement?.id
            });
            total += majDim.montantAnnuel;
        }
        
        // Prime d'équipe (accord d'entreprise, non-cadres uniquement)
        if (agreement && !isCadreValue && state.travailEquipe && state.heuresEquipe > 0) {
            const primeEquipe = calculatePrimeEquipe(agreement, state.heuresEquipe);
            if (primeEquipe.montantAnnuel > 0) {
                details.push({
                    label: `Prime équipe (${state.heuresEquipe}h × ${primeEquipe.tauxHoraire}€ ${agreement.nomCourt})`,
                    value: primeEquipe.montantAnnuel,
                    isPositive: true,
                    isAgreement: true,
                    agreementId: agreement.id
                });
                total += primeEquipe.montantAnnuel;
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // PRIMES SPÉCIFIQUES ACCORD D'ENTREPRISE
    // ═══════════════════════════════════════════════════════════════
    
    if (agreement) {
        // Prime de vacances (avec vérification des conditions d'ancienneté)
        const primeVacances = getPrimeVacances(agreement, state.primeVacances, state.anciennete);
        if (primeVacances > 0) {
            const moisVersement = agreement.primes?.vacances?.moisVersement || 7;
            const moisNom = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][moisVersement - 1];
            details.push({
                label: `Prime de vacances ${agreement.nomCourt} (${moisNom})`,
                value: primeVacances,
                isPositive: true,
                isAgreement: true,
                agreementId: agreement.id
            });
            total += primeVacances;
        }
    }
    
    return {
        scenario,
        baseSMH,
        total,
        details,
        isCadre: isCadreValue,
        groupe,
        classe
    };
}

/**
 * Obtenir le montant annuel brut de l'assiette SMH (SMH seul)
 * Wrapper de calculateAnnualRemuneration avec mode 'smh-only'
 * @param {Object} state - État de l'application
 * @returns {number} Montant annuel de l'assiette SMH
 */
export function getMontantAnnuelSMHSeul(state) {
    const result = calculateAnnualRemuneration(state, null, { mode: 'smh-only' });
    return result.total;
}
