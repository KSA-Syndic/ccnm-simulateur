import { describe, expect, it } from 'vitest';
import '@/accords';
import { getAgreement } from '@/domain/agreements/registry';
import { calculateSalaireMensuelDuPourPeriode } from '@/domain/arretees/salaireDuPourMois';
import { enrichPeriodesSalaireDuMensuel } from '@/composables/useTimeline';
import type { WizardRemunerationInput } from '@/domain/remuneration/compute';
import { CONFIG } from '@/domain/config';

function kuhnWizardInput(anciennete: number): WizardRemunerationInput {
  return {
    mode: 'manual',
    groupe: 'A',
    classe: 1,
    scores: {},
    situation: {
      anciennete,
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
      accordActif: true,
      activeAccordId: 'kuhn',
      inputs: { primeVacances: true, travailEquipe: false },
    },
  };
}

describe('arriérés — répartition mensuelle accord Kuhn', () => {
  const agreement = getAgreement('kuhn')!;

  it('juillet : prime de vacances dans le dû mensuel', () => {
    const input = kuhnWizardInput(5);
    const july = calculateSalaireMensuelDuPourPeriode(input, {
      periodKey: '2025-07',
      dateEmbauche: '2020-01-15',
      nbMois: 13,
      smhSeul: false,
      agreement,
    });
    expect(july.primesVerseesCeMois).toBe(525);
    expect(july.salaireMensuelDu).toBeGreaterThan(july.mensuelDuBase);
    expect(july.primesVerseesLabels?.some((l) => /vacances/i.test(l))).toBe(true);
  });

  it('août : pas de prime vacances ce mois', () => {
    const input = kuhnWizardInput(5);
    const aug = calculateSalaireMensuelDuPourPeriode(input, {
      periodKey: '2025-08',
      dateEmbauche: '2020-01-15',
      nbMois: 13,
      smhSeul: false,
      agreement,
    });
    expect(aug.primesVerseesCeMois).toBe(0);
  });

  it('novembre : mois du 13e mois (base majorée, sans prime vacances)', () => {
    const input = kuhnWizardInput(5);
    const nov = calculateSalaireMensuelDuPourPeriode(input, {
      periodKey: '2025-11',
      dateEmbauche: '2020-01-15',
      nbMois: 13,
      smhSeul: false,
      agreement,
    });
    const oct = calculateSalaireMensuelDuPourPeriode(input, {
      periodKey: '2025-10',
      dateEmbauche: '2020-01-15',
      nbMois: 13,
      smhSeul: false,
      agreement,
    });
    expect(nov.estMois13eMois).toBe(true);
    expect(nov.primesVerseesCeMois).toBe(0);
    expect(nov.mensuelDuBase).toBeGreaterThan(oct.mensuelDuBase);
  });

  it('enrichPeriodes propage les composantes sur la frise', () => {
    const input = kuhnWizardInput(5);
    const periodes = [
      {
        label: 'juil. 2025',
        periodKey: '2025-07',
        salaireDu: 0,
        salaireVerse: undefined as number | undefined,
      },
    ];
    enrichPeriodesSalaireDuMensuel(periodes, {
      classe: 1,
      experiencePro: 5,
      tempsPartiel: false,
      tauxActivite: 100,
      wizardInput: input,
      dateEmbauche: '2020-01-15',
      nbMois: 13,
      smhSeul: false,
      agreement,
    });
    expect(periodes[0]!.primesVerseesCeMois).toBe(525);
    expect(periodes[0]!.salaireDu).toBeGreaterThan(0);
  });
});
