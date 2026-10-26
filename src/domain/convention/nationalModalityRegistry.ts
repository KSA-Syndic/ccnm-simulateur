/**
 * Registre unique des modalités nationales « Autres » (CCNM / Code).
 *
 * Pour ajouter une modalité : ajouter une entrée dans `NATIONAL_MODALITY_ENTRIES` ci-dessous
 * (clés d’état et textes juridiques dans `modalite`, puis UI, calcul et surcharge).
 *
 * L’UI (`AutresPrimesNationalesList`), le moteur (`getAllConventionDefs` → PDF, résultat, arriérés)
 * et les surcharges (`applyNationalPrimeOverridesToConventionDefs`) en découlent automatiquement.
 */
import { CONFIG } from '../config';
import { SEMANTIC_ID, type ComputeMode, type ElementDef } from '../types';
import { buildConventionPrimeElement, modaliteToPartial } from './primeElementFactory';

/** Règle d’affichage des modalités « Autres » dans le formulaire. */
export const UI_VISIBLE_MODALITE = {
  TOUJOURS: 'toujours',
  COMPTAGE_HORAIRE_CONVENTIONNEL: 'comptageHoraireConventionnel',
} as const;

export type UiVisibleQuand = (typeof UI_VISIBLE_MODALITE)[keyof typeof UI_VISIBLE_MODALITE];

export function isModaliteVisiblePourProfil(
  uiVisibleQuand: UiVisibleQuand | undefined,
  profil: { isCadre: boolean; forfait: string },
): boolean {
  if (!uiVisibleQuand || uiVisibleQuand === UI_VISIBLE_MODALITE.TOUJOURS) return true;
  if (uiVisibleQuand === UI_VISIBLE_MODALITE.COMPTAGE_HORAIRE_CONVENTIONNEL) {
    if (!profil.isCadre) return true;
    return profil.forfait !== 'jours';
  }
  return true;
}

export interface ModaliteRaw {
  stateKeyActif: string;
  stateKeyHeures?: string;
  inclusDansSMH: boolean;
  uiSection: 'main' | 'extra';
  uiVisibleQuand?: UiVisibleQuand;
  sourceArticle: string;
  conditionTexte: string;
  tooltip: string;
}

/** Type de champ valeur (taux / montant) pour la ligne « Autres ». */
export type NationalPrimeValueField = 'coefficient' | 'unitAmount' | 'optionalRate';

/** Lignes UI « Autres primes nationales » (activation + quantités + surcharge). */
export interface NationalPrimeOverrideRow {
  semanticId: string;
  label: string;
  unit: string;
  aide: string;
  /** Titre court pour l’infobulle (souvent identique au libellé de ligne). */
  title: string;
  sourceArticle: string;
  stateKeyActif: string;
  quantityKey?: string;
  /** Libellé au-dessus du champ quantité (ligne dédiée). */
  quantityLabel?: string;
  quantityUnitLabel?: string;
  quantityMode?: 'integer' | 'decimal';
  /** Libellé au-dessus du champ taux / montant (ligne dédiée). */
  valueLabel?: string;
  defaultQuantity?: number;
  valueField: NationalPrimeValueField;
  /** Valeur barème / préremplissage à l’activation (si `seedOverrideOnActivate`). */
  defaultValue: number;
  /** Préremplit `nationalPrimeOverrides` à l’activation (ex. panier, intervention). */
  seedOverrideOnActivate: boolean;
  /** Incrément clavier (flèches) pour le champ valeur. */
  valueStep?: number;
  uiVisibleQuand?: UiVisibleQuand;
  /** Masque le 2e champ (taux / montant) lorsque le barème est fixé par la convention. */
  hideValueField?: boolean;
}

/** Cible de `nationalPrimeOverrides` pour une entrée du registre. */
export type NationalModalityOverrideKind =
  | 'heuresXtaux.taux'
  | 'heuresXtaux.base'
  | 'unitesXmontant.montant';

export interface NationalModalityUiSpec {
  label: string;
  unit: string;
  valueField: NationalPrimeValueField;
  quantityLabel?: string;
  quantityUnitLabel?: string;
  quantityMode?: 'integer' | 'decimal';
  valueLabel?: string;
  defaultQuantity?: number;
  defaultValue: number;
  seedOverrideOnActivate: boolean;
  valueStep?: number;
  hideValueField?: boolean;
}

