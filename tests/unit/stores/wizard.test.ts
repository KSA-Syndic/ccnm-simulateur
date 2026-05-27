import { describe, expect, it } from 'vitest';
import { useWizardStore } from '@/stores/wizard';
import { createFreshPinia } from './createFreshPinia';

describe('useWizardStore', () => {
  it('état initial attendu', () => {
    const pinia = createFreshPinia();
    const w = useWizardStore(pinia);
    expect(w.currentStep).toBe(1);
    expect(w.maxStepReached).toBe(1);
    expect(w.mode).toBe('estimation');
    expect(w.groupe).toBe('A');
    expect(w.classe).toBe(1);
    expect(w.scores).toEqual({});
  });

  it('$patch met à jour la navigation et le mode', () => {
    const pinia = createFreshPinia();
    const w = useWizardStore(pinia);
    w.$patch({ currentStep: 3, maxStepReached: 3, mode: 'manual', groupe: 'B', classe: 5 });
    expect(w.currentStep).toBe(3);
    expect(w.maxStepReached).toBe(3);
    expect(w.mode).toBe('manual');
    expect(w.groupe).toBe('B');
    expect(w.classe).toBe(5);
  });

  it('$reset restaure les valeurs par défaut', () => {
    const pinia = createFreshPinia();
    const w = useWizardStore(pinia);
    w.$patch({ currentStep: 4, mode: 'manual', scores: { x: 2 } });
    w.$reset();
    expect(w.currentStep).toBe(1);
    expect(w.mode).toBe('estimation');
    expect(w.scores).toEqual({});
  });
});
