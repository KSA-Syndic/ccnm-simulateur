import { describe, expect, it } from 'vitest';
import { ACRONYM_GLOSSARY, acronymWithSigle, plainWithSigle } from '@/domain/ui/glossary';

describe('ACRONYM_GLOSSARY', () => {
  it('expose les entrées CCNM, SMH, IDCC, UIMM', () => {
    expect(ACRONYM_GLOSSARY.CCNM.full).toContain('métallurgie');
    expect(ACRONYM_GLOSSARY.SMH.full).toContain('hiérarchique');
    expect(ACRONYM_GLOSSARY.IDCC.hint).toContain('3248');
  });

  it('acronymWithSigle inclut le sigle entre parenthèses', () => {
    expect(acronymWithSigle('SMH')).toMatch(/\(SMH\)/);
    expect(acronymWithSigle('IDCC')).toMatch(/\(IDCC\)/);
  });

  it('plainWithSigle formate le libellé court', () => {
    expect(plainWithSigle('SMH', true)).toMatch(/^Minimum conventionnel \(SMH\)/);
  });
});
