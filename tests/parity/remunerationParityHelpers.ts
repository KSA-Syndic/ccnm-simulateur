import type { ElementResult } from '../../src/domain/types';
import { roundToEuro } from '../../src/domain/utils/rounding';

/** Somme des montants `value` par `semanticId` (hors ligne `isBase`), aligné détails legacy mode `full`. */
export function sumBySemanticLegacy(details: Array<Record<string, unknown>>): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of details) {
    if (d.isBase === true) continue;
    const sid = d.semanticId;
    if (typeof sid !== 'string' || sid.length === 0) continue;
    const raw = Number(d.value);
    if (!Number.isFinite(raw) || raw === 0) continue;
    const v = roundToEuro(raw);
    m.set(sid, roundToEuro((m.get(sid) ?? 0) + v));
  }
  return m;
}

/** Somme des `amount` par `semanticId` (moteur domaine TS, uniquement montants > 0). */
export function sumBySemanticTs(details: ElementResult[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of details) {
    if (!(d.amount > 0)) continue;
    const sid = d.semanticId;
    const v = roundToEuro(d.amount);
    m.set(sid, roundToEuro((m.get(sid) ?? 0) + v));
  }
  return m;
}

export function assertSemanticMapsEqual(
  profileId: string,
  legacy: Map<string, number>,
  ts: Map<string, number>,
): void {
  const keys = new Set([...legacy.keys(), ...ts.keys()]);
  const mismatches: string[] = [];
  for (const k of keys) {
    const a = roundToEuro(legacy.get(k) ?? 0);
    const b = roundToEuro(ts.get(k) ?? 0);
    if (a !== b) mismatches.push(`${k}: legacy=${a} ts=${b}`);
  }
  if (mismatches.length > 0) {
    throw new Error(`[${profileId}] Écart montants par semanticId:\n${mismatches.join('\n')}`);
  }
}
