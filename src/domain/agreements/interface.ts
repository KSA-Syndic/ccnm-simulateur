import { SEMANTIC_ID, type ElementDef } from '../types';
import { z } from 'zod/v4';

export const ConditionAncienneteSchema = z.object({
  type: z.enum(['aucune', 'annees_revolues', 'proratise']),
  annees: z.number().optional(),
  description: z.string().optional(),
});

export type ConditionAnciennete = z.infer<typeof ConditionAncienneteSchema>;

export const PrimeDefSchema = z.object({
  id: z.string(),
  semanticId: z.string().optional(),
  label: z.string(),
  sourceValeur: z.enum(['accord', 'modalite']),
  valueType: z.enum(['horaire', 'montant', 'pourcentage', 'majorationHoraire']),
  unit: z.string(),
  valeurAccord: z.number().nullable().optional(),
  stateKeyActif: z.string(),
  stateKeyHeures: z.string().optional(),
  stateKeyValeur: z.string().optional(),
  defaultActif: z.boolean().optional(),
  defaultHeures: z.number().optional(),
  autoHeures: z.boolean().optional(),
  moisVersement: z.number().min(1).max(12).optional(),
  conditionAnciennete: ConditionAncienneteSchema.optional(),
  tooltip: z.string().optional(),
  inputUnitLabel: z.string().optional(),
  nonCumulAvec: z.array(z.string()).optional(),
  uiSection: z.enum(['basique', 'accord']).optional(),
  sourceArticle: z.string().optional(),
  conditionTexte: z.string().optional(),
  inclusDansSMH: z.union([z.boolean(), z.literal('ifSuperiorToConvention')]).optional(),
});

export type PrimeDef = z.infer<typeof PrimeDefSchema>;

export const AgreementSchema = z.object({
  id: z.string(),
  nom: z.string(),
  nomCourt: z.string(),
  url: z.string(),
  dateEffet: z.string(),
  dateSignature: z.string().optional(),
  anciennete: z.object({
    seuil: z.number(),
    plafond: z.number(),
    tousStatuts: z.boolean(),
    baseCalcul: z.enum(['salaire', 'point']),
    barème: z.record(z.coerce.number(), z.number()),
    inclusDansSMH: z.union([z.boolean(), z.literal('ifSuperiorToConvention')]).optional(),
  }),
  majorations: z.object({
    nuit: z.object({
      posteNuit: z.number(),
      posteMatin: z.number().optional(),
      plageDebut: z.number(),
      plageFin: z.number(),
      seuilHeuresPosteNuit: z.number(),
    }),
    dimanche: z.number(),
    heuresSupplementaires: z
      .object({
        majoration25: z.number(),
        majoration50: z.number(),
        contingent: z.number().optional(),
      })
      .optional(),
  }),
  primes: z.array(PrimeDefSchema),
  repartition13Mois: z.object({
    actif: z.boolean(),
    moisVersement: z.number(),
    inclusDansSMH: z.boolean(),
  }),
  conges: z.record(z.string(), z.unknown()).optional(),
  elements: z.array(z.record(z.string(), z.unknown())).optional(),
  pointsVigilance: z.array(z.string()).optional(),
  labels: z.object({
    nomCourt: z.string(),
    description: z.string().optional(),
  }),
  metadata: z.object({
    version: z.string(),
    articlesSubstitues: z.array(z.string()),
    territoire: z.string().optional(),
    entreprise: z.string(),
  }),
  syndicatNom: z.string().optional(),
  syndicatEmail: z.string().optional(),
});

export type Agreement = z.infer<typeof AgreementSchema>;

export function validateAgreement(agreement: unknown): agreement is Agreement {
  const result = AgreementSchema.safeParse(agreement);
  if (!result.success) {
    console.warn('Agreement validation failed:', result.error.message);
    return false;
  }
  return true;
}

export function getPrimes(agreement: Agreement | null | undefined): PrimeDef[] {
  if (!agreement || !Array.isArray(agreement.primes)) return [];
  return agreement.primes;
}

export function getPrimeById(agreement: Agreement, primeId: string): PrimeDef | null {
  return getPrimes(agreement).find((p) => p.id === primeId) ?? null;
}

export function getAccordInput(state: Record<string, unknown>, key: string): unknown {
  if (!state) return undefined;
  const inputs = state['accordInputs'] as Record<string, unknown> | undefined;
  return inputs && key in inputs ? inputs[key] : state[key];
}

function normalizePrimeKey(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function resolvePrimeSemanticId(primeDef: PrimeDef): string {
  const explicit = typeof primeDef.semanticId === 'string' ? primeDef.semanticId.trim() : '';
  if (explicit) return explicit;

  const idKey = normalizePrimeKey(primeDef.id);
  const labelKey = normalizePrimeKey(primeDef.label);
  const key = `${idKey} ${labelKey}`;

  if (key.includes('anciennete')) return SEMANTIC_ID.PRIME_ANCIENNETE;
  if (key.includes('equipe')) return SEMANTIC_ID.PRIME_EQUIPE;
  if (key.includes('vacances')) return SEMANTIC_ID.PRIME_VACANCES;
  if (key.includes('panier')) return SEMANTIC_ID.PRIME_PANIER_NUIT;
  if (key.includes('habillage') || key.includes('deshabillage'))
    return SEMANTIC_ID.PRIME_HABILLAGE_DESHABILLAGE;
  if (key.includes('deplacement')) return SEMANTIC_ID.PRIME_DEPLACEMENT_PRO;
  return primeDef.id || '';
}

export function primeDefToElementDef(primeDef: PrimeDef, agreement: Agreement): ElementDef {
  const semanticId = resolvePrimeSemanticId(primeDef);
  return {
    id: primeDef.id,
    semanticId,
    kind: 'prime',
    source: 'accord',
    valueKind: primeDef.valueType,
    label: primeDef.label,
    computeMode: { mode: 'custom', compute: () => 0 },
    config: { ...primeDef, nomCourt: agreement.nomCourt },
  };
}

export function getAccordPrimeDefsAsElements(agreement: Agreement): ElementDef[] {
  return getPrimes(agreement).map((p) => primeDefToElementDef(p, agreement));
}