export interface NationalModalityRegistryEntry {
  /** Identifiant stable de la modalité (tests, diagnostics). */
  id: string;
  semanticId: string;
  elementId: string;
  /** Libellé affiché dans le détail du calcul (défaut = `ui.label`). */
  calcLabel?: string;
  /** Clés d’état et métadonnées juridiques (article, condition, infobulle). */
  modalite: ModaliteRaw;
  ui: NationalModalityUiSpec;
  allowUserOverride: boolean;
  overrideKind?: NationalModalityOverrideKind;
  buildComputeMode: (mod: ModaliteRaw) => ComputeMode;
  /** Ex. `{ allowUserOverride: true }` sur `ElementDef.config`. */
  elementConfig?: Record<string, unknown>;
  computeExtras?: Partial<ElementDef>;
}

const panierNuitUnitaire = Number(
  CONFIG.INDEMNITE_REPAS_NUIT_ACOSS_BY_YEAR[CONFIG.CURRENT_DATA_YEAR]?.surLieuTravail ?? 0,
);
const habillageHeures = Number(CONFIG.CCNM_CONTREPARTIES_ORGANISATION.habillageHeuresSMHParSemaine);
const inventionMin = Number(CONFIG.CCNM_CONTREPARTIES_ORGANISATION.inventionBrevetableMinimumEuros);
const astreinteCoeffRepos = Number(
  CONFIG.CCNM_CONTREPARTIES_ORGANISATION.astreinteDisponibiliteSMHParPeriode
    .surReposQuotidienDansAstreinte,
);
const astreinteCoeffJour = Number(
  CONFIG.CCNM_CONTREPARTIES_ORGANISATION.astreinteDisponibiliteSMHParPeriode.surJourRepos,
);
const interventionAstreinteTauxMaj = Number(CONFIG.MAJORATIONS_CCN.heuresSup25);
const habillageHeuresMensuelles = habillageHeures * (52 / 12);

/**
 * Source de vérité ordonnée — une entrée = une modalité « Autres » complète (UI + moteur).
 */
