import { z } from 'zod/v4';
import { CONFIG } from '../config';
import { SEMANTIC_ID, type ElementActivation, type ElementDef, type ComputeRef } from '../types';
import { roundToCents } from '../utils/rounding';

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
    forfaitJours: z
      .object({
        rachatJoursMajoration: z.number().optional(),
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
    tooltip: z.string().optional(),
    tooltipHeader: z.string().optional(),
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

/** Aligné legacy `isAccordPrimeActive` + seuil `annees_revolues` pour `valueKind === 'montant'`. */
function buildMontantAccordActivation(primeDef: PrimeDef): ElementActivation {
  const cond = primeDef.conditionAnciennete;
  const seuilAnc =
    cond?.type === 'annees_revolues' && typeof cond.annees === 'number' ? cond.annees : null;

  return {
    type: 'custom',
    check: (ctx) => {
      if (primeDef.inclusDansSMH !== true) {
        const key = primeDef.stateKeyActif;
        const v = getAccordInput(ctx.state, key) ?? ctx.state[key];
        if (!(v === true || v === 'true')) return false;
      }
      if (seuilAnc != null) {
        const anc = Number(ctx.state['anciennete']);
        const a = Number.isFinite(anc) ? anc : 0;
        return a >= seuilAnc;
      }
      return true;
    },
  };
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

const MOIS_VERSEMENT_LABELS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

function accordPrimeDisplayLabel(primeDef: PrimeDef): string {
  const m = primeDef.moisVersement;
  if (m != null && m >= 1 && m <= 12) {
    return `${primeDef.label} (${MOIS_VERSEMENT_LABELS[m - 1]})`;
  }
  return primeDef.label;
}

export function primeDefToElementDef(primeDef: PrimeDef, agreement: Agreement): ElementDef {
  const semanticId = resolvePrimeSemanticId(primeDef);
  const defaultHeuresLeg = Number(
    primeDef.defaultHeures ?? CONFIG.DUREE_LEGALE_HEURES_MOIS ?? 151.67,
  );

  const base: Omit<ElementDef, 'computeMode'> = {
    id: primeDef.id,
    semanticId,
    kind: 'prime',
    source: 'accord',
    valueKind: primeDef.valueType,
    label: accordPrimeDisplayLabel(primeDef),
    stateKeyActif: primeDef.stateKeyActif,
    ...(primeDef.stateKeyHeures !== undefined ? { stateKeyHeures: primeDef.stateKeyHeures } : {}),
    ...(primeDef.inclusDansSMH !== undefined ? { inclusDansSMH: primeDef.inclusDansSMH } : {}),
    ...(primeDef.tooltip !== undefined && primeDef.tooltip !== ''
      ? { tooltip: primeDef.tooltip }
      : {}),
    ...(primeDef.sourceArticle !== undefined ? { sourceArticle: primeDef.sourceArticle } : {}),
    ...(primeDef.conditionTexte !== undefined ? { conditionTexte: primeDef.conditionTexte } : {}),
    config: { ...primeDef, nomCourt: agreement.nomCourt },
  };

  if (primeDef.valueType === 'horaire') {
    const tarifAccord =
      primeDef.sourceValeur === 'accord' && primeDef.valeurAccord != null
        ? Number(primeDef.valeurAccord) || 0
        : null;

    if (tarifAccord !== null) {
      const autoHeures = primeDef.autoHeures === true || semanticId === SEMANTIC_ID.PRIME_EQUIPE;
      const unites: ComputeRef = autoHeures
        ? { ref: 'constant', value: roundToCents(defaultHeuresLeg) }
        : primeDef.stateKeyHeures
          ? { ref: 'accordInputOrState', key: primeDef.stateKeyHeures }
          : { ref: 'constant', value: 0 };

      return {
        ...base,
        computeMode: {
          mode: 'unitesXmontant',
          unites,
          montant: { ref: 'constant', value: tarifAccord },
          period: 'annual',
        },
      };
    }
  }

  if (primeDef.valueType === 'montant') {
    if (primeDef.sourceValeur === 'accord' && primeDef.valeurAccord != null) {
      const tarif = Number(primeDef.valeurAccord);
      if (Number.isFinite(tarif)) {
        return {
          ...base,
          activation: buildMontantAccordActivation(primeDef),
          computeMode: {
            mode: 'montantFixe',
            montant: { ref: 'constant', value: tarif },
            period: 'annual',
          },
        };
      }
    }
  }

  if (primeDef.valueType === 'majorationHoraire') {
    if (
      primeDef.sourceValeur === 'accord' &&
      primeDef.valeurAccord != null &&
      primeDef.stateKeyHeures
    ) {
      const tauxVal = Number(primeDef.valeurAccord);
      if (Number.isFinite(tauxVal)) {
        const defaultH = Number(
          primeDef.defaultHeures ?? CONFIG.DUREE_LEGALE_HEURES_MOIS ?? 151.67,
        );
        return {
          ...base,
          computeMode: {
            mode: 'heuresXtaux',
            heures: {
              ref: 'accordInputOrState',
              key: primeDef.stateKeyHeures,
              defaultIfMissing: defaultH,
            },
            taux: { ref: 'constant', value: tauxVal },
            base: { ref: 'context', key: 'tauxHoraire' },
            period: 'annual',
            majorationSeule: true,
          },
        };
      }
    }
  }

  const def: ElementDef = {
    ...base,
    computeMode: {
      mode: 'custom',
      compute: () => {
        if (import.meta.env?.DEV) {
          console.warn(
            '[primeDefToElementDef] Prime accord sans mapping TS (valueType / sourceValeur) — montant 0.',
            primeDef.id,
          );
        }
        return 0;
      },
    },
  };
  return def;
}

export function getAccordPrimeDefsAsElements(agreement: Agreement): ElementDef[] {
  return getPrimes(agreement).map((p) => primeDefToElementDef(p, agreement));
}
