import { describe, it, expect } from 'vitest';
import { resolveRef, computeElement, resolveBySubstitution, buildComputeContext } from '../engine';
import { type ComputeContext, type ElementDef, SEMANTIC_ID } from '../../types';

function makeCtx(overrides: Partial<ComputeContext> = {}): ComputeContext {
  return {
    state: {},
    tauxHoraire: 15,
    tauxHoraireBase: 14,
    baseSMH: 22000,
    salaireBase: 22000,
    pointTerritorial: 5.9,
    classe: 3,
    activityRate: 1,
    configValues: {},
    ...overrides,
  };
}

describe('resolveRef', () => {
  it('resolves constant ref', () => {
    expect(resolveRef({ ref: 'constant', value: 42 }, makeCtx())).toBe(42);
  });

  it('resolves context ref', () => {
    expect(resolveRef({ ref: 'context', key: 'tauxHoraire' }, makeCtx({ tauxHoraire: 12.5 }))).toBe(
      12.5,
    );
  });

  it('resolves state ref', () => {
    expect(
      resolveRef({ ref: 'state', key: 'heuresSup' }, makeCtx({ state: { heuresSup: 8 } })),
    ).toBe(8);
  });

  it('résout heuresSupTranche (tranche 25 plafonnée au seuil, 50 = reliquat)', () => {
    const seuil = 10;
    const ctx = makeCtx({ state: { heuresSup: 25 } });
    expect(
      resolveRef(
        {
          ref: 'heuresSupTranche',
          stateKeyHeures: 'heuresSup',
          seuilMensuel: seuil,
          tranche: '25',
        },
        ctx,
      ),
    ).toBe(10);
    expect(
      resolveRef(
        {
          ref: 'heuresSupTranche',
          stateKeyHeures: 'heuresSup',
          seuilMensuel: seuil,
          tranche: '50',
        },
        ctx,
      ),
    ).toBe(15);
  });

  it('resolves bareme ref with exact key', () => {
    const table = { 1: 1.45, 2: 1.6, 3: 1.75 };
    expect(resolveRef({ ref: 'bareme', table, lookupKey: 'classe' }, makeCtx({ classe: 2 }))).toBe(
      1.6,
    );
  });

  it('resolves bareme ref with interpolation', () => {
    const table = { 2: 0.02, 5: 0.05, 10: 0.1 };
    const ctx = makeCtx({ state: { anciennete: 7 } });
    expect(resolveRef({ ref: 'bareme', table, lookupKey: 'anciennete' }, ctx)).toBe(0.05);
  });

  it('résout bareme ancienneteAccordPrime avec plafond accord (clé = min(ancienneté, plafond))', () => {
    const table = { 2: 0.02, 10: 0.1, 25: 0.16 };
    const ctx = makeCtx({
      state: { anciennete: 30 },
      agreement: { anciennete: { plafond: 25 } },
    });
    expect(resolveRef({ ref: 'bareme', table, lookupKey: 'ancienneteAccordPrime' }, ctx)).toBe(
      0.16,
    );
  });

  it('résout accordInputOrState (accordInputs prioritaire)', () => {
    const ctx = makeCtx({
      state: {
        accordInputs: { heuresEquipe: 20 },
        heuresEquipe: 99,
      },
    });
    expect(resolveRef({ ref: 'accordInputOrState', key: 'heuresEquipe' }, ctx)).toBe(20);
  });

  it('postesXdureeXtaux avec prorataActivite applique activityRate', () => {
    const def: ElementDef = {
      id: 'pe',
      semanticId: SEMANTIC_ID.PRIME_EQUIPE,
      kind: 'prime',
      source: 'convention',
      valueKind: 'horaire',
      label: 'PE',
      stateKeyActif: 'travailEquipe',
      activation: { type: 'always' },
      computeMode: {
        mode: 'postesXdureeXtaux',
        postes: { ref: 'constant', value: 22 },
        dureeMinutes: { ref: 'constant', value: 30 },
        taux: { ref: 'constant', value: 10 },
        period: 'annual',
        prorataActivite: true,
      },
    };
    const ctx = makeCtx({ activityRate: 0.5, state: {} });
    const r = computeElement(def, ctx);
    // 11 postes × 0,5 h × 10 €/h × 12 mois
    expect(r.amount).toBe(660);
  });

  it('returns 0 for NaN values', () => {
    expect(resolveRef({ ref: 'constant', value: NaN }, makeCtx())).toBe(0);
  });
});

