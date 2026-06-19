import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import '@/accords';
import ConditionsTravailPanel from '@/features/agreement-options/ConditionsTravailPanel.vue';
import { useAgreementStore } from '@/stores/agreement';
import { useSituationStore } from '@/stores/situation';
import { useWizardStore } from '@/stores/wizard';
import { createFreshPinia } from '../unit/stores/createFreshPinia';

describe('ConditionsTravailPanel', () => {
  it('affiche le champ taux d’activité quand temps partiel est coché', async () => {
    const pinia = createFreshPinia();
    useWizardStore(pinia).$patch({ classe: 5 });
    useSituationStore(pinia).$patch({ tempsPartiel: false, forfait: '35h' });

    const w = mount(ConditionsTravailPanel, {
      global: {
        plugins: [pinia],
        stubs: { HourlyPrimesList: { template: '<div class="hourly-stub" />' } },
      },
      attachTo: document.body,
    });

    const checks = w.findAll('input[type="checkbox"]');
    await checks[0]!.setValue(true);
    expect(useSituationStore(pinia).tempsPartiel).toBe(true);
    expect(w.find('[aria-label="Taux d\'activité"]').exists()).toBe(true);
    w.unmount();
  });

  it('cadre en forfait jours : affiche jours sup forfait au lieu des heures sup', () => {
    const pinia = createFreshPinia();
    useWizardStore(pinia).$patch({ classe: 11 });
    useSituationStore(pinia).$patch({ forfait: 'jours' });

    const w = mount(ConditionsTravailPanel, {
      global: {
        plugins: [pinia],
        stubs: { HourlyPrimesList: { template: '<div />' } },
      },
    });

    expect(w.text()).toMatch(/Jours supplémentaires/);
    expect(w.text()).not.toMatch(/Heures supplémentaires/);
    w.unmount();
  });

  it('sans accord : affiche la case Travail en équipe pour un non-cadre', async () => {
    const pinia = createFreshPinia();
    useWizardStore(pinia).$patch({ classe: 5 });
    useSituationStore(pinia).$patch({ forfait: '35h' });
    useAgreementStore(pinia).$patch({ accordActif: false, activeAccordId: null, inputs: {} });

    const w = mount(ConditionsTravailPanel, {
      global: {
        plugins: [pinia],
        stubs: {
          HourlyPrimesList: { template: '<div />' },
          AutresPrimesNationalesList: { template: '<div />' },
        },
      },
      attachTo: document.body,
    });

    const details = w.get('details#conditions-travail');
    (details.element as HTMLDetailsElement).open = true;
    await w.vm.$nextTick();

    expect(w.text()).toMatch(/Travail en équipe/);
    w.unmount();
  });

  it('Kuhn actif : masque la case CCNM Travail en équipe (substitution accord)', async () => {
    const pinia = createFreshPinia();
    useWizardStore(pinia).$patch({ classe: 5 });
    useSituationStore(pinia).$patch({ forfait: '35h' });
    useAgreementStore(pinia).$patch({ activeAccordId: 'kuhn', accordActif: true, inputs: {} });

    const w = mount(ConditionsTravailPanel, {
      global: {
        plugins: [pinia],
        stubs: { HourlyPrimesList: { template: '<div class="hourly-stub" />' } },
      },
      attachTo: document.body,
    });

    const details = w.get('details#conditions-travail');
    (details.element as HTMLDetailsElement).open = true;
    await w.vm.$nextTick();

    expect(w.text()).not.toMatch(/^Travail en équipe$/m);
    expect(w.find('.hourly-stub').exists()).toBe(true);
    w.unmount();
  });

  it('Kuhn actif : majoration nuit poste matin + pastilles accord', async () => {
    const pinia = createFreshPinia();
    useWizardStore(pinia).$patch({ classe: 5 });
    useSituationStore(pinia).$patch({ forfait: '35h' });
    useAgreementStore(pinia).$patch({ activeAccordId: 'kuhn', accordActif: true, inputs: {} });

    const w = mount(ConditionsTravailPanel, {
      global: { plugins: [pinia] },
      attachTo: document.body,
    });

    const details = w.get('details#conditions-travail');
    (details.element as HTMLDetailsElement).open = true;
    await w.vm.$nextTick();

    expect(w.text()).toMatch(/Majoration heures de nuit \(poste matin/i);
    expect(w.findAll('.accord-badge').length).toBeGreaterThan(0);

    w.unmount();
  });
});
