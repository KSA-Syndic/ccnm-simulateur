/**
 * ============================================
 * URL PARAMS - Gestion des Paramètres URL
 * ============================================
 * 
 * Gestion des paramètres URL pour :
 * - Sélection d'un accord d'entreprise (?accord=kuhn)
 * - Couleur de fond iframe (?bgcolor=#ffffff)
 * - Mode iframe (?iframe=true)
 */

/**
 * Paramètres URL extraits
 * @type {Object}
 */
let urlParams = {};

/**
 * Extraire les paramètres URL de la page courante
 * @returns {Object} Objet contenant les paramètres
 */
export function extractURLParams() {
    const params = new URLSearchParams(window.location.search);
    
    urlParams = {
        accord: params.get('accord') || null,
        bgcolor: params.get('bgcolor') || null,
        iframe: params.get('iframe') === 'true' || window.self !== window.top
    };
    
    return urlParams;
}

/**
 * Obtenir un paramètre URL spécifique
 * @param {string} key - Clé du paramètre
 * @returns {string|null} Valeur du paramètre ou null
 */
export function getURLParam(key) {
    if (Object.keys(urlParams).length === 0) {
        extractURLParams();
    }
    
    return urlParams[key] || null;
}

/**
 * Obtenir tous les paramètres URL
 * @returns {Object} Objet contenant tous les paramètres
 */
export function getAllURLParams() {
    if (Object.keys(urlParams).length === 0) {
        extractURLParams();
    }
    
    return { ...urlParams };
}

/**
 * Vérifier si l'application est en mode iframe
 * @returns {boolean} true si en mode iframe
 */
export function isIframeMode() {
    return getURLParam('iframe') || window.self !== window.top;
}

/**
 * Obtenir la couleur de fond si spécifiée
 * @returns {string|null} Couleur hexadécimale ou null
 */
export function getBackgroundColor() {
    return getURLParam('bgcolor');
}

/**
 * Appliquer les styles iframe si nécessaire
 */
export function applyIframeStyles() {
    const isIframe = isIframeMode();
    const bgColor = getBackgroundColor();
    
    if (isIframe) {
        document.documentElement.classList.add('iframe-mode');
        
        // Appliquer la couleur de fond si spécifiée
        if (bgColor) {
            document.body.style.backgroundColor = bgColor;
        } else {
            // Pas de couleur de fond par défaut en iframe
            document.body.style.backgroundColor = 'transparent';
        }
        
        // Container principal sans ombre ni couleur de fond
        const container = document.querySelector('.simulator-container');
        if (container) {
            container.classList.add('iframe-container');
        }
    }
}

// Extraire les paramètres au chargement du module
extractURLParams();
