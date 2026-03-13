/**
 * ============================================
 * MAJORATION CALCULATOR - Calcul unifié des majorations
 * ============================================
 *
 * API générique : computeMajoration(def, context).
 * Convention (CCN) et accord utilisent la même entrée (ElementDef) et le même contexte.
 */

import { CONFIG } from '../core/config.js';
import { SEMANTIC_ID, SOURCE_CONVENTION, SOURCE_ACCORD } from '../core/RemunerationTypes.js';

/**
 * Calcule le montant annuel d'une majoration à partir de sa définition (convention ou accord).
 * @param {import('../core/RemunerationTypes.js').ElementDef} def - Définition de la majoration
 * @param {import('../core/RemunerationTypes.js').ComputeContext} context - Contexte (state, tauxHoraire, agreement)
 * @returns {import('../core/RemunerationTypes.js').ElementResult & { meta?: { taux: number, montantMensuel: number } }}
 */
export function computeMajoration(def, context) {
    if (!def || def.kind !== 'majoration') {
        return { amount: 0, label: '', source: def?.source ?? '' };
    }
    const state = context?.state ?? {};
    if (def.source === SOURCE_CONVENTION) {
        return computeMajorationConvention(def, context);
    }
    if (def.source === SOURCE_ACCORD) {
        return computeMajorationAccord(def, context);
    }
    return { amount: 0, label: '', source: def.source };
}

/**
 * Majoration convention (CCN) : nuit (15%), dimanche (100%).
 * @private
 */
function computeMajorationConvention(def, context) {
    const state = context?.state ?? {};
    const tauxHoraire = context.tauxHoraire ?? 0;
    const tauxHoraireBase = context.tauxHoraireBase ?? tauxHoraire;
    const cfg = def.config || {};
    let heures = 0;
    let taux = 0;

    if (def.semanticId === SEMANTIC_ID.MAJORATION_NUIT) {
        if (state.typeNuit === 'aucun') {
            return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
        }
        heures = state.heuresNuit ?? 0;
        taux = cfg.taux ?? CONFIG.MAJORATIONS_CCN.nuit;
    } else if (def.semanticId === SEMANTIC_ID.MAJORATION_DIMANCHE) {
        heures = state.heuresDimanche ?? 0;
        taux = cfg.taux ?? CONFIG.MAJORATIONS_CCN.dimanche;
    } else if (def.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_25 || def.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_50) {
        const stateKeyActif = cfg.stateKeyActif || 'travailHeuresSup';
        const stateKeyHeures = cfg.stateKeyHeures || 'heuresSup';
        const actif = state[stateKeyActif] === true;
        if (!actif) {
            return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
        }
        const heuresSup = Number(state[stateKeyHeures]) || 0;
        const seuilMensuel = Number(cfg.seuilMensuel) || (CONFIG.HEURES_SUP_TRANCHE_1_MENSUELLES ?? 34.67);
        const heures25 = Math.min(Math.max(heuresSup, 0), seuilMensuel);
        const heures50 = Math.max(heuresSup - seuilMensuel, 0);
        heures = def.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_25 ? heures25 : heures50;
        taux = cfg.taux ?? (def.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_25 ? CONFIG.MAJORATIONS_CCN.heuresSup25 : CONFIG.MAJORATIONS_CCN.heuresSup50);
    } else {
        return { amount: 0, label: def.label, source: SOURCE_CONVENTION };
    }

    if (heures === 0) {
        return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
    }
    const baseForCalc = (def.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_25 || def.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_50)
        ? tauxHoraireBase
        : tauxHoraire;
    const montantMensuel = Math.round(heures * baseForCalc * taux * 100) / 100;
    const amount = Math.round(montantMensuel * 12);

    return {
        amount,
        label: def.label,
        source: SOURCE_CONVENTION,
        semanticId: def.semanticId,
        meta: { taux: Math.round(taux * 100), montantMensuel, heures }
    };
}

