<script setup lang="ts">
import { watch, computed } from 'vue';
import { useAgreementStore } from '../../stores/agreement';
import { useSituationStore } from '../../stores/situation';
import { CONFIG } from '../../domain/config';
import { AppTooltip } from '../../components/ui';
import { buildAccordSummaryTooltip } from '../../domain/tooltip/builders';
import { withDefaultActivePrimes } from '../../domain/agreements/primeUiDefaults';
import AccordBadge from './AccordBadge.vue';

const agreement = useAgreementStore();
const situation = useSituationStore();

const activeDoc = computed(() => agreement.loadedAgreement);

const accordTooltipHtml = computed(() => {
  const doc = activeDoc.value;
  if (!doc) return '';
  return buildAccordSummaryTooltip(CONFIG.TOOLTIP_TEXTS, doc, agreement.inputs, {
    nationalPrimeOverrides: situation.nationalPrimeOverrides,
  });
});

function ensureDefaultActivePrimes() {
  const doc = agreement.activeAgreement;
  if (!doc) return;
  const next = withDefaultActivePrimes(doc, agreement.inputs);
  if (next) agreement.inputs = next;
}

watch(() => agreement.activeAgreement, ensureDefaultActivePrimes, { immediate: true });
</script>

<template>
  <div v-if="activeDoc" class="accord-options-panel">
    <div>
      <label class="checkbox-label checkbox-highlight">
        <input v-model="agreement.accordActif" type="checkbox" class="book-checkbox" />
        <span>Appliquer l'accord d'entreprise <AccordBadge :agreement="activeDoc" /></span>
        <AppTooltip :content="accordTooltipHtml" variant="result" position="top" />
      </label>
    </div>
    <p v-if="!agreement.accordActif" class="accord-options-muted">
      Accord non appliqué au calcul (paramètres conventionnels seuls).
    </p>
  </div>
</template>

<style scoped>
.accord-options-panel {
  margin: 1rem 0;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--border-color, #e5e7eb);
  background: var(--gray-50, #f9fafb);
}
.accord-options-muted {
  margin: 0.5rem 0 0;
  font-size: 0.88rem;
  color: var(--text-secondary, #666);
}
</style>
