/**
 * ============================================
 * PDF GENERATOR - Génération documents arriérés
 * ============================================
 * 
 * Documents générés :
 * 1. Lettre de mise en demeure — Word (.doc) éditable
 * 2. Annexe technique — PDF (jsPDF + autoTable)
 * 
 * La comparaison s'effectue par année civile (Art. 140 CCNM).
 */

import { calculateAnnualRemuneration, getMontantAnnuelSMHSeul } from '../remuneration/RemunerationCalculator.js';
import { formatMoneyPDF } from '../utils/formatters.js';
import { getActiveClassification } from '../classification/ClassificationEngine.js';
import { state as defaultState } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { getActiveAgreement } from '../agreements/AgreementLoader.js';
import { getPrimes } from '../agreements/AgreementInterface.js';

// ═══════════════════════════════════════════════════════════════
// Utilitaires communs
// ═══════════════════════════════════════════════════════════════

function getJsPDF() {
    return (typeof window !== 'undefined' && window.jsPDF) ||
        (window.jspdf && (window.jspdf.jsPDF || window.jspdf.default?.jsPDF));
}

const MARGIN = 20;
const DISCLAIMER = 'Document indicatif généré automatiquement — ne remplace pas un conseil juridique professionnel.';

function addFooter(doc) {
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(140, 140, 140);
        doc.text(DISCLAIMER, pw / 2, ph - 14, { align: 'center' });
        doc.text(`Page ${i} / ${total}`, pw / 2, ph - 8, { align: 'center' });
    }
}

function wrappedText(doc, text, x, y, maxWidth, lh = 5) {
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach(l => { doc.text(l, x, y); y += lh; });
    return y;
}

function checkPageBreak(doc, y, space = 20) {
    if (y + space > doc.internal.pageSize.getHeight() - 25) {
        doc.addPage();
        return MARGIN;
    }
    return y;
}

function getStateInput(state, key) {
    if (!state) return undefined;
    if (state.accordInputs && Object.prototype.hasOwnProperty.call(state.accordInputs, key)) {
        return state.accordInputs[key];
    }
    return state[key];
}

function getPrimeEquipeModaliteLabel(state, agreement) {
    const actifRaw = getStateInput(state, 'travailEquipe');
    const actif = actifRaw === true || actifRaw === 'true';
    if (!actif) return null;
    const primeAccord = agreement?.primes?.find(p => p.id === 'primeEquipe');
    if (primeAccord) {
        const taux = primeAccord.valeurAccord != null ? String(primeAccord.valeurAccord).replace('.', ',') : '?';
        return `Prime d'équipe ${agreement?.nomCourt || 'accord'} (base horaire auto 151,67h × ${taux} €/h)`;
    }
    const postes = Number(CONFIG.PRIME_EQUIPE_POSTES_MENSUELS_DEFAUT ?? 22);
    return `Prime d'équipe CCN (base auto ${String(postes).replace('.', ',')} postes/mois × 30 min du SMH horaire de base)`;
}

function formatAgreementRawValue(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'function') return '[function]';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function flattenAgreementToRows(agreement) {
    const rows = [];
    const walk = (path, value) => {
        if (value === undefined) return;
        const isPrimitive = value === null || ['string', 'number', 'boolean', 'function'].includes(typeof value);
        if (isPrimitive) {
            rows.push([path || '(racine)', formatAgreementRawValue(value)]);
            return;
        }
        if (Array.isArray(value)) {
            if (value.length === 0) {
                rows.push([path, '[]']);
                return;
            }
            value.forEach((item, idx) => walk(`${path}[${idx}]`, item));
            return;
        }
        const keys = Object.keys(value);
        if (keys.length === 0) {
            rows.push([path, '{}']);
            return;
        }
        keys.forEach((key) => {
            const nextPath = path ? `${path}.${key}` : key;
            walk(nextPath, value[key]);
        });
    };
    walk('', agreement);
    return rows;
}

// Style commun pour autoTable — compact pour tenir en ~1 page
const TABLE_STYLES = {
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [200, 200, 200], lineWidth: 0.2, overflow: 'linebreak' },
    headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold', fontSize: 7.5, cellPadding: 2 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: 'auto'
};

