import { describe, expect, it } from 'vitest';
import { useSituationStore } from '@/stores/situation';
import { createFreshPinia } from './createFreshPinia';

describe('useSituationStore', () => {
  it('état initial attendu', () => {
    const pinia = createFreshPinia();
    const s = useSituationStore(pinia);
    expect(s.anciennete).toBe(0);
    expect(s.forfait).toBe('35h');
    expect(s.pointTerritorial).toBe(5.9);
    expect(s.tempsPartiel).toBe(false);
    expect(s.tauxActivite).toBe(100);
    expect(s.travailNuit).toBe(false);
    expect(s.nationalPrimeOverrides).toEqual({});
  });

  it('$patch reflète les modalités de travail', () => {
    const pinia = createFreshPinia();
    const s = useSituationStore(pinia);
    s.$patch({
      forfait: 'jours',
      tempsPartiel: true,
      tauxActivite: 80,
      travailNuit: true,
      heuresNuit: 12,
    });
    expect(s.forfait).toBe('jours');
    expect(s.tempsPartiel).toBe(true);
    expect(s.tauxActivite).toBe(80);
    expect(s.heuresNuit).toBe(12);
  });

  it('$reset restaure les défauts', () => {
    const pinia = createFreshPinia();
    const s = useSituationStore(pinia);
    s.$patch({ anciennete: 10, pointTerritorial: 6.2 });
    s.$reset();
    expect(s.anciennete).toBe(0);
    expect(s.pointTerritorial).toBe(5.9);
  });
});
