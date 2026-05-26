<script setup lang="ts">
import { type AggregatedRemuneration } from '../../domain/remuneration/aggregate';
import { formatEuro, formatEuroMensuel } from '../../domain/utils/format';
import { AppTooltip } from '../../components/ui';

defineProps<{
  data: AggregatedRemuneration;
  nbMois: number;
}>();
</script>

<template>
  <div class="remuneration-result" aria-live="polite">
    <div class="result-summary">
      <div class="result-total">
        <span class="result-label">Rémunération annuelle</span>
        <span class="result-value">{{ formatEuro(data.totalAnnual) }}</span>
      </div>
      <div class="result-monthly">
        <span class="result-label">soit {{ formatEuroMensuel(data.totalMonthly) }} / mois</span>
        <span class="result-note">(sur {{ nbMois }} mois)</span>
      </div>
    </div>

    <div class="result-details">
      <div class="detail-line base-line">
        <span class="detail-label">Salaire minimum hiérarchique (SMH)</span>
        <span class="detail-value">{{ formatEuro(data.baseSMH) }}</span>
      </div>

      <template v-for="section in data.sections" :key="section.label">
        <div class="detail-section-header">
          <span>{{ section.label }}</span>
          <span class="section-subtotal">{{ formatEuro(section.subtotal) }}</span>
        </div>
        <div
          v-for="item in section.items"
          :key="item.semanticId"
          class="detail-line"
          :class="{ 'accord-line': item.isAgreementSpecific }"
        >
          <span class="detail-label">
            {{ item.label }}
            <AppTooltip v-if="item.tooltip" :content="item.tooltip" />
          </span>
          <span class="detail-value">{{ formatEuro(item.amount) }}</span>
        </div>
      </template>
    </div>
  </div>
</template>
