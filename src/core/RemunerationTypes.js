/**
 * ============================================
 * REMUNERATION TYPES - Interfaces unifiées Convention / Accord
 * ============================================
 *
 * Types communs pour primes, majorations et forfaits, qu'ils viennent
 * de la convention collective (CCN) ou d'un accord d'entreprise.
 * Permet de calculer chaque élément de la même façon (compute par def + context).
 *
 * @module RemunerationTypes
 */

/** Source juridique : convention collective ou accord d'entreprise */
export const SOURCE_CONVENTION = 'convention';
export const SOURCE_ACCORD = 'accord';

/** Type d'élément rémunération */
export const ELEMENT_KIND_PRIME = 'prime';
export const ELEMENT_KIND_MAJORATION = 'majoration';
export const ELEMENT_KIND_FORFAIT = 'forfait';

/** Type de valeur (horaire, montant fixe, pourcentage) */
export const VALUE_KIND_HORAIRE = 'horaire';
export const VALUE_KIND_MONTANT = 'montant';
export const VALUE_KIND_POURCENTAGE = 'pourcentage';

/**
 * Identifiants sémantiques pour le principe de faveur (comparer convention vs accord).
 * Un même semanticId peut exister en convention et en accord ; on prend le plus avantageux.
 */
export const SEMANTIC_ID = {
    PRIME_ANCIENNETE: 'primeAnciennete',
    PRIME_EQUIPE: 'primeEquipe',
    PRIME_VACANCES: 'primeVacances',
    MAJORATION_NUIT: 'majorationNuit',
    MAJORATION_DIMANCHE: 'majorationDimanche',
    FORFAIT_HEURES: 'forfaitHeures',
    FORFAIT_JOURS: 'forfaitJours'
};

/**
 * Contexte de calcul commun à tous les éléments (state + bases optionnelles).
 * @typedef {Object} ComputeContext
 * @property {Object} state - État de l'application (anciennete, heuresNuit, typeNuit, forfait, etc.)
 * @property {number} [baseSMH] - SMH annuel de base (pour forfait, prime ancienneté accord)
 * @property {number} [salaireBase] - Salaire de base annuel (prime ancienneté accord)
 * @property {number} [tauxHoraire] - Taux horaire (majorations, prime horaire)
 * @property {number} [pointTerritorial] - Point territorial (prime ancienneté CCN)
 * @property {number} [classe] - Classe de classification (prime ancienneté CCN)
 * @property {Object} [agreement] - Accord d'entreprise actif (pour valeur accord)
 */

/**
 * Résultat de calcul d'un élément (montant + métadonnées pour affichage).
 * @typedef {Object} ElementResult
 * @property {number} amount - Montant annuel
 * @property {string} label - Libellé pour affichage
 * @property {string} source - 'convention' | 'accord'
 * @property {string} [semanticId] - Id sémantique (pour faveur)
 * @property {Object} [meta] - Taux, unité, etc. pour détail
 */

/**
 * Définition générique d'un élément (prime, majoration ou forfait).
 * Convention et accord exposent des définitions compatibles ; le calculateur
 * appelle compute(def, context) sans savoir si def vient de la CCN ou de l'accord.
 *
 * @typedef {Object} ElementDef
 * @property {string} id - Identifiant technique (ex: 'primeAnciennete', 'primeEquipe')
 * @property {string} semanticId - Id sémantique pour principe de faveur (SEMANTIC_ID.*)
 * @property {'prime'|'majoration'|'forfait'} kind - Type d'élément
 * @property {'convention'|'accord'} source - Source juridique
 * @property {'horaire'|'montant'|'pourcentage'} valueKind - Type de valeur
 * @property {string} label - Libellé court
 * @property {Object} [config] - Config spécifique (barème, taux, valeur, etc.)
 * @property {string} [stateKeyActif] - Clé state pour activer (accord)
 * @property {string} [stateKeyHeures] - Clé state pour heures (prime horaire)
 * @property {number} [moisVersement] - Mois de versement 1-12 (prime montant)
 * @property {string[]} [conditions] - Conditions d'éligibilité (texte)
 */

/**
 * Vérifie qu'un objet a la forme minimale d'un ElementDef.
 * @param {unknown} def
 * @returns {def is ElementDef}
 */
export function isElementDef(def) {
    return def != null
        && typeof def === 'object'
        && typeof def.id === 'string'
        && typeof def.semanticId === 'string'
        && ['prime', 'majoration', 'forfait'].includes(def.kind)
        && ['convention', 'accord'].includes(def.source);
}
