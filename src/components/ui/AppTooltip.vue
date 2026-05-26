<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { TooltipContent, TooltipVariant } from '@/domain/tooltip/model';
import { formatTooltipHtml } from '@/domain/tooltip/model';

const props = defineProps<{
  content: string | TooltipContent;
  position?: 'top' | 'bottom' | 'left' | 'right';
  variant?: TooltipVariant;
}>();

const visible = ref(false);
const triggerRef = ref<HTMLElement | null>(null);

const resolvedVariant = computed<TooltipVariant>(() => props.variant ?? 'compact');

const renderedHtml = computed(() => {
  if (typeof props.content === 'string') {
    return props.content;
  }
  return formatTooltipHtml(props.content, resolvedVariant.value);
});

function show() {
  visible.value = true;
}
function hide() {
  visible.value = false;
}
function toggle() {
  visible.value = !visible.value;
}

function onClickOutside(e: MouseEvent) {
  if (triggerRef.value && !triggerRef.value.contains(e.target as Node)) {
    visible.value = false;
  }
}

onMounted(() => document.addEventListener('click', onClickOutside, true));
onUnmounted(() => document.removeEventListener('click', onClickOutside, true));
</script>

<template>
  <span
    ref="triggerRef"
    class="tooltip-trigger__light"
    tabindex="0"
    role="button"
    :aria-expanded="visible"
    aria-haspopup="true"
    @mouseenter="show"
    @mouseleave="hide"
    @focus="show"
    @blur="hide"
    @click.prevent="toggle"
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
    <Transition name="tooltip-fade">
      <div
        v-if="visible"
        class="app-tooltip"
        :class="[`app-tooltip--${position ?? 'top'}`, `app-tooltip--${resolvedVariant}`]"
        role="tooltip"
      >
        <div class="app-tooltip__content" v-html="renderedHtml" />
      </div>
    </Transition>
  </span>
</template>

<style scoped>
.tooltip-trigger__light {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: help;
  color: var(--color-text-secondary, #888);
}
.app-tooltip {
  position: absolute;
  z-index: 1000;
  padding: 0.6rem 0.9rem;
  background: var(--tooltip-bg, #1e293b);
  color: var(--tooltip-text, #f8fafc);
  border-radius: var(--radius-md, 8px);
  font-size: 0.82rem;
  line-height: 1.45;
  max-width: 320px;
  width: max-content;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
}
.app-tooltip--top {
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}
.app-tooltip--bottom {
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}
.app-tooltip--left {
  right: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
}
.app-tooltip--right {
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
}

.app-tooltip--result {
  max-width: 380px;
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity var(--transition-fast, 150ms ease);
}
.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}
</style>
