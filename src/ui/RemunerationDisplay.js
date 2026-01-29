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

const HEADER_SUBTITLE_BASE = 'Classification et Rémunération';
/** Tooltip du header : phrase simple et accessible (sans jargon technique). */
const HEADER_INFO_BASE_TOOLTIP = "Ce simulateur vous aide à estimer votre niveau de classification et à vérifier que votre salaire respecte au minimum les barèmes de la convention collective de la métallurgie.<br><br>📋 <a href='https://uimm.lafabriquedelavenir.fr/textes-conventionnels-metallurgie/' target='_blank' rel='noopener'>Voir les textes de la convention</a>";

/**
 * Met à jour le header : sous-titre (avec accord éventuel) et un seul tooltip sur l’icône ?.
 * @param {Object|null} agreement - Accord actif ou null
 */
export function updateHeaderAgreement(agreement) {
    const subtitleEl = document.getElementById('header-subtitle-text');
    const headerInfoIcon = document.getElementById('header-info-icon');

    if (subtitleEl) {
        const nomAccord = agreement ? (agreement.nomCourt || agreement.nom) : '';
        subtitleEl.textContent = nomAccord ? `${HEADER_SUBTITLE_BASE} · ${nomAccord}` : HEADER_SUBTITLE_BASE;
    }

    if (headerInfoIcon) {
        let tooltipContent = HEADER_INFO_BASE_TOOLTIP;
        if (agreement) {
            const nom = agreement.nomCourt || agreement.nom;
            const labels = agreement.labels || {};
            const tooltipAccord = labels.description || labels.tooltipHeader || labels.tooltip || '';
            const descAccord = tooltipAccord
                ? escapeHtml(tooltipAccord)
                : `Si votre entreprise applique l'accord ${nom}, cochez l'option en page Résultat pour inclure ses règles dans le calcul.`;
            tooltipContent += `<br><br>🏢 <strong>${escapeHtml(nom)}</strong><br>${descAccord}`;
            if (agreement.url) tooltipContent += `<br><br>📋 <a href="${escapeAttr(agreement.url)}" target="_blank" rel="noopener">Voir le texte de l'accord</a>`;
        }
        headerInfoIcon.setAttribute('data-tippy-content', tooltipContent);
        if (headerInfoIcon._tippy) headerInfoIcon._tippy.setContent(tooltipContent);
    }
}

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = typeof document !== 'undefined' ? document.createElement('div') : null;
    if (div) {
        div.textContent = text;
        return div.innerHTML;
    }
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
