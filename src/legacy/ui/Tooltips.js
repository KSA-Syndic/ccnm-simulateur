/**
 * ============================================
 * TOOLTIPS - Initialisation Tippy.js
 * ============================================
 * 
 * Gestion des tooltips avec Tippy.js.
 */

/**
 * Initialiser tous les tooltips
 */
export function initTooltips() {
    // Vérifier que Tippy est disponible
    if (typeof tippy === 'undefined') {
        console.warn('Tippy.js n\'est pas chargé');
        return;
    }
    
    // Initialiser tous les tooltips
    tippy('[data-tippy-content]', {
        theme: 'metallurgie',
        animation: 'shift-away',
        duration: [200, 150],
        arrow: true,
        maxWidth: 300,
        interactive: true,
        allowHTML: true,
        appendTo: document.body
    });
    
    // Empêcher la propagation des clics sur les tooltips
    document.querySelectorAll('.tooltip-trigger, .tooltip-trigger__light').forEach(tooltip => {
        tooltip.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
        });
    });
}
