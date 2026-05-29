import { describe, expect, it } from 'vitest';
import '../../src/accords';
import { CONFIG } from '../../src/domain/config';
import {
  computeAnnualRemunerationFromWizardStores,
  wizardStoresInputFromFixtureState,
} from '../../src/domain/remuneration/compute';

function stateMinimal(over: Record<string, unknown> = {}) {
  return {
    modeManuel: false,
    groupeManuel: 'A',
    classeManuel: 1,
    scores: [2, 1, 1, 1, 1, 1],
    anciennete: 0,
    pointTerritorial: 5.9,
    forfait: '35h',
    experiencePro: 0,
    typeNuit: 'aucun',
    heuresNuit: 0,
    travailDimanche: false,
    heuresDimanche: 0,
    travailHeuresSup: false,
    heuresSup: 0,
    travailTempsPartiel: false,
    tauxActivite: 100,
    travailJoursSupForfait: false,
    joursSupForfait: 0,
    accordActif: false,
    accordInputs: { primeVacances: false, travailEquipe: false, heuresEquipe: 151.67 },
    ...over,
  };
}

describe('Invariants rémunération (moteur domaine)', () => {
  it('total ≤ 1.5 × SMH max (classe 18)', () => {
    const smhMax = CONFIG.SMH[18] ?? 0;
    const r = computeAnnualRemunerationFromWizardStores(
      wizardStoresInputFromFixtureState(stateMinimal()),
    );
    expect(r.total).toBeLessThanOrEqual(Math.ceil(smhMax * 1.5));
    expect(Number.isFinite(r.total)).toBe(true);
    expect(Number.isNaN(r.total)).toBe(false);
  });

  it('mensuel cohérent (12 mois)', () => {
    const r = computeAnnualRemunerationFromWizardStores(
      wizardStoresInputFromFixtureState(stateMinimal()),
    );
    const mensuel = Math.round(r.total / 12);
    expect(Math.abs(r.total - mensuel * 12)).toBeLessThanOrEqual(6);
  });
});
