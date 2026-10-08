import { ref } from 'vue';
import { useArreteesStore } from '../stores/arretees';
import { useSituationStore } from '../stores/situation';
import { useAgreementStore } from '../stores/agreement';
import { useUiStore } from '../stores/ui';
import { CONFIG } from '../domain/config';
import { isCadre } from '../domain/classification/engine';
import { getPrimes, type PrimeDef } from '../domain/agreements/interface';
import { computePdfRemunerationBreakdown } from '../domain/remuneration/compute';
import { useWizardRemunerationInput } from './useWizardRemunerationInput';
import { buildPdfArrieresAnalyticsPayload, trackPdfArrieres } from '../infra/analytics';
import { formatMoney } from '../domain/utils/format';
import {
  aggregateArreteesParAnneeFromPeriodeLabels,
  yearOfPeriode,
} from '../domain/arretees/aggregateFromPeriodes';
import { formatFrDecimalFixed } from '../domain/tooltip/builders';
import { getBaremeDebutantTranche } from '../domain/remuneration/smh';
import { getTerritoirePoint } from '../domain/remuneration/pointTerritorial';
import { fileDateStamp, MOIS_LONGS, todayFrLong } from '../domain/utils/date';
import type { ExportDocumentsPayload } from '../domain/pdf/exportDocumentsPayload';
import {
  PDF_MARGIN_MM,
  addPdfFooter,
  checkPdfPageBreak,
  drawPdfAutoTable,
  importPdfAutoTable,
  pdfEcartCell,
  sanitizePdfStandardFontText,
} from '../domain/pdf/jsPdfHelpers';
import { EDITEUR, PDF_RESOURCES_LABELS, CONVENTION_METALLURGIE_URL } from '../domain/ui/labels';

const LEGAL_SNIPPET_INDICATIF =
  'Références indicatives (à contrôler sur les textes en vigueur et le dossier) : CCNM Art. 140 et 141 (SMH) ; Code du travail L. 3245-1 (reclassement des salaires, prescription), L. 2254-2 (nullité des clauses inférieures au minimum).';

function formatFrDateSafe(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-FR');
}

function smhHeaderLines(): string[] {
  const y = CONFIG.SMH_UPDATE.referenceYear;
  const lines = [`${CONFIG.TOOLTIP_TEXTS.origins.ccnm} ${y}`];
  const entry = CONFIG.SMH_UPDATE.years[y as keyof typeof CONFIG.SMH_UPDATE.years] as
    | { effectiveDate?: string; sourceLabel?: string }
    | undefined;
  if (entry?.effectiveDate) {
    const d = new Date(entry.effectiveDate);
    const eff = Number.isNaN(d.getTime()) ? entry.effectiveDate : d.toLocaleDateString('fr-FR');
    const maj = CONFIG.SMH_UPDATE.updatedAt
      ? new Date(CONFIG.SMH_UPDATE.updatedAt).toLocaleDateString('fr-FR')
      : '';
    lines.push(`Grille SMH effet ${eff}${maj ? ` · MAJ application ${maj}` : ''}`);
  }
  if (entry?.sourceLabel) {
    lines.push(String(entry.sourceLabel));
  }
  return lines.map(sanitizePdfStandardFontText);
}

function primePdfActive(inputs: Record<string, unknown>, p: PrimeDef): boolean {
  const v = inputs[p.stateKeyActif];
  return v === true || v === 'true';
}

function inclusSmhPdfLabel(v: boolean | 'ifSuperiorToConvention' | undefined): string {
  if (v === true) return 'oui';
  if (v === false) return 'non';
  return 'selon dossier';
}

function smhGrilleRowLabel(scenario: string, experiencePro: number): string {
  if (scenario !== 'cadre-debutant') return 'SMH annuel grille (base conventionnelle)';
  const tranche = getBaremeDebutantTranche(experiencePro);
  if (tranche === 0) return 'SMH barème débutants (< 2 ans)';
  return `SMH barème débutants (${tranche} à ${tranche + 2} ans)`;
}

function forfaitPdfLabel(forfa: '35h' | 'heures' | 'jours'): string {
  const forfaits = CONFIG.FORFAITS as Record<string, number> | undefined;
  if (forfa === 'heures') {
    const pct = Math.round(((forfaits?.heures ?? 0.15) as number) * 100);
    return `Forfait heures (+${pct} %)`;
  }
  if (forfa === 'jours') {
    const pct = Math.round(((forfaits?.jours ?? 0.3) as number) * 100);
    return `Forfait jours (+${pct} %)`;
  }
  return 'Horaire collectif (35h/sem.)';
}

