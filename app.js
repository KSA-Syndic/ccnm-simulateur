/**
 * ============================================
 * APP.JS - Logique Application Simulateur
 * Convention Collective Métallurgie 2024
 * ============================================
 */

// État global de l'application
const state = {
    scores: [1, 1, 1, 1, 1, 1],  // Scores des 6 critères (1-10)
    modeManuel: false,           // Mode automatique par défaut
    groupeManuel: 'A',           // Groupe sélectionné manuellement
    classeManuel: 1,             // Classe sélectionnée manuellement
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
    primeVacances: true          // Prime de vacances (525€)
};

/**
 * ============================================
 * INITIALISATION
 * ============================================
 */
document.addEventListener('DOMContentLoaded', () => {
    initRoulettes();
    initControls();
    initTooltips();
    updateAll();
});

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
    // Bouton mode manuel
    const btnManuel = document.getElementById('btn-mode-manuel');
    const btnAuto = document.getElementById('btn-mode-auto');
    
    btnManuel.addEventListener('click', () => {
        state.modeManuel = true;
        updateModeDisplay();
        updateAll();
    });

    btnAuto.addEventListener('click', () => {
        state.modeManuel = false;
        updateModeDisplay();
        updateAll();
    });

    // Sélecteurs manuels
    const selectGroupe = document.getElementById('select-groupe');
    const selectClasse = document.getElementById('select-classe');

    selectGroupe.addEventListener('change', (e) => {
        state.groupeManuel = e.target.value;
        updateClasseOptions();
        updateAll();
    });

    selectClasse.addEventListener('change', (e) => {
        state.classeManuel = parseInt(e.target.value);
        updateAll();
    });

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
    const accordContainer = document.getElementById('accord-entreprise-container');
    
    // Checkbox principal accord Kuhn
    accordKuhnCheckbox.addEventListener('change', (e) => {
        state.accordKuhn = e.target.checked;
        
        // Afficher/masquer les options détaillées
        if (state.accordKuhn) {
            accordOptions.classList.remove('hidden');
            accordContainer.classList.add('active');
        } else {
            accordOptions.classList.add('hidden');
            accordContainer.classList.remove('active');
        }
        
        updateConditionsTravailDisplay();
        updateTauxInfo();
        updateAll();
    });

    // Prime de vacances
    const primeVacancesCheckbox = document.getElementById('prime-vacances');
    primeVacancesCheckbox.addEventListener('change', (e) => {
        state.primeVacances = e.target.checked;
        updateAll();
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
 * Mettre à jour l'affichage du mode (auto/manuel)
 */
function updateModeDisplay() {
    const btnManuel = document.getElementById('btn-mode-manuel');
    const btnAuto = document.getElementById('btn-mode-auto');
    const sectionManuel = document.getElementById('classification-manual');
    const sectionAuto = document.getElementById('classification-auto');

    if (state.modeManuel) {
        btnManuel.classList.add('hidden');
        btnAuto.classList.remove('hidden');
        sectionManuel.classList.remove('hidden');
        sectionAuto.style.opacity = '0.5';
    } else {
        btnManuel.classList.remove('hidden');
        btnAuto.classList.add('hidden');
        sectionManuel.classList.add('hidden');
        sectionAuto.style.opacity = '1';
    }
}

/**
 * Mettre à jour les options de classe selon le groupe
 */
function updateClasseOptions() {
    const selectClasse = document.getElementById('select-classe');
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
    document.getElementById('score-total').textContent = totalScore;

    // Classification automatique
    const calcAuto = calculateClassification();
    document.getElementById('groupe-auto').textContent = calcAuto.groupe;
    document.getElementById('classe-auto').textContent = calcAuto.classe;

    // Classification active
    const classification = getActiveClassification();
    const isCadre = classification.classe >= CONFIG.SEUIL_CADRE;

    // Statut Cadre/Non-Cadre
    const statutBadge = document.getElementById('statut-badge');
    if (isCadre) {
        statutBadge.textContent = 'Cadre';
        statutBadge.classList.remove('non-cadre');
        statutBadge.classList.add('cadre');
    } else {
        statutBadge.textContent = 'Non-Cadre';
        statutBadge.classList.remove('cadre');
        statutBadge.classList.add('non-cadre');
    }

    // Affichage des modalités
    const modalitesNonCadre = document.getElementById('modalites-non-cadre');
    const modalitesCadre = document.getElementById('modalites-cadre');
    const cadreDebutant = document.getElementById('cadre-debutant');

    if (isCadre) {
        modalitesNonCadre.classList.add('hidden');
        modalitesCadre.classList.remove('hidden');
        
        // Groupe F débutants (F11 et F12)
        if (classification.classe === 11 || classification.classe === 12) {
            cadreDebutant.classList.remove('hidden');
        } else {
            cadreDebutant.classList.add('hidden');
        }
    } else {
        modalitesNonCadre.classList.remove('hidden');
        modalitesCadre.classList.add('hidden');
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
    
    // Mensuel (approximatif sur 12 mois)
    const mensuel = Math.round(remuneration.total / 12);
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
 * Mettre à jour le hint informatif
 */
function updateHintDisplay(remuneration) {
    const hint = document.getElementById('hint-info');
    const hintText = document.getElementById('hint-text');
    
    // Compter les éléments appliqués
    const kuhnDetails = remuneration.details.filter(d => d.isKuhn);
    const hasMajorations = remuneration.details.some(d => 
        d.label.includes('nuit') || d.label.includes('dimanche') || d.label.includes('équipe')
    );
    const hasKuhnElements = kuhnDetails.length > 0;
    
    if (state.accordKuhn && hasKuhnElements) {
        // Message spécifique Accord Kuhn avec résumé
        hint.className = 'book-hint success';
        
        // Construire le résumé des éléments Kuhn
        const elementsKuhn = kuhnDetails.map(d => {
            if (d.label.includes('ancienneté')) return 'prime ancienneté';
            if (d.label.includes('équipe')) return 'prime équipe';
            if (d.label.includes('nuit')) return 'majoration nuit';
            if (d.label.includes('dimanche')) return 'majoration dimanche';
            if (d.label.includes('vacances')) return 'prime vacances';
            return null;
        }).filter(Boolean);
        
        const listeElements = [...new Set(elementsKuhn)].join(', ');
        
        hintText.innerHTML = `
            <strong>🏢 Accord Kuhn appliqué</strong><br>
            Éléments Kuhn : ${listeElements}.<br>
            <small>Taux Kuhn : nuit poste +20%, matin/AM +15%, dimanche +50%, équipe 0.82€/h.</small>
        `;
    } else if (hasMajorations) {
        // Majorations CCN appliquées
        hint.className = 'book-hint info';
        hintText.innerHTML = `
            <strong>Majorations CCN appliquées</strong><br>
            Taux CCN : nuit +15%, dimanche +100%.<br>
            <small>Cochez "Accord Kuhn" pour appliquer les taux entreprise (nuit +20%, dimanche +50%).</small>
        `;
    } else if (remuneration.scenario === 'cadre-debutant') {
        hint.className = 'book-hint warning';
        const smhStandard = CONFIG.SMH[remuneration.classe];
        hintText.innerHTML = `
            <strong>Barème salariés débutants</strong> - Classe ${remuneration.groupe}${remuneration.classe} avec < 6 ans d'expérience.<br>
            SMH standard (${formatMoney(smhStandard)}) à partir de 6 ans.
        `;
    } else if (remuneration.isCadre) {
        hint.className = 'book-hint info';
        const isForfaitJours = state.forfait === 'jours';
        let msg = '';
        if (isForfaitJours) {
            msg = 'Forfait jours : les majorations nuit/dimanche donnent lieu à du repos compensateur (non simulé).';
            if (state.accordKuhn) {
                msg += ' Accord Kuhn : prime ancienneté applicable.';
            }
        } else {
            msg = state.accordKuhn 
                ? 'Accord Kuhn actif : prime d\'ancienneté cadres applicable. Majorations nuit/dimanche possibles.'
                : 'Majorations nuit/dimanche possibles (base 35h ou forfait heures). Accord Kuhn : prime d\'ancienneté cadres.';
        }
        hintText.innerHTML = msg;
    } else {
        hint.className = 'book-hint info';
        if (state.anciennete >= 3 || (state.accordKuhn && state.anciennete >= 2)) {
            hintText.innerHTML = `
                Prime d'ancienneté incluse. Renseignez vos conditions de travail (nuit, dimanche, équipe) si applicable.
            `;
        } else {
            const seuilAnc = state.accordKuhn ? '2 ans (Kuhn)' : '3 ans (CCN)';
            hintText.innerHTML = `
                Minimum conventionnel. Prime d'ancienneté à partir de ${seuilAnc}.
            `;
        }
    }
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
    console.log('fetchInflationData');
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
    const panel = document.getElementById('evolution-section');
    if (!panel || panel.classList.contains('hidden')) return;
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
    
    // Construire le label du salaire selon si augmentation ou non
    let salaryLabel = 'Votre salaire (ancienneté';
    if (augmentationAnnuelle > 0) {
        salaryLabel += ` + ${augmentationAnnuelle}%/an`;
    }
    salaryLabel += ')';
    
    evolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: salaryLabel,
                    data: salaryDataArray,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: years > 20 ? 2 : 4,
                    pointHoverRadius: 6
                },
                {
                    label: `Inflation cumulée (${avgInflation.toFixed(1)}%/an moy.)`,
                    data: inflationDataArray,
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderDash: [5, 5],
                    pointRadius: years > 20 ? 1 : 3,
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
                        boxWidth: 12,
                        font: { size: 11 }
                    }
                },
                tooltip: {
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
                        maxTicksLimit: years > 20 ? 10 : 15,
                        font: { size: 10 }
                    }
                },
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return formatMoney(value);
                        },
                        font: { size: 10 }
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
    const btnEvolution = document.getElementById('btn-evolution');
    const btnClose = document.getElementById('btn-close-evolution');
    const panel = document.getElementById('evolution-section');
    const yearsSelect = document.getElementById('projection-years');
    const ageInputWrapper = document.getElementById('age-input-wrapper');
    const ageInput = document.getElementById('age-actuel');
    
    if (!btnEvolution) return;
    
    // Fonction pour obtenir le nombre d'années à projeter
    const getProjectionYears = () => {
        const value = yearsSelect.value;
        if (value === 'retraite') {
            const age = parseInt(ageInput.value) || 30;
            return getYearsToRetirement(age);
        }
        return parseInt(value);
    };
    
    // Afficher/masquer le champ d'âge selon la sélection
    const updateAgeInputVisibility = () => {
        if (yearsSelect.value === 'retraite') {
            ageInputWrapper.classList.remove('hidden');
        } else {
            ageInputWrapper.classList.add('hidden');
        }
    };
    
    btnEvolution.addEventListener('click', async () => {
        panel.classList.remove('hidden');
        btnEvolution.classList.add('hidden');
        updateAgeInputVisibility();
        await updateEvolutionChart(getProjectionYears());
    });
    
    btnClose.addEventListener('click', () => {
        panel.classList.add('hidden');
        btnEvolution.classList.remove('hidden');
    });
    
    yearsSelect.addEventListener('change', async () => {
        updateAgeInputVisibility();
        await updateEvolutionChart(getProjectionYears());
    });
    
    // Mettre à jour le graphique quand l'âge change
    if (ageInput) {
        ageInput.addEventListener('change', async () => {
            if (yearsSelect.value === 'retraite') {
                await updateEvolutionChart(getProjectionYears());
            }
        });
    }
    
    // Mettre à jour le graphique quand l'augmentation annuelle change
    const augmentationInput = document.getElementById('augmentation-annuelle');
    if (augmentationInput) {
        augmentationInput.addEventListener('input', async () => {
            if (!panel.classList.contains('hidden')) {
                await updateEvolutionChart(getProjectionYears());
            }
        });
    }
}

// Initialiser le graphique après le chargement
document.addEventListener('DOMContentLoaded', () => {
    initEvolutionChart();
});
