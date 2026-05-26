<script setup lang="ts">
import { ref } from 'vue';
import { AppModal } from '../../components/ui';

const step = ref<'syndicat' | 'celebration' | null>(null);

function showSyndicatPrompt() {
  step.value = 'syndicat';
}

function showCelebration() {
  step.value = 'celebration';
}

function close() {
  step.value = null;
}

defineExpose({ showSyndicatPrompt, showCelebration });
</script>

<template>
  <AppModal :open="step === 'syndicat'" title="Envoyer au syndicat ?" @close="close">
    <p>Souhaitez-vous transmettre ce document à votre représentant syndical ?</p>
    <template #footer>
      <button class="book-btn btn-secondary" @click="showCelebration">Non merci</button>
      <button class="book-btn btn-primary" @click="showCelebration">Oui, envoyer</button>
    </template>
  </AppModal>

  <AppModal :open="step === 'celebration'" title="Document généré !" @close="close">
    <div class="celebration-content">
      <div class="celebration-icon" aria-hidden="true">&#127881;</div>
      <p>Votre document de rappel de salaire a été généré avec succès.</p>
      <p class="celebration-note">Conservez-le précieusement pour vos démarches.</p>
    </div>
    <template #footer>
      <button class="book-btn btn-primary" @click="close">Terminer</button>
    </template>
  </AppModal>
</template>

<style scoped>
.celebration-content {
  text-align: center;
  padding: 1rem 0;
}
.celebration-icon {
  font-size: 3rem;
  margin-bottom: 0.75rem;
}
.celebration-note {
  color: var(--text-secondary, #666);
  font-size: 0.9em;
  margin-top: 0.5rem;
}
</style>
