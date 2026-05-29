/**
 * Infobulles détaillées des lignes du résultat (base de calcul, paramètres saisis).
 */
import Decimal from 'decimal.js';
import { CONFIG } from '../config';
import type { Agreement } from '../agreements/interface';
import { getAccordNomCourt } from './builders';
import {
  buildResultTooltipContent,
  formatFrDecimalFixed,
  type ResultBreakdownLine,
  type ResultTooltipDetailInput,
} from './builders';
import { resolveRef, type ResolvedElement } from '../remuneration/engine';
import type { ComputeContext, ComputeRef, ElementDef, ElementResult } from '../types';
import { SEMANTIC_ID } from '../types';
import { formatMoneyTooltipDetail } from '../utils/format';
import { roundToCents } from '../utils/rounding';

function euroBreakdown(label: string, value: number): ResultBreakdownLine {
  return { label, value };
}

/** Libellé de la première ligne du breakdown `heuresXtaux` (aligné sur `mode.base`). */
function heuresXtauxTauxLineLabel(baseRef: ComputeRef): string {
  if (baseRef.ref === 'context' && baseRef.key === 'tauxHoraireBase') {
    return 'Taux horaire de base';
  }
  return 'Taux horaire retenu';
}

function pctLabel(rate: number): string {
  return `${formatFrDecimalFixed(rate * 100, (rate * 100) % 1 === 0 ? 0 : 2)} %`;
}

function resolvedHeuresXtauxMajRate(def: ElementDef, ctx: ComputeContext): number | null {
  const mode = def.computeMode;
  if (mode.mode !== 'heuresXtaux') return null;
  return resolveRef(mode.taux, ctx);
}

function majorationHeuresSupPctHint(majRate: number): string {
  return `Majoration (+${formatFrDecimalFixed(majRate * 100, (majRate * 100) % 1 === 0 ? 0 : 2)} %)`;
}

function formatHeures(h: number): string {
  return `${formatFrDecimalFixed(h, h % 1 === 0 ? 0 : 2)} h`;
}

function prorataDetailSuffix(ctx: ComputeContext): string {
  if (ctx.activityRate >= 0.999) return '';
  const pct = Math.round(ctx.activityRate * 10000) / 100;
  return ` Prorata temps partiel : ${formatFrDecimalFixed(pct, 2)} %.`;
}

function smhIncludedSummary(result: ElementResult): string | undefined {
  if (result.inclusDansSMH !== true) return undefined;
  return 'Montant déjà intégré dans la base du minimum conventionnel (SMH) : affiché à titre informatif, il ne vient pas s’ajouter au total.';
}

function buildAncienneteConventionTooltip(
  result: ElementResult,
  def: ElementDef,
  ctx: ComputeContext,
): ResultTooltipDetailInput {
  const anciennete = Number(ctx.state['anciennete'] ?? 0);
  const plafond = CONFIG.ANCIENNETE.plafond;
  const seuil = CONFIG.ANCIENNETE.seuil;
  const anneesRetenues = Math.min(Math.max(anciennete, 0), plafond);
  const tauxTable = CONFIG.TAUX_ANCIENNETE as Record<number, number>;
  const coef = tauxTable[ctx.classe] ?? 0;
  const point = ctx.pointTerritorial;
  const mensuel = roundToCents(
    point * coef * anneesRetenues * (ctx.activityRate > 0 ? ctx.activityRate : 1),
  );

  const breakdown: ResultBreakdownLine[] = [
    euroBreakdown('Point territorial retenu', point),
    euroBreakdown('Prime mensuelle estimée', mensuel),
    euroBreakdown('Montant annuel affiché', result.amount),
  ];
  const prSuffix = prorataDetailSuffix(ctx);
  return {
    label: result.label,
    value: result.amount,
    sourceArticle: def.sourceArticle,
    conditionTexte: def.conditionTexte,
    tooltipDetail: [
      `Ancienneté dans l'entreprise : ${anciennete} an${anciennete > 1 ? 's' : ''} (${anneesRetenues} retenu${anneesRetenues > 1 ? 's' : ''} pour le calcul, plafond ${plafond} ans).`,
      `Coefficient barème classe ${ctx.classe} : ${formatFrDecimalFixed(coef, 2)}.`,
      `Calcul : point territorial × coefficient × années retenues${prSuffix}, puis × 12. Seuil conventionnel : ${seuil} ans.`,
    ].join('\n'),
    breakdown,
  };
}

