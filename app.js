/**
 * ============================================
 * APP.JS - Logique Application Simulateur
 * Convention Collective Métallurgie
 * ============================================
 */

    // État global de l'application
const state = {
    // === WIZARD ===
    currentStep: 1,              // Étape actuelle du wizard
    modeClassification: null,    // 'direct' ou 'estimation'
    
    // === ARRIÉRÉS ===
    salairesParMois: {},         // { '2024-01': 24000, '2024-02': 24000, ... }
    dateEmbaucheArretees: null,
    dateChangementClassificationArretees: null,
    ruptureContratArretees: false,
    dateRuptureArretees: null,
    accordEcritArretees: false,
    arretesSurSMHSeul: true,     // true = assiette SMH (base + forfait). Primes avec inclusDansSMH (Art. 140) gérées dans distribution mensuelle.
    
    // === CLASSIFICATION ===
    scores: [1, 1, 1, 1, 1, 1],  // Scores des 6 critères (1-10)
    modeManuel: false,           // Mode automatique par défaut
    groupeManuel: 'A',           // Groupe sélectionné manuellement
    classeManuel: 1,             // Classe sélectionnée manuellement
    
    // === SITUATION ===
    anciennete: 0,               // Ancienneté (Non-Cadres)
    pointTerritorial: 5.90,      // Valeur du Point Territorial - Bas-Rhin (2025)
    travailTempsPartiel: false,  // Temps partiel activé
    tauxActivite: 100,           // Taux d'activité en % (100 = temps plein)
    forfait: '35h',              // Type de forfait (Cadres)
    experiencePro: 0,            // Expérience professionnelle (Barème débutants F11/F12)
    
    // === CONDITIONS DE TRAVAIL (Non-Cadres) ===
    typeNuit: 'aucun',           // 'aucun', 'poste-nuit', 'poste-matin' (CCN)
    heuresNuit: 0,               // Heures de nuit mensuelles (CCN)
    travailDimanche: false,      // Travail le dimanche
    heuresDimanche: 0,           // Heures dimanche mensuelles
    travailHeuresSup: false,     // Heures supplémentaires
    heuresSup: 0,                // Heures supplémentaires mensuelles
    travailJoursSupForfait: false, // Rachat de jours de repos (forfait jours)
    joursSupForfait: 0,          // Nombre de jours rachetés (annuel)
    
    // === ACCORD ENTREPRISE (générique, listable) ===
    accordActif: false,           // Accord d'entreprise activé (générique)
    /** Entrées utilisateur par élément d'accord. Clés fournies par l'accord (stateKeyActif, stateKeyHeures). Initialisé à vide ; hydraté par hydrateAccordInputs(agreement, state) quand un accord est chargé/activé. */
    accordInputs: {},
    /** Overrides utilisateur des valeurs nationales déductibles (par semanticId). */
    nationalPrimeOverrides: {},
    
    // === AFFICHAGE ===
    nbMois: 12                   // Répartition mensuelle (12 ou 13 mois)
};

const CONVENTION_REFERENCE_YEAR = Number(
    CONFIG?.CURRENT_DATA_YEAR ?? CONFIG?.SMH_UPDATE?.referenceYear ?? new Date().getFullYear()
) || new Date().getFullYear();
const CCNM_EFFECTIVE_YEAR = (() => {
    const years = Object.keys(CONFIG?.SMH_BY_YEAR || {}).map(Number).filter(Number.isFinite);
    return years.length ? Math.min(...years) : CONVENTION_REFERENCE_YEAR;
})();
const CCNM_EFFECTIVE_DATE = new Date(CCNM_EFFECTIVE_YEAR, 0, 1);

/** Source de vérité unique pour les données PDF arriérés (étape 4). Remplit uniquement par calculerArreteesFinal / afficherResultatsArreteesFinal, vidé par invalidateArreteesDataFinal. */
let arreteesPdfStore = null;

/** Clé localStorage pour le consentement analytics (Umami). Absent ou '1' = autorisé, '0' = retiré. */
const ANALYTICS_CONSENT_KEY = 'simulator_analytics_consent';
/** Envoi unique de l’événement "Resultat salaire" par chargement de page. */
let umamiResultatSalaireSent = false;
/** Définitions horaires actuellement affichées, indexées par stateKeyActif. */
let currentHourlyPrimeDefsByStateKey = {};
/** Définitions des options accord non-horaires, indexées par stateKeyActif. */
let currentAccordOptionDefsByStateKey = {};

/**
 * Parse robuste des champs numériques (accepte virgule et point).
 * @param {string|number|null|undefined} value
 * @param {number} fallback
 * @returns {number}
 */
function sanitizeDecimalString(value) {
    const raw = String(value ?? '').replace(/\s+/g, '').replace(/,/g, '.');
    if (!raw) return '';
    let out = '';
    let hasDot = false;
    for (const ch of raw) {
        if (ch >= '0' && ch <= '9') {
            out += ch;
            continue;
        }
        if (ch === '.' && !hasDot) {
            hasDot = true;
            out += ch;
        }
    }
    if (out.startsWith('.')) out = `0${out}`;
    return out;
}

function parseDecimalInput(value, fallback = 0) {
    const normalized = sanitizeDecimalString(value);
    if (!normalized || normalized === '.') return fallback;
    const n = Number.parseFloat(normalized);
    return Number.isFinite(n) ? n : fallback;
}

/**
 * Indique si l’app tourne en local (aucun analytics envoyé).
 * @returns {boolean}
 */
function isLocalEnv() {
    const h = typeof window !== 'undefined' && window.location ? window.location.hostname : '';
    return h === 'localhost' || h === '127.0.0.1' || h === '';
}

/**
 * Indique si l’utilisateur a autorisé les analytics (défaut: oui).
 * @returns {boolean}
 */
function getAnalyticsConsent() {
    const v = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return v === null || v === '1';
}

/**
 * Retire le consentement analytics (ne pas envoyer d’événements ensuite).
 */
function setAnalyticsConsentOff() {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, '0');
}

/**
 * Envoie un événement Umami si consentement actif et script chargé (sans saturer les 100k événements).
 * @param {string} name - Nom de l’événement (max 50 car.)
 * @param {Object} [data] - Données additionnelles (pas de données personnelles/salaires)
 */
function umamiTrackIfConsent(name, data) {
    if (isLocalEnv() || !getAnalyticsConsent() || !CONFIG.UMAMI_WEBSITE_ID) return;
    if (typeof window.umami !== 'undefined' && typeof window.umami.track === 'function') {
        try {
            window.umami.track(name, data);
        } catch (e) {
            // ignore
        }
    }
}

/**
 * Charge le script Umami Cloud si config et consentement présents (pas de bannière cookie).
 */
function initUmamiScript() {
    if (isLocalEnv() || !getAnalyticsConsent() || !CONFIG.UMAMI_WEBSITE_ID || !CONFIG.UMAMI_SCRIPT_URL) return;
    if (document.querySelector('script[data-website-id]')) return;
    const script = document.createElement('script');
    script.async = true;
    script.src = CONFIG.UMAMI_SCRIPT_URL;
    script.setAttribute('data-website-id', CONFIG.UMAMI_WEBSITE_ID);
    document.head.appendChild(script);
}

/**
 * Nom court de l'accord pour affichage (badge, tooltips).
 * @param {Object|null} agreement - Accord actif ou null
 * @returns {string}
 */
function getAccordNomCourt(agreement) {
    if (!agreement || typeof agreement !== 'object') return '';
    return agreement.nomCourt || agreement.nom || 'Accord';
}

/**
 * Crée un élément DOM span pour le badge accord (🏢 nom).
 * Utilisé partout pour indiquer visuellement ce qui relève de l'accord d'entreprise.
 * @param {Object|null} agreement - Accord actif ou null
 * @returns {HTMLSpanElement|null} span.accord-badge ou null si pas d'accord
 */
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
 * Retourne le HTML du badge accord pour insertion dans innerHTML.
 * @param {Object|null} agreement - Accord actif ou null
 * @returns {string} '' ou ' <span class="accord-badge">🏢 nom</span>'
 */
function getAccordBadgeHtml(agreement) {
    const nom = getAccordNomCourt(agreement);
    if (!nom) return '';
    return ` <span class="accord-badge" aria-label="Accord d'entreprise : ${nom.replace(/"/g, '&quot;')}">\u{1F3E2} ${escapeHTML(nom)}</span>`;
}

function formatNumberFr(value, digits = 2) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0';
    return n.toFixed(digits).replace('.', ',');
}

function getSmhHourlyBaseRateFromAnnual(smhAnnual, options = {}) {
    if (typeof window.getSmhHourlyBaseRateFromModules === 'function') {
        return window.getSmhHourlyBaseRateFromModules(smhAnnual, options);
    }
    return 0;
}

function getSmhDailyBaseRateFromAnnual(smhAnnual, options = {}) {
    if (typeof window.getSmhDailyBaseRateFromModules === 'function') {
        return window.getSmhDailyBaseRateFromModules(smhAnnual, options);
    }
    return 0;
}

function getPrimeEquipeConventionRatePerPoste() {
    const { classe } = getActiveClassification();
    const smhClasse = Number(CONFIG?.SMH?.[classe]) || 0;
    const tauxHoraireBase = getSmhHourlyBaseRateFromAnnual(smhClasse, { nbMois: 12, tauxActivitePct: 100 });
    return Math.round((tauxHoraireBase * 0.5) * 100) / 100;
}

function buildPrimeEquipeTooltip(agreement, accordPrimeEquipe = null) {
    const tauxCCN = getPrimeEquipeConventionRatePerPoste();
    const conventionLine = `30 min du taux horaire de base par poste.<br>Référence actuelle : ${formatNumberFr(tauxCCN, 2)} €/poste.`;
    const accordValue = accordPrimeEquipe?.valeurAccord;
    if (state.accordActif && agreement && Number.isFinite(Number(accordValue))) {
        const nomAccord = getAccordNomCourt(agreement) || 'Accord';
        const unit = accordPrimeEquipe?.unit || '€/h';
        const accordLine = `${formatNumberFr(Number(accordValue), 2)} ${unit}.`;
        return `<strong>Convention :</strong><br>${conventionLine}<br><br><strong>Accord ${escapeHTML(nomAccord)} :</strong><br>${accordLine}`;
    }
    return `<strong>Convention :</strong><br>${conventionLine}`;
}

/**
 * ============================================
 * INITIALISATION
 * ============================================
 */
document.addEventListener('DOMContentLoaded', () => {
    initWizard();
    initRoulettes();
    initUmamiScript();
    initControls();
    initTooltips();
    initPrivacyModal();
    updateAll();
});

/**
 * ============================================
 * WIZARD - Navigation par étapes
 * ============================================
 */
function initWizard() {
    // Navigation par clic sur les indicateurs de progression
    document.querySelectorAll('.progress-step').forEach(step => {
        step.addEventListener('click', () => {
            const targetStep = parseInt(step.dataset.step);
            const maxStep = state.currentStep;
            
            // Autoriser la navigation vers les étapes déjà complétées ou l'étape actuelle
            if (targetStep <= maxStep) {
                navigateToStep(targetStep);
            }
        });
    });

    // Étape 1A : Choix du mode
    const btnConnaisClasse = document.getElementById('btn-connais-classe');
    const btnEstimerClasse = document.getElementById('btn-estimer-classe');
    
    if (btnConnaisClasse) {
        btnConnaisClasse.addEventListener('click', () => {
            state.modeClassification = 'direct';
            state.modeManuel = true;
            showSubStep('1b');
            updateAll();
        });
    }
    
    if (btnEstimerClasse) {
        btnEstimerClasse.addEventListener('click', () => {
            state.modeClassification = 'estimation';
            state.modeManuel = false;
            showSubStep('1c');
            updateAll();
        });
    }
    
    // Étape 1B : Saisie directe - Retour et Suivant
    const btnBack1b = document.getElementById('btn-back-1b');
    const btnNext1b = document.getElementById('btn-next-1b');
    
    if (btnBack1b) {
        btnBack1b.addEventListener('click', () => showSubStep('1a'));
    }
    
    if (btnNext1b) {
        btnNext1b.addEventListener('click', () => goToStep(2));
    }
    
    // Étape 1C : Estimation - Retour et Valider
    const btnBack1c = document.getElementById('btn-back-1c');
    const btnNext1c = document.getElementById('btn-next-1c');
    
    if (btnBack1c) {
        btnBack1c.addEventListener('click', () => showSubStep('1a'));
    }
    
    if (btnNext1c) {
        btnNext1c.addEventListener('click', () => goToStep(2));
    }
    
    // Étape 2 : Situation - Retour et Suivant
    const btnBack2 = document.getElementById('btn-back-2');
    const btnNext2 = document.getElementById('btn-next-2');
    const btnModifierClasse = document.getElementById('btn-modifier-classe');
    
    if (btnBack2) {
        btnBack2.addEventListener('click', () => goToStep(1));
    }
    
    if (btnNext2) {
        btnNext2.addEventListener('click', () => goToStep(3));
    }
    
    if (btnModifierClasse) {
        btnModifierClasse.addEventListener('click', () => goToStep(1));
    }
    
    // Étape 3 : Résultat - Retour et Nouvelle simulation
    const btnBack3 = document.getElementById('btn-back-3');
    const btnRestart = document.getElementById('btn-restart');
    
    if (btnBack3) {
        btnBack3.addEventListener('click', () => goToStep(2));
    }
    
    if (btnRestart) {
        btnRestart.addEventListener('click', () => {
            // Réinitialiser l'état et naviguer vers l'étape 1
            state.currentStep = 1;
            state.modeClassification = null;
            state.modeManuel = false;
            navigateToStep(1);
        });
    }

    // Bouton vérifier arriérés (Étape 3) : afficher l'étape 4 dans le stepper puis naviguer
    const btnCheckArretees = document.getElementById('btn-check-arretees');
    if (btnCheckArretees) {
        btnCheckArretees.addEventListener('click', () => {
            document.querySelectorAll('.stepper-step-4-optional').forEach(el => el.classList.add('stepper-step-4-visible'));
            goToStep(4);
            // Le guide juridique reste caché jusqu'à ce que les arriérés aient été calculés (voir calculerArreteesFinal)
        });
    }

    // Étape 4 : Arriérés
    const btnBack4 = document.getElementById('btn-back-4');
    const btnCalculerArreteesFinal = document.getElementById('btn-calculer-arretees-final');
    
    if (btnBack4) {
        btnBack4.addEventListener('click', () => navigateToStep(3));
    }

    if (btnCalculerArreteesFinal) {
        btnCalculerArreteesFinal.addEventListener('click', () => {
            calculerArreteesFinal();
        });
    }

    // Bouton générer PDF : délégation pour garantir que le clic est toujours pris en charge
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('#btn-generer-pdf-arretees');
        if (btn) {
            e.preventDefault();
            openPdfInfosModal();
        }
    });

    // Bouton calcul sticky
    const btnCalculerSticky = document.getElementById('btn-calculer-arretees-sticky');
    if (btnCalculerSticky) {
        btnCalculerSticky.addEventListener('click', () => {
            calculerArreteesFinal();
            // Scroll vers les résultats
            setTimeout(() => {
                const resultsDiv = document.getElementById('arretees-results');
                if (resultsDiv && !resultsDiv.classList.contains('hidden')) {
                    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        });
    }

    // Navigation courbe interactive avec bloc flottant
    const floatingInput = document.getElementById('floating-salary-input');
    
    if (floatingInput) {
        floatingInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveCurrentSalaryAndNext();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                dismissFloatingBlockFromGraph();
            }
        });
    }

    // Échap ferme le popup du graphique (n'importe quel focus) tant qu'aucun autre modal n'est ouvert
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const pdfOverlay = document.getElementById('pdf-infos-modal-overlay');
        if (pdfOverlay && pdfOverlay.classList.contains('visible')) return;
        const step4 = document.getElementById('step-4');
        const block = document.getElementById('floating-input-block');
        if (step4 && step4.classList.contains('active') && block && !block.classList.contains('floating-block-hidden')) {
            dismissFloatingBlockFromGraph();
            e.preventDefault();
        }
    });

    // Bouton fermer du bloc flottant (mobile + desktop)
    const floatingBlockClose = document.getElementById('floating-block-close');
    if (floatingBlockClose) {
        floatingBlockClose.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dismissFloatingBlockFromGraph();
        });
    }

    // Clic / touche sur la progression pour rouvrir la saisie quand le bloc est fermé (ex. après Échap sans avoir saisi)
    const curveProgress = document.getElementById('curve-progress');
    if (curveProgress) {
        curveProgress.addEventListener('click', () => {
            if (!curveProgress.classList.contains('curve-progress--reopen')) return;
            reopenFloatingBlockFromProgress();
        });
        curveProgress.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            if (!curveProgress.classList.contains('curve-progress--reopen')) return;
            e.preventDefault();
            reopenFloatingBlockFromProgress();
        });
    }

    // Onglets guide juridique - Initialiser après le chargement du contenu
    function initLegalTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        if (tabBtns.length === 0) {
            // Réessayer après un court délai si les éléments ne sont pas encore chargés
            setTimeout(initLegalTabs, 100);
            return;
        }
        
        tabBtns.forEach(btn => {
            // Retirer les listeners précédents pour éviter les doublons
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = newBtn.dataset.tab;
                if (!tabName) return;
                
                // Désactiver tous les onglets
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                
                // Activer l'onglet sélectionné
                newBtn.classList.add('active');
                const targetPanel = document.getElementById(`tab-${tabName}`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            });
        });
    }
    
    // Initialiser le carrousel juridique
    initLegalCarousel();

    // Initialiser les arriérés
    initArreteesNew();
}

/**
 * Réafficher le bloc flottant pour un mois donné (après animation de fermeture).
 */
function showFloatingBlockForPeriodIndex(index) {
    const floatingBlock = document.getElementById('floating-input-block');
    if (!floatingBlock) return;
    currentPeriodIndex = index;
    floatingBlock.classList.remove('floating-block-hidden');
    floatingBlock.style.visibility = '';
    floatingBlock.style.pointerEvents = '';
    updateCurveControls();
    floatingBlock.style.opacity = '0.88';
    floatingBlock.style.transform = 'translate(-50%, -50%) scale(0.92)';
    floatingBlock.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
    requestAnimationFrame(() => {
        floatingBlock.style.opacity = '1';
        floatingBlock.style.transform = 'translate(-50%, -50%) scale(1)';
    });
}

/**
 * Sauvegarder le salaire actuel et passer au suivant avec animation
 * Le salaire est maintenant stocké en mensuel brut
 */
function saveCurrentSalaryAndNext() {
    if (periodsData.length === 0 || currentPeriodIndex >= periodsData.length) return;

    const floatingInput = document.getElementById('floating-salary-input');
    const floatingBlock = document.getElementById('floating-input-block');
    const amount = parseDecimalInput(floatingInput?.value, 0);

    if (amount > 0) {
        const currentPeriod = periodsData[currentPeriodIndex];
        // Stocker en mensuel brut (pas besoin de diviser par 12)
        state.salairesParMois[currentPeriod.key] = amount;
        currentPeriod.salaireReel = amount;
        
        // Animation : le bloc se rétrécit et se déplace vers le point puis disparaît
        if (floatingBlock && salaryCurveChart) {
            animateBlockToPoint(floatingBlock, currentPeriodIndex, () => {
                const nextIndex = periodsData.findIndex((p, i) => i > currentPeriodIndex && !p.salaireReel);
                const firstMissing = periodsData.findIndex(p => !p.salaireReel);
                const allFilled = firstMissing === -1;

                if (allFilled) {
                    // Dernier salaire : masquer tout de suite pour éviter tout réaffichage (reflow / update du graphique)
                    hideFloatingBlock();
                    updateCurveChart();
                    const progressEl = document.getElementById('curve-progress-text');
                    if (progressEl) progressEl.textContent = `${periodsData.length} / ${periodsData.length} mois saisis`;
                    showToast('✅ Tous les salaires ont été saisis ! Vous pouvez cliquer sur un point pour modifier un mois, puis calculer les arriérés.', 'success', 4000);
                } else {
                    updateCurveChart();
                    currentPeriodIndex = nextIndex !== -1 ? nextIndex : firstMissing;
                    showFloatingBlockForPeriodIndex(currentPeriodIndex);
                }

                const stickyBtn = document.getElementById('arretees-calc-sticky');
                if (stickyBtn) stickyBtn.classList.remove('hidden');
            });
        } else {
            // Pas d'animation, mise à jour directe
            updateCurveChart();
            const nextIndex = periodsData.findIndex((p, i) => i > currentPeriodIndex && !p.salaireReel);
            if (nextIndex !== -1) {
                currentPeriodIndex = nextIndex;
            }
            updateCurveControls();
        }
    } else {
        showToast('⚠️ Veuillez saisir un montant valide.', 'warning', 3000);
    }
}

/**
 * Naviguer vers une étape du wizard (avance l'étape max)
 */
function goToStep(stepNumber) {
    // Enregistrer l'étape maximale atteinte pour la navigation
    state.currentStep = Math.max(state.currentStep, stepNumber);
    navigateToStep(stepNumber);
}

/**
 * Naviguer vers une étape spécifique (sans changer l'étape max)
 */
function navigateToStep(stepNumber) {
    // Masquer toutes les étapes
    document.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Afficher l'étape cible
    const targetStep = document.getElementById(`step-${stepNumber}`);
    if (targetStep) {
        targetStep.classList.remove('hidden'); // Important: retirer hidden
        targetStep.classList.add('active');
    }
    
    // Mettre à jour l'indicateur de progression (basé sur l'étape max atteinte)
    updateProgressIndicator(state.currentStep, stepNumber);
    
    // Actions spécifiques par étape
    if (stepNumber === 1) {
        // Restaurer la bonne sous-étape
        if (state.modeClassification === 'direct') {
            showSubStep('1b');
        } else if (state.modeClassification === 'estimation') {
            showSubStep('1c');
        } else {
            showSubStep('1a');
        }
    } else if (stepNumber === 2) {
        updateRecapClassification();
        updateAll();
    } else if (stepNumber === 3) {
        updateAll();
        if (!umamiResultatSalaireSent) {
            umamiResultatSalaireSent = true;
            umamiTrackIfConsent('Resultat salaire');
        }
    } else if (stepNumber === 4) {
        const legalSec = document.getElementById('legal-instructions');
        if (legalSec) {
            if (arreteesPdfStore ?? window.arreteesDataFinal) {
                legalSec.classList.remove('hidden');
                afficherInstructionsJuridiques();
            } else {
                legalSec.classList.add('hidden');
            }
        }
        // Toujours rafraîchir la courbe à l'entrée sur l'étape 4 pour qu'elle reflète le salaire annuel (étape 3)
        initTimeline();
    }
    
    // Scroll en haut
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Afficher une sous-étape (1a, 1b, 1c)
 */
function showSubStep(subStep) {
    // Masquer toutes les sous-étapes de l'étape 1
    ['1a', '1b', '1c'].forEach(sub => {
        const el = document.getElementById(`step-${sub}`);
        if (el) el.classList.add('hidden');
    });
    
    // Afficher la sous-étape cible
    const target = document.getElementById(`step-${subStep}`);
    if (target) {
        target.classList.remove('hidden');
    }
    
    // Si on affiche l'étape 1c (estimation), recalculer les positions des roulettes
    // après que le DOM soit mis à jour
    if (subStep === '1c') {
        requestAnimationFrame(() => {
            // Double RAF pour s'assurer que le layout est calculé
            requestAnimationFrame(() => {
                refreshAllRoulettes();
            });
        });
    }
}

/**
 * Rafraîchir l'affichage de toutes les roulettes
 */
function refreshAllRoulettes() {
    for (let i = 0; i < state.scores.length; i++) {
        updateRouletteDisplay(i);
    }
}

/**
 * Mettre à jour l'indicateur de progression
 */
function updateProgressIndicator(maxStep, activeStep = maxStep) {
    const steps = document.querySelectorAll('.progress-step');
    const lines = document.querySelectorAll('.progress-line');
    
    // Gérer jusqu'à 4 étapes maintenant
    steps.forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.remove('active', 'completed', 'clickable');
        
        if (stepNum < maxStep) {
            step.classList.add('completed', 'clickable');
        } else if (stepNum === maxStep) {
            step.classList.add('clickable');
        }
        
        if (stepNum === activeStep) {
            step.classList.add('active');
        }
    });
    
    // Mettre à jour les lignes de progression
    lines.forEach((line, index) => {
        if (index < maxStep - 1) {
            line.classList.add('completed');
        } else {
            line.classList.remove('completed');
        }
    });
}

/**
 * Mettre à jour le récapitulatif de la classification
 */
function updateRecapClassification() {
    const { groupe, classe } = getActiveClassification();
    const isCadre = classe >= CONFIG.SEUIL_CADRE;
    
    const recapGroupe = document.getElementById('recap-groupe');
    const recapClasse = document.getElementById('recap-classe');
    const recapStatut = document.getElementById('recap-statut');
    
    if (recapGroupe) recapGroupe.textContent = groupe;
    if (recapClasse) recapClasse.textContent = classe;
    if (recapStatut) {
        recapStatut.textContent = isCadre ? 'Cadre' : 'Non-Cadre';
        recapStatut.classList.toggle('cadre', isCadre);
        recapStatut.classList.toggle('non-cadre', !isCadre);
    }
}

/**
 * Initialisation des roulettes
 */
function initRoulettes() {
    const container = document.getElementById('roulettes-container');
    container.innerHTML = '';

    CONFIG.CRITERES.forEach((critere, index) => {
        const rouletteHTML = createRouletteHTML(critere, index);
        container.insertAdjacentHTML('beforeend', rouletteHTML);
        
        // Initialiser les événements de la roulette
        initRouletteEvents(index);
        
        // Initialiser l'affichage de la roulette (position initiale)
        updateRouletteDisplay(index);
    });
}

/**
 * Création du HTML d'une roulette avec labels courts
 */
function createRouletteHTML(critere, index) {
    // Générer les valeurs 1-10 avec labels synthétiques
    let valuesHTML = '';
    for (let i = 1; i <= 10; i++) {
        const selected = i === 1 ? 'selected' : '';
        const label = critere.labels[i];
        valuesHTML += `
            <div class="roulette-value ${selected}" data-value="${i}">
                <span class="degree-number">${i}</span>
                <span class="degree-text">${label}</span>
            </div>`;
    }

    return `
        <div class="roulette-item" data-critere="${index}">
            <div class="roulette-header">
                <div class="roulette-label">
                    ${critere.nom}
                    <span class="tooltip-trigger" 
                          data-tippy-content="${critere.description}"
                          data-tippy-placement="auto">?</span>
                </div>
                <div class="degree-badge">
                    Degré <span id="degree-label-${index}">1</span>/10
                </div>
            </div>
            <div class="roulette-wrapper" id="roulette-${index}">
                <div class="roulette-chevron chevron-up" data-action="prev"></div>
                <div class="roulette-indicator"></div>
                <div class="roulette-scroll" id="scroll-${index}">
                    ${valuesHTML}
                </div>
                <div class="roulette-chevron chevron-down" data-action="next"></div>
            </div>
            <div class="roulette-full-description" id="full-desc-${index}">
                <p>${critere.degres[1]}</p>
            </div>
        </div>
    `;
}

/**
 * Initialisation des événements d'une roulette (défilement horizontal)
 */
