<script setup lang="ts">
import { watch, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps<{
  open: boolean;
  title?: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const dialogRef = ref<HTMLDialogElement | null>(null);

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
}

watch(
  () => props.open,
  (val) => {
    if (val) dialogRef.value?.showModal();
    else dialogRef.value?.close();
  },
);

onMounted(() => document.addEventListener('keydown', onKeydown));
onUnmounted(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialogRef"
      class="app-modal"
      :aria-modal="open"
      :aria-label="title"
      @click.self="emit('close')"
    >
      <div class="app-modal__inner" role="document">
        <header v-if="title" class="app-modal__header">
          <h2 class="app-modal__title">
            {{ title }}
          </h2>
          <button type="button" class="app-modal__close" aria-label="Fermer" @click="emit('close')">
            ×
          </button>
        </header>
        <div class="app-modal__body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="app-modal__footer">
          <slot name="footer" />
        </footer>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.app-modal {
  border: none;
  border-radius: var(--radius-lg, 12px);
  padding: 0;
  max-width: min(90vw, 560px);
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}
.app-modal::backdrop {
  background: rgba(0, 0, 0, 0.45);
}
.app-modal__inner {
  padding: 1.5rem;
}
.app-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.app-modal__title {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0;
}
.app-modal__close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
  padding: 0.25rem;
  color: var(--text-secondary, #666);
}
.app-modal__footer {
  margin-top: 1.25rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
