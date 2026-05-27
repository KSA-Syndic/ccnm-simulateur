import { describe, expect, it } from 'vitest';
import '../../../accords/kuhn';
import { getAgreement } from '../../agreements/registry';
import { getAccordElementDefsForRemuneration } from '../../agreements/accord-element-defs';
import { applyAccordPrimeRateOverridesFromSituation } from '../accordRateOverrides';
import { SEMANTIC_ID } from '../../types';

describe('applyAccordPrimeRateOverridesFromSituation', () => {
  it('surcharge le taux majoration horaire accord', () => {
    const doc = getAgreement('kuhn')!;
    const defs = getAccordElementDefsForRemuneration(doc);
    const maj = defs.find((d) => d.semanticId === 'majorationNuitPosteMatin');
    expect(maj?.computeMode).toMatchObject({ mode: 'heuresXtaux' });

    const patched = applyAccordPrimeRateOverridesFromSituation(defs, {
      majorationNuitPosteMatin: 0.2,
    });
    const updated = patched.find((d) => d.semanticId === 'majorationNuitPosteMatin');
    const mode = updated?.computeMode as { taux?: { value?: number } };
    expect(mode.taux?.value).toBe(0.2);
  });

  it('surcharge le montant horaire prime équipe', () => {
    const doc = getAgreement('kuhn')!;
    const defs = getAccordElementDefsForRemuneration(doc);
    const patched = applyAccordPrimeRateOverridesFromSituation(defs, {
      [SEMANTIC_ID.PRIME_EQUIPE]: 0.9,
    });
    const pe = patched.find((d) => d.semanticId === SEMANTIC_ID.PRIME_EQUIPE);
    const mode = pe?.computeMode as { montant?: { value?: number } };
    expect(mode.montant?.value).toBe(0.9);
  });
});
