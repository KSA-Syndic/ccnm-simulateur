import type { ArreteePeriode } from '@/stores/arretees';
import { CONSTANTS } from '@/domain/config/constants';
import { calculateSalaireMensuelDuPourPeriode } from '@/domain/arretees/salaireDuPourMois';
import type { Agreement } from '@/domain/agreements/interface';
import type { WizardRemunerationInput } from '@/domain/remuneration/compute';
import { getSmhForClasse } from '@/domain/remuneration/smh';
import { roundToEuro } from '@/domain/utils/rounding';

/** Premier mois couvert par la CCNM (entrée en vigueur) — borne basse de la frise. */
function debutFriseMensuelle(dateEmbauche: Date): Date {
  const emb = new Date(dateEmbauche.getFullYear(), dateEmbauche.getMonth(), 1);
  const ccnm = new Date(
    CONSTANTS.DATE_CCNM_EFFET.getFullYear(),
    CONSTANTS.DATE_CCNM_EFFET.getMonth(),
    1,
  );
  return emb < ccnm ? ccnm : emb;
}

/**
 * Port minimal de la logique « frise mensuelle » pour les arriérés Vue.
 */
export function buildMonthlyPeriodsStub(params: {
  dateEmbauche: string;
  monthlyDu?: number;
}): ArreteePeriode[] {
  const { dateEmbauche, monthlyDu = 0 } = params;
  if (!dateEmbauche) return [];
  const emb = new Date(dateEmbauche);
  if (Number.isNaN(emb.getTime())) return [];
  const periodes: ArreteePeriode[] = [];
  const cur = debutFriseMensuelle(emb);
  const end = new Date();
  end.setDate(1);
  let n = 0;
  while (cur <= end && n < 120) {
    const y = cur.getFullYear();
    const m = cur.getMonth() + 1;
    const periodKey = `${y}-${String(m).padStart(2, '0')}`;
    periodes.push({
      label: cur.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
      periodKey,
      salaireDu: monthlyDu,
      salaireVerse: undefined,
    });
    cur.setMonth(cur.getMonth() + 1);
    n++;
  }
  return periodes;
}

export type EnrichPeriodesSalaireDuParams = {
  classe: number;
  experiencePro: number;
  tempsPartiel: boolean;
  tauxActivite: number;
  dateChangementClassification?: string;
  classeAvantChangement?: number | null;
  wizardInput: WizardRemunerationInput;
  dateEmbauche: string;
  nbMois: number;
  smhSeul: boolean;
  agreement: Agreement | null;
};

/**
 * Recalcule `salaireDu` mois par mois (grille SMH datée, accord : 13e mois, primes à mois fixe).
 */
export function enrichPeriodesSalaireDuMensuel(
  periodes: ArreteePeriode[],
  params: EnrichPeriodesSalaireDuParams,
): void {
  const rate = params.tempsPartiel ? Math.max(0.01, Number(params.tauxActivite) / 100) : 1;
  const cc = params.dateChangementClassification?.trim().slice(0, 7);
  const classeApres = params.classe;
  const classeAvant =
    params.classeAvantChangement != null && Number.isFinite(params.classeAvantChangement)
      ? Number(params.classeAvantChangement)
      : classeApres;

  const hasAccord = params.agreement != null && params.wizardInput.agreement.accordActif;

  for (const p of periodes) {
    if (!p.periodKey) continue;

    if (hasAccord) {
      const calc = calculateSalaireMensuelDuPourPeriode(params.wizardInput, {
        periodKey: p.periodKey,
        dateEmbauche: params.dateEmbauche,
        nbMois: params.nbMois,
        smhSeul: params.smhSeul,
        agreement: params.agreement,
        classe: classeApres,
      });
      p.salaireDu = calc.salaireMensuelDu;
      p.mensuelDuBase = calc.mensuelDuBase;
      p.primesVerseesCeMois = calc.primesVerseesCeMois;
      p.primesVerseesLabels = calc.primesVerseesLabels;
      p.estMois13eMois = calc.estMois13eMois;
      continue;
    }

    const y = Number(p.periodKey.slice(0, 4));
    let cl = classeApres;
    if (cc && p.periodKey < cc) cl = classeAvant;
    const annual = getSmhForClasse(cl, y, params.experiencePro);
    p.salaireDu = roundToEuro((annual * rate) / 12);
    p.mensuelDuBase = undefined;
    p.primesVerseesCeMois = undefined;
    p.primesVerseesLabels = undefined;
    p.estMois13eMois = undefined;
  }
}
