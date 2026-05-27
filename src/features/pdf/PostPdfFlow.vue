<script setup lang="ts">
import { computed, ref } from 'vue';
import { AppModal } from '../../components/ui';
import CelebrationOverlay from './CelebrationOverlay.vue';
import { useAgreementStore } from '../../stores/agreement';
import { getAgreement } from '../../domain/agreements/registry';
import { POST_PDF_SYNDICAT } from '../../domain/ui/labels';
import {
  buildGmailComposeUrl,
  buildMailtoHref,
  buildOutlookComposeUrl,
} from '../../domain/pdf/syndicatMail';

const step = ref<'syndicat' | 'celebration' | null>(null);

const agreementStore = useAgreementStore();

const accDoc = computed(() =>
  agreementStore.accordActif && agreementStore.activeAccordId
    ? getAgreement(agreementStore.activeAccordId)
    : null,
);

const syndicatEmail = computed(() => (accDoc.value?.syndicatEmail ?? '').trim());

const syndicatDisplayName = computed(
  () => accDoc.value?.syndicatNom?.trim() || POST_PDF_SYNDICAT.syndicatDefaultName,
);

const hasSyndicatMail = computed(() => syndicatEmail.value.length > 0);

function showSyndicatPrompt() {
  if (hasSyndicatMail.value) {
    step.value = 'syndicat';
  } else {
    step.value = 'celebration';
  }
}

function showCelebration() {
  step.value = 'celebration';
}

function close() {
  step.value = null;
}

function goCelebration() {
  step.value = 'celebration';
}

function openMailto() {
  const href = buildMailtoHref(
    syndicatEmail.value,
    POST_PDF_SYNDICAT.mailSubject,
    POST_PDF_SYNDICAT.mailBody,
  );
  window.location.href = href;
  goCelebration();
}

function openGmail(e: Event) {
  e.preventDefault();
  const url = buildGmailComposeUrl(
    syndicatEmail.value,
    POST_PDF_SYNDICAT.mailSubject,
    POST_PDF_SYNDICAT.mailBody,
  );
  window.open(url, '_blank', 'noopener,noreferrer');
  goCelebration();
}

function openOutlook(e: Event) {
  e.preventDefault();
  const url = buildOutlookComposeUrl(
    syndicatEmail.value,
    POST_PDF_SYNDICAT.mailSubject,
    POST_PDF_SYNDICAT.mailBody,
  );
  window.open(url, '_blank', 'noopener,noreferrer');
  goCelebration();
}

function reopenSyndicat() {
  if (hasSyndicatMail.value) {
    step.value = 'syndicat';
  }
}

defineExpose({ showSyndicatPrompt, showCelebration });
</script>

<template>
  <AppModal
    :open="step === 'syndicat'"
    :title="POST_PDF_SYNDICAT.syndicatModalTitle"
    @close="goCelebration"
  >
    <div class="post-pdf-syndicat-modal">
      <p>
        <strong>{{ syndicatDisplayName }}</strong
        >{{ POST_PDF_SYNDICAT.syndicatLeadAfterName }}
      </p>
      <p class="post-pdf-syndicat-notice">
        {{ POST_PDF_SYNDICAT.syndicatNoticePj }}
      </p>
      <p class="post-pdf-syndicat-email" aria-label="Courriel du syndicat">
        <a :href="`mailto:${syndicatEmail}`">{{ syndicatEmail }}</a>
      </p>
      <p class="post-pdf-syndicat-webmail">
        <a
          href="#"
          :aria-label="`Composer dans ${POST_PDF_SYNDICAT.gmailLinkLabel}`"
          @click="openGmail"
          >{{ POST_PDF_SYNDICAT.gmailLinkLabel }}</a
        >
        <span class="post-pdf-syndicat-webmail-sep" aria-hidden="true">·</span>
        <a
          href="#"
          :aria-label="`Composer dans ${POST_PDF_SYNDICAT.outlookLinkLabel}`"
          @click="openOutlook"
          >{{ POST_PDF_SYNDICAT.outlookLinkLabel }}</a
        >
      </p>
    </div>
    <template #footer>
      <button type="button" class="book-btn btn-secondary" @click="goCelebration">
        {{ POST_PDF_SYNDICAT.buttonDecline }}
      </button>
      <button type="button" class="book-btn btn-primary" @click="openMailto">
        {{ POST_PDF_SYNDICAT.buttonMailto }}
      </button>
    </template>
  </AppModal>

  <CelebrationOverlay :open="step === 'celebration'" @close="close">
    <div class="celebration-icon" aria-hidden="true">✓</div>
    <h3 class="celebration-title">
      {{ POST_PDF_SYNDICAT.celebrationTitle }}
    </h3>
    <p class="celebration-text">
      {{ POST_PDF_SYNDICAT.celebrationBody }}
    </p>
    <p class="celebration-hint">
      {{ POST_PDF_SYNDICAT.celebrationNote }}
    </p>
    <div class="celebration-actions">
      <button
        v-if="hasSyndicatMail"
        type="button"
        class="book-btn btn-secondary"
        @click="reopenSyndicat"
      >
        {{ POST_PDF_SYNDICAT.celebrationReopenSyndicat }}
      </button>
      <button type="button" class="book-btn btn-primary" @click="close">
        {{ POST_PDF_SYNDICAT.celebrationFinish }}
      </button>
    </div>
  </CelebrationOverlay>
</template>

<style scoped>
.post-pdf-syndicat-modal .post-pdf-syndicat-notice {
  font-size: 0.92rem;
  color: var(--text-secondary, #555);
  margin-top: 0.75rem;
}
.post-pdf-syndicat-email {
  margin: 0.75rem 0 0;
  font-size: 0.9rem;
}
.post-pdf-syndicat-webmail {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.5rem;
  margin: 1rem 0 0;
  font-size: 0.88rem;
}
.post-pdf-syndicat-webmail-sep {
  color: var(--gray-400, #9ca3af);
}
.post-pdf-syndicat-webmail a {
  color: var(--link-color, #0969da);
  text-decoration: underline;
}
</style>
