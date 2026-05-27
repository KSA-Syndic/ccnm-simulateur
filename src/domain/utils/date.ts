import { CONFIG } from '../config';

/** Année minimale pour une date d'embauche (rejette les années à 2 chiffres type 0020). */
export const HIRE_DATE_MIN_YEAR = 1950;

/**
 * Date ISO (AAAA-MM-JJ) complète et crédible — à utiliser avant d'afficher la courbe ou d'ouvrir la saisie.
 * Ne pas se fier au seul format : une saisie partielle peut produire 0020-01-01.
 */
export function isCompleteIsoDateString(
  v: string,
  options?: { minYear?: number; maxYear?: number },
): boolean {
  const trimmed = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;

  const parts = trimmed.split('-');
  const y = Number.parseInt(parts[0] ?? '', 10);
  const m = Number.parseInt(parts[1] ?? '', 10);
  const d = Number.parseInt(parts[2] ?? '', 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;

  const minYear = options?.minYear ?? HIRE_DATE_MIN_YEAR;
  const maxYear = options?.maxYear ?? new Date().getFullYear() + 1;
  if (y < minYear || y > maxYear) return false;

  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return false;

  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function getJoursOuvresReference(): number {
  return CONFIG.JOURS_OUVRES_CCN;
}

export function getWorkingDaysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  if (start.getTime() > end.getTime()) return 0;
  let count = 0;
  const d = new Date(start);
  while (d.getTime() <= end.getTime()) {
    const day = d.getDay();
    if (day >= 1 && day <= 5) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export function computeSalaireProrataEntree(
  salaireMensuelComplet: number,
  dateDebutTravail: Date,
  dernierJourMois: Date,
): number {
  const joursOuvres = getWorkingDaysBetween(dateDebutTravail, dernierJourMois);
  const joursRef = getJoursOuvresReference();
  if (joursRef <= 0) return salaireMensuelComplet;
  if (joursOuvres >= joursRef) return salaireMensuelComplet;
  return salaireMensuelComplet * (joursOuvres / joursRef);
}
