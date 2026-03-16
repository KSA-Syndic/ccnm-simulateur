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
import { getAccordInput, getAccordPrimeDefsAsElements, resolvePrimeSemanticId } from '../agreements/AgreementInterface.js';
import { getConventionPrimeDefs, getConventionMajorationDefs, getConventionForfaitDefs } from '../convention/ConventionCatalog.js';
import { SEMANTIC_ID, SOURCE_ACCORD } from '../core/RemunerationTypes.js';
import { roundToEuro } from '../utils/rounding.js';
import { getSmhHourlyBaseRate } from './RateCalculator.js';

function resolveReferenceYear(date) {
    const selectedYear = date instanceof Date && !Number.isNaN(date.getTime())
        ? date.getFullYear()
        : (CONFIG.CURRENT_DATA_YEAR ?? CONFIG.SMH_UPDATE?.referenceYear ?? new Date().getFullYear());
    const hasSmhYear = CONFIG.SMH_BY_YEAR?.[selectedYear] != null;
    const hasBaremeYear = CONFIG.BAREME_DEBUTANTS_BY_YEAR?.[selectedYear] != null;
    if (!hasSmhYear || !hasBaremeYear) {
        throw new Error(`[CONFIG] Données annuelles incomplètes pour ${selectedYear}. Vérifier SMH_BY_YEAR et BAREME_DEBUTANTS_BY_YEAR.`);
    }
    return selectedYear;
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

function getActivityRate(state) {
    const enabled = state?.travailTempsPartiel === true;
    if (!enabled) return 1;
    const min = Number(CONFIG.TAUX_ACTIVITE_MIN ?? 1);
    const max = Number(CONFIG.TAUX_ACTIVITE_MAX ?? 100);
    const fallback = Number(CONFIG.TAUX_ACTIVITE_DEFAUT ?? 100);
    const raw = Number(state?.tauxActivite);
    const bounded = Number.isFinite(raw)
        ? Math.min(max, Math.max(min, raw))
        : fallback;
    return bounded / 100;
}

function resolveDerivedNationalValue(config = {}, fallbackValue = 0) {
    if (config?.deriveFrom === 'majorations.heuresSup25') {
        const derived = Number(CONFIG?.MAJORATIONS_CCN?.heuresSup25);
        if (Number.isFinite(derived) && derived > 0) return derived;
    }
    const fallback = Number(fallbackValue);
    return Number.isFinite(fallback) ? fallback : 0;
}

function applyNationalPrimeOverridesToDefs(defs, state) {
    if (!Array.isArray(defs) || defs.length === 0) return defs;
    const overrideMap = (state && typeof state.nationalPrimeOverrides === 'object')
        ? state.nationalPrimeOverrides
        : {};
    return defs.map((def) => {
        const semanticId = def?.semanticId;
        if (!semanticId) return def;
        const isNationalTarget = semanticId === SEMANTIC_ID.PRIME_ASTREINTE_DISPONIBILITE
            || semanticId === SEMANTIC_ID.MAJORATION_INTERVENTION_ASTREINTE
            || semanticId === SEMANTIC_ID.PRIME_PANIER_NUIT
            || semanticId === SEMANTIC_ID.PRIME_HABILLAGE_DESHABILLAGE
            || semanticId === SEMANTIC_ID.PRIME_DEPLACEMENT_PRO;
        if (!isNationalTarget) return def;

        const cfg = { ...(def.config || {}) };
        const allowOverride = cfg.allowUserOverride === true;
        const overrideRaw = allowOverride ? overrideMap?.[semanticId] : undefined;
        const overrideValue = Number(overrideRaw);

        if (semanticId === SEMANTIC_ID.MAJORATION_INTERVENTION_ASTREINTE) {
            const base = resolveDerivedNationalValue(cfg, cfg.taux);
            cfg.taux = (allowOverride && Number.isFinite(overrideValue) && overrideValue >= 0)
                ? overrideValue
                : base;
        } else if (semanticId === SEMANTIC_ID.PRIME_ASTREINTE_DISPONIBILITE && cfg.modeCalcul === 'forfaitPeriode') {
            const base = resolveDerivedNationalValue(cfg, cfg.valeurForfaitPeriode);
            cfg.valeurForfaitPeriode = (allowOverride && Number.isFinite(overrideValue) && overrideValue >= 0)
                ? overrideValue
                : base;
        } else {
            const base = resolveDerivedNationalValue(cfg, cfg.tauxHoraire);
            cfg.tauxHoraire = (allowOverride && Number.isFinite(overrideValue) && overrideValue >= 0)
                ? overrideValue
                : base;
        }
        return { ...def, config: cfg };
    });
}

/**
 * Construit le contexte de calcul commun (state + bases).
 * @private
 */
function buildContext(state, baseSMH, classe, agreement, options = {}) {
    const baseSMHFull = Number(options.baseSMHFull ?? baseSMH) || 0;
    const activityRate = Number(options.activityRate ?? 1) || 1;
    const tauxHoraireBase = getSmhHourlyBaseRate(baseSMHFull, { nbMois: 12, activityRate: 1 });
    const heuresBaseMensuelles = CONFIG.DUREE_LEGALE_HEURES_MOIS ?? 151.67;
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
        baseSMHFull,
        activityRate,
        salaireBase: baseSMH,
        pointTerritorial: state.pointTerritorial,
        classe,
        agreement,
        tauxHoraire,
        tauxHoraireBase,
        coeffMajorationHS
    };
}

