import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useWizardStore } from '../stores/wizard';
import { useUiStore } from '../stores/ui';

export function useWizardNavigation() {
  const router = useRouter();
  const route = useRoute();
  const wizard = useWizardStore();
  const ui = useUiStore();

  const currentStep = computed(() => wizard.currentStep);

  const steps = [
    { num: 1, label: 'Classification', route: 'classification' },
    { num: 2, label: 'Situation', route: 'situation' },
    { num: 3, label: 'Résultat', route: 'result' },
    { num: 4, label: 'Arriérés', route: 'arretees', optional: true },
  ] as const;

  /**
   * @param allowForward - true for Next / primary jumps (e.g. open arriérés). Stepper uses default false.
   */
  async function goToStep(step: number, options?: { allowForward?: boolean }) {
    if (step < 1 || step > 4) return;
    const allowForward = options?.allowForward === true;
    if (!allowForward && step > wizard.maxStepReached) return;

    wizard.maxStepReached = Math.max(wizard.maxStepReached, step);
    wizard.currentStep = step;
    ui.markDirty();
    const target = steps.find((s) => s.num === step);
    if (target) {
      await router.push({ name: target.route, query: route.query });
    }
  }

  async function nextStep() {
    const next = wizard.currentStep + 1;
    if (next > 4) return;
    await goToStep(next, { allowForward: true });
  }

  async function prevStep() {
    await goToStep(wizard.currentStep - 1);
  }

  return { currentStep, steps, goToStep, nextStep, prevStep };
}
