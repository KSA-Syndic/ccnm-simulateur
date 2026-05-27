<script setup lang="ts">
import { ref, watch, onBeforeUnmount, nextTick, computed } from 'vue';
import { createChart, type ChartType } from '../../infra/adapters/chartjs';
import { useWizardRemunerationInput } from '../../composables/useWizardRemunerationInput';
import { computeAnnualRemunerationFromWizardStores } from '../../domain/remuneration/compute';
import {
  projectSalaryTotals,
  projectInflationTotals,
  averageInflationFromSeries,
  buildEvolutionSummaryHtml,
  getYearsToRetirement,
  INFLATION_FALLBACK_PCT,
} from '../../domain/evolution/projection';
import { fetchInflationSeries } from '../../domain/evolution/inflationFetch';
import { WIZARD_LEGACY_LABELS } from '../../domain/ui/labels';
import { buildWizardTooltipHtml } from '../../domain/ui/wizardTooltips';
import { AppTooltip, NumericInput } from '../../components/ui';

const evolutionInflationTooltip = buildWizardTooltipHtml('evolutionInflation');

const wizardInput = useWizardRemunerationInput();

const detailsOpen = ref(false);
const augmentationPromptDismissed = ref(false);
type Horizon = '5' | '10' | '15' | '20' | '25' | '30' | 'retraite';
const projectionYears = ref<Horizon>('10');
const ageActuel = ref(30);
const augmentationAnnuelle = ref(0);
const inflationSeries = ref<Record<string, number>>({});
const inflationMeta = ref<{ source: string; period: string }>({ source: '', period: '' });
const summaryHtml = ref('');
const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: ChartType | null = null;
let chartRenderTimer: ReturnType<typeof setTimeout> | undefined;

const showAugmentationPrompt = computed(
  () =>
    detailsOpen.value &&
    !augmentationPromptDismissed.value &&
    (Number(augmentationAnnuelle.value) || 0) === 0,
);

const inflationMetaCaption = computed(() => {
  const s = inflationMeta.value.source.trim();
  const p = inflationMeta.value.period.trim();
  if (!s && !p) return 'Inflation : chargement…';
  const periodText = p ? ` (${p})` : '';
  return `Inflation : ${s}${periodText}`;
});

function resolvedYears(): number {
  if (projectionYears.value === 'retraite') {
    return getYearsToRetirement(ageActuel.value);
  }
  return Number.parseInt(projectionYears.value, 10) || 10;
}

async function renderChart() {
  const years = resolvedYears();
  const input = wizardInput.value;
  const aug = Number(augmentationAnnuelle.value) || 0;
  const avgInfl =
    Object.keys(inflationSeries.value).length > 0
      ? averageInflationFromSeries(inflationSeries.value)
      : INFLATION_FALLBACK_PCT;

  const salaryLine = projectSalaryTotals(input, years, aug);
  const initial = computeAnnualRemunerationFromWizardStores(input).total;
  const inflLine = projectInflationTotals(initial, years, avgInfl);

  const labels = salaryLine.map((p) => String(p.year));
  const salaryLabel = aug > 0 ? `Salaire (+${aug}%/an)` : 'Votre salaire';
  const inflationLabel = `Inflation cumulée (${avgInfl.toFixed(1).replace('.', ',')}%/an moy.)`;

  const finalSalary = salaryLine[salaryLine.length - 1]?.salary ?? 0;
  const finalInflation = inflLine[inflLine.length - 1]?.salary ?? 0;
  summaryHtml.value = buildEvolutionSummaryHtml({
    years,
    finalSalary,
    finalInflation: finalInflation || 1,
    avgInflationPct: avgInfl,
  });

  await nextTick();
  if (!canvasRef.value) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  chartInstance = await createChart(canvasRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: salaryLabel,
          data: salaryLine.map((p) => p.salary),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.15)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: years > 20 ? 2 : 4,
          pointHoverRadius: 6,
        },
        {
          label: inflationLabel,
          data: inflLine.map((p) => p.salary),
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: years > 20 ? 2 : 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
      },
      scales: {
        y: {
          ticks: {
            callback(val) {
              return new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0,
              }).format(Number(val));
            },
          },
        },
      },
    },
  });
}

