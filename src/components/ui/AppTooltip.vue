<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, useAttrs } from 'vue';
import { computePosition, flip, shift, offset, autoUpdate } from '@floating-ui/dom';
import type { Placement } from '@floating-ui/dom';
import type { TooltipContent, TooltipVariant } from '@/domain/tooltip/model';
import { formatTooltipHtml } from '@/domain/tooltip/model';
import { A11Y_LABELS } from '@/domain/ui/labels';

const props = defineProps<{
  content: string | TooltipContent;
  position?: 'top' | 'bottom' | 'left' | 'right';
  variant?: TooltipVariant;
  /**
   * Apparence du picto « i » :
   * - `default` : pastille grise, survol orange (fonds clairs)
   * - `on-dark` : picto clair sans pastille orange (en-tête orange)
   */
  triggerTone?: 'default' | 'on-dark';
  /** Accessible name du déclencheur (requis pour `role="button"` + lecteurs d’écran). */
  triggerAriaLabel?: string;
  /** Délai (ms) avant fermeture au mouseleave — permet de survoler le popper. */
  hideDelayMs?: number;
}>();

const triggerClass = computed(() => [
  'app-tooltip-trigger',
  props.triggerTone === 'on-dark' ? 'app-tooltip-trigger--on-dark' : '',
]);

const attrs = useAttrs();
const visible = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);

let stopAutoUpdate: (() => void) | undefined;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const resolvedVariant = computed<TooltipVariant>(() => props.variant ?? 'compact');
const hideDelay = computed(() => Math.max(0, props.hideDelayMs ?? 200));

const placement = computed<Placement>(() => {
  const p = props.position ?? 'top';
  if (p === 'bottom' || p === 'left' || p === 'right' || p === 'top') return p;
  return 'top';
});

const renderedHtml = computed(() => {
  if (typeof props.content === 'string') {
    return props.content;
  }
  return formatTooltipHtml(props.content, resolvedVariant.value);
});

function cancelHide() {
  if (hideTimer != null) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function scheduleHide() {
  cancelHide();
  hideTimer = setTimeout(() => {
    hideTimer = null;
    visible.value = false;
  }, hideDelay.value);
}

async function reposition() {
  await nextTick();
  const trig = triggerRef.value;
  const float = floatingRef.value;
  if (!trig || !float || !visible.value) return;

  stopAutoUpdate?.();
  stopAutoUpdate = autoUpdate(trig, float, () => {
    void computePosition(trig, float, {
      /** Évite les dérives (ancêtres `transform` / `overflow`) — repère viewport comme le CSS `fixed`. */
      strategy: 'fixed',
      placement: placement.value,
      middleware: [
        offset(8),
        flip({ fallbackAxisSideDirection: 'start', padding: 8 }),
        shift({ padding: 8 }),
      ],
    }).then(({ x, y }) => {
      float.style.setProperty('left', `${Math.round(x)}px`);
      float.style.setProperty('top', `${Math.round(y)}px`);
    });
  });
}

function show() {
  cancelHide();
  visible.value = true;
}
function hide() {
  cancelHide();
  visible.value = false;
}
function toggle() {
  cancelHide();
  visible.value = !visible.value;
}

function onTriggerClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  toggle();
}

function onTriggerKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggle();
  }
  if (e.key === 'Escape' && visible.value) {
    e.preventDefault();
    hide();
  }
}

function isCoarsePointer(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

function onTriggerMouseEnter() {
  if (isCoarsePointer()) return;
  cancelHide();
  show();
}
function onTriggerMouseLeave() {
  if (isCoarsePointer()) return;
  scheduleHide();
}

function onPopperMouseEnter() {
  cancelHide();
}
function onPopperMouseLeave() {
  scheduleHide();
}

function onClickOutside(e: MouseEvent) {
  const t = e.target as Node;
  if (floatingRef.value?.contains(t)) return;
  if (triggerRef.value && !triggerRef.value.contains(t)) {
    cancelHide();
    visible.value = false;
  }
}

watch(visible, (v) => {
  if (v) {
    void reposition();
  } else {
    cancelHide();
    stopAutoUpdate?.();
    stopAutoUpdate = undefined;
  }
});

watch(
  () => [props.position, renderedHtml.value] as const,
  () => {
    if (visible.value) void reposition();
  },
);

onMounted(() => document.addEventListener('click', onClickOutside, true));
onUnmounted(() => {
  document.removeEventListener('click', onClickOutside, true);
  cancelHide();
  stopAutoUpdate?.();
  stopAutoUpdate = undefined;
});
</script>

<template>
  <span
    ref="triggerRef"
    :class="triggerClass"
    v-bind="attrs"
    tabindex="0"
    role="button"
    :aria-label="props.triggerAriaLabel ?? A11Y_LABELS.tooltipTriggerDefault"
    :aria-expanded="visible"
    aria-haspopup="true"
    @mouseenter="onTriggerMouseEnter"
    @mouseleave="onTriggerMouseLeave"
    @click="onTriggerClick"
    @keydown="onTriggerKeydown"
  >
    <slot name="trigger">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </slot>
  </span>

  <Teleport to="body">
    <Transition name="tooltip-fade">
      <div
        v-show="visible"
        ref="floatingRef"
        class="app-tooltip-popper"
        :class="[`app-tooltip--${placement}`, `app-tooltip--${resolvedVariant}`]"
        role="tooltip"
        @mouseenter="onPopperMouseEnter"
        @mouseleave="onPopperMouseLeave"
      >
        <div class="app-tooltip__content" v-html="renderedHtml" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity var(--transition-fast, 150ms ease);
}
.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}
</style>