function yearsFromPeriodes(periodes: { label: string; periodKey?: string }[]): string {
  const years = new Set<number>();
  for (const p of periodes) {
    const y = yearOfPeriode(p);
    if (y !== null) years.add(y);
  }
  return [...years].sort((a, b) => a - b).join(', ') || 'non déterminé';
}

function docWithPageBreak(doc: object, y: number, reserveMm: number): number {
  return checkPdfPageBreak(doc as Parameters<typeof checkPdfPageBreak>[0], y, reserveMm);
}

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

      const br = computePdfRemunerationBreakdown(wizardInput.value, uiStore.nbMois);

      const { active, accDoc } = br;

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const textW = pw - 2 * PDF_MARGIN_MM;
      let y = PDF_MARGIN_MM;

      if (EDITEUR.logoPdfDataUrl.startsWith('data:image/')) {
        try {
          const pdf = doc as {
            addImage: (u: string, fmt: string, x: number, y2: number, w: number, h: number) => void;
          };
          pdf.addImage(
            EDITEUR.logoPdfDataUrl,
            'PNG',
            pw - PDF_MARGIN_MM - 20,
            PDF_MARGIN_MM,
            16,
            16,
          );
        } catch {
          /* data URL PNG invalide ou format non supporté */
        }
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('Annexe — Rappel de salaire / arriérés', pw / 2, y, { align: 'center' });
      y += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text('Détail indicatif des écarts par période (simulateur)', pw / 2, y, {
        align: 'center',
      });
      y += 8;
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      for (const line of smhHeaderLines()) {
        doc.text(line, pw / 2, y, { align: 'center' });
        y += 4;
      }
      doc.setTextColor(60, 60, 60);
      doc.text(`Document établi le ${todayFrLong()}`, PDF_MARGIN_MM, y);
      y += 6;
      doc.setDrawColor(200, 200, 200);
      doc.line(PDF_MARGIN_MM, y, pw - PDF_MARGIN_MM, y);
      y += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('1. Informations du contrat (saisie assistant)', PDF_MARGIN_MM, y);
      y += 7;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      const contractRows: [string, string][] = [];
      if (infos.nom) contractRows.push(['Salarié', sanitizePdfStandardFontText(infos.nom)]);
      if (infos.employeur)
        contractRows.push(['Employeur', sanitizePdfStandardFontText(infos.employeur)]);
      contractRows.push(['Classification', `${active.groupe}${active.classe}`]);
      if (!isCadre(active.classe)) {
        const zone = getTerritoirePoint(situationStore.territoireId);
        contractRows.push([
          'Point territorial',
          sanitizePdfStandardFontText(
            zone
              ? `${zone.nom} (valeur en vigueur à chaque mois)`
              : `Saisie libre : ${formatFrDecimalFixed(situationStore.pointTerritorial)} €`,
          ),
        ]);
      }
      if (arreteesStore.dateEmbauche) {
        const d = new Date(arreteesStore.dateEmbauche);
        const emb = Number.isNaN(d.getTime())
          ? arreteesStore.dateEmbauche
          : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        contractRows.push(["Date d'embauche", emb]);
      }
      if (accDoc) {
        const parts = [accDoc.nomCourt || accDoc.nom];
        if (accDoc.dateEffet) parts.push(`effet ${formatFrDateSafe(accDoc.dateEffet)}`);
        if (accDoc.dateSignature) parts.push(`signé ${formatFrDateSafe(accDoc.dateSignature)}`);
        contractRows.push(["Accord d'entreprise", sanitizePdfStandardFontText(parts.join(' — '))]);
      }

      y =
        drawPdfAutoTable(doc, autoTable, {
          startY: y,
          body: contractRows,
          theme: 'plain',
          styles: { fontSize: 8, cellPadding: 1.2 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 52 } },
          margin: { left: PDF_MARGIN_MM, right: PDF_MARGIN_MM },
        }) + 6;

      const scopeSmhSeul = arreteesStore.surSMHSeul === true;
      const scopeLabel = scopeSmhSeul
        ? 'SMH seul (assiette conventionnelle, Art. 140 CCNM)'
        : 'Rémunération complète (option explicite)';
      const scopeMethodo = scopeSmhSeul
        ? 'Comparaison sur les minima conventionnels (recommandée pour une mise en demeure ciblée sur le SMH).'
        : 'Comparaison élargie au brut déclaré (inclut des éléments hors assiette SMH stricte).';

      y =
        drawPdfAutoTable(doc, autoTable, {
          startY: y,
          body: [
            ['Périmètre retenu', sanitizePdfStandardFontText(scopeLabel)],
            ['Méthodologie associée', sanitizePdfStandardFontText(scopeMethodo)],
            ['Lissage mensuel (réglage assistant)', `${uiStore.nbMois} mois`],
          ],
          theme: 'plain',
          styles: { fontSize: 8, cellPadding: 1.2 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 52 } },
          margin: { left: PDF_MARGIN_MM, right: PDF_MARGIN_MM },
        }) + 8;

      const isCadreCl = isCadre(active.classe);
      const isTp = situationStore.tempsPartiel === true;
      const tauxPct = Math.round(situationStore.tauxActivite * 100) / 100;
      let baseCalc = `Temps plein 35h/sem. (${formatFrDecimalFixed(CONFIG.DUREE_LEGALE_HEURES_MOIS)}h/mois)`;
      if (situationStore.forfait === 'jours')
        baseCalc = `${CONFIG.FORFAIT_JOURS_REFERENCE} jours/an`;
      if (isTp) {
        baseCalc = `${baseCalc} au prorata ${String(tauxPct).replace('.', ',')} %`;
      }

      const refAnnuellePdf = scopeSmhSeul ? br.totalAssietteSmhIndicatif : br.agg.totalAnnual;

      const smhParamRows: [string, string][] = [
        ['Classification', `${active.groupe}${active.classe}${isCadreCl ? ' (cadre)' : ''}`],
        [
          sanitizePdfStandardFontText(
            scopeSmhSeul
              ? 'Référence annuelle (périmètre SMH seul, indicatif)'
              : 'Rémunération annuelle totale (indicatif)',
          ),
          formatMoney(refAnnuellePdf),
        ],
        [smhGrilleRowLabel(br.scenario, situationStore.experiencePro), formatMoney(br.baseSMH)],
        ['Total annuel (tous éléments actifs, moteur)', formatMoney(br.agg.totalAnnual)],
        ['Assiette SMH indicative (base + inclus SMH)', formatMoney(br.totalAssietteSmhIndicatif)],
        ['Type de forfait', sanitizePdfStandardFontText(forfaitPdfLabel(situationStore.forfait))],
        [
          'Temps de travail',
          sanitizePdfStandardFontText(
            isTp ? `Temps partiel (${String(tauxPct).replace('.', ',')} %)` : 'Temps plein (100 %)',
          ),
        ],
        ['Base de calcul (lissage)', sanitizePdfStandardFontText(baseCalc)],
        ['Répartition mensuelle (assistant)', `${uiStore.nbMois} mois`],
        [
          'Inclus SMH (actifs, libellés)',
          sanitizePdfStandardFontText(
            br.inclusSmhLabels.length ? br.inclusSmhLabels.join(', ') : 'base SMH',
          ),
        ],
        [
          'Exclus SMH (actifs, libellés)',
          sanitizePdfStandardFontText(
            br.exclusSmhLabels.length ? br.exclusSmhLabels.join(', ') : 'aucun',
          ),
        ],
      ];

      if (br.scenario === 'cadre-debutant') {
        smhParamRows.splice(1, 0, [
          'Expérience professionnelle',
          `${Number(situationStore.experiencePro) || 0} an(s)`,
        ]);
      }

      y = docWithPageBreak(doc, y, 40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      doc.text('2. Paramètres de calcul (moteur simulateur)', PDF_MARGIN_MM, y);
      y += 6;
      y =
        drawPdfAutoTable(doc, autoTable, {
          startY: y,
          body: smhParamRows,
          theme: 'striped',
          styles: { fontSize: 7.5, cellPadding: 1.5 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 52 } },
          headStyles: { fillColor: [249, 250, 251] },
          margin: { left: PDF_MARGIN_MM, right: PDF_MARGIN_MM },
        }) + 8;

      if (accDoc) {
        y = docWithPageBreak(doc, y, 35);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(55, 65, 81);
        doc.text("Synthèse accord d'entreprise (paramètres)", PDF_MARGIN_MM, y);
        y += 6;
        const accordExtra: [string, string][] = [];
        if (accDoc.syndicatNom || accDoc.syndicatEmail) {
          accordExtra.push([
            'Contact syndical (accord)',
            sanitizePdfStandardFontText(
              [accDoc.syndicatNom, accDoc.syndicatEmail].filter(Boolean).join(' — '),
            ),
          ]);
        }
        if (accDoc.repartition13Mois?.actif) {
          const m = accDoc.repartition13Mois.moisVersement;
          const moisStr = m >= 1 && m <= 12 ? MOIS_LONGS[m - 1] : String(m);
          accordExtra.push([
            '13e mois (accord)',
            sanitizePdfStandardFontText(`actif — versé en ${moisStr}`),
          ]);
        }
        const primes = getPrimes(accDoc);
        const primeBody: [string, string, string, string][] = primes.map((p) => [
          sanitizePdfStandardFontText(p.label),
          primePdfActive(agreementStore.inputs, p) ? 'oui' : 'non',
          inclusSmhPdfLabel(p.inclusDansSMH),
          p.valueType ? sanitizePdfStandardFontText(p.valueType) : '—',
        ]);
        if (accordExtra.length) {
          y =
            drawPdfAutoTable(doc, autoTable, {
              startY: y,
              body: accordExtra,
              theme: 'plain',
              styles: { fontSize: 8, cellPadding: 1.2 },
              columnStyles: { 0: { fontStyle: 'bold', cellWidth: 52 } },
              margin: { left: PDF_MARGIN_MM, right: PDF_MARGIN_MM },
            }) + 4;
        }
        if (primeBody.length > 0) {
          y =
            drawPdfAutoTable(doc, autoTable, {
              startY: y,
              head: [['Prime / élément (accord)', 'Active', 'Incluse SMH', 'Type valeur']],
              body: primeBody,
              theme: 'grid',
              styles: { fontSize: 7 },
              headStyles: { fillColor: [74, 144, 217] },
              margin: { left: PDF_MARGIN_MM, right: PDF_MARGIN_MM },
            }) + 8;
        } else {
          y += 4;
        }
      }

      const yearsLabel = yearsFromPeriodes(arreteesStore.periodes);
      const inclusTxt =
        br.inclusSmhLabels.length > 0
          ? br.inclusSmhLabels.map((s) => s.toLowerCase()).join(', ')
          : 'base SMH';
      const exclusTxt =
        br.exclusSmhLabels.length > 0
          ? br.exclusSmhLabels.map((s) => s.toLowerCase()).join(', ')
          : 'aucun élément hors SMH actif';

      y = docWithPageBreak(doc, y, 45);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      doc.text('3. Méthodologie (rappel)', PDF_MARGIN_MM, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);

      const p1 = scopeSmhSeul
        ? `Principe (Art. 140 CCNM, indicatif) : le SMH s'apprécie notamment sur l'année civile. L'assiette SMH du moteur inclut (éléments actifs) : ${inclusTxt}. Éléments exclus (actifs) : ${exclusTxt}.`
        : `Principe (option complète, indicatif) : comparaison sur la rémunération brute reconstituée par le moteur. Référence assiette SMH (base + inclus) : ${inclusTxt}. Hors assiette (actifs) : ${exclusTxt}.`;

      for (const raw of [
        p1,
        `Jeu de données : grilles SMH et barèmes débutants issus de la configuration simulateur ; années repérées sur la frise : ${yearsLabel}.`,
        `Les montants « dû » par mois sur la frise sont issus du lissage ${uiStore.nbMois} mois appliqué au total annuel du moteur (simplification UI — le calcul juridique exact peut imposer un salaire dû mois par mois).`,
        'Formule documentaire : écart mensuel = salaire dû affiché - salaire versé saisi ; totaux = sommes sur les périodes renseignées.',
      ]) {
        const lines = doc.splitTextToSize(sanitizePdfStandardFontText(raw), textW);
        for (const line of lines) {
          y = docWithPageBreak(doc, y, 8);
          doc.text(line, PDF_MARGIN_MM, y);
          y += 4;
        }
        y += 2;
      }
      y += 2;

      y = docWithPageBreak(doc, y, 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);
      doc.text('4. Références juridiques (indicatif)', PDF_MARGIN_MM, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);
      const legalLines = doc.splitTextToSize(
        sanitizePdfStandardFontText(LEGAL_SNIPPET_INDICATIF),
        textW,
      );
      for (const line of legalLines) {
        y = docWithPageBreak(doc, y, 6);
        doc.text(line, PDF_MARGIN_MM, y);
        y += 4;
      }
      y += 4;

      y = docWithPageBreak(doc, y, 32);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      doc.text(
        sanitizePdfStandardFontText(PDF_RESOURCES_LABELS.pdfResourcesSectionTitle),
        PDF_MARGIN_MM,
        y,
      );
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);

      const resourceRows: [string, string][] = [
        [
          PDF_RESOURCES_LABELS.pdfConventionRowLabel,
          sanitizePdfStandardFontText(CONVENTION_METALLURGIE_URL),
        ],
        [
          PDF_RESOURCES_LABELS.pdfEditeurRowLabel,
          sanitizePdfStandardFontText(`${EDITEUR.nom} — ${EDITEUR.url}`),
        ],
      ];
      if (accDoc?.url?.trim()) {
        resourceRows.push([
          PDF_RESOURCES_LABELS.pdfAccordReferenceRowLabel,
          sanitizePdfStandardFontText(accDoc.url.trim()),
        ]);
      }

      y =
        drawPdfAutoTable(doc, autoTable, {
          startY: y,
          body: resourceRows,
          theme: 'plain',
          styles: { fontSize: 7.5, cellPadding: 1.2 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 58 } },
          margin: { left: PDF_MARGIN_MM, right: PDF_MARGIN_MM },
        }) + 8;

      const periodesRenseignees = arreteesStore.periodes.filter(
        (p) => p.salaireVerse !== undefined,
      );
      // Même agrégat que l'écran et la lettre Word : écart positif par année civile (Art. 140).
      const { detailsParAnnee, totalArretees } =
        aggregateArreteesParAnneeFromPeriodeLabels(periodesRenseignees);
      const totalDu = detailsParAnnee.reduce((sum, r) => sum + r.totalDu, 0);
      const totalVerse = detailsParAnnee.reduce((sum, r) => sum + r.totalReel, 0);

      y = docWithPageBreak(doc, y, 35);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      doc.text('6. Résumé (périodes avec salaire versé renseigné)', PDF_MARGIN_MM, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      y =
        drawPdfAutoTable(doc, autoTable, {
          startY: y,
          body: [
            ['Nombre de périodes', String(periodesRenseignees.length)],
            ['Total salaire dû', formatMoney(totalDu)],
            ['Total salaire versé', formatMoney(totalVerse)],
            ...detailsParAnnee.map((r) => [
              `Arriérés ${r.annee} (${r.nbMoisSaisis} mois)`,
              pdfEcartCell(r.ecart),
            ]),
            [
              'Total arriérés (écarts annuels positifs)',
              pdfEcartCell(totalArretees, { bold: true }),
            ],
          ],
          theme: 'plain',
          styles: { fontSize: 8, cellPadding: 1.2 },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 52 },
            1: { halign: 'right' },
          },
          margin: { left: PDF_MARGIN_MM, right: PDF_MARGIN_MM },
        }) + 8;

      y = docWithPageBreak(doc, y, 25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      doc.text('7. Détail par période', PDF_MARGIN_MM, y);
      y += 6;

      const tableData = periodesRenseignees.map((p) => {
        const ecart = p.salaireDu - (p.salaireVerse ?? 0);
        return [
          sanitizePdfStandardFontText(p.label),
          formatMoney(p.salaireDu),
          formatMoney(p.salaireVerse ?? 0),
          pdfEcartCell(ecart),
        ];
      });

      if (tableData.length > 0) {
        drawPdfAutoTable(doc, autoTable, {
          startY: y,
          head: [['Période', 'Salaire dû', 'Salaire versé', 'Écart']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [74, 144, 217] },
          styles: { fontSize: 8, overflow: 'linebreak' },
          columnStyles: {
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right', cellWidth: 32 },
          },
          margin: { left: PDF_MARGIN_MM, right: PDF_MARGIN_MM },
        });
      } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text('Aucune période avec salaire versé renseigné.', PDF_MARGIN_MM, y);
      }

      addPdfFooter(doc as unknown as Parameters<typeof addPdfFooter>[0]);

      const stamp = fileDateStamp();
      doc.save(`arretees-salaire-${stamp}.pdf`);

      trackPdfArrieres(
        buildPdfArrieresAnalyticsPayload(arreteesStore.periodes, {
          totalArretees: arreteesStore.summary?.totalArretees ?? 0,
          groupe: active.groupe,
          classe: active.classe,
          nbMois: uiStore.nbMois,
          accordNomCourt: accDoc ? (accDoc.nomCourt ?? accDoc.nom ?? null) : null,
        }),
      );
    } finally {
      generating.value = false;
    }
  }

  return { generating, generatePdf };
}
