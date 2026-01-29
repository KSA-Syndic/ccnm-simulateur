/**
 * ============================================
 * AGREEMENT LOADER - Chargement des Accords
 * ============================================
 * 
 * Gestion du chargement dynamique des accords d'entreprise.
 * Permet de charger un accord depuis un paramètre URL ou une sélection utilisateur.
 */

import { getAgreement, hasAgreement, getAllAgreements } from './AgreementRegistry.js';

/**
 * Accord actuellement chargé et actif
 * @type {Object|null}
 */
let activeAgreement = null;

/**
 * Charger un accord par son ID
 * @param {string} id - Identifiant de l'accord
 * @returns {Object|null} L'accord chargé ou null si non trouvé
 */
export function loadAgreement(id) {
    if (!id) {
        activeAgreement = null;
        return null;
    }
    
    const agreement = getAgreement(id);
    
    if (agreement) {
        activeAgreement = agreement;
        return agreement;
    }
    
    console.warn(`Accord "${id}" non trouvé dans le registre`);
    activeAgreement = null;
    return null;
}

/**
 * Obtenir l'accord actuellement actif
 * @returns {Object|null} L'accord actif ou null
 */
export function getActiveAgreement() {
    return activeAgreement;
}

/**
 * Vérifier si un accord est actif
 * @returns {boolean} true si un accord est actif
 */
export function hasActiveAgreement() {
    return activeAgreement !== null;
}

/**
 * Réinitialiser l'accord actif
 */
export function resetActiveAgreement() {
    activeAgreement = null;
}

/**
 * Charger un accord depuis les paramètres URL
 * @param {URLSearchParams} urlParams - Paramètres URL
 * @returns {Object|null} L'accord chargé ou null
 */
export function loadAgreementFromURL(urlParams) {
    const accordId = urlParams.get('accord');
    
    if (accordId) {
        return loadAgreement(accordId);
    }
    
    return null;
}

/**
 * Obtenir tous les accords disponibles (pour sélection utilisateur)
 * @returns {Array<Object>} Liste des accords avec id, nom, nomCourt
 */
export function getAvailableAgreements() {
    return getAllAgreements().map(agreement => ({
        id: agreement.id,
        nom: agreement.nom,
        nomCourt: agreement.nomCourt,
        url: agreement.url,
        labels: agreement.labels
    }));
}
