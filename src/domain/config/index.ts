import { z } from 'zod/v4';

// ── Schemas ──

const SmhGridSchema = z.record(z.coerce.number(), z.number().positive());
const SmhByYearSchema = z.record(z.coerce.number(), SmhGridSchema);

const BaremeDebutantsSchema = z.record(z.coerce.number(), z.record(z.coerce.number(), z.number()));

const IndemniteRepasSchema = z.object({
  surLieuTravail: z.number(),
  horsLocauxEntreprise: z.number(),
  restaurantDeplacement: z.number(),
});

const ContrepartiesOrganisationSchema = z.object({
  astreinteDisponibiliteSMHParPeriode: z.object({
    surReposQuotidienDansAstreinte: z.number(),
    surJourRepos: z.number(),
  }),
  habillageHeuresSMHParSemaine: z.number(),
  panierNuitHeuresMinParPoste: z.number(),
  inventionBrevetableMinimumEuros: z.number(),
  rolesSimulation: z.object({
    horsAssietteComparaisonSMH: z.boolean(),
    noteAssimilee: z.string(),
  }),
});

const MappingPointEntrySchema = z.tuple([z.number(), z.number(), z.string(), z.number()]);

const CritereSchema = z.object({
  id: z.string(),
  nom: z.string(),
  description: z.string(),
  /** Référence textuelle sourcée pour l’infobulle (CCNM — annexe classification). */
  sourceArticle: z.string(),
  labels: z.record(z.coerce.number(), z.string()),
  degres: z.record(z.coerce.number(), z.string()),
});

const SmhUpdateYearSchema = z.object({
  effectiveDate: z.string(),
  indicativeRate: z.number(),
  change: z.string(),
  sourceLabel: z.string(),
  sourceUrl: z.string(),
});

const TooltipTextsSchema = z.object({
  origins: z.object({
    codeTravail: z.string(),
    ccnm: z.string(),
    accordEntreprise: z.string(),
    accordCollectif: z.string(),
  }),
  templates: z.object({ legalBlock: z.string() }),
  result: z.object({ breakdownLineTemplate: z.string() }),
});

export const ConfigSchema = z.object({
  CURRENT_DATA_YEAR: z.number().int().min(2024),
  SMH: SmhGridSchema,
  SMH_BY_YEAR: SmhByYearSchema,
  SMH_UPDATE: z.object({
    referenceYear: z.number(),
    updatedAt: z.string(),
    years: z.record(z.coerce.number(), SmhUpdateYearSchema),
  }),
  BAREME_DEBUTANTS: z.record(z.coerce.number(), z.record(z.coerce.number(), z.number())),
  BAREME_DEBUTANTS_BY_YEAR: z.record(z.coerce.number(), BaremeDebutantsSchema),
  /** Années d’expérience professionnelle totale : strictement en-deçà → barème débutants F11/F12 (paramètre catalogue). */
  BAREME_DEBUTANTS_SEUIL_EXP_PRO: z.number().int().positive(),
  INDEMNITE_REPAS_NUIT_ACOSS_BY_YEAR: z.record(z.coerce.number(), IndemniteRepasSchema),
  CCNM_CONTREPARTIES_ORGANISATION: ContrepartiesOrganisationSchema,
  TAUX_ANCIENNETE: z.record(z.coerce.number(), z.number()),
  POINT_TERRITORIAL: z.object({
    valeurDefaut: z.number(),
    territoire: z.string(),
  }),
  MAPPING_POINTS: z.array(MappingPointEntrySchema),
  GROUPE_CLASSES: z.record(z.string(), z.array(z.number())),
  SEUIL_CADRE: z.number().int(),
  ANCIENNETE: z.object({
    seuil: z.number().int(),
    plafond: z.number().int(),
    inclusDansSMH: z.boolean(),
  }),
  FORFAITS: z.record(z.string(), z.number()),
  MAJORATIONS_CCN: z.object({
    nuit: z.number(),
    dimanche: z.number(),
    heuresSup25: z.number(),
    heuresSup50: z.number(),
  }),
  TOOLTIP_TEXTS: TooltipTextsSchema,
  JOURS_OUVRES_CCN: z.number().int(),
  DUREE_LEGALE_HEURES_MOIS: z.number(),
  PRIME_EQUIPE_POSTES_MENSUELS_DEFAUT: z.number().int(),
  PRIME_EQUIPE_MINUTES_PAR_POSTE: z.number().int(),
  HEURES_SUP_TRANCHE_1_MENSUELLES: z.number(),
  FORFAIT_JOURS_REFERENCE: z.number().int(),
  FORFAIT_JOURS_RACHAT_MAJORATION_MIN: z.number(),
  TAUX_ACTIVITE_DEFAUT: z.number(),
  TAUX_ACTIVITE_MIN: z.number(),
  TAUX_ACTIVITE_MAX: z.number(),
  CRITERES: z.array(CritereSchema),
  UMAMI_WEBSITE_ID: z.string(),
  UMAMI_SCRIPT_URL: z.string(),
  /** Taux d’inflation annuels (%) — secours si APIs indisponibles (série indicative INSEE 2010–2025, mises à jour manuelles). */
  INFLATION_FALLBACK_SERIES: z.record(z.coerce.number(), z.number()),
  INFLATION_FALLBACK_PERIOD: z.string(),
  /** Nombre d’années pour la moyenne d’inflation (fenêtre glissante récente) et `lastTimePeriod` Eurostat. */
  INFLATION_AVG_WINDOW_YEARS: z.number().int().positive(),
});

