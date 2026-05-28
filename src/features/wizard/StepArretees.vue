<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useWizardNavigation } from '../../composables/useWizardNavigation';
import { usePdfGeneration } from '../../composables/usePdfGeneration';
import { useWordGeneration } from '../../composables/useWordGeneration';
import { useArreteesStore } from '../../stores/arretees';
import { useWizardStore } from '../../stores/wizard';
import { useSituationStore } from '../../stores/situation';
import { computeAnnualRemunerationFromWizardStores } from '../../domain/remuneration/compute';
import {
  buildMonthlyPeriodsStub,
  enrichPeriodesSalaireDuMensuel,
} from '../../composables/useTimeline';
import { buildArreteesSummaryFromPeriodes } from '../../domain/arretees/aggregateFromPeriodes';
import { buildSmhAssietteHintBlocks } from '../../domain/hints/engine';
import { useWizardRemunerationInput } from '../../composables/useWizardRemunerationInput';
import SalaryCurveView from '../arretees/SalaryCurveView.vue';
import FloatingBlock from '../arretees/FloatingBlock.vue';
import ArreteesResultsSummary from '../arretees/ArreteesResultsSummary.vue';
import SalaryModal from '../arretees/SalaryModal.vue';
import PdfInfosModal from '../pdf/PdfInfosModal.vue';
import type { ExportDocumentsPayload } from '../../domain/pdf/exportDocumentsPayload';
import PostPdfFlow from '../pdf/PostPdfFlow.vue';
import LegalCarousel from '../legal-guide/LegalCarousel.vue';
import { useUiStore } from '../../stores/ui';
import { useAgreementStore } from '../../stores/agreement';
import { getAgreement } from '../../domain/agreements/registry';
import { AppTooltip } from '../../components/ui';
import { WIZARD_LEGACY_LABELS, WIZARD_TOASTS } from '../../domain/ui/labels';
import { buildWizardTooltipHtml } from '../../domain/ui/wizardTooltips';
import { dispatchAppToast } from '../../utils/appToast';
import { isCompleteIsoDateString } from '../../domain/utils/date';

const { prevStep } = useWizardNavigation();
const arretees = useArreteesStore();
const wizard = useWizardStore();
const situation = useSituationStore();
const wizardInput = useWizardRemunerationInput();
const { generating: generatingPdf, generatePdf } = usePdfGeneration();
const { generating: generatingWord, generateWord } = useWordGeneration();
const generating = computed(() => generatingPdf.value || generatingWord.value);

/** Valeur affichée dans le champ (mise à jour à chaque frappe). */
const dateEmbaucheDraft = ref(arretees.dateEmbauche);
/** Date validée (commit sur `change` uniquement — évite d'ouvrir la saisie pendant la frappe). */
const dateEmbauche = ref(arretees.dateEmbauche);
const showCurve = computed(() => isCompleteIsoDateString(dateEmbauche.value));

const floatingBlockRef = ref<InstanceType<typeof FloatingBlock> | null>(null);
const salaryCurveRef = ref<InstanceType<typeof SalaryCurveView> | null>(null);
const salaryCurveContainerRef = ref<HTMLElement | null>(null);
const curveReveal = ref(false);
/** Index à ouvrir dès que le graphique est prêt (après saisie de la date d'embauche). */
let pendingFloatingOpenIndex: number | null = null;
const curveProgressRef = ref<HTMLElement | null>(null);
const floatingSaisieOpen = ref(false);
const salaryModalRef = ref<InstanceType<typeof SalaryModal> | null>(null);
const pdfInfosRef = ref<InstanceType<typeof PdfInfosModal> | null>(null);
const postPdfFlowRef = ref<InstanceType<typeof PostPdfFlow> | null>(null);

const ui = useUiStore();
const agreementStore = useAgreementStore();

const activeAgreementDoc = computed(() =>
  agreementStore.accordActif && agreementStore.activeAccordId
    ? getAgreement(agreementStore.activeAccordId)
    : null,
);

