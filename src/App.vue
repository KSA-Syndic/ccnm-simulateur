<script setup lang="ts">
import ErrorBoundary from './components/ErrorBoundary.vue';
import WizardShell from './components/WizardShell.vue';
import AppToast from './components/ui/AppToast.vue';
</script>

<template>
  <ErrorBoundary>
    <div class="simulator-container">
      <WizardShell />
    </div>
  </ErrorBoundary>
  <AppToast />
</template>
