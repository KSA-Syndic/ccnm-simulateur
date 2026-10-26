import { describe, expect, it } from 'vitest';
import { buildArreteesLegalNotes } from '@/domain/legal/arreteesLegalNotes';

const base = {
  firstPeriodKey: '2024-01',
  accordEcrit: false,
  changementClassification: false,
  dateRupture: null,
};

describe('buildArreteesLegalNotes', () => {
  it('contrat en cours : prescription de 3 ans à compter d’aujourd’hui', () => {
    const notes = buildArreteesLegalNotes({ ...base, today: new Date(2028, 5, 1) });
    expect(notes.neg).toHaveLength(1);
    expect(notes.neg[0]).toContain('La prescription de 3 ans');
    expect(notes.neg[0]).toContain(new Date(2025, 5, 1).toLocaleDateString('fr-FR'));
  });

  it('contrat rompu : 3 années précédant la rupture', () => {
    const notes = buildArreteesLegalNotes({
      ...base,
      dateRupture: '2027-09-30',
      today: new Date(2028, 0, 15),
    });
    expect(notes.neg).toHaveLength(1);
    expect(notes.neg[0]).toContain('précédant la rupture');
  });

  it('rupture de plus de 3 ans : action potentiellement prescrite', () => {
    const notes = buildArreteesLegalNotes({
      ...base,
      dateRupture: '2024-06-30',
      today: new Date(2027, 8, 1),
    });
    expect(notes.neg.some((n) => n.includes('peut être prescrite'))).toBe(true);
  });

  it('éléments favorables : accord écrit et changement de classification', () => {
    const notes = buildArreteesLegalNotes({
      ...base,
      accordEcrit: true,
      changementClassification: true,
      today: new Date(2025, 0, 1),
    });
    expect(notes.neg).toHaveLength(0);
    expect(notes.pos).toHaveLength(2);
    expect(notes.hasAny).toBe(true);
  });
});
