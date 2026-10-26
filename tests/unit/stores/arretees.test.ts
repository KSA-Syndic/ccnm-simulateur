import { describe, expect, it } from 'vitest';
import { useArreteesStore } from '@/stores/arretees';
import type { ArreteesSummaryVue } from '@/domain/arretees/aggregateFromPeriodes';
import { createFreshPinia } from './createFreshPinia';

describe('useArreteesStore', () => {
  it('setSalaireVerse met à jour la période ciblée', () => {
    const pinia = createFreshPinia();
    const a = useArreteesStore(pinia);
    a.$patch({
      periodes: [
        { label: '2020', salaireDu: 30000, salaireVerse: undefined },
        { label: '2021', salaireDu: 31000, salaireVerse: 28000 },
      ],
    });
    a.setSalaireVerse(0, 29_500);
    expect(a.periodes[0]?.salaireVerse).toBe(29_500);
    expect(a.periodes[1]?.salaireVerse).toBe(28_000);
  });

  it('setSalaireVerse réinitialise le résumé après calcul', () => {
    const pinia = createFreshPinia();
    const a = useArreteesStore(pinia);
    const stubSummary = {
      totalArretees: 200,
      detailsParAnnee: [],
      detailMois: [],
      dateDebutLabel: 'x',
      dateFinLabel: 'y',
      anneesAvecEcartCount: 0,
      nbAnnees: 0,
      conformeAuSMH: false,
    } as ArreteesSummaryVue;
    a.$patch({
      periodes: [
        { label: 'janv. 2024', salaireDu: 3000, salaireVerse: 2800, periodKey: '2024-01' },
      ],
      summary: stubSummary,
    });
    a.setSalaireVerse(0, 2900);
    expect(a.summary).toBeNull();
  });

  it('setSalaireVerse ignore un index hors tableau', () => {
    const pinia = createFreshPinia();
    const a = useArreteesStore(pinia);
    a.$patch({
      periodes: [{ label: '2020', salaireDu: 1000, salaireVerse: undefined }],
    });
    a.setSalaireVerse(99, 5000);
    expect(a.periodes[0]?.salaireVerse).toBeUndefined();
  });

  it('changementClassification : complet seulement avec date et classe antérieure', () => {
    const a = useArreteesStore(createFreshPinia());
    expect(a.changementClassification).toBeNull();
    a.dateChangementClassification = '2025-03-01';
    expect(a.changementClassification).toBeNull();
    a.classeAvantChangement = 4;
    expect(a.changementClassification).toEqual({ date: '2025-03-01', groupe: 'B', classe: 4 });
  });

  it('dateRuptureEffective : case cochée et date postérieure à l’embauche', () => {
    const a = useArreteesStore(createFreshPinia());
    a.$patch({ dateEmbauche: '2024-02-01', dateRupture: '2025-06-30' });
    expect(a.dateRuptureEffective).toBeNull();
    a.ruptureContrat = true;
    expect(a.dateRuptureEffective).toBe('2025-06-30');
    a.dateRupture = '2023-12-31';
    expect(a.dateRuptureEffective).toBeNull();
  });
});
