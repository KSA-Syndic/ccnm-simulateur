<script setup lang="ts">
import { ref } from 'vue';
import { AppModal } from './ui';
import {
  getAnalyticsConsent,
  setAnalyticsConsentOff,
  setAnalyticsConsentOn,
} from '../infra/analytics';
import { SIMULATOR_SHELL } from '../domain/ui/labels';

const open = ref(false);
const consent = ref(getAnalyticsConsent());
const feedback = ref<string | null>(null);

function show() {
  feedback.value = null;
  consent.value = getAnalyticsConsent();
  open.value = true;
}

function deny() {
  setAnalyticsConsentOff();
  consent.value = false;
  feedback.value = SIMULATOR_SHELL.privacyModalSuccess;
}

function accept() {
  setAnalyticsConsentOn();
  consent.value = true;
  feedback.value = null;
  open.value = false;
}

function dismissAfterDeny() {
  open.value = false;
  feedback.value = null;
}

function onModalClose() {
  open.value = false;
  feedback.value = null;
}

defineExpose({ show });
</script>

<template>
  <AppModal :open="open" :title="SIMULATOR_SHELL.privacyModalTitle" @close="onModalClose">
    <p>{{ SIMULATOR_SHELL.privacyModalDescription }}</p>
    <p>{{ SIMULATOR_SHELL.privacyModalAnalyticsNote }}</p>
    <p v-if="feedback" class="privacy-feedback" role="status">
      {{ feedback }}
    </p>
    <p>
      <a
        class="privacy-external-link"
        :href="SIMULATOR_SHELL.privacyModalOptoutLinkUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ SIMULATOR_SHELL.privacyModalOptoutLinkLabel }}
      </a>
    </p>
    <template #footer>
      <template v-if="!feedback">
        <button type="button" class="book-btn btn-secondary" @click="deny">Refuser</button>
        <button type="button" class="book-btn btn-primary" @click="accept">Accepter</button>
      </template>
      <button v-else type="button" class="book-btn btn-primary" @click="dismissAfterDeny">
        Fermer
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.privacy-feedback {
  font-weight: 600;
  color: var(--color-success-text, #166534);
}
.privacy-external-link {
  color: var(--color-primary, #c2410c);
}
</style>
