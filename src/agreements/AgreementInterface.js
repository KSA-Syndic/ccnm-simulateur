/**
 * ============================================
 * AGREEMENT INTERFACE - Schéma Standard
 * ============================================
 * 
 * Interface/schéma standard pour tous les accords d'entreprise.
 * Ce fichier définit la structure que doit respecter chaque accord.
 */

/**
 * Schéma d'accord d'entreprise standard
 * @typedef {Object} Agreement
 * @property {string} id - Identifiant unique (ex: 'kuhn')
 * @property {string} nom - Nom affiché complet
 * @property {string} nomCourt - Nom court pour affichage compact
 * @property {string} url - URL vers le texte de l'accord (site officiel, PDF, etc.)
 * @property {string} dateEffet - Date d'entrée en vigueur (format ISO: 'YYYY-MM-DD')
 * @property {string} [dateSignature] - Date de signature (optionnel, format ISO)
 * @property {Object} anciennete - Configuration prime d'ancienneté
 * @property {Object} majorations - Configuration majorations conditions de travail
 * @property {Object} primes - Configuration primes spécifiques
 * @property {Object} repartition13Mois - Configuration répartition mensuelle (13e mois)
 * @property {Object} [conges] - Congés d'ancienneté (optionnel, informatif)
 * @property {Object} labels - Labels et métadonnées UI
 * @property {Object} metadata - Métadonnées techniques
 */

/**
 * Validation basique d'un accord
 * @param {Agreement} agreement - Accord à valider
 * @returns {boolean} true si l'accord est valide
 */
export function validateAgreement(agreement) {
    if (!agreement || typeof agreement !== 'object') {
        return false;
    }
    
    const required = ['id', 'nom', 'nomCourt', 'url', 'dateEffet', 'anciennete', 'majorations', 'primes', 'repartition13Mois', 'labels', 'metadata'];
    
    for (const field of required) {
        if (!(field in agreement)) {
            console.warn(`Champ requis manquant dans l'accord: ${field}`);
            return false;
        }
    }
    
    return true;
}

/**
 * Export du schéma pour documentation
 */
export const AGREEMENT_SCHEMA = {
    id: 'string (requis)',
    nom: 'string (requis)',
    nomCourt: 'string (requis)',
    url: 'string (requis)',
    dateEffet: 'string ISO date (requis)',
    dateSignature: 'string ISO date (optionnel)',
    anciennete: {
        seuil: 'number (requis)',
        plafond: 'number (requis)',
        tousStatuts: 'boolean (requis)',
        baseCalcul: "'salaire' | 'point' (requis)",
        barème: 'object | function (requis)',
        tauxParClasse: 'object (optionnel si baseCalcul === "salaire")',
        formule: 'string (optionnel)'
    },
    majorations: {
        nuit: {
            posteNuit: 'number (requis)',
            posteMatin: 'number (requis)',
            plageDebut: 'number (requis)',
            plageFin: 'number (requis)',
            seuilHeuresPosteNuit: 'number (requis)'
        },
        dimanche: 'number (requis)',
        heuresSupplementaires: 'object (optionnel)',
        penibilite: 'object (optionnel)'
    },
    primes: {
        equipe: 'object (optionnel)',
        vacances: 'object (optionnel)',
        autres: 'array (optionnel)'
    },
    repartition13Mois: {
        actif: 'boolean (requis)',
        moisVersement: 'number 1-12 (requis)',
        inclusDansSMH: 'boolean (requis)'
    },
    conges: 'object (optionnel)',
    labels: {
        nomCourt: 'string (requis)',
        tooltip: 'string (requis)',
        description: 'string (requis)',
        badge: 'string (optionnel)'
    },
    metadata: {
        version: 'string (requis)',
        articlesSubstitues: 'array (requis)',
        territoire: 'string (optionnel)',
        entreprise: 'string (requis)'
    }
};
