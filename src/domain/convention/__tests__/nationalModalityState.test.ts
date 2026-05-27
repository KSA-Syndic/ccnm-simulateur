import { describe, expect, it } from 'vitest';
import {
  activateNationalModality,
  clearNationalModality,
  setNationalPrimeOverride,
} from '../nationalModalityState';
import { getNationalPrimeOverrideRows } from '../catalog';

describe('nationalModalityState', () => {
  const panierRow = getNationalPrimeOverrideRows().find((r) => r.semanticId === 'primePanierNuit')!;

  it('active une modalité avec quantité et override barème', () => {
    const activated = activateNationalModality({}, {}, panierRow);
    expect(activated.modalityState.primePanierNuit).toBe(true);
    expect(activated.modalityState.nbPaniersNuit).toBe(0);
    expect(activated.nationalPrimeOverrides.primePanierNuit).toBeGreaterThan(0);
  });

  it('désactive et nettoie overrides', () => {
    const activated = activateNationalModality({}, {}, panierRow);
    const cleared = clearNationalModality(
      activated.modalityState,
      activated.nationalPrimeOverrides,
      panierRow,
    );
    expect(cleared.modalityState.primePanierNuit).toBeUndefined();
    expect(cleared.nationalPrimeOverrides.primePanierNuit).toBeUndefined();
  });

  it('supprime un taux optionnel à zéro', () => {
    const deplacement = getNationalPrimeOverrideRows().find(
      (r) => r.semanticId === 'primeDeplacementProfessionnel',
    )!;
    const overrides = setNationalPrimeOverride({ [deplacement.semanticId]: 12 }, deplacement, 0);
    expect(overrides[deplacement.semanticId]).toBeUndefined();
  });
});
