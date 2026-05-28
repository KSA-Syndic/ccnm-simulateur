<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { AppTooltip } from '@/components/ui';
import { CONFIG } from '@/domain/config';
import { escapeHTML } from '@/domain/utils/format';

const props = defineProps<{
  critere: (typeof CONFIG.CRITERES)[number];
  critereIndex: number;
  modelValue: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

const wrapperRef = ref<HTMLElement | null>(null);
const scrollRef = ref<HTMLElement | null>(null);

const tooltipHtml = computed(() => {
  const text = String(props.critere.description ?? '').trim();
  if (!text) return '';
  return `<p>${escapeHTML(text)}</p>`;
});

function updateRouletteDisplay() {
  const scroll = scrollRef.value;
  const wrapper = wrapperRef.value;
  if (!scroll || !wrapper) return;
  const firstValue = scroll.querySelector('.roulette-value') as HTMLElement | null;
  const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const itemWidth = firstValue?.offsetWidth ?? rootFont * 12;
  const wrapperWidth = Math.max(wrapper.offsetWidth, itemWidth);
  const centerOffset = wrapperWidth / 2 - itemWidth / 2;
  const value = props.modelValue;
  const offset = -((value - 1) * itemWidth) + centerOffset;
  scroll.style.transform = `translateX(${offset}px)`;
}

let resizeScheduled = false;
function scheduleRouletteLayout() {
  if (resizeScheduled) return;
  resizeScheduled = true;
  requestAnimationFrame(() => {
    resizeScheduled = false;
    updateRouletteDisplay();
  });
}

function onWindowResize() {
  scheduleRouletteLayout();
}

const fullDesc = computed(() => {
  const d = props.critere.degres[props.modelValue as keyof typeof props.critere.degres];
  return d ?? '';
});

watch(
  () => [props.modelValue, props.critereIndex, props.critere.id],
  () => {
    void nextTick(() => updateRouletteDisplay());
  },
);

onMounted(() => {
  void nextTick(() => updateRouletteDisplay());
  window.addEventListener('resize', onWindowResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);
});

function clampDeg(v: number): number {
  return Math.min(10, Math.max(1, Math.round(v)));
}

function change(delta: number) {
  emit('update:modelValue', clampDeg(props.modelValue + delta));
}

function setValue(v: number) {
  emit('update:modelValue', clampDeg(v));
}

function onWheel(ev: WheelEvent) {
  const delta = ev.deltaX !== 0 ? ev.deltaX : ev.deltaY;
  if (delta > 0) change(1);
  else if (delta < 0) change(-1);
}

const touchStartX = ref(0);

function onTouchStart(e: TouchEvent) {
  touchStartX.value = e.touches[0]?.clientX ?? 0;
}

function onTouchEnd(e: TouchEvent) {
  const endX = e.changedTouches[0]?.clientX ?? touchStartX.value;
  const dx = endX - touchStartX.value;
  if (Math.abs(dx) > 40) {
    if (dx < 0) change(1);
    else change(-1);
  }
}

function labelFor(deg: number): string {
  return String(props.critere.labels[deg as keyof typeof props.critere.labels] ?? '');
}
</script>

<template>
  <div class="roulette-item" :data-critere="critereIndex">
    <div class="roulette-header">
      <div class="roulette-label">
        {{ critere.nom }}
        <AppTooltip
          v-if="tooltipHtml"
          :content="tooltipHtml"
          variant="compact"
          position="top"
          :trigger-aria-label="`Aide : ${critere.nom}`"
        />
      </div>
      <div class="degree-badge">
        Degré <span :id="`degree-label-${critereIndex}`">{{ modelValue }}</span
        >/10
      </div>
    </div>
    <div
      :id="`roulette-${critereIndex}`"
      ref="wrapperRef"
      class="roulette-wrapper"
      @wheel.prevent="onWheel"
      @touchstart.passive="onTouchStart"
      @touchend.prevent="onTouchEnd"
    >
      <button
        type="button"
        class="roulette-chevron chevron-up"
        aria-label="Degré précédent"
        @click.stop="change(-1)"
      />
      <div class="roulette-indicator" aria-hidden="true" />
      <div :id="`scroll-${critereIndex}`" ref="scrollRef" class="roulette-scroll">
        <button
          v-for="deg in 10"
          :key="deg"
          type="button"
          class="roulette-value"
          :class="{ selected: deg === modelValue }"
          :data-value="deg"
          :aria-pressed="deg === modelValue"
          :aria-label="`${critere.nom} — degré ${deg} : ${labelFor(deg)}`"
          @click="setValue(deg)"
        >
          <span class="degree-number">{{ deg }}</span>
          <span class="degree-text">{{ labelFor(deg) }}</span>
        </button>
      </div>
      <button
        type="button"
        class="roulette-chevron chevron-down"
        aria-label="Degré suivant"
        @click.stop="change(1)"
      />
    </div>
    <div :id="`full-desc-${critereIndex}`" class="roulette-full-description">
      <p>{{ fullDesc }}</p>
    </div>
  </div>
</template>

<style scoped>
/* Chevrons : zone tactile 44px, triangle en ::before (remplace main.css + extensions.css). */
.roulette-chevron {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  opacity: 0.7;
  transition: var(--transition-fast);
}

.roulette-chevron:hover {
  opacity: 1;
}

.roulette-chevron.chevron-up {
  left: 10px;
}

.roulette-chevron.chevron-down {
  right: 10px;
}

.roulette-chevron::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  transform: translate(-50%, -50%);
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
}

.roulette-chevron.chevron-up::before {
  border-right: 12px solid var(--color-link);
}

.roulette-chevron.chevron-down::before {
  border-left: 12px solid var(--color-link);
}

.roulette-value {
  cursor: pointer;
  border: none;
  background: transparent;
  font: inherit;
  color: inherit;
}

.roulette-value:not(.selected):hover {
  opacity: 0.85;
}
</style>
