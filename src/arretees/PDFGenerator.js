/**
 * ============================================
 * PDF GENERATOR - Génération PDF Arriérés
 * ============================================
 * 
 * Deux documents PDF distincts :
 * 1. Lettre de mise en demeure (modèle officiel code.travail.gouv.fr)
 * 2. Annexe technique (détail des calculs, méthodologie, références)
 * 
 * La comparaison s'effectue par année civile (Art. 140 CCNM).
 */

import { getMontantAnnuelSMHSeul } from '../remuneration/RemunerationCalculator.js';
import { formatMoneyPDF } from '../utils/formatters.js';
import { getActiveClassification } from '../classification/ClassificationEngine.js';
import { state as defaultState } from '../core/state.js';
import { getActiveAgreement } from '../agreements/AgreementLoader.js';
import { getPrimes } from '../agreements/AgreementInterface.js';

// ═══════════════════════════════════════════════════════════════
// Utilitaires PDF communs
// ═══════════════════════════════════════════════════════════════

function getJsPDF() {
    return (typeof window !== 'undefined' && window.jsPDF) ||
        (window.jspdf && (window.jspdf.jsPDF || window.jspdf.default?.jsPDF));
}

function addFooter(doc, extraText) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(140, 140, 140);
        if (extraText) {
            doc.text(extraText, pageWidth / 2, pageHeight - 14, { align: 'center' });
        }
        doc.text(`Page ${i} / ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    }
}

function wrappedText(doc, text, x, y, maxWidth, lineHeight = 5) {
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach(line => {
        doc.text(line, x, y);
        y += lineHeight;
    });
    return y;
}

// ═══════════════════════════════════════════════════════════════
// PDF 1 : LETTRE DE MISE EN DEMEURE
// Modèle officiel : code.travail.gouv.fr/modeles-de-courriers/demande-de-paiement-de-salaire
// ═══════════════════════════════════════════════════════════════

/**
 * Générer le PDF de la lettre de mise en demeure
 * @param {Object} data - Données des arriérés (dont detailsParAnnee)
 * @param {Object} infos - Informations personnelles saisies dans le modal
 * @param {Object} stateParam - State de l'application
 * @returns {jsPDF}
 */
export function genererPDFLettreMiseEnDemeure(data, infos = {}, stateParam = null) {
    const jsPDF = getJsPDF();
    if (!jsPDF) throw new Error('Bibliothèque PDF non chargée');

    const state = stateParam || defaultState;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const checkPageBreak = (space = 20) => {
        if (y + space > pageHeight - 25) { doc.addPage(); y = margin; }
    };

    // ─── Bloc expéditeur (haut gauche) ───
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    const expediteur = [
        infos.nomPrenom || '« Prénom Nom du salarié »',
        infos.adresseSalarie || '« Adresse »',
        infos.cpVilleSalarie || '« Code postal + Ville »'
    ];
    expediteur.forEach(line => { doc.text(line, margin, y); y += 5; });
    y += 5;

    // ─── Bloc destinataire (aligné à droite) ───
    const destX = pageWidth / 2 + 10;
    const destinataire = [
        infos.employeur || '« Société »',
        infos.representant || '« Prénom Nom du représentant »',
        infos.fonction || '« Fonction (DRH, etc.) »',
        infos.adresseEmployeur || '« Adresse »',
        infos.cpVilleEmployeur || '« Code postal + Ville »'
    ];
    destinataire.forEach(line => { doc.text(line, destX, y); y += 5; });
    y += 10;

    // ─── Lieu et date ───
    const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const lieuStr = infos.lieu ? `À ${infos.lieu}, le ${todayStr}` : `Le ${todayStr}`;
    doc.text(lieuStr, margin, y);
    y += 10;

    // ─── Mode d'envoi ───
    doc.setFont(undefined, 'bold');
    doc.text('Lettre recommandée avec accusé de réception n° _______________', margin, y);
    y += 10;
    doc.setFont(undefined, 'normal');

    // ─── Objet ───
    doc.setFont(undefined, 'bold');
    doc.text('Objet : Demande de régularisation de salaire', margin, y);
    y += 10;
    doc.setFont(undefined, 'normal');

    // ─── Corps de la lettre ───
    doc.text('Madame, Monsieur,', margin, y);
    y += 8;

    const intro = 'Par la présente, je vous signale que ma rémunération n\'a pas atteint le Salaire Minimum Hiérarchique (SMH) défini par la Convention Collective Nationale de la Métallurgie (IDCC 3248) pour les périodes suivantes :';
    y = wrappedText(doc, intro, margin, y, contentWidth);
    y += 5;

    // ─── Tableau par année civile ───
    const annees = data.detailsParAnnee || [];
    if (annees.length > 0) {
        checkPageBreak(15 + annees.length * 7);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');

        const col1 = margin + 5;
        const col2 = margin + 45;
        const col3 = margin + 90;
        const col4 = margin + 135;

        doc.text('Année', col1, y);
        doc.text('SMH annuel dû', col2, y);
        doc.text('Total perçu', col3, y);
        doc.text('Écart', col4, y);
        y += 2;
        doc.setDrawColor(180, 180, 180);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;

        doc.setFont(undefined, 'normal');
        annees.forEach(a => {
            doc.text(`${a.annee} (${a.nbMoisSaisis} mois)`, col1, y);
            doc.text(formatMoneyPDF(a.totalDu), col2, y);
            doc.text(formatMoneyPDF(a.totalReel), col3, y);
            if (a.ecart > 0) {
                doc.setFont(undefined, 'bold');
                doc.text(formatMoneyPDF(a.ecart), col4, y);
                doc.setFont(undefined, 'normal');
            } else {
                doc.text('—', col4, y);
            }
            y += 6;
        });

        // Ligne total
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
        doc.setFont(undefined, 'bold');
        doc.text('TOTAL', col1, y);
        doc.text(formatMoneyPDF(data.totalArretees), col4, y);
        doc.setFont(undefined, 'normal');
        y += 10;
        doc.setFontSize(10);
    }

    // ─── Mise en demeure ───
    checkPageBreak(40);
    const miseEnDemeure = 'Ce manquement constitue une violation de vos obligations conventionnelles (Convention Collective Nationale de la Métallurgie, IDCC 3248, Art. 140).';
    y = wrappedText(doc, miseEnDemeure, margin, y, contentWidth);
    y += 3;

    const demande = 'Je vous mets donc en demeure de procéder à la régularisation des salaires qui me sont dus dans un délai de 8 jours à compter de la date du présent courrier.';
    y = wrappedText(doc, demande, margin, y, contentWidth);
    y += 3;

    const aDefaut = 'À défaut, je me verrai dans l\'obligation de saisir le Conseil de Prud\'hommes pour obtenir régularisation et réparation du préjudice subi.';
    y = wrappedText(doc, aDefaut, margin, y, contentWidth);
    y += 5;

    // ─── Facultatif : inspection du travail ───
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    y = wrappedText(doc, '[Facultatif] Je vous informe que copie de ce courrier est transmise à l\'inspection du travail, à qui je sollicite par ailleurs l\'intervention dans ce dossier.', margin, y, contentWidth);
    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    // ─── Annexe ───
    checkPageBreak(15);
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    y = wrappedText(doc, 'Pièce jointe : Annexe technique — détail des calculs et références conventionnelles.', margin, y, contentWidth);
    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    // ─── Formule de politesse ───
    checkPageBreak(20);
    doc.text('Veuillez agréer, Madame, Monsieur, l\'expression de ma considération distinguée.', margin, y);
    y += 15;

    // ─── Signature ───
    doc.text(infos.nomPrenom || '« Prénom Nom »', margin, y);
    y += 5;
    doc.text('« Signature »', margin, y);
    y += 10;

    // ─── Remis en main propre ───
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    y = wrappedText(doc, '[En cas de courrier remis en main propre] Fait en deux exemplaires.', margin, y, contentWidth);
    y += 3;
    y = wrappedText(doc, '« Prénom Nom du représentant de la société » — « Signature »', margin, y, contentWidth);
    doc.setTextColor(0, 0, 0);

    // ─── Disclaimer ───
    addFooter(doc, 'Attention : document généré par un outil indicatif. Les montants sont à vérifier. Ne remplace pas un conseil juridique professionnel.');

    return doc;
}

// ═══════════════════════════════════════════════════════════════
// PDF 2 : ANNEXE TECHNIQUE
// ═══════════════════════════════════════════════════════════════

/**
 * Générer le PDF de l'annexe technique
 * @param {Object} data - Données des arriérés
 * @param {Object} infos - Informations personnelles
 * @param {Object} stateParam - State de l'application
 * @returns {jsPDF}
 */
export function genererPDFAnnexeTechnique(data, infos = {}, stateParam = null) {
    const jsPDF = getJsPDF();
    if (!jsPDF) throw new Error('Bibliothèque PDF non chargée');

    const state = stateParam || defaultState;
    const hasAccord = !!(state.accordActif || state.accordId);
    const salaireDu = getMontantAnnuelSMHSeul(state);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const marginRight = pageWidth - margin;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const checkPageBreak = (space = 20) => {
        if (y + space > pageHeight - 25) { doc.addPage(); y = margin; }
    };

    // ─── En-tête ───
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Annexe technique — Détail du calcul des arriérés', pageWidth / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Convention Collective Nationale de la Métallurgie (CCNM) 2024', pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`Document établi le ${todayStr}`, margin, y);
    y += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, marginRight, y);
    y += 10;

    // ═══════════════════════════════════════════════════
    // Section 1 : Informations du contrat
    // ═══════════════════════════════════════════════════
    checkPageBreak(30);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('1. Informations du contrat', margin, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');

    const classificationInfo = getActiveClassification(state);
    y = wrappedText(doc, `Classification : ${classificationInfo.groupe}${classificationInfo.classe}`, margin + 5, y, contentWidth - 10);
    y += 1;

    if (infos.nomPrenom) { y = wrappedText(doc, `Salarié : ${infos.nomPrenom}`, margin + 5, y, contentWidth - 10); y += 1; }
    if (infos.poste) { y = wrappedText(doc, `Poste : ${infos.poste}`, margin + 5, y, contentWidth - 10); y += 1; }
    if (infos.employeur) { y = wrappedText(doc, `Employeur : ${infos.employeur}`, margin + 5, y, contentWidth - 10); y += 1; }
    if (infos.matricule) { y = wrappedText(doc, `Matricule : ${infos.matricule}`, margin + 5, y, contentWidth - 10); y += 1; }

    const dateEmbaucheInput = data.dateEmbauche || '';
    const dateChangementInput = data.dateChangementClassification || '';
    const dateRuptureInput = data.dateRuptureInput || '';
    if (dateEmbaucheInput) {
        const d = new Date(dateEmbaucheInput).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        y = wrappedText(doc, `Date d'embauche : ${d}`, margin + 5, y, contentWidth - 10); y += 1;
    }
    if (dateChangementInput) {
        const d = new Date(dateChangementInput).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        y = wrappedText(doc, `Changement de classification : ${d}`, margin + 5, y, contentWidth - 10); y += 1;
    }
    if (data.ruptureContrat && dateRuptureInput) {
        const d = new Date(dateRuptureInput).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        y = wrappedText(doc, `Rupture du contrat : ${d}`, margin + 5, y, contentWidth - 10); y += 1;
    } else if (!data.ruptureContrat) {
        doc.text('Statut du contrat : En cours', margin + 5, y); y += 5;
    }

    const isCadreDebutant = (classificationInfo.classe === 11 || classificationInfo.classe === 12) && state.experiencePro < 6;
    let smhAnnuelLabel = 'SMH annuel brut';
    if (isCadreDebutant) {
        let trancheLabel = '< 2 ans';
        if (state.experiencePro >= 4) trancheLabel = '4 à 6 ans';
        else if (state.experiencePro >= 2) trancheLabel = '2 à 4 ans';
        smhAnnuelLabel = `SMH annuel brut (barème débutants ${trancheLabel})`;
    }
    y += 3;
    doc.setFont(undefined, 'bold');
    y = wrappedText(doc, `${smhAnnuelLabel} : ${formatMoneyPDF(salaireDu)}`, margin + 5, y, contentWidth - 10);
    y += 1;
    y = wrappedText(doc, `Base temps plein : 35h/semaine (151,67h/mois)`, margin + 5, y, contentWidth - 10);
    doc.setFont(undefined, 'normal');

    if (infos.observations) {
        y += 3;
        doc.text('Observations :', margin + 5, y); y += 5;
        y = wrappedText(doc, infos.observations, margin + 5, y, contentWidth - 10);
    }
    y += 8;

    // ═══════════════════════════════════════════════════
    // Section 2 : Méthodologie
    // ═══════════════════════════════════════════════════
    checkPageBreak(50);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('2. Méthodologie de calcul', margin, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');

    const moisNomsPDF = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const agreement = hasAccord ? getActiveAgreement() : null;
    const agrPrimes = agreement ? getPrimes(agreement) : [];
    const primesSmh = agrPrimes.filter(p => p.inclusDansSMH === true);

    // Principe
    doc.setFont(undefined, 'bold');
    const incluesStr = primesSmh.length > 0 ? primesSmh.map(p => p.label.toLowerCase()).join(', ') + ', 13e mois' : '13e mois';
    y = wrappedText(doc, `Principe : Conformément à la CCN Métallurgie (IDCC 3248), Art. 140, le SMH s'apprécie sur l'année civile. L'assiette SMH inclut : base, forfaits cadres, ${incluesStr}. Exclues : prime d'ancienneté, majorations nuit/dimanche/équipe/pénibilité.`, margin + 5, y, contentWidth - 10);
    doc.setFont(undefined, 'normal');
    y += 3;

    // Formule
    doc.setFont(undefined, 'bold');
    doc.text('Formule (comparaison par année civile) :', margin + 5, y); y += 6;
    doc.setFont(undefined, 'normal');
    doc.text('Arriérés(année) = max(0 ; Total SMH dû(année) − Total perçu(année))', margin + 5, y); y += 5;
    doc.text('Total arriérés = somme des arriérés par année civile.', margin + 5, y); y += 5;
    y += 3;

    // Distribution mensuelle
    if (hasAccord && agreement) {
        const moisVers13e = agreement.repartition13Mois?.moisVersement;
        const mois13eStr = moisVers13e ? moisNomsPDF[moisVers13e - 1] : 'selon accord';
        const exempleMois = primesSmh.filter(p => p.moisVersement).map(p => `${p.label.toLowerCase()} en ${moisNomsPDF[p.moisVersement - 1]}`).join(', ');
        const exempleStr = exempleMois ? ` Primes incluses versées dans leur mois (${exempleMois}).` : '';
        y = wrappedText(doc, `Distribution mensuelle : répartition 12/13 mois (13e mois en ${mois13eStr}).${exempleStr}`, margin + 5, y, contentWidth - 10);
    } else {
        y = wrappedText(doc, 'Distribution mensuelle : répartition 12 mois.', margin + 5, y, contentWidth - 10);
    }
    y += 8;

    // ═══════════════════════════════════════════════════
    // Section 3 : Résumé par année civile
    // ═══════════════════════════════════════════════════
    const annees = data.detailsParAnnee || [];
    if (annees.length > 0) {
        checkPageBreak(20 + annees.length * 7);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('3. Résumé par année civile', margin, y);
        y += 8;
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');

        const col1 = margin + 5;
        const col2 = margin + 40;
        const col3 = margin + 80;
        const col4 = margin + 120;

        doc.text('Année', col1, y);
        doc.text('SMH annuel dû', col2, y);
        doc.text('Total perçu', col3, y);
        doc.text('Écart (arriérés)', col4, y);
        y += 2;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, marginRight, y);
        y += 5;
        doc.setFont(undefined, 'normal');

        annees.forEach(a => {
            checkPageBreak(8);
            doc.text(`${a.annee} (${a.nbMoisSaisis} mois)`, col1, y);
            doc.text(formatMoneyPDF(a.totalDu), col2, y);
            doc.text(formatMoneyPDF(a.totalReel), col3, y);
            if (a.ecart > 0) {
                doc.setTextColor(9, 105, 218);
                doc.setFont(undefined, 'bold');
                doc.text(formatMoneyPDF(a.ecart), col4, y);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(0, 0, 0);
            } else {
                doc.text('Conforme', col4, y);
            }
            y += 6;
        });

        doc.line(margin, y, marginRight, y); y += 5;
        doc.setFont(undefined, 'bold');
        doc.setTextColor(9, 105, 218);
        doc.text('TOTAL ARRIÉRÉS', col1, y);
        doc.text(formatMoneyPDF(data.totalArretees), col4, y);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        y += 10;
    }

    // ═══════════════════════════════════════════════════
    // Section 4 : Détail mois par mois
    // ═══════════════════════════════════════════════════
    const detailsMois = data.detailsTousMois || data.detailsArretees || [];
    if (detailsMois.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('4. Détail mois par mois (informatif)', margin, y);
        y += 3;
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(100, 100, 100);
        y = wrappedText(doc, 'Ce détail est fourni à titre de transparence. La comparaison effective s\'effectue par année civile (section 3).', margin + 5, y, contentWidth - 10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        y += 3;

        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');

        const colP = margin + 5;
        const colR = margin + 52;
        const colD = margin + 102;
        const colA = margin + 152;

        doc.text('Période', colP, y);
        doc.text('Salaire perçu', colR, y);
        doc.text('SMH mensuel dû', colD, y);
        doc.text('Écart mensuel', colA, y);
        y += 2;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, marginRight, y);
        y += 5;
        doc.setFont(undefined, 'normal');

        detailsMois.forEach(detail => {
            checkPageBreak(8);
            doc.text(detail.periode, colP, y);
            doc.text(formatMoneyPDF(detail.salaireMensuelReel), colR, y);
            doc.text(formatMoneyPDF(detail.salaireMensuelDu), colD, y);
            if (detail.difference > 0) {
                doc.setTextColor(200, 50, 50);
                doc.text(`- ${formatMoneyPDF(detail.difference)}`, colA, y);
                doc.setTextColor(0, 0, 0);
            } else {
                doc.setTextColor(50, 150, 50);
                doc.text('OK', colA, y);
                doc.setTextColor(0, 0, 0);
            }
            y += 6;
        });
        y += 8;
    }

    // ═══════════════════════════════════════════════════
    // Section 5 : Accord d'entreprise (si applicable)
    // ═══════════════════════════════════════════════════
    if (hasAccord && agreement) {
        checkPageBreak(40);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`5. Accord d'entreprise (${agreement.nomCourt})`, margin, y);
        y += 8;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');

        const primes = getPrimes(agreement);
        if (primes && primes.length > 0) {
            doc.setFont(undefined, 'bold');
            doc.text('Primes :', margin + 5, y); y += 5;
            doc.setFont(undefined, 'normal');
            primes.forEach(p => {
                const smhTag = p.inclusDansSMH ? ' [incluse SMH]' : ' [hors SMH]';
                const desc = `• ${p.label}${p.valeurAccord != null ? ` (+${p.valeurAccord} ${p.unit})` : ''}${smhTag}`;
                y = wrappedText(doc, desc, margin + 5, y, contentWidth - 10);
            });
            y += 3;
        }
        if (agreement.anciennete) {
            y = wrappedText(doc, `Ancienneté : seuil ${agreement.anciennete.seuil ?? '—'} ans ; barème selon accord.`, margin + 5, y, contentWidth - 10);
        }
        y += 8;
    }

    // ═══════════════════════════════════════════════════
    // Section 6 : Références juridiques
    // ═══════════════════════════════════════════════════
    checkPageBreak(30);
    const refSectionNum = hasAccord ? '6' : '5';
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`${refSectionNum}. Références juridiques`, margin, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');

    const refs = [
        'Convention collective nationale de la métallurgie (IDCC 3248), Art. 140 — Salaires minima hiérarchiques et assiette.',
        'Code du travail, Art. L.3245-1 — Prescription triennale des salaires.',
        'Code du travail, Art. L.2254-2 — Principe de faveur (accord d\'entreprise plus favorable).'
    ];
    if (hasAccord && agreement) {
        refs.push(`Accord d'entreprise ${agreement.nomCourt || ''} — dispositions relatives aux primes et majorations.`);
    }
    refs.forEach(ref => {
        checkPageBreak(10);
        y = wrappedText(doc, `• ${ref}`, margin + 5, y, contentWidth - 10);
        y += 2;
    });

    // ─── Pied de page ───
    addFooter(doc, 'Document indicatif généré automatiquement — ne remplace pas un conseil juridique professionnel.');

    return doc;
}

