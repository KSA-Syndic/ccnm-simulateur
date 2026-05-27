import { defineStore } from 'pinia';
import { extractURLParams } from '../domain/utils/url-params';
import { loadAgreement } from '../domain/agreements/loader';

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
      const loaded = loadAgreement(accord);
      if (loaded) {
        this.activeAccordId = loaded.id;
        this.accordActif = true;
      }
    },
  },
  persist: {
    storage: sessionStorage,
  },
});
