import { defineStore } from 'pinia';
import { CONFIG } from '../domain/config';

export const useSituationStore = defineStore('situation', {
  state: () => ({
    anciennete: 0,
    forfait: '35h' as '35h' | 'heures' | 'jours',
    experiencePro: 0,
    pointTerritorial: CONFIG.POINT_TERRITORIAL.valeurDefaut,
    tempsPartiel: false,
    tauxActivite: 100,
    travailNuit: false,
    heuresNuit: 0,
    travailDimanche: false,
    heuresDimanche: 0,
    travailHeuresSup: false,
    heuresSup: 0,
    travailJoursSupForfait: false,
    joursSupForfait: 0,
    /** Surcharges barèmes nationaux (CCNM) — clés = semanticId, valeurs numériques. */
    nationalPrimeOverrides: {} as Record<string, number>,
    /**
     * Activation et quantités des modalités nationales « Autres »
     * (legacy `state.accordInputs` pour stateKeyActif / stateKeyHeures).
     */
    modalityState: {} as Record<string, boolean | number>,
  }),
  persist: {
    storage: sessionStorage,
  },
});
