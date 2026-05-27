import type { ElementDef } from '../types';
import type { ComputeMode } from '../types';

/**
 * Applique `nationalPrimeOverrides` sur les primes accord dont le taux/montant unitaire
 * est figé dans l’accord (`valeurAccord`) — permet la surcharge utilisateur comme le panier nuit.
 */
export function applyAccordPrimeRateOverridesFromSituation(
  defs: ElementDef[],
  overrides: Record<string, unknown>,
): ElementDef[] {
  if (!overrides || typeof overrides !== 'object' || Object.keys(overrides).length === 0) {
    return defs;
  }

  return defs.map((def) => {
    if (def.source !== 'accord') return def;
    const sid = def.semanticId;
    if (!sid) return def;
    const raw = overrides[sid];
    const v = Number(raw);
    if (!Number.isFinite(v) || v < 0) return def;

    const mode = def.computeMode as ComputeMode | undefined;
    if (!mode || typeof mode !== 'object') return def;

    if (mode.mode === 'heuresXtaux' && mode.taux?.ref === 'constant') {
      return {
        ...def,
        computeMode: { ...mode, taux: { ref: 'constant', value: v } },
      };
    }
    if (mode.mode === 'unitesXmontant' && mode.montant?.ref === 'constant') {
      return {
        ...def,
        computeMode: { ...mode, montant: { ref: 'constant', value: v } },
      };
    }
    return def;
  });
}
