import { describe, expect, it } from 'vitest';
import {
  aggregateArreteesParAnneeFromPeriodeLabels,
  buildArreteesSummaryFromPeriodes,
  extractYearFromPeriodeLabel,
} from '@/domain/arretees/aggregateFromPeriodes';

describe('extractYearFromPeriodeLabel', () => {
  it('extrait la première année 20xx du libellé', () => {
    expect(extractYearFromPeriodeLabel('janv. 2024')).toBe(2024);
    expect(extractYearFromPeriodeLabel('déc. 2023')).toBe(2023);
  });

  it('retourne null si aucune année', () => {
    expect(extractYearFromPeriodeLabel('janvier')).toBeNull();
  });
});

describe('aggregateArreteesParAnneeFromPeriodeLabels', () => {
  it('ignore les périodes sans salaire versé', () => {
    const r = aggregateArreteesParAnneeFromPeriodeLabels([
      { label: 'janv. 2024', salaireDu: 3000, salaireVerse: undefined },
      { label: 'févr. 2024', salaireDu: 3000, salaireVerse: 2800 },
    ]);
    expect(r.detailsParAnnee).toHaveLength(1);
    expect(r.detailsParAnnee[0]).toMatchObject({
      annee: 2024,
      nbMoisSaisis: 1,
      totalDu: 3000,
      totalReel: 2800,
      ecart: 200,
    });
    expect(r.totalArretees).toBe(200);
  });
});

describe('buildArreteesSummaryFromPeriodes', () => {
  it('retourne null si aucun mois saisi', () => {
    expect(
      buildArreteesSummaryFromPeriodes([
        { label: 'janv. 2024', salaireDu: 3000, salaireVerse: undefined, periodKey: '2024-01' },
      ]),
    ).toBeNull();
  });

  it('agrège par année et trie le détail mensuel par periodKey', () => {
    const s = buildArreteesSummaryFromPeriodes([
      {
        label: 'mars 2024',
        salaireDu: 3000,
        salaireVerse: 2900,
        periodKey: '2024-03',
      },
      {
        label: 'janv. 2024',
        salaireDu: 3000,
        salaireVerse: 2800,
        periodKey: '2024-01',
      },
    ]);
    expect(s).not.toBeNull();
    expect(s!.dateDebutLabel).toBe('janv. 2024');
    expect(s!.dateFinLabel).toBe('mars 2024');
    expect(s!.detailMois.map((r) => r.periode)).toEqual(['janv. 2024', 'mars 2024']);
    expect(s!.detailsParAnnee).toHaveLength(1);
    expect(s!.detailsParAnnee[0]!.ecart).toBe(300);
    expect(s!.totalArretees).toBe(300);
    expect(s!.conformeAuSMH).toBe(false);
  });

  it('conformeAuSMH est vrai si aucun écart annuel', () => {
    const s = buildArreteesSummaryFromPeriodes([
      { label: 'janv. 2024', salaireDu: 3000, salaireVerse: 3000, periodKey: '2024-01' },
    ]);
    expect(s!.totalArretees).toBe(0);
    expect(s!.conformeAuSMH).toBe(true);
  });
});
