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
    
    // Page 3 : n'afficher l'option "Appliquer l'accord d'entreprise" que si un accord a été chargé depuis l'URL
    const resultAccordBlock = document.getElementById('result-accord-options-block');
    const accordOptions = document.getElementById('accord-options');
    const accordLabel = document.querySelector('#result-accord-options-block .checkbox-highlight span');
    if (resultAccordBlock) {
        if (agreement) {
            resultAccordBlock.classList.remove('hidden');
            // Libellé dynamique selon l'accord
            if (accordLabel) accordLabel.textContent = `Appliquer l'accord d'entreprise ${agreement.nomCourt}`;
            // Tooltip page Résultat : description technique et avantages condensés
            const accordTooltipEl = document.getElementById('accord-actif-tooltip');
            const page3Content = agreement.labels && (agreement.labels.description || agreement.labels.tooltipPage3 || agreement.labels.tooltip);
            if (accordTooltipEl && page3Content) {
                accordTooltipEl.setAttribute('data-tippy-content', page3Content);
                if (accordTooltipEl._tippy) accordTooltipEl._tippy.setContent(page3Content);
            }
            // Options primes : lister les primes de type annuel (montant) et les afficher dynamiquement
            // Règle : pas de condition sur prime.id ou valeurs d'accord, uniquement sur le type (valueType)
            if (accordOptions && Array.isArray(agreement.primes)) {
                const primesAnnuelles = getPrimes(agreement).filter(p => p.valueType === 'montant');
                accordOptions.innerHTML = '';
                primesAnnuelles.forEach(prime => {
                    const valeur = prime.sourceValeur === 'accord' && prime.valeurAccord != null
                        ? prime.valeurAccord
                        : (prime.sourceValeur === 'modalite' ? '' : prime.valeurAccord ?? '');
                    const labelText = `${prime.label} (${valeur} ${prime.unit}/an)`;
                    const inputId = `prime-opt-${prime.id}`;
                    const checked = prime.defaultActif === true;
                    const label = document.createElement('label');
                    label.className = 'checkbox-label';
                    const tooltipAttr = prime.tooltip ? ` data-tippy-content="${String(prime.tooltip).replace(/"/g, '&quot;')}"` : '';
                    const tooltipSpan = prime.tooltip ? ` <span class="tooltip-trigger"${tooltipAttr} aria-label="Aide">?</span>` : '';
                    label.innerHTML = `<input type="checkbox" id="${inputId}" class="book-checkbox" data-state-key-actif="${prime.stateKeyActif}" ${checked ? 'checked' : ''}><span>${labelText}</span>${tooltipSpan}`;
                    if (prime.sourceValeur === 'modalite') {
                        const inputVal = document.createElement('input');
                        inputVal.type = 'number';
                        inputVal.className = 'book-input';
                        inputVal.placeholder = `${prime.unit}`;
                        inputVal.dataset.primeId = prime.id;
                        if (prime.min != null) inputVal.min = prime.min;
                        if (prime.max != null) inputVal.max = prime.max;
                        if (prime.step != null) inputVal.step = prime.step;
                        label.appendChild(inputVal);
                    }
                    accordOptions.appendChild(label);
                });
            }
        } else {
            resultAccordBlock.classList.add('hidden');
        }
    }
    
    // Mettre à jour le header avec l'accord (badge + tooltip info)
    updateHeaderAgreement(agreement);
    
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
