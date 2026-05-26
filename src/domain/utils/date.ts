import { CONFIG } from '../config';

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