function buildAncienneteAccordTooltip(
  result: ElementResult,
  def: ElementDef,
  ctx: ComputeContext,
  agreement: Agreement | null,
): ResultTooltipDetailInput {
  const agr = agreement?.anciennete;
  const anciennete = Number(ctx.state['anciennete'] ?? 0);
  const plafond = agr?.plafond ?? 0;
  const seuil = agr?.seuil ?? 0;
  const mode = def.computeMode;
  let taux = 0;
  if (mode.mode === 'pourcentageXbase' && mode.taux.ref === 'bareme') {
    taux = resolveRef(mode.taux, ctx);
  }
  const base = ctx.salaireBase;
  const cadre = ctx.classe >= CONFIG.SEUIL_CADRE;

  const breakdown: ResultBreakdownLine[] = [
    euroBreakdown('Salaire de base annuel (assiette)', base),
    euroBreakdown('Montant annuel affiché', result.amount),
  ];

  let tooltipDetail = [
    `Ancienneté dans l'entreprise : ${anciennete} an${anciennete > 1 ? 's' : ''}${plafond > 0 ? ` (plafond accord ${plafond} ans)` : ''}.`,
    `Prime d'ancienneté selon l'accord ${getAccordNomCourt(agreement) || "d'entreprise"} : ${pctLabel(taux)} du salaire de base annuel (barème par palier, seuil ${seuil} an${seuil > 1 ? 's' : ''}).`,
    ...(result.inclusDansSMH === true
      ? [
          "Cette prime d'entreprise entre dans l'assiette servant à comparer votre rémunération au minimum conventionnel, à la différence de la seule prime d'ancienneté prévue par la CCNM.",
        ]
      : []),
  ].join('\n');
  if (cadre) {
    tooltipDetail +=
      " La convention de branche ne prévoit pas de prime d'ancienneté pour les cadres ; le montant affiché relève de votre accord d'entreprise.";
  }

  return {
    label: result.label,
    value: result.amount,
    sourceArticle: def.sourceArticle,
    conditionTexte: def.conditionTexte,
    tooltipDetail,
    breakdown,
  };
}

function buildEquipeTooltip(
  result: ElementResult,
  def: ElementDef,
  ctx: ComputeContext,
): ResultTooltipDetailInput {
  const mode = def.computeMode;
  if (mode.mode === 'unitesXmontant') {
    return buildUnitesMontantTooltip(result, def, ctx);
  }
  if (mode.mode !== 'postesXdureeXtaux') {
    return { label: result.label, value: result.amount, conditionTexte: def.conditionTexte };
  }
  const postes = resolveRef(mode.postes, ctx);
  const minutes = resolveRef(mode.dureeMinutes, ctx);
  const taux = resolveRef(mode.taux, ctx);
  const heuresParPoste = minutes / 60;
  const breakdown: ResultBreakdownLine[] = [
    euroBreakdown('Taux horaire SMH de base', taux),
    euroBreakdown('Montant annuel affiché', result.amount),
  ];
  const prSuffix = prorataDetailSuffix(ctx);

  return {
    label: result.label,
    value: result.amount,
    sourceArticle: def.sourceArticle,
    conditionTexte: def.conditionTexte,
    tooltipDetail: [
      `${formatFrDecimalFixed(postes, 0)} postes / mois × ${formatFrDecimalFixed(heuresParPoste, 2)} h (30 min) × taux horaire du minimum.${prSuffix}`,
      '30 minutes du taux horaire du minimum conventionnel par poste en équipes successives, annualisées.',
    ].join('\n'),
    breakdown,
  };
}

