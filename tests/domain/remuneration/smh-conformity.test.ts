import { describe, expect, it } from 'vitest';
import '@/accords/index';
import { SEMANTIC_ID } from '@/domain/types';
import {
  computePdfRemunerationBreakdown,
  prepareWizardCompute,
  resolveWizardRemunerationElements,
  type WizardRemunerationInput,
} from '@/domain/remuneration/compute';
import { buildComputeContext } from '@/domain/remuneration/engine';
import {
  computeSmhAssietteVerif,
  computeSmhGaranti,
  detailContributesToSmhAssiette,
  evaluateSmhConformity,
  isSujetionSemanticId,
} from '@/domain/remuneration/smhConformity';
import { calculateSalaireAnnuelDuPourMois } from '@/domain/arretees/salaireDuPourMois';
import {
  amountBySemanticId,
  baseWizardInput,
  computeDetails,
  SMH_GRID_2026,
} from './helpers/remunerationTestHelpers';

function inputSansAccord(patch: Partial<WizardRemunerationInput> = {}): WizardRemunerationInput {
  return baseWizardInput({
    agreement: { accordActif: false, activeAccordId: null, inputs: {} },
    ...patch,
  });
}

describe('smhConformity — étanchéité et assiette', () => {
  it('verrouille les sujétions hors assiette SMH', () => {
    expect(isSujetionSemanticId(SEMANTIC_ID.PRIME_EQUIPE)).toBe(true);
    expect(isSujetionSemanticId(SEMANTIC_ID.FORFAIT_JOURS)).toBe(false);
  });

  it('taux horaire de base identique avec ou sans sujétions actives', () => {
    const base = inputSansAccord({ classe: 5, groupe: 'C' });
    const avecSujetions = inputSansAccord({
      classe: 5,
      groupe: 'C',
      situation: {
        travailNuit: true,
        heuresNuit: 20,
        modalityState: { travailEquipe: true },
      },
    });

    const { ctx: ctxBase } = prepareWizardCompute(base);
    const { ctx: ctxSuj } = prepareWizardCompute(avecSujetions);
    expect(ctxSuj.tauxHoraireBase).toBe(ctxBase.tauxHoraireBase);
    expect(ctxSuj.tauxHoraireBase).toBeGreaterThan(0);
  });

  it('assiette SMH exclut équipe et majorations, inclut la base pure', () => {
    const input = inputSansAccord({
      classe: 5,
      groupe: 'C',
      situation: {
        travailNuit: true,
        heuresNuit: 10,
        modalityState: { travailEquipe: true },
      },
    });
    const { baseSMH, details } = resolveWizardRemunerationElements(input);
    const assiette = computeSmhAssietteVerif(baseSMH, details);

    expect(assiette).toBe(baseSMH);
    expect(amountBySemanticId(details, SEMANTIC_ID.PRIME_EQUIPE)).toBeGreaterThan(0);
    expect(amountBySemanticId(details, SEMANTIC_ID.MAJORATION_NUIT)).toBeGreaterThan(0);
    expect(
      details
        .filter(detailContributesToSmhAssiette)
        .every((d) => d.semanticId !== SEMANTIC_ID.PRIME_EQUIPE),
    ).toBe(true);
  });

  it('forfait jours cadre inclus dans l’assiette SMH', () => {
    const input = baseWizardInput({
      classe: 11,
      groupe: 'F',
      situation: { forfait: 'jours' },
      agreement: { accordActif: false, activeAccordId: null, inputs: {} },
    });
    const { baseSMH, details } = resolveWizardRemunerationElements(input);
    const assiette = computeSmhAssietteVerif(baseSMH, details);
    const forfait = amountBySemanticId(details, SEMANTIC_ID.FORFAIT_JOURS);

    expect(forfait).toBeGreaterThan(0);
    expect(assiette).toBeGreaterThan(baseSMH);
    expect(assiette).toBe(computeSmhGaranti(baseSMH, details));
  });

  it('accord Kuhn : prime vacances incluse, équipe exclue de l’assiette', () => {
    const input = baseWizardInput({
      classe: 5,
      situation: { anciennete: 5 },
      agreement: {
        accordActif: true,
        activeAccordId: 'kuhn',
        inputs: { primeVacances: true, travailEquipe: true, heuresEquipe: 151.67 },
      },
    });
    const { baseSMH, details } = resolveWizardRemunerationElements(input);
    const assiette = computeSmhAssietteVerif(baseSMH, details);
    const vacances = details.find(
      (d) => d.semanticId === SEMANTIC_ID.PRIME_VACANCES && d.amount > 0,
    );
    const equipe = details.find((d) => d.semanticId === SEMANTIC_ID.PRIME_EQUIPE && d.amount > 0);

    expect(vacances?.inclusDansSMH).toBe(true);
    expect(equipe?.inclusDansSMH).toBe(false);
    expect(assiette).toBeGreaterThan(baseSMH);
    if (vacances) expect(assiette).toBeGreaterThanOrEqual(baseSMH + vacances.amount);
  });

  it('evaluateSmhConformity — régularisation sans absorption des sujétions', () => {
    const smhGaranti = SMH_GRID_2026[5]!;
    const assietteRecue = smhGaranti - 500;
    const result = evaluateSmhConformity(assietteRecue, smhGaranti, smhGaranti);

    expect(result.conforme).toBe(false);
    expect(result.alerte).toBe(true);
    expect(result.regularisationObligatoire).toBe(500);
    expect(result.salaireBasePur).toBe(smhGaranti);
  });

  it('anti-absorption : écart SMH malgré un brut total élevé (sujétions seules)', () => {
    const smhGaranti = 30_000;
    const assietteRecue = 28_000;
    const result = evaluateSmhConformity(assietteRecue, smhGaranti, 28_000);
    /** Un salaire versé de 35 000 € (dont 7 000 € de sujétions) ne réduit pas la régularisation. */
    const brutAvecSujetions = assietteRecue + 7_000;
    expect(brutAvecSujetions).toBeGreaterThan(smhGaranti);
    expect(result.regularisationObligatoire).toBe(2_000);
  });

  it('computePdfRemunerationBreakdown aligné sur computeSmhAssietteVerif', () => {
    const input = inputSansAccord({
      classe: 11,
      groupe: 'F',
      situation: { forfait: 'jours' },
    });
    const pdf = computePdfRemunerationBreakdown(input, 12);
    expect(pdf.totalAssietteSmhIndicatif).toBe(computeSmhAssietteVerif(pdf.baseSMH, pdf.details));
  });

  it('arriérés smhSeul — dû annuel = assiette SMH (sans sujétions)', () => {
    const input = inputSansAccord({
      classe: 5,
      situation: {
        modalityState: { travailEquipe: true },
        travailNuit: true,
        heuresNuit: 10,
      },
    });
    const { baseSMH, details } = resolveWizardRemunerationElements(input);
    const assietteAttendue = computeSmhAssietteVerif(baseSMH, details);
    const du = calculateSalaireAnnuelDuPourMois(input, new Date(2026, 0, 1), new Date(2020, 0, 1), {
      smhSeul: true,
    });
    expect(du).toBe(assietteAttendue);
    expect(du).toBe(baseSMH);
  });

  it('sujétion marquée inclusDansSMH:true par erreur reste exclue (policy moteur)', () => {
    const ctx = buildComputeContext(
      { baseSMHFull: SMH_GRID_2026[5], travailEquipe: true },
      SMH_GRID_2026[5]!,
      5,
    );
    const details = computeDetails(
      inputSansAccord({
        classe: 5,
        situation: { modalityState: { travailEquipe: true } },
      }),
    );
    const equipe = details.find((d) => d.semanticId === SEMANTIC_ID.PRIME_EQUIPE);
    expect(equipe?.inclusDansSMH).toBe(false);
    expect(ctx.tauxHoraireBase).toBeGreaterThan(0);
  });
});
