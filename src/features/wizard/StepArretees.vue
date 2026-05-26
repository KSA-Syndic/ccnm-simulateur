<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import SimulatorLayout from '../../components/SimulatorLayout.vue';
import { useWizardNavigation } from '../../composables/useWizardNavigation';
import { usePdfGeneration } from '../../composables/usePdfGeneration';
import { useArreteesStore } from '../../stores/arretees';
import SalaryCurveView from '../arretees/SalaryCurveView.vue';
import FloatingBlock from '../arretees/FloatingBlock.vue';
import SalaryModal from '../arretees/SalaryModal.vue';
import PdfInfosModal from '../pdf/PdfInfosModal.vue';
import PostPdfFlow from '../pdf/PostPdfFlow.vue';

const { prevStep } = useWizardNavigation();
const arretees = useArreteesStore();
const { generating, generatePdf } = usePdfGeneration();

const dateEmbauche = ref(arretees.dateEmbauche);
const showCurve = computed(() => !!dateEmbauche.value);

const floatingBlockRef = ref<InstanceType<typeof FloatingBlock> | null>(null);
const salaryModalRef = ref<InstanceType<typeof SalaryModal> | null>(null);
const pdfInfosRef = ref<InstanceType<typeof PdfInfosModal> | null>(null);
const postPdfFlowRef = ref<InstanceType<typeof PostPdfFlow> | null>(null);

const hasAnySalaireVerse = computed(() =>
  arretees.periodes.some((p) => p.salaireVerse !== undefined),
);

watch(dateEmbauche, (v) => {
  arretees.dateEmbauche = v;
});

function onPointClick(index: number) {
  floatingBlockRef.value?.show(index);
}

function openBulkModal() {
  salaryModalRef.value?.show();
}

function startPdfFlow() {
  pdfInfosRef.value?.show();
}

async function onPdfGenerate(data: { nom: string; employeur: string }) {
  await generatePdf(data);
  postPdfFlowRef.value?.showSyndicatPrompt();
}
</script>

<template>
  <SimulatorLayout>
    <section class="wizard-step" aria-label="Étape 4 — Arriérés">
      <div class="step-content">
        <h2>Arriérés de salaire</h2>
        <p class="step-subtitle">Comparez vos bulletins avec le minimum conventionnel</p>

        <div class="arretees-base-info">
          <h3>Informations de base</h3>
          <div class="form-group">
            <label for="date-embauche-arretees">Date d'embauche</label>
            <input
              id="date-embauche-arretees"
              v-model="dateEmbauche"
              type="date"
              class="book-input"
            />
          </div>
        </div>

        <div v-if="showCurve" class="salary-curve-section">
          <h3>Saisie de vos salaires</h3>
          <p class="curve-help">
            Cliquez sur chaque mois pour saisir votre salaire brut total (fiche de paie).
          </p>

          <div class="curve-chart-wrapper">
            <SalaryCurveView @point-click="onPointClick" />
            <FloatingBlock ref="floatingBlockRef" />
          </div>

          <div class="bulk-action">
            <button class="book-btn btn-secondary" @click="openBulkModal">
              Saisie groupée des salaires
            </button>
          </div>
        </div>

        <div v-if="hasAnySalaireVerse" class="pdf-actions">
          <button class="book-btn btn-primary" :disabled="generating" @click="startPdfFlow">
            {{ generating ? 'Génération…' : 'Générer le PDF de rappel' }}
          </button>
        </div>

        <div class="step-actions">
          <button class="book-btn btn-secondary" @click="prevStep">
            <span class="btn-icon btn-icon-left">‹</span> Retour
          </button>
        </div>
      </div>
    </section>

    <SalaryModal ref="salaryModalRef" />
    <PdfInfosModal ref="pdfInfosRef" @generate="onPdfGenerate" />
    <PostPdfFlow ref="postPdfFlowRef" />
  </SimulatorLayout>
</template>

<style scoped>
.salary-curve-section {
  margin-top: 1.5rem;
}
.curve-chart-wrapper {
  position: relative;
  margin-top: 1rem;
}
.curve-help {
  color: var(--text-secondary, #666);
  font-size: 0.9em;
}
.bulk-action {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}
.pdf-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
}
</style>
