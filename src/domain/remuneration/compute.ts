import { CONFIG } from '../config';
import { getActiveClassification, isCadre } from '../classification/engine';
import { getAgreement } from '../agreements/registry';
import type { Agreement } from '../agreements/interface';
import { getAccordElementDefsForRemuneration } from '../agreements/accord-element-defs';
import { getAccordMajorationDefsForRemuneration } from '../agreements/accord-majoration-defs';
import { getAllConventionDefs } from '../convention/catalog';
import { applyAccordPrimeRateOverridesFromSituation } from './accordRateOverrides';
import { applyNationalPrimeOverridesToConventionDefs } from './nationalOverrides';
import { aggregateRemunerationDetails, type AggregatedRemuneration } from './aggregate';
import { enrichResolvedElementsTooltips } from '../tooltip/resultElementTooltips';
import { buildComputeContext, resolveBySubstitution } from './engine';
import { getSmhForClasse } from './smh';
import { roundHourlyRate, roundToEuro } from '../utils/rounding';
import type { ComputeContext, ElementResult } from '../types';

/** Résultat aligné sur `calculateAnnualRemuneration` legacy (mode `full`) — champs utilisés par l’UI / parité. */
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
  /** Surcharges barèmes nationaux (legacy `state.nationalPrimeOverrides`). */
  nationalPrimeOverrides?: Record<string, unknown>;
  /** Activation / quantités modalités nationales « Autres » (legacy `accordInputs`). */
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
  if (
    (classe === 11 || classe === 12) &&
    (Number(experiencePro) || 0) < CONFIG.BAREME_DEBUTANTS_SEUIL_EXP_PRO
  )
    return 'cadre-debutant';
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
  const rate = input.situation.tempsPartiel ? input.situation.tauxActivite / 100 : 1;
  const baseSMHFull = roundToEuro(rawSmh);
  const baseSMH = roundToEuro(rawSmh * rate);

  const accDoc =
    input.agreement.accordActif && input.agreement.activeAccordId
      ? getAgreement(input.agreement.activeAccordId)
      : null;

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