function scheduleRenderChart() {
  if (!detailsOpen.value) return;
  if (chartRenderTimer) clearTimeout(chartRenderTimer);
  chartRenderTimer = setTimeout(() => {
    void renderChart();
  }, 200);
}

function dismissAugmentationPrompt() {
  augmentationPromptDismissed.value = true;
}

async function onDetailsToggle(ev: Event) {
  const el = ev.target as HTMLDetailsElement;
  detailsOpen.value = !!el.open;
  if (!el.open) return;
  augmentationPromptDismissed.value = false;
  if (Object.keys(inflationSeries.value).length === 0) {
    const r = await fetchInflationSeries();
    inflationSeries.value = r.values;
    inflationMeta.value = { source: r.source, period: r.period };
  }
  await renderChart();
}

watch(projectionYears, () => {
  if (detailsOpen.value) void renderChart();
});

watch(augmentationAnnuelle, (v) => {
  if (Number(v) > 0) dismissAugmentationPrompt();
});

watch([ageActuel, augmentationAnnuelle, wizardInput], scheduleRenderChart, { deep: true });

onBeforeUnmount(() => {
  if (chartRenderTimer) clearTimeout(chartRenderTimer);
  chartInstance?.destroy();
});
</script>

<template>
  <details class="evolution-details" @toggle="onDetailsToggle">
    <summary id="evolution-details-summary" class="evolution-details-summary">
      <span class="evolution-details-summary-title">{{
        WIZARD_LEGACY_LABELS.evolutionInflation
      }}</span>
      <span class="evolution-details-summary-tooltip" @click.stop @mousedown.stop>
        <AppTooltip
          :content="evolutionInflationTooltip"
          variant="compact"
          position="top"
          trigger-aria-label="Comprendre la projection par rapport à l'inflation"
        />
      </span>
    </summary>
    <div id="evolution-section" class="evolution-panel">
      <div class="evolution-controls">
        <label>
          Projection :
          <select id="projection-years" v-model="projectionYears" class="book-select-inline">
            <option value="5">5 ans</option>
            <option value="10">10 ans</option>
            <option value="15">15 ans</option>
            <option value="20">20 ans</option>
            <option value="25">25 ans</option>
            <option value="30">30 ans</option>
            <option value="retraite">Retraite</option>
          </select>
        </label>
        <label v-show="projectionYears === 'retraite'" id="age-input-wrapper">
          Âge :
          <NumericInput
            id="age-actuel"
            v-model="ageActuel"
            mode="integer"
            class="book-input-small"
            :min="18"
            :max="66"
            :max-length="2"
            aria-label="Âge actuel"
          />
        </label>
        <label
          class="evolution-augmentation-field"
          :class="{ 'evolution-augmentation-field--prompt': showAugmentationPrompt }"
        >
          <span
            v-if="showAugmentationPrompt"
            id="evolution-augmentation-prompt"
            class="evolution-augmentation-callout"
            role="status"
            aria-live="polite"
          >
            {{ WIZARD_LEGACY_LABELS.evolutionAugmentationPrompt }}
          </span>
          Augmentation/an :
          <NumericInput
            id="augmentation-annuelle"
            v-model="augmentationAnnuelle"
            mode="decimal"
            class="book-input-small"
            :min="0"
            :max="100"
            :step="0.1"
            :max-length="5"
            aria-label="Augmentation annuelle moyenne en pourcentage"
            :aria-describedby="showAugmentationPrompt ? 'evolution-augmentation-prompt' : undefined"
            @focus="dismissAugmentationPrompt"
          />
          %
        </label>
      </div>
      <div class="chart-container">
        <canvas
          ref="canvasRef"
          aria-label="Projection de la rémunération par rapport à l'inflation"
          role="img"
        />
      </div>
      <div id="evolution-summary" class="evolution-summary">
        <p class="evolution-summary-text" v-html="summaryHtml" />
        <small class="data-source">{{ inflationMetaCaption }}</small>
      </div>
    </div>
  </details>
</template>
