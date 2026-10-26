import Decimal from 'decimal.js';
import { CONFIG } from '../config';
import {
  roundHourlyRate,
  roundToCents,
  annualFromMonthly,
  toFiniteNumber,
} from '../utils/rounding';
import { getSmhHourlyBaseRate, resolveActivityRate } from './rates';
import { applySmhInclusionPolicy, applySmhInclusionPolicyToResult } from './smhConformity';
import { getAccordInput, isFlagOn } from '../agreements/interface';
import {
  type ComputeRef,
  type ComputeMode,
  type ComputeContext,
  type ElementDef,
  type ElementResult,
  type SubstitutionDecl,
} from '../types';

// ── Ref resolution ──

export function resolveRef(ref: ComputeRef, ctx: ComputeContext): number {
  switch (ref.ref) {
    case 'constant':
      return toFiniteNumber(ref.value);
    case 'config':
      return toFiniteNumber(getNestedValue(ctx.configValues, ref.path));
    case 'context':
      return toFiniteNumber((ctx as unknown as Record<string, unknown>)[ref.key]);
    case 'state':
      return toFiniteNumber(ctx.state[ref.key]);
    case 'input':
      return toFiniteNumber(ctx.state[ref.stateKey]);
    case 'accordInputOrState': {
      const raw = getAccordInput(ctx.state, ref.key);
      if (raw == null || raw === '') {
        return ref.defaultIfMissing !== undefined ? toFiniteNumber(ref.defaultIfMissing) : 0;
      }
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    }
    case 'heuresSupTranche': {
      const total = toFiniteNumber(ctx.state[ref.stateKeyHeures]);
      const seuil = ref.seuilMensuel;
      const h25 = Math.min(Math.max(total, 0), seuil);
      const h50 = Math.max(total - seuil, 0);
      return ref.tranche === '25' ? h25 : h50;
    }
    case 'bareme':
      return resolveBareme(ref.table, ref.lookupKey, ctx);
    default:
      return 0;
  }
}

function resolveBaremeLookupKey(
  lookupKey: 'anciennete' | 'classe' | 'ancienneteAccordPrime',
  ctx: ComputeContext,
): number {
  if (lookupKey === 'classe') return ctx.classe;
  const rawAnc = toFiniteNumber(ctx.state['anciennete']);
  if (lookupKey === 'anciennete') return rawAnc;
  const agr = ctx.agreement as { anciennete?: { plafond?: number } } | undefined;
  const plafond = agr?.anciennete?.plafond ?? 0;
  return Math.min(rawAnc, plafond);
}

const baremeKeysCache = new WeakMap<Record<number, number>, readonly number[]>();

/** Clés numériques d'un barème, par ordre décroissant (barèmes immuables : calculées une fois). */
function sortedBaremeKeys(table: Record<number, number>): readonly number[] {
  let keys = baremeKeysCache.get(table);
  if (!keys) {
    keys = Object.keys(table)
      .map(Number)
      .filter((k) => !Number.isNaN(k))
      .sort((a, b) => b - a);
    baremeKeysCache.set(table, keys);
  }
  return keys;
}

function resolveBareme(
  table: Record<number, number>,
  lookupKey: 'anciennete' | 'classe' | 'ancienneteAccordPrime',
  ctx: ComputeContext,
): number {
  const key = resolveBaremeLookupKey(lookupKey, ctx);
  if (table[key] !== undefined) return toFiniteNumber(table[key]);
  for (const k of sortedBaremeKeys(table)) {
    if (k <= key) return toFiniteNumber(table[k]);
  }
  return 0;
}

// ── Element computation ──

export function computeElement(def: ElementDef, ctx: ComputeContext): ElementResult {
  const zero: ElementResult = {
    amount: 0,
    label: def.label,
    kind: def.kind,
    source: def.source,
    semanticId: def.semanticId,
    inclusDansSMH: applySmhInclusionPolicy(def, resolveSmhInclusion(def)),
    isAgreementSpecific: def.source === 'accord',
  };

  if (!isActivated(def, ctx)) return zero;

  const raw = executeComputeMode(def.computeMode, ctx);
  const amount = guardFinite(raw);

  return {
    ...zero,
    amount,
    sourceArticle: def.sourceArticle,
    conditionTexte: def.conditionTexte,
    tooltip: def.tooltip,
  };
}