function getForfaitJoursRachatMajoration(agreement) {
    const minimum = Number(CONFIG.FORFAIT_JOURS_RACHAT_MAJORATION_MIN ?? 0.10);
    const accordRateRaw = agreement?.majorations?.forfaitJours?.rachatJoursMajoration;
    const accordRate = Number(accordRateRaw);
    if (!Number.isFinite(accordRate)) return minimum;
    return Math.max(minimum, accordRate);
}

function computeForfaitJoursRachat(state, baseSMH, agreement) {
    const actif = state?.travailJoursSupForfait === true;
    const jours = Number(state?.joursSupForfait) || 0;
    if (!actif || jours <= 0) return null;
    const reference = Number(CONFIG.FORFAIT_JOURS_REFERENCE ?? 218);
    if (!Number.isFinite(reference) || reference <= 0) return null;
    const majoration = getForfaitJoursRachatMajoration(agreement);
    const baseJour = baseSMH / reference;
    const amount = roundToEuro(baseJour * jours * (1 + majoration));
    if (!(amount > 0)) return null;
    return { amount, jours, majoration };
}

/**
 * Définition prime ancienneté accord (pour principe de faveur).
 * Entièrement dérivée de agreement.anciennete : seuil, plafond, barème
 * sont lus depuis l'instance d'accord (fichier accords/xxx.js). Modifier cet objet dans l'accord suffit.
 * @private
 */
function buildAccordPrimeAncienneteDef(agreement) {
    if (!agreement?.anciennete) return null;
    const primeAncienneteAccord = getAccordAnciennetePrimeConfig(agreement);
    const inclusDansSMH = resolveAccordAncienneteSmhInclusion(agreement, primeAncienneteAccord);
    return {
        id: 'primeAnciennete',
        semanticId: SEMANTIC_ID.PRIME_ANCIENNETE,
        kind: 'prime',
        source: SOURCE_ACCORD,
        valueKind: 'pourcentage',
        label: primeAncienneteAccord?.label || `Prime ancienneté ${agreement.nomCourt}`,
        config: {
            barème: agreement.anciennete.barème,
            inclusDansSMH
        }
    };
}

function getAccordAnciennetePrimeConfig(agreement) {
    const primes = Array.isArray(agreement?.primes) ? agreement.primes : [];
    return primes.find((prime) => resolvePrimeSemanticId(prime) === SEMANTIC_ID.PRIME_ANCIENNETE) ?? null;
}

