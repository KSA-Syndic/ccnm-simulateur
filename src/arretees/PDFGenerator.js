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
import {
    getPrimes,
    getElements,
    getAccordInput,
    isPrimeActive
} from '../agreements/AgreementInterface.js';

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

function formatFrDateSafe(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('fr-FR');
}

const MOIS_NOMS_LONGS_PDF = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function frNumStr(n) {
    if (typeof n !== 'number' || !Number.isFinite(n)) return '';
    return String(n).replace('.', ',');
}

function pctFromFraction(f) {
    if (typeof f !== 'number' || !Number.isFinite(f)) return '';
    const p = Math.round(f * 10000) / 100;
    return `${frNumStr(p)} %`;
}

function describeInclusDansSMHFlag(v) {
    if (v === true) return 'Incluse dans l\'assiette SMH (Art. 140 CCNM, distribution du salaire)';
    if (v === false) return 'Hors assiette SMH (condition de travail ou supplément)';
    if (v === 'ifSuperiorToConvention') return 'Inclusion dans l\'assiette SMH si plus favorable que la CCN';
    return '';
}

function formatAncienneteAccordBloc(anc) {
    if (!anc || typeof anc !== 'object') return '';
    const bits = [];
    if (Number.isFinite(anc.seuil)) bits.push(`droit à partir de ${anc.seuil} an(s) révolu(s)`);
    if (Number.isFinite(anc.plafond)) bits.push(`barème plafonné à ${anc.plafond} ans`);
    if (anc.tousStatuts === true) bits.push('périmètre : cadres et non-cadres');
    else if (anc.tousStatuts === false) bits.push('périmètre : non-cadres');
    if (anc.baseCalcul === 'salaire') bits.push('base de calcul : rémunération de base brute');
    else if (anc.baseCalcul === 'point') bits.push('base de calcul : valeur du point');
    const inc = describeInclusDansSMHFlag(anc.inclusDansSMH);
    if (inc) bits.push(inc);
    if (anc.barème && typeof anc.barème === 'object' && !Array.isArray(anc.barème)) {
        const ys = Object.keys(anc.barème).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
        if (ys.length) bits.push(`${ys.length} paliers d'ancienneté dans le barème (détail dans le texte de l'accord)`);
    } else if (typeof anc.barème === 'function') {
        bits.push('barème défini par l\'accord (calcul dans le simulateur)');
    }
    return bits.join(' — ');
}

function majorationRowsFromAccord(maj) {
    const rows = [];
    if (!maj || typeof maj !== 'object') return rows;
    if (maj.nuit && typeof maj.nuit === 'object') {
        const n = maj.nuit;
        const parts = [];
        if (n.posteNuit != null) parts.push(`poste de nuit (≥ seuil) : +${pctFromFraction(n.posteNuit)}`);
        if (n.posteMatin != null) parts.push(`poste matin : +${pctFromFraction(n.posteMatin)}`);
        if (n.plageDebut != null && n.plageFin != null) parts.push(`plage ${n.plageDebut}h–${n.plageFin}h`);
        if (n.seuilHeuresPosteNuit != null) parts.push(`seuil poste nuit : ${frNumStr(n.seuilHeuresPosteNuit)} h`);
        rows.push(['Majorations — travail de nuit', parts.length ? parts.join(' ; ') : '—']);
    }
    if (typeof maj.dimanche === 'number' && Number.isFinite(maj.dimanche)) {
        rows.push(['Majorations — dimanche / jours fériés', `+${pctFromFraction(maj.dimanche)}`]);
    }
    if (maj.heuresSupplementaires && typeof maj.heuresSupplementaires === 'object') {
        const h = maj.heuresSupplementaires;
        const p = [];
        if (h.majoration25 != null) p.push(`8 premières h : +${pctFromFraction(h.majoration25)}`);
        if (h.majoration50 != null) p.push(`au-delà : +${pctFromFraction(h.majoration50)}`);
        if (h.contingent != null) p.push(`contingent annuel : ${frNumStr(h.contingent)} h`);
        rows.push(['Majorations — heures supplémentaires', p.length ? p.join(' ; ') : '—']);
    }
    if (maj.penibilite && typeof maj.penibilite === 'object' && Object.keys(maj.penibilite).length > 0) {
        rows.push(['Majorations — pénibilité', 'Paramètres définis dans l\'accord (voir texte)']);
    }
    const handled = new Set(['nuit', 'dimanche', 'heuresSupplementaires', 'penibilite']);
    for (const key of Object.keys(maj)) {
        if (handled.has(key)) continue;
        const v = maj[key];
        if (typeof v === 'number' && Number.isFinite(v)) {
            rows.push([`Majorations — ${key}`, frNumStr(v)]);
        } else if (v && typeof v === 'object' && !Array.isArray(v)) {
            rows.push([`Majorations — ${key}`, 'Paramètres définis dans l\'accord (voir texte)']);
        }
    }
    return rows;
}