export type Config = z.infer<typeof ConfigSchema>;

// ── Data ──

const CURRENT_DATA_YEAR = 2026;

const SMH_BY_YEAR: Record<number, Record<number, number>> = {
  2024: {
    1: 21700,
    2: 21850,
    3: 22450,
    4: 23400,
    5: 24250,
    6: 25550,
    7: 26400,
    8: 28450,
    9: 30500,
    10: 33700,
    11: 34900,
    12: 36700,
    13: 40000,
    14: 43900,
    15: 47000,
    16: 52000,
    17: 59300,
    18: 68000,
  },
  2025: {
    1: 21700,
    2: 21850,
    3: 22450,
    4: 23400,
    5: 24250,
    6: 25550,
    7: 26400,
    8: 28450,
    9: 30500,
    10: 33700,
    11: 34900,
    12: 36700,
    13: 40000,
    14: 43900,
    15: 47000,
    16: 52000,
    17: 59300,
    18: 68000,
  },
  2026: {
    1: 21980,
    2: 22100,
    3: 22710,
    4: 23620,
    5: 24510,
    6: 25780,
    7: 26680,
    8: 28700,
    9: 30760,
    10: 33970,
    11: 35200,
    12: 37000,
    13: 40350,
    14: 44250,
    15: 47380,
    16: 52370,
    17: 59720,
    18: 68450,
  },
};

const BAREME_DEBUTANTS_BY_YEAR: Record<number, Record<number, Record<number, number>>> = {
  2024: {
    11: { 0: 28200, 2: 29610, 4: 31979, 6: 34900 },
    12: { 0: 29700, 2: 31185, 4: 33680, 6: 36700 },
  },
  2025: {
    11: { 0: 28200, 2: 29610, 4: 31979, 6: 34900 },
    12: { 0: 29700, 2: 31185, 4: 33680, 6: 36700 },
  },
  2026: {
    11: { 0: 28430, 2: 29852, 4: 32240, 6: 35200 },
    12: { 0: 29940, 2: 31437, 4: 33952, 6: 37000 },
  },
};

const INDEMNITE_REPAS_NUIT_ACOSS_BY_YEAR: Record<
  number,
  { surLieuTravail: number; horsLocauxEntreprise: number; restaurantDeplacement: number }
> = {
  2025: { surLieuTravail: 7.4, horsLocauxEntreprise: 10.3, restaurantDeplacement: 21.2 },
  2026: { surLieuTravail: 7.5, horsLocauxEntreprise: 10.4, restaurantDeplacement: 21.4 },
};

const smhForYear = SMH_BY_YEAR[CURRENT_DATA_YEAR];
const baremeForYear = BAREME_DEBUTANTS_BY_YEAR[CURRENT_DATA_YEAR];

if (!smhForYear || !baremeForYear) {
  throw new Error(`[CONFIG] Données annuelles incomplètes pour ${CURRENT_DATA_YEAR}.`);
}

