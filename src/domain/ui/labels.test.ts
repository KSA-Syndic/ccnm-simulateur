import { describe, expect, it } from 'vitest';
import { CFDT_KUHN_BRANDING, WIZARD_LABELS } from './labels';

describe('labels', () => {
  it('CFDT_KUHN_BRANDING — section PDF numérotée', () => {
    expect(CFDT_KUHN_BRANDING.pdfResourcesSectionTitle).toMatch(/^5\./);
  });

  it('export arriérés — libellé unique rapport', () => {
    expect(WIZARD_LABELS.arreteesExportPdf).toMatch(/rapport/);
  });
});
