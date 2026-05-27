<script setup lang="ts">
import { computed, watch } from 'vue';
import { useAgreementStore } from '../../stores/agreement';
import { useSituationStore } from '../../stores/situation';
import { getAgreement } from '../../domain/agreements/registry';
import type { PrimeDef } from '../../domain/agreements/interface';
import { NumericInput, AppTooltip } from '../../components/ui';
import AccordBadge from './AccordBadge.vue';
import { CONFIG } from '../../domain/config';
import { buildPrimeConditionTooltip } from '../../domain/tooltip/builders';
import {
  resolvePrimeDefaultHours,
  resolvePrimeOfficialValue,
  resolvePrimeSemanticIdForUi,
  seedAgreementPrimeUiDefaults,
  shouldShowPrimeHoursField,
  shouldShowPrimeOfficialValueField,
} from '../../domain/agreements/primeUiDefaults';
import { roundHourlyRate } from '../../domain/utils/rounding';

const agreementStore = useAgreementStore();
const situationStore = useSituationStore();

const conventionLabel = computed(() => CONFIG.TOOLTIP_TEXTS.origins.ccnm);

const doc = computed(() =>
  agreementStore.accordActif && agreementStore.activeAccordId
    ? getAgreement(agreementStore.activeAccordId)
    : null,
);

const hourlyPrimes = computed(() => {
  const primes = doc.value?.primes;
  if (!primes?.length) return [];
  return primes.filter(
    (p) =>
      (p.valueType === 'horaire' || p.valueType === 'majorationHoraire') &&
      p.stateKeyHeures &&
      p.stateKeyActif,
  );
});

function hoursKey(p: PrimeDef): string {
  return p.stateKeyHeures ?? '';
}

function hoursModel(p: PrimeDef): number {
  const k = hoursKey(p);
  const v = agreementStore.inputs[k];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return resolvePrimeDefaultHours(p);
}

function setHours(p: PrimeDef, v: number) {
  const k = hoursKey(p);
  if (!k) return;
  agreementStore.inputs = { ...agreementStore.inputs, [k]: v };
}

function semanticId(p: PrimeDef): string {
  return resolvePrimeSemanticIdForUi(p);
}

function officialRateModel(p: PrimeDef): number {
  const sid = semanticId(p);
  const cur = situationStore.nationalPrimeOverrides[sid];
  if (typeof cur === 'number' && Number.isFinite(cur)) return roundHourlyRate(cur);
  return roundHourlyRate(resolvePrimeOfficialValue(p) ?? 0);
}

function setOfficialRate(p: PrimeDef, v: number) {
  const sid = semanticId(p);
  if (!sid) return;
  situationStore.nationalPrimeOverrides = {
    ...situationStore.nationalPrimeOverrides,
    [sid]: roundHourlyRate(v),
  };
}

function applySeedForPrime(p: PrimeDef) {
  const next = seedAgreementPrimeUiDefaults(p, {
    agreementInputs: agreementStore.inputs,
    nationalPrimeOverrides: situationStore.nationalPrimeOverrides,
  });
  agreementStore.inputs = next.agreementInputs;
  situationStore.nationalPrimeOverrides = next.nationalPrimeOverrides;
}

function seedAllVisiblePrimes() {
  if (!doc.value || !agreementStore.accordActif) return;
  for (const p of hourlyPrimes.value) {
    applySeedForPrime(p);
  }
}

watch(
  () =>
    [agreementStore.accordActif, agreementStore.activeAccordId, hourlyPrimes.value.length] as const,
  () => {
    seedAllVisiblePrimes();
  },
  { immediate: true },
);

function setActif(p: PrimeDef, on: boolean) {
  const k = p.stateKeyActif;
  if (!k) return;
  agreementStore.inputs = { ...agreementStore.inputs, [k]: on };
  if (on) applySeedForPrime(p);
}

function isActif(p: PrimeDef): boolean {
  const k = p.stateKeyActif;
  return k ? !!agreementStore.inputs[k] : false;
}

function primeTooltipHtml(p: PrimeDef): string {
  const activeDoc = doc.value;
  if (!activeDoc) return '';
  return buildPrimeConditionTooltip(
    CONFIG.TOOLTIP_TEXTS,
    conventionLabel.value,
    {
      id: p.id,
      label: p.label,
      semanticId: p.semanticId,
      tooltip: p.tooltip,
      valueType: p.valueType,
      valeurAccord: p.valeurAccord ?? null,
      unit: p.unit,
      conditionTexte: p.conditionTexte,
      sourceArticle: p.sourceArticle,
    },
    { isAccordPrime: true, agreement: activeDoc },
  );
}

function officialValueAriaLabel(p: PrimeDef): string {
  return `Valeur officielle — ${p.label}`;
}
</script>

<template>
  <template v-if="hourlyPrimes.length && doc">
    <div v-for="p in hourlyPrimes" :key="p.id" class="form-group">
      <label class="checkbox-label">
        <input
          type="checkbox"
          class="book-checkbox"
          :checked="isActif(p)"
          @change="setActif(p, ($event.target as HTMLInputElement).checked)"
        />
        <span>{{ p.label }} <AccordBadge :agreement="doc" /></span>
        <AppTooltip :content="primeTooltipHtml(p)" variant="result" position="top" />
      </label>
      <div v-if="isActif(p)" class="sub-field sub-field-inline sub-field-stack">
        <div v-if="shouldShowPrimeHoursField(p)" class="input-with-unit">
          <NumericInput
            :model-value="hoursModel(p)"
            mode="decimal"
            :min="0"
            :aria-label="`Heures — ${p.label}`"
            @update:model-value="(v) => setHours(p, v)"
          />
          <span class="input-unit">heures/mois</span>
        </div>
        <div v-if="shouldShowPrimeOfficialValueField(p)" class="input-with-unit">
          <NumericInput
            :model-value="officialRateModel(p)"
            mode="decimal"
            :min="0"
            :aria-label="officialValueAriaLabel(p)"
            @update:model-value="(v) => setOfficialRate(p, v)"
          />
          <span class="input-unit">{{ p.unit }}</span>
        </div>
      </div>
    </div>
  </template>
</template>
