<script setup lang="ts">
import WizardProgress from './WizardProgress.vue';
</script>

<template>
  <header class="simulator-header">
    <h1>Simulateur Métallurgie</h1>
    <p class="subtitle">Classification et Rémunération</p>
  </header>

  <WizardProgress />

  <main aria-live="polite">
    <slot />
  </main>

  <footer class="simulator-footer">
    <div class="footer-line">
      <span class="footer-item">Simulateur de classification et rémunération — Métallurgie</span>
    </div>
  </footer>
</template>
