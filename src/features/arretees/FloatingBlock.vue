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
const anchorPos = ref<{ x: number; y: number } | null>(null);
const anchorReady = ref(false);
const anchorAnimating = ref(false);
const popIn = ref(false);

let resizeObserver: ResizeObserver | undefined;

const currentPeriod = computed(() => {
  if (arreteesStore.currentPeriodIndex < 0) return null;
  return arreteesStore.periodes[arreteesStore.currentPeriodIndex] ?? null;
});

const anchorStyle = computed(() => {
  if (!anchorPos.value) {
    return { left: '50%', top: '45%' };
  }
  return {
    left: `${anchorPos.value.x}px`,
    top: `${anchorPos.value.y}px`,
  };
});

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
  salaryInputRef.value?.focus();
  salaryInputRef.value?.select();
}

async function updateAnchorPosition(options?: { animate?: boolean; pop?: boolean }) {
  const idx = arreteesStore.currentPeriodIndex;
  const coords = props.resolvePointCoords?.(idx) ?? null;

  if (!coords) {
    anchorReady.value = false;
    anchorPos.value = null;
    return;
  }

  if (options?.animate && anchorPos.value) {
    anchorAnimating.value = true;
  }

  anchorPos.value = coords;
  anchorReady.value = true;

  if (options?.pop) {
    popIn.value = false;
    await nextTick();
    popIn.value = true;
  }

  requestAnimationFrame(() => {
    anchorAnimating.value = false;
  });
}

function clearChartPointHighlight() {
  arreteesStore.currentPeriodIndex = -1;
}

function dismiss() {
  if (!visible.value) return;
  visible.value = false;
  anchorReady.value = false;
  popIn.value = false;
  dismissedByUser.value = true;
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
    await show(next, { pop: false });
    await updateAnchorPosition({ animate: true });
  } else {
    visible.value = false;
    anchorReady.value = false;
    popIn.value = false;
    dismissedByUser.value = true;
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

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown, true);
  observeChartWrapper();
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown, true);
  resizeObserver?.disconnect();
});

watch(
  () => arreteesStore.currentPeriodIndex,
  () => {
    if (visible.value) void updateAnchorPosition({ animate: true });
  },
);

watch(visible, (v) => {
  if (v) void focusSalaryInput();
});

defineExpose({
  show,
  dismiss,
  reposition: () => updateAnchorPosition(),
  isVisible: () => visible.value,
  isDismissedByUser: () => dismissedByUser.value,
});
</script>

<template>
  <div
    v-if="currentPeriod && visible"
    class="floating-anchor"
    :class="{
      'floating-anchor--ready': anchorReady,
      'floating-anchor--animating': anchorAnimating,
    }"
    :style="anchorStyle"
    aria-hidden="false"
  >
    <span class="chart-point-ring" aria-hidden="true" />
    <span class="chart-point-dot" aria-hidden="true" />

    <div
      id="floating-input-block"
      class="floating-input-block"
      :class="{ 'floating-input-block--pop': popIn }"
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
          :key="arreteesStore.currentPeriodIndex"
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
