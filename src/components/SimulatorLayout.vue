<script setup lang="ts">
import WizardProgress from './WizardProgress.vue';
import SimulatorHeader from './SimulatorHeader.vue';
import SimulatorFooter from './SimulatorFooter.vue';
</script>

<template>
  <SimulatorHeader />

  <WizardProgress />

  <main aria-live="polite">
    <slot />
  </main>

  <SimulatorFooter />
</template>
