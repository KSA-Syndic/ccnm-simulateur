import { defineStore } from 'pinia';

export const useAgreementStore = defineStore('agreement', {
  state: () => ({
    activeAccordId: null as string | null,
    accordActif: false,
    inputs: {} as Record<string, unknown>,
  }),
  persist: {
    storage: sessionStorage,
  },
});