function primeValueTypeLabelFr(vt) {
    const map = {
        horaire: 'montant horaire × base mensuelle',
        montant: 'montant annuel forfaitaire',
        pourcentage: 'pourcentage d\'une assiette',
        majorationHoraire: 'majoration en % du taux horaire × heures'
    };
    return map[vt] || (vt ? String(vt) : '');
}

function formatPrimeDetailForPdf(prime, state, agreement) {
    const parts = [];
    if (prime.sourceValeur === 'accord' && prime.valeurAccord != null) {
        parts.push(`Valeur fixée par l'accord : ${frNumStr(Number(prime.valeurAccord))} ${prime.unit || ''}`.trim());
    } else {
        parts.push('Valeur : selon modalité ou saisie utilisateur');
        const modal = getAccordInput(state, prime.id) ?? state?.primesModalites?.[prime.id];
        if (modal != null && modal !== '' && Number.isFinite(Number(modal))) {
            parts.push(`Saisie actuelle : ${frNumStr(Number(modal))} ${prime.unit || ''}`.trim());
        }
    }
    const vt = primeValueTypeLabelFr(prime.valueType);
    if (vt) parts.push(`Mode de calcul : ${vt}`);
    if (prime.moisVersement >= 1 && prime.moisVersement <= 12) {
        parts.push(`Mois de versement indicatif : ${MOIS_NOMS_LONGS_PDF[prime.moisVersement - 1]}`);
    }
    const cond = prime.conditionAnciennete?.description || prime.conditionTexte;
    if (cond) parts.push(`Condition d'attribution : ${cond}`);
    if (prime.sourceArticle) parts.push(`Référence : ${prime.sourceArticle}`);
    const smhLbl = describeInclusDansSMHFlag(prime.inclusDansSMH);
    if (smhLbl) parts.push(smhLbl);
    if (prime.inclusDansSMH !== true) {
        const on = isPrimeActive(agreement, prime.id, state);
        parts.push(on ? 'Sélection dans le simulateur : oui' : 'Sélection dans le simulateur : non');
        if ((prime.valueType === 'horaire' || prime.valueType === 'majorationHoraire') && prime.stateKeyHeures) {
            const h = getAccordInput(state, prime.stateKeyHeures);
            if (h != null && Number.isFinite(Number(h)) && Number(h) >= 0) {
                parts.push(`Heures mensuelles retenues pour le calcul : ${frNumStr(Number(h))} h`);
            }
        }
    }
    return parts.join(' — ');
}

function elementDroitRows(elements) {
    if (!Array.isArray(elements) || elements.length === 0) return [];
    return elements.map((el) => {
        const label = el.label || el.id || 'Élément';
        const bits = [];
        if (el.source) bits.push(el.source);
        if (el.conditionAnciennete?.description) bits.push(el.conditionAnciennete.description);
        if (el.dateCle) bits.push(el.dateCle);
        if (el.note) bits.push(el.note);
        return [`Synthèse conventionnelle — ${label}`, bits.join(' — ')];
    });
}

