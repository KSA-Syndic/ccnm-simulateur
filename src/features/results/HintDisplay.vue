<script setup lang="ts">
defineProps<{
  hint: string;
}>();
</script>

<template>
  <div v-if="hint" class="hint-display" role="status" aria-live="polite">
    <span class="hint-icon">ℹ</span>
    <span class="hint-text" v-html="hint" />
  </div>
</template>
