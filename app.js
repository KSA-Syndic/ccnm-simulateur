/**
 * ============================================
 * APP.JS - Logique Application Simulateur
 * Convention Collective Métallurgie 2024
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
    arretesSurSMHSeul: true,     // true = salaire dû = assiette SMH (base + forfait ; exclut primes, pénibilité, nuit/dim/équipe)
    
    // === CLASSIFICATION ===
    scores: [1, 1, 1, 1, 1, 1],  // Scores des 6 critères (1-10)
    modeManuel: false,           // Mode automatique par défaut
    groupeManuel: 'A',           // Groupe sélectionné manuellement
    classeManuel: 1,             // Classe sélectionnée manuellement
    
    // === SITUATION ===
    anciennete: 0,               // Ancienneté (Non-Cadres)
    pointTerritorial: 5.90,      // Valeur du Point Territorial - Bas-Rhin (2025)
    forfait: '35h',              // Type de forfait (Cadres)
    experiencePro: 0,            // Expérience professionnelle (Barème débutants F11/F12)
    
    // === CONDITIONS DE TRAVAIL (Non-Cadres) ===
    typeNuit: 'aucun',           // 'aucun', 'poste-nuit', 'poste-matin'
    heuresNuit: 0,               // Heures de nuit mensuelles
    travailDimanche: false,      // Travail le dimanche
    heuresDimanche: 0,           // Heures dimanche mensuelles
    travailEquipe: false,        // Travail en équipes postées
    heuresEquipe: 151.67,        // Heures mensuelles en équipe
    
    // === ACCORD ENTREPRISE KUHN ===
    accordKuhn: false,           // Accord d'entreprise activé
    primeVacances: true,         // Prime de vacances (525€)
    
    // === AFFICHAGE ===
    nbMois: 12                   // Répartition mensuelle (12 ou 13 mois)
};

/** Source de vérité unique pour les données PDF arriérés (étape 4). Remplit uniquement par calculerArreteesFinal / afficherResultatsArreteesFinal, vidé par invalidateArreteesDataFinal. */
let arreteesPdfStore = null;

/**
 * ============================================
 * INITIALISATION
 * ============================================
 */
