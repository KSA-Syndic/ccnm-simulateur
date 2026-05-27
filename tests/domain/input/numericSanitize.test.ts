import { describe, expect, it } from 'vitest';
import {
  clampNumber,
  parseDecimalInput,
  parseIntegerInput,
  sanitizeDecimalString,
  sanitizeIntegerString,
} from '@/domain/input/numericSanitize';

describe('numericSanitize', () => {
  it('sanitizeDecimalString accepte la virgule', () => {
    expect(sanitizeDecimalString('12,5')).toBe('12.5');
    expect(sanitizeDecimalString(' 1 234,56 ')).toBe('1234.56');
  });

  it('sanitizeIntegerString ne garde que les chiffres', () => {
    expect(sanitizeIntegerString('a12b3')).toBe('123');
  });

  it('parseDecimalInput', () => {
    expect(parseDecimalInput('0,5', 0)).toBe(0.5);
    expect(parseDecimalInput('', 7)).toBe(7);
  });

  it('parseIntegerInput', () => {
    expect(parseIntegerInput('08', 0)).toBe(8);
  });

  it('clampNumber', () => {
    expect(clampNumber(5, 0, 10)).toBe(5);
    expect(clampNumber(-1, 0, 10)).toBe(0);
    expect(clampNumber(99, 0, 10)).toBe(10);
  });
});