function buildHeuresXtauxTooltip(
  result: ElementResult,
  def: ElementDef,
  ctx: ComputeContext,
  opts?: { labelHeures?: string; pctHint?: string },
): ResultTooltipDetailInput {
  const mode = def.computeMode;
  if (mode.mode !== 'heuresXtaux') {
    return { label: result.label, value: result.amount, conditionTexte: def.conditionTexte };
  }
  const heures = resolveRef(mode.heures, ctx);
  const majRate = resolveRef(mode.taux, ctx);
  const base = resolveRef(mode.base, ctx);
  const mult = mode.majorationSeule === true ? new Decimal(majRate) : new Decimal(1).plus(majRate);
  const mensuelExact = new Decimal(heures).times(base).times(mult);
  const mensuel = roundToCents(mensuelExact.toNumber());
  const annual =
    mode.period === 'annual' ? result.amount : roundToCents(mensuelExact.times(12).toNumber());

  const breakdown: ResultBreakdownLine[] = [
    euroBreakdown(heuresXtauxTauxLineLabel(mode.base), base),
    euroBreakdown('Montant mensuel estimé', mensuel),
    euroBreakdown('Montant annuel affiché', annual),
  ];

  return {
    label: result.label,
    value: result.amount,
    sourceArticle: def.sourceArticle,
    conditionTexte: def.conditionTexte,
    tooltipDetail: [
      `${opts?.labelHeures ?? 'Heures'} : ${formatHeures(heures)} / mois.`,
      opts?.pctHint ?? `Majoration : ${pctLabel(majRate)}.`,
      `Calcul : heures × taux horaire × majoration${mode.period === 'annual' ? ', annualisé' : ' (× 12)'}.`,
    ].join('\n'),
    breakdown,
  };
}

function buildPourcentageBaseTooltip(
  result: ElementResult,
  def: ElementDef,
  ctx: ComputeContext,
): ResultTooltipDetailInput {
  const mode = def.computeMode;
  if (mode.mode !== 'pourcentageXbase') {
    return { label: result.label, value: result.amount, conditionTexte: def.conditionTexte };
  }
  const taux = resolveRef(mode.taux, ctx);
  const base = resolveRef(mode.base, ctx);
  const breakdown: ResultBreakdownLine[] = [
    euroBreakdown('Assiette annuelle', base),
    euroBreakdown('Montant annuel affiché', result.amount),
  ];
  return {
    label: result.label,
    value: result.amount,
    sourceArticle: def.sourceArticle,
    conditionTexte: def.conditionTexte,
    tooltipDetail: `Taux retenu : ${pctLabel(taux)} de l’assiette annuelle.`,
    breakdown,
  };
}

function buildPeriodesSmhTooltip(
  result: ElementResult,
  def: ElementDef,
  ctx: ComputeContext,
): ResultTooltipDetailInput {
  const mode = def.computeMode;
  if (mode.mode !== 'periodesIndemniteSmh') {
    return { label: result.label, value: result.amount, conditionTexte: def.conditionTexte };
  }
  const periodes = resolveRef(mode.periodes, ctx);
  const coeff = mode.coefficientSmhParPeriode;
  const th = ctx.tauxHoraireBase;
  const euroPeriode = roundToCents(coeff * th);
  const breakdown: ResultBreakdownLine[] = [
    euroBreakdown(
      `Équivalent SMH par période (${formatHeures(coeff)} × taux horaire)`,
      euroPeriode,
    ),
    euroBreakdown('Taux horaire SMH de base', th),
    euroBreakdown('Montant annuel affiché', result.amount),
  ];
  return {
    label: result.label,
    value: result.amount,
    sourceArticle: def.sourceArticle,
    conditionTexte: def.conditionTexte,
    tooltipDetail: [
      `${formatFrDecimalFixed(periodes, periodes % 1 === 0 ? 0 : 2)} période${periodes > 1 ? 's' : ''} / mois.`,
      def.tooltip ??
        'Indemnité forfaitaire par période d’astreinte, basée sur le taux horaire du minimum.',
    ].join('\n'),
    breakdown,
  };
}

