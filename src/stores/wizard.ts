import { defineStore } from 'pinia';

export const useWizardStore = defineStore('wizard', {
  state: () => ({
    /** Étape affichée (mono-page, `WizardShell`). */
    currentStep: 1,
    /**
     * Dernière étape atteinte en navigation avant ; les clics sur le stepper ne permettent pas d’aller au-delà.
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
