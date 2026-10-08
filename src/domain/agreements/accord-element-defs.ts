import { CONFIG } from '../config';
import { SEMANTIC_ID, type ElementDef } from '../types';
import type { Agreement, PrimeDef } from './interface';
import { getPrimes, primeDefToElementDef, resolvePrimeSemanticId } from './interface';

function getAnciennetePrimeOverride(agreement: Agreement): PrimeDef | null {
  const primes = getPrimes(agreement);
  return primes.find((p) => resolvePrimeSemanticId(p) === SEMANTIC_ID.PRIME_ANCIENNETE) ?? null;
}

function normalizeAncienneteSmhMode(
  value: unknown,
  source: 'accord' | 'ccn',
): boolean | 'ifSuperiorToConvention' {
  if (value === 'ifSuperiorToConvention' && source === 'accord') return 'ifSuperiorToConvention';
  if (value === true || value === false) return value;
  if (source === 'accord') return false;
  return CONFIG.ANCIENNETE.inclusDansSMH === true;
}

function resolveAccordAncienneteSmhInclusion(
  agreement: Agreement,
  primeAncienneteAccord: PrimeDef | null,
): boolean | 'ifSuperiorToConvention' {
  const primeOverride = primeAncienneteAccord?.inclusDansSMH;
  if (primeOverride !== undefined) return normalizeAncienneteSmhMode(primeOverride, 'accord');
  const accordOverride = agreement.anciennete?.inclusDansSMH;
  if (accordOverride !== undefined) return normalizeAncienneteSmhMode(accordOverride, 'accord');
  /** Par défaut : prime d’entreprise dans l’assiette (rémunération du travail), distincte de la prime d’ancienneté de branche (CCNM art. 142). Voir `smhAssiettePolicy.ts`. */
  return true;
}

function buildAccordPrimeAncienneteElementDef(agreement: Agreement): ElementDef | null {
  if (!agreement.anciennete) return null;
  const primeOverlay = getAnciennetePrimeOverride(agreement);
  const inclusDansSMH = resolveAccordAncienneteSmhInclusion(agreement, primeOverlay);
  const label =
    (primeOverlay?.label && primeOverlay.label.trim()) || `Prime ancienneté ${agreement.nomCourt}`;
  const seuil = agreement.anciennete.seuil;

  const barème = agreement.anciennete.barème;
  if (typeof barème !== 'object' || barème == null || Array.isArray(barème)) return null;

  const primeDef: ElementDef = {
    id: 'primeAnciennete',
    semanticId: SEMANTIC_ID.PRIME_ANCIENNETE,
    kind: 'prime',
    source: 'accord',
    valueKind: 'pourcentage',
    label,
    inclusDansSMH,
    substitution: { semanticId: SEMANTIC_ID.PRIME_ANCIENNETE, strategy: 'favorPrinciple' },
    activation: {
      type: 'custom',
      check: (ctx) => {
        const anc = Number(ctx.state['anciennete'] ?? 0);
        const cadre = ctx.classe >= CONFIG.SEUIL_CADRE;
        if (cadre && !agreement.anciennete.tousStatuts) return false;
        return anc >= seuil;
      },
    },
    config: {
      barème,
      inclusDansSMH,
      nomCourt: agreement.nomCourt,
    },
    computeMode: {
      mode: 'pourcentageXbase',
      taux: {
        ref: 'bareme',
        table: barème as Record<number, number>,
        lookupKey: 'ancienneteAccordPrime',
      },
      base: { ref: 'context', key: 'salaireBase' },
      period: 'annual',
    },
  };

  return primeDef;
}

/** Prime déclarée `remplaceConvention` : le calcul accord est retenu (pas le max CCN / accord). */
function attachConventionSubstitution(def: ElementDef, prime: PrimeDef): ElementDef {
  if (prime.remplaceConvention !== true) return def;
  return { ...def, substitution: { semanticId: def.semanticId, strategy: 'replaces' } };
}

/** Sémantiques conventionnelles remplacées par l'accord (masquées côté formulaire CCNM). */
export function getSemantiquesRemplaceesParAccord(
  agreement: Agreement | null,
): ReadonlySet<string> {
  if (!agreement) return new Set();
  return new Set(
    getPrimes(agreement)
      .filter((p) => p.remplaceConvention === true)
      .map((p) => resolvePrimeSemanticId(p)),
  );
}

/**
 * Définitions d’éléments d’accord prêtes pour `resolveBySubstitution` + `computeElement`.
 * Primes TS : ancienneté barème, prime équipe, prime vacances, majoration nuit poste matin, etc.
 */
export function getAccordElementDefsForRemuneration(agreement: Agreement): ElementDef[] {
  const out: ElementDef[] = [];
  const anciennete = buildAccordPrimeAncienneteElementDef(agreement);
  if (anciennete) out.push(anciennete);
  for (const p of getPrimes(agreement)) {
    if (resolvePrimeSemanticId(p) === SEMANTIC_ID.PRIME_ANCIENNETE) continue;
    out.push(attachConventionSubstitution(primeDefToElementDef(p, agreement), p));
  }
  return out;
}
