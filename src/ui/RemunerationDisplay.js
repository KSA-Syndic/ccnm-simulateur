/**
 * ============================================
 * REMUNERATION DISPLAY - Affichage Résultats
 * ============================================
 * 
 * Affichage des résultats de rémunération avec badge accord.
 */

import { formatMoney } from '../utils/formatters.js';
import { getActiveAgreement } from '../agreements/AgreementLoader.js';
import { CONFIG } from '../core/config.js';
import { LABELS, CONVENTION_URL } from './Labels.js';

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
 * Met à jour le header : sous-titre (avec accord éventuel) et un seul tooltip sur l’icône ?.
 * @param {Object|null} agreement - Accord actif ou null
 */
export function updateHeaderAgreement(agreement) {
    const subtitleEl = document.getElementById('header-subtitle-text');
    const headerInfoIcon = document.getElementById('header-info-icon');

    if (subtitleEl) {
        const nomAccord = agreement ? (agreement.nomCourt || agreement.nom) : '';
        subtitleEl.textContent = nomAccord ? `${LABELS.headerSubtitle} · ${nomAccord}` : LABELS.headerSubtitle;
    }

    if (headerInfoIcon) {
        const smhUpdate = CONFIG?.SMH_UPDATE;
        const year = smhUpdate?.referenceYear;
        const yearEntries = smhUpdate?.years && typeof smhUpdate.years === 'object'
            ? Object.entries(smhUpdate.years)
                .map(([y, info]) => ({ year: Number(y), ...(info || {}) }))
                .filter(entry => Number.isFinite(entry.year))
                .sort((a, b) => a.year - b.year)
            : [];
        const selectedYear = yearEntries.find(entry => entry.year === year) || yearEntries[yearEntries.length - 1];
        const effectiveDate = selectedYear?.effectiveDate ? new Date(selectedYear.effectiveDate).toLocaleDateString('fr-FR') : null;
        const updatedAt = smhUpdate?.updatedAt ? new Date(smhUpdate.updatedAt).toLocaleDateString('fr-FR') : null;
        const yearlyRates = yearEntries
            .filter(entry => Number.isFinite(entry?.indicativeRate))
            .map(entry => ({ year: entry.year, indicativeRate: Number(entry.indicativeRate) }));
        const yearly = yearEntries.length
            ? yearEntries.map(entry => `${entry.year}: ${entry.change || ''}`).join('<br>')
            : '';

        let tooltipContent = LABELS.headerInfoTooltip +
            `<br><br><a href="${CONVENTION_URL}" target="_blank" rel="noopener">${LABELS.headerInfoTooltipLinkText}</a>`;
        if (year || effectiveDate || updatedAt || yearly) {
            const lines = [];
            if (year) lines.push(`SMH: grille ${year}`);
            if (effectiveDate) lines.push(`Effet: ${effectiveDate}`);
            if (updatedAt) lines.push(`MAJ appli: ${updatedAt}`);
            if (selectedYear?.sourceLabel) lines.push(`Source: ${escapeHtml(selectedYear.sourceLabel)}`);
            if (yearlyRates.length) {
                const ratesLabel = yearlyRates
                    .map(entry => `${entry.year}: ${Math.round(entry.indicativeRate * 10000) / 100}%`)
                    .join(' · ');
                lines.push(`Repères (informatif): ${ratesLabel}`);
                lines.push('Calcul: grilles annuelles.');
            }
            tooltipContent += `<br><br>📅 <strong>MAJ salaires minima</strong><br>${lines.join('<br>')}`;
            if (selectedYear?.sourceUrl) {
                tooltipContent += `<br><a href="${escapeAttr(selectedYear.sourceUrl)}" target="_blank" rel="noopener">Voir la source de revalorisation (${selectedYear.year})</a>`;
            }
        }
        if (agreement) {
            const nom = agreement.nomCourt || agreement.nom;
            const labels = agreement.labels || {};
            const tooltipAccord = labels.description || labels.tooltipHeader || labels.tooltip || '';
            const descAccord = tooltipAccord
                ? escapeHtml(tooltipAccord)
                : `Si votre entreprise applique l'accord ${nom}, cochez l'option en page Résultat pour inclure ses règles dans le calcul.`;
            tooltipContent += `<br><br>🏢 <strong>${escapeHtml(nom)}</strong><br>${descAccord}`;
            if (agreement.url) tooltipContent += `<br><br><a href="${escapeAttr(agreement.url)}" target="_blank" rel="noopener">Voir le texte de l'accord</a>`;
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
