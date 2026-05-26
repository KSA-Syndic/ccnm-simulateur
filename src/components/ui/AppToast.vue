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
  if (detail?.message) addToast(detail.message, detail.type, detail.duration);
}

onMounted(() => window.addEventListener('app:toast', handleEvent));
onUnmounted(() => window.removeEventListener('app:toast', handleEvent));

defineExpose({ addToast });
</script>

<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast--${toast.type}`"
          role="status"
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 380px;
}
.toast {
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-md, 8px);
  font-size: 0.9rem;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.toast--success {
  background: var(--color-success, #4caf50);
}
.toast--warning {
  background: var(--color-warning, #ff9800);
}
.toast--info {
  background: var(--color-info, #2196f3);
}
.toast--error {
  background: var(--color-error, #f44336);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(2rem);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-1rem);
}
</style>
