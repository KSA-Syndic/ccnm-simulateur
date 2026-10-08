import { CONFIG } from '../config';
import { getActiveClassification, isCadre } from '../classification/engine';
import { resolveActiveAgreement } from '../agreements/registry';
import type { Agreement } from '../agreements/interface';
import { getAccordElementDefsForRemuneration } from '../agreements/accord-element-defs';
import { getAccordMajorationDefsForRemuneration } from '../agreements/accord-majoration-defs';
import { getAllConventionDefs } from '../convention/catalog';
import { applyAccordPrimeRateOverridesFromSituation } from './accordRateOverrides';
import { applyNationalPrimeOverridesToConventionDefs } from './nationalOverrides';
import { aggregateRemunerationDetails, type AggregatedRemuneration } from './aggregate';
import { enrichResolvedElementsTooltips } from '../tooltip/resultElementTooltips';
import { buildComputeContext, resolveBySubstitution } from './engine';
import { getSmhForClasse, isBaremeDebutantApplicable } from './smh';
import { resolveActivityRate } from './rates';
import { roundHourlyRate, roundToCents } from '../utils/rounding';
import { computeSmhAssietteVerif, detailContributesToSmhAssiette } from './smhConformity';
import type { ComputeContext, ElementResult } from '../types';

/** Résultat agrégé du calcul annuel (mode complet) — champs exposés à l’UI et aux tests. */
export interface AnnualRemunerationSummary {
  scenario: string;
  baseSMH: number;
  total: number;
  details: Array<Record<string, unknown>>;
  isCadre: boolean;
  groupe: string;
  classe: number;
}

export type WizardSituationInput = {
  anciennete: number;
  pointTerritorial: number;
  tempsPartiel: boolean;
  tauxActivite: number;
  forfait: '35h' | 'heures' | 'jours';
  experiencePro: number;
  travailNuit: boolean;
  heuresNuit: number;
  travailDimanche: boolean;
  heuresDimanche: number;
  travailHeuresSup: boolean;
  heuresSup: number;
  travailJoursSupForfait: boolean;
  joursSupForfait: number;
  /** Surcharges des barèmes nationaux (état formulaire). */
  nationalPrimeOverrides?: Record<string, unknown>;
  /** Activation / quantités des modalités nationales « Autres ». */
  modalityState?: Record<string, boolean | number>;
};

export type WizardAgreementInput = {
  accordActif: boolean;
  activeAccordId: string | null;
  inputs: Record<string, unknown>;
};

export type WizardRemunerationInput = {
  mode: 'estimation' | 'manual';
  groupe: string;
  classe: number;
  scores: Record<string, number>;
  situation: WizardSituationInput;
  agreement: WizardAgreementInput;
};

/** Surcharges pour un mois d'arriérés (année grille SMH, ancienneté à date). */
export type WizardComputeOverrides = {
  referenceYear?: number;
  anciennete?: number;
};

export function resolveScenario(classe: number, experiencePro: number): string {
  if (!isCadre(classe)) return 'non-cadre';
  if (isBaremeDebutantApplicable(classe, experiencePro)) return 'cadre-debutant';
  return 'cadre';
}

/** Résolution moteur (détail des éléments) — mutualisée PDF / résumé annuel. */
export interface WizardRemunerationResolved {
  active: { groupe: string; classe: number };
  scenario: string;
  baseSMH: number;
  accDoc: Agreement | null;
  details: ElementResult[];
}

interface WizardComputePrepared {
  active: { groupe: string; classe: number };
  baseSMH: number;
  state: Record<string, unknown>;
  ctx: ComputeContext;
  accDoc: Agreement | null;
}

export function prepareWizardCompute(
  input: WizardRemunerationInput,
  overrides?: WizardComputeOverrides,
): WizardComputePrepared {
  const active =
    input.mode === 'manual'
      ? { groupe: input.groupe, classe: input.classe }
      : getActiveClassification({
          modeManuel: false,
          groupeManuel: input.groupe,
          classeManuel: input.classe,
          scores: scoresArrayFromWizardScores(input.scores),
        });

  const refYear = overrides?.referenceYear;
  const rawSmh = getSmhForClasse(active.classe, refYear, input.situation.experiencePro);
  const rate = resolveActivityRate(input.situation.tempsPartiel, input.situation.tauxActivite);
  const baseSMHFull = roundToCents(rawSmh);
  const baseSMH = roundToCents(rawSmh * rate);

  const accDoc = resolveActiveAgreement(input.agreement);

  const modalityState = input.situation.modalityState ?? {};
  const anciennete =
    overrides?.anciennete !== undefined ? overrides.anciennete : input.situation.anciennete;
  const state: Record<string, unknown> = {
    baseSMHFull,
    accordInputs: {
      ...input.agreement.inputs,
      ...modalityState,
    },
    typeNuit: input.situation.travailNuit ? 'poste-nuit' : 'aucun',
    anciennete,
    pointTerritorial: input.situation.pointTerritorial,
    forfait: input.situation.forfait,
    travailNuit: input.situation.travailNuit,
    heuresNuit: input.situation.heuresNuit,
    travailDimanche: input.situation.travailDimanche,
    heuresDimanche: input.situation.heuresDimanche,
    travailHeuresSup: input.situation.travailHeuresSup,
    heuresSup: input.situation.heuresSup,
    travailTempsPartiel: input.situation.tempsPartiel,
    tauxActivite: input.situation.tempsPartiel ? input.situation.tauxActivite : 100,
    experiencePro: input.situation.experiencePro,
    travailJoursSupForfait: input.situation.travailJoursSupForfait,
    joursSupForfait: input.situation.joursSupForfait,
    nationalPrimeOverrides: input.situation.nationalPrimeOverrides ?? {},
  };

  const ctx = buildComputeContext(
    state,
    baseSMH,
    active.classe,
    accDoc ? (accDoc as unknown as Record<string, unknown>) : undefined,
  );

  return { active, baseSMH, state, ctx, accDoc };
}

