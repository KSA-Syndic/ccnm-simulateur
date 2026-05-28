<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, computed } from 'vue';
import { createChart, type ChartType } from '../../infra/adapters/chartjs';
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

async function renderChart() {
  if (!canvasRef.value || arreteesStore.periodes.length === 0) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const labels = arreteesStore.periodes.map((p) => p.label);
  const salairesDus = arreteesStore.periodes.map((p) => p.salaireDu || 0);
  const salairesReels = arreteesStore.periodes.map((p) =>
    p.salaireVerse === undefined ? null : p.salaireVerse,
  );

  const ci = currentIdx.value;
  const highlight = ci >= 0;
  const pointColors = arreteesStore.periodes.map((p, i) => {
    if (p.salaireVerse != null && p.salaireVerse > 0) {
      return highlight && i === ci ? '#2e7d32' : '#4caf50';
    }
    return highlight && i === ci ? '#f57c00' : '#ff9800';
  });
  const pointRadius = arreteesStore.periodes.map((_, i) => (highlight && i === ci ? 10 : 5));
  const pointHoverRadius = arreteesStore.periodes.map((_, i) => (highlight && i === ci ? 14 : 8));
  const pointBorderWidth = arreteesStore.periodes.map((_, i) => (highlight && i === ci ? 3 : 1));

  chartInstance = await createChart(canvasRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Salaire réel saisi',
          data: salairesReels as (number | null)[],
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          pointBorderWidth,
          pointRadius,
          pointHoverRadius,
          borderWidth: 2,
          tension: 0.4,
          spanGaps: true,
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
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      onClick: (_event, elements) => {
        if (elements.length > 0 && elements[0]) {
          emit('pointClick', elements[0].index);
        }
      },
      layout: {
        padding: { bottom: 20, left: 4, right: 4 },
      },
      plugins: {
        legend: { display: false },
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
          ticks: {
            maxRotation: 45,
            minRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
          },
        },
        y: {
          display: true,
          beginAtZero: true,
          ticks: {
            callback: (val) => formatMoney(Number(val)),
          },
        },
      },
    },
  });

  emit('rendered');
}

function getPointCoordsInWrapper(periodIndex: number): { x: number; y: number } | null {
  if (!chartInstance || !canvasRef.value) return null;
  return getChartPointCoordsInWrapper(chartInstance, canvasRef.value, periodIndex);
}

defineExpose({
  getPointCoordsInWrapper,
  refreshChart: renderChart,
});

onMounted(() => {
  void renderChart();
});
watch(
  () => arreteesStore.periodes,
  () => {
    void renderChart();
  },
  { deep: true },
);
watch(currentIdx, () => {
  void renderChart();
});
onBeforeUnmount(() => {
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