const remunerationAnnuelle = computed(() =>
  computeAnnualRemunerationFromWizardStores(wizardInput.value),
);

const arreteesAssietteBlocks = computed(() =>
  isCompleteIsoDateString(dateEmbauche.value)
    ? buildSmhAssietteHintBlocks(wizardInput.value, ui.nbMois)
    : [],
);

/** HTML des blocs assiette SMH — rendu directement (pas de book-hint imbriqué). */
const arreteesAssietteHtml = computed(() =>
  arreteesAssietteBlocks.value.map((b) => b.html).join('<br>'),
);

const dateEmbaucheFieldTooltip = computed(() => buildWizardTooltipHtml('dateEmbaucheArretees'));

const dateChangementClassTooltip = computed(() =>
  buildWizardTooltipHtml('dateChangementClassificationArretees'),
);

const arreteesSmhSeulTooltip = computed(() => buildWizardTooltipHtml('arreteesSmhSeul'));

const arreteesAssietteComparaisonTooltip = computed(() =>
  buildWizardTooltipHtml('arreteesAssietteComparaison'),
);

function rebuildPeriodesFromDate(d: string) {
  arretees.summary = null;
  if (!d) {
    arretees.periodes = [];
    return;
  }
  arretees.periodes = buildMonthlyPeriodsStub({ dateEmbauche: d });
  const duParams: Parameters<typeof enrichPeriodesSalaireDuMensuel>[1] = {
    classe: wizard.classe,
    experiencePro: situation.experiencePro,
    tempsPartiel: situation.tempsPartiel,
    tauxActivite: situation.tauxActivite,
    wizardInput: wizardInput.value,
    dateEmbauche: d,
    nbMois: ui.nbMois,
    smhSeul: arretees.surSMHSeul,
    agreement: activeAgreementDoc.value,
  };
  if (arretees.dateChangementClassification) {
    duParams.dateChangementClassification = arretees.dateChangementClassification;
  }
  enrichPeriodesSalaireDuMensuel(arretees.periodes, duParams);
}

const hasAnySalaireVerse = computed(() => arretees.periodes.some((p) => p.salaireVerse != null));

const moisSaisisCount = computed(
  () =>
    arretees.periodes.filter((p) => p.salaireVerse !== undefined && p.salaireVerse !== null).length,
);

const moisProgressLabel = computed(
  () => `${moisSaisisCount.value} / ${arretees.periodes.length || 0} mois saisis`,
);

const allMoisSaisis = computed(
  () =>
    arretees.periodes.length > 0 &&
    arretees.periodes.every((p) => p.salaireVerse !== undefined && p.salaireVerse !== null),
);

const canReopenFloatingSaisie = computed(
  () =>
    showCurve.value &&
    !floatingSaisieOpen.value &&
    arretees.periodes.length > 0 &&
    !allMoisSaisis.value,
);

const curveProgressAriaLabel = computed(() => {
  const base = moisProgressLabel.value;
  if (canReopenFloatingSaisie.value) {
    return `${base}. ${WIZARD_LEGACY_LABELS.curveProgressReopenAriaSuffix}`;
  }
  return base;
});

function onFloatingOpened() {
  floatingSaisieOpen.value = true;
}

async function onFloatingDismissed() {
  floatingSaisieOpen.value = false;
  await nextTick();
  if (canReopenFloatingSaisie.value) {
    curveProgressRef.value?.focus();
  }
}

function reopenFloatingFromProgress() {
  if (!canReopenFloatingSaisie.value) return;
  const firstEmpty = arretees.periodes.findIndex((p) => p.salaireVerse == null);
  const idx = firstEmpty >= 0 ? firstEmpty : Math.max(0, arretees.currentPeriodIndex);
  floatingBlockRef.value?.show(idx);
}

function onCurveProgressKeydown(e: KeyboardEvent) {
  if (!canReopenFloatingSaisie.value) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    reopenFloatingFromProgress();
  }
}

