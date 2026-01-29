/**
 * ============================================
 * TEXT HELPERS - Gestion Acronymes et Textes
 * ============================================
 * 
 * Utilitaires pour la gestion des acronymes et le formatage des textes
 * selon les principes de rédaction définis.
 */

/**
 * Registre des acronymes déjà expliqués dans la session
 * @type {Set<string>}
 */
const acronymsExplained = new Set();

/**
 * Acronymes connus avec leurs formes complètes
 */
const ACRONYMS = {
    'CCN': 'Convention Collective Nationale',
    'CCNM': 'Convention Collective Nationale de la Métallurgie',
    'SMH': 'Salaire Minimum Hiérarchique',
    'PDF': 'format de document portable',
    'UIMM': 'Union des Industries et Métiers de la Métallurgie',
    'UES': 'Unité Économique et Sociale'
};

/**
 * Formater un acronyme avec sa forme complète à la première occurrence
 * @param {string} acronym - Acronyme à formater
 * @param {boolean} forceExplanation - Forcer l'explication même si déjà expliqué
 * @returns {string} Texte formaté avec forme complète si première occurrence
 */
export function formatAcronym(acronym, forceExplanation = false) {
    if (!acronym || typeof acronym !== 'string') {
        return acronym;
    }
    
    const upperAcronym = acronym.toUpperCase();
    
    if (!ACRONYMS[upperAcronym]) {
        return acronym;
    }
    
    const alreadyExplained = acronymsExplained.has(upperAcronym);
    
    if (!alreadyExplained || forceExplanation) {
        acronymsExplained.add(upperAcronym);
        return `${ACRONYMS[upperAcronym]} (${acronym})`;
    }
    
    return acronym;
}

/**
 * Réinitialiser le registre des acronymes expliqués
 */
export function resetAcronymsRegistry() {
    acronymsExplained.clear();
}

/**
 * Obtenir la forme complète d'un acronyme
 * @param {string} acronym - Acronyme
 * @returns {string|null} Forme complète ou null si inconnu
 */
export function getAcronymFullForm(acronym) {
    if (!acronym || typeof acronym !== 'string') {
        return null;
    }
    
    return ACRONYMS[acronym.toUpperCase()] || null;
}

/**
 * Formater une valeur avec son unité
 * @param {number} value - Valeur numérique
 * @param {string} unit - Unité (ex: '€', 'ans', 'h/mois')
 * @returns {string} Valeur formatée avec unité
 */
export function formatWithUnit(value, unit) {
    if (value === null || value === undefined) {
        return '-';
    }
    
    const formattedValue = typeof value === 'number' 
        ? new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(value)
        : String(value);
    
    return `${formattedValue} ${unit}`;
}
