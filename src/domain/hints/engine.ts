import { HINT_ENGINE } from '../ui/labels';
import { CONFIG } from '../config';
import type { Agreement } from '../agreements/interface';
import type { ElementResult } from '../types';
import { getSmhGridAnnual } from '../remuneration/smh';
import { formatMoney } from '../utils/format';
import {
  computePdfRemunerationBreakdown,
  type WizardRemunerationInput,
} from '../remuneration/compute';

export type HintId = keyof typeof HINT_ENGINE;

export interface HintContext {
  isCadre: boolean;
  classe: number;
  experiencePro: number;
  accordActif: boolean;
  travailNuit: boolean;
  travailDimanche: boolean;
  travailHeuresSup: boolean;
}

/** Retourne les hints applicables, dans l’ordre de priorité d’affichage (liste plate legacy simplifiée). */
export function eligibleHints(ctx: HintContext): HintId[] {
  const out: HintId[] = [];

  if (
    ctx.isCadre &&
    ctx.classe >= 11 &&
    ctx.classe <= 12 &&
    ctx.experiencePro < CONFIG.BAREME_DEBUTANTS_SEUIL_EXP_PRO
  ) {
    out.push('cadreDebutant');
  }

  if (ctx.accordActif) {
    out.push('accordApplique');
  }

  if (!ctx.accordActif && (ctx.travailNuit || ctx.travailDimanche || ctx.travailHeuresSup)) {
    out.push('majorationsSansAccord');
  }

  if (ctx.isCadre) {
    out.push('defautCadre');
  } else {
    out.push('defautNonCadre');
  }

  return out;
}

export function hintHtmlFor(id: HintId): string {
  return HINT_ENGINE[id];
}

/** Concatène plusieurs hints en un bloc HTML (puces). */
export function formatHintsHtml(ids: HintId[]): string {
  if (!ids.length) return '';
  const items = ids.map((id) => `<li>${HINT_ENGINE[id]}</li>`).join('');
  return `<ul class="hint-engine-list">${items}</ul>`;
}

/**
 * Bloc hint assiette SMH pour la saisie des salaires (étape arriérés).
 * Source : moteur de calcul live (inclusDansSMH par élément résolu).
 * Titres « Inclus : » / « Exclus : » puis listes (base + primes / hors assiette SMH).
 */
export function buildSmhAssietteHintBlocks(
  input: WizardRemunerationInput,
  nbMois: number,
): ResultHintBlock[] {
  const b = computePdfRemunerationBreakdown(input, nbMois);
  const inclus = b.inclusSmhLabels;
  const exclus = b.exclusSmhLabels;
  if (!inclus.length && !exclus.length) return [];

  const lines: string[] = [];
  const inclusBullets = [
    '• Base (grille du minimum hiérarchique)',
    ...inclus.map((l) => `• ${l}`),
  ].join('<br>');

  lines.push(`<span><strong>Inclus :</strong><br>${inclusBullets}</span>`);

  if (exclus.length) {
    const exclusBullets = exclus.map((l) => `• ${l}`).join('<br>');
    lines.push(`<span><strong>Exclus :</strong><br>${exclusBullets}</span>`);
  }

  return [
    {
      type: 'info',
      html: lines.join('<br>'),
    },
  ];
}

export interface ResultHintBlock {
  type: 'warning' | 'success' | 'info';
  html: string;
}

export interface BuildResultHintsParams {
  scenario: string;
  groupe: string;
  classe: number;
  anciennete: number;
  experiencePro: number;
  accordActif: boolean;
  agreement: Agreement | null;
  details: ElementResult[];
}

