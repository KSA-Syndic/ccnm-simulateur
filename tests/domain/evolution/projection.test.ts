import { describe, expect, it } from 'vitest';
import {
  projectSalaryTotals,
  projectInflationTotals,
  averageInflationFromSeries,
  buildEvolutionSummaryHtml,
  getYearsToRetirement,
  INFLATION_FALLBACK_PCT,
} from '@/domain/evolution/projection';
import { CONFIG } from '@/domain/config';
import type { WizardRemunerationInput } from '@/domain/remuneration/compute';

const baseInput = (): WizardRemunerationInput => ({
  mode: 'manual',
  groupe: 'A',
  classe: 5,
  scores: {},
  situation: {
    anciennete: 2,
    pointTerritorial: 5.9,
    tempsPartiel: false,
    tauxActivite: 100,
    forfait: '35h',
    experiencePro: 4,
    travailNuit: false,
    heuresNuit: 0,
    travailDimanche: false,
    heuresDimanche: 0,
    travailHeuresSup: false,
    heuresSup: 0,
    travailJoursSupForfait: false,
    joursSupForfait: 0,
  },
  agreement: { accordActif: false, activeAccordId: null, inputs: {} },
});

describe('projection', () => {
  it('projectSalaryTotals retourne years+1 points', () => {
    const pts = projectSalaryTotals(baseInput(), 3, 0);
    expect(pts).toHaveLength(4);
    expect(pts[0]!.salary).toBeGreaterThan(0);
  });

  it('projectInflationTotals croît avec inflation', () => {
    const pts = projectInflationTotals(30000, 2, 2);
    expect(pts[2]!.salary).toBeGreaterThan(pts[0]!.salary);
  });

  it('getYearsToRetirement', () => {
    expect(getYearsToRetirement(30)).toBe(34);
  });

  it('buildEvolutionSummaryHtml — phrase courte attendue', () => {
    const html = buildEvolutionSummaryHtml({
      years: 5,
      finalSalary: 40000,
      finalInflation: 35000,
      avgInflationPct: 2.1,
    });
    expect(html).toContain('5 ans');
    expect(html).toMatch(/40/);
    expect(html).toContain("de plus que l'inflation");
    expect(html).not.toContain(String(CONFIG.INFLATION_AVG_WINDOW_YEARS));
  });

  it('averageInflationFromSeries : fenêtre glissante sur les années les plus récentes', () => {
    const data: Record<string, number> = {};
    for (let y = 2000; y <= 2030; y += 1) {
      data[String(y)] = y;
    }
    const window = 20;
    let sum = 0;
    for (let y = 2011; y <= 2030; y += 1) sum += y;
    const expected = sum / window;
    expect(averageInflationFromSeries(data, window)).toBeCloseTo(expected, 5);
  });

  it('INFLATION_FALLBACK_PCT est la moyenne de CONFIG.INFLATION_FALLBACK_SERIES', () => {
    const vals = Object.values(CONFIG.INFLATION_FALLBACK_SERIES);
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    expect(INFLATION_FALLBACK_PCT).toBeCloseTo(m, 8);
  });
});
