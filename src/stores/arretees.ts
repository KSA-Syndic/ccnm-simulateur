import { defineStore } from 'pinia';

export interface ArreteePeriode {
  label: string;
  salaireDu: number;
  salaireVerse: number | undefined;
}

export const useArreteesStore = defineStore('arretees', {
  state: () => ({
    salaires: {} as Record<string, number>,
    dateEmbauche: '',
    resultats: null as unknown,
    surSMHSeul: true,
    periodes: [] as ArreteePeriode[],
    currentPeriodIndex: -1,
  }),
  actions: {
    setSalaireVerse(index: number, amount: number) {
      const p = this.periodes[index];
      if (p) {
        p.salaireVerse = amount;
      }
    },
  },
  persist: {
    storage: sessionStorage,
  },
});
