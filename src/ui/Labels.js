/**
 * ============================================
 * LABELS - Centralisation des Labels et Textes
 * ============================================
 * 
 * Centralisation des labels et textes de l'interface selon les principes de rédaction.
 */

import { formatAcronym, resetAcronymsRegistry } from '../utils/textHelpers.js';
import { CONFIG } from '../core/config.js';

const CURRENT_DATA_YEAR = CONFIG.CURRENT_DATA_YEAR;

/** URL des textes conventionnels (source officielle UIMM). Centraliser ici pour tooltip header et autres liens. */
export const CONVENTION_URL = 'https://uimm.lafabriquedelavenir.fr/textes-conventionnels-metallurgie/';

/**
 * Labels de l'interface (phrases courtes et justes)
 */

export const LABELS = {
    // Header
    headerTitle: `Simulateur Métallurgie ${CURRENT_DATA_YEAR}`,
    headerSubtitle: 'Classification et Rémunération',
    conventionLabel: 'Convention collective de la métallurgie (CCN)',
    headerInfoTooltip: 'Ce simulateur vous aide à estimer votre niveau de classification et à vérifier que votre salaire respecte au minimum les barèmes de la convention collective de la métallurgie (CCN).',
    headerInfoTooltipLinkText: 'Voir les textes de la convention',

    // Steps
    step1Title: 'Classification',
    step2Title: 'Situation',
    step3Title: 'Résultat',
    step4Title: 'Arriérés',
    
    // Classification
    step1aPageTitle: 'Connaissez-vous votre classification ?',
    step1aPageSubtitle: 'Elle figure sur votre fiche de paie (ex: F11, D7, A1...)',
    step1bPageTitle: 'Votre classification',
    step1bPageSubtitle: 'Sélectionnez votre groupe et classe',
    step1cPageTitle: 'Estimation de votre classification',
    step1cPageSubtitle: 'Évaluez votre poste sur les 6 critères (de 1 à 10)',
    connaisClasse: 'Oui, je la connais',
    connaisClasseDesc: 'Je saisis directement ma classification',
    estimerClasse: 'Non, je veux l\'estimer',
    estimerClasseDesc: 'Je réponds aux 6 critères classants',
    
    // Situation
    step2PageTitle: 'Votre situation',
    step2PageSubtitle: 'Renseignez vos informations pour affiner le calcul',
    anciennete: 'Ancienneté dans l\'entreprise',
    ancienneteUnit: 'ans',
    pointTerritorial: 'Valeur du Point Territorial',
    pointTerritorialUnit: '€',
    forfait: 'Type de forfait',
    experiencePro: 'Expérience professionnelle totale',
    experienceProUnit: 'ans',
    
    // Conditions de travail
    conditionsTravail: 'Conditions de travail particulières',
    travailTempsPartiel: 'Temps partiel',
    travailNuit: 'Travail de nuit',
    heuresNuit: 'Heures de nuit/mois',
    travailDimanche: 'Travail le dimanche',
    heuresDimanche: 'Heures dimanche/mois',
    travailHeuresSup: 'Heures supplémentaires',
    heuresSup: 'Heures supplémentaires/mois',
    joursSupForfait: 'Jours supplémentaires',
    travailEquipe: 'Travail en équipes postées',
    heuresEquipe: 'Heures équipe/mois',
    /** Préfixe des tooltips pour les modalités spécifiques à l'accord d'entreprise (nuit, dimanche, primes). */
    tooltipPrefixAccordOnly: "<strong>Spécifique à l'accord d'entreprise.</strong> <br>",

    // Résultat
    resultPageTitle: 'Votre salaire',
    resultPageSubtitle: 'Rémunération globale due par votre employeur (salaire minima, primes et majorations).',
    resultAccordToggle: 'Appliquer l\'accord d\'entreprise',
    resultatAnnuel: 'bruts / an',
    resultatMensuel: 'bruts / mois',
    detailCalcul: 'Détail du calcul',
    smhIncludedOriginLabel: 'Incluse dans le salaire minima (Art. 140 CCN) — ne s\'ajoute pas au total',
    evolutionInflation: '📈 Évolution vs inflation',
    resultArreteesPromptTitle: '💡 Vous pensez gagner moins que la rémunération affichée ?',
    resultArreteesPromptBody: 'Calculez vos arriérés de salaire et générez un rapport PDF pour les réclamer.',
    inflationLoading: 'Inflation : chargement...',
    smhIncludedTooltipDetailSuffix: 'Répartie dans le SMH, sans ajout au total.',
    
    // Arriérés
    step4PageTitle: 'Calcul des arriérés de salaire',
    step4PageSubtitle: 'Saisissez vos salaires réels mois par mois pour calculer précisément vos arriérés',
    arreteesWarningText: '<strong>⚠️ Important :</strong> Ce calcul est un outil d\'aide. Pour toute action juridique, consultez un avocat spécialisé en droit du travail ou votre syndicat.',
    arreteesBaseInfoTitle: 'Informations nécessaires',
    arreteesOptionsTitle: 'Options et autres informations',
    ruptureContratLabel: 'Le contrat est rompu',
    accordEcritLabel: 'Un accord écrit existe avec l\'employeur concernant la classification',
    arreteesSmhSeulLabel: 'Calculer les arriérés sur le salaire minima seul',
    arreteesSmhSeulTooltipHtml: 'Salaire dû : assiette SMH (Art. 140 CCNM). Inclus : base, forfaits, 13e mois, heures supplémentaires, primes incluses. Exclus : prime d\'ancienneté, majorations de contraintes (nuit, dimanche, équipe). Décochez pour la rémunération complète.',
    salaryCurveTitle: 'Saisie de vos salaires par mois',
    salaryCurveHelp: 'Saisissez votre salaire mensuel brut pour chaque mois. Le graphique ci-dessous montre l\'évolution du salaire dû au fil du temps.',
    timelineHelpText: 'Veuillez renseigner la date d\'embauche pour générer la courbe.',
    timelineNoPeriodText: 'Aucune période à afficher.',
    timelineChartMissingText: 'Affichage temporairement indisponible. Veuillez recharger la page.',
    arreteesSalaireBrutFullHintHtml: '<strong>Attention :</strong> Indiquez le <strong>total brut</strong> du bulletin (y compris primes) pour comparer à la rémunération complète.',
    accordDesactiveMessagePrefix: 'Les éléments suivants ne sont plus pris en compte dans le calcul : ',
    floatingSalaryPlaceholder: 'Salaire brut total du mois',
    floatingHintText: 'Appuyez sur Entrée pour valider',
    curveProgressReopenHint: '— cliquer pour rouvrir la saisie',
    calculerArretees: 'Calculer mes arriérés',
    dateEmbauche: 'Date d\'embauche',
    dateChangementClassification: 'Date de changement de classification',
    ruptureContrat: 'Le contrat est rompu',
    dateRupture: 'Date de rupture du contrat',
    accordEcrit: 'Un accord écrit existe avec l\'employeur concernant la classification',
    smhSeul: 'Calculer les arriérés sur le salaire minima seul',
    
    // Footer
    footerText: `Convention collective de la métallurgie (CCN) ${CURRENT_DATA_YEAR}`,
    footerDisclaimer: 'Outil indicatif',
    footerCredit: 'Réalisé par CFDT Kuhn',
    footerPrivacyLink: 'Politique de confidentialité'
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
