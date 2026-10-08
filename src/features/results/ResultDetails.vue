<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '../../stores/ui';
import { aggregateRemunerationDetails } from '../../domain/remuneration/aggregate';
import type { WizardRemunerationResolved } from '../../domain/remuneration/compute';
import RemunerationResult from './RemunerationResult.vue';

/** Éléments déjà résolus par l'étape résultat (un seul calcul partagé avec les hints). */
const props = defineProps<{ resolved: WizardRemunerationResolved }>();

const ui = useUiStore();

const computedResult = computed(() =>
  aggregateRemunerationDetails(props.resolved.details, props.resolved.baseSMH, ui.nbMois),
);
</script>

<template>
  <RemunerationResult :data="computedResult" />
</template>
