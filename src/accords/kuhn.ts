import { type Agreement } from '../domain/agreements/interface';
import { registerAgreement } from '../domain/agreements/registry';

const KuhnAgreement: Agreement = {
  id: 'kuhn',
  nom: 'Kuhn (UES KUHN SAS/KUHN MGM SAS)',
  nomCourt: 'Kuhn',
  url: 'https://www.maitredata.com/app/accords-entreprise/kuhn-sas/300633',
  dateEffet: '2024-01-01',
  dateSignature: '2024-03-06',

  anciennete: {
    seuil: 2,
    plafond: 25,
    tousStatuts: true,
    baseCalcul: 'salaire',
    inclusDansSMH: 'ifSuperiorToConvention',
    barème: {
      2: 0.02,
      3: 0.03,
      4: 0.004,
      5: 0.05,
      6: 0.06,
      7: 0.07,
      8: 0.08,
      9: 0.09,
      10: 0.1,
      11: 0.11,
      12: 0.12,
      13: 0.13,
      14: 0.14,
      15: 0.15,
      25: 0.16,
    },
  },

  majorations: {
    nuit: {
      posteNuit: 0.2,
      plageDebut: 20,
      plageFin: 6,
      seuilHeuresPosteNuit: 2,
    },
    dimanche: 0.5,
    heuresSupplementaires: {
      majoration25: 0.25,
      majoration50: 0.5,
      contingent: 370,
    },
  },

  primes: [
    {
      id: 'primeEquipe',
      label: "Prime d'équipe",
      sourceValeur: 'accord',
      valueType: 'horaire',
      unit: '€/h',
      valeurAccord: 0.86,
      stateKeyActif: 'travailEquipe',
      stateKeyHeures: 'heuresEquipe',
      autoHeures: true,
      inclusDansSMH: false,
      conditionAnciennete: { type: 'aucune', description: 'Aucune' },
      tooltip:
        'Horaire avec pause 20 min, durée effective ≥ 6 h/poste, horaire collectif posté (équipes successives). Base de calcul : 151,67 h/mois (35 h/semaine).',
    },
    {
      id: 'primeVacances',
      label: 'Prime de vacances',
      sourceValeur: 'accord',
      valueType: 'montant',
      unit: '€',
      valeurAccord: 525,
      stateKeyActif: 'primeVacances',
      defaultActif: true,
      inclusDansSMH: true,
      moisVersement: 7,
      conditionAnciennete: { type: 'annees_revolues', annees: 1, description: '1 an au 1er juin' },
      tooltip:
        'Contrat ≥ 50 % temps légal. Non versée si contrat suspendu sur toute la période de référence (1er juin N-1 au 31 mai N).',
    },
    {
      id: 'majorationNuitPosteMatin',
      label: 'Majoration heures de nuit (poste matin/AM)',
      sourceValeur: 'accord',
      valueType: 'majorationHoraire',
      unit: '%',
      valeurAccord: 0.15,
      stateKeyActif: 'majorationNuitPosteMatin',
      stateKeyHeures: 'heuresMajorationNuitPosteMatin',
      defaultHeures: 0,
      inclusDansSMH: false,
      conditionAnciennete: { type: 'aucune', description: 'Aucune' },
      tooltip:
        'Poste matin ou après-midi débordant sur la plage 20h-6h (moins de 2h dans cette plage). +15 % du taux horaire. Ne pas cumuler avec « Travail de nuit » (+20 %).',
    },
  ],

  repartition13Mois: {
    actif: true,
    moisVersement: 11,
    inclusDansSMH: true,
  },

  conges: {
    nonCadres: [
      { anciennete: 5, jours: 1 },
      { anciennete: 14, jours: 2 },
      { anciennete: 19, jours: 3 },
    ],
    cadres: [
      { age: 30, anciennete: 1, jours: 2 },
      { age: 35, anciennete: 2, jours: 3 },
    ],
  },

  elements: [
    {
      id: 'primeVacances',
      type: 'prime',
      label: 'Prime de Vacances',
      source: 'Accord Kuhn Art. 2.5',
      conditionAnciennete: { type: 'annees_revolues', annees: 1, description: '1 an révolu' },
      dateCle: "Au 1er juin de l'année",
    },
    {
      id: 'primeAnciennete',
      type: 'prime',
      label: "Prime d'Ancienneté",
      source: 'Accord Kuhn Art. 2.1',
      conditionAnciennete: { type: 'annees_revolues', annees: 2, description: '2 ans révolus' },
      dateCle: "Mois suivant l'anniversaire",
      note: 'Assiette : rémunération de base brute.',
    },
    {
      id: 'garantie13eMois',
      type: 'garantie',
      label: '13e mois (Garantie SMH)',
      source: 'CCNM Art. 139',
      conditionAnciennete: { type: 'proratise', description: 'Aucune (Proratisé)' },
      dateCle: 'Versement selon usage entreprise',
    },
    {
      id: 'primeEquipe',
      type: 'prime',
      label: "Prime d'Équipe",
      source: 'Accord Kuhn Art. 2.2',
      conditionAnciennete: { type: 'aucune', description: 'Aucune' },
      dateCle: 'Dès le premier poste effectué',
    },
    {
      id: 'majorationNuitPosteMatin',
      type: 'prime',
      label: 'Majoration heures de nuit (poste matin/AM)',
      source: 'Accord Kuhn Art. 2 (majorations nuit)',
      conditionAnciennete: { type: 'aucune', description: 'Aucune' },
      dateCle: 'Heures entre 20h-6h hors poste de nuit (< 2h)',
      note: '+15 % du taux horaire.',
    },
  ],

  labels: {
    nomCourt: 'Kuhn',
    description:
      "Accord d'entreprise censé améliorer la convention : prime d'ancienneté dès 2 ans (au lieu de 3), prime vacances, prime équipe, 13e mois et majorations (nuit, dimanche).",
  },

  metadata: {
    version: '1.0',
    articlesSubstitues: ['142', '143', '144', '145', '146', '153-1'],
    territoire: 'Bas-Rhin (67)',
    entreprise: 'UES KUHN SAS/KUHN MGM SAS',
  },

  syndicatNom: 'CFDT Kuhn Saverne',
  syndicatEmail: 'ksa.syndic@gmail.com',
};

registerAgreement(KuhnAgreement);

export { KuhnAgreement };
