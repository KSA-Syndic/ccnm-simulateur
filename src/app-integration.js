/**
 * ============================================
 * APP INTEGRATION - Intégration des Nouveaux Modules
 * ============================================
 * 
 * Fichier d'intégration pour connecter les nouveaux modules modulaires
 * à l'application existante. Permet une migration progressive.
 */

import { loadAgreementFromURL, getActiveAgreement } from './agreements/AgreementLoader.js';
import { getPrimes, getPrimeById, getPrimeValue, hydrateAccordInputs } from './agreements/AgreementInterface.js';
import { extractURLParams, applyIframeStyles, isIframeMode } from './core/URLParams.js';
import { CONFIG } from './core/config.js';
import { updateHeaderAgreement } from './ui/RemunerationDisplay.js';
import { LABELS } from './ui/Labels.js';

/** Nom court pour affichage badge accord (aligné avec app.js). */
function getAccordNomCourt(agreement) {
    if (!agreement || typeof agreement !== 'object') return '';
    return agreement.nomCourt || agreement.nom || 'Accord';
}

/** Crée un span DOM .accord-badge pour indiquer visuellement l'accord (réutilisable partout). */
function createAccordBadgeElement(agreement) {
    const nom = getAccordNomCourt(agreement);
    if (!nom) return null;
    const span = document.createElement('span');
    span.className = 'accord-badge';
    span.textContent = `\u{1F3E2} ${nom}`;
    span.setAttribute('aria-label', `Accord d'entreprise : ${nom}`);
    return span;
}

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

    // Page 2 : options sans taux dans le texte ; taux dans tooltip à côté du label
    // Sans accord : CCN = checkbox "Travail de nuit" + heures. Avec accord à deux taux : bloc dédié (heures poste nuit + heures poste matin/AM).
    const typeNuitTooltip = document.getElementById('type-nuit-tooltip');
    const travailDimancheTooltip = document.getElementById('travail-dimanche-tooltip');
    const travailHeuresSupTooltip = document.getElementById('travail-heures-sup-tooltip');
    const pctNuitCCN = Math.round((CONFIG.MAJORATIONS_CCN?.nuit ?? 0.15) * 100);
    const pctDimancheCCN = Math.round((CONFIG.MAJORATIONS_CCN?.dimanche ?? 1) * 100);
    const pctHs25CCN = Math.round((CONFIG.MAJORATIONS_CCN?.heuresSup25 ?? 0.25) * 100);
    const pctHs50CCN = Math.round((CONFIG.MAJORATIONS_CCN?.heuresSup50 ?? 0.50) * 100);
    if (typeNuitTooltip) {
        // Ce bloc (select) n'est visible que sans accord ou accord à un seul taux ; un seul taux CCN ou accord
        typeNuitTooltip.setAttribute('data-tippy-content', `+${pctNuitCCN}%.`);
        if (typeNuitTooltip._tippy) typeNuitTooltip._tippy.setContent(typeNuitTooltip.getAttribute('data-tippy-content'));
    }
    if (travailDimancheTooltip) {
        if (agreement && agreement.majorations?.dimanche != null) {
            const pct = Math.round(agreement.majorations.dimanche * 100);
            const nom = getAccordNomCourt(agreement);
            travailDimancheTooltip.setAttribute('data-tippy-content', `Taux CCN : +${pctDimancheCCN}%. Avec accord ${nom} : +${pct}%.`);
        } else {
            travailDimancheTooltip.setAttribute('data-tippy-content', `+${pctDimancheCCN}%.`);
        }
        if (travailDimancheTooltip._tippy) travailDimancheTooltip._tippy.setContent(travailDimancheTooltip.getAttribute('data-tippy-content'));
    }
    if (travailHeuresSupTooltip) {
        const hs = agreement?.majorations?.heuresSupplementaires;
        if (hs) {
            const pct25 = Math.round((hs.majoration25 ?? CONFIG.MAJORATIONS_CCN?.heuresSup25 ?? 0.25) * 100);
            const pct50 = Math.round((hs.majoration50 ?? CONFIG.MAJORATIONS_CCN?.heuresSup50 ?? 0.50) * 100);
            const contingent = hs.contingent != null ? ` Contingent : ${hs.contingent}h/an.` : '';
            const repos = hs.reposCompensateur === true ? ' Repos compensateur possible selon accord.' : '';
            travailHeuresSupTooltip.setAttribute(
                'data-tippy-content',
                `CCN : +${pctHs25CCN}% (36e-43e) puis +${pctHs50CCN}% (>=44e). Accord ${getAccordNomCourt(agreement)} : +${pct25}% puis +${pct50}%.${contingent}${repos} Non applicable en forfait jours.`
            );
        } else {
            travailHeuresSupTooltip.setAttribute(
                'data-tippy-content',
                `CCN : +${pctHs25CCN}% (36e-43e) puis +${pctHs50CCN}% (>=44e). Durée légale : 35h/semaine (151,67h/mois). Non applicable en forfait jours.`
            );
        }
        if (travailHeuresSupTooltip._tippy) travailHeuresSupTooltip._tippy.setContent(travailHeuresSupTooltip.getAttribute('data-tippy-content'));
    }
    const forfaitTooltipEl = document.getElementById('forfait-tooltip');
    if (forfaitTooltipEl && CONFIG.FORFAITS) {
        const pctHeures = Math.round((CONFIG.FORFAITS.heures ?? 0.15) * 100);
        const pctJours = Math.round((CONFIG.FORFAITS.jours ?? 0.30) * 100);
        forfaitTooltipEl.setAttribute('data-tippy-content', `Base 35h : sans majoration. Forfait Heures : +${pctHeures}%. Forfait Jours : +${pctJours}%.`);
        if (forfaitTooltipEl._tippy) forfaitTooltipEl._tippy.setContent(forfaitTooltipEl.getAttribute('data-tippy-content'));
    }

    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el && typeof text === 'string' && text.length) el.textContent = text;
    };

    // Hydrater les libellés depuis LABELS (éviter doublons avec index.html)
    setText('result-page-title', LABELS.resultPageTitle);
    setText('result-page-subtitle', LABELS.resultPageSubtitle);
    setText('result-details-summary', LABELS.detailCalcul);
    setText('evolution-details-summary', LABELS.evolutionInflation);
    setText('result-arretees-prompt-title', LABELS.resultArreteesPromptTitle);
    setText('result-arretees-prompt-body', LABELS.resultArreteesPromptBody);
    setText('btn-check-arretees', LABELS.calculerArretees);
    setText('inflation-source', LABELS.inflationLoading);
    setText('result-accord-toggle-label', LABELS.resultAccordToggle);

    // Page 3 : n'afficher l'option "Appliquer l'accord d'entreprise" que si un accord a été chargé depuis l'URL
    const resultAccordBlock = document.getElementById('result-accord-options-block');
    const accordLabel = document.getElementById('result-accord-toggle-label');
    if (resultAccordBlock) {
        if (agreement) {
            resultAccordBlock.classList.remove('hidden');
            // Libellé dynamique + badge accord (ludique, cohérent avec le reste de l'app)
            if (accordLabel) {
                accordLabel.textContent = (LABELS.resultAccordToggle || "Appliquer l'accord d'entreprise") + ' ';
                const badgeEl = createAccordBadgeElement(agreement);
                if (badgeEl) accordLabel.appendChild(badgeEl);
            }
            // Tooltip page Résultat : description technique et avantages condensés
            const accordTooltipEl = document.getElementById('accord-actif-tooltip');
            const page3Content = agreement.labels && (agreement.labels.description || agreement.labels.tooltipPage3 || agreement.labels.tooltip);
            if (accordTooltipEl && page3Content) {
                accordTooltipEl.setAttribute('data-tippy-content', page3Content);
                if (accordTooltipEl._tippy) accordTooltipEl._tippy.setContent(page3Content);
            }
            // Les options primes (checkboxes toggleables) sont construites dynamiquement
            // par buildAccordOptionsUI() dans app.js — pas de construction ici.
        } else {
            resultAccordBlock.classList.add('hidden');
        }
    }
    
    // Mettre à jour le header avec l'accord (badge + tooltip info)
    updateHeaderAgreement(agreement);

    // Hydrater les libellés dynamiques restants
    const resultLabelAnnuel = document.getElementById('result-label-annuel');
    const resultLabelMensuel = document.getElementById('result-label-mensuel');
    if (resultLabelAnnuel) resultLabelAnnuel.textContent = LABELS.resultatAnnuel;
    if (resultLabelMensuel) resultLabelMensuel.textContent = LABELS.resultatMensuel;

    // Exposer LABELS pour app.js et autres scripts non-module
    window.LABELS = LABELS;

    // Exposer les fonctions pour compatibilité avec app.js existant
    window.AgreementLoader = {
        getActiveAgreement,
        loadAgreementFromURL
    };
    window.AgreementHelpers = {
        getPrimes,
        getPrimeById,
        getPrimeValue,
        hydrateAccordInputs
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