export const NATIONAL_MODALITY_ENTRIES: readonly NationalModalityRegistryEntry[] = [
  {
    id: 'interventionAstreinte',
    semanticId: SEMANTIC_ID.MAJORATION_INTERVENTION_ASTREINTE,
    elementId: 'majorationInterventionAstreinte',
    modalite: {
      stateKeyActif: 'majorationInterventionAstreinte',
      stateKeyHeures: 'heuresInterventionAstreinte',
      inclusDansSMH: false,
      uiSection: 'extra',
      uiVisibleQuand: UI_VISIBLE_MODALITE.COMPTAGE_HORAIRE_CONVENTIONNEL,
      sourceArticle: 'Code du travail L3121-9, L3121-10 ; CCNM (travail effectif)',
      conditionTexte: "Les heures d'intervention pendant une astreinte sont du travail effectif.",
      tooltip:
        'Indiquez les heures réellement travaillées en intervention. Les périodes de simple disponibilité sont traitées par les lignes « astreinte » ci-dessous (hors TTE).',
    },
    ui: {
      label: 'Intervention sous astreinte (travail effectif)',
      unit: 'coeff. / h',
      quantityLabel: 'Heures d’intervention (travail effectif)',
      quantityUnitLabel: "heures d'intervention/mois",
      valueLabel: 'Coefficient de majoration horaire',
      quantityMode: 'decimal',
      defaultQuantity: 0,
      valueField: 'coefficient',
      defaultValue: interventionAstreinteTauxMaj,
      seedOverrideOnActivate: true,
      valueStep: 0.01,
    },
    allowUserOverride: true,
    overrideKind: 'heuresXtaux.taux',
    buildComputeMode: (m) => ({
      mode: 'heuresXtaux',
      heures: { ref: 'accordInputOrState', key: m.stateKeyHeures! },
      taux: { ref: 'constant', value: interventionAstreinteTauxMaj },
      /** SMH horaire de base (comme nuit / bandeau résultat). */
      base: { ref: 'context', key: 'tauxHoraireBase' },
      period: 'annual',
    }),
    elementConfig: { allowUserOverride: true },
  },
  {
    id: 'astreintePeriodeReposQuotidien',
    semanticId: SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_REPOS_QUOTIDIEN,
    elementId: 'primeAstreintePeriodeReposQuotidien',
    calcLabel: 'Astreinte (périodes sur repos quotidien, hors TTE)',
    modalite: {
      stateKeyActif: 'primeAstreintePeriodeReposQuotidien',
      stateKeyHeures: 'periodesAstreinteReposQuotidienMois',
      inclusDansSMH: false,
      uiSection: 'extra',
      uiVisibleQuand: UI_VISIBLE_MODALITE.COMPTAGE_HORAIRE_CONVENTIONNEL,
      sourceArticle: 'CCNM (organisation du travail, astreinte hors temps de travail effectif)',
      conditionTexte:
        "Périodes d'astreinte sur les temps de repos quotidiens prévus par l'emploi du temps, hors travail effectif.",
      tooltip:
        'Nombre de périodes concernées par mois. Le montant par période suit le taux SMH horaire de votre classe.',
    },
    ui: {
      label: 'Disponibilité astreinte — repos entre deux journées',
      unit: 'périodes/mois',
      quantityLabel: 'Nombre de périodes d’astreinte sur le repos quotidien',
      quantityUnitLabel: 'périodes/mois',
      quantityMode: 'integer',
      defaultQuantity: 0,
      valueField: 'unitAmount',
      defaultValue: 0,
      seedOverrideOnActivate: false,
      hideValueField: true,
    },
    allowUserOverride: false,
    buildComputeMode: (m) => ({
      mode: 'periodesIndemniteSmh',
      periodes: { ref: 'accordInputOrState', key: m.stateKeyHeures! },
      coefficientSmhParPeriode: astreinteCoeffRepos,
      period: 'annual',
    }),
  },
  {
    id: 'astreintePeriodeJourRepos',
    semanticId: SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_JOUR_REPOS,
    elementId: 'primeAstreintePeriodeJourRepos',
    calcLabel: 'Astreinte (périodes jour de repos, hors TTE)',
    modalite: {
      stateKeyActif: 'primeAstreintePeriodeJourRepos',
      stateKeyHeures: 'periodesAstreinteJourReposMois',
      inclusDansSMH: false,
      uiSection: 'extra',
      uiVisibleQuand: UI_VISIBLE_MODALITE.COMPTAGE_HORAIRE_CONVENTIONNEL,
      sourceArticle: 'CCNM (organisation du travail, astreinte hors temps de travail effectif)',
      conditionTexte: "Périodes d'astreinte un jour de repos, hors travail effectif.",
      tooltip:
        'Nombre de périodes concernées par mois. Le montant par période applique le coefficient « jour de repos » sur le SMH horaire.',
    },
    ui: {
      label: 'Disponibilité astreinte — jour de repos',
      unit: 'périodes/mois',
      quantityLabel: 'Nombre de périodes d’astreinte un jour de repos',
      quantityUnitLabel: 'périodes/mois',
      quantityMode: 'integer',
      defaultQuantity: 0,
      valueField: 'unitAmount',
      defaultValue: 0,
      seedOverrideOnActivate: false,
      hideValueField: true,
    },
    allowUserOverride: false,
    buildComputeMode: (m) => ({
      mode: 'periodesIndemniteSmh',
      periodes: { ref: 'accordInputOrState', key: m.stateKeyHeures! },
      coefficientSmhParPeriode: astreinteCoeffJour,
      period: 'annual',
    }),
  },
  {
    id: 'panierNuit',
    semanticId: SEMANTIC_ID.PRIME_PANIER_NUIT,
    elementId: 'primePanierNuit',
    modalite: {
      stateKeyActif: 'primePanierNuit',
      stateKeyHeures: 'nbPaniersNuit',
      inclusDansSMH: false,
      uiSection: 'extra',
      sourceArticle: 'CCNM Art. 147 ; barème fiscal repas (ACOSS / Urssaf)',
      conditionTexte:
        'Indemnité de repas de nuit lorsque les critères de la branche et la durée minimale de poste sont réunis.',
      tooltip:
        "Une unité correspond en principe à un poste éligible. Le montant unitaire suit le barème repas de nuit applicable pour l'année affichée (référence type ACOSS / Urssaf) ; un employeur peut prévoir un montant plus favorable.",
    },
    ui: {
      label: 'Prime panier nuit',
      unit: '€ / unité',
      quantityLabel: 'Nombre de postes ou repas de nuit indemnisables',
      quantityUnitLabel: 'postes indemnisables/mois',
      valueLabel: 'Montant unitaire (barème repas de nuit)',
      quantityMode: 'integer',
      defaultQuantity: 0,
      valueField: 'unitAmount',
      defaultValue: panierNuitUnitaire,
      seedOverrideOnActivate: true,
      valueStep: 0.01,
    },
    allowUserOverride: true,
    overrideKind: 'unitesXmontant.montant',
    buildComputeMode: (m) => ({
      mode: 'unitesXmontant',
      unites: { ref: 'accordInputOrState', key: m.stateKeyHeures! },
      montant: { ref: 'constant', value: panierNuitUnitaire },
      period: 'annual',
    }),
    elementConfig: { allowUserOverride: true },
  },
  {
    id: 'habillageDeshabillage',
    semanticId: SEMANTIC_ID.PRIME_HABILLAGE_DESHABILLAGE,
    elementId: 'primeHabillageDeshabillage',
    calcLabel: 'Prime habillage / déshabillage',
    modalite: {
      stateKeyActif: 'primeHabillageDeshabillage',
      inclusDansSMH: false,
      uiSection: 'extra',
      sourceArticle: 'Code du travail L3121-3 ; CCNM',
      conditionTexte:
        "Contrepartie lorsque la tenue est imposée et que l'habillage ou le déshabillage s'effectue sur le lieu de travail.",
      tooltip:
        "Le simulateur applique chaque semaine l'équivalent d'une demi-heure au taux SMH horaire de votre classe.",
    },
    ui: {
      label: 'Prime habillage / déshabillage',
      unit: '€/h',
      valueLabel: 'Taux horaire de référence (facultatif, SMH par défaut)',
      valueField: 'optionalRate',
      defaultValue: 0,
      seedOverrideOnActivate: false,
      valueStep: 0.01,
    },
    allowUserOverride: true,
    overrideKind: 'unitesXmontant.montant',
    buildComputeMode: () => ({
      mode: 'unitesXmontant',
      unites: { ref: 'constant', value: habillageHeuresMensuelles },
      montant: { ref: 'context', key: 'tauxHoraireBase' },
      period: 'annual',
    }),
    elementConfig: { heuresSMHReferenceParSemaine: habillageHeures, allowUserOverride: true },
  },
  {
    id: 'deplacementProfessionnel',
    semanticId: SEMANTIC_ID.PRIME_DEPLACEMENT_PRO,
    elementId: 'primeDeplacementProfessionnel',
    calcLabel: 'Prime déplacements professionnels',
    modalite: {
      stateKeyActif: 'primeDeplacementProfessionnel',
      stateKeyHeures: 'heuresDeplacementCompense',
      inclusDansSMH: false,
      uiSection: 'extra',
      sourceArticle: 'Code du travail L3121-4 ; CCNM',
      conditionTexte:
        'Temps de trajet professionnel dépassant le temps habituel : indemnisation du temps excédentaire.',
      tooltip:
        'Saisir les heures excédentaires à indemniser ; le taux horaire retenu est le SMH de la classification.',
    },
    ui: {
      label: 'Indemnisation déplacements professionnels',
      unit: '€/h',
      quantityLabel: 'Heures excédentaires de trajet à indemniser',
      quantityUnitLabel: 'heures indemnisées/mois',
      valueLabel: 'Taux horaire indemnitaire (facultatif, SMH par défaut)',
      quantityMode: 'decimal',
      defaultQuantity: 0,
      valueField: 'optionalRate',
      defaultValue: 0,
      seedOverrideOnActivate: false,
      valueStep: 0.01,
    },
    allowUserOverride: true,
    overrideKind: 'heuresXtaux.base',
    buildComputeMode: (m) => ({
      mode: 'heuresXtaux',
      heures: { ref: 'accordInputOrState', key: m.stateKeyHeures! },
      taux: { ref: 'constant', value: 0 },
      base: { ref: 'context', key: 'tauxHoraireBase' },
      period: 'annual',
    }),
    elementConfig: { allowUserOverride: true },
  },
  {
    id: 'inventionBrevetable',
    semanticId: SEMANTIC_ID.PRIME_INVENTION_BREVETABLE,
    elementId: 'primeInventionBrevetable',
    calcLabel: 'Invention de mission (brevetable)',
    modalite: {
      stateKeyActif: 'primeInventionBrevetable',
      stateKeyHeures: 'nombreInventionsBrevetablesAn',
      inclusDansSMH: false,
      uiSection: 'extra',
      sourceArticle: 'CCNM (invention de mission brevetable)',
      conditionTexte:
        'Rémunération minimale assimilée par invention de mission donnant lieu à brevet.',
      tooltip:
        "Nombre d'inventions concernées sur l'année. Le minimum conventionnel par invention figure dans le détail du calcul.",
    },
    ui: {
      label: 'Invention brevetable',
      unit: '€ / invention',
      quantityLabel: 'Nombre d’inventions de mission brevetables (année civile)',
      quantityUnitLabel: 'inventions éligibles/an',
      valueLabel: 'Minimum conventionnel par invention',
      quantityMode: 'integer',
      defaultQuantity: 0,
      valueField: 'unitAmount',
      defaultValue: inventionMin,
      seedOverrideOnActivate: true,
      valueStep: 1,
    },
    allowUserOverride: true,
    overrideKind: 'unitesXmontant.montant',
    buildComputeMode: (m) => ({
      mode: 'unitesXmontant',
      unites: { ref: 'accordInputOrState', key: m.stateKeyHeures! },
      montant: { ref: 'constant', value: inventionMin },
      period: 'annual',
      forfaitAnnuel: true,
    }),
    elementConfig: { allowUserOverride: true },
  },
] as const;

