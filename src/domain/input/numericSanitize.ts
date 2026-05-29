/**
 * Sanitize robuste des champs numériques (virgule et point).
 * Normalisation des chaînes décimales saisies (virgule / point, espaces).
 */
export function sanitizeDecimalString(value: string | number | null | undefined): string {
  const raw = String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/,/g, '.');
  if (!raw) return '';
  let out = '';
  let hasDot = false;
  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') {
      out += ch;
      continue;
    }
    if (ch === '.' && !hasDot) {
      hasDot = true;
      out += ch;
    }
  }
  if (out.startsWith('.')) out = `0${out}`;
  return out;
}

export function sanitizeIntegerString(value: string | number | null | undefined): string {
  let out = '';
  for (const ch of String(value ?? '').replace(/\s+/g, '')) {
    if (ch >= '0' && ch <= '9') out += ch;
  }
  return out;
}

export function parseDecimalInput(value: string, fallback = 0): number {
  const normalized = sanitizeDecimalString(value);
  if (!normalized || normalized === '.') return fallback;
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : fallback;
}

export function parseIntegerInput(value: string, fallback = 0): number {
  const s = sanitizeIntegerString(value);
  if (!s) return fallback;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function clampNumber(n: number, min?: number, max?: number): number {
  let x = n;
  if (min !== undefined && Number.isFinite(min)) x = Math.max(min, x);
  if (max !== undefined && Number.isFinite(max)) x = Math.min(max, x);
  return x;
}
