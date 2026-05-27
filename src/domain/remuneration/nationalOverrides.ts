import type { ElementDef } from '../types';
import type { ComputeMode } from '../types';
import {
  getNationalModalityOverrideKindBySemanticId,
  getNationalModalityOverrideSemantics,
  type NationalModalityOverrideKind,
} from '../convention/nationalModalityRegistry';

function patchComputeModeWithOverride(
  mode: ComputeMode,
  kind: NationalModalityOverrideKind,
  overrideValue: number,
): ComputeMode {
  switch (kind) {
    case 'heuresXtaux.taux':
      if (mode.mode === 'heuresXtaux') {
        return { ...mode, taux: { ref: 'constant', value: overrideValue } };
      }
      break;
    case 'heuresXtaux.base':
      if (mode.mode === 'heuresXtaux') {
        return {
          ...mode,
          base: { ref: 'constant', value: overrideValue },
          taux: { ref: 'constant', value: 0 },
        };
      }
      break;
    case 'unitesXmontant.montant':
      if (mode.mode === 'unitesXmontant') {
        return { ...mode, montant: { ref: 'constant', value: overrideValue } };
      }
      break;
    default:
      break;
  }
  return mode;
}

/**
 * Applique `state.nationalPrimeOverrides` sur les définitions conventionnelles
 * (sémantiques et cibles dérivées du registre `nationalModalityRegistry`).
 */
export function applyNationalPrimeOverridesToConventionDefs(
  defs: ElementDef[],
  state: Record<string, unknown>,
): ElementDef[] {
  const map = (state.nationalPrimeOverrides ?? {}) as Record<string, unknown>;
  if (!map || typeof map !== 'object' || Object.keys(map).length === 0) {
    return defs;
  }

  const overrideSemantics = getNationalModalityOverrideSemantics();
  const kindBySemantic = getNationalModalityOverrideKindBySemanticId();

  return defs.map((def) => {
    const sid = def.semanticId;
    if (!sid || !overrideSemantics.has(sid)) return def;

    const cfg = (def.config ?? {}) as { allowUserOverride?: boolean };
    if (cfg.allowUserOverride !== true) return def;

    const raw = map[sid];
    const overrideValue = Number(raw);
    if (!Number.isFinite(overrideValue) || overrideValue < 0) return def;

    const kind = kindBySemantic.get(sid);
    if (!kind) return def;

    const mode = def.computeMode as ComputeMode;
    if (!mode || typeof mode !== 'object') return def;

    const nextMode = patchComputeModeWithOverride(mode, kind, overrideValue);
    if (nextMode === mode) return def;

    return { ...def, computeMode: nextMode };
  });
}