export function getNationalModalityRegistryEntries(): readonly NationalModalityRegistryEntry[] {
  return NATIONAL_MODALITY_ENTRIES;
}

/** Sémantiques autorisées pour `nationalPrimeOverrides` (dérivé du registre). */
const OVERRIDE_SEMANTICS: ReadonlySet<string> = new Set(
  NATIONAL_MODALITY_ENTRIES.filter((e) => e.allowUserOverride).map((e) => e.semanticId),
);

export function getNationalModalityOverrideSemantics(): ReadonlySet<string> {
  return OVERRIDE_SEMANTICS;
}

const OVERRIDE_KIND_BY_SEMANTIC: ReadonlyMap<string, NationalModalityOverrideKind> = new Map(
  NATIONAL_MODALITY_ENTRIES.flatMap((e) =>
    e.allowUserOverride && e.overrideKind ? [[e.semanticId, e.overrideKind] as const] : [],
  ),
);

export function getNationalModalityOverrideKindBySemanticId(): ReadonlyMap<
  string,
  NationalModalityOverrideKind
> {
  return OVERRIDE_KIND_BY_SEMANTIC;
}

function registryEntryToUiRow(entry: NationalModalityRegistryEntry): NationalPrimeOverrideRow {
  const m = entry.modalite;
  const row: NationalPrimeOverrideRow = {
    semanticId: entry.semanticId,
    label: entry.ui.label,
    unit: entry.ui.unit,
    aide: m.tooltip,
    title: entry.ui.label,
    sourceArticle: m.sourceArticle,
    stateKeyActif: m.stateKeyActif,
    valueField: entry.ui.valueField,
    defaultValue: entry.ui.defaultValue,
    seedOverrideOnActivate: entry.ui.seedOverrideOnActivate,
  };
  if (m.stateKeyHeures) row.quantityKey = m.stateKeyHeures;
  if (entry.ui.quantityLabel !== undefined) row.quantityLabel = entry.ui.quantityLabel;
  if (entry.ui.quantityUnitLabel !== undefined) row.quantityUnitLabel = entry.ui.quantityUnitLabel;
  if (entry.ui.quantityMode !== undefined) row.quantityMode = entry.ui.quantityMode;
  if (entry.ui.valueLabel !== undefined) row.valueLabel = entry.ui.valueLabel;
  if (entry.ui.defaultQuantity !== undefined) row.defaultQuantity = entry.ui.defaultQuantity;
  if (entry.ui.valueStep !== undefined) row.valueStep = entry.ui.valueStep;
  if (m.uiVisibleQuand !== undefined) row.uiVisibleQuand = m.uiVisibleQuand;
  if (entry.ui.hideValueField !== undefined) row.hideValueField = entry.ui.hideValueField;
  return row;
}

/** Lignes UI « Autres » — dérivées du registre (ne pas dupliquer ailleurs). */
export function getNationalPrimeOverrideRows(): NationalPrimeOverrideRow[] {
  return NATIONAL_MODALITY_ENTRIES.map(registryEntryToUiRow);
}

export function buildNationalModalityElementDefs(): ElementDef[] {
  return NATIONAL_MODALITY_ENTRIES.map((entry) => {
    const m = entry.modalite;
    return buildConventionPrimeElement(
      entry.elementId,
      entry.semanticId,
      entry.calcLabel ?? entry.ui.label,
      entry.buildComputeMode(m),
      {
        ...modaliteToPartial(m),
        ...(entry.elementConfig ? { config: entry.elementConfig } : {}),
        ...entry.computeExtras,
      },
    );
  });
}