function clearDateEmbauche() {
  dateEmbauche.value = '';
  arretees.dateEmbauche = '';
  arretees.periodes = [];
  arretees.summary = null;
}

function resolvePointCoords(index: number) {
  return salaryCurveRef.value?.getPointCoordsInWrapper(index) ?? null;
}

function onCurveRendered() {
  floatingBlockRef.value?.reposition();
  if (pendingFloatingOpenIndex == null) return;
  const idx = pendingFloatingOpenIndex;
  pendingFloatingOpenIndex = null;
  void floatingBlockRef.value?.show(idx, { pop: true });
}

async function revealCurveAndOpenFirstSaisie() {
  curveReveal.value = true;
  await nextTick();
  salaryCurveContainerRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const first = arretees.periodes.findIndex((p) => p.salaireVerse == null);
  if (first < 0) return;

  const coords = salaryCurveRef.value?.getPointCoordsInWrapper(first);
  if (coords) {
    void floatingBlockRef.value?.show(first, { pop: true });
    return;
  }
  pendingFloatingOpenIndex = first;
}

async function commitDateEmbauche(v: string) {
  dateEmbauche.value = v;
  arretees.dateEmbauche = v;
  rebuildPeriodesFromDate(v);
  await nextTick();
  if (arretees.periodes.length > 0) {
    await revealCurveAndOpenFirstSaisie();
  }
}

/** Un seul `change` (legacy) : pas de courbe ni de bloc flottant pendant la saisie mois/jour/année. */
function onDateEmbaucheChange(ev: Event) {
  const input = ev.target as HTMLInputElement;
  dateEmbaucheDraft.value = input.value;
  const v = input.value.trim();
  if (!v) {
    clearDateEmbauche();
    return;
  }
  if (!input.validity.valid || !isCompleteIsoDateString(v)) return;
  if (v === dateEmbauche.value) return;
  void commitDateEmbauche(v);
}

watch(
  () => remunerationAnnuelle.value.total,
  () => {
    if (dateEmbauche.value) rebuildPeriodesFromDate(dateEmbauche.value);
  },
);

watch(
  () => ui.nbMois,
  () => {
    if (dateEmbauche.value) rebuildPeriodesFromDate(dateEmbauche.value);
  },
);

watch(
  () => arretees.surSMHSeul,
  () => {
    if (dateEmbauche.value) rebuildPeriodesFromDate(dateEmbauche.value);
  },
);

watch(
  wizardInput,
  () => {
    if (dateEmbauche.value) rebuildPeriodesFromDate(dateEmbauche.value);
  },
  { deep: true },
);

watch(activeAgreementDoc, () => {
  if (dateEmbauche.value) rebuildPeriodesFromDate(dateEmbauche.value);
});

watch(
  () => arretees.dateChangementClassification,
  () => {
    if (dateEmbauche.value) rebuildPeriodesFromDate(dateEmbauche.value);
  },
);

onMounted(() => {
  const v = arretees.dateEmbauche;
  if (!isCompleteIsoDateString(v)) return;
  dateEmbauche.value = v;
  dateEmbaucheDraft.value = v;
  if (arretees.periodes.length === 0) rebuildPeriodesFromDate(v);
});

function onPointClick(index: number) {
  void floatingBlockRef.value?.show(index, { pop: true });
}

function openBulkModal() {
  salaryModalRef.value?.show();
}

function startPdfFlow() {
  pdfInfosRef.value?.show();
}

function calculerArretees() {
  if (!hasAnySalaireVerse.value) {
    dispatchAppToast(WIZARD_TOASTS.arreteesAucunSalaireSaisi, 'warning');
    return;
  }
  arretees.summary = buildArreteesSummaryFromPeriodes(arretees.periodes);
}