/** Seuil (années) : expérience pro &lt; seuil → barème débutants F11/F12 (paramètre catalogue / aligné CCNM). */
const BAREME_DEBUTANTS_SEUIL_EXP_PRO = 6;

/** Référence unique pour les infobulles des 6 critères de classification. */
const CCNM_SOURCE_ANNEXE_CLASSIFICATION_6_CRITERES =
  'CCNM — annexe de classification (grille à 6 critères)';

/**
 * IPC France — taux annuels (%) intégrés en secours (source INSEE / projections indicatives).
 * Ne pas utiliser comme vérité juridique : paramètre de simulation uniquement.
 */
const INFLATION_FALLBACK_SERIES: Record<number, number> = {
  2025: 1.8,
  2024: 2.0,
  2023: 4.9,
  2022: 5.2,
  2021: 1.6,
  2020: 0.5,
  2019: 1.1,
  2018: 1.8,
  2017: 1.0,
  2016: 0.2,
  2015: 0.0,
  2014: 0.5,
  2013: 0.9,
  2012: 2.0,
  2011: 2.1,
  2010: 1.5,
};

const INFLATION_FALLBACK_PERIOD = '2010-2025';

const INFLATION_AVG_WINDOW_YEARS = 20;

export const CONFIG: Config = ConfigSchema.parse({
  CURRENT_DATA_YEAR,
  SMH: smhForYear,
  SMH_BY_YEAR,
  SMH_UPDATE: {
    referenceYear: CURRENT_DATA_YEAR,
    updatedAt: '2026-03-12',
    years: {
      2024: {
        effectiveDate: '2024-01-01',
        indicativeRate: 0,
        change: "Base CCNM 2024 (grille d'origine du simulateur)",
        sourceLabel: 'Convention collective métallurgie (grille de base 2024)',
        sourceUrl: '',
      },
      2025: {
        effectiveDate: '2025-01-01',
        indicativeRate: 0,
        change: 'Pas de revalorisation nationale consolidée (grille 2024 reconduite)',
        sourceLabel: 'Négociation annuelle de branche 2025 sans avenant national étendu',
        sourceUrl: '',
      },
      2026: {
        effectiveDate: '2026-01-01',
        indicativeRate: 0.0086,
        change: 'Revalorisation moyenne annoncée +0,86%',
        sourceLabel: 'Avenant du 20 février 2026 à la CCN Métallurgie',
        sourceUrl:
          'https://uimm.lafabriquedelavenir.fr/wp-content/uploads/2026/03/Avenant-accord-SMH-2026-a-la-CCN-du-07.02.2022_VA.pdf',
      },
    },
  },
  BAREME_DEBUTANTS: baremeForYear,
  BAREME_DEBUTANTS_BY_YEAR,
  BAREME_DEBUTANTS_SEUIL_EXP_PRO,
  INDEMNITE_REPAS_NUIT_ACOSS_BY_YEAR,
  CCNM_CONTREPARTIES_ORGANISATION: {
    astreinteDisponibiliteSMHParPeriode: { surReposQuotidienDansAstreinte: 1, surJourRepos: 2 },
    habillageHeuresSMHParSemaine: 0.5,
    panierNuitHeuresMinParPoste: 6,
    inventionBrevetableMinimumEuros: 300,
    rolesSimulation: {
      horsAssietteComparaisonSMH: true,
      noteAssimilee:
        "Les contreparties liées à l'organisation du travail sont calculées en sus du SMH et ne réduisent pas la base servant à vérifier le minimum hiérarchique (paramétrage du simulateur ; jurisprudence et texte applicable à confirmer sur chaque dossier).",
    },
  },
  TAUX_ANCIENNETE: {
    1: 1.45,
    2: 1.6,
    3: 1.75,
    4: 1.95,
    5: 2.2,
    6: 2.45,
    7: 2.6,
    8: 2.9,
    9: 3.3,
    10: 3.8,
  },
  POINT_TERRITORIAL: {
    valeurDefaut: 5.9,
    territoire: 'Bas-Rhin (67)',
  },
  MAPPING_POINTS: [
    [6, 8, 'A', 1],
    [9, 11, 'A', 2],
    [12, 14, 'B', 3],
    [15, 17, 'B', 4],
    [18, 20, 'C', 5],
    [21, 23, 'C', 6],
    [24, 26, 'D', 7],
    [27, 29, 'D', 8],
    [30, 33, 'E', 9],
    [34, 37, 'E', 10],
    [38, 41, 'F', 11],
    [42, 45, 'F', 12],
    [46, 49, 'G', 13],
    [50, 52, 'G', 14],
    [53, 55, 'H', 15],
    [56, 57, 'H', 16],
    [58, 59, 'I', 17],
    [60, 60, 'I', 18],
  ],
  GROUPE_CLASSES: {
    A: [1, 2],
    B: [3, 4],
    C: [5, 6],
    D: [7, 8],
    E: [9, 10],
    F: [11, 12],
    G: [13, 14],
    H: [15, 16],
    I: [17, 18],
  },
  SEUIL_CADRE: 11,
  ANCIENNETE: { seuil: 3, plafond: 15, inclusDansSMH: false },
  FORFAITS: { '35h': 0, heures: 0.15, jours: 0.3 },
  MAJORATIONS_CCN: { nuit: 0.15, dimanche: 1.0, heuresSup25: 0.25, heuresSup50: 0.5 },
  TOOLTIP_TEXTS: {
    origins: {
      codeTravail: 'Code du travail',
      ccnm: 'Convention collective nationale de la métallurgie (CCNM)',
      accordEntreprise: "Accord d'entreprise",
      accordCollectif: 'Accord collectif / usage',
    },
    templates: { legalBlock: '<strong>{title}\u00A0:</strong><br>{description}' },
    result: { breakdownLineTemplate: '• {label} : {value}' },
  },
  JOURS_OUVRES_CCN: 22,
  DUREE_LEGALE_HEURES_MOIS: 151.67,
  PRIME_EQUIPE_POSTES_MENSUELS_DEFAUT: 22,
  PRIME_EQUIPE_MINUTES_PAR_POSTE: 30,
  HEURES_SUP_TRANCHE_1_MENSUELLES: Math.round(((8 * 52) / 12) * 100) / 100,
  FORFAIT_JOURS_REFERENCE: 218,
  FORFAIT_JOURS_RACHAT_MAJORATION_MIN: 0.1,
  TAUX_ACTIVITE_DEFAUT: 100,
  TAUX_ACTIVITE_MIN: 1,
  TAUX_ACTIVITE_MAX: 100,
  CRITERES: [
    {
      id: 'complexite',
      nom: 'Complexité',
      description: 'Technicité et diversité des tâches à accomplir',
      sourceArticle: CCNM_SOURCE_ANNEXE_CLASSIFICATION_6_CRITERES,
      labels: {
        1: 'Tâches simples et répétitives',
        2: 'Tâches simples et variées',
        3: 'Tâches diversifiées avec analyse',
        4: 'Analyse et interprétation',
        5: 'Recherche de solutions',
        6: 'Définition de solutions',
        7: 'Définition de stratégies',
        8: 'Méthodes complexes',
        9: 'Orientations stratégiques',
        10: 'Plus haut niveau stratégique',
      },
      degres: {
        1: "Réalisation d'activités simples et répétitives, avec des modes opératoires précis.",
        2: "Réalisation d'activités simples et variées nécessitant de combiner des modes opératoires connus.",
        3: "Réalisation d'activités diversifiées nécessitant de combiner des modes opératoires connus et d'analyser les situations.",
        4: "Réalisation d'activités diversifiées nécessitant une analyse, une interprétation et une comparaison d'informations variées.",
        5: "Réalisation d'activités impliquant l'analyse de situations variées et la recherche de solutions dans un cadre prédéfini.",
        6: "Réalisation d'activités impliquant la définition de solutions dans un cadre général partiellement défini.",
        7: "Réalisation d'activités impliquant la définition de stratégies ou de politiques dans un cadre général.",
        8: "Réalisation d'activités nécessitant des concepts ou des méthodes complexes non formalisés.",
        9: "Réalisation d'activités impliquant la définition des orientations stratégiques majeures de l'entreprise.",
        10: "Réalisation d'activités impliquant la définition des orientations stratégiques au plus haut niveau de l'entreprise.",
      },
    },
    {
      id: 'connaissances',
      nom: 'Connaissances',
      description: 'Savoirs requis pour le poste (diplôme, expérience équivalente)',
      sourceArticle: CCNM_SOURCE_ANNEXE_CLASSIFICATION_6_CRITERES,
      labels: {
        1: 'Connaissances de base',
        2: "Compréhension d'un environnement",
        3: "Maîtrise d'un environnement",
        4: "Maîtrise d'une spécialité",
        5: 'Spécialité complexe',
        6: 'Multi-spécialités ou expertise',
        7: 'Interconnexion de domaines',
        8: 'Expertise reconnue',
        9: 'Expertise stratégique',
        10: 'Expertise au plus haut niveau',
      },
      degres: {
        1: 'Connaissances générales ou professionnelles de base.',
        2: "Connaissances générales et professionnelles permettant de comprendre le fonctionnement d'un environnement donné.",
        3: "Connaissances générales et professionnelles permettant de maîtriser le fonctionnement d'un environnement donné.",
        4: "Connaissances professionnelles permettant de maîtriser les techniques d'une spécialité.",
        5: "Connaissances professionnelles approfondies permettant de maîtriser les techniques d'une spécialité complexe.",
        6: 'Connaissances professionnelles permettant de maîtriser plusieurs spécialités ou une expertise dans une spécialité.',
        7: "Connaissances professionnelles approfondies permettant d'interconnecter plusieurs domaines d'expertise.",
        8: 'Expertise reconnue dans un domaine spécifique ou maîtrise de plusieurs domaines complexes.',
        9: 'Expertise de haut niveau reconnue dans plusieurs domaines stratégiques.',
        10: "Expertise au plus haut niveau, reconnue au-delà de l'entreprise.",
      },
    },
    {
      id: 'autonomie',
      nom: 'Autonomie',
      description: 'Latitude décisionnelle et niveau de contrôle',
      sourceArticle: CCNM_SOURCE_ANNEXE_CLASSIFICATION_6_CRITERES,
      labels: {
        1: 'Consignes précises, contrôle permanent',
        2: 'Consignes générales, contrôle fréquent',
        3: 'Instructions précises, contrôle ponctuel',
        4: 'Instructions générales, auto-contrôle',
        5: 'Organisation de son travail',
        6: "Organisation du travail d'autres",
        7: "Définition d'objectifs de domaine",
        8: "Définition d'objectifs d'entité",
        9: "Orientations d'une fonction majeure",
        10: "Orientations générales de l'entreprise",
      },
      degres: {
        1: 'Exécution de travaux à partir de consignes précises. Contrôle permanent.',
        2: 'Exécution de travaux à partir de consignes générales. Contrôle fréquent.',
        3: "Exécution de travaux à partir d'instructions de travail précises. Contrôle ponctuel.",
        4: "Exécution de travaux à partir d'instructions générales. Auto-contrôle et compte-rendu.",
        5: 'Organisation de son travail dans un cadre défini. Contrôle sur les résultats.',
        6: "Organisation de son travail et de celui d'autres dans un cadre défini. Contrôle sur les résultats et méthodes.",
        7: 'Définition des objectifs de son domaine et des moyens à mettre en œuvre. Contrôle sur les objectifs.',
        8: "Définition des objectifs et des moyens d'une entité. Responsabilité des résultats.",
        9: "Définition des orientations d'une fonction majeure. Responsabilité des résultats stratégiques.",
        10: "Définition des orientations générales de l'entreprise. Responsabilité globale des résultats.",
      },
    },
    {
      id: 'contribution',
      nom: 'Contribution',
      description: "Impact du poste sur l'organisation et les résultats",
      sourceArticle: CCNM_SOURCE_ANNEXE_CLASSIFICATION_6_CRITERES,
      labels: {
        1: 'Impact sur son poste',
        2: "Impact sur l'équipe proche",
        3: 'Impact sur le service',
        4: 'Impact sur plusieurs équipes',
        5: 'Impact sur un département',
        6: 'Impact majeur sur département',
        7: 'Impact sur une fonction',
        8: 'Impact stratégique fonctions',
        9: 'Impact stratégique global',
        10: 'Impact sur la pérennité',
      },
      degres: {
        1: 'Impact limité à son poste de travail.',
        2: 'Impact sur la qualité des résultats de son équipe proche.',
        3: 'Impact significatif sur les résultats de son équipe ou service.',
        4: "Impact significatif sur les résultats de plusieurs équipes ou d'un service.",
        5: "Impact significatif sur les résultats d'un département ou d'une entité.",
        6: "Impact majeur sur les résultats d'un département ou de plusieurs services.",
        7: "Impact majeur sur les résultats d'une fonction ou d'un établissement.",
        8: "Impact stratégique sur les résultats d'une ou plusieurs fonctions majeures.",
        9: "Impact stratégique sur les résultats globaux de l'entreprise.",
        10: "Impact déterminant sur les orientations et la pérennité de l'entreprise.",
      },
    },
    {
      id: 'encadrement',
      nom: 'Encadrement / Coopération',
      description: 'Dimension managériale ou appui technique aux autres',
      sourceArticle: CCNM_SOURCE_ANNEXE_CLASSIFICATION_6_CRITERES,
      labels: {
        1: 'Aucun encadrement',
        2: 'Transmission ponctuelle',
        3: 'Animation ponctuelle',
        4: 'Animation régulière',
        5: "Coordination d'équipe",
        6: "Encadrement d'équipe",
        7: 'Encadrement de service',
        8: 'Encadrement de département',
        9: 'Direction de fonction',
        10: 'Direction générale',
      },
      degres: {
        1: "Pas de responsabilité d'animation, de coordination ou d'encadrement.",
        2: 'Transmission ponctuelle de son savoir-faire à un collègue.',
        3: 'Animation fonctionnelle ou technique ponctuelle de collègues.',
        4: 'Animation fonctionnelle ou technique régulière de collègues.',
        5: "Coordination technique d'une équipe ou appui technique reconnu.",
        6: "Encadrement d'une équipe avec responsabilité de l'organisation du travail.",
        7: "Encadrement d'un service ou d'une équipe avec responsabilité des résultats.",
        8: "Encadrement d'un département ou d'encadrants, avec responsabilité des objectifs.",
        9: "Direction d'une fonction majeure avec encadrement de managers.",
        10: 'Direction générale ou membre du comité de direction.',
      },
    },
    {
      id: 'communication',
      nom: 'Communication',
      description: 'Nature et complexité des échanges professionnels',
      sourceArticle: CCNM_SOURCE_ANNEXE_CLASSIFICATION_6_CRITERES,
      labels: {
        1: 'Échanges simples',
        2: 'Échanges techniques élargis',
        3: 'Adaptation du discours',
        4: 'Explication et argumentation',
        5: 'Influence sur décisions',
        6: 'Négociation significative',
        7: 'Négociation majeure',
        8: 'Communication stratégique',
        9: 'Représentation haut niveau',
        10: 'Engagement global entreprise',
      },
      degres: {
        1: "Échanges d'informations simples avec son environnement immédiat.",
        2: "Échanges d'informations techniques ou pratiques dans un cercle élargi.",
        3: "Échanges d'informations variées nécessitant une adaptation du discours.",
        4: "Échanges d'informations complexes nécessitant explication et argumentation.",
        5: 'Communication influençant les décisions ou comportements de tiers.',
        6: 'Négociation avec des interlocuteurs variés sur des sujets significatifs.',
        7: "Négociation complexe engageant l'entreprise sur des sujets majeurs.",
        8: "Communication stratégique influençant les orientations d'une fonction.",
        9: "Communication à fort enjeu représentant l'entreprise à haut niveau.",
        10: "Communication au plus haut niveau engageant l'entreprise dans sa globalité.",
      },
    },
  ],
  UMAMI_WEBSITE_ID: '9859e5b8-305a-4b6d-a36e-a320c44e5c6e',
  UMAMI_SCRIPT_URL: 'https://cloud.umami.is/script.js',
  INFLATION_FALLBACK_SERIES,
  INFLATION_FALLBACK_PERIOD,
  INFLATION_AVG_WINDOW_YEARS,
});
