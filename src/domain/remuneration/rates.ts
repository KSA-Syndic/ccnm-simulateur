import { CONFIG } from '../config';

function toFinite(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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
    toFinite(options.heuresMensuellesBase, CONFIG.DUREE_LEGALE_HEURES_MOIS) || 151.67;
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
    (toFinite(options.joursRefAnnuel, CONFIG.FORFAIT_JOURS_REFERENCE) || 218) * activityRate;
  if (!(joursRefAnnuel > 0)) return 0;
  return annual / joursRefAnnuel;
}
