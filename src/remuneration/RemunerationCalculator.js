/**
 * ============================================
 * REMUNERATION CALCULATOR - Calculateur Principal
 * ============================================
 *
 * Source unique de vérité pour tous les calculs de rémunération.
 * Utilise uniquement l'API générique : computePrime, computeMajoration, computeForfait
 * avec des définitions convention (CCN) ou accord. Séparation nette convention / accord.
 */

import { CONFIG } from '../core/config.js';
import { getActiveClassification, isCadre } from '../classification/ClassificationEngine.js';
import { computePrime } from './PrimeCalculator.js';
import { computeMajoration } from './MajorationCalculator.js';
import { computeForfait } from './ForfaitCalculator.js';
import { formatMoney } from '../utils/formatters.js';
import { getAccordInput, getAccordPrimeDefsAsElements } from '../agreements/AgreementInterface.js';
import { getConventionPrimeDefs, getConventionMajorationDefs, getConventionForfaitDefs } from '../convention/ConventionCatalog.js';
import { SEMANTIC_ID, SOURCE_ACCORD } from '../core/RemunerationTypes.js';

/**
 * Construit le contexte de calcul commun (state + bases).
 * @private
 */
function buildContext(state, baseSMH, classe, agreement) {
    const tauxHoraire = baseSMH > 0 ? baseSMH / 12 / 151.67 : 0;
    return {
        state,
        baseSMH,
        salaireBase: baseSMH,
        pointTerritorial: state.pointTerritorial,
        classe,
        agreement,
        tauxHoraire
    };
}

/**
 * Définition prime ancienneté accord (pour principe de faveur).
 * Entièrement dérivée de agreement.anciennete : seuil, plafond, barème, majoration forfait jours
 * sont lus depuis l'instance d'accord (fichier accords/xxx.js). Modifier cet objet dans l'accord suffit.
 * @private
 */
function buildAccordPrimeAncienneteDef(agreement) {
    if (!agreement?.anciennete) return null;
    return {
        id: 'primeAnciennete',
        semanticId: SEMANTIC_ID.PRIME_ANCIENNETE,
        kind: 'prime',
        source: SOURCE_ACCORD,
        valueKind: 'pourcentage',
        label: `Prime ancienneté ${agreement.nomCourt}`,
        config: { barème: agreement.anciennete.barème }
    };
}

/**
 * Définitions majorations accord (nuit, dimanche).
 * @private
 */
