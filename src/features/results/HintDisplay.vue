<script setup lang="ts">
import type { ResultHintBlock } from '../../domain/hints/engine';

defineProps<{
  /** Blocs contextualisés type `book-hint`. */
  blocks?: ResultHintBlock[];
}>();
</script>

<template>
  <div
    v-if="blocks?.length"
    class="hints-book-wrap"
    role="region"
    aria-label="Conseils liés au calcul"
  >
    <div
      v-for="(b, i) in blocks"
      :key="i"
      class="book-hint"
      :class="b.type"
      role="status"
      aria-live="polite"
    >
      <p v-html="b.html" />
    </div>
  </div>
</template>
