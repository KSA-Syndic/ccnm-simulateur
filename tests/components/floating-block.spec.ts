import { describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import FloatingBlock from '@/features/arretees/FloatingBlock.vue';
import { useArreteesStore } from '@/stores/arretees';

describe('FloatingBlock', () => {
  it('Entrée enchaîne sur le mois suivant et focus le champ', async () => {
    setActivePinia(createPinia());
    const store = useArreteesStore();
    store.periodes = [
      { label: 'Janv. 2024', salaireDu: 3000 },
      { label: 'Févr. 2024', salaireDu: 3000 },
    ];
    store.currentPeriodIndex = 0;

    const focusSpy = vi.spyOn(HTMLInputElement.prototype, 'focus').mockImplementation(() => {});
    const selectSpy = vi.spyOn(HTMLInputElement.prototype, 'select').mockImplementation(() => {});

    const w = mount(FloatingBlock, { attachTo: document.body });
    w.vm.show(0);
    await flushPromises();

    const input = w.find('[data-numeric-input="decimal"]');
    await input.setValue('2500');
    await input.trigger('keydown', { key: 'Enter' });
    await flushPromises();

    expect(store.periodes[0]?.salaireVerse).toBe(2500);
    expect(store.currentPeriodIndex).toBe(1);
    expect(focusSpy).toHaveBeenCalled();
    expect(selectSpy).toHaveBeenCalled();

    focusSpy.mockRestore();
    selectSpy.mockRestore();
    w.unmount();
  });

  it('Échap ferme et émet dismissed', async () => {
    setActivePinia(createPinia());
    const store = useArreteesStore();
    store.periodes = [{ label: 'Janv. 2024', salaireDu: 3000 }];
    store.currentPeriodIndex = 0;

    const w = mount(FloatingBlock, { attachTo: document.body });
    w.vm.show(0);
    await flushPromises();

    await w.find('#floating-input-block').trigger('keydown', { key: 'Escape' });
    expect(w.emitted('dismissed')).toBeTruthy();
    expect(w.find('#floating-input-block').classes()).toContain('floating-block-hidden');

    w.unmount();
  });
});