function shortLabel(label: string): string {
  return (label || '').replace(/\s*\(.*$/, '').trim() || label;
}

function hasMajorationsCcnmStyle(details: ElementResult[]): boolean {
  return details.some((d) => {
    if (d.kind !== 'majoration' || d.amount <= 0) return false;
    const lab = (d.label || '').toLowerCase();
    return lab.includes('nuit') || lab.includes('dimanche') || lab.includes('équipe');
  });
}

/**
 * Blocs `book-hint` contextualisés — aligné `updateHintDisplay` legacy (`app.js` L2780–2873).
 */
export function buildResultHintBlocks(p: BuildResultHintsParams): ResultHintBlock[] {
  const hints: ResultHintBlock[] = [];

  const accordDetails = p.details.filter((d) => d.source === 'accord' && d.amount > 0);
  const hasAccordElements = accordDetails.length > 0;
  const nomAccord = p.agreement?.nomCourt ?? 'accord';
  const hasMajorations = hasMajorationsCcnmStyle(p.details);

  if (p.scenario === 'cadre-debutant') {
    const smhStandard = getSmhGridAnnual(p.classe);
    const seuil = CONFIG.BAREME_DEBUTANTS_SEUIL_EXP_PRO;
    hints.push({
      type: 'warning',
      html: `
                <strong>📋 Barème salariés débutants</strong><br>
                Classe ${p.groupe}${p.classe} avec moins de ${String(seuil)} ans d'expérience professionnelle.<br>
                <small>SMH standard (${formatMoney(smhStandard)}) applicable à partir de ${String(seuil)} ans d'expérience.</small>
            `,
    });
  }

  if (p.accordActif && hasAccordElements && p.agreement) {
    const elementsAccord = accordDetails
      .map((d) => {
        const short = shortLabel(d.label);
        return short || null;
      })
      .filter((x): x is string => Boolean(x));
    const listeElements = [...new Set(elementsAccord)].join(', ');
    const descTaux =
      p.agreement.labels?.description?.trim() || `Taux et primes selon l'accord ${nomAccord}.`;
    hints.push({
      type: 'success',
      html: `
                <strong>🏢 Accord ${nomAccord} appliqué</strong><br>
                Éléments : ${listeElements}.<br>
                <small>${descTaux}</small>
            `,
    });
  } else if (hasMajorations && !p.accordActif) {
    const pctNuitCCN = Math.round((CONFIG.MAJORATIONS_CCN?.nuit ?? 0.15) * 100);
    const pctDimCCN = Math.round((CONFIG.MAJORATIONS_CCN?.dimanche ?? 1) * 100);
    hints.push({
      type: 'info',
      html: `
                <strong>Majorations CCNM appliquées</strong><br>
                Taux CCNM : nuit +${pctNuitCCN}%, dimanche +${pctDimCCN}%.<br>
                <small>Activez un accord d'entreprise pour les taux entreprise.</small>
            `,
    });
  }

  if (hints.length === 0) {
    const isCadre = typeof p.classe === 'number' && p.classe >= CONFIG.SEUIL_CADRE;
    if (isCadre) {
      const ancienneteAccordCadre = p.accordActif && p.agreement?.anciennete?.tousStatuts === true;
      hints.push({
        type: 'info',
        html: ancienneteAccordCadre
          ? "La branche (CCNM) ne prévoit pas de prime d'ancienneté pour les cadres. Les montants d'ancienneté affichés relèvent de votre accord d'entreprise."
          : 'Ce montant est le minimum conventionnel.',
      });
    } else {
      const seuilAccord = p.agreement?.anciennete?.seuil;
      const seuilAnc =
        p.accordActif && typeof seuilAccord === 'number'
          ? `${seuilAccord} ans (${p.agreement?.nomCourt ?? 'accord'})`
          : `3 ans (CCNM)`;
      const hasAnciennete =
        p.anciennete >= CONFIG.ANCIENNETE.seuil ||
        (p.accordActif && typeof seuilAccord === 'number' && p.anciennete >= seuilAccord);
      hints.push({
        type: 'info',
        html: hasAnciennete
          ? `Ce montant est le minimum conventionnel. Prime d'ancienneté incluse.`
          : `Ce montant est le minimum conventionnel. Prime d'ancienneté à partir de ${seuilAnc}.`,
      });
    }
  }

  return hints;
}
