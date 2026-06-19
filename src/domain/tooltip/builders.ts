/**
 * Construction HTML des tooltips « bloc légal » (gabarits, origines, primes).
 */
import { escapeHTML, formatMoneyTooltipDetail } from '../utils/format';
import { resolvePrimeSemanticId, type Agreement, type PrimeDef } from '../agreements/interface';
import { resolvePrimeDefaultHours, resolvePrimeOfficialValue } from '../agreements/primeUiDefaults';

export interface TooltipOrigins {
  codeTravail: string;
  ccnm: string;
  accordEntreprise: string;
  accordCollectif: string;
}

export interface TooltipTextsConfig {
  origins?: Partial<TooltipOrigins>;
  templates?: { legalBlock?: string };
  result?: { breakdownLineTemplate?: string };
}

/** Format décimal fixe `fr-FR` (virgule) pour les fragments de tooltips — stable avec l’affichage historique. */
export function formatFrDecimalFixed(value: unknown, digits = 2): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return n.toFixed(digits).replace('.', ',');
}

export function applyTooltipTemplate(
  template: string,
  vars: Record<string, string | number> = {},
): string {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

export function composeTooltipDescription(parts: Array<string | undefined | null> = []): string {
  return parts
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function getTooltipOrigins(
  cfg: TooltipTextsConfig | undefined,
  conventionLabelFallback = 'CCNM',
): TooltipOrigins {
  const origins = cfg?.origins || {};
  return {
    codeTravail: origins.codeTravail || 'Code du travail',
    ccnm: origins.ccnm || conventionLabelFallback,
    accordEntreprise: origins.accordEntreprise || "Accord d'entreprise",
    accordCollectif: origins.accordCollectif || 'Accord collectif / usage',
  };
}

export function classifyOriginFromSourceArticle(
  origins: TooltipOrigins,
  sourceArticle: unknown,
  fallbackOrigin: string,
): string {
  const src = String(sourceArticle || '').toLowerCase();
  if (!src) return fallbackOrigin;
  if (src.includes('code du travail') || /\bl\d{4}-\d+\b/.test(src)) {
    return origins.codeTravail;
  }
  if (src.includes('usage') || src.includes('accord collectif applicable')) {
    return origins.accordCollectif;
  }
  if (
    src.includes('convention') ||
    src.includes('ccn') ||
    src.includes('ccnm') ||
    src.includes('idcc')
  ) {
    return origins.ccnm;
  }
  if (src.includes('accord')) {
    return src.includes("d'entreprise") ? origins.accordEntreprise : origins.accordCollectif;
  }
  return fallbackOrigin;
}

export interface BuildLegalTooltipOptions {
  /** Référence / article — bloc « Source » toujours en dernière position. */
  sourceArticle?: string;
  /** Lien externe sous le paragraphe principal, avant le bloc Source. */
  externalLink?: { href: string; label: string };
}

export function buildLegalTooltipContent(
  cfg: TooltipTextsConfig | undefined,
  title: string,
  description: string,
  opts?: BuildLegalTooltipOptions,
): string {
  const template = cfg?.templates?.legalBlock || '<strong>{title}\u00A0:</strong><br>{description}';
  const safeTitle = escapeHTML(String(title || ''));
  const safeDescription = escapeHTML(String(description || '')).replace(/\n/g, '<br>');
  const base = applyTooltipTemplate(template, { title: safeTitle, description: safeDescription });
  const src = String(opts?.sourceArticle || '').trim();
  const sourceBlock = src
    ? `<div class="tooltip-source"><strong class="tooltip-source-label">Source\u00A0:</strong> <span class="tooltip-source-article">${escapeHTML(src)}</span></div>`
    : '';
  const link = opts?.externalLink;
  if (link?.href && link.label) {
    const safeHref = escapeHTML(String(link.href));
    const safeLabel = escapeHTML(String(link.label));
    const linkHtml = `<a class="tooltip-link" href="${safeHref}" target="_blank" rel="noopener">${safeLabel}</a>`;
    const withLink = `${base}<br>${linkHtml}`;
    if (sourceBlock) return `${withLink}<br>${sourceBlock}`;
    return withLink;
  }
  if (sourceBlock) return `${base}<br>${sourceBlock}`;
  return base;
}

export interface AccordLike {
  nomCourt?: string;
  nom?: string;
}

export function getAccordNomCourt(agreement: AccordLike | null | undefined): string {
  if (!agreement || typeof agreement !== 'object') return '';
  return agreement.nomCourt || agreement.nom || 'Accord';
}

/** Texte affiché après le libellé « Source : » */
export function formatAccordEntrepriseSourceArticle(
  cfg: TooltipTextsConfig | undefined,
  agreement: AccordLike | null | undefined,
): string {
  const { accordEntreprise } = getTooltipOrigins(cfg);
  const nom = getAccordNomCourt(agreement);
  return nom ? `${accordEntreprise} ${nom}` : accordEntreprise;
}

function resolveAccordPrimeRateForTooltip(p: PrimeDef, overrides: Record<string, number>): number {
  const sid = resolvePrimeSemanticId(p);
  const fromOverride = sid ? overrides[sid] : undefined;
  if (typeof fromOverride === 'number' && Number.isFinite(fromOverride)) return fromOverride;
  return resolvePrimeOfficialValue(p) ?? 0;
}

function formatAccordPrimeActiveDetail(
  p: PrimeDef,
  inputs: Record<string, unknown>,
  overrides: Record<string, number>,
): string {
  if (p.valueType === 'horaire') {
    const taux = resolveAccordPrimeRateForTooltip(p, overrides);
    let detail = ` — ${formatFrDecimalFixed(taux, 2)} ${String(p.unit || '€/h')}`;
    if (p.autoHeures === true) {
      detail += ` (${formatFrDecimalFixed(resolvePrimeDefaultHours(p), 2)} h/mois)`;
    } else if (p.stateKeyHeures) {
      const hRaw = inputs[p.stateKeyHeures];
      const h = typeof hRaw === 'number' && Number.isFinite(hRaw) ? hRaw : (p.defaultHeures ?? 0);
      detail += ` (${formatFrDecimalFixed(h, 2)} h/mois)`;
    }
    return detail;
  }
  if (p.valueType === 'majorationHoraire') {
    const taux = resolveAccordPrimeRateForTooltip(p, overrides);
    let detail = ` — +${formatFrDecimalFixed(taux * 100, 0)} %`;
    if (p.stateKeyHeures) {
      const hRaw = inputs[p.stateKeyHeures];
      const h = typeof hRaw === 'number' && Number.isFinite(hRaw) ? hRaw : (p.defaultHeures ?? 0);
      detail += ` (${formatFrDecimalFixed(h, 2)} h/mois)`;
    }
    return detail;
  }
  return '';
}

/** Récapitulatif pour infobulle « accord d'entreprise » (texte brut ; échappement via `buildLegalTooltipContent`). */
export function buildAccordSummaryTooltip(
  cfg: TooltipTextsConfig | undefined,
  doc: Agreement,
  inputs: Record<string, unknown>,
  options?: { nationalPrimeOverrides?: Record<string, number> },
): string {
  const lines: string[] = [];
  const desc = doc.labels?.description?.trim();
  if (desc) lines.push(desc);

  const overrides = options?.nationalPrimeOverrides ?? {};

  const primesListed = doc.primes.filter(
    (p) =>
      (p.valueType === 'horaire' || p.valueType === 'majorationHoraire') &&
      p.stateKeyHeures &&
      p.stateKeyActif,
  );
  for (const p of primesListed) {
    const actif = p.stateKeyActif ? Boolean(inputs[p.stateKeyActif]) : false;
    let detail = actif ? 'activée' : 'désactivée';
    if (actif) {
      detail += formatAccordPrimeActiveDetail(p, inputs, overrides);
    }
    lines.push(`• ${p.label} : ${detail}`);
  }

  const pv = doc.primes.find((p) => p.id === 'primeVacances');
  if (pv && pv.inclusDansSMH === true) {
    lines.push(
      `• ${pv.label} : incluse dans le SMH selon les paramètres de l'accord (réf. texte / simulateur).`,
    );
  }

  const { seuil, plafond } = doc.anciennete;
  lines.push(
    `• Ancienneté accord : seuil ${String(seuil)} an(s), plafond ${String(plafond)} an(s).`,
  );

  const rep = doc.repartition13Mois;
  if (rep && typeof rep.actif === 'boolean') {
    lines.push(
      rep.actif
        ? '• Versement des variables : répartition sur 13 mois (paramètres accord).'
        : '• Versement des variables : répartition sur 12 mois (paramètres accord).',
    );
  }

  const body = lines.join('\n');
  return buildLegalTooltipContent(cfg, `${getAccordNomCourt(doc)} — accord d'entreprise`, body);
}

export interface PrimeTooltipInput {
  id?: string | undefined;
  semanticId?: string | undefined;
  /** Libellé affiché dans l'UI (titre de l'infobulle, comme les modalités CCNM). */
  label?: string | undefined;
  tooltip?: string | undefined;
  valueType?: string | undefined;
  valeurAccord?: number | null | undefined;
  unit?: string | undefined;
  conditionTexte?: string | undefined;
  sourceArticle?: string | undefined;
}

export interface BuildPrimeConditionOptions {
  isAccordPrime?: boolean;
  agreement?: AccordLike | null;
}

export function buildPrimeConditionTooltip(
  cfg: TooltipTextsConfig | undefined,
  conventionLabel: string,
  prime: PrimeTooltipInput,
  options: BuildPrimeConditionOptions = {},
): string {
  const isAccordPrime = options?.isAccordPrime === true;
  const agreement = options?.agreement || null;
  const tooltipOrigins = getTooltipOrigins(cfg, conventionLabel);
  const baseTooltip = String(prime?.tooltip || '');
  let ratePart = '';
  if (prime?.valueType === 'majorationHoraire' && prime?.valeurAccord != null) {
    const pct = Math.round(Number(prime.valeurAccord) * 100);
    if (pct > 0) ratePart = `+${pct}%.`;
  } else if (prime?.valeurAccord != null) {
    const v = Number(prime.valeurAccord);
    if (Number.isFinite(v) && v > 0) {
      const unit = prime?.unit || '€/h';
      ratePart = `+${formatFrDecimalFixed(v, 2)} ${unit}.`;
    }
  }
  const description = composeTooltipDescription([ratePart, baseTooltip || prime?.conditionTexte]);

  if (isAccordPrime) {
    const title =
      String(prime?.label || '').trim() ||
      String(prime?.id || '').trim() ||
      getAccordNomCourt(agreement) ||
      tooltipOrigins.accordEntreprise;
    return buildLegalTooltipContent(cfg, title, description || baseTooltip || title, {
      sourceArticle: formatAccordEntrepriseSourceArticle(cfg, agreement),
    });
  }

  const fallbackOrigin = tooltipOrigins.ccnm;
  const sourceTitle =
    classifyOriginFromSourceArticle(tooltipOrigins, prime?.sourceArticle, fallbackOrigin) ||
    fallbackOrigin;
  const legalOpts = !String(prime?.sourceArticle || '').trim()
    ? undefined
    : { sourceArticle: String(prime.sourceArticle).trim() };
  return buildLegalTooltipContent(
    cfg,
    sourceTitle,
    description || baseTooltip || sourceTitle,
    legalOpts,
  );
}

export interface ResultBreakdownLine {
  label: string;
  value: number;
}

export interface ResultTooltipDetailInput {
  label?: string | undefined;
  value?: number | undefined;
  sourceArticle?: string | undefined;
  conditionTexte?: string | undefined;
  tooltipDetail?: string | undefined;
  /**
   * Titre de l’infobulle résultat : si renseigné, prime sur la classification à partir de
   * `sourceArticle` (ex. ligne d’accord dont la référence cite la CCNM pour la qualification).
   */
  tooltipOrigin?: string | undefined;
  breakdown?: ResultBreakdownLine[] | undefined;
}

export function buildResultTooltipContent(
  cfg: TooltipTextsConfig | undefined,
  conventionLabel: string,
  detail: ResultTooltipDetailInput,
  fallbackOrigin: string,
): string {
  const resultCfg = cfg?.result || {};
  const origins = getTooltipOrigins(cfg, conventionLabel);
  const classified =
    classifyOriginFromSourceArticle(origins, detail?.sourceArticle, fallbackOrigin) ||
    fallbackOrigin;
  const explicitTitle = String(detail?.tooltipOrigin ?? '').trim();
  const title = explicitTitle || classified;
  const lineTemplate = resultCfg.breakdownLineTemplate || '• {label} : {value}';
  const descriptionLines: string[] = [];
  const summaryLine = String(detail?.tooltipDetail || '').trim();
  const defaultLine =
    `${detail?.label || ''} : ${formatMoneyTooltipDetail(detail?.value || 0)}`.trim();
  const hasBreakdown = Array.isArray(detail?.breakdown) && detail.breakdown.length > 0;
  if (hasBreakdown && detail.breakdown) {
    for (const b of detail.breakdown) {
      descriptionLines.push(
        applyTooltipTemplate(lineTemplate, {
          label: b?.label || '',
          value: formatMoneyTooltipDetail(b?.value || 0),
        }),
      );
    }
    const normalizedSummary = summaryLine.toLowerCase();
    const summaryIsRedundant =
      !normalizedSummary ||
      normalizedSummary === defaultLine.toLowerCase() ||
      descriptionLines.some((line) => line.toLowerCase().includes(normalizedSummary));
    if (!summaryIsRedundant) {
      descriptionLines.push(summaryLine);
    }
  } else {
    if (summaryLine) {
      descriptionLines.push(summaryLine);
    } else {
      descriptionLines.push(defaultLine);
    }
  }
  if (detail?.conditionTexte) {
    descriptionLines.push(`Base de calcul : ${detail.conditionTexte}`);
  }
  const sourceArticle = String(detail?.sourceArticle || '').trim() || undefined;
  return buildLegalTooltipContent(cfg, title, descriptionLines.filter(Boolean).join('\n'), {
    ...(sourceArticle ? { sourceArticle } : {}),
  });
}
