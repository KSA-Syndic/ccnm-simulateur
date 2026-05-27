import { describe, expect, it } from 'vitest';
import { omitRecordKeys } from '@/domain/utils/record';

describe('omitRecordKeys', () => {
  it('retourne une copie sans les clés demandées', () => {
    const src = { a: 1, b: 2, c: 3 };
    expect(omitRecordKeys(src, ['b'])).toEqual({ a: 1, c: 3 });
    expect(src).toEqual({ a: 1, b: 2, c: 3 });
  });
});
