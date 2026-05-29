import { defineStore } from 'pinia';
import type { ArreteesSummaryVue } from '@/domain/arretees/aggregateFromPeriodes';

export interface ArreteePeriode {
  label: string;
  /** Clé stable `YYYY-MM` pour l’indexation mensuelle. */
  periodKey?: string;
  salaireDu: number;
  salaireVerse: number | undefined;
  /** Part mensuelle hors primes ponctuelles (répartition 12/13). */
  mensuelDuBase?: number;
  /** Primes accord versées ce mois (ex. vacances en juillet). */
  primesVerseesCeMois?: number;
  primesVerseesLabels?: string[];
  /** Mois de versement du 13e mois (double mensualité de base). */
  estMois13eMois?: boolean;
}

export const useArreteesStore = defineStore('arretees', {
  state: () => ({
    salaires: {} as Record<string, number>,
    dateEmbauche: '',
    dateChangementClassification: '',
    ruptureContrat: false,
    dateRupture: '',
    accordEcrit: false,
    resultats: null as unknown,
    surSMHSeul: true,
    periodes: [] as ArreteePeriode[],
    currentPeriodIndex: -1,
    /** Synthèse affichée après « Calculer les arriérés » (null tant que non calculé). */
    summary: null as ArreteesSummaryVue | null,
  }),
  actions: {
    setSalaireVerse(index: number, amount: number) {
      const p = this.periodes[index];
      if (p) {
        p.salaireVerse = amount;
        this.summary = null;
      }
    },
  },
  persist: {
    storage: sessionStorage,
  },
});
