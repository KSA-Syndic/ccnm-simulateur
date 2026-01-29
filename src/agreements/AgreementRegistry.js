/**
 * ============================================
 * AGREEMENT REGISTRY - Registre des Accords
 * ============================================
 * 
 * Registre centralisé des accords d'entreprise disponibles.
 * Permet de charger et gérer les accords de manière générique.
 */

import { KuhnAgreement } from '../../accords/KuhnAgreement.js';
import { validateAgreement } from './AgreementInterface.js';

/**
 * Registre des accords disponibles
 * @type {Map<string, Object>}
 */
const agreementsRegistry = new Map();

/**
 * Initialiser le registre avec les accords disponibles
 */
function initializeRegistry() {
    // Enregistrer l'accord Kuhn
    registerAgreement(KuhnAgreement);
}

/**
 * Enregistrer un accord dans le registre
 * @param {Object} agreement - Accord à enregistrer
 * @returns {boolean} true si l'accord a été enregistré avec succès
 */
export function registerAgreement(agreement) {
    if (!validateAgreement(agreement)) {
        console.error(`Impossible d'enregistrer l'accord ${agreement?.id || 'inconnu'}: validation échouée`);
        return false;
    }
    
    agreementsRegistry.set(agreement.id, agreement);
    return true;
}

/**
 * Obtenir un accord par son ID
 * @param {string} id - Identifiant de l'accord
 * @returns {Object|null} L'accord ou null si non trouvé
 */
export function getAgreement(id) {
    if (!id) {
        return null;
    }
    
    return agreementsRegistry.get(id) || null;
}

/**
 * Obtenir tous les accords enregistrés
 * @returns {Array<Object>} Liste des accords
 */
export function getAllAgreements() {
    return Array.from(agreementsRegistry.values());
}

/**
 * Vérifier si un accord existe
 * @param {string} id - Identifiant de l'accord
 * @returns {boolean} true si l'accord existe
 */
export function hasAgreement(id) {
    return agreementsRegistry.has(id);
}

/**
 * Obtenir la liste des IDs d'accords disponibles
 * @returns {Array<string>} Liste des IDs
 */
export function getAgreementIds() {
    return Array.from(agreementsRegistry.keys());
}

// Initialiser le registre au chargement du module
initializeRegistry();
