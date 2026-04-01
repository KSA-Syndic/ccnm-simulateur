/**
 * ============================================
 * PRIME CALCULATOR - Calcul unifié des primes
 * ============================================
 *
 * API générique : computePrime(def, context).
 * Convention (CCN) et accord utilisent la même entrée (ElementDef) et le même contexte.
 * Aucun nom spécifique à une prime (plus de getPrimeVacances, calculatePrimeEquipe, etc.).
 */

import { CONFIG } from '../core/config.js';
import { getPrimeValue, getAccordInput } from '../agreements/AgreementInterface.js';
import { SEMANTIC_ID, SOURCE_CONVENTION, SOURCE_ACCORD } from '../core/RemunerationTypes.js';
import { roundToCents, roundToEuro, annualFromMonthly } from '../utils/rounding.js';

function resolveAstreintePeriodeSmhMultiplier(semanticId) {
    const m = CONFIG?.CCNM_CONTREPARTIES_ORGANISATION?.astreinteDisponibiliteSMHParPeriode;
    if (semanticId === SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_REPOS_QUOTIDIEN) {
        return Number(m?.surReposQuotidienDansAstreinte ?? 1);
    }
    if (semanticId === SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_JOUR_REPOS) {
        return Number(m?.surJourRepos ?? 2);
    }
    return 0;
}

/** Taux majoration : taux catalogue si > 0, sinon barème CCN (deriveFrom). */
function resolveDerivedMajorationTaux(cfg = {}) {
    const explicit = Number(cfg.taux ?? 0);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    if (cfg.deriveFrom === 'majorations.heuresSup25') {
        const derived = Number(CONFIG?.MAJORATIONS_CCN?.heuresSup25);
        if (Number.isFinite(derived) && derived > 0) return derived;
    }
    return 0;
}

function resolvePrimeHeures(def, context) {
    const cfg = def.config || {};
    const state = context?.state ?? {};
    const defaultHeures = Number(cfg.defaultHeures ?? CONFIG.DUREE_LEGALE_HEURES_MOIS ?? 151.67);

    // Prime d'équipe : assiette horaire automatique sur base légale 35h uniquement.
    const autoFromHs = cfg.autoHeures === true || def.semanticId === SEMANTIC_ID.PRIME_EQUIPE;
    if (autoFromHs) {
        return roundToCents(defaultHeures);
    }

    const heuresRaw = cfg.stateKeyHeures
        ? (getAccordInput(state, cfg.stateKeyHeures) ?? state[cfg.stateKeyHeures])
        : 0;
    return (heuresRaw == null || heuresRaw === '') ? defaultHeures : (Number(heuresRaw) || 0);
}

function isAccordPrimeActive(cfg, state) {
    // Les primes incluses dans le SMH sont toujours actives :
    // elles décrivent une distribution du SMH, pas un opt-in utilisateur.
    if (cfg?.inclusDansSMH === true) return true;
    if (!cfg?.stateKeyActif) return false;
    const value = getAccordInput(state, cfg.stateKeyActif);
    return value === true || value === 'true' || state?.[cfg.stateKeyActif] === true;
}

/**
 * Calcule le montant annuel d'une prime à partir de sa définition (convention ou accord).
 * @param {import('../core/RemunerationTypes.js').ElementDef} def - Définition de la prime (convention ou accord)
 * @param {import('../core/RemunerationTypes.js').ComputeContext} context - Contexte (state, baseSMH, pointTerritorial, classe, agreement)
 * @returns {import('../core/RemunerationTypes.js').ElementResult} Montant annuel + métadonnées
 */
export function computePrime(def, context) {
    if (!def || def.kind !== 'prime') {
        return { amount: 0, label: '', source: def?.source ?? '' };
    }
    const state = context?.state ?? {};
    if (def.source === SOURCE_CONVENTION) {
        return computePrimeConvention(def, context);
    }
    if (def.source === SOURCE_ACCORD) {
        return computePrimeAccord(def, context);
    }
    return { amount: 0, label: '', source: def.source };
}

/**
 * Prime convention (CCN) : actuellement uniquement prime d'ancienneté (point × taux × années).
 * @private
 */