describe('computeElement', () => {
  it('returns 0 when element not activated', () => {
    const def: ElementDef = {
      id: 'test',
      semanticId: 'test',
      kind: 'prime',
      source: 'convention',
      valueKind: 'montant',
      label: 'Test',
      computeMode: {
        mode: 'montantFixe',
        montant: { ref: 'constant', value: 1000 },
        period: 'annual',
      },
      stateKeyActif: 'testActif',
    };
    const ctx = makeCtx({ state: { testActif: false } });
    const result = computeElement(def, ctx);
    expect(result.amount).toBe(0);
  });

  it('computes montantFixe correctly', () => {
    const def: ElementDef = {
      id: 'test',
      semanticId: 'test',
      kind: 'prime',
      source: 'convention',
      valueKind: 'montant',
      label: 'Test prime fixe',
      computeMode: {
        mode: 'montantFixe',
        montant: { ref: 'constant', value: 525 },
        period: 'annual',
      },
      activation: { type: 'always' },
    };
    const result = computeElement(def, makeCtx());
    expect(result.amount).toBe(525);
    expect(result.label).toBe('Test prime fixe');
  });

  it('guards against NaN/Infinity', () => {
    const def: ElementDef = {
      id: 'broken',
      semanticId: 'broken',
      kind: 'prime',
      source: 'convention',
      valueKind: 'montant',
      label: 'Broken',
      computeMode: { mode: 'custom', compute: () => Infinity },
      activation: { type: 'always' },
    };
    const result = computeElement(def, makeCtx());
    expect(result.amount).toBe(0);
    expect(Number.isFinite(result.amount)).toBe(true);
  });

  it('unitesXmontant forfaitAnnuel : roundToEuro(unites × montant) sans ×12', () => {
    const def: ElementDef = {
      id: 'inv',
      semanticId: SEMANTIC_ID.PRIME_INVENTION_BREVETABLE,
      kind: 'prime',
      source: 'convention',
      valueKind: 'montant',
      label: 'Inv',
      computeMode: {
        mode: 'unitesXmontant',
        unites: { ref: 'constant', value: 3 },
        montant: { ref: 'constant', value: 100 },
        period: 'annual',
        forfaitAnnuel: true,
      },
      activation: { type: 'always' },
    };
    expect(computeElement(def, makeCtx()).amount).toBe(300);
  });

  it('periodesIndemniteSmh : periodes × arrondi(coeff × tauxHoraireBase), puis ×12', () => {
    const def: ElementDef = {
      id: 'ast',
      semanticId: SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_REPOS_QUOTIDIEN,
      kind: 'prime',
      source: 'convention',
      valueKind: 'horaire',
      label: 'Ast',
      computeMode: {
        mode: 'periodesIndemniteSmh',
        periodes: { ref: 'constant', value: 2 },
        coefficientSmhParPeriode: 1,
        period: 'annual',
      },
      activation: { type: 'always' },
    };
    // tauxHoraireBase=14 → euro/période=14 → mensuel 28 → annuel 336
    expect(computeElement(def, makeCtx()).amount).toBe(336);
  });
});

