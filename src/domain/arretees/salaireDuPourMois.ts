import { getMois13eVersement, type Agreement } from '../agreements/interface';
import {
  annualTotalFromResolved,
  getAccordDefsForRemuneration,
  prepareWizardCompute,
  resolvePreparedRemunerationElements,
  resolveWizardRemunerationElements,
  type WizardComputeOverrides,
  type WizardRemunerationInput,
  type WizardRemunerationResolved,
} from '../remuneration/compute';
import { computeElement } from '../remuneration/engine';
import type { ComputeContext, ElementDef } from '../types';
import { computeMensuelDueProfile } from './mensuelDue';
import { computeSalaireProrataPeriode } from '../utils/date';
import { roundToEuro } from '../utils/rounding';
import { computeSmhAssietteVerif } from '../remuneration/smhConformity';

/** Ancienneté en années complètes à la date du mois (depuis l'embauche). */
export function ancienneteAnneesPourMois(dateMois: Date, dateEmbauche: Date): number {
  const ms = (dateMois.getTime() - dateEmbauche.getTime()) / ((365.25 * 24 * 60 * 60 * 1000) / 12);
  return Math.max(0, Math.floor(ms / 12));
}

export function getAccordMontantPrimeDefs(agreement: Agreement): ElementDef[] {
  return getAccordDefsForRemuneration(agreement).filter((d) => d.valueKind === 'montant');
}

/** Libellés des primes accord versées un mois donné (pour détail arriérés). */
export function libellesPrimesVerseesCeMois(
  accordDefs: ElementDef[],
  ctx: ComputeContext,
  mois: number,
  options: { smhOnly?: boolean } = {},
): string[] {
  if (!mois || mois < 1 || mois > 12) return [];
  let defs = accordDefs.filter(
    (d) => d.valueKind === 'montant' && Number(d.config?.['moisVersement'] ?? 0) === mois,
  );
  if (options.smhOnly) defs = defs.filter((d) => d.inclusDansSMH === true);
  const out: string[] = [];
  for (const def of defs) {
    const r = computeElement(def, ctx);
    if (r.amount > 0) {
      const lab = String(r.label || def.label || '')
        .replace(/\s*\(.*$/, '')
        .trim();
      if (lab) out.push(lab);
    }
  }
  return out;
}

/** Surcharges moteur d'un mois d'arriérés : grille de l'année, point à date, ancienneté à date. */
function computeOverridesPourMois(dateMois: Date, dateEmbauche: Date): WizardComputeOverrides {
  return {
    referenceYear: dateMois.getFullYear(),
    referenceDate: dateMois,
    anciennete: ancienneteAnneesPourMois(dateMois, dateEmbauche),
  };
}

/** Dû annuel : assiette SMH seule, ou rémunération annuelle complète. */
function salaireAnnuelDu(resolved: WizardRemunerationResolved, smhSeul: boolean): number {
  return smhSeul
    ? computeSmhAssietteVerif(resolved.baseSMH, resolved.details)
    : annualTotalFromResolved(resolved);
}

/** Salaire annuel dû pour un mois (référence année civile + ancienneté à cette date). */
export function calculateSalaireAnnuelDuPourMois(
  input: WizardRemunerationInput,
  dateMois: Date,
  dateEmbauche: Date,
  options: { smhSeul: boolean },
): number {
  const resolved = resolveWizardRemunerationElements(
    input,
    computeOverridesPourMois(dateMois, dateEmbauche),
    { tooltips: false },
  );
  return salaireAnnuelDu(resolved, options.smhSeul);
}

export interface SalaireMensuelDuCalcule {
  salaireMensuelDu: number;
  mensuelDuBase: number;
  primesVerseesCeMois: number;
  primesVerseesLabels: string[];
  estMois13eMois: boolean;
}

/** Dû mensuel pour la frise arriérés (courbe + détail). */
export function calculateSalaireMensuelDuPourPeriode(
  input: WizardRemunerationInput,
  params: {
    periodKey: string;
    dateEmbauche: string;
    nbMois: number;
    smhSeul: boolean;
    /** Date de rupture du contrat (`YYYY-MM-DD`) : le mois de rupture est proratisé. */
    dateRupture?: string | null;
  },
): SalaireMensuelDuCalcule {
  const [yStr, mStr] = params.periodKey.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const dateMois = new Date(year, month - 1, 1);
  const emb = new Date(params.dateEmbauche);

  const prepared = prepareWizardCompute(input, computeOverridesPourMois(dateMois, emb));
  const { ctx, accDoc: agreement } = prepared;
  const accordDefs = agreement ? getAccordMontantPrimeDefs(agreement) : [];
  const moisVersement13e = getMois13eVersement(agreement);
  const estMois13eMois = month === moisVersement13e && !!agreement?.repartition13Mois?.actif;

  const salaireAnnuelDuMois = salaireAnnuelDu(
    resolvePreparedRemunerationElements(input, prepared, { tooltips: false }),
    params.smhSeul,
  );

  const dueProfile = computeMensuelDueProfile({
    salaireAnnuelDuMois,
    ctx,
    accordDefs,
    agreement,
    smhSeul: params.smhSeul,
    month,
    nbMois: params.nbMois,
  });

  let salaireMensuelDu = dueProfile.salaireMensuelDuFinal;
  const memeMois = (d: Date) => d.getFullYear() === year && d.getMonth() === month - 1;
  const estPremierMois = memeMois(emb);
  const rupture = params.dateRupture ? new Date(params.dateRupture) : null;
  const estMoisRupture = rupture != null && !Number.isNaN(rupture.getTime()) && memeMois(rupture);
  if (estPremierMois || estMoisRupture) {
    const debut = estPremierMois ? emb : dateMois;
    const fin = estMoisRupture ? rupture : new Date(year, month, 0);
    salaireMensuelDu = computeSalaireProrataPeriode(salaireMensuelDu, debut, fin);
  }

  const primesVerseesLabels = libellesPrimesVerseesCeMois(accordDefs, ctx, month, {
    smhOnly: params.smhSeul,
  });

  return {
    salaireMensuelDu: roundToEuro(salaireMensuelDu),
    mensuelDuBase: dueProfile.mensuelDuBase,
    primesVerseesCeMois: dueProfile.primesVerseesCeMois,
    primesVerseesLabels,
    estMois13eMois,
  };
}
