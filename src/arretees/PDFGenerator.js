/**
 * ============================================
 * PDF GENERATOR - Génération PDF Arriérés
 * ============================================
 * 
 * Génération du PDF pour les arriérés de salaire.
 * Corrige les bugs : mauvais SMH utilisé, lignes qui dépassent.
 */

import { getMontantAnnuelSMHSeul } from '../remuneration/RemunerationCalculator.js';
import { formatMoneyPDF } from '../utils/formatters.js';
import { getActiveClassification } from '../classification/ClassificationEngine.js';
import { state as defaultState } from '../core/state.js';

/**
 * Générer le PDF des arriérés
 * @param {Object} data - Données des arriérés
 * @param {Object} infosPersonnelles - Informations personnelles (optionnel)
 * @param {boolean} forceSmhSeul - Forcer le mode SMH seul
 * @param {Object} stateParam - State à utiliser (optionnel, utilise defaultState si non fourni)
 */
export function genererPDFArretees(data, infosPersonnelles = {}, forceSmhSeul = false, stateParam = null) {
    const jsPDF = (typeof window !== 'undefined' && window.jsPDF) ||
        (window.jspdf && (window.jspdf.jsPDF || window.jspdf.default?.jsPDF));
    
    if (!jsPDF) {
        throw new Error('Bibliothèque PDF non chargée');
    }
    
    // Utiliser le state fourni ou le state par défaut
    const state = stateParam || defaultState;
    
    // CORRECTION BUG : Forcer le mode SMH seul pour le PDF
    // Créer un snapshot du state pour ne pas modifier l'original
    const stateSnapshot = { ...state };
    stateSnapshot.arretesSurSMHSeul = true;
    
    // CORRECTION BUG : Utiliser le SMH seul pour le PDF avec le state synchronisé
    // Le state doit contenir experiencePro et forfait pour calculer correctement le SMH débutant
    const salaireDu = getMontantAnnuelSMHSeul(stateSnapshot);
    
    const doc = new jsPDF();
    const dateDebutObj = data.dateDebut instanceof Date ? data.dateDebut : new Date(data.dateDebut);
    const dateFinObj = data.dateFin instanceof Date ? data.dateFin : new Date(data.dateFin);
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const marginRight = pageWidth - margin;
    let yPos = margin;
    
    const checkPageBreak = (requiredSpace = 20) => {
        if (yPos + requiredSpace > pageHeight - 25) {
            doc.addPage();
            yPos = margin;
        }
    };
    
    // En-tête
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Rapport de calcul d\'arriérés de salaire', pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Convention Collective Nationale de la Métallurgie (CCNM) 2024', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`Document établi le ${todayStr}`, margin, yPos);
    yPos += 6;
    doc.setFont(undefined, 'bold');
    doc.text('Objet : Calcul d\'arriérés de salaire au titre du SMH', margin, yPos);
    yPos += 8;
    doc.setFont(undefined, 'normal');
    const classificationInfo = getActiveClassification(stateSnapshot);
    doc.text(`Classification : ${classificationInfo.groupe}${classificationInfo.classe}`, margin, yPos);
    yPos += 10;
    
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, marginRight, yPos);
    yPos += 10;
    
    checkPageBreak(30);
    
    // Section 1 : Informations du contrat
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('1. Informations du contrat', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    // Infos personnelles
    const infos = infosPersonnelles || {};
    const hasInfos = !!(infos.nomPrenom || infos.poste || infos.employeur || infos.matricule || infos.observations);
    if (hasInfos) {
        if (infos.nomPrenom) {
            // CORRECTION BUG : Utiliser splitTextToSize pour éviter les dépassements
            const nomLines = doc.splitTextToSize(`Salarié : ${infos.nomPrenom}`, pageWidth - margin * 2 - 10);
            nomLines.forEach(line => {
                doc.text(line, margin + 5, yPos);
                yPos += 6;
            });
        }
        if (infos.poste) {
            const posteLines = doc.splitTextToSize(`Poste / intitulé : ${infos.poste}`, pageWidth - margin * 2 - 10);
            posteLines.forEach(line => {
                doc.text(line, margin + 5, yPos);
                yPos += 6;
            });
        }
        if (infos.employeur) {
            const employeurLines = doc.splitTextToSize(`Employeur / raison sociale : ${infos.employeur}`, pageWidth - margin * 2 - 10);
            employeurLines.forEach(line => {
                doc.text(line, margin + 5, yPos);
                yPos += 6;
            });
        }
        if (infos.matricule) {
            doc.text(`Matricule ou N° interne : ${infos.matricule}`, margin + 5, yPos);
            yPos += 6;
        }
        if (infos.observations) {
            doc.text('Observations :', margin + 5, yPos);
            yPos += 5;
            const obsLines = doc.splitTextToSize(infos.observations, pageWidth - margin * 2 - 10);
            obsLines.forEach(line => {
                doc.text(line, margin + 5, yPos);
                yPos += 5;
            });
            yPos += 4;
        }
        yPos += 4;
    }
    
    const dateEmbaucheInput = data.dateEmbauche || document.getElementById('date-embauche-arretees')?.value;
    const dateChangementInput = data.dateChangementClassification || document.getElementById('date-changement-classification-arretees')?.value;
    const dateRuptureInput = data.dateRuptureInput || document.getElementById('date-rupture-arretees')?.value;
    
    if (dateEmbaucheInput) {
        const dateEmbaucheFormatted = new Date(dateEmbaucheInput).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        // CORRECTION BUG : Utiliser splitTextToSize pour éviter les dépassements
        const dateEmbaucheLines = doc.splitTextToSize(`Date d'embauche : ${dateEmbaucheFormatted}`, pageWidth - margin * 2 - 10);
        dateEmbaucheLines.forEach(line => {
            doc.text(line, margin + 5, yPos);
            yPos += 6;
        });
    }
    if (dateChangementInput) {
        const dateChangementFormatted = new Date(dateChangementInput).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        // CORRECTION BUG : Utiliser splitTextToSize pour éviter les dépassements
        const dateChangementLines = doc.splitTextToSize(`Date de changement de classification : ${dateChangementFormatted}`, pageWidth - margin * 2 - 10);
        dateChangementLines.forEach(line => {
            doc.text(line, margin + 5, yPos);
            yPos += 6;
        });
    }
    if (data.ruptureContrat && dateRuptureInput) {
        const dateRuptureFormatted = new Date(dateRuptureInput).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        // CORRECTION BUG : Utiliser splitTextToSize pour éviter les dépassements
        const dateRuptureLines = doc.splitTextToSize(`Date de rupture du contrat : ${dateRuptureFormatted}`, pageWidth - margin * 2 - 10);
        dateRuptureLines.forEach(line => {
            doc.text(line, margin + 5, yPos);
            yPos += 6;
        });
    } else if (!data.ruptureContrat) {
        doc.text('Statut du contrat : En cours', margin + 5, yPos);
        yPos += 6;
    }
    if (data.accordEcrit) {
        doc.text('Accord écrit avec l\'employeur : Oui', margin + 5, yPos);
        yPos += 6;
    }
    
    yPos += 5;
    checkPageBreak(30);
    
    // Section 2 : Résumé du calcul
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('2. Résumé du calcul', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    const dateDebutStr = dateDebutObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const dateFinStr = dateFinObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    
    // CORRECTION BUG : Utiliser splitTextToSize pour éviter les dépassements
    const periodeResumeLines = doc.splitTextToSize(`Période concernée : ${dateDebutStr} au ${dateFinStr}`, pageWidth - margin * 2 - 10);
    periodeResumeLines.forEach(line => {
        doc.text(line, margin + 5, yPos);
        yPos += 6;
    });
    doc.text(`Nombre de mois avec arriérés : ${data.detailsArretees.length}`, margin + 5, yPos);
    yPos += 6;
    
    // CORRECTION BUG : Utiliser le SMH seul calculé ci-dessus avec le state synchronisé
    const smhMensuel = salaireDu / (stateSnapshot.nbMois || 12);
    
    // Afficher le SMH avec détail si cadre débutant
    const classificationInfoForSMH = getActiveClassification(stateSnapshot);
    const isCadreDebutant = (classificationInfoForSMH.classe === 11 || classificationInfoForSMH.classe === 12) && stateSnapshot.experiencePro < 6;
    
    doc.text(`SMH mensuel brut : ${formatMoneyPDF(smhMensuel)}`, margin + 5, yPos);
    yPos += 6;
    
    // CORRECTION BUG : Afficher le SMH annuel avec indication barème débutants si applicable
    let smhAnnuelLabel = 'SMH annuel brut';
    if (isCadreDebutant) {
        let trancheLabel = '< 2 ans';
        if (stateSnapshot.experiencePro >= 4) trancheLabel = '4 à 6 ans';
        else if (stateSnapshot.experiencePro >= 2) trancheLabel = '2 à 4 ans';
        smhAnnuelLabel = `SMH annuel brut (barème débutants ${trancheLabel})`;
    }
    
    // CORRECTION BUG : Utiliser splitTextToSize pour éviter les dépassements
    const smhLabelLines = doc.splitTextToSize(`${smhAnnuelLabel} : ${formatMoneyPDF(salaireDu)}`, pageWidth - margin * 2 - 10);
    smhLabelLines.forEach(line => {
        doc.text(line, margin + 5, yPos);
        yPos += 6;
    });
    yPos += 6;
    doc.setFont(undefined, 'bold');
    doc.setTextColor(9, 105, 218);
    // CORRECTION BUG : Utiliser splitTextToSize pour éviter les dépassements
    const totalArreteesLines = doc.splitTextToSize(`Total des arriérés (mensuels cumulés) : ${formatMoneyPDF(data.totalArretees)}`, pageWidth - margin * 2 - 10);
    totalArreteesLines.forEach(line => {
        doc.text(line, margin + 5, yPos);
        yPos += 6;
    });
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    yPos += 10;
    
    checkPageBreak(40);
    
    // Section 3 : Détail des arriérés
    const detailsPourPdf = (data.detailsArretees || []).filter(d => d.difference > 0);
    if (detailsPourPdf.length > 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('3. Détail des arriérés par période', margin, yPos);
        yPos += 8;
        
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        
        // CORRECTION BUG : Colonnes avec largeurs adaptées pour éviter les dépassements
        const colWidths = {
            periode: 40,
            salairePerçu: 45,
            salaireDu: 45,
            arrieres: 40
        };
        
        // CORRECTION BUG : Utiliser splitTextToSize pour les en-têtes de colonnes si nécessaire
        doc.text('Période', margin + 5, yPos);
        const salairePerçuHeaderLines = doc.splitTextToSize('Salaire brut perçu', colWidths.salairePerçu - 2);
        salairePerçuHeaderLines.forEach((line, idx) => {
            doc.text(line, margin + 5 + colWidths.periode, yPos + (idx * 5));
        });
        const smhDuHeaderLines = doc.splitTextToSize('SMH mensuel dû', colWidths.salaireDu - 2);
        smhDuHeaderLines.forEach((line, idx) => {
            doc.text(line, margin + 5 + colWidths.periode + colWidths.salairePerçu, yPos + (idx * 5));
        });
        doc.text('Arriérés', margin + 5 + colWidths.periode + colWidths.salairePerçu + colWidths.salaireDu, yPos);
        // Ajuster yPos selon le nombre maximum de lignes dans les en-têtes
        const maxHeaderLines = Math.max(1, salairePerçuHeaderLines.length, smhDuHeaderLines.length);
        yPos += Math.max(5, (maxHeaderLines - 1) * 5);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin + 5, yPos, marginRight - 5, yPos);
        yPos += 6;
        doc.setFont(undefined, 'normal');
        
        detailsPourPdf.forEach((detail) => {
            checkPageBreak(12);
            
            // CORRECTION BUG : Utiliser splitTextToSize pour les périodes longues
            const periodeDetailLines = doc.splitTextToSize(detail.periode, colWidths.periode - 5);
            
            let startY = yPos;
            periodeDetailLines.forEach((line, idx) => {
                doc.text(line, margin + 5, startY + (idx * 5));
            });
            
            // CORRECTION BUG : Utiliser splitTextToSize pour les montants si nécessaire
            const salairePerçuText = formatMoneyPDF(detail.salaireMensuelReel);
            const salaireDuText = formatMoneyPDF(detail.salaireMensuelDu);
            const arrieresText = formatMoneyPDF(detail.difference);
            
            // Vérifier si les montants dépassent et utiliser splitTextToSize si nécessaire
            const salairePerçuLines = doc.splitTextToSize(salairePerçuText, colWidths.salairePerçu - 2);
            const salaireDuLines = doc.splitTextToSize(salaireDuText, colWidths.salaireDu - 2);
            const arrieresLines = doc.splitTextToSize(arrieresText, colWidths.arrieres - 2);
            
            const maxLines = Math.max(periodeDetailLines.length, salairePerçuLines.length, salaireDuLines.length, arrieresLines.length);
            
            salairePerçuLines.forEach((line, idx) => {
                doc.text(line, margin + 5 + colWidths.periode, yPos + (idx * 5));
            });
            salaireDuLines.forEach((line, idx) => {
                doc.text(line, margin + 5 + colWidths.periode + colWidths.salairePerçu, yPos + (idx * 5));
            });
            doc.setTextColor(9, 105, 218);
            doc.setFont(undefined, 'bold');
            arrieresLines.forEach((line, idx) => {
                doc.text(line, margin + 5 + colWidths.periode + colWidths.salairePerçu + colWidths.salaireDu, yPos + (idx * 5));
            });
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
            
            yPos += Math.max(6, maxLines * 5);
        });
    }
    
    yPos += 10;
    checkPageBreak(50);
    
    // Section 4 : Informations légales
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('4. Informations légales', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    const legalText = [
        'Ce rapport est établi sur la base du Salaire Minimum Hiérarchique (SMH) défini par la Convention Collective Nationale de la Métallurgie (CCNM) 2024.',
        'Les calculs sont effectués selon les règles conventionnelles en vigueur.',
        'En France, la prescription est de 3 ans. Les arriérés au-delà de cette période ne sont généralement pas réclamables.',
        'Ce document est indicatif et ne remplace pas un conseil juridique professionnel.'
    ];
    
    legalText.forEach(text => {
        checkPageBreak(15);
        // CORRECTION BUG : Utiliser splitTextToSize pour toutes les lignes légales
        const lines = doc.splitTextToSize(text, pageWidth - margin * 2 - 10);
        lines.forEach(line => {
            doc.text(line, margin + 5, yPos);
            yPos += 5;
        });
        yPos += 3;
    });
    
    yPos += 10;
    checkPageBreak(60);
    
    // Section 5 : Méthodologie de calcul
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('5. Méthodologie de calcul', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    const methodologyText = [
        'Conformément à la CCN Métallurgie (IDCC 3248), dispositions relatives aux SMH et à leur assiette, le rapport PDF est toujours établi sur la base du SMH (option « SMH seul » forcée).',
        'SMH de base, majoration forfait, répartition 12/13 mois (13e mois en novembre si accord Kuhn). Accord Kuhn : prime ancienneté, prime vacances, 13e mois — mentionnés pour contexte, mais le salaire dû retenu dans le PDF = assiette SMH uniquement (base + forfait, hors primes). L\'ancienneté n\'affecte pas l\'assiette SMH.',
        'Calcul rétrospectif mois par mois : pour chaque mois, le salaire dû = assiette SMH ; comparé au salaire perçu (hors primes). Sources et références : CCN Métallurgie (IDCC 3248), SMH et assiette ; Code du travail art. L.3245-1 ; Accord Kuhn si pertinent.'
    ];
    
    methodologyText.forEach(text => {
        checkPageBreak(20);
        // CORRECTION BUG : Utiliser splitTextToSize pour éviter les dépassements
        const lines = doc.splitTextToSize(text, pageWidth - margin * 2 - 10);
        lines.forEach(line => {
            doc.text(line, margin + 5, yPos);
            yPos += 5;
        });
        yPos += 3;
    });
    
    yPos += 10;
    checkPageBreak(80);
    
    // Section 6 : Méthodes de calcul détaillées
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('6. Méthodes de calcul détaillées', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    // Principe
    doc.setFont(undefined, 'bold');
    const principeLines = doc.splitTextToSize('Principe : Conformément à la convention collective nationale de la métallurgie (IDCC 3248), dispositions relatives aux salaires minima hiérarchiques et à leur assiette, ce rapport est établi uniquement sur la base du SMH (assiette conventionnelle hors primes).', pageWidth - margin * 2 - 10);
    principeLines.forEach(line => {
        doc.text(line, margin + 5, yPos);
        yPos += 5;
    });
    yPos += 2;
    doc.setFont(undefined, 'normal');
    const principeDetailLines = doc.splitTextToSize('Pour chaque mois, le salaire dû = assiette SMH (base + majorations forfait), comparé au salaire perçu (hors primes). L\'assiette SMH ne dépend pas de l\'ancienneté.', pageWidth - margin * 2 - 10);
    principeDetailLines.forEach(line => {
        doc.text(line, margin + 5, yPos);
        yPos += 5;
    });
    yPos += 5;
    
    // Période
    doc.setFont(undefined, 'bold');
    doc.text('Période :', margin + 5, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');
    const periodeMethodLines = doc.splitTextToSize('Date de début (embauche / changement de classification / 01/01/2024 / prescription 3 ans), date de fin (rupture ou aujourd\'hui).', pageWidth - margin * 2 - 10);
    periodeMethodLines.forEach(line => {
        doc.text(line, margin + 5, yPos);
        yPos += 5;
    });
    yPos += 5;
    
    // Calcul du salaire mensuel dû
    doc.setFont(undefined, 'bold');
    doc.text('Calcul du salaire mensuel dû :', margin + 5, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');
    const calculSalaireLines = doc.splitTextToSize('Le salaire dû retenu dans ce rapport = assiette SMH uniquement (base + forfait ; inclus : base, forfaits cadres, 13e mois ; exclus : primes ancienneté, prime vacances, majorations pénibilité/nuit/dimanche/équipe). Répartition 12 ou 13 mois (13e mois en novembre si Kuhn).', pageWidth - margin * 2 - 10);
    calculSalaireLines.forEach(line => {
        doc.text(line, margin + 5, yPos);
        yPos += 5;
    });
    yPos += 5;
    
    // Formule
    doc.setFont(undefined, 'bold');
    doc.text('Formule :', margin + 5, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');
    // CORRECTION BUG : Utiliser splitTextToSize pour la formule longue
    const formuleText = 'Arriérés(mois) = max(0 ; Salaire mensuel dû(mois) − Salaire mensuel perçu(mois)) ; total = somme sur tous les mois.';
    const formuleLines = doc.splitTextToSize(formuleText, pageWidth - margin * 2 - 10);
    formuleLines.forEach(line => {
        doc.text(line, margin + 5, yPos);
        yPos += 5;
    });
    yPos += 5;
    
    // Base de calcul
    doc.setFont(undefined, 'bold');
    const baseCalculLabelLines = doc.splitTextToSize('Base de calcul du rapport : assiette SMH', pageWidth - margin * 2 - 10);
    baseCalculLabelLines.forEach(line => {
        doc.text(line, margin + 5, yPos);
        yPos += 5;
    });
    yPos += 2;
    doc.setFont(undefined, 'normal');
    const baseCalculLines = doc.splitTextToSize('Conformément à la CCN Métallurgie (IDCC 3248), dispositions relatives à l\'assiette SMH (inclus / exclus). Ce rapport retient uniquement l\'assiette SMH comme salaire dû. Les salaires saisis pour la comparaison sont les salaires mensuels bruts hors primes.', pageWidth - margin * 2 - 10);
    baseCalculLines.forEach(line => {
        doc.text(line, margin + 5, yPos);
        yPos += 5;
    });
    yPos += 5;
    
    // Références
    doc.setFont(undefined, 'bold');
    doc.text('Références :', margin + 5, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');
    const referencesLines = doc.splitTextToSize('Convention collective nationale de la métallurgie (IDCC 3248), dispositions relatives aux salaires minima hiérarchiques et à leur assiette ; Code du travail, art. L.3245-1 ; Accord Kuhn si pertinent.', pageWidth - margin * 2 - 10);
    referencesLines.forEach(line => {
        doc.text(line, margin + 5, yPos);
        yPos += 5;
    });
    
    // Pied de page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`Page ${i} / ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
    
    // Sauvegarder le PDF
    const fileName = `arrieres_salaire_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    return doc;
}
