/**
 * ============================================
 * SALARY CURVE - Graphique Chart.js Arriérés
 * ============================================
 * 
 * Gestion du graphique Chart.js pour la frise chronologique des arriérés.
 * Corrige le bug du graphique qui ouvre à l'infini.
 */

import { getPeriodsData, getCurrentPeriodIndex, setCurrentPeriodIndex, setSalaryCurveChart, dismissFloatingBlock, isFloatingBlockDismissed } from './TimelineManager.js';

/**
 * Créer ou mettre à jour la courbe Chart.js
 * @param {Array<Object>} periodsData - Données des périodes
 */
export function createSalaryCurve(periodsData) {
    const canvas = document.getElementById('salary-curve-chart');
    if (!canvas) {
        console.warn('Canvas salary-curve-chart non trouvé');
        return null;
    }
    
    // Vérifier que Chart.js est disponible
    if (typeof Chart === 'undefined') {
        console.error('Chart.js n\'est pas chargé');
        return null;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Impossible d\'obtenir le contexte 2D du canvas');
        return null;
    }
    
    // Détruire le graphique existant s'il existe
    let existingChart = window.salaryCurveChartInstance;
    if (existingChart) {
        existingChart.destroy();
        existingChart = null;
    }
    
    const labels = periodsData.map(p => p.monthLabel);
    const salairesReels = periodsData.map(p => p.salaireReel || null);
    const salairesDus = periodsData.map(p => p.salaireDu || 0);
    
    // Couleurs des points selon leur état
    const currentIndex = getCurrentPeriodIndex();
    const pointColors = periodsData.map((p, i) => {
        if (p.salaireReel) {
            return i === currentIndex ? '#2e7d32' : '#4caf50';
        }
        return i === currentIndex ? '#f57c00' : '#ff9800';
    });
    
    const pointRadius = periodsData.map((p, i) => i === currentIndex ? 8 : 5);
    const pointHoverRadius = periodsData.map((p, i) => i === currentIndex ? 12 : 8);
    
    const chart = new Chart(ctx, {
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
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return `${label}: ${value ? value.toLocaleString('fr-FR') + ' €' : 'Non saisi'}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: false
                    }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('fr-FR') + ' €';
                        }
                    }
                }
            },
            onClick: (event, elements) => {
                // CORRECTION BUG : Gérer correctement les clics sur les points
                if (elements.length > 0) {
                    const dataIndex = elements[0].index;
                    const currentIndex = getCurrentPeriodIndex();
                    
                    if (dataIndex === currentIndex) {
                        // Reclic sur le point déjà sélectionné : basculer visibilité
                        const block = document.getElementById('floating-input-block');
                        const isHidden = block ? block.classList.contains('floating-block-hidden') : true;
                        
                        if (isHidden) {
                            // Rouvrir le bloc
                            dismissFloatingBlock();
                            block.classList.remove('floating-block-hidden');
                            block.style.visibility = '';
                            positionFloatingBlock(dataIndex);
                        } else {
                            // Fermer le bloc
                            dismissFloatingBlock();
                            block.classList.add('floating-block-hidden');
                            block.style.visibility = 'hidden';
                        }
                        return;
                    }
                    
                    // Nouveau point sélectionné
                    dismissFloatingBlock();
                    setCurrentPeriodIndex(dataIndex);
                    positionFloatingBlockFromPoint(dataIndex);
                }
            }
        }
    });
    
    // Stocker l'instance globalement pour compatibilité
    window.salaryCurveChartInstance = chart;
    setSalaryCurveChart(chart);
    
    return chart;
}

/**
 * Mettre à jour la courbe avec de nouvelles données
 * @param {Chart} chart - Instance du graphique
 * @param {Array<Object>} periodsData - Nouvelles données
 */
export function updateSalaryCurve(chart, periodsData) {
    if (!chart) {
        return;
    }
    
    const currentIndex = getCurrentPeriodIndex();
    const salairesReels = periodsData.map(p => p.salaireReel || null);
    const salairesDus = periodsData.map(p => p.salaireDu || 0);
    
    const pointColors = periodsData.map((p, i) => {
        if (p.salaireReel) {
            return i === currentIndex ? '#2e7d32' : '#4caf50';
        }
        return i === currentIndex ? '#f57c00' : '#ff9800';
    });
    
    const pointRadius = periodsData.map((p, i) => i === currentIndex ? 8 : 5);
    const pointHoverRadius = periodsData.map((p, i) => i === currentIndex ? 12 : 8);
    
    chart.data.datasets[0].data = salairesReels;
    chart.data.datasets[0].pointBackgroundColor = pointColors;
    chart.data.datasets[0].pointBorderColor = pointColors;
    chart.data.datasets[0].pointRadius = pointRadius;
    chart.data.datasets[0].pointHoverRadius = pointHoverRadius;
    chart.data.datasets[1].data = salairesDus;
    
    chart.update('none');
}

/**
 * Positionner le bloc flottant depuis un point du graphique
 * @param {number} periodIndex - Index de la période
 */
function positionFloatingBlockFromPoint(periodIndex) {
    const floatingBlock = document.getElementById('floating-input-block');
    const chartWrapper = document.getElementById('curve-chart-wrapper');
    
    if (!floatingBlock || !chartWrapper) {
        return;
    }
    
    // Obtenir les coordonnées du point dans le wrapper
    const chart = window.salaryCurveChartInstance;
    if (!chart) {
        return;
    }
    
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data[periodIndex]) {
        return;
    }
    
    const point = meta.data[periodIndex];
    const rect = chartWrapper.getBoundingClientRect();
    const chartRect = chart.canvas.getBoundingClientRect();
    
    const x = point.x - chartRect.left + rect.left;
    const y = point.y - chartRect.top + rect.top;
    
    // Animer depuis le point vers le centre
    floatingBlock.style.left = x + 'px';
    floatingBlock.style.top = y + 'px';
    floatingBlock.style.transform = 'translate(-50%, -50%) scale(0.2)';
    floatingBlock.style.opacity = '0.9';
    floatingBlock.style.transition = 'none';
    floatingBlock.classList.remove('floating-block-hidden');
    floatingBlock.style.visibility = '';
    
    requestAnimationFrame(() => {
        floatingBlock.style.transition = 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)';
        floatingBlock.style.left = '50%';
        floatingBlock.style.top = '50%';
        floatingBlock.style.transform = 'translate(-50%, -50%) scale(1)';
        floatingBlock.style.opacity = '1';
        
        // Focus sur le champ
        const amountInput = document.getElementById('floating-salary-input');
        if (amountInput) {
            setTimeout(() => {
                amountInput.focus();
                amountInput.select();
            }, 300);
        }
    });
}

/**
 * Positionner le bloc flottant au centre
 * @param {number} periodIndex - Index de la période
 */
function positionFloatingBlock(periodIndex) {
    const floatingBlock = document.getElementById('floating-input-block');
    if (!floatingBlock) {
        return;
    }
    
    floatingBlock.classList.remove('floating-block-hidden');
    floatingBlock.style.visibility = '';
    floatingBlock.style.left = '50%';
    floatingBlock.style.top = '50%';
    floatingBlock.style.transform = 'translate(-50%, -50%) scale(1)';
    floatingBlock.style.opacity = '1';
    
    // Focus sur le champ
    const amountInput = document.getElementById('floating-salary-input');
    if (amountInput) {
        const periodsData = getPeriodsData();
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
