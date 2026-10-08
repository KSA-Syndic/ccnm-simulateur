/**
 * Valeur du point territorial (prime d'ancienneté, CCNM art. 142) — historique par zone depuis l'entrée en
 * vigueur de la CCNM (1er janvier 2024).
 *
 * Une zone = le périmètre d'un accord territorial de valeur de point (CPTN de l'annexe 8.1 ; les CPTN regroupées
 * dont les accords fixent encore des valeurs distinctes sont détaillées : Lorraine, Provence, Côte d'Azur et Corse,
 * Occitanie avant juillet 2026).
 *
 * Sources : accords territoriaux publiés par l'UIMM (textes conventionnels, CPTN) et au BOCC / Légifrance.
 * Relevé au 8 octobre 2026 — procédure de mise à jour : `docs/MAJ_DONNEES.md`.
 *
 * `depuis` : date d'effet (AAAA-MM-JJ). `dateApproximative` : l'accord prend effet à la publication de son arrêté
 * d'extension, dont la date n'est pas référencée ; la date de signature est retenue.
 * Avant la première entrée d'une zone, la valeur en vigueur n'est pas référencée (accord antérieur non retrouvé).
 */

export interface PointTerritorialValeur {
  depuis: string;
  valeur: number;
  dateApproximative?: true;
}

export interface TerritoirePoint {
  id: string;
  nom: string;
  /** Départements couverts, avec leur numéro (affichage et recherche). */
  departements: string;
  /** Numéros de département (recherche). */
  codes: readonly string[];
  historique: readonly PointTerritorialValeur[];
}

type Ligne = [id: string, nom: string, departements: string, historique: [string, number][]];

