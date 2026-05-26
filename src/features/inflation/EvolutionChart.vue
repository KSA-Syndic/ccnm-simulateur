<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import { useWizardStore } from '../../stores/wizard';
import { calculateSalaryEvolution, type EvolutionPoint } from '../../domain/evolution/inflation';
import { formatMoney } from '../../domain/utils/format';

interface ChartLike {
  destroy(): void;
}

const wizard = useWizardStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: ChartLike | null = null;
const points = ref<EvolutionPoint[]>([]);

async function renderChart() {
  if (!canvasRef.value) return;

  points.value = calculateSalaryEvolution(wizard.classe);
  if (points.value.length < 2) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const { Chart, registerables } = await import('chart.js');
  Chart.register(...registerables);

  chartInstance = new Chart(canvasRef.value, {
    type: 'bar',
    data: {
      labels: points.value.map((p) => String(p.year)),
      datasets: [
        {
          label: 'Évolution SMH cumulée (%)',
          data: points.value.map((p) => p.salaryCumul),
          backgroundColor: 'rgba(74, 144, 217, 0.7)',
          borderColor: '#4a90d9',
          borderWidth: 1,
        },
        {
          label: 'Inflation cumulée (%)',
          data: points.value.map((p) => p.inflationCumul),
          backgroundColor: 'rgba(230, 126, 34, 0.7)',
          borderColor: '#e67e22',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel(ctx) {
              const pt = points.value[ctx.dataIndex];
              return pt ? `SMH : ${formatMoney(pt.smh)}` : '';
            },
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback(val) {
              return `${Number(val).toFixed(1)}%`;
            },
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
  () => wizard.classe,
  () => {
    void renderChart();
  },
);
onBeforeUnmount(() => {
  chartInstance?.destroy();
});
</script>

<template>
  <div v-if="points.length >= 2" class="evolution-chart-container">
    <h3>Évolution SMH vs Inflation</h3>
    <div class="chart-wrapper" style="height: 300px">
      <canvas ref="canvasRef" aria-label="Graphique évolution salaire vs inflation" role="img" />
    </div>
  </div>
</template>
