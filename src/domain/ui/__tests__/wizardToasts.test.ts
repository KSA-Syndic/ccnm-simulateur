import { describe, expect, it } from 'vitest';
import {
  wizardToastAncienneteMax,
  wizardToastNbMoisImposeParAccord,
  wizardToastStepperLocked,
  wizardToastTauxActivitePlage,
} from '../wizardToasts';

describe('wizardToasts', () => {
  it('nbMoisImposeParAccord — mentionne le nombre de mois et l’accord', () => {
    const msg = wizardToastNbMoisImposeParAccord(13, 'Kuhn');
    expect(msg).toContain('13 mois');
    expect(msg).toContain('Kuhn');
    expect(msg).toMatch(/ne pouvez pas la modifier/i);
  });

  it('stepperLocked — mentionne l’étape cible', () => {
    expect(wizardToastStepperLocked('Résultat')).toContain('Résultat');
  });

  it('tauxActivitePlage — borne min et max', () => {
    expect(wizardToastTauxActivitePlage(1, 100)).toMatch(/1\s*%/);
    expect(wizardToastTauxActivitePlage(1, 100)).toMatch(/100\s*%/);
  });

  it('ancienneteMax — plafond en années', () => {
    expect(wizardToastAncienneteMax(50)).toContain('50');
  });
});
