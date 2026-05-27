import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../config';
import { resolveWizardRemunerationElements } from '../compute';
import type { WizardRemunerationInput } from '../compute';

function baseInput(
  overrides: Partial<WizardRemunerationInput['situation']> = {},
): WizardRemunerationInput {
  return {
    mode: 'manual',
    groupe: 'B',
    classe: 5,
    scores: {},
    situation: {
      anciennete: 0,
      pointTerritorial: 5.9,
      tempsPartiel: false,
      tauxActivite: 100,
      forfait: '35h',
      experiencePro: 0,
      travailNuit: false,
      heuresNuit: 0,
      travailDimanche: false,
      heuresDimanche: 0,
      travailHeuresSup: false,
      heuresSup: 0,
      travailJoursSupForfait: false,
      joursSupForfait: 0,
      nationalPrimeOverrides: {},
      modalityState: {},
      ...overrides,
    },
    agreement: { accordActif: false, activeAccordId: null, inputs: {} },
  };
}

describe('nationalModalityCompute', () => {
  it('panier nuit actif avec quantité augmente le total', () => {
    const off = resolveWizardRemunerationElements(baseInput());
    const panierUnit =
      CONFIG.INDEMNITE_REPAS_NUIT_ACOSS_BY_YEAR[CONFIG.CURRENT_DATA_YEAR]?.surLieuTravail ?? 0;
    const on = resolveWizardRemunerationElements(
      baseInput({
        modalityState: { primePanierNuit: true, nbPaniersNuit: 4 },
        nationalPrimeOverrides: { primePanierNuit: panierUnit },
      }),
    );
    expect(on.details.some((d) => d.label.includes('panier nuit'))).toBe(true);
    expect(on.details.reduce((s, d) => s + d.amount, 0)).toBeGreaterThan(
      off.details.reduce((s, d) => s + d.amount, 0),
    );
  });

  it('déplacement : les heures indemnisées impactent le total', () => {
    const off = resolveWizardRemunerationElements(baseInput());
    const on = resolveWizardRemunerationElements(
      baseInput({
        modalityState: { primeDeplacementProfessionnel: true, heuresDeplacementCompense: 8 },
      }),
    );
    const line = on.details.find((d) => d.label.toLowerCase().includes('déplacement'));
    expect(line).toBeDefined();
    expect(line!.amount).toBeGreaterThan(0);
    expect(on.details.reduce((s, d) => s + d.amount, 0)).toBeGreaterThan(
      off.details.reduce((s, d) => s + d.amount, 0),
    );
  });

  it('habillage actif sans override utilise le SMH horaire', () => {
    const on = resolveWizardRemunerationElements(
      baseInput({ modalityState: { primeHabillageDeshabillage: true } }),
    );
    const line = on.details.find((d) => d.label.toLowerCase().includes('habillage'));
    expect(line).toBeDefined();
    expect(line!.amount).toBeGreaterThan(0);
  });
});