describe('resolveBySubstitution', () => {
  const convDef: ElementDef = {
    id: 'majorationNuit',
    semanticId: SEMANTIC_ID.MAJORATION_NUIT,
    kind: 'majoration',
    source: 'convention',
    valueKind: 'pourcentage',
    label: 'Nuit CCN',
    computeMode: {
      mode: 'montantFixe',
      montant: { ref: 'constant', value: 500 },
      period: 'annual',
    },
    activation: { type: 'always' },
  };

  const accDef: ElementDef = {
    id: 'majorationNuit',
    semanticId: SEMANTIC_ID.MAJORATION_NUIT,
    kind: 'majoration',
    source: 'accord',
    valueKind: 'pourcentage',
    label: 'Nuit Accord',
    computeMode: {
      mode: 'montantFixe',
      montant: { ref: 'constant', value: 700 },
      period: 'annual',
    },
    activation: { type: 'always' },
    substitution: { semanticId: SEMANTIC_ID.MAJORATION_NUIT, strategy: 'favorPrinciple' },
  };

  it('selects more favorable with favorPrinciple', () => {
    const results = resolveBySubstitution([convDef], [accDef], makeCtx());
    expect(results).toHaveLength(1);
    expect(results[0]!.origin).toBe('accord');
    expect(results[0]!.result.amount).toBe(700);
  });

  it('selects convention when more favorable', () => {
    const weakAccord: ElementDef = {
      ...accDef,
      computeMode: {
        mode: 'montantFixe',
        montant: { ref: 'constant', value: 300 },
        period: 'annual',
      },
    };
    const results = resolveBySubstitution([convDef], [weakAccord], makeCtx());
    expect(results).toHaveLength(1);
    expect(results[0]!.origin).toBe('convention');
    expect(results[0]!.result.amount).toBe(500);
  });

  it('replaces convention with replaces strategy', () => {
    const replacingAccord: ElementDef = {
      ...accDef,
      computeMode: {
        mode: 'montantFixe',
        montant: { ref: 'constant', value: 300 },
        period: 'annual',
      },
      substitution: { semanticId: SEMANTIC_ID.MAJORATION_NUIT, strategy: 'replaces' },
    };
    const results = resolveBySubstitution([convDef], [replacingAccord], makeCtx());
    expect(results).toHaveLength(1);
    expect(results[0]!.origin).toBe('accord');
    expect(results[0]!.result.amount).toBe(300);
  });

  it('includes both with cumulative strategy', () => {
    const cumAccord: ElementDef = {
      ...accDef,
      computeMode: {
        mode: 'montantFixe',
        montant: { ref: 'constant', value: 200 },
        period: 'annual',
      },
      substitution: { semanticId: SEMANTIC_ID.MAJORATION_NUIT, strategy: 'cumulative' },
    };
    const results = resolveBySubstitution([convDef], [cumAccord], makeCtx());
    expect(results).toHaveLength(2);
    const total = results.reduce((s, r) => s + r.result.amount, 0);
    expect(total).toBe(700);
  });

  it('résout ifSuperiorToConvention quand le montant accord dépasse la convention (favorPrinciple)', () => {
    const convPrime: ElementDef = {
      id: 'primeAnciennete',
      semanticId: SEMANTIC_ID.PRIME_ANCIENNETE,
      kind: 'prime',
      source: 'convention',
      valueKind: 'pourcentage',
      label: 'Prime ancienneté CCN',
      computeMode: {
        mode: 'montantFixe',
        montant: { ref: 'constant', value: 400 },
        period: 'annual',
      },
      activation: { type: 'always' },
      inclusDansSMH: false,
    };
    const accPrime: ElementDef = {
      ...convPrime,
      id: 'primeAncienneteAccord',
      source: 'accord',
      label: 'Prime ancienneté accord',
      computeMode: {
        mode: 'montantFixe',
        montant: { ref: 'constant', value: 700 },
        period: 'annual',
      },
      inclusDansSMH: 'ifSuperiorToConvention',
      substitution: { semanticId: SEMANTIC_ID.PRIME_ANCIENNETE, strategy: 'favorPrinciple' },
    };
    const results = resolveBySubstitution([convPrime], [accPrime], makeCtx());
    expect(results).toHaveLength(1);
    expect(results[0]!.origin).toBe('accord');
    expect(results[0]!.result.inclusDansSMH).toBe(true);
  });

  it('résout ifSuperiorToConvention à false si accord non strictement supérieur (conditionalFavor)', () => {
    const convPrime: ElementDef = {
      id: 'primeAnciennete',
      semanticId: SEMANTIC_ID.PRIME_ANCIENNETE,
      kind: 'prime',
      source: 'convention',
      valueKind: 'pourcentage',
      label: 'Prime ancienneté CCN',
      computeMode: {
        mode: 'montantFixe',
        montant: { ref: 'constant', value: 500 },
        period: 'annual',
      },
      activation: { type: 'always' },
      inclusDansSMH: false,
    };
    const accPrime: ElementDef = {
      ...convPrime,
      id: 'primeAncienneteAccord',
      source: 'accord',
      computeMode: {
        mode: 'montantFixe',
        montant: { ref: 'constant', value: 500 },
        period: 'annual',
      },
      inclusDansSMH: 'ifSuperiorToConvention',
      substitution: { semanticId: SEMANTIC_ID.PRIME_ANCIENNETE, strategy: 'conditionalFavor' },
    };
    const results = resolveBySubstitution([convPrime], [accPrime], makeCtx());
    expect(results).toHaveLength(1);
    expect(results[0]!.origin).toBe('accord');
    expect(results[0]!.result.inclusDansSMH).toBe(false);
  });

  it('accord seul : ifSuperiorToConvention devient inclus si montant > 0 (référence conventionnelle 0)', () => {
    const accPrime: ElementDef = {
      id: 'primeAnciennete',
      semanticId: SEMANTIC_ID.PRIME_ANCIENNETE,
      kind: 'prime',
      source: 'accord',
      valueKind: 'pourcentage',
      label: 'Prime ancienneté accord',
      computeMode: {
        mode: 'montantFixe',
        montant: { ref: 'constant', value: 800 },
        period: 'annual',
      },
      activation: { type: 'always' },
      inclusDansSMH: 'ifSuperiorToConvention',
    };
    const results = resolveBySubstitution([], [accPrime], makeCtx());
    expect(results).toHaveLength(1);
    expect(results[0]!.result.inclusDansSMH).toBe(true);
  });
});

describe('buildComputeContext', () => {
  it('builds a valid context', () => {
    const state = { pointTerritorial: 5.9, anciennete: 5 };
    const ctx = buildComputeContext(state, 22000, 3);
    expect(ctx.baseSMH).toBe(22000);
    expect(ctx.classe).toBe(3);
    expect(ctx.pointTerritorial).toBe(5.9);
    expect(ctx.tauxHoraireBase).toBeGreaterThan(0);
    expect(ctx.tauxHoraire).toBeGreaterThan(0);
    expect(ctx.activityRate).toBe(1);
  });

  it('reduces activity rate for temps partiel', () => {
    const state = { pointTerritorial: 5.9, travailTempsPartiel: true, tauxActivite: 80 };
    const ctx = buildComputeContext(state, 22000, 3);
    expect(ctx.activityRate).toBeCloseTo(0.8, 2);
  });
});
