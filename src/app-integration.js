/**
 * ============================================
 * APP INTEGRATION - Intégration des Nouveaux Modules
 * ============================================
 * 
 * Fichier d'intégration pour connecter les nouveaux modules modulaires
 * à l'application existante. Permet une migration progressive.
 */

import { loadAgreementFromURL, getActiveAgreement } from './agreements/AgreementLoader.js';
import { extractURLParams, applyIframeStyles, isIframeMode } from './core/URLParams.js';
import { updateHeaderAgreement } from './ui/RemunerationDisplay.js';

/**
 * Initialiser l'intégration des nouveaux modules
 */
export function initAppIntegration() {
    // Extraire les paramètres URL
    const urlParams = extractURLParams();
    
    // Appliquer les styles iframe si nécessaire
    applyIframeStyles();
    
    // Charger l'accord depuis l'URL si présent
    const urlParamsObj = new URLSearchParams(window.location.search);
    const agreement = loadAgreementFromURL(urlParamsObj);
    
    // Mettre à jour le header avec l'accord (badge + tooltip info)
    updateHeaderAgreement(agreement);
    
    // Exposer les fonctions pour compatibilité avec app.js existant
    window.AgreementLoader = {
        getActiveAgreement,
        loadAgreementFromURL
    };
    window.updateHeaderAgreement = updateHeaderAgreement;
    
    window.URLParams = {
        isIframeMode,
        getURLParam: (key) => urlParams[key] || null
    };
    
    return {
        agreement,
        isIframe: isIframeMode()
    };
}

// Initialiser au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAppIntegration);
} else {
    initAppIntegration();
}
