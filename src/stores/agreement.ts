import { defineStore } from 'pinia';
import { extractURLParams } from '../domain/utils/url-params';
import { getAgreement, resolveActiveAgreement } from '../domain/agreements/registry';
import { getNbMoisImpose } from '../domain/agreements/interface';

export const useAgreementStore = defineStore('agreement', {
  state: () => ({
    activeAccordId: null as string | null,
    accordActif: false,
    inputs: {} as Record<string, unknown>,
  }),
  getters: {
    /** Accord chargé (URL / registre), même si la case « Appliquer » est décochée. */
    loadedAgreement: (state) => (state.activeAccordId ? getAgreement(state.activeAccordId) : null),
    /** Accord effectivement appliqué au calcul. */
    activeAgreement: (state) => resolveActiveAgreement(state),
    /** 12 ou 13 mois imposés par l'accord appliqué ; `null` sans accord. */
    nbMoisImpose(): 12 | 13 | null {
      return getNbMoisImpose(this.activeAgreement);
    },
  },
  actions: {
    /** Lit `accord` dans l’URL (y compris query après le hash) et active l’accord si enregistré. */
    bootstrapFromUrl(): void {
      const accord = extractURLParams().accord;
      if (!accord) return;
      const loaded = getAgreement(accord);
      if (!loaded) {
        console.warn(`Accord "${accord}" non trouvé dans le registre`);
        return;
      }
      this.activeAccordId = loaded.id;
      this.accordActif = true;
    },
  },
  persist: {
    storage: sessionStorage,
  },
});
