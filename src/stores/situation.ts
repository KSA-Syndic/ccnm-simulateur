import { defineStore } from 'pinia';

export const useSituationStore = defineStore('situation', {
  state: () => ({
    anciennete: 0,
    forfait: '35h' as '35h' | 'heures' | 'jours',
    experiencePro: 0,
    pointTerritorial: 0,
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
  }),
  persist: {
    storage: sessionStorage,
  },
});
