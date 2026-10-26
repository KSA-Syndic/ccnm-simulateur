import { CONSTANTS } from '../config/constants';
import type { WizardRemunerationInput } from '../remuneration/compute';
import { getWorkingDaysBetween } from '../utils/date';
import { roundToEuro } from '../utils/rounding';
import {
  calculateSalaireMensuelDuPourPeriode,
  type SalaireMensuelDuCalcule,
} from './salaireDuPourMois';

export interface ArreteePeriode {
  label: string;
  /** Clé stable `YYYY-MM` pour l’indexation mensuelle. */
  periodKey?: string;
  salaireDu: number;
  salaireVerse: number | undefined;
  /** Part mensuelle hors primes ponctuelles (répartition 12/13). */
  mensuelDuBase?: number;
  /** Primes accord versées ce mois (ex. vacances en juillet). */
  primesVerseesCeMois?: number;
  primesVerseesLabels?: string[];
  /** Mois de versement du 13e mois (double mensualité de base). */
  estMois13eMois?: boolean;
}

/** Période dont le salaire versé a été saisi. */
export function isPeriodeSaisie<T extends { salaireVerse?: number | null | undefined }>(
  p: T | undefined,
): p is T & { salaireVerse: number } {
  return p?.salaireVerse != null;
}

const MOIS_COURT_FORMAT = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' });

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

/** Date `YYYY-MM-DD` valide, sinon `null`. */
function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date de rupture retenue : valide et postérieure (ou égale) à l'embauche, sinon ignorée. */
export function resolveDateRupture(
  dateEmbauche: string,
  dateRupture: string | null | undefined,
): string | null {
  const emb = parseDate(dateEmbauche);
  const rupture = parseDate(dateRupture);
  return emb && rupture && rupture >= emb ? (dateRupture as string) : null;
}

/**
 * Frise mensuelle des arriérés : de l'embauche (au plus tôt l'entrée en vigueur CCNM)
 * au mois courant, ou au mois de rupture du contrat s'il est antérieur.
 */
export function buildMonthlyPeriods(
  dateEmbauche: string,
  dateRupture?: string | null,
): ArreteePeriode[] {
  const emb = parseDate(dateEmbauche);
  if (!emb) return [];
  const periodes: ArreteePeriode[] = [];
  const cur = debutFriseMensuelle(emb);
  const end = new Date();
  end.setDate(1);
  const rupture = parseDate(resolveDateRupture(dateEmbauche, dateRupture));
  if (rupture) {
    const moisRupture = new Date(rupture.getFullYear(), rupture.getMonth(), 1);
    if (moisRupture < end) end.setTime(moisRupture.getTime());
  }
  let n = 0;
  while (cur <= end && n < 120) {
    const y = cur.getFullYear();
    const m = cur.getMonth() + 1;
    periodes.push({
      label: MOIS_COURT_FORMAT.format(cur),
      periodKey: `${y}-${String(m).padStart(2, '0')}`,
      salaireDu: 0,
      salaireVerse: undefined,
    });
    cur.setMonth(cur.getMonth() + 1);
    n++;
  }
  return periodes;
}

/** Classification applicable avant la date d'effet d'un changement en cours de contrat. */
export interface ChangementClassification {
  /** Date d'effet de la nouvelle classification (`YYYY-MM-DD`). */
  date: string;
  groupe: string;
  classe: number;
}

/** Moyenne pondérée de deux montants mensuels (part `r` pour `avant`), arrondie à l'euro supérieur. */
function pondere(avant: number, apres: number, r: number): number {
  return roundToEuro(avant * r + apres * (1 - r));
}

/**
 * Mois de changement de classification : dû au prorata des jours ouvrés passés dans chaque
 * classification (avant / à partir de la date d'effet).
 */
function combinerMoisChangement(
  avant: SalaireMensuelDuCalcule,
  apres: SalaireMensuelDuCalcule,
  dateEffet: Date,
): SalaireMensuelDuCalcule {
  const premierJour = new Date(dateEffet.getFullYear(), dateEffet.getMonth(), 1);
  const dernierJour = new Date(dateEffet.getFullYear(), dateEffet.getMonth() + 1, 0);
  const veille = new Date(dateEffet.getFullYear(), dateEffet.getMonth(), dateEffet.getDate() - 1);
  const joursMois = getWorkingDaysBetween(premierJour, dernierJour);
  const r = joursMois > 0 ? getWorkingDaysBetween(premierJour, veille) / joursMois : 0;
  if (r === 0) return apres;
  return {
    ...apres,
    salaireMensuelDu: pondere(avant.salaireMensuelDu, apres.salaireMensuelDu, r),
    mensuelDuBase: pondere(avant.mensuelDuBase, apres.mensuelDuBase, r),
    primesVerseesCeMois: pondere(avant.primesVerseesCeMois, apres.primesVerseesCeMois, r),
  };
}

/**
 * Recalcule `salaireDu` mois par mois (grille SMH datée, accord : 13e mois, primes à mois fixe),
 * en tenant compte d'un changement de classification et d'une rupture du contrat.
 */
export function enrichPeriodesSalaireDuMensuel(
  periodes: ArreteePeriode[],
  params: {
    wizardInput: WizardRemunerationInput;
    dateEmbauche: string;
    nbMois: number;
    smhSeul: boolean;
    changementClassification?: ChangementClassification | null;
    dateRupture?: string | null;
  },
): void {
  const dateRupture = resolveDateRupture(params.dateEmbauche, params.dateRupture);
  const changement = params.changementClassification;
  const dateEffet = parseDate(changement?.date);
  const moisChangement = dateEffet && changement ? changement.date.slice(0, 7) : null;
  const inputAvant: WizardRemunerationInput | null =
    moisChangement && changement
      ? {
          ...params.wizardInput,
          mode: 'manual',
          groupe: changement.groupe,
          classe: changement.classe,
        }
      : null;

  for (let i = 0; i < periodes.length; i++) {
    const p = periodes[i];
    if (!p?.periodKey) continue;

    const calculer = (input: WizardRemunerationInput) =>
      calculateSalaireMensuelDuPourPeriode(input, {
        periodKey: p.periodKey as string,
        dateEmbauche: params.dateEmbauche,
        nbMois: params.nbMois,
        smhSeul: params.smhSeul,
        dateRupture,
      });

    let calc: SalaireMensuelDuCalcule;
    if (!inputAvant || !moisChangement || !dateEffet || p.periodKey > moisChangement) {
      calc = calculer(params.wizardInput);
    } else if (p.periodKey < moisChangement) {
      calc = calculer(inputAvant);
    } else {
      calc = combinerMoisChangement(calculer(inputAvant), calculer(params.wizardInput), dateEffet);
    }

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

/** Reporte les salaires versés déjà saisis sur une frise recalculée (même mois `YYYY-MM`). */
export function reporterSalairesVerses(
  nouvelles: ArreteePeriode[],
  anciennes: ReadonlyArray<ArreteePeriode>,
): ArreteePeriode[] {
  const saisis = new Map<string, number>();
  for (const p of anciennes) {
    if (p.periodKey && isPeriodeSaisie(p)) saisis.set(p.periodKey, p.salaireVerse);
  }
  if (saisis.size === 0) return nouvelles;
  return nouvelles.map((p) => {
    const v = p.periodKey ? saisis.get(p.periodKey) : undefined;
    return v === undefined ? p : { ...p, salaireVerse: v };
  });
}
