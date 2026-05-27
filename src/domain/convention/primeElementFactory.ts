import type { ComputeMode, ElementDef } from '../types';
import type { ModaliteRaw } from './catalog';

const SRC = 'convention' as const;

export function modaliteToPartial(m: ModaliteRaw): Partial<ElementDef> {
  const result: Partial<ElementDef> = {
    inclusDansSMH: m.inclusDansSMH,
    sourceArticle: m.sourceArticle,
    conditionTexte: m.conditionTexte,
    tooltip: m.tooltip,
    uiSection: m.uiSection,
    stateKeyActif: m.stateKeyActif,
  };
  if (m.stateKeyHeures !== undefined) {
    result.stateKeyHeures = m.stateKeyHeures;
  }
  return result;
}

export function buildConventionPrimeElement(
  id: string,
  semanticId: string,
  label: string,
  computeMode: ComputeMode,
  extra: Partial<ElementDef>,
): ElementDef {
  return {
    id,
    semanticId,
    kind: 'prime',
    source: SRC,
    valueKind: 'horaire',
    label,
    computeMode,
    ...extra,
  };
}
