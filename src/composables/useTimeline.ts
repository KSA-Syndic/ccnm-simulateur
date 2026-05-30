import type { ArreteePeriode } from '@/stores/arretees';
import { CONSTANTS } from '@/domain/config/constants';
import { calculateSalaireMensuelDuPourPeriode } from '@/domain/arretees/salaireDuPourMois';
import type { Agreement } from '@/domain/agreements/interface';
import type { WizardRemunerationInput } from '@/domain/remuneration/compute';

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
  const cc = params.dateChangementClassification?.trim().slice(0, 7);
  const classeApres = params.classe;
  const classeAvant =
    params.classeAvantChangement != null && Number.isFinite(params.classeAvantChangement)
      ? Number(params.classeAvantChangement)
      : classeApres;

  for (let i = 0; i < periodes.length; i++) {
    const p = periodes[i];
    if (!p?.periodKey) continue;

    const cl = cc && p.periodKey < cc ? classeAvant : classeApres;
    const wizardInputForPeriod =
      cl !== params.wizardInput.classe
        ? { ...params.wizardInput, mode: 'manual' as const, classe: cl }
        : params.wizardInput;

    const calc = calculateSalaireMensuelDuPourPeriode(wizardInputForPeriod, {
      periodKey: p.periodKey,
      dateEmbauche: params.dateEmbauche,
      nbMois: params.nbMois,
      smhSeul: params.smhSeul,
      agreement: params.agreement,
    });

    periodes[i] = {
      ...p,
      salaireDu: calc.salaireMensuelDu,
      mensuelDuBase: calc.mensuelDuBase,
      primesVerseesCeMois: calc.primesVerseesCeMois,
      primesVerseesLabels: calc.primesVerseesLabels,
      estMois13eMois: calc.estMois13eMois,
    };
  }
}
