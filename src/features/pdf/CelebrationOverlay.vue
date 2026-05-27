<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

const CONFETTI_COLORS = ['#E15C12', '#c04e0f', '#f4a261', '#d97706', '#a3a3a3', '#6b8e6b'];
const CONFETTI_COUNT = 24;

export interface ConfettiPiece {
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
}

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const celebrateAnimated = ref(false);
const confetti = ref<ConfettiPiece[]>([]);
let wasHiddenWhileOpen = false;

function buildConfetti(): ConfettiPiece[] {
  return Array.from({ length: CONFETTI_COUNT }, () => ({
    left: 5 + Math.random() * 90,
    delay: Math.random() * 0.8,
    duration: 1.8 + Math.random() * 0.6,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ?? '#E15C12',
    size: 6 + Math.floor(Math.random() * 4),
  }));
}

function triggerAnimationIfVisible() {
  if (!props.open || document.visibilityState !== 'visible') return;
  requestAnimationFrame(() => {
    celebrateAnimated.value = true;
  });
}

function resetCelebration() {
  confetti.value = buildConfetti();
  celebrateAnimated.value = false;
  wasHiddenWhileOpen = false;
}

watch(
  () => props.open,
  (open) => {
    if (!open) {
      celebrateAnimated.value = false;
      return;
    }
    resetCelebration();
    void nextTick(() => triggerAnimationIfVisible());
  },
);

function onVisibilityChange() {
  if (!props.open) return;
  if (document.visibilityState === 'hidden') {
    wasHiddenWhileOpen = true;
    return;
  }
  if (document.visibilityState === 'visible' && wasHiddenWhileOpen && !celebrateAnimated.value) {
    wasHiddenWhileOpen = false;
    celebrateAnimated.value = true;
  }
}

function onKeydown(e: KeyboardEvent) {
  if (props.open && e.key === 'Escape') emit('close');
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange);
  document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="celebration-overlay visible"
      :class="{ 'celebration-animated': celebrateAnimated }"
      role="dialog"
      aria-modal="true"
      @click.self="emit('close')"
    >
      <div class="celebration-confetti-container" aria-hidden="true">
        <span
          v-for="(piece, i) in confetti"
          :key="i"
          class="celebration-confetti"
          :style="{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            background: piece.color,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
          }"
        />
      </div>
      <div class="celebration-card" @click.stop>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
