import { type Agreement } from '../interface';

export function createMockAgreement(overrides: Partial<Agreement> = {}): Agreement {
  return {
    id: 'test-mock',
    nom: 'Accord Test (Mock)',
    nomCourt: 'Mock',
    url: 'https://example.com/mock',
    dateEffet: '2024-01-01',
    dateSignature: '2024-01-01',
    anciennete: {
      seuil: 2,
      plafond: 20,
      tousStatuts: true,
      baseCalcul: 'salaire',
      barème: { 2: 0.02, 5: 0.05, 10: 0.1, 15: 0.15, 20: 0.16 },
    },
    majorations: {
      nuit: { posteNuit: 0.2, plageDebut: 21, plageFin: 6, seuilHeuresPosteNuit: 2 },
      dimanche: 0.5,
      heuresSupplementaires: { majoration25: 0.25, majoration50: 0.5, contingent: 370 },
    },
    primes: [
      {
        id: 'primeEquipe',
        label: "Prime d'équipe",
        sourceValeur: 'accord',
        valueType: 'horaire',
        unit: '€/h',
        valeurAccord: 1.0,
        stateKeyActif: 'travailEquipe',
        stateKeyHeures: 'heuresEquipe',
        autoHeures: true,
        inclusDansSMH: false,
        conditionAnciennete: { type: 'aucune', description: 'Aucune' },
        tooltip: 'Prime test',
      },
      {
        id: 'primeVacances',
        label: 'Prime de vacances',
        sourceValeur: 'accord',
        valueType: 'montant',
        unit: '€',
        valeurAccord: 500,
        stateKeyActif: 'primeVacances',
        defaultActif: true,
        inclusDansSMH: true,
        moisVersement: 7,
        conditionAnciennete: { type: 'annees_revolues', annees: 1, description: '1 an' },
        tooltip: 'Prime vacances test',
      },
    ],
    repartition13Mois: { actif: true, moisVersement: 11, inclusDansSMH: true },
    labels: { nomCourt: 'Mock', description: 'Accord de test pour les tests unitaires.' },
    metadata: {
      version: '1.0',
      articlesSubstitues: ['142', '143'],
      entreprise: 'Test Corp.',
    },
    ...overrides,
  };
}
