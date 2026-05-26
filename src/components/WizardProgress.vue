<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useWizardNavigation } from '../composables/useWizardNavigation';
import { useWizardStore } from '../stores/wizard';

const { currentStep, steps, goToStep } = useWizardNavigation();
const wizard = useWizardStore();
const { maxStepReached } = storeToRefs(wizard);

/** Optional step 4 stays visible once unlocked (legacy: stepper-step-4-visible). */
const visibleSteps = computed(() =>
  steps.filter((s) => !('optional' in s && s.optional) || maxStepReached.value >= s.num),
);
</script>

<template>
  <nav class="wizard-progress" aria-label="Étapes du simulateur" role="list">
    <template v-for="(step, idx) in visibleSteps" :key="step.num">
      <div
        class="progress-step"
        :class="{
          completed: maxStepReached > step.num,
          active: currentStep === step.num,
          clickable: step.num <= maxStepReached,
        }"
        :data-step="step.num"
        :aria-current="currentStep === step.num ? 'step' : undefined"
        role="listitem"
        @click="goToStep(step.num)"
      >
        <span class="progress-dot">{{ step.num }}</span>
        <span class="progress-label">{{ step.label }}</span>
      </div>
      <div v-if="idx < visibleSteps.length - 1" class="progress-line" />
    </template>
  </nav>
</template>
