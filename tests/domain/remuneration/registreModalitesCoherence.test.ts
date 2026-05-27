import { describe, expect, it } from 'vitest';
import { CONVENTION_MODALITES_PRIMES } from '@/domain/convention/catalog';
import {
  assertNationalModalityRegistryCoversCatalog,
  buildNationalModalityElementDefs,
  getNationalModalityRegistryEntries,
  getNationalPrimeOverrideRows,
} from '@/domain/convention/nationalModalityRegistry';
import { applyNationalPrimeOverridesToConventionDefs } from '@/domain/remuneration/nationalOverrides';
import { baseWizardInput, computeDetails } from './helpers/remunerationTestHelpers';

/**
 * Chaque modalité du registre doit produire une ligne moteur dès qu’elle est activée avec quantité > 0.
 * Garantit l’évolutivité : nouvelle entrée registre → UI + calcul + surcharge sans liste parallèle.
 */
describe('Registre modalités — cohérence UI / moteur / overrides', () => {
  it('catalogue ↔ registre synchronisés', () => {
    expect(() => assertNationalModalityRegistryCoversCatalog()).not.toThrow();
  });

  for (const entry of getNationalModalityRegistryEntries()) {
    it(`[${entry.catalogKey}] UI + ElementDef + activation`, () => {
      const mod = CONVENTION_MODALITES_PRIMES[entry.catalogKey];
      const uiRow = getNationalPrimeOverrideRows().find((r) => r.semanticId === entry.semanticId);
      expect(uiRow?.stateKeyActif).toBe(mod.stateKeyActif);

      const defs = buildNationalModalityElementDefs();
      const def = defs.find((d) => d.semanticId === entry.semanticId);
      expect(def).toBeDefined();

      if (!mod.stateKeyHeures) {
        const details = computeDetails(
          baseWizardInput({
            situation: { modalityState: { [mod.stateKeyActif]: true } },
          }),
        );
        expect(details.some((d) => d.semanticId === entry.semanticId && d.amount > 0)).toBe(true);
        return;
      }

      const qtyKey = mod.stateKeyHeures;
      const details = computeDetails(
        baseWizardInput({
          situation: {
            modalityState: {
              [mod.stateKeyActif]: true,
              [qtyKey]: 4,
            },
          },
        }),
      );
      expect(details.some((d) => d.semanticId === entry.semanticId && d.amount > 0)).toBe(true);

      if (entry.allowUserOverride && entry.overrideKind) {
        const patched = applyNationalPrimeOverridesToConventionDefs(defs, {
          nationalPrimeOverrides: { [entry.semanticId]: 99 },
        });
        const patchedDef = patched.find((d) => d.semanticId === entry.semanticId);
        expect(patchedDef).toBeDefined();
        expect(patchedDef).not.toEqual(def);
      }
    });
  }
});
