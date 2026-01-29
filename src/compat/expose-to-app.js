/**
 * ============================================
 * EXPOSE TO APP - Exposition des Fonctions pour app.js
 * ============================================
 * 
 * Expose les fonctions des nouveaux modules sur window pour que app.js puisse les utiliser.
 * Synchronise automatiquement le state de app.js vers le state des modules.
 */

import { getMontantAnnuelSMHSeul } from '../remuneration/RemunerationCalculator.js';
import { calculateAnnualRemuneration } from '../remuneration/RemunerationCalculator.js';
import { calculateSalaireDuPourMois } from '../arretees/ArreteesCalculator.js';
import { genererPDFArretees } from '../arretees/PDFGenerator.js';
import { getActiveAgreement, loadAgreement } from '../agreements/AgreementLoader.js';
import { state as moduleState } from '../core/state.js';

/**
 * Synchroniser le state de app.js vers le state des modules
 * @param {Object} appState - State de app.js
 */
function syncStateToModules(appState) {
    // Synchroniser tous les champs pertinents
    moduleState.currentStep = appState.currentStep || moduleState.currentStep;
    moduleState.modeClassification = appState.modeClassification || moduleState.modeClassification;
    moduleState.salairesParMois = appState.salairesParMois || moduleState.salairesParMois;
    moduleState.dateEmbaucheArretees = appState.dateEmbaucheArretees || moduleState.dateEmbaucheArretees;
    moduleState.dateChangementClassificationArretees = appState.dateChangementClassificationArretees || moduleState.dateChangementClassificationArretees;
    moduleState.ruptureContratArretees = appState.ruptureContratArretees !== undefined ? appState.ruptureContratArretees : moduleState.ruptureContratArretees;
    moduleState.dateRuptureArretees = appState.dateRuptureArretees || moduleState.dateRuptureArretees;
    moduleState.accordEcritArretees = appState.accordEcritArretees !== undefined ? appState.accordEcritArretees : moduleState.accordEcritArretees;
    moduleState.arretesSurSMHSeul = appState.arretesSurSMHSeul !== undefined ? appState.arretesSurSMHSeul : moduleState.arretesSurSMHSeul;
    moduleState.scores = appState.scores || moduleState.scores;
    moduleState.modeManuel = appState.modeManuel !== undefined ? appState.modeManuel : moduleState.modeManuel;
    moduleState.groupeManuel = appState.groupeManuel || moduleState.groupeManuel;
    moduleState.classeManuel = appState.classeManuel || moduleState.classeManuel;
    moduleState.anciennete = appState.anciennete !== undefined ? appState.anciennete : moduleState.anciennete;
    moduleState.pointTerritorial = appState.pointTerritorial !== undefined ? appState.pointTerritorial : moduleState.pointTerritorial;
    moduleState.forfait = appState.forfait || moduleState.forfait;
    moduleState.experiencePro = appState.experiencePro !== undefined ? appState.experiencePro : moduleState.experiencePro;
    moduleState.typeNuit = appState.typeNuit || moduleState.typeNuit;
    moduleState.heuresNuit = appState.heuresNuit !== undefined ? appState.heuresNuit : moduleState.heuresNuit;
    moduleState.travailDimanche = appState.travailDimanche !== undefined ? appState.travailDimanche : moduleState.travailDimanche;
    moduleState.heuresDimanche = appState.heuresDimanche !== undefined ? appState.heuresDimanche : moduleState.heuresDimanche;
    moduleState.travailEquipe = appState.travailEquipe !== undefined ? appState.travailEquipe : moduleState.travailEquipe;
    moduleState.heuresEquipe = appState.heuresEquipe !== undefined ? appState.heuresEquipe : moduleState.heuresEquipe;
    // Synchroniser accordKuhn (app.js) vers accordActif/accordId (modules)
    if (appState.accordKuhn !== undefined) {
        moduleState.accordActif = appState.accordKuhn;
        // Si accordKuhn est activé mais aucun accordId n'est défini, charger 'kuhn' par défaut
        if (appState.accordKuhn && !moduleState.accordId) {
            moduleState.accordId = 'kuhn';
            loadAgreement('kuhn');
        } else if (!appState.accordKuhn) {
            moduleState.accordId = null;
        }
    }
    moduleState.primeVacances = appState.primeVacances !== undefined ? appState.primeVacances : moduleState.primeVacances;
    moduleState.nbMois = appState.nbMois !== undefined ? appState.nbMois : moduleState.nbMois;
}

/**
 * Wrapper pour getMontantAnnuelSMHSeul qui synchronise le state
 */
window.getMontantAnnuelSMHSeulFromModules = function(appState) {
    syncStateToModules(appState);
    return getMontantAnnuelSMHSeul(moduleState);
};

/**
 * Wrapper pour calculateRemuneration qui synchronise le state
 */
window.calculateRemunerationFromModules = function(appState) {
    syncStateToModules(appState);
    const agreement = getActiveAgreement();
    const activeAgreement = (moduleState.accordActif && agreement) ? agreement : null;
    return calculateAnnualRemuneration(moduleState, activeAgreement, { mode: 'full' });
};

/**
 * Wrapper pour calculateSalaireDuPourMois qui synchronise le state
 */
window.calculateSalaireDuPourMoisFromModules = function(dateMois, dateEmbauche, appState, agreement, smhSeul) {
    syncStateToModules(appState);
    // Créer un snapshot du state pour ce mois spécifique
    const stateSnapshot = { ...moduleState };
    
    // Calculer l'ancienneté pour ce mois
    const moisDepuisEmbauche = (dateMois - dateEmbauche) / (365.25 * 24 * 60 * 60 * 1000 / 12);
    const ancienneteMois = Math.floor(moisDepuisEmbauche / 12);
    stateSnapshot.anciennete = ancienneteMois;
    
    // Si agreement n'est pas fourni, essayer de le récupérer
    let activeAgreement = agreement;
    if (!activeAgreement && moduleState.accordActif) {
        activeAgreement = getActiveAgreement();
    }
    
    return calculateSalaireDuPourMois(dateMois, dateEmbauche, stateSnapshot, activeAgreement, smhSeul);
};

/**
 * Wrapper pour genererPDFArretees qui synchronise le state
 */
window.genererPDFArreteesFromModules = function(data, infosPersonnelles, appState) {
    syncStateToModules(appState);
    // Passer le state synchronisé au générateur PDF
    return genererPDFArretees(data, infosPersonnelles, false, moduleState);
};
