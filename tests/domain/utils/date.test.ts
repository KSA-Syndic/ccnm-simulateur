import { describe, expect, it } from 'vitest';
import { isCompleteIsoDateString } from '../../../src/domain/utils/date';

describe('isCompleteIsoDateString', () => {
  it('accepte une date ISO complète et crédible', () => {
    expect(isCompleteIsoDateString('2019-01-01')).toBe(true);
    expect(isCompleteIsoDateString('2024-06-15')).toBe(true);
  });

  it('rejette une année à 2 chiffres interprétée comme 0020', () => {
    expect(isCompleteIsoDateString('0020-01-01')).toBe(false);
  });

  it('rejette les formats incomplets ou invalides', () => {
    expect(isCompleteIsoDateString('')).toBe(false);
    expect(isCompleteIsoDateString('2019-01')).toBe(false);
    expect(isCompleteIsoDateString('2019-13-01')).toBe(false);
    expect(isCompleteIsoDateString('2019-02-30')).toBe(false);
  });
});
