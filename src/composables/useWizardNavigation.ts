import { computed } from 'vue';
import { useWizardStore } from '../stores/wizard';
import { useUiStore } from '../stores/ui';
import { wizardToastStepperLocked } from '../domain/ui/wizardToasts';
import { dispatchAppToast } from '../utils/appToast';

export function useWizardNavigation() {
  const wizard = useWizardStore();
  const ui = useUiStore();

  const currentStep = computed(() => wizard.currentStep);

  const steps = [
    { num: 1, label: 'Classification' },
    { num: 2, label: 'Situation' },
    { num: 3, label: 'Résultat' },
    { num: 4, label: 'Arriérés', optional: true },
  ] as const;

  const stepLabelByNum = Object.fromEntries(steps.map((s) => [s.num, s.label])) as Record<
    number,
    string
  >;

  /**
   * @param allowForward - true pour sauts « Suivant » / ouverture arriérés. Le stepper utilise false par défaut.
   */
  function goToStep(step: number, options?: { allowForward?: boolean }) {
    if (step < 1 || step > 4) return;
    const allowForward = options?.allowForward === true;
    if (!allowForward && step > wizard.maxStepReached) {
      const label = stepLabelByNum[step] ?? `Étape ${step}`;
      dispatchAppToast(wizardToastStepperLocked(label), 'info');
      return;
    }

    wizard.maxStepReached = Math.max(wizard.maxStepReached, step);
    wizard.currentStep = step;
    ui.markDirty();
  }

  function nextStep() {
    const next = wizard.currentStep + 1;
    if (next > 4) return;
    goToStep(next, { allowForward: true });
  }

  function prevStep() {
    goToStep(wizard.currentStep - 1);
  }

  return { currentStep, steps, goToStep, nextStep, prevStep };
}
