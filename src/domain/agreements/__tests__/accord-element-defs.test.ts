import { describe, it, expect, beforeAll } from 'vitest';
import '../../../accords/kuhn';
import { getAgreement } from '../registry';
import { getAccordElementDefsForRemuneration } from '../accord-element-defs';
import { getAllConventionDefs } from '../../convention/catalog';
import {
  buildComputeContext,
  resolveBySubstitution,
  computeElement,
} from '../../remuneration/engine';
import { CONFIG } from '../../config';
import { annualFromMonthly, roundToCents } from '../../utils/rounding';

beforeAll(() => {
  expect(getAgreement('kuhn')).not.toBeNull();
});

describe('getAccordElementDefsForRemuneration', () => {
  it('produit une prime ancienneté substituable et des primes catalogue', () => {
    const ag = getAgreement('kuhn')!;
    const defs = getAccordElementDefsForRemuneration(ag);
    const anciennete = defs.find((d) => d.semanticId === 'primeAnciennete');
    expect(anciennete?.substitution?.strategy).toBe('favorPrinciple');
    expect(anciennete?.computeMode).toMatchObject({
      mode: 'pourcentageXbase',
      period: 'annual',
    });
    expect(defs.some((d) => d.id === 'primeEquipe')).toBe(true);
    const equipe = defs.find((d) => d.id === 'primeEquipe');
    expect(equipe?.substitution?.strategy).toBe('replaces');
    expect(equipe?.computeMode).toMatchObject({ mode: 'unitesXmontant', period: 'annual' });
  });

  it('prime équipe accord (Kuhn) : unitesXmontant aligné legacy (151,67 h × 0,86 €/h)', () => {
    const ag = getAgreement('kuhn')!;
    const def = getAccordElementDefsForRemuneration(ag).find((d) => d.id === 'primeEquipe');
    expect(def).toBeDefined();
    const rawSmh = CONFIG.SMH[5] ?? 35200;
    const ctx = buildComputeContext(
      {
        baseSMHFull: rawSmh,
        accordInputs: { travailEquipe: true, heuresEquipe: 151.67 },
        typeNuit: 'aucun',
        anciennete: 5,
        pointTerritorial: 5.9,
        forfait: '35h',
        travailNuit: false,
        heuresNuit: 0,
        travailDimanche: false,
        heuresDimanche: 0,
        travailHeuresSup: false,
        heuresSup: 0,
        travailTempsPartiel: false,
        tauxActivite: 100,
        experiencePro: 0,
        travailJoursSupForfait: false,
        joursSupForfait: 0,
      },
      rawSmh,
      5,
      ag as unknown as Record<string, unknown>,
    );
    const attendu = annualFromMonthly(roundToCents(151.67 * 0.86));
    expect(computeElement(def!, ctx).amount).toBe(attendu);
  });

  it('prime équipe accord inactive si travail équipe faux', () => {
    const ag = getAgreement('kuhn')!;
    const def = getAccordElementDefsForRemuneration(ag).find((d) => d.id === 'primeEquipe');
    const rawSmh = CONFIG.SMH[5] ?? 35200;
    const ctx = buildComputeContext(
      {
        baseSMHFull: rawSmh,
        accordInputs: { travailEquipe: false, heuresEquipe: 151.67 },
        typeNuit: 'aucun',
        anciennete: 5,
        pointTerritorial: 5.9,
        forfait: '35h',
        travailNuit: false,
        heuresNuit: 0,
        travailDimanche: false,
        heuresDimanche: 0,
        travailHeuresSup: false,
        heuresSup: 0,
        travailTempsPartiel: false,
        tauxActivite: 100,
        experiencePro: 0,
        travailJoursSupForfait: false,
        joursSupForfait: 0,
      },
      rawSmh,
      5,
      ag as unknown as Record<string, unknown>,
    );
    expect(computeElement(def!, ctx).amount).toBe(0);
  });

  it('prime vacances Kuhn : montantFixe 525 € si ancienneté ≥ 1 an, 0 sinon', () => {
    const ag = getAgreement('kuhn')!;
    const def = getAccordElementDefsForRemuneration(ag).find((d) => d.id === 'primeVacances');
    expect(def?.computeMode).toMatchObject({ mode: 'montantFixe', period: 'annual' });
    const rawSmh = CONFIG.SMH[5] ?? 35200;
    const stateBase = {
      baseSMHFull: rawSmh,
      accordInputs: {},
      typeNuit: 'aucun',
      pointTerritorial: 5.9,
      forfait: '35h',
      travailNuit: false,
      heuresNuit: 0,
      travailDimanche: false,
      heuresDimanche: 0,
      travailHeuresSup: false,
      heuresSup: 0,
      travailTempsPartiel: false,
      tauxActivite: 100,
      experiencePro: 0,
      travailJoursSupForfait: false,
      joursSupForfait: 0,
    };
    const ctxOk = buildComputeContext(
      { ...stateBase, anciennete: 3 },
      rawSmh,
      5,
      ag as unknown as Record<string, unknown>,
    );
    expect(computeElement(def!, ctxOk).amount).toBe(525);
    const ctxKo = buildComputeContext(
      { ...stateBase, anciennete: 0 },
      rawSmh,
      5,
      ag as unknown as Record<string, unknown>,
    );
    expect(computeElement(def!, ctxKo).amount).toBe(0);
  });

  it('majoration nuit poste matin Kuhn : heures × taux horaire × 15 % (annuel)', () => {
    const ag = getAgreement('kuhn')!;
    const def = getAccordElementDefsForRemuneration(ag).find(
      (d) => d.id === 'majorationNuitPosteMatin',
    );
    expect(def?.computeMode).toMatchObject({
      mode: 'heuresXtaux',
      period: 'annual',
      majorationSeule: true,
    });
    const rawSmh = CONFIG.SMH[5] ?? 35200;
    const ctx = buildComputeContext(
      {
        baseSMHFull: rawSmh,
        accordInputs: { majorationNuitPosteMatin: true, heuresMajorationNuitPosteMatin: 8 },
        typeNuit: 'aucun',
        anciennete: 5,
        pointTerritorial: 5.9,
        forfait: '35h',
        travailNuit: false,
        heuresNuit: 0,
        travailDimanche: false,
        heuresDimanche: 0,
        travailHeuresSup: false,
        heuresSup: 0,
        travailTempsPartiel: false,
        tauxActivite: 100,
        experiencePro: 0,
        travailJoursSupForfait: false,
        joursSupForfait: 0,
      },
      rawSmh,
      5,
      ag as unknown as Record<string, unknown>,
    );
    const attendu = annualFromMonthly(roundToCents(8 * ctx.tauxHoraire * 0.15));
    expect(computeElement(def!, ctx).amount).toBe(attendu);
  });

  it('résout une prime ancienneté accord > CCN avec contexte type legacy', () => {
    const ag = getAgreement('kuhn')!;
    const accordDefs = getAccordElementDefsForRemuneration(ag);
    const convDefs = getAllConventionDefs();
    const rawSmh = CONFIG.SMH[5] ?? 35200;
    const ctx = buildComputeContext(
      {
        baseSMHFull: rawSmh,
        accordInputs: {},
        typeNuit: 'aucun',
        anciennete: 5,
        pointTerritorial: 5.9,
        forfait: '35h',
        travailNuit: false,
        heuresNuit: 0,
        travailDimanche: false,
        heuresDimanche: 0,
        travailHeuresSup: false,
        heuresSup: 0,
        travailTempsPartiel: false,
        tauxActivite: 100,
        experiencePro: 0,
        travailJoursSupForfait: false,
        joursSupForfait: 0,
      },
      rawSmh,
      5,
      ag as unknown as Record<string, unknown>,
    );
    const resolved = resolveBySubstitution(convDefs, accordDefs, ctx);
    const primeAnc = resolved.filter((r) => r.result.semanticId === 'primeAnciennete');
    expect(primeAnc.length).toBe(1);
    expect(primeAnc[0]!.result.amount).toBeGreaterThan(0);
    expect(primeAnc[0]!.origin).toBe('accord');
  });
});
