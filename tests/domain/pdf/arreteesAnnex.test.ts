import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import '@/accords';
import { renderArreteesAnnex, type ArreteesAnnexData } from '@/domain/pdf/arreteesAnnex';
import { importPdfAutoTable } from '@/domain/pdf/jsPdfHelpers';
import { computePdfRemunerationBreakdown } from '@/domain/remuneration/compute';
import { aggregateArreteesParAnneeFromPeriodeLabels } from '@/domain/arretees/aggregateFromPeriodes';
import { baseWizardInput } from '../remuneration/helpers/remunerationTestHelpers';

const periodes = [
  { label: 'janv. 2025', periodKey: '2025-01', salaireDu: 2000, salaireVerse: 1800 },
  { label: 'févr. 2025', periodKey: '2025-02', salaireDu: 2000, salaireVerse: undefined },
  { label: 'mars 2025', periodKey: '2025-03', salaireDu: 2000, salaireVerse: 2100 },
];

function annexData(patch: Partial<ArreteesAnnexData['arretees']> = {}): ArreteesAnnexData {
  const input = baseWizardInput({ classe: 5, groupe: 'C' });
  return {
    infos: { nom: 'Jean Test', employeur: 'ACME' },
    breakdown: computePdfRemunerationBreakdown(input, 12),
    nbMois: 12,
    situation: {
      territoireId: null,
      pointTerritorial: 5.9,
      forfait: '35h',
      tempsPartiel: false,
      tauxActivite: 100,
      experiencePro: 0,
    },
    arretees: {
      dateEmbauche: '2025-01-01',
      dateRupture: null,
      changementClassification: null,
      surSMHSeul: true,
      periodes,
      ...patch,
    },
    agreementInputs: {},
  };
}

async function rendre(data: ArreteesAnnexData) {
  const autoTable = await importPdfAutoTable();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const result = renderArreteesAnnex(doc, autoTable, data);
  return { result, texte: doc.output() };
}

describe('renderArreteesAnnex', () => {
  it('dessine toutes les sections et retourne le total imprimé', async () => {
    const { result, texte } = await rendre(annexData());
    for (const titre of [
      'Annexe',
      '1. Informations du contrat',
      '2. Param',
      '3. M',
      '4. R',
      '6. R',
      '7. D',
      'Jean Test',
      'Page 1 / ',
    ]) {
      expect(texte).toContain(titre);
    }
    const attendu = aggregateArreteesParAnneeFromPeriodeLabels(periodes).totalArretees;
    expect(result.totalArretees).toBe(attendu);
    expect(attendu).toBeGreaterThan(0);
  });

  it('mentionne rupture et changement de classification quand ils sont renseignés', async () => {
    const { texte } = await rendre(
      annexData({
        dateRupture: '2025-03-14',
        changementClassification: { date: '2025-02-01', groupe: 'B', classe: 3 },
      }),
    );
    expect(texte).toContain('Date de rupture du contrat');
    expect(texte).toContain('Changement de classification');
    expect(texte).toContain('B3 -> C5');
  });

  it('sans salaire saisi : tableau remplacé par une mention', async () => {
    const { result, texte } = await rendre(
      annexData({ periodes: periodes.map((p) => ({ ...p, salaireVerse: undefined })) }),
    );
    expect(result.totalArretees).toBe(0);
    expect(texte).toContain('Aucune p');
  });
});