function addAutoTable(doc, config) {
    if (typeof doc.autoTable === 'function') {
        doc.autoTable(config);
        return doc.lastAutoTable?.finalY ?? (config.startY || MARGIN);
    }
    // Fallback test/runtime léger quand le plugin autoTable n'est pas disponible.
    const rows = (Array.isArray(config?.head) ? config.head.length : 0) + (Array.isArray(config?.body) ? config.body.length : 0);
    const estimatedEndY = (config.startY || MARGIN) + Math.max(8, rows * 4);
    doc.lastAutoTable = { finalY: estimatedEndY };
    return estimatedEndY;
}

// ═══════════════════════════════════════════════════════════════
// PDF 1 : LETTRE DE MISE EN DEMEURE (conservée pour référence mais non téléchargée)
// ═══════════════════════════════════════════════════════════════

export function genererPDFLettreMiseEnDemeure(data, infos = {}, stateParam = null) {
    const jsPDF = getJsPDF();
    if (!jsPDF) throw new Error('Bibliothèque PDF non chargée');

    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const cw = pw - MARGIN * 2;
    let y = MARGIN;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);

    // Expéditeur
    [infos.nomPrenom || '« Prénom Nom du salarié »', infos.adresseSalarie || '« Adresse »', infos.cpVilleSalarie || '« Code postal + Ville »']
        .forEach(l => { doc.text(l, MARGIN, y); y += 5; });
    y += 5;

    // Destinataire (droite)
    const dx = pw / 2 + 10;
    [infos.employeur || '« Société »', infos.representant || '« Prénom Nom du représentant »', infos.fonction || '« Fonction »', infos.adresseEmployeur || '« Adresse »', infos.cpVilleEmployeur || '« Code postal + Ville »']
        .forEach(l => { doc.text(l, dx, y); y += 5; });
    y += 10;

    const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(infos.lieu ? `À ${infos.lieu}, le ${todayStr}` : `Le ${todayStr}`, MARGIN, y); y += 10;
    doc.setFont(undefined, 'bold');
    doc.text('Lettre recommandée avec accusé de réception n° _______________', MARGIN, y); y += 10;
    doc.text('Objet : Demande de régularisation de salaire', MARGIN, y); y += 10;
    doc.setFont(undefined, 'normal');
    doc.text('Madame, Monsieur,', MARGIN, y); y += 8;

    y = wrappedText(doc, 'Par la présente, je vous signale que ma rémunération n\'a pas atteint le Salaire Minimum Hiérarchique (SMH) défini par la Convention Collective Nationale de la Métallurgie (IDCC 3248) pour les périodes suivantes :', MARGIN, y, cw);
    y += 5;

    // Tableau par année (autoTable)
    const annees = data.detailsParAnnee || [];
    if (annees.length > 0) {
        const body = annees.map(a => [
            `${a.annee} (${a.nbMoisSaisis} mois)`,
            formatMoneyPDF(a.totalDu),
            formatMoneyPDF(a.totalReel),
            a.ecart > 0 ? formatMoneyPDF(a.ecart) : '—'
        ]);
        body.push([{ content: 'TOTAL', styles: { fontStyle: 'bold' } }, '', '', { content: formatMoneyPDF(data.totalArretees), styles: { fontStyle: 'bold' } }]);

        addAutoTable(doc, {
            startY: y,
            head: [['Année', 'SMH annuel dû', 'Total perçu', 'Écart']],
            body,
            ...TABLE_STYLES,
            columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 35 }, 2: { cellWidth: 35 }, 3: { cellWidth: 30, fontStyle: 'bold' } }
        });
        y = (doc.lastAutoTable?.finalY ?? y) + 8;
    }

    y = checkPageBreak(doc, y, 40);
    y = wrappedText(doc, 'Ce manquement constitue une violation de vos obligations conventionnelles (Convention Collective Nationale de la Métallurgie, IDCC 3248, Art. 140).', MARGIN, y, cw); y += 3;
    y = wrappedText(doc, 'Je vous mets donc en demeure de procéder à la régularisation des salaires qui me sont dus dans un délai de 8 jours à compter de la date du présent courrier.', MARGIN, y, cw); y += 3;
    y = wrappedText(doc, 'À défaut, je me verrai dans l\'obligation de saisir le Conseil de Prud\'hommes pour obtenir régularisation et réparation du préjudice subi.', MARGIN, y, cw); y += 5;

    doc.setTextColor(100, 100, 100); doc.setFontSize(9);
    y = wrappedText(doc, '[Facultatif] Je vous informe que copie de ce courrier est transmise à l\'inspection du travail.', MARGIN, y, cw); y += 5;
    y = wrappedText(doc, 'Pièce jointe : Annexe technique — détail des calculs et références conventionnelles.', MARGIN, y, cw); y += 8;
    doc.setTextColor(0, 0, 0); doc.setFontSize(10);

    y = checkPageBreak(doc, y, 20);
    doc.text('Veuillez agréer, Madame, Monsieur, l\'expression de ma considération distinguée.', MARGIN, y); y += 15;
    doc.text(infos.nomPrenom || '« Prénom Nom »', MARGIN, y); y += 5;
    doc.text('« Signature »', MARGIN, y); y += 10;
    doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    y = wrappedText(doc, '[En cas de courrier remis en main propre] Fait en deux exemplaires.', MARGIN, y, cw); y += 3;
    wrappedText(doc, '« Prénom Nom du représentant de la société » — « Signature »', MARGIN, y, cw);

    addFooter(doc);
    return doc;
}

