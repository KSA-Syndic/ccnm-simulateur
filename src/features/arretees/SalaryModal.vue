<script setup lang="ts">
import { ref } from 'vue';
import { AppModal } from '../../components/ui';
import { useArreteesStore } from '../../stores/arretees';
import { formatMoney } from '../../domain/utils/format';

const arreteesStore = useArreteesStore();
const open = ref(false);

const editableValues = ref<Record<number, string>>({});

function show() {
  editableValues.value = {};
  arreteesStore.periodes.forEach((p, i) => {
    editableValues.value[i] = String(p.salaireVerse ?? '');
  });
  open.value = true;
}

function save() {
  for (const [idx, val] of Object.entries(editableValues.value)) {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      arreteesStore.setSalaireVerse(Number(idx), num);
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
        <span class="salary-modal-due">Dû : {{ formatMoney(period.salaireDu) }}</span>
        <div class="input-with-unit">
          <input v-model="editableValues[i]" type="text" class="book-input" inputmode="decimal" />
          <span class="input-unit">€</span>
        </div>
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
  gap: 0.75rem;
  max-height: 60vh;
  overflow-y: auto;
}
.salary-modal-row {
  display: grid;
  grid-template-columns: 1fr auto 160px;
  align-items: center;
  gap: 0.75rem;
}
.salary-modal-label {
  font-weight: 500;
}
.salary-modal-due {
  color: var(--text-secondary, #666);
  font-size: 0.9em;
  white-space: nowrap;
}
</style>
