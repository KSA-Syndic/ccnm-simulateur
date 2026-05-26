import type { jsPDF as JsPDFType } from 'jspdf';

export async function createPdf(): Promise<{ doc: JsPDFType }> {
  const { jsPDF } = await import('jspdf');
  await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  return { doc };
}
