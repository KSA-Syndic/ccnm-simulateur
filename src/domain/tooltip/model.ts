export interface TooltipContent {
  summary: string;
  /** Fragment HTML déjà échappé (ex. `buildLegalTooltipContent`) affiché sous le résumé. */
  legalBlockHtml?: string;
  source?: string;
  sourceArticle?: string;
  calculationSteps?: { label: string; value: string }[];
}

export type TooltipVariant = 'field' | 'result' | 'compact';

export function buildTooltipContent(
  def: {
    label: string;
    sourceArticle?: string;
    conditionTexte?: string;
    tooltip?: string;
  },
  variant: TooltipVariant,
  calculationSteps?: { label: string; value: string }[],
): TooltipContent {
  const summary = def.tooltip ?? def.conditionTexte ?? def.label;
  const content: TooltipContent = { summary };

  if (def.sourceArticle) {
    content.sourceArticle = def.sourceArticle;
    content.source = classifyOrigin(def.sourceArticle);
  }

  if (variant === 'result' && calculationSteps) {
    content.calculationSteps = calculationSteps;
  }

  return content;
}

export function classifyOrigin(sourceArticle: string): string {
  const lower = sourceArticle.toLowerCase();
  if (lower.includes('code du travail') || lower.includes('l.') || lower.includes('l3121'))
    return 'Code du travail';
  if (lower.includes('accord') || lower.includes('kuhn')) return "Accord d'entreprise";
  if (lower.includes('ccnm') || lower.includes('ccn') || lower.includes('art.'))
    return 'Convention (CCNM)';
  if (lower.includes('acoss') || lower.includes('urssaf')) return 'ACOSS / URSSAF';
  return 'Convention (CCNM)';
}

function escapeBadgeClass(source: string): string {
  if (source.includes('Accord')) return 'accord';
  if (source.includes('Code')) return 'code-travail';
  if (source.includes('ACOSS')) return 'acoss';
  return 'ccnm';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatTooltipHtml(content: TooltipContent, variant: TooltipVariant): string {
  let html = `<div class="tooltip-content tooltip-${variant}">`;
  html += `<p class="tooltip-summary">${escapeHtml(content.summary)}</p>`;

  if (content.legalBlockHtml) {
    html += `<div class="tooltip-legal-fragment">${content.legalBlockHtml}</div>`;
  }

  if (content.sourceArticle && content.source) {
    const badgeClass = escapeBadgeClass(content.source);
    html += `<div class="tooltip-source">`;
    html += `<span class="tooltip-badge tooltip-badge-${badgeClass}">${escapeHtml(content.source)}</span>`;
    html += `<span class="tooltip-ref">${escapeHtml(content.sourceArticle)}</span>`;
    html += `</div>`;
  }

  if (variant === 'result' && content.calculationSteps?.length) {
    html += '<div class="tooltip-calc">';
    for (const step of content.calculationSteps) {
      html += `<div class="tooltip-calc-line"><span>${escapeHtml(step.label)}</span><span>${escapeHtml(step.value)}</span></div>`;
    }
    html += '</div>';
  }

  html += '</div>';
  return html;
}