function initRouletteEvents(index) {
    const wrapper = document.getElementById(`roulette-${index}`);
    const chevronPrev = wrapper.querySelector('.chevron-up'); // Gauche = précédent
    const chevronNext = wrapper.querySelector('.chevron-down'); // Droite = suivant

    // Clic sur chevron gauche (précédent)
    chevronPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        changeRouletteValue(index, -1);
    });

    // Clic sur chevron droite (suivant)
    chevronNext.addEventListener('click', (e) => {
        e.stopPropagation();
        changeRouletteValue(index, 1);
    });

    // Scroll sur la roulette (horizontal ou vertical)
    wrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        // deltaX pour scroll horizontal, deltaY pour scroll vertical
        const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
        const direction = delta > 0 ? 1 : -1;
        changeRouletteValue(index, direction);
    }, { passive: false });

    // Clic sur les valeurs
    const values = wrapper.querySelectorAll('.roulette-value');
    values.forEach(val => {
        val.addEventListener('click', () => {
            const newValue = parseInt(val.dataset.value);
            setRouletteValue(index, newValue);
        });
    });

    // Support tactile (swipe horizontal)
    let touchStartX = 0;
    wrapper.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });

    wrapper.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });

    wrapper.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 30) {
            // Swipe vers la gauche = valeur suivante, vers la droite = valeur précédente
            const direction = diff > 0 ? 1 : -1;
            changeRouletteValue(index, direction);
        }
    }, { passive: true });
}

/**
 * Changer la valeur d'une roulette (incrémental)
 */
function changeRouletteValue(index, direction) {
    const currentValue = state.scores[index];
    const newValue = Math.min(10, Math.max(1, currentValue + direction));
    setRouletteValue(index, newValue);
}

/**
 * Définir la valeur d'une roulette
 */
function setRouletteValue(index, value) {
    state.scores[index] = value;
    updateRouletteDisplay(index);
    updateAll();
}

/**
 * Mettre à jour l'affichage d'une roulette (défilement horizontal)
 */
function updateRouletteDisplay(index) {
    const scroll = document.getElementById(`scroll-${index}`);
    const wrapper = document.getElementById(`roulette-${index}`);
    const value = state.scores[index];
    
    // Calculer la position horizontale dynamiquement
    // Récupère la largeur réelle d'un élément ou calcule 12em en pixels
    const firstValue = scroll.querySelector('.roulette-value');
    const itemWidth = firstValue ? firstValue.offsetWidth : (parseFloat(getComputedStyle(document.documentElement).fontSize) * 12);
    const wrapperWidth = wrapper.offsetWidth || 400;
    const centerOffset = (wrapperWidth / 2) - (itemWidth / 2);
    const offset = -((value - 1) * itemWidth) + centerOffset;
    
    scroll.style.transform = `translateX(${offset}px)`;

    // Mettre à jour les classes selected
    const values = scroll.querySelectorAll('.roulette-value');
    values.forEach(v => {
        v.classList.toggle('selected', parseInt(v.dataset.value) === value);
    });

    // Mettre à jour le label du degré (badge)
    const degreeLabel = document.getElementById(`degree-label-${index}`);
    if (degreeLabel) {
        degreeLabel.textContent = value;
    }

    // Mettre à jour la description complète sous la roulette
    updateFullDescription(index, value);
}

/**
 * Mettre à jour la description complète du degré
 */
function updateFullDescription(index, value) {
    const descContainer = document.getElementById(`full-desc-${index}`);
    if (descContainer) {
        const critere = CONFIG.CRITERES[index];
        descContainer.querySelector('p').textContent = critere.degres[value];
    }
}

/**
 * Modal « Politique de confidentialité » + retrait du consentement analytics (sans quitter la page).
 */
function initPrivacyModal() {
    const link = document.getElementById('footer-privacy-link');
    if (!link) return;
    link.addEventListener('click', (e) => {
        e.preventDefault();
        let overlay = document.getElementById('privacy-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'privacy-modal-overlay';
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal pdf-infos-modal" onclick="event.stopPropagation()">
                    <h3 class="modal-title">Politique de confidentialité</h3>
                    <p class="modal-subtitle">Ce simulateur utilise Umami Cloud pour des statistiques d’usage anonymes (pages vues, événements comme « résultat salaire » ou « PDF généré »). Aucun salaire ni donnée personnelle n’est envoyé.</p>
                    <p>Vous pouvez retirer votre autorisation à tout moment ; les statistiques ne seront plus envoyées à partir de cette visite.</p>
                    <div class="modal-actions">
                        <button type="button" class="book-btn btn-secondary" id="privacy-modal-close">Fermer</button>
                        <button type="button" class="book-btn btn-primary" id="privacy-modal-revoke">Retirer mon autorisation</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.classList.remove('visible'); });
            document.getElementById('privacy-modal-close').addEventListener('click', () => overlay.classList.remove('visible'));
            document.getElementById('privacy-modal-revoke').addEventListener('click', () => {
                setAnalyticsConsentOff();
                overlay.classList.remove('visible');
                showToast('Autorisation retirée. Les statistiques ne seront plus envoyées.', 'success', 4000);
            });
        }
        overlay.classList.add('visible');
    });
}

/**
 * ============================================
 * CONTRÔLES ET MODES
 * ============================================
 */
function initControls() {
    // Sélecteurs manuels (wizard)
    const selectGroupe = document.getElementById('select-groupe');
    const selectClasse = document.getElementById('select-classe');

    if (selectGroupe) {
        selectGroupe.addEventListener('change', (e) => {
            state.groupeManuel = e.target.value;
            state.modeManuel = true;
            updateClasseOptions();
            updateAll();
        });
    }

    if (selectClasse) {
        selectClasse.addEventListener('change', (e) => {
            state.classeManuel = parseInt(e.target.value);
            state.modeManuel = true;
            updateAll();
        });
    }

    // Initialiser les options de classe
    updateClasseOptions();

    // Contrôles modalités
    const ancienneteInput = document.getElementById('anciennete');
    const pointTerritorialInput = document.getElementById('point-territorial');
    const travailTempsPartielCheckbox = document.getElementById('travail-temps-partiel');
    const tauxActiviteField = document.getElementById('taux-activite-field');
    const tauxActiviteInput = document.getElementById('taux-activite');
    const forfaitSelect = document.getElementById('forfait');
    const experienceProInput = document.getElementById('experience-pro');

    function initNumberInputBehaviors(root = document) {
        if (!root) return;
        const inputs = root.querySelectorAll('input[data-number-behavior], input[data-decimal-input="true"], input[type="number"]');
        inputs.forEach((input) => {
            const behavior = String(input.getAttribute('data-number-behavior') || '').toLowerCase();
            const wantsDecimal = behavior.includes('decimal') || input.getAttribute('data-decimal-input') === 'true';
            if (wantsDecimal) {
                input.setAttribute('inputmode', 'decimal');
                input.setAttribute('data-decimal-input', 'true');
                if (input.type === 'number' && (!input.getAttribute('step') || input.getAttribute('step') === '1')) {
                    input.setAttribute('step', 'any');
                }
            }
            if (!input.hasAttribute('data-number-select-on-focus')) {
                input.setAttribute('data-number-select-on-focus', 'true');
            }
        });
    }

    function insertDotDecimal(input) {
        if (!input) return;
        const v = input.value || '';
        const start = input.selectionStart ?? v.length;
        const end = input.selectionEnd ?? start;
        let next = v.slice(0, start) + '.' + v.slice(end);
        if (next === '.') next = '0.';
        // Empêcher plusieurs séparateurs décimaux hors sélection
        if ((next.match(/\./g) || []).length > 1) return;
        input.value = next;
        const nextPos = start + 1;
        try {
            input.setSelectionRange(nextPos, nextPos);
        } catch (_) {
            // Certains navigateurs ne permettent pas setSelectionRange sur type=number.
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function getStepFromInput(input) {
        const explicitStep = Number.parseFloat(String(input?.getAttribute('step') || ''));
        if (Number.isFinite(explicitStep) && explicitStep > 0) return explicitStep;
        const raw = String(input?.value ?? '').replace(',', '.');
        const dec = raw.includes('.') ? (raw.split('.')[1] || '').length : 0;
        if (dec > 0) {
            return 10 ** (-Math.min(dec, 4));
        }
        return 1;
    }

    function roundToStep(value, step) {
        const precision = Math.min(6, Math.max(0, Math.ceil(-Math.log10(step || 1))));
        return Number(value.toFixed(precision));
    }

    function nudgeInputValue(input, direction) {
        const step = getStepFromInput(input);
        const current = parseDecimalInput(input.value, 0);
        const minAttr = Number.parseFloat(String(input.getAttribute('min') || ''));
        const maxAttr = Number.parseFloat(String(input.getAttribute('max') || ''));
        let next = current + (direction * step);
        next = roundToStep(next, step);
        if (Number.isFinite(minAttr)) next = Math.max(minAttr, next);
        if (Number.isFinite(maxAttr)) next = Math.min(maxAttr, next);
        input.value = String(next).replace('.', ',');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        try { input.select(); } catch (_) { /* no-op */ }
    }

    // Mobile/IME: intercepter avant insertion de "," ou "." dans les inputs number.
    document.addEventListener('beforeinput', (e) => {
        const input = e.target && e.target.closest
            ? e.target.closest('input[data-decimal-input="true"], input[data-number-behavior*="decimal"], input[type="number"]')
            : null;
        if (!input) return;
        if (e.inputType !== 'insertText') return;
        if (e.data !== ',' && e.data !== '.') return;
        e.preventDefault();
        insertDotDecimal(input);
    }, true);

    // Sécurise toute saisie/paste : autoriser uniquement chiffres + un séparateur décimal.
    document.addEventListener('input', (e) => {
        const input = e.target && e.target.closest
            ? e.target.closest('input[data-decimal-input="true"]')
            : null;
        if (!input) return;
        const current = input.value ?? '';
        const sanitized = sanitizeDecimalString(current);
        if (current === sanitized) return;
        const caret = input.selectionStart ?? sanitized.length;
        input.value = sanitized;
        const nextCaret = Math.min(caret, sanitized.length);
        try {
            input.setSelectionRange(nextCaret, nextCaret);
        } catch (_) {
            // no-op
        }
    }, true);

    // Délégation globale pour les champs number créés dynamiquement (ex: modale saisie salaire)
    document.addEventListener('keydown', (e) => {
        const input = e.target && e.target.closest
            ? e.target.closest('input[data-decimal-input="true"], input[data-number-behavior*="decimal"], input[type="number"]')
            : null;
        if (!input) return;
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            e.preventDefault();
            nudgeInputValue(input, e.key === 'ArrowUp' ? 1 : -1);
            return;
        }
        const isDecimalKey = e.key === ',' || e.key === '.' || e.key === 'Decimal' || e.code === 'NumpadDecimal';
        if (!isDecimalKey) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        e.preventDefault();
        insertDotDecimal(input);
    }, true);

    document.addEventListener('focusin', (e) => {
        const input = e.target && e.target.closest
            ? e.target.closest('input[data-number-select-on-focus="true"]')
            : null;
        if (!input) return;
        try { input.select(); } catch (_) { /* no-op */ }
    }, true);

    // Appliquer globalement selon les attributs HTML
    initNumberInputBehaviors(document);

    ancienneteInput.addEventListener('input', (e) => {
        state.anciennete = Math.max(0, parseDecimalInput(e.target.value, 0));
        // L'expérience pro ne peut pas être inférieure à l'ancienneté
        if (state.experiencePro < state.anciennete) {
            state.experiencePro = state.anciennete;
            experienceProInput.value = state.anciennete;
        }
        updateExperienceProValidation();
        updateDateEmbaucheFromAnciennete();
        updateAll();
    });

    pointTerritorialInput.addEventListener('input', (e) => {
        state.pointTerritorial = parseDecimalInput(e.target.value, CONFIG.POINT_TERRITORIAL_DEFAUT);
        updateAll();
    });

    if (travailTempsPartielCheckbox && tauxActiviteField && tauxActiviteInput) {
        travailTempsPartielCheckbox.addEventListener('change', (e) => {
            state.travailTempsPartiel = e.target.checked;
            if (!state.travailTempsPartiel) {
                state.tauxActivite = CONFIG.TAUX_ACTIVITE_DEFAUT ?? 100;
                tauxActiviteInput.value = String(state.tauxActivite);
            }
            tauxActiviteField.classList.toggle('hidden', !state.travailTempsPartiel);
            updateAll();
        });
        tauxActiviteInput.addEventListener('input', (e) => {
            const raw = parseDecimalInput(e.target.value, CONFIG.TAUX_ACTIVITE_DEFAUT ?? 100);
            const min = CONFIG.TAUX_ACTIVITE_MIN ?? 1;
            const max = CONFIG.TAUX_ACTIVITE_MAX ?? 100;
            state.tauxActivite = Math.min(max, Math.max(min, raw));
            updateAll();
        });
    }

    forfaitSelect.addEventListener('change', (e) => {
        state.forfait = e.target.value;
        updateConditionsTravailDisplay();
        updateAll();
    });

    // Saisie libre pendant la frappe (ex. taper "14" sans que le "1" soit bloqué sur mobile)
    experienceProInput.addEventListener('input', (e) => {
        const value = parseDecimalInput(e.target.value, 0);
        state.experiencePro = Math.max(0, value);
        updateExperienceProValidation();
        updateAll();
    });

    // Contrainte (exp. pro >= ancienneté) appliquée uniquement au blur
    experienceProInput.addEventListener('blur', () => {
        const raw = parseDecimalInput(experienceProInput.value, 0);
        const minVal = state.anciennete;
        if (minVal > 0 && raw < minVal) {
            const attempted = raw;
            state.experiencePro = minVal;
            experienceProInput.value = minVal;
            updateExperienceProValidation(attempted);
        } else {
            state.experiencePro = raw;
            updateExperienceProValidation();
        }
        updateAll();
    });

    // Validation initiale
    updateExperienceProValidation();

    // ═══════════════════════════════════════════════════════════════
    // CONTRÔLES CONDITIONS DE TRAVAIL (Non-Cadres)
    // ═══════════════════════════════════════════════════════════════

    // Travail de nuit (checkbox comme travail dimanche)
    const travailNuitCheckbox = document.getElementById('travail-nuit');
    const heuresNuitField = document.getElementById('heures-nuit-field');
    const heuresNuitInput = document.getElementById('heures-nuit');
    
    travailNuitCheckbox.addEventListener('change', (e) => {
        state.typeNuit = e.target.checked ? 'poste-nuit' : 'aucun';
        heuresNuitField.classList.toggle('hidden', !e.target.checked);
        updateTauxInfo();
        updateAll();
    });
    
    heuresNuitInput.addEventListener('input', (e) => {
        state.heuresNuit = parseDecimalInput(e.target.value, 0);
        updateAll();
    });

    // Travail dimanche
    const travailDimancheCheckbox = document.getElementById('travail-dimanche');
    const heuresDimancheField = document.getElementById('heures-dimanche-field');
    const heuresDimancheInput = document.getElementById('heures-dimanche');
    
    travailDimancheCheckbox.addEventListener('change', (e) => {
        state.travailDimanche = e.target.checked;
        heuresDimancheField.classList.toggle('hidden', !e.target.checked);
        updateTauxInfo();
        updateAll();
    });
    
    heuresDimancheInput.addEventListener('input', (e) => {
        state.heuresDimanche = parseDecimalInput(e.target.value, 0);
        updateAll();
    });

    // Heures supplémentaires
    const travailHeuresSupCheckbox = document.getElementById('travail-heures-sup');
    const heuresSupField = document.getElementById('heures-sup-field');
    const heuresSupInput = document.getElementById('heures-sup');
    if (travailHeuresSupCheckbox && heuresSupField && heuresSupInput) {
        travailHeuresSupCheckbox.addEventListener('change', (e) => {
            state.travailHeuresSup = e.target.checked;
            heuresSupField.classList.toggle('hidden', !e.target.checked);
            updateTauxInfo();
            updateAll();
        });
        heuresSupInput.addEventListener('input', (e) => {
            state.heuresSup = parseDecimalInput(e.target.value, 0);
            updateAll();
        });
    }

    // Jours supplémentaires - cadres au forfait jours (rachat de jours de repos)
    const travailJoursSupForfaitCheckbox = document.getElementById('travail-jours-sup-forfait');
    const joursSupForfaitField = document.getElementById('jours-sup-forfait-field');
    const joursSupForfaitInput = document.getElementById('jours-sup-forfait');
    if (travailJoursSupForfaitCheckbox && joursSupForfaitField && joursSupForfaitInput) {
        travailJoursSupForfaitCheckbox.addEventListener('change', (e) => {
            state.travailJoursSupForfait = e.target.checked;
            joursSupForfaitField.classList.toggle('hidden', !e.target.checked);
            updateAll();
        });
        joursSupForfaitInput.addEventListener('input', (e) => {
            state.joursSupForfait = parseDecimalInput(e.target.value, 0);
            updateAll();
        });
    }

    // Modalités horaires dynamiques (CCNM/accord + section "Autres")
    const attachHourlyPrimeContainerListeners = (container) => {
        if (!container) return;
        container.addEventListener('change', (e) => {
            const keyActif = e.target.dataset?.stateKeyActif;
            if (e.target.type === 'checkbox' && keyActif) {
                const isChecked = e.target.checked;
                const primeSource = e.target.dataset?.primeSource || 'accord';
                if (isChecked && !state.accordActif && primeSource === 'accord') {
                    state.accordActif = true;
                    const accordCheckbox = document.getElementById('accord-actif');
                    if (accordCheckbox) accordCheckbox.checked = true;
                    buildAccordOptionsUI(); // Gère la visibilité du container accord-options
                    const accordNom = typeof window.AgreementLoader?.getActiveAgreement === 'function' ? (window.AgreementLoader.getActiveAgreement()?.nomCourt || 'd\'entreprise') : 'd\'entreprise';
                    showToast(`✅ L'accord ${accordNom} a été activé automatiquement pour permettre cette option.`, 'success', 4000);
                    updateConditionsTravailDisplay();
                    updateTauxInfo();
                }
                state.accordInputs[keyActif] = isChecked;
                applyPrimeCompatibilityRules(keyActif, isChecked, currentHourlyPrimeDefsByStateKey);
                const formGroup = e.target.closest('.form-group');
                const subField = formGroup?.querySelector('[data-heures-field-for]');
                if (subField) subField.classList.toggle('hidden', !isChecked);
                updateAll();
            }
        });
        container.addEventListener('input', (e) => {
            const keyHeures = e.target.dataset?.stateKeyHeures;
            if (keyHeures) {
                state.accordInputs[keyHeures] = parseDecimalInput(e.target.value, 0);
                updateAll();
                return;
            }
            const overrideSemantic = e.target.dataset?.nationalOverrideSemantic;
            if (overrideSemantic) {
                const parsed = parseDecimalInput(e.target.value, NaN);
                if (Number.isFinite(parsed) && parsed >= 0) {
                    state.nationalPrimeOverrides[overrideSemantic] = parsed;
                } else {
                    delete state.nationalPrimeOverrides[overrideSemantic];
                }
                updateConditionsTravailDisplay();
                updateAll();
            }
        });
    };
    attachHourlyPrimeContainerListeners(document.getElementById('accord-primes-horaires-container'));
    attachHourlyPrimeContainerListeners(document.getElementById('autres-primes-nationales-container'));

    // ═══════════════════════════════════════════════════════════════
    // CONTRÔLES ACCORD ENTREPRISE (générique)
    // ═══════════════════════════════════════════════════════════════
    
    const accordCheckbox = document.getElementById('accord-actif');
    
    if (accordCheckbox) {
        accordCheckbox.addEventListener('change', (e) => {
            const wasActive = state.accordActif;
            const isActive = e.target.checked;
            state.accordActif = isActive;
            
            if (!wasActive && isActive) {
                const agreement = window.AgreementLoader?.getActiveAgreement?.();
                if (agreement && window.AgreementHelpers?.hydrateAccordInputs) {
                    window.AgreementHelpers.hydrateAccordInputs(agreement, state);
                }
                // Appliquer 12 ou 13 mois selon l'accord (répartition imposée)
                if (typeof updateMonthsToggleFromAccord === 'function') updateMonthsToggleFromAccord();
            }

            // Désactivation accord : conserver l'état des options (primes, heures, etc.) pour les restituer à la réactivation
            if (wasActive && !isActive) {
                updateConditionsTravailDisplay();
            }
            // buildAccordOptionsUI gère la visibilité du container #accord-options
            // et reconstruit les checkboxes avec l'état depuis state.accordInputs
            buildAccordOptionsUI();
            
            updateConditionsTravailDisplay();
            updateTauxInfo();
            updateAll();
            if (typeof window.updateHeaderAgreement === 'function') {
                window.updateHeaderAgreement(window.AgreementLoader?.getActiveAgreement?.() ?? null);
            }
        });
    }

    // Hydrater accordInputs à partir de l'accord (si chargé depuis URL) — pas de clés hardcodées
    const agreementLoaded = window.AgreementLoader?.getActiveAgreement?.();
    if (window.AgreementHelpers?.hydrateAccordInputs && agreementLoaded) {
        window.AgreementHelpers.hydrateAccordInputs(agreementLoaded, state);
    }
    // Sélectionner l'accord par défaut quand un accord est chargé (ex. depuis l'URL)
    if (agreementLoaded) {
        state.accordActif = true;
        if (accordCheckbox) accordCheckbox.checked = true;
        buildAccordOptionsUI(); // Gère la visibilité et le contenu du container
        if (typeof updateMonthsToggleFromAccord === 'function') updateMonthsToggleFromAccord();
        updateConditionsTravailDisplay();
        updateTauxInfo();
        updateAll();
        if (typeof window.updateHeaderAgreement === 'function') {
            window.updateHeaderAgreement(agreementLoaded);
        }
    }

    // Options accord : délégation sur #accord-options (pas d'id de prime spécifique)
    const accordOptionsEl = document.getElementById('accord-options');
    if (accordOptionsEl) {
        accordOptionsEl.addEventListener('change', (e) => {
            const input = e.target.closest('input[data-state-key-actif]');
            if (input) {
                const key = input.getAttribute('data-state-key-actif');
                if (key) {
                    state.accordInputs[key] = input.checked;
                    applyPrimeCompatibilityRules(key, input.checked, currentAccordOptionDefsByStateKey);
                    updateAll();
                }
            }
        });
    }
    
    // Toggle nombre de mois (12 ou 13) — verrouillé quand un accord impose 12 ou 13 mois
    const monthBtns = document.querySelectorAll('.month-btn');
    const monthsToggle = document.querySelector('.months-toggle');
    monthBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const agreement = typeof window.AgreementLoader?.getActiveAgreement === 'function' ? window.AgreementLoader.getActiveAgreement() : null;
            if (agreement && state.accordActif && agreement.repartition13Mois?.actif != null) {
                const nom = getAccordNomCourt(agreement) || 'd\'entreprise';
                const nb = agreement.repartition13Mois.actif ? 13 : 12;
                showToast(`La répartition sur ${nb} mois est imposée par l'accord ${nom}. Vous ne pouvez pas la modifier.`, 'info', 4000);
                return;
            }
            monthBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.nbMois = parseInt(btn.dataset.months, 10);
            updateRemunerationDisplay(calculateRemuneration());
        });
    });
}

/**
 * Applique la répartition 12/13 mois de l'accord au switch et le verrouille visuellement si accord sélectionné.
 * Les boutons restent cliquables pour afficher un toast explicatif au clic.
 */
