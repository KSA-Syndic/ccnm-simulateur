import { describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import StepClassification from '@/features/wizard/StepClassification.vue';
import { useWizardStore } from '@/stores/wizard';
import { createFreshPinia } from '../unit/stores/createFreshPinia';

describe('StepClassification (1b)', () => {
  it('affiche les classes comme numéro seul (sans préfixe groupe)', async () => {
    const pinia = createFreshPinia();
    useWizardStore(pinia).$patch({ groupe: 'B', classe: 3 });

    const w = mount(StepClassification, {
      global: { plugins: [pinia] },
      attachTo: document.body,
    });

    await w.findAll('.choice-card')[0]!.trigger('click');
    await flushPromises();

    const labels = w.findAll('#select-classe option').map((o) => o.text().trim());
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every((t) => /^\d+$/.test(t))).toBe(true);

    w.unmount();
  });

  it('changement de groupe : réinitialise la classe sur la 1re du groupe', async () => {
    const pinia = createFreshPinia();
    useWizardStore(pinia).$patch({ groupe: 'B', classe: 4 });

    const w = mount(StepClassification, {
      global: { plugins: [pinia] },
      attachTo: document.body,
    });

    await w.findAll('.choice-card')[0]!.trigger('click');
    await flushPromises();

    await w.find('#select-groupe').setValue('A');
    await flushPromises();

    expect(useWizardStore(pinia).classe).toBe(1);

    w.unmount();
  });
});
