<script setup lang="ts">
import type { ResultHintBlock } from '../../domain/hints/engine';

const props = defineProps<{
  /** Blocs contextualisés type `book-hint` (prioritaire si non vide). */
  blocks?: ResultHintBlock[];
  /** HTML legacy (liste plate) — rétrocompatibilité. */
  hint?: string;
}>();

const hasBlocks = () => (props.blocks?.length ?? 0) > 0;
const hasHint = () => !!(props.hint && props.hint.trim());
</script>

<template>
  <div
    v-if="hasBlocks()"
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
  <div v-else-if="hasHint()" class="hint-display" role="status" aria-live="polite">
    <span class="hint-icon">ℹ</span>
    <span class="hint-text" v-html="hint" />
  </div>
</template>
