<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, computed } from 'vue';
import { createChart, type ChartConfiguration, type ChartType } from '../../infra/adapters/chartjs';
import { useArreteesStore } from '../../stores/arretees';
import { formatMoney } from '../../domain/utils/format';
import { getChartPointCoordsInWrapper } from './chartPointCoords';

const arreteesStore = useArreteesStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: ChartType | null = null;

const emit = defineEmits<{
  pointClick: [index: number];
  rendered: [];
}>();

const currentIdx = computed(() => arreteesStore.currentPeriodIndex);

function isCompactChart(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches;
}

/** Données et styles de points (mois courant mis en évidence) pour la frise actuelle. */
function buildChartData() {
  const periodes = arreteesStore.periodes;
  const ci = currentIdx.value;
  const highlight = ci >= 0;
  const pointColors = periodes.map((p, i) => {
    if (p.salaireVerse != null && p.salaireVerse > 0) {
      return highlight && i === ci ? '#2e7d32' : '#4caf50';
    }
    return highlight && i === ci ? '#f57c00' : '#ff9800';
  });
  return {
    labels: periodes.map((p) => p.label),
    datasets: [
      {
        label: 'Salaire réel saisi',
        data: periodes.map((p) => (p.salaireVerse === undefined ? null : p.salaireVerse)),
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        pointBackgroundColor: pointColors,
        pointBorderColor: pointColors,
        pointBorderWidth: periodes.map((_, i) => (highlight && i === ci ? 3 : 1)),
        pointRadius: periodes.map((_, i) => (highlight && i === ci ? 10 : 5)),
        pointHoverRadius: periodes.map((_, i) => (highlight && i === ci ? 14 : 8)),
        borderWidth: 2,
        tension: 0.4,
        spanGaps: true,
      },
      {
        label: 'Salaire dû',
        data: periodes.map((p) => p.salaireDu || 0),
        borderColor: '#2196f3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.4,
      },
    ],
  } satisfies ChartConfiguration<'line'>['data'];
}

/** Mise en page compacte (mobile) du graphique au moment de sa création. */
let chartCompact: boolean | null = null;

/**
 * Crée le graphique une fois (animation d'entrée), puis le met à jour en place sans animation :
 * le bloc de saisie flottant lit des coordonnées de points définitives dès l'événement `rendered`.
 * Recréé seulement quand la mise en page bascule entre compact et large.
 */
async function drawChart() {
  if (!canvasRef.value || arreteesStore.periodes.length === 0) return;

  const compact = isCompactChart();
  const data = buildChartData();

  if (chartInstance && chartCompact === compact) {
    chartInstance.data.labels = data.labels;
    chartInstance.data.datasets = data.datasets;
    chartInstance.resize();
    chartInstance.update('none');
    emit('rendered');
    return;
  }

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  chartCompact = compact;

  chartInstance = await createChart(canvasRef.value, {
    type: 'line',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      onClick: (_event, elements) => {
        if (elements.length > 0 && elements[0]) {
          emit('pointClick', elements[0].index);
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'center',
          labels: {
            color: '#4b5563',
            usePointStyle: true,
            pointStyle: 'line',
            boxWidth: compact ? 10 : 14,
            boxHeight: compact ? 8 : 10,
            padding: compact ? 10 : 14,
            font: { size: compact ? 11 : 12 },
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const label = ctx.dataset.label || '';
              const value = ctx.parsed.y;
              if (value == null || Number.isNaN(value)) {
                return `${label} : Non saisi`;
              }
              return `${label} : ${formatMoney(value)}`;
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          grid: { display: false },
          ticks: compact
            ? { maxRotation: 0, minRotation: 0, autoSkip: true, maxTicksLimit: 5 }
            : { maxRotation: 45, minRotation: 0, autoSkip: true },
        },
        y: {
          display: true,
          beginAtZero: true,
          ticks: compact
            ? {
                maxTicksLimit: 5,
                callback: (val) => formatMoney(Number(val)),
              }
            : {
                callback: (val) => formatMoney(Number(val)),
              },
        },
      },
      layout: {
        padding: compact
          ? { top: 0, right: 6, bottom: 2, left: 6 }
          : { top: 0, right: 10, bottom: 4, left: 10 },
      },
    },
  });

  emit('rendered');
}

/** Rendus enchaînés : jamais deux créations concurrentes pendant le chargement de chart.js. */
let renderQueue: Promise<void> = Promise.resolve();
function renderChart(): Promise<void> {
  renderQueue = renderQueue.then(drawChart, drawChart);
  return renderQueue;
}

function getPointCoordsInWrapper(periodIndex: number): { x: number; y: number } | null {
  if (!chartInstance || !canvasRef.value) return null;
  return getChartPointCoordsInWrapper(chartInstance, canvasRef.value, periodIndex);
}

defineExpose({
  getPointCoordsInWrapper,
  refreshChart: renderChart,
});

/** Regroupe redimensionnements et mises à jour (données + mois courant) en un seul rendu par frame. */
let renderFrame: number | null = null;
function scheduleRender() {
  if (renderFrame != null) return;
  renderFrame = requestAnimationFrame(() => {
    renderFrame = null;
    void renderChart();
  });
}

onMounted(() => {
  void renderChart();
  window.addEventListener('resize', scheduleRender);
});
watch(() => arreteesStore.periodes, scheduleRender, { deep: true });
watch(currentIdx, scheduleRender);
onBeforeUnmount(() => {
  window.removeEventListener('resize', scheduleRender);
  if (renderFrame != null) cancelAnimationFrame(renderFrame);
  chartInstance?.destroy();
});
</script>

<template>
  <div id="curve-chart-wrapper" class="curve-chart-wrapper">
    <canvas
      id="salary-curve-chart"
      ref="canvasRef"
      aria-label="Courbe de comparaison des salaires"
      role="img"
    />
  </div>
</template>

<style scoped>
.curve-chart-wrapper {
  position: relative;
  width: 100%;
  min-height: 280px;
}
</style>
