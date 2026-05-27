import { z } from 'zod/v4';

// ── Semantic IDs ──

export const SEMANTIC_ID = {
  PRIME_ANCIENNETE: 'primeAnciennete',
  PRIME_EQUIPE: 'primeEquipe',
  PRIME_VACANCES: 'primeVacances',
  PRIME_ASTREINTE_DISPONIBILITE: 'primeAstreinteDisponibilite',
  PRIME_ASTREINTE_PERIODE_REPOS_QUOTIDIEN: 'primeAstreintePeriodeReposQuotidien',
  PRIME_ASTREINTE_PERIODE_JOUR_REPOS: 'primeAstreintePeriodeJourRepos',
  PRIME_PANIER_NUIT: 'primePanierNuit',
  PRIME_INVENTION_BREVETABLE: 'primeInventionBrevetable',
  PRIME_HABILLAGE_DESHABILLAGE: 'primeHabillageDeshabillage',
  PRIME_DEPLACEMENT_PRO: 'primeDeplacementProfessionnel',
  MAJORATION_NUIT: 'majorationNuit',
  MAJORATION_DIMANCHE: 'majorationDimanche',
  MAJORATION_HEURES_SUP_25: 'majorationHeuresSup25',
  MAJORATION_HEURES_SUP_50: 'majorationHeuresSup50',
  MAJORATION_INTERVENTION_ASTREINTE: 'majorationInterventionAstreinte',
  FORFAIT_HEURES: 'forfaitHeures',
  FORFAIT_JOURS: 'forfaitJours',
  RACHAT_JOURS_REPOS_FORFAIT: 'rachatJoursForfait',
} as const;

export type SemanticId = (typeof SEMANTIC_ID)[keyof typeof SEMANTIC_ID] | string;

// ── ComputeRef ──

export type ComputeRef =
  | { ref: 'constant'; value: number }
  | { ref: 'config'; path: string }
  | { ref: 'context'; key: string }
  | { ref: 'state'; key: string }
  | { ref: 'input'; stateKey: string }
  /** `getAccordInput(state, key) ?? state[key]` — aligné legacy `AgreementInterface`. */
  | {
      ref: 'accordInputOrState';
      key: string;
      /** Si `raw` est `null` / `undefined` / `''` : cette valeur (ex. `defaultHeures` accord). */
      defaultIfMissing?: number;
    }
  | {
      ref: 'bareme';
      table: Record<number, number>;
      lookupKey: 'anciennete' | 'classe' | 'ancienneteAccordPrime';
    }
  | {
      /** Heures HS tranche 25 % ou 50 % à partir de `state[stateKeyHeures]` et du seuil (legacy `MajorationCalculator`). */
      ref: 'heuresSupTranche';
      stateKeyHeures: string;
      seuilMensuel: number;
      tranche: '25' | '50';
    };

// ── ComputeMode ──

export type ComputeMode =
  | {
      mode: 'heuresXtaux';
      heures: ComputeRef;
      taux: ComputeRef;
      base: ComputeRef;
      period: 'monthly' | 'annual';
      /** `true` : heures × base × taux (majoration seule, ex. accord Kuhn Art. 2). Sinon : heures × base × (1 + taux). */
      majorationSeule?: boolean;
    }
  | {
      mode: 'pourcentageXbase';
      taux: ComputeRef;
      base: ComputeRef;
      annees?: ComputeRef;
      period: 'monthly' | 'annual';
    }
  | {
      mode: 'unitesXmontant';
      unites: ComputeRef;
      montant: ComputeRef;
      period: 'monthly' | 'annual';
      /**
       * Si vrai avec `period: 'annual'` : `roundToEuro(unites × montant)` sans mensualisation ×12
       * (ex. inventions brevetables, aligné `PrimeCalculator` convention).
       */
      forfaitAnnuel?: boolean;
    }
  | {
      /** Périodes/mois × arrondi(coeff × SMH horaire de base) — astreintes hors TTE (legacy). */
      mode: 'periodesIndemniteSmh';
      periodes: ComputeRef;
      coefficientSmhParPeriode: number;
      period: 'monthly' | 'annual';
    }
  | { mode: 'montantFixe'; montant: ComputeRef; period: 'monthly' | 'annual' }
  | {
      mode: 'postesXdureeXtaux';
      postes: ComputeRef;
      dureeMinutes: ComputeRef;
      taux: ComputeRef;
      period: 'monthly' | 'annual';
      /** Si vrai : `postes × context.activityRate` (ex. prime équipe CCN, aligné `PrimeCalculator`). */
      prorataActivite?: boolean;
    }
  | { mode: 'custom'; compute: (ctx: ComputeContext) => number };

