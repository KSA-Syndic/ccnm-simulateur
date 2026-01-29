/**
 * ============================================
 * FORFAIT CALCULATOR - Calcul unifié des forfaits
 * ============================================
 *
 * API générique : computeForfait(def, context).
 * Convention (CCN) et accord utilisent la même entrée (ElementDef) et le même contexte.
 */

import { CONFIG } from '../core/config.js';
import { SEMANTIC_ID, SOURCE_CONVENTION, SOURCE_ACCORD } from '../core/RemunerationTypes.js';

/**
 * Calcule le montant annuel d'un forfait à partir de sa définition (convention ou accord).
 * @param {import('../core/RemunerationTypes.js').ElementDef} def - Définition du forfait
 * @param {import('../core/RemunerationTypes.js').ComputeContext} context - Contexte (state, baseSMH)
 * @returns {import('../core/RemunerationTypes.js').ElementResult}
 */
export function computeForfait(def, context) {
    if (!def || def.kind !== 'forfait') {
        return { amount: 0, label: '', source: def?.source ?? '' };
    }
    const state = context?.state ?? {};
    if (def.source === SOURCE_CONVENTION) {
        return computeForfaitConvention(def, context);
    }
    if (def.source === SOURCE_ACCORD) {
        return computeForfaitAccord(def, context);
    }
    return { amount: 0, label: '', source: def.source };
}

/**
 * Forfait convention (CCN) : heures (+15%), jours (+30%).
 * @private
 */
function computeForfaitConvention(def, context) {
    const state = context?.state ?? {};
    const baseSMH = context.baseSMH ?? 0;
    const forfait = state.forfait ?? '35h';
    const cfg = def.config || {};
    const forfaitKey = cfg.forfaitKey;
    if (forfait !== forfaitKey) {
        return { amount: 0, label: def.label, source: SOURCE_CONVENTION, semanticId: def.semanticId };
    }
    const taux = cfg.taux ?? CONFIG.FORFAITS[forfaitKey] ?? 0;
    if (taux === 0) {
        return { amount: 0, label: 'Base 35h', source: SOURCE_CONVENTION, semanticId: def.semanticId };
    }
    const amount = Math.round(baseSMH * taux);
    return {
        amount,
        label: def.label,
        source: SOURCE_CONVENTION,
        semanticId: def.semanticId,
        meta: { taux }
    };
}

/**
 * Forfait accord (pour extension future).
 * @private
 */
function computeForfaitAccord(def, context) {
    const baseSMH = context.baseSMH ?? 0;
    const cfg = def.config || {};
    const taux = cfg.taux ?? 0;
    if (taux === 0) {
        return { amount: 0, label: def.label, source: SOURCE_ACCORD, semanticId: def.semanticId };
    }
    const amount = Math.round(baseSMH * taux);
    return {
        amount,
        label: def.label,
        source: SOURCE_ACCORD,
        semanticId: def.semanticId,
        meta: { taux }
    };
}

