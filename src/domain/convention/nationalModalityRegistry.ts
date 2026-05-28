/**
 * Registre unique des modalités nationales « Autres » (CCNM / Code).
 *
 * Pour ajouter une modalité :
 * 1. Compléter `CONVENTION_MODALITES_PRIMES` dans `catalog.ts` (clés d’état, textes juridiques).
 * 2. Ajouter une entrée dans `NATIONAL_MODALITY_ENTRIES` ci-dessous (UI + calcul + surcharge).
 * 3. Lancer `tests/domain/convention/nationalModalityRegistry.test.ts` (parité catalogue ↔ registre).
 *
 * L’UI (`AutresPrimesNationalesList`), le moteur (`getAllConventionDefs` → PDF, résultat, arriérés)
 * et les surcharges (`applyNationalPrimeOverridesToConventionDefs`) en découlent automatiquement.
 */
import { CONFIG } from '../config';
import { SEMANTIC_ID, type ComputeMode, type ElementDef } from '../types';
import {
  CONVENTION_MODALITES_PRIMES,
  type NationalPrimeOverrideRow,
  type NationalPrimeValueField,
} from './catalog';
import { buildConventionPrimeElement, modaliteToPartial } from './primeElementFactory';

export type NationalModalityCatalogKey = keyof typeof CONVENTION_MODALITES_PRIMES;

/** Cible de `nationalPrimeOverrides` pour une entrée du registre. */
export type NationalModalityOverrideKind =
  | 'heuresXtaux.taux'
  | 'heuresXtaux.base'
  | 'unitesXmontant.montant';

type ModalityRaw = (typeof CONVENTION_MODALITES_PRIMES)[NationalModalityCatalogKey];

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
  catalogKey: NationalModalityCatalogKey;
  semanticId: string;
  elementId: string;
  /** Libellé affiché dans le détail du calcul (défaut = `ui.label`). */
  calcLabel?: string;
  ui: NationalModalityUiSpec;
  allowUserOverride: boolean;
  overrideKind?: NationalModalityOverrideKind;
  buildComputeMode: (mod: ModalityRaw) => ComputeMode;
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

function mod<K extends NationalModalityCatalogKey>(key: K): ModalityRaw {
  const raw = CONVENTION_MODALITES_PRIMES[key];
  if (!raw) {
    throw new Error(`Modalité absente du catalogue : ${String(key)}`);
  }
  return raw;
}

/**
 * Source de vérité ordonnée — une entrée = une modalité « Autres » complète (UI + moteur).
 */
export const NATIONAL_MODALITY_ENTRIES: readonly NationalModalityRegistryEntry[] = [
  {
    catalogKey: 'interventionAstreinte',
    semanticId: SEMANTIC_ID.MAJORATION_INTERVENTION_ASTREINTE,
    elementId: 'majorationInterventionAstreinte',
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
      base: { ref: 'context', key: 'tauxHoraire' },
      period: 'annual',
    }),
    elementConfig: { allowUserOverride: true },
  },
  {
    catalogKey: 'astreintePeriodeReposQuotidien',
    semanticId: SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_REPOS_QUOTIDIEN,
    elementId: 'primeAstreintePeriodeReposQuotidien',
    calcLabel: 'Astreinte (périodes sur repos quotidien, hors TTE)',
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
    catalogKey: 'astreintePeriodeJourRepos',
    semanticId: SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_JOUR_REPOS,
    elementId: 'primeAstreintePeriodeJourRepos',
    calcLabel: 'Astreinte (périodes jour de repos, hors TTE)',
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
    catalogKey: 'panierNuit',
    semanticId: SEMANTIC_ID.PRIME_PANIER_NUIT,
    elementId: 'primePanierNuit',
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
    catalogKey: 'habillageDeshabillage',
    semanticId: SEMANTIC_ID.PRIME_HABILLAGE_DESHABILLAGE,
    elementId: 'primeHabillageDeshabillage',
    calcLabel: 'Prime habillage / déshabillage',
    ui: {
      label: 'Prime habillage / déshabillage',
      unit: '€/h',
      valueLabel: 'Taux horaire (optionnel)',
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
    catalogKey: 'deplacementProfessionnel',
    semanticId: SEMANTIC_ID.PRIME_DEPLACEMENT_PRO,
    elementId: 'primeDeplacementProfessionnel',
    calcLabel: 'Prime déplacements professionnels',
    ui: {
      label: 'Indemnisation déplacements professionnels',
      unit: '€/h',
      quantityLabel: 'Heures excédentaires de trajet à indemniser',
      quantityUnitLabel: 'heures indemnisées/mois',
      valueLabel: 'Taux horaire indemnitaire (optionnel)',
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
    catalogKey: 'inventionBrevetable',
    semanticId: SEMANTIC_ID.PRIME_INVENTION_BREVETABLE,
    elementId: 'primeInventionBrevetable',
    calcLabel: 'Invention de mission (brevetable)',
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

export function getNationalModalityCatalogKeys(): NationalModalityCatalogKey[] {
  return NATIONAL_MODALITY_ENTRIES.map((e) => e.catalogKey);
}

/** Sémantiques autorisées pour `nationalPrimeOverrides` (dérivé du registre). */
export function getNationalModalityOverrideSemantics(): ReadonlySet<string> {
  return new Set(
    NATIONAL_MODALITY_ENTRIES.filter((e) => e.allowUserOverride).map((e) => e.semanticId),
  );
}

export function getNationalModalityOverrideKindBySemanticId(): ReadonlyMap<
  string,
  NationalModalityOverrideKind
> {
  const map = new Map<string, NationalModalityOverrideKind>();
  for (const e of NATIONAL_MODALITY_ENTRIES) {
    if (e.allowUserOverride && e.overrideKind) {
      map.set(e.semanticId, e.overrideKind);
    }
  }
  return map;
}

function registryEntryToUiRow(entry: NationalModalityRegistryEntry): NationalPrimeOverrideRow {
  const m = mod(entry.catalogKey);
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
    const m = mod(entry.catalogKey);
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

/** Vérifie que chaque clé du catalogue possède une entrée registre (tests / CI). */
export function assertNationalModalityRegistryCoversCatalog(): void {
  const catalogKeys = Object.keys(CONVENTION_MODALITES_PRIMES) as NationalModalityCatalogKey[];
  const registryKeys = new Set(getNationalModalityCatalogKeys());
  const missing = catalogKeys.filter((k) => !registryKeys.has(k));
  const extra = [...registryKeys].filter((k) => !(k in CONVENTION_MODALITES_PRIMES));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `Registre modalités désynchronisé — manquantes: [${missing.join(', ')}], inconnues: [${extra.join(', ')}]`,
    );
  }
}