async function onPdfGenerate(data: ExportDocumentsPayload) {
  try {
    generateWord(data);
    await generatePdf(data);
    dispatchAppToast('Lettre Word et annexe PDF ont été téléchargés.', 'success');
    postPdfFlowRef.value?.showSyndicatPrompt();
  } catch (err) {
    console.error('[PDF/Word]', err);
    dispatchAppToast('La génération des documents a échoué.', 'error');
  }
}
</script>

<template>
  <section class="wizard-step" aria-label="Étape 4 — Arriérés">
    <div class="step-content">
      <h2>{{ WIZARD_LEGACY_LABELS.step4PageTitle }}</h2>
      <p class="step-subtitle">
        {{ WIZARD_LEGACY_LABELS.step4PageSubtitle }}
      </p>

      <div v-if="!dateEmbauche" id="arretees-warning" class="book-hint warning">
        <p v-html="WIZARD_LEGACY_LABELS.arreteesWarningHtml" />
      </div>

      <div class="arretees-base-info">
        <h3 id="arretees-base-info-title">
          {{ WIZARD_LEGACY_LABELS.arreteesBaseInfoTitle }}
        </h3>
        <div class="form-group">
          <label for="date-embauche-arretees">
            Date d'embauche
            <AppTooltip :content="dateEmbaucheFieldTooltip" variant="result" position="top" />
          </label>
          <input
            id="date-embauche-arretees"
            v-model="dateEmbaucheDraft"
            type="date"
            class="book-input"
            @change="onDateEmbaucheChange"
          />
        </div>
      </div>

      <details
        id="arretees-options-accordion"
        class="arretees-options-accordion result-details-toggle"
      >
        <summary id="arretees-options-title" class="arretees-options-accordion-title">
          {{ WIZARD_LEGACY_LABELS.arreteesOptionsTitle }}
        </summary>
        <div class="arretees-options-accordion-body">
          <div class="form-group">
            <label for="date-changement-classification-arretees">
              Date de changement de classification
              <AppTooltip :content="dateChangementClassTooltip" variant="result" position="top" />
            </label>
            <input
              id="date-changement-classification-arretees"
              v-model="arretees.dateChangementClassification"
              type="date"
              class="book-input"
            />
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="arretees.ruptureContrat" type="checkbox" class="book-checkbox" />
              <span>{{ WIZARD_LEGACY_LABELS.ruptureContratLabel }}</span>
            </label>
          </div>

          <div v-if="arretees.ruptureContrat" class="form-group">
            <label for="date-rupture-arretees">Date de rupture du contrat</label>
            <input
              id="date-rupture-arretees"
              v-model="arretees.dateRupture"
              type="date"
              class="book-input"
            />
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="arretees.accordEcrit" type="checkbox" class="book-checkbox" />
              <span>{{ WIZARD_LEGACY_LABELS.accordEcritLabel }}</span>
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="arretees.surSMHSeul" type="checkbox" class="book-checkbox" />
              <span>{{ WIZARD_LEGACY_LABELS.arreteesSmhSeulLabel }}</span>
              <AppTooltip :content="arreteesSmhSeulTooltip" variant="result" position="top" />
            </label>
          </div>
        </div>
      </details>

      <div
        v-if="showCurve"
        id="salary-curve-container"
        ref="salaryCurveContainerRef"
        class="salary-curve-container"
        :class="{ 'salary-curve-container--reveal': curveReveal }"
      >
        <h3 id="salary-curve-title">
          {{ WIZARD_LEGACY_LABELS.salaryCurveTitle }}
        </h3>
        <p id="salary-curve-help" class="curve-help">
          {{ WIZARD_LEGACY_LABELS.salaryCurveHelp }}
        </p>

        <div class="book-hint warning arretees-salaire-hint" role="note">
          <p>
            Saisissez le <strong>total brut</strong> de vos bulletins. Le « dû » est le minimum
            conventionnel de référence.
          </p>
          <p v-if="arreteesAssietteHtml" class="arretees-assiette-detail">
            <span v-html="arreteesAssietteHtml" />
            <AppTooltip
              :content="arreteesAssietteComparaisonTooltip"
              variant="result"
              position="top"
              trigger-aria-label="Aide sur la base de comparaison au minimum conventionnel"
            />
          </p>
          <p v-else class="arretees-assiette-detail">
            <strong>Inclus :</strong><br />
            Salaire de base.<br />
            <strong>Exclus :</strong><br />
            Primes et majorations selon vos modalités.
            <AppTooltip
              :content="arreteesAssietteComparaisonTooltip"
              variant="result"
              position="top"
              trigger-aria-label="Aide sur la base de comparaison au minimum conventionnel"
            />
          </p>
        </div>

        <div class="curve-chart-wrapper curve-host">
          <SalaryCurveView
            ref="salaryCurveRef"
            @point-click="onPointClick"
            @rendered="onCurveRendered"
          />
          <FloatingBlock
            ref="floatingBlockRef"
            :resolve-point-coords="resolvePointCoords"
            @opened="onFloatingOpened"
            @dismissed="onFloatingDismissed"
          />
        </div>

        <div class="curve-legend">
          <div class="legend-item">
            <span class="legend-color" style="background: #4caf50" />
            <span>Salaire réel saisi</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #2196f3" />
            <span>Salaire dû</span>
          </div>
        </div>

        <div
          id="curve-progress"
          ref="curveProgressRef"
          class="curve-progress"
          :class="{ 'curve-progress--reopen': canReopenFloatingSaisie }"
          :role="canReopenFloatingSaisie ? 'button' : undefined"
          :tabindex="canReopenFloatingSaisie ? 0 : -1"
          :aria-label="curveProgressAriaLabel"
          @click="canReopenFloatingSaisie ? reopenFloatingFromProgress() : undefined"
          @keydown="onCurveProgressKeydown"
        >
          <span id="curve-progress-text">{{ moisProgressLabel }}</span>
          <span id="curve-progress-reopen-hint" class="curve-progress-reopen-hint">
            {{ WIZARD_LEGACY_LABELS.curveProgressReopenHint }}
          </span>
        </div>

        <div class="bulk-action">
          <button type="button" class="book-btn btn-secondary" @click="openBulkModal">
            Saisie groupée des salaires
          </button>
        </div>

        <div v-show="showCurve" id="arretees-calc-sticky" class="arretees-calc-sticky">
          <button
            id="btn-calculer-arretees-sticky"
            type="button"
            class="book-btn btn-primary btn-large"
            @click="calculerArretees"
          >
            {{ WIZARD_LEGACY_LABELS.btnCalculerArreteesSticky }}
          </button>
        </div>
      </div>

      <div v-else id="timeline-no-date-message" class="timeline-no-date-message">
        <p id="timeline-help-text" class="timeline-help">
          {{ WIZARD_LEGACY_LABELS.timelineHelpText }}
        </p>
      </div>

      <ArreteesResultsSummary
        v-if="arretees.summary"
        :summary="arretees.summary"
        :export-busy="generating"
        @export-pdf="startPdfFlow"
      />

      <LegalCarousel v-if="arretees.summary" />

      <div class="step-actions">
        <button type="button" class="book-btn btn-secondary" @click="prevStep">
          <span class="btn-icon btn-icon-left">‹</span> Retour
        </button>
      </div>
    </div>
  </section>

  <SalaryModal ref="salaryModalRef" />
  <PdfInfosModal ref="pdfInfosRef" @generate="onPdfGenerate" />
  <PostPdfFlow ref="postPdfFlowRef" />
</template>

<style scoped>
.curve-host {
  position: relative;
  margin-top: 1rem;
}
.curve-help {
  color: var(--text-secondary, #666);
  font-size: 0.9em;
}
.bulk-action {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}
.timeline-help {
  margin: 0.5rem 0 0;
  color: var(--gray-600, #666);
}
</style>
