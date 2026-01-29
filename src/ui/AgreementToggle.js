/**
 * ============================================
 * AGREEMENT TOGGLE - Composant Activation Accord
 * ============================================
 * 
 * Composant pour activer/désactiver un accord d'entreprise.
 */

import { getActiveAgreement } from '../agreements/AgreementLoader.js';
import { showToast } from './Toast.js';

/**
 * Initialiser le composant de toggle d'accord
 * @param {Function} onToggle - Callback appelé lors du toggle (accordId, active)
 */
export function initAgreementToggle(onToggle) {
    const checkbox = document.getElementById('accord-actif');
    const nomDisplay = document.getElementById('accord-nom-display');
    const optionGroup = document.getElementById('accord-option-group');
    const subOptions = document.getElementById('accord-sub-options');
    
    if (!checkbox) {
        return; // Pas d'accord disponible
    }
    
    const agreement = getActiveAgreement();
    if (!agreement) {
        if (optionGroup) {
            optionGroup.style.display = 'none';
        }
        return;
    }
    
    // Afficher le nom de l'accord
    if (nomDisplay) {
        nomDisplay.textContent = agreement.nomCourt || agreement.nom;
    }
    
    // Afficher le groupe d'options
    if (optionGroup) {
        optionGroup.style.display = 'block';
    }
    
    // Gérer le toggle
    checkbox.addEventListener('change', (e) => {
        const isActive = e.target.checked;
        
        if (onToggle) {
            onToggle(agreement.id, isActive);
        }
        
        // Afficher/masquer les sous-options
        if (subOptions) {
            if (isActive) {
                subOptions.classList.remove('hidden');
            } else {
                subOptions.classList.add('hidden');
            }
        }
    });
    
    // Initialiser l'état
    if (subOptions) {
        if (checkbox.checked) {
            subOptions.classList.remove('hidden');
        } else {
            subOptions.classList.add('hidden');
        }
    }
}