function normalizeAncienneteSmhMode(value, source) {
    if (value === true || value === false) return value;
    if (source === 'accord') return false;
    return getAncienneteConfigInclusion();
}

function resolveAccordAncienneteSmhInclusion(agreement, primeAncienneteAccord = null) {
    // Priorité explicite accord :
    // 1) surcharge via prime sémantique primeAnciennete
    // 2) agreement.anciennete.inclusDansSMH
    // 3) défaut CCNM (exclue du SMH) => false
    const primeOverride = primeAncienneteAccord?.inclusDansSMH;
    if (primeOverride !== undefined) return normalizeAncienneteSmhMode(primeOverride, 'accord');
    const accordOverride = agreement?.anciennete?.inclusDansSMH;
    if (accordOverride !== undefined) return normalizeAncienneteSmhMode(accordOverride, 'accord');
    return false;
}

function getAncienneteConfigInclusion() {
    // Priorité au CONFIG global runtime (config.js racine) si disponible.
    const globalValue = (typeof window !== 'undefined' && window?.CONFIG?.ANCIENNETE)
        ? window.CONFIG.ANCIENNETE.inclusDansSMH
        : undefined;
    if (typeof globalValue === 'boolean') return globalValue;
    return CONFIG?.ANCIENNETE?.inclusDansSMH === true;
}

function getRuntimeAncienneteInclusionOverride() {
    const runtimeValue = (typeof window !== 'undefined' && window?.CONFIG?.ANCIENNETE)
        ? window.CONFIG.ANCIENNETE.inclusDansSMH
        : undefined;
    if (runtimeValue === true || runtimeValue === false) {
        return runtimeValue;
    }
    return undefined;
}

