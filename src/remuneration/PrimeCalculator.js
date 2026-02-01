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
    if (def.semanticId !== SEMANTIC_ID.PRIME_ANCIENNETE) {
        return { amount: 0, label: def.label, source: SOURCE_CONVENTION };
    }
    const { seuil, plafond, tauxParClasse } = def.config || {};
    const pointTerritorial = context.pointTerritorial ?? 0;
    const classe = context.classe ?? 0;
    const anciennete = (context.state && context.state.anciennete) ?? 0;

    if (anciennete < (seuil ?? CONFIG.ANCIENNETE.seuil)) {
        return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
    }
    const anneesPrime = Math.min(anciennete, plafond ?? CONFIG.ANCIENNETE.plafond);
    const tauxClasse = (tauxParClasse && tauxParClasse[classe]) ?? CONFIG.TAUX_ANCIENNETE[classe] ?? 0;
    const montantMensuel = pointTerritorial * tauxClasse * anneesPrime;
    const montant = Math.round(montantMensuel * 12);

    return {
        amount: montant,
        label: def.label,
        source: SOURCE_CONVENTION,
        semanticId: def.semanticId,
        meta: { taux: tauxClasse, annees: anneesPrime }
    };
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
        const montant = Math.round(salaireBase * taux);
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
        const actif = (cfg.stateKeyActif && (getAccordInput(state, cfg.stateKeyActif) === true || state[cfg.stateKeyActif] === true));
        if (!actif) {
            return { amount: 0, label: def.label, source: SOURCE_ACCORD, semanticId: def.semanticId };
        }
        const taux = getPrimeValue(agreement, def.id, state);
        const heuresRaw = cfg.stateKeyHeures ? (getAccordInput(state, cfg.stateKeyHeures) ?? state[cfg.stateKeyHeures]) : 0;
        const heures = Number(heuresRaw) || 0;
        const tauxHoraire = context.tauxHoraire ?? 0;
        if (taux == null || !heures || !tauxHoraire) {
            return { amount: 0, label: def.label, source: SOURCE_ACCORD, semanticId: def.semanticId };
        }
        const montantMensuel = Math.round(heures * tauxHoraire * taux * 100) / 100;
        const montantAnnuel = Math.round(montantMensuel * 12);
        return {
            amount: montantAnnuel,
            label: def.label,
            source: SOURCE_ACCORD,
            semanticId: def.semanticId,
            meta: { taux: Math.round(taux * 100), heures }
        };
    }

    if (def.valueKind === 'horaire') {
        const actif = (cfg.stateKeyActif && (getAccordInput(state, cfg.stateKeyActif) === true || state[cfg.stateKeyActif] === true));
        if (!actif) {
            return { amount: 0, label: def.label, source: SOURCE_ACCORD, semanticId: def.semanticId };
        }
        const valeur = getPrimeValue(agreement, def.id, state);
        const heuresRaw = cfg.stateKeyHeures ? (getAccordInput(state, cfg.stateKeyHeures) ?? state[cfg.stateKeyHeures]) : 0;
        const heures = Number(heuresRaw) || 0;
        if (!valeur || !heures) {
            return { amount: 0, label: def.label, source: SOURCE_ACCORD, semanticId: def.semanticId };
        }
        const calculMensuel = (def.valueKind === 'horaire') || (cfg.calculMensuel !== false);
        const montantMensuel = calculMensuel
            ? Math.round(heures * valeur * 100) / 100
            : Math.round(heures * valeur * 12 * 100) / 100 / 12;
        const montantAnnuel = Math.round(montantMensuel * 12);
        return {
            amount: montantAnnuel,
            label: def.label,
            source: SOURCE_ACCORD,
            semanticId: def.semanticId,
            meta: { tauxHoraire: valeur, heures }
        };
    }

    if (def.valueKind === 'montant') {
        const actif = (cfg.stateKeyActif && (getAccordInput(state, cfg.stateKeyActif) === true || state[cfg.stateKeyActif] === true));
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

