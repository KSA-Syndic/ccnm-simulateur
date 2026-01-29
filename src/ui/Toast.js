/**
 * ============================================
 * TOAST - Système de Notifications Temporaires
 * ============================================
 * 
 * Notifications temporaires pour informer l'utilisateur des actions automatiques.
 */

/**
 * Afficher une notification toast
 * @param {string} message - Message à afficher
 * @param {string} type - Type de notification ('success', 'warning', 'info', 'error')
 * @param {number} duration - Durée d'affichage en ms (défaut: 3500)
 */
export function showToast(message, type = 'info', duration = 3500) {
    // Créer le conteneur s'il n'existe pas
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    // Créer le toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Ajouter au conteneur
    container.appendChild(toast);
    
    // Animation d'entrée
    requestAnimationFrame(() => {
        toast.classList.add('toast-visible');
    });
    
    // Suppression automatique
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}
