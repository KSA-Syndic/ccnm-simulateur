<script setup lang="ts">
import { computed, ref } from 'vue';
import { AppModal } from '../../components/ui';
import CelebrationOverlay from './CelebrationOverlay.vue';
import { useAgreementStore } from '../../stores/agreement';
import { getAgreement } from '../../domain/agreements/registry';
import { POST_PDF_SYNDICAT } from '../../domain/ui/labels';
import { buildGmailComposeUrl, buildOutlookComposeUrl } from '../../domain/pdf/syndicatMail';

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

function openGmail() {
  const url = buildGmailComposeUrl(
    syndicatEmail.value,
    POST_PDF_SYNDICAT.mailSubject,
    POST_PDF_SYNDICAT.mailBody,
  );
  window.open(url, '_blank', 'noopener,noreferrer');
  goCelebration();
}

function openOutlook() {
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
      <p class="post-pdf-syndicat-lead">
        <strong>{{ syndicatDisplayName }}</strong
        >{{ POST_PDF_SYNDICAT.syndicatLeadAfterName }}
      </p>

      <section class="syndicat-compose" :aria-label="POST_PDF_SYNDICAT.syndicatComposeAria">
        <div class="syndicat-compose-toolbar" aria-hidden="true">
          <span class="syndicat-compose-dot" />
          <span class="syndicat-compose-dot" />
          <span class="syndicat-compose-dot" />
        </div>

        <div class="syndicat-compose-row">
          <span class="syndicat-compose-label">{{ POST_PDF_SYNDICAT.syndicatFieldTo }}</span>
          <span class="syndicat-compose-value">{{ syndicatEmail }}</span>
        </div>

        <div class="syndicat-compose-row">
          <span class="syndicat-compose-label">{{ POST_PDF_SYNDICAT.syndicatFieldSubject }}</span>
          <span
            class="syndicat-compose-value syndicat-compose-subject"
            :title="POST_PDF_SYNDICAT.mailSubject"
          >
            {{ POST_PDF_SYNDICAT.mailSubject }}
          </span>
        </div>

        <div class="syndicat-compose-attachments">
          <span class="syndicat-compose-label">{{
            POST_PDF_SYNDICAT.syndicatFieldAttachments
          }}</span>
          <ul class="syndicat-compose-pj-list">
            <li class="syndicat-compose-pj">
              <span
                class="syndicat-compose-pj-icon syndicat-compose-pj-icon--word"
                aria-hidden="true"
              >
                W
              </span>
              <span class="syndicat-compose-pj-name">{{ POST_PDF_SYNDICAT.syndicatPjWord }}</span>
            </li>
            <li class="syndicat-compose-pj">
              <span
                class="syndicat-compose-pj-icon syndicat-compose-pj-icon--pdf"
                aria-hidden="true"
              >
                PDF
              </span>
              <span class="syndicat-compose-pj-name">{{ POST_PDF_SYNDICAT.syndicatPjPdf }}</span>
            </li>
          </ul>
          <p class="syndicat-compose-pj-hint">
            {{ POST_PDF_SYNDICAT.syndicatPjHint }}
          </p>
        </div>

        <div class="syndicat-compose-actions">
          <p class="syndicat-compose-open-label">
            {{ POST_PDF_SYNDICAT.syndicatOpenWith }}
          </p>
          <div class="syndicat-webmail-buttons">
            <button
              type="button"
              class="syndicat-webmail-btn syndicat-webmail-btn--gmail"
              :aria-label="POST_PDF_SYNDICAT.gmailComposeAria"
              @click="openGmail"
            >
              <svg class="syndicat-webmail-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.92 5.92 0 0 1-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77a5.92 5.92 0 0 1-8.49-3.12H2.18v2.84A12 12 0 0 0 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09a5.92 5.92 0 0 1 0-4.18V7.07H2.18A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.56-2.31z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15A12 12 0 0 0 0 5.4L3.56 8.31A7.1 7.1 0 0 1 12 4.75z"
                />
              </svg>
              <span>{{ POST_PDF_SYNDICAT.gmailLinkLabel }}</span>
            </button>
            <button
              type="button"
              class="syndicat-webmail-btn syndicat-webmail-btn--outlook"
              :aria-label="POST_PDF_SYNDICAT.outlookComposeAria"
              @click="openOutlook"
            >
              <svg class="syndicat-webmail-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#0078D4"
                  d="M24 7.387v9.226c0 .676-.549 1.226-1.226 1.226h-8.691l-4.083 3.25V7.387h13v0z"
                />
                <path
                  fill="#0364B8"
                  d="M16.083 3H7.226A1.226 1.226 0 0 0 6 4.226v15.548L10.083 17V3h6z"
                />
                <path
                  fill="#28A8EA"
                  d="M6 4.226v15.548L10.083 17V3H7.226A1.226 1.226 0 0 0 6 4.226z"
                />
                <path
                  fill="#fff"
                  d="M12.5 8.5h5v1.75h-5V8.5zm0 2.75h5v1.75h-5v-1.75zm0 2.75h3.5v1.75H12.5v-1.75z"
                />
              </svg>
              <span>{{ POST_PDF_SYNDICAT.outlookLinkLabel }}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
    <template #footer>
      <button type="button" class="book-btn btn-secondary" @click="goCelebration">
        {{ POST_PDF_SYNDICAT.buttonDecline }}
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
.post-pdf-syndicat-lead {
  margin: 0 0 1.15rem;
  line-height: 1.55;
  font-size: 0.95rem;
}

.syndicat-compose {
  border: 1px solid var(--gray-200, #e5e7eb);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.syndicat-compose-toolbar {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 0.85rem;
  background: var(--gray-100, #f3f4f6);
  border-bottom: 1px solid var(--gray-200, #e5e7eb);
}

.syndicat-compose-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--gray-300, #d1d5db);
}

.syndicat-compose-row {
  display: grid;
  grid-template-columns: 4.25rem 1fr;
  gap: 0.5rem 0.75rem;
  align-items: baseline;
  padding: 0.65rem 0.9rem;
  border-bottom: 1px solid var(--gray-100, #f3f4f6);
  font-size: 0.9rem;
}

.syndicat-compose-label {
  color: var(--gray-500, #6b7280);
  font-weight: 600;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.syndicat-compose-value {
  color: var(--body-font-color, #333);
  font-weight: 500;
  min-width: 0;
}

.syndicat-compose-subject {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.syndicat-compose-attachments {
  padding: 0.75rem 0.9rem;
  border-bottom: 1px solid var(--gray-100, #f3f4f6);
}

.syndicat-compose-attachments .syndicat-compose-label {
  display: block;
  margin-bottom: 0.55rem;
}

.syndicat-compose-pj-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.syndicat-compose-pj {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.55rem;
  background: var(--gray-50, #f9fafb);
  border: 1px solid var(--gray-200, #e5e7eb);
  border-radius: 6px;
}

.syndicat-compose-pj-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 1.65rem;
  padding: 0 0.25rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  color: #fff;
}

.syndicat-compose-pj-icon--word {
  background: #2b579a;
  font-size: 0.75rem;
}

.syndicat-compose-pj-icon--pdf {
  background: #c0392b;
  font-size: 0.55rem;
  letter-spacing: -0.02em;
}

.syndicat-compose-pj-name {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--body-font-color, #333);
}

.syndicat-compose-pj-hint {
  margin: 0.5rem 0 0;
  font-size: 0.78rem;
  color: var(--gray-500, #6b7280);
  line-height: 1.4;
}

.syndicat-compose-actions {
  padding: 0.85rem 0.9rem 1rem;
  background: var(--gray-50, #f9fafb);
}

.syndicat-compose-open-label {
  margin: 0 0 0.6rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--gray-500, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.syndicat-webmail-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
}

.syndicat-webmail-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  color: var(--body-font-color, #333);
  background: #fff;
  border: 1px solid var(--gray-300, #d1d5db);
  border-radius: 8px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;
}

.syndicat-webmail-btn:hover {
  border-color: var(--gray-400, #9ca3af);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.syndicat-webmail-btn:focus-visible {
  outline: 2px solid var(--color-link, #e15c12);
  outline-offset: 2px;
}

.syndicat-webmail-btn--gmail:hover {
  border-color: #4285f4;
}

.syndicat-webmail-btn--outlook:hover {
  border-color: #0078d4;
}

.syndicat-webmail-icon {
  width: 1.35rem;
  height: 1.35rem;
  flex-shrink: 0;
}

@media (max-width: 420px) {
  .syndicat-compose-row {
    grid-template-columns: 3.5rem 1fr;
  }

  .syndicat-webmail-buttons {
    grid-template-columns: 1fr;
  }
}
</style>
