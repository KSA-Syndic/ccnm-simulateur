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
});
