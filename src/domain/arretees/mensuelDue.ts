import type { Agreement } from '../agreements/interface';
import type { ElementDef } from '../types';
import type { ComputeContext } from '../types';
import {
  getMontantPrimesFixesAnnuel,
  getMontantPrimesVerseesCeMois,
} from '../remuneration/primes-fixes';
import { roundToEuro } from '../utils/rounding';

export interface MensuelDueProfile {
  mensuelDuBase: number;
  primesFixesAnnuel: number;
  primesVerseesCeMois: number;
  salaireMensuelDuFinal: number;
}

/**
 * Répartition mensuelle du dû (13e mois, primes à mois fixe) — aligné `ArreteesCalculator.computeMensuelDueProfile`.
 */
export function computeMensuelDueProfile(params: {
  salaireAnnuelDuMois: number;
  ctx: ComputeContext;
  accordDefs: ElementDef[];
  agreement: Agreement | null;
  smhSeul: boolean;
  month: number;
  nbMois: number;
}): MensuelDueProfile {
  const { salaireAnnuelDuMois, ctx, accordDefs, agreement, smhSeul, month, nbMois } = params;
  const moisVersement13e = agreement?.repartition13Mois?.moisVersement ?? 11;
  const estMois13eMois = month === moisVersement13e;
  const repartition13Active = !!(agreement?.repartition13Mois?.actif && nbMois === 13);
  const isSmhOnly = smhSeul === true;

  const primesFixesAnnuel = agreement
    ? getMontantPrimesFixesAnnuel(accordDefs, ctx, { smhOnly: isSmhOnly })
    : 0;
  const baseAnnuellePourRepartition = salaireAnnuelDuMois - primesFixesAnnuel;

  let mensuelDuBase = 0;
  if (repartition13Active) {
    mensuelDuBase = estMois13eMois
      ? roundToEuro((baseAnnuellePourRepartition / 13) * 2)
      : roundToEuro(baseAnnuellePourRepartition / 13);
  } else {
    mensuelDuBase = roundToEuro(baseAnnuellePourRepartition / 12);
  }

  const primesVerseesCeMois = agreement
    ? getMontantPrimesVerseesCeMois(accordDefs, ctx, month, { smhOnly: isSmhOnly })
    : 0;

  return {
    mensuelDuBase,
    primesFixesAnnuel,
    primesVerseesCeMois,
    salaireMensuelDuFinal: roundToEuro(mensuelDuBase + primesVerseesCeMois),
  };
}
