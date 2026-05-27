<script setup lang="ts">
import { computed } from 'vue';
import type { AccordLike } from '../../domain/tooltip/builders';
import { getAccordNomCourt } from '../../domain/tooltip/builders';
import { ACCORD_BADGE_TOOLTIP_TITLE } from '../../domain/ui/labels';

const props = defineProps<{
  agreement: AccordLike | null | undefined;
}>();

const nom = computed(() => getAccordNomCourt(props.agreement) || 'Accord');
</script>

<template>
  <span
    class="accord-badge"
    :title="ACCORD_BADGE_TOOLTIP_TITLE"
    :aria-label="`Accord d'entreprise : ${nom}`"
    >🏢 {{ nom }}</span
  >
</template>