function buildUnitesMontantTooltip(
  result: ElementResult,
  def: ElementDef,
  ctx: ComputeContext,
): ResultTooltipDetailInput {
  const mode = def.computeMode;
  if (mode.mode !== 'unitesXmontant') {
    return { label: result.label, value: result.amount, conditionTexte: def.conditionTexte };
  }
  let unites = resolveRef(mode.unites, ctx);
  if (mode.prorataActivite) {
    const r = ctx.activityRate;
    const prorata = Number.isFinite(r) && r > 0 ? r : 1;
    unites = Math.max(0, unites * prorata);
  }
  const montant = resolveRef(mode.montant, ctx);
  const breakdown: ResultBreakdownLine[] = [
    euroBreakdown('Montant unitaire', montant),
    euroBreakdown('Montant annuel affiché', result.amount),
  ];
  const pr = mode.prorataActivite === true ? prorataDetailSuffix(ctx) : '';
  const qtyHeuresMensuelles =
    mode.prorataActivite === true || result.semanticId === SEMANTIC_ID.PRIME_EQUIPE;
  return {
    label: result.label,
    value: result.amount,
    sourceArticle: def.sourceArticle,
    conditionTexte: def.conditionTexte,
    tooltipDetail: [
      qtyHeuresMensuelles
        ? `Quantité : ${formatFrDecimalFixed(unites, unites % 1 === 0 ? 0 : 2)} h / mois (référence retenue pour le calcul).`
        : `Quantité : ${formatFrDecimalFixed(unites, unites % 1 === 0 ? 0 : 2)}.`,
      def.tooltip ??
        (qtyHeuresMensuelles
          ? 'Heures de référence × montant unitaire, puis annualisation sur 12 mois.'
          : 'Quantité × montant unitaire, annualisé si besoin.'),
      pr,
    ]
      .filter(Boolean)
      .join('\n'),
    breakdown,
  };
}

function buildPostesDureeTooltip(
  result: ElementResult,
  def: ElementDef,
  ctx: ComputeContext,
): ResultTooltipDetailInput {
  const mode = def.computeMode;
  if (mode.mode !== 'postesXdureeXtaux') {
    return { label: result.label, value: result.amount, conditionTexte: def.conditionTexte };
  }
  const postes = resolveRef(mode.postes, ctx);
  const minutes = resolveRef(mode.dureeMinutes, ctx);
  const taux = resolveRef(mode.taux, ctx);
  const breakdown: ResultBreakdownLine[] = [
    euroBreakdown('Taux horaire retenu', taux),
    euroBreakdown('Montant annuel affiché', result.amount),
  ];
  return {
    label: result.label,
    value: result.amount,
    sourceArticle: def.sourceArticle,
    conditionTexte: def.conditionTexte,
    tooltipDetail: [
      `${formatFrDecimalFixed(postes, postes % 1 === 0 ? 0 : 2)} unité${postes > 1 ? 's' : ''} / mois × ${formatFrDecimalFixed(minutes / 60, 2)} h.`,
      def.tooltip,
    ]
      .filter(Boolean)
      .join('\n'),
    breakdown,
  };
}

function buildFromComputeMode(
  result: ElementResult,
  def: ElementDef,
  ctx: ComputeContext,
): ResultTooltipDetailInput {
  const mode = def.computeMode;
  switch (mode.mode) {
    case 'heuresXtaux':
      return buildHeuresXtauxTooltip(result, def, ctx);
    case 'pourcentageXbase':
      return buildPourcentageBaseTooltip(result, def, ctx);
    case 'periodesIndemniteSmh':
      return buildPeriodesSmhTooltip(result, def, ctx);
    case 'unitesXmontant':
      return buildUnitesMontantTooltip(result, def, ctx);
    case 'postesXdureeXtaux':
      return buildPostesDureeTooltip(result, def, ctx);
    case 'montantFixe':
      return {
        label: result.label,
        value: result.amount,
        sourceArticle: def.sourceArticle,
        conditionTexte: def.conditionTexte,
        tooltipDetail:
          def.tooltip ??
          `Montant forfaitaire : ${formatMoneyTooltipDetail(resolveRef(mode.montant, ctx))}.`,
        breakdown: [euroBreakdown('Montant annuel affiché', result.amount)],
      };
    default:
      return {
        label: result.label,
        value: result.amount,
        sourceArticle: def.sourceArticle,
        conditionTexte: def.conditionTexte,
        tooltipDetail: def.tooltip ?? def.conditionTexte,
      };
  }
}

