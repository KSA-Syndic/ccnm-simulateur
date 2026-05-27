<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '../../stores/ui';
import { useWizardRemunerationInput } from '../../composables/useWizardRemunerationInput';
import { aggregateRemunerationDetails } from '../../domain/remuneration/aggregate';
import { resolveWizardRemunerationElements } from '../../domain/remuneration/compute';
import RemunerationResult from './RemunerationResult.vue';

const ui = useUiStore();
const wizardInput = useWizardRemunerationInput();

const computedResult = computed(() => {
  const resolved = resolveWizardRemunerationElements(wizardInput.value);
  return aggregateRemunerationDetails(resolved.details, resolved.baseSMH, ui.nbMois);
});
</script>

<template>
  <RemunerationResult :data="computedResult" />
</template>
