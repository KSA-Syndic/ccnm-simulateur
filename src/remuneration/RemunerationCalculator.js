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

function resolveReferenceYear(date) {
    const requestedYear = date instanceof Date && !Number.isNaN(date.getTime())
        ? date.getFullYear()
        : (CONFIG.SMH_UPDATE?.referenceYear ?? new Date().getFullYear());
    const years = Object.keys(CONFIG.SMH_BY_YEAR || {}).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    if (!years.length) return requestedYear;
    if (requestedYear <= years[0]) return years[0];
    if (requestedYear >= years[years.length - 1]) return years[years.length - 1];
    let selected = years[0];
    for (const y of years) {
        if (y <= requestedYear) selected = y;
    }
    return selected;
}

function getSmhForClasse(classe, date) {
    const year = resolveReferenceYear(date);
    const smhYear = CONFIG.SMH_BY_YEAR?.[year];
    return {
        year,
        amount: smhYear?.[classe] ?? CONFIG.SMH?.[classe] ?? 0
    };
}

function getBaremeDebutantForClasse(classe, tranche, date) {
    const year = resolveReferenceYear(date);
    const baremeYear = CONFIG.BAREME_DEBUTANTS_BY_YEAR?.[year]?.[classe];
    const defaultBareme = CONFIG.BAREME_DEBUTANTS?.[classe];
    return {
        year,
        amount: baremeYear?.[tranche] ?? defaultBareme?.[tranche] ?? 0
    };
}

function isCadreForfaitJours(classe, state) {
    return isCadre(classe) && state?.forfait === 'jours';
}

/**
 * Construit le contexte de calcul commun (state + bases).
 * @private
 */
function buildContext(state, baseSMH, classe, agreement) {
    const heuresBaseMensuelles = CONFIG.DUREE_LEGALE_HEURES_MOIS ?? 151.67;
    const tauxHoraireBase = baseSMH > 0 ? baseSMH / 12 / heuresBaseMensuelles : 0;
    const hsActif = !isCadreForfaitJours(classe, state) && state?.travailHeuresSup === true;
    const heuresSup = hsActif ? (Number(state?.heuresSup) || 0) : 0;
    const seuilMensuel = CONFIG.HEURES_SUP_TRANCHE_1_MENSUELLES ?? 34.67;
    const heures25 = Math.min(Math.max(heuresSup, 0), seuilMensuel);
    const heures50 = Math.max(heuresSup - seuilMensuel, 0);
    const hsAgreement = agreement?.majorations?.heuresSupplementaires || {};
    const taux25 = hsAgreement.majoration25 ?? CONFIG.MAJORATIONS_CCN.heuresSup25 ?? 0.25;
    const taux50 = hsAgreement.majoration50 ?? CONFIG.MAJORATIONS_CCN.heuresSup50 ?? 0.50;
    // Taux horaire de référence unifié : base 35h, majoré par la structure d'heures sup si active.
    // Sert aux modalités horaires (prime équipe CCN, majorations en % du taux horaire, etc.).
    const coeffMajorationHS = hsActif && (heures25 > 0 || heures50 > 0)
        ? ((heuresBaseMensuelles + (heures25 * (1 + taux25)) + (heures50 * (1 + taux50))) / (heuresBaseMensuelles + heures25 + heures50))
        : 1;
    const tauxHoraire = Math.round((tauxHoraireBase * coeffMajorationHS) * 10000) / 10000;
    return {
        state,
        baseSMH,
        salaireBase: baseSMH,
        pointTerritorial: state.pointTerritorial,
        classe,
        agreement,
        tauxHoraire,
        tauxHoraireBase,
        coeffMajorationHS
    };
}

