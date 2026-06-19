import { describe, expect, it } from 'vitest';
import '@/accords/index';
import { resolveWizardRemunerationElements } from '@/domain/remuneration/compute';
import type { WizardRemunerationInput } from '@/domain/remuneration/compute';

function fullModalitiesInput(
  overrides: Partial<WizardRemunerationInput['situation']> = {},
): WizardRemunerationInput {
  return {
    mode: 'manual',
    groupe: 'B',
    classe: 5,
    scores: {},
    situation: {
      anciennete: 5,
      pointTerritorial: 5.9,
      tempsPartiel: false,
      tauxActivite: 100,
      forfait: '35h',
      experiencePro: 5,
      travailNuit: true,
      heuresNuit: 5,
      travailDimanche: true,
      heuresDimanche: 5,
      travailHeuresSup: true,
      heuresSup: 5,
      travailJoursSupForfait: false,
      joursSupForfait: 0,
      nationalPrimeOverrides: { primeEquipe: 0.86, majorationNuitPosteMatin: 0.15 },
      modalityState: {
        majorationInterventionAstreinte: true,
        heuresInterventionAstreinte: 5,
        primePanierNuit: true,
        nbPaniersNuit: 5,
        primeHabillageDeshabillage: true,
        primeDeplacementProfessionnel: true,
        heuresDeplacementCompense: 5,
        primeInventionBrevetable: true,
        nombreInventionsBrevetablesAn: 5,
        primeAstreintePeriodeReposQuotidien: true,
        periodesAstreinteReposQuotidienMois: 5,
        primeAstreintePeriodeJourRepos: true,
        periodesAstreinteJourReposMois: 5,
      },
      ...overrides,
    },
    agreement: {
      accordActif: true,
      activeAccordId: 'kuhn',
      inputs: {
        travailEquipe: true,
        heuresEquipe: 151.67,
        primeVacances: true,
        majorationNuitPosteMatin: true,
        heuresMajorationNuitPosteMatin: 5,
      },
    },
  };
}

describe('prime équipe CCNM sans accord', () => {
  it('produit une ligne équipe quand travailEquipe est activé dans modalityState', () => {
    const { details } = resolveWizardRemunerationElements({
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
        modalityState: { travailEquipe: true },
      },
      agreement: { accordActif: false, activeAccordId: null, inputs: {} },
    });

    const equipe = details.find((d) => d.semanticId === 'primeEquipe');
    expect(equipe).toBeDefined();
    expect(equipe!.amount).toBeGreaterThan(0);
    expect(equipe!.inclusDansSMH).toBe(false);
  });
});

describe('toutes modalités cochées avec quantités > 0', () => {
  it('produit une ligne de détail pour chaque famille saisie', () => {
    const { details } = resolveWizardRemunerationElements(fullModalitiesInput());
    const labels = details.filter((d) => d.amount > 0).map((d) => d.label.toLowerCase());

    expect(labels.some((l) => l.includes('ancienneté'))).toBe(true);
    expect(labels.some((l) => l.includes('vacances'))).toBe(true);
    expect(labels.some((l) => l.includes('nuit'))).toBe(true);
    expect(labels.some((l) => l.includes('dimanche'))).toBe(true);
    expect(labels.some((l) => l.includes('supplément'))).toBe(true);
    expect(labels.some((l) => l.includes('équipe'))).toBe(true);
    expect(labels.some((l) => l.includes('habillage'))).toBe(true);
    expect(labels.some((l) => l.includes('intervention'))).toBe(true);
    expect(labels.some((l) => l.includes('panier'))).toBe(true);
    expect(labels.some((l) => l.includes('déplacement'))).toBe(true);
    expect(labels.some((l) => l.includes('invention'))).toBe(true);
    expect(labels.some((l) => l.includes('astreinte'))).toBe(true);
  });

  it('quantité à zéro : pas de ligne hors SMH (activation seule insuffisante)', () => {
    const { details } = resolveWizardRemunerationElements(
      fullModalitiesInput({
        modalityState: {
          primePanierNuit: true,
          nbPaniersNuit: 0,
        },
      }),
    );
    expect(details.some((d) => d.amount > 0 && d.label.toLowerCase().includes('panier'))).toBe(
      false,
    );
  });
});