// ── Substitution ──

export type SubstitutionStrategy =
  | 'replaces'
  | 'favorPrinciple'
  | 'cumulative'
  | 'conditionalFavor';

export interface SubstitutionDecl {
  semanticId: string;
  strategy: SubstitutionStrategy;
  articlesSubstitues?: string[];
}

// ── Activation ──

export type ElementActivation =
  | { type: 'always' }
  | { type: 'stateFlag'; key: string }
  | { type: 'anciennete'; seuil: number }
  | { type: 'custom'; check: (ctx: ComputeContext) => boolean };

// ── ElementDef ──

export interface ElementDef {
  id: string;
  semanticId: SemanticId;
  kind: 'prime' | 'majoration' | 'forfait';
  source: 'convention' | 'accord';
  valueKind: 'horaire' | 'montant' | 'pourcentage' | 'majorationHoraire';
  label: string;
  computeMode: ComputeMode;
  activation?: ElementActivation;
  substitution?: SubstitutionDecl;
  inclusDansSMH?: boolean | 'ifSuperiorToConvention';
  stateKeyActif?: string;
  stateKeyHeures?: string;
  conditions?: string[];
  sourceArticle?: string;
  conditionTexte?: string;
  tooltip?: string;
  tooltipStrategy?: 'legalBlock' | 'rawHtml' | 'computed';
  uiSection?: 'main' | 'extra';
  config?: Record<string, unknown>;
}

// ── ComputeContext ──

export interface ComputeContext {
  state: Record<string, unknown>;
  tauxHoraire: number;
  tauxHoraireBase: number;
  baseSMH: number;
  salaireBase: number;
  pointTerritorial: number;
  classe: number;
  activityRate: number;
  agreement?: Record<string, unknown> | undefined;
  configValues: Record<string, unknown>;
}

// ── ElementResult ──

export interface ElementResult {
  amount: number;
  label: string;
  kind: 'prime' | 'majoration' | 'forfait';
  source: 'convention' | 'accord';
  semanticId: SemanticId;
  sourceArticle?: string | undefined;
  conditionTexte?: string | undefined;
  tooltip?: string | undefined;
  breakdown?: { label: string; value: number }[] | undefined;
  inclusDansSMH: boolean | 'ifSuperiorToConvention';
  isAgreementSpecific: boolean;
  meta?: Record<string, unknown> | undefined;
}

// ── Zod Schemas for validation ──

export const ElementDefSchema = z.object({
  id: z.string(),
  semanticId: z.string(),
  kind: z.enum(['prime', 'majoration', 'forfait']),
  source: z.enum(['convention', 'accord']),
  valueKind: z.enum(['horaire', 'montant', 'pourcentage', 'majorationHoraire']),
  label: z.string(),
  inclusDansSMH: z.union([z.boolean(), z.literal('ifSuperiorToConvention')]).optional(),
  stateKeyActif: z.string().optional(),
  stateKeyHeures: z.string().optional(),
  sourceArticle: z.string().optional(),
  conditionTexte: z.string().optional(),
  tooltip: z.string().optional(),
  tooltipStrategy: z.enum(['legalBlock', 'rawHtml', 'computed']).optional(),
  uiSection: z.enum(['main', 'extra']).optional(),
  conditions: z.array(z.string()).optional(),
});

export function isElementDef(def: unknown): def is ElementDef {
  return (
    def != null &&
    typeof def === 'object' &&
    typeof (def as Record<string, unknown>)['id'] === 'string' &&
    typeof (def as Record<string, unknown>)['semanticId'] === 'string' &&
    ['prime', 'majoration', 'forfait'].includes(String((def as Record<string, unknown>)['kind'])) &&
    ['convention', 'accord'].includes(String((def as Record<string, unknown>)['source']))
  );
}
