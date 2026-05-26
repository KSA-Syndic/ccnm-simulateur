<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';

const hasError = ref(false);
const errorMessage = ref('');

onErrorCaptured((err: Error) => {
  hasError.value = true;
  errorMessage.value = err.message;
  console.error('[ErrorBoundary]', err);
  return false;
});

function handleReset() {
  hasError.value = false;
  errorMessage.value = '';
  sessionStorage.clear();
  window.location.reload();
}
</script>

<template>
  <div v-if="hasError" class="error-boundary" role="alert">
    <h2>Une erreur est survenue</h2>
    <p>{{ errorMessage }}</p>
    <button type="button" @click="handleReset">Recommencer</button>
  </div>
  <slot v-else />
</template>

<style scoped>
.error-boundary {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 2rem;
  text-align: center;
}
.error-boundary button {
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  cursor: pointer;
}
</style>
