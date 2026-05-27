import { CONSTANTS } from '../config/constants';
import { CONFIG } from '../config';
import {
  computeAnnualRemunerationFromWizardStores,
  type WizardRemunerationInput,
} from '../remuneration/compute';

export interface ProjectionYearPoint {
  year: number;
  salary: number;
}

export function getYearsToRetirement(currentAge: number): number {
  const retirementAge = CONSTANTS.AGE_RETRAITE;
  return Math.max(1, retirementAge - Math.max(1, Math.floor(currentAge)));
}

/**
 * Série « salaire » sur N années — aligné esprit legacy `calculateSalaryEvolution` :
 * ancienneté et expérience +1/an, moteur annuel, augmentation % sur le total (sans détail primes fixes).
 */
export function projectSalaryTotals(
  baseInput: WizardRemunerationInput,
  years: number,
  augmentationAnnuellePct: number,
): ProjectionYearPoint[] {
  const currentYear = new Date().getFullYear();
  const savedAnc = baseInput.situation.anciennete;
  const savedExp = baseInput.situation.experiencePro;
  const out: ProjectionYearPoint[] = [];

  for (let i = 0; i <= years; i++) {
    const input: WizardRemunerationInput = {
      ...baseInput,
      situation: {
        ...baseInput.situation,
        anciennete: savedAnc + i,
        experiencePro: savedExp + i,
      },
    };
    const total = computeAnnualRemunerationFromWizardStores(input).total;
    const aug = Math.pow(1 + augmentationAnnuellePct / 100, i);
    const salary = Math.round(total * aug);
    out.push({ year: currentYear + i, salary });
  }

  return out;
}

/**
 * Série « inflation » : même taux moyen r composé chaque année → (1+r)^i (effet composé standard).
 * Ne pas confondre avec un indice de prix Eurostat (INX_A_AVG) : ici r est un pourcentage d’inflation annuelle.
 */
export function projectInflationTotals(
  initialSalary: number,
  years: number,
  avgInflationPctPerYear: number,
): ProjectionYearPoint[] {
  const currentYear = new Date().getFullYear();
  const out: ProjectionYearPoint[] = [];
  for (let i = 0; i <= years; i++) {
    const f = Math.pow(1 + avgInflationPctPerYear / 100, i);
    out.push({ year: currentYear + i, salary: Math.round(initialSalary * f) });
  }
  return out;
}

/** Moyenne des taux du jeu de secours CONFIG (plus de littéral 2 %). */
export const INFLATION_FALLBACK_PCT = (() => {
  const vals = Object.values(CONFIG.INFLATION_FALLBACK_SERIES);
  return vals.reduce((s, v) => s + v, 0) / vals.length;
})();

/**
 * Moyenne des taux annuels sur les `windowYears` années les plus récentes présentes dans `data`.
 */
export function averageInflationFromSeries(
  data: Record<string, number>,
  windowYears: number = CONFIG.INFLATION_AVG_WINDOW_YEARS,
): number {
  const entries = Object.entries(data).sort(([a], [b]) => Number(b) - Number(a));
  const slice = entries.slice(0, windowYears).map(([, v]) => v);
  if (slice.length === 0) return INFLATION_FALLBACK_PCT;
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

export function buildEvolutionSummaryHtml(params: {
  years: number;
  finalSalary: number;
  finalInflation: number;
  avgInflationPct: number;
}): string {
  const { years, finalSalary, finalInflation } = params;
  const diffPercent = ((finalSalary / finalInflation - 1) * 100).toFixed(1);
  const yearsLabel = years === 1 ? '1 an' : `${years} ans`;
  const n = Number.parseFloat(diffPercent);
  const pctDisplay = diffPercent.replace('.', ',');
  const intro = `Dans ${yearsLabel} : <strong>${formatEuro(finalSalary)}</strong>`;
  if (n >= 0) {
    return `${intro} soit <span style="color:#16a34a">+${pctDisplay} %</span> de plus que l'inflation.`;
  }
  return `${intro} soit <span style="color:#dc2626">${pctDisplay} %</span> de moins que l'inflation.`;
}

function formatEuro(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}
