import { defineStore } from 'pinia';
import { extractURLParams } from '../domain/utils/url-params';
import { getAgreement } from '../domain/agreements/registry';

export const useAgreementStore = defineStore('agreement', {
  state: () => ({
    activeAccordId: null as string | null,
    accordActif: false,
    inputs: {} as Record<string, unknown>,
  }),
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
