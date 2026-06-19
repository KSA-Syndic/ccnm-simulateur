import Decimal from 'decimal.js';
import { CONFIG } from '../config';
import { roundHourlyRate, roundToCents, annualFromMonthly } from '../utils/rounding';
import { applySmhInclusionPolicy, applySmhInclusionPolicyToResult } from './smhConformity';
import { getAccordInput } from '../agreements/interface';
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
      return safeNum(ref.value);
    case 'config':
      return safeNum(getNestedValue(ctx.configValues, ref.path));
    case 'context':
      return safeNum((ctx as unknown as Record<string, unknown>)[ref.key]);
    case 'state':
      return safeNum(ctx.state[ref.key]);
    case 'input':
      return safeNum(ctx.state[ref.stateKey]);
    case 'accordInputOrState': {
      const raw = getAccordInput(ctx.state, ref.key) ?? ctx.state[ref.key];
      if (raw == null || raw === '') {
        return ref.defaultIfMissing !== undefined ? safeNum(ref.defaultIfMissing) : 0;
      }
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    }
    case 'heuresSupTranche': {
      const total = safeNum(ctx.state[ref.stateKeyHeures]);
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
  const rawAnc = safeNum(ctx.state['anciennete']);
  if (lookupKey === 'anciennete') return rawAnc;
  const agr = ctx.agreement as { anciennete?: { plafond?: number } } | undefined;
  const plafond = agr?.anciennete?.plafond ?? 0;
  return Math.min(rawAnc, plafond);
}

function resolveBareme(
  table: Record<number, number>,
  lookupKey: 'anciennete' | 'classe' | 'ancienneteAccordPrime',
  ctx: ComputeContext,
): number {
  const key = resolveBaremeLookupKey(lookupKey, ctx);
  if (table[key] !== undefined) return safeNum(table[key]);
  const sortedKeys = Object.keys(table)
    .map(Number)
    .filter((k) => !Number.isNaN(k))
    .sort((a, b) => b - a);
  for (const k of sortedKeys) {
    if (k <= key) return safeNum(table[k]);
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
      const raw = new Decimal(base).times(taux).times(annees).toNumber();
      if (mode.period === 'annual') {
        /** Base déjà annuelle (ex. SMH × %) — pas de coefficient mensuel `×12`. */
        return roundToCents(raw);
      }
      return roundToCents(raw);
    }
    case 'unitesXmontant': {
      let unites = resolveRef(mode.unites, ctx);
      if (mode.prorataActivite) {
        const r = ctx.activityRate;
        const prorata = Number.isFinite(r) && r > 0 ? r : 1;
        unites = Math.max(0, unites * prorata);
      }
      const montant = resolveRef(mode.montant, ctx);
      const raw = new Decimal(unites).times(montant).toNumber();
      if (mode.forfaitAnnuel === true && mode.period === 'annual') {
        return roundToCents(raw);
      }
      const monthly = raw;
      return mode.period === 'annual' ? annualFromMonthly(monthly) : roundToCents(monthly);
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
        const r = ctx.activityRate;
        const prorata = Number.isFinite(r) && r > 0 ? r : 1;
        postes = Math.max(0, postes * prorata);
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
  conventionDefs: ElementDef[],
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
  const baseSMHFull = safeNum(state['baseSMHFull'] ?? baseSMH);
  const activityRate = resolveActivityRate(state);
  const tauxHoraireBase = getHourlyBaseRate(baseSMHFull);

  return {
    state,
    tauxHoraireBase,
    baseSMH,
    salaireBase: baseSMH,
    pointTerritorial: safeNum(state['pointTerritorial']),
    classe,
    activityRate,
    agreement,
    configValues: CONFIG as unknown as Record<string, unknown>,
  };
}

// ── Helpers ──

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function guardFinite(v: number): number {
  if (!Number.isFinite(v) || Number.isNaN(v)) return 0;
  return v;
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
        return ctx.state[def.activation.key] === true || ctx.state[def.activation.key] === 'true';
      case 'anciennete':
        return safeNum(ctx.state['anciennete']) >= def.activation.seuil;
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
    const v = getAccordInput(ctx.state, actifKey) ?? ctx.state[actifKey];
    return v === true || v === 'true';
  }

  if (def.source === 'accord') return false;

  return true;
}

function resolveSmhInclusion(def: ElementDef): boolean | 'ifSuperiorToConvention' {
  if (def.inclusDansSMH === 'ifSuperiorToConvention') return 'ifSuperiorToConvention';
  return def.inclusDansSMH === true;
}

function resolveActivityRate(state: Record<string, unknown>): number {
  const enabled = state['travailTempsPartiel'] === true;
  if (!enabled) return 1;
  const min = CONFIG.TAUX_ACTIVITE_MIN;
  const max = CONFIG.TAUX_ACTIVITE_MAX;
  const fallback = CONFIG.TAUX_ACTIVITE_DEFAUT;
  const raw = Number(state['tauxActivite']);
  const bounded = Number.isFinite(raw) ? Math.min(max, Math.max(min, raw)) : fallback;
  return bounded / 100;
}

function getHourlyBaseRate(smhAnnual: number): number {
  if (!(smhAnnual > 0)) return 0;
  const heuresMois = CONFIG.DUREE_LEGALE_HEURES_MOIS;
  return roundHourlyRate(smhAnnual / 12 / heuresMois);
}
