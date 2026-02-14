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
import { getActiveAgreement } from '../agreements/AgreementLoader.js';
import { getPrimes } from '../agreements/AgreementInterface.js';

/**
 * Générer le PDF des arriérés
 * @param {Object} data - Données des arriérés
 * @param {Object} infosPersonnelles - Informations personnelles (optionnel)
 * @param {boolean} [forceSmhSeul] - Ignoré ; le mode SMH seul est exigé via state.arretesSurSMHSeul
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
    const hasAccord = !!(state.accordActif || state.accordId);

    // Conformité CCN : le rapport PDF ne peut être généré qu'en mode « SMH seul »
    if (!state.arretesSurSMHSeul) {
        throw new Error('Le rapport PDF ne peut être généré qu\'en mode « SMH seul ». Cochez l\'option et recalculez les arriérés.');
    }

    // Utiliser le state tel quel (salaire dû = assiette SMH)
    const salaireDu = getMontantAnnuelSMHSeul(state);
    
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
    const classificationInfo = getActiveClassification(state);
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
    const smhMensuel = salaireDu / (state.nbMois || 12);
    
    // Afficher le SMH avec détail si cadre débutant
    const classificationInfoForSMH = getActiveClassification(state);
    const isCadreDebutant = (classificationInfoForSMH.classe === 11 || classificationInfoForSMH.classe === 12) && state.experiencePro < 6;
    
    doc.text(`SMH mensuel brut : ${formatMoneyPDF(smhMensuel)}`, margin + 5, yPos);
    yPos += 6;
    
    // CORRECTION BUG : Afficher le SMH annuel avec indication barème débutants si applicable
    let smhAnnuelLabel = 'SMH annuel brut';
    if (isCadreDebutant) {
        let trancheLabel = '< 2 ans';
        if (state.experiencePro >= 4) trancheLabel = '4 à 6 ans';
        else if (state.experiencePro >= 2) trancheLabel = '2 à 4 ans';
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
        
        const colWidths = {
            periode: 52,
            salairePerçu: 50,
            salaireDu: 50,
            arrieres: 52
        };
        
        doc.text('Période', margin + 5, yPos);
        doc.text('Salaire brut perçu', margin + 5 + colWidths.periode, yPos);
        doc.text('SMH mensuel dû', margin + 5 + colWidths.periode + colWidths.salairePerçu, yPos);
        doc.text('Arriérés', margin + 5 + colWidths.periode + colWidths.salairePerçu + colWidths.salaireDu, yPos);
        doc.setDrawColor(200, 200, 200);
        const headerLineY = yPos + 4;
        doc.line(margin, headerLineY, marginRight, headerLineY);
        yPos = headerLineY + 5;
        doc.setFont(undefined, 'normal');
        
        detailsPourPdf.forEach((detail) => {
            checkPageBreak(12);
            const salairePerçuText = formatMoneyPDF(detail.salaireMensuelReel);
            const salaireDuText = formatMoneyPDF(detail.salaireMensuelDu);
            const arrieresText = formatMoneyPDF(detail.difference);
            doc.text(detail.periode, margin + 5, yPos);
            doc.text(salairePerçuText, margin + 5 + colWidths.periode, yPos);
            doc.text(salaireDuText, margin + 5 + colWidths.periode + colWidths.salairePerçu, yPos);
            doc.setTextColor(9, 105, 218);
            doc.setFont(undefined, 'bold');
            doc.text(arrieresText, margin + 5 + colWidths.periode + colWidths.salairePerçu + colWidths.salaireDu, yPos);
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
            yPos += 6;
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

    // Section 4b (si accord) : Conditions de l'accord d'entreprise
    if (hasAccord) {
        const agreement = getActiveAgreement();
        if (agreement) {
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(`Conditions de l'accord d'entreprise (${agreement.nomCourt})`, margin, yPos);
            yPos += 8;
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            const primes = getPrimes(agreement);
            if (primes && primes.length > 0) {
                doc.setFont(undefined, 'bold');
                const primesTitleLines = doc.splitTextToSize('Primes :', pageWidth - margin * 2 - 10);
                primesTitleLines.forEach(line => {
                    doc.text(line, margin + 5, yPos);
                    yPos += 5;
                });
                doc.setFont(undefined, 'normal');
                primes.forEach(p => {
                    const desc = p.label + (p.valeurAccord != null ? ` (+${p.valeurAccord} ${p.unit})` : '');
                    const lines = doc.splitTextToSize('• ' + desc, pageWidth - margin * 2 - 15);
                    lines.forEach(line => {
                        doc.text(line, margin + 5, yPos);
                        yPos += 5;
                    });
                });
                yPos += 3;
            }
            if (agreement.majorations) {
                doc.setFont(undefined, 'bold');
                const majTitleLines = doc.splitTextToSize('Majorations (nuit, dimanche, etc.) :', pageWidth - margin * 2 - 10);
                majTitleLines.forEach(line => {
                    doc.text(line, margin + 5, yPos);
                    yPos += 5;
                });
                doc.setFont(undefined, 'normal');
                const majLines = doc.splitTextToSize(
                    (agreement.majorations.nuit ? 'Nuit selon type de poste ; ' : '') +
                    (agreement.majorations.dimanche != null ? 'Dimanche selon accord.' : ''),
                    pageWidth - margin * 2 - 10
                );
                majLines.forEach(line => {
                    doc.text(line, margin + 5, yPos);
                    yPos += 5;
                });
                yPos += 3;
            }
            if (agreement.anciennete) {
                const ancText = `Ancienneté : seuil ${agreement.anciennete.seuil ?? '—'} ans ; barème selon accord.`;
                const ancLines = doc.splitTextToSize(ancText, pageWidth - margin * 2 - 10);
                ancLines.forEach(line => {
                    doc.text(line, margin + 5, yPos);
                    yPos += 5;
                });
            }
            yPos += 8;
            checkPageBreak(30);
        }
    }

    // Section 5 : Méthodologie de calcul
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('5. Méthodologie de calcul', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    // Texte méthodologie dynamique selon les primes de l'accord
    const moisNomsPDF = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    let methodologyText;
    if (hasAccord) {
        const agr = getActiveAgreement();
        const agrPrimes = agr ? getPrimes(agr) : [];
        const primesSmh = agrPrimes.filter(p => p.inclusDansSMH === true);
        const moisVers13e = agr?.repartition13Mois?.moisVersement;
        const mois13eStr = moisVers13e ? moisNomsPDF[moisVers13e - 1] : 'selon accord';
        const incluesStr = primesSmh.length > 0
            ? primesSmh.map(p => p.label.toLowerCase()).join(', ') + ', 13e mois'
            : '13e mois';
        methodologyText = [
            'Conformément à la CCN Métallurgie (IDCC 3248), Art. 140 relatif à l\'assiette des SMH, le rapport PDF est établi sur la base du SMH (option « SMH seul » obligatoire).',
            `Assiette SMH : base + forfait cadres + primes incluses (Art. 140 : ${incluesStr}). Répartition 12/13 mois (13e mois en ${mois13eStr} si accord d'entreprise). Exclues de l'assiette : prime d'ancienneté, majorations nuit/dimanche/équipe/pénibilité.`,
            'Calcul rétrospectif mois par mois : salaire dû = assiette SMH avec primes incluses versées dans leur mois ; comparé au salaire perçu (incluant les mêmes éléments). Sources : CCN Métallurgie (IDCC 3248), Art. 140 ; Code du travail art. L.3245-1 ; accord d\'entreprise si pertinent.'
        ];
    } else {
        methodologyText = [
            'Conformément à la CCN Métallurgie (IDCC 3248), Art. 140 relatif à l\'assiette des SMH, le rapport PDF est établi sur la base du SMH (option « SMH seul » obligatoire).',
            'Assiette SMH : base + forfait cadres. Répartition 12 mois. Exclues : prime d\'ancienneté, majorations nuit/dimanche/pénibilité.',
            'Calcul rétrospectif mois par mois : salaire dû = assiette SMH ; comparé au salaire perçu. Sources : CCN Métallurgie (IDCC 3248), Art. 140 ; Code du travail art. L.3245-1.'
        ];
    }
    
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
    
    // Principe (texte dynamique selon les primes incluses dans le SMH)
    doc.setFont(undefined, 'bold');
    const agrPrincipe = hasAccord ? getActiveAgreement() : null;
    const primesSmhPrincipe = agrPrincipe ? getPrimes(agrPrincipe).filter(p => p.inclusDansSMH === true) : [];
    const incluesPrincipeStr = primesSmhPrincipe.length > 0
        ? primesSmhPrincipe.map(p => p.label.toLowerCase()).join(', ') + ', 13e mois'
        : '13e mois';
    const principeLines = doc.splitTextToSize(`Principe : Conformément à la CCN Métallurgie (IDCC 3248), Art. 140, ce rapport est établi sur la base du SMH. L'assiette SMH inclut les compléments salariaux annuels (${incluesPrincipeStr}) et exclut la prime d'ancienneté et les majorations de conditions de travail.`, pageWidth - margin * 2 - 10);
    principeLines.forEach(line => {
        doc.text(line, margin + 5, yPos);
        yPos += 5;
    });
    yPos += 2;
    doc.setFont(undefined, 'normal');
    const principeDetailLines = doc.splitTextToSize('Pour chaque mois, le salaire dû = assiette SMH (base + forfait + primes incluses Art. 140), comparé au salaire perçu (incluant les mêmes éléments). L\'ancienneté est exclue de l\'assiette et s\'ajoute au minimum garanti.', pageWidth - margin * 2 - 10);
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
    let calculSalaireText;
    if (hasAccord) {
        const agrCalc = getActiveAgreement();
        const agrPrimesCalc = agrCalc ? getPrimes(agrCalc) : [];
        const primesSmhCalc = agrPrimesCalc.filter(p => p.inclusDansSMH === true);
        const moisVers13eCalc = agrCalc?.repartition13Mois?.moisVersement;
        const mois13eStrCalc = moisVers13eCalc ? moisNomsPDF[moisVers13eCalc - 1] : 'selon accord';
        const incluesCalc = primesSmhCalc.length > 0
            ? primesSmhCalc.map(p => p.label.toLowerCase()).join(', ') + ', 13e mois'
            : '13e mois';
        // Exemple dynamique : primes avec moisVersement
        const exempleMois = primesSmhCalc.filter(p => p.moisVersement).map(p => `${p.label.toLowerCase()} en ${moisNomsPDF[p.moisVersement - 1]}`).join(', ');
        const exempleStr = exempleMois ? ` Primes incluses versées dans leur mois (${exempleMois}).` : '';
        calculSalaireText = `Salaire dû = assiette SMH Art. 140 (inclus : base, forfaits cadres, ${incluesCalc} ; exclus : prime d'ancienneté, majorations pénibilité/nuit/dimanche/équipe).${exempleStr} Répartition 12 ou 13 mois (13e mois en ${mois13eStrCalc} si accord d'entreprise).`;
    } else {
        calculSalaireText = 'Salaire dû = assiette SMH Art. 140 (inclus : base, forfaits cadres ; exclus : prime d\'ancienneté, majorations pénibilité/nuit/dimanche/équipe). Répartition 12 mois.';
    }
    const calculSalaireLines = doc.splitTextToSize(calculSalaireText, pageWidth - margin * 2 - 10);
    calculSalaireLines.forEach(line => {
        doc.text(line, margin + 5, yPos);
        yPos += 5;
    });
    yPos += 5;
    
    // Formule (deux lignes explicites pour éviter une coupure mal placée)
    doc.setFont(undefined, 'bold');
    doc.text('Formule :', margin + 5, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');
    doc.text('Arriérés(mois) = max(0 ; Salaire mensuel dû(mois) - Salaire mensuel perçu(mois))', margin + 5, yPos);
    yPos += 5;
    doc.text('total = somme sur tous les mois.', margin + 5, yPos);
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
    const baseCalculLines = doc.splitTextToSize('Conformément à la CCN Métallurgie (IDCC 3248), Art. 140 relatif à l\'assiette SMH. Ce rapport retient l\'assiette SMH comme salaire dû, incluant les compléments salariaux annuels (Art. 140) et excluant la prime d\'ancienneté et les majorations de conditions de travail. Les salaires saisis incluent les mêmes éléments.', pageWidth - margin * 2 - 10);
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
    const referencesText = hasAccord
        ? 'Convention collective nationale de la métallurgie (IDCC 3248), dispositions relatives aux salaires minima hiérarchiques et à leur assiette ; Code du travail, art. L.3245-1 ; accord d\'entreprise si pertinent.'
        : 'Convention collective nationale de la métallurgie (IDCC 3248), dispositions relatives aux salaires minima hiérarchiques et à leur assiette ; Code du travail, art. L.3245-1.';
    const referencesLines = doc.splitTextToSize(referencesText, pageWidth - margin * 2 - 10);
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
