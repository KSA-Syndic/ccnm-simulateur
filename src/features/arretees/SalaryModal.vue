<script setup lang="ts">
import { ref } from 'vue';
import { AppModal, NumericInput } from '../../components/ui';
import { useArreteesStore } from '../../stores/arretees';
import { formatMensuelDuComposantes } from '../../domain/arretees/formatDuDetail';
import { formatMoney } from '../../domain/utils/format';
import type { ArreteePeriode } from '../../stores/arretees';

function dueComposantes(period: ArreteePeriode): string | null {
  return formatMensuelDuComposantes(period);
}

const arreteesStore = useArreteesStore();
const open = ref(false);

const editableValues = ref<Record<number, number>>({});

function show() {
  editableValues.value = {};
  arreteesStore.periodes.forEach((p, i) => {
    const v = p.salaireVerse;
    editableValues.value[i] = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  });
  open.value = true;
}

function save() {
  for (const [idx, val] of Object.entries(editableValues.value)) {
    if (Number.isFinite(val) && val >= 0) {
      arreteesStore.setSalaireVerse(Number(idx), val);
    }
  }
  open.value = false;
}

defineExpose({ show });
</script>

<template>
  <AppModal :open="open" title="Saisir les salaires versés" @close="open = false">
    <div class="salary-modal-body">
      <div v-for="(period, i) in arreteesStore.periodes" :key="i" class="salary-modal-row">
        <span class="salary-modal-label">{{ period.label }}</span>
        <div class="salary-modal-field input-with-unit">
          <NumericInput
            :model-value="editableValues[i] ?? 0"
            mode="decimal"
            :min="0"
            @update:model-value="(v) => (editableValues[i] = v)"
          />
          <span class="input-unit">€</span>
        </div>
        <p class="salary-modal-due">
          Dû&nbsp;: {{ formatMoney(period.salaireDu) }}
          <template v-if="dueComposantes(period)">
            <span class="salary-modal-due-detail"> — {{ dueComposantes(period) }}</span>
          </template>
        </p>
      </div>
    </div>
    <template #footer>
      <button class="book-btn btn-secondary" @click="open = false">Annuler</button>
      <button class="book-btn btn-primary" @click="save">Enregistrer</button>
    </template>
  </AppModal>
</template>

<style scoped>
.salary-modal-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 60vh;
  overflow-y: auto;
  margin: -0.25rem 0;
}
.salary-modal-row {
  display: grid;
  grid-template-columns: minmax(4.75rem, auto) minmax(0, 1fr);
  align-items: center;
  gap: 0.15rem 0.5rem;
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--gray-200, #ebebeb);
}
.salary-modal-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.salary-modal-label {
  font-weight: 500;
  font-size: 0.9rem;
  white-space: nowrap;
}
.salary-modal-field {
  justify-self: end;
  min-width: 0;
}
.salary-modal-due {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--text-secondary, #666);
  font-size: 0.78rem;
  line-height: 1.3;
}
.salary-modal-due-detail {
  font-weight: 400;
}
</style>
