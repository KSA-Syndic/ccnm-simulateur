import { describe, expect, it } from 'vitest';
import '@/accords';
import { getAgreement } from '@/domain/agreements/registry';
import { getAccordElementDefsForRemuneration } from '@/domain/agreements/accord-element-defs';
import { getAccordMajorationDefsForRemuneration } from '@/domain/agreements/accord-majoration-defs';
import { getConventionPrimeDefs, getConventionMajorationDefs } from '@/domain/convention/catalog';
import { buildComputeContext, computeElement } from '@/domain/remuneration/engine';
import { enrichResolvedElementsTooltips } from '@/domain/tooltip/resultElementTooltips';
import { SEMANTIC_ID } from '@/domain/types';

describe('resultElementTooltips', () => {
  const baseCtx = buildComputeContext(
    {
      anciennete: 5,
      pointTerritorial: 5.9,
      typeNuit: 'poste-nuit',
      heuresNuit: 20,
      heuresSup: 20,
      travailHeuresSup: true,
    },
    21_980,
    1,
  );

  it('prime ancienneté convention — infobulle avec point, ancienneté et montants', () => {
    const def = getConventionPrimeDefs().find(
      (d) => d.semanticId === SEMANTIC_ID.PRIME_ANCIENNETE,
    )!;
    const result = computeElement(def, baseCtx);
    expect(result.amount).toBeGreaterThan(0);
    const [enriched] = enrichResolvedElementsTooltips(
      [{ result, def, origin: 'convention' }],
      baseCtx,
      null,
    );
    expect(enriched.tooltip).toBeTruthy();
    expect(enriched.tooltip).toContain('Point territorial');
    expect(enriched.tooltip).toContain('5 ans');
    expect(enriched.tooltip).toContain('1,45');
  });

  it('majoration nuit — infobulle avec heures et majoration', () => {
    const def = getConventionMajorationDefs().find(
      (d) => d.semanticId === SEMANTIC_ID.MAJORATION_NUIT,
    )!;
    const result = computeElement(def, baseCtx);
    expect(result.amount).toBeGreaterThan(0);
    const [enriched] = enrichResolvedElementsTooltips(
      [{ result, def, origin: 'convention' }],
      baseCtx,
      null,
    );
    expect(enriched.tooltip).toContain('Heures de nuit');
    expect(enriched.tooltip).toContain('15 %');
  });

  it('majoration nuit accord Kuhn — titre entreprise, référence CCNM, taux accord', () => {
    const agreement = getAgreement('kuhn');
    expect(agreement).toBeTruthy();
    const ctx = buildComputeContext(
      {
        typeNuit: 'poste-nuit',
        heuresNuit: 15,
        pointTerritorial: 5.9,
        anciennete: 2,
      },
      21_980,
      5,
      agreement as never,
    );
    const def = getAccordMajorationDefsForRemuneration(agreement!).find(
      (d) => d.semanticId === SEMANTIC_ID.MAJORATION_NUIT,
    )!;
    const result = computeElement(def, ctx);
    expect(result.amount).toBeGreaterThan(0);
    const [enriched] = enrichResolvedElementsTooltips(
      [{ result, def, origin: 'accord' }],
      ctx,
      agreement!,
    );
    expect(enriched.tooltip).toContain('Accord d&#39;entreprise Kuhn');
    expect(enriched.tooltip).toContain('CCNM art. 140');
    expect(enriched.tooltip).toContain('20 %');
    expect(enriched.tooltip).not.toContain(
      'Convention collective nationale de la métallurgie (CCNM)',
    );
  });

  it('majoration heures sup +25 % — infobulle présente', () => {
    const def = getConventionMajorationDefs().find(
      (d) => d.semanticId === SEMANTIC_ID.MAJORATION_HEURES_SUP_25,
    )!;
    const result = computeElement(def, baseCtx);
    expect(result.amount).toBeGreaterThan(0);
    const [enriched] = enrichResolvedElementsTooltips(
      [{ result, def, origin: 'convention' }],
      baseCtx,
      null,
    );
    expect(enriched.tooltip).toContain('25 %');
    expect(enriched.tooltip).toContain('Heures sup');
  });

  it('prime ancienneté accord Kuhn — assiette salaire de base', () => {
    const agreement = getAgreement('kuhn');
    expect(agreement).toBeTruthy();
    const ctx = buildComputeContext(
      { anciennete: 5, pointTerritorial: 5.9 },
      30_000,
      5,
      agreement as never,
    );
    const def = getAccordElementDefsForRemuneration(agreement!).find(
      (d) => d.semanticId === SEMANTIC_ID.PRIME_ANCIENNETE,
    )!;
    const result = computeElement(def, ctx);
    expect(result.amount).toBeGreaterThan(0);
    const [enriched] = enrichResolvedElementsTooltips(
      [{ result, def, origin: 'accord' }],
      ctx,
      agreement!,
    );
    expect(enriched.tooltip).toContain('Salaire de base');
    expect(enriched.tooltip).toContain('Kuhn');
  });
});