function updateMonthsToggleFromAccord() {
    const monthBtns = document.querySelectorAll('.month-btn');
    const monthsToggle = document.querySelector('.months-toggle');
    if (!monthBtns.length) return;
    const agreement = typeof window.AgreementLoader?.getActiveAgreement === 'function' ? window.AgreementLoader.getActiveAgreement() : null;
    const accordImposeMois = agreement && state.accordActif && agreement.repartition13Mois && typeof agreement.repartition13Mois.actif === 'boolean';
    if (monthsToggle) {
        monthsToggle.classList.toggle('months-toggle-locked', !!accordImposeMois);
        monthsToggle.setAttribute('aria-label', accordImposeMois ? 'Répartition imposée par l\'accord d\'entreprise (cliquez pour plus d\'infos)' : 'Choisir 12 ou 13 mois');
    }
    if (accordImposeMois) {
        state.nbMois = agreement.repartition13Mois.actif ? 13 : 12;
        monthBtns.forEach(btn => {
            btn.disabled = false;
            btn.removeAttribute('aria-disabled');
            if (parseInt(btn.dataset.months, 10) === state.nbMois) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    } else {
        monthBtns.forEach(btn => {
            btn.disabled = false;
            btn.removeAttribute('aria-disabled');
            if (parseInt(btn.dataset.months, 10) === state.nbMois) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
}

/**
 * Mettre à jour la validation du champ expérience professionnelle.
 * Pendant la saisie (input), on n'affiche pas d'erreur pour ne pas bloquer la frappe (ex. taper "14").
 * Au blur, si la valeur a été corrigée, on affiche le message de correction.
 * @param {number} [attemptedValue] - Valeur saisie avant correction (passée au blur uniquement)
 */
function updateExperienceProValidation(attemptedValue = null) {
    const experienceProInput = document.getElementById('experience-pro');
    const experienceProGroup = experienceProInput?.closest('.form-group');
    if (!experienceProGroup) return;

    const existingError = experienceProGroup.querySelector('.field-error');
    if (existingError) existingError.remove();

    const experienceValue = parseInt(experienceProInput.value, 10) || 0;
    const minAnciennete = state.anciennete;

    // Message uniquement après correction au blur (pas pendant la frappe, pour ne pas gêner la saisie ex. "14")
    if (typeof attemptedValue === 'number' && attemptedValue < minAnciennete && minAnciennete > 0) {
        const errorMsg = document.createElement('div');
        errorMsg.className = 'field-error';
        errorMsg.textContent = `⚠️ La valeur saisie (${attemptedValue} ans) a été corrigée. L'expérience professionnelle ne peut pas être inférieure à l'ancienneté dans l'entreprise (${minAnciennete} ans minimum).`;
        experienceProGroup.appendChild(errorMsg);
        experienceProInput.classList.add('input-error');
    } else {
        experienceProInput.classList.remove('input-error');
    }
}

/**
 * Liste des modalités accord qui ne sont plus prises en compte dans le calcul quand l'accord est désactivé.
 * Exclut les primes à versement unique (page 3) car visibles sur la même page.
 * @param {Object|null} agreement - Accord chargé
 * @returns {string[]}
 */
function getModalitesHorsPrimesPage3(agreement) {
    if (!agreement || typeof agreement !== 'object') return [];
    const items = [];
    if (agreement.anciennete && typeof agreement.anciennete.seuil === 'number') {
        items.push('Prime d\'ancienneté (seuil/barème accord)');
    }
    if (agreement.majorations?.nuit && agreement.majorations.nuit.posteNuit != null) {
        const pct = Math.round(agreement.majorations.nuit.posteNuit * 100);
        items.push('Majoration nuit (+' + pct + '%)');
    }
    if (agreement.majorations?.dimanche != null) {
        const pct = Math.round(agreement.majorations.dimanche * 100);
        items.push('Majoration dimanche (+' + pct + '%)');
    }
    if (agreement.primes && Array.isArray(agreement.primes)) {
        const primesHoraires = agreement.primes.filter(p =>
            ((p.valueType === 'horaire' && (p.stateKeyHeures || p.autoHeures === true))
                || (p.valueType === 'majorationHoraire' && p.stateKeyHeures)));
        primesHoraires.forEach(p => {
            const taux = p.valeurAccord != null ? String(p.valeurAccord).replace('.', ',') : '';
            const prefix = taux ? '+' : '';
            if (p.valueType === 'majorationHoraire') {
                const pct = Math.round((p.valeurAccord ?? 0) * 100);
                const lib = p.label ? `${p.label} (+${pct}%)` : `Majoration horaire (+${pct}%)`;
                items.push(lib);
            } else {
                const unit = p.unit || '€/h';
                const auto = p.autoHeures === true ? ' · base horaire auto (151,67h)' : '';
                const lib = p.label ? `${p.label} (${prefix}${taux} ${unit}${auto})` : `Prime horaire (${prefix}${taux} ${unit}${auto})`;
                items.push(lib);
            }
        });
    }
    if (agreement.repartition13Mois?.actif === true) {
        items.push('13e mois (répartition sur 13 mois)');
    }
    return items;
}

/**
 * Affiche ou masque le message listant les modalités qui ne sont plus prises en compte lorsque l'accord est désactivé.
 */
function updateAccordDesactiveMessage() {
    const block = document.getElementById('accord-desactive-message');
    if (!block) return;
    const agreement = typeof window.AgreementLoader?.getActiveAgreement === 'function' ? window.AgreementLoader.getActiveAgreement() : null;
    if (!agreement || state.accordActif) {
        block.classList.add('hidden');
        block.textContent = '';
        return;
    }
    const modalites = getModalitesHorsPrimesPage3(agreement);
    if (modalites.length === 0) {
        block.classList.add('hidden');
        block.textContent = '';
        return;
    }
    block.classList.remove('hidden');
    const prefix = (window.LABELS && window.LABELS.accordDesactiveMessagePrefix)
        ? window.LABELS.accordDesactiveMessagePrefix
        : 'Les éléments suivants ne sont plus pris en compte dans le calcul : ';
    block.textContent = prefix + modalites.join(', ') + '.';
}

function buildStateKeyPrimeMap(primes = []) {
    const map = {};
    for (const prime of primes) {
        const key = prime?.stateKeyActif;
        if (!key) continue;
        map[key] = prime;
    }
    return map;
}

function applyPrimeCompatibilityRules(stateKeyActif, isChecked, defsByKey, options = {}) {
    if (!stateKeyActif || !defsByKey || typeof defsByKey !== 'object') return;
    const silent = options.silent === true;
    const normalizer = window.normalizePrimeSelectionState;
    if (typeof normalizer !== 'function') return;
    const normalized = normalizer(state.accordInputs || {}, defsByKey, stateKeyActif, isChecked === true);
    state.accordInputs = normalized.nextInputs || state.accordInputs;
    if (!silent && normalized?.changes) {
        if (normalized.changes.activated.length > 0) {
            showToast('Une modalité dépendante a été activée automatiquement.', 'info', 2600);
        }
        if (normalized.changes.deactivated.length > 0) {
            showToast('Une modalité incompatible ou dépendante a été ajustée.', 'info', 2600);
        }
    }
}

function resolveNationalBaseValue(modaliteConfig = {}, fallbackValue = 0) {
    if (modaliteConfig?.deriveFrom === 'majorations.heuresSup25') {
        const derived = Number(CONFIG?.MAJORATIONS_CCN?.heuresSup25);
        if (Number.isFinite(derived) && derived > 0) return derived;
    }
    const fallback = Number(fallbackValue);
    return Number.isFinite(fallback) ? fallback : 0;
}

function resolveNationalPrimeValue(semanticId, modaliteConfig, rawConfigValue) {
    const baseValue = resolveNationalBaseValue(modaliteConfig, rawConfigValue);
    const allowOverride = modaliteConfig?.allowUserOverride === true;
    const overrideRaw = allowOverride ? state?.nationalPrimeOverrides?.[semanticId] : undefined;
    const overrideValue = Number(overrideRaw);
    if (allowOverride && Number.isFinite(overrideValue) && overrideValue >= 0) {
        return overrideValue;
    }
    return baseValue;
}

function getNationalHourlyPrimeDefs(agreement) {
    const modalites = CONFIG?.MODALITES_NATIONALES || {};
    const astreinte = modalites.astreinteDisponibilite || {};
    const intervention = modalites.interventionAstreinte || {};
    const panier = modalites.panierNuit || {};
    const habillage = modalites.habillageDeshabillage || {};
    const deplacement = modalites.deplacementProfessionnel || {};

    const ccnPrimeEquipeDef = {
        id: 'primeEquipe',
        semanticId: 'primeEquipe',
        label: 'Prime d\'équipe',
        source: 'convention',
        valueType: 'horaire',
        stateKeyActif: 'travailEquipe',
        stateKeyHeures: 'heuresEquipe',
        autoHeures: true,
        unit: '€/h',
        valeurAccord: null,
        step: 0.01,
        defaultHeures: CONFIG.DUREE_LEGALE_HEURES_MOIS ?? 151.67,
        tooltip: buildPrimeEquipeTooltip(agreement, null),
        sourceArticle: CONFIG?.TOOLTIP_TEXTS?.primeEquipe?.sourceArticle || '',
        conditionTexte: CONFIG?.TOOLTIP_TEXTS?.primeEquipe?.conditionTexte || '',
        requiresKeys: [],
        nonCumulAvec: []
    };

    const defs = [
        ccnPrimeEquipeDef,
        {
            id: 'primeAstreinteDisponibilite',
            semanticId: 'primeAstreinteDisponibilite',
            label: 'Prime astreinte disponibilité',
            source: 'convention',
            valueType: 'horaire',
            stateKeyActif: astreinte.stateKeyActif || 'primeAstreinteDisponibilite',
            stateKeyHeures: astreinte.stateKeyHeures || 'heuresAstreinteDisponibilite',
            autoHeures: false,
            unit: astreinte.modeCalcul === 'forfaitPeriode' ? '€/période' : (astreinte.unit || '€/h'),
            valeurAccord: resolveNationalPrimeValue(
                'primeAstreinteDisponibilite',
                astreinte,
                astreinte.modeCalcul === 'forfaitPeriode' ? astreinte.valeurForfaitPeriode : astreinte.valeurHoraire
            ),
            defaultHeures: Number(astreinte.defaultHeures ?? 0),
            inputUnitLabel: astreinte.inputUnitLabel || 'heures/mois',
            allowUserOverride: astreinte.allowUserOverride === true,
            tooltip: astreinte.tooltip || '',
            sourceArticle: astreinte.sourceArticle || '',
            conditionTexte: astreinte.conditionTexte || '',
            requiresKeys: [],
            nonCumulAvec: Array.isArray(astreinte.nonCumulAvec) ? astreinte.nonCumulAvec : []
        },
        {
            id: 'majorationInterventionAstreinte',
            semanticId: 'majorationInterventionAstreinte',
            label: 'Majoration intervention astreinte',
            source: 'convention',
            valueType: 'majorationHoraire',
            stateKeyActif: intervention.stateKeyActif || 'majorationInterventionAstreinte',
            stateKeyHeures: intervention.stateKeyHeures || 'heuresInterventionAstreinte',
            autoHeures: false,
            unit: intervention.unit || '%',
            valeurAccord: resolveNationalPrimeValue('majorationInterventionAstreinte', intervention, intervention.tauxMajoration),
            defaultHeures: Number(intervention.defaultHeures ?? 0),
            inputUnitLabel: intervention.inputUnitLabel || 'heures/mois',
            allowUserOverride: intervention.allowUserOverride === true,
            tooltip: intervention.tooltip || '',
            sourceArticle: intervention.sourceArticle || '',
            conditionTexte: intervention.conditionTexte || '',
            requiresKeys: Array.isArray(intervention.requiresKeys) ? intervention.requiresKeys : [],
            nonCumulAvec: Array.isArray(intervention.nonCumulAvec) ? intervention.nonCumulAvec : []
        },
        {
            id: 'primePanierNuit',
            semanticId: 'primePanierNuit',
            label: 'Prime panier nuit',
            source: 'convention',
            valueType: 'horaire',
            stateKeyActif: panier.stateKeyActif || 'primePanierNuit',
            stateKeyHeures: panier.stateKeyHeures || 'heuresPanierNuit',
            autoHeures: false,
            unit: panier.unit || '€/h',
            valeurAccord: resolveNationalPrimeValue('primePanierNuit', panier, panier.valeurHoraire),
            defaultHeures: Number(panier.defaultHeures ?? 0),
            inputUnitLabel: panier.inputUnitLabel || 'heures/mois',
            allowUserOverride: panier.allowUserOverride === true,
            tooltip: panier.tooltip || '',
            sourceArticle: panier.sourceArticle || '',
            conditionTexte: panier.conditionTexte || '',
            requiresKeys: [],
            nonCumulAvec: Array.isArray(panier.nonCumulAvec) ? panier.nonCumulAvec : []
        },
        {
            id: 'primeHabillageDeshabillage',
            semanticId: 'primeHabillageDeshabillage',
            label: 'Prime habillage / déshabillage',
            source: 'convention',
            valueType: 'horaire',
            stateKeyActif: habillage.stateKeyActif || 'primeHabillageDeshabillage',
            stateKeyHeures: habillage.stateKeyHeures || 'heuresHabillageDeshabillage',
            autoHeures: false,
            unit: habillage.unit || '€/h',
            valeurAccord: resolveNationalPrimeValue('primeHabillageDeshabillage', habillage, habillage.valeurHoraire),
            defaultHeures: Number(habillage.defaultHeures ?? 0),
            inputUnitLabel: habillage.inputUnitLabel || 'heures/mois',
            allowUserOverride: habillage.allowUserOverride === true,
            tooltip: habillage.tooltip || '',
            sourceArticle: habillage.sourceArticle || '',
            conditionTexte: habillage.conditionTexte || '',
            requiresKeys: [],
            nonCumulAvec: Array.isArray(habillage.nonCumulAvec) ? habillage.nonCumulAvec : []
        },
        {
            id: 'primeDeplacementProfessionnel',
            semanticId: 'primeDeplacementProfessionnel',
            label: 'Prime déplacements professionnels',
            source: 'convention',
            valueType: 'horaire',
            stateKeyActif: deplacement.stateKeyActif || 'primeDeplacementProfessionnel',
            stateKeyHeures: deplacement.stateKeyHeures || 'heuresDeplacementProfessionnel',
            autoHeures: false,
            unit: deplacement.unit || '€/h',
            valeurAccord: resolveNationalPrimeValue('primeDeplacementProfessionnel', deplacement, deplacement.valeurHoraire),
            defaultHeures: Number(deplacement.defaultHeures ?? 0),
            inputUnitLabel: deplacement.inputUnitLabel || 'heures/mois',
            allowUserOverride: deplacement.allowUserOverride === true,
            tooltip: deplacement.tooltip || '',
            sourceArticle: deplacement.sourceArticle || '',
            conditionTexte: deplacement.conditionTexte || '',
            requiresKeys: [],
            nonCumulAvec: Array.isArray(deplacement.nonCumulAvec) ? deplacement.nonCumulAvec : []
        }
    ];

    return defs.filter((def) => def && def.stateKeyActif);
}

/**
 * Mettre à jour l'affichage des conditions de travail selon statut et forfait
 */
function updateConditionsTravailDisplay() {
    const { classe } = getActiveClassification();
    const isCadre = classe >= CONFIG.SEUIL_CADRE;
    const isForfaitJours = state.forfait === 'jours';
    const hsAllowed = !(isCadre && isForfaitJours);
    
    const groupNuit = document.getElementById('group-nuit');
    const groupDimanche = document.getElementById('group-dimanche');
    const groupHeuresSup = document.getElementById('group-heures-sup');
    const groupJoursSupForfait = document.getElementById('group-jours-sup-forfait');
    const mainContainer = document.getElementById('accord-primes-horaires-container');
    const autresDetails = document.getElementById('conditions-autres-modalites');
    const autresContainer = document.getElementById('autres-primes-nationales-container');
    
    const agreement = typeof window.AgreementLoader?.getActiveAgreement === 'function' ? window.AgreementLoader.getActiveAgreement() : null;
    const nationalPrimesHoraires = getNationalHourlyPrimeDefs(agreement);
    const ccnPrimeEquipeDef = nationalPrimesHoraires.find((p) => p.id === 'primeEquipe') || null;
    const accordPrimesHorairesRaw = agreement && typeof window.AgreementHelpers?.getPrimes === 'function'
        ? window.AgreementHelpers.getPrimes(agreement).filter(p =>
            ((p.valueType === 'horaire' && (p.stateKeyHeures || p.autoHeures === true))
                || (p.valueType === 'majorationHoraire' && p.stateKeyHeures)))
        : [];
    const accordPrimesHoraires = accordPrimesHorairesRaw.map((prime) => {
        const isPrimeEquipe = (prime?.semanticId === 'primeEquipe' || prime?.id === 'primeEquipe');
        if (!isPrimeEquipe) return prime;
        return {
            ...(ccnPrimeEquipeDef || {}),
            stateKeyActif: prime.stateKeyActif || ccnPrimeEquipeDef?.stateKeyActif,
            valeurAccord: prime.valeurAccord,
            unit: prime.unit || '€/h',
            tooltip: buildPrimeEquipeTooltip(agreement, prime),
            source: 'accord',
            sourceArticle: prime.sourceArticle || ccnPrimeEquipeDef?.sourceArticle || '',
            conditionTexte: prime.conditionTexte || ccnPrimeEquipeDef?.conditionTexte || ''
        };
    });
    const extraSemanticIds = new Set([
        'primeAstreinteDisponibilite',
        'majorationInterventionAstreinte',
        'primePanierNuit',
        'primeHabillageDeshabillage',
        'primeDeplacementProfessionnel'
    ]);
    const mergeBySemantic = (baseDefs, overrideDefs) => {
        const orderedKeys = [];
        const bySemantic = new Map();
        const upsertPrime = (prime) => {
            const key = prime.semanticId || prime.id;
            if (!bySemantic.has(key)) orderedKeys.push(key);
            bySemantic.set(key, prime);
        };
        (baseDefs || []).forEach(upsertPrime);
        (overrideDefs || []).forEach(upsertPrime);
        return orderedKeys.map((key) => bySemantic.get(key)).filter(Boolean);
    };
    const nationalMainPrimes = ccnPrimeEquipeDef ? [ccnPrimeEquipeDef] : [];
    const nationalExtraPrimes = nationalPrimesHoraires.filter((p) => extraSemanticIds.has(p.semanticId || p.id));
    const accordMainPrimes = accordPrimesHoraires.filter((p) => !extraSemanticIds.has(p.semanticId || p.id));
    const accordExtraPrimes = accordPrimesHoraires.filter((p) => extraSemanticIds.has(p.semanticId || p.id));
    const mainPrimes = (state.accordActif && agreement)
        ? mergeBySemantic(nationalMainPrimes, accordMainPrimes)
        : nationalMainPrimes;
    const autresPrimes = (state.accordActif && agreement)
        ? mergeBySemantic(nationalExtraPrimes, accordExtraPrimes)
        : nationalExtraPrimes;
    const allPrimeDefs = [...mainPrimes, ...autresPrimes];
    currentHourlyPrimeDefsByStateKey = buildStateKeyPrimeMap(allPrimeDefs);

    const renderHourlyPrimesInContainer = (container, signaturePrefix, primesHoraires) => {
        if (!container) return;
        const hasPrimeHeures = primesHoraires.length > 0;
        const accordPrimesSignature = `${signaturePrefix}-${state.accordActif ? 'accord' : 'ccn'}-${agreement?.id ?? 'none'}-${primesHoraires.map(p => p.id).join('|')}`;
        const alreadyBuilt = container.children.length > 0 && container.dataset.accordPrimesBuilt === accordPrimesSignature;
        if (!isCadre && hasPrimeHeures) {
            container.classList.remove('hidden');
            if (alreadyBuilt) {
                primesHoraires.forEach(prime => {
                    if (prime.stateKeyActif && !(prime.stateKeyActif in state.accordInputs)) {
                        state.accordInputs[prime.stateKeyActif] = false;
                    }
                    if (!prime.autoHeures && prime.stateKeyHeures && !(prime.stateKeyHeures in state.accordInputs)) {
                        state.accordInputs[prime.stateKeyHeures] = prime.defaultHeures ?? (CONFIG.DUREE_LEGALE_HEURES_MOIS ?? 151.67);
                    }
                    const actif = state.accordInputs[prime.stateKeyActif] === true;
                    if (actif && prime.stateKeyActif) {
                        applyPrimeCompatibilityRules(prime.stateKeyActif, true, currentHourlyPrimeDefsByStateKey, { silent: true });
                    }
                    const heures = prime.stateKeyHeures
                        ? (state.accordInputs[prime.stateKeyHeures] != null ? state.accordInputs[prime.stateKeyHeures] : (prime.defaultHeures ?? 151.67))
                        : (prime.defaultHeures ?? 151.67);
                    const formGroup = container.querySelector(`[data-state-key-actif="${prime.stateKeyActif}"]`);
                    if (formGroup) {
                        const cb = formGroup.querySelector('input[type="checkbox"]');
                        const inputHeures = formGroup.querySelector('input[data-state-key-heures]');
                        const overrideInput = formGroup.querySelector('input[data-national-override-semantic]');
                        const subField = formGroup.querySelector('.sub-field');
                        if (cb) cb.checked = actif;
                        if (inputHeures && !prime.autoHeures && document.activeElement !== inputHeures) {
                            inputHeures.value = String(heures);
                        }
                        if (overrideInput && document.activeElement !== overrideInput) {
                            const currentOverride = state?.nationalPrimeOverrides?.[prime.semanticId];
                            const value = Number.isFinite(Number(currentOverride))
                                ? currentOverride
                                : prime.valeurAccord;
                            overrideInput.value = value != null ? String(value) : '';
                        }
                        if (subField) subField.classList.toggle('hidden', !actif);
                    }
                });
                return;
            }
            container.dataset.accordPrimesBuilt = accordPrimesSignature;
            container.innerHTML = '';
            primesHoraires.forEach(prime => {
                if (prime.stateKeyActif && !(prime.stateKeyActif in state.accordInputs)) {
                    state.accordInputs[prime.stateKeyActif] = false;
                }
                if (!prime.autoHeures && prime.stateKeyHeures && !(prime.stateKeyHeures in state.accordInputs)) {
                    state.accordInputs[prime.stateKeyHeures] = prime.defaultHeures ?? (CONFIG.DUREE_LEGALE_HEURES_MOIS ?? 151.67);
                }
                const actif = state.accordInputs[prime.stateKeyActif] === true;
                if (actif && prime.stateKeyActif) {
                    applyPrimeCompatibilityRules(prime.stateKeyActif, true, currentHourlyPrimeDefsByStateKey, { silent: true });
                }
                const heures = prime.stateKeyHeures
                    ? (state.accordInputs[prime.stateKeyHeures] != null ? state.accordInputs[prime.stateKeyHeures] : (prime.defaultHeures ?? 151.67))
                    : (prime.defaultHeures ?? 151.67);
                const formGroup = document.createElement('div');
                formGroup.className = 'form-group';
                formGroup.dataset.stateKeyActif = prime.stateKeyActif;
                formGroup.dataset.stateKeyHeures = prime.stateKeyHeures;
                const labelCheck = document.createElement('label');
                labelCheck.className = 'checkbox-label';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'book-checkbox';
                cb.dataset.stateKeyActif = prime.stateKeyActif;
                cb.dataset.primeSource = prime.source || 'accord';
                cb.checked = actif;
                const spanLabel = document.createElement('span');
                spanLabel.textContent = prime.label || "Prime horaire (accord d'entreprise)";
                labelCheck.appendChild(cb);
                labelCheck.appendChild(spanLabel);
                const isPrimeEquipe = (prime.id === 'primeEquipe' || prime.semanticId === 'primeEquipe');
                const isAccordPrime = !isPrimeEquipe && (prime.source || 'accord') === 'accord';
                const badgeEl = isAccordPrime ? createAccordBadgeElement(agreement) : null;
                if (badgeEl) {
                    spanLabel.appendChild(document.createTextNode(' '));
                    spanLabel.appendChild(badgeEl);
                }
                const prefixAccordOnly = isAccordPrime && (typeof window.LABELS !== 'undefined' && window.LABELS.tooltipPrefixAccordOnly)
                    ? window.LABELS.tooltipPrefixAccordOnly
                    : '';
                const tooltipContent = (() => {
                    const baseTooltip = prime.tooltip ? String(prime.tooltip) : '';
                    const originFallback = isAccordPrime
                        ? `Accord d'entreprise ${getAccordNomCourt(agreement) || 'accord'}`
                        : (window.LABELS?.conventionLabel || 'Convention collective de la métallurgie (CCN)');
                    const origin = classifyOriginFromSourceArticle(prime.sourceArticle, originFallback);
                    const sourceLine = prime.sourceArticle
                        ? String(prime.sourceArticle)
                        : String(origin || '');
                    const wrapWithTemplate = (detailText) => {
                        const description = [String(prime.conditionTexte || ''), String(detailText || '')]
                            .filter(Boolean)
                            .join(' ')
                            .trim();
                        return `<strong>${sourceLine} :</strong><br>${description}`.trim();
                    };
                    if (prime.valueType === 'majorationHoraire' && prime.valeurAccord != null) {
                        const pct = Math.round(prime.valeurAccord * 100);
                        const ratePart = `+${pct}%.`;
                        return (prefixAccordOnly + wrapWithTemplate(`${ratePart} ${baseTooltip}`.trim())).trim();
                    }
                    const taux = prime.valeurAccord != null ? String(prime.valeurAccord).replace('.', ',') : '';
                    const unit = prime.unit || '€/h';
                    const ratePart = taux ? `+${taux} ${unit}.` : '';
                    return (prefixAccordOnly + wrapWithTemplate(`${ratePart} ${baseTooltip}`.trim())).trim();
                })();
                if (tooltipContent) {
                    const tooltipSpan = document.createElement('span');
                    tooltipSpan.className = 'tooltip-trigger';
                    tooltipSpan.setAttribute('data-tippy-content', tooltipContent.replace(/"/g, '&quot;'));
                    tooltipSpan.setAttribute('aria-label', 'Aide');
                    tooltipSpan.textContent = '?';
                    labelCheck.appendChild(tooltipSpan);
                }
                if (!prime.autoHeures) {
                    const subField = document.createElement('div');
                    subField.className = 'sub-field sub-field-inline' + (actif ? '' : ' hidden');
                    subField.dataset.heuresFieldFor = prime.stateKeyActif;
                    const inputWithUnit = document.createElement('div');
                    inputWithUnit.className = 'input-with-unit';
                    const inputHeures = document.createElement('input');
                    inputHeures.type = 'text';
                    inputHeures.className = 'book-input';
                    inputHeures.value = heures;
                    inputHeures.dataset.stateKeyHeures = prime.stateKeyHeures;
                    inputHeures.setAttribute('inputmode', 'decimal');
                    inputHeures.setAttribute('data-decimal-input', 'true');
                    inputHeures.setAttribute('data-number-behavior', 'decimal');
                    inputHeures.setAttribute('autocomplete', 'off');
                    inputHeures.setAttribute('aria-label', 'Heures par mois');
                    inputHeures.addEventListener('focus', function () { this.select(); });
                    const spanUnit = document.createElement('span');
                    spanUnit.className = 'input-unit';
                    spanUnit.textContent = prime.inputUnitLabel || 'heures/mois';
                    inputWithUnit.appendChild(inputHeures);
                    inputWithUnit.appendChild(spanUnit);
                    subField.appendChild(inputWithUnit);
                    if (prime.allowUserOverride === true && prime.semanticId) {
                        const overrideWithUnit = document.createElement('div');
                        overrideWithUnit.className = 'input-with-unit';
                        const overrideInput = document.createElement('input');
                        overrideInput.type = 'text';
                        overrideInput.className = 'book-input';
                        overrideInput.setAttribute('inputmode', 'decimal');
                        overrideInput.setAttribute('data-decimal-input', 'true');
                        overrideInput.setAttribute('data-number-behavior', 'decimal');
                        overrideInput.setAttribute('autocomplete', 'off');
                        overrideInput.setAttribute('aria-label', 'Valeur unitaire');
                        overrideInput.dataset.nationalOverrideSemantic = prime.semanticId;
                        const currentOverride = state?.nationalPrimeOverrides?.[prime.semanticId];
                        overrideInput.value = Number.isFinite(Number(currentOverride))
                            ? String(currentOverride)
                            : String(prime.valeurAccord ?? '');
                        overrideInput.addEventListener('focus', function () { this.select(); });
                        const overrideUnit = document.createElement('span');
                        overrideUnit.className = 'input-unit';
                        overrideUnit.textContent = `taux (${prime.unit || ''})`;
                        overrideWithUnit.appendChild(overrideInput);
                        overrideWithUnit.appendChild(overrideUnit);
                        subField.appendChild(overrideWithUnit);
                    }
                    formGroup.appendChild(labelCheck);
                    formGroup.appendChild(subField);
                } else {
                    formGroup.appendChild(labelCheck);
                }
                container.appendChild(formGroup);
            });
            if (typeof tippy !== 'undefined') {
                container.querySelectorAll('.tooltip-trigger[data-tippy-content]').forEach((el) => {
                    if (!el._tippy) {
                        const instances = tippy(el, {
                            theme: 'metallurgie',
                            animation: 'shift-away',
                            duration: [200, 150],
                            arrow: true,
                            maxWidth: 300,
                            interactive: true,
                            allowHTML: true,
                            appendTo: document.body
                        });
                        if (instances && instances[0]) el._tippy = instances[0];
                        el.addEventListener('click', (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                        });
                    }
                });
            }
        } else {
            container.classList.add('hidden');
            delete container.dataset.accordPrimesBuilt;
            container.innerHTML = '';
        }
    };
    
    // Cadres au forfait jours : pas d'heures supplémentaires en heures,
    // mais possibilité de rachat de jours de repos (L3121-59)
    if (isCadre && isForfaitJours) {
        groupNuit.classList.remove('hidden');
        groupDimanche.classList.remove('hidden');
        if (groupHeuresSup) groupHeuresSup.classList.add('hidden');
        if (groupJoursSupForfait) groupJoursSupForfait.classList.remove('hidden');
        if (mainContainer) {
            mainContainer.innerHTML = '';
            mainContainer.classList.add('hidden');
        }
        if (autresContainer) {
            autresContainer.innerHTML = '';
            autresContainer.classList.add('hidden');
        }
        if (autresDetails) {
            autresDetails.classList.add('hidden');
            autresDetails.open = false;
        }
        state.travailHeuresSup = false;
        state.heuresSup = 0;
        const hsCb = document.getElementById('travail-heures-sup');
        const hsInput = document.getElementById('heures-sup');
        const jsfCb = document.getElementById('travail-jours-sup-forfait');
        const jsfInput = document.getElementById('jours-sup-forfait');
        const jsfField = document.getElementById('jours-sup-forfait-field');
        if (hsCb) hsCb.checked = false;
        if (hsInput) hsInput.value = '0';
        const nuitCb = document.getElementById('travail-nuit');
        const nuitInput = document.getElementById('heures-nuit');
        const nuitField = document.getElementById('heures-nuit-field');
        if (nuitCb) nuitCb.checked = state.typeNuit !== 'aucun';
        if (nuitInput && document.activeElement !== nuitInput) nuitInput.value = String(state.heuresNuit ?? 0);
        if (nuitField) nuitField.classList.toggle('hidden', state.typeNuit === 'aucun');
        const dimCb = document.getElementById('travail-dimanche');
        const dimInput = document.getElementById('heures-dimanche');
        const dimField = document.getElementById('heures-dimanche-field');
        if (dimCb) dimCb.checked = !!state.travailDimanche;
        if (dimInput && document.activeElement !== dimInput) dimInput.value = String(state.heuresDimanche ?? 0);
        if (dimField) dimField.classList.toggle('hidden', !state.travailDimanche);
        if (jsfCb) jsfCb.checked = !!state.travailJoursSupForfait;
        if (jsfInput && document.activeElement !== jsfInput) jsfInput.value = String(state.joursSupForfait ?? 0);
        if (jsfField) jsfField.classList.toggle('hidden', !state.travailJoursSupForfait);
        const hsField = document.getElementById('heures-sup-field');
        if (hsField) hsField.classList.add('hidden');
    } else {
        groupDimanche.classList.remove('hidden');
        groupNuit.classList.remove('hidden');
        if (groupJoursSupForfait) groupJoursSupForfait.classList.add('hidden');
        state.travailJoursSupForfait = false;
        state.joursSupForfait = 0;
        const jsfCb = document.getElementById('travail-jours-sup-forfait');
        const jsfInput = document.getElementById('jours-sup-forfait');
        const jsfField = document.getElementById('jours-sup-forfait-field');
        if (jsfCb) jsfCb.checked = false;
        if (jsfInput && document.activeElement !== jsfInput) jsfInput.value = '0';
        if (jsfField) jsfField.classList.add('hidden');
        if (groupHeuresSup) groupHeuresSup.classList.toggle('hidden', !hsAllowed);
        const travailNuitCheckbox = document.getElementById('travail-nuit');
        const heuresNuitEl = document.getElementById('heures-nuit');
        if (travailNuitCheckbox) travailNuitCheckbox.checked = state.typeNuit !== 'aucun';
        if (heuresNuitEl && document.activeElement !== heuresNuitEl) {
            heuresNuitEl.value = String(state.heuresNuit ?? 0);
        }
        const hnf = document.getElementById('heures-nuit-field');
        if (hnf) hnf.classList.toggle('hidden', state.typeNuit === 'aucun');
        const hsCb = document.getElementById('travail-heures-sup');
        const hsInput = document.getElementById('heures-sup');
        const hsField = document.getElementById('heures-sup-field');
        if (!hsAllowed) {
            state.travailHeuresSup = false;
            state.heuresSup = 0;
            if (hsCb) hsCb.checked = false;
            if (hsInput && document.activeElement !== hsInput) hsInput.value = '0';
            if (hsField) hsField.classList.add('hidden');
        } else {
            if (hsCb) hsCb.checked = !!state.travailHeuresSup;
            if (hsInput && document.activeElement !== hsInput) {
                hsInput.value = String(state.heuresSup ?? 0);
            }
            if (hsField) hsField.classList.toggle('hidden', !state.travailHeuresSup);
        }
        
        renderHourlyPrimesInContainer(mainContainer, 'main', mainPrimes);
        renderHourlyPrimesInContainer(autresContainer, 'autres', autresPrimes);
        if (autresDetails) {
            const showAutres = !isCadre && autresPrimes.length > 0;
            autresDetails.classList.toggle('hidden', !showAutres);
            if (!showAutres) autresDetails.open = false;
        }
    }
}

/**
 * Construit dynamiquement le contenu de #accord-options à partir des primes de l'accord.
 * - Primes inclusDansSMH === true : label informatif (non-togglable, toujours actives)
 * - Primes de type montant avec inclusDansSMH === false : checkbox togglable
 * - Primes horaires/majorationHoraire : déjà gérées dans #accord-primes-horaires-container
 */
function buildAccordOptionsUI() {
    const container = document.getElementById('accord-options');
    if (!container) return;
    const agreement = typeof window.AgreementLoader?.getActiveAgreement === 'function' ? window.AgreementLoader.getActiveAgreement() : null;
    if (!agreement || !state.accordActif) {
        container.innerHTML = '';
        container.classList.add('hidden');
        currentAccordOptionDefsByStateKey = {};
        return;
    }
    const primes = typeof window.AgreementHelpers?.getPrimes === 'function'
        ? window.AgreementHelpers.getPrimes(agreement) : [];
    // Ne prendre que les primes non-horaires (montant, etc.) — les horaires sont dans conditions de travail
    const primesNonHoraires = primes.filter(p => p.valueType !== 'horaire' && p.valueType !== 'majorationHoraire');
    // Primes hors-SMH : checkbox.
    const primesTogglables = primesNonHoraires.filter(p => p.inclusDansSMH !== true);
    if (primesTogglables.length === 0) {
        container.innerHTML = '';
        container.classList.add('hidden');
        currentAccordOptionDefsByStateKey = {};
        return;
    }
    currentAccordOptionDefsByStateKey = buildStateKeyPrimeMap(primesTogglables);
    primesTogglables.forEach((prime) => {
        const key = prime?.stateKeyActif;
        if (!key) return;
        if (state.accordInputs[key] === true) {
            applyPrimeCompatibilityRules(key, true, currentAccordOptionDefsByStateKey, { silent: true });
        }
    });
    const moisNoms = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    let html = '';
    for (const prime of primesTogglables) {
        const montant = prime.valeurAccord != null ? formatMoney(prime.valeurAccord) : '';
        const moisStr = prime.moisVersement ? ` (${moisNoms[prime.moisVersement - 1]})` : '';
        const actif = state.accordInputs[prime.stateKeyActif] === true;
        html += `<label class="checkbox-label">
            <input type="checkbox" class="book-checkbox" data-state-key-actif="${escapeHTML(prime.stateKeyActif || '')}" ${actif ? 'checked' : ''}>
            <span>${escapeHTML(prime.label || 'Prime')} ${montant ? '(' + montant + '/an' + moisStr + ')' : ''}</span>
        </label>`;
    }
    container.innerHTML = html;
    container.classList.remove('hidden');
    // Initialiser Tippy sur les éventuels tooltips
    if (typeof tippy !== 'undefined') {
        container.querySelectorAll('.tooltip-trigger[data-tippy-content]').forEach((el) => {
            if (!el._tippy) tippy(el, { theme: 'metallurgie', animation: 'shift-away', duration: [200, 150], arrow: true, maxWidth: 300 });
        });
    }
}

/**
 * Mettre à jour les informations de taux appliqués (CCN vs accord)
 */
function getTauxHoraireReferenceUI(agreement) {
    const heuresBase = CONFIG.DUREE_LEGALE_HEURES_MOIS ?? 151.67;
    const hsAccord = agreement?.majorations?.heuresSupplementaires;
    const { classe } = getActiveClassification();
    const isCadre = classe >= CONFIG.SEUIL_CADRE;
    const isForfaitJoursCadre = isCadre && state.forfait === 'jours';
    const hsActif = !isForfaitJoursCadre && !!state.travailHeuresSup && (Number(state.heuresSup) || 0) > 0;
    const heuresSup = hsActif ? (Number(state.heuresSup) || 0) : 0;
    const seuil = CONFIG.HEURES_SUP_TRANCHE_1_MENSUELLES ?? 34.67;
    const h25 = Math.min(Math.max(heuresSup, 0), seuil);
    const h50 = Math.max(heuresSup - seuil, 0);
    const t25 = (state.accordActif && hsAccord?.majoration25 != null) ? hsAccord.majoration25 : (CONFIG.MAJORATIONS_CCN?.heuresSup25 ?? 0.25);
    const t50 = (state.accordActif && hsAccord?.majoration50 != null) ? hsAccord.majoration50 : (CONFIG.MAJORATIONS_CCN?.heuresSup50 ?? 0.50);
    const coeff = hsActif
        ? ((heuresBase + h25 * (1 + t25) + h50 * (1 + t50)) / (heuresBase + h25 + h50))
        : 1;
    return {
        isMajoreHS: hsActif,
        coeff: Math.round(coeff * 1000) / 1000
    };
}

function updateTauxInfo() {
    const tauxNuitInfo = document.getElementById('taux-nuit-info');
    const tauxDimancheInfo = document.getElementById('taux-dimanche-info');
    const tauxHeuresSupInfo = document.getElementById('taux-heures-sup-info');
    const agreement = typeof window.AgreementLoader?.getActiveAgreement === 'function' ? window.AgreementLoader.getActiveAgreement() : null;
    const nomAccord = getAccordNomCourt(agreement) || 'accord';
    const tauxRef = getTauxHoraireReferenceUI(agreement);
    const suffixTauxRef = tauxRef.isMajoreHS ? ` · Base horaire majorée HS (x${String(tauxRef.coeff).replace('.', ',')})` : ' · Base 35h';

    // Taux de nuit (taux accord si présent, sinon CCN)
    if (tauxNuitInfo) {
        if (state.typeNuit !== 'aucun') {
            if (state.accordActif && agreement && agreement.majorations?.nuit?.posteNuit != null) {
                const pct = Math.round(agreement.majorations.nuit.posteNuit * 100);
                tauxNuitInfo.textContent = `Taux ${nomAccord} : +${pct}%${suffixTauxRef}`;
                tauxNuitInfo.className = 'taux-applique accord';
            } else {
                const pctCCN = Math.round((CONFIG.MAJORATIONS_CCN?.nuit ?? 0.15) * 100);
                tauxNuitInfo.textContent = `Taux CCN : +${pctCCN}%${suffixTauxRef}`;
                tauxNuitInfo.className = 'taux-applique';
            }
        } else {
            tauxNuitInfo.textContent = '';
        }
    }

    // Taux dimanche (taux accord si présent, sinon CCN +100%)
    if (tauxDimancheInfo) {
        if (state.travailDimanche) {
            if (state.accordActif && agreement && agreement.majorations?.dimanche != null) {
                const pct = Math.round(agreement.majorations.dimanche * 100);
                tauxDimancheInfo.textContent = `Taux ${nomAccord} : +${pct}%${suffixTauxRef}`;
                tauxDimancheInfo.className = 'taux-applique accord';
            } else if (state.accordActif && agreement) {
                tauxDimancheInfo.textContent = `Taux ${nomAccord} : +50%${suffixTauxRef}`;
                tauxDimancheInfo.className = 'taux-applique accord';
            } else {
                const pctCCN = Math.round((CONFIG.MAJORATIONS_CCN?.dimanche ?? 1) * 100);
                tauxDimancheInfo.textContent = `Taux CCN : +${pctCCN}%${suffixTauxRef}`;
                tauxDimancheInfo.className = 'taux-applique';
            }
        } else {
            tauxDimancheInfo.textContent = '';
        }
    }

    // Bloc texte sous la saisie HS volontairement retiré : l'information est portée par le tooltip.
    if (tauxHeuresSupInfo) tauxHeuresSupInfo.textContent = '';
}

/**
 * Mettre à jour l'affichage du mode (auto/manuel).
 * Utilisée si les boutons de bascule mode manuel/auto sont présents dans le DOM.
 */
function updateModeDisplay() {
    const btnManuel = document.getElementById('btn-mode-manuel');
    const btnAuto = document.getElementById('btn-mode-auto');
    const sectionManuel = document.getElementById('classification-manual');
    const sectionAuto = document.getElementById('classification-auto');

    if (!btnManuel || !btnAuto) return; // Nouveau wizard

    if (state.modeManuel) {
        btnManuel.classList.add('hidden');
        btnAuto.classList.remove('hidden');
        if (sectionManuel) sectionManuel.classList.remove('hidden');
        if (sectionAuto) sectionAuto.style.opacity = '0.5';
    } else {
        btnManuel.classList.remove('hidden');
        btnAuto.classList.add('hidden');
        if (sectionManuel) sectionManuel.classList.add('hidden');
        if (sectionAuto) sectionAuto.style.opacity = '1';
    }
}

/**
 * Mettre à jour les options de classe selon le groupe
 */
function updateClasseOptions() {
    const selectClasse = document.getElementById('select-classe');
    if (!selectClasse) return;
    
    const classes = CONFIG.GROUPE_CLASSES[state.groupeManuel];
    
    selectClasse.innerHTML = '';
    classes.forEach(classe => {
        const option = document.createElement('option');
        option.value = classe;
        option.textContent = classe;
        selectClasse.appendChild(option);
    });

    state.classeManuel = classes[0];
}

/**
 * ============================================
 * MOTEUR DE CLASSIFICATION
 * ============================================
 */
function calculateClassification() {
    // Calcul du score total (somme des 6 critères)
    const totalScore = state.scores.reduce((sum, score) => sum + score, 0);
    
    // Recherche dans la grille de mapping
    for (const [min, max, groupe, classe] of CONFIG.MAPPING_POINTS) {
        if (totalScore >= min && totalScore <= max) {
            return { totalScore, groupe, classe };
        }
    }
    
    // Fallback (ne devrait jamais arriver)
    return { totalScore, groupe: 'A', classe: 1 };
}

/**
 * Obtenir la classification active (auto ou manuelle)
 */
function getActiveClassification() {
    if (state.modeManuel) {
        return {
            groupe: state.groupeManuel,
            classe: state.classeManuel
        };
    } else {
        const calc = calculateClassification();
        return {
            groupe: calc.groupe,
            classe: calc.classe
        };
    }
}

/**
 * ============================================
 * MOTEUR DE RÉMUNÉRATION
 * ============================================
 * 
 * Les calculs de primes et majorations sont maintenant gérés par les modules :
 * - src/remuneration/PrimeCalculator.js
 * - src/remuneration/MajorationCalculator.js
 */

function calculateRemuneration() {
    // Utiliser le nouveau module si disponible
    if (typeof window.calculateRemunerationFromModules === 'function') {
        return window.calculateRemunerationFromModules(state);
    }
    
    // Fallback minimal : retourner une structure vide si le module n'est pas disponible
    console.warn('calculateRemunerationFromModules non disponible, retour d\'une structure vide');
    return {
        scenario: '',
        baseSMH: 0,
        total: 0,
        details: [],
        isCadre: false,
        groupe: '',
        classe: 0
    };
}

/**
 * Retourne le montant annuel brut de l'assiette SMH (SMH seul).
 * Utilisé pour le calcul des arriérés quand "SMH seul" est coché.
 * INCLUT : base SMH (ou barème débutants F11/F12 avec < 6 ans) + majorations forfaits cadres (heures/jours).
 * Les majorations forfaits font partie du SMH. Les majorations heures sup sont incluses dans l'assiette SMH
 * (non calculées ici tant que l'app ne simule pas les HS).
 * EXCLUT : majorations pénibilité, majorations nuit/dimanche, prime d'équipe, et prime d'ancienneté si non incluseDansSMH.
 * NOTE : Les primes d'accord avec inclusDansSMH === true (ex. prime de vacances, Art. 140 CCNM)
 * sont une distribution du salaire permettant d'atteindre le SMH grille, pas un supplément.
 * Elles ne modifient pas le total annuel mais sont prises en compte dans la distribution mensuelle.
 */
function getMontantAnnuelSMHSeul() {
    // Utiliser le nouveau module si disponible
    if (typeof window.getMontantAnnuelSMHSeulFromModules === 'function') {
        return window.getMontantAnnuelSMHSeulFromModules(state);
    }
    
    // Fallback minimal : retourner 0 si le module n'est pas disponible
    console.warn('getMontantAnnuelSMHSeulFromModules non disponible, retour de 0');
    return 0;
}

/**
 * ============================================
 * MISE À JOUR GLOBALE
 * ============================================
 */
function updateAll() {
    // Score total
    const totalScore = state.scores.reduce((sum, score) => sum + score, 0);
    const scoreTotal = document.getElementById('score-total');
    if (scoreTotal) scoreTotal.textContent = totalScore;

    // Classification automatique
    const calcAuto = calculateClassification();
    const groupeAuto = document.getElementById('groupe-auto');
    const classeAuto = document.getElementById('classe-auto');
    if (groupeAuto) groupeAuto.textContent = calcAuto.groupe;
    if (classeAuto) classeAuto.textContent = calcAuto.classe;

    // Classification active
    const classification = getActiveClassification();
    const isCadre = classification.classe >= CONFIG.SEUIL_CADRE;

    // Mettre à jour les affichages de classification (wizard)
    const groupeDisplay = document.getElementById('groupe-display');
    const classeDisplay = document.getElementById('classe-display');
    if (groupeDisplay) groupeDisplay.textContent = classification.groupe;
    if (classeDisplay) classeDisplay.textContent = classification.classe;

    // Statut Cadre/Non-Cadre (plusieurs badges possibles)
    const updateStatutBadge = (badge) => {
        if (!badge) return;
        if (isCadre) {
            badge.textContent = 'Cadre';
            badge.classList.remove('non-cadre');
            badge.classList.add('cadre');
        } else {
            badge.textContent = 'Non-Cadre';
            badge.classList.remove('cadre');
            badge.classList.add('non-cadre');
        }
    };
    
    updateStatutBadge(document.getElementById('statut-badge'));
    updateStatutBadge(document.getElementById('statut-badge-auto'));

    // Affichage des modalités
    const modalitesNonCadre = document.getElementById('modalites-non-cadre');
    const modalitesCadre = document.getElementById('modalites-cadre');
    const cadreDebutant = document.getElementById('cadre-debutant');

    if (modalitesNonCadre && modalitesCadre) {
        if (isCadre) {
            modalitesNonCadre.classList.add('hidden');
            modalitesCadre.classList.remove('hidden');
            
            // Groupe F débutants (F11 et F12)
            if (cadreDebutant) {
                if (classification.classe === 11 || classification.classe === 12) {
                    cadreDebutant.classList.remove('hidden');
                } else {
                    cadreDebutant.classList.add('hidden');
                }
            }
        } else {
            modalitesNonCadre.classList.remove('hidden');
            modalitesCadre.classList.add('hidden');
            // Non-cadre : toujours base 35h, réinitialiser le forfait
            if (state.forfait !== '35h') {
                state.forfait = '35h';
                const forfaitSel = document.getElementById('forfait');
                if (forfaitSel) forfaitSel.value = '35h';
            }
        }
    }

    // Affichage des conditions de travail selon statut/forfait
    updateConditionsTravailDisplay();

    const tpCb = document.getElementById('travail-temps-partiel');
    const tpField = document.getElementById('taux-activite-field');
    const tpInput = document.getElementById('taux-activite');
    if (tpCb && tpField && tpInput) {
        tpCb.checked = !!state.travailTempsPartiel;
        tpField.classList.toggle('hidden', !state.travailTempsPartiel);
        if (document.activeElement !== tpInput) {
            tpInput.value = String(state.tauxActivite ?? (CONFIG.TAUX_ACTIVITE_DEFAUT ?? 100));
        }
    }

    // Synchroniser la checkbox accord depuis state
    const accordCheckboxEl = document.getElementById('accord-actif');
    if (accordCheckboxEl) accordCheckboxEl.checked = !!state.accordActif;
    // Construire dynamiquement les options accord (primes montant, etc.)
    // buildAccordOptionsUI gère lui-même la visibilité du container
    buildAccordOptionsUI();

    // Message lorsque l'accord est désactivé : modalités qui ne sont plus prises en compte
    updateAccordDesactiveMessage();

    // Switch 12/13 mois : appliquer et verrouiller selon l'accord si sélectionné
    if (typeof updateMonthsToggleFromAccord === 'function') updateMonthsToggleFromAccord();

    // Mise à jour des taux affichés (CCN vs accord)
    updateTauxInfo();
    updateArreteesSalaireHint();

    // Calcul et affichage rémunération
    const remuneration = calculateRemuneration();
    updateRemunerationDisplay(remuneration);
    
    // Synchroniser le graphique si visible
    syncEvolutionChart();
    
    // Si l'étape 4 (courbe des arriérés) est affichée, rafraîchir la courbe pour qu'elle reflète le nouveau salaire annuel
    const step4 = document.getElementById('step-4');
    if (step4 && step4.classList.contains('active') && !step4.classList.contains('hidden')) {
        initTimeline();
    }
}

function classifyOriginFromSourceArticle(sourceArticle, fallbackOrigin) {
    const tooltipLabels = CONFIG?.TOOLTIP_TEXTS?.labels || {};
    const src = String(sourceArticle || '').toLowerCase();
    if (!src) return fallbackOrigin;
    if (src.includes('code du travail') || /\bl\d{4}-\d+\b/.test(src)) {
        return tooltipLabels.codeTravail || 'Code du travail';
    }
    if (src.includes('convention') || src.includes('ccn') || src.includes('ccnm') || src.includes('idcc')) {
        return tooltipLabels.conventionMetallurgie || window.LABELS?.conventionLabel || 'Convention collective de la métallurgie (CCN)';
    }
    if (src.includes('accord')) {
        return tooltipLabels.accordCollectif || 'Accord collectif';
    }
    return fallbackOrigin;
}

function simplifyResultDisplayLabel(rawLabel) {
    return String(rawLabel || '')
        .replace(/\bconventionnelle?\b/gi, '')
        .replace(/\bCCN(M)?\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+\)/g, ')')
        .trim();
}

/**
 * Mettre à jour l'affichage de la rémunération
 */
function updateRemunerationDisplay(remuneration) {
    const conventionLabel = window.LABELS?.conventionLabel || 'Convention collective de la métallurgie (CCN)';
    // Ligne contextuelle sous le sous-titre (forfait + base horaire)
    const ctxNotice = document.getElementById('result-context-notice');
    let baseInfo = '';
    if (ctxNotice) {
        if (state.forfait === 'jours') {
            baseInfo = 'Forfait jours · 218 j/an';
        } else if (state.forfait === 'heures') {
            baseInfo = 'Forfait heures';
        } else {
            baseInfo = 'Base 35h/sem.';
        }
        if (state.travailTempsPartiel) {
            const taux = Math.round((Number(state.tauxActivite) || (CONFIG.TAUX_ACTIVITE_DEFAUT ?? 100)) * 100) / 100;
            baseInfo += ` · Temps partiel ${String(taux).replace('.', ',')}%`;
        }
    }

    // Total annuel
    document.getElementById('result-smh').textContent = formatMoney(remuneration.total);
    
    // Mensuel (sur 12 ou 13 mois selon le choix)
    const mensuel = Math.round(remuneration.total / state.nbMois);
    document.getElementById('result-mensuel').textContent = formatMoney(mensuel);
    const hourlyNotice = document.getElementById('result-hourly-deduced');
    // Référence unifiée avec la prime d'équipe : taux horaire SMH de base (35h),
    // hors heures supplémentaires et hors contreparties ajoutées.
    const smhBaseAnnuel = Number(remuneration.baseSMH) || Number(getMontantAnnuelSMHSeul()) || 0;
    const tauxActivitePctRaw = state.travailTempsPartiel
        ? (Number(state.tauxActivite) || Number(CONFIG.TAUX_ACTIVITE_DEFAUT ?? 100))
        : 100;
    const tauxActivitePct = Math.max(Number(CONFIG.TAUX_ACTIVITE_MIN ?? 1), Math.min(Number(CONFIG.TAUX_ACTIVITE_MAX ?? 100), tauxActivitePctRaw));
    const isForfaitJours = state.forfait === 'jours';
    // Le taux horaire SMH de base est une référence 35h annualisée sur 12 mois,
    // indépendante du mode de répartition de paie (12/13 mois).
    const tauxHoraire = getSmhHourlyBaseRateFromAnnual(smhBaseAnnuel, { nbMois: 12, tauxActivitePct });
    const tauxJournalier = getSmhDailyBaseRateFromAnnual(smhBaseAnnuel, { tauxActivitePct });
    const tauxStr = isForfaitJours
        ? `${(Math.round(tauxJournalier * 100) / 100).toFixed(2).replace('.', ',')} €/j`
        : `${(Math.round(tauxHoraire * 100) / 100).toFixed(2).replace('.', ',')} €/h`;
    const tauxLabel = isForfaitJours
        ? 'Taux journalier SMH'
        : 'Taux horaire SMH (base 35h)';
    if (ctxNotice) {
        ctxNotice.textContent = `${baseInfo} · ${tauxLabel} ${tauxStr}`;
    }
    if (hourlyNotice) {
        hourlyNotice.textContent = '';
    }

    // Détails avec agrégation intelligente
    const detailsContainer = document.getElementById('result-details');
    let detailsHTML = '';
    
    // Agréger les éléments similaires pour épurer l'affichage
    const aggregatedDetails = aggregateRemunerationDetails(remuneration.details);
    
    const agreement = typeof window.AgreementLoader?.getActiveAgreement === 'function' ? window.AgreementLoader.getActiveAgreement() : null;
    const nomAccord = getAccordNomCourt(agreement) || 'accord';
    aggregatedDetails.forEach(detail => {
        const valueClass = detail.isPositive ? 'positive' : '';
        const prefix = detail.isPositive ? '+' : '';
        const isAccord = !!detail.isAgreement;
        const accordBadge = isAccord ? getAccordBadgeHtml(agreement) : '';
        const fallbackOrigin = isAccord ? `Accord d'entreprise ${nomAccord}` : conventionLabel;
        const origin = classifyOriginFromSourceArticle(detail.sourceArticle, detail.tooltipOrigin || fallbackOrigin);
        let tipContent = '<strong>Origine :</strong> ' + (typeof origin === 'string' ? origin : fallbackOrigin) + '<br>';
        if (detail.sourceArticle) {
            tipContent += '<strong>Référence :</strong> ' + escapeHTML(String(detail.sourceArticle)) + '<br>';
        }
        if (detail.conditionTexte) {
            tipContent += '<strong>Cadre :</strong> ' + escapeHTML(String(detail.conditionTexte)) + '<br>';
        }
        if (detail.breakdown && detail.breakdown.length) {
            tipContent += '<strong>Détail du calcul :</strong><br>';
            detail.breakdown.forEach(b => {
                tipContent += '• ' + escapeHTML(b.label) + ' : ' + formatMoney(b.value) + '<br>';
            });
        } else if (detail.tooltipDetail) {
            tipContent += '<strong>Détail :</strong> ' + escapeHTML(detail.tooltipDetail) + '<br>';
        } else {
            tipContent += '<strong>Détail :</strong> ' + escapeHTML(detail.label) + ' : ' + formatMoney(detail.value);
        }
        const tipAttr = tipContent.replace(/"/g, '&quot;');
        // Sous-lignes SMH (Art. 140) : indentées, rattachées visuellement à la base
        const isSub = detail.isSMHSubLine === true;
        const subClass = isSub ? ' smh-sub-line' : '';
        const subPrefix = isSub ? '↳ ' : '';
        const displayLabel = simplifyResultDisplayLabel(detail.label);
        detailsHTML += `
            <div class="result-detail-item${subClass}">
                <span class="result-detail-label">
                    <span class="result-detail-label-text">${subPrefix}${displayLabel}${accordBadge}</span>
                    <span class="result-detail-info-icon tooltip-trigger" data-tippy-content="${tipAttr}" data-tippy-allowHTML="true" aria-label="Détails">i</span>
                </span>
                <span class="result-detail-value ${valueClass}">${prefix}${formatMoney(detail.value)}</span>
            </div>
        `;
    });

    // Ligne total si plusieurs éléments
    if (aggregatedDetails.length > 1) {
        detailsHTML += `
            <div class="result-detail-item total-row">
                <span class="result-detail-label"><strong>Total annuel brut</strong></span>
                <span class="result-detail-value"><strong>${formatMoney(remuneration.total)}</strong></span>
            </div>
        `;
    }

    if (detailsContainer) {
        detailsContainer.innerHTML = detailsHTML;
        if (typeof initTooltips === 'function') initTooltips();
    }

    // Hint informatif
    updateHintDisplay(remuneration);
}

/**
 * Agréger les détails de rémunération pour épurer l'affichage.
 * Séparation CCN / Accord d'entreprise : le badge accord ne s'affiche que sur les lignes 100 % accord.
 */
function aggregateRemunerationDetails(details) {
    const conventionLabel = window.LABELS?.conventionLabel || 'Convention collective de la métallurgie (CCN)';
    const aggregated = [];
    let majorationsCCN = 0;
    let majorationsAccord = 0;
    const majorationsBreakdownCCN = [];
    const majorationsBreakdownAccord = [];
    const smhSubLines = []; // Primes incluses dans le SMH (Art. 140) — sous-lignes rattachées à la base
    const isAccordDetail = (d) => !!d.isAgreement;
    let baseLineIndex = -1;

    details.forEach(detail => {
        // SMH de base toujours affiché (avec origine pour tooltip)
        if (detail.isBase) {
            aggregated.push({
                ...detail,
                tooltipOrigin: window.LABELS?.baseSalaryOriginLabel || 'Assiette salaire minima (SMH, Art. 140 CCN)',
                tooltipDetail: window.LABELS?.baseSalaryTooltipDetail || 'Salaire de base retenu dans l\'assiette du salaire minima hiérarchique (SMH).'
            });
            if (baseLineIndex === -1) {
                baseLineIndex = aggregated.length - 1;
            }
        }
        // Primes incluses dans le SMH (Art. 140) : sous-lignes rattachées à la base SMH
        else if (detail.isSMHIncluded) {
            const rawLabel = String(detail.label || '');
            const isAncienneteSurplus = /surplus entreprise inclus/i.test(rawLabel);
            const compactLabel = isAncienneteSurplus
                ? 'dont Prime ancienneté (surplus entreprise)'
                : `dont ${rawLabel}`;
            const compactTooltip = isAncienneteSurplus
                ? `Calcul : ${rawLabel}. Seul le surplus entreprise (au-delà de la référence branche) est inclus dans l'assiette SMH.`
                : `${rawLabel} — ${window.LABELS?.smhIncludedTooltipDetailSuffix || 'Répartie dans le SMH, sans ajout au total.'}`;
            // Prime incluse dans le SMH (Art. 140) : ne s'ajoute PAS au total, c'est une distribution
            // du salaire permettant d'atteindre le SMH grille. Affichée en sous-ligne informative.
            // Le mois de versement est déjà dans detail.label (ex. "Prime de vacances Kuhn (juillet)")
            smhSubLines.push({
                label: compactLabel,
                value: detail.value,
                isPositive: false,
                isAgreement: isAccordDetail(detail),
                isSMHSubLine: true,
                tooltipOrigin: window.LABELS?.smhIncludedOriginLabel || 'Incluse dans le salaire minima (Art. 140 CCN) — ne s\'ajoute pas au total',
                tooltipDetail: compactTooltip
            });
        }
        // Agréger les majorations en CCN vs accord
        else if (detail.label.includes('Majoration') || detail.label.includes('Forfait')) {
            if (isAccordDetail(detail)) {
                majorationsAccord += detail.value;
                majorationsBreakdownAccord.push({ label: detail.label, value: detail.value, isAgreement: true });
            } else {
                majorationsCCN += detail.value;
                majorationsBreakdownCCN.push({ label: detail.label, value: detail.value, isAgreement: false });
            }
        }
        // Primes hors SMH : afficher une ligne par prime (CCN et accord)
        else if (detail.isPositive && !detail.isBase) {
            const isPrimeDetail = (detail.semanticId && String(detail.semanticId).startsWith('prime'))
                || /prime/i.test(detail.label || '');
            if (isPrimeDetail) {
                const fallbackOrigin = isAccordDetail(detail)
                    ? `Accord d'entreprise ${getAccordNomCourt(typeof window.AgreementLoader?.getActiveAgreement === 'function' ? window.AgreementLoader.getActiveAgreement() : null) || 'accord'}`
                    : conventionLabel;
                aggregated.push({
                    ...detail,
                    tooltipOrigin: classifyOriginFromSourceArticle(detail.sourceArticle, fallbackOrigin),
                    tooltipDetail: detail.label
                });
            } else {
                const fallbackOrigin = isAccordDetail(detail)
                    ? `Accord d'entreprise ${getAccordNomCourt(typeof window.AgreementLoader?.getActiveAgreement === 'function' ? window.AgreementLoader.getActiveAgreement() : null) || 'accord'}`
                    : conventionLabel;
                aggregated.push({
                    ...detail,
                    tooltipOrigin: classifyOriginFromSourceArticle(detail.sourceArticle, fallbackOrigin),
                    tooltipDetail: detail.label
                });
            }
        }
    });

    // Insérer les sous-lignes SMH juste après la ligne de base (rattachées visuellement).
    // Important: éviter qu'elles apparaissent sous une autre prime (ex: prime d'équipe).
    if (smhSubLines.length > 0) {
        if (baseLineIndex >= 0) {
            aggregated.splice(baseLineIndex + 1, 0, ...smhSubLines);
        } else {
            aggregated.unshift(...smhSubLines);
        }
    }

    const agreement = typeof window.AgreementLoader?.getActiveAgreement === 'function' ? window.AgreementLoader.getActiveAgreement() : null;
    const nomAccord = getAccordNomCourt(agreement) || 'accord';

    // Lignes agrégées séparées CCN / Accord d'entreprise (badge + tooltip pour l'origine)
    if (majorationsCCN > 0) {
        aggregated.push({
            label: 'Majorations et forfaits',
            value: majorationsCCN,
            isPositive: true,
            isAgreement: false,
            tooltipOrigin: conventionLabel,
            breakdown: majorationsBreakdownCCN
        });
    }
    if (majorationsAccord > 0) {
        aggregated.push({
            label: 'Majorations et forfaits',
            value: majorationsAccord,
            isPositive: true,
            isAgreement: true,
            tooltipOrigin: `Accord d'entreprise ${nomAccord}`,
            breakdown: majorationsBreakdownAccord
        });
    }

    return aggregated;
}

/**
 * Mettre à jour les hints informatifs (plusieurs peuvent s'afficher)
 */
function updateHintDisplay(remuneration) {
    const container = document.getElementById('hints-container');
    if (!container) return;
    
    const hints = [];
    
    // Compter les éléments appliqués (accord = isAgreement)
    const accordDetails = remuneration.details.filter(d => !!d.isAgreement);
    const hasMajorations = remuneration.details.some(d =>
        d.label.includes('nuit') || d.label.includes('dimanche') || d.label.includes('équipe')
    );
    const hasAccordElements = accordDetails.length > 0;
    const agreement = typeof window.AgreementLoader?.getActiveAgreement === 'function' ? window.AgreementLoader.getActiveAgreement() : null;
    const nomAccord = getAccordNomCourt(agreement) || 'accord';

    // === HINT 1: Barème salariés débutants ===
    if (remuneration.scenario === 'cadre-debutant') {
        const smhStandard = CONFIG.SMH[remuneration.classe];
        hints.push({
            type: 'warning',
            content: `
                <strong>📋 Barème salariés débutants</strong><br>
                Classe ${remuneration.groupe}${remuneration.classe} avec moins de 6 ans d'expérience professionnelle.<br>
                <small>SMH standard (${formatMoney(smhStandard)}) applicable à partir de 6 ans d'expérience.</small>
            `
        });
    }
    
    // === HINT 2: Accord d'entreprise ===
    if (state.accordActif && hasAccordElements && agreement) {
        // Résumer les éléments accord appliqués (dynamique, sans keywords hardcodés)
        const elementsAccord = accordDetails.map(d => {
            // Extraire un nom court depuis le label (supprimer les détails entre parenthèses)
            const short = (d.label || '').replace(/\s*\(.*$/, '').trim();
            return short || null;
        }).filter(Boolean);
        const listeElements = [...new Set(elementsAccord)].join(', ');
        const descTaux = agreement.tooltip ? agreement.tooltip : `Taux et primes selon l'accord ${nomAccord}.`;
        hints.push({
            type: 'success',
            content: `
                <strong>🏢 Accord ${nomAccord} appliqué</strong><br>
                Éléments : ${listeElements}.<br>
                <small>${descTaux}</small>
            `
        });
    } else if (hasMajorations && !state.accordActif) {
        const pctNuitCCN = Math.round((CONFIG.MAJORATIONS_CCN?.nuit ?? 0.15) * 100);
        const pctDimCCN = Math.round((CONFIG.MAJORATIONS_CCN?.dimanche ?? 1) * 100);
        hints.push({
            type: 'info',
            content: `
                <strong>Majorations CCN appliquées</strong><br>
                Taux CCN : nuit +${pctNuitCCN}%, dimanche +${pctDimCCN}%.<br>
                <small>Activez un accord d'entreprise pour les taux entreprise.</small>
            `
        });
    }
    
    // === HINT PAR DÉFAUT si aucun autre ===
    if (hints.length === 0) {
        const isCadre = typeof remuneration.classe === 'number' && remuneration.classe >= CONFIG.SEUIL_CADRE;
        if (isCadre) {
            // Cadres : pas de prime d'ancienneté CCN, message neutre
            hints.push({
                type: 'info',
                content: 'Ce montant est le minimum conventionnel.'
            });
        } else {
            // Non-cadres : prime d'ancienneté CCN (ou accord si accord actif)
            const agreementAnc = typeof window.AgreementLoader?.getActiveAgreement === 'function' ? window.AgreementLoader.getActiveAgreement() : null;
            const seuilAccord = agreementAnc?.anciennete?.seuil;
            const seuilAnc = state.accordActif && typeof seuilAccord === 'number' ? `${seuilAccord} ans (${agreementAnc?.nomCourt || 'accord'})` : '3 ans (CCN)';
            const hasAnciennete = state.anciennete >= 3 || (state.accordActif && typeof seuilAccord === 'number' && state.anciennete >= seuilAccord);
            hints.push({
                type: 'info',
                content: hasAnciennete
                    ? `Ce montant est le minimum conventionnel. Prime d'ancienneté incluse.`
                    : `Ce montant est le minimum conventionnel. Prime d'ancienneté à partir de ${seuilAnc}.`
            });
        }
    }
    
    // Générer le HTML
    container.innerHTML = hints.map(hint => `
        <div class="book-hint ${hint.type}">
            <p>${hint.content}</p>
        </div>
    `).join('');
}

/**
 * Afficher un message temporaire (toast)
 * @param {string} message - Message à afficher
 * @param {string} type - Type de message ('info', 'warning', 'success')
 * @param {number} duration - Durée d'affichage en ms (défaut: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    // Créer l'élément toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Ajouter au body
    document.body.appendChild(toast);
    
    // Animation d'entrée
    requestAnimationFrame(() => {
        toast.classList.add('toast-visible');
    });
    
    // Supprimer après la durée spécifiée
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300); // Attendre la fin de l'animation de sortie
    }, duration);
}

/**
 * ============================================
 * TOOLTIPS (TIPPY.JS)
 * ============================================
 */
function initTooltips() {
    // Initialiser tous les tooltips et stocker l'instance sur chaque élément pour mises à jour dynamiques (ex. header info + accord)
    const elements = document.querySelectorAll('[data-tippy-content]');
    elements.forEach((el) => {
        if (el._tippy) {
            el._tippy.destroy();
            el._tippy = null;
        }
        const instances = tippy(el, {
            theme: 'metallurgie',
            animation: 'shift-away',
            duration: [200, 150],
            arrow: true,
            maxWidth: 300,
            interactive: true,
            allowHTML: true,
            appendTo: document.body
        });
        if (instances && instances[0]) el._tippy = instances[0];
    });
    
    // Empêcher la propagation des clics sur les tooltips pour éviter de déclencher les actions parentes
    // Ajouter un gestionnaire directement sur chaque tooltip
    document.querySelectorAll('.tooltip-trigger, .tooltip-trigger__light').forEach(tooltip => {
        tooltip.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault(); // Empêcher aussi le comportement par défaut (ex: activation du label)
        });
    });
    
    // Gestionnaire global en phase de capture pour intercepter aussi les clics sur les enfants du tooltip
    document.addEventListener('click', (e) => {
        const tooltipElement = e.target.closest('.tooltip-trigger, .tooltip-trigger__light');
        if (tooltipElement) {
            e.stopPropagation();
            e.preventDefault();
        }
    }, true);
}

/**
 * ============================================
 * UTILITAIRES
 * ============================================
 */
/**
 * Formater un montant avec espaces comme séparateurs de milliers (ex: "35 000 €").
 * Conforme PRD : pas de slash, format français.
 */
function formatMoney(amount) {
    const n = Math.round(Number(amount));
    const s = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: true
    }).format(n);
    return s.replace(/\u202f/g, ' ') + ' €';
}

/**
 * Formater un montant pour le PDF (espaces comme séparateurs de milliers, ex: "35 000 €").
 */
function formatMoneyPDF(amount) {
    const n = Math.round(Number(amount));
    const s = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: true
    }).format(n);
    return s.replace(/\u202f/g, ' ') + ' €';
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Exposer certaines fonctions pour le debug
window.SimulateurMetallurgie = {
    state,
    calculateClassification,
    calculateRemuneration,
    CONFIG
};

/**
 * ============================================
 * GRAPHIQUE ÉVOLUTION SALAIRE VS INFLATION
 * ============================================
 */

let evolutionChart = null;
let inflationData = null;
let inflationSource = 'Données locales';
let inflationPeriod = '';
let isUpdatingChart = false;

/**
 * Récupérer les données d'inflation depuis plusieurs sources officielles
 */
async function fetchInflationData() {
    // 1. Essayer l'API Banque Mondiale (source officielle internationale)
    try {
        const response = await fetch(
            `https://api.worldbank.org/v2/country/FR/indicator/FP.CPI.TOTL.ZG?format=json&date=1975:${new Date().getFullYear()}`,
            { signal: AbortSignal.timeout(5000) }
        );
        
        if (response.ok) {
            const data = await response.json();
            
            if (data && data[1] && data[1].length > 0) {
                const inflation = {};
                data[1].forEach(item => {
                    if (item.value !== null) {
                        inflation[item.date] = parseFloat(item.value.toFixed(2));
                    }
                });
                
                if (Object.keys(inflation).length >= 5) {
                    const years = Object.keys(inflation).map(Number).sort((a, b) => a - b);
                    inflationSource = 'Banque Mondiale';
                    inflationPeriod = `${years[0]}-${years[years.length - 1]}`;
                    console.log('Données inflation Banque Mondiale chargées:', inflation);
                    return inflation;
                }
            }
        }
    } catch (error) {
        console.warn('API Banque Mondiale non disponible:', error.message);
    }
    
    // 2. Données de secours INSEE (source officielle France - mise à jour manuellement)
    console.log('Utilisation des données INSEE de secours');
    inflationSource = 'INSEE (données intégrées)';
    inflationPeriod = '2010-2025';
    return {
        // Source: INSEE - Indice des prix à la consommation - France
        2025: 1.8, // Projection BCE
        2024: 2.0,
        2023: 4.9,
        2022: 5.2,
        2021: 1.6,
        2020: 0.5,
        2019: 1.1,
        2018: 1.8,
        2017: 1.0,
        2016: 0.2,
        2015: 0.0,
        2014: 0.5,
        2013: 0.9,
        2012: 2.0,
        2011: 2.1,
        2010: 1.5
    };
}

/**
 * Synchroniser le graphique avec les données actuelles (si visible)
 */
async function syncEvolutionChart() {
    // Vérifier si le bloc <details> d'évolution est ouvert
    const evolutionDetails = document.querySelector('.evolution-details');
    if (!evolutionDetails || !evolutionDetails.open) return;
    if (isUpdatingChart) return; // Éviter les appels multiples simultanés
    
    isUpdatingChart = true;
    
    try {
        const yearsSelect = document.getElementById('projection-years');
        const ageInput = document.getElementById('age-actuel');
        
        let years;
        if (yearsSelect.value === 'retraite') {
            const age = parseInt(ageInput.value) || 30;
            years = getYearsToRetirement(age);
        } else {
            years = parseInt(yearsSelect.value);
        }
        
        await updateEvolutionChart(years);
    } finally {
        isUpdatingChart = false;
    }
}

/**
 * Calculer la moyenne de l'inflation
 */
function getAverageInflation(inflationData) {
    const values = Object.values(inflationData);
    if (values.length === 0) return 2.0; // Valeur par défaut
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculer l'évolution du salaire sur N années
 * RÉUTILISE le moteur de simulation existant (calculateRemuneration)
 */
function calculateSalaryEvolution(years, augmentationAnnuelle = 0) {
    const currentYear = new Date().getFullYear();
    
    // Sauvegarder l'état actuel
    const savedState = {
        anciennete: state.anciennete,
        experiencePro: state.experiencePro
    };
    
    const evolution = [];
    
    for (let i = 0; i <= years; i++) {
        const year = currentYear + i;
        
        // Modifier temporairement l'état pour simuler l'année i
        state.anciennete = savedState.anciennete + i;
        state.experiencePro = savedState.experiencePro + i;
        
        // Utiliser le moteur de calcul existant
        const remuneration = calculateRemuneration();
        
        // Appliquer l'augmentation générale cumulée
        // L'augmentation s'applique sur le total hors primes fixes (vacances)
        const augmentationFactor = Math.pow(1 + augmentationAnnuelle / 100, i);
        
        // Séparer les éléments fixes (primes à versement unique hors SMH) des éléments proportionnels
        // Les primes incluses dans le SMH (Art. 140) ne sont PAS dans le total → ne pas les soustraire
        let salaryVariable = remuneration.total;
        let salaryFixe = 0;
        if (state.accordActif && typeof window.getMontantPrimesFixesAnnuelFromModules === 'function') {
            const totalFixe = window.getMontantPrimesFixesAnnuelFromModules(state);
            const fixeSMH = window.getMontantPrimesFixesAnnuelFromModules(state, { smhOnly: true }) || 0;
            salaryFixe = totalFixe - fixeSMH; // Seulement les primes fixes hors SMH
            salaryVariable -= salaryFixe;
        }
        
        // Appliquer l'augmentation sur la partie variable uniquement
        const salary = Math.round(salaryVariable * augmentationFactor + salaryFixe);
        
        evolution.push({
            year,
            anciennete: state.anciennete,
            salary
        });
    }
    
    // Restaurer l'état original
    state.anciennete = savedState.anciennete;
    state.experiencePro = savedState.experiencePro;
    
    return evolution;
}

/**
 * Calculer l'évolution avec inflation (pouvoir d'achat)
 */
function calculateInflationEvolution(years, avgInflation) {
    const remuneration = calculateRemuneration();
    const initialSalary = remuneration.total;
    
    const evolution = [];
    const currentYear = new Date().getFullYear();
    
    for (let i = 0; i <= years; i++) {
        // Valeur du salaire initial ajustée à l'inflation
        // Pour maintenir le même pouvoir d'achat, il faudrait ce montant
        const inflationFactor = Math.pow(1 + avgInflation / 100, i);
        const adjustedSalary = Math.round(initialSalary * inflationFactor);
        
        evolution.push({
            year: currentYear + i,
            salary: adjustedSalary
        });
    }
    
    return evolution;
}

/**
 * Créer ou mettre à jour le graphique
 */
async function updateEvolutionChart(years) {
    // Charger les données d'inflation si nécessaire
    if (!inflationData) {
        inflationData = await fetchInflationData();
    }
    
    // Lire le taux d'augmentation annuelle
    const augmentationInput = document.getElementById('augmentation-annuelle');
    const augmentationAnnuelle = augmentationInput ? parseDecimalInput(augmentationInput.value, 0) : 0;
    
    const avgInflation = getAverageInflation(inflationData);
    const salaryEvolution = calculateSalaryEvolution(years, augmentationAnnuelle);
    const inflationEvolution = calculateInflationEvolution(years, avgInflation);
    
    const labels = salaryEvolution.map(d => d.year);
    const salaryDataArray = salaryEvolution.map(d => d.salary);
    const inflationDataArray = inflationEvolution.map(d => d.salary);
    
    const canvas = document.getElementById('evolution-chart');
    if (!canvas) {
        console.error('Canvas evolution-chart non trouvé');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Vérifier que Chart.js est chargé
    if (typeof Chart === 'undefined') {
        console.error('Chart.js non chargé');
        document.getElementById('evolution-summary').innerHTML = 
            '<span style="color: #dc2626">Erreur : bibliothèque de graphique non chargée.</span>';
        return;
    }
    
    if (evolutionChart) {
        evolutionChart.destroy();
    }
    
    // Détecter si on est sur mobile
    const isMobile = window.innerWidth <= 768;
    const isSmallMobile = window.innerWidth <= 480;
    
    // Construire le label du salaire selon si augmentation ou non (plus court sur mobile)
    let salaryLabel, inflationLabel;
    if (isMobile) {
        salaryLabel = augmentationAnnuelle > 0 ? `Salaire (+${augmentationAnnuelle}%/an)` : 'Votre salaire';
        inflationLabel = `Inflation (${avgInflation.toFixed(1)}%/an)`;
    } else {
        salaryLabel = 'Votre salaire (ancienneté';
        if (augmentationAnnuelle > 0) {
            salaryLabel += ` + ${augmentationAnnuelle}%/an`;
        }
        salaryLabel += ')';
        inflationLabel = `Inflation cumulée (${avgInflation.toFixed(1)}%/an moy.)`;
    }
    
    evolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: salaryLabel,
                    data: salaryDataArray,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.15)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: isMobile ? 3 : 2,
                    pointRadius: isMobile ? 0 : (years > 20 ? 2 : 4),
                    pointHoverRadius: 6
                },
                {
                    label: inflationLabel,
                    data: inflationDataArray,
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: isMobile ? 2 : 2,
                    borderDash: [5, 5],
                    pointRadius: isMobile ? 0 : (years > 20 ? 1 : 3),
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: isMobile ? 20 : 12,
                        boxHeight: isMobile ? 3 : 12,
                        padding: isMobile ? 15 : 10,
                        font: { size: isMobile ? 12 : 11 },
                        usePointStyle: !isMobile
                    }
                },
                tooltip: {
                    enabled: true,
                    titleFont: { size: isMobile ? 14 : 12 },
                    bodyFont: { size: isMobile ? 13 : 12 },
                    padding: isMobile ? 12 : 8,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatMoney(context.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxTicksLimit: isMobile ? (isSmallMobile ? 5 : 7) : (years > 20 ? 10 : 15),
                        font: { size: isMobile ? 11 : 10 },
                        maxRotation: isMobile ? 0 : 45
                    },
                    grid: {
                        display: !isMobile
                    }
                },
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            // Format plus court sur mobile
                            if (isMobile && value >= 1000) {
                                return Math.round(value / 1000) + 'k€';
                            }
                            return formatMoney(value);
                        },
                        font: { size: isMobile ? 11 : 10 },
                        maxTicksLimit: isMobile ? 6 : 8
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
    
    // Mettre à jour le résumé
    const finalSalary = salaryDataArray[salaryDataArray.length - 1];
    const finalInflation = inflationDataArray[inflationDataArray.length - 1];
    const diffPercent = ((finalSalary / finalInflation - 1) * 100).toFixed(1);
    
    const summaryEl = document.getElementById('evolution-summary');
    const yearsLabel = years === 1 ? '1 an' : `${years} ans`;
    
    if (parseFloat(diffPercent) >= 0) {
        summaryEl.innerHTML = `Dans ${yearsLabel} : <strong>${formatMoney(finalSalary)}</strong> soit <span style="color: #16a34a">+${diffPercent}%</span> vs inflation.`;
    } else {
        summaryEl.innerHTML = `Dans ${yearsLabel} : <strong>${formatMoney(finalSalary)}</strong> soit <span style="color: #dc2626">${diffPercent}%</span> vs inflation.`;
    }
    
    // Mettre à jour la source des données
    const sourceEl = document.getElementById('inflation-source');
    if (sourceEl) {
        const periodText = inflationPeriod ? ` (${inflationPeriod})` : '';
        sourceEl.textContent = `Inflation : ${inflationSource}${periodText}`;
    }
}

/**
 * Calculer le nombre d'années jusqu'à la retraite
 */
function getYearsToRetirement(currentAge) {
    const retirementAge = 64; // Âge légal de départ en France (2024+)
    return Math.max(1, retirementAge - currentAge);
}

/**
 * Initialiser les contrôles du graphique
 */
function initEvolutionChart() {
    const evolutionDetails = document.querySelector('.evolution-details');
    const yearsSelect = document.getElementById('projection-years');
    const ageInputWrapper = document.getElementById('age-input-wrapper');
    const ageInput = document.getElementById('age-actuel');
    
    if (!yearsSelect) return;
    
    // Fonction pour obtenir le nombre d'années à projeter
    const getProjectionYears = () => {
        const value = yearsSelect.value;
        if (value === 'retraite') {
            const age = parseInt(ageInput?.value) || 30;
            return getYearsToRetirement(age);
        }
        return parseInt(value);
    };
    
    // Afficher/masquer le champ d'âge selon la sélection
    const updateAgeInputVisibility = () => {
        if (ageInputWrapper) {
            if (yearsSelect.value === 'retraite') {
                ageInputWrapper.classList.remove('hidden');
            } else {
                ageInputWrapper.classList.add('hidden');
            }
        }
    };
    
    // Gérer l'ouverture du détails d'évolution
    if (evolutionDetails) {
        evolutionDetails.addEventListener('toggle', async (e) => {
            if (e.target.open) {
                updateAgeInputVisibility();
                await updateEvolutionChart(getProjectionYears());
            }
        });
    }
    
    yearsSelect.addEventListener('change', async () => {
        updateAgeInputVisibility();
        // Mettre à jour seulement si le panneau est ouvert
        if (evolutionDetails?.open) {
            await updateEvolutionChart(getProjectionYears());
        }
    });
    
    // Mettre à jour le graphique quand l'âge change
    if (ageInput) {
        ageInput.addEventListener('change', async () => {
            if (yearsSelect.value === 'retraite' && evolutionDetails?.open) {
                await updateEvolutionChart(getProjectionYears());
            }
        });
    }
    
    // Mettre à jour le graphique quand l'augmentation annuelle change
    const augmentationInput = document.getElementById('augmentation-annuelle');
    if (augmentationInput) {
        augmentationInput.addEventListener('input', async () => {
            if (evolutionDetails?.open) {
                await updateEvolutionChart(getProjectionYears());
            }
        });
    }
}

/**
 * ============================================
 * RAPPORT ARRIÉRÉS DE SALAIRE
 * ============================================
 */

/**
 * Mettre à jour la date d'embauche (page 4) à partir de l'ancienneté (page 2).
 * Garde les champs liés ancienneté / date d'embauche cohérents.
 */
function updateDateEmbaucheFromAnciennete() {
    const dateEmbaucheInput = document.getElementById('date-embauche-arretees');
    if (!dateEmbaucheInput) return;
    if (state.anciennete <= 0) {
        dateEmbaucheInput.value = '';
        state.dateEmbaucheArretees = null;
        invalidateArreteesDataFinal();
        if (typeof updateArreteesUiFromDateEmbauche === 'function') updateArreteesUiFromDateEmbauche();
        return;
    }
    const aujourdhui = new Date();
    const dateEmbauche = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
    dateEmbauche.setFullYear(dateEmbauche.getFullYear() - Math.floor(state.anciennete));
    const moisSupplementaires = Math.floor((state.anciennete % 1) * 12);
    dateEmbauche.setMonth(dateEmbauche.getMonth() - moisSupplementaires);
    const dateStr = dateEmbauche.toISOString().split('T')[0];
    dateEmbaucheInput.value = dateStr;
    state.dateEmbaucheArretees = dateStr;
    invalidateArreteesDataFinal();
}

/**
 * Initialiser les contrôles du rapport d'arriérés
 */
/**
 * ============================================
 * ARRIÉRÉS DE SALAIRE - NOUVELLE VERSION (Étape 4)
 * ============================================
 */

/**
 * Invalide les données arriérés utilisées pour le PDF (date d'embauche, rupture ou classification modifiée).
 * À appeler avant initTimeline() quand un paramètre du calcul change, pour forcer un nouveau calcul avant génération PDF.
 */
function invalidateArreteesDataFinal() {
    window.arreteesDataFinal = null;
}

/**
 * Met à jour la visibilité du bloc « Saisie de vos salaires » et du bouton « Calculer les arriérés »
 * selon que la date d'embauche est valide et complète. Utilise la validation native (validity.valid)
 * du champ type="date" : année à 4 chiffres et date complète exigées.
 * Synchronise aussi l'ancienneté (page 2) avec la date d'embauche pour garder les champs liés cohérents.
 */
function updateArreteesUiFromDateEmbauche() {
    const input = document.getElementById('date-embauche-arretees');
    const container = document.getElementById('salary-curve-container');
    const stickyWrap = document.getElementById('arretees-calc-sticky');
    const warning = document.getElementById('arretees-warning');
    if (!input || !container) return;
    const val = (input.value || '').trim();
    const dateObj = val ? new Date(val) : null;
    const isValid = dateObj && !isNaN(dateObj.getTime());
    if (isValid) {
        const prevVal = state.dateEmbaucheArretees;
        state.dateEmbaucheArretees = val;
        if (prevVal !== val) invalidateArreteesDataFinal();
        const anneesDecimal = (Date.now() - dateObj.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        const ancienneteAnnee = Math.max(0, Math.floor(anneesDecimal));
        if (state.anciennete !== ancienneteAnnee) {
            state.anciennete = ancienneteAnnee;
            const ancienneteInput = document.getElementById('anciennete');
            if (ancienneteInput) ancienneteInput.value = ancienneteAnnee;
            const experienceProInput = document.getElementById('experience-pro');
            if (experienceProInput && state.experiencePro < state.anciennete) {
                state.experiencePro = state.anciennete;
                experienceProInput.value = state.anciennete;
                if (typeof updateExperienceProValidation === 'function') updateExperienceProValidation();
            }
            updateAll();
        }
        container.classList.remove('hidden');
        if (stickyWrap) stickyWrap.classList.remove('hidden');
        if (warning) warning.classList.add('hidden');
        initTimeline();
    } else if (!val) {
        container.classList.add('hidden');
        if (stickyWrap) stickyWrap.classList.add('hidden');
    }
}

/**
 * Initialiser les contrôles de l'étape 4
 */
function initArreteesNew() {
    // Date d'embauche
    const dateEmbaucheInput = document.getElementById('date-embauche-arretees');
    if (dateEmbaucheInput) {
        // Pré-remplir depuis l'ancienneté si disponible et si le champ est vide
        if (!dateEmbaucheInput.value && state.anciennete > 0) {
            const aujourdhui = new Date();
            // Calculer la date d'embauche en soustrayant l'ancienneté (années complètes)
            // On utilise le 1er du mois actuel comme référence pour simplifier
            const dateEmbauche = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
            dateEmbauche.setFullYear(dateEmbauche.getFullYear() - Math.floor(state.anciennete));
            // Soustraire aussi les mois supplémentaires si l'ancienneté a des décimales
            const moisSupplementaires = Math.floor((state.anciennete % 1) * 12);
            dateEmbauche.setMonth(dateEmbauche.getMonth() - moisSupplementaires);
            dateEmbaucheInput.value = dateEmbauche.toISOString().split('T')[0];
        }
        
        // Un seul événement 'change' : évite les mises à jour pendant la saisie (mois/jour) qui faisaient disparaître le graphique
        dateEmbaucheInput.addEventListener('change', updateArreteesUiFromDateEmbauche);
        updateArreteesUiFromDateEmbauche();
    }

    // Date de changement de classification
    const dateChangementInput = document.getElementById('date-changement-classification-arretees');
    if (dateChangementInput) {
        dateChangementInput.addEventListener('change', () => {
            const prev = state.dateChangementClassificationArretees;
            state.dateChangementClassificationArretees = dateChangementInput.value;
            if (dateChangementInput.value && prev !== dateChangementInput.value) {
                invalidateArreteesDataFinal();
            }
            if (dateChangementInput.value) initTimeline();
        });
    }

    // Rupture de contrat
    const ruptureCheckbox = document.getElementById('rupture-contrat-arretees');
    const dateRuptureGroup = document.getElementById('date-rupture-group-arretees');
    const dateRuptureInput = document.getElementById('date-rupture-arretees');
    
    if (ruptureCheckbox) {
        ruptureCheckbox.addEventListener('change', () => {
            state.ruptureContratArretees = ruptureCheckbox.checked;
            invalidateArreteesDataFinal();
            if (dateRuptureGroup) {
                if (ruptureCheckbox.checked) {
                    dateRuptureGroup.classList.remove('hidden');
                } else {
                    dateRuptureGroup.classList.add('hidden');
                    state.dateRuptureArretees = null;
                }
            }
            if (dateRuptureInput && ruptureCheckbox.checked) {
                dateRuptureInput.addEventListener('change', () => {
                    const prev = state.dateRuptureArretees;
                    state.dateRuptureArretees = dateRuptureInput.value;
                    if (prev !== dateRuptureInput.value) invalidateArreteesDataFinal();
                    initTimeline();
                });
            }
        });
    }

    // Accord écrit
    const accordEcritCheckbox = document.getElementById('accord-ecrit-arretees');
    if (accordEcritCheckbox) {
        accordEcritCheckbox.addEventListener('change', () => {
            state.accordEcritArretees = accordEcritCheckbox.checked;
        });
    }

    // SMH seul pour les arriérés (assiette SMH Art. 140 : base + forfait ; primes inclusDansSMH gérées dans distribution mensuelle)
    const arreteesSmhSeulCheckbox = document.getElementById('arretees-smh-seul');
    if (arreteesSmhSeulCheckbox) {
        state.arretesSurSMHSeul = arreteesSmhSeulCheckbox.checked;
        updateArreteesSalaireHint();
        arreteesSmhSeulCheckbox.addEventListener('change', () => {
            state.arretesSurSMHSeul = arreteesSmhSeulCheckbox.checked;
            updateArreteesSalaireHint();
            initTimeline();
        });
    }
}

/**
 * Met à jour le texte d'avertissement "salaire brut" selon l'option SMH seul,
 * pour rappeler à l'utilisateur quels éléments inclure/exclure (Art. 140 CCNM).
 */
function updateArreteesSalaireHint() {
    const el = document.getElementById('arretees-salaire-hint');
    if (!el) return;
    const p = el.querySelector('p');
    if (!p) return;
    if (state.arretesSurSMHSeul) {
        p.innerHTML = buildSmhHintHtml();
    } else {
        p.innerHTML = (window.LABELS && window.LABELS.arreteesSalaireBrutFullHintHtml)
            ? window.LABELS.arreteesSalaireBrutFullHintHtml
            : '<strong>Attention :</strong> Indiquez le <strong>total brut</strong> du bulletin (y compris primes) pour comparer à la rémunération complète.';
    }
    updateArreteesSmhTooltip();
}

function getSmhScopeDynamic(options = {}) {
    const includeOnlyActivePrimes = options.includeOnlyActivePrimes !== false;
    const compactLabels = options.compactLabels === true;
    const agreement = (typeof window.AgreementLoader?.getActiveAgreement === 'function')
        ? window.AgreementLoader.getActiveAgreement() : null;
    const isAccordActif = !!(state.accordActif && agreement);
    const classification = getActiveClassification();
    const isCadre = classification.classe >= CONFIG.SEUIL_CADRE;
    const isForfaitJoursCadre = isCadre && state.forfait === 'jours';
    const primes = isAccordActif && Array.isArray(agreement?.primes) ? agreement.primes : [];
    const included = [];
    const excluded = [];

    const formatScopeLabel = (rawLabel) => {
        const input = String(rawLabel || '').trim();
        if (!input) return '';
        if (!compactLabels) return input;
        // Mode compact: retirer uniquement les détails de calcul entre parenthèses.
        return simplifyResultDisplayLabel(
            input.replace(/\s*\([^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim()
        );
    };
    const addUnique = (arr, label) => {
        const formatted = formatScopeLabel(label);
        if (!formatted) return;
        const normalized = formatted.toLowerCase();
        if (arr.some((v) => String(v).toLowerCase() === normalized)) return;
        arr.push(formatted);
    };

    // Primes accord dynamiques selon inclusDansSMH.
    for (const p of primes) {
        const actif = p.stateKeyActif ? (state.accordInputs?.[p.stateKeyActif] === true || state[p.stateKeyActif] === true) : true;
        if (includeOnlyActivePrimes && !actif) continue;
        if (p.inclusDansSMH === true) addUnique(included, p.label.toLowerCase());
        else addUnique(excluded, p.label.toLowerCase());
    }

    // Base SMH : toujours présente dans l'assiette.
    addUnique(included, 'salaire de base');
    if (state.travailTempsPartiel === true) {
        const taux = Math.round((Number(state.tauxActivite) || (CONFIG.TAUX_ACTIVITE_DEFAUT ?? 100)) * 100) / 100;
        addUnique(included, `prorata temps partiel (${String(taux).replace('.', ',')}%)`);
    }

    // 13e mois et forfaits font partie du SMH.
    if (isAccordActif && agreement?.repartition13Mois?.actif && agreement?.repartition13Mois?.inclusDansSMH === true) {
        addUnique(included, '13e mois');
    }
    if (state.forfait === 'heures') addUnique(included, 'majoration forfait heures (+15%)');
    if (state.forfait === 'jours') addUnique(included, 'majoration forfait jours (+30%)');

    // Heures supplémentaires (si actives).
    if (!isForfaitJoursCadre && state.travailHeuresSup === true && Number(state.heuresSup || 0) > 0) {
        addUnique(included, 'majorations d\'heures supplémentaires');
    }

    const normalizePrimeKey = (value) => String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    const isPrimeAncienneteSemantic = (prime) => {
        const explicit = typeof prime?.semanticId === 'string' ? prime.semanticId.trim() : '';
        if (explicit) return explicit === 'primeAnciennete';
        const idKey = normalizePrimeKey(prime?.id);
        const labelKey = normalizePrimeKey(prime?.label);
        const key = `${idKey} ${labelKey}`;
        return key.includes('anciennete');
    };
    const getGlobalAncienneteInclusion = () => {
        const runtimeValue = (typeof window !== 'undefined' && window?.CONFIG?.ANCIENNETE)
            ? window.CONFIG.ANCIENNETE.inclusDansSMH
            : undefined;
        if (typeof runtimeValue === 'boolean') return runtimeValue;
        return CONFIG?.ANCIENNETE?.inclusDansSMH === true;
    };
    const resolveAccordAncienneteInclusion = () => {
        const primeOverride = primes.find(isPrimeAncienneteSemantic)?.inclusDansSMH;
        if (typeof primeOverride === 'boolean') return primeOverride;
        const accordOverride = agreement?.anciennete?.inclusDansSMH;
        if (typeof accordOverride === 'boolean') return accordOverride;
        return false;
    };

    // Ancienneté dynamiquement incluse/exclue selon paramétrage.
    const ancienneteCfg = (isAccordActif && agreement?.anciennete) ? agreement.anciennete : CONFIG.ANCIENNETE;
    const ancienneteIncluse = isAccordActif
        ? resolveAccordAncienneteInclusion()
        : getGlobalAncienneteInclusion();
    const seuilAnciennete = ancienneteCfg?.seuil ?? CONFIG.ANCIENNETE.seuil;
    const eligibleAnciennete = includeOnlyActivePrimes
        ? (isAccordActif
            ? ((agreement?.anciennete?.tousStatuts === true || !isCadre) && state.anciennete >= seuilAnciennete)
            : (!isCadre && state.anciennete >= seuilAnciennete))
        : true;
    if (eligibleAnciennete) {
        if (ancienneteIncluse) addUnique(included, 'prime d\'ancienneté');
        else addUnique(excluded, 'prime d\'ancienneté');
    }

    // Majorations de pénibilité / contraintes (si actives) hors SMH.
    if (state.typeNuit !== 'aucun' && Number(state.heuresNuit || 0) > 0) addUnique(excluded, 'majoration nuit');
    if (state.travailDimanche === true && Number(state.heuresDimanche || 0) > 0) addUnique(excluded, 'majoration dimanche');
    if (isForfaitJoursCadre && state.travailJoursSupForfait === true && Number(state.joursSupForfait || 0) > 0) {
        addUnique(excluded, 'rachat de jours de repos (forfait jours)');
    }
    const travailEquipeActif = (state.accordInputs?.travailEquipe === true || state.travailEquipe === true);
    const travailEquipeExiste = (!isCadre) || primes.some(p => String(p.id || '').toLowerCase().includes('equipe'));
    if ((includeOnlyActivePrimes && travailEquipeActif) || (!includeOnlyActivePrimes && travailEquipeExiste)) {
        addUnique(excluded, 'prime d\'équipe');
    }

    // Complément générique via le moteur de rémunération (anciens + nouveaux éléments actifs).
    // Permet d'éviter les oublis quand de nouvelles primes/majorations sont ajoutées.
    const remFull = calculateRemuneration();
    const fullDetails = Array.isArray(remFull?.details) ? remFull.details : [];
    for (const d of fullDetails) {
        const value = Number(d?.value || 0);
        if (!Number.isFinite(value) || value <= 0) continue;
        if (d?.isBase) continue;
        const label = String(d?.label || '').trim().toLowerCase();
        if (!label) continue;
        if (d?.isSMHIncluded === true) addUnique(included, label);
        else addUnique(excluded, label);
    }

    return { included, excluded };
}

/**
 * Construit dynamiquement le texte d'avertissement SMH en fonction des primes
 * de l'accord actif et de leur flag inclusDansSMH (Art. 140 CCNM).
 * @returns {string} HTML du hint
 */
function buildSmhHintHtml() {
    const { included, excluded } = getSmhScopeLabels();
    const includedLabel = included.length ? included.join(', ') : 'aucun élément additionnel actif';
    const excludedLabel = excluded.length ? excluded.join(', ') : 'aucun';
    return `<strong>Comment saisir votre brut (Art. 140 CCN)</strong><br><strong>Pris en compte</strong> : salaire minima + éléments inclus.<br><strong>À inclure</strong> : ${includedLabel}.<br><strong>À exclure</strong> : ${excludedLabel}.`;
}

function getSmhScopeLabels(options = {}) {
    const includeOnlyActivePrimes = options.includeOnlyActivePrimes !== false;
    const compactLabels = options.compactLabels !== false;
    return getSmhScopeDynamic({ includeOnlyActivePrimes, compactLabels });
}

/**
 * Version texte brut (sans HTML) du hint SMH pour les tooltips.
 * @returns {string}
 */
function buildSmhTooltipText() {
    // Même logique que le panneau d'information: éléments actifs + libellés compacts.
    const { included, excluded } = getSmhScopeLabels();
    const includedLines = included.length
        ? included.map((item) => `• ${item}`).join('<br>')
        : '• aucun élément additionnel actif';
    const excludedLines = excluded.length
        ? excluded.map((item) => `• ${item}`).join('<br>')
        : '• aucun';
    return `<strong>Salaire dû (salaire minima seul)</strong> : assiette SMH (Art. 140 CCN).<br><strong>À inclure :</strong><br>${includedLines}<br><strong>À exclure :</strong><br>${excludedLines}`;
}

function updateArreteesSmhTooltip() {
    const tooltipEl = document.getElementById('arretees-smh-seul-tooltip')
        || document.querySelector('#arretees-smh-seul + span.tooltip-trigger');
    if (!tooltipEl) return;
    const html = `${buildSmhTooltipText()}<br>Décochez pour comparer à la rémunération complète.`;
    tooltipEl.setAttribute('data-tippy-content', html);
    if (tooltipEl._tippy) tooltipEl._tippy.setContent(html);
}

/**
 * Générer la courbe interactive pour saisie des salaires
 */
let salaryCurveChart = null;
let currentPeriodIndex = 0;
let periodsData = [];
/** true quand l'utilisateur a « fermé » le bloc flottant en recliquant sur le point déjà sélectionné (ex. dernière date) */
let floatingBlockDismissed = false;

function initTimeline() {
    const container = document.getElementById('salary-curve-container');
    if (!container) return;

    const dateEmbauche = document.getElementById('date-embauche-arretees')?.value;
    const dateRupture = state.ruptureContratArretees && state.dateRuptureArretees 
        ? state.dateRuptureArretees 
        : null;
    const dateChangement = state.dateChangementClassificationArretees || null;

    const noDateMsg = document.getElementById('timeline-no-date-message');
    const chartWrapper = container.querySelector('.curve-chart-wrapper');

    if (!dateEmbauche) {
        if (noDateMsg) {
            const p = noDateMsg.querySelector('.timeline-help');
            if (p) {
                p.textContent = (window.LABELS && window.LABELS.timelineHelpText)
                    ? window.LABELS.timelineHelpText
                    : "Veuillez renseigner la date d'embauche pour générer la courbe.";
            }
            noDateMsg.classList.remove('hidden');
        }
        if (chartWrapper) chartWrapper.classList.add('hidden');
        return;
    }
    if (noDateMsg) noDateMsg.classList.add('hidden');
    if (chartWrapper) chartWrapper.classList.remove('hidden');

    // Dates importantes
    const dateCCNM = CCNM_EFFECTIVE_DATE;
    const dateEmbaucheObj = new Date(dateEmbauche);
    const dateFinObj = dateRupture ? new Date(dateRupture) : new Date();
    const datePrescription = new Date();
    datePrescription.setFullYear(datePrescription.getFullYear() - 3);

    // Date de début : le plus récent entre embauche, changement, CCNM, prescription
    let dateDebut = new Date(Math.max(
        dateEmbaucheObj.getTime(),
        dateChangement ? new Date(dateChangement).getTime() : 0,
        dateCCNM.getTime(),
        datePrescription.getTime()
    ));

    // Générer les périodes mois par mois
    periodsData = [];
    let currentDate = new Date(dateDebut);
    let index = 0;
    
    while (currentDate <= dateFinObj) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const periodKey = `${year}-${String(month).padStart(2, '0')}`;
        const periodLabel = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        const salaireReel = state.salairesParMois[periodKey] || null;

        // State pour ce mois : ancienneté et expérience à cette date (cohérent avec courbe évolution vs inflation)
        const moisDepuisEmbauche = (currentDate.getTime() - dateEmbaucheObj.getTime()) / (365.25 * 24 * 60 * 60 * 1000 / 12);
        const ancienneteMois = Math.floor(moisDepuisEmbauche / 12);
        const yearsFromMoisToNow = (Date.now() - currentDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        const experienceProMois = Math.max(0, Math.floor((state.experiencePro ?? 0) - yearsFromMoisToNow));
        const stateMois = { ...state, anciennete: ancienneteMois, experiencePro: experienceProMois };

        // Calculer le salaire annuel dû pour ce mois (SMH seul ou rémunération complète)
        const salaireAnnuelDuMois = calculateSalaireDuPourMois(currentDate, dateEmbaucheObj, stateMois);

        let salaireMensuelDu;
        const mois = currentDate.getMonth() + 1;
        // Mois de versement du 13e mois : dynamique depuis l'accord (ex. novembre = 11)
        const agreement13e = (typeof window.AgreementLoader?.getActiveAgreement === 'function') ? window.AgreementLoader.getActiveAgreement() : null;
        const moisVersement13e = agreement13e?.repartition13Mois?.moisVersement ?? 11;
        const estMois13eMois = mois === moisVersement13e;
        if (state.arretesSurSMHSeul) {
            // SMH seul (assiette SMH Art. 140) : primes incluses concentrées dans leur mois de versement
            const primesFixesSMH = (typeof window.getMontantPrimesFixesAnnuelFromModules === 'function')
                ? window.getMontantPrimesFixesAnnuelFromModules(stateMois, { smhOnly: true }) : 0;
            const baseSmhPourRepartition = salaireAnnuelDuMois - primesFixesSMH;
            if (state.accordActif && state.nbMois === 13 && estMois13eMois) {
                salaireMensuelDu = (baseSmhPourRepartition / 13) * 2;
            } else if (state.accordActif && state.nbMois === 13) {
                salaireMensuelDu = baseSmhPourRepartition / 13;
            } else {
                salaireMensuelDu = baseSmhPourRepartition / 12;
            }
            // Ajouter les primes SMH versées ce mois-là (dynamique via moisVersement de chaque prime)
            const primesCeMoisSMH = (typeof window.getMontantPrimesVerseesCeMoisFromModules === 'function')
                ? window.getMontantPrimesVerseesCeMoisFromModules(stateMois, mois, { smhOnly: true }) : 0;
            if (primesCeMoisSMH > 0) salaireMensuelDu += primesCeMoisSMH;
        } else {
            // Rémunération complète : primes à versement unique selon moisVersement de chaque prime
            const primesFixesAnnuel = (typeof window.getMontantPrimesFixesAnnuelFromModules === 'function')
                ? window.getMontantPrimesFixesAnnuelFromModules(stateMois) : 0;
            const baseAnnuellePourRepartition = salaireAnnuelDuMois - primesFixesAnnuel;
            if (state.accordActif && state.nbMois === 13 && estMois13eMois) {
                salaireMensuelDu = (baseAnnuellePourRepartition / 13) * 2;
            } else if (state.accordActif && state.nbMois === 13) {
                salaireMensuelDu = baseAnnuellePourRepartition / 13;
            } else {
                salaireMensuelDu = baseAnnuellePourRepartition / 12;
            }
            const primesCeMois = (typeof window.getMontantPrimesVerseesCeMoisFromModules === 'function')
                ? window.getMontantPrimesVerseesCeMoisFromModules(stateMois, mois) : 0;
            if (primesCeMois > 0) salaireMensuelDu += primesCeMois;
        }

        // Proratisation premier mois (CCNM Art. 139, 103.5.1, 103.5.2) : salaire au prorata des jours ouvrés (config CCN, dateUtils)
        const estPremierMois = currentDate.getFullYear() === dateEmbaucheObj.getFullYear() &&
            currentDate.getMonth() === dateEmbaucheObj.getMonth();
        if (estPremierMois && typeof window.computeSalaireProrataEntreeFromModules === 'function') {
            const dernierJourMois = new Date(year, month, 0);
            salaireMensuelDu = window.computeSalaireProrataEntreeFromModules(salaireMensuelDu, dateEmbaucheObj, dernierJourMois);
        }

        periodsData.push({
            index: index++,
            key: periodKey,
            label: periodLabel,
            date: new Date(currentDate),
            salaireReel: salaireReel, // Mensuel brut (ou null si non saisi)
            salaireDu: salaireMensuelDu, // Mensuel brut dû
            salaireAnnuelDu: salaireAnnuelDuMois, // Annuel pour référence
            monthLabel: currentDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        });

        // Passer au mois suivant
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    if (periodsData.length === 0) {
        if (noDateMsg) {
            const p = noDateMsg.querySelector('.timeline-help');
            if (p) {
                p.textContent = (window.LABELS && window.LABELS.timelineNoPeriodText)
                    ? window.LABELS.timelineNoPeriodText
                    : 'Aucune période à afficher.';
            }
            noDateMsg.classList.remove('hidden');
        }
        if (chartWrapper) chartWrapper.classList.add('hidden');
        return;
    }

    // Trouver le premier mois non saisi
    currentPeriodIndex = periodsData.findIndex(p => !p.salaireReel);
    if (currentPeriodIndex === -1) {
        currentPeriodIndex = 0; // Tous saisis, commencer au début
    }
    floatingBlockDismissed = false; // nouveau contexte, bloc affiché par défaut

    // Créer ou mettre à jour la courbe après un délai pour que le conteneur soit visible et ait des dimensions
    setTimeout(() => {
        createSalaryCurve();
        updateCurveControls({ skipAutoFocus: true });
        if (salaryCurveChart && typeof salaryCurveChart.resize === 'function') {
            setTimeout(() => salaryCurveChart.resize(), 100);
        }
        setTimeout(() => {
            initTooltips();
        }, 200);
    }, 150);
}

/**
 * Calculer le salaire dû pour un mois donné avec tous les paramètres.
 * Si statePourMois est fourni (ancienneté/expérience à cette date), il est utilisé pour cohérence avec la courbe d'évolution.
 * Prend en compte les versements mensuels spécifiques de l'accord actif (prime vacances, 13e mois).
 * @param {Date} dateMois - Date du mois
 * @param {Date} dateEmbauche - Date d'embauche
 * @param {Object} [statePourMois] - State avec anciennete/experiencePro pour ce mois (optionnel)
 */
function calculateSalaireDuPourMois(dateMois, dateEmbauche, statePourMois) {
    const stateToUse = statePourMois || state;
    if (typeof window.calculateSalaireDuPourMoisFromModules === 'function') {
        const agreement = window.AgreementLoader?.getActiveAgreement?.() || null;
        return window.calculateSalaireDuPourMoisFromModules(
            dateMois,
            dateEmbauche,
            stateToUse,
            agreement,
            stateToUse.arretesSurSMHSeul
        );
    }
    console.warn('calculateSalaireDuPourMoisFromModules non disponible, retour de 0');
    return 0;
}

/**
 * Créer la courbe Chart.js interactive
 */
function createSalaryCurve() {
    const canvas = document.getElementById('salary-curve-chart');
    if (!canvas) {
        console.warn('Canvas salary-curve-chart non trouvé');
        return;
    }

    // Vérifier que Chart.js est disponible
    if (typeof Chart === 'undefined') {
        console.error('Chart.js n\'est pas chargé');
        const noDateMsg = document.getElementById('timeline-no-date-message');
        if (noDateMsg) {
            const p = noDateMsg.querySelector('.timeline-help') || document.createElement('p');
            if (!p.classList.contains('timeline-help')) p.className = 'timeline-help';
            p.textContent = (window.LABELS && window.LABELS.timelineChartMissingText)
                ? window.LABELS.timelineChartMissingText
                : 'Affichage temporairement indisponible. Veuillez recharger la page.';
            p.style.color = '#d32f2f';
            if (!noDateMsg.contains(p)) noDateMsg.appendChild(p);
            noDateMsg.classList.remove('hidden');
        }
        canvas.closest('.curve-chart-wrapper')?.classList.add('hidden');
        return;
    }

    // Vérifier que nous avons des données
    if (!periodsData || periodsData.length === 0) {
        console.warn('Aucune donnée de période disponible');
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Impossible d\'obtenir le contexte 2D du canvas');
        return;
    }
    
    // Détruire le graphique existant s'il existe
    if (salaryCurveChart) {
        salaryCurveChart.destroy();
        salaryCurveChart = null;
    }

    const labels = periodsData.map(p => p.monthLabel);
    const salairesReels = periodsData.map(p => p.salaireReel || null);
    const salairesDus = periodsData.map(p => p.salaireDu || 0);

    // Couleurs des points selon leur état
    const pointColors = periodsData.map((p, i) => {
        if (p.salaireReel) {
            return i === currentPeriodIndex ? '#2e7d32' : '#4caf50';
        }
        return i === currentPeriodIndex ? '#f57c00' : '#ff9800';
    });

    const pointRadius = periodsData.map((p, i) => i === currentPeriodIndex ? 8 : 5);
    const pointHoverRadius = periodsData.map((p, i) => i === currentPeriodIndex ? 12 : 8);

    salaryCurveChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Salaire réel saisi',
                    data: salairesReels,
                    borderColor: '#4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    pointBackgroundColor: pointColors,
                    pointBorderColor: pointColors,
                    pointRadius: pointRadius,
                    pointHoverRadius: pointHoverRadius,
                    borderWidth: 2,
                    tension: 0.4,
                    spanGaps: true
                },
                {
                    label: 'Salaire dû',
                    data: salairesDus,
                    borderColor: '#2196f3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const datasetLabel = context.dataset.label || '';
                            const value = context.parsed.y;
                            if (value === null) return null;
                            // Formater en mensuel (les valeurs sont déjà en mensuel)
                            return `${datasetLabel}: ${formatMoney(value)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            // Les valeurs sont en mensuel brut
                            return formatMoney(value);
                        }
                    },
                    title: {
                        display: true,
                        text: 'Salaire mensuel brut (€)'
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements && elements.length > 0) {
                    const element = elements[0];
                    const datasetIndex = element.datasetIndex;
                    const dataIndex = element.index;
                    if (datasetIndex === 0 && dataIndex >= 0 && dataIndex < periodsData.length) {
                        if (dataIndex === currentPeriodIndex) {
                            // Reclic sur le point déjà sélectionné : basculer visibilité (fermer / rouvrir)
                            const block = document.getElementById('floating-input-block');
                            const isHidden = block ? block.classList.contains('floating-block-hidden') : true;
                            floatingBlockDismissed = !isHidden;
                            if (block) {
                                if (floatingBlockDismissed) {
                                    block.classList.add('floating-block-hidden');
                                    block.style.visibility = 'hidden';
                                } else {
                                    block.classList.remove('floating-block-hidden');
                                    block.style.visibility = '';
                                    block.style.pointerEvents = '';
                                    positionFloatingBlock(currentPeriodIndex);
                                }
                            }
                            return;
                        }
                        floatingBlockDismissed = false; // nouveau point sélectionné, afficher le bloc
                        currentPeriodIndex = dataIndex;
                        animatePointToCenter(dataIndex, () => {
                            updateCurveControls();
                            updateCurveChart();
                            const inputEl = document.getElementById('floating-salary-input');
                            if (inputEl) { inputEl.focus(); inputEl.select(); }
                        });
                    }
                }
            }
        }
    });
    
    // Forcer le redimensionnement du graphique après création
    setTimeout(() => {
        if (salaryCurveChart) {
            salaryCurveChart.resize();
        }
    }, 100);
}

/**
 * Mettre à jour la courbe après modification
 */
function updateCurveChart() {
    if (!salaryCurveChart) return;

    const salairesReels = periodsData.map(p => p.salaireReel || null);
    const salairesDus = periodsData.map(p => p.salaireDu);

    const pointColors = periodsData.map((p, i) => {
        if (p.salaireReel) {
            return i === currentPeriodIndex ? '#2e7d32' : '#4caf50';
        }
        return i === currentPeriodIndex ? '#f57c00' : '#ff9800';
    });

    const pointRadius = periodsData.map((p, i) => i === currentPeriodIndex ? 8 : 5);
    const pointHoverRadius = periodsData.map((p, i) => i === currentPeriodIndex ? 12 : 8);

    salaryCurveChart.data.datasets[0].data = salairesReels;
    salaryCurveChart.data.datasets[0].pointBackgroundColor = pointColors;
    salaryCurveChart.data.datasets[0].pointBorderColor = pointColors;
    salaryCurveChart.data.datasets[0].pointRadius = pointRadius;
    salaryCurveChart.data.datasets[0].pointHoverRadius = pointHoverRadius;
    salaryCurveChart.data.datasets[1].data = salairesDus;

    salaryCurveChart.update('none');
}

/**
 * Mettre à jour les contrôles de la courbe avec bloc flottant
 * @param {Object} [options]
 * @param {boolean} [options.skipAutoFocus=false] - Ne pas focus l'input (navigation ou tout complété)
 */
function updateCurveControls(options) {
    options = options || {};
    const skipAutoFocus = options.skipAutoFocus === true;
    if (periodsData.length === 0) return;

    const currentPeriod = periodsData[currentPeriodIndex];
    if (!currentPeriod) return;

    const floatingBlock = document.getElementById('floating-input-block');
    const floatingLabel = document.getElementById('floating-period-label');
    const floatingInput = document.getElementById('floating-salary-input');
    const floatingInfoIcon = document.getElementById('floating-info-icon');
    const progressEl = document.getElementById('curve-progress-text');

    if (floatingLabel) {
        floatingLabel.textContent = currentPeriod.label;
    }

    if (floatingInput) {
        floatingInput.value = currentPeriod.salaireReel || '';
        // Focus et sélection uniquement si saisie en cours (pas à l'affichage ni quand tout est complété)
        if (!skipAutoFocus && periodsData.some(p => !p.salaireReel)) {
            setTimeout(() => {
                floatingInput.focus();
                floatingInput.select();
            }, 100);
        }
    }

    // Synchroniser le hint arriérés avec les mêmes éléments dynamiques que le tooltip.
    updateArreteesSalaireHint();

    // Tooltip "?" : message court, le détail métier reste dans le hint au-dessus.
    if (floatingInfoIcon) {
        const tooltipHtml = state.arretesSurSMHSeul
            ? 'Indiquez le <strong>Salaire brut total du mois</strong> selon l\'assiette salaire minima.<br>Voir l\'<strong>encadré d\'aide juste au-dessus</strong> pour le détail des éléments à inclure/exclure.'
            : 'Indiquez le <strong>Salaire brut total du mois</strong> pour comparer à la rémunération complète.<br>Voir l\'<strong>encadré d\'aide juste au-dessus</strong> pour le détail.';
        floatingInfoIcon.setAttribute('data-tippy-content', tooltipHtml);
        if (floatingInfoIcon._tippy) floatingInfoIcon._tippy.setContent(tooltipHtml);
    }

    const saisis = periodsData.filter(p => p.salaireReel).length;
    if (progressEl) {
        progressEl.textContent = `${saisis} / ${periodsData.length} mois saisis`;
    }
    
    // Afficher le bloc au centre sauf si « dernière date, tout saisi » et l'utilisateur l'a fermé (évite réouverture en boucle)
    const allFilled = !periodsData.some(p => !p.salaireReel);
    const isLastIndex = currentPeriodIndex === periodsData.length - 1;
    if (floatingBlock && salaryCurveChart) {
        if (allFilled && isLastIndex && floatingBlockDismissed) {
            floatingBlock.classList.add('floating-block-hidden');
            floatingBlock.style.visibility = 'hidden';
        } else {
            positionFloatingBlock(currentPeriodIndex);
        }
    }

    updateCurveProgressReopenState();
}

/**
 * Positionner le bloc flottant au centre du conteneur du graphique
 */
function positionFloatingBlock(periodIndex) {
    const floatingBlock = document.getElementById('floating-input-block');
    const chartWrapper = document.getElementById('curve-chart-wrapper');
    if (!floatingBlock || !chartWrapper) return;

    floatingBlock.style.visibility = '';
    floatingBlock.style.pointerEvents = '';
    floatingBlock.style.opacity = '1';
    floatingBlock.classList.remove('floating-block-hidden');
    floatingBlock.style.left = '50%';
    floatingBlock.style.top = '50%';
    floatingBlock.style.transform = 'translate(-50%, -50%)';
}

/**
 * Masquer le bloc flottant et marquer comme fermé (une seule source de vérité pour le masquage).
 * Utilisé à la fermeture manuelle (Échap, bouton fermer, clic sur le point) et à la fin de la dernière saisie.
 */
function hideFloatingBlock() {
    floatingBlockDismissed = true;
    const block = document.getElementById('floating-input-block');
    if (block) {
        block.classList.add('floating-block-hidden');
        block.style.visibility = 'hidden';
        block.style.pointerEvents = 'none';
    }
    updateCurveProgressReopenState();
}

/**
 * Met à jour l'affichage « cliquer pour rouvrir la saisie » sous le graphique quand le bloc est fermé et qu'il reste des mois à saisir.
 */
function updateCurveProgressReopenState() {
    const progressWrap = document.getElementById('curve-progress');
    const hintEl = document.getElementById('curve-progress-reopen-hint');
    if (!progressWrap) return;
    const allFilled = periodsData.length > 0 && !periodsData.some(p => !p.salaireReel);
    const canReopen = floatingBlockDismissed && !allFilled && periodsData.length > 0;
    if (canReopen) {
        progressWrap.classList.add('curve-progress--reopen');
        progressWrap.setAttribute('tabindex', '0');
        progressWrap.setAttribute('aria-label', `${periodsData.filter(p => p.salaireReel).length} sur ${periodsData.length} mois saisis. Cliquer pour rouvrir la saisie.`);
        if (hintEl) {
            hintEl.textContent = (window.LABELS && window.LABELS.curveProgressReopenHint)
                ? window.LABELS.curveProgressReopenHint
                : '— cliquer pour rouvrir la saisie';
        }
    } else {
        progressWrap.classList.remove('curve-progress--reopen');
        progressWrap.setAttribute('tabindex', '-1');
        const saisis = periodsData.filter(p => p.salaireReel).length;
        progressWrap.setAttribute('aria-label', `${saisis} sur ${periodsData.length} mois saisis`);
        if (hintEl) hintEl.textContent = '';
    }
}

/**
 * Rouvrir le bloc de saisie sur le premier mois non saisi (ou le courant). Appelé au clic sur la progression quand le bloc est fermé.
 */
function reopenFloatingBlockFromProgress() {
    if (periodsData.length === 0) return;
    const allFilled = !periodsData.some(p => !p.salaireReel);
    if (allFilled) return;
    floatingBlockDismissed = false;
    const firstMissing = periodsData.findIndex(p => !p.salaireReel);
    currentPeriodIndex = firstMissing >= 0 ? firstMissing : 0;
    showFloatingBlockForPeriodIndex(currentPeriodIndex);
    updateCurveProgressReopenState();
}

/**
 * Fermer le popup du graphique (bloc flottant) — Échap, bouton fermer ou clic sur le point déjà sélectionné.
 * Pour rouvrir : cliquer sur un point du graphique ou sur la ligne « X / N mois saisis ».
 */
function dismissFloatingBlockFromGraph() {
    hideFloatingBlock();
}

/**
 * Obtenir les coordonnées d'un point du graphique relatives au wrapper
 */
function getPointCoordsInWrapper(periodIndex) {
    if (!salaryCurveChart) return null;
    const chart = salaryCurveChart;
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data[periodIndex]) return null;
    const chartWrapper = document.getElementById('curve-chart-wrapper');
    if (!chartWrapper) return null;
    const point = meta.data[periodIndex];
    const wrapperRect = chartWrapper.getBoundingClientRect();
    const chartRect = chart.canvas.getBoundingClientRect();
    return {
        x: point.x + (chartRect.left - wrapperRect.left),
        y: point.y + (chartRect.top - wrapperRect.top)
    };
}

/**
 * Animer le bloc du centre vers le point puis disparition (scale + déplacement)
 */
function animateBlockToPoint(block, periodIndex, callback) {
    if (!salaryCurveChart || !block) {
        if (callback) callback();
        return;
    }

    const coords = getPointCoordsInWrapper(periodIndex);
    if (!coords) {
        if (callback) callback();
        return;
    }

    block.classList.add('animating');
    block.style.transition = 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)';
    requestAnimationFrame(() => {
        block.style.left = coords.x + 'px';
        block.style.top = coords.y + 'px';
        block.style.transform = 'translate(-50%, -50%) scale(0.08)';
        block.style.opacity = '0';
        setTimeout(() => {
            block.classList.remove('animating');
            block.classList.add('floating-block-hidden');
            block.style.visibility = 'hidden';
            block.style.pointerEvents = 'none';
            block.style.transition = '';
            if (callback) callback();
        }, 300);
    });
}

/**
 * Animer le bloc du point vers le centre (pour édition au clic sur un point)
 */
function animatePointToCenter(periodIndex, callback) {
    const floatingBlock = document.getElementById('floating-input-block');
    const chartWrapper = document.getElementById('curve-chart-wrapper');
    if (!floatingBlock || !chartWrapper || !salaryCurveChart) {
        if (callback) callback();
        return;
    }

    const coords = getPointCoordsInWrapper(periodIndex);
    if (!coords) {
        if (callback) callback();
        return;
    }

    floatingBlock.classList.remove('floating-block-hidden');
    floatingBlock.style.visibility = '';
    floatingBlock.style.pointerEvents = '';
    floatingBlock.style.left = coords.x + 'px';
    floatingBlock.style.top = coords.y + 'px';
    floatingBlock.style.transform = 'translate(-50%, -50%) scale(0.2)';
    floatingBlock.style.opacity = '0.9';
    floatingBlock.style.transition = 'none';

    requestAnimationFrame(() => {
        floatingBlock.style.transition = 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)';
        floatingBlock.style.left = '50%';
        floatingBlock.style.top = '50%';
        floatingBlock.style.transform = 'translate(-50%, -50%) scale(1)';
        floatingBlock.style.opacity = '1';
        setTimeout(() => {
            if (callback) callback();
        }, 300);
    });
}

/**
 * Ouvrir le modal pour saisir un salaire
 */
function openSalaryModal(periodKey, periodLabel, currentSalary) {
    // Créer le modal s'il n'existe pas
    let modalOverlay = document.getElementById('salary-modal-overlay');
    if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'salary-modal-overlay';
        modalOverlay.className = 'modal-overlay';
        
        // Image SVG illustrant une fiche de paie
        const fichePaieSVG = `
            <svg width="400" height="200" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
                <!-- Fond de la fiche -->
                <rect x="10" y="10" width="380" height="180" fill="#ffffff" stroke="#333" stroke-width="2" rx="4"/>
                
                <!-- En-tête -->
                <rect x="10" y="10" width="380" height="30" fill="#f0f0f0"/>
                <text x="20" y="28" font-family="Arial" font-size="12" font-weight="bold">FICHE DE PAIE</text>
                <text x="300" y="28" font-family="Arial" font-size="10">Mois/Année</text>
                
                <!-- Ligne salaire de base -->
                <line x1="10" y1="50" x2="390" y2="50" stroke="#ddd" stroke-width="1"/>
                <text x="20" y="65" font-family="Arial" font-size="11">Salaire de base</text>
                <text x="300" y="65" font-family="Arial" font-size="11" fill="#666">XXXX €</text>
                
                <!-- Ligne total brut -->
                <line x1="10" y1="80" x2="390" y2="80" stroke="#ddd" stroke-width="1"/>
                <text x="20" y="95" font-family="Arial" font-size="11" font-weight="bold">Total brut</text>
                <text x="300" y="95" font-family="Arial" font-size="11" font-weight="bold" fill="#E15C12">XXXX €</text>
                
                <!-- Flèche pointant vers le total brut -->
                <path d="M 350 95 L 370 95 L 370 140 L 380 130 L 370 120 L 370 140 Z" fill="#E15C12" opacity="0.7"/>
                <text x="310" y="135" font-family="Arial" font-size="9" fill="#E15C12" font-weight="bold">TOTAL BRUT MENSUEL</text>
                
                <!-- Zone mise en évidence -->
                <rect x="280" y="85" width="100" height="20" fill="rgba(225,92,18,0.08)" opacity="0.5" stroke="#E15C12" stroke-width="2" stroke-dasharray="3,3"/>
                
                <!-- Note en bas -->
                <text x="20" y="170" font-family="Arial" font-size="9" fill="#666">* Indiquez le salaire brut total du mois sur votre fiche de paie</text>
            </svg>
        `;
        
        modalOverlay.innerHTML = `
            <div class="modal">
                <h3>Saisir le salaire</h3>
                <div class="period-display" id="modal-salary-period">${periodLabel}</div>
                <div class="form-group">
                    <label for="modal-salary-amount">
                        Salaire mensuel brut
                        <span class="tooltip-trigger" data-tippy-content="Indiquez le Total brut de votre fiche de paie pour ce mois.">?</span>
                    </label>
                    <div class="fiche-paie-illustration">
                        ${fichePaieSVG}
                        <p>Le salaire mensuel brut correspond au « Total brut » de votre fiche de paie pour ce mois.</p>
                    </div>
                    <div class="input-with-unit" style="margin-top: 15px;">
                        <input type="text" id="modal-salary-amount" class="book-input" value="0" inputmode="decimal" data-decimal-input="true" data-number-behavior="decimal" autocomplete="off">
                        <span class="input-unit">€</span>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="book-btn btn-secondary" id="modal-cancel">Annuler</button>
                    <button class="book-btn btn-primary" id="modal-save">Enregistrer</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        // Gestionnaires d'événements
        document.getElementById('modal-cancel').addEventListener('click', () => {
            modalOverlay.classList.remove('visible');
        });

        // Stocker le periodKey dans le modal pour éviter le problème de closure
        const modal = modalOverlay.querySelector('.modal');
        
        document.getElementById('modal-save').addEventListener('click', () => {
            const currentPeriodKey = modal.dataset.periodKey;
            const amount = parseDecimalInput(document.getElementById('modal-salary-amount').value, 0);
            if (amount > 0) {
                state.salairesParMois[currentPeriodKey] = amount;
                initTimeline();
                modalOverlay.classList.remove('visible');
                // Réinitialiser les tooltips après mise à jour
                setTimeout(() => {
                    initTooltips();
                }, 100);
            } else {
                showToast('⚠️ Veuillez saisir un montant valide.', 'warning', 3000);
            }
        });

        // Fermer en cliquant sur l'overlay
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.classList.remove('visible');
            }
        });
    }

    // Stocker le periodKey dans le modal
    const modal = modalOverlay.querySelector('.modal');
    modal.dataset.periodKey = periodKey;
    
    // Mettre à jour les données
    document.getElementById('modal-salary-period').textContent = periodLabel;
    const amountInput = document.getElementById('modal-salary-amount');
    amountInput.value = currentSalary || '';
    
    // Réinitialiser les tooltips pour le nouveau contenu
    initTooltips();
    
    // Afficher le modal
    modalOverlay.classList.add('visible');
    setTimeout(() => {
        amountInput.focus();
        amountInput.select();
    }, 100);
}

/**
 * Calculer les arriérés finaux (mois par mois)
 */
function calculerArreteesFinal() {
    const dateEmbauche = document.getElementById('date-embauche-arretees')?.value;
    if (!dateEmbauche) {
        showToast('⚠️ Veuillez renseigner la date d\'embauche.', 'warning', 3000);
        return;
    }

    // Vérifier qu'au moins un salaire est saisi
    const salairesSaisis = Object.keys(state.salairesParMois).length;
    if (salairesSaisis === 0) {
        showToast('⚠️ Veuillez saisir au moins un salaire dans la courbe interactive.', 'warning', 3000);
        return;
    }

    // Calculer la rémunération due (utilise la classification actuelle)
    const remuneration = calculateRemuneration();
    const salaireDu = remuneration.total;

    // Dates importantes
    const dateCCNM = CCNM_EFFECTIVE_DATE;
    const dateEmbaucheObj = new Date(dateEmbauche);
    const dateRuptureObj = state.ruptureContratArretees && state.dateRuptureArretees 
        ? new Date(state.dateRuptureArretees) 
        : new Date();
    const dateChangementObj = state.dateChangementClassificationArretees 
        ? new Date(state.dateChangementClassificationArretees) 
        : null;
    const datePrescription = new Date();
    datePrescription.setFullYear(datePrescription.getFullYear() - 3);

    // Date de début : le plus récent entre embauche, changement, CCNM, prescription
    let dateDebut = new Date(Math.max(
        dateEmbaucheObj.getTime(),
        dateChangementObj ? dateChangementObj.getTime() : 0,
        dateCCNM.getTime(),
        datePrescription.getTime()
    ));

    const agreement = (typeof window.AgreementLoader?.getActiveAgreement === 'function')
        ? window.AgreementLoader.getActiveAgreement()
        : null;
    const arreteesResult = (typeof window.calculerArreteesMoisParMoisFromModules === 'function')
        ? window.calculerArreteesMoisParMoisFromModules({
            dateDebut,
            dateFin: dateRuptureObj,
            dateEmbauche: dateEmbaucheObj,
            dateChangementClassification: dateChangementObj,
            salairesParMois: state.salairesParMois,
            stateSnapshot: state,
            agreement,
            smhSeul: state.arretesSurSMHSeul,
            nbMois: state.nbMois
        }, state)
        : null;
    if (!arreteesResult) {
        showToast('⚠️ Moteur arriérés indisponible. Veuillez recharger la page.', 'error', 5000);
        return;
    }
    const detailsTousMois = arreteesResult.detailsTousMois || [];
    const detailsParAnnee = arreteesResult.detailsParAnnee || [];
    const detailsArretees = arreteesResult.detailsArretees || [];
    const totalArretees = Number(arreteesResult.totalArretees) || 0;

    if (totalArretees <= 0) {
        showToast('✅ Aucun arriéré détecté. Votre salaire est conforme.', 'success', 4000);
        const resultsDiv = document.getElementById('arretees-results');
        const summaryDiv = document.getElementById('arretees-summary');
        const legalInfoDiv = document.getElementById('arretees-legal-info');
        const btnPdf = document.getElementById('btn-generer-pdf-arretees');
        const legalSec = document.getElementById('legal-instructions');
        if (resultsDiv) {
            resultsDiv.classList.remove('hidden');
            if (summaryDiv) {
                summaryDiv.innerHTML = '<p class="arretees-en-ordre-msg">Votre salaire est conforme, vous êtes en ordre.</p>';
            }
            if (legalInfoDiv) {
                legalInfoDiv.innerHTML = '';
                legalInfoDiv.classList.add('hidden');
            }
            if (btnPdf) btnPdf.style.display = '';
        }
        if (legalSec) legalSec.classList.add('hidden');
        // Stocker les données pour le PDF même en cas « conforme » (0 arriérés)
        const dateEmbaucheInput = document.getElementById('date-embauche-arretees')?.value;
        const dateChangementInput = document.getElementById('date-changement-classification-arretees')?.value;
        const dateRuptureInput = document.getElementById('date-rupture-arretees')?.value;
        const pdfData = {
            salaireDu,
            totalArretees: 0,
            detailsArretees: [],
            detailsTousMois,
            detailsParAnnee,
            dateDebut,
            dateFin: dateRuptureObj,
            datePrescription,
            salairesParMois: state.salairesParMois,
            accordEcrit: state.accordEcritArretees,
            ruptureContrat: state.ruptureContratArretees,
            scopeMode: state.arretesSurSMHSeul ? 'smh-only' : 'full',
            dateRupture: state.dateRuptureArretees,
            dateEmbauche: dateEmbaucheInput,
            dateChangementClassification: dateChangementInput,
            dateRuptureInput: dateRuptureInput
        };
        arreteesPdfStore = pdfData;
        window.arreteesDataFinal = pdfData;
        return;
    }

    // Afficher les résultats (comparaison par année civile + détail mensuel)
    afficherResultatsArreteesFinal({
        salaireDu,
        totalArretees,
        detailsArretees,
        detailsTousMois,
        detailsParAnnee,
        dateDebut,
        dateFin: dateRuptureObj,
        datePrescription
    });
    
    // Afficher le guide juridique maintenant que le calcul est terminé
    const legalCarousel = document.getElementById('legal-instructions');
    if (legalCarousel) {
        legalCarousel.classList.remove('hidden');
        afficherInstructionsJuridiques();
    }
    
    // Afficher le bouton sticky
    const stickyBtn = document.getElementById('arretees-calc-sticky');
    if (stickyBtn) {
        stickyBtn.classList.remove('hidden');
    }
}

/**
 * Afficher les résultats finaux
 */
function afficherResultatsArreteesFinal(data) {
    const resultsDiv = document.getElementById('arretees-results');
    if (!resultsDiv) return;

    // Stocker les données pour le PDF en premier (avant tout early return)
    const dateEmbaucheInput = document.getElementById('date-embauche-arretees')?.value;
    const dateChangementInput = document.getElementById('date-changement-classification-arretees')?.value;
    const dateRuptureInput = document.getElementById('date-rupture-arretees')?.value;
    const pdfData = {
        ...data,
        salairesParMois: state.salairesParMois,
        accordEcrit: state.accordEcritArretees,
        ruptureContrat: state.ruptureContratArretees,
        scopeMode: state.arretesSurSMHSeul ? 'smh-only' : 'full',
        dateRupture: state.dateRuptureArretees,
        dateEmbauche: dateEmbaucheInput,
        dateChangementClassification: dateChangementInput,
        dateRuptureInput: dateRuptureInput
    };
    arreteesPdfStore = pdfData;
    window.arreteesDataFinal = pdfData;

    resultsDiv.classList.remove('hidden');
    const btnPdf = document.getElementById('btn-generer-pdf-arretees');
    if (btnPdf) btnPdf.style.display = '';

    // Résumé par année civile (Art. 140 CCNM : le SMH s'apprécie sur l'année civile)
    const summaryDiv = document.getElementById('arretees-summary');
    if (summaryDiv) {
        const annees = data.detailsParAnnee || [];
        const anneesAvecEcart = annees.filter(a => a.ecart > 0);
        const detailsPourTableau = data.detailsTousMois || data.detailsArretees || [];

        // Tableau résumé par année civile
        let anneeTableHTML = '';
        if (annees.length > 0) {
            anneeTableHTML = `
            <div class="arretees-details-table result-details">
                <div class="arretees-detail-header">
                    <span class="detail-col-periode">Année</span>
                    <span class="detail-col-montants">Perçu → Dû</span>
                    <span class="detail-col-diff">Écart</span>
                </div>
                ${annees.map(a => {
                    const rowClass = a.ecart > 0 ? 'arretees-detail-row-elegant detail-row-arretees' : 'arretees-detail-row-elegant detail-row-positif';
                    const ecartStr = a.ecart > 0 ? `- ${formatMoney(a.ecart)}` : formatMoney(0);
                    return `
                    <div class="${rowClass}">
                        <span class="detail-periode">${a.annee} (${a.nbMoisSaisis} mois)</span>
                        <span class="detail-montants-inline">${formatMoney(a.totalReel)} → ${formatMoney(a.totalDu)}</span>
                        <span class="detail-diff-value">${ecartStr}</span>
                    </div>`;
                }).join('')}
            </div>`;
        }

        summaryDiv.innerHTML = `
            <details class="arretees-accordion-summary result-details-toggle" open>
                <summary class="arretees-accordion-summary-title">Résumé par année civile</summary>
                <div class="arretees-summary result-details">
                    <div class="result-detail-item">
                        <span class="result-detail-label">Période</span>
                        <span class="result-detail-value">${data.dateDebut.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} → ${data.dateFin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div class="result-detail-item">
                        <span class="result-detail-label">Années avec écart</span>
                        <span class="result-detail-value">${anneesAvecEcart.length} sur ${annees.length}</span>
                    </div>
                    <div class="result-detail-item total-row">
                        <span class="result-detail-label">Total des arriérés</span>
                        <span class="result-detail-value">${formatMoney(data.totalArretees)}</span>
                    </div>
                </div>
                ${anneeTableHTML}
            </details>
            ${detailsPourTableau.length > 0 ? `
            <details class="arretees-accordion-detail result-details-toggle">
                <summary class="arretees-accordion-detail-title">Détail mois par mois</summary>
                <div class="arretees-details-table result-details">
                    <div class="arretees-detail-header">
                        <span class="detail-col-periode">Période</span>
                        <span class="detail-col-montants">Réel → Dû</span>
                        <span class="detail-col-diff">Écart mensuel</span>
                    </div>
                    ${detailsPourTableau.map(detail => {
                        const rowClass = detail.difference > 0 ? 'arretees-detail-row-elegant detail-row-arretees' : 'arretees-detail-row-elegant detail-row-positif';
                        const sign = detail.difference > 0 ? '-' : (detail.difference < 0 ? '+' : '');
                        const diffStr = sign ? `${sign} ${formatMoney(Math.abs(detail.difference))}` : formatMoney(0);
                        return `
                        <div class="${rowClass}">
                            <span class="detail-periode">${detail.periode}</span>
                            <span class="detail-montants-inline">${formatMoney(detail.salaireMensuelReel)} → ${formatMoney(detail.salaireMensuelDu)}</span>
                            <span class="detail-diff-value">${diffStr}</span>
                        </div>`;
                    }).join('')}
                </div>
            </details>
            ` : ''}
        `;
    }

    // Points juridiques
    const legalInfoDiv = document.getElementById('arretees-legal-info');
    if (legalInfoDiv) {
        const conditionsValides = [];
        const conditionsInvalides = [];

        if (data.dateDebut < CCNM_EFFECTIVE_DATE) {
            conditionsInvalides.push(`Les arriérés avant le 1er janvier ${CCNM_EFFECTIVE_YEAR} ne sont pas réclamables au titre de cette convention.`);
        }

        if (data.dateDebut < data.datePrescription) {
            conditionsInvalides.push(`La prescription de 3 ans limite les arriérés réclamables à partir du ${data.datePrescription.toLocaleDateString('fr-FR')}.`);
        }

        if (state.accordEcritArretees) {
            conditionsValides.push('Un accord écrit avec l\'employeur renforce votre position juridique.');
        }

        if (state.dateChangementClassificationArretees) {
            conditionsValides.push('Un changement de classification documenté peut faciliter la réclamation.');
        }

        const hasContent = conditionsInvalides.length > 0 || conditionsValides.length > 0;
        if (!hasContent) {
            legalInfoDiv.innerHTML = '';
            legalInfoDiv.classList.add('hidden');
            return;
        }
        legalInfoDiv.classList.remove('hidden');
        let legalHTML = '<h4>Points d\'attention juridiques</h4>';
        if (conditionsInvalides.length > 0) {
            legalHTML += '<ul style="color: #d32f2f;">';
            conditionsInvalides.forEach(cond => {
                legalHTML += `<li>${cond}</li>`;
            });
            legalHTML += '</ul>';
        }
        if (conditionsValides.length > 0) {
            legalHTML += '<ul style="color: #2e7d32;">';
            conditionsValides.forEach(cond => {
                legalHTML += `<li>✅ ${cond}</li>`;
            });
            legalHTML += '</ul>';
        }
        legalInfoDiv.innerHTML = legalHTML;
    }

    // Instructions juridiques (affichées seulement après la saisie complète)
    // Données PDF déjà stockées en tête de fonction (évite tout early return sans store)
}

/**
 * Validation centralisée des données arriérés pour le PDF.
 * Lit la source de vérité (arreteesPdfStore) puis window.arreteesDataFinal en repli.
 * Accepte à la fois le cas « conforme » (detailsArretees: []) et « avec arriérés ».
 * @returns {{ valid: boolean, error?: string, data?: object }}
 */
function getArreteesDataForPdf() {
    const d = arreteesPdfStore ?? window.arreteesDataFinal;
    if (!d) {
        return { valid: false, error: 'Veuillez d\'abord calculer les arriérés.' };
    }
    if (!d || typeof d !== 'object') {
        return { valid: false, error: 'Données invalides. Recalculez les arriérés.' };
    }
    const dateDebutOk = d.dateDebut != null && (d.dateDebut instanceof Date || (typeof d.dateDebut === 'string' && d.dateDebut.length > 0));
    const dateFinOk = d.dateFin != null && (d.dateFin instanceof Date || (typeof d.dateFin === 'string' && d.dateFin.length > 0));
    if (!dateDebutOk || !dateFinOk) {
        return { valid: false, error: 'Données de période incomplètes. Recalculez les arriérés.' };
    }
    if (!Array.isArray(d.detailsArretees)) {
        return { valid: false, error: 'Données des arriérés incomplètes. Recalculez les arriérés.' };
    }
    return { valid: true, data: d };
}

/**
 * Ouvrir le modal des infos personnelles avant génération du PDF.
 * Stocke les données déjà validées sur l’overlay pour que la génération ne dépende pas de window.arreteesDataFinal au moment du clic.
 * Conformément à la CCN, les arriérés doivent être calculés sur le SMH : la génération est bloquée si « SMH seul » n'est pas coché.
 */
function openPdfInfosModal() {
    let result = getArreteesDataForPdf();
    if (!result.valid) {
        const step4 = document.getElementById('step-4');
        const hasDate = !!document.getElementById('date-embauche-arretees')?.value;
        const hasSalaries = Object.keys(state.salairesParMois || {}).length > 0;
        if (step4?.classList.contains('active') && hasDate && hasSalaries) {
            result = getArreteesDataForPdf();
        }
        if (!result.valid) {
            showToast('⚠️ ' + result.error, 'warning', 3000);
            return;
        }
    }

    let overlay = document.getElementById('pdf-infos-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'pdf-infos-modal-overlay';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal pdf-infos-modal" onclick="event.stopPropagation()">
                <h3>Informations pour la lettre de mise en demeure</h3>
                <p class="modal-subtitle">Ces informations seront incluses dans la lettre et l'annexe technique. Tous les champs sont facultatifs — vous pourrez compléter à la main après téléchargement.</p>
                <p class="pdf-smh-only-notice" id="pdf-scope-notice"></p>

                <h4 class="modal-section-title">Salarié</h4>
                <div class="form-group">
                    <label for="pdf-infos-nom">Prénom et nom</label>
                    <input type="text" id="pdf-infos-nom" class="book-input" placeholder="Ex. Jean Dupont">
                </div>
                <div class="form-group">
                    <label for="pdf-infos-adresse-salarie">Adresse</label>
                    <input type="text" id="pdf-infos-adresse-salarie" class="book-input" placeholder="Ex. 12 rue de la Paix">
                </div>
                <div class="form-group">
                    <label for="pdf-infos-cp-ville-salarie">Code postal + Ville</label>
                    <input type="text" id="pdf-infos-cp-ville-salarie" class="book-input" placeholder="Ex. 67000 Strasbourg">
                </div>

                <h4 class="modal-section-title">Employeur</h4>
                <div class="form-group">
                    <label for="pdf-infos-employeur">Société / raison sociale</label>
                    <input type="text" id="pdf-infos-employeur" class="book-input" placeholder="Ex. Société ABC">
                </div>
                <div class="form-group">
                    <label for="pdf-infos-representant">Prénom et nom du représentant</label>
                    <input type="text" id="pdf-infos-representant" class="book-input" placeholder="Ex. Marie Martin">
                </div>
                <div class="form-group">
                    <label for="pdf-infos-fonction">Fonction</label>
                    <input type="text" id="pdf-infos-fonction" class="book-input" placeholder="Ex. DRH, Directeur général">
                </div>
                <div class="form-group">
                    <label for="pdf-infos-adresse-employeur">Adresse</label>
                    <input type="text" id="pdf-infos-adresse-employeur" class="book-input" placeholder="Ex. Zone industrielle Nord">
                </div>
                <div class="form-group">
                    <label for="pdf-infos-cp-ville-employeur">Code postal + Ville</label>
                    <input type="text" id="pdf-infos-cp-ville-employeur" class="book-input" placeholder="Ex. 67000 Strasbourg">
                </div>

                <h4 class="modal-section-title">Document</h4>
                <div class="form-group">
                    <label for="pdf-infos-lieu">Lieu de rédaction</label>
                    <input type="text" id="pdf-infos-lieu" class="book-input" placeholder="Ex. Strasbourg">
                </div>
                <div class="form-group">
                    <label for="pdf-infos-poste">Poste / intitulé du poste</label>
                    <input type="text" id="pdf-infos-poste" class="book-input" placeholder="Ex. Soudeur, Technicien maintenance">
                </div>
                <div class="form-group">
                    <label for="pdf-infos-matricule">Matricule ou N° interne <span class="label-optional">(optionnel)</span></label>
                    <input type="text" id="pdf-infos-matricule" class="book-input" placeholder="Ex. 12345">
                </div>
                <div class="form-group">
                    <label for="pdf-infos-observations">Observations <span class="label-optional">(optionnel)</span></label>
                    <textarea id="pdf-infos-observations" class="book-input" rows="3" placeholder="Précisions utiles pour votre dossier..."></textarea>
                </div>
                <div class="modal-actions">
                    <button class="book-btn btn-secondary" id="pdf-infos-cancel">Annuler</button>
                    <button class="book-btn btn-primary" id="pdf-infos-generate">Générer les documents</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('pdf-infos-cancel').addEventListener('click', () => {
            overlay.classList.remove('visible');
        });
        document.getElementById('pdf-infos-generate').addEventListener('click', () => {
            const data = overlay._pdfData;
            if (!data) {
                showToast('⚠️ Données perdues. Recalculez les arriérés puis générez le PDF.', 'warning', 3000);
                return;
            }
            const infos = {
                nomPrenom: (document.getElementById('pdf-infos-nom')?.value || '').trim(),
                adresseSalarie: (document.getElementById('pdf-infos-adresse-salarie')?.value || '').trim(),
                cpVilleSalarie: (document.getElementById('pdf-infos-cp-ville-salarie')?.value || '').trim(),
                employeur: (document.getElementById('pdf-infos-employeur')?.value || '').trim(),
                representant: (document.getElementById('pdf-infos-representant')?.value || '').trim(),
                fonction: (document.getElementById('pdf-infos-fonction')?.value || '').trim(),
                adresseEmployeur: (document.getElementById('pdf-infos-adresse-employeur')?.value || '').trim(),
                cpVilleEmployeur: (document.getElementById('pdf-infos-cp-ville-employeur')?.value || '').trim(),
                lieu: (document.getElementById('pdf-infos-lieu')?.value || '').trim(),
                poste: (document.getElementById('pdf-infos-poste')?.value || '').trim(),
                matricule: (document.getElementById('pdf-infos-matricule')?.value || '').trim(),
                observations: (document.getElementById('pdf-infos-observations')?.value || '').trim()
            };
            overlay.classList.remove('visible');
            genererPDFArreteesFinal(infos, data);
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('visible');
        });
    }
    overlay._pdfData = result.data;
    const scopeEl = document.getElementById('pdf-scope-notice');
    if (scopeEl) {
        const smhOnly = (result.data?.scopeMode || (state.arretesSurSMHSeul ? 'smh-only' : 'full')) === 'smh-only';
        scopeEl.innerHTML = smhOnly
            ? '<strong>Périmètre retenu :</strong> SMH seul (assiette conventionnelle Art. 140 CCNM).'
            : '<strong>Périmètre retenu :</strong> rémunération complète (option explicite).';
    }
    overlay.classList.add('visible');
}

/**
 * Générer le PDF final (utilise le module PDFGenerator.js)
 * @param {Object} [infosPersonnelles] - Nom, poste, employeur, etc. saisis dans le modal (optionnel)
 * @param {Object} [dataPrevalide] - Données arriérés déjà validées (passées par le modal). Si absent, lit window.arreteesDataFinal.
 */
function genererPDFArreteesFinal(infosPersonnelles, dataPrevalide) {
    let data = dataPrevalide;
    if (!data) {
        const result = getArreteesDataForPdf();
        if (!result.valid) {
            showToast('⚠️ ' + result.error, 'warning', 3000);
            return;
        }
        data = result.data;
    }

    // Utiliser le nouveau module (toujours disponible via expose-to-app.js)
    if (typeof window.genererPDFArreteesFromModules === 'function') {
        try {
            window.genererPDFArreteesFromModules(data, infosPersonnelles || {}, state);
            const classification = getActiveClassification();
            const accord = typeof window.AgreementLoader?.getActiveAgreement === 'function' ? window.AgreementLoader.getActiveAgreement() : null;
            const dateDebutStr = data.dateDebut instanceof Date ? data.dateDebut.toISOString().slice(0, 10) : (data.dateDebut ? String(data.dateDebut) : '');
            const dateFinStr = data.dateFin instanceof Date ? data.dateFin.toISOString().slice(0, 10) : (data.dateFin ? String(data.dateFin) : '');
            umamiTrackIfConsent('PDF arrieres', {
                totalArretees: data.totalArretees ?? 0,
                dateDebut: dateDebutStr,
                dateFin: dateFinStr,
                groupe: classification?.groupe ?? '',
                classe: classification?.classe ?? '',
                nbMois: state.nbMois ?? 12,
                accord: accord ? (accord.nomCourt || 'oui') : 'non'
            });
            if (accord && (accord.syndicatEmail || '').trim()) {
                showPostPdfSyndicatModal(accord);
            }
        } catch (error) {
            console.error('Erreur lors de la génération du PDF:', error);
            showToast('⚠️ Erreur lors de la génération du PDF. Veuillez recharger la page.', 'error', 5000);
        }
    } else {
        showToast('⚠️ Modules PDF non chargés. Veuillez recharger la page.', 'error', 5000);
    }
}

/** Sujet et corps du mail syndicat (réutilisés pour mailto, Gmail, Outlook.com). */
const SYNDICAT_MAIL_SUBJECT = `Arriérés de salaire – demande d'accompagnement`;
const SYNDICAT_MAIL_BODY = `Bonjour,\n\nJ'ai constaté un écart entre mon salaire et le minimum conventionnel (SMH) de la CCN Métallurgie.\n\nVous trouverez en pièces jointes :\n- Un projet de lettre de mise en demeure (Word éditable)\n- Une annexe technique avec le détail des calculs et références (PDF)\n\nCes documents sont indicatifs. Pourriez-vous les vérifier et m'accompagner dans les démarches si nécessaire ?\n\nCordialement`;

/**
 * Construit l’URL Gmail pour ouvrir une rédaction (to, sujet, corps). Pas de pièce jointe possible via URL.
 * @param {string} to - Email destinataire
 * @param {string} subject - Objet
 * @param {string} body - Corps du mail
 * @returns {string}
 */
function buildGmailComposeUrl(to, subject, body) {
    const params = new URLSearchParams();
    if (to) params.set('to', to);
    if (subject) params.set('su', subject);
    if (body) params.set('body', body);
    const q = params.toString();
    return `https://mail.google.com/mail/?view=cm&fs=1${q ? '&' + q : ''}`;
}

/**
 * Affiche la modal « union fait la force » après génération du PDF arriérés (accord avec syndicatEmail uniquement).
 * Propose mailto (logiciel par défaut), Gmail et Outlook.com pour joindre le syndicat.
 * @param {Object} agreement - Accord actif (doit avoir syndicatEmail et syndicatNom)
 */
function showPostPdfSyndicatModal(agreement) {
    const email = (agreement.syndicatEmail || '').trim();
    const nom = agreement.syndicatNom || 'le syndicat';
    if (!email) return;

    let overlay = document.getElementById('post-pdf-syndicat-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'post-pdf-syndicat-modal-overlay';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal pdf-infos-modal post-pdf-syndicat-modal" onclick="event.stopPropagation()">
                <h3 class="modal-title">L'union fait la force 💪</h3>
                <p><strong id="post-pdf-syndicat-nom">${nom}</strong> peut donner du poids à votre dossier — seul, c’est plus léger. Envoyez-lui le rapport (mail ou visite) et il se fera un plaisir de vous aider.</p>
                <p class="post-pdf-syndicat-notice">Une fois le mail ouvert, <strong>ajoutez les documents en pièces jointes</strong> (lettre Word + annexe technique PDF). Les liens ci-dessous ne peuvent pas joindre les fichiers à votre place.</p>
                <div class="modal-actions modal-actions-spaced">
                    <button type="button" class="book-btn btn-secondary" id="post-pdf-syndicat-close">Je gère</button>
                    <button type="button" class="book-btn btn-primary" id="post-pdf-syndicat-mailto">Ouvrir ma messagerie</button>
                </div>
                <p class="post-pdf-syndicat-webmail">Pas de messagerie sur cet appareil ? <a href="#" id="post-pdf-syndicat-gmail">Ouvrir dans Gmail</a></p>
            </div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('visible'); });

        function closeAndCelebrate(ag) {
            overlay.classList.remove('visible');
            showPostPdfCelebration(ag);
        }
        document.getElementById('post-pdf-syndicat-close').addEventListener('click', () => closeAndCelebrate(overlay._agreement));

        function openMail(ag) {
            const to = (ag && (ag.syndicatEmail || '').trim()) || '';
            const subject = encodeURIComponent(SYNDICAT_MAIL_SUBJECT);
            const body = encodeURIComponent(SYNDICAT_MAIL_BODY);
            if (to) {
                window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
            } else {
                window.location.href = `mailto:?subject=${subject}&body=${body}`;
            }
            closeAndCelebrate(ag);
        }
        document.getElementById('post-pdf-syndicat-mailto').addEventListener('click', () => openMail(overlay._agreement));

        document.getElementById('post-pdf-syndicat-gmail').addEventListener('click', (e) => {
            e.preventDefault();
            const ag = overlay._agreement;
            const to = (ag && (ag.syndicatEmail || '').trim()) || '';
            window.open(buildGmailComposeUrl(to, SYNDICAT_MAIL_SUBJECT, SYNDICAT_MAIL_BODY), '_blank', 'noopener');
            closeAndCelebrate(ag);
        });
    }
    overlay._agreement = agreement;
    const nomEl = document.getElementById('post-pdf-syndicat-nom');
    if (nomEl) nomEl.textContent = nom;
    overlay.classList.add('visible');
}

