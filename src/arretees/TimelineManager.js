/**
 * ============================================
 * TIMELINE MANAGER - Gestion Frise Chronologique
 * ============================================
 * 
 * Gestion de la frise chronologique interactive pour les arriérés.
 * Corrige les bugs : graphique infini, compteur mois non incrémenté.
 */

/**
 * Données des périodes
 * @type {Array<Object>}
 */
let periodsData = [];

/**
 * Index de la période actuelle
 * @type {number}
 */
let currentPeriodIndex = 0;

/**
 * Graphique Chart.js
 * @type {Chart|null}
 */
let salaryCurveChart = null;

/**
 * Flag pour indiquer si le bloc flottant a été fermé par l'utilisateur
 * @type {boolean}
 */
let floatingBlockDismissed = false;

/**
 * Mettre à jour les contrôles de la courbe
 * Corrige le bug du compteur non incrémenté
 */
export function updateCurveControls() {
    const floatingLabel = document.getElementById('floating-period-label');
    const progressEl = document.getElementById('curve-progress-text');
    const floatingBlock = document.getElementById('floating-input-block');
    
    if (periodsData.length === 0 || currentPeriodIndex >= periodsData.length) {
        return;
    }
    
    const currentPeriod = periodsData[currentPeriodIndex];
    if (!currentPeriod) {
        return;
    }
    
    if (floatingLabel) {
        floatingLabel.textContent = currentPeriod.label;
    }
    
    // CORRECTION BUG : Mettre à jour le compteur à chaque fois
    const saisis = periodsData.filter(p => p.salaireReel !== undefined && p.salaireReel !== null).length;
    if (progressEl) {
        progressEl.textContent = `${saisis} / ${periodsData.length} mois saisis`;
    }
    
    // CORRECTION BUG : Gérer correctement l'affichage du bloc flottant
    const allFilled = !periodsData.some(p => !p.salaireReel);
    const isLastIndex = currentPeriodIndex === periodsData.length - 1;
    
    if (floatingBlock && salaryCurveChart) {
        // Ne pas réafficher le bloc si tous les mois sont saisis ET que c'est le dernier ET que l'utilisateur l'a fermé
        if (allFilled && isLastIndex && floatingBlockDismissed) {
            floatingBlock.classList.add('floating-block-hidden');
            floatingBlock.style.visibility = 'hidden';
        } else {
            // Afficher le bloc pour le mois courant
            positionFloatingBlock(currentPeriodIndex);
        }
    }
}

/**
 * Positionner le bloc flottant au centre du conteneur
 * @param {number} periodIndex - Index de la période
 */
function positionFloatingBlock(periodIndex) {
    const floatingBlock = document.getElementById('floating-input-block');
    const chartWrapper = document.getElementById('curve-chart-wrapper');
    
    if (!floatingBlock || !chartWrapper) {
        return;
    }
    
    // Réinitialiser les styles
    floatingBlock.classList.remove('floating-block-hidden');
    floatingBlock.style.visibility = '';
    floatingBlock.style.left = '50%';
    floatingBlock.style.top = '50%';
    floatingBlock.style.transform = 'translate(-50%, -50%) scale(1)';
    floatingBlock.style.opacity = '1';
    
    // Focus sur le champ de saisie
    const amountInput = document.getElementById('floating-salary-input');
    if (amountInput) {
        const currentPeriod = periodsData[periodIndex];
        if (currentPeriod) {
            amountInput.value = currentPeriod.salaireReel || '';
        }
        setTimeout(() => {
            amountInput.focus();
            amountInput.select();
        }, 100);
    }
}

/**
 * Initialiser la timeline
 * @param {Date} dateDebut - Date de début
 * @param {Date} dateFin - Date de fin
 * @param {Function} calculateSalaireDu - Fonction pour calculer le salaire dû
 */
export function initTimeline(dateDebut, dateFin, calculateSalaireDu) {
    periodsData = [];
    currentPeriodIndex = 0;
    floatingBlockDismissed = false;
    
    let currentDate = new Date(dateDebut);
    
    while (currentDate <= dateFin) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const periodKey = `${year}-${String(month).padStart(2, '0')}`;
        const monthLabel = currentDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        
        const salaireDu = calculateSalaireDu(currentDate);
        
        periodsData.push({
            key: periodKey,
            label: monthLabel,
            date: new Date(currentDate),
            salaireReel: null,
            salaireDu: salaireDu
        });
        
        // Passer au mois suivant
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    // Trouver le premier mois non saisi
    currentPeriodIndex = periodsData.findIndex(p => !p.salaireReel);
    if (currentPeriodIndex === -1) {
        currentPeriodIndex = 0;
    }
}

/**
 * Enregistrer un salaire pour une période
 * @param {string} periodKey - Clé de la période
 * @param {number} salaire - Salaire mensuel brut
 */
export function saveSalaryForPeriod(periodKey, salaire) {
    const period = periodsData.find(p => p.key === periodKey);
    if (period) {
        period.salaireReel = salaire;
        
        // Mettre à jour le compteur immédiatement
        const saisis = periodsData.filter(p => p.salaireReel !== undefined && p.salaireReel !== null).length;
        const progressEl = document.getElementById('curve-progress-text');
        if (progressEl) {
            progressEl.textContent = `${saisis} / ${periodsData.length} mois saisis`;
        }
        
        // Trouver le prochain mois non saisi
        const nextIndex = periodsData.findIndex((p, i) => i > currentPeriodIndex && !p.salaireReel);
        if (nextIndex !== -1) {
            currentPeriodIndex = nextIndex;
        } else {
            // Tous les mois suivants sont saisis, trouver le premier non saisi
            const firstMissing = periodsData.findIndex(p => !p.salaireReel);
            if (firstMissing !== -1) {
                currentPeriodIndex = firstMissing;
            } else {
                // Tous saisis
                floatingBlockDismissed = true;
            }
        }
    }
}

/**
 * Obtenir les données des périodes
 * @returns {Array<Object>} Données des périodes
 */
export function getPeriodsData() {
    return periodsData;
}

/**
 * Obtenir l'index de la période actuelle
 * @returns {number} Index actuel
 */
export function getCurrentPeriodIndex() {
    return currentPeriodIndex;
}

/**
 * Définir l'index de la période actuelle
 * @param {number} index - Nouvel index
 */
export function setCurrentPeriodIndex(index) {
    if (index >= 0 && index < periodsData.length) {
        currentPeriodIndex = index;
        floatingBlockDismissed = false;
    }
}

/**
 * Définir le graphique Chart.js
 * @param {Chart} chart - Instance du graphique
 */
export function setSalaryCurveChart(chart) {
    salaryCurveChart = chart;
}

/**
 * Obtenir le graphique Chart.js
 * @returns {Chart|null} Instance du graphique
 */
export function getSalaryCurveChart() {
    return salaryCurveChart;
}

/**
 * Marquer le bloc flottant comme fermé
 */
export function dismissFloatingBlock() {
    floatingBlockDismissed = true;
}

/**
 * Vérifier si le bloc flottant est fermé
 * @returns {boolean} true si fermé
 */
export function isFloatingBlockDismissed() {
    return floatingBlockDismissed;
}
