import { roundToCents } from './rounding';

const FR = 'fr-FR';
const NBSP_REGEX = /\u202f/g;

export function formatEurosDetail(amount: number): string {
  const n = roundToCents(amount);
  return new Intl.NumberFormat(FR, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(n)
    .replace(NBSP_REGEX, ' ');
}

export function formatHeuresDetail(heures: number): string {
  const n = Math.round((Number(heures) || 0) * 100) / 100;
  return new Intl.NumberFormat(FR, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
    .format(n)
    .replace(NBSP_REGEX, ' ');
}

export function formatMoney(amount: number): string {
  const n = Math.round(Number(amount));
  const s = new Intl.NumberFormat(FR, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(n);
  return s.replace(NBSP_REGEX, ' ') + ' €';
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHTML(str: unknown): string {
  const s = typeof str === 'string' ? str : String(str);
  return s.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}

export function formatEuro(amount: number): string {
  return formatMoney(amount);
}

export function formatEuroMensuel(amount: number): string {
  return formatMoney(amount);
}

export function formatNumberFr(value: number, decimals = 0): string {
  return new Intl.NumberFormat(FR, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
    .format(value)
    .replace(NBSP_REGEX, ' ');
}