function resolveAncienneteSmhInclusion(explicitInclusion, source) {
    // Règle de priorité :
    // - Accord: surcharge explicite, sinon défaut CCNM (false)
    // - CCN: explicite puis paramètre global config
    if (source === 'ccn') {
        const runtimeOverride = getRuntimeAncienneteInclusionOverride();
        if (runtimeOverride !== undefined) return normalizeAncienneteSmhMode(runtimeOverride, 'ccn');
    }
    if (explicitInclusion !== undefined) return normalizeAncienneteSmhMode(explicitInclusion, source);
    return source === 'accord' ? false : getAncienneteConfigInclusion();
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
                inclusionMode: resolveAncienneteSmhInclusion(defAncienneteCCN.config?.inclusDansSMH, 'ccn'),
                label: `Prime ancienneté conventionnelle (${state.pointTerritorial}€ × ${rCCN.meta?.taux ?? 0}% × ${rCCN.meta?.annees ?? 0} ans × 12)`
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
                    inclusionMode: resolveAncienneteSmhInclusion(defAncienneteAccord.config?.inclusDansSMH, 'accord'),
                    label: `${defAncienneteAccord.label} (${formatMoney(context.baseSMH)} × ${rAccord.meta?.taux ?? 0}%)`
                });
            }
        }
    }

    if (!candidates.length) return null;
    const selected = candidates.reduce((best, cur) => (cur.result.amount > best.result.amount ? cur : best), candidates[0]);
    const hasAlternative = candidates.length > 1;
    const inclusionMode = selected.inclusionMode;
    let smhIncludedAmount = inclusionMode === true ? selected.result.amount : 0;
    const smhExcludedAmount = Math.max(0, selected.result.amount - smhIncludedAmount);
    const isSMHIncluded = smhIncludedAmount > 0;

    return {
        ...selected,
        inclusionMode,
        isSMHIncluded,
        smhIncludedAmount,
        smhExcludedAmount,
        note: hasAlternative
            ? (selected.isAgreement ? 'Plus avantageux que la convention' : 'Plus avantageux que l\'accord')
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
    let baseSMHFull = smhByYear.amount;
    if (!baseSMHFull || isNaN(baseSMHFull)) {
        console.error('SMH invalide pour classe', classe, ':', baseSMHFull);
        baseSMHFull = 0;
    }

    if ((classe === 11 || classe === 12) && state.experiencePro < 6) {
        let tranche = 0;
        if (state.experiencePro >= 4) tranche = 4;
        else if (state.experiencePro >= 2) tranche = 2;
        const baremeByYear = getBaremeDebutantForClasse(classe, tranche, date);
        baseSMHFull = baremeByYear.amount;
    }

    const activityRate = getActivityRate(state);
    let baseSMH = roundToEuro((baseSMHFull || 0) * activityRate);

    let scenario = '';
    let details = [];
    let total = baseSMH;
    const context = buildContext(state, baseSMH, classe, agreement, { baseSMHFull, activityRate });
    const convPrimeDefs = applyNationalPrimeOverridesToDefs(getConventionPrimeDefs(), state);

    // ─── Mode SMH seul ───
    if (mode === 'smh-only') {
        const forfaitDefs = getConventionForfaitDefs();
        const forfaitDef = forfaitDefs.find(d => d.config?.forfaitKey === state.forfait);
        const forfaitResult = forfaitDef ? computeForfait(forfaitDef, context) : { amount: 0 };
        const forfaitMontant = forfaitResult.amount || 0;
        let totalSmh = baseSMH + forfaitMontant;
        const tauxActivitePct = Math.round(activityRate * 10000) / 100;
        const baseLabel = activityRate < 1
            ? `Salaire de base (${groupe}${classe}) au prorata ${tauxActivitePct}%`
            : `Salaire de base (${groupe}${classe})`;
        const detailsSmh = [{ label: baseLabel, value: baseSMH, isBase: true }];

        const ancienneteRetenue = resolveAnciennetePrime(state, context, convPrimeDefs, agreement, isCadreValue);
        const ancienneteSmhAmount = ancienneteRetenue?.smhIncludedAmount ?? 0;
        if (ancienneteRetenue && ancienneteSmhAmount > 0) {
            detailsSmh.push({
                label: 'Prime ancienneté assiette SMH',
                value: ancienneteSmhAmount,
                isPositive: true,
                isSMHIncluded: true,
                isAgreement: ancienneteRetenue.isAgreement,
                semanticId: SEMANTIC_ID.PRIME_ANCIENNETE,
                note: ancienneteRetenue.note
            });
            totalSmh += ancienneteSmhAmount;
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
        const tauxActivitePct = Math.round(activityRate * 10000) / 100;
        const baseLabel = activityRate < 1
            ? `Salaire de base (${groupe}${classe}) au prorata ${tauxActivitePct}%`
            : `Salaire de base (${groupe}${classe})`;
        details.push({ label: baseLabel, value: baseSMH, isBase: true });
    } else if (isGroupeF && state.experiencePro < 6) {
        scenario = 'cadre-debutant';
        let labelTranche = '< 2 ans';
        if (state.experiencePro >= 4) labelTranche = '4 à 6 ans';
        else if (state.experiencePro >= 2) labelTranche = '2 à 4 ans';
        const tauxActivitePct = Math.round(activityRate * 10000) / 100;
        const baseSuffix = `${groupe}${classe} débutant (${labelTranche})`;
        const baseLabel = activityRate < 1
            ? `Salaire de base (${baseSuffix}) au prorata ${tauxActivitePct}%`
            : `Salaire de base (${baseSuffix})`;
        details.push({
            label: baseLabel,
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
        const tauxActivitePct = Math.round(activityRate * 10000) / 100;
        const baseLabel = activityRate < 1
            ? `Salaire de base (${groupe}${classe}) au prorata ${tauxActivitePct}%`
            : `Salaire de base (${groupe}${classe})`;
        details.push({ label: baseLabel, value: baseSMH, isBase: true });

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

    // Forfait jours : possibilité de rachat de jours de repos (Code du travail L3121-59)
    if (isCadreForfaitJours(classe, state)) {
        const rachat = computeForfaitJoursRachat(state, baseSMH, agreement);
        if (rachat) {
            const pct = Math.round((rachat.majoration || 0) * 10000) / 100;
            details.push({
                label: `Rachat jours de repos forfait jours (+${pct}%) (${rachat.jours} j/an)`,
                value: rachat.amount,
                isPositive: true
            });
            total += rachat.amount;
        }
    }

    // Prime ancienneté : principe de faveur CCN/accord + inclusion SMH paramétrable
    const ancienneteRetenue = resolveAnciennetePrime(state, context, convPrimeDefs, agreement, isCadreValue);
    if (ancienneteRetenue) {
        const excludedAmount = ancienneteRetenue.smhExcludedAmount ?? ancienneteRetenue.result.amount;
        const includedAmount = ancienneteRetenue.smhIncludedAmount ?? 0;

        if (excludedAmount > 0) {
            details.push({
                label: ancienneteRetenue.label,
                value: excludedAmount,
                isPositive: true,
                isSMHIncluded: false,
                isAgreement: ancienneteRetenue.isAgreement,
                agreementId: ancienneteRetenue.isAgreement ? agreement?.id : undefined,
                semanticId: SEMANTIC_ID.PRIME_ANCIENNETE,
                note: ancienneteRetenue.note
            });
            total += excludedAmount;
        }

        if (includedAmount > 0) {
            details.push({
                label: ancienneteRetenue.label,
                value: includedAmount,
                isPositive: false,
                isSMHIncluded: true,
                isAgreement: ancienneteRetenue.isAgreement,
                agreementId: ancienneteRetenue.isAgreement ? agreement?.id : undefined,
                semanticId: SEMANTIC_ID.PRIME_ANCIENNETE,
                note: ancienneteRetenue.note
            });
        }
    }

    const accordPrimeDefs = agreement ? getAccordPrimeDefsAsElements(agreement) : [];

    // Prime d'équipe : modalité CCN par défaut (30 min du SMH horaire), surchargeable par l'accord actif
    if (!isCadreValue) {
        const defEquipeCCN = convPrimeDefs.find(d => d.semanticId === SEMANTIC_ID.PRIME_EQUIPE);
        const rEquipeCCN = defEquipeCCN ? computePrime(defEquipeCCN, context) : { amount: 0 };
        const defEquipeAccord = accordPrimeDefs.find(d => d.semanticId === SEMANTIC_ID.PRIME_EQUIPE || d.id === 'primeEquipe');
        const rEquipeAccord = defEquipeAccord ? computePrime(defEquipeAccord, context) : { amount: 0 };
        const equipeRetenue = defEquipeAccord ? rEquipeAccord : rEquipeCCN;
        if (equipeRetenue.amount > 0) {
            const taux = equipeRetenue.meta?.tauxHoraire ?? 0;
            const suffixAccord = agreement ? ` ${agreement.nomCourt}` : '';
            const labelCalcul = equipeRetenue.source === SOURCE_ACCORD
                ? `(${equipeRetenue.meta?.heures ?? (state.heuresEquipe ?? 0)}h × ${taux}€)`
                : `(${equipeRetenue.meta?.postesMensuels ?? 0} postes/mois × ${equipeRetenue.meta?.minutesParPoste ?? 30} min × ${taux}€)`;
            details.push({
                label: `Prime d'équipe${equipeRetenue.source === SOURCE_ACCORD ? suffixAccord : ' conventionnelle'} ${labelCalcul}`,
                value: equipeRetenue.amount,
                isPositive: true,
                isAgreement: equipeRetenue.source === SOURCE_ACCORD,
                agreementId: equipeRetenue.source === SOURCE_ACCORD ? agreement?.id : undefined
            });
            total += equipeRetenue.amount;
        }
    }

    // Modalités nationales paramétrables (astreinte, panier, habillage, déplacements/sujétions)
    // et éventuelles surcharges accord d'entreprise par semanticId.
    const modalitesNationales = [
        SEMANTIC_ID.PRIME_ASTREINTE_DISPONIBILITE,
        SEMANTIC_ID.MAJORATION_INTERVENTION_ASTREINTE,
        SEMANTIC_ID.PRIME_PANIER_NUIT,
        SEMANTIC_ID.PRIME_HABILLAGE_DESHABILLAGE,
        SEMANTIC_ID.PRIME_DEPLACEMENT_PRO
    ];
    const resolveQuantiteSuffix = (def) => {
        const inputUnitLabel = String(def?.config?.inputUnitLabel || '').toLowerCase();
        if (inputUnitLabel.includes('unité')) return 'unités';
        if (inputUnitLabel.includes('période')) return 'périodes';
        return 'h';
    };
    for (const semanticId of modalitesNationales) {
        const candidatesDefs = [];
        const defConv = convPrimeDefs.find(d => d.semanticId === semanticId);
        const defAcc = accordPrimeDefs.find(d => d.semanticId === semanticId);
        if (defConv) candidatesDefs.push(defConv);
        if (defAcc) candidatesDefs.push(defAcc);
        if (!candidatesDefs.length) continue;

        const computedCandidates = candidatesDefs
            .map((def) => {
                const r = computePrime(def, context);
                if (!(r.amount > 0)) return null;
                return { def, r };
            })
            .filter(Boolean);
        if (!computedCandidates.length) continue;

        const selected = computedCandidates.reduce((best, cur) => (cur.r.amount > best.r.amount ? cur : best), computedCandidates[0]);
        const def = selected.def;
        const r = selected.r;
        const isAgreementPrime = def.source === SOURCE_ACCORD;
        const isSMHIncluded = def.config?.inclusDansSMH === true;

        let label = r.label;
        if (semanticId === SEMANTIC_ID.PRIME_ASTREINTE_DISPONIBILITE && r.meta?.modeCalcul === 'forfaitPeriode') {
            const nbPeriodes = Number(r.meta?.nbPeriodes ?? 0);
            const valeurForfaitPeriode = Number(r.meta?.valeurForfaitPeriode ?? 0);
            label = `${r.label} (${nbPeriodes} périodes/mois × ${valeurForfaitPeriode}€)`;
        } else if (def.valueKind === 'horaire' && r.meta?.heures != null) {
            const taux = r.meta.tauxHoraire ?? 0;
            const quantiteSuffix = resolveQuantiteSuffix(def);
            const quantite = Number(r.meta.heures ?? 0);
            const quantiteLabel = quantiteSuffix === 'h' ? `${quantite}h` : `${quantite} ${quantiteSuffix}`;
            if (isAgreementPrime) {
                label = `${r.label} (${quantiteLabel} × ${taux}€ ${agreement?.nomCourt || 'accord'})`;
            } else {
                label = `${r.label} (${quantiteLabel} × ${taux}€)`;
            }
        } else if (def.valueKind === 'majorationHoraire' && r.meta?.heures != null) {
            if (semanticId === SEMANTIC_ID.MAJORATION_INTERVENTION_ASTREINTE && r.meta?.inclureBaseHoraire === true) {
                label = `${r.label} (base +${r.meta.taux ?? 0}%) (${r.meta.heures}h/mois)`;
            } else {
                label = `${r.label} (+${r.meta.taux ?? 0}%) (${r.meta.heures}h/mois)`;
            }
        }

        details.push({
            label,
            value: r.amount,
            isPositive: !isSMHIncluded,
            isAgreement: isAgreementPrime,
            isSMHIncluded,
            agreementId: isAgreementPrime ? agreement?.id : undefined,
            semanticId,
            sourceArticle: def.config?.sourceArticle || '',
            conditionTexte: def.config?.conditionTexte || ''
        });
        if (!isSMHIncluded) {
            total += r.amount;
        }
    }

    // ─── Majorations conditions de travail ───
    const isForfaitJours = isCadreForfaitJours(classe, state);
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

    // Primes accord : liste générique (horaire + montant).
    // Les primes incluses dans le SMH sont toujours actives (distribution du SMH).
    // En cas de doublon sémantique dans un accord, on retient la plus favorable.
    if (agreement) {
        const groupedBySemantic = new Map();
        for (const def of accordPrimeDefs) {
            if (def.semanticId === SEMANTIC_ID.PRIME_ANCIENNETE || def.semanticId === SEMANTIC_ID.PRIME_EQUIPE) continue; // déjà traitées au-dessus
            if (
                def.semanticId === SEMANTIC_ID.PRIME_ASTREINTE_DISPONIBILITE
                || def.semanticId === SEMANTIC_ID.MAJORATION_INTERVENTION_ASTREINTE
                || def.semanticId === SEMANTIC_ID.PRIME_PANIER_NUIT
                || def.semanticId === SEMANTIC_ID.PRIME_HABILLAGE_DESHABILLAGE
                || def.semanticId === SEMANTIC_ID.PRIME_DEPLACEMENT_PRO
            ) continue; // traitées dans le bloc modalités nationales/surcharge accord
            const key = def.semanticId || def.id;
            if (!groupedBySemantic.has(key)) groupedBySemantic.set(key, []);
            groupedBySemantic.get(key).push(def);
        }

        for (const defs of groupedBySemantic.values()) {
            const candidates = [];
            for (const def of defs) {
                const isSMHIncluded = def.config?.inclusDansSMH === true;
                const actif = isSMHIncluded
                    ? true
                    : getAccordInput(state, def.config?.stateKeyActif);
                if (actif !== true && actif !== 'true') continue;
                const r = computePrime(def, context);
                if (!(r.amount > 0)) continue;
                candidates.push({ def, r, isSMHIncluded });
            }
            if (!candidates.length) continue;

            const selected = candidates.reduce((best, cur) => (cur.r.amount > best.r.amount ? cur : best), candidates[0]);
            const def = selected.def;
            const r = selected.r;
            const isSMHIncluded = selected.isSMHIncluded;

            let label = r.label;
            if (def.valueKind === 'horaire' && r.meta?.heures != null) {
                const taux = r.meta.tauxHoraire ?? 0;
                const quantiteSuffix = resolveQuantiteSuffix(def);
                const quantite = Number(r.meta.heures ?? 0);
                const quantiteLabel = quantiteSuffix === 'h' ? `${quantite}h` : `${quantite} ${quantiteSuffix}`;
                label = `${r.label} (${quantiteLabel} × ${taux}€ ${agreement.nomCourt})`;
            } else if (def.valueKind === 'majorationHoraire' && r.meta?.heures != null) {
                label = `${r.label} (+${r.meta.taux ?? 0}%) (${r.meta.heures}h/mois)`;
            } else if (def.valueKind === 'montant' && def.config?.moisVersement != null) {
                const moisNom = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][def.config.moisVersement - 1];
                label = `${r.label} ${agreement.nomCourt} (${moisNom})`;
            } else {
                label = `${r.label} ${agreement.nomCourt}`;
            }
            details.push({
                label,
                value: r.amount,
                isPositive: !isSMHIncluded, // SMH inclus = informatif (pas additif), sinon positif
                isAgreement: true,
                isSMHIncluded,
                agreementId: agreement.id,
                semanticId: def.semanticId || def.id,
                moisVersement: def.config?.moisVersement ?? null,
                sourceArticle: def.config?.sourceArticle || '',
                conditionTexte: def.config?.conditionTexte || ''
            });
            // Les primes incluses dans le SMH (Art. 140 CCNM) ne s'ajoutent PAS au total :
            // elles constituent une distribution du salaire permettant d'atteindre le SMH grille,
            // pas un supplément. Seules les primes exclues du SMH s'ajoutent au-dessus.
            if (!isSMHIncluded) {
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
export function getMontantAnnuelSMHSeul(state, agreement = null, options = {}) {
    const result = calculateAnnualRemuneration(state, agreement, { mode: 'smh-only', ...options });
    return result.total;
}
