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
import gmailIconUrl from '../../assets/mail/Gmail_icon_(2026).svg?url';
import outlookIconUrl from '../../assets/mail/Microsoft_Outlook_Icon_(2025–present).svg?url';

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

const gmailComposeUrl = computed(() =>
  buildGmailComposeUrl(
    syndicatEmail.value,
    POST_PDF_SYNDICAT.mailSubject,
    POST_PDF_SYNDICAT.mailBody,
  ),
);

const outlookComposeUrl = computed(() =>
  buildOutlookComposeUrl(
    syndicatEmail.value,
    POST_PDF_SYNDICAT.mailSubject,
    POST_PDF_SYNDICAT.mailBody,
  ),
);

const mailtoHref = computed(() =>
  buildMailtoHref(syndicatEmail.value, POST_PDF_SYNDICAT.mailSubject, POST_PDF_SYNDICAT.mailBody),
);

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

/** Laisser le navigateur traiter l’ouverture du lien avant de fermer le dialog (important sur mobile). */
function scheduleGoCelebration() {
  window.setTimeout(() => goCelebration(), 0);
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
          <a
            class="syndicat-compose-mailto"
            :href="mailtoHref"
            rel="noopener noreferrer"
            :aria-label="POST_PDF_SYNDICAT.syndicatAddressMailtoAria"
            @click="scheduleGoCelebration"
          >
            {{ syndicatEmail }}
          </a>
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
                class="syndicat-compose-pj-icon syndicat-compose-pj-icon--html"
                aria-hidden="true"
              >
                HTML
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
            <a
              class="syndicat-webmail-btn syndicat-webmail-btn--gmail"
              :href="gmailComposeUrl"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="POST_PDF_SYNDICAT.gmailComposeAria"
              @click="scheduleGoCelebration"
            >
              <img
                class="syndicat-webmail-icon"
                :src="gmailIconUrl"
                alt=""
                width="24"
                height="24"
                decoding="async"
              />
              <span>{{ POST_PDF_SYNDICAT.gmailLinkLabel }}</span>
            </a>
            <a
              class="syndicat-webmail-btn syndicat-webmail-btn--outlook"
              :href="outlookComposeUrl"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="POST_PDF_SYNDICAT.outlookComposeAria"
              @click="scheduleGoCelebration"
            >
              <img
                class="syndicat-webmail-icon"
                :src="outlookIconUrl"
                alt=""
                width="24"
                height="24"
                decoding="async"
              />
              <span>{{ POST_PDF_SYNDICAT.outlookLinkLabel }}</span>
            </a>
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
.post-pdf-syndicat-modal {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.post-pdf-syndicat-lead {
  margin: 0 0 1.15rem;
  line-height: 1.55;
  font-size: 0.95rem;
  overflow-wrap: break-word;
  word-break: break-word;
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
  overflow-wrap: anywhere;
  word-break: break-word;
}

.syndicat-compose-mailto {
  margin: 0;
  padding: 0;
  font-weight: inherit;
  font-size: inherit;
  font-family: inherit;
  line-height: inherit;
  color: var(--color-hyperlink);
  text-decoration: underline;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.syndicat-compose-mailto:hover {
  color: var(--color-hyperlink-hover);
  text-decoration: underline;
}

.syndicat-compose-mailto:focus-visible {
  outline: 2px solid var(--color-hyperlink);
  outline-offset: 2px;
}

.syndicat-compose-subject {
  overflow-wrap: break-word;
  word-break: break-word;
  hyphens: auto;
}

@media (min-width: var(--bp-mobile-sm)) {
  .syndicat-compose-subject {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: normal;
    hyphens: none;
  }
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

.syndicat-compose-pj-icon--html {
  background: #1d4ed8;
  font-size: 0.55rem;
  letter-spacing: -0.02em;
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
  overflow-wrap: break-word;
  word-break: break-word;
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
  text-decoration: none;
  box-sizing: border-box;
  touch-action: manipulation;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.08);
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
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  object-fit: contain;
  display: block;
}

@media (max-width: var(--bp-webmail-stack)) {
  .syndicat-webmail-buttons {
    grid-template-columns: 1fr;
  }
}

@media (max-width: var(--bp-tight)) {
  .syndicat-compose-row {
    grid-template-columns: 1fr;
    gap: 0.35rem 0;
  }

  .syndicat-compose-label {
    margin-bottom: 0.1rem;
  }
}

@media (min-width: var(--bp-tight-from)) and (max-width: var(--bp-mobile-sm)) {
  .syndicat-compose-row {
    grid-template-columns: 3.5rem 1fr;
  }
}
</style>
