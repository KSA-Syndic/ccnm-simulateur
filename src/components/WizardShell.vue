<script setup lang="ts">
import { defineAsyncComponent, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useWizardStore } from '../stores/wizard';
import { useUiStore } from '../stores/ui';
import { setupUmamiAnalytics, trackResultatSalaireOnce } from '../infra/analytics';
import SimulatorLayout from './SimulatorLayout.vue';
import StepClassification from '../features/wizard/StepClassification.vue';
import StepSituation from '../features/wizard/StepSituation.vue';
import StepResult from '../features/wizard/StepResult.vue';

/**
 * Étape 4 (arriérés : courbe, PDF, lettre) chargée à la demande : hors du bundle initial,
 * préchargée dès l'étape 3 et montée seulement une fois l'étape atteinte.
 */
const loadStepArretees = () => import('../features/wizard/StepArretees.vue');
const StepArretees = defineAsyncComponent(loadStepArretees);

const wizard = useWizardStore();
const ui = useUiStore();
const { currentStep, maxStepReached } = storeToRefs(wizard);
const { wizardSessionKey } = storeToRefs(ui);

onMounted(() => {
  setupUmamiAnalytics();
});

watch(
  currentStep,
  (step) => {
    if (step === 3) trackResultatSalaireOnce();
    if (step >= 3) void loadStepArretees();
  },
  { immediate: true },
);
</script>

<template>
  <SimulatorLayout>
    <!-- v-show : conserver l'état interne entre étapes ; :key remonte tout après « Recommencer » -->
    <div :key="wizardSessionKey" class="wizard-steps-root">
      <div v-show="currentStep === 1" id="step-1" class="wizard-step-mount">
        <StepClassification />
      </div>
      <div v-show="currentStep === 2" id="step-2" class="wizard-step-mount">
        <StepSituation />
      </div>
      <div v-show="currentStep === 3" id="step-3" class="wizard-step-mount">
        <StepResult />
      </div>
      <div v-show="currentStep === 4" id="step-4" class="wizard-step-mount">
        <StepArretees v-if="maxStepReached >= 4" />
      </div>
    </div>
  </SimulatorLayout>
</template>
