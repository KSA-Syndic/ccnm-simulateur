<script setup lang="ts">
import { ref } from 'vue';
import { AppModal } from './ui';
import { getAnalyticsConsent, setAnalyticsConsentOff } from '../infra/analytics';

const open = ref(false);
const consent = ref(getAnalyticsConsent());

function show() {
  open.value = true;
}

function deny() {
  setAnalyticsConsentOff();
  consent.value = false;
  open.value = false;
}

function accept() {
  consent.value = true;
  open.value = false;
}

defineExpose({ show });
</script>

<template>
  <AppModal :open="open" title="Confidentialité" @close="open = false">
    <p>
      Ce simulateur utilise un outil de mesure d'audience anonyme (Umami) pour améliorer le service.
      Aucune donnée personnelle n'est collectée.
    </p>
    <template #footer>
      <button class="book-btn btn-secondary" @click="deny">Refuser</button>
      <button class="book-btn btn-primary" @click="accept">Accepter</button>
    </template>
  </AppModal>
</template>
