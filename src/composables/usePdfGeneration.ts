import { ref } from 'vue';
import { useArreteesStore } from '../stores/arretees';
import { useWizardStore } from '../stores/wizard';
import { formatMoney } from '../domain/utils/format';

interface PdfInfos {
  nom: string;
  employeur: string;
}

export function usePdfGeneration() {
  const generating = ref(false);

  async function generatePdf(infos: PdfInfos) {
    generating.value = true;
    try {
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      const arreteesStore = useArreteesStore();
      const wizardStore = useWizardStore();

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setFontSize(16);
      doc.text('Rappel de salaire — Arriérés', 14, 20);

      doc.setFontSize(10);
      let y = 35;
      if (infos.nom) {
        doc.text(`Salarié : ${infos.nom}`, 14, y);
        y += 6;
      }
      if (infos.employeur) {
        doc.text(`Employeur : ${infos.employeur}`, 14, y);
        y += 6;
      }
      doc.text(
        `Classification : Groupe ${wizardStore.groupe} — Classe ${wizardStore.classe}`,
        14,
        y,
      );
      y += 10;

      const tableData = arreteesStore.periodes
        .filter((p) => p.salaireVerse !== undefined)
        .map((p) => [
          p.label,
          formatMoney(p.salaireDu),
          formatMoney(p.salaireVerse ?? 0),
          formatMoney(p.salaireDu - (p.salaireVerse ?? 0)),
        ]);

      if (tableData.length > 0) {
        // jspdf-autotable augments the jsPDF prototype at runtime
        const autoTableFn = (doc as unknown as Record<string, unknown>)['autoTable'] as
          | ((opts: Record<string, unknown>) => void)
          | undefined;
        autoTableFn?.({
          startY: y,
          head: [['Période', 'Salaire dû', 'Salaire versé', 'Écart']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [74, 144, 217] },
          styles: { fontSize: 8 },
        });
      }

      doc.save('arretees-salaire.pdf');
    } finally {
      generating.value = false;
    }
  }

  return { generating, generatePdf };
}
