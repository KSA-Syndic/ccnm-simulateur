import { type ElementDef, type ComputeContext } from '../types';
import { computeElement } from './engine';

export function getMontantPrimesFixesAnnuel(
  elements: ElementDef[],
  ctx: ComputeContext,
  options: { smhOnly?: boolean } = {},
): number {
  let defs = elements.filter((d) => d.valueKind === 'montant');
  if (options.smhOnly) defs = defs.filter((d) => d.inclusDansSMH === true);
  let total = 0;
  for (const def of defs) {
    const r = computeElement(def, ctx);
    if (r.amount > 0) total += r.amount;
  }
  return total;
}

export function getMontantPrimesVerseesCeMois(
  elements: ElementDef[],
  ctx: ComputeContext,
  mois: number,
  options: { smhOnly?: boolean } = {},
): number {
  if (!mois || mois < 1 || mois > 12) return 0;
  let defs = elements.filter(
    (d) => d.valueKind === 'montant' && (d.config?.['moisVersement'] ?? 0) === mois,
  );
  if (options.smhOnly) defs = defs.filter((d) => d.inclusDansSMH === true);
  let total = 0;
  for (const def of defs) {
    const r = computeElement(def, ctx);
    if (r.amount > 0) total += r.amount;
  }
  return total;
}