const ZONES: readonly Ligne[] = [
  [
    'ain',
    'Ain',
    'Ain (01)',
    [
      ['2024-07-01', 4.95],
      ['2026-03-01', 5.1],
    ],
  ],
  [
    'aisne',
    'Aisne',
    'Aisne (02)',
    [
      ['2024-11-01', 5.55],
      ['2025-07-01', 5.64],
      ['2026-07-01', 5.73],
    ],
  ],
  [
    'alpes-maritimes',
    'Alpes-Maritimes',
    'Alpes-Maritimes (06)',
    [
      ['2024-07-01', 5],
      ['2025-03-01', 5.06],
      ['2026-02-01', 5.16],
    ],
  ],
  [
    'ardennes',
    'Ardennes',
    'Ardennes (08)',
    [
      ['2025-06-01', 5.04],
      ['2026-07-01', 5.08],
    ],
  ],
  [
    'aube',
    'Aube',
    'Aube (10)',
    [
      ['2024-07-01', 5],
      ['2025-07-01', 5.05],
      ['2026-06-01', 5.11],
    ],
  ],
  [
    'auvergne',
    'Auvergne',
    'Allier (03), Cantal (15), Puy-de-Dôme (63), Haute-Loire (43) : arr. de Brioude et du Puy-en-Velay',
    [
      ['2024-05-01', 5.35],
      ['2026-05-01', 5.43],
    ],
  ],
  [
    'bas-rhin',
    'Bas-Rhin',
    'Bas-Rhin (67)',
    [
      ['2024-06-01', 5.82],
      ['2025-04-01', 5.9],
      ['2026-04-01', 5.95],
    ],
  ],
  [
    'belfort-montbeliard',
    'Belfort-Montbéliard',
    'Territoire de Belfort (90), Doubs (25) : pays de Montbéliard',
    [
      ['2024-07-01', 5],
      ['2025-02-01', 5.12],
      ['2026-04-01', 5.22],
    ],
  ],
  [
    'bouches-du-rhone',
    'Bouches-du-Rhône et Alpes-de-Haute-Provence',
    'Bouches-du-Rhône (13), Alpes-de-Haute-Provence (04)',
    [
      ['2024-04-01', 5.36],
      ['2025-03-01', 5.41],
      ['2026-03-01', 5.47],
    ],
  ],
  [
    'charente',
    'Charente',
    'Charente (16)',
    [
      ['2024-06-14', 5.72],
      ['2025-01-31', 5.78],
      ['2026-01-16', 5.83],
    ],
  ],
  [
    'charente-maritime',
    'Charente-Maritime',
    'Charente-Maritime (17)',
    [
      ['2024-07-01', 5.8],
      ['2025-07-01', 5.91],
    ],
  ],
  [
    'cher',
    'Cher',
    'Cher (18)',
    [
      ['2024-05-01', 6.07],
      ['2025-05-01', 6.18],
      ['2026-05-01', 6.26],
    ],
  ],
  [
    'corse',
    'Corse',
    'Corse-du-Sud (2A), Haute-Corse (2B)',
    [
      ['2024-07-01', 3.3],
      ['2025-03-01', 3.74],
      ['2026-02-01', 4.15],
    ],
  ],
  [
    'cote-d-or',
    "Côte-d'Or",
    "Côte-d'Or (21)",
    [
      ['2025-01-01', 5.48],
      ['2026-01-01', 5.57],
    ],
  ],
  [
    'cotes-d-armor',
    "Côtes-d'Armor",
    "Côtes-d'Armor (22)",
    [
      ['2024-09-01', 5],
      ['2026-04-01', 5.15],
    ],
  ],
  [
    'deux-sevres',
    'Deux-Sèvres',
    'Deux-Sèvres (79)',
    [
      ['2024-12-01', 5.7],
      ['2026-01-01', 5.8],
    ],
  ],
  [
    'dordogne',
    'Dordogne',
    'Dordogne (24)',
    [
      ['2024-12-28', 5.3],
      ['2026-01-01', 5.45],
    ],
  ],
  [
    'doubs',
    'Doubs',
    'Doubs (25), hors pays de Montbéliard',
    [
      ['2024-07-01', 5.07],
      ['2025-02-01', 5.17],
      ['2026-04-01', 5.22],
    ],
  ],
  [
    'drome-ardeche',
    'Drôme-Ardèche',
    'Drôme (26), Ardèche (07)',
    [
      ['2025-01-01', 5.37],
      ['2026-01-01', 5.42],
    ],
  ],
  [
    'eure',
    'Eure',
    'Eure (27)',
    [
      ['2024-05-01', 5.86],
      ['2025-02-01', 5.9],
      ['2026-02-01', 5.95],
    ],
  ],
  [
    'eure-et-loir',
    'Eure-et-Loir',
    'Eure-et-Loir (28)',
    [
      ['2025-01-01', 5.88],
      ['2026-01-01', 6.08],
    ],
  ],
  [
    'finistere',
    'Finistère',
    'Finistère (29)',
    [
      ['2025-01-01', 5.25],
      ['2026-03-01', 5.35],
    ],
  ],
  [
    'flandre-douaisis',
    'Flandre-Douaisis',
    'Nord (59) : arr. de Lille et de Douai, Hazebrouck',
    [
      ['2025-09-01', 4.6],
      ['2026-08-01', 4.8],
    ],
  ],
  [
    'flandre-maritime',
    'Flandre Maritime',
    'Nord (59) : arr. de Dunkerque (partie)',
    [
      ['2024-12-01', 5.3],
      ['2025-12-01', 5.46],
    ],
  ],
  [
    'gard-lozere',
    'Gard et Lozère',
    'Gard (30), Lozère (48)',
    [
      ['2024-06-01', 5.37],
      ['2025-05-01', 5.45],
      ['2026-06-01', 5.52],
    ],
  ],
  [
    'gironde-landes',
    'Gironde et Landes',
    'Gironde (33), Landes (40) hors Seignanx',
    [['2025-09-01', 5.58]],
  ],
  [
    'haut-rhin',
    'Haut-Rhin',
    'Haut-Rhin (68)',
    [
      ['2024-06-01', 5.07],
      ['2025-04-01', 5.15],
      ['2026-04-01', 5.2],
    ],
  ],
  [
    'haute-marne',
    'Haute-Marne',
    'Haute-Marne (52)',
    [
      ['2025-06-01', 5.32],
      ['2026-07-01', 5.4],
    ],
  ],
  [
    'haute-saone',
    'Haute-Saône',
    'Haute-Saône (70)',
    [
      ['2024-07-01', 5],
      ['2025-02-01', 5.12],
      ['2026-04-01', 5.22],
    ],
  ],
  [
    'haute-savoie',
    'Haute-Savoie',
    'Haute-Savoie (74)',
    [
      ['2025-01-01', 5.4],
      ['2026-01-01', 5.48],
    ],
  ],
  [
    'hautes-pyrenees',
    'Hautes-Pyrénées',
    'Hautes-Pyrénées (65)',
    [
      ['2025-02-01', 5.78],
      ['2026-04-01', 5.86],
    ],
  ],
  [
    'ile-de-france',
    'Île-de-France',
    'Paris (75), Seine-et-Marne (77), Yvelines (78), Essonne (91), Hauts-de-Seine (92), Seine-Saint-Denis (93), Val-de-Marne (94), Val-d’Oise (95)',
    [
      ['2025-01-01', 5.24],
      ['2026-01-01', 5.29],
    ],
  ],
  [
    'ille-et-vilaine-morbihan',
    'Ille-et-Vilaine et Morbihan',
    'Ille-et-Vilaine (35), Morbihan (56)',
    [
      ['2024-05-01', 5],
      ['2025-12-01', 5.08],
    ],
  ],
  [
    'indre',
    'Indre',
    'Indre (36)',
    [
      ['2024-07-01', 6.22],
      ['2025-04-01', 6.29],
    ],
  ],
  [
    'indre-et-loire',
    'Indre-et-Loire',
    'Indre-et-Loire (37)',
    [
      ['2024-11-01', 6.03],
      ['2025-09-01', 6.12],
      ['2026-06-01', 6.23],
    ],
  ],
  [
    'isere-hautes-alpes',
    'Isère et Hautes-Alpes',
    'Isère (38), Hautes-Alpes (05)',
    [
      ['2024-04-01', 5.4],
      ['2025-03-01', 5.5],
      ['2026-03-01', 5.61],
    ],
  ],
  [
    'jura',
    'Jura',
    'Jura (39)',
    [
      ['2024-07-01', 5],
      ['2025-02-01', 5.12],
      ['2026-04-01', 5.22],
    ],
  ],
  [
    'le-havre',
    'Le Havre',
    'Seine-Maritime (76) : arr. du Havre',
    [
      ['2024-05-01', 5.97],
      ['2025-05-01', 6.02],
      ['2026-05-01', 6.07],
    ],
  ],
  [
    'limousin',
    'Limousin',
    'Corrèze (19), Creuse (23), Haute-Vienne (87)',
    [
      ['2025-01-01', 5.72],
      ['2026-03-01', 5.78],
    ],
  ],
  [
    'loir-et-cher',
    'Loir-et-Cher',
    'Loir-et-Cher (41)',
    [
      ['2023-03-01', 6.18],
      ['2026-01-01', 6.26],
    ],
  ],
  ['loire-atlantique', 'Loire-Atlantique', 'Loire-Atlantique (44)', [['2026-02-01', 6.29]]],
  [
    'loire-yssingeaux',
    "Loire et arrondissement d'Yssingeaux",
    "Loire (42), Haute-Loire (43) : arr. d'Yssingeaux",
    [
      ['2025-01-01', 5.4],
      ['2026-04-01', 5.48],
    ],
  ],
  [
    'loiret',
    'Loiret',
    'Loiret (45)',
    [
      ['2024-11-01', 6.03],
      ['2025-09-01', 6.12],
      ['2026-06-01', 6.23],
    ],
  ],
  [
    'lot-et-garonne',
    'Lot-et-Garonne',
    'Lot-et-Garonne (47)',
    [
      ['2024-07-01', 5.8],
      ['2026-07-01', 5.95],
    ],
  ],
  [
    'maine-et-loire',
    'Maine-et-Loire',
    'Maine-et-Loire (49)',
    [
      ['2024-09-01', 5.7],
      ['2025-11-01', 5.75],
    ],
  ],
  [
    'manche',
    'Manche',
    'Manche (50)',
    [
      ['2025-06-01', 5.6],
      ['2026-06-01', 5.75],
    ],
  ],
  [
    'marne',
    'Marne',
    'Marne (51)',
    [
      ['2025-06-01', 5.22],
      ['2026-06-01', 5.3],
    ],
  ],
  [
    'maubeuge',
    'Maubeuge',
    "Nord (59) : arr. d'Avesnes-sur-Helpe",
    [
      ['2025-01-01', 4.7],
      ['2025-06-01', 4.8],
      ['2026-03-01', 4.9],
    ],
  ],
  [
    'mayenne',
    'Mayenne',
    'Mayenne (53)',
    [
      ['2025-01-01', 5.5],
      ['2026-01-01', 5.57],
    ],
  ],
  ['meurthe-et-moselle', 'Meurthe-et-Moselle', 'Meurthe-et-Moselle (54)', [['2025-01-01', 5.32]]],
  ['meuse', 'Meuse', 'Meuse (55)', [['2025-01-01', 5.32]]],
  ['moselle', 'Moselle', 'Moselle (57)', [['2025-01-01', 5.27]]],
  [
    'nievre',
    'Nièvre',
    'Nièvre (58)',
    [
      ['2025-01-01', 5.31],
      ['2026-01-01', 5.41],
    ],
  ],
  [
    'normandie-sud',
    'Normandie Sud',
    'Calvados (14), Orne (61)',
    [
      ['2024-07-01', 5.5],
      ['2026-07-01', 5.56],
    ],
  ],
  [
    'occitanie-mediterranee',
    'Occitanie — Hérault, Aude, Pyrénées-Orientales',
    'Aude (11), Hérault (34), Pyrénées-Orientales (66)',
    [
      ['2025-04-01', 5.4],
      ['2026-07-01', 5.47],
    ],
  ],
  [
    'occitanie-midi-pyrenees',
    'Occitanie — Midi-Pyrénées',
    'Ariège (09), Aveyron (12), Haute-Garonne (31), Gers (32), Lot (46), Tarn (81), Tarn-et-Garonne (82)',
    [
      ['2024-05-01', 5.2],
      ['2025-04-01', 5.38],
      ['2026-07-01', 5.47],
    ],
  ],
  [
    'oise',
    'Oise',
    'Oise (60)',
    [
      ['2024-11-01', 5.46],
      ['2025-07-01', 5.55],
      ['2026-07-01', 5.65],
    ],
  ],
  [
    'pas-de-calais',
    'Pas-de-Calais',
    'Pas-de-Calais (62)',
    [
      ['2025-09-01', 4.6],
      ['2026-08-01', 4.8],
    ],
  ],
  [
    'pyrenees-atlantiques',
    'Pyrénées-Atlantiques et Seignanx',
    'Pyrénées-Atlantiques (64), Landes (40) : canton de Saint-Martin-de-Seignanx',
    [['2025-07-01', 5.9]],
  ],
  [
    'rhone',
    'Rhône',
    'Rhône (69), Isère (38) : Pont-de-Chéruy et La Verpillière',
    [
      ['2024-01-01', 4.45],
      ['2025-01-01', 4.75],
      ['2026-01-01', 5.1],
    ],
  ],
  [
    'rouen-dieppe',
    'Rouen et Dieppe',
    'Seine-Maritime (76) : arr. de Rouen et de Dieppe',
    [
      ['2024-07-01', 5.9],
      ['2025-07-01', 5.93],
      ['2026-03-01', 5.98],
    ],
  ],
  [
    'saone-et-loire',
    'Saône-et-Loire',
    'Saône-et-Loire (71)',
    [
      ['2024-07-01', 5.7],
      ['2025-01-01', 5.77],
      ['2026-01-01', 5.86],
    ],
  ],
  [
    'sarthe',
    'Sarthe',
    'Sarthe (72)',
    [
      ['2025-01-01', 5.6],
      ['2026-01-01', 5.67],
    ],
  ],
  [
    'savoie',
    'Savoie',
    'Savoie (73)',
    [
      ['2025-03-01', 5.5],
      ['2026-03-01', 5.56],
    ],
  ],
  [
    'somme',
    'Somme',
    'Somme (80), hors Vimeu',
    [
      ['2024-11-01', 5.7],
      ['2025-07-01', 5.8],
      ['2026-07-01', 5.87],
    ],
  ],
  [
    'valenciennes-cambrai',
    'Valenciennois et Cambrésis',
    'Nord (59) : arr. de Valenciennes et de Cambrai',
    [
      ['2025-03-01', 4.6],
      ['2026-03-01', 4.73],
    ],
  ],
  [
    'var',
    'Var',
    'Var (83)',
    [
      ['2024-04-01', 5],
      ['2025-03-01', 5.06],
      ['2026-03-01', 5.13],
    ],
  ],
  [
    'vaucluse',
    'Vaucluse',
    'Vaucluse (84)',
    [
      ['2024-04-01', 5],
      ['2025-03-01', 5.06],
      ['2026-03-01', 5.11],
    ],
  ],
  ['vendee', 'Vendée', 'Vendée (85)', [['2026-05-01', 5.57]]],
  [
    'vienne',
    'Vienne',
    'Vienne (86)',
    [
      ['2024-05-01', 5.67],
      ['2025-06-01', 5.77],
      ['2026-05-01', 5.85],
    ],
  ],
  [
    'vimeu',
    'Vimeu',
    'Somme (80) : Vimeu',
    [
      ['2024-11-01', 6.1],
      ['2025-07-01', 6.16],
      ['2026-07-01', 6.2],
    ],
  ],
  ['vosges', 'Vosges', 'Vosges (88)', [['2025-01-01', 5.12]]],
  [
    'yonne',
    'Yonne',
    'Yonne (89)',
    [
      ['2025-01-01', 5.31],
      ['2026-01-01', 5.41],
    ],
  ],
];

/** Accords prenant effet à la publication de l'arrêté d'extension (date de signature retenue). */
const DATES_APPROXIMATIVES = new Set(['charente']);

export const POINTS_TERRITORIAUX: readonly TerritoirePoint[] = ZONES.map(
  ([id, nom, departements, historique]) => ({
    id,
    nom,
    departements,
    codes: departements.match(/\b(?:2A|2B|\d{2})\b/g) ?? [],
    historique: historique.map(([depuis, valeur]) =>
      DATES_APPROXIMATIVES.has(id)
        ? { depuis, valeur, dateApproximative: true as const }
        : { depuis, valeur },
    ),
  }),
);
