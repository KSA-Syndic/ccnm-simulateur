import { ref } from 'vue';
import { useArreteesStore } from '../stores/arretees';
import { aggregateArreteesParAnneeFromPeriodeLabels } from '../domain/arretees/aggregateFromPeriodes';
import type { ExportDocumentsPayload } from '../domain/pdf/exportDocumentsPayload';
import {
  buildMiseEnDemeureWordHtml,
  downloadWordDocument,
  type MiseEnDemeureLetterInfos,
} from '../domain/word/miseEnDemeureLetter';

function mapToLetterInfos(data: ExportDocumentsPayload): MiseEnDemeureLetterInfos {
  const out: MiseEnDemeureLetterInfos = {};
  if (data.nom?.trim()) out.nomPrenom = data.nom.trim();
  if (data.employeur?.trim()) out.employeur = data.employeur.trim();
  if (data.lieu?.trim()) out.lieu = data.lieu.trim();
  if (data.adresseSalarie?.trim()) out.adresseSalarie = data.adresseSalarie.trim();
  if (data.cpVilleSalarie?.trim()) out.cpVilleSalarie = data.cpVilleSalarie.trim();
  if (data.representant?.trim()) out.representant = data.representant.trim();
  if (data.fonction?.trim()) out.fonction = data.fonction.trim();
  if (data.adresseEmployeur?.trim()) out.adresseEmployeur = data.adresseEmployeur.trim();
  if (data.cpVilleEmployeur?.trim()) out.cpVilleEmployeur = data.cpVilleEmployeur.trim();
  return out;
}

export function useWordGeneration() {
  const generating = ref(false);

  function generateWord(data: ExportDocumentsPayload): void {
    generating.value = true;
    try {
      const arretees = useArreteesStore();
      const periodesSaisies = arretees.periodes
        .filter((p) => p.salaireVerse !== undefined)
        .map((p) => ({
          label: p.label,
          salaireDu: p.salaireDu,
          salaireVerse: p.salaireVerse as number,
        }));
      const { detailsParAnnee, totalArretees } =
        aggregateArreteesParAnneeFromPeriodeLabels(periodesSaisies);
      const html = buildMiseEnDemeureWordHtml(mapToLetterInfos(data), {
        detailsParAnnee,
        totalArretees,
      });
      downloadWordDocument(html, 'mise_en_demeure');
    } finally {
      generating.value = false;
    }
  }

  return { generating, generateWord };
}
