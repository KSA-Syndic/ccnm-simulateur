import { describe, expect, it } from 'vitest';
import '@/accords';
import { setActivePinia } from 'pinia';
import { useAgreementStore } from '@/stores/agreement';
import { useArreteesStore } from '@/stores/arretees';
import { useSituationStore } from '@/stores/situation';
import { useUiStore } from '@/stores/ui';
import { useWizardStore } from '@/stores/wizard';
import { createFreshPinia } from './createFreshPinia';

describe('useUiStore', () => {
  it('nbMois accepte 12 ou 13', () => {
    const pinia = createFreshPinia();
    const ui = useUiStore(pinia);
    expect(ui.nbMois).toBe(12);
    ui.$patch({ nbMois: 13 });
    expect(ui.nbMois).toBe(13);
  });

  it('nbMoisEffectif : répartition imposée par l’accord appliqué, sinon choix utilisateur', () => {
    const pinia = createFreshPinia();
    setActivePinia(pinia);
    const ui = useUiStore();
    const agreement = useAgreementStore();
    ui.nbMois = 12;
    agreement.$patch({ activeAccordId: 'kuhn', accordActif: true });
    expect(ui.nbMoisEffectif).toBe(13);
    expect(ui.nbMois).toBe(12);
    agreement.accordActif = false;
    expect(ui.nbMoisEffectif).toBe(12);
    setActivePinia(undefined);
  });

  it('resetAll réinitialise les stores enregistrés et vide sessionStorage', () => {
    const pinia = createFreshPinia();
    sessionStorage.setItem('dummy', 'x');
    setActivePinia(pinia);

    const wizard = useWizardStore();
    const situation = useSituationStore();
    const agreement = useAgreementStore();
    const arretees = useArreteesStore();
    const ui = useUiStore();

    wizard.$patch({ currentStep: 3, mode: 'manual' });
    situation.$patch({ anciennete: 7 });
    agreement.$patch({ activeAccordId: 'kuhn', accordActif: true });
    arretees.$patch({ dateEmbauche: '2015-01-01', surSMHSeul: false });
    ui.$patch({ nbMois: 13, wizardSessionKey: 2 });

    ui.resetAll();

    expect(ui.wizardSessionKey).toBe(3);
    expect(wizard.currentStep).toBe(1);
    expect(wizard.mode).toBe('estimation');
    expect(situation.anciennete).toBe(0);
    expect(agreement.activeAccordId).toBe(null);
    expect(agreement.accordActif).toBe(false);
    expect(arretees.dateEmbauche).toBe('');
    expect(arretees.surSMHSeul).toBe(true);
    expect(ui.nbMois).toBe(12);
    expect(sessionStorage.length).toBe(0);

    setActivePinia(undefined);
  });
});
