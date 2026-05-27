import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ResultDetails from '@/features/results/ResultDetails.vue';
import { useAgreementStore } from '@/stores/agreement';
import { useSituationStore } from '@/stores/situation';
import { useUiStore } from '@/stores/ui';
import { useWizardStore } from '@/stores/wizard';
import { createFreshPinia } from '../unit/stores/createFreshPinia';

describe('ResultDetails', () => {
  it('calcule et affiche un total annuel (SMH + agrégation)', () => {
    const pinia = createFreshPinia();
    useWizardStore(pinia).$patch({
      mode: 'manual',
      groupe: 'A',
      classe: 1,
      currentStep: 3,
      scores: {},
    });
    useSituationStore(pinia).$patch({
      anciennete: 0,
      tempsPartiel: false,
      travailNuit: false,
      travailDimanche: false,
      travailHeuresSup: false,
    });
    useAgreementStore(pinia).$patch({ accordActif: false, activeAccordId: null, inputs: {} });
    useUiStore(pinia).$patch({ nbMois: 12 });

    const w = mount(ResultDetails, {
      global: { plugins: [pinia] },
      attachTo: document.body,
    });

    const total = w.find('#result-smh').text();
    expect(total).toMatch(/\d/);
    expect(total).toMatch(/€/);
    expect(w.find('.remuneration-result-legacy').attributes('aria-live')).toBe('polite');
    w.unmount();
  });
});
