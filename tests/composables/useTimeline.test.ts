import { describe, expect, it } from 'vitest';
import { CONFIG } from '@/domain/config';
import type { WizardRemunerationInput } from '@/domain/remuneration/compute';
import { buildMonthlyPeriodsStub, enrichPeriodesSalaireDuMensuel } from '@/composables/useTimeline';

describe('buildMonthlyPeriodsStub', () => {
  it('commence la frise au 01/2024 si la date d’embauche est antérieure', () => {
    const periodes = buildMonthlyPeriodsStub({
      dateEmbauche: '2018-06-15',
      monthlyDu: 2000,
    });
    expect(periodes.length).toBeGreaterThan(0);
    expect(periodes[0]!.periodKey).toBe('2024-01');
  });
});

describe('useTimeline enrichPeriodesSalaireDuMensuel', () => {
  const baseWizardInput = (): WizardRemunerationInput => ({
    mode: 'manual',
    groupe: 'A',
    classe: 5,
    scores: {},
    situation: {
      anciennete: 2,
      pointTerritorial: CONFIG.POINT_TERRITORIAL.valeurDefaut,
      tempsPartiel: false,
      tauxActivite: 100,
      forfait: '35h',
      experiencePro: 5,
      travailNuit: false,
      heuresNuit: 0,
      travailDimanche: false,
      heuresDimanche: 0,
      travailHeuresSup: false,
      heuresSup: 0,
      travailJoursSupForfait: false,
      joursSupForfait: 0,
    },
    agreement: {
      accordActif: false,
      activeAccordId: null,
      inputs: {},
    },
  });

  it('met à jour salaireDu selon la grille annuelle (moteur complet, sans accord)', () => {
    const periodes = buildMonthlyPeriodsStub({
      dateEmbauche: '2024-01-01',
      monthlyDu: 9999,
    });
    expect(periodes.length).toBeGreaterThan(0);
    enrichPeriodesSalaireDuMensuel(periodes, {
      classe: 5,
      experiencePro: 5,
      tempsPartiel: false,
      tauxActivite: 100,
      wizardInput: baseWizardInput(),
      dateEmbauche: '2024-01-01',
      nbMois: 12,
      smhSeul: true,
      agreement: null,
    });
    const p2024 = periodes.find((p) => p.periodKey?.startsWith('2024'));
    expect(p2024).toBeDefined();
    expect(p2024!.salaireDu).not.toBe(9999);
    expect(p2024!.salaireDu).toBeGreaterThan(0);
  });

  it('sans accord : forfait jours (cadre) augmente le dû par rapport au forfait 35 h', () => {
    const periodes35h = buildMonthlyPeriodsStub({ dateEmbauche: '2024-01-01', monthlyDu: 0 });
    const periodesJours = buildMonthlyPeriodsStub({ dateEmbauche: '2024-01-01', monthlyDu: 0 });
    const input35h: WizardRemunerationInput = {
      ...baseWizardInput(),
      classe: 11,
      situation: { ...baseWizardInput().situation, forfait: '35h' },
    };
    const inputJours: WizardRemunerationInput = {
      ...baseWizardInput(),
      classe: 11,
      situation: { ...baseWizardInput().situation, forfait: 'jours' },
    };
    const duParams = {
      classe: 11,
      experiencePro: 5,
      tempsPartiel: false,
      tauxActivite: 100,
      dateEmbauche: '2024-01-01',
      nbMois: 12,
      smhSeul: true,
      agreement: null as const,
    };
    enrichPeriodesSalaireDuMensuel(periodes35h, { ...duParams, wizardInput: input35h });
    enrichPeriodesSalaireDuMensuel(periodesJours, { ...duParams, wizardInput: inputJours });
    const j35 = periodes35h.find((p) => p.periodKey === '2024-06');
    const jj = periodesJours.find((p) => p.periodKey === '2024-06');
    expect(j35).toBeDefined();
    expect(jj).toBeDefined();
    expect(jj!.salaireDu).toBeGreaterThan(j35!.salaireDu);
  });
});