document.addEventListener('DOMContentLoaded', () => {
    initWizard();
    initRoulettes();
    initControls();
    initTooltips();
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
 * Sauvegarder le salaire actuel et passer au suivant avec animation
 * Le salaire est maintenant stocké en mensuel brut
 */
function saveCurrentSalaryAndNext() {
    if (periodsData.length === 0 || currentPeriodIndex >= periodsData.length) return;

    const floatingInput = document.getElementById('floating-salary-input');
    const floatingBlock = document.getElementById('floating-input-block');
    const amount = parseFloat(floatingInput?.value) || 0;

    if (amount > 0) {
        const currentPeriod = periodsData[currentPeriodIndex];
        // Stocker en mensuel brut (pas besoin de diviser par 12)
        state.salairesParMois[currentPeriod.key] = amount;
        currentPeriod.salaireReel = amount;
        
        // Animation : le bloc se rétrécit et se déplace vers le point puis disparaît
        if (floatingBlock && salaryCurveChart) {
            animateBlockToPoint(floatingBlock, currentPeriodIndex, () => {
                updateCurveChart();
                const nextIndex = periodsData.findIndex((p, i) => i > currentPeriodIndex && !p.salaireReel);
                const firstMissing = periodsData.findIndex(p => !p.salaireReel);
                if (nextIndex !== -1) {
                    currentPeriodIndex = nextIndex;
                    floatingBlock.classList.remove('floating-block-hidden');
                    floatingBlock.style.visibility = '';
                    updateCurveControls();
                    floatingBlock.style.opacity = '0.88';
                    floatingBlock.style.transform = 'translate(-50%, -50%) scale(0.92)';
                    floatingBlock.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
                    requestAnimationFrame(() => {
                        floatingBlock.style.opacity = '1';
                        floatingBlock.style.transform = 'translate(-50%, -50%) scale(1)';
                    });
                } else if (firstMissing !== -1) {
                    currentPeriodIndex = firstMissing;
                    floatingBlock.classList.remove('floating-block-hidden');
                    floatingBlock.style.visibility = '';
                    updateCurveControls();
                    floatingBlock.style.opacity = '0.88';
                    floatingBlock.style.transform = 'translate(-50%, -50%) scale(0.92)';
                    floatingBlock.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
                    requestAnimationFrame(() => {
                        floatingBlock.style.opacity = '1';
                        floatingBlock.style.transform = 'translate(-50%, -50%) scale(1)';
                    });
                } else {
                    // Dernier salaire saisi : fermer le popup et ne plus rouvrir pour laisser contempler le graphique complet
                    currentPeriodIndex = Math.min(currentPeriodIndex + 1, periodsData.length - 1);
                    updateCurveChart();
                    dismissFloatingBlockFromGraph();
                    showToast('✅ Tous les salaires ont été saisis ! Vous pouvez cliquer sur un point pour modifier un mois, puis calculer les arriérés.', 'success', 4000);
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
        if (!arreteesPdfStore && !window.arreteesDataFinal) {
            initTimeline();
        }
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
    const forfaitSelect = document.getElementById('forfait');
    const experienceProInput = document.getElementById('experience-pro');

    // Amélioration UX : sélectionner automatiquement le contenu au focus
    function setupNumberInputUX(input) {
        if (!input) return;
        input.addEventListener('focus', function() {
            // Sélectionner tout le contenu pour faciliter la modification
            this.select();
        });
    }

    // Appliquer à tous les champs numériques
    setupNumberInputUX(ancienneteInput);
    setupNumberInputUX(pointTerritorialInput);
    setupNumberInputUX(experienceProInput);
    setupNumberInputUX(document.getElementById('heures-nuit'));
    setupNumberInputUX(document.getElementById('heures-dimanche'));
    setupNumberInputUX(document.getElementById('heures-equipe'));
    setupNumberInputUX(document.getElementById('age-actuel'));
    setupNumberInputUX(document.getElementById('augmentation-annuelle'));

    ancienneteInput.addEventListener('input', (e) => {
        state.anciennete = parseInt(e.target.value) || 0;
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
        state.pointTerritorial = parseFloat(e.target.value) || CONFIG.POINT_TERRITORIAL_DEFAUT;
        updateAll();
    });

    forfaitSelect.addEventListener('change', (e) => {
        state.forfait = e.target.value;
        updateConditionsTravailDisplay();
        updateAll();
    });

    // Variable pour suivre si on vient de forcer une valeur
    let experienceProWasForced = false;

    experienceProInput.addEventListener('input', (e) => {
        let value = parseInt(e.target.value) || 0;
        const attemptedValue = value;
        
        // L'expérience pro ne peut pas être inférieure à l'ancienneté
        if (value < state.anciennete && state.anciennete > 0) {
            // Afficher le message d'avertissement
            experienceProWasForced = true;
            value = state.anciennete;
            experienceProInput.value = value;
            // Mettre à jour la validation pour afficher le message
            updateExperienceProValidation(attemptedValue);
        } else {
            experienceProWasForced = false;
            updateExperienceProValidation();
        }
        
        state.experiencePro = value;
        updateAll();
    });

    // Au blur, masquer le message si la valeur est correcte
    experienceProInput.addEventListener('blur', () => {
        if (state.experiencePro >= state.anciennete) {
            experienceProWasForced = false;
            updateExperienceProValidation();
        }
    });

    // Validation initiale
    updateExperienceProValidation();

    // ═══════════════════════════════════════════════════════════════
    // CONTRÔLES CONDITIONS DE TRAVAIL (Non-Cadres)
    // ═══════════════════════════════════════════════════════════════

    // Travail de nuit
    const typeNuitSelect = document.getElementById('type-nuit');
    const heuresNuitField = document.getElementById('heures-nuit-field');
    const heuresNuitInput = document.getElementById('heures-nuit');
    
    typeNuitSelect.addEventListener('change', (e) => {
        state.typeNuit = e.target.value;
        heuresNuitField.classList.toggle('hidden', e.target.value === 'aucun');
        updateTauxInfo();
        updateAll();
    });
    
    heuresNuitInput.addEventListener('input', (e) => {
        state.heuresNuit = parseFloat(e.target.value) || 0;
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
        state.heuresDimanche = parseFloat(e.target.value) || 0;
        updateAll();
    });

    // Travail en équipe
    const travailEquipeCheckbox = document.getElementById('travail-equipe');
    const heuresEquipeField = document.getElementById('heures-equipe-field');
    const heuresEquipeInput = document.getElementById('heures-equipe');
    
    travailEquipeCheckbox.addEventListener('change', (e) => {
        const wasChecked = state.travailEquipe;
        const isChecked = e.target.checked;
        
        // Si l'utilisateur coche sans accord Kuhn activé, activer automatiquement l'accord
        if (isChecked && !state.accordKuhn) {
            state.accordKuhn = true;
            const accordKuhnCheckbox = document.getElementById('accord-kuhn');
            if (accordKuhnCheckbox) {
                accordKuhnCheckbox.checked = true;
            }
            const accordOptions = document.getElementById('accord-options');
            if (accordOptions) {
                accordOptions.classList.remove('hidden');
            }
            showToast('✅ L\'accord d\'entreprise Kuhn a été activé automatiquement pour permettre cette option.', 'success', 4000);
            // Mettre à jour l'affichage des conditions de travail et des taux
            updateConditionsTravailDisplay();
            updateTauxInfo();
        }
        
        state.travailEquipe = isChecked;
        heuresEquipeField.classList.toggle('hidden', !isChecked);
        updateAll();
    });
    
    heuresEquipeInput.addEventListener('input', (e) => {
        state.heuresEquipe = parseFloat(e.target.value) || 0;
        updateAll();
    });

    // ═══════════════════════════════════════════════════════════════
    // CONTRÔLES ACCORD ENTREPRISE KUHN
    // ═══════════════════════════════════════════════════════════════
    
    const accordKuhnCheckbox = document.getElementById('accord-kuhn');
    const accordOptions = document.getElementById('accord-options');
    
    // Checkbox principal accord Kuhn
    if (accordKuhnCheckbox) {
        accordKuhnCheckbox.addEventListener('change', (e) => {
            const wasActive = state.accordKuhn;
            const isActive = e.target.checked;
            state.accordKuhn = isActive;
            
            // Si l'accord est activé, informer que la prime d'équipe est disponible (pour non-cadres)
            if (!wasActive && isActive) {
                const { classe } = getActiveClassification();
                const isCadre = classe >= CONFIG.SEUIL_CADRE;
                if (!isCadre) {
                    showToast('💡 L\'option "Travail en équipes postées" est maintenant disponible dans l\'étape Situation.', 'info', 4000);
                }
            }
            
            // Si l'accord est désactivé alors que la prime d'équipe est cochée
            if (wasActive && !isActive && state.travailEquipe) {
                state.travailEquipe = false;
                const travailEquipeCheckbox = document.getElementById('travail-equipe');
                if (travailEquipeCheckbox) {
                    travailEquipeCheckbox.checked = false;
                }
                const heuresEquipeField = document.getElementById('heures-equipe-field');
                if (heuresEquipeField) {
                    heuresEquipeField.classList.add('hidden');
                }
                showToast('ℹ️ L\'option "Travail en équipes postées" a été décochée car l\'accord d\'entreprise n\'est plus actif.', 'info', 4000);
            }
            
            // Afficher/masquer les options détaillées
            if (accordOptions) {
                if (state.accordKuhn) {
                    accordOptions.classList.remove('hidden');
                } else {
                    accordOptions.classList.add('hidden');
                }
            }
            
            updateConditionsTravailDisplay();
            updateTauxInfo();
            updateAll();
        });
    }

    // Prime de vacances
    const primeVacancesCheckbox = document.getElementById('prime-vacances');
    if (primeVacancesCheckbox) {
        primeVacancesCheckbox.addEventListener('change', (e) => {
            state.primeVacances = e.target.checked;
            updateAll();
        });
    }
    
    // Toggle nombre de mois (12 ou 13)
    const monthBtns = document.querySelectorAll('.month-btn');
    monthBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            monthBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.nbMois = parseInt(btn.dataset.months);
            updateRemunerationDisplay(calculateRemuneration());
        });
    });
}

/**
 * Mettre à jour la validation du champ expérience professionnelle
 * @param {number} attemptedValue - Valeur que l'utilisateur a tenté de saisir (optionnel)
 */
function updateExperienceProValidation(attemptedValue = null) {
    const experienceProInput = document.getElementById('experience-pro');
    const experienceProGroup = experienceProInput?.closest('.form-group');
    if (!experienceProGroup) return;

    // Retirer l'ancien message s'il existe
    const existingError = experienceProGroup.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }

    // Vérifier si l'expérience est inférieure à l'ancienneté
    const experienceValue = parseInt(experienceProInput.value) || 0;
    
    // Afficher le message si l'utilisateur a tenté de mettre une valeur inférieure
    if (attemptedValue !== null && attemptedValue < state.anciennete && state.anciennete > 0) {
        const errorMsg = document.createElement('div');
        errorMsg.className = 'field-error';
        errorMsg.textContent = `⚠️ La valeur saisie (${attemptedValue} ans) a été corrigée. L'expérience professionnelle ne peut pas être inférieure à l'ancienneté dans l'entreprise (${state.anciennete} ans minimum).`;
        experienceProGroup.appendChild(errorMsg);
        experienceProInput.classList.add('input-error');
    } else if (experienceValue < state.anciennete && state.anciennete > 0) {
        // Cas où la valeur est toujours incorrecte (ne devrait pas arriver normalement)
        const errorMsg = document.createElement('div');
        errorMsg.className = 'field-error';
        errorMsg.textContent = `L'expérience professionnelle ne peut pas être inférieure à l'ancienneté dans l'entreprise (${state.anciennete} ans minimum).`;
        experienceProGroup.appendChild(errorMsg);
        experienceProInput.classList.add('input-error');
    } else {
        experienceProInput.classList.remove('input-error');
    }
}

/**
 * Mettre à jour l'affichage des conditions de travail selon statut et forfait
 */
function updateConditionsTravailDisplay() {
    const { classe } = getActiveClassification();
    const isCadre = classe >= CONFIG.SEUIL_CADRE;
    const isForfaitJours = state.forfait === 'jours';
    
    const conditionsTravail = document.getElementById('conditions-travail');
    const hintForfaitJours = document.getElementById('hint-forfait-jours');
    const groupNuit = document.getElementById('group-nuit');
    const groupDimanche = document.getElementById('group-dimanche');
    const primeEquipeGroup = document.getElementById('prime-equipe-group');
    
    // Cadres au forfait jours : pas de majorations financières (repos uniquement)
    if (isCadre && isForfaitJours) {
        hintForfaitJours.classList.remove('hidden');
        groupNuit.classList.add('hidden');
        groupDimanche.classList.add('hidden');
        primeEquipeGroup.classList.add('hidden');
        
        // Reset les valeurs
        state.typeNuit = 'aucun';
        state.travailDimanche = false;
        state.travailEquipe = false;
        document.getElementById('type-nuit').value = 'aucun';
        document.getElementById('travail-dimanche').checked = false;
        document.getElementById('travail-equipe').checked = false;
        document.getElementById('heures-nuit-field').classList.add('hidden');
        document.getElementById('heures-dimanche-field').classList.add('hidden');
        document.getElementById('heures-equipe-field').classList.add('hidden');
    } else {
        hintForfaitJours.classList.add('hidden');
        groupNuit.classList.remove('hidden');
        groupDimanche.classList.remove('hidden');
        
        // Prime d'équipe : visible pour non-cadres (activée uniquement si accord Kuhn)
        if (!isCadre) {
            primeEquipeGroup.classList.remove('hidden');
        } else {
            primeEquipeGroup.classList.add('hidden');
            state.travailEquipe = false;
            const travailEquipeCheckbox = document.getElementById('travail-equipe');
            if (travailEquipeCheckbox) travailEquipeCheckbox.checked = false;
            document.getElementById('heures-equipe-field').classList.add('hidden');
        }
    }
}

/**
 * Mettre à jour les informations de taux appliqués (CCN vs Kuhn)
 */
function updateTauxInfo() {
    const tauxNuitInfo = document.getElementById('taux-nuit-info');
    const tauxDimancheInfo = document.getElementById('taux-dimanche-info');
    
    // Taux de nuit
    if (tauxNuitInfo) {
        if (state.typeNuit !== 'aucun') {
            if (state.accordKuhn) {
                const taux = state.typeNuit === 'poste-nuit' ? '+20%' : '+15%';
                tauxNuitInfo.textContent = `Taux Kuhn : ${taux}`;
                tauxNuitInfo.className = 'taux-applique kuhn';
            } else {
                tauxNuitInfo.textContent = 'Taux CCN : +15%';
                tauxNuitInfo.className = 'taux-applique';
            }
        } else {
            tauxNuitInfo.textContent = '';
        }
    }
    
    // Taux dimanche
    if (tauxDimancheInfo) {
        if (state.travailDimanche) {
            if (state.accordKuhn) {
                tauxDimancheInfo.textContent = 'Taux Kuhn : +50%';
                tauxDimancheInfo.className = 'taux-applique kuhn';
            } else {
                tauxDimancheInfo.textContent = 'Taux CCN : +100%';
                tauxDimancheInfo.className = 'taux-applique';
            }
        } else {
            tauxDimancheInfo.textContent = '';
        }
    }
}

/**
 * Mettre à jour l'affichage du mode (auto/manuel) - Legacy
 */
function updateModeDisplay() {
    // Fonction conservée pour compatibilité mais plus utilisée dans le wizard
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
 */

/**
 * ═══════════════════════════════════════════════════════════════
 * CALCULS ACCORD ENTREPRISE KUHN
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Calculer la prime d'ancienneté selon l'accord Kuhn (Art. 2.1)
 * @param {number} salaireBase - SMH de base annuel
 * @param {number} anciennete - Années d'ancienneté
 * @returns {object} { montant, taux, annees }
 */
function calculatePrimeKuhn(salaireBase, anciennete) {
    const accord = CONFIG.ACCORD_ENTREPRISE.anciennete;
    
    // Pas de prime si ancienneté < seuil (2 ans)
    if (anciennete < accord.seuil) {
        return { montant: 0, taux: 0, annees: 0 };
    }
    
    // Plafonner l'ancienneté
    const anneesPrime = Math.min(anciennete, accord.plafond);
    
    // Déterminer le taux selon le barème Kuhn
    let taux = 0;
    if (anneesPrime >= 25) {
        taux = accord.barème[25]; // 16%
    } else if (anneesPrime >= 15) {
        taux = accord.barème[15]; // 15%
    } else {
        taux = accord.barème[anneesPrime] || 0;
    }
    
    const montant = Math.round(salaireBase * taux);
    const tauxPourcent = Math.round(taux * 100);
    
    return { montant, taux: tauxPourcent, annees: anneesPrime };
}

/**
 * Calculer la prime d'équipe selon l'accord Kuhn (Art. 2.2)
 * @param {number} heuresMensuelles - Heures travaillées en équipe par mois
 * @returns {object} { montantMensuel, montantAnnuel }
 */
function calculatePrimeEquipe(heuresMensuelles) {
    const tauxHoraire = CONFIG.ACCORD_ENTREPRISE.primeEquipe.montantHoraire;
    const montantMensuel = Math.round(heuresMensuelles * tauxHoraire * 100) / 100;
    const montantAnnuel = Math.round(montantMensuel * 12);
    return { montantMensuel, montantAnnuel, tauxHoraire };
}

/**
 * Calculer les majorations de nuit (taux automatique selon accord Kuhn)
 * @param {string} typeNuit - 'aucun', 'poste-nuit', 'poste-matin'
 * @param {number} heuresNuit - Heures de nuit mensuelles
 * @param {number} tauxHoraire - Taux horaire de base
 * @param {boolean} accordKuhn - Accord Kuhn actif
 * @returns {object} { montantMensuel, montantAnnuel, taux, source }
 */
function calculateMajorationNuit(typeNuit, heuresNuit, tauxHoraire, accordKuhn) {
    if (typeNuit === 'aucun' || heuresNuit === 0) {
        return { montantMensuel: 0, montantAnnuel: 0, taux: 0, source: '' };
    }
    
    let taux = 0;
    let source = '';
    
    if (accordKuhn) {
        // Taux Kuhn
        taux = typeNuit === 'poste-nuit' 
            ? CONFIG.ACCORD_ENTREPRISE.majorationsNuit.posteNuit  // 20%
            : CONFIG.ACCORD_ENTREPRISE.majorationsNuit.posteMatin; // 15%
        source = 'Kuhn';
    } else {
        // Taux CCN (toujours 15%)
        taux = CONFIG.MAJORATIONS_CCN.nuit;
        source = 'CCN';
    }
    
    const montantMensuel = Math.round(heuresNuit * tauxHoraire * taux * 100) / 100;
    const montantAnnuel = Math.round(montantMensuel * 12);
    
    return { montantMensuel, montantAnnuel, taux: Math.round(taux * 100), source };
}

/**
 * Calculer les majorations dimanche (taux automatique selon accord Kuhn)
 * @param {number} heuresDimanche - Heures dimanche mensuelles
 * @param {number} tauxHoraire - Taux horaire de base
 * @param {boolean} accordKuhn - Accord Kuhn actif
 * @returns {object} { montantMensuel, montantAnnuel, taux, source }
 */
function calculateMajorationDimanche(heuresDimanche, tauxHoraire, accordKuhn) {
    if (heuresDimanche === 0) {
        return { montantMensuel: 0, montantAnnuel: 0, taux: 0, source: '' };
    }
    
    let taux = 0;
    let source = '';
    
    if (accordKuhn) {
        taux = CONFIG.ACCORD_ENTREPRISE.majorationDimanche; // 50%
        source = 'Kuhn';
    } else {
        taux = CONFIG.MAJORATIONS_CCN.dimanche; // 100%
        source = 'CCN';
    }
    
    const montantMensuel = Math.round(heuresDimanche * tauxHoraire * taux * 100) / 100;
    const montantAnnuel = Math.round(montantMensuel * 12);
    
    return { montantMensuel, montantAnnuel, taux: Math.round(taux * 100), source };
}

function calculateRemuneration() {
    const { groupe, classe } = getActiveClassification();
    const isCadre = classe >= CONFIG.SEUIL_CADRE;
    const isGroupeF = classe === 11 || classe === 12;
    
    let baseSMH = CONFIG.SMH[classe];
    let details = [];
    let total = baseSMH;
    let scenario = '';

    if (!isCadre) {
        // SCÉNARIO 1 : Non-Cadres (Classes 1 à 10)
        scenario = 'non-cadre';
        details.push({
            label: `SMH Base (${groupe}${classe})`,
            value: baseSMH,
            isBase: true
        });

        // Prime d'ancienneté
        if (state.accordKuhn) {
            // ACCORD KUHN : Prime = SMH × Taux%
            const primeKuhn = calculatePrimeKuhn(baseSMH, state.anciennete);
            if (primeKuhn.montant > 0) {
                details.push({
                    label: `Prime ancienneté Kuhn (${formatMoney(baseSMH)} × ${primeKuhn.taux}%)`,
                    value: primeKuhn.montant,
                    isPositive: true,
                    isKuhn: true
                });
                total += primeKuhn.montant;
            }
        } else {
            // Convention Collective : Formule [[Point × Taux%] × 100] × Années (résultat mensuel)
            // Taux stocké comme 1.45 = 1,45%, donc Taux% = Taux/100
            // Simplifié : Point × Taux × Années (mensuel), puis × 12 pour annuel
            if (state.anciennete >= CONFIG.ANCIENNETE.seuil) {
                const anneesPrime = Math.min(state.anciennete, CONFIG.ANCIENNETE.plafond); // Plafond 15 ans
                const tauxClasse = CONFIG.TAUX_ANCIENNETE[classe] || 0;
                const montantMensuel = state.pointTerritorial * tauxClasse * anneesPrime;
                const montantPrime = Math.round(montantMensuel * 12);
                
                details.push({
                    label: `Prime ancienneté CCN (${state.pointTerritorial}€ × ${tauxClasse}% × ${anneesPrime} ans × 12)`,
                    value: montantPrime,
                    isPositive: true
                });
                
                total += montantPrime;
            }
        }

    } else if ((classe === 11 || classe === 12) && state.experiencePro < 6) {
        // SCÉNARIO 3 : Cadres Débutants (F11/F12 avec expérience < 6 ans)
        scenario = 'cadre-debutant';
        
        // Déterminer la tranche d'expérience (0, 2, 4, 6)
        let tranche = 0;
        if (state.experiencePro >= 4) tranche = 4;
        else if (state.experiencePro >= 2) tranche = 2;
        
        // Récupérer le SMH du barème débutants
        const bareme = CONFIG.BAREME_DEBUTANTS[classe];
        baseSMH = bareme[tranche];
        
        // Label de la tranche
        let labelTranche = '< 2 ans';
        if (tranche === 2) labelTranche = '2 à 4 ans';
        else if (tranche === 4) labelTranche = '4 à 6 ans';
        
        details.push({
            label: `Barème débutants ${groupe}${classe} (${labelTranche})`,
            value: baseSMH,
            isBase: true
        });

        // Majoration forfait
        const tauxForfait = CONFIG.FORFAITS[state.forfait];
        if (tauxForfait > 0) {
            const montantForfait = Math.round(baseSMH * tauxForfait);
            const labelForfait = state.forfait === 'heures' ? 'Forfait Heures (+15%)' : 'Forfait Jours (+30%)';
            
            details.push({
                label: labelForfait,
                value: montantForfait,
                isPositive: true
            });
            
            total = baseSMH + montantForfait;
        } else {
            total = baseSMH;
        }

        // Prime ancienneté Kuhn (applicable aussi aux cadres débutants)
        if (state.accordKuhn) {
            const primeKuhn = calculatePrimeKuhn(baseSMH, state.anciennete);
            if (primeKuhn.montant > 0) {
                details.push({
                    label: `Prime ancienneté Kuhn (${formatMoney(baseSMH)} × ${primeKuhn.taux}%)`,
                    value: primeKuhn.montant,
                    isPositive: true,
                    isKuhn: true
                });
                total += primeKuhn.montant;
            }
        }

    } else {
        // SCÉNARIO 2 : Cadres Confirmés (Classes 11 à 18)
        scenario = 'cadre';
        details.push({
            label: `SMH Base (${groupe}${classe})`,
            value: baseSMH,
            isBase: true
        });

        // Majoration forfait
        const tauxForfait = CONFIG.FORFAITS[state.forfait];
        if (tauxForfait > 0) {
            const montantForfait = Math.round(baseSMH * tauxForfait);
            const labelForfait = state.forfait === 'heures' ? 'Forfait Heures (+15%)' : 'Forfait Jours (+30%)';
            
            details.push({
                label: labelForfait,
                value: montantForfait,
                isPositive: true
            });
            
            total += montantForfait;
        }

        // Prime ancienneté Kuhn (applicable aussi aux cadres confirmés)
        if (state.accordKuhn) {
            const primeKuhn = calculatePrimeKuhn(baseSMH, state.anciennete);
            if (primeKuhn.montant > 0) {
                details.push({
                    label: `Prime ancienneté Kuhn (${formatMoney(baseSMH)} × ${primeKuhn.taux}%)`,
                    value: primeKuhn.montant,
                    isPositive: true,
                    isKuhn: true
                });
                total += primeKuhn.montant;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // MAJORATIONS CONDITIONS DE TRAVAIL
    // Non-Cadres : toujours | Cadres : sauf forfait jours (repos)
    // ═══════════════════════════════════════════════════════════════
    
    const isForfaitJours = isCadre && state.forfait === 'jours';
    
    if (!isForfaitJours) {
        // Calculer le taux horaire de base (pour les majorations)
        const tauxHoraire = baseSMH / 12 / 151.67;
        
        // Majoration nuit (taux automatique selon accord)
        if (state.typeNuit !== 'aucun' && state.heuresNuit > 0) {
            const majNuit = calculateMajorationNuit(state.typeNuit, state.heuresNuit, tauxHoraire, state.accordKuhn);
            const typePoste = state.typeNuit === 'poste-nuit' ? 'poste nuit' : 'poste matin/AM';
            const labelNuit = state.accordKuhn 
                ? `Majoration nuit ${typePoste} (+${majNuit.taux}% Kuhn)`
                : `Majoration nuit (+${majNuit.taux}% CCN)`;
            details.push({
                label: `${labelNuit} (${state.heuresNuit}h/mois)`,
                value: majNuit.montantAnnuel,
                isPositive: true,
                isKuhn: majNuit.source === 'Kuhn'
            });
            total += majNuit.montantAnnuel;
        }
        
        // Majoration dimanche (taux automatique selon accord)
        if (state.travailDimanche && state.heuresDimanche > 0) {
            const majDim = calculateMajorationDimanche(state.heuresDimanche, tauxHoraire, state.accordKuhn);
            const labelDim = state.accordKuhn 
                ? `Majoration dimanche (+${majDim.taux}% Kuhn)` 
                : `Majoration dimanche (+${majDim.taux}% CCN)`;
            details.push({
                label: `${labelDim} (${state.heuresDimanche}h/mois)`,
                value: majDim.montantAnnuel,
                isPositive: true,
                isKuhn: majDim.source === 'Kuhn'
            });
            total += majDim.montantAnnuel;
        }
        
        // Prime d'équipe (Kuhn, non-cadres uniquement)
        if (state.accordKuhn && !isCadre && state.travailEquipe && state.heuresEquipe > 0) {
            const primeEquipe = calculatePrimeEquipe(state.heuresEquipe);
            details.push({
                label: `Prime équipe (${state.heuresEquipe}h × ${primeEquipe.tauxHoraire}€ Kuhn)`,
                value: primeEquipe.montantAnnuel,
                isPositive: true,
                isKuhn: true
            });
            total += primeEquipe.montantAnnuel;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // PRIMES SPÉCIFIQUES ACCORD KUHN
    // ═══════════════════════════════════════════════════════════════
    
    if (state.accordKuhn) {
        // Prime de vacances
        if (state.primeVacances) {
            const montantVacances = CONFIG.ACCORD_ENTREPRISE.primeVacances.montant;
            details.push({
                label: 'Prime de vacances Kuhn (juillet)',
                value: montantVacances,
                isPositive: true,
                isKuhn: true
            });
            total += montantVacances;
        }
    }
    
    return {
        scenario,
        baseSMH,
        total,
        details,
        isCadre,
        groupe,
        classe
    };
}

/**
 * Retourne le montant annuel brut de l'assiette SMH (SMH seul).
 * Utilisé pour le calcul des arriérés quand "SMH seul" est coché.
 * INCLUT : base SMH (ou barème débutants F11/F12 avec < 6 ans) + majorations forfaits cadres (heures/jours).
 * Les majorations forfaits font partie du SMH. Les majorations heures sup sont incluses dans l'assiette SMH
 * (non calculées ici tant que l'app ne simule pas les HS). EXCLUT : primes ancienneté, prime vacances,
 * majorations pénibilité, majorations nuit/dimanche, prime d'équipe.
 */
function getMontantAnnuelSMHSeul() {
    const { groupe, classe } = getActiveClassification();
    const isCadre = classe >= CONFIG.SEUIL_CADRE;
    let baseSMH = CONFIG.SMH[classe];
    if ((classe === 11 || classe === 12) && state.experiencePro < 6) {
        let tranche = 0;
        if (state.experiencePro >= 4) tranche = 4;
        else if (state.experiencePro >= 2) tranche = 2;
        const bareme = CONFIG.BAREME_DEBUTANTS[classe];
        baseSMH = bareme[tranche];
    }
    const tauxForfait = isCadre && state.forfait && CONFIG.FORFAITS[state.forfait];
    const forfaitMontant = (tauxForfait && tauxForfait > 0) ? Math.round(baseSMH * tauxForfait) : 0;
    return baseSMH + forfaitMontant;
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
        }
    }

    // Affichage des conditions de travail selon statut/forfait
    updateConditionsTravailDisplay();
    
    // Mise à jour des taux affichés (CCN vs Kuhn)
    updateTauxInfo();

    // Calcul et affichage rémunération
    const remuneration = calculateRemuneration();
    updateRemunerationDisplay(remuneration);
    
    // Synchroniser le graphique si visible
    syncEvolutionChart();
}

/**
 * Mettre à jour l'affichage de la rémunération
 */
function updateRemunerationDisplay(remuneration) {
    // Total annuel
    document.getElementById('result-smh').textContent = formatMoney(remuneration.total);
    
    // Mensuel (sur 12 ou 13 mois selon le choix)
    const mensuel = Math.round(remuneration.total / state.nbMois);
    document.getElementById('result-mensuel').textContent = formatMoney(mensuel);

    // Détails avec agrégation intelligente
    const detailsContainer = document.getElementById('result-details');
    let detailsHTML = '';
    
    // Agréger les éléments similaires pour épurer l'affichage
    const aggregatedDetails = aggregateRemunerationDetails(remuneration.details);
    
    aggregatedDetails.forEach(detail => {
        const valueClass = detail.isPositive ? 'positive' : '';
        const prefix = detail.isPositive ? '+' : '';
        const kuhnBadge = detail.isKuhn ? ' <span class="kuhn-badge">🏢 Kuhn</span>' : '';
        const origin = detail.tooltipOrigin || (detail.isKuhn ? 'Accord d\'entreprise Kuhn' : 'Convention collective (CCN)');
        let tipContent = '<strong>Origine :</strong> ' + (typeof origin === 'string' ? origin : (detail.isKuhn ? 'Accord d\'entreprise Kuhn' : 'Convention collective (CCN)')) + '<br>';
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
        detailsHTML += `
            <div class="result-detail-item">
                <span class="result-detail-label">${detail.label}${kuhnBadge}
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
 * Séparation CCN / Accord d'entreprise : le badge Kuhn ne s'affiche que sur les lignes 100 % Kuhn.
 */
function aggregateRemunerationDetails(details) {
    const aggregated = [];
    let majorationsCCN = 0;
    let majorationsKuhn = 0;
    const majorationsBreakdownCCN = [];
    const majorationsBreakdownKuhn = [];
    let primesCCN = 0;
    let primesKuhn = 0;
    const primesBreakdownCCN = [];
    const primesBreakdownKuhn = [];
    
    details.forEach(detail => {
        // SMH de base toujours affiché (avec origine pour tooltip)
        if (detail.isBase) {
            aggregated.push({
                ...detail,
                tooltipOrigin: 'CCN Métallurgie 2024',
                tooltipDetail: detail.label
            });
        }
        // Agréger les majorations en CCN vs Kuhn
        else if (detail.label.includes('Majoration') || detail.label.includes('Forfait')) {
            if (detail.isKuhn) {
                majorationsKuhn += detail.value;
                majorationsBreakdownKuhn.push({ label: detail.label, value: detail.value, isKuhn: true });
            } else {
                majorationsCCN += detail.value;
                majorationsBreakdownCCN.push({ label: detail.label, value: detail.value, isKuhn: false });
            }
        }
        // Agréger les primes en CCN vs Kuhn
        else if (detail.isPositive && !detail.isBase) {
            if (detail.isKuhn) {
                primesKuhn += detail.value;
                primesBreakdownKuhn.push({ label: detail.label, value: detail.value, isKuhn: true });
            } else {
                primesCCN += detail.value;
                primesBreakdownCCN.push({ label: detail.label, value: detail.value, isKuhn: false });
            }
        }
    });
    
    // Lignes agrégées séparées CCN / Accord d'entreprise (badge Kuhn + tooltip pour l'origine)
    if (majorationsCCN > 0) {
        aggregated.push({
            label: 'Majorations et forfaits',
            value: majorationsCCN,
            isPositive: true,
            isKuhn: false,
            tooltipOrigin: 'Convention collective (CCN)',
            breakdown: majorationsBreakdownCCN
        });
    }
    if (majorationsKuhn > 0) {
        aggregated.push({
            label: 'Majorations et forfaits',
            value: majorationsKuhn,
            isPositive: true,
            isKuhn: true,
            tooltipOrigin: 'Accord d\'entreprise Kuhn',
            breakdown: majorationsBreakdownKuhn
        });
    }
    
    if (primesCCN > 0) {
        aggregated.push({
            label: 'Primes (ancienneté, etc.)',
            value: primesCCN,
            isPositive: true,
            isKuhn: false,
            tooltipOrigin: 'Convention collective (CCN)',
            breakdown: primesBreakdownCCN
        });
    }
    if (primesKuhn > 0) {
        aggregated.push({
            label: 'Primes (ancienneté, vacances, etc.)',
            value: primesKuhn,
            isPositive: true,
            isKuhn: true,
            tooltipOrigin: 'Accord d\'entreprise Kuhn',
            breakdown: primesBreakdownKuhn
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
    
    // Compter les éléments appliqués
    const kuhnDetails = remuneration.details.filter(d => d.isKuhn);
    const hasMajorations = remuneration.details.some(d => 
        d.label.includes('nuit') || d.label.includes('dimanche') || d.label.includes('équipe')
    );
    const hasKuhnElements = kuhnDetails.length > 0;
    
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
    
    // === HINT 2: Accord Kuhn ===
    if (state.accordKuhn && hasKuhnElements) {
        const elementsKuhn = kuhnDetails.map(d => {
            if (d.label.includes('ancienneté')) return 'prime ancienneté';
            if (d.label.includes('équipe')) return 'prime équipe';
            if (d.label.includes('nuit')) return 'majoration nuit';
            if (d.label.includes('dimanche')) return 'majoration dimanche';
            if (d.label.includes('vacances')) return 'prime vacances';
            return null;
        }).filter(Boolean);
        
        const listeElements = [...new Set(elementsKuhn)].join(', ');
        
        hints.push({
            type: 'success',
            content: `
                <strong>🏢 Accord Kuhn appliqué</strong><br>
                Éléments : ${listeElements}.<br>
                <small>Taux spécifiques : nuit +20%, matin/AM +15%, dimanche +50%, équipe 0.82€/h.</small>
            `
        });
    } else if (hasMajorations && !state.accordKuhn) {
        // Majorations CCN sans Kuhn
        hints.push({
            type: 'info',
            content: `
                <strong>Majorations CCN appliquées</strong><br>
                Taux CCN : nuit +15%, dimanche +100%.<br>
                <small>Activez l'accord Kuhn pour les taux entreprise.</small>
            `
        });
    }
    
    // === HINT PAR DÉFAUT si aucun autre ===
    if (hints.length === 0) {
        const seuilAnc = state.accordKuhn ? '2 ans (Kuhn)' : '3 ans (CCN)';
        const hasAnciennete = state.anciennete >= 3 || (state.accordKuhn && state.anciennete >= 2);
        
        hints.push({
            type: 'info',
            content: hasAnciennete
                ? `Ce montant est le minimum conventionnel. Prime d'ancienneté incluse.`
                : `Ce montant est le minimum conventionnel. Prime d'ancienneté à partir de ${seuilAnc}.`
        });
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
        
        // Séparer les éléments fixes des éléments proportionnels
        let salaryVariable = remuneration.total;
        let salaryFixe = 0;
        
        // La prime de vacances Kuhn est fixe (525€)
        if (state.accordKuhn && state.primeVacances) {
            salaryFixe = CONFIG.ACCORD_ENTREPRISE.primeVacances.montant;
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
    const augmentationAnnuelle = augmentationInput ? parseFloat(augmentationInput.value) || 0 : 0;
    
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
 * Mettre à jour la date d'embauche basée sur l'ancienneté
 */
function updateDateEmbaucheFromAnciennete() {
    const dateEmbaucheInput = document.getElementById('date-embauche');
    if (dateEmbaucheInput && state.anciennete > 0 && !dateEmbaucheInput.value) {
        // Ne mettre à jour que si le champ est vide
        const today = new Date();
        const dateEmbauche = new Date(today);
        dateEmbauche.setFullYear(today.getFullYear() - state.anciennete);
        dateEmbaucheInput.value = dateEmbauche.toISOString().split('T')[0];
    }
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
 */
function updateArreteesUiFromDateEmbauche() {
    const input = document.getElementById('date-embauche-arretees');
    const container = document.getElementById('salary-curve-container');
    const stickyWrap = document.getElementById('arretees-calc-sticky');
    const warning = document.getElementById('arretees-warning');
    if (!input || !container) return;
    const val = (input.value || '').trim();
    const isValid = val && input.validity && input.validity.valid;
    if (isValid) {
        const prevVal = state.dateEmbaucheArretees;
        state.dateEmbaucheArretees = val;
        if (prevVal !== val) invalidateArreteesDataFinal();
        container.classList.remove('hidden');
        if (stickyWrap) stickyWrap.classList.remove('hidden');
        if (warning) warning.classList.add('hidden');
        initTimeline();
    } else {
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
        
        // Valide dès que le champ est complet (sans attendre le blur) : 'input' et 'change'
        dateEmbaucheInput.addEventListener('input', updateArreteesUiFromDateEmbauche);
        dateEmbaucheInput.addEventListener('change', updateArreteesUiFromDateEmbauche);
        // Appliquer l'état initial (afficher bloc + bouton si date déjà complète ou pré-remplie)
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

    // SMH seul pour les arriérés (salaire dû = assiette SMH : base + forfait ; exclut primes, pénibilité, nuit/dim/équipe)
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
 * pour rappeler à l'utilisateur de ne pas inclure les primes quand il compare au SMH.
 */
function updateArreteesSalaireHint() {
    const el = document.getElementById('arretees-salaire-hint');
    if (!el) return;
    const p = el.querySelector('p');
    if (!p) return;
    if (state.arretesSurSMHSeul) {
        p.innerHTML = '<strong>Attention :</strong> Saisissez le <strong>salaire mensuel brut hors primes</strong> (sans prime de vacances, prime ancienneté, majorations nuit/dimanche/équipe, majorations pénibilité). Le 13e mois et les majorations forfaits font partie du SMH. N\'incluez pas les éléments exclus dans les montants saisis.';
    } else {
        p.innerHTML = '<strong>Attention :</strong> Indiquez le <strong>total brut</strong> du bulletin (y compris primes) pour comparer à la rémunération complète.';
    }
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
            if (p) p.textContent = "Veuillez renseigner la date d'embauche pour générer la courbe.";
            noDateMsg.classList.remove('hidden');
        }
        if (chartWrapper) chartWrapper.classList.add('hidden');
        return;
    }
    if (noDateMsg) noDateMsg.classList.add('hidden');
    if (chartWrapper) chartWrapper.classList.remove('hidden');

    // Dates importantes
    const dateCCNM = new Date('2024-01-01');
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
        
        // Calculer le salaire dû pour ce mois (SMH seul ou rémunération complète)
        const salaireAnnuelDuMois = calculateSalaireDuPourMois(currentDate, dateEmbaucheObj);
        
        let salaireMensuelDu;
        const mois = currentDate.getMonth() + 1;
        const estJuillet = mois === 7;
        const estNovembre = mois === 11;
        if (state.arretesSurSMHSeul) {
            // SMH seul (assiette SMH) : base + majorations forfaits, sans prime vacances/ancienneté, sans majorations pénibilité/nuit/dimanche/équipe. Le 13e mois fait partie du SMH (répartition 12/13).
            if (state.accordKuhn && state.nbMois === 13 && estNovembre) {
                salaireMensuelDu = (salaireAnnuelDuMois / 13) * 2;
            } else if (state.accordKuhn && state.nbMois === 13) {
                salaireMensuelDu = salaireAnnuelDuMois / 13;
            } else {
                salaireMensuelDu = salaireAnnuelDuMois / 12;
            }
        } else {
            const primeVacancesMontant = (state.accordKuhn && state.primeVacances && typeof CONFIG !== 'undefined' && CONFIG.ACCORD_ENTREPRISE?.primeVacances?.montant)
                ? CONFIG.ACCORD_ENTREPRISE.primeVacances.montant
                : 0;
            const baseAnnuellePourRepartition = (estJuillet && primeVacancesMontant > 0)
                ? salaireAnnuelDuMois - primeVacancesMontant
                : salaireAnnuelDuMois;
            if (state.accordKuhn && state.nbMois === 13 && estNovembre) {
                salaireMensuelDu = (baseAnnuellePourRepartition / 13) * 2;
            } else if (state.accordKuhn && state.nbMois === 13) {
                salaireMensuelDu = baseAnnuellePourRepartition / 13;
            } else {
                salaireMensuelDu = baseAnnuellePourRepartition / 12;
            }
            if (estJuillet && primeVacancesMontant > 0) {
                salaireMensuelDu += primeVacancesMontant;
            }
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
            if (p) p.textContent = 'Aucune période à afficher.';
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
 * Calculer le salaire dû pour un mois donné avec tous les paramètres
 * Prend en compte les versements mensuels spécifiques de l'accord Kuhn :
 * - Prime de vacances : seulement en juillet
 * - 13e mois : seulement en novembre
 */
function calculateSalaireDuPourMois(dateMois, dateEmbauche) {
    // Option « SMH seul » : salaire dû = assiette SMH (base + forfait ; exclut primes, pénibilité, nuit/dim/équipe)
    if (state.arretesSurSMHSeul) {
        return getMontantAnnuelSMHSeul();
    }

    // Sauvegarder l'état actuel
    const ancienneteOriginale = state.anciennete;
    const experienceProOriginale = state.experiencePro;
    const forfaitOriginal = state.forfait;
    const accordKuhnOriginal = state.accordKuhn;
    const typeNuitOriginal = state.typeNuit;
    const heuresNuitOriginales = state.heuresNuit;
    const travailDimancheOriginal = state.travailDimanche;
    const heuresDimancheOriginales = state.heuresDimanche;
    const travailEquipeOriginal = state.travailEquipe;
    const heuresEquipeOriginales = state.heuresEquipe;
    const primeVacancesOriginale = state.primeVacances;
    const nbMoisOriginal = state.nbMois;
    
    // Déterminer le mois (1-12) pour vérifier les versements spécifiques
    const mois = dateMois.getMonth() + 1; // getMonth() retourne 0-11, donc +1 pour avoir 1-12
    const estJuillet = mois === 7;
    const estNovembre = mois === 11;
    
    // Calculer l'ancienneté pour ce mois
    const moisDepuisEmbauche = (dateMois - dateEmbauche) / (365.25 * 24 * 60 * 60 * 1000 / 12);
    const ancienneteMois = Math.floor(moisDepuisEmbauche / 12);
    
    // Mettre à jour temporairement l'état pour ce mois
    state.anciennete = ancienneteMois;
    // L'expérience professionnelle est déjà remplie à l'étape 2, on l'utilise telle quelle
    // (pas de synchronisation automatique nécessaire)
    
    // Pour la rétrospective, on assume que les conditions de travail sont similaires
    // (l'utilisateur peut les ajuster si nécessaire)
    // On garde les valeurs actuelles mais on pourrait les faire varier
    
    // Ajuster les primes selon le mois pour l'accord Kuhn
    // Prime de vacances : seulement en juillet
    if (state.accordKuhn && state.primeVacances && !estJuillet) {
        state.primeVacances = false; // Désactiver temporairement pour ce mois
    }
    
    // Calculer la rémunération due avec cette ancienneté
    // Note : calculateRemuneration() retourne toujours le salaire annuel brut total
    // Le 13e mois n'affecte pas le total annuel, seulement la répartition mensuelle
    const remunerationMois = calculateRemuneration();
    const salaireAnnuelDuMois = remunerationMois.total;
    
    // Le 13e mois est géré dans le calcul mensuel (voir calculerArreteesFinal)
    // Ici on retourne le salaire annuel brut total
    
    // Restaurer l'état original
    state.anciennete = ancienneteOriginale;
    state.experiencePro = experienceProOriginale;
    state.forfait = forfaitOriginal;
    state.accordKuhn = accordKuhnOriginal;
    state.typeNuit = typeNuitOriginal;
    state.heuresNuit = heuresNuitOriginales;
    state.travailDimanche = travailDimancheOriginal;
    state.heuresDimanche = heuresDimancheOriginales;
    state.travailEquipe = travailEquipeOriginal;
    state.heuresEquipe = heuresEquipeOriginales;
    state.primeVacances = primeVacancesOriginale;
    state.nbMois = nbMoisOriginal;
    
    return salaireAnnuelDuMois;
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
            p.textContent = 'Erreur : Chart.js n\'est pas chargé. Veuillez recharger la page.';
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

    // Tooltip "?" : rappeler hors primes si SMH seul
    if (floatingInfoIcon) {
        const tooltipSMHSeul = state.arretesSurSMHSeul
            ? ' Saisissez le brut hors primes (sans prime vacances, prime ancienneté, majorations nuit/dimanche/équipe, pénibilité). Le 13e mois et les majorations forfaits font partie du SMH.'
            : ' Indiquez le « Total brut » de votre fiche de paie pour ce mois.';
        floatingInfoIcon.setAttribute('data-tippy-content', 'Salaire mensuel brut :' + tooltipSMHSeul);
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

}

/**
 * Positionner le bloc flottant au centre du conteneur du graphique
 */
function positionFloatingBlock(periodIndex) {
    const floatingBlock = document.getElementById('floating-input-block');
    const chartWrapper = document.getElementById('curve-chart-wrapper');
    if (!floatingBlock || !chartWrapper) return;

    floatingBlock.style.visibility = '';
    floatingBlock.style.opacity = '1';
    floatingBlock.classList.remove('floating-block-hidden');
    floatingBlock.style.left = '50%';
    floatingBlock.style.top = '50%';
    floatingBlock.style.transform = 'translate(-50%, -50%)';
}

/**
 * Fermer le popup du graphique (bloc flottant) — Échap ou clic sur le point déjà sélectionné.
 * Pour rouvrir : cliquer sur un point du graphique (intuitif, sans instruction).
 */
function dismissFloatingBlockFromGraph() {
    floatingBlockDismissed = true;
    const block = document.getElementById('floating-input-block');
    if (block) {
        block.classList.add('floating-block-hidden');
        block.style.visibility = 'hidden';
    }
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
                <text x="300" y="95" font-family="Arial" font-size="11" font-weight="bold" fill="#0969da">XXXX €</text>
                
                <!-- Flèche pointant vers le total brut -->
                <path d="M 350 95 L 370 95 L 370 140 L 380 130 L 370 120 L 370 140 Z" fill="#0969da" opacity="0.7"/>
                <text x="310" y="135" font-family="Arial" font-size="9" fill="#0969da" font-weight="bold">TOTAL BRUT MENSUEL</text>
                
                <!-- Zone mise en évidence -->
                <rect x="280" y="85" width="100" height="20" fill="#e3f2fd" opacity="0.5" stroke="#0969da" stroke-width="2" stroke-dasharray="3,3"/>
                
                <!-- Note en bas -->
                <text x="20" y="170" font-family="Arial" font-size="9" fill="#666">* Indiquez le Total brut du mois sur votre fiche de paie</text>
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
                        <input type="number" id="modal-salary-amount" class="book-input" min="0" step="100" value="0">
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
            const amount = parseFloat(document.getElementById('modal-salary-amount').value) || 0;
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
    const dateCCNM = new Date('2024-01-01');
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

    // Calculer les arriérés mois par mois avec ancienneté progressive
    let totalArretees = 0;
    const detailsArretees = []; // Uniquement les mois avec arriérés (difference > 0) pour total et PDF
    const detailsTousMois = []; // Tous les mois saisis pour affichage (rouge/vert)
    let currentDate = new Date(dateDebut);
    
    // Calculer l'ancienneté de départ (en années complètes)
    const ancienneteDepart = Math.floor((dateDebut - dateEmbaucheObj) / (365.25 * 24 * 60 * 60 * 1000));

    while (currentDate <= dateRuptureObj) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const periodKey = `${year}-${String(month).padStart(2, '0')}`;
        const salaireReel = state.salairesParMois[periodKey];
        
        if (salaireReel !== undefined) {
            const salaireAnnuelDuMois = calculateSalaireDuPourMois(currentDate, dateEmbaucheObj);
            
            let salaireMensuelDu;
            const mois = currentDate.getMonth() + 1;
            const estJuillet = mois === 7;
            const estNovembre = mois === 11;
            if (state.arretesSurSMHSeul) {
                // SMH seul (assiette SMH) : base + forfait, 13e mois inclus ; exclut primes, pénibilité, nuit/dim/équipe
                if (state.accordKuhn && state.nbMois === 13 && estNovembre) {
                    salaireMensuelDu = (salaireAnnuelDuMois / 13) * 2;
                } else if (state.accordKuhn && state.nbMois === 13) {
                    salaireMensuelDu = salaireAnnuelDuMois / 13;
                } else {
                    salaireMensuelDu = salaireAnnuelDuMois / 12;
                }
            } else {
                const primeVacancesMontant = (state.accordKuhn && state.primeVacances && typeof CONFIG !== 'undefined' && CONFIG.ACCORD_ENTREPRISE?.primeVacances?.montant) 
                    ? CONFIG.ACCORD_ENTREPRISE.primeVacances.montant 
                    : 0;
                const baseAnnuellePourRepartition = (estJuillet && primeVacancesMontant > 0) 
                    ? salaireAnnuelDuMois - primeVacancesMontant 
                    : salaireAnnuelDuMois;
                if (state.accordKuhn && state.nbMois === 13 && estNovembre) {
                    salaireMensuelDu = (baseAnnuellePourRepartition / 13) * 2;
                } else if (state.accordKuhn && state.nbMois === 13) {
                    salaireMensuelDu = baseAnnuellePourRepartition / 13;
                } else {
                    salaireMensuelDu = baseAnnuellePourRepartition / 12;
                }
                if (estJuillet && primeVacancesMontant > 0) {
                    salaireMensuelDu += primeVacancesMontant;
                }
            }
            
            // Le salaire réel saisi est maintenant en mensuel brut (pas besoin de diviser par 12)
            const salaireMensuelReel = salaireReel;
            const difference = salaireMensuelDu - salaireMensuelReel;
            
            const row = {
                periode: currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                periodeKey: periodKey,
                dateMois: new Date(currentDate),
                salaireReel: salaireReel,
                salaireMensuelReel: salaireMensuelReel,
                salaireDu: salaireAnnuelDuMois,
                salaireMensuelDu: salaireMensuelDu,
                difference: difference
            };
            detailsTousMois.push(row);
            if (difference > 0) {
                totalArretees += difference;
                detailsArretees.push(row);
            }
        }

        // Passer au mois suivant
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

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
        // Stocker les données pour le PDF même en cas « conforme » (0 arriérés) – même structure que totalArretees > 0
        const dateEmbaucheInput = document.getElementById('date-embauche-arretees')?.value;
        const dateChangementInput = document.getElementById('date-changement-classification-arretees')?.value;
        const dateRuptureInput = document.getElementById('date-rupture-arretees')?.value;
        const pdfData = {
            salaireDu,
            totalArretees: 0,
            detailsArretees: [],
            detailsTousMois,
            dateDebut,
            dateFin: dateRuptureObj,
            datePrescription,
            salairesParMois: state.salairesParMois,
            accordEcrit: state.accordEcritArretees,
            ruptureContrat: state.ruptureContratArretees,
            dateRupture: state.dateRuptureArretees,
            dateEmbauche: dateEmbaucheInput,
            dateChangementClassification: dateChangementInput,
            dateRuptureInput: dateRuptureInput
        };
        arreteesPdfStore = pdfData;
        window.arreteesDataFinal = pdfData;
        return;
    }

    // Afficher les résultats (detailsTousMois pour le tableau, detailsArretees pour total et PDF)
    afficherResultatsArreteesFinal({
        salaireDu,
        totalArretees,
        detailsArretees,
        detailsTousMois,
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

    // Résumé amélioré
    const summaryDiv = document.getElementById('arretees-summary');
    if (summaryDiv) {
        const nombreMois = data.detailsArretees.length;
        const moyenneMensuelle = nombreMois > 0 ? data.totalArretees / nombreMois : 0;
        
        const detailsPourTableau = data.detailsTousMois || data.detailsArretees || [];
        summaryDiv.innerHTML = `
            <details class="arretees-accordion-summary result-details-toggle" open>
                <summary class="arretees-accordion-summary-title">Résumé du calcul</summary>
                <div class="arretees-summary result-details">
                    <div class="result-detail-item">
                        <span class="result-detail-label">Période</span>
                        <span class="result-detail-value">${data.dateDebut.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} → ${data.dateFin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div class="result-detail-item">
                        <span class="result-detail-label">Mois avec arriérés</span>
                        <span class="result-detail-value">${nombreMois}</span>
                    </div>
                    <div class="result-detail-item">
                        <span class="result-detail-label">Arriérés moy./mois</span>
                        <span class="result-detail-value">${formatMoney(moyenneMensuelle)}</span>
                    </div>
                    <div class="result-detail-item total-row">
                        <span class="result-detail-label">Total des arriérés</span>
                        <span class="result-detail-value">${formatMoney(data.totalArretees)}</span>
                    </div>
                </div>
            </details>
            ${detailsPourTableau.length > 0 ? `
            <details class="arretees-accordion-detail result-details-toggle">
                <summary class="arretees-accordion-detail-title">Détail par période</summary>
                <div class="arretees-details-table result-details">
                    <div class="arretees-detail-header">
                        <span class="detail-col-periode">Période</span>
                        <span class="detail-col-montants">Réel → Dû</span>
                        <span class="detail-col-diff">Arriérés</span>
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

        if (data.dateDebut < new Date('2024-01-01')) {
            conditionsInvalides.push('Les arriérés avant le 1er janvier 2024 ne sont pas réclamables au titre de cette convention.');
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
 */
function openPdfInfosModal() {
    const savedSmh = state.arretesSurSMHSeul;
    state.arretesSurSMHSeul = true;
    calculerArreteesFinal();
    let result = getArreteesDataForPdf();
    if (!result.valid) {
        const step4 = document.getElementById('step-4');
        const hasDate = !!document.getElementById('date-embauche-arretees')?.value;
        const hasSalaries = Object.keys(state.salairesParMois || {}).length > 0;
        if (step4?.classList.contains('active') && hasDate && hasSalaries) {
            result = getArreteesDataForPdf();
        }
        if (!result.valid) {
            state.arretesSurSMHSeul = savedSmh;
            calculerArreteesFinal();
            showToast('⚠️ ' + result.error, 'warning', 3000);
            return;
        }
    }
    state.arretesSurSMHSeul = savedSmh;
    calculerArreteesFinal();

    let overlay = document.getElementById('pdf-infos-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'pdf-infos-modal-overlay';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal pdf-infos-modal" onclick="event.stopPropagation()">
                <h3>Informations pour le dossier</h3>
                <p class="modal-subtitle">Ces informations seront incluses dans le rapport PDF. Tous les champs sont facultatifs.</p>
                <p class="pdf-smh-only-notice"><strong>Le rapport PDF est établi uniquement sur la base du SMH</strong> (assiette conventionnelle hors primes). L'option « SMH seul » est appliquée automatiquement pour la génération.</p>
                <div class="form-group">
                    <label for="pdf-infos-nom">Nom et prénom</label>
                    <input type="text" id="pdf-infos-nom" class="book-input" placeholder="Ex. Dupont Jean">
                </div>
                <div class="form-group">
                    <label for="pdf-infos-poste">Poste / intitulé du poste</label>
                    <input type="text" id="pdf-infos-poste" class="book-input" placeholder="Ex. Soudeur, Technicien maintenance">
                </div>
                <div class="form-group">
                    <label for="pdf-infos-employeur">Employeur / raison sociale</label>
                    <input type="text" id="pdf-infos-employeur" class="book-input" placeholder="Ex. Société ABC">
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
                    <button class="book-btn btn-primary" id="pdf-infos-generate">Générer le PDF</button>
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
                poste: (document.getElementById('pdf-infos-poste')?.value || '').trim(),
                employeur: (document.getElementById('pdf-infos-employeur')?.value || '').trim(),
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
    showToast('Le rapport PDF est établi uniquement sur la base du SMH (assiette hors primes).', 'info', 4000);
    overlay.classList.add('visible');
}

/**
 * Générer le PDF final (nouvelle version - professionnel et courtois)
 * @param {Object} [infosPersonnelles] - Nom, poste, employeur, etc. saisis dans le modal (optionnel)
 * @param {Object} [dataPrevalide] - Données arriérés déjà validées (passées par le modal). Si absent, lit window.arreteesDataFinal.
 */
function genererPDFArreteesFinal(infosPersonnelles, dataPrevalide) {
    let data = dataPrevalide;
    const forceSmhSeul = !!dataPrevalide;
    if (!data) {
        const result = getArreteesDataForPdf();
        if (!result.valid) {
            showToast('⚠️ ' + result.error, 'warning', 3000);
            return;
        }
        data = result.data;
    }

    const jsPDF = (typeof window !== 'undefined' && window.jsPDF) ||
        (window.jspdf && (window.jspdf.jsPDF || window.jspdf.default?.jsPDF));
    if (!jsPDF) {
        showToast('⚠️ Bibliothèque PDF non chargée. Rechargez la page.', 'warning', 3000);
        return;
    }

    try {
        const doc = new jsPDF();
        const dateDebutObj = data.dateDebut instanceof Date ? data.dateDebut : new Date(data.dateDebut);
        const dateFinObj = data.dateFin instanceof Date ? data.dateFin : new Date(data.dateFin);

        const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const marginRight = pageWidth - margin;
    let yPos = margin;

    const checkPageBreak = (requiredSpace = 20) => {
        if (yPos + requiredSpace > pageHeight - 25) {
            doc.addPage();
            yPos = margin;
        }
    };

    // En-tête type lettre juridique
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Rapport de calcul d\'arriérés de salaire', pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Convention collective nationale de la métallurgie 2024', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`Document établi le ${todayStr}`, margin, yPos);
    yPos += 6;
    doc.setFont(undefined, 'bold');
    doc.text('Objet : Calcul d\'arriérés de salaire au titre du SMH', margin, yPos);
    yPos += 8;
    doc.setFont(undefined, 'normal');
    const classificationInfo = getActiveClassification();
    doc.text(`Classification : ${classificationInfo.groupe}${classificationInfo.classe}`, margin, yPos);
    yPos += 10;

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, marginRight, yPos);
    yPos += 10;

    checkPageBreak(30);

    // Section 1 : Informations du contrat
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('1. Informations du contrat', margin, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');

    // Infos personnelles du salarié (si renseignées dans le modal)
    const infos = infosPersonnelles || {};
    const hasInfos = !!(infos.nomPrenom || infos.poste || infos.employeur || infos.matricule || infos.observations);
    if (hasInfos) {
        if (infos.nomPrenom) {
            doc.text(`Salarié : ${infos.nomPrenom}`, margin + 5, yPos);
            yPos += 6;
        }
        if (infos.poste) {
            doc.text(`Poste / intitulé : ${infos.poste}`, margin + 5, yPos);
            yPos += 6;
        }
        if (infos.employeur) {
            doc.text(`Employeur / raison sociale : ${infos.employeur}`, margin + 5, yPos);
            yPos += 6;
        }
        if (infos.matricule) {
            doc.text(`Matricule ou N° interne : ${infos.matricule}`, margin + 5, yPos);
            yPos += 6;
        }
        if (infos.observations) {
            const obsLines = doc.splitTextToSize(infos.observations, pageWidth - margin - margin - 10);
            doc.text('Observations :', margin + 5, yPos);
            yPos += 5;
            obsLines.forEach(line => {
                doc.text(line, margin + 5, yPos);
                yPos += 5;
            });
            yPos += 4;
        }
        yPos += 4;
    }

    const dateEmbaucheInput = data.dateEmbauche || document.getElementById('date-embauche-arretees')?.value;
    const dateChangementInput = data.dateChangementClassification || document.getElementById('date-changement-classification-arretees')?.value;
    const dateRuptureInput = data.dateRuptureInput || document.getElementById('date-rupture-arretees')?.value;

    if (dateEmbaucheInput) {
        const dateEmbaucheFormatted = new Date(dateEmbaucheInput).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.text(`Date d'embauche : ${dateEmbaucheFormatted}`, margin + 5, yPos);
        yPos += 6;
    }
    if (dateChangementInput) {
        const dateChangementFormatted = new Date(dateChangementInput).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.text(`Date de changement de classification : ${dateChangementFormatted}`, margin + 5, yPos);
        yPos += 6;
    }
    if (data.ruptureContrat && dateRuptureInput) {
        const dateRuptureFormatted = new Date(dateRuptureInput).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.text(`Date de rupture du contrat : ${dateRuptureFormatted}`, margin + 5, yPos);
        yPos += 6;
    } else if (!data.ruptureContrat) {
        doc.text('Statut du contrat : En cours', margin + 5, yPos);
        yPos += 6;
    }
    if (data.accordEcrit) {
        doc.text('Accord écrit avec l\'employeur : Oui', margin + 5, yPos);
        yPos += 6;
    }
    
    yPos += 5;
    checkPageBreak(30);

    // Section 2 : Résumé du calcul
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('2. Résumé du calcul', margin, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
        const dateDebutStr = dateDebutObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const dateFinStr = dateFinObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    
    doc.text(`Période concernée : ${dateDebutStr} au ${dateFinStr}`, margin + 5, yPos);
    yPos += 6;
    doc.text(`Nombre de mois avec arriérés : ${data.detailsArretees.length}`, margin + 5, yPos);
    yPos += 6;
    const smhMensuel = data.salaireDu / (state.nbMois || 12);
    doc.text(`SMH mensuel brut : ${formatMoneyPDF(smhMensuel)}`, margin + 5, yPos);
    yPos += 6;
    doc.text(`SMH annuel brut : ${formatMoneyPDF(data.salaireDu)}`, margin + 5, yPos);
    yPos += 6;
    doc.setFont(undefined, 'bold');
    doc.setTextColor(9, 105, 218);
    doc.text(`Total des arriérés (mensuels cumulés) : ${formatMoneyPDF(data.totalArretees)}`, margin + 5, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    yPos += 10;

    checkPageBreak(40);

    // Détail PDF : uniquement les mois avec arriérés (difference > 0)
    const detailsPourPdf = (data.detailsArretees || []).filter(d => d.difference > 0);
    if (detailsPourPdf.length > 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('3. Détail des arriérés par période', margin, yPos);
        yPos += 8;

        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setFont(undefined, 'bold');
        doc.text('Période', margin + 5, yPos);
        doc.text('Salaire brut perçu', margin + 55, yPos);
        doc.text('SMH mensuel dû', margin + 105, yPos);
        doc.text('Arriérés', margin + 155, yPos);
        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin + 5, yPos, marginRight - 5, yPos);
        yPos += 6;
        doc.setFont(undefined, 'normal');

        detailsPourPdf.forEach((detail) => {
            checkPageBreak(12);
            const periodeShort = detail.periode.substring(0, 15);
            doc.text(periodeShort, margin + 5, yPos);
            doc.text(formatMoneyPDF(detail.salaireMensuelReel), margin + 55, yPos);
            doc.text(formatMoneyPDF(detail.salaireMensuelDu), margin + 105, yPos);
            doc.setTextColor(9, 105, 218);
            doc.setFont(undefined, 'bold');
            doc.text(formatMoneyPDF(detail.difference), margin + 155, yPos);
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
            yPos += 6;
        });

        yPos += 5;
    }

    checkPageBreak(40);

    // Section 4 : Points d'attention juridiques
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('4. Points d\'attention juridiques', margin, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('• Prescription : Conformément à l\'article L.3245-1 du Code du travail,', margin + 5, yPos);
    yPos += 6;
    doc.text('  l\'action en paiement de salaire se prescrit par 3 ans à compter de chaque', margin + 5, yPos);
    yPos += 6;
    doc.text('  échéance de paiement (chaque mois constitue une échéance distincte).', margin + 5, yPos);
    yPos += 8;
    doc.text('• Convention Collective : La Convention Collective Nationale de la', margin + 5, yPos);
    yPos += 6;
    doc.text('  Métallurgie 2024 est entrée en vigueur le 1er janvier 2024. Les arriérés', margin + 5, yPos);
    yPos += 6;
    doc.text('  antérieurs à cette date ne sont pas réclamables au titre de cette convention.', margin + 5, yPos);
    yPos += 8;
    
    if (data.accordEcrit) {
        doc.setTextColor(46, 125, 50);
        doc.text('• Point favorable : Un accord écrit existe avec l\'employeur concernant', margin + 5, yPos);
        yPos += 6;
        doc.text('  la classification, ce qui renforce votre position juridique.', margin + 5, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 8;
    }

    checkPageBreak(80);

    // Section 5 : Méthodologie de calcul
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('5. Méthodologie de calcul', margin, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    const classificationMethode = getActiveClassification();
    const isCadre = classificationMethode.classe >= CONFIG.SEUIL_CADRE;
    
    doc.text('Ce calcul est basé sur la Convention Collective Nationale de la Métallurgie 2024', margin + 5, yPos);
    yPos += 6;
    doc.text(`et prend en compte les éléments suivants pour la classification ${classificationMethode.groupe}${classificationMethode.classe} :`, margin + 5, yPos);
    yPos += 8;
    
    doc.setFont(undefined, 'bold');
    doc.text('1. Salaire Minimum Hiérarchique (SMH) de base', margin + 5, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');
    doc.text(`   SMH base : ${formatMoneyPDF(CONFIG.SMH[classificationMethode.classe])} (annuel brut)`, margin + 5, yPos);
    yPos += 8;
    
    // Ce rapport est toujours établi sur la base du SMH seul : ne pas afficher « Accord Kuhn » (primes, etc.) comme partie du salaire dû
    doc.setFont(undefined, 'bold');
    doc.text('2. Base de calcul du présent rapport : assiette SMH uniquement', margin + 5, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');
    const lignesS5Base = doc.splitTextToSize('   Conformément à la CCN Métallurgie (IDCC 3248), seul l\'assiette SMH (base + forfait cadres le cas échéant) est retenue comme salaire dû. Les primes (ancienneté, vacances, etc.) et les majorations pénibilité/nuit/dimanche/équipe ne font pas partie du salaire dû du présent rapport.', pageWidth - margin - margin - 10);
    lignesS5Base.forEach(l => { doc.text(l, margin + 5, yPos); yPos += 5; });
    yPos += 4;
    
    if (isCadre && state.forfait !== 'aucun') {
        doc.setFont(undefined, 'bold');
        doc.text('3. Majoration forfait', margin + 5, yPos);
        yPos += 6;
        doc.setFont(undefined, 'normal');
        const tauxForfait = CONFIG.FORFAITS[state.forfait];
        doc.text(`   Majoration ${state.forfait === 'heures' ? 'heures' : 'jours'} : +${Math.round(tauxForfait * 100)}%`, margin + 5, yPos);
        yPos += 8;
    }
    
    doc.setFont(undefined, 'bold');
    doc.text('4. Calcul rétrospectif mois par mois', margin + 5, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');
    const largeurS5 = pageWidth - margin - margin - 10;
    const lignesS5CCN = doc.splitTextToSize('   Conformément à la CCN Métallurgie (IDCC 3248), dispositions relatives aux SMH et à leur assiette, ce rapport est établi uniquement sur la base du SMH (assiette hors primes).', largeurS5);
    lignesS5CCN.forEach(l => { doc.text(l, margin + 5, yPos); yPos += 5; });
    yPos += 2;
    doc.text('   Pour chaque mois de la période concernée :', margin + 5, yPos);
    yPos += 6;
    doc.text('   • Le salaire dû = assiette SMH (base + majorations forfait) ; l\'ancienneté n\'affecte pas le SMH', margin + 5, yPos);
    yPos += 6;
    doc.text('   • Le salaire mensuel dû est comparé au salaire mensuel réel perçu (hors primes)', margin + 5, yPos);
    yPos += 6;
    doc.text('   • La différence positive constitue les arriérés pour ce mois', margin + 5, yPos);
    yPos += 8;
    
    doc.setFont(undefined, 'bold');
    doc.text('5. Sources et références', margin + 5, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');
    doc.text('   • Convention collective nationale de la métallurgie (IDCC 3248), SMH et assiette', margin + 5, yPos);
    yPos += 6;
    doc.text('   • Code du travail français (Art. L.3245-1 pour la prescription)', margin + 5, yPos);
    yPos += 6;
    if (state.accordKuhn) {
        doc.text('   • Accord d\'entreprise Kuhn (spécificités)', margin + 5, yPos);
        yPos += 6;
    }
    doc.text('   • Valeur du point territorial : Bas-Rhin (5,90 €)', margin + 5, yPos);
    yPos += 12;

    checkPageBreak(120);

    // Section 6 : Méthodes de calcul détaillées
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('6. Méthodes de calcul détaillées', margin, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    const margeTexte = margin + 5;
    const largeurTexte = pageWidth - margin - margin - 10;

    const lignesPrincipe = doc.splitTextToSize(
        'Conformément à la convention collective nationale de la métallurgie (IDCC 3248), dispositions relatives aux salaires minima hiérarchiques et à leur assiette, ce rapport est établi uniquement sur la base du SMH (assiette conventionnelle hors primes). Pour chaque mois, le salaire dû = assiette SMH (base + majorations forfait), comparé au salaire perçu (hors primes). La différence positive constitue les arriérés du mois ; le total est la somme sur tous les mois. L\'assiette SMH ne dépend pas de l\'ancienneté.',
        largeurTexte
    );
    lignesPrincipe.forEach(l => { doc.text(l, margeTexte, yPos); yPos += 5; });
    yPos += 4;

    doc.setFont(undefined, 'bold');
    doc.text('Période prise en compte', margeTexte, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');
    const lignesPeriode = doc.splitTextToSize(
        '• Date de début = le plus récent parmi : date d\'embauche, date de changement de classification, 1er janvier 2024 (entrée en vigueur CCN Métallurgie 2024), date de prescription (3 ans avant aujourd\'hui, art. L.3245-1 Code du travail).',
        largeurTexte
    );
    lignesPeriode.forEach(l => { doc.text(l, margeTexte, yPos); yPos += 5; });
    doc.text('• Date de fin = date de rupture du contrat ou date du jour si le contrat est en cours.', margeTexte, yPos);
    yPos += 8;

    doc.setFont(undefined, 'bold');
    doc.text('Calcul du salaire mensuel dû (par mois)', margeTexte, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');
    const lignesAssiette = doc.splitTextToSize(
        'Le salaire dû retenu dans ce rapport est l\'assiette SMH uniquement : base + majorations forfait (heures +15 %, jours +30 % si cadre). L\'ancienneté n\'affecte pas l\'assiette SMH. Il est déterminé selon la classification, le barème débutants (F11/F12 si applicable), puis converti en mensuel :',
        largeurTexte
    );
    lignesAssiette.forEach(l => { doc.text(l, margeTexte, yPos); yPos += 5; });
    yPos += 6;
    if (state.nbMois === 13 && state.accordKuhn) {
        doc.text('• Répartition sur 13 mois (accord Kuhn) : SMH annuel / 13 ; mois de novembre : (SMH annuel / 13) × 2.', margeTexte, yPos);
        yPos += 5;
        if (!forceSmhSeul && state.primeVacances) {
            doc.text('• Prime de vacances (525 €) ajoutée au mois de juillet si accord Kuhn + prime vacances cochés.', margeTexte, yPos);
            yPos += 5;
        }
    } else {
        doc.text('• Répartition sur 12 mois : SMH annuel / 12.', margeTexte, yPos);
        yPos += 5;
    }
    yPos += 4;

    doc.setFont(undefined, 'bold');
    doc.text('Formule des arriérés (par mois)', margeTexte, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');
    const formuleArretees = 'Arriérés(mois) = max(0 ; Salaire mensuel dû(mois) − Salaire mensuel perçu(mois))';
    const lignesFormule = doc.splitTextToSize(formuleArretees, largeurTexte);
    lignesFormule.forEach(l => { doc.text(l, margeTexte, yPos); yPos += 5; });
    const lignesTotal = doc.splitTextToSize('Total des arriérés = somme des Arriérés(mois) pour tous les mois de la période.', largeurTexte);
    lignesTotal.forEach(l => { doc.text(l, margeTexte, yPos); yPos += 5; });
    yPos += 4;

    const smhSeul = forceSmhSeul || state.arretesSurSMHSeul === true || (typeof state.arretesSurSMHSeul !== 'undefined' && state.arretesSurSMHSeul);
    if (smhSeul) {
        doc.setFont(undefined, 'bold');
        doc.text('Base de calcul du rapport : assiette SMH', margeTexte, yPos);
        yPos += 6;
        doc.setFont(undefined, 'normal');
        const lignesSMH = doc.splitTextToSize(
            'Conformément à la CCN Métallurgie (IDCC 3248), dispositions relatives à l\'assiette SMH (inclus : base, forfaits cadres, 13e mois ; exclus : primes ancienneté, prime vacances, majorations pénibilité/nuit/dimanche/équipe), ce rapport retient uniquement l\'assiette SMH comme salaire dû : base + majorations forfait (heures/jours). Les salaires saisis pour la comparaison sont les salaires mensuels bruts hors primes.',
            largeurTexte
        );
        lignesSMH.forEach(l => { doc.text(l, margeTexte, yPos); yPos += 5; });
        yPos += 4;
    }

    doc.setFont(undefined, 'bold');
    doc.text('Références', margeTexte, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');
    doc.text('• Convention collective nationale de la métallurgie (IDCC 3248), dispositions relatives aux salaires minima hiérarchiques et à leur assiette.', margeTexte, yPos);
    yPos += 5;
    doc.text('• Code du travail, art. L.3245-1 : prescription de 3 ans à compter de chaque échéance de paiement.', margeTexte, yPos);
    yPos += 5;
    if (state.accordKuhn) {
        doc.text('• Accord d\'entreprise Kuhn : prime d\'ancienneté dès 2 ans, prime vacances, 13e mois, modalités spécifiques.', margeTexte, yPos);
        yPos += 5;
    }
    doc.text('• Outil indicatif ; pour toute action juridique, consultez un avocat ou votre syndicat.', margeTexte, yPos);
    yPos += 12;

    checkPageBreak(60);

    const totalPages = (doc.internal.pages && doc.internal.pages.length) || 1;
    const dateGen = new Date().toLocaleDateString('fr-FR');
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(totalPages > 1 ? `Page ${p} / ${totalPages}` : 'Page 1', pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Généré le ${dateGen}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
    }

    const classificationStr = `${classificationMethode.groupe}${classificationMethode.classe}`;
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Rapport_Arretees_${classificationStr}_${dateStr}.pdf`;

    doc.save(filename);
    showToast('✅ Rapport PDF généré avec succès !', 'success', 3000);
    } catch (err) {
        showToast('Erreur lors de la génération du PDF : ' + (err && err.message ? err.message : String(err)), 'error', 5000);
    }
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
                <li><strong>CCNM 2024 :</strong> Les arriérés antérieurs au 1er janvier 2024 ne sont pas réclamables au titre de cette convention</li>
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
        btnGenererPDF.addEventListener('click', genererPDFArretees);
    }

    // Pré-remplir la date d'embauche basée sur l'ancienneté
    updateDateEmbaucheFromAnciennete();
}

/**
 * Calculer les arriérés de salaire
 */
function calculerArretees() {
    const salaireActuel = parseFloat(document.getElementById('salaire-actuel').value) || 0;
    const dateEmbauche = document.getElementById('date-embauche').value;
    const dateChangementClassification = document.getElementById('date-changement-classification').value;
    const ruptureContrat = document.getElementById('rupture-contrat').checked;
    const dateRupture = document.getElementById('date-rupture').value;
    const accordEcrit = document.getElementById('accord-ecrit').checked;

    if (!dateEmbauche) {
        showToast('⚠️ Veuillez renseigner la date d\'embauche.', 'warning', 3000);
        return;
    }

    if (salaireActuel === 0) {
        showToast('⚠️ Veuillez renseigner votre salaire actuel.', 'warning', 3000);
        return;
    }

    // Calculer la rémunération due
    const remuneration = calculateRemuneration();
    const salaireDu = remuneration.total;

    if (salaireActuel >= salaireDu) {
        showToast('✅ Votre salaire actuel est conforme ou supérieur au minimum conventionnel.', 'success', 4000);
        document.getElementById('arretees-results').classList.add('hidden');
        return;
    }

    const difference = salaireDu - salaireActuel;

    // Dates importantes
    const dateCCNM = new Date('2024-01-01'); // Date d'entrée en vigueur de la CCNM
    const dateEmbaucheObj = new Date(dateEmbauche);
    const dateRuptureObj = ruptureContrat && dateRupture ? new Date(dateRupture) : new Date();
    const dateChangementObj = dateChangementClassification ? new Date(dateChangementClassification) : null;

    // Prescription : 3 ans en arrière depuis aujourd'hui
    const datePrescription = new Date();
    datePrescription.setFullYear(datePrescription.getFullYear() - 3);

    // Date de début de calcul : le plus récent entre :
    // - Date d'embauche
    // - Date de changement de classification (si applicable)
    // - Date d'entrée en vigueur CCNM (1er janv 2024)
    // - Date de prescription (3 ans)
    let dateDebutCalcul = dateEmbaucheObj;
    if (dateChangementObj && dateChangementObj > dateDebutCalcul) {
        dateDebutCalcul = dateChangementObj;
    }
    if (dateCCNM > dateDebutCalcul) {
        dateDebutCalcul = dateCCNM;
    }
    if (datePrescription > dateDebutCalcul) {
        dateDebutCalcul = datePrescription;
    }

    // Date de fin : rupture ou aujourd'hui
    const dateFinCalcul = ruptureContrat && dateRupture ? dateRuptureObj : new Date();

    // Vérifier que la date de début est avant la date de fin
    if (dateDebutCalcul >= dateFinCalcul) {
        showToast('⚠️ La période de calcul est invalide. Vérifiez les dates renseignées.', 'warning', 4000);
        return;
    }

    // Calculer le nombre de mois (arrondi au mois complet)
    const moisDiff = (dateFinCalcul.getFullYear() - dateDebutCalcul.getFullYear()) * 12 + 
                     (dateFinCalcul.getMonth() - dateDebutCalcul.getMonth());
    // Si on est dans le même mois, compter 1 mois minimum
    const moisArretees = Math.max(1, moisDiff);

    // Montant total des arriérés
    const montantMensuel = difference / 12;
    const totalArretees = Math.round(montantMensuel * moisArretees);

    // Conditions juridiques
    const conditionsValides = [];
    const conditionsInvalides = [];

    // Vérifier la cohérence des dates
    if (dateChangementObj && dateChangementObj < dateEmbaucheObj) {
        conditionsInvalides.push('⚠️ La date de changement de classification ne peut pas être antérieure à la date d\'embauche.');
    }

    if (dateChangementObj && dateChangementObj > dateFinCalcul) {
        conditionsInvalides.push('⚠️ La date de changement de classification ne peut pas être postérieure à la date de fin de calcul.');
    }

    // Limites juridiques
    if (dateDebutCalcul < dateCCNM) {
        conditionsInvalides.push(`Les arriérés avant le 1er janvier 2024 (entrée en vigueur de la CCNM) ne sont pas réclamables au titre de cette convention.`);
    }

    if (dateDebutCalcul < datePrescription) {
        conditionsInvalides.push(`La prescription de 3 ans (art. L.3245-1 Code du travail) limite les arriérés réclamables à partir du ${datePrescription.toLocaleDateString('fr-FR')}.`);
    }

    if (ruptureContrat && !dateRupture) {
        conditionsInvalides.push('La date de rupture doit être renseignée si le contrat est rompu.');
    }

    // Points favorables
    if (accordEcrit) {
        conditionsValides.push('Un accord écrit avec l\'employeur sur la classification renforce votre position juridique.');
    }

    if (dateChangementObj) {
        conditionsValides.push('Un changement de classification documenté peut faciliter la réclamation.');
    }

    // Afficher les résultats
    afficherResultatsArretees({
        salaireActuel,
        salaireDu,
        difference,
        montantMensuel,
        totalArretees,
        moisArretees,
        dateDebutCalcul,
        dateFinCalcul,
        datePrescription,
        conditionsValides,
        conditionsInvalides,
        ruptureContrat,
        dateRupture: dateRuptureObj
    });
}

/**
 * Afficher les résultats du calcul d'arriérés
 */
function afficherResultatsArretees(data) {
    const resultsDiv = document.getElementById('arretees-results');
    const summaryDiv = document.getElementById('arretees-summary');
    const legalInfoDiv = document.getElementById('arretees-legal-info');
    const instructionsDiv = document.getElementById('arretees-instructions');
    const instructionsContent = document.getElementById('arretees-instructions-content');

    // Résumé
    summaryDiv.innerHTML = `
        <div class="arretees-summary-item">
            <span>Salaire actuel :</span>
            <strong>${formatMoney(data.salaireActuel)}</strong>
        </div>
        <div class="arretees-summary-item">
            <span>Salaire dû :</span>
            <strong>${formatMoney(data.salaireDu)}</strong>
        </div>
        <div class="arretees-summary-item">
            <span>Différence annuelle :</span>
            <strong style="color: var(--color-link);">${formatMoney(data.difference)}</strong>
        </div>
        <div class="arretees-summary-item">
            <span>Période concernée :</span>
            <span>${data.dateDebutCalcul.toLocaleDateString('fr-FR')} → ${data.dateFinCalcul.toLocaleDateString('fr-FR')}</span>
        </div>
        <div class="arretees-summary-item">
            <span>Nombre de mois :</span>
            <strong>${data.moisArretees} mois</strong>
        </div>
        <div class="arretees-summary-item">
            <span>Montant mensuel dû :</span>
            <strong>${formatMoney(data.montantMensuel)}</strong>
        </div>
        <div class="arretees-summary-item">
            <span><strong>Total des arriérés :</strong></span>
            <strong>${formatMoney(data.totalArretees)}</strong>
        </div>
    `;

    // Informations juridiques
    let legalHTML = '<h4>⚠️ Points d\'attention juridiques</h4><ul>';
    
    if (data.conditionsInvalides.length > 0) {
        legalHTML += '<li><strong>Limitations :</strong><ul>';
        data.conditionsInvalides.forEach(condition => {
            legalHTML += `<li>${condition}</li>`;
        });
        legalHTML += '</ul></li>';
    }

    if (data.conditionsValides.length > 0) {
        legalHTML += '<li><strong>Points favorables :</strong><ul>';
        data.conditionsValides.forEach(condition => {
            legalHTML += `<li>${condition}</li>`;
        });
        legalHTML += '</ul></li>';
    }

    legalHTML += '<li><strong>Prescription :</strong> En France, la prescription est de 3 ans. Les arriérés au-delà de cette période ne sont généralement pas réclamables.</li>';
    legalHTML += '<li><strong>Convention collective nationale de la métallurgie (CCNM) 2024 :</strong> La nouvelle convention collective est entrée en vigueur le 1er janvier 2024. Les arriérés antérieurs à cette date ne sont pas réclamables au titre de cette convention.</li>';
    
    if (data.ruptureContrat) {
        legalHTML += '<li><strong>Rupture de contrat :</strong> En cas de rupture, les arriérés sont calculés jusqu\'à la date de rupture.</li>';
    }

    legalHTML += '</ul>';
    legalInfoDiv.innerHTML = legalHTML;

    // Instructions
    instructionsContent.innerHTML = `
        <ol>
            <li><strong>Vérifiez les informations :</strong> Assurez-vous que toutes les dates et montants sont corrects. Vérifiez notamment :
                <ul>
                    <li>Votre classification actuelle sur votre fiche de paie</li>
                    <li>Votre ancienneté dans l'entreprise</li>
                    <li>Les dates de changement éventuel de classification</li>
                </ul>
            </li>
            <li><strong>Consultez un professionnel :</strong> Avant toute démarche, consultez :
                <ul>
                    <li>Un avocat spécialisé en droit du travail</li>
                    <li>Votre syndicat (CFDT, CGT, FO, etc.)</li>
                    <li>Les services de l'inspection du travail</li>
                </ul>
            </li>
            <li><strong>Rassemblez les preuves :</strong>
                <ul>
                    <li>Tous vos bulletins de paie depuis la date de début de calcul</li>
                    <li>Votre contrat de travail et avenants éventuels</li>
                    <li>Correspondances avec l'employeur (emails, courriers)</li>
                    <li>Fiches de poste ou descriptions de fonction</li>
                    <li>Attestations de formation ou certifications</li>
                </ul>
            </li>
            <li><strong>Demande amiable (étape obligatoire) :</strong>
                <ul>
                    <li>Rédigez une lettre recommandée avec accusé de réception (LRAR)</li>
                    <li>Joignez ce rapport PDF et les documents justificatifs</li>
                    <li>Demandez un rendez-vous pour discuter de la situation</li>
                    <li>Conservez une copie de tous les documents envoyés</li>
                </ul>
            </li>
            <li><strong>Si la demande amiable échoue :</strong>
                <ul>
                    <li><strong>Médiation :</strong> Vous pouvez proposer une médiation conventionnelle</li>
                    <li><strong>Conseil de Prud'hommes :</strong> Saisie possible dans les 3 ans suivant la dernière échéance</li>
                    <li><strong>Inspection du travail :</strong> Pour signaler un non-respect de la convention collective</li>
                </ul>
            </li>
            <li><strong>Délais importants :</strong>
                <ul>
                    <li>Prescription de 3 ans : Agissez rapidement pour ne pas perdre vos droits</li>
                    <li>Délai de réponse à une LRAR : 15 jours ouvrés</li>
                    <li>Délai de saisine Prud'hommes : 3 ans à compter de chaque échéance</li>
                </ul>
            </li>
        </ol>
        <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
            <p style="margin: 0;"><strong>⚠️ Avertissement légal :</strong> Ce rapport est un outil d'aide au calcul basé sur les informations fournies. Il ne constitue pas un avis juridique. Seul un professionnel du droit (avocat, syndicat) peut vous conseiller sur la stratégie à adopter et la faisabilité de votre demande d'arriérés.</p>
        </div>
    `;

    // Afficher les sections
    resultsDiv.classList.remove('hidden');
    instructionsDiv.classList.remove('hidden');

    // Stocker les données pour le PDF
    window.arreteesData = data;
}

/**
 * Générer le PDF du rapport d'arriérés
 */
function genererPDFArretees() {
    if (!window.arreteesData) {
        showToast('⚠️ Veuillez d\'abord calculer les arriérés.', 'warning', 3000);
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const data = window.arreteesData;
    const remuneration = calculateRemuneration();
    const { groupe, classe } = getActiveClassification();

    // En-tête
    doc.setFontSize(16);
    doc.text('Rapport d\'Arriérés de Salaire', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Convention Collective Métallurgie 2024', 105, 28, { align: 'center' });
    doc.text(`Classification : ${groupe}${classe}`, 105, 34, { align: 'center' });

    // Date du rapport
    doc.setFontSize(9);
    doc.text(`Date du rapport : ${new Date().toLocaleDateString('fr-FR')}`, 20, 45);

    // Informations
    let y = 55;
    doc.setFontSize(11);
    doc.text('Informations', 20, y);
    y += 8;
    doc.setFontSize(9);
    doc.text(`Salaire annuel brut actuel : ${formatMoney(data.salaireActuel)}`, 20, y);
    y += 6;
    doc.text(`Salaire minimum hiérarchique dû : ${formatMoney(data.salaireDu)}`, 20, y);
    y += 6;
    doc.text(`Différence annuelle : ${formatMoney(data.difference)}`, 20, y);
    y += 10;

    // Calcul des arriérés
    doc.setFontSize(11);
    doc.text('Calcul des Arriérés', 20, y);
    y += 8;
    doc.setFontSize(9);
    doc.text(`Période : ${data.dateDebutCalcul.toLocaleDateString('fr-FR')} → ${data.dateFinCalcul.toLocaleDateString('fr-FR')}`, 20, y);
    y += 6;
    doc.text(`Nombre de mois : ${data.moisArretees}`, 20, y);
    y += 6;
    doc.text(`Montant mensuel dû : ${formatMoney(data.montantMensuel)}`, 20, y);
    y += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL DES ARRIÉRÉS : ${formatMoney(data.totalArretees)}`, 20, y);
    doc.setFont(undefined, 'normal');
    y += 15;

    // Points juridiques
    if (data.conditionsInvalides.length > 0 || data.conditionsValides.length > 0) {
        doc.setFontSize(11);
        doc.text('Points d\'attention juridiques', 20, y);
        y += 8;
        doc.setFontSize(9);
        
        if (data.conditionsInvalides.length > 0) {
            doc.text('Limitations :', 20, y);
            y += 6;
            data.conditionsInvalides.forEach(condition => {
                doc.text(`• ${condition}`, 25, y);
                y += 6;
            });
            y += 3;
        }
        
        if (data.conditionsValides.length > 0) {
            doc.text('Points favorables :', 20, y);
            y += 6;
            data.conditionsValides.forEach(condition => {
                doc.text(`• ${condition}`, 25, y);
                y += 6;
            });
        }
        y += 10;
    }

    // Informations juridiques générales
    y += 5;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Informations juridiques importantes', 20, y);
    y += 8;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    
    const legalTexts = [
        '• Prescription : 3 ans à compter de chaque échéance (art. L.3245-1 du Code du travail)',
        '• CCNM 2024 : Entrée en vigueur le 1er janvier 2024',
        '• Demande amiable recommandée avant toute action judiciaire',
        '• Conseil de Prud\'hommes compétent pour les litiges'
    ];
    
    legalTexts.forEach(text => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        doc.text(text, 20, y, { maxWidth: 170 });
        y += 6;
    });

    // Avertissement
    y += 5;
    if (y > 270) {
        doc.addPage();
        y = 20;
    }
    doc.setFontSize(9);
    doc.setTextColor(150, 0, 0);
    doc.text('⚠️ Ce rapport est indicatif. Consultez un avocat spécialisé en droit du travail ou votre syndicat avant toute démarche juridique.', 20, y, { maxWidth: 170 });
    doc.setTextColor(0, 0, 0);

    // Pied de page sur toutes les pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text('Généré par le Simulateur Métallurgie 2024', 105, pageHeight - 10, { align: 'center' });
        doc.text(`Page ${i}/${pageCount}`, 105, pageHeight - 5, { align: 'center' });
        doc.setTextColor(0);
    }

    // Télécharger
    const fileName = `Rapport_Arretees_${groupe}${classe}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    showToast('✅ Rapport PDF généré avec succès.', 'success', 3000);
}

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
