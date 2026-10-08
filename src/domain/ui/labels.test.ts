import { describe, expect, it } from 'vitest';
import { PDF_RESOURCES_LABELS, WIZARD_LABELS } from './labels';

describe('labels', () => {
  it('PDF_RESOURCES_LABELS — section PDF numérotée', () => {
    expect(PDF_RESOURCES_LABELS.pdfResourcesSectionTitle).toMatch(/^5\./);
  });

  it('export arriérés — libellé unique rapport', () => {
    expect(WIZARD_LABELS.arreteesExportPdf).toMatch(/rapport/);
  });
});