function executeComputeMode(mode: ComputeMode, ctx: ComputeContext): number {
  switch (mode.mode) {
    case 'heuresXtaux': {
      const heures = resolveRef(mode.heures, ctx);
      const taux = resolveRef(mode.taux, ctx);
      const base = resolveRef(mode.base, ctx);
      const mult = mode.majorationSeule === true ? new Decimal(taux) : new Decimal(1).plus(taux);
      const monthly = new Decimal(heures).times(base).times(mult);
      return mode.period === 'annual'
        ? annualFromMonthly(monthly.toNumber())
        : roundToCents(monthly.toNumber());
    }
    case 'pourcentageXbase': {
      const taux = resolveRef(mode.taux, ctx);
      const base = resolveRef(mode.base, ctx);
      const annees = mode.annees ? resolveRef(mode.annees, ctx) : 1;
      /** Base déjà annuelle (ex. SMH × %) — pas de coefficient mensuel `×12`, quelle que soit la période. */
      return roundToCents(new Decimal(base).times(taux).times(annees).toNumber());
    }
    case 'unitesXmontant': {
      let unites = resolveRef(mode.unites, ctx);
      if (mode.prorataActivite) {
        unites = applyProrataActivite(unites, ctx);
      }
      const montant = resolveRef(mode.montant, ctx);
      const raw = new Decimal(unites).times(montant).toNumber();
      if (mode.forfaitAnnuel === true && mode.period === 'annual') {
        return roundToCents(raw);
      }
      return mode.period === 'annual' ? annualFromMonthly(raw) : roundToCents(raw);
    }
    case 'periodesIndemniteSmh': {
      const periodes = resolveRef(mode.periodes, ctx);
      const th = ctx.tauxHoraireBase;
      const monthly = new Decimal(periodes).times(mode.coefficientSmhParPeriode).times(th);
      return mode.period === 'annual'
        ? annualFromMonthly(monthly.toNumber())
        : roundToCents(monthly.toNumber());
    }
    case 'montantFixe': {
      const montant = resolveRef(mode.montant, ctx);
      return roundToCents(montant);
    }
    case 'postesXdureeXtaux': {
      let postes = resolveRef(mode.postes, ctx);
      if (mode.prorataActivite) {
        postes = applyProrataActivite(postes, ctx);
      }
      const dureeMinutes = resolveRef(mode.dureeMinutes, ctx);
      const taux = resolveRef(mode.taux, ctx);
      const heuresParPoste = dureeMinutes / 60;
      const monthly = new Decimal(postes).times(heuresParPoste).times(taux);
      return mode.period === 'annual'
        ? annualFromMonthly(monthly.toNumber())
        : roundToCents(monthly.toNumber());
    }
    case 'custom':
      return mode.compute(ctx);
    default:
      return 0;
  }
}

// ── Substitution ──

export interface ResolvedElement {
  result: ElementResult;
  def: ElementDef;
  origin: 'convention' | 'accord';
  note?: string;
}

/**
 * Résout `inclusDansSMH: 'ifSuperiorToConvention'` après comparaison au montant conventionnel
 * (assiette SMH seulement si le montant accord dépasse la référence branche).
 */
function normalizeIfSuperiorSmhResult(
  result: ElementResult,
  origin: 'convention' | 'accord',
  ctx: ComputeContext,
  conventionDef: ElementDef | undefined,
  conventionAmount?: number,
): ElementResult {
  if (result.inclusDansSMH !== 'ifSuperiorToConvention') return result;
  if (origin !== 'accord') {
    return { ...result, inclusDansSMH: false };
  }
  const conv =
    conventionAmount !== undefined
      ? conventionAmount
      : conventionDef
        ? computeElement(conventionDef, ctx).amount
        : 0;
  const effectiveIncluded = result.amount > conv;
  return applySmhInclusionPolicyToResult({ ...result, inclusDansSMH: effectiveIncluded });
}