function formatCongesAccord(conges) {
    if (!conges || typeof conges !== 'object') return '';
    const lines = [];
    if (Array.isArray(conges.nonCadres)) {
        conges.nonCadres.forEach((c) => {
            if (c && Number.isFinite(c.anciennete) && Number.isFinite(c.jours)) {
                lines.push(`non-cadres : +${c.jours} jour(s) à partir de ${c.anciennete} ans`);
            }
        });
    }
    if (Array.isArray(conges.cadres)) {
        conges.cadres.forEach((c) => {
            if (c && Number.isFinite(c.jours)) {
                const p = [`cadres : +${c.jours} jour(s)`];
                if (Number.isFinite(c.age)) p.push(`âge ${c.age} ans ou plus`);
                if (Number.isFinite(c.anciennete)) p.push(`${c.anciennete} an(s) d'ancienneté`);
                lines.push(p.join(', '));
            }
        });
    }
    return lines.join(' ; ');
}

/**
 * Lignes [rubrique, détail lisible] pour le tableau « accord » du PDF,
 * alignées sur le schéma Agreement / PrimeDef / ElementDroit (sans dump technique JSON).
 * @param {Object|null} agreement - Accord au schéma AgreementInterface
 * @param {Object|null} state
 * @returns {string[][]}
 */