/** Taux horaire SMH de base (affiché par défaut pour les taux optionnels « Autres »). */
export function resolveWizardTauxHoraireBase(input: WizardRemunerationInput): number {
  return roundHourlyRate(prepareWizardCompute(input).ctx.tauxHoraireBase);
}

export function resolveWizardRemunerationElements(
  input: WizardRemunerationInput,
  overrides?: WizardComputeOverrides,
): WizardRemunerationResolved {
  const { active, baseSMH, state, ctx, accDoc } = prepareWizardCompute(input, overrides);

  const convDefs = applyNationalPrimeOverridesToConventionDefs(getAllConventionDefs(), state);
  const accordDefsRaw = accDoc
    ? [
        ...getAccordMajorationDefsForRemuneration(accDoc),
        ...getAccordElementDefsForRemuneration(accDoc),
      ]
    : [];
  const accordDefs = applyAccordPrimeRateOverridesFromSituation(
    accordDefsRaw,
    state.nationalPrimeOverrides as Record<string, unknown>,
  );
  const resolved = resolveBySubstitution(convDefs, accordDefs, ctx);
  const details = enrichResolvedElementsTooltips(resolved, ctx, accDoc);

  return {
    active,
    scenario: resolveScenario(active.classe, input.situation.experiencePro),
    baseSMH,
    accDoc,
    details,
  };
}

function uniqueLabelsForFilter(
  details: ElementResult[],
  pred: (d: ElementResult) => boolean,
): string[] {
  const out: string[] = [];
  for (const d of details) {
    if (!pred(d)) continue;
    const lab = d.label?.trim();
    if (!lab || out.includes(lab)) continue;
    out.push(lab);
  }
  return out;
}

/** Agrégat + libellés inclus/exclus SMH pour l’annexe PDF (moteur TS). @see `smhAssiettePolicy.ts` */
export interface PdfRemunerationBreakdown extends WizardRemunerationResolved {
  agg: AggregatedRemuneration;
  /** Base conventionnelle + éléments dont `inclusDansSMH === true` (rémunération du travail / paramétrage). */
  totalAssietteSmhIndicatif: number;
  inclusSmhLabels: string[];
  exclusSmhLabels: string[];
}

export function computePdfRemunerationBreakdown(
  input: WizardRemunerationInput,
  nbMois: number,
): PdfRemunerationBreakdown {
  const resolved = resolveWizardRemunerationElements(input);
  const agg = aggregateRemunerationDetails(resolved.details, resolved.baseSMH, nbMois);
  const totalAssietteSmhIndicatif = roundToCents(
    computeSmhAssietteVerif(resolved.baseSMH, resolved.details),
  );
  return {
    ...resolved,
    agg,
    totalAssietteSmhIndicatif,
    inclusSmhLabels: uniqueLabelsForFilter(resolved.details, detailContributesToSmhAssiette),
    exclusSmhLabels: uniqueLabelsForFilter(
      resolved.details,
      (d) => d.amount > 0 && !detailContributesToSmhAssiette(d),
    ),
  };
}

/**
 * Rémunération annuelle (mode full) via le moteur domaine TS — aligné `ResultDetails` / `aggregateRemunerationDetails`.
 * Le total annuel ne dépend pas du lissage 12/13 mois (`nbMois` fixé à 12 pour l’agrégat mensuel affiché ailleurs).
 */
export function computeAnnualRemunerationFromWizardStores(
  input: WizardRemunerationInput,
  overrides?: WizardComputeOverrides,
): AnnualRemunerationSummary {
  const { active, scenario, baseSMH, details } = resolveWizardRemunerationElements(
    input,
    overrides,
  );
  const agg = aggregateRemunerationDetails(details, baseSMH, 12);

  return {
    scenario,
    baseSMH: agg.baseSMH,
    total: agg.totalAnnual,
    details: [],
    isCadre: isCadre(active.classe),
    groupe: active.groupe,
    classe: active.classe,
  };
}

export function scoresArrayFromWizardScores(scores: Record<string, number>): number[] {
  return CONFIG.CRITERES.map((c) => scores[c.id] ?? 1);
}