export function resolveBySubstitution(
  conventionDefs: readonly ElementDef[],
  accordDefs: ElementDef[],
  ctx: ComputeContext,
): ResolvedElement[] {
  const bySemanticId = new Map<
    string,
    { convention?: ElementDef; accord?: ElementDef; sub?: SubstitutionDecl }
  >();

  for (const def of conventionDefs) {
    const entry = bySemanticId.get(def.semanticId) ?? {};
    entry.convention = def;
    bySemanticId.set(def.semanticId, entry);
  }

  for (const def of accordDefs) {
    const entry = bySemanticId.get(def.semanticId) ?? {};
    entry.accord = def;
    if (def.substitution) entry.sub = def.substitution;
    bySemanticId.set(def.semanticId, entry);
  }

  const results: ResolvedElement[] = [];

  for (const [, { convention, accord, sub }] of bySemanticId) {
    const strategy = sub?.strategy ?? (accord ? 'favorPrinciple' : undefined);

    if (!accord && convention) {
      const r = computeElement(convention, ctx);
      if (r.amount > 0)
        results.push({
          result: normalizeIfSuperiorSmhResult(r, 'convention', ctx, convention),
          def: convention,
          origin: 'convention',
        });
      continue;
    }

    if (accord && !convention) {
      const r = computeElement(accord, ctx);
      if (r.amount > 0)
        results.push({
          result: normalizeIfSuperiorSmhResult(r, 'accord', ctx, undefined),
          def: accord,
          origin: 'accord',
        });
      continue;
    }

    if (!accord || !convention) continue;

    switch (strategy) {
      case 'replaces': {
        const r = computeElement(accord, ctx);
        if (r.amount > 0)
          results.push({
            result: normalizeIfSuperiorSmhResult(r, 'accord', ctx, convention),
            def: accord,
            origin: 'accord',
            note: 'Se substitue à la convention',
          });
        break;
      }
      case 'cumulative': {
        const rConv = computeElement(convention, ctx);
        const rAcc = computeElement(accord, ctx);
        if (rConv.amount > 0)
          results.push({
            result: normalizeIfSuperiorSmhResult(rConv, 'convention', ctx, convention),
            def: convention,
            origin: 'convention',
          });
        if (rAcc.amount > 0)
          results.push({
            result: normalizeIfSuperiorSmhResult(rAcc, 'accord', ctx, convention, rConv.amount),
            def: accord,
            origin: 'accord',
          });
        break;
      }
      case 'conditionalFavor': {
        const rConv = computeElement(convention, ctx);
        const rAcc = computeElement(accord, ctx);
        if (rAcc.amount >= rConv.amount && rAcc.amount > 0) {
          results.push({
            result: normalizeIfSuperiorSmhResult(rAcc, 'accord', ctx, convention, rConv.amount),
            def: accord,
            origin: 'accord',
            note: 'Plus favorable que la convention',
          });
        } else if (rConv.amount > 0) {
          results.push({
            result: normalizeIfSuperiorSmhResult(rConv, 'convention', ctx, convention),
            def: convention,
            origin: 'convention',
            note: 'Convention plus favorable',
          });
        }
        break;
      }
      case 'favorPrinciple':
      default: {
        const rConv = computeElement(convention, ctx);
        const rAcc = computeElement(accord, ctx);
        if (rAcc.amount > rConv.amount) {
          results.push({
            result: normalizeIfSuperiorSmhResult(rAcc, 'accord', ctx, convention, rConv.amount),
            def: accord,
            origin: 'accord',
            note: 'Plus favorable que la convention',
          });
        } else if (rConv.amount > 0) {
          results.push({
            result: normalizeIfSuperiorSmhResult(rConv, 'convention', ctx, convention),
            def: convention,
            origin: 'convention',
          });
        }
        break;
      }
    }
  }

  return results;
}

// ── Context builder ──

export function buildComputeContext(
  state: Record<string, unknown>,
  baseSMH: number,
  classe: number,
  agreement?: Record<string, unknown>,
): ComputeContext {
  const baseSMHFull = toFiniteNumber(state['baseSMHFull'] ?? baseSMH);
  const activityRate = resolveActivityRate(
    state['travailTempsPartiel'] === true,
    state['tauxActivite'],
  );
  const tauxHoraireBase = roundHourlyRate(getSmhHourlyBaseRate(baseSMHFull));

  return {
    state,
    tauxHoraireBase,
    baseSMH,
    salaireBase: baseSMH,
    pointTerritorial: toFiniteNumber(state['pointTerritorial']),
    classe,
    activityRate,
    agreement,
    configValues: CONFIG as unknown as Record<string, unknown>,
  };
}

// ── Helpers ──

function guardFinite(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function isActivated(def: ElementDef, ctx: ComputeContext): boolean {
  if (def.activation) {
    switch (def.activation.type) {
      case 'always':
        return true;
      case 'stateFlag':
        return isFlagOn(ctx.state[def.activation.key]);
      case 'anciennete':
        return toFiniteNumber(ctx.state['anciennete']) >= def.activation.seuil;
      case 'custom':
        return def.activation.check(ctx);
      default:
        return true;
    }
  }

  const cfg = def.config as { inclusDansSMH?: unknown; stateKeyActif?: string } | undefined;
  if (def.source === 'accord' && cfg?.inclusDansSMH === true) return true;

  const actifKey =
    def.stateKeyActif ?? (typeof cfg?.stateKeyActif === 'string' ? cfg.stateKeyActif : undefined);
  if (actifKey) {
    return isFlagOn(getAccordInput(ctx.state, actifKey));
  }

  if (def.source === 'accord') return false;

  return true;
}

function resolveSmhInclusion(def: ElementDef): boolean | 'ifSuperiorToConvention' {
  if (def.inclusDansSMH === 'ifSuperiorToConvention') return 'ifSuperiorToConvention';
  return def.inclusDansSMH === true;
}

/** Quantité mensuelle proratisée au taux d'activité (temps partiel). */
export function applyProrataActivite(qty: number, ctx: ComputeContext): number {
  const r = ctx.activityRate;
  const prorata = Number.isFinite(r) && r > 0 ? r : 1;
  return Math.max(0, qty * prorata);
}
