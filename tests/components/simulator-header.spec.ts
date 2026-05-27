import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import '@/accords/index';
import SimulatorHeader from '@/components/SimulatorHeader.vue';
import { CONVENTION_METALLURGIE_CONSOLIDEE_PDF_URL, SIMULATOR_SHELL } from '@/domain/ui/labels';
import { useAgreementStore } from '@/stores/agreement';
import { createFreshPinia } from '../unit/stores/createFreshPinia';

describe('SimulatorHeader', () => {
  it('affiche le titre shell et le sous-titre sans accord', () => {
    const pinia = createFreshPinia();
    const w = mount(SimulatorHeader, {
      global: {
        plugins: [pinia],
        stubs: { AppTooltip: { template: '<span class="tooltip-stub" />' } },
      },
    });

    expect(w.find('h1').text()).toContain(SIMULATOR_SHELL.headerTitle);
    expect(w.find('#header-subtitle-text').text()).toBe(SIMULATOR_SHELL.headerSubtitle);
    expect(w.find('.header-convention-link').exists()).toBe(false);
    w.unmount();
  });

  it('enrichit le sous-titre et le tooltip quand un accord est chargé (même non appliqué au calcul)', async () => {
    const pinia = createFreshPinia();
    const w = mount(SimulatorHeader, {
      global: {
        plugins: [pinia],
        stubs: {
          AppTooltip: {
            props: ['content'],
            template: '<span class="tooltip-stub" :data-content="content" />',
          },
        },
      },
    });

    useAgreementStore(pinia).$patch({ accordActif: false, activeAccordId: 'kuhn' });
    await w.vm.$nextTick();
    expect(w.find('#header-subtitle-text').text()).toContain('Kuhn');
    const tooltipContent = String(w.find('.tooltip-stub').attributes('data-content') ?? '');
    expect(tooltipContent).toContain("prime d'ancienneté dès 2 ans");
    w.unmount();
  });
});