/**
 * Majoration accord : nuit (posteNuit), dimanche (taux accord).
 * @private
 */
function computeMajorationAccord(def, context) {
    const agreement = context?.agreement;
    const state = context?.state ?? {};
    const tauxHoraire = context.tauxHoraire ?? 0;
    const tauxHoraireBase = context.tauxHoraireBase ?? tauxHoraire;

    if (def.semanticId === SEMANTIC_ID.MAJORATION_NUIT) {
        const nuit = agreement?.majorations?.nuit;
        if (state.typeNuit === 'aucun') {
            return { amount: 0, label: def.label, source: SOURCE_ACCORD, semanticId: def.semanticId };
        }
        const heures = state.heuresNuit ?? 0;
        const taux = nuit?.posteNuit != null ? nuit.posteNuit : (CONFIG.MAJORATIONS_CCN.nuit);
        if (heures === 0) {
            return { amount: 0, label: def.label, source: SOURCE_ACCORD, semanticId: def.semanticId };
        }
        const montantMensuel = Math.round(heures * tauxHoraireBase * taux * 100) / 100;
        const amount = Math.round(montantMensuel * 12);
        return {
            amount,
            label: def.label,
            source: SOURCE_ACCORD,
            semanticId: def.semanticId,
            meta: { taux: Math.round(taux * 100), montantMensuel }
        };
    }

    if (def.semanticId === SEMANTIC_ID.MAJORATION_DIMANCHE) {
        const heures = state.heuresDimanche ?? 0;
        const taux = agreement?.majorations?.dimanche ?? CONFIG.MAJORATIONS_CCN.dimanche;
        if (heures === 0) {
            return { amount: 0, label: def.label, source: SOURCE_ACCORD, semanticId: def.semanticId };
        }
        const montantMensuel = Math.round(heures * tauxHoraire * taux * 100) / 100;
        const amount = Math.round(montantMensuel * 12);
        return {
            amount,
            label: def.label,
            source: SOURCE_ACCORD,
            semanticId: def.semanticId,
            meta: { taux: Math.round(taux * 100), montantMensuel }
        };
    }

    if (def.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_25 || def.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_50) {
        const hs = agreement?.majorations?.heuresSupplementaires || {};
        const stateKeyActif = def.config?.stateKeyActif || 'travailHeuresSup';
        const stateKeyHeures = def.config?.stateKeyHeures || 'heuresSup';
        const actif = state[stateKeyActif] === true;
        if (!actif) {
            return { amount: 0, label: def.label, source: SOURCE_ACCORD, semanticId: def.semanticId };
        }
        const heuresSup = Number(state[stateKeyHeures]) || 0;
        const seuilMensuel = Number(def.config?.seuilMensuel) || (CONFIG.HEURES_SUP_TRANCHE_1_MENSUELLES ?? 34.67);
        const heures25 = Math.min(Math.max(heuresSup, 0), seuilMensuel);
        const heures50 = Math.max(heuresSup - seuilMensuel, 0);
        const heures = def.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_25 ? heures25 : heures50;
        if (heures === 0) {
            return { amount: 0, label: def.label, source: SOURCE_ACCORD, semanticId: def.semanticId };
        }
        const taux = def.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_25
            ? (hs.majoration25 ?? CONFIG.MAJORATIONS_CCN.heuresSup25)
            : (hs.majoration50 ?? CONFIG.MAJORATIONS_CCN.heuresSup50);
        const montantMensuel = Math.round(heures * tauxHoraire * taux * 100) / 100;
        const amount = Math.round(montantMensuel * 12);
        return {
            amount,
            label: def.label,
            source: SOURCE_ACCORD,
            semanticId: def.semanticId,
            meta: { taux: Math.round(taux * 100), montantMensuel, heures }
        };
    }

    return { amount: 0, label: def.label, source: SOURCE_ACCORD };
}

