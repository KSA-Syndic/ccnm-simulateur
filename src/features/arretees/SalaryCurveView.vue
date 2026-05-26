<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import { createChart, type ChartType } from '../../infra/adapters/chartjs';
import { useArreteesStore } from '../../stores/arretees';
import { formatMoney } from '../../domain/utils/format';

const arreteesStore = useArreteesStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: ChartType | null = null;

const emit = defineEmits<{
  (e: 'pointClick', index: number): void;
}>();

async function renderChart() {
  if (!canvasRef.value || arreteesStore.periodes.length === 0) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const labels = arreteesStore.periodes.map((p) => p.label);
  const salaireDu = arreteesStore.periodes.map((p) => p.salaireDu);
  const salaireVerse = arreteesStore.periodes.map((p) => p.salaireVerse ?? 0);

  chartInstance = await createChart(canvasRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Salaire dû (convention)',
          data: salaireDu,
          borderColor: '#4a90d9',
          backgroundColor: 'rgba(74, 144, 217, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointHoverRadius: 8,
        },
        {
          label: 'Salaire versé',
          data: salaireVerse,
          borderColor: '#e67e22',
          backgroundColor: 'rgba(230, 126, 34, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointHoverRadius: 8,
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
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatMoney(ctx.parsed.y ?? 0)}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: (val) => formatMoney(Number(val)),
          },
        },
      },
    },
  });
}

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
onBeforeUnmount(() => {
  chartInstance?.destroy();
});
</script>

<template>
  <div class="salary-curve-container">
    <canvas ref="canvasRef" aria-label="Courbe de comparaison des salaires" role="img" />
  </div>
</template>

<style scoped>
.salary-curve-container {
  position: relative;
  width: 100%;
  min-height: 320px;
}
</style>
