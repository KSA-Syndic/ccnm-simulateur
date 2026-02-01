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
    } else {
        return { amount: 0, label: def.label, source: SOURCE_CONVENTION };
    }

    if (heures === 0) {
        return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
    }
    const montantMensuel = Math.round(heures * tauxHoraire * taux * 100) / 100;
    const amount = Math.round(montantMensuel * 12);

    return {
        amount,
        label: def.label,
        source: SOURCE_CONVENTION,
        semanticId: def.semanticId,
        meta: { taux: Math.round(taux * 100), montantMensuel }
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

    return { amount: 0, label: def.label, source: SOURCE_ACCORD };
}