function buildSemanticTooltip(
  result: ElementResult,
  def: ElementDef,
  ctx: ComputeContext,
  origin: 'convention' | 'accord',
  agreement: Agreement | null,
): ResultTooltipDetailInput {
  const sid = result.semanticId;

  if (sid === SEMANTIC_ID.PRIME_ANCIENNETE) {
    return origin === 'accord'
      ? buildAncienneteAccordTooltip(result, def, ctx, agreement)
      : buildAncienneteConventionTooltip(result, def, ctx);
  }
  if (sid === SEMANTIC_ID.PRIME_EQUIPE) {
    return buildEquipeTooltip(result, def, ctx);
  }
  if (sid === SEMANTIC_ID.MAJORATION_NUIT) {
    const r = resolvedHeuresXtauxMajRate(def, ctx);
    return buildHeuresXtauxTooltip(result, def, ctx, {
      labelHeures: 'Heures de nuit / mois',
      ...(r != null ? { pctHint: `Majoration nuit (${pctLabel(r)})` } : {}),
    });
  }
  if (sid === SEMANTIC_ID.MAJORATION_DIMANCHE) {
    const r = resolvedHeuresXtauxMajRate(def, ctx);
    return buildHeuresXtauxTooltip(result, def, ctx, {
      labelHeures: 'Heures le dimanche / mois',
      ...(r != null ? { pctHint: `Majoration dimanche (${pctLabel(r)})` } : {}),
    });
  }
  if (sid === SEMANTIC_ID.MAJORATION_HEURES_SUP_25) {
    const r = resolvedHeuresXtauxMajRate(def, ctx);
    return buildHeuresXtauxTooltip(result, def, ctx, {
      labelHeures: `Heures sup. à +25 % (jusqu'à ${CONFIG.HEURES_SUP_TRANCHE_1_MENSUELLES} h/mois)`,
      ...(r != null ? { pctHint: majorationHeuresSupPctHint(r) } : {}),
    });
  }
  if (sid === SEMANTIC_ID.MAJORATION_HEURES_SUP_50) {
    const r = resolvedHeuresXtauxMajRate(def, ctx);
    return buildHeuresXtauxTooltip(result, def, ctx, {
      labelHeures: `Heures sup. à +50 % (au-delà de ${CONFIG.HEURES_SUP_TRANCHE_1_MENSUELLES} h/mois)`,
      ...(r != null ? { pctHint: majorationHeuresSupPctHint(r) } : {}),
    });
  }
  if (sid === SEMANTIC_ID.FORFAIT_HEURES || sid === SEMANTIC_ID.FORFAIT_JOURS) {
    const detail = buildPourcentageBaseTooltip(result, def, ctx);
    const forfaitKey = String(def.config?.forfaitKey ?? '');
    detail.tooltipDetail =
      forfaitKey === 'jours'
        ? 'Majoration forfait jours : pourcentage appliqué au minimum conventionnel annuel (cadre).'
        : 'Majoration forfait heures : pourcentage appliqué au minimum conventionnel annuel (cadre).';
    return detail;
  }

  return buildFromComputeMode(result, def, ctx);
}

function fallbackOrigin(origin: 'convention' | 'accord', agreement: Agreement | null): string {
  if (origin === 'accord') {
    const nom = getAccordNomCourt(agreement);
    return nom ? `Accord d'entreprise ${nom}` : "Accord d'entreprise";
  }
  return CONFIG.TOOLTIP_TEXTS.origins.ccnm;
}

export function buildResultElementTooltipHtml(
  result: ElementResult,
  def: ElementDef,
  ctx: ComputeContext,
  origin: 'convention' | 'accord',
  agreement: Agreement | null,
): string {
  const detail = buildSemanticTooltip(result, def, ctx, origin, agreement);
  const smhNote = smhIncludedSummary(result);
  if (smhNote) {
    detail.tooltipDetail = [detail.tooltipDetail, smhNote].filter(Boolean).join('\n');
  }
  if (!detail.tooltipDetail && def.tooltip) {
    detail.tooltipDetail = def.tooltip;
  }
  const fb = fallbackOrigin(origin, agreement);
  if (origin === 'accord') {
    detail.tooltipOrigin = fb;
  }
  return buildResultTooltipContent(
    CONFIG.TOOLTIP_TEXTS,
    CONFIG.TOOLTIP_TEXTS.origins.ccnm,
    detail,
    fb,
  );
}

/** Enrichit chaque ligne calculée avec une infobulle HTML (détail du calcul). */
export function enrichResolvedElementsTooltips(
  resolved: ResolvedElement[],
  ctx: ComputeContext,
  agreement: Agreement | null,
): ElementResult[] {
  return resolved.map(({ result, def, origin }) => {
    if (result.amount <= 0) return result;
    const tooltip = buildResultElementTooltipHtml(result, def, ctx, origin, agreement);
    return { ...result, tooltip };
  });
}
