<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useArreteesStore } from '../../stores/arretees';
import { NumericInput } from '../../components/ui';
import { AppTooltip } from '../../components/ui';
import { formatMensuelDuAvecDetail } from '../../domain/arretees/formatDuDetail';
import { WIZARD_LEGACY_LABELS } from '../../domain/ui/labels';

const props = defineProps<{
  resolvePointCoords?: (index: number) => { x: number; y: number } | null;
}>();

const emit = defineEmits<{
  opened: [];
  dismissed: [];
}>();

const arreteesStore = useArreteesStore();
const salaryAmount = ref(0);
const visible = ref(false);
const dismissedByUser = ref(false);
const salaryInputRef = ref<InstanceType<typeof NumericInput> | null>(null);
const panelRef = ref<HTMLElement | null>(null);
/** Position réelle du point sur le graphique (date en abscisse). */
const pointCoords = ref<{ x: number; y: number } | null>(null);
/** Ancrage du panneau (peut être décalé en X aux bords du graphique). */
const panelCoords = ref<{ x: number; y: number } | null>(null);
const layerReady = ref(false);
const layerAnimating = ref(false);
const popIn = ref(false);
const mobilePanelFixed = ref(false);
/** Cordon vertical (repère wrapper), aligné en X sur le point du graphique. */
const cordonLayout = ref<{ left: number; top: number; visible: boolean }>({
  left: 0,
  top: 0,
  visible: false,
});

let resizeObserver: ResizeObserver | undefined;
let mobileMq: MediaQueryList | undefined;

const currentPeriod = computed(() => {
  if (arreteesStore.currentPeriodIndex < 0) return null;
  return arreteesStore.periodes[arreteesStore.currentPeriodIndex] ?? null;
});

const markerStyle = computed(() => {
  if (!pointCoords.value) return { visibility: 'hidden' as const };
  return {
    left: `${pointCoords.value.x}px`,
    top: `${pointCoords.value.y}px`,
  };
});

const panelStyle = computed(() => {
  if (!panelCoords.value) return { visibility: 'hidden' as const };
  if (mobilePanelFixed.value) {
    return {
      left: `${panelCoords.value.x}px`,
      top: '8px',
      transform: 'translateX(-50%)',
    };
  }
  return {
    left: `${panelCoords.value.x}px`,
    top: `${panelCoords.value.y}px`,
    transform: 'translate(-50%, calc(-100% - 36px))',
  };
});

const cordonStyle = computed(() => {
  if (!cordonLayout.value.visible) return { display: 'none' };
  return {
    left: `${cordonLayout.value.left}px`,
    top: `${cordonLayout.value.top}px`,
    display: 'block',
  };
});

function isMobilePanel(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches;
}

function getChartWrapper(): HTMLElement | null {
  return document.querySelector('.curve-chart-wrapper');
}

/** Repère de position du calque flottant (même base que `getChartPointCoordsInWrapper`). */
function getPositionHost(): HTMLElement | null {
  return document.querySelector('.curve-host');
}

function clampPanelX(x: number, wrapper: HTMLElement): number {
  const half = Math.min(158, Math.max(120, wrapper.clientWidth * 0.42));
  return Math.max(half, Math.min(wrapper.clientWidth - half, x));
}

function computePanelCoords(
  raw: { x: number; y: number },
  wrapper: HTMLElement,
): { x: number; y: number } {
  if (mobilePanelFixed.value) {
    return { x: wrapper.clientWidth / 2, y: raw.y };
  }
  return { x: clampPanelX(raw.x, wrapper), y: raw.y };
}

/** Cordon vertical sous le panneau, centré sur l’abscisse du point (même X que chart-point-dot). */
function updateCordonLayout() {
  const host = getPositionHost();
  const panel = panelRef.value;
  const point = pointCoords.value;
  if (!host || !panel || !point || !layerReady.value) {
    cordonLayout.value = { left: 0, top: 0, visible: false };
    return;
  }

  let cordonTop: number;
  if (mobilePanelFixed.value) {
    // Mobile : offsets locaux (évite un top négatif si le panneau est hors chart-wrapper au 1er rendu).
    cordonTop = panel.offsetTop + panel.offsetHeight;
  } else {
    const hostRect = host.getBoundingClientRect();
    const pRect = panel.getBoundingClientRect();
    cordonTop = pRect.bottom - hostRect.top;
  }

  cordonLayout.value = {
    left: point.x,
    top: cordonTop,
    visible: true,
  };
}

