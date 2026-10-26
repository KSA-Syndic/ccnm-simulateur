import { defineStore } from 'pinia';
import type { ArreteesSummaryVue } from '@/domain/arretees/aggregateFromPeriodes';
import {
  resolveDateRupture,
  type ArreteePeriode,
  type ChangementClassification,
} from '@/domain/arretees/timeline';
import { getGroupeForClasse } from '@/domain/classification/engine';

export type { ArreteePeriode };

export const useArreteesStore = defineStore('arretees', {
  state: () => ({
    dateEmbauche: '',
    dateChangementClassification: '',
    /** Classe (1–18) occupée avant `dateChangementClassification` ; `null` : non renseignée. */
    classeAvantChangement: null as number | null,
    ruptureContrat: false,
    dateRupture: '',
    accordEcrit: false,
    surSMHSeul: true,
    periodes: [] as ArreteePeriode[],
    currentPeriodIndex: -1,
    /** Synthèse affichée après « Calculer les arriérés » (null tant que non calculé). */
    summary: null as ArreteesSummaryVue | null,
  }),
  getters: {
    /** Changement de classification applicable (date d'effet + classe antérieure), sinon `null`. */
    changementClassification(state): ChangementClassification | null {
      const classe = state.classeAvantChangement;
      const groupe = classe != null ? getGroupeForClasse(classe) : null;
      if (!state.dateChangementClassification || classe == null || !groupe) return null;
      return { date: state.dateChangementClassification, groupe, classe };
    },
    /** Date de rupture retenue : case cochée et date valide, postérieure à l'embauche. */
    dateRuptureEffective(state): string | null {
      return state.ruptureContrat
        ? resolveDateRupture(state.dateEmbauche, state.dateRupture)
        : null;
    },
  },
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
