import { describe, expect, it } from 'vitest';
import { SEMANTIC_ID } from '../types';
import {
  CFDT_KUHN_BRANDING,
  getLabel,
  GLOBAL_SEMANTIC_REGISTRY,
  WIZARD_LEGACY_LABELS,
} from './labels';

describe('GLOBAL_SEMANTIC_REGISTRY', () => {
  it('couvre toutes les constantes SEMANTIC_ID', () => {
    const ids = new Set(Object.values(SEMANTIC_ID));
    for (const id of ids) {
      expect(GLOBAL_SEMANTIC_REGISTRY[id], `manque registry pour ${id}`).toBeDefined();
      const e = GLOBAL_SEMANTIC_REGISTRY[id]!;
      expect(e.texteSource.length).toBeGreaterThan(10);
      expect(e.hierarchieNote.length).toBeGreaterThan(5);
    }
  });

  it('getLabel — surfaces cohérentes', () => {
    expect(getLabel(SEMANTIC_ID.PRIME_ANCIENNETE, 'form')).toBe(
      GLOBAL_SEMANTIC_REGISTRY[SEMANTIC_ID.PRIME_ANCIENNETE]!.shortLabel,
    );
    expect(getLabel(SEMANTIC_ID.PRIME_ANCIENNETE, 'detail')).toBe(
      GLOBAL_SEMANTIC_REGISTRY[SEMANTIC_ID.PRIME_ANCIENNETE]!.longLabel,
    );
    expect(getLabel('inconnu', 'form')).toBe('inconnu');
  });

  it('CFDT_KUHN_BRANDING — section PDF numérotée', () => {
    expect(CFDT_KUHN_BRANDING.pdfResourcesSectionTitle).toMatch(/^5\./);
  });

  it('export arriérés — libellé unique rapport', () => {
    expect(WIZARD_LEGACY_LABELS.arreteesExportPdf).toMatch(/rapport/);
  });
});