function findNextEmptyIndex(from: number): number {
  const ps = arreteesStore.periodes;
  for (let i = from + 1; i < ps.length; i++) {
    if (ps[i]?.salaireVerse == null) return i;
  }
  for (let i = 0; i < ps.length; i++) {
    if (ps[i]?.salaireVerse == null) return i;
  }
  return -1;
}

async function focusSalaryInput() {
  await nextTick();
  await nextTick();
  const input = salaryInputRef.value;
  if (!input) return;
  input.focus();
  input.select();
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

async function updateAnchorPosition(options?: { animate?: boolean; pop?: boolean }) {
  const idx = arreteesStore.currentPeriodIndex;
  const raw = props.resolvePointCoords?.(idx) ?? null;
  const wrapper = getChartWrapper();

  if (!raw || !wrapper) {
    layerReady.value = false;
    pointCoords.value = null;
    panelCoords.value = null;
    cordonLayout.value = { left: 0, top: 0, visible: false };
    return;
  }

  mobilePanelFixed.value = isMobilePanel();

  if (options?.animate && pointCoords.value) {
    layerAnimating.value = true;
  }

  pointCoords.value = raw;
  panelCoords.value = computePanelCoords(raw, wrapper);
  layerReady.value = true;

  if (options?.pop) {
    popIn.value = false;
    await nextTick();
    popIn.value = true;
  }

  const deferCordonForPop = Boolean(options?.pop && mobilePanelFixed.value);
  if (deferCordonForPop) {
    cordonLayout.value = { left: pointCoords.value?.x ?? 0, top: 0, visible: false };
  }

  await nextTick();
  if (!deferCordonForPop) {
    updateCordonLayout();
  }

  requestAnimationFrame(() => {
    layerAnimating.value = false;
    if (deferCordonForPop) {
      window.setTimeout(() => updateCordonLayout(), 420);
    } else {
      updateCordonLayout();
    }
  });
}

async function advanceToPeriod(index: number, options?: { keepAmount?: boolean }) {
  arreteesStore.currentPeriodIndex = index;
  if (!options?.keepAmount) {
    const p = arreteesStore.periodes[index];
    const v = p?.salaireVerse;
    salaryAmount.value = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  }
  await updateAnchorPosition({ animate: true, pop: false });
  await focusSalaryInput();
}

function clearChartPointHighlight() {
  arreteesStore.currentPeriodIndex = -1;
}

function dismiss() {
  if (!visible.value) return;
  visible.value = false;
  layerReady.value = false;
  popIn.value = false;
  dismissedByUser.value = true;
  pointCoords.value = null;
  panelCoords.value = null;
  cordonLayout.value = { left: 0, top: 0, visible: false };
  clearChartPointHighlight();
  emit('dismissed');
}

async function show(index: number, options?: { pop?: boolean }) {
  if (visible.value && arreteesStore.currentPeriodIndex === index) {
    dismiss();
    return;
  }
  dismissedByUser.value = false;
  arreteesStore.currentPeriodIndex = index;
  const p = arreteesStore.periodes[index];
  const v = p?.salaireVerse;
  salaryAmount.value = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  visible.value = true;
  emit('opened');
  await updateAnchorPosition({ animate: false, pop: options?.pop ?? true });
  void focusSalaryInput();
}

async function submit() {
  const val = salaryAmount.value;
  if (!Number.isFinite(val) || val < 0 || arreteesStore.currentPeriodIndex < 0) return;

  arreteesStore.setSalaireVerse(arreteesStore.currentPeriodIndex, val);
  const next = findNextEmptyIndex(arreteesStore.currentPeriodIndex);
  if (next >= 0 && next !== arreteesStore.currentPeriodIndex) {
    await advanceToPeriod(next, { keepAmount: true });
  } else {
    visible.value = false;
    layerReady.value = false;
    popIn.value = false;
    dismissedByUser.value = true;
    pointCoords.value = null;
    panelCoords.value = null;
    cordonLayout.value = { left: 0, top: 0, visible: false };
    clearChartPointHighlight();
    emit('dismissed');
  }
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && visible.value) {
    e.preventDefault();
    e.stopPropagation();
    dismiss();
  }
}

