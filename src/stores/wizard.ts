import { defineStore } from 'pinia';

export const useWizardStore = defineStore('wizard', {
  state: () => ({
    /** Étape affichée (mono-page, `WizardShell`). */
    currentStep: 1,
    /**
     * Furthest step reached via forward navigation. Stepper clicks only allow target <= this
     * (same idea as legacy `state.currentStep` + `targetStep <= maxStep` on `.progress-step` click).
     */
    maxStepReached: 1,
    mode: 'estimation' as 'estimation' | 'manual',
    scores: {} as Record<string, number>,
    groupe: 'A',
    classe: 1,
  }),
  persist: {
    storage: sessionStorage,
  },
});
