import { describe, expect, it } from 'vitest';
import {
  drawPdfAutoTable,
  importPdfAutoTable,
  pdfEcartCell,
  sanitizePdfAutoTableOptions,
  sanitizePdfStandardFontText,
} from '@/domain/pdf/jsPdfHelpers';

describe('sanitizePdfStandardFontText', () => {
  it('remplace le signe moins Unicode et les tirets typographiques par un hyphen ASCII', () => {
    expect(sanitizePdfStandardFontText('dû \u2212 versé')).toBe('dû - versé');
    expect(sanitizePdfStandardFontText('A \u2014 B')).toBe('A - B');
    expect(sanitizePdfStandardFontText('x\u2012y')).toBe('x-y');
  });

  it('supprime les caractères de contrôle qui étirent le rendu PDF', () => {
    expect(sanitizePdfStandardFontText('Total\u0012écart')).toBe('Totalécart');
  });
});

describe('pdfEcartCell', () => {
  it('formate signe et couleur selon le signe de l’écart', () => {
    const positif = pdfEcartCell(1200) as { content: string; styles: { textColor: number[] } };
    expect(positif.content).toMatch(/^\+ /);
    expect(positif.styles.textColor).toEqual([200, 50, 50]);

    const negatif = pdfEcartCell(-500) as { content: string; styles: { textColor: number[] } };
    expect(negatif.content).toMatch(/^- /);
    expect(negatif.styles.textColor).toEqual([50, 130, 70]);

    const zero = pdfEcartCell(0) as { content: string };
    expect(zero.content).toBe('0 €');
  });
});

describe('sanitizePdfAutoTableOptions', () => {
  it('nettoie toutes les cellules du body', () => {
    const opts = sanitizePdfAutoTableOptions({
      body: [['Total écart (dû \u2212 versé)', '12 297 €']],
    });
    expect(opts.body?.[0]).toEqual(['Total écart (dû - versé)', '12 297 €']);
  });
});

describe('drawPdfAutoTable', () => {
  it('dessine un tableau via jspdf-autotable v5 (API autoTable(doc, opts))', async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = await importPdfAutoTable();
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const endY = drawPdfAutoTable(doc, autoTable, {
      startY: 20,
      body: [
        ['Classification', 'A1'],
        ['Total salaire dû', '1 769 €'],
      ],
      theme: 'plain',
    });

    expect(endY).toBeGreaterThan(20);
    expect(doc.lastAutoTable?.finalY).toBe(endY);
  });
});
