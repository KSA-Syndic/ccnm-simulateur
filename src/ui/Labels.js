/**
 * ============================================
 * LABELS - Centralisation des Labels et Textes
 * ============================================
 * 
 * Centralisation des labels et textes de l'interface selon les principes de rédaction.
 */

import { formatAcronym, resetAcronymsRegistry } from '../utils/textHelpers.js';

/** URL des textes conventionnels (source officielle UIMM). Centraliser ici pour tooltip header et autres liens. */
export const CONVENTION_URL = 'https://uimm.lafabriquedelavenir.fr/textes-conventionnels-metallurgie/';

/**
 * Labels de l'interface (phrases courtes et justes)
 */

export const LABELS = {
    // Header
    headerTitle: 'Simulateur Métallurgie 2024',
    headerSubtitle: 'Classification et Rémunération',
    headerInfoTooltip: 'Ce simulateur vous aide à estimer votre niveau de classification et à vérifier que votre salaire respecte au minimum les barèmes de la convention collective de la métallurgie (CCN).',
    headerInfoTooltipLinkText: 'Voir les textes de la convention',

    // Steps
    step1Title: 'Classification',
    step2Title: 'Situation',
    step3Title: 'Résultat',
    step4Title: 'Arriérés',
    
    // Classification
    connaisClasse: 'Oui, je la connais',
    connaisClasseDesc: 'Je saisis directement ma classification',
    estimerClasse: 'Non, je veux l\'estimer',
    estimerClasseDesc: 'Je réponds aux 6 critères classants',
    
    // Situation
    anciennete: 'Ancienneté dans l\'entreprise',
    ancienneteUnit: 'ans',
    pointTerritorial: 'Valeur du Point Territorial',
    pointTerritorialUnit: '€',
    forfait: 'Type de forfait',
    experiencePro: 'Expérience professionnelle totale',
    experienceProUnit: 'ans',
    
    // Conditions de travail
    conditionsTravail: 'Conditions de travail particulières',
    travailNuit: 'Travail de nuit',
    heuresNuit: 'Heures de nuit/mois',
    travailDimanche: 'Travail le dimanche',
    heuresDimanche: 'Heures dimanche/mois',
    travailEquipe: 'Travail en équipes postées',
    heuresEquipe: 'Heures équipe/mois',
    
    // Résultat
    resultatAnnuel: 'par an',
    resultatMensuel: 'par mois',
    detailCalcul: 'Détail du calcul',
    evolutionInflation: 'Évolution vs inflation',
    
    // Arriérés
    calculerArretees: 'Calculer mes arriérés',
    dateEmbauche: 'Date d\'embauche',
    dateChangementClassification: 'Date de changement de classification',
    ruptureContrat: 'Le contrat est rompu',
    dateRupture: 'Date de rupture du contrat',
    accordEcrit: 'Un accord écrit existe avec l\'employeur concernant la classification',
    smhSeul: 'Calculer les arriérés sur le SMH seul',
    
    // Footer
    footerText: 'Convention Collective Nationale de la Métallurgie (CCNM) 2024',
    footerDisclaimer: 'Outil indicatif',
    footerCredit: 'Réalisé par CFDT Kuhn'
};

/**
 * Obtenir un label formaté avec gestion des acronymes
 * @param {string} key - Clé du label
 * @param {boolean} forceAcronymExplanation - Forcer l'explication de l'acronyme
 * @returns {string} Label formaté
 */
export function getLabel(key, forceAcronymExplanation = false) {
    const label = LABELS[key] || key;
    
    // Gérer les acronymes dans le label
    if (label.includes('CCN') || label.includes('CCNM') || label.includes('SMH')) {
        return formatAcronym(label, forceAcronymExplanation);
    }
    
    return label;
}

/**
 * Réinitialiser le registre des acronymes (utile pour les tests)
 */
export function resetLabels() {
    resetAcronymsRegistry();
}
