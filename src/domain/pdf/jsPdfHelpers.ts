import type { CellInput, RowInput, UserOptions } from 'jspdf-autotable';
import { formatMoney } from '../utils/format';
import { roundToCents } from '../utils/rounding';

/** Constantes de mise en page alignées sur `legacy-archive/arretees/PDFGenerator.js`. */
export const PDF_MARGIN_MM = 20;

/** Zone réservée au pied de page (disclaimer + numéro) — évite le chevauchement avec autoTable. */
export const PDF_FOOTER_RESERVE_MM = 34;

/** Arriérés (dû > versé) — aligné legacy PDF `textColor: [200, 50, 50]`. */
export const PDF_ECART_COLOR_ARRETEES: [number, number, number] = [200, 50, 50];

/** Trop-perçu (dû < versé) — aligné legacy `textColor: [50, 150, 50]`. */
export const PDF_ECART_COLOR_SURPLUS: [number, number, number] = [50, 130, 70];

export const PDF_ECART_COLOR_ZERO: [number, number, number] = [100, 100, 100];

export interface PdfDocWithAutoTable {
  lastAutoTable?: { finalY: number };
}

/** jspdf-autotable v5 : `autoTable(doc, opts)` — l’import side-effect ne branche plus `doc.autoTable` en ESM. */
export async function importPdfAutoTable(): Promise<(doc: object, options: UserOptions) => void> {
  const mod = await import('jspdf-autotable');
  return mod.default;
}

function sanitizeCellInput(cell: CellInput): CellInput {
  if (cell === null || cell === undefined) return cell;
  if (typeof cell === 'number' || typeof cell === 'boolean') return cell;
  if (typeof cell === 'string') return sanitizePdfStandardFontText(cell);
  if (Array.isArray(cell)) {
    return cell.map((part) =>
      typeof part === 'string' ? sanitizePdfStandardFontText(part) : part,
    );
  }
  if (typeof cell === 'object' && 'content' in cell) {
    const def = cell as { content?: CellInput };
    const c = def.content;
    if (typeof c === 'string') {
      return { ...cell, content: sanitizePdfStandardFontText(c) };
    }
    if (Array.isArray(c)) {
      return {
        ...cell,
        content: c.map((part) =>
          typeof part === 'string' ? sanitizePdfStandardFontText(part) : part,
        ),
      };
    }
  }
  return cell;
}

function sanitizeRowInput(row: RowInput): RowInput {
  if (Array.isArray(row)) {
    return row.map((c) => sanitizeCellInput(c));
  }
  if (row && typeof row === 'object') {
    const out: Record<string, CellInput> = {};
    for (const [key, value] of Object.entries(row)) {
      out[key] = sanitizeCellInput(value as CellInput);
    }
    return out;
  }
  return row;
}

function sanitizeTableRows(rows: RowInput[] | undefined): RowInput[] | undefined {
  return rows?.map(sanitizeRowInput);
}

function mergePdfTableMargin(margin: UserOptions['margin']): UserOptions['margin'] {
  const base = {
    left: PDF_MARGIN_MM,
    right: PDF_MARGIN_MM,
    bottom: PDF_FOOTER_RESERVE_MM,
  };
  if (margin === undefined) return base;
  if (typeof margin === 'number') {
    return { top: margin, ...base };
  }
  if (Array.isArray(margin)) {
    const [top, right, bottom, left] = margin;
    return {
      top,
      right: right ?? base.right,
      bottom: bottom ?? base.bottom,
      left: left ?? base.left,
    };
  }
  return { ...base, ...margin };
}

/** Nettoie head/body/foot avant autoTable — évite l’espacement aberrant des glyphes non Helvetica. */
export function sanitizePdfAutoTableOptions(options: UserOptions): UserOptions {
  return {
    ...options,
    head: sanitizeTableRows(options.head as RowInput[] | undefined),
    body: sanitizeTableRows(options.body as RowInput[] | undefined),
    foot: sanitizeTableRows(options.foot as RowInput[] | undefined),
  };
}

/**
 * Cellule « écart » pour tableaux PDF : signe explicite et couleur.
 * `ecart` = salaire dû − salaire versé (positif = arriérés à réclamer).
 */
export function pdfEcartCell(ecart: number, opts?: { bold?: boolean }): CellInput {
  const n = roundToCents(ecart);
  const fontStyle = opts?.bold ? 'bold' : 'normal';
  const base = { halign: 'right' as const, fontStyle };

  if (n > 0) {
    return {
      content: sanitizePdfStandardFontText(`+ ${formatMoney(n)}`),
      styles: { ...base, textColor: PDF_ECART_COLOR_ARRETEES },
    };
  }
  if (n < 0) {
    return {
      content: sanitizePdfStandardFontText(`- ${formatMoney(Math.abs(n))}`),
      styles: { ...base, textColor: PDF_ECART_COLOR_SURPLUS },
    };
  }
  return {
    content: '0 €',
    styles: { ...base, textColor: PDF_ECART_COLOR_ZERO },
  };
}

export function drawPdfAutoTable(
  doc: PdfDocWithAutoTable,
  autoTable: (doc: object, options: UserOptions) => void,
  options: UserOptions,
): number {
  const startY = typeof options.startY === 'number' ? options.startY : PDF_MARGIN_MM;
  autoTable(
    doc,
    sanitizePdfAutoTableOptions({
      ...options,
      margin: mergePdfTableMargin(options.margin),
    }),
  );
  return doc.lastAutoTable?.finalY ?? startY;
}

export const PDF_FOOTER_DISCLAIMER =
  'Document indicatif généré automatiquement — ne remplace pas un conseil juridique professionnel.';

/**
 * Glyphes Unicode souvent problématiques avec Helvetica / autoTable (jsPDF).
 */
export function sanitizePdfStandardFontText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/\u00a0|\u202f/g, ' ')
    .replace(/[\u200b-\u200d\ufeff\u00ad]/g, '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"');
}

export interface JsPdfLike {
  internal: {
    pageSize: { getWidth: () => number; getHeight: () => number };
    getNumberOfPages: () => number;
  };
  setPage: (n: number) => void;
  setFontSize: (n: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  text: (txt: string, x: number, y: number, opt?: { align?: 'center' | 'left' | 'right' }) => void;
}

export function addPdfFooter(doc: JsPdfLike, disclaimer = PDF_FOOTER_DISCLAIMER): void {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(sanitizePdfStandardFontText(disclaimer), pw / 2, ph - 20, { align: 'center' });
    doc.text(`Page ${i} / ${total}`, pw / 2, ph - 11, { align: 'center' });
  }
}

export function checkPdfPageBreak(
  doc: JsPdfLike & { addPage: () => void },
  y: number,
  spaceMm = 20,
): number {
  if (y + spaceMm > doc.internal.pageSize.getHeight() - PDF_FOOTER_RESERVE_MM) {
    doc.addPage();
    return PDF_MARGIN_MM;
  }
  return y;
}
