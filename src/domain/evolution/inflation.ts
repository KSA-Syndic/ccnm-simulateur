import { CONFIG } from '../config';

export interface EvolutionPoint {
  year: number;
  label: string;
  smh: number;
  smhChange: number;
  inflationCumul: number;
  salaryCumul: number;
}

/**
 * Builds a chronological array of salary-evolution data points
 * comparing SMH growth against cumulative indicative inflation.
 */
export function calculateSalaryEvolution(classe: number): EvolutionPoint[] {
  const yearsRecord = CONFIG.SMH_UPDATE.years;
  const sortedKeys = Object.keys(yearsRecord)
    .map(Number)
    .sort((a, b) => a - b);

  if (sortedKeys.length < 2) return [];

  const points: EvolutionPoint[] = [];
  let inflationCumul = 0;
  let salaryCumul = 0;

  for (let i = 0; i < sortedKeys.length; i++) {
    const yearKey = sortedKeys[i]!;
    const yearData = yearsRecord[yearKey];
    if (!yearData) continue;

    const year = new Date(yearData.effectiveDate).getFullYear();
    const smhGrid = CONFIG.SMH_BY_YEAR[year];
    const smh = smhGrid?.[classe] ?? 0;

    if (i > 0) {
      const prevKey = sortedKeys[i - 1]!;
      const prevYearData = yearsRecord[prevKey];
      if (prevYearData) {
        const prevYear = new Date(prevYearData.effectiveDate).getFullYear();
        const prevGrid = CONFIG.SMH_BY_YEAR[prevYear];
        const prevSmh = prevGrid?.[classe] ?? 0;

        const smhChangePercent = prevSmh > 0 ? ((smh - prevSmh) / prevSmh) * 100 : 0;
        const inflRate = yearData.indicativeRate ?? 0;

        inflationCumul += inflRate * 100;
        salaryCumul += smhChangePercent;
      }
    }

    points.push({
      year,
      label: yearData.sourceLabel ?? String(year),
      smh,
      smhChange: i > 0 ? salaryCumul : 0,
      inflationCumul: i > 0 ? inflationCumul : 0,
      salaryCumul: i > 0 ? salaryCumul : 0,
    });
  }

  return points;
}
