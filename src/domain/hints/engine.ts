import { CONFIG } from '../config';
import type { Agreement } from '../agreements/interface';
import type { ElementResult } from '../types';
import { isCadre } from '../classification/engine';
import { getSmhGridAnnual } from '../remuneration/smh';
import { formatMoney } from '../utils/format';
import {
  computePdfRemunerationBreakdown,
  type WizardRemunerationInput,
} from '../remuneration/compute';

/**
 * Bloc hint assiette SMH pour la saisie des salaires (étape arriérés).
 * Source : moteur de calcul live (`inclusDansSMH` par élément résolu, aligné `smhAssiettePolicy.ts`).
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

  const inclusListe = inclus.length ? `Base, ${inclus.join(', ')}.` : 'Base.';
  const blocks: ResultHintBlock[] = [
    { type: 'info', html: `<span><strong>Inclus :</strong><br>${inclusListe}</span>` },
  ];
  if (exclus.length) {
    blocks.push({
      type: 'info',
      html: `<span><strong>Exclus :</strong><br>${exclus.join(', ')}.</span>`,
    });
  }
  return blocks;
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
 * Blocs `book-hint` contextualisés pour l’assistant.
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
    const pctNuitCCN = Math.round(CONFIG.MAJORATIONS_CCN.nuit * 100);
    const pctDimCCN = Math.round(CONFIG.MAJORATIONS_CCN.dimanche * 100);
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
    if (isCadre(p.classe)) {
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
          : `${CONFIG.ANCIENNETE.seuil} ans (CCNM)`;
      const hasAnciennete =
        p.anciennete >= CONFIG.ANCIENNETE.seuil ||
        (p.accordActif && typeof seuilAccord === 'number' && p.anciennete >= seuilAccord);
      hints.push({
        type: 'info',
        html: hasAnciennete
          ? `Ce montant est le minimum conventionnel. Une prime d'ancienneté d'entreprise (accord) entre dans la comparaison au SMH ; la prime d'ancienneté de branche seule en est exclue. Les majorations et primes hors assiette s'ajoutent en plus.`
          : `Ce montant est le minimum conventionnel. Prime d'ancienneté de branche à partir de ${seuilAnc}. Avec un accord d'entreprise, une prime d'ancienneté d'entreprise peut aussi compter pour la comparaison au SMH une fois le seuil atteint.`,
      });
    }
  }

  return hints;
}