/**
 * Célébration discrète après clic sur un bouton de la modal post-PDF : animation légère, message de félicitations,
 * option « Renvoyer le mail » (réouvre la modal post-PDF) ou « Fermer ».
 * @param {Object} [agreement] - Accord (pour rouvrir la modal « envoyer au syndicat » si besoin)
 */
function showPostPdfCelebration(agreement) {
    let overlay = document.getElementById('post-pdf-celebration-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'post-pdf-celebration-overlay';
        overlay.className = 'celebration-overlay';
        const confettiCount = 24;
        let confettiHtml = '';
        const colors = ['#E15C12', '#c04e0f', '#f4a261', '#d97706', '#a3a3a3', '#6b8e6b'];
        for (let i = 0; i < confettiCount; i++) {
            const left = 5 + Math.random() * 90;
            const delay = Math.random() * 0.8;
            const duration = 1.8 + Math.random() * 0.6;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 6 + Math.floor(Math.random() * 4);
            confettiHtml += `<span class="celebration-confetti" style="left:${left}%; animation-delay:${delay}s; animation-duration:${duration}s; background:${color}; width:${size}px; height:${size}px;"></span>`;
        }
        overlay.innerHTML = `
            <div class="celebration-confetti-container">${confettiHtml}</div>
            <div class="celebration-card" onclick="event.stopPropagation()">
                <div class="celebration-icon" aria-hidden="true">✓</div>
                <h3 class="celebration-title">Félicitations 🎉</h3>
                <p class="celebration-text">Vous avez mené la simulation à son terme.</p>
                <p class="celebration-hint">Si l'envoi du mail a échoué, rouvrez la fenêtre pour réessayer.</p>
                <div class="celebration-actions">
                    <button type="button" class="book-btn btn-primary" id="celebration-resend">Renvoyer le mail</button>
                    <button type="button" class="book-btn btn-secondary" id="celebration-close">Fermer</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('visible'); });
        document.getElementById('celebration-close').addEventListener('click', () => overlay.classList.remove('visible'));
        document.getElementById('celebration-resend').addEventListener('click', () => {
            overlay.classList.remove('visible');
            if (overlay._agreement && (overlay._agreement.syndicatEmail || '').trim()) {
                showPostPdfSyndicatModal(overlay._agreement);
            }
        });
        document.addEventListener('visibilitychange', function celebrationOnVisibilityChange() {
            const el = document.getElementById('post-pdf-celebration-overlay');
            if (!el) return;
            if (document.visibilityState === 'hidden') {
                if (el.classList.contains('visible')) el._celebrationWasHidden = true;
                return;
            }
            if (document.visibilityState === 'visible' && el.classList.contains('visible') && el._celebrationWasHidden && !el.classList.contains('celebration-animated')) {
                el._celebrationWasHidden = false;
                el.classList.add('celebration-animated');
            }
        });
    }
    overlay._agreement = agreement;
    overlay._celebrationWasHidden = false;
    overlay.classList.remove('celebration-animated');
    overlay.classList.add('visible');
}

/**
 * Afficher les instructions juridiques interactives (version carrousel)
 */
let legalCarouselIndex = 0;
let legalGuidePlaceholder = false;
const legalCarouselSteps = [
    {
        title: 'Vérification des informations',
        content: `
            <p>Avant toute démarche, vérifiez attentivement que toutes les informations sont correctes :</p>
            <ul>
                <li>Votre classification (Groupe/Classe)</li>
                <li>Votre ancienneté dans l'entreprise</li>
                <li>Les dates (embauche, changement de classification, rupture si applicable)</li>
                <li>Les salaires saisis mois par mois</li>
            </ul>
            <p><strong>Conseil :</strong> Comparez avec vos bulletins de paie et votre contrat de travail.</p>
        `
    },
    {
        title: 'Consultation professionnelle',
        content: `
            <p><strong>Important :</strong> Ce calcul est un outil d'aide et ne constitue pas un avis juridique. Avant toute démarche, consultez :</p>
            <ul>
                <li><strong>Un avocat spécialisé en droit du travail</strong> pour un conseil juridique personnalisé</li>
                <li><strong>Votre syndicat</strong> qui peut vous accompagner dans vos démarches</li>
                <li><strong>L'inspection du travail</strong> pour des informations sur vos droits</li>
            </ul>
            <p>Ces professionnels pourront vous aider à évaluer la pertinence de votre demande et les chances de succès.</p>
        `
    },
    {
        title: 'Rassemblement des preuves',
        content: `
            <p>Pour appuyer votre demande, rassemblez tous les documents suivants :</p>
            <ul>
                <li><strong>Bulletins de paie</strong> de toute la période concernée</li>
                <li><strong>Contrat de travail</strong> et tous les avenants</li>
                <li><strong>Correspondances écrites</strong> mentionnant votre classification ou votre salaire</li>
                <li><strong>Fiches de poste</strong> ou descriptions de fonction</li>
                <li><strong>Évaluations</strong> ou entretiens annuels</li>
                <li><strong>Emails ou courriers</strong> relatifs à votre rémunération</li>
            </ul>
            <p>Organisez ces documents par ordre chronologique pour faciliter leur consultation.</p>
        `
    },
    {
        title: 'Demande amiable',
        content: `
            <p>La première étape consiste à faire une demande amiable à votre employeur :</p>
            <ul>
                <li>Rédigez une <strong>lettre recommandée avec accusé de réception (LRAR)</strong></li>
                <li>Joignez le <strong>rapport PDF généré</strong> par cet outil</li>
                <li>Incluez les <strong>copies de vos bulletins de paie</strong> et autres justificatifs</li>
                <li>Demandez un <strong>règlement des arriérés</strong> dans un délai raisonnable (ex: 1 mois)</li>
            </ul>
            <p><strong>Ton à adopter :</strong> Restez courtois et factuel. Présentez les faits de manière objective et référez-vous à la convention collective.</p>
        `
    },
    {
        title: 'Médiation ou saisine juridictionnelle',
        content: `
            <p>Si votre demande amiable n'aboutit pas ou est refusée :</p>
            <ul>
                <li><strong>Médiation :</strong> Vous pouvez proposer une médiation pour trouver un accord à l'amiable</li>
                <li><strong>Conseil de Prud'hommes :</strong> Vous pouvez saisir le Conseil de Prud'hommes compétent</li>
                <li><strong>Délai de prescription :</strong> Attention, la prescription est de <strong>3 ans</strong> à compter de chaque échéance de paiement (Art. L.3245-1 Code du travail)</li>
            </ul>
            <p><strong>Important :</strong> Conservez toutes les preuves de vos démarches (copies de lettres, accusés de réception, etc.).</p>
        `
    },
    {
        title: 'Délais et prescription',
        content: `
            <p>Respectez impérativement les délais légaux :</p>
            <ul>
                <li><strong>Prescription :</strong> 3 ans à compter de chaque échéance de paiement (chaque mois est une échéance distincte)</li>
                <li><strong>Délai de réponse LRAR :</strong> Généralement 1 mois pour une réponse de l'employeur</li>
                <li><strong>Saisine Prud'hommes :</strong> Doit être effectuée dans les délais de prescription</li>
                <li><strong>CCNM ${CCNM_EFFECTIVE_YEAR} :</strong> Les arriérés antérieurs au 1er janvier ${CCNM_EFFECTIVE_YEAR} ne sont pas réclamables au titre de cette convention</li>
            </ul>
            <p><strong>Conseil :</strong> Ne tardez pas à agir. Plus vous attendez, plus vous risquez de perdre le droit à certains arriérés par prescription.</p>
        `
    }
];

function afficherInstructionsJuridiques() {
    const carouselContent = document.getElementById('legal-carousel-content');
    const carouselCurrent = document.getElementById('legal-carousel-current');
    const carouselTotal = document.getElementById('legal-carousel-total');
    
    if (!carouselContent) return;
    
    // Mettre à jour le total
    if (carouselTotal) {
        carouselTotal.textContent = legalCarouselSteps.length;
    }
    
    // Générer le contenu du carrousel
    carouselContent.innerHTML = legalCarouselSteps.map((step, index) => `
        <div class="carousel-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
            <div class="legal-step">
                <h4><span class="legal-step-number">${index + 1}</span> ${step.title}</h4>
                <div class="legal-step-content">
                    ${step.content}
                </div>
            </div>
        </div>
    `).join('');
    
    // Mettre à jour l'index actuel
    legalCarouselIndex = 0;
    updateLegalCarousel();
}

/**
 * Mettre à jour l'affichage du carrousel juridique
 */
function updateLegalCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    const carouselCurrent = document.getElementById('legal-carousel-current');
    const carouselPrev = document.getElementById('legal-carousel-prev');
    const carouselNext = document.getElementById('legal-carousel-next');
    
    slides.forEach((slide, index) => {
        if (index === legalCarouselIndex) {
            slide.classList.add('active');
        } else {
            slide.classList.remove('active');
        }
    });
    
    if (carouselCurrent) {
        carouselCurrent.textContent = legalCarouselIndex + 1;
    }
    
    if (carouselPrev) {
        carouselPrev.disabled = legalCarouselIndex === 0;
    }
    
    if (carouselNext) {
        carouselNext.disabled = legalCarouselIndex === legalCarouselSteps.length - 1;
    }
}

/**
 * Initialiser le carrousel juridique
 */
function initLegalCarousel() {
    const carouselPrev = document.getElementById('legal-carousel-prev');
    const carouselNext = document.getElementById('legal-carousel-next');
    
    if (carouselPrev) {
        carouselPrev.addEventListener('click', () => {
            if (legalGuidePlaceholder) return;
            if (legalCarouselIndex > 0) {
                legalCarouselIndex--;
                updateLegalCarousel();
            }
        });
    }
    
    if (carouselNext) {
        carouselNext.addEventListener('click', () => {
            if (legalGuidePlaceholder) return;
            if (legalCarouselIndex < legalCarouselSteps.length - 1) {
                legalCarouselIndex++;
                updateLegalCarousel();
            }
        });
    }
    
    // Navigation au clavier
    document.addEventListener('keydown', (e) => {
        if (legalGuidePlaceholder) return;
        const legalCarousel = document.getElementById('legal-instructions');
        if (legalCarousel && !legalCarousel.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft' && legalCarouselIndex > 0) {
                legalCarouselIndex--;
                updateLegalCarousel();
            } else if (e.key === 'ArrowRight' && legalCarouselIndex < legalCarouselSteps.length - 1) {
                legalCarouselIndex++;
                updateLegalCarousel();
            }
        }
    });
}

/**
 * ============================================
 * ARRIÉRÉS DE SALAIRE - ANCIENNE VERSION (à supprimer progressivement)
 * ============================================
 */

function initArretees() {
    const ruptureCheckbox = document.getElementById('rupture-contrat');
    const dateRuptureGroup = document.getElementById('date-rupture-group');
    const btnCalculer = document.getElementById('btn-calculer-arretees');
    const btnGenererPDF = document.getElementById('btn-generer-pdf');

    // Afficher/masquer la date de rupture
    if (ruptureCheckbox && dateRuptureGroup) {
        ruptureCheckbox.addEventListener('change', (e) => {
            dateRuptureGroup.classList.toggle('hidden', !e.target.checked);
        });
    }

    // Calculer les arriérés
    if (btnCalculer) {
        btnCalculer.addEventListener('click', calculerArretees);
    }

    // Générer le PDF
    if (btnGenererPDF) {
        btnGenererPDF.addEventListener('click', () => genererPDFArreteesFinal());
    }

    // Pré-remplir la date d'embauche basée sur l'ancienneté
    updateDateEmbaucheFromAnciennete();
}

/**
 * ============================================
 * FONCTIONS OBSOLÈTES SUPPRIMÉES
 * ============================================
 * 
 * Les fonctions calculerArretees() et afficherResultatsArretees() ont été supprimées
 * car elles utilisaient des IDs HTML obsolètes et ont été remplacées par :
 * - calculerArreteesFinal()
 * - afficherResultatsArreteesFinal()
 */

/**
 * Générer le PDF du rapport d'arriérés
 */

// Initialiser le graphique après le chargement
document.addEventListener('DOMContentLoaded', () => {
    initEvolutionChart();
    initArretees();
    
    // Recalculer les roulettes lors du redimensionnement (debounced)
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Rafraîchir les roulettes si l'étape 1c est visible
            const step1c = document.getElementById('step-1c');
            if (step1c && !step1c.classList.contains('hidden')) {
                refreshAllRoulettes();
            }
        }, 150);
    });
});