/**
 * Définition prime ancienneté accord (pour principe de faveur).
 * Entièrement dérivée de agreement.anciennete : seuil, plafond, barème
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
        config: {
            barème: agreement.anciennete.barème,
            inclusDansSMH: agreement.anciennete.inclusDansSMH === true
        }
    };
}

function getAncienneteConfigInclusion() {
    // Priorité au CONFIG global runtime (config.js racine) si disponible.
    const globalValue = (typeof window !== 'undefined' && window?.CONFIG?.ANCIENNETE)
        ? window.CONFIG.ANCIENNETE.inclusDansSMH
        : undefined;
    if (typeof globalValue === 'boolean') return globalValue;
    return CONFIG?.ANCIENNETE?.inclusDansSMH === true;
}

function resolveAncienneteSmhInclusion(explicitInclusion, source) {
    // Règle de priorité :
    // 1) Accord explicite (surcharge)
    // 2) Paramètre global config
    // 3) false
    if (source === 'accord' && typeof explicitInclusion === 'boolean') {
        return explicitInclusion;
    }
    if (source === 'ccn' && typeof explicitInclusion === 'boolean') {
        return explicitInclusion;
    }
    return getAncienneteConfigInclusion();
}

function resolveAnciennetePrime(state, context, convPrimeDefs, agreement, isCadreValue) {
    const candidates = [];

    const defAncienneteCCN = convPrimeDefs.find(d => d.semanticId === SEMANTIC_ID.PRIME_ANCIENNETE);
    if (!isCadreValue && defAncienneteCCN) {
        const rCCN = computePrime(defAncienneteCCN, context);
        if (rCCN.amount > 0) {
            candidates.push({
                source: 'ccn',
                result: rCCN,
                isAgreement: false,
                isSMHIncluded: resolveAncienneteSmhInclusion(defAncienneteCCN.config?.inclusDansSMH, 'ccn'),
                label: `Prime ancienneté CCN (${state.pointTerritorial}€ × ${rCCN.meta?.taux ?? 0}% × ${rCCN.meta?.annees ?? 0} ans × 12)`
            });
        }
    }

    const defAncienneteAccord = buildAccordPrimeAncienneteDef(agreement);
    if (defAncienneteAccord) {
        const seuil = agreement?.anciennete?.seuil ?? 0;
        const eligibleByStatus = !isCadreValue || agreement?.anciennete?.tousStatuts === true;
        const eligibleByAnciennete = (state?.anciennete ?? 0) >= seuil;
        if (eligibleByStatus && eligibleByAnciennete) {
            const rAccord = computePrime(defAncienneteAccord, context);
            if (rAccord.amount > 0) {
                candidates.push({
                    source: 'accord',
                    result: rAccord,
                    isAgreement: true,
                    isSMHIncluded: resolveAncienneteSmhInclusion(defAncienneteAccord.config?.inclusDansSMH, 'accord'),
                    label: `${defAncienneteAccord.label} (${formatMoney(context.baseSMH)} × ${rAccord.meta?.taux ?? 0}%)`
                });
            }
        }
    }

    if (!candidates.length) return null;
    const selected = candidates.reduce((best, cur) => (cur.result.amount > best.result.amount ? cur : best), candidates[0]);
    const hasAlternative = candidates.length > 1;
    return {
        ...selected,
        note: hasAlternative
            ? (selected.isAgreement ? 'Plus avantageux que CCN' : 'Plus avantageux que l\'accord')
            : ''
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
    const hs = agreement.majorations.heuresSupplementaires;
    if (hs && (hs.majoration25 != null || hs.majoration50 != null)) {
        defs.push({
            id: 'majorationHeuresSup25',
            semanticId: SEMANTIC_ID.MAJORATION_HEURES_SUP_25,
            kind: 'majoration',
            source: SOURCE_ACCORD,
            valueKind: 'pourcentage',
            label: `Majoration heures supplémentaires (+25%) ${agreement.nomCourt}`,
            config: { stateKeyActif: 'travailHeuresSup', stateKeyHeures: 'heuresSup' }
        });
        defs.push({
            id: 'majorationHeuresSup50',
            semanticId: SEMANTIC_ID.MAJORATION_HEURES_SUP_50,
            kind: 'majoration',
            source: SOURCE_ACCORD,
            valueKind: 'pourcentage',
            label: `Majoration heures supplémentaires (+50%) ${agreement.nomCourt}`,
            config: { stateKeyActif: 'travailHeuresSup', stateKeyHeures: 'heuresSup' }
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
    const { mode = 'full', date } = options;

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

    const smhByYear = getSmhForClasse(classe, date);
    let baseSMH = smhByYear.amount;
    if (!baseSMH || isNaN(baseSMH)) {
        console.error('SMH invalide pour classe', classe, ':', baseSMH);
        baseSMH = 0;
    }

    if ((classe === 11 || classe === 12) && state.experiencePro < 6) {
        let tranche = 0;
        if (state.experiencePro >= 4) tranche = 4;
        else if (state.experiencePro >= 2) tranche = 2;
        const baremeByYear = getBaremeDebutantForClasse(classe, tranche, date);
        baseSMH = baremeByYear.amount;
    }

    let scenario = '';
    let details = [];
    let total = baseSMH;
    const context = buildContext(state, baseSMH, classe, agreement);
    const convPrimeDefs = getConventionPrimeDefs();

    // ─── Mode SMH seul ───
    if (mode === 'smh-only') {
        const forfaitDefs = getConventionForfaitDefs();
        const forfaitDef = forfaitDefs.find(d => d.config?.forfaitKey === state.forfait);
        const forfaitResult = forfaitDef ? computeForfait(forfaitDef, context) : { amount: 0 };
        const forfaitMontant = forfaitResult.amount || 0;
        let totalSmh = baseSMH + forfaitMontant;
        const detailsSmh = [{ label: `SMH Base (${groupe}${classe})`, value: baseSMH, isBase: true }];

        const ancienneteRetenue = resolveAnciennetePrime(state, context, convPrimeDefs, agreement, isCadreValue);
        if (ancienneteRetenue && ancienneteRetenue.isSMHIncluded) {
            detailsSmh.push({
                label: 'Prime ancienneté assiette SMH',
                value: ancienneteRetenue.result.amount,
                isPositive: true,
                isSMHIncluded: true,
                isAgreement: ancienneteRetenue.isAgreement,
                semanticId: SEMANTIC_ID.PRIME_ANCIENNETE,
                note: ancienneteRetenue.note
            });
            totalSmh += ancienneteRetenue.result.amount;
        }

        // Assiette SMH (Art. 140) : inclure les majorations d'heures supplémentaires,
        // avec taux CCN par défaut et surcharge accord si disponible.
        const isForfaitJours = isCadreForfaitJours(classe, state);
        if (!isForfaitJours && state.travailHeuresSup === true && (Number(state.heuresSup) || 0) > 0) {
            const convMajDefs = getConventionMajorationDefs();
            const accordMajDefs = buildAccordMajorationDefs(agreement);
            const defHs25 = (accordMajDefs.length)
                ? accordMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_25) ?? convMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_25)
                : convMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_25);
            const defHs50 = (accordMajDefs.length)
                ? accordMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_50) ?? convMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_50)
                : convMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_50);
            if (defHs25) {
                const rHs25 = computeMajoration(defHs25, context);
                if (rHs25.amount > 0) {
                    detailsSmh.push({
                        label: `Heures supplémentaires assiette SMH (+${rHs25.meta?.taux ?? 0}%) (${Math.round((rHs25.meta?.heures ?? 0) * 100) / 100}h/mois)`,
                        value: rHs25.amount,
                        isPositive: true,
                        isSMHIncluded: true,
                        isAgreement: rHs25.source === SOURCE_ACCORD
                    });
                    totalSmh += rHs25.amount;
                }
            }
            if (defHs50) {
                const rHs50 = computeMajoration(defHs50, context);
                if (rHs50.amount > 0) {
                    detailsSmh.push({
                        label: `Heures supplémentaires assiette SMH (+${rHs50.meta?.taux ?? 0}%) (${Math.round((rHs50.meta?.heures ?? 0) * 100) / 100}h/mois)`,
                        value: rHs50.amount,
                        isPositive: true,
                        isSMHIncluded: true,
                        isAgreement: rHs50.source === SOURCE_ACCORD
                    });
                    totalSmh += rHs50.amount;
                }
            }
        }
        return {
            scenario: 'smh-only',
            baseSMH,
            total: totalSmh,
            details: detailsSmh,
            isCadre: isCadreValue,
            groupe,
            classe
        };
    }

    // ─── Mode full ───
    if (!isCadreValue) {
        scenario = 'non-cadre';
        details.push({ label: `SMH Base (${groupe}${classe})`, value: baseSMH, isBase: true });
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
    }

    // Prime ancienneté : principe de faveur CCN/accord + inclusion SMH paramétrable
    const ancienneteRetenue = resolveAnciennetePrime(state, context, convPrimeDefs, agreement, isCadreValue);
    if (ancienneteRetenue) {
        details.push({
            label: ancienneteRetenue.label,
            value: ancienneteRetenue.result.amount,
            isPositive: ancienneteRetenue.isSMHIncluded !== true,
            isSMHIncluded: ancienneteRetenue.isSMHIncluded === true,
            isAgreement: ancienneteRetenue.isAgreement,
            agreementId: ancienneteRetenue.isAgreement ? agreement?.id : undefined,
            semanticId: SEMANTIC_ID.PRIME_ANCIENNETE,
            note: ancienneteRetenue.note
        });
        if (!ancienneteRetenue.isSMHIncluded) {
            total += ancienneteRetenue.result.amount;
        }
    }

    // Prime d'équipe : modalité CCN par défaut (30 min du SMH horaire), surchargeable par l'accord actif
    if (!isCadreValue) {
        const defEquipeCCN = convPrimeDefs.find(d => d.semanticId === SEMANTIC_ID.PRIME_EQUIPE);
        const rEquipeCCN = defEquipeCCN ? computePrime(defEquipeCCN, context) : { amount: 0 };
        const accordPrimeDefs = agreement ? getAccordPrimeDefsAsElements(agreement) : [];
        const defEquipeAccord = accordPrimeDefs.find(d => d.semanticId === SEMANTIC_ID.PRIME_EQUIPE || d.id === 'primeEquipe');
        const rEquipeAccord = defEquipeAccord ? computePrime(defEquipeAccord, context) : { amount: 0 };
        const equipeRetenue = defEquipeAccord ? rEquipeAccord : rEquipeCCN;
        if (equipeRetenue.amount > 0) {
            const taux = equipeRetenue.meta?.tauxHoraire ?? 0;
            const heures = equipeRetenue.meta?.heures ?? (state.heuresEquipe ?? 0);
            const suffixAccord = agreement ? ` ${agreement.nomCourt}` : '';
            details.push({
                label: `Prime d'équipe${equipeRetenue.source === SOURCE_ACCORD ? suffixAccord : ' CCN'} (${heures}h × +${taux}€)`,
                value: equipeRetenue.amount,
                isPositive: true,
                isAgreement: equipeRetenue.source === SOURCE_ACCORD,
                agreementId: equipeRetenue.source === SOURCE_ACCORD ? agreement?.id : undefined
            });
            total += equipeRetenue.amount;
        }
    }

    // ─── Majorations conditions de travail ───
    const isForfaitJours = isCadreForfaitJours(classe, state);
    if (!isForfaitJours) {
        const convMajDefs = getConventionMajorationDefs();
        const accordMajDefs = buildAccordMajorationDefs(agreement);

        const hasNuitClassique = state.typeNuit !== 'aucun' && (state.heuresNuit ?? 0) > 0;
        const defNuit = (accordMajDefs.length && hasNuitClassique)
            ? accordMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_NUIT) ?? convMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_NUIT)
            : convMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_NUIT);
        if (defNuit && hasNuitClassique) {
            const rNuit = computeMajoration(defNuit, context);
            if (rNuit.amount > 0) {
                details.push({
                    label: `Majoration nuit (+${rNuit.meta?.taux ?? 0}%) (${state.heuresNuit}h/mois)`,
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

        const hsActif = !isForfaitJours && state.travailHeuresSup === true && (Number(state.heuresSup) || 0) > 0;
        if (hsActif) {
            const defHs25 = (accordMajDefs.length)
                ? accordMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_25) ?? convMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_25)
                : convMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_25);
            const defHs50 = (accordMajDefs.length)
                ? accordMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_50) ?? convMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_50)
                : convMajDefs.find(d => d.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_50);
            if (defHs25) {
                const rHs25 = computeMajoration(defHs25, context);
                if (rHs25.amount > 0) {
                    details.push({
                        label: `Majoration heures supplémentaires (+${rHs25.meta?.taux ?? 0}%) (${Math.round((rHs25.meta?.heures ?? 0) * 100) / 100}h/mois)`,
                        value: rHs25.amount,
                        isPositive: true,
                        isAgreement: rHs25.source === SOURCE_ACCORD,
                        agreementId: agreement?.id
                    });
                    total += rHs25.amount;
                }
            }
            if (defHs50) {
                const rHs50 = computeMajoration(defHs50, context);
                if (rHs50.amount > 0) {
                    details.push({
                        label: `Majoration heures supplémentaires (+${rHs50.meta?.taux ?? 0}%) (${Math.round((rHs50.meta?.heures ?? 0) * 100) / 100}h/mois)`,
                        value: rHs50.amount,
                        isPositive: true,
                        isAgreement: rHs50.source === SOURCE_ACCORD,
                        agreementId: agreement?.id
                    });
                    total += rHs50.amount;
                }
            }
        }
    }

    // Primes accord : liste générique (horaire + montant) — on itère sur toutes les primes de l'accord, sans filtre par type
    if (agreement) {
        const accordPrimeDefs = getAccordPrimeDefsAsElements(agreement);
        for (const def of accordPrimeDefs) {
            if (def.semanticId === SEMANTIC_ID.PRIME_ANCIENNETE || def.semanticId === SEMANTIC_ID.PRIME_EQUIPE) continue; // déjà traitées au-dessus
            const actif = getAccordInput(state, def.config?.stateKeyActif);
            if (actif !== true && actif !== 'true') continue;
            const r = computePrime(def, context);
            if (r.amount > 0) {
                let label = r.label;
                if (def.valueKind === 'horaire' && r.meta?.heures != null) {
                    const taux = r.meta.tauxHoraire ?? 0;
                    label = `${r.label} (${r.meta.heures}h × +${taux}€ ${agreement.nomCourt})`;
                } else if (def.valueKind === 'majorationHoraire' && r.meta?.heures != null) {
                    label = `${r.label} (+${r.meta.taux ?? 0}%) (${r.meta.heures}h/mois)`;
                } else if (def.valueKind === 'montant' && def.config?.moisVersement != null) {
                    const moisNom = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][def.config.moisVersement - 1];
                    label = `${r.label} ${agreement.nomCourt} (${moisNom})`;
                } else {
                    label = `${r.label} ${agreement.nomCourt}`;
                }
                const isSMHIncluded = def.config?.inclusDansSMH === true;
                details.push({
                    label,
                    value: r.amount,
                    isPositive: !isSMHIncluded, // SMH inclus = informatif (pas additif), sinon positif
                    isAgreement: true,
                    isSMHIncluded,
                    agreementId: agreement.id,
                    moisVersement: def.config?.moisVersement ?? null
                });
                // Les primes incluses dans le SMH (Art. 140 CCNM) ne s'ajoutent PAS au total :
                // elles constituent une distribution du salaire permettant d'atteindre le SMH grille,
                // pas un supplément. Seules les primes exclues du SMH s'ajoutent au-dessus.
                if (!isSMHIncluded) {
                    total += r.amount;
                }
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
export function getMontantAnnuelSMHSeul(state, agreement = null, options = {}) {
    const result = calculateAnnualRemuneration(state, agreement, { mode: 'smh-only', ...options });
    return result.total;
}
