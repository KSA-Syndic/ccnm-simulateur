import { describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import '@/accords';
import AccordOptionsPanel from '@/features/agreement-options/AccordOptionsPanel.vue';
import { useAgreementStore } from '@/stores/agreement';
import { createFreshPinia } from '../unit/stores/createFreshPinia';

describe('AccordOptionsPanel', () => {
  it('accord chargé : toggle accordActif, badge, pas de checkbox prime vacances', async () => {
    const pinia = createFreshPinia();
    useAgreementStore(pinia).$patch({
      activeAccordId: 'kuhn',
      accordActif: true,
      inputs: {},
    });

    const w = mount(AccordOptionsPanel, {
      global: { plugins: [pinia] },
      attachTo: document.body,
    });

    await flushPromises();

    expect(w.text()).toMatch(/Appliquer l'accord d'entreprise/i);
    expect(w.find('.accord-badge').exists()).toBe(true);
    expect(w.text()).toMatch(/Kuhn/i);
    expect(w.text()).not.toMatch(/Prime de vacances \(525/);

    const toggle = w.find('.checkbox-highlight input[type="checkbox"]');
    expect((toggle.element as HTMLInputElement).checked).toBe(true);

    await toggle.setValue(false);
    expect(useAgreementStore(pinia).accordActif).toBe(false);
    expect(w.text()).toMatch(/Accord non appliqué/i);

    w.unmount();
  });

  it('sans accord actif dans le store : panneau masqué', () => {
    const pinia = createFreshPinia();
    useAgreementStore(pinia).$patch({ activeAccordId: null, accordActif: false });

    const w = mount(AccordOptionsPanel, { global: { plugins: [pinia] } });
    expect(w.find('.accord-options-panel').exists()).toBe(false);
    w.unmount();
  });
});
