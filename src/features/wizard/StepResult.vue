<script setup lang="ts">
import { computed, watch } from 'vue';
import { useWizardStore } from '../../stores/wizard';
import { useAgreementStore } from '../../stores/agreement';
import { useSituationStore } from '../../stores/situation';
import { useUiStore } from '../../stores/ui';
import { useWizardNavigation } from '../../composables/useWizardNavigation';
import { useWizardRemunerationInput } from '../../composables/useWizardRemunerationInput';
import { LEGAL_DISCLAIMER_RESULT, WIZARD_LEGACY_LABELS } from '../../domain/ui/labels';
import { buildResultHintBlocks } from '../../domain/hints/engine';
import { getAgreement } from '../../domain/agreements/registry';
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
  if (!window.confirm(WIZARD_LEGACY_LABELS.restartConfirmMessage)) {
    return;
  }
  ui.resetAll();
  goToStep(1);
}

/** 12 ou 13 mois imposés par `repartition13Mois.actif` sur l'accord chargé (aligné legacy `applyAgreementMonths`). */
const nbMoisImpose = computed((): 12 | 13 | null => {
  if (!agreement.accordActif || !agreement.activeAccordId) return null;
  const doc = getAgreement(agreement.activeAccordId);
  const r = doc?.repartition13Mois;
  if (r && typeof r.actif === 'boolean') return r.actif ? 13 : 12;
  return null;
});

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

const resolvedForHints = computed(() => resolveWizardRemunerationElements(wizardInput.value));

const hintBlocks = computed(() => {
  const r = resolvedForHints.value;
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
  return base;
});
</script>

<template>
  <section class="wizard-step" aria-label="Étape 3 — Résultat">
    <div class="step-content">
      <h2>{{ WIZARD_LEGACY_LABELS.resultPageTitle }}</h2>
      <p class="step-subtitle">
        {{ WIZARD_LEGACY_LABELS.resultPageSubtitle }}
      </p>

      <AccordOptionsPanel />

      <ResultDetails />

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
            WIZARD_LEGACY_LABELS.resultArreteesPromptTitle
          }}</strong>
        </p>
        <p id="result-arretees-prompt-body" class="arretees-check-text">
          {{ WIZARD_LEGACY_LABELS.resultArreteesPromptBody }}
        </p>
        <button
          id="btn-check-arretees"
          type="button"
          class="book-btn btn-primary"
          @click="goToStep(4, { allowForward: true })"
        >
          {{ WIZARD_LEGACY_LABELS.calculerArretees }}
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
