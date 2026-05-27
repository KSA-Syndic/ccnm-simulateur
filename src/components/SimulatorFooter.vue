<script setup lang="ts">
import { ref } from 'vue';
import { CONVENTION_METALLURGIE_URL, SIMULATOR_SHELL } from '../domain/ui/labels';
import PrivacyModal from './PrivacyModal.vue';

const privacyRef = ref<InstanceType<typeof PrivacyModal> | null>(null);

function openPrivacy() {
  privacyRef.value?.show();
}
</script>

<template>
  <footer class="simulator-footer">
    <div class="footer-line">
      <span class="footer-item">{{ SIMULATOR_SHELL.footerMainLine }}</span>
    </div>
    <div class="footer-line footer-line--secondary">
      <span class="footer-item footer-disclaimer">{{ SIMULATOR_SHELL.footerDisclaimer }}</span>
    </div>
    <div class="footer-line footer-links">
      <a
        class="footer-item footer-privacy-link"
        :href="CONVENTION_METALLURGIE_URL"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ SIMULATOR_SHELL.footerConventionTextsLinkLabel }}
      </a>
      <span class="footer-sep" aria-hidden="true" />
      <a
        class="footer-item footer-privacy-link"
        :href="SIMULATOR_SHELL.cfdtKuhnUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ SIMULATOR_SHELL.cfdtKuhnLinkLabel }}
      </a>
      <span class="footer-sep" aria-hidden="true" />
      <button
        type="button"
        class="footer-item footer-privacy-link footer-privacy-btn"
        @click="openPrivacy"
      >
        {{ SIMULATOR_SHELL.privacyLinkLabel }}
      </button>
    </div>
    <PrivacyModal ref="privacyRef" />
  </footer>
</template>

<style scoped>
.footer-line--secondary {
  margin-top: 0.35rem;
}
.footer-disclaimer {
  font-size: 0.9em;
  color: var(--text-secondary, #666);
}
.footer-links {
  margin-top: 0.75rem;
}
.footer-privacy-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
}
</style>
