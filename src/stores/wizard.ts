import { defineStore } from 'pinia';

export const useWizardStore = defineStore('wizard', {
  state: () => ({
    /** Step shown (synced with router). */
    currentStep: 1,
    /**
     * Furthest step reached via forward navigation. Stepper clicks only allow target <= this
     * (same idea as legacy `state.currentStep` + `targetStep <= maxStep` on `.progress-step` click).
     */
    maxStepReached: 1,
    mode: 'estimation' as 'estimation' | 'manual',
    scores: {} as Record<string, number>,
    groupe: '' as string,
    classe: 0 as number,
  }),
  persist: {
    storage: sessionStorage,
  },
});
