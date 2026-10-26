import { roundToCents, roundToEuro } from '../utils/rounding';

const FR = 'fr-FR';
const NBSP_REGEX = /\u202f/g;

const EUROS_DETAIL_FORMAT = new Intl.NumberFormat(FR, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const EUROS_ENTIERS_FORMAT = new Intl.NumberFormat(FR, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  useGrouping: true,
});

export function formatEurosDetail(amount: number): string {
  return EUROS_DETAIL_FORMAT.format(roundToCents(amount)).replace(NBSP_REGEX, ' ');
}

/** Affichage en euros entiers : plafond sur le montant ramené au centime. */
export function formatMoney(amount: number): string {
  return EUROS_ENTIERS_FORMAT.format(roundToEuro(amount)).replace(NBSP_REGEX, ' ') + ' €';
}

/** Format décimal fixe `fr-FR` (virgule), sans séparateur de milliers ; `'0'` si non fini. */
export function formatFrDecimalFixed(value: unknown, digits = 2): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return n.toFixed(digits).replace('.', ',');
}

/** Taux d'activité affiché (ex. `80` → `80`, `62.5` → `62,5`) : au plus 2 décimales, sans zéros inutiles. */
export function formatTauxActivite(taux: number): string {
  return String(Math.round(taux * 100) / 100).replace('.', ',');
}

/** Comme `formatFrDecimalFixed`, sans décimales pour une valeur entière, 2 sinon. */
export function formatFrDecimalAuto(value: unknown): string {
  const n = Number(value);
  return formatFrDecimalFixed(n, n % 1 === 0 ? 0 : 2);
}

/**
 * Montants dans les infobulles de détail (taux, mensualités estimées, sous-totaux) :
 * deux décimales pour refléter les montants réellement pris en compte, sans l’arrondi entier du résumé principal.
 */
export function formatMoneyTooltipDetail(amount: number): string {
  return `${formatEurosDetail(amount)} €`;
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
