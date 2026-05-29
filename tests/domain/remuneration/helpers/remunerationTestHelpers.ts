import { CONFIG } from '@/domain/config';
import { getSmhGridAnnual, getSmhForClasse } from '@/domain/remuneration/smh';
import { getSmhHourlyBaseRate } from '@/domain/remuneration/rates';
import {
  resolveWizardRemunerationElements,
  type WizardRemunerationInput,
} from '@/domain/remuneration/compute';
import type { ElementResult } from '@/domain/types';
import { roundHourlyRate, roundToCents } from '@/domain/utils/rounding';
import { annualFromMonthly } from '@/domain/utils/rounding';

export const YEAR_REF = CONFIG.CURRENT_DATA_YEAR;
export const POINT_TERRITORIAL_REF = CONFIG.POINT_TERRITORIAL.valeurDefaut;
export const HEURES_MOIS_REF = CONFIG.DUREE_LEGALE_HEURES_MOIS;

/** Grille SMH 2026 (source : `CONFIG.SMH_BY_YEAR`). */
export const SMH_GRID_2026: Record<number, number> = CONFIG.SMH_BY_YEAR[YEAR_REF]!;

export function tauxHoraireSmhAnnuel(smhAnnuel: number): number {
  return roundHourlyRate(getSmhHourlyBaseRate(smhAnnuel, { nbMois: 12, activityRate: 1 }));
}

export function smhMensuelDepuisAnnuel(smhAnnuel: number): number {
  return roundToCents(smhAnnuel / 12);
}

export function baseWizardInput(
  patch: Partial<WizardRemunerationInput> & {
    situation?: Partial<WizardRemunerationInput['situation']>;
    agreement?: Partial<WizardRemunerationInput['agreement']>;
  } = {},
): WizardRemunerationInput {
  const { situation: sitPatch, agreement: agrPatch, ...rest } = patch;
  return {
    mode: 'manual',
    groupe: 'A',
    classe: 1,
    scores: {},
    situation: {
      anciennete: 0,
      pointTerritorial: POINT_TERRITORIAL_REF,
      tempsPartiel: false,
      tauxActivite: 100,
      forfait: '35h',
      experiencePro: 0,
      travailNuit: false,
      heuresNuit: 0,
      travailDimanche: false,
      heuresDimanche: 0,
      travailHeuresSup: false,
      heuresSup: 0,
      travailJoursSupForfait: false,
      joursSupForfait: 0,
      nationalPrimeOverrides: {},
      modalityState: {},
      ...sitPatch,
    },
    agreement: {
      accordActif: false,
      activeAccordId: null,
      inputs: {},
      ...agrPatch,
    },
    ...rest,
  };
}

export function computeDetails(input: WizardRemunerationInput): ElementResult[] {
  return resolveWizardRemunerationElements(input).details;
}

export function amountBySemanticId(details: ElementResult[], semanticId: string): number {
  return details.find((d) => d.semanticId === semanticId)?.amount ?? 0;
}

export function amountByLabelIncludes(details: ElementResult[], fragment: string): number {
  const f = fragment.toLowerCase();
  return details.find((d) => d.label.toLowerCase().includes(f))?.amount ?? 0;
}

/** Prime ancienneté CCNM (non-cadre) — formule catalogue. */
export function primeAncienneteConventionAnnuelle(params: {
  classe: number;
  anciennete: number;
  pointTerritorial?: number;
  activityRate?: number;
}): number {
  const { classe, anciennete } = params;
  const point = params.pointTerritorial ?? POINT_TERRITORIAL_REF;
  const prorata = params.activityRate ?? 1;
  const plafond = CONFIG.ANCIENNETE.plafond;
  const annees = Math.min(anciennete, plafond);
  const tauxClasse = CONFIG.TAUX_ANCIENNETE[classe] ?? 0;
  const mensuel = point * tauxClasse * annees * prorata;
  return annualFromMonthly(mensuel);
}

/** Prime équipe CCNM — 22 postes × 30 min × taux SMH (défaut CONFIG). */
export function primeEquipeConventionAnnuelle(tauxSmhHoraire: number, postes?: number): number {
  const n = postes ?? CONFIG.PRIME_EQUIPE_POSTES_MENSUELS_DEFAUT;
  const heuresParPoste = CONFIG.PRIME_EQUIPE_MINUTES_PAR_POSTE / 60;
  const mensuel = n * heuresParPoste * tauxSmhHoraire;
  return annualFromMonthly(mensuel);
}

/** Habillage — 0,5 h SMH / semaine converties en mensuel (catalogue). */
export function primeHabillageConventionAnnuelle(tauxSmhHoraire: number): number {
  const heuresParSemaine = CONFIG.CCNM_CONTREPARTIES_ORGANISATION.habillageHeuresSMHParSemaine;
  const unitesMensuelles = heuresParSemaine * (52 / 12);
  const mensuel = unitesMensuelles * tauxSmhHoraire;
  return annualFromMonthly(mensuel);
}

/** Astreinte disponibilité — coefficient × taux horaire base × périodes / mois. */
export function astreintePeriodesAnnuelle(
  tauxSmhHoraire: number,
  periodesParMois: number,
  coefficient: number,
): number {
  const mensuel = periodesParMois * coefficient * tauxSmhHoraire;
  return annualFromMonthly(mensuel);
}

export function totalAnnuelBrut(details: ElementResult[], baseSmh: number): number {
  const extras = details
    .filter((d) => d.amount > 0 && d.inclusDansSMH !== true)
    .reduce((s, d) => s + d.amount, 0);
  const inSmh = details
    .filter((d) => d.amount > 0 && d.inclusDansSMH === true)
    .reduce((s, d) => s + d.amount, 0);
  return roundToCents(baseSmh + inSmh + extras);
}

export const GROUPE_PAR_CLASSE: Record<number, string> = (() => {
  const out: Record<number, string> = {};
  for (const [g, classes] of Object.entries(CONFIG.GROUPE_CLASSES)) {
    for (const c of classes) {
      out[c] = g;
    }
  }
  return out;
})();

/** Barème SMH annuel attendu (grille ou débutant F11/F12). */
export function smhAnnuelAttendu(classe: number, experiencePro = 0): number {
  return getSmhForClasse(classe, YEAR_REF, experiencePro);
}
