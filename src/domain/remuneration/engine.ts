import Decimal from 'decimal.js';
import { CONFIG } from '../config';
import {
  type ComputeRef,
  type ComputeMode,
  type ComputeContext,
  type ElementDef,
  type ElementResult,
  type SubstitutionDecl,
} from '../types';
import { roundToCents, roundToEuro, annualFromMonthly } from '../utils/rounding';

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
    case 'bareme':
      return resolveBareme(ref.table, ref.lookupKey, ctx);
    default:
      return 0;
  }
}

function resolveBareme(
  table: Record<number, number>,
  lookupKey: 'anciennete' | 'classe',
  ctx: ComputeContext,
): number {
  const key = lookupKey === 'anciennete' ? safeNum(ctx.state['anciennete']) : ctx.classe;
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
    inclusDansSMH: resolveSmhInclusion(def),
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
      const monthly = new Decimal(heures)
        .times(base)
        .times(1 + taux)
        .toNumber();
      return mode.period === 'annual'
        ? annualFromMonthly(roundToCents(monthly))
        : roundToCents(monthly);
    }
    case 'pourcentageXbase': {
      const taux = resolveRef(mode.taux, ctx);
      const base = resolveRef(mode.base, ctx);
      const annees = mode.annees ? resolveRef(mode.annees, ctx) : 1;
      const raw = new Decimal(base).times(taux).times(annees).toNumber();
      if (mode.period === 'annual') return annualFromMonthly(roundToCents(raw));
      return roundToCents(raw);
    }
    case 'unitesXmontant': {
      const unites = resolveRef(mode.unites, ctx);
      const montant = resolveRef(mode.montant, ctx);
      const monthly = new Decimal(unites).times(montant).toNumber();
      return mode.period === 'annual'
        ? annualFromMonthly(roundToCents(monthly))
        : roundToCents(monthly);
    }
    case 'montantFixe': {
      const montant = resolveRef(mode.montant, ctx);
      return mode.period === 'annual' ? roundToEuro(montant) : roundToCents(montant);
    }
    case 'postesXdureeXtaux': {
      const postes = resolveRef(mode.postes, ctx);
      const dureeMinutes = resolveRef(mode.dureeMinutes, ctx);
      const taux = resolveRef(mode.taux, ctx);
      const heuresParPoste = dureeMinutes / 60;
      const monthly = new Decimal(postes).times(heuresParPoste).times(taux).toNumber();
      return mode.period === 'annual'
        ? annualFromMonthly(roundToCents(monthly))
        : roundToCents(monthly);
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
      if (r.amount > 0) results.push({ result: r, def: convention, origin: 'convention' });
      continue;
    }

    if (accord && !convention) {
      const r = computeElement(accord, ctx);
      if (r.amount > 0) results.push({ result: r, def: accord, origin: 'accord' });
      continue;
    }

    if (!accord || !convention) continue;

    switch (strategy) {
      case 'replaces': {
        const r = computeElement(accord, ctx);
        if (r.amount > 0)
          results.push({
            result: r,
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
          results.push({ result: rConv, def: convention, origin: 'convention' });
        if (rAcc.amount > 0) results.push({ result: rAcc, def: accord, origin: 'accord' });
        break;
      }
      case 'conditionalFavor': {
        const rConv = computeElement(convention, ctx);
        const rAcc = computeElement(accord, ctx);
        if (rAcc.amount >= rConv.amount && rAcc.amount > 0) {
          results.push({
            result: rAcc,
            def: accord,
            origin: 'accord',
            note: 'Plus favorable que la convention',
          });
        } else if (rConv.amount > 0) {
          results.push({
            result: rConv,
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
            result: rAcc,
            def: accord,
            origin: 'accord',
            note: 'Plus favorable que la convention',
          });
        } else if (rConv.amount > 0) {
          results.push({ result: rConv, def: convention, origin: 'convention' });
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
  const tauxHoraire = computeEffectiveHourlyRate(tauxHoraireBase, state, classe);

  return {
    state,
    tauxHoraire,
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
  if (!def.activation) {
    if (def.stateKeyActif) {
      const v = ctx.state[def.stateKeyActif];
      return v === true || v === 'true';
    }
    return true;
  }
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

function resolveSmhInclusion(def: ElementDef): boolean {
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
  return smhAnnual / 12 / heuresMois;
}

function computeEffectiveHourlyRate(
  tauxHoraireBase: number,
  state: Record<string, unknown>,
  classe: number,
): number {
  const isForfaitJours = classe >= CONFIG.SEUIL_CADRE && state['forfait'] === 'jours';
  if (isForfaitJours) return tauxHoraireBase;

  const hsActif = state['travailHeuresSup'] === true;
  const heuresSup = hsActif ? safeNum(state['heuresSup']) : 0;
  if (heuresSup <= 0) return tauxHoraireBase;

  const seuilMensuel = CONFIG.HEURES_SUP_TRANCHE_1_MENSUELLES;
  const heures25 = Math.min(Math.max(heuresSup, 0), seuilMensuel);
  const heures50 = Math.max(heuresSup - seuilMensuel, 0);
  const taux25 = CONFIG.MAJORATIONS_CCN.heuresSup25;
  const taux50 = CONFIG.MAJORATIONS_CCN.heuresSup50;
  const heuresBase = CONFIG.DUREE_LEGALE_HEURES_MOIS;

  const coeff =
    (heuresBase + heures25 * (1 + taux25) + heures50 * (1 + taux50)) /
    (heuresBase + heures25 + heures50);

  return Math.round(tauxHoraireBase * coeff * 10000) / 10000;
}
