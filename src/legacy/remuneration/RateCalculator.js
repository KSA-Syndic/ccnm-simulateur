/**
 * ============================================
 * RATE CALCULATOR - Référentiels de taux SMH
 * ============================================
 *
 * Source unique des taux de référence dérivés du SMH.
 */

import { CONFIG } from '../core/config.js';

function toFinite(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

export function getSmhHourlyBaseRate(smhAnnual, options = {}) {
    const annual = toFinite(smhAnnual, 0);
    if (!(annual > 0)) return 0;
    const nbMois = toFinite(options.nbMois, 12) || 12;
    const activityRate = toFinite(options.activityRate, 1);
    const heuresMensuellesBase = toFinite(options.heuresMensuellesBase, Number(CONFIG.DUREE_LEGALE_HEURES_MOIS ?? 151.67)) || 151.67;
    const heuresMensuellesRef = heuresMensuellesBase * activityRate;
    if (!(nbMois > 0) || !(heuresMensuellesRef > 0)) return 0;
    return (annual / nbMois) / heuresMensuellesRef;
}

export function getSmhDailyBaseRate(smhAnnual, options = {}) {
    const annual = toFinite(smhAnnual, 0);
    if (!(annual > 0)) return 0;
    const activityRate = toFinite(options.activityRate, 1);
    const joursRefAnnuel = (toFinite(options.joursRefAnnuel, Number(CONFIG.FORFAIT_JOURS_REFERENCE ?? 218)) || 218) * activityRate;
    if (!(joursRefAnnuel > 0)) return 0;
    return annual / joursRefAnnuel;
}