function computePrimeConvention(def, context) {
    if (def.semanticId === SEMANTIC_ID.PRIME_ANCIENNETE) {
        const { seuil, plafond, tauxParClasse } = def.config || {};
        const pointTerritorial = context.pointTerritorial ?? 0;
        const classe = context.classe ?? 0;
        const anciennete = (context.state && context.state.anciennete) ?? 0;
        const seuilCadre = CONFIG.SEUIL_CADRE ?? 11;

        if (classe >= seuilCadre) {
            return {
                amount: 0,
                label: def.label,
                source: SOURCE_CONVENTION,
                semanticId: def.semanticId,
                meta: { taux: 0, annees: 0 }
            };
        }

        if (anciennete < (seuil ?? CONFIG.ANCIENNETE.seuil)) {
            return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
        }
        const anneesPrime = Math.min(anciennete, plafond ?? CONFIG.ANCIENNETE.plafond);
        const tauxClasse = (tauxParClasse && tauxParClasse[classe]) ?? CONFIG.TAUX_ANCIENNETE?.[classe] ?? 0;
        const activityRate = Number(context?.activityRate ?? 1);
        const prorata = Number.isFinite(activityRate) && activityRate > 0 ? activityRate : 1;
        const montantMensuel = pointTerritorial * tauxClasse * anneesPrime * prorata;
        const montant = annualFromMonthly(montantMensuel);

        return {
            amount: montant,
            label: def.label,
            source: SOURCE_CONVENTION,
            semanticId: def.semanticId,
            meta: { taux: tauxClasse, annees: anneesPrime }
        };
    }

    if (def.semanticId === SEMANTIC_ID.PRIME_EQUIPE) {
        const cfg = def.config || {};
        const state = context?.state ?? {};
        const actif = cfg.stateKeyActif
            ? (state[cfg.stateKeyActif] === true || getAccordInput(state, cfg.stateKeyActif) === true)
            : false;
        if (!actif) {
            return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
        }
        // CCN : prime d'équipe calculée par poste (30 min du SMH horaire de base 35h).
        const tauxHoraire = context.tauxHoraireBase ?? context.tauxHoraire ?? 0;
        const ratio = Number(cfg.ratioSMHHoraire) || 0;
        const postesMensuelsCfg = Number(cfg.postesMensuels ?? CONFIG.PRIME_EQUIPE_POSTES_MENSUELS_DEFAUT ?? 22);
        const minutesParPoste = Number(cfg.minutesParPoste ?? CONFIG.PRIME_EQUIPE_MINUTES_PAR_POSTE ?? 30);
        const activityRate = Number(context?.activityRate ?? 1);
        const prorata = Number.isFinite(activityRate) && activityRate > 0 ? activityRate : 1;
        const postesMensuels = Math.max(0, postesMensuelsCfg * prorata);
        const heuresEqParPoste = minutesParPoste > 0 ? (minutesParPoste / 60) : 0;
        const heures = roundToCents(postesMensuels * heuresEqParPoste);
        if (!heures || !tauxHoraire || !ratio) {
            return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
        }
        const tauxPrimeHoraire = tauxHoraire * ratio;
        const montantMensuel = roundToCents(heures * tauxPrimeHoraire);
        const montantAnnuel = annualFromMonthly(montantMensuel);
        return {
            amount: montantAnnuel,
            label: def.label,
            source: SOURCE_CONVENTION,
            semanticId: def.semanticId,
            meta: {
                tauxHoraire: roundToCents(tauxPrimeHoraire),
                heures,
                ratio,
                postesMensuels: roundToCents(postesMensuels),
                minutesParPoste
            }
        };
    }

    if (def.semanticId === SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_REPOS_QUOTIDIEN
        || def.semanticId === SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_JOUR_REPOS) {
        const cfg = def.config || {};
        const state = context?.state ?? {};
        const actif = cfg.stateKeyActif
            ? (getAccordInput(state, cfg.stateKeyActif) === true || state[cfg.stateKeyActif] === true)
            : false;
        if (!actif) {
            return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
        }
        const periodes = resolvePrimeHeures(def, context);
        const mult = resolveAstreintePeriodeSmhMultiplier(def.semanticId);
        const th = Number(context?.tauxHoraireBase ?? 0);
        const euroPerPeriode = roundToCents(mult * th);
        if (!(periodes > 0) || !(euroPerPeriode > 0)) {
            return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
        }
        const montantMensuel = roundToCents(periodes * euroPerPeriode);
        const montantAnnuel = annualFromMonthly(montantMensuel);
        return {
            amount: montantAnnuel,
            label: def.label,
            source: SOURCE_CONVENTION,
            semanticId: def.semanticId,
            meta: {
                modeCalcul: 'periodesAstreinteSMH',
                periodesMois: periodes,
                euroPerPeriode,
                multiplicateurSMH: mult
            }
        };
    }

    if (def.semanticId === SEMANTIC_ID.PRIME_INVENTION_BREVETABLE) {
        const cfg = def.config || {};
        const state = context?.state ?? {};
        const actif = cfg.stateKeyActif
            ? (getAccordInput(state, cfg.stateKeyActif) === true || state[cfg.stateKeyActif] === true)
            : false;
        if (!actif) {
            return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
        }
        const n = Math.max(0, Math.floor(Number(resolvePrimeHeures(def, context)) || 0));
        const minU = Number(
            cfg.montantMinimumParUnite ?? CONFIG?.CCNM_CONTREPARTIES_ORGANISATION?.inventionBrevetableMinimumEuros ?? 0
        );
        if (n < 1 || !(minU > 0)) {
            return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
        }
        const amount = roundToEuro(n * minU);
        return {
            amount,
            label: def.label,
            source: SOURCE_CONVENTION,
            semanticId: def.semanticId,
            meta: { modeCalcul: 'inventionForfaitAn', nombre: n, montantMinimumParUnite: minU }
        };
    }

    if (def.semanticId === SEMANTIC_ID.PRIME_HABILLAGE_DESHABILLAGE) {
        const cfg = def.config || {};
        const state = context?.state ?? {};
        const actif = cfg.stateKeyActif
            ? (getAccordInput(state, cfg.stateKeyActif) === true || state[cfg.stateKeyActif] === true)
            : false;
        const hWeek = Number(
            cfg.heuresSMHReferenceParSemaine ?? CONFIG?.CCNM_CONTREPARTIES_ORGANISATION?.habillageHeuresSMHParSemaine ?? 0
        );
        if (hWeek > 0) {
            if (!actif) {
                return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
            }
            const th = Number(context?.tauxHoraireBase ?? 0);
            const heuresMois = hWeek * (52 / 12);
            if (!(th > 0)) {
                return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
            }
            const montantMensuel = roundToCents(heuresMois * th);
            const montantAnnuel = annualFromMonthly(montantMensuel);
            return {
                amount: montantAnnuel,
                label: def.label,
                source: SOURCE_CONVENTION,
                semanticId: def.semanticId,
                meta: {
                    tauxHoraire: th,
                    heures: roundToCents(heuresMois),
                    modeCalcul: 'habillageHebdoSMH'
                }
            };
        }
    }

    if (
        def.semanticId === SEMANTIC_ID.PRIME_PANIER_NUIT
        || def.semanticId === SEMANTIC_ID.PRIME_DEPLACEMENT_PRO
    ) {
        const cfg = def.config || {};
        const state = context?.state ?? {};
        const actif = cfg.stateKeyActif
            ? (getAccordInput(state, cfg.stateKeyActif) === true || state[cfg.stateKeyActif] === true)
            : false;
        if (!actif) {
            return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
        }
        const heures = resolvePrimeHeures(def, context);
        let tauxHoraire = Number(cfg.tauxHoraire ?? 0);
        if (cfg.baseTauxSmhHierarchique === true) {
            tauxHoraire = Number(context?.tauxHoraireBase ?? context?.tauxHoraire ?? 0);
        }
        if (!(heures > 0) || !(tauxHoraire > 0)) {
            return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
        }
        const montantMensuel = roundToCents(heures * tauxHoraire);
        const montantAnnuel = annualFromMonthly(montantMensuel);
        return {
            amount: montantAnnuel,
            label: def.label,
            source: SOURCE_CONVENTION,
            semanticId: def.semanticId,
            meta: { tauxHoraire, heures, modeCalcul: 'horaire' }
        };
    }

    if (def.semanticId === SEMANTIC_ID.MAJORATION_INTERVENTION_ASTREINTE) {
        const cfg = def.config || {};
        const state = context?.state ?? {};
        const actif = cfg.stateKeyActif
            ? (getAccordInput(state, cfg.stateKeyActif) === true || state[cfg.stateKeyActif] === true)
            : false;
        if (!actif) {
            return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
        }
        const heures = resolvePrimeHeures(def, context);
        const tauxMaj = resolveDerivedMajorationTaux(cfg);
        const tauxHoraire = Number(context?.tauxHoraire ?? 0);
        if (!(heures > 0) || !(tauxMaj > 0) || !(tauxHoraire > 0)) {
            return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
        }
        const inclureBaseHoraire = cfg.inclureBaseHoraire !== false;
        const multiplicateur = inclureBaseHoraire ? (1 + tauxMaj) : tauxMaj;
        const montantMensuel = roundToCents(heures * tauxHoraire * multiplicateur);
        const montantAnnuel = annualFromMonthly(montantMensuel);
        return {
            amount: montantAnnuel,
            label: def.label,
            source: SOURCE_CONVENTION,
            semanticId: def.semanticId,
            meta: { taux: Math.round(tauxMaj * 100), heures, inclureBaseHoraire }
        };
    }

    return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
}