function buildAccordMajorationDefs(agreement) {
    if (!agreement?.majorations) return [];
    const defs = [];
    if (agreement.majorations.nuit) {
        defs.push({
            id: 'majorationNuit',
            semanticId: SEMANTIC_ID.MAJORATION_NUIT,
            kind: 'majoration',
            source: SOURCE_ACCORD,
            valueKind: 'pourcentage',
            label: `Majoration nuit ${agreement.nomCourt}`,
            config: {}
        });
    }
    if (agreement.majorations.dimanche != null) {
        defs.push({
            id: 'majorationDimanche',
            semanticId: SEMANTIC_ID.MAJORATION_DIMANCHE,
            kind: 'majoration',
            source: SOURCE_ACCORD,
            valueKind: 'pourcentage',
            label: `Majoration dimanche ${agreement.nomCourt}`,
            config: {}
        });
    }
    return defs;
}

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
    const { mode = 'full' } = options;

    if (!state) {
        throw new Error('State is required for calculateAnnualRemuneration');
    }

    const { groupe, classe } = getActiveClassification(state);

    if (!classe || classe < 1 || classe > 18) {
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

    let baseSMH = CONFIG.SMH[classe];
    if (!baseSMH || isNaN(baseSMH)) {
        console.error('SMH invalide pour classe', classe, ':', baseSMH);
        baseSMH = 0;
    }

    if ((classe === 11 || classe === 12) && state.experiencePro < 6) {
        let tranche = 0;
        if (state.experiencePro >= 4) tranche = 4;
        else if (state.experiencePro >= 2) tranche = 2;
        const bareme = CONFIG.BAREME_DEBUTANTS[classe];
        baseSMH = bareme[tranche];
    }

    let scenario = '';
    let details = [];
    let total = baseSMH;
    const context = buildContext(state, baseSMH, classe, agreement);

    // ─── Mode SMH seul ───
    if (mode === 'smh-only') {
        const forfaitDefs = getConventionForfaitDefs();
        const forfaitDef = forfaitDefs.find(d => d.config?.forfaitKey === state.forfait);
        const forfaitResult = forfaitDef ? computeForfait(forfaitDef, context) : { amount: 0 };
        const forfaitMontant = forfaitResult.amount || 0;
        return {
            scenario: 'smh-only',
            baseSMH,
            total: baseSMH + forfaitMontant,
            details: [{ label: `SMH Base (${groupe}${classe})`, value: baseSMH, isBase: true }],
            isCadre: isCadreValue,
            groupe,
            classe
        };
    }

    // ─── Mode full ───
    if (!isCadreValue) {
        scenario = 'non-cadre';
        details.push({ label: `SMH Base (${groupe}${classe})`, value: baseSMH, isBase: true });

        // Prime ancienneté : principe de faveur (convention vs accord)
        const convPrimeDefs = getConventionPrimeDefs();
        const defAncienneteCCN = convPrimeDefs.find(d => d.semanticId === SEMANTIC_ID.PRIME_ANCIENNETE);
        const rCCN = defAncienneteCCN ? computePrime(defAncienneteCCN, context) : { amount: 0 };
        const defAncienneteAccord = buildAccordPrimeAncienneteDef(agreement);
        const rAccord = defAncienneteAccord && agreement.anciennete.tousStatuts && state.anciennete >= agreement.anciennete.seuil
            ? computePrime(defAncienneteAccord, context)
            : { amount: 0 };

        if (rCCN.amount > 0 || rAccord.amount > 0) {
            if (rAccord.amount > rCCN.amount) {
                const suffixForfait = rAccord.meta?.majorationForfaitJours ? ' × 1,30 forfait jours' : '';
                details.push({
                    label: `${defAncienneteAccord.label} (${formatMoney(baseSMH)} × ${rAccord.meta?.taux ?? 0}%${suffixForfait})`,
                    value: rAccord.amount,
                    isPositive: true,
                    isAgreement: true,
                    agreementId: agreement.id,
                    note: rCCN.amount > 0 ? 'Plus avantageux que CCN' : ''
                });
                total += rAccord.amount;
            } else {
                details.push({
                    label: `Prime ancienneté CCN (${state.pointTerritorial}€ × ${rCCN.meta?.taux ?? 0}% × ${rCCN.meta?.annees ?? 0} ans × 12)`,
                    value: rCCN.amount,
                    isPositive: true,
                    note: rAccord.amount > 0 ? 'Plus avantageux que l\'accord' : ''
                });
                total += rCCN.amount;
            }
        }
    } else if (isGroupeF && state.experiencePro < 6) {
        scenario = 'cadre-debutant';
        let labelTranche = '< 2 ans';
        if (state.experiencePro >= 4) labelTranche = '4 à 6 ans';
        else if (state.experiencePro >= 2) labelTranche = '2 à 4 ans';
        details.push({
            label: `Barème débutants ${groupe}${classe} (${labelTranche})`,
            value: baseSMH,
            isBase: true
        });

        const forfaitDefs = getConventionForfaitDefs();
        const forfaitDef = forfaitDefs.find(d => d.config?.forfaitKey === state.forfait);
        if (forfaitDef) {
            const rForfait = computeForfait(forfaitDef, context);
            if (rForfait.amount > 0) {
                details.push({ label: rForfait.label, value: rForfait.amount, isPositive: true });
                total += rForfait.amount;
            }
        }

        if (agreement?.anciennete?.tousStatuts) {
            const defAccord = buildAccordPrimeAncienneteDef(agreement);
            const rAccord = computePrime(defAccord, context);
            if (rAccord.amount > 0) {
                const suffixForfait = rAccord.meta?.majorationForfaitJours ? ' × 1,30 forfait jours' : '';
                details.push({
                    label: rAccord.label + ` (${formatMoney(baseSMH)} × ${rAccord.meta?.taux ?? 0}%${suffixForfait})`,
                    value: rAccord.amount,
                    isPositive: true,
                    isAgreement: true,
                    agreementId: agreement.id
                });
                total += rAccord.amount;
            }
        }
    } else {
        scenario = 'cadre';
        details.push({ label: `SMH Base (${groupe}${classe})`, value: baseSMH, isBase: true });

        const forfaitDefs = getConventionForfaitDefs();
        const forfaitDef = forfaitDefs.find(d => d.config?.forfaitKey === state.forfait);
        if (forfaitDef) {
            const rForfait = computeForfait(forfaitDef, context);
            if (rForfait.amount > 0) {
                details.push({ label: rForfait.label, value: rForfait.amount, isPositive: true });
                total += rForfait.amount;
            }
        }

        if (agreement?.anciennete?.tousStatuts) {
            const defAccord = buildAccordPrimeAncienneteDef(agreement);
            const rAccord = computePrime(defAccord, context);
            if (rAccord.amount > 0) {
                const suffixForfait = rAccord.meta?.majorationForfaitJours ? ' × 1,30 forfait jours' : '';
                details.push({
                    label: rAccord.label + ` (${formatMoney(baseSMH)} × ${rAccord.meta?.taux ?? 0}%${suffixForfait})`,
                    value: rAccord.amount,
                    isPositive: true,
                    isAgreement: true,
                    agreementId: agreement.id
                });
                total += rAccord.amount;
            }
        }
    }

    // ─── Majorations conditions de travail ───
    const isForfaitJours = isCadreValue && state.forfait === 'jours';
    if (!isForfaitJours) {
        const convMajDefs = getConventionMajorationDefs();
        const accordMajDefs = buildAccordMajorationDefs(agreement);

        const defNuit = (accordMajDefs.length && state.typeNuit !== 'aucun') 
            ? accordMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_NUIT) ?? convMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_NUIT)
            : convMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_NUIT);
        if (defNuit && state.typeNuit !== 'aucun' && state.heuresNuit > 0) {
            const rNuit = computeMajoration(defNuit, context);
            if (rNuit.amount > 0) {
                const typePoste = state.typeNuit === 'poste-nuit' ? 'poste nuit' : 'poste matin/AM';
                details.push({
                    label: `Majoration nuit ${typePoste} (+${rNuit.meta?.taux ?? 0}%) (${state.heuresNuit}h/mois)`,
                    value: rNuit.amount,
                    isPositive: true,
                    isAgreement: rNuit.source === SOURCE_ACCORD,
                    agreementId: agreement?.id
                });
                total += rNuit.amount;
            }
        }

        const defDim = (accordMajDefs.length && state.heuresDimanche > 0)
            ? accordMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_DIMANCHE) ?? convMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_DIMANCHE)
            : convMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_DIMANCHE);
        if (defDim && state.travailDimanche && state.heuresDimanche > 0) {
            const rDim = computeMajoration(defDim, context);
            if (rDim.amount > 0) {
                details.push({
                    label: `Majoration dimanche (+${rDim.meta?.taux ?? 0}%) (${state.heuresDimanche}h/mois)`,
                    value: rDim.amount,
                    isPositive: true,
                    isAgreement: rDim.source === SOURCE_ACCORD,
                    agreementId: agreement?.id
                });
                total += rDim.amount;
            }
        }
    }

    // Primes accord (horaire, montant) — toujours si accord actif (tous profils : non-cadre, cadre 35h, cadre forfait jours)
    if (agreement) {
        const accordPrimeDefs = getAccordPrimeDefsAsElements(agreement);
        for (const def of accordPrimeDefs) {
            if (def.semanticId === SEMANTIC_ID.PRIME_ANCIENNETE) continue;
            const actif = getAccordInput(state, def.config?.stateKeyActif);
            if (actif !== true && actif !== 'true') continue;
            const r = computePrime(def, context);
            if (r.amount > 0) {
                let label = r.label;
                if (def.valueKind === 'horaire' && r.meta?.heures != null) {
                    label = `${r.label} (${r.meta.heures}h × ${r.meta.tauxHoraire ?? 0}€ ${agreement.nomCourt})`;
                } else if (def.valueKind === 'montant' && def.config?.moisVersement != null) {
                    const moisNom = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][def.config.moisVersement - 1];
                    label = `${r.label} ${agreement.nomCourt} (${moisNom})`;
                } else {
                    label = `${r.label} ${agreement.nomCourt}`;
                }
                details.push({
                    label,
                    value: r.amount,
                    isPositive: true,
                    isAgreement: true,
                    agreementId: agreement.id
                });
                total += r.amount;
            }
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
 * @param {Object} state - État de l'application
 * @returns {number} Montant annuel de l'assiette SMH
 */
export function getMontantAnnuelSMHSeul(state) {
    const result = calculateAnnualRemuneration(state, null, { mode: 'smh-only' });
    return result.total;
}
