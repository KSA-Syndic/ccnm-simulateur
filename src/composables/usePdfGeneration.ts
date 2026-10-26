import { ref } from 'vue';
import { useArreteesStore } from '../stores/arretees';
import { useSituationStore } from '../stores/situation';
import { useAgreementStore } from '../stores/agreement';
import { useUiStore } from '../stores/ui';
import { computePdfRemunerationBreakdown } from '../domain/remuneration/compute';
import { useWizardRemunerationInput } from './useWizardRemunerationInput';
import { buildPdfArrieresAnalyticsPayload, trackPdfArrieres } from '../infra/analytics';
import { fileDateStamp } from '../domain/utils/date';
import type { ExportDocumentsPayload } from '../domain/pdf/exportDocumentsPayload';
import { importPdfAutoTable } from '../domain/pdf/jsPdfHelpers';
import { renderArreteesAnnex } from '../domain/pdf/arreteesAnnex';

/** Export de l'annexe PDF arriérés : rassemble les données des stores, dessine, enregistre. */
export function usePdfGeneration() {
  const generating = ref(false);
  const wizardInput = useWizardRemunerationInput();

  async function generatePdf(infos: ExportDocumentsPayload) {
    generating.value = true;
    try {
      const [{ jsPDF }, autoTable] = await Promise.all([import('jspdf'), importPdfAutoTable()]);

      const arreteesStore = useArreteesStore();
      const situationStore = useSituationStore();
      const agreementStore = useAgreementStore();
      const uiStore = useUiStore();

      const nbMois = uiStore.nbMoisEffectif;
      const breakdown = computePdfRemunerationBreakdown(wizardInput.value, nbMois);
      const { active, accDoc } = breakdown;

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const { totalArretees } = renderArreteesAnnex(doc, autoTable, {
        infos,
        breakdown,
        nbMois,
        situation: {
          territoireId: situationStore.territoireId,
          pointTerritorial: situationStore.pointTerritorial,
          forfait: situationStore.forfait,
          tempsPartiel: situationStore.tempsPartiel,
          tauxActivite: situationStore.tauxActivite,
          experiencePro: situationStore.experiencePro,
        },
        arretees: {
          dateEmbauche: arreteesStore.dateEmbauche,
          dateRupture: arreteesStore.dateRuptureEffective,
          changementClassification: arreteesStore.changementClassification,
          surSMHSeul: arreteesStore.surSMHSeul,
          periodes: arreteesStore.periodes,
        },
        agreementInputs: agreementStore.inputs,
      });

      doc.save(`arretees-salaire-${fileDateStamp()}.pdf`);

      trackPdfArrieres(
        buildPdfArrieresAnalyticsPayload(arreteesStore.periodes, {
          totalArretees,
          groupe: active.groupe,
          classe: active.classe,
          nbMois,
          accordNomCourt: accDoc ? (accDoc.nomCourt ?? accDoc.nom ?? null) : null,
        }),
      );
    } finally {
      generating.value = false;
    }
  }

  return { generating, generatePdf };
}
