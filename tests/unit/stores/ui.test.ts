import { describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { useAgreementStore } from '@/stores/agreement';
import { useArreteesStore } from '@/stores/arretees';
import { useSituationStore } from '@/stores/situation';
import { useUiStore } from '@/stores/ui';
import { useWizardStore } from '@/stores/wizard';
import { createFreshPinia } from './createFreshPinia';

describe('useUiStore', () => {
  it('markDirty bascule isDirty à true', () => {
    const pinia = createFreshPinia();
    const ui = useUiStore(pinia);
    expect(ui.isDirty).toBe(false);
    ui.markDirty();
    expect(ui.isDirty).toBe(true);
  });

  it('nbMois accepte 12 ou 13', () => {
    const pinia = createFreshPinia();
    const ui = useUiStore(pinia);
    expect(ui.nbMois).toBe(12);
    ui.$patch({ nbMois: 13 });
    expect(ui.nbMois).toBe(13);
  });

  it('resetAll réinitialise les stores enregistrés et vide sessionStorage', () => {
    sessionStorage.setItem('dummy', 'x');
    const pinia = createPinia();
    pinia.use(piniaPluginPersistedstate);
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
    ui.$patch({ nbMois: 13, isDirty: true, wizardSessionKey: 2 });

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
    expect(ui.isDirty).toBe(false);
    expect(sessionStorage.length).toBe(0);

    setActivePinia(undefined);
  });
});
