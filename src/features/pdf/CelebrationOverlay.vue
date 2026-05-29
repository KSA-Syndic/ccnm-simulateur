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

<style scoped>
.celebration-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.35s ease,
    visibility 0.35s ease;
  backdrop-filter: blur(3px);
}

.celebration-overlay.visible {
  opacity: 1;
  visibility: visible;
}

.celebration-confetti-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.celebration-confetti {
  position: absolute;
  top: -12px;
  border-radius: 2px;
  opacity: 0;
}

.celebration-overlay.celebration-animated .celebration-confetti {
  animation: celebration-fall 2.2s ease-out forwards;
}

@keyframes celebration-fall {
  0% {
    opacity: 0;
    transform: translateY(0) rotate(0deg);
  }
  8% {
    opacity: 0.85;
  }
  85% {
    opacity: 0.6;
  }
  100% {
    opacity: 0;
    transform: translateY(100vh) rotate(360deg);
  }
}

.celebration-card {
  position: relative;
  background: white;
  padding: 28px 32px;
  max-width: 380px;
  width: 90%;
  border: var(--modal-border-width) solid var(--modal-border-color);
  border-radius: var(--modal-radius);
  box-shadow: var(--modal-shadow);
  text-align: center;
}

.celebration-overlay.celebration-animated .celebration-card {
  animation: celebration-card-in 0.45s ease-out;
}

@keyframes celebration-card-in {
  0% {
    opacity: 0;
    transform: scale(0.92);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.celebration-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 14px;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
}

.celebration-title {
  margin: 0 0 8px;
  font-size: 1.25rem;
  color: var(--body-font-color);
}

.celebration-text {
  margin: 0 0 12px;
  font-size: 0.95rem;
  color: var(--gray-600);
}

.celebration-hint {
  margin: 0 0 20px;
  font-size: 0.85rem;
  color: var(--gray-500);
}

.celebration-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

@media (prefers-reduced-motion: reduce) {
  .celebration-overlay.celebration-animated .celebration-confetti {
    animation: none;
    opacity: 0;
  }

  .celebration-overlay.celebration-animated .celebration-card {
    animation: none;
  }
}
</style>
