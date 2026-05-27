import { CONFIG } from '../config';
import { WIZARD_TOOLTIPS } from './labels';
import {
  buildLegalTooltipContent,
  type BuildLegalTooltipOptions,
  type TooltipTextsConfig,
} from '../tooltip/builders';

export type WizardTooltipKey = keyof typeof WIZARD_TOOLTIPS;
type WizardTooltipEntry = (typeof WIZARD_TOOLTIPS)[WizardTooltipKey];

function wizardTooltipOpts(entry: WizardTooltipEntry): BuildLegalTooltipOptions | undefined {
  const opts: BuildLegalTooltipOptions = {};
  if ('sourceArticle' in entry && entry.sourceArticle?.trim()) {
    opts.sourceArticle = entry.sourceArticle;
  }
  if ('externalLink' in entry && entry.externalLink) {
    opts.externalLink = { ...entry.externalLink };
  }
  return Object.keys(opts).length > 0 ? opts : undefined;
}

/** Infobulle wizard : bloc « Source » et lien externe seulement si définis dans `WIZARD_TOOLTIPS`. */
export function buildWizardTooltipHtml(
  key: WizardTooltipKey,
  overrides?: { title?: string; description?: string; cfg?: TooltipTextsConfig },
): string {
  const t = WIZARD_TOOLTIPS[key];
  const title = overrides?.title ?? t.title;
  const description = overrides?.description ?? t.description;
  return buildLegalTooltipContent(
    overrides?.cfg ?? CONFIG.TOOLTIP_TEXTS,
    title,
    description,
    wizardTooltipOpts(t),
  );
}

/** Infobulle d’aide champ (titre + texte, sans référence juridique). */
export function buildFieldHelpTooltipHtml(title: string, description: string): string {
  return buildLegalTooltipContent(CONFIG.TOOLTIP_TEXTS, title, description);
}