// ═══════════════════════════════════════════════════════════════
// ORCHESTRATEUR : génère et télécharge les 2 PDF
// ═══════════════════════════════════════════════════════════════

/**
 * Générer les deux PDF (lettre + annexe) et les télécharger
 * @param {Object} data - Données des arriérés
 * @param {Object} infosPersonnelles - Informations saisies dans le modal
 * @param {boolean} forceSmhSeul - Ignoré (mode SMH seul exigé)
 * @param {Object} stateParam - State de l'application
 */
export function genererPDFArretees(data, infosPersonnelles = {}, forceSmhSeul = false, stateParam = null) {
    const state = stateParam || defaultState;

    if (!state.arretesSurSMHSeul) {
        throw new Error('Le rapport PDF ne peut être généré qu\'en mode « SMH seul ».');
    }

    const dateStr = new Date().toISOString().split('T')[0];

    // PDF 1 : Lettre de mise en demeure
    const docLettre = genererPDFLettreMiseEnDemeure(data, infosPersonnelles, state);
    docLettre.save(`mise_en_demeure_${dateStr}.pdf`);

    // PDF 2 : Annexe technique
    const docAnnexe = genererPDFAnnexeTechnique(data, infosPersonnelles, state);
    docAnnexe.save(`annexe_technique_${dateStr}.pdf`);

    return { docLettre, docAnnexe };
}
