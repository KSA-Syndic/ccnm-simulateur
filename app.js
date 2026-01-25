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
            // Réinitialiser et revenir au début
            state.currentStep = 1;
            state.modeClassification = null;
            state.modeManuel = false;
            showSubStep('1a');
        });
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

    ancienneteInput.addEventListener('input', (e) => {
        state.anciennete = parseInt(e.target.value) || 0;
        // L'expérience pro ne peut pas être inférieure à l'ancienneté
        if (state.experiencePro < state.anciennete) {
            state.experiencePro = state.anciennete;
            experienceProInput.value = state.anciennete;
        }
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

    experienceProInput.addEventListener('input', (e) => {
        let value = parseInt(e.target.value) || 0;
        // L'expérience pro ne peut pas être inférieure à l'ancienneté
        if (value < state.anciennete) {
            value = state.anciennete;
            experienceProInput.value = value;
        }
        state.experiencePro = value;
        updateAll();
    });

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
        state.travailEquipe = e.target.checked;
        heuresEquipeField.classList.toggle('hidden', !e.target.checked);
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
            state.accordKuhn = e.target.checked;
            
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
        
        // Prime d'équipe : Kuhn + non-cadres uniquement
        if (state.accordKuhn && !isCadre) {
            primeEquipeGroup.classList.remove('hidden');
        } else {
            primeEquipeGroup.classList.add('hidden');
            state.travailEquipe = false;
            document.getElementById('travail-equipe').checked = false;
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

    // Détails
    const detailsContainer = document.getElementById('result-details');
    let detailsHTML = '';
    
    remuneration.details.forEach(detail => {
        const valueClass = detail.isPositive ? 'positive' : '';
        const prefix = detail.isPositive ? '+' : '';
        detailsHTML += `
            <div class="result-detail-item">
                <span class="result-detail-label">${detail.label}</span>
                <span class="result-detail-value ${valueClass}">${prefix}${formatMoney(detail.value)}</span>
            </div>
        `;
    });

    // Ligne total si plusieurs éléments
    if (remuneration.details.length > 1) {
        detailsHTML += `
            <div class="result-detail-item total-row">
                <span class="result-detail-label"><strong>Total</strong></span>
                <span class="result-detail-value"><strong>${formatMoney(remuneration.total)}</strong></span>
            </div>
        `;
    }

    detailsContainer.innerHTML = detailsHTML;

    // Hint informatif
    updateHintDisplay(remuneration);
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
}

/**
 * ============================================
 * UTILITAIRES
 * ============================================
 */
function formatMoney(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
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

// Initialiser le graphique après le chargement
document.addEventListener('DOMContentLoaded', () => {
    initEvolutionChart();
    
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
