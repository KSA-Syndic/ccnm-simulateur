/**
 * Adaptateurs de fixtures : les profils de `profils-remuneration.json` décrivent un état « à plat »
 * (mode manuel, scores des 6 critères, situation, accord) converti ici en `WizardRemunerationInput`.
 */
import { CONFIG } from '../../src/domain/config';
import { getActiveClassification } from '../../src/domain/classification/engine';
import type { WizardRemunerationInput } from '../../src/domain/remuneration/compute';

/** Construit un état de fixture au format des profils JSON (`profils-remuneration.json`). */
export function buildFixtureState(input: {
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

export function wizardScoresFromSixCriteria(scoresSix: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  CONFIG.CRITERES.forEach((c, i) => {
    out[c.id] = scoresSix[i] ?? 1;
  });
  return out;
}

/** Reconstruit l’entrée wizard / situation à partir d’un état de fixture. */
export function wizardStoresInputFromFixtureState(
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
    scores: wizardScoresFromSixCriteria(scoresSix),
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