/** Agrégat + libellés inclus/exclus SMH pour l’annexe PDF (moteur TS). */
export interface PdfRemunerationBreakdown extends WizardRemunerationResolved {
  agg: AggregatedRemuneration;
  /** Base conventionnelle + éléments dont `inclusDansSMH === true` (indicatif). */
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
  const inSmhSum = resolved.details
    .filter((d) => d.amount > 0 && d.inclusDansSMH === true)
    .reduce((s, d) => s + d.amount, 0);
  return {
    ...resolved,
    agg,
    totalAssietteSmhIndicatif: roundToEuro(resolved.baseSMH + inSmhSum),
    inclusSmhLabels: uniqueLabelsForFilter(
      resolved.details,
      (d) => d.amount > 0 && d.inclusDansSMH === true,
    ),
    exclusSmhLabels: uniqueLabelsForFilter(
      resolved.details,
      (d) => d.amount > 0 && d.inclusDansSMH !== true,
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

/** État legacy minimal pour tests de parité / round-trip (cf. `legacy-archive/core/state.js`). */
export function buildLegacyRemunerationState(input: {
  modeManuel: boolean;
  groupeManuel: string;
  classeManuel: number;
  scoresSix: number[];
  anciennete: number;
  pointTerritorial: number;
  travailTempsPartiel: boolean;
  tauxActivite: number;
  forfait: '35h' | 'heures' | 'jours';
  experiencePro: number;
  typeNuit?: string;
  heuresNuit: number;
  travailDimanche: boolean;
  heuresDimanche: number;
  travailHeuresSup: boolean;
  heuresSup: number;
  travailJoursSupForfait: boolean;
  joursSupForfait: number;
  accordActif: boolean;
  accordInputs: Record<string, unknown>;
  nationalPrimeOverrides?: Record<string, unknown>;
}): Record<string, unknown> {
  const pt =
    input.pointTerritorial > 0 ? input.pointTerritorial : CONFIG.POINT_TERRITORIAL.valeurDefaut;
  return {
    modeManuel: input.modeManuel,
    groupeManuel: input.groupeManuel || 'A',
    classeManuel: input.classeManuel || 1,
    scores: input.scoresSix,
    anciennete: input.anciennete,
    pointTerritorial: pt,
    travailTempsPartiel: input.travailTempsPartiel,
    tauxActivite: input.tauxActivite,
    forfait: input.forfait,
    experiencePro: input.experiencePro,
    typeNuit: input.typeNuit ?? 'aucun',
    heuresNuit: input.heuresNuit,
    travailDimanche: input.travailDimanche,
    heuresDimanche: input.heuresDimanche,
    travailHeuresSup: input.travailHeuresSup,
    heuresSup: input.heuresSup,
    travailJoursSupForfait: input.travailJoursSupForfait,
    joursSupForfait: input.joursSupForfait,
    accordActif: input.accordActif,
    accordInputs: {
      primeVacances: false,
      travailEquipe: false,
      heuresEquipe: 151.67,
      ...input.accordInputs,
    },
    nationalPrimeOverrides: input.nationalPrimeOverrides ?? {},
  };
}

export function scoresArrayFromWizardScores(scores: Record<string, number>): number[] {
  return CONFIG.CRITERES.map((c) => scores[c.id] ?? 1);
}

export function wizardScoresFromLegacyArray(scoresSix: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  CONFIG.CRITERES.forEach((c, i) => {
    out[c.id] = scoresSix[i] ?? 1;
  });
  return out;
}

/** Reconstruit l'entrée wizard/situation depuis un état legacy (tests de parité round-trip). */
export function wizardStoresInputFromLegacyState(
  state: Record<string, unknown>,
): WizardRemunerationInput {
  const scoresSix = (state.scores as number[]) ?? [1, 1, 1, 1, 1, 1];
  const national = state.nationalPrimeOverrides as Record<string, unknown> | undefined;
  const modeManuel = state.modeManuel === true;
  const active = getActiveClassification({
    modeManuel,
    groupeManuel: String(state.groupeManuel ?? 'A'),
    classeManuel: Number(state.classeManuel ?? 1),
    scores: scoresSix,
  });
  return {
    mode: modeManuel ? 'manual' : 'estimation',
    groupe: active.groupe,
    classe: active.classe,
    scores: wizardScoresFromLegacyArray(scoresSix),
    situation: {
      anciennete: Number(state.anciennete ?? 0),
      pointTerritorial: Number(state.pointTerritorial ?? CONFIG.POINT_TERRITORIAL.valeurDefaut),
      tempsPartiel: state.travailTempsPartiel === true,
      tauxActivite: Number(state.tauxActivite ?? 100),
      forfait: (state.forfait as '35h' | 'heures' | 'jours') ?? '35h',
      experiencePro: Number(state.experiencePro ?? 0),
      travailNuit:
        state.travailNuit === true ||
        (typeof state.typeNuit === 'string' && state.typeNuit !== '' && state.typeNuit !== 'aucun'),
      heuresNuit: Number(state.heuresNuit ?? 0),
      travailDimanche: state.travailDimanche === true,
      heuresDimanche: Number(state.heuresDimanche ?? 0),
      travailHeuresSup: state.travailHeuresSup === true,
      heuresSup: Number(state.heuresSup ?? 0),
      travailJoursSupForfait: state.travailJoursSupForfait === true,
      joursSupForfait: Number(state.joursSupForfait ?? 0),
      ...(national && Object.keys(national).length > 0 ? { nationalPrimeOverrides: national } : {}),
    },
    agreement: {
      accordActif: state.accordActif === true,
      activeAccordId: (state.accordId as string | null) ?? null,
      inputs: (state.accordInputs as Record<string, unknown>) ?? {},
    },
  };
}
