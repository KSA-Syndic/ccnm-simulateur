import { defineStore, getActivePinia } from 'pinia';
import { useAgreementStore } from './agreement';
import { useArreteesStore } from './arretees';
import { useSituationStore } from './situation';
import { useWizardStore } from './wizard';

export const useUiStore = defineStore('ui', {
  state: () => ({
    nbMois: 12 as 12 | 13,
    isDirty: false,
    /** Incrémenté à chaque « Recommencer » pour remonter les étapes (état local hors Pinia). */
    wizardSessionKey: 0,
  }),
  actions: {
    markDirty() {
      this.isDirty = true;
    },
    resetAll() {
      sessionStorage.clear();
      const pinia = getActivePinia();
      if (pinia) {
        useWizardStore(pinia).$reset();
        useSituationStore(pinia).$reset();
        useAgreementStore(pinia).$reset();
        useArreteesStore(pinia).$reset();
        useAgreementStore(pinia).bootstrapFromUrl();
      }
      this.nbMois = 12;
      this.isDirty = false;
      this.wizardSessionKey += 1;
      sessionStorage.clear();
    },
  },
  persist: {
    storage: sessionStorage,
  },
});