// ═══════════════════════════════════════════════════════════════
// PDF 2 : ANNEXE TECHNIQUE (jsPDF + autoTable)
// ═══════════════════════════════════════════════════════════════

export function genererPDFAnnexeTechnique(data, infos = {}, stateParam = null) {
    const jsPDF = getJsPDF();
    if (!jsPDF) throw new Error('Bibliothèque PDF non chargée');

    const state = stateParam || defaultState;
    const hasAccord = !!(state.accordActif || state.accordId);
    const referenceDate = data?.dateFin ? new Date(data.dateFin) : new Date();
    const agreement = hasAccord ? getActiveAgreement() : null;
    const salaireDu = getMontantAnnuelSMHSeul(state, agreement, { date: referenceDate });

    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const cw = pw - MARGIN * 2;
    let y = MARGIN;

    // ─── En-tête ───
    doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 30, 30);
    doc.text('Annexe technique', pw / 2, y, { align: 'center' }); y += 6;
    doc.setFontSize(11); doc.setFont(undefined, 'normal'); doc.setTextColor(80, 80, 80);
    doc.text('Détail du calcul des arriérés de salaire', pw / 2, y, { align: 'center' }); y += 5;
    const smhUpdate = CONFIG?.SMH_UPDATE || {};
    const smhYear = smhUpdate.referenceYear || 'en vigueur';
    const smhYearEntries = smhUpdate?.years && typeof smhUpdate.years === 'object'
        ? Object.entries(smhUpdate.years)
            .map(([year, info]) => ({ year: Number(year), ...(info || {}) }))
            .filter(entry => Number.isFinite(entry.year))
            .sort((a, b) => a.year - b.year)
        : [];
    const smhYearRef = smhYearEntries.find(entry => entry.year === smhYear) || smhYearEntries[smhYearEntries.length - 1];
    const smhEffet = smhYearRef?.effectiveDate ? new Date(smhYearRef.effectiveDate).toLocaleDateString('fr-FR') : null;
    const smhMajDate = smhUpdate.updatedAt ? new Date(smhUpdate.updatedAt).toLocaleDateString('fr-FR') : null;
    doc.setFontSize(9);
    doc.text(`Convention Collective Nationale de la Métallurgie (CCNM) ${smhYear} — IDCC 3248`, pw / 2, y, { align: 'center' }); y += 5;
    if (smhEffet || smhMajDate) {
        const infoMaj = `Grille SMH effet ${smhEffet || '—'} · MAJ application ${smhMajDate || '—'}`;
        doc.text(infoMaj, pw / 2, y, { align: 'center' }); y += 5;
    }
    if (smhYearRef?.sourceLabel) {
        doc.text(String(smhYearRef.sourceLabel), pw / 2, y, { align: 'center' }); y += 6;
    } else {
        y += 1;
    }
    doc.setTextColor(0, 0, 0);
    const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`Document établi le ${todayStr}`, MARGIN, y); y += 4;
    doc.setDrawColor(200, 200, 200); doc.line(MARGIN, y, pw - MARGIN, y); y += 10;

    // ═══════════════════════════════════════
    // Section 1 : Informations du contrat
    // ═══════════════════════════════════════
    doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(55, 65, 81);
    doc.text('1. Informations du contrat', MARGIN, y); y += 8;
    doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(0, 0, 0);

    const classInfo = getActiveClassification(state);
    const remunerationFull = calculateAnnualRemuneration(state, agreement, { mode: 'full', date: referenceDate });
    const remunerationSmh = calculateAnnualRemuneration(state, agreement, { mode: 'smh-only', date: referenceDate });

    // ── Tableau identité / contrat ──
    const contractRows = [];
    if (infos.nomPrenom) contractRows.push(['Salarié', infos.nomPrenom]);
    if (infos.poste) contractRows.push(['Poste', infos.poste]);
    if (infos.employeur) contractRows.push(['Employeur', infos.employeur]);
    if (infos.matricule) contractRows.push(['Matricule', infos.matricule]);
    if (data.dateEmbauche) contractRows.push(['Date d\'embauche', new Date(data.dateEmbauche).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })]);
    if (data.dateChangementClassification) contractRows.push(['Changement de classification', new Date(data.dateChangementClassification).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })]);
    if (data.ruptureContrat && data.dateRuptureInput) {
        contractRows.push(['Rupture du contrat', new Date(data.dateRuptureInput).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })]);
    } else {
        contractRows.push(['Statut du contrat', 'En cours']);
    }
    if (hasAccord && agreement) {
        contractRows.push(['Accord d\'entreprise', `${agreement.nomCourt || agreement.nom} (${agreement.dateSignature || ''})`]);
    }

    if (contractRows.length > 0) {
        addAutoTable(doc, {
            startY: y,
            body: contractRows,
            theme: 'plain',
            styles: { fontSize: 8, cellPadding: 1.2 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 52 } },
            margin: { left: MARGIN, right: MARGIN }
        });
        y = (doc.lastAutoTable?.finalY ?? y) + 6;
    }

    // ── Tableau paramètres de calcul du SMH ──
    y = checkPageBreak(doc, y, 30);
    doc.setFont(undefined, 'bold'); doc.setFontSize(9);
    doc.text('Paramètres de calcul du SMH :', MARGIN, y); y += 5;
    doc.setFont(undefined, 'normal');

    const isCadreDebutant = (classInfo.classe === 11 || classInfo.classe === 12) && state.experiencePro < 6;
    const isCadre = classInfo.classe >= 9;

    // Forfait & base de calcul
    const isForfaitJours = state.forfait === 'jours';
    const isForfaitHeures = state.forfait === 'heures';
    const isTempsPartiel = state.travailTempsPartiel === true;
    const tauxActivitePct = isTempsPartiel
        ? Math.round((Number(state.tauxActivite) || (CONFIG.TAUX_ACTIVITE_DEFAUT ?? 100)) * 100) / 100
        : 100;
    let forfaitLabel = 'Horaire collectif (35h/sem.)';
    let baseLabel = 'Temps plein 35h/sem. (151,67h/mois)';
    if (isForfaitHeures) {
        forfaitLabel = 'Forfait heures (+15 %)';
        baseLabel = 'Temps plein 35h/sem. (151,67h/mois)';
    } else if (isForfaitJours) {
        forfaitLabel = 'Forfait jours (+30 %)';
        baseLabel = '218 jours/an';
    }

    // SMH label
    let smhLabel = 'SMH annuel grille';
    if (isCadreDebutant) {
        let t = '< 2 ans';
        if (state.experiencePro >= 4) t = '4 à 6 ans';
        else if (state.experiencePro >= 2) t = '2 à 4 ans';
        smhLabel = `SMH barème débutants (${t})`;
    }

    const smhRows = [];
    smhRows.push(['Classification', `${classInfo.groupe}${classInfo.classe}${isCadre ? ' (cadre)' : ''}`]);
    smhRows.push([smhLabel, formatMoneyPDF(salaireDu)]);
    smhRows.push(['Type de forfait', forfaitLabel]);
    smhRows.push(['Temps de travail', isTempsPartiel ? `Temps partiel (${String(tauxActivitePct).replace('.', ',')}%)` : 'Temps plein (100%)']);
    if (isTempsPartiel) {
        baseLabel = `${baseLabel} au prorata ${String(tauxActivitePct).replace('.', ',')}%`;
    }
    smhRows.push(['Base de calcul', baseLabel]);
    smhRows.push(['Répartition mensuelle', `${state.nbMois ?? 12} mois`]);
    if (isCadreDebutant) {
        smhRows.push(['Expérience professionnelle', `${state.experiencePro ?? 0} an(s)`]);
    }

    // Éléments inclus dans le SMH (dynamiques)
    const agrPrimes = agreement ? getPrimes(agreement) : [];
    const primesSmh = agrPrimes.filter(p => p.inclusDansSMH === true);
    const inclusSmhDyn = [];
    const exclusSmhDyn = [];
    const addUnique = (arr, label) => {
        if (!label || arr.includes(label)) return;
        arr.push(label);
    };
    remunerationSmh.details
        .filter(d => !d.isBase)
        .forEach(d => addUnique(inclusSmhDyn, d.label));
    remunerationFull.details
        .filter(d => !d.isBase && d.isPositive && d.isSMHIncluded !== true)
        .forEach(d => addUnique(exclusSmhDyn, d.label));
    if (primesSmh.length > 0) {
        const moisNoms = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
        primesSmh.forEach(p => {
            const moisStr = p.moisVersement ? ` (${moisNoms[p.moisVersement - 1]})` : '';
            const valStr = p.valeurAccord != null ? `${p.valeurAccord} ${p.unit}` : '';
            smhRows.push([`Incluse SMH : ${p.label}${moisStr}`, valStr]);
        });
    }
    if (agreement?.repartition13Mois?.actif) {
        const moisNoms13 = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
        const mois13 = agreement.repartition13Mois.moisVersement;
        smhRows.push(['Inclus SMH : 13e mois', mois13 ? `versé en ${moisNoms13[mois13 - 1]}` : 'oui']);
    }
    const inclusSmhLabel = inclusSmhDyn.length > 0 ? inclusSmhDyn.join(', ') : 'base SMH';
    const exclusSmhLabel = exclusSmhDyn.length > 0 ? exclusSmhDyn.join(', ') : 'aucun';
    smhRows.push(['Inclus SMH (actifs)', inclusSmhLabel]);
    smhRows.push(['Exclus du SMH (actifs)', exclusSmhLabel]);
    smhRows.push(['Lecture', 'Le SMH correspond à la base SMH + éléments inclus actifs. Les éléments exclus s’ajoutent au-dessus du minimum.']);

    addAutoTable(doc, {
        startY: y,
        body: smhRows,
        theme: 'striped',
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 52 } },
        headStyles: { fillColor: [249, 250, 251] },
        margin: { left: MARGIN, right: MARGIN }
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 4;

    if (infos.observations) {
        doc.setFontSize(9); doc.setFont(undefined, 'bold');
        doc.text('Observations :', MARGIN, y); y += 5;
        doc.setFont(undefined, 'normal');
        y = wrappedText(doc, infos.observations, MARGIN, y, cw);
    }
    y += 8;

    // ═══════════════════════════════════════
    // Section 2 : Méthodologie
    // ═══════════════════════════════════════
    y = checkPageBreak(doc, y, 50);
    doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(55, 65, 81);
    doc.text('2. Méthodologie de calcul', MARGIN, y); y += 8;
    doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(0, 0, 0);

    const moisNomsLongs = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const incluesStr = inclusSmhDyn.length > 0
        ? inclusSmhDyn.map(v => String(v).toLowerCase()).join(', ')
        : 'base SMH';
    const exclusStr = exclusSmhDyn.length > 0
        ? exclusSmhDyn.map(v => String(v).toLowerCase())
        : [];
    const primeEquipeMethodo = getPrimeEquipeModaliteLabel(state, agreement);
    if (primeEquipeMethodo && !exclusStr.includes(primeEquipeMethodo.toLowerCase())) {
        exclusStr.push(`${primeEquipeMethodo.toLowerCase()} (active)`);
    }
    const exclusTxt = exclusStr.length > 0 ? exclusStr.join(', ') : 'aucun élément hors SMH actif';

    y = wrappedText(doc, `Principe (Art. 140 CCNM) : Le SMH s'apprécie sur l'année civile. L'assiette SMH inclut (actifs) : ${incluesStr}. Éléments exclus (actifs) : ${exclusTxt}.`, MARGIN, y, cw);
    y += 4;
    doc.setFont(undefined, 'bold');
    y = wrappedText(doc, 'Formule : Arriérés(année) = max(0 ; total SMH dû - total perçu).', MARGIN, y, cw);
    doc.setFont(undefined, 'italic');
    y = wrappedText(doc, 'Total = somme par année civile.', MARGIN + 5, y, cw - 5); // Décalage de 5 pour indenter légèrement
    doc.setFont(undefined, 'normal');
    y += 4;

    if (hasAccord && agreement) {
        const moisVers13e = agreement.repartition13Mois?.moisVersement;
        const mois13eStr = moisVers13e ? moisNomsLongs[moisVers13e - 1] : 'selon accord';
        const exempleMois = primesSmh.filter(p => p.moisVersement).map(p => `${p.label.toLowerCase()} en ${moisNomsLongs[p.moisVersement - 1]}`).join(', ');
        const exempleStr = exempleMois ? ` Primes incluses versées dans leur mois (${exempleMois}).` : '';
        y = wrappedText(doc, `Distribution mensuelle : répartition 12/13 mois (13e mois en ${mois13eStr}).${exempleStr}`, MARGIN, y, cw);
    } else {
        y = wrappedText(doc, 'Distribution mensuelle : répartition 12 mois.', MARGIN, y, cw);
    }
    y += 10;

    // ═══════════════════════════════════════
    // Section 3 : Résumé par année civile
    // ═══════════════════════════════════════
    const annees = data.detailsParAnnee || [];
    if (annees.length > 0) {
        y = checkPageBreak(doc, y, 30);
        doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(55, 65, 81);
        doc.text('3. Résumé par année civile', MARGIN, y); y += 8;
        doc.setTextColor(0, 0, 0);

        const body = annees.map(a => [
            `${a.annee} (${a.nbMoisSaisis} mois)`,
            formatMoneyPDF(a.totalDu),
            formatMoneyPDF(a.totalReel),
            a.ecart > 0 ? formatMoneyPDF(a.ecart) : 'Conforme'
        ]);
        body.push([
            { content: 'TOTAL ARRIÉRÉS', styles: { fontStyle: 'bold' } },
            '', '',
            { content: formatMoneyPDF(data.totalArretees), styles: { fontStyle: 'bold', textColor: [9, 105, 218] } }
        ]);

        addAutoTable(doc, {
            startY: y,
            head: [['Année', 'SMH annuel dû', 'Total perçu', 'Écart (arriérés)']],
            body,
            ...TABLE_STYLES,
            columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 35 }, 2: { cellWidth: 35 }, 3: { cellWidth: 35 } }
        });
        y = (doc.lastAutoTable?.finalY ?? y) + 8;
    }

    // ═══════════════════════════════════════
    // Section 4 : Détail mois par mois
    // ═══════════════════════════════════════
    const detailsMois = data.detailsTousMois || data.detailsArretees || [];
    if (detailsMois.length > 0) {
        y = checkPageBreak(doc, y, 30);
        doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(55, 65, 81);
        doc.text('4. Détail mois par mois (informatif)', MARGIN, y); y += 3;
        doc.setFontSize(8); doc.setFont(undefined, 'italic'); doc.setTextColor(100, 100, 100);
        y = wrappedText(doc, 'Ce détail est fourni à titre de transparence. La comparaison effective s\'effectue par année civile (section 3).', MARGIN, y, cw);
        doc.setFont(undefined, 'normal'); doc.setTextColor(0, 0, 0);
        y += 2;

        const body = detailsMois.map(d => [
            d.periode,
            formatMoneyPDF(d.salaireMensuelReel),
            formatMoneyPDF(d.salaireMensuelDu),
            d.difference > 0 ? { content: `- ${formatMoneyPDF(d.difference)}`, styles: { textColor: [200, 50, 50] } } : { content: 'OK', styles: { textColor: [50, 150, 50] } }
        ]);

        addAutoTable(doc, {
            startY: y,
            head: [['Période', 'Perçu', 'Dû', 'Écart']],
            body,
            ...TABLE_STYLES,
            styles: { ...TABLE_STYLES.styles, fontSize: 7 },
            columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 28 }, 2: { cellWidth: 28 }, 3: { cellWidth: 28 } }
        });
        y = (doc.lastAutoTable?.finalY ?? y) + 8;
    }

    // ═══════════════════════════════════════
    // Section 5 : Accord d'entreprise
    // ═══════════════════════════════════════
    if (hasAccord && agreement) {
        y = checkPageBreak(doc, y, 40);
        doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(55, 65, 81);
        doc.text(`5. Accord d'entreprise (${agreement.nomCourt})`, MARGIN, y); y += 8;
        doc.setTextColor(0, 0, 0);
        const accordRows = flattenAgreementToRows(agreement);
        if (accordRows.length > 0) {
            addAutoTable(doc, {
                startY: y,
                head: [['Champ accord', 'Valeur brute']],
                body: accordRows,
                ...TABLE_STYLES,
                styles: { ...TABLE_STYLES.styles, fontSize: 7 },
                columnStyles: { 0: { cellWidth: 62 }, 1: { cellWidth: 88 } }
            });
            y = (doc.lastAutoTable?.finalY ?? y) + 4;
        } else {
            y = wrappedText(doc, 'Aucune donnée exploitable trouvée dans l’accord actif.', MARGIN, y, cw);
        }
        y += 10;
    }

    // ═══════════════════════════════════════
    // Section 6 : Références juridiques
    // ═══════════════════════════════════════
    const refNum = hasAccord ? '6' : '5';
    y = checkPageBreak(doc, y, 30);
    doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(55, 65, 81);
    doc.text(`${refNum}. Références juridiques`, MARGIN, y); y += 8;
    doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(0, 0, 0);

    const refs = [
        'CCN Métallurgie (IDCC 3248), Art. 140 — Salaires minima hiérarchiques, assiette et périodicité annuelle.',
        'CCN Métallurgie (IDCC 3248), Art. 141 — Forfaits cadres (heures / jours).',
        'Code du travail, Art. L.3121-58 et s. — Conventions de forfait en jours et en heures.',
        'Code du travail, Art. L.3245-1 — Prescription triennale des salaires.',
        'Code du travail, Art. L.2254-2 — Principe de faveur.'
    ];
    const yearlyRates = smhYearEntries.filter(entry => Number.isFinite(entry?.indicativeRate));
    if (yearlyRates.length > 0) {
        const rates = yearlyRates
            .map(entry => `${entry.year}: ${Math.round(Number(entry.indicativeRate) * 10000) / 100}%`)
            .join(' | ');
        refs.push(`Revalorisations SMH annuelles (informatif): ${rates}. Les calculs utilisent les grilles annuelles, pas ces pourcentages.`);
    }
    if (smhYearEntries.length > 0) {
        const histo = smhYearEntries
            .map(entry => `${entry.year}: ${entry.change || ''}`)
            .join(' | ');
        refs.push(`Historique revalorisation SMH intégré: ${histo}.`);
    }
    if (smhYearRef?.sourceLabel || smhYearRef?.sourceUrl) {
        refs.push(`Source grille SMH ${smhYearRef?.year || ''}: ${smhYearRef?.sourceLabel || 'Mise à jour interne'}${smhYearRef?.sourceUrl ? ` (${smhYearRef.sourceUrl})` : ''}.`);
    }
    if (hasAccord && agreement) {
        const accordNom = agreement.nomCourt || agreement.nom || agreement.id || 'sans nom';
        const accordUrl = agreement.url ? ` (${agreement.url})` : '';
        refs.push(`Accord d'entreprise appliqué: ${accordNom}${accordUrl}.`);
    }
    refs.forEach(ref => {
        y = checkPageBreak(doc, y, 10);
        y = wrappedText(doc, `• ${ref}`, MARGIN, y, cw); y += 2;
    });

    addFooter(doc);
    return doc;
}

