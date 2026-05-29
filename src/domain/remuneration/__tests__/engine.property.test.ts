import { describe, it, expect } from 'vitest';
import { fc, test as fcTest } from '@fast-check/vitest';
import { computeElement, buildComputeContext, resolveBySubstitution } from '../engine';
import { roundToCents, roundToEuro, annualFromMonthly } from '../../utils/rounding';
import { type ElementDef, type ComputeContext, SEMANTIC_ID } from '../../types';

// Arbitrary generators for domain inputs

const arbClasse = fc.integer({ min: 1, max: 18 });
const arbSMH = fc.double({ min: 20000, max: 100000, noNaN: true });
const arbMontant = fc.double({ min: -1_000_000, max: 1_000_000, noNaN: true });

function makeCtx(overrides: Partial<ComputeContext> = {}): ComputeContext {
  return {
    baseSMH: 25000,
    classe: 5,
    tauxHoraireBase: 10.0,
    salaireBase: 25000,
    pointTerritorial: 5.9,
    activityRate: 1.0,
    state: {},
    configValues: {},
    ...overrides,
  };
}

function makeDef(overrides: Partial<ElementDef> = {}): ElementDef {
  return {
    id: 'test-prop',
    semanticId: SEMANTIC_ID.PRIME_ANCIENNETE,
    kind: 'prime',
    source: 'convention',
    label: 'Test property',
    valueKind: 'montant',
    inclusDansSMH: false,
    computeMode: {
      mode: 'montantFixe',
      montant: { ref: 'constant', value: 100 },
      period: 'annual',
    },
    ...overrides,
  } as ElementDef;
}

describe('Property-based tests — engine', () => {
  // P1: computeElement always returns finite amount
  fcTest.prop([arbMontant])('computeElement always returns finite amount', (montant) => {
    const def = makeDef({
      computeMode: {
        mode: 'montantFixe',
        montant: { ref: 'constant', value: montant },
        period: 'annual',
      },
    });
    const ctx = makeCtx();
    const result = computeElement(def, ctx);
    expect(Number.isFinite(result.amount)).toBe(true);
  });

  // P2: roundToCents is idempotent
  fcTest.prop([arbMontant])('roundToCents is idempotent', (n) => {
    const once = roundToCents(n);
    const twice = roundToCents(once);
    expect(once).toBe(twice);
  });

  // P3: roundToEuro is idempotent
  fcTest.prop([arbMontant])('roundToEuro is idempotent', (n) => {
    const once = roundToEuro(n);
    const twice = roundToEuro(once);
    expect(once).toBe(twice);
  });

  // P4: annualFromMonthly = roundToCents(12 × mensuel)
  fcTest.prop([fc.double({ min: 0, max: 100000, noNaN: true })])(
    'annualFromMonthly equals cent rounding of 12x monthly',
    (monthly) => {
      const annual = annualFromMonthly(monthly);
      expect(Number.isFinite(annual)).toBe(true);
      expect(Math.abs(annual - monthly * 12)).toBeLessThanOrEqual(0.005);
    },
  );

  // P5: buildComputeContext always produces valid context
  fcTest.prop([arbClasse, arbSMH])('buildComputeContext produces valid context', (classe, smh) => {
    const ctx = buildComputeContext({}, smh, classe);
    expect(Number.isFinite(ctx.baseSMH)).toBe(true);
    expect(Number.isFinite(ctx.tauxHoraireBase)).toBe(true);
    expect(Number.isFinite(ctx.activityRate)).toBe(true);
    expect(ctx.activityRate).toBeGreaterThan(0);
    expect(ctx.activityRate).toBeLessThanOrEqual(1);
  });

  // P6: Inactive element always returns 0
  it('inactive element returns zero amount', () => {
    fc.assert(
      fc.property(arbMontant, (montant) => {
        const def = makeDef({
          stateKeyActif: 'someFlag',
          computeMode: {
            mode: 'montantFixe',
            montant: { ref: 'constant', value: montant },
            period: 'annual',
          },
        });
        const ctx = makeCtx({ state: { someFlag: false } });
        const result = computeElement(def, ctx);
        return result.amount === 0;
      }),
    );
  });

  // P7: heuresXtaux with zero hours = zero amount
  it('heuresXtaux with zero hours gives zero', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100, noNaN: true }),
        fc.double({ min: 0.01, max: 100, noNaN: true }),
        (taux, base) => {
          const def = makeDef({
            computeMode: {
              mode: 'heuresXtaux',
              heures: { ref: 'constant', value: 0 },
              taux: { ref: 'constant', value: taux },
              base: { ref: 'constant', value: base },
              period: 'monthly',
            },
          });
          const result = computeElement(def, makeCtx());
          return result.amount === 0;
        },
      ),
    );
  });

  // P8: resolveBySubstitution never drops both sides when both exist and amounts are positive
  it('resolveBySubstitution produces at least one result when conv and accord match', () => {
    const convDef = makeDef({ semanticId: SEMANTIC_ID.PRIME_ANCIENNETE, source: 'convention' });
    const accDef = makeDef({
      semanticId: SEMANTIC_ID.PRIME_ANCIENNETE,
      source: 'accord',
      substitution: { semanticId: SEMANTIC_ID.PRIME_ANCIENNETE, strategy: 'favorPrinciple' },
    });
    const ctx = makeCtx();
    const results = resolveBySubstitution([convDef], [accDef], ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});
