<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
}

const toasts = ref<Toast[]>([]);
let nextId = 0;

function addToast(message: string, type: Toast['type'] = 'info', duration = 3500) {
  const id = nextId++;
  toasts.value.push({ id, message, type });
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, duration);
}

function handleEvent(e: Event) {
  const detail = (e as CustomEvent).detail;
  if (!detail?.message) return;
  const duration = typeof detail.duration === 'number' ? detail.duration : 3500;
  addToast(detail.message, detail.type ?? 'info', duration);
}

onMounted(() => window.addEventListener('app:toast', handleEvent));
onUnmounted(() => window.removeEventListener('app:toast', handleEvent));

defineExpose({ addToast });
</script>

<template>
  <Teleport to="body">
    <div class="app-toast-stack" aria-live="polite">
      <TransitionGroup name="app-toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="app-toast"
          :class="`app-toast--${toast.type}`"
          role="status"
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
/* Préfixe app- : évite le conflit avec les `.toast` legacy dans main.css (opacity: 0 par défaut). */
.app-toast-stack {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 11000;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 380px;
}
.app-toast {
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-md, 8px);
  font-size: 0.9rem;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.app-toast--success {
  background: var(--color-success, #4caf50);
}
.app-toast--warning {
  background: var(--color-warning, #ff9800);
}
.app-toast--info {
  background: var(--color-info, #2196f3);
}
.app-toast--error {
  background: var(--color-error, #f44336);
}

.app-toast-enter-active,
.app-toast-leave-active {
  transition: all 0.3s ease;
}
.app-toast-enter-from {
  opacity: 0;
  transform: translateX(2rem);
}
.app-toast-leave-to {
  opacity: 0;
  transform: translateY(-1rem);
}
</style>
