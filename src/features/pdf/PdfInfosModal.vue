<script setup lang="ts">
import { ref } from 'vue';
import { AppModal } from '../../components/ui';

const open = ref(false);
const nom = ref('');
const employeur = ref('');

const emit = defineEmits<{
  (e: 'generate', data: { nom: string; employeur: string }): void;
}>();

function show() {
  open.value = true;
}

function submit() {
  emit('generate', { nom: nom.value, employeur: employeur.value });
  open.value = false;
}

defineExpose({ show });
</script>

<template>
  <AppModal :open="open" title="Informations pour le PDF" @close="open = false">
    <div class="pdf-infos-body">
      <div class="form-group">
        <label for="pdf-nom">Votre nom (optionnel)</label>
        <input id="pdf-nom" v-model="nom" type="text" class="book-input" placeholder="Prénom Nom" />
      </div>
      <div class="form-group">
        <label for="pdf-employeur">Employeur (optionnel)</label>
        <input
          id="pdf-employeur"
          v-model="employeur"
          type="text"
          class="book-input"
          placeholder="Nom de l'entreprise"
        />
      </div>
    </div>
    <template #footer>
      <button class="book-btn btn-secondary" @click="open = false">Annuler</button>
      <button class="book-btn btn-primary" @click="submit">Générer le PDF</button>
    </template>
  </AppModal>
</template>

<style scoped>
.pdf-infos-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