// ═══════════════════════════════════════════════════════════════
// WORD : LETTRE DE MISE EN DEMEURE (.doc éditable)
// ═══════════════════════════════════════════════════════════════

export function genererWordLettreMiseEnDemeure(data, infos = {}) {
    const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const lieuDate = infos.lieu ? `À ${infos.lieu}, le ${todayStr}` : `Le ${todayStr}`;

    const annees = data.detailsParAnnee || [];
    let tableauHTML = '';
    
    if (annees.length > 0) {
        const rows = annees.map(a => {
            const ecartCell = a.ecart > 0 ? `<b>${formatMoneyPDF(a.ecart)}</b>` : '—';
            return `<tr><td>${a.annee} (${a.nbMoisSaisis} mois)</td><td>${formatMoneyPDF(a.totalDu)}</td><td>${formatMoneyPDF(a.totalReel)}</td><td>${ecartCell}</td></tr>`;
        }).join('');
        
        tableauHTML = `
        <table border="1" cellspacing="0" cellpadding="1" style="border-collapse:collapse;width:100%;font-size:9pt;margin:4pt 0;">
            <tr style="background:#f5f5f5;"><th>Année</th><th>SMH annuel dû</th><th>Total perçu</th><th>Écart</th></tr>
            ${rows}
            <tr style="font-weight:bold;border-top:1.5px solid #333;"><td>TOTAL</td><td></td><td></td><td>${formatMoneyPDF(data.totalArretees)}</td></tr>
        </table>`;
    }

    // Attention : on utilise bien des backticks (`) ci-dessous pour ouvrir la chaîne HTML
    const html = `
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
    <p>${esc(infos.nomPrenom || '« Prénom Nom du salarié »')}<br>
    ${esc(infos.adresseSalarie || '« Adresse »')}<br>
    ${esc(infos.cpVilleSalarie || '« Code postal + Ville »')}</p>

    <p class="right">${esc(infos.employeur || '« Société »')}<br>
    ${esc(infos.representant || '« Prénom Nom du représentant »')}<br>
    ${esc(infos.fonction || '« Fonction (DRH, etc.) »')}<br>
    ${esc(infos.adresseEmployeur || '« Adresse »')}<br>
    ${esc(infos.cpVilleEmployeur || '« Code postal + Ville »')}</p>

    <p>${esc(lieuDate)}</p>

    <p><b>Lettre recommandée avec accusé de réception n° _______________</b></p>

    <p><b>Objet : Demande de régularisation de salaire</b></p>

    <p>Madame, Monsieur,</p>

    <p>Par la présente, je vous signale que ma rémunération n'a pas atteint le Salaire Minimum Hiérarchique (SMH) défini par la Convention Collective Nationale de la Métallurgie (IDCC 3248) pour les périodes suivantes :</p>

    ${tableauHTML}

    <p>Ce manquement constitue une violation de vos obligations conventionnelles (Convention Collective Nationale de la Métallurgie, IDCC 3248, Art. 140).</p>

    <p>Je vous mets donc en demeure de procéder à la régularisation des salaires qui me sont dus dans un délai de 8 jours à compter de la date du présent courrier.</p>

    <p>À défaut, je me verrai dans l'obligation de saisir le Conseil de Prud'hommes pour obtenir régularisation et réparation du préjudice subi.</p>

    <p class="gray">[Facultatif] Je vous informe que copie de ce courrier est transmise à l'inspection du travail, à qui je sollicite par ailleurs l'intervention dans ce dossier.</p>

    <p class="gray">Pièce jointe : Annexe technique — détail des calculs et références conventionnelles.</p>

    <p>Veuillez agréer, Madame, Monsieur, l'expression de ma considération distinguée.</p>

    <p>${esc(infos.nomPrenom || '« Prénom Nom »')}<br>« Signature »</p>

    <p class="gray">[En cas de courrier remis en main propre] Fait en deux exemplaires.<br>
    « Prénom Nom du représentant de la société » — « Signature »</p>

    <div class="disclaimer">Attention : ce document est généré par un outil indicatif. Les montants sont à vérifier. Ce document ne remplace pas un conseil juridique professionnel.</div>
</body></html>`;
    // Attention : on utilise bien un backtick (`) ci-dessus pour fermer la chaîne HTML

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mise_en_demeure_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function esc(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ═══════════════════════════════════════════════════════════════
// ORCHESTRATEUR
// ═══════════════════════════════════════════════════════════════

/**
 * Générer et télécharger les documents (Word lettre + PDF annexe)
 */
export function genererPDFArretees(data, infosPersonnelles = {}, forceSmhSeul = false, stateParam = null) {
    const state = stateParam || defaultState;

    if (!state.arretesSurSMHSeul) {
        throw new Error('Le rapport ne peut être généré qu\'en mode « SMH seul ».');
    }

    // 1. Word : Lettre de mise en demeure (éditable)
    genererWordLettreMiseEnDemeure(data, infosPersonnelles);

    // 2. PDF : Annexe technique (autoTable)
    const docAnnexe = genererPDFAnnexeTechnique(data, infosPersonnelles, state);
    docAnnexe.save(`annexe_technique_${new Date().toISOString().split('T')[0]}.pdf`);

    return { docAnnexe };
}
