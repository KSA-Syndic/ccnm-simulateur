<script setup lang="ts">
import ErrorBoundary from './components/ErrorBoundary.vue';
import WizardShell from './components/WizardShell.vue';
import AppToast from './components/ui/AppToast.vue';
import { useIframeMode } from './composables/useIframeMode';

const { isIframe } = useIframeMode();
</script>

<template>
  <ErrorBoundary>
    <div class="simulator-container" :class="{ 'iframe-container': isIframe }">
      <WizardShell />
    </div>
  </ErrorBoundary>
  <AppToast />
</template>
