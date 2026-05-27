import type { jsPDF as JsPDFType } from 'jspdf';
import type { UserOptions } from 'jspdf-autotable';
import { importPdfAutoTable } from '../../domain/pdf/jsPdfHelpers';

export async function createPdf(): Promise<{
  doc: JsPDFType;
  autoTable: (doc: object, options: UserOptions) => void;
}> {
  const { jsPDF } = await import('jspdf');
  const autoTable = await importPdfAutoTable();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  return { doc, autoTable };
}
