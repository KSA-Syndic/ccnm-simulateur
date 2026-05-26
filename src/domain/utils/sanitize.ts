export function sanitizeDecimalString(str: string): string {
  return str.replace(/[^0-9.,\-]/g, '').replace(',', '.');
}

export function parseDecimalInput(value: string, fallback = 0): number {
  const sanitized = sanitizeDecimalString(value);
  const n = Number(sanitized);
  return Number.isFinite(n) ? n : fallback;
}