/**
 * Prime accord : ancienneté (barème × salaire), horaire (heures × taux), montant fixe.
 * @private
 */
function computePrimeAccord(def, context) {
    const agreement = context?.agreement;
    const state = context?.state ?? {};
    const cfg = def.config || {};

    if (def.semanticId === SEMANTIC_ID.PRIME_ANCIENNETE && cfg.barème != null) {
        const salaireBase = context.salaireBase ?? context.baseSMH ?? 0;
        const anciennete = state.anciennete ?? 0;
        const seuil = (agreement && agreement.anciennete && agreement.anciennete.seuil) ?? 0;
        const plafond = (agreement && agreement.anciennete && agreement.anciennete.plafond) ?? 0;
        if (anciennete < seuil) {
            return { amount: 0, label: def.label, source: SOURCE_ACCORD, semanticId: def.semanticId };
        }
        const anneesPrime = Math.min(anciennete, plafond);
        let taux = 0;
        const barème = cfg.barème ?? agreement?.anciennete?.barème;
        if (typeof barème === 'function') {
            taux = barème(anneesPrime);
        } else if (typeof barème === 'object' && barème != null) {
            if (barème[anneesPrime] !== undefined) {
                taux = barème[anneesPrime];
            } else {
                const annees = Object.keys(barème).map(Number).sort((a, b) => b - a);
                for (const annee of annees) {
                    if (annee <= anneesPrime) {
                        taux = barème[annee];
                        break;
                    }
                }
            }
        }
        const montant = roundToEuro(salaireBase * taux);
        const meta = {
            taux: Math.round(taux * 10000) / 100,
            annees: anneesPrime
        };
        return {
            amount: montant,
            label: def.label,
            source: SOURCE_ACCORD,
            semanticId: def.semanticId,
            meta
        };
    }

    if (def.valueKind === 'majorationHoraire') {
        const actif = isAccordPrimeActive(cfg, state);
        if (!actif) {
            return { amount: 0, label: def.label, source: SOURCE_ACCORD, semanticId: def.semanticId };
        }
        const taux = getPrimeValue(agreement, def.id, state);
        const heuresRaw = cfg.stateKeyHeures ? (getAccordInput(state, cfg.stateKeyHeures) ?? state[cfg.stateKeyHeures]) : 0;
        const defaultHeures = Number(cfg.defaultHeures ?? CONFIG.DUREE_LEGALE_HEURES_MOIS ?? 151.67);
        const heures = (heuresRaw == null || heuresRaw === '') ? defaultHeures : (Number(heuresRaw) || 0);
        const tauxHoraire = context.tauxHoraire ?? 0;
        if (taux == null || !heures || !tauxHoraire) {
            return { amount: 0, label: def.label, source: SOURCE_ACCORD, semanticId: def.semanticId };
        }
        const montantMensuel = roundToCents(heures * tauxHoraire * taux);
        const montantAnnuel = annualFromMonthly(montantMensuel);
        return {
            amount: montantAnnuel,
            label: def.label,
            source: SOURCE_ACCORD,
            semanticId: def.semanticId,
            meta: { taux: Math.round(taux * 100), heures }
        };
    }

    if (def.valueKind === 'horaire') {
        const actif = isAccordPrimeActive(cfg, state);
        if (!actif) {
            return { amount: 0, label: def.label, source: SOURCE_ACCORD, semanticId: def.semanticId };
        }
        const valeur = getPrimeValue(agreement, def.id, state);
        const heures = resolvePrimeHeures(def, context);
        if (!valeur || !heures) {
            return { amount: 0, label: def.label, source: SOURCE_ACCORD, semanticId: def.semanticId };
        }
        const calculMensuel = (def.valueKind === 'horaire') || (cfg.calculMensuel !== false);
        const montantMensuel = calculMensuel
            ? roundToCents(heures * valeur)
            : roundToCents((heures * valeur * 12) / 12);
        const montantAnnuel = annualFromMonthly(montantMensuel);
        return {
            amount: montantAnnuel,
            label: def.label,
            source: SOURCE_ACCORD,
            semanticId: def.semanticId,
            meta: { tauxHoraire: valeur, heures }
        };
    }

    if (def.valueKind === 'montant') {
        const actif = isAccordPrimeActive(cfg, state);
        if (!actif) {
            return { amount: 0, label: def.label, source: SOURCE_ACCORD, semanticId: def.semanticId };
        }
        const anciennete = state.anciennete ?? 0;
        const condAnc = cfg.conditionAnciennete;
        if (condAnc && condAnc.type === 'annees_revolues' && typeof condAnc.annees === 'number' && anciennete < condAnc.annees) {
            return { amount: 0, label: def.label, source: SOURCE_ACCORD, semanticId: def.semanticId };
        }
        const valeur = getPrimeValue(agreement, def.id, state);
        return {
            amount: valeur,
            label: def.label,
            source: SOURCE_ACCORD,
            semanticId: def.semanticId,
            meta: { moisVersement: cfg.moisVersement }
        };
    }

    return { amount: 0, label: def.label, source: SOURCE_ACCORD };
}

