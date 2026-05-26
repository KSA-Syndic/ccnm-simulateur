<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { useUiStore } from './stores/ui';
import ErrorBoundary from './components/ErrorBoundary.vue';
import AppToast from './components/ui/AppToast.vue';

const uiStore = useUiStore();

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (uiStore.isDirty) {
    e.preventDefault();
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});
</script>

<template>
  <ErrorBoundary>
    <div class="simulator-container">
      <router-view />
    </div>
  </ErrorBoundary>
  <AppToast />
</template>
