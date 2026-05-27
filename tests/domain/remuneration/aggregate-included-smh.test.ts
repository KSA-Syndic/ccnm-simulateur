import { describe, expect, it } from 'vitest';
import { aggregateRemunerationDetails } from '@/domain/remuneration/aggregate';
import type { ElementResult } from '@/domain/types';
import { SEMANTIC_ID } from '@/domain/types';

describe('aggregateRemunerationDetails / primes incluses SMH', () => {
  it('regroupe les primes inclusDansSMH dans includedInSmhItems sans section « Primes incluses dans le SMH »', () => {
    const primeIn: ElementResult = {
      amount: 120,
      label: 'Prime vacances (accord)',
      kind: 'prime',
      source: 'accord',
      semanticId: SEMANTIC_ID.PRIME_VACANCES,
      inclusDansSMH: true,
      isAgreementSpecific: true,
    };
    const maj: ElementResult = {
      amount: 50,
      label: 'Majoration de nuit conventionnelle',
      kind: 'majoration',
      source: 'convention',
      semanticId: SEMANTIC_ID.MAJORATION_NUIT,
      inclusDansSMH: false,
      isAgreementSpecific: false,
    };
    const agg = aggregateRemunerationDetails([primeIn, maj], 30_000, 12);
    expect(agg.includedInSmhItems).toHaveLength(1);
    expect(agg.includedInSmhItems[0]?.semanticId).toBe(SEMANTIC_ID.PRIME_VACANCES);
    expect(agg.sections.some((s) => s.label === 'Primes incluses dans le SMH')).toBe(false);
    expect(agg.sections.some((s) => s.label === 'Majorations')).toBe(true);
  });
});
