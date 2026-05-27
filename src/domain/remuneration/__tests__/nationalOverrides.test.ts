import { describe, expect, it } from 'vitest';
import { SEMANTIC_ID } from '../../types';
import { getConventionPrimeDefs } from '../../convention/catalog';
import { applyNationalPrimeOverridesToConventionDefs } from '../nationalOverrides';

describe('applyNationalPrimeOverridesToConventionDefs', () => {
  it('déplacement : surcharge le taux horaire de base, pas un coefficient', () => {
    const defs = getConventionPrimeDefs();
    const patched = applyNationalPrimeOverridesToConventionDefs(defs, {
      nationalPrimeOverrides: { [SEMANTIC_ID.PRIME_DEPLACEMENT_PRO]: 18.5 },
    });
    const def = patched.find((d) => d.semanticId === SEMANTIC_ID.PRIME_DEPLACEMENT_PRO)!;
    const mode = def.computeMode as {
      mode: string;
      base?: { ref: string; value: number };
      taux?: { value: number };
    };
    expect(mode.mode).toBe('heuresXtaux');
    expect(mode.base).toEqual({ ref: 'constant', value: 18.5 });
    expect(mode.taux).toEqual({ ref: 'constant', value: 0 });
  });
});
