<script setup lang="ts">
import { ref, watch, onMounted, useAttrs } from 'vue';
import {
  clampNumber,
  parseDecimalInput,
  parseIntegerInput,
  sanitizeDecimalString,
  sanitizeIntegerString,
} from '@/domain/input/numericSanitize';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    modelValue: number;
    mode?: 'integer' | 'decimal';
    selectOnFocus?: boolean;
    min?: number;
    max?: number;
    step?: number | string;
    /** Texte indicatif lorsque le champ est vide (ex. taux SMH par défaut). */
    placeholder?: string;
    /** Limite de caractères en saisie (ex. âge sur 2 chiffres). */
    maxLength?: number;
  }>(),
  {
    mode: 'decimal',
    selectOnFocus: true,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: number];
  /** Émis lorsque la saisie ou les flèches voudraient passer sous `min` et que la valeur est ramenée au plancher. */
  blockedByMin: [];
  /** Émis lorsque la saisie ou les flèches voudraient passer au-dessus de `max` et que la valeur est ramenée au plafond. */
  blockedByMax: [];
  blur: [];
}>();

const attrs = useAttrs();

const focused = ref(false);
const text = ref('');
const inputEl = ref<HTMLInputElement | null>(null);

defineExpose({
  focus: () => inputEl.value?.focus(),
  select: () => {
    try {
      inputEl.value?.select();
    } catch {
      /* no-op */
    }
  },
});

function formatFromNumber(v: number): string {
  if (!Number.isFinite(v)) return '';
  if (props.mode === 'integer') {
    return String(Math.trunc(v));
  }
  return String(v).replace('.', ',');
}

function syncFromModel() {
  if (!focused.value && props.placeholder && props.modelValue === 0 && props.mode === 'decimal') {
    text.value = '';
    return;
  }
  text.value = formatFromNumber(props.modelValue);
}

/** True si le texte affiché correspond déjà au modèle (évite désync quand le parent change la période alors que l’input est focused). */
function textMatchesModel(): boolean {
  if (props.mode === 'integer') {
    const p = parseIntegerInput(text.value, Number.NaN);
    return Number.isFinite(p) && p === props.modelValue;
  }
  const p = parseDecimalInput(text.value, Number.NaN);
  return Number.isFinite(p) && Math.abs(p - props.modelValue) < 1e-6;
}

onMounted(() => {
  syncFromModel();
});

watch(
  () => props.modelValue,
  () => {
    if (!focused.value) {
      syncFromModel();
      return;
    }
    if (!textMatchesModel()) {
      syncFromModel();
    }
  },
);

watch(
  () => props.mode,
  () => {
    syncFromModel();
  },
);

function onFocus(ev: FocusEvent) {
  focused.value = true;
  if (props.selectOnFocus) {
    (ev.target as HTMLInputElement).select();
  }
}

function capInputLength(s: string): string {
  const maxLen = props.maxLength;
  if (maxLen !== undefined && maxLen > 0 && s.length > maxLen) {
    return s.slice(0, maxLen);
  }
  return s;
}

function onInput(ev: Event) {
  const raw = (ev.target as HTMLInputElement).value;
  const sanitized = capInputLength(
    props.mode === 'integer' ? sanitizeIntegerString(raw) : sanitizeDecimalString(raw),
  );
  text.value = sanitized;

  const parsed =
    props.mode === 'integer'
      ? parseIntegerInput(sanitized, Number.NaN)
      : parseDecimalInput(sanitized, Number.NaN);

  if (Number.isFinite(parsed)) {
    // Pas de min/max pendant la frappe (ex. « 2 » puis « 8 » → 28, sans passer par 18 ni 188).
    emit('update:modelValue', parsed);
  }
}

function onBlur() {
  focused.value = false;
  if (String(text.value).trim() === '') {
    if (props.placeholder && props.modelValue === 0) {
      text.value = '';
      emit('blur');
      return;
    }
    text.value = formatFromNumber(props.modelValue);
    emit('blur');
    return;
  }
  const parsed =
    props.mode === 'integer'
      ? parseIntegerInput(text.value, props.min ?? 0)
      : parseDecimalInput(text.value, 0);
  const clamped = clampNumber(parsed, props.min, props.max);
  if (props.min !== undefined && parsed < props.min && clamped === props.min) {
    emit('blockedByMin');
  }
  if (props.max !== undefined && parsed > props.max && clamped === props.max) {
    emit('blockedByMax');
  }
  emit('update:modelValue', clamped);
  text.value = formatFromNumber(clamped);
  emit('blur');
}

function getStepFromInput(): number {
  const explicit = Number.parseFloat(String(props.step ?? ''));
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const raw = String(text.value).replace(',', '.');
  const dec = raw.includes('.') ? (raw.split('.')[1] || '').length : 0;
  if (dec > 0) {
    return 10 ** -Math.min(dec, 4);
  }
  return 1;
}

function roundToStep(value: number, step: number): number {
  const precision = Math.min(6, Math.max(0, Math.ceil(-Math.log10(step || 1))));
  return Number(value.toFixed(precision));
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  e.preventDefault();
  const step = getStepFromInput();
  const base =
    props.mode === 'integer'
      ? parseIntegerInput(text.value, props.modelValue)
      : parseDecimalInput(text.value, props.modelValue);
  const dir = e.key === 'ArrowUp' ? 1 : -1;
  let next = roundToStep(base + dir * step, step);
  const beforeClamp = next;
  next = clampNumber(next, props.min, props.max);
  if (dir === -1 && props.min !== undefined && beforeClamp < props.min && next === props.min) {
    emit('blockedByMin');
  }
  if (dir === 1 && props.max !== undefined && beforeClamp > props.max && next === props.max) {
    emit('blockedByMax');
  }
  emit('update:modelValue', next);
  text.value = formatFromNumber(next);
  const el = e.target as HTMLInputElement;
  try {
    el.select();
  } catch {
    /* no-op */
  }
}
</script>

<template>
  <input
    ref="inputEl"
    v-bind="attrs"
    class="book-input"
    :value="text"
    type="text"
    :inputmode="mode === 'integer' ? 'numeric' : 'decimal'"
    :placeholder="placeholder"
    autocomplete="off"
    autocorrect="off"
    spellcheck="false"
    enterkeyhint="done"
    :data-numeric-input="mode"
    @focus="onFocus"
    @input="onInput"
    @blur="onBlur"
    @keydown="onKeydown"
  />
</template>
