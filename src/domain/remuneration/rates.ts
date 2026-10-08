import { CONFIG } from '../config';
import { clampNumber } from '../input/numericSanitize';
import { toFiniteNumber as toFinite } from '../utils/rounding';

/** Taux d'activité (0–1) : 1 à temps plein ; à temps partiel, taux borné à [TAUX_ACTIVITE_MIN, MAX]. */
export function resolveActivityRate(tempsPartiel: boolean, tauxActivite: unknown): number {
  if (!tempsPartiel) return 1;
  const raw = Number(tauxActivite);
  const pct = Number.isFinite(raw)
    ? clampNumber(raw, CONFIG.TAUX_ACTIVITE_MIN, CONFIG.TAUX_ACTIVITE_MAX)
    : CONFIG.TAUX_ACTIVITE_DEFAUT;
  return pct / 100;
}

export function getSmhHourlyBaseRate(
  smhAnnual: number,
  options: { nbMois?: number; activityRate?: number; heuresMensuellesBase?: number } = {},
): number {
  const annual = toFinite(smhAnnual, 0);
  if (!(annual > 0)) return 0;
  const nbMois = toFinite(options.nbMois, 12) || 12;
  const activityRate = toFinite(options.activityRate, 1);
  const heuresMensuellesBase =
    toFinite(options.heuresMensuellesBase, CONFIG.DUREE_LEGALE_HEURES_MOIS) ||
    CONFIG.DUREE_LEGALE_HEURES_MOIS;
  const heuresMensuellesRef = heuresMensuellesBase * activityRate;
  if (!(nbMois > 0) || !(heuresMensuellesRef > 0)) return 0;
  return annual / nbMois / heuresMensuellesRef;
}

export function getSmhDailyBaseRate(
  smhAnnual: number,
  options: { activityRate?: number; joursRefAnnuel?: number } = {},
): number {
  const annual = toFinite(smhAnnual, 0);
  if (!(annual > 0)) return 0;
  const activityRate = toFinite(options.activityRate, 1);
  const joursRefAnnuel =
    (toFinite(options.joursRefAnnuel, CONFIG.FORFAIT_JOURS_REFERENCE) ||
      CONFIG.FORFAIT_JOURS_REFERENCE) * activityRate;
  if (!(joursRefAnnuel > 0)) return 0;
  return annual / joursRefAnnuel;
}