function observeChartWrapper() {
  const host = document.querySelector('.curve-host');
  if (!host || typeof ResizeObserver === 'undefined') return;
  resizeObserver = new ResizeObserver(() => {
    if (visible.value) void updateAnchorPosition();
  });
  resizeObserver.observe(host);
}

function onMobileMqChange() {
  if (visible.value) void updateAnchorPosition();
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown, true);
  observeChartWrapper();
  mobileMq = window.matchMedia('(max-width: 768px)');
  mobileMq.addEventListener('change', onMobileMqChange);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown, true);
  mobileMq?.removeEventListener('change', onMobileMqChange);
  resizeObserver?.disconnect();
});

watch(visible, (v) => {
  if (v) void focusSalaryInput();
});

defineExpose({
  show,
  dismiss,
  reposition: async () => {
    const inputHadFocus =
      typeof document !== 'undefined' &&
      document.activeElement instanceof HTMLElement &&
      document.activeElement.closest('#floating-input-block') != null;
    await updateAnchorPosition();
    if (visible.value && inputHadFocus) await focusSalaryInput();
  },
  isVisible: () => visible.value,
  isDismissedByUser: () => dismissedByUser.value,
});
</script>

<template>
  <div
    v-if="currentPeriod && visible"
    class="floating-saisie-layer"
    :class="{
      'floating-saisie-layer--ready': layerReady,
      'floating-saisie-layer--animating': layerAnimating,
      'floating-saisie-layer--mobile': mobilePanelFixed,
    }"
    aria-hidden="false"
  >
    <div class="chart-point-marker" :style="markerStyle" aria-hidden="true">
      <span class="chart-point-ring" />
      <span class="chart-point-dot" />
    </div>

    <div class="floating-cordon-vertical" :style="cordonStyle" aria-hidden="true" />

    <div
      id="floating-input-block"
      ref="panelRef"
      class="floating-input-block floating-input-block--external-cordon"
      :class="{ 'floating-input-block--pop': popIn }"
      :style="panelStyle"
      role="dialog"
      :aria-label="`Saisie du salaire pour ${currentPeriod.label}`"
    >
      <button
        id="floating-block-close"
        type="button"
        class="floating-block-close"
        aria-label="Fermer la saisie"
        @click="dismiss"
      >
        ×
      </button>
      <div class="floating-label">
        <span id="floating-period-label">{{ currentPeriod.label }}</span>
        <AppTooltip
          id="floating-info-icon"
          :content="WIZARD_LEGACY_LABELS.floatingSalaryInputTooltip"
          variant="compact"
          position="top"
          trigger-aria-label="Aide saisie salaire"
        />
      </div>
      <div class="input-with-unit floating-input">
        <NumericInput
          id="floating-salary-input"
          ref="salaryInputRef"
          v-model="salaryAmount"
          mode="decimal"
          :min="0"
          placeholder="0,00"
          aria-label="Salaire brut total du mois"
          @keydown.enter.prevent="submit"
        />
        <span class="input-unit">€</span>
      </div>
      <p v-if="currentPeriod.salaireDu > 0" class="floating-du-detail">
        Dû : {{ formatMensuelDuAvecDetail(currentPeriod) }}
      </p>
      <p id="floating-hint-text" class="floating-hint floating-hint--compact">
        <span class="floating-hint-line">{{ WIZARD_LEGACY_LABELS.floatingHintEnterLine }}</span>
        <span class="floating-hint-line">{{ WIZARD_LEGACY_LABELS.floatingHintEscapeLine }}</span>
      </p>
    </div>
  </div>
</template>
