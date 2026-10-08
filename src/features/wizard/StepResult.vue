<script setup lang="ts">
import { computed, watch } from 'vue';
import { useWizardStore } from '../../stores/wizard';
import { useAgreementStore } from '../../stores/agreement';
import { useSituationStore } from '../../stores/situation';
import { useUiStore } from '../../stores/ui';
import { useWizardNavigation } from '../../composables/useWizardNavigation';
import { useWizardRemunerationInput } from '../../composables/useWizardRemunerationInput';
import { LEGAL_DISCLAIMER_RESULT, WIZARD_LABELS } from '../../domain/ui/labels';
import { buildResultHintBlocks } from '../../domain/hints/engine';
import { resolveWizardRemunerationElements } from '../../domain/remuneration/compute';
import ResultDetails from '../results/ResultDetails.vue';
import HintDisplay from '../results/HintDisplay.vue';
import EvolutionChart from '../inflation/EvolutionChart.vue';
import AccordOptionsPanel from '../agreement-options/AccordOptionsPanel.vue';

const disclaimerResult = LEGAL_DISCLAIMER_RESULT;

const wizard = useWizardStore();
const agreement = useAgreementStore();
const situation = useSituationStore();
const ui = useUiStore();
const { prevStep, goToStep } = useWizardNavigation();
const wizardInput = useWizardRemunerationInput();

function onRecommencer() {
  if (!window.confirm(WIZARD_LABELS.restartConfirmMessage)) {
    return;
  }
  ui.resetAll();
  goToStep(1);
}

/** 12 ou 13 mois imposés par `repartition13Mois.actif` sur l'accord appliqué. */
const nbMoisImpose = computed(() => agreement.nbMoisImpose);

watch(
  nbMoisImpose,
  (v) => {
    if (v != null) ui.nbMois = v;
  },
  { immediate: true },
);

watch(
  () => ui.nbMois,
  (v) => {
    const imp = nbMoisImpose.value;
    if (imp != null && v !== imp) ui.nbMois = imp;
  },
);

/** Calcul unique de l'étape : détail affiché et hints. */
const resolved = computed(() => resolveWizardRemunerationElements(wizardInput.value));

const hintBlocks = computed(() => {
  const r = resolved.value;
  const base = buildResultHintBlocks({
    scenario: r.scenario,
    groupe: r.active.groupe,
    classe: r.active.classe,
    anciennete: situation.anciennete,
    experiencePro: situation.experiencePro,
    accordActif: agreement.accordActif,
    agreement: r.accDoc,
    details: r.details,
  });
  return [...base];
});
</script>

<template>
  <section class="wizard-step" aria-label="Étape 3 — Résultat">
    <div class="step-content">
      <h2>{{ WIZARD_LABELS.resultPageTitle }}</h2>
      <p class="step-subtitle">
        {{ WIZARD_LABELS.resultPageSubtitle }}
      </p>

      <AccordOptionsPanel />

      <ResultDetails :resolved="resolved" />

      <div id="hints-container" class="hints-container">
        <HintDisplay :blocks="hintBlocks" />
      </div>

      <p class="result-disclaimer" role="note">
        {{ disclaimerResult }}
      </p>

      <EvolutionChart />

      <div id="arretees-check-card" class="arretees-check-card">
        <p class="arretees-check-text">
          <strong id="result-arretees-prompt-title">{{
            WIZARD_LABELS.resultArreteesPromptTitle
          }}</strong>
        </p>
        <p id="result-arretees-prompt-body" class="arretees-check-text">
          {{ WIZARD_LABELS.resultArreteesPromptBody }}
        </p>
        <button
          id="btn-check-arretees"
          type="button"
          class="book-btn btn-primary"
          @click="goToStep(4, { allowForward: true })"
        >
          {{ WIZARD_LABELS.calculerArretees }}
        </button>
      </div>

      <div class="step-actions">
        <button type="button" class="book-btn btn-secondary" @click="prevStep">
          <span class="btn-icon btn-icon-left">‹</span> Modifier
        </button>
        <button type="button" class="book-btn btn-primary" @click="onRecommencer">
          <span class="btn-icon">↻</span> Recommencer
        </button>
      </div>
    </div>
  </section>
</template>
