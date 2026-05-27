<script setup lang="ts">
import { computed } from 'vue';
import { useSituationStore } from '../../stores/situation';
import { useWizardStore } from '../../stores/wizard';
import { isCadre } from '../../domain/classification/engine';
import {
  getNationalPrimeOverrideRows,
  isModaliteVisiblePourProfil,
  type NationalPrimeOverrideRow,
} from '../../domain/convention/catalog';
import {
  activateNationalModality,
  clearNationalModality,
  hasNationalPrimeOverride,
  isNationalModalityActive,
  modalityQuantity,
  nationalPrimeOverrideValue,
  setModalityQuantity,
  setNationalPrimeOverride,
} from '../../domain/convention/nationalModalityState';
import { resolveWizardTauxHoraireBase } from '../../domain/remuneration/compute';
import { roundHourlyRate, roundToCents } from '../../domain/utils/rounding';
import { useWizardRemunerationInput } from '../../composables/useWizardRemunerationInput';
import { NumericInput, AppTooltip } from '../../components/ui';
import { CONFIG } from '../../domain/config';
import { buildLegalTooltipContent } from '../../domain/tooltip/builders';

const situation = useSituationStore();
const wizard = useWizardStore();
const wizardInput = useWizardRemunerationInput();

const rows = computed(() => {
  const profil = { isCadre: isCadre(wizard.classe), forfait: situation.forfait };
  return getNationalPrimeOverrideRows().filter((row) =>
    isModaliteVisiblePourProfil(row.uiVisibleQuand, profil),
  );
});

const defaultOptionalRate = computed(() => resolveWizardTauxHoraireBase(wizardInput.value));

function isActive(row: NationalPrimeOverrideRow): boolean {
  return isNationalModalityActive(situation.modalityState, row.stateKeyActif);
}

function setActif(row: NationalPrimeOverrideRow, on: boolean) {
  if (!on) {
    const cleared = clearNationalModality(
      situation.modalityState,
      situation.nationalPrimeOverrides,
      row,
    );
    situation.modalityState = cleared.modalityState;
    situation.nationalPrimeOverrides = cleared.nationalPrimeOverrides;
    return;
  }
  const activated = activateNationalModality(
    situation.modalityState,
    situation.nationalPrimeOverrides,
    row,
  );
  situation.modalityState = activated.modalityState;
  situation.nationalPrimeOverrides = activated.nationalPrimeOverrides;
}

function quantityValue(row: NationalPrimeOverrideRow): number {
  if (!row.quantityKey) return 0;
  return modalityQuantity(situation.modalityState, row.quantityKey, row.defaultQuantity ?? 0);
}

function setQuantity(row: NationalPrimeOverrideRow, v: number) {
  if (!row.quantityKey) return;
  situation.modalityState = setModalityQuantity(situation.modalityState, row.quantityKey, v);
}

function roundRateForRow(row: NationalPrimeOverrideRow, v: number): number {
  if (row.valueField === 'optionalRate') return roundHourlyRate(v);
  if (row.valueField === 'unitAmount') return roundToCents(v);
  return v;
}

function rateValue(row: NationalPrimeOverrideRow): number {
  if (
    row.valueField === 'optionalRate' &&
    !hasNationalPrimeOverride(situation.nationalPrimeOverrides, row.semanticId)
  ) {
    return defaultOptionalRate.value;
  }
  const raw = nationalPrimeOverrideValue(
    situation.nationalPrimeOverrides,
    row.semanticId,
    row.defaultValue,
  );
  return roundRateForRow(row, raw);
}

function setRate(row: NationalPrimeOverrideRow, v: number) {
  situation.nationalPrimeOverrides = setNationalPrimeOverride(
    situation.nationalPrimeOverrides,
    row,
    roundRateForRow(row, v),
  );
}

function valueStep(row: NationalPrimeOverrideRow): number | string {
  return row.valueStep ?? (row.valueField === 'coefficient' ? 0.01 : 0.01);
}

function quantityStep(row: NationalPrimeOverrideRow): number | string {
  return row.quantityMode === 'integer' ? 1 : 0.5;
}

function quantityAriaLabel(row: NationalPrimeOverrideRow): string {
  return row.quantityLabel ?? `Quantité — ${row.label}`;
}

function valueAriaLabel(row: NationalPrimeOverrideRow): string {
  if (row.valueLabel) return row.valueLabel;
  if (row.valueField === 'coefficient') return `Coefficient — ${row.label}`;
  if (row.valueField === 'unitAmount') return `Montant — ${row.label}`;
  return `Taux horaire (optionnel) — ${row.label}`;
}

const hasAnyRow = computed(() => rows.value.length > 0);

function rowTooltipHtml(row: NationalPrimeOverrideRow): string {
  return buildLegalTooltipContent(CONFIG.TOOLTIP_TEXTS, row.title, row.aide, {
    sourceArticle: row.sourceArticle,
  });
}
</script>

<template>
  <details v-if="hasAnyRow" id="conditions-autres-modalites" class="conditions-autres-modalites">
    <summary>Autres</summary>
    <div class="national-primes-content">
      <div v-for="row in rows" :key="row.semanticId" class="form-group">
        <label class="checkbox-label">
          <input
            type="checkbox"
            class="book-checkbox"
            :checked="isActive(row)"
            @change="setActif(row, ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ row.label }}</span>
          <AppTooltip :content="rowTooltipHtml(row)" variant="result" position="top" />
        </label>
        <div v-if="isActive(row)" class="sub-field sub-field-inline sub-field-stack">
          <div v-if="row.quantityKey" class="input-with-unit">
            <NumericInput
              :model-value="quantityValue(row)"
              :mode="row.quantityMode ?? 'decimal'"
              :min="0"
              :step="quantityStep(row)"
              :aria-label="quantityAriaLabel(row)"
              @update:model-value="(v) => setQuantity(row, v)"
            />
            <span class="input-unit">{{ row.quantityUnitLabel }}</span>
          </div>
          <div v-if="!row.hideValueField" class="input-with-unit">
            <NumericInput
              :model-value="rateValue(row)"
              mode="decimal"
              :min="0"
              :step="valueStep(row)"
              :aria-label="valueAriaLabel(row)"
              @update:model-value="(v) => setRate(row, v)"
            />
            <span class="input-unit">{{ row.unit }}</span>
          </div>
        </div>
      </div>
    </div>
  </details>
</template>

<style scoped>
.national-primes-content {
  padding: 15px;
}
</style>
