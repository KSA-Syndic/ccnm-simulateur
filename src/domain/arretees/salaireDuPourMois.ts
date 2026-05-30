import type { Agreement } from '../agreements/interface';
import { getAccordElementDefsForRemuneration } from '../agreements/accord-element-defs';
import {
  computeAnnualRemunerationFromWizardStores,
  prepareWizardCompute,
  resolveWizardRemunerationElements,
  type WizardComputeOverrides,
  type WizardRemunerationInput,
} from '../remuneration/compute';
import { computeElement } from '../remuneration/engine';
import type { ComputeContext, ElementDef } from '../types';
import { computeMensuelDueProfile } from './mensuelDue';
import { computeSalaireProrataEntree } from '../utils/date';
import { roundToEuro } from '../utils/rounding';

/** Ancienneté en années complètes à la date du mois (depuis l'embauche). */
export function ancienneteAnneesPourMois(dateMois: Date, dateEmbauche: Date): number {
  const ms = (dateMois.getTime() - dateEmbauche.getTime()) / ((365.25 * 24 * 60 * 60 * 1000) / 12);
  return Math.max(0, Math.floor(ms / 12));
}

export function getAccordMontantPrimeDefs(agreement: Agreement): ElementDef[] {
  return getAccordElementDefsForRemuneration(agreement).filter((d) => d.valueKind === 'montant');
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

function montantAnnuelAssietteSmh(
  input: WizardRemunerationInput,
  overrides?: WizardComputeOverrides,
): number {
  const resolved = resolveWizardRemunerationElements(input, overrides);
  const inSmhSum = resolved.details
    .filter((d) => d.amount > 0 && d.inclusDansSMH === true)
    .reduce((s, d) => s + d.amount, 0);
  return roundToEuro(resolved.baseSMH + inSmhSum);
}

/** Salaire annuel dû pour un mois (référence année civile + ancienneté à cette date). */
export function calculateSalaireAnnuelDuPourMois(
  input: WizardRemunerationInput,
  dateMois: Date,
  dateEmbauche: Date,
  options: { smhSeul: boolean },
): number {
  const year = dateMois.getFullYear();
  const anciennete = ancienneteAnneesPourMois(dateMois, dateEmbauche);
  const computeOverrides: WizardComputeOverrides = { referenceYear: year, anciennete };

  if (options.smhSeul) {
    return montantAnnuelAssietteSmh(input, computeOverrides);
  }
  return computeAnnualRemunerationFromWizardStores(input, computeOverrides).total;
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
    agreement: Agreement | null;
  },
): SalaireMensuelDuCalcule {
  const [yStr, mStr] = params.periodKey.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const dateMois = new Date(year, month - 1, 1);
  const emb = new Date(params.dateEmbauche);
  const anciennete = ancienneteAnneesPourMois(dateMois, emb);
  const computeOverrides: WizardComputeOverrides = { referenceYear: year, anciennete };

  const { ctx, accDoc } = prepareWizardCompute(input, computeOverrides);
  const agreement = params.agreement ?? accDoc;
  const accordDefs = agreement ? getAccordMontantPrimeDefs(agreement) : [];
  const moisVersement13e = agreement?.repartition13Mois?.moisVersement ?? 11;
  const estMois13eMois = month === moisVersement13e && !!agreement?.repartition13Mois?.actif;

  const salaireAnnuelDuMois = calculateSalaireAnnuelDuPourMois(input, dateMois, emb, {
    smhSeul: params.smhSeul,
  });

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
  const estPremierMois =
    dateMois.getFullYear() === emb.getFullYear() && dateMois.getMonth() === emb.getMonth();
  if (estPremierMois) {
    const dernierJourMois = new Date(year, month, 0);
    salaireMensuelDu = computeSalaireProrataEntree(salaireMensuelDu, emb, dernierJourMois);
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
