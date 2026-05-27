import { describe, expect, it } from 'vitest';
import { CONVENTION_MODALITES_PRIMES } from '@/domain/convention/catalog';
import {
  assertNationalModalityRegistryCoversCatalog,
  buildNationalModalityElementDefs,
  getNationalModalityOverrideSemantics,
  getNationalPrimeOverrideRows,
  NATIONAL_MODALITY_ENTRIES,
} from '@/domain/convention/nationalModalityRegistry';
import { applyNationalPrimeOverridesToConventionDefs } from '@/domain/remuneration/nationalOverrides';
import { SEMANTIC_ID } from '@/domain/types';

describe('nationalModalityRegistry', () => {
  it('couvre exactement CONVENTION_MODALITES_PRIMES', () => {
    expect(() => assertNationalModalityRegistryCoversCatalog()).not.toThrow();
    expect(NATIONAL_MODALITY_ENTRIES).toHaveLength(Object.keys(CONVENTION_MODALITES_PRIMES).length);
  });

  it('dérive autant de lignes UI que d’entrées registre', () => {
    expect(getNationalPrimeOverrideRows()).toHaveLength(NATIONAL_MODALITY_ENTRIES.length);
  });

  it('dérive autant de définitions moteur que d’entrées registre', () => {
    const defs = buildNationalModalityElementDefs();
    expect(defs).toHaveLength(NATIONAL_MODALITY_ENTRIES.length);
    for (const entry of NATIONAL_MODALITY_ENTRIES) {
      expect(defs.some((d) => d.semanticId === entry.semanticId)).toBe(true);
    }
  });

  it('surcharges utilisateur alignées sur allowUserOverride du registre', () => {
    const semantics = getNationalModalityOverrideSemantics();
    const withOverride = NATIONAL_MODALITY_ENTRIES.filter((e) => e.allowUserOverride).map(
      (e) => e.semanticId,
    );
    expect([...semantics].sort()).toEqual([...withOverride].sort());
    expect(semantics.has(SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_REPOS_QUOTIDIEN)).toBe(false);
  });

  it('applyNationalPrimeOverrides utilise les kinds du registre (panier)', () => {
    const defs = buildNationalModalityElementDefs();
    const patched = applyNationalPrimeOverridesToConventionDefs(defs, {
      nationalPrimeOverrides: { [SEMANTIC_ID.PRIME_PANIER_NUIT]: 9.5 },
    });
    const panier = patched.find((d) => d.semanticId === SEMANTIC_ID.PRIME_PANIER_NUIT);
    expect(panier?.computeMode).toMatchObject({
      mode: 'unitesXmontant',
      montant: { ref: 'constant', value: 9.5 },
    });
  });
});
