/**
 * Contrôle de conformité au SMH — étanchéité des variables (jurisprudence déc. 2025, art. 140 CCNM).
 * @see smhAssiettePolicy.ts
 */
import { SEMANTIC_ID, type ElementDef, type ElementResult } from '../types';
import { roundToEuro } from '../utils/rounding';

/** Primes de sujétion / organisation — toujours exclues de l'assiette SMH. */
export const SUJETION_SEMANTIC_IDS: ReadonlySet<string> = new Set([
  SEMANTIC_ID.PRIME_EQUIPE,
  SEMANTIC_ID.PRIME_HABILLAGE_DESHABILLAGE,
  SEMANTIC_ID.PRIME_DEPLACEMENT_PRO,
  SEMANTIC_ID.PRIME_ASTREINTE_DISPONIBILITE,
  SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_REPOS_QUOTIDIEN,
  SEMANTIC_ID.PRIME_ASTREINTE_PERIODE_JOUR_REPOS,
  SEMANTIC_ID.PRIME_PANIER_NUIT,
  SEMANTIC_ID.MAJORATION_NUIT,
  SEMANTIC_ID.MAJORATION_DIMANCHE,
  SEMANTIC_ID.MAJORATION_HEURES_SUP_25,
  SEMANTIC_ID.MAJORATION_HEURES_SUP_50,
  SEMANTIC_ID.MAJORATION_INTERVENTION_ASTREINTE,
  SEMANTIC_ID.RACHAT_JOURS_REPOS_FORFAIT,
]);

export interface SmhAssietteLine {
  amount: number;
  inclusDansSMH?: boolean | 'ifSuperiorToConvention';
  semanticId?: string;
  kind?: string;
}

export function isSujetionSemanticId(semanticId: string | undefined): boolean {
  if (!semanticId) return false;
  return SUJETION_SEMANTIC_IDS.has(semanticId);
}

/** Verrouille l'exclusion SMH des sujétions (prioritaire sur une définition accord erronée). */
export function applySmhInclusionPolicy(
  def: Pick<ElementDef, 'semanticId' | 'kind' | 'inclusDansSMH'>,
  resolved: boolean | 'ifSuperiorToConvention',
): boolean | 'ifSuperiorToConvention' {
  if (def.kind === 'majoration') return false;
  if (isSujetionSemanticId(def.semanticId)) return false;
  return resolved;
}

/** Applique la policy sur un résultat calculé. */
export function applySmhInclusionPolicyToResult(result: ElementResult): ElementResult {
  const resolved =
    result.inclusDansSMH === 'ifSuperiorToConvention'
      ? result.inclusDansSMH
      : result.inclusDansSMH === true;
  const policy = applySmhInclusionPolicy(
    { semanticId: result.semanticId, kind: result.kind, inclusDansSMH: result.inclusDansSMH },
    resolved,
  );
  if (policy === 'ifSuperiorToConvention') {
    return { ...result, inclusDansSMH: policy };
  }
  return { ...result, inclusDansSMH: policy === true };
}

export function detailContributesToSmhAssiette(d: SmhAssietteLine): boolean {
  if (!(d.amount > 0)) return false;
  if (d.inclusDansSMH !== true) return false;
  if (d.kind === 'majoration') return false;
  if (isSujetionSemanticId(d.semanticId)) return false;
  return true;
}

/** Assiette indicative = base SMH + lignes incluses (forfaits cadre, primes accord incluses). */
export function computeSmhAssietteVerif(
  baseSMH: number,
  details: ReadonlyArray<SmhAssietteLine>,
): number {
  const inSmhSum = details.filter(detailContributesToSmhAssiette).reduce((s, d) => s + d.amount, 0);
  return roundToEuro(baseSMH + inSmhSum);
}
