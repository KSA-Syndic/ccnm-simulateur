/**
 * ============================================
 * STATE - État Global de l'Application
 * ============================================
 * 
 * Centralise toutes les valeurs saisies par l'utilisateur.
 */

/**
 * État global de l'application
 */
export const state = {
    // === WIZARD ===
    currentStep: 1,              // Étape actuelle du wizard
    modeClassification: null,    // 'direct' ou 'estimation'
    
    // === ARRIÉRÉS ===
    salairesParMois: {},         // { '2024-01': 24000, '2024-02': 24000, ... }
    dateEmbaucheArretees: null,
    dateChangementClassificationArretees: null,
    ruptureContratArretees: false,
    dateRuptureArretees: null,
    accordEcritArretees: false,
    arretesSurSMHSeul: true,     // true = salaire dû = assiette SMH (base + forfait ; exclut primes, pénibilité, nuit/dim/équipe)
    
    // === CLASSIFICATION ===
    scores: [1, 1, 1, 1, 1, 1],  // Scores des 6 critères (1-10)
    modeManuel: false,           // Mode automatique par défaut
    groupeManuel: 'A',           // Groupe sélectionné manuellement
    classeManuel: 1,             // Classe sélectionnée manuellement
    
    // === SITUATION ===
    anciennete: 0,               // Ancienneté (Non-Cadres)
    pointTerritorial: 5.90,      // Valeur du Point Territorial - Bas-Rhin (2025)
    forfait: '35h',              // Type de forfait (Cadres)
    experiencePro: 0,            // Expérience professionnelle (Barème débutants F11/F12)
    
    // === CONDITIONS DE TRAVAIL (Non-Cadres) ===
    typeNuit: 'aucun',           // 'aucun', 'poste-nuit', 'poste-matin'
    heuresNuit: 0,               // Heures de nuit mensuelles
    travailDimanche: false,      // Travail le dimanche
    heuresDimanche: 0,           // Heures dimanche mensuelles
    
    // === ACCORD ENTREPRISE (générique, listable) ===
    accordActif: false,          // Accord d'entreprise activé
    accordId: null,              // ID de l'accord actif (ex: 'kuhn')
    /** Entrées utilisateur par élément d'accord. Clés fournies par l'accord (stateKeyActif, stateKeyHeures). Vide au démarrage ; hydraté par hydrateAccordInputs(agreement, state) quand un accord est chargé/activé. */
    accordInputs: {},
    
    // === AFFICHAGE ===
    nbMois: 12                   // Répartition mensuelle (12 ou 13 mois)
};

/**
 * Source de vérité unique pour les données PDF arriérés (étape 4).
 * Remplit uniquement par calculerArreteesFinal / afficherResultatsArreteesFinal,
 * vidé par invalidateArreteesDataFinal.
 */
export let arreteesPdfStore = null;

/**
 * Définir le store PDF arriérés
 * @param {Object|null} data - Données PDF ou null pour vider
 */
export function setArreteesPdfStore(data) {
    arreteesPdfStore = data;
}

/**
 * Obtenir le store PDF arriérés
 * @returns {Object|null} Données PDF ou null
 */
export function getArreteesPdfStore() {
    return arreteesPdfStore;
}
