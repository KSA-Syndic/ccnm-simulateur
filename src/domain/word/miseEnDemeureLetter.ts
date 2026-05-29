import { escapeHTML, formatMoney } from '../utils/format';
import type { ArreteesAnneeStub } from '../arretees/aggregateFromPeriodes';

/** Champs attendus par le modèle Word (placeholders si vides). */
export interface MiseEnDemeureLetterInfos {
  nomPrenom?: string;
  adresseSalarie?: string;
  cpVilleSalarie?: string;
  employeur?: string;
  representant?: string;
  fonction?: string;
  adresseEmployeur?: string;
  cpVilleEmployeur?: string;
  /** Ville pour « À X, le … » ; si absent : « Le … » uniquement. */
  lieu?: string;
}

export interface MiseEnDemeureLetterData {
  detailsParAnnee: ArreteesAnneeStub[];
  totalArretees: number;
}

function todayFrLong(): string {
  return new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function buildYearTableHtml(data: MiseEnDemeureLetterData): string {
  const { detailsParAnnee, totalArretees } = data;
  if (detailsParAnnee.length === 0) return '';

  const rows = detailsParAnnee
    .map((a) => {
      const ecartCell = a.ecart > 0 ? `<b>${escapeHTML(formatMoney(a.ecart))}</b>` : '—';
      return `<tr><td>${escapeHTML(String(a.annee))} (${a.nbMoisSaisis} mois)</td><td>${escapeHTML(formatMoney(a.totalDu))}</td><td>${escapeHTML(formatMoney(a.totalReel))}</td><td>${ecartCell}</td></tr>`;
    })
    .join('');

  return `
        <table border="1" cellspacing="0" cellpadding="1" style="border-collapse:collapse;width:100%;font-size:9pt;margin:4pt 0;">
            <tr style="background:#f5f5f5;"><th>Année</th><th>SMH annuel dû</th><th>Total perçu</th><th>Écart</th></tr>
            ${rows}
            <tr style="font-weight:bold;border-top:1.5px solid #333;"><td>TOTAL</td><td></td><td></td><td>${escapeHTML(formatMoney(totalArretees))}</td></tr>
        </table>`;
}

/**
 * Document HTML MS Word (.doc) — structure alignée sur le modèle de lettre de mise en demeure.
 */
export function buildMiseEnDemeureWordHtml(
  infos: MiseEnDemeureLetterInfos,
  data: MiseEnDemeureLetterData,
): string {
  const todayStr = todayFrLong();
  const lieuDate = infos.lieu?.trim()
    ? `À ${escapeHTML(infos.lieu.trim())}, le ${escapeHTML(todayStr)}`
    : `Le ${escapeHTML(todayStr)}`;

  const tableauHTML = buildYearTableHtml(data);

  return `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><style>
    @page { margin: 1.25cm 1.5cm; }
    body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.2; }
    p { margin: 6pt 0; }
    .right { text-align: right; }
    .gray { color: #555; font-size: 9pt; }
    .disclaimer { margin-top: 10pt; padding: 4pt; border: 1px solid #ddd; font-size: 8pt; color: #666; font-style: italic; }
    table th, table td { text-align: left; padding: 1.5pt 3pt; }
</style></head>
<body>
    <p>${escapeHTML(infos.nomPrenom || '« Prénom Nom du salarié »')}<br>
    ${escapeHTML(infos.adresseSalarie || '« Adresse »')}<br>
    ${escapeHTML(infos.cpVilleSalarie || '« Code postal + Ville »')}</p>

    <p class="right">${escapeHTML(infos.employeur || '« Société »')}<br>
    ${escapeHTML(infos.representant || '« Prénom Nom du représentant »')}<br>
    ${escapeHTML(infos.fonction || '« Fonction (DRH, etc.) »')}<br>
    ${escapeHTML(infos.adresseEmployeur || '« Adresse »')}<br>
    ${escapeHTML(infos.cpVilleEmployeur || '« Code postal + Ville »')}</p>

    <p>${lieuDate}</p>

    <p><b>Lettre recommandée avec accusé de réception n° _______________</b></p>

    <p><b>Objet : Demande de régularisation de salaire</b></p>

    <p>Madame, Monsieur,</p>

    <p>Par la présente, je vous signale que ma rémunération n'a pas atteint le Salaire Minimum Hiérarchique (SMH) défini par la Convention Collective Nationale de la Métallurgie (CCNM) pour les périodes suivantes :</p>

    ${tableauHTML}

    <p>Ce manquement constitue une violation de vos obligations conventionnelles (Convention Collective Nationale de la Métallurgie, CCNM, Art. 140).</p>

    <p>Je vous mets donc en demeure de procéder à la régularisation des salaires qui me sont dus dans un délai de 8 jours à compter de la date du présent courrier.</p>

    <p>À défaut, je me verrai dans l'obligation de saisir le Conseil de Prud'hommes pour obtenir régularisation et réparation du préjudice subi.</p>

    <p class="gray">[Facultatif] Je vous informe que copie de ce courrier est transmise à l'inspection du travail, à qui je sollicite par ailleurs l'intervention dans ce dossier.</p>

    <p class="gray">Pièce jointe : Annexe technique — détail des calculs et références conventionnelles.</p>

    <p>Veuillez agréer, Madame, Monsieur, l'expression de ma considération distinguée.</p>

    <p>${escapeHTML(infos.nomPrenom || '« Prénom Nom »')}<br>« Signature »</p>

    <p class="gray">[En cas de courrier remis en main propre] Fait en deux exemplaires.<br>
    « Prénom Nom du représentant de la société » — « Signature »</p>

    <div class="disclaimer">Attention : ce document est généré par un outil indicatif. Les montants sont à vérifier. Ce document ne remplace pas un conseil juridique professionnel.</div>
</body></html>`;
}

export function downloadWordDocument(html: string, basename = 'mise_en_demeure'): void {
  const stamp = new Date().toISOString().split('T')[0];
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${basename}_${stamp}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
