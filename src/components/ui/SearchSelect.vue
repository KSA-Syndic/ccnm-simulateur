<script setup lang="ts">
/**
 * Liste déroulante avec recherche (combobox ARIA) : saisie pour filtrer, flèches pour naviguer,
 * Entrée pour choisir, Échap pour fermer. Recherche insensible à la casse et aux accents.
 */
import { computed, nextTick, ref, watch } from 'vue';

export interface SearchSelectOption {
  value: string;
  label: string;
  /** Ligne secondaire (ex. départements). */
  detail?: string;
  /** Valeur affichée à droite (ex. montant). */
  meta?: string;
  /** Termes supplémentaires pris en compte par la recherche. */
  keywords?: string;
}

const props = defineProps<{
  id: string;
  modelValue: string | null;
  options: readonly SearchSelectOption[];
  placeholder?: string;
  emptyText?: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const query = ref('');
const open = ref(false);
const activeIndex = ref(0);
const listRef = ref<HTMLUListElement | null>(null);
const listboxId = computed(() => `${props.id}-listbox`);

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const indexed = computed(() =>
  props.options.map((o) => ({
    option: o,
    haystack: normalize(`${o.label} ${o.detail ?? ''} ${o.keywords ?? ''}`),
  })),
);

const filtered = computed(() => {
  const terms = normalize(query.value).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return props.options;
  return indexed.value
    .filter((x) => terms.every((t) => x.haystack.includes(t)))
    .map((x) => x.option);
});

const selected = computed(() => props.options.find((o) => o.value === props.modelValue) ?? null);

const inputText = computed(() => (open.value ? query.value : (selected.value?.label ?? '')));

function openList() {
  if (open.value) return;
  open.value = true;
  query.value = '';
  const i = filtered.value.findIndex((o) => o.value === props.modelValue);
  activeIndex.value = Math.max(0, i);
  void scrollActiveIntoView();
}

function close() {
  open.value = false;
  query.value = '';
}

function choose(option: SearchSelectOption) {
  emit('update:modelValue', option.value);
  close();
}

async function scrollActiveIntoView() {
  await nextTick();
  listRef.value
    ?.querySelector<HTMLElement>(`[data-index="${activeIndex.value}"]`)
    ?.scrollIntoView?.({ block: 'nearest' });
}

function move(delta: number) {
  if (!open.value) {
    openList();
    return;
  }
  const n = filtered.value.length;
  if (n === 0) return;
  activeIndex.value = (activeIndex.value + delta + n) % n;
  void scrollActiveIntoView();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    move(1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    move(-1);
  } else if (e.key === 'Enter') {
    const option = filtered.value[activeIndex.value];
    if (open.value && option) {
      e.preventDefault();
      choose(option);
    }
  } else if (e.key === 'Escape') {
    close();
  }
}

function onInput(e: Event) {
  if (!open.value) openList();
  query.value = (e.target as HTMLInputElement).value;
  activeIndex.value = 0;
}

watch(filtered, () => {
  if (activeIndex.value >= filtered.value.length) activeIndex.value = 0;
});
</script>

<template>
  <div class="search-select" :class="{ 'search-select--open': open }">
    <input
      :id="id"
      class="book-select search-select__input"
      type="text"
      role="combobox"
      autocomplete="off"
      :aria-expanded="open"
      :aria-controls="listboxId"
      :aria-activedescendant="open && filtered.length ? `${id}-opt-${activeIndex}` : undefined"
      :placeholder="placeholder"
      :value="inputText"
      @focus="openList"
      @click="openList"
      @input="onInput"
      @keydown="onKeydown"
      @blur="close"
    />
    <span v-if="!open && selected?.meta" class="search-select__current-meta" aria-hidden="true">
      {{ selected.meta }}
    </span>
    <ul v-show="open" :id="listboxId" ref="listRef" class="search-select__list" role="listbox">
      <li
        v-for="(o, i) in filtered"
        :id="`${id}-opt-${i}`"
        :key="o.value"
        :data-index="i"
        role="option"
        class="search-select__option"
        :class="{
          'search-select__option--active': i === activeIndex,
          'search-select__option--selected': o.value === modelValue,
        }"
        :aria-selected="o.value === modelValue"
        @mousedown.prevent="choose(o)"
        @mousemove="activeIndex = i"
      >
        <span class="search-select__text">
          <span class="search-select__label">{{ o.label }}</span>
          <span v-if="o.detail" class="search-select__detail">{{ o.detail }}</span>
        </span>
        <span v-if="o.meta" class="search-select__meta">{{ o.meta }}</span>
      </li>
      <li v-if="filtered.length === 0" class="search-select__empty" role="presentation">
        {{ emptyText ?? 'Aucun résultat' }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.search-select {
  position: relative;
}

.search-select__input {
  padding-right: 5.5rem;
  cursor: pointer;
}

.search-select--open .search-select__input {
  cursor: text;
  border-color: var(--color-primary);
}

.search-select__current-meta {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  font-weight: 600;
  color: var(--color-primary);
  pointer-events: none;
}

.search-select__list {
  position: absolute;
  z-index: 20;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  max-height: 18rem;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
  background: white;
  border: 1px solid var(--color-primary-border);
}

.search-select__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--gray-100);
}

.search-select__option--active {
  background: var(--color-primary-bg);
}

.search-select__option--selected .search-select__label {
  color: var(--color-primary);
}

.search-select__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.search-select__label {
  font-weight: 600;
}

.search-select__detail {
  font-size: 0.8rem;
  color: var(--gray-500);
}

.search-select__meta {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.search-select__empty {
  padding: 10px 12px;
  color: var(--gray-500);
}
</style>
