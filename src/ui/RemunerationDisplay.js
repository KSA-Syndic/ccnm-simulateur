/**
 * ============================================
 * REMUNERATION DISPLAY - Affichage Résultats
 * ============================================
 * 
 * Affichage des résultats de rémunération avec badge accord.
 */

import { formatMoney } from '../utils/formatters.js';
import { getActiveAgreement } from '../agreements/AgreementLoader.js';

/**
 * Mettre à jour l'affichage de la rémunération
 * @param {Object} remuneration - Résultat du calcul de rémunération
 * @param {number} nbMois - Nombre de mois (12 ou 13)
 */
export function updateRemunerationDisplay(remuneration, nbMois = 12) {
    // Total annuel
    const resultSMH = document.getElementById('result-smh');
    if (resultSMH) {
        resultSMH.textContent = formatMoney(remuneration.total);
    }
    
    // Mensuel
    const mensuel = Math.round(remuneration.total / nbMois);
    const resultMensuel = document.getElementById('result-mensuel');
    if (resultMensuel) {
        resultMensuel.textContent = formatMoney(mensuel);
    }
    
    // Badge accord
    const accordBadge = document.getElementById('accord-badge');
    const accordBadgeNom = document.getElementById('accord-badge-nom');
    const agreement = getActiveAgreement();
    
    if (accordBadge) {
        if (agreement && remuneration.details.some(d => d.isAgreement)) {
            accordBadge.style.display = 'inline-block';
            if (accordBadgeNom) {
                accordBadgeNom.textContent = agreement.nomCourt || agreement.nom;
            }
        } else {
            accordBadge.style.display = 'none';
        }
    }
}

/**
 * Mettre à jour le header avec l'accord sélectionné
 * @param {Object|null} agreement - Accord actif ou null
 */
export function updateHeaderAgreement(agreement) {
    const badge = document.getElementById('header-accord-badge');
    const subtitle = document.getElementById('header-subtitle-text');
    
    if (badge && agreement) {
        badge.textContent = `• ${agreement.nomCourt || agreement.nom}`;
        badge.classList.remove('hidden');
    } else if (badge) {
        badge.classList.add('hidden');
    }
}