export function buildAgreementSummaryRows(agreement, state) {
    if (!agreement || typeof agreement !== 'object') return [];

    const rows = [];
    const st = state || defaultState;

    const desc = agreement.labels?.description || agreement.labels?.tooltipHeader || agreement.labels?.tooltipPage3 || agreement.labels?.tooltip;
    if (desc && String(desc).trim()) {
        rows.push(['Présentation', String(desc).trim()]);
    }

    const ident = [];
    if (agreement.nom && agreement.nom !== agreement.nomCourt) ident.push(agreement.nom);
    if (agreement.nomCourt) ident.push(`Nom court : ${agreement.nomCourt}`);
    if (agreement.id) ident.push(`Référence dans le simulateur : ${agreement.id}`);
    if (agreement.dateEffet) ident.push(`Entrée en vigueur : ${formatFrDateSafe(agreement.dateEffet)}`);
    if (agreement.dateSignature) ident.push(`Date de signature : ${formatFrDateSafe(agreement.dateSignature)}`);
    if (agreement.metadata?.version) ident.push(`Version des données : ${agreement.metadata.version}`);
    if (agreement.metadata?.entreprise) ident.push(`Entreprise / UES : ${agreement.metadata.entreprise}`);
    if (agreement.metadata?.territoire) ident.push(`Territoire : ${agreement.metadata.territoire}`);
    if (Array.isArray(agreement.metadata?.articlesSubstitues) && agreement.metadata.articlesSubstitues.length > 0) {
        ident.push(`Articles CCNM concernés (substitution) : ${agreement.metadata.articlesSubstitues.join(', ')}`);
    }
    if (agreement.url) ident.push(`Lien vers le texte ou la fiche : ${agreement.url}`);
    if (ident.length) rows.push(['Identification', ident.join(' — ')]);

    const ancTxt = formatAncienneteAccordBloc(agreement.anciennete);
    if (ancTxt) rows.push(['Prime d\'ancienneté (paramètres de l\'accord)', ancTxt]);

    const r13 = agreement.repartition13Mois;
    if (r13 && typeof r13 === 'object') {
        if (r13.actif) {
            const m = r13.moisVersement >= 1 && r13.moisVersement <= 12
                ? MOIS_NOMS_LONGS_PDF[r13.moisVersement - 1]
                : '—';
            const inc = describeInclusDansSMHFlag(r13.inclusDansSMH);
            rows.push(['13e mois / douzièmes', `Répartition sur 13 mois — versement en ${m}${inc ? ` — ${inc}` : ''}`]);
        } else {
            rows.push(['13e mois / douzièmes', 'Non prévu comme 13e mois dans la définition chargée']);
        }
    }

    rows.push(...majorationRowsFromAccord(agreement.majorations));

    const primes = getPrimes(agreement);
    for (const p of primes) {
        const lib = p.label || 'Élément d\'accord';
        const mode = primeValueTypeLabelFr(p.valueType);
        const titre = mode ? `Prime / indemnité — ${lib} (${mode})` : `Prime / indemnité — ${lib}`;
        rows.push([titre, formatPrimeDetailForPdf(p, st, agreement)]);
    }

    rows.push(...elementDroitRows(getElements(agreement)));

    if (Array.isArray(agreement.pointsVigilance) && agreement.pointsVigilance.length > 0) {
        rows.push(['Points de vigilance', agreement.pointsVigilance.map((x, i) => `${i + 1}. ${x}`).join(' ')]);
    }

    const congTxt = formatCongesAccord(agreement.conges);
    if (congTxt) rows.push(['Congés d\'ancienneté (informatif)', congTxt]);

    if ((agreement.syndicatNom || '').trim() || (agreement.syndicatEmail || '').trim()) {
        const synd = [(agreement.syndicatNom || '').trim(), (agreement.syndicatEmail || '').trim()].filter(Boolean).join(' — ');
        rows.push(['Contact syndical (indicatif)', synd]);
    }

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
    const scopeMode = data?.scopeMode || (state.arretesSurSMHSeul ? 'smh-only' : 'full');

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
    const salaireDu = scopeMode === 'smh-only'
        ? getMontantAnnuelSMHSeul(state, agreement, { date: referenceDate })
        : (remunerationFull?.total || 0);
    const detailsMoisSource = Array.isArray(data?.detailsTousMois) && data.detailsTousMois.length > 0
        ? data.detailsTousMois
        : (Array.isArray(data?.detailsArretees) ? data.detailsArretees : []);
    const yearsFromAnnee = Array.isArray(data?.detailsParAnnee)
        ? data.detailsParAnnee.map((entry) => Number(entry?.annee)).filter(Number.isFinite)
        : [];
    const yearsFromMois = detailsMoisSource
        .map((entry) => Number(String(entry?.periodeKey || '').slice(0, 4)))
        .filter(Number.isFinite);
    const yearsUsed = [...new Set([...yearsFromAnnee, ...yearsFromMois])].sort((a, b) => a - b);
    const yearsUsedLabel = yearsUsed.length > 0 ? yearsUsed.join(', ') : 'non déterminé';

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
        const accordParts = [agreement.nomCourt || agreement.nom || agreement.id || '—'];
        if (agreement.dateEffet) accordParts.push(`effet ${formatFrDateSafe(agreement.dateEffet)}`);
        if (agreement.dateSignature) accordParts.push(`signé ${formatFrDateSafe(agreement.dateSignature)}`);
        contractRows.push(['Accord d\'entreprise', accordParts.join(' — ')]);
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

    y = checkPageBreak(doc, y, 20);
    const scopeLabel = scopeMode === 'smh-only'
        ? 'SMH seul (assiette conventionnelle, Art. 140 CCNM)'
        : 'Rémunération complète (option explicite)';
    const scopeMethodo = scopeMode === 'smh-only'
        ? 'Comparaison principale recommandée pour une mise en demeure sur minima conventionnels.'
        : 'Comparaison élargie au brut complet (incluant les éléments hors assiette SMH).';
    addAutoTable(doc, {
        startY: y,
        body: [
            ['Périmètre retenu', scopeLabel],
            ['Méthodologie associée', scopeMethodo]
        ],
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 1.2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 52 } },
        margin: { left: MARGIN, right: MARGIN }
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 6;

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
    smhRows.push(['Lecture', 'L’assiette SMH correspond à la base + éléments inclus actifs. Les éléments exclus s’ajoutent au-dessus du minimum.']);

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

    const principe = scopeMode === 'smh-only'
        ? `Principe (Art. 140 CCNM) : Le SMH s'apprécie sur l'année civile. L'assiette SMH inclut (actifs) : ${incluesStr}. Éléments exclus (actifs) : ${exclusTxt}.`
        : `Principe (option complète) : comparaison annuelle sur la rémunération brute totale reconstituée. Référence assiette SMH active : ${incluesStr}. Éléments hors assiette actifs : ${exclusTxt}.`;
    y = wrappedText(doc, principe, MARGIN, y, cw);
    y = wrappedText(
        doc,
        `Jeu de données conventionnelles appliqué : grilles SMH annuelles et barèmes débutants, sélectionnés automatiquement selon l'année civile de chaque mois (années couvertes : ${yearsUsedLabel}).`,
        MARGIN,
        y,
        cw
    );
    y = wrappedText(
        doc,
        `Données historiques de salaires perçus : montants mensuels saisis dans la période (${detailsMoisSource.length} mois renseigné(s)). Seuls les mois renseignés sont intégrés au calcul des arriérés.`,
        MARGIN,
        y,
        cw
    );
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
            head: [['Année', 'Annuel dû', 'Total perçu', 'Écart (arriérés)']],
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
        const accordRows = buildAgreementSummaryRows(agreement, state);
        if (accordRows.length > 0) {
            addAutoTable(doc, {
                startY: y,
                head: [['Rubrique', 'Détail']],
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
    refs.push(`Jeu de données conventionnelles actif : millésime ${CONFIG.CURRENT_DATA_YEAR || '—'} ; mise à jour du ${formatFrDateSafe(smhUpdate.updatedAt) || '—'}.`);
    refs.push(`Période réellement calculée (données saisies) : ${yearsUsedLabel} ; ${detailsMoisSource.length} mois renseigné(s) dans l'historique des salaires perçus.`);
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
    const avenantsSMH = smhYearEntries.filter((entry) => {
        const label = String(entry?.sourceLabel || '').toLowerCase();
        return label.includes('avenant') || Boolean(entry?.sourceUrl);
    });
    if (avenantsSMH.length > 0) {
        const lines = avenantsSMH.map((entry) => {
            const parts = [`${entry.year}`];
            if (entry?.effectiveDate) parts.push(`effet ${formatFrDateSafe(entry.effectiveDate)}`);
            if (entry?.sourceLabel) parts.push(String(entry.sourceLabel));
            if (entry?.sourceUrl) parts.push(String(entry.sourceUrl));
            return parts.join(' — ');
        });
        refs.push(`Avenants / sources de mise à jour SMH pris en compte : ${lines.join(' | ')}.`);
    }
    if (smhYearRef?.sourceLabel || smhYearRef?.sourceUrl) {
        refs.push(`Source grille SMH ${smhYearRef?.year || ''}: ${smhYearRef?.sourceLabel || 'Mise à jour interne'}${smhYearRef?.sourceUrl ? ` (${smhYearRef.sourceUrl})` : ''}.`);
    }
    if (hasAccord && agreement) {
        const accordNom = agreement.nomCourt || agreement.nom || agreement.id || 'sans nom';
        const accordDetails = [];
        if (agreement.dateEffet) accordDetails.push(`effet ${formatFrDateSafe(agreement.dateEffet)}`);
        if (agreement.dateSignature) accordDetails.push(`signé le ${formatFrDateSafe(agreement.dateSignature)}`);
        if (agreement.metadata?.version) accordDetails.push(`version ${agreement.metadata.version}`);
        if (agreement.metadata?.territoire) accordDetails.push(`territoire ${agreement.metadata.territoire}`);
        if (agreement.metadata?.entreprise) accordDetails.push(`entreprise ${agreement.metadata.entreprise}`);
        if (Array.isArray(agreement.metadata?.articlesSubstitues) && agreement.metadata.articlesSubstitues.length > 0) {
            accordDetails.push(`articles substitués CCNM : ${agreement.metadata.articlesSubstitues.join(', ')}`);
        }
        refs.push(`Accord d'entreprise appliqué : ${accordNom}${accordDetails.length ? ` (${accordDetails.join(' ; ')})` : ''}${agreement.url ? ` — ${agreement.url}` : ''}.`);
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

    // 1. Word : Lettre de mise en demeure (éditable)
    genererWordLettreMiseEnDemeure(data, infosPersonnelles);

    // 2. PDF : Annexe technique (autoTable)
    const docAnnexe = genererPDFAnnexeTechnique(data, infosPersonnelles, state);
    docAnnexe.save(`annexe_technique_${new Date().toISOString().split('T')[0]}.pdf`);

    return { docAnnexe };
}
