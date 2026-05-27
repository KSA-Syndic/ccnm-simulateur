import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import StepSituation from '@/features/wizard/StepSituation.vue';
import { NumericInput } from '@/components/ui';
import { useWizardStore } from '@/stores/wizard';
import { useSituationStore } from '@/stores/situation';
import { CONFIG } from '@/domain/config';
import { createFreshPinia } from '../unit/stores/createFreshPinia';

describe('StepSituation', () => {
  it('affiche le récapitulatif classification et avance à l’étape 3 au calcul', async () => {
    const pinia = createFreshPinia();
    useWizardStore(pinia).$patch({
      currentStep: 2,
      maxStepReached: 2,
      groupe: 'B',
      classe: 3,
      mode: 'manual',
    });

    const w = mount(StepSituation, {
      global: { plugins: [pinia] },
      attachTo: document.body,
    });

    expect(w.find('section[aria-label="Étape 2 — Situation"]').exists()).toBe(true);
    expect(w.text()).toContain('B');
    expect(w.text()).toContain('3');

    await w.findAll('.step-actions .book-btn.btn-primary')[0]!.trigger('click');
    expect(useWizardStore(pinia).currentStep).toBe(3);

    w.unmount();
  });

  it('aperçu SMH barème débutant : masqué par défaut, visible après saisie utilisateur', async () => {
    const pinia = createFreshPinia();
    useWizardStore(pinia).$patch({
      groupe: 'F',
      classe: 11,
      currentStep: 2,
      maxStepReached: 2,
      mode: 'manual',
    });
    const situation = useSituationStore(pinia);
    const seuil = CONFIG.BAREME_DEBUTANTS_SEUIL_EXP_PRO;
    situation.experiencePro = seuil;
    const w = mount(StepSituation, { global: { plugins: [pinia] }, attachTo: document.body });
    expect(w.find('.cadre-debutant-smh').exists()).toBe(false);

    situation.experiencePro = seuil - 1;
    await w.vm.$nextTick();
    expect(w.find('.cadre-debutant-smh').exists()).toBe(false);

    const expInput = w
      .findAllComponents(NumericInput)
      .find((c) => c.attributes('id') === 'experience-pro');
    await expInput!.vm.$emit('update:modelValue', seuil - 1);
    await w.vm.$nextTick();
    expect(w.find('.cadre-debutant-smh').exists()).toBe(true);
    expect(w.find('.cadre-debutant-smh').text()).toContain('Salaire minimum indicatif');

    situation.experiencePro = seuil;
    await w.vm.$nextTick();
    expect(w.find('.cadre-debutant-smh').exists()).toBe(false);
    w.unmount();
  });

  it('retour à l’étape 1 depuis le lien « Modifier la classification »', async () => {
    const pinia = createFreshPinia();
    useWizardStore(pinia).$patch({
      currentStep: 2,
      maxStepReached: 2,
      groupe: 'A',
      classe: 1,
    });

    const w = mount(StepSituation, {
      global: { plugins: [pinia] },
      attachTo: document.body,
    });

    await w.find('button.btn-link').trigger('click');
    expect(useWizardStore(pinia).currentStep).toBe(1);
    w.unmount();
  });

  it('point territorial : visible seulement pour les non-cadres', () => {
    const piniaCadre = createFreshPinia();
    useWizardStore(piniaCadre).$patch({
      groupe: 'F',
      classe: 11,
      currentStep: 2,
      maxStepReached: 2,
    });
    const wCadre = mount(StepSituation, {
      global: { plugins: [piniaCadre] },
      attachTo: document.body,
    });
    expect(wCadre.find('#modalites-non-cadre').exists()).toBe(false);
    expect(wCadre.find('#point-territorial').exists()).toBe(false);
    wCadre.unmount();

    const piniaNc = createFreshPinia();
    useWizardStore(piniaNc).$patch({ groupe: 'B', classe: 3, currentStep: 2, maxStepReached: 2 });
    const wNc = mount(StepSituation, { global: { plugins: [piniaNc] }, attachTo: document.body });
    expect(wNc.find('#modalites-non-cadre').exists()).toBe(true);
    expect(wNc.find('#point-territorial').exists()).toBe(true);
    wNc.unmount();
  });

  it('cadre en forfait jours : réinitialise heures sup (watcher forfait/cadre)', () => {
    const pinia = createFreshPinia();
    useWizardStore(pinia).$patch({ groupe: 'F', classe: 11, currentStep: 2, maxStepReached: 2 });
    useSituationStore(pinia).$patch({
      forfait: 'jours',
      travailHeuresSup: true,
      heuresSup: 12,
    });

    const w = mount(StepSituation, { global: { plugins: [pinia] }, attachTo: document.body });

    const s = useSituationStore(pinia);
    expect(s.travailHeuresSup).toBe(false);
    expect(s.heuresSup).toBe(0);
    w.unmount();
  });

  it('non-cadre : force le forfait à 35h si valeur résiduelle hors 35h', () => {
    const pinia = createFreshPinia();
    useWizardStore(pinia).$patch({ groupe: 'A', classe: 2, currentStep: 2, maxStepReached: 2 });
    useSituationStore(pinia).$patch({ forfait: 'jours' });

    const w = mount(StepSituation, { global: { plugins: [pinia] }, attachTo: document.body });

    expect(useSituationStore(pinia).forfait).toBe('35h');
    w.unmount();
  });
});
