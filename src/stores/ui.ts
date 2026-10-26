import { defineStore, getActivePinia } from 'pinia';
import { resetAnalyticsSession } from '@/infra/analytics';
import { useAgreementStore } from './agreement';
import { useArreteesStore } from './arretees';
import { useSituationStore } from './situation';
import { useWizardStore } from './wizard';

export const useUiStore = defineStore('ui', {
  state: () => ({
    /** Choix 12 / 13 mois de l'utilisateur (ignoré tant qu'un accord appliqué impose la répartition). */
    nbMois: 12 as 12 | 13,
    /** Incrémenté à chaque « Recommencer » pour remonter les étapes (état local hors Pinia). */
    wizardSessionKey: 0,
  }),
  getters: {
    /** Répartition retenue partout (résultat, arriérés, PDF) : celle imposée par l'accord, sinon le choix utilisateur. */
    nbMoisEffectif(state): 12 | 13 {
      return useAgreementStore().nbMoisImpose ?? state.nbMois;
    },
  },
  actions: {
    resetAll() {
      resetAnalyticsSession();
      const pinia = getActivePinia();
      if (pinia) {
        useWizardStore(pinia).$reset();
        useSituationStore(pinia).$reset();
        useAgreementStore(pinia).$reset();
        useArreteesStore(pinia).$reset();
        useAgreementStore(pinia).bootstrapFromUrl();
      }
      this.nbMois = 12;
      this.wizardSessionKey += 1;
      sessionStorage.clear();
    },
  },
  persist: {
    storage: sessionStorage,
  },
});
