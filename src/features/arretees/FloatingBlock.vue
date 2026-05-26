<script setup lang="ts">
import { ref, computed } from 'vue';
import { useArreteesStore } from '../../stores/arretees';
import { formatMoney } from '../../domain/utils/format';

const arreteesStore = useArreteesStore();
const salaryInput = ref('');
const visible = ref(false);

const currentPeriod = computed(() => {
  if (arreteesStore.currentPeriodIndex < 0) return null;
  return arreteesStore.periodes[arreteesStore.currentPeriodIndex] ?? null;
});

function show(index: number) {
  arreteesStore.currentPeriodIndex = index;
  salaryInput.value = '';
  visible.value = true;
}

function submit() {
  const val = parseFloat(salaryInput.value);
  if (!isNaN(val) && val >= 0 && arreteesStore.currentPeriodIndex >= 0) {
    arreteesStore.setSalaireVerse(arreteesStore.currentPeriodIndex, val);
    const next = arreteesStore.currentPeriodIndex + 1;
    if (next < arreteesStore.periodes.length) {
      show(next);
    } else {
      visible.value = false;
    }
  }
}

function dismiss() {
  visible.value = false;
}

defineExpose({ show });
</script>

<template>
  <div v-if="visible && currentPeriod" class="floating-block" @keydown.escape="dismiss">
    <div class="floating-header">
      <span>{{ currentPeriod.label }}</span>
      <span class="floating-due">Dû : {{ formatMoney(currentPeriod.salaireDu) }}</span>
      <button class="floating-close" aria-label="Fermer" @click="dismiss">×</button>
    </div>
    <div class="floating-body">
      <label for="floating-salary-input">Salaire versé</label>
      <div class="input-with-unit">
        <input
          id="floating-salary-input"
          v-model="salaryInput"
          type="text"
          class="book-input"
          inputmode="decimal"
          placeholder="0.00"
          aria-label="Salaire versé pour ce mois"
          @keydown.enter="submit"
        />
        <span class="input-unit">€</span>
      </div>
      <button class="book-btn btn-primary floating-submit" @click="submit">Valider</button>
    </div>
  </div>
</template>

<style scoped>
.floating-block {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: var(--bg-surface, #fff);
  border: 1px solid var(--border-color, #ddd);
  border-radius: var(--radius-md, 8px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 1rem;
  min-width: 240px;
  z-index: 10;
}
.floating-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
}
.floating-due {
  color: var(--text-secondary, #666);
  font-size: 0.9em;
  font-weight: 400;
}
.floating-close {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 1.3rem;
  cursor: pointer;
  line-height: 1;
  color: var(--text-secondary, #666);
}
.floating-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.floating-submit {
  align-self: flex-end;
}
</style>
